// lib/device-adapter.js
// DeviceProxy that can hot-swap between mock and real drivers per device.
// Defaults come from env; runtime override via MQTT.
// @author: Sonic + Cursor + Markus Barta (mba)

const devices = new Map(); // host -> DeviceProxy
const sceneStates = new Map(); // host::scene -> local state object

const DRIVER_DEFAULT = (
  process.env.PIXOO_DEFAULT_DRIVER || 'mock'
).toLowerCase();

// 🚀 Quick override for development - modify this instead of recreating containers!
// Format: "192.168.1.189=real;192.168.1.159=mock"
// Set to empty string "" to use PIXOO_DEVICE_TARGETS environment variable
//
// Examples:
// const DEVICE_TARGETS_OVERRIDE = "192.168.1.189=real;192.168.1.159=real";  // Both devices real
// const DEVICE_TARGETS_OVERRIDE = "192.168.1.189=mock";                   // Test mode only
// const DEVICE_TARGETS_OVERRIDE = "192.168.1.159=real";                   // 1 device
const DEVICE_TARGETS_OVERRIDE = '192.168.1.159=real'; // 👈  IN CODE OVERRIDE HERE

// Code override MUST take precedence over environment variables
let TARGETS_RAW;
if (DEVICE_TARGETS_OVERRIDE && DEVICE_TARGETS_OVERRIDE.trim()) {
  TARGETS_RAW = DEVICE_TARGETS_OVERRIDE;
  console.log(
    '🔒 [OVERRIDE] Using code override - environment variables IGNORED',
  );
} else {
  TARGETS_RAW = process.env.PIXOO_DEVICE_TARGETS || '';
  console.log('🌍 [ENV] Using environment variable (no code override)');
}

const deviceDrivers = parseTargets(TARGETS_RAW); // host -> driver

// Debug logging for device target resolution
console.log(`🔍 [DEBUG] Device target resolution:`);
console.log(`   DEVICE_TARGETS_OVERRIDE: "${DEVICE_TARGETS_OVERRIDE}"`);
console.log(
  `   PIXOO_DEVICE_TARGETS env: "${process.env.PIXOO_DEVICE_TARGETS || 'not set'}"`,
);
console.log(`   TARGETS_RAW: "${TARGETS_RAW}"`);
console.log(`   deviceDrivers Map:`, Object.fromEntries(deviceDrivers));

// Log which configuration source is being used
if (DEVICE_TARGETS_OVERRIDE) {
  console.log(
    '⚡ Using DEVICE_TARGETS_OVERRIDE from code (fast development mode)',
  );
} else if (process.env.PIXOO_DEVICE_TARGETS) {
  console.log('🌍 Using PIXOO_DEVICE_TARGETS from environment');
} else {
  console.log(
    '⚠️  No device targets configured - all devices will use default driver:',
    DRIVER_DEFAULT,
  );
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
  console.log(
    `🚀 Enhanced Pixoo features available: ${availableFeatures.join(', ')}`,
  );
} else {
  console.log(`📦 Running in basic mode - no enhanced features available`);
}

// ADVANCED_FEATURES is now included in the main module.exports

function parseTargets(str) {
  const m = new Map();
  str
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [host, drv] = pair.split('=').map((x) => (x || '').trim());
      if (host && drv) m.set(host, normalizeDriver(drv));
    });
  return m;
}

function normalizeDriver(d) {
  const v = String(d || '').toLowerCase();
  return v === 'real' ? 'real' : 'mock';
}

function resolveDriver(host) {
  return deviceDrivers.get(host) || normalizeDriver(DRIVER_DEFAULT);
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
    console.log(
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
    this.metrics = { pushes: 0, skipped: 0, errors: 0, lastFrametime: 0 };
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
    if (this.currentDriver === drv && this.impl) return;
    this.currentDriver = drv;
    this.impl = this.createImpl(drv);
    console.log(`🔁 Driver for ${this.host} → ${drv}`);
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
      await this.impl.push();
      this.metrics.pushes++;
      const frametime = Date.now() - start;
      this.metrics.lastFrametime = frametime; // Store for scene access
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
}

// API
function getDevice(host) {
  if (!devices.has(host)) {
    devices.set(host, new DeviceProxy(host, 64, resolveDriver(host)));
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

function getContext(host, sceneName, state, publishOk) {
  const device = getDevice(host);
  const stateKey = key(host, sceneName);
  if (!sceneStates.has(stateKey)) sceneStates.set(stateKey, {});
  const local = sceneStates.get(stateKey);

  // Debug logging for state merging
  console.log('🔍 [DEBUG] getContext state merge:', {
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
      console.log(`🔍 [DEBUG] Merged state key: ${key} = ${value}`);
    });
  }

  console.log(
    '🔍 [DEBUG] Final mergedState keys:',
    Array.from(mergedState.keys()),
  );

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
  };
}

module.exports = {
  devices,
  getDevice,
  getContext,
  setDriverForDevice,
  getDriverForDevice,
  resolveDriver,
  deviceDrivers,
  ADVANCED_FEATURES,
};
