/**
 * @fileoverview Device Adapter
 * @description Manages Pixoo device instances and provides a unified interface
 * for interacting with them. This module abstracts the underlying device
 * communication and provides a consistent API for sending commands.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const { DEVICE_TYPES } = require('./core/constants');
const AwtrixCanvas = require('./drivers/awtrix/awtrix-canvas');
const AwtrixDriver = require('./drivers/awtrix/awtrix-driver');
const PixooDriver = require('./drivers/pixoo/pixoo-driver');
const logger = require('./logger');
const PixooCanvas = require('./pixoo-canvas');
const DeviceHealth = require('./services/device-health');

const devices = new Map(); // host -> DeviceProxy
const deviceHealthStore = new DeviceHealth();
const sceneStates = new Map(); // host::scene -> local state object
let stateStore = null; // Global state store for device logging preferences

// ============================================================================
// DRIVER REGISTRY - Maps device types to driver classes
// ============================================================================
const _DRIVER_REGISTRY = {
  [DEVICE_TYPES.PIXOO64]: PixooDriver,
  [DEVICE_TYPES.AWTRIX]: AwtrixDriver,
};

// Canvas registry - Maps device types to canvas adapters
const _CANVAS_REGISTRY = {
  [DEVICE_TYPES.PIXOO64]: PixooCanvas,
  [DEVICE_TYPES.AWTRIX]: AwtrixCanvas,
};

// Device type resolution per host (for future multi-device support)
const _deviceTypes = new Map(); // host -> deviceType ('pixoo64', 'awtrix', etc.)

// Default driver mode for devices (can be overridden per device in config)
const DRIVER_DEFAULT = 'mock';

// Device drivers map - populated from config file only
const deviceDrivers = new Map(); // host -> driver

// ============================================================================
// ADVANCED FEATURES CONFIGURATION
// ============================================================================

/**
 * Advanced features configuration - enhanced capabilities for Pixoo devices
 * These features are enabled by default since they're stable and beneficial
 * @readonly
 */
const ADVANCED_FEATURES = Object.freeze({
  // Enable advanced gradient rendering (extracted from Node-RED)
  GRADIENT_RENDERING: true,

  // Enable advanced chart rendering with negative values and overflow handling
  ADVANCED_CHART: true,

  // Enable enhanced text rendering with background colors
  ENHANCED_TEXT: true,

  // Enable image processing optimizations
  IMAGE_PROCESSING: true,

  // Enable animation framework
  ANIMATIONS: true,

  // Performance monitoring (always enabled for debugging)
  PERFORMANCE_MONITORING: true,
});

// Log available features
const availableFeatures = Object.entries(ADVANCED_FEATURES)
  .filter(([, enabled]) => enabled)
  .map(([feature]) => feature.toLowerCase());

if (availableFeatures.length > 0) {
  logger.ok(
    `🚀 Enhanced Pixoo features available: ${availableFeatures.join(', ')}`
  );
} else {
  logger.info(`📦 Running in basic mode - no enhanced features available`);
}

// ADVANCED_FEATURES is now included in the main module.exports

/**
 * Normalize driver string to 'real' or 'mock'
 * @param {string} d - Driver string
 * @returns {string} Normalized driver ('real' or 'mock')
 */
function normalizeDriver(d) {
  const v = String(d || '').toLowerCase();
  return v === 'real' ? 'real' : 'mock';
}

/**
 * Resolve driver for a given host
 * @param {string} host - Device IP address
 * @returns {string} Driver mode ('real' or 'mock')
 */
function resolveDriver(host) {
  return deviceDrivers.get(host) || DRIVER_DEFAULT;
}

/**
 * Resolve device type for a given host
 * @param {string} host - Device IP address
 * @returns {string} Device type (e.g., 'pixoo64', 'awtrix')
 */
function resolveDeviceType(host) {
  const config = deviceDrivers.get(host);
  if (config && config.deviceType) {
    return config.deviceType;
  }
  // Check if device type is explicitly set in _deviceTypes map
  if (_deviceTypes.has(host)) {
    return _deviceTypes.get(host);
  }
  // Default to pixoo64
  return DEVICE_TYPES.PIXOO64;
}

