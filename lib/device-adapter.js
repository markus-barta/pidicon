/**
 * @fileoverview Device Adapter
 * @description Manages Pixoo device instances and provides a unified interface
 * for interacting with them. This module abstracts the underlying device
 * communication and provides a consistent API for sending commands.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const { DEVICE_TYPES } = require('./core/constants');
const AwtrixCanvas = require('./drivers/awtrix/awtrix-canvas');
const AwtrixDriver = require('./drivers/awtrix/awtrix-driver');
const PixooDriver = require('./drivers/pixoo/pixoo-driver');
const logger = require('./logger');
const PixooCanvas = require('./pixoo-canvas');

const devices = new Map(); // host -> DeviceProxy
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

const DRIVER_DEFAULT = (
  process.env.PIDICON_DEFAULT_DRIVER ||
  process.env.PIXOO_DEFAULT_DRIVER || // Legacy v2.x (still supported)
  'mock'
).toLowerCase();

// Device drivers map - populated from config file (not env vars anymore)
// Legacy env var support removed in favor of devices.json config
const deviceDrivers = new Map(); // host -> driver

// 🚀 Optional override for development via env var DEVICE_TARGETS_OVERRIDE
// Format: "192.168.1.189=real;192.168.1.159=mock"
// In production (NODE_ENV=production) this override is ignored for safety.
const DEVICE_TARGETS_OVERRIDE = process.env.DEVICE_TARGETS_OVERRIDE || '';
const isProduction =
  String(process.env.NODE_ENV || '').toLowerCase() === 'production';

// Only apply override in development mode
if (DEVICE_TARGETS_OVERRIDE && !isProduction) {
  const overrideMap = parseTargets(DEVICE_TARGETS_OVERRIDE);
  overrideMap.forEach((driver, host) => {
    deviceDrivers.set(host, driver);
  });
  logger.warn(
    '🔒 [DEV] Using DEVICE_TARGETS_OVERRIDE - this is ignored in production!',
  );
  logger.debug(`   Loaded ${deviceDrivers.size} device(s) from override`);
} else if (DEVICE_TARGETS_OVERRIDE && isProduction) {
  logger.warn('🚫 Ignoring DEVICE_TARGETS_OVERRIDE in production mode');
}

// Legacy warning if old env vars are still set
if (process.env.PIDICON_DEVICE_TARGETS || process.env.PIXOO_DEVICE_TARGETS) {
  logger.warn(
    '⚠️  PIDICON_DEVICE_TARGETS/PIXOO_DEVICE_TARGETS env vars are deprecated!',
  );
  logger.warn('   → Use /data/devices.json config file instead');
  logger.warn('   → Or add devices via Web UI');
}

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
    `🚀 Enhanced Pixoo features available: ${availableFeatures.join(', ')}`,
  );
} else {
  logger.info(`📦 Running in basic mode - no enhanced features available`);
}

// ADVANCED_FEATURES is now included in the main module.exports

/**
 * Parse device targets from environment variable
 * Supports multiple formats for backward compatibility:
 * - Legacy v2.x: "192.168.1.100=real" → driver only
 * - v3.0+: "192.168.1.100=pixoo64:real" → deviceType:driver
 * - v3.0+ short: "192.168.1.100=pixoo64" → deviceType only (driver defaults to mock)
 *
 * @param {string} str - Semicolon-separated device targets
 * @returns {Map<string, {driver: string, deviceType: string}>} Map of host to config
 */
function parseTargets(str) {
  const m = new Map();
  str
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [host, configStr] = pair.split('=').map((x) => (x || '').trim());
      if (host && configStr) {
        const config = parseDeviceConfig(configStr);
        m.set(host, config);
      }
    });
  return m;
}

/**
 * Parse device configuration string
 * Formats:
 * - "real" → {driver: "real", deviceType: "pixoo64"}
 * - "mock" → {driver: "mock", deviceType: "pixoo64"}
 * - "pixoo64:real" → {driver: "real", deviceType: "pixoo64"}
 * - "awtrix3:mock" → {driver: "mock", deviceType: "awtrix3"}
 * - "pixoo64" → {driver: "mock", deviceType: "pixoo64"}
 *
 * @param {string} configStr - Configuration string
 * @returns {{driver: string, deviceType: string}}
 */
function parseDeviceConfig(configStr) {
  const parts = configStr.split(':').map((p) => p.trim());

  if (parts.length === 1) {
    const value = parts[0].toLowerCase();
    // If it's "real" or "mock", treat as driver only (legacy format)
    if (value === 'real' || value === 'mock') {
      return {
        driver: value,
        deviceType: DEVICE_TYPES.PIXOO64, // default device type
      };
    }
    // Otherwise, treat as deviceType only (driver defaults to mock)
    return {
      driver: 'mock',
      deviceType: value in DEVICE_TYPES ? value : DEVICE_TYPES.PIXOO64,
    };
  }

  // Format: deviceType:driver
  const [deviceType, driver] = parts;
  return {
    driver: normalizeDriver(driver),
    deviceType: deviceType in DEVICE_TYPES ? deviceType : DEVICE_TYPES.PIXOO64,
  };
}

function normalizeDriver(d) {
  const v = String(d || '').toLowerCase();
  return v === 'real' ? 'real' : 'mock';
}

