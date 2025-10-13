# Driver Development Guide - PIDICON v3.0+

**Version**: 3.1.0  
**Last Updated**: 2025-10-13  
**Audience**: Developers adding support for new pixel display devices

---

## Overview

PIDICON uses a **driver-based architecture** to support multiple pixel display devices. Each device type (Pixoo, AWTRIX, etc.) has its own driver implementation that handles device-specific communication protocols while providing a unified interface to the rest of the system.

### Why Drivers?

- **Protocol Abstraction**: Hide HTTP, MQTT, serial, or other communication details
- **Device Independence**: Scenes and core logic work with any device
- **Plug-and-Play**: Add new devices without modifying existing code
- **Easy Testing**: Mock drivers for development without physical hardware

---

## Driver Architecture

```text
┌─────────────────────────────────────────────────────────┐
│              Application Layer                           │
│  (Scenes, Scene Manager, Graphics Engine)               │
└─────────────────────────────────────────────────────────┘
                       ↕ (uses)
┌─────────────────────────────────────────────────────────┐
│           DeviceDriver Interface                         │
│  (abstract base class - all drivers implement this)     │
└─────────────────────────────────────────────────────────┘
                       ↕ (implements)
┌──────────────────┐  ┌──────────────────┐  ┌────────────┐
│  Pixoo Driver    │  │  AWTRIX Driver   │  │ Your Driver│
│  (HTTP/JSON)     │  │  (MQTT)          │  │ (???)      │
└──────────────────┘  └──────────────────┘  └────────────┘
         ↕                     ↕                    ↕
┌──────────────────┐  ┌──────────────────┐  ┌────────────┐
│  Pixoo 64        │  │  AWTRIX Clock    │  │ New Device │
│  (192.168.1.100) │  │  (192.168.1.200) │  │ (...)      │
└──────────────────┘  └──────────────────┘  └────────────┘
```

---

## DeviceDriver Interface

All drivers must extend the `DeviceDriver` abstract base class.

**Location**: `lib/core/device-driver.js`

### Required Implementation

```javascript
const DeviceDriver = require('../core/device-driver');
const { DEVICE_PROFILES } = require('../core/device-capabilities');

class MyDeviceDriver extends DeviceDriver {
  constructor(host, driverType) {
    // Call parent with host, driverType, and capabilities
    super(host, driverType, DEVICE_PROFILES.MY_DEVICE);

    // Initialize driver-specific state
    this.connection = null;
    this.buffer = null;
    this.metrics = {
      pushCount: 0,
      errorCount: 0,
      frametime: 0,
      lastSeenTs: null,
    };
  }

  // ===== REQUIRED METHODS =====

  async init() {
    // Initialize connection to device
    // For 'mock' driver, do nothing
    // For 'real' driver, establish connection
    if (this.driverType === 'real') {
      this.connection = await this.connectToDevice(this.host);
    }
    this.buffer = this.createBuffer();
  }

  async isReady() {
    // Return true if device is ready for commands
    if (this.driverType === 'mock') return true;
    return this.connection && this.connection.isConnected();
  }

  async clear() {
    // Clear the internal buffer (not the physical device yet)
    this.buffer.clear();
  }

  async push() {
    // Send buffer to physical device
    if (this.driverType === 'mock') {
      this.metrics.pushCount++;
      this.metrics.lastSeenTs = Date.now();
      return;
    }

    const startTime = Date.now();
    try {
      await this.connection.send(this.buffer);
      this.metrics.pushCount++;
      this.metrics.lastSeenTs = Date.now();
      this.metrics.frametime = Date.now() - startTime;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  async drawPixel(pos, color) {
    // Draw single pixel to buffer
    // pos: [x, y]
    // color: [r, g, b, a] (0-255 each)
    this.buffer.setPixel(pos[0], pos[1], color);
  }

  async drawText(text, pos, color, align = 'left') {
    // Draw text to buffer
    // Some devices have native text rendering (use it)
    // Others need to render text to pixels (use font.js)
    if (this.capabilities.hasTextRendering) {
      this.buffer.addTextCommand(text, pos, color, align);
    } else {
      // Fallback: render text using pixel operations
      this.renderTextToPixels(text, pos, color, align);
    }
  }

  async drawLine(start, end, color) {
    // Draw line to buffer
    // start: [x1, y1], end: [x2, y2]
    this.buffer.drawLine(start, end, color);
  }

  async fillRect(topLeft, bottomRight, color) {
    // Fill rectangle in buffer
    // topLeft: [x1, y1], bottomRight: [x2, y2]
    this.buffer.fillRect(topLeft, bottomRight, color);
  }

  // ===== OPTIONAL METHODS (Return false if not supported) =====

  async setBrightness(level) {
    // Set display brightness (0-100)
    if (this.driverType === 'mock') return true;
    if (!this.capabilities.hasBrightnessControl) return false;
    await this.connection.setBrightness(level);
    return true;
  }

  async playTone(frequency, duration) {
    // Play audio tone (AWTRIX, etc.)
    if (!this.capabilities.hasAudio) return false;
    await this.connection.playTone(frequency, duration);
    return true;
  }

  async setIcon(iconId) {
    // Set icon (AWTRIX-style icon library)
    if (!this.capabilities.hasIconSupport) return false;
    await this.connection.setIcon(iconId);
    return true;
  }

  // ===== METRICS =====

  getMetrics() {
    return { ...this.metrics };
  }
}

module.exports = MyDeviceDriver;
```