function key(host, scene) {
  return `${host}::${scene}`;
}

// --- Mock driver (kept for dev) ---
class MockDevice {
  constructor(host, size = 64) {
    this.host = host;
    this.size = size;
    this.ops = [];
    this._displayOn = true;
    this._brightness = 100;
  }
  async clear() {
    this.ops.push({ type: 'clear' });
  }
  async drawPixelRgba(pos, color) {
    this.ops.push({ type: 'pixel', pos, color });
  }
  async drawLineRgba(start, end, color) {
    this.ops.push({ type: 'line', start, end, color });
  }
  async drawRectangleRgba(pos, size, color) {
    this.ops.push({ type: 'rect', pos, size, color });
  }

  // Alias for fillRectangleRgba - same as drawRectangleRgba (already fills)
  async fillRectangleRgba(pos, size, color) {
    this.ops.push({ type: 'fillRect', pos, size, color });
  }
  async drawTextRgbaAligned(text, pos, color, align = 'left') {
    this.ops.push({ type: 'text', text, pos, color, align });
  }
  async drawCustomFloatText(
    value,
    pos,
    color,
    align = 'right',
    maxTotalDigits = 2
  ) {
    const text =
      typeof value === 'number' ? value.toString() : String(value ?? '');
    const width = Math.max(1, Math.min(text.length * 4, 64));
    this.ops.push({
      type: 'floatText',
      value,
      pos,
      color,
      align,
      maxTotalDigits,
      width,
    });
    return width;
  }
  async drawImageWithAlpha(path, pos, size, alpha = 255) {
    this.ops.push({ type: 'image', path, pos, size, alpha });
  }
  async drawImageFile(path, x = 0, y = 0) {
    this.ops.push({ type: 'imageFile', path, x, y });
  }
  async push() {
    const counts = this.ops.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {});
    logger.debug(
      `🟩 [MOCK PUSH] ${this.host} → ops: ${this.ops.length} ` +
        JSON.stringify(counts)
    );
    this.ops = [];
  }

  getMetrics() {
    return { pushes: 0, skipped: 0, errors: 0, lastFrametime: 0 }; // Mock metrics
  }

  async setDisplayPower(on) {
    this._displayOn = Boolean(on);
    return true;
  }

  async setBrightness(level) {
    this._brightness = Math.max(0, Math.min(100, Number(level) || 0));
    return true;
  }

  getHardwareState() {
    return {
      displayOn: this._displayOn,
      brightness: this._brightness,
    };
  }
}

// --- DeviceProxy that can switch driver ---
class DeviceProxy {
  constructor(host, size = 64, driver = 'mock') {
    this.host = host;
    this.size = size;
    this.currentDriver = null;
    this.impl = null;
    this.deviceType = resolveDeviceType(host); // Resolve device type (pixoo64, awtrix, etc.)
    this.metrics = {
      pushes: 0,
      skipped: 0,
      errors: 0,
      lastFrametime: 0,
      lastSeenTs: null, // Timestamp when real hardware last responded
    };

    // Initialize canvas based on device type
    const CanvasClass = _CANVAS_REGISTRY[this.deviceType] || PixooCanvas;
    this.canvas = new CanvasClass();
    if (this.canvas.setDevice) {
      this.canvas.setDevice(this);
    }

    this.health = deviceHealthStore.ensureEntry(host);

    this.switchDriver(driver);
  }

  createImpl(driver) {
    const drv = normalizeDriver(driver);

    // Get device type and driver class
    const deviceType = this.deviceType;
    const DriverClass = _DRIVER_REGISTRY[deviceType];

    if (!DriverClass) {
      logger.warn(
        `No driver class found for device type '${deviceType}', falling back to Pixoo`
      );
      // Fallback to old Pixoo implementation
      if (drv === 'real') {
        const { RealPixoo } = require('./pixoo-http');
        return new RealPixoo(this.host, this.size);
      }
      return new MockDevice(this.host, this.size);
    }

    // Create new driver instance based on device type
    if (deviceType === DEVICE_TYPES.AWTRIX) {
      // Awtrix driver
      return new DriverClass(this.host, {
        logger,
        driverType: drv,
        port: 80,
      });
    } else {
      // Pixoo driver (or other future drivers)
      return new DriverClass(this.host, drv);
    }
  }