function resolveDriver(host) {
  const config = deviceDrivers.get(host);
  if (config) {
    return config.driver || normalizeDriver(DRIVER_DEFAULT);
  }
  return normalizeDriver(DRIVER_DEFAULT);
}

/**
 * Resolve device type for a given host
 * @param {string} host - Device IP address
 * @returns {string} Device type (e.g., 'pixoo64', 'awtrix3')
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
    maxTotalDigits = 2,
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
  async push() {
    const counts = this.ops.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {});
    logger.debug(
      `🟩 [MOCK PUSH] ${this.host} → ops: ${this.ops.length} ` +
        JSON.stringify(counts),
    );
    this.ops = [];
  }

  getMetrics() {
    return { pushes: 0, skipped: 0, errors: 0, lastFrametime: 0 }; // Mock metrics
  }
}

// --- DeviceProxy that can switch driver ---
class DeviceProxy {
  constructor(host, size = 64, driver = 'mock') {
    this.host = host;
    this.size = size;
    this.currentDriver = null;
    this.impl = null;
    this.metrics = {
      pushes: 0,
      skipped: 0,
      errors: 0,
      lastFrametime: 0,
      lastSeenTs: null, // Timestamp when real hardware last responded
    };

    // Initialize PixooCanvas for unified API
    this.canvas = new PixooCanvas();
    this.canvas.setDevice(this);

    this.switchDriver(driver);
  }

  createImpl(driver) {
    if (driver === 'real') {
      const { RealPixoo } = require('./pixoo-http');
      return new RealPixoo(this.host, this.size);
    }
    return new MockDevice(this.host, this.size);
  }

  switchDriver(driver) {
    const drv = normalizeDriver(driver);
    if (this.currentDriver === drv && this.impl) {
      logger.debug(
        `[DRIVER] ${this.host} already using ${drv} driver, skipping switch`,
      );
      return;
    }
    this.currentDriver = drv;
    this.impl = this.createImpl(drv);
    logger.info(
      `🔁 [DRIVER SWITCH] ${this.host} → ${drv} (impl: ${this.impl.constructor.name})`,
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
    maxTotalDigits = 2,
  ) {
    return this.impl.drawCustomFloatText(
      value,
      pos,
      color,
      align,
      maxTotalDigits,
    );
  }
  async drawImageWithAlpha(path, pos, size, alpha = 255) {
    if (typeof this.impl.drawImageWithAlpha === 'function') {
      return this.impl.drawImageWithAlpha(path, pos, size, alpha);
    }
    // No-op for drivers that don't support images (e.g., real minimal)
    return;
  }
  async push(sceneName = 'unknown', publishOk) {
    const start = Date.now();
    try {
      logger.debug(
        `[PUSH] ${this.host} using ${this.currentDriver} driver (${this.impl.constructor.name}) for scene ${sceneName}`,
      );
      await this.impl.push();
      this.metrics.pushes++;
      const frametime = Date.now() - start;
      this.metrics.lastFrametime = frametime; // Store for scene access

      // Track "last seen" timestamp ONLY for real hardware (definitive ACK)
      if (this.currentDriver === 'real') {
        this.metrics.lastSeenTs = Date.now();
        logger.debug(
          `[LAST SEEN] Real device ${this.host} ACKed at ${this.metrics.lastSeenTs}`,
        );
      }

      const diffPixels = (this.impl.buf ? this.impl.buf.length / 3 : 0) | 0;
      if (publishOk)
        publishOk(this.host, sceneName, frametime, diffPixels, this.metrics);
      return diffPixels;
    } catch (err) {
      this.metrics.errors++;
      throw err;
    }
  }

  getMetrics() {
    return { ...this.metrics, ts: Date.now() };
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
    devices.set(host, new DeviceProxy(host, 64, resolveDriver(host)));
    logger.info(`Created new device proxy for ${host}`);
  } else {
    const dev = devices.get(host);
    const desired = resolveDriver(host);
    if (dev.currentDriver !== desired) dev.switchDriver(desired);
  }
  return devices.get(host);
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

function getContext(host, sceneName, state, publishOk) {
  const device = getDevice(host);
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
    frametime: device.getMetrics().lastFrametime || 0, // Add frametime from device metrics
    log: (message, level = 'info', meta = {}) => {
      try {
        // Get device's logging level setting
        const deviceLogLevel = stateStore
          ? stateStore.getDeviceState(host, '__logging_level')
          : null;

        // Default: 'warn' for real devices, 'none' for mock devices
        const effectiveLogLevel =
          deviceLogLevel !== null
            ? deviceLogLevel
            : device.currentDriver === 'real'
              ? 'warn'
              : 'none';

        // Only log if the message level meets the device's configured level
        // debug level shows everything, warn level shows warn/error, none shows nothing
        const shouldLog =
          effectiveLogLevel === 'debug' ||
          (effectiveLogLevel === 'warn' &&
            (level === 'warn' || level === 'error')) ||
          (effectiveLogLevel === 'none' && false);

        if (shouldLog) {
          // Use appropriate logger method based on level
          const logMethod = logger[level] || logger.info;
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
        `Registered device: ${device.ip} → ${device.driver} (${device.deviceType || 'pixoo64'})`,
      );
    }
  }

  logger.ok(`📋 Registered ${deviceDrivers.size} device(s) from config`);
}

module.exports = {
  devices,
  getDevice,
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