---

## Step-by-Step: Adding a New Driver

### Step 1: Define Device Capabilities

Create `lib/drivers/mydevice/constants.js`:

```javascript
const MY_DEVICE_CONSTANTS = {
  WIDTH: 32,
  HEIGHT: 16,
  COLOR_DEPTH: 24,
  MAX_FPS: 10,
  PROTOCOL: 'websocket', // or 'mqtt', 'http', 'serial', etc.
  // Add device-specific constants
};

module.exports = MY_DEVICE_CONSTANTS;
```

### Step 2: Add Device Profile

Edit `lib/core/device-capabilities.js`:

```javascript
const { DisplayCapabilities } = require('./device-capabilities');

const DEVICE_PROFILES = {
  // ... existing profiles (PIXOO64, AWTRIX3)

  MY_DEVICE: new DisplayCapabilities({
    width: 32,
    height: 16,
    colorDepth: 24,
    hasAudio: true,
    hasTextRendering: false, // Need to render text to pixels
    hasImageRendering: true,
    hasPrimitiveDrawing: true,
    hasCustomApps: false,
    hasIconSupport: false,
    minBrightness: 0,
    maxBrightness: 100,
  }),
};
```

### Step 3: Create Driver Implementation

Create `lib/drivers/mydevice/mydevice-driver.js`:

```javascript
const DeviceDriver = require('../../core/device-driver');
const { DEVICE_PROFILES } = require('../../core/device-capabilities');
const MY_DEVICE_CONSTANTS = require('./constants');

class MyDeviceDriver extends DeviceDriver {
  constructor(host, driverType) {
    super(host, driverType, DEVICE_PROFILES.MY_DEVICE);
    // ... implement constructor
  }

  // ... implement all required methods (see interface above)
}

module.exports = MyDeviceDriver;
```

### Step 4: Create Buffer/Canvas (Optional)

If your device needs a buffer to accumulate drawing commands before sending:

Create `lib/drivers/mydevice/mydevice-buffer.js`:

```javascript
class MyDeviceBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4); // RGBA
  }

  clear() {
    this.pixels.fill(0);
  }

  setPixel(x, y, [r, g, b, a]) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const index = (y * this.width + x) * 4;
    this.pixels[index] = r;
    this.pixels[index + 1] = g;
    this.pixels[index + 2] = b;
    this.pixels[index + 3] = a;
  }

  getBuffer() {
    return this.pixels;
  }

  // Add more drawing methods as needed
}

module.exports = MyDeviceBuffer;
```

### Step 5: Register Driver

Edit `lib/device-adapter.js`:

```javascript
const { DEVICE_TYPES } = require('./core/constants');
const PixooDriver = require('./drivers/pixoo/pixoo-driver');
const AwtrixDriver = require('./drivers/awtrix/awtrix-driver');
const MyDeviceDriver = require('./drivers/mydevice/mydevice-driver'); // ADD THIS

const _DRIVER_REGISTRY = {
  [DEVICE_TYPES.PIXOO64]: PixooDriver,
  [DEVICE_TYPES.AWTRIX3]: AwtrixDriver,
  [DEVICE_TYPES.MY_DEVICE]: MyDeviceDriver, // ADD THIS
};
```