  switchDriver(driver) {
    const drv = normalizeDriver(driver);
    if (this.currentDriver === drv && this.impl) {
      logger.debug(
        `[DRIVER] ${this.host} already using ${drv} driver, skipping switch`
      );
      return;
    }
    this.currentDriver = drv;
    this.impl = this.createImpl(drv);

    // Initialize driver asynchronously (don't block constructor)
    if (this.impl && typeof this.impl.initialize === 'function') {
      this.impl.initialize().catch((error) => {
        logger.warn(
          `Driver initialization failed for ${this.host}: ${error.message}`
        );
      });
    }

    logger.info(
      `🔁 [DRIVER SWITCH] ${this.host} (${this.deviceType}) → ${drv} (impl: ${this.impl.constructor.name})`
    );
  }

  // Device readiness check
  async isReady() {
    if (this.impl && typeof this.impl.isReady === 'function') {
      return this.impl.isReady();
    }
    return true; // Mock devices are always "ready"
  }

  // Forwarders
  async clear() {
    return this.impl.clear();
  }
  async drawPixelRgba(pos, color) {
    return this.impl.drawPixelRgba(pos, color);
  }
  async drawLineRgba(start, end, color) {
    return this.impl.drawLineRgba(start, end, color);
  }
  async drawRectangleRgba(pos, size, color) {
    return this.impl.drawRectangleRgba(pos, size, color);
  }

  // Alias for fillRectangleRgba - same as drawRectangleRgba (already fills)
  async fillRectangleRgba(pos, size, color) {
    if (typeof this.impl.fillRectangleRgba === 'function') {
      return this.impl.fillRectangleRgba(pos, size, color);
    }
    return this.impl.drawRectangleRgba(pos, size, color);
  }
  async drawTextRgbaAligned(text, pos, color, align = 'left') {
    return this.impl.drawTextRgbaAligned(text, pos, color, align);
  }
  async drawCustomFloatText(
    value,
    pos,
    color,
    align = 'right',
    maxTotalDigits = 2
  ) {
    return this.impl.drawCustomFloatText(
      value,
      pos,
      color,
      align,
      maxTotalDigits
    );
  }
  async drawImageWithAlpha(path, pos, size, alpha = 255) {
    if (typeof this.impl.drawImageWithAlpha === 'function') {
      return this.impl.drawImageWithAlpha(path, pos, size, alpha);
    }
    // No-op for drivers that don't support images (e.g., real minimal)
    return;
  }

  // Awtrix-specific methods
  async createCustomApp(appName, appData) {
    if (typeof this.impl.createCustomApp === 'function') {
      return this.impl.createCustomApp(appName, appData);
    }
    // No-op for drivers that don't support custom apps
    return false;
  }
  async removeCustomApp(appName) {
    if (typeof this.impl.removeCustomApp === 'function') {
      return this.impl.removeCustomApp(appName);
    }
    return false;
  }
  async showNotification(notification) {
    if (typeof this.impl.showNotification === 'function') {
      return this.impl.showNotification(notification);
    }
    // No-op for drivers that don't support notifications
    return false;
  }
  async drawCustom(appName, appData) {
    if (typeof this.impl.drawCustom === 'function') {
      return this.impl.drawCustom(appName, appData);
    }
    // No-op for drivers that don't support custom drawing
    return false;
  }