Edit `lib/core/constants.js`:

```javascript
const DEVICE_TYPES = {
  PIXOO64: 'pixoo64',
  AWTRIX3: 'awtrix3',
  MY_DEVICE: 'mydevice', // ADD THIS
};
```

### Step 6: Test with Mock Driver

Test your driver without physical hardware:

```bash
# Set up mock device
export PIDICON_DEVICE_TARGETS="192.168.1.100=mydevice:mock"

# Start daemon
npm start

# Switch to test scene
mosquitto_pub -t "/home/pixoo/192.168.1.100/scene/switch" -m '{"scene":"startup"}'
```

### Step 7: Test with Real Device

Once mock testing passes:

```bash
# Configure real device
export PIDICON_DEVICE_TARGETS="192.168.1.100=mydevice:real"

# Start daemon
npm start
```

---

## Communication Protocol Examples

### HTTP/JSON (Like Pixoo)

```javascript
async push() {
  if (this.driverType === 'mock') return;

  const payload = {
    Command: 'Draw/SendHttpGif',
    PicNum: 1,
    PicWidth: this.capabilities.width,
    PicOffset: 0,
    PicID: 0,
    PicSpeed: 1000,
    PicData: this.encodeBuffer(),
  };

  await fetch(`http://${this.host}/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
```

### MQTT (Like AWTRIX)

```javascript
const mqtt = require('mqtt');

async init() {
  if (this.driverType === 'mock') return;

  this.mqttClient = mqtt.connect(`mqtt://${this.host}`);
  this.deviceId = `mydevice_${this.host.replace(/\./g, '_')}`;

  await new Promise((resolve) => {
    this.mqttClient.on('connect', resolve);
  });
}

async push() {
  if (this.driverType === 'mock') return;

  const topic = `mydevice/${this.deviceId}/display`;
  const payload = {
    pixels: Array.from(this.buffer.getBuffer()),
    width: this.capabilities.width,
    height: this.capabilities.height,
  };

  this.mqttClient.publish(topic, JSON.stringify(payload));
}
```

### WebSocket

```javascript
const WebSocket = require('ws');

async init() {
  if (this.driverType === 'mock') return;

  this.ws = new WebSocket(`ws://${this.host}:8080`);
  await new Promise((resolve) => {
    this.ws.on('open', resolve);
  });
}

async push() {
  if (this.driverType === 'mock') return;

  this.ws.send(this.buffer.getBuffer());
}
```

### Serial/USB

```javascript
const { SerialPort } = require('serialport');

async init() {
  if (this.driverType === 'mock') return;

  this.serial = new SerialPort({
    path: this.host, // e.g., '/dev/ttyUSB0'
    baudRate: 115200,
  });

  await new Promise((resolve) => {
    this.serial.on('open', resolve);
  });
}

async push() {
  if (this.driverType === 'mock') return;

  await this.serial.write(this.buffer.getBuffer());
}
```

---

## Testing Requirements

### 1. Unit Tests

Create `test/lib/drivers/mydevice/mydevice-driver.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const MyDeviceDriver = require('../../../../lib/drivers/mydevice/mydevice-driver');