  async push(sceneName = 'unknown', publishOk) {
    const start = Date.now();
    try {
      logger.debug(
        `[PUSH] ${this.host} using ${this.currentDriver} driver (${this.impl.constructor.name}) for scene ${sceneName}`
      );
      await this.impl.push();
      this.metrics.pushes++;
      const frametime = Date.now() - start;
      this.metrics.lastFrametime = frametime; // Store for scene access

      const diffPixels = (this.impl.buf ? this.impl.buf.length / 3 : 0) | 0;

      // Phase 4 (Epic 0): Scene rendering NO LONGER updates lastSeenTs or health
      // Watchdog is now the SINGLE SOURCE OF TRUTH for device liveness
      // Scene rendering only updates performance metrics (pushes, frametime)

      if (publishOk)
        publishOk(this.host, sceneName, frametime, diffPixels, this.metrics);
      return diffPixels;
    } catch (err) {
      this.metrics.errors++;
      throw err;
    }
  }

  getMetrics() {
    // Merge proxy metrics with driver metrics (drivers may update lastSeenTs via health checks)
    const driverMetrics =
      this.impl && typeof this.impl.getMetrics === 'function'
        ? this.impl.getMetrics()
        : {};

    const healthSnapshot = this.health.getSnapshot();
    const mergedMetrics = {
      ...this.metrics,
      ...driverMetrics,
    };

    if (this.currentDriver === 'real') {
      const healthLastSeen = healthSnapshot.lastSeenTs ?? null;
      mergedMetrics.lastSeenTs =
        healthLastSeen ?? mergedMetrics.lastSeenTs ?? null;
      this.metrics.lastSeenTs = mergedMetrics.lastSeenTs;
    } else {
      mergedMetrics.lastSeenTs = null;
      this.metrics.lastSeenTs = null;
    }

    return {
      ...mergedMetrics,
      health: healthSnapshot,
      ts: Date.now(),
    };
  }

  // ============================================================================
  // UNIFIED API PROXY METHODS (delegate to canvas)
  // ============================================================================

  /**
   * Unified API: Draw a single pixel
   */
  async drawPixel(position, color) {
    return this.canvas.drawPixel(position, color);
  }

  /**
   * Unified API: Draw a line
   */
  async drawLine(start, end, color) {
    return this.canvas.drawLine(start, end, color);
  }

  /**
   * Unified API: Draw a filled rectangle
   */
  async fillRect(position, size, color) {
    return this.canvas.fillRect(position, size, color);
  }

  /**
   * Unified API: Draw a rectangle outline
   */
  async drawRect(position, size, color) {
    return this.canvas.drawRect(position, size, color);
  }

  /**
   * Unified API: Draw text
   */
  async drawText(text, position, color, alignment = 'left') {
    return this.canvas.drawText(text, position, color, alignment);
  }

  /**
   * Unified API: Draw formatted number
   */
  async drawNumber(value, position, color, alignment = 'right', maxDigits = 2) {
    return this.canvas.drawNumber(value, position, color, alignment, maxDigits);
  }

  /**
   * Unified API: Draw image
   */
  async drawImage(path, position, size, alpha = 255) {
    return this.canvas.drawImage(path, position, size, alpha);
  }
}

// API
function getDevice(host) {
  if (!devices.has(host)) {
    const proxy = new DeviceProxy(host, 64, resolveDriver(host));
    devices.set(host, proxy);
    logger.info(`Created new device proxy for ${host}`);
  } else {
    const dev = devices.get(host);
    const desired = resolveDriver(host);
    if (dev.currentDriver !== desired) dev.switchDriver(desired);
  }
  return devices.get(host);
}

function getDeviceDriverImpl(host) {
  return getDevice(host)?.impl;
}

function setDriverForDevice(host, driver) {
  const drv = normalizeDriver(driver);
  deviceDrivers.set(host, drv);
  const dev = devices.get(host);
  if (dev) dev.switchDriver(drv);
  return drv;
}

function getDriverForDevice(host) {
  const dev = devices.get(host);
  return dev ? dev.currentDriver : resolveDriver(host);
}

/**
 * Set the state store for logging preferences
 * @param {Object} store - StateStore instance
 */
function setStateStore(store) {
  stateStore = store;
}