describe('MyDeviceDriver', () => {
  describe('Constructor', () => {
    it('should initialize with correct capabilities', () => {
      const driver = new MyDeviceDriver('192.168.1.100', 'mock');
      assert.strictEqual(driver.capabilities.width, 32);
      assert.strictEqual(driver.capabilities.height, 16);
      assert.strictEqual(driver.driverType, 'mock');
    });
  });

  describe('Drawing Operations', () => {
    it('should draw pixel without error', async () => {
      const driver = new MyDeviceDriver('192.168.1.100', 'mock');
      await driver.init();
      await driver.drawPixel([0, 0], [255, 0, 0, 255]);
      // Assert buffer state
    });

    it('should draw text', async () => {
      const driver = new MyDeviceDriver('192.168.1.100', 'mock');
      await driver.init();
      await driver.drawText('Hello', [0, 0], [255, 255, 255, 255]);
      // Assert buffer state
    });
  });

  describe('Mock Driver', () => {
    it('should track metrics on push', async () => {
      const driver = new MyDeviceDriver('192.168.1.100', 'mock');
      await driver.init();
      await driver.push();
      const metrics = driver.getMetrics();
      assert.strictEqual(metrics.pushCount, 1);
      assert.ok(metrics.lastSeenTs > 0);
    });
  });
});
```

### 2. Integration Tests

Add test case to `test/integration/multi-device-integration.test.js`:

```javascript
it('should support MyDevice driver', async () => {
  const driver = new MyDeviceDriver('192.168.1.100', 'mock');
  await driver.init();
  assert.ok(await driver.isReady());

  // Draw something
  await driver.clear();
  await driver.fillRect([0, 0], [32, 16], [255, 0, 0, 255]);
  await driver.push();

  // Verify metrics
  const metrics = driver.getMetrics();
  assert.strictEqual(metrics.pushCount, 1);
});
```

### 3. Manual Testing Checklist

- [ ] Mock driver initializes without errors
- [ ] Drawing operations (pixel, line, rect, text) work
- [ ] Buffer is correctly encoded for device
- [ ] Real driver connects to physical device
- [ ] Frames are displayed on physical device
- [ ] Brightness control works (if supported)
- [ ] Error handling for network issues
- [ ] Metrics tracking (pushCount, errorCount, frametime, lastSeenTs)
- [ ] Device shows up in Web UI device list
- [ ] Scenes run on device without errors
- [ ] Performance is acceptable (5+ FPS for animations)

---

## Best Practices

### 1. Separate Protocol Logic

Keep protocol-specific code isolated from drawing logic:

```text
lib/drivers/mydevice/
  ├── mydevice-driver.js      # Main driver (implements DeviceDriver)
  ├── mydevice-buffer.js      # Buffer/canvas for drawing
  ├── mydevice-protocol.js    # Protocol-specific communication
  └── constants.js            # Device constants
```

### 2. Handle Mock vs Real Gracefully

Always check `this.driverType`:

```javascript
async push() {
  if (this.driverType === 'mock') {
    this.metrics.pushCount++;
    this.metrics.lastSeenTs = Date.now();
    return; // Don't try to send to real device!
  }

  // Real device logic
  await this.sendToDevice();
}
```

### 3. Error Handling

Catch and rethrow with context:

```javascript
async push() {
  try {
    await this.connection.send(this.buffer);
    this.metrics.pushCount++;
  } catch (error) {
    this.metrics.errorCount++;
    throw new Error(`MyDevice push failed: ${error.message}`);
  }
}
```

### 4. Performance

Track frametime for performance monitoring:

```javascript
async push() {
  const startTime = Date.now();
  try {
    await this.sendToDevice();
    this.metrics.frametime = Date.now() - startTime;
  } catch (error) {
    // ...
  }
}
```

### 5. Capabilities First

Design your driver around capabilities, not assumptions:

```javascript
// ❌ BAD: Assume device has feature
async playSound() {
  await this.device.playTone(440, 200);
}

// ✅ GOOD: Check capability first
async playSound() {
  if (!this.capabilities.hasAudio) {
    return false; // Not supported
  }
  await this.device.playTone(440, 200);
  return true;
}
```

### 6. Documentation

Document your driver's requirements:

```javascript
/**
 * MyDevice Driver
 *
 * Requirements:
 * - Node.js 18+
 * - ws package for WebSocket
 * - Device firmware v2.0+
 *
 * Configuration:
 * - Host: WebSocket URL (e.g., '192.168.1.100:8080')
 * - Protocol: WebSocket binary frames
 * - Buffer format: RGB888 (24-bit color)
 *
 * Capabilities:
 * - Resolution: 32x16
 * - Audio: Yes (beeper)
 * - Icons: No
 * - Max FPS: ~10
 */
class MyDeviceDriver extends DeviceDriver {
  // ...
}
```

---

## Example: AWTRIX Driver (Stub)

See complete example in `lib/drivers/awtrix/awtrix-driver.js`:

```javascript
const DeviceDriver = require('../../core/device-driver');
const { DEVICE_PROFILES } = require('../../core/device-capabilities');

class AwtrixDriver extends DeviceDriver {
  constructor(host, driverType) {
    super(host, driverType, DEVICE_PROFILES.AWTRIX3);
    this.host = host; // MQTT broker host
    this.deviceId = `awtrix_${host.replace(/\./g, '_')}`;
    this.mqttClient = null;
  }

  async init() {
    if (this.driverType === 'real') {
      // Connect to MQTT broker
      throw new Error('AWTRIX driver not yet implemented');
    }
  }

  async isReady() {
    if (this.driverType === 'mock') return true;
    return false; // Not implemented
  }

  async clear() {
    throw new Error('AWTRIX driver not yet implemented');
  }

  async push() {
    if (this.driverType === 'mock') return;
    throw new Error('AWTRIX driver not yet implemented');
  }

  async drawPixel(pos, color) {
    throw new Error('AWTRIX does not support pixel-level drawing');
  }

  async drawText(text, pos, color, align = 'left') {
    // AWTRIX has native text rendering via CustomApp API
    throw new Error('AWTRIX driver not yet implemented');
  }

  async drawLine(start, end, color) {
    throw new Error('AWTRIX does not support primitive drawing');
  }

  async fillRect(topLeft, bottomRight, color) {
    throw new Error('AWTRIX does not support primitive drawing');
  }

  async playTone(frequency, duration) {
    if (this.driverType === 'mock') return false;
    throw new Error('AWTRIX audio support not yet implemented');
  }

  getMetrics() {
    return super.getMetrics();
  }
}

module.exports = AwtrixDriver;
```

---

## Reference: Pixoo Driver (Complete)

See production example in `lib/drivers/pixoo/pixoo-driver.js`:

- ✅ Complete HTTP/JSON protocol implementation
- ✅ Canvas buffer for pixel operations
- ✅ Text rendering support
- ✅ Brightness control
- ✅ Full metrics tracking
- ✅ Mock and real driver modes

---

## Troubleshooting

### Driver Not Loading

**Error**: `Cannot find module './drivers/mydevice/mydevice-driver'`

**Fix**: Ensure you registered the driver in `lib/device-adapter.js`:

```javascript
const MyDeviceDriver = require('./drivers/mydevice/mydevice-driver');

const _DRIVER_REGISTRY = {
  // ...
  [DEVICE_TYPES.MY_DEVICE]: MyDeviceDriver,
};
```

### Device Not Appearing in UI

**Error**: Device doesn't show up in Web UI

**Fix**:

1. Check environment variable: `PIDICON_DEVICE_TARGETS="192.168.1.100=mydevice:real"`
2. Or add via Web UI: Settings → Devices → Add Device
3. Verify device type in `lib/core/constants.js`

### Blank Screen on Real Device

**Error**: Scene runs but device shows nothing

**Fix**:

1. Check `push()` implementation - is buffer being sent?
2. Verify buffer encoding matches device expectations
3. Test with simple fill scene: `{"scene":"fill","color":[255,0,0,255]}`
4. Check device logs/status indicators

### Slow Performance

**Error**: Scenes run at <5 FPS

**Fix**:

1. Profile `push()` method - add timing logs
2. Optimize buffer encoding
3. Use binary protocols instead of JSON if possible
4. Batch drawing operations
5. Consider device hardware limits

---

## Contributing Your Driver

Once your driver is working:

1. **Test thoroughly** - Mock and real modes, all drawing operations
2. **Write tests** - Unit and integration tests
3. **Document** - Add to this guide, README, and inline comments
4. **Submit PR** - Create pull request with:
   - Driver implementation
   - Tests
   - Documentation updates
   - Example device configuration

**Driver Contribution Checklist**:

- [ ] DeviceDriver interface fully implemented
- [ ] DisplayCapabilities profile defined
- [ ] Constants file created
- [ ] Mock driver mode works
- [ ] Real driver mode tested on physical device
- [ ] Unit tests written (>80% coverage)
- [ ] Integration test added
- [ ] Documentation updated (this file + README)
- [ ] Example config in `config/devices.example.json`
- [ ] CHANGELOG entry added

---

## Resources

- **DeviceDriver Interface**: `lib/core/device-driver.js`
- **DisplayCapabilities**: `lib/core/device-capabilities.js`
- **Pixoo Driver Reference**: `lib/drivers/pixoo/pixoo-driver.js`
- **AWTRIX Driver Stub**: `lib/drivers/awtrix/awtrix-driver.js`
- **Architecture Doc**: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **Scene Development**: [docs/SCENE_DEVELOPMENT.md](SCENE_DEVELOPMENT.md)
- **API Reference**: [docs/API.md](API.md)

---

**Questions?** Open an issue or discussion on GitHub!