function getContext(host, sceneName, state, publishOk, sceneModule) {
  const device = getDevice(host);
  const scene = sceneModule || null;

  const stateKey = key(host, sceneName);
  if (!sceneStates.has(stateKey)) sceneStates.set(stateKey, {});
  const local = sceneStates.get(stateKey);

  // Debug logging for state merging
  logger.debug('getDevice state merge:', {
    host,
    sceneName,
    stateType: typeof state,
    stateKeys: state ? Object.keys(state) : 'null/undefined',
    stateValue: state,
  });

  // Merge deployment state with scene state
  const mergedState = new Map();
  if (state && typeof state === 'object') {
    Object.entries(state).forEach(([key, value]) => {
      mergedState.set(key, value);
      logger.debug(`Merged state key: ${key} = ${value}`);
    });
  }

  logger.debug('Final mergedState keys:', Array.from(mergedState.keys()));

  return {
    device,
    state: mergedState,
    env: { width: 64, height: 64, host },
    getState: (k, defVal) => (k in local ? local[k] : defVal),
    setState: (k, v) => {
      local[k] = v;
    },
    publishOk,
    metadata: {
      tags: Array.isArray(scene?.tags) ? scene.tags : [],
      deviceTypes: Array.isArray(scene?.deviceTypes)
        ? scene.deviceTypes
        : undefined,
      filePath: scene?.filePath,
    },
    frametime: device.getMetrics().lastFrametime || 0, // Add frametime from device metrics
    log: (message, level = 'info', meta = {}) => {
      try {
        // Get device's logging level setting
        const deviceLogLevel = stateStore
          ? stateStore.getDeviceState(host, '__logging_level')
          : null;

        // Default: 'warning' for real devices, 'silent' for mock devices
        const effectiveLogLevel =
          deviceLogLevel !== null
            ? deviceLogLevel
            : device.currentDriver === 'real'
              ? 'warning'
              : 'silent';

        // Define logging level hierarchy: debug < info < warning < error < silent
        const levelHierarchy = {
          debug: 0,
          info: 1,
          warning: 2,
          error: 3,
          silent: 4,
        };
        const configLevel = levelHierarchy[effectiveLogLevel] || 4; // Default to silent
        const messageLevel = levelHierarchy[level] || 1; // Default to info

        // Only log if message level is >= configured level
        // silent (4) blocks everything
        const shouldLog =
          messageLevel >= configLevel && effectiveLogLevel !== 'silent';

        if (shouldLog) {
          // Map scene log levels to logger methods
          const loggerMethodMap = {
            debug: 'debug',
            info: 'info',
            warning: 'warn',
            error: 'error',
          };
          const logMethod = logger[loggerMethodMap[level]] || logger.info;
          logMethod(`[${sceneName}@${host}] ${message}`, meta);
        }
      } catch (error) {
        // Fail silently to avoid breaking scene execution
        logger.debug(`Failed to log from scene ${sceneName}:`, {
          error: error.message,
        });
      }
    },
  };
}

/**
 * Register devices from config file into deviceDrivers map
 * Called by daemon after loading devices.json
 * @param {Array} devicesConfig - Array of device configurations
 */
function registerDevicesFromConfig(devicesConfig) {
  if (!devicesConfig || !Array.isArray(devicesConfig)) {
    logger.warn('No devices config provided to registerDevicesFromConfig');
    return;
  }

  deviceDrivers.clear(); // Clear any existing mappings

  for (const device of devicesConfig) {
    if (device.ip && device.driver) {
      deviceDrivers.set(device.ip, device.driver);

      // Also register device type if provided
      if (device.deviceType) {
        _deviceTypes.set(device.ip, device.deviceType);
      }

      logger.debug(
        `Registered device: ${device.ip} → ${device.driver} (${device.deviceType || 'pixoo64'})`
      );
    }
  }

  logger.ok(`📋 Registered ${deviceDrivers.size} device(s) from config`);
}

module.exports = {
  devices,
  getDevice,
  getDeviceDriverImpl,
  getContext,
  setDriverForDevice,
  getDriverForDevice,
  setStateStore,
  resolveDriver,
  resolveDeviceType, // v3.0+: resolve device type for a given host
  deviceDrivers,
  registerDevicesFromConfig, // Register devices from config file
  ADVANCED_FEATURES,
};
