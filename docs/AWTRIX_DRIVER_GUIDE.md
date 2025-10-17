# AWTRIX Driver Implementation Guide

**Status**: 🟡 Core Driver Complete - Integration Pending  
**Build**: #700  
**Date**: 2025-10-13

---

## Overview

The AWTRIX driver provides full support for **AWTRIX 3** (Ulanzi TC001) 32x8 pixel displays via MQTT protocol. This guide covers the driver implementation, API usage, and integration status.

**AWTRIX 3 Devices**:

- Ulanzi TC001 Smart Pixel Clock
- 32x8 RGB LED matrix
- MQTT and HTTP APIs
- Built-in icon library (10,000+ icons)
- Audio support (RTTTL format)
- Temperature/humidity sensors

---

## Implementation Status

### ✅ Completed (Build #700)

**Core Driver** (`lib/drivers/awtrix/awtrix-driver.js`):

- ✅ MQTT protocol support (uses existing MqttService)
- ✅ Notification API (temporary overlays)
- ✅ CustomApp API (persistent rendering)
- ✅ Text rendering with effects
- ✅ Icon support (8x8 icons)
- ✅ Audio/RTTTL playback
- ✅ Settings API (brightness, sleep mode, etc.)
- ✅ Pixel buffer support (RGB565)
- ✅ Drawing primitives (lines, rectangles)

**Canvas Adapter** (`lib/drivers/awtrix/awtrix-canvas.js`):

- ✅ Pixoo-compatible interface
- ✅ Automatic conversion to AWTRIX format
- ✅ Scene compatibility layer

**Constants** (`lib/drivers/awtrix/constants.js`):

- ✅ Complete MQTT topic definitions
- ✅ HTTP endpoint mappings
- ✅ Settings keys and defaults
- ✅ Effect and transition constants

### ⏸️ Pending Integration

**Device Adapter** (`lib/device-adapter.js`):

- ⏸️ AWTRIX device selection in DeviceProxy
- ⏸️ Canvas adapter switching (Pixoo vs AWTRIX)
- ⏸️ Device type detection and routing

**Web UI**:

- ⏸️ AWTRIX device type selection
- ⏸️ 32x8 preview mode
- ⏸️ AWTRIX-specific settings UI

**Testing**:

- ⏸️ Unit tests for driver methods
- ⏸️ Integration tests with mock MQTT
- ⏸️ Real hardware testing

---

## Architecture

### MQTT Communication Flow

```
PIDICON (via MqttService)
    ↓
AwtrixDriver
    ↓
MQTT Topics:
    - awtrix_{deviceId}/notify     → Temporary notifications
    - awtrix_{deviceId}/custom/*   → Custom apps (scenes)
    - awtrix_{deviceId}/settings   → Device settings
    - awtrix_{deviceId}/rtttl      → Audio playback
    ↓
AWTRIX Device (32x8 LED matrix)
```

### Driver Class Hierarchy

```
DeviceDriver (abstract base)
    ↑
AwtrixDriver
    ↑
AwtrixCanvas (compatibility layer)
```

---

## API Reference

### Driver Initialization

```javascript
const AwtrixDriver = require('./lib/drivers/awtrix/awtrix-driver');

// Create driver instance
const driver = new AwtrixDriver('kitchen_display', {
  mqttClient: mqttService,
  logger: logger,
  driverType: 'real', // or 'mock'
});

// Initialize
await driver.initialize();
```

### Notification API (Temporary Overlays)

```javascript
// Show simple notification
await driver.showNotification({
  text: 'Hello World',
  color: '#00FF00',
  duration: 5000, // ms
});

// Notification with icon and effect
await driver.showNotification({
  text: 'New Message',
  icon: 1234, // LaMetric icon ID
  color: '#0000FF',
  duration: 10000,
  effect: 'fade',
  rainbow: true,
  scrollSpeed: 100,
});
```

### CustomApp API (Persistent Rendering)

```javascript
// Create custom app (scene)
await driver.createCustomApp('my_clock', {
  text: '12:34',
  color: '#FFFFFF',
  icon: 2054, // clock icon
  lifetime: 0, // 0 = permanent
});

// Update app
await driver.createCustomApp('my_clock', {
  text: '12:35',
  color: '#FFFFFF',
});

// Remove app
await driver.removeCustomApp('my_clock');
```

### Settings Control

```javascript
// Set brightness (0-255)
await driver.setBrightness(200);

// Update multiple settings
await driver.updateSettings({
  BRI: 150, // Brightness
  ABRI: true, // Auto-brightness
  TEMP: true, // Show temperature
  SOUND: false, // Disable sound
  VOL: 15, // Volume (0-30)
  SSPEED: 80, // Scroll speed
});

// Sleep mode
await driver.setSleepMode(true);
```

### Audio Playback

```javascript
// Play RTTTL string
await driver.playRTTTL('mario:d=4,o=5,b=100:16e6,16e6,32p,8e6');

// Play single tone (converts to RTTTL)
await driver.playTone(440, 500); // 440Hz for 500ms
```

### Drawing Primitives

```javascript
// Draw text (via custom app)
await driver.drawText('Hello', [0, 0], [255, 255, 255]);

// Draw pixel
await driver.drawPixel([10, 4], [255, 0, 0]);

// Draw line
await driver.drawLine([0, 0], [31, 7], [0, 255, 0]);

// Fill rectangle
await driver.fillRect([5, 2], [15, 6], [0, 0, 255]);

// Send buffered pixels
await driver.sendImage(pixelArray); // RGB565 format
```

---

## Canvas Adapter Usage

The `AwtrixCanvas` provides a Pixoo-compatible interface for scenes:

```javascript
const AwtrixCanvas = require('./lib/drivers/awtrix/awtrix-canvas');

// Create canvas
const canvas = new AwtrixCanvas(driver);

// Use Pixoo-like API
await canvas.drawText('Hello', [0, 0], [255, 255, 255]);
await canvas.fillRect([0, 0], [31, 7], [0, 0, 255]);
await canvas.push(); // Sends to device

// Clear display
await canvas.clear();

// AWTRIX-specific methods
await canvas.showNotification({
  text: 'Alert!',
  color: '#FF0000',
});
```

---

## MQTT Topics

AWTRIX uses topic-based MQTT communication. All topics are prefixed with `awtrix_{deviceId}`:

### Core Topics

| Topic               | Purpose                 | Payload Format                |
| ------------------- | ----------------------- | ----------------------------- |
| `/notify`           | Temporary notifications | JSON object                   |
| `/custom/{appName}` | Custom apps             | JSON object or empty (remove) |
| `/settings`         | Device settings         | JSON object                   |
| `/indicator/{1-3}`  | Status indicators       | JSON object or empty          |
| `/rtttl`            | Audio playback          | RTTTL string                  |
| `/sound`            | Play sound              | File path string              |
| `/sleep`            | Sleep mode              | Boolean                       |
| `/power`            | Power control           | Boolean                       |
| `/stats`            | Device statistics       | Subscribe only                |
| `/screen`           | Screen capture          | Subscribe only                |

### Example MQTT Commands

```bash
# Notification via mosquitto_pub
mosquitto_pub -t "awtrix_kitchen/notify" -m '{"text":"Hello","color":"#00FF00"}'

# Custom app
mosquitto_pub -t "awtrix_kitchen/custom/clock" -m '{"text":"12:34","icon":2054}'

# Settings
mosquitto_pub -t "awtrix_kitchen/settings" -m '{"BRI":200,"TEMP":true}'

# Audio
mosquitto_pub -t "awtrix_kitchen/rtttl" -m 'beep:d=4,o=5,b=100:16c6'
```

---

## Color Format

AWTRIX supports multiple color formats:

**Hex String** (recommended):

```javascript
color: '#FF0000'; // Red
color: '#00FF00'; // Green
color: '#0000FF'; // Blue
```

**RGB Array** (auto-converted):

```javascript
color: [255, 0, 0]; // Red
color: [0, 255, 0]; // Green
color: [0, 0, 255]; // Blue
```

**RGB565** (for pixel buffers):

```javascript
// 16-bit color: RRRRRGGG GGGBBBBB
const red = 0xf800;
const green = 0x07e0;
const blue = 0x001f;
```

---

## Effects and Transitions

Available effects for notifications and custom apps:

- `fade` - Fade in/out
- `scroll` - Scroll text
- `blink` - Blinking text
- `rainbow` - Rainbow color cycle
- `slide` - Slide transition
- `zoom` - Zoom effect
- `rotate` - Rotation effect

```javascript
await driver.showNotification({
  text: 'Fancy Text',
  effect: 'rainbow',
  duration: 10000,
});
```

---

## Settings Reference

Complete list of AWTRIX settings keys:

| Key           | Type    | Range | Description          |
| ------------- | ------- | ----- | -------------------- |
| `BRI`         | number  | 0-255 | Brightness           |
| `ABRI`        | boolean | -     | Auto-brightness      |
| `TEMP`        | boolean | -     | Show temperature     |
| `HUM`         | boolean | -     | Show humidity        |
| `BAT`         | boolean | -     | Show battery         |
| `BLOCKKEYS`   | boolean | -     | Block physical keys  |
| `UPPERCASE`   | boolean | -     | Force uppercase text |
| `SOUND`       | boolean | -     | Enable sound         |
| `TEFF`        | string  | -     | Transition effect    |
| `ATIME`       | number  | ms    | App display time     |
| `SSPEED`      | number  | 0-100 | Scroll speed         |
| `TIME_FORMAT` | string  | -     | Time format string   |
| `DATE_FORMAT` | string  | -     | Date format string   |
| `VOL`         | number  | 0-30  | Volume               |
| `WD`          | boolean | -     | Show WiFi strength   |

---

## Icon Library

AWTRIX uses LaMetric's icon library:

- **10,000+ icons** available
- **8x8 pixel** resolution
- **Icons by ID**: `1234`
- **Preview**: <https://developer.lametric.com/icons>

**Popular Icons**:

- `2054` - Clock
- `1234` - Home
- `7956` - Weather
- `620` - Mail
- `49` - Bell/Notification

```javascript
await driver.showNotification({
  text: 'Mail',
  icon: 620, // Mail icon
});
```

---

## Integration TODO

To fully integrate AWTRIX into PIDICON:

### 1. Device Adapter Updates

```javascript
// lib/device-adapter.js

// Update DeviceProxy constructor
class DeviceProxy {
  constructor(host, deviceType = 'pixoo64', driver = 'mock') {
    this.deviceType = deviceType;

    // Select canvas based on device type
    if (deviceType === 'awtrix') {
      this.driver = new AwtrixDriver(host, { mqttClient, logger });
      this.canvas = new AwtrixCanvas(this.driver);
    } else {
      // Pixoo path (existing)
      this.canvas = new PixooCanvas();
    }
  }
}
```

### 2. Device Configuration

Update `lib/device-config-store.js` to support AWTRIX-specific settings:

```javascript
{
  "devices": {
    "kitchen_display": {
      "ip": "kitchen_display",
      "name": "Kitchen Clock",
      "deviceType": "awtrix",
      "driver": "real",
      "mqttBroker": "192.168.1.10",
      "startupScene": "clock",
      "brightness": 150
    }
  }
}
```

### 3. Web UI Updates

- Add AWTRIX device type to device selection dropdown
- Add 32x8 preview mode for scenes
- Add AWTRIX-specific settings panel
- Add icon picker UI

---

## Testing Strategy

### Mock Mode

```javascript
const driver = new AwtrixDriver('test_device', {
  mqttClient: null,
  driverType: 'mock', // No actual MQTT
});

await driver.initialize();
await driver.showNotification({ text: 'Test' });
// Logs to console, doesn't send MQTT
```

### Unit Tests

```javascript
// test/lib/drivers/awtrix-driver.test.js
const AwtrixDriver = require('../../lib/drivers/awtrix/awtrix-driver');

describe('AwtrixDriver', () => {
  it('should initialize in mock mode', async () => {
    const driver = new AwtrixDriver('test', { driverType: 'mock' });
    const result = await driver.initialize();
    assert.ok(result);
  });

  it('should build notification payload', async () => {
    const driver = new AwtrixDriver('test', { driverType: 'mock' });
    await driver.showNotification({
      text: 'Hello',
      color: '#FF0000',
    });
    // Verify stats
    assert.equal(driver.stats.messagesSent, 1);
  });
});
```

---

## Example Scene for AWTRIX

```javascript
// scenes/awtrix_clock.js
module.exports = {
  name: 'awtrix_clock',
  wantsLoop: true,

  metadata: {
    description: 'Simple clock for AWTRIX 32x8 display',
    deviceTypes: ['awtrix'],
  },

  async init(context) {
    this.lastMinute = -1;
  },

  async render(context) {
    const now = new Date();
    const minute = now.getMinutes();

    // Only update when minute changes
    if (minute === this.lastMinute) {
      return 1000; // Check again in 1 second
    }

    this.lastMinute = minute;
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Use AWTRIX-specific method if available
    if (context.env.device.createCustomApp) {
      await context.env.device.createCustomApp('clock', {
        text: timeStr,
        color: '#FFFFFF',
        icon: 2054, // Clock icon
      });
    } else {
      // Fallback to standard canvas
      await context.env.device.drawText(timeStr, [8, 0], [255, 255, 255]);
      await context.env.device.push();
    }

    return 1000; // Update every second
  },

  async cleanup(context) {
    // Remove custom app
    if (context.env.device.removeCustomApp) {
      await context.env.device.removeCustomApp('clock');
    }
  },
};
```

---

## Performance Considerations

**MQTT Message Rate**:

- Don't exceed ~10 messages/second
- Batch updates when possible
- Use CustomApp for persistent content
- Use notifications for temporary overlays

**Buffer Management**:

- RGB565 buffer: 256 pixels × 2 bytes = 512 bytes
- Clear buffer after push to avoid memory leaks
- Mark buffer as dirty only when changed

**Connection Resilience**:

- MQTT reconnection handled by MqttService
- Mock mode for offline development
- Graceful degradation on connection loss

---

## Troubleshooting

### Driver not sending messages

**Check**:

1. MqttService is connected: `mqttService.isConnected()`
2. Device ID is correct (matches AWTRIX device)
3. Driver initialized: `driver.initialized === true`
4. MQTT broker is reachable

### Messages sent but display not updating

**Check**:

1. Verify topic format: `awtrix_{deviceId}/notify`
2. Check AWTRIX device logs via web UI
3. Verify payload format (valid JSON)
4. Test with mosquitto_pub directly

### Colors not displaying correctly

**Issue**: Color format mismatch  
**Solution**: Use hex strings: `#RRGGBB`

**Issue**: Dim colors  
**Solution**: Increase brightness: `setBrightness(255)`

---

## References

**Official Documentation**:

- [AWTRIX 3 API](https://blueforcer.github.io/awtrix3/#/api)
- [GitHub Repository](https://github.com/Blueforcer/awtrix3)
- [LaMetric Icon Library](https://developer.lametric.com/icons)

**PIDICON Files**:

- `lib/drivers/awtrix/awtrix-driver.js` - Core driver
- `lib/drivers/awtrix/awtrix-canvas.js` - Canvas adapter
- `lib/drivers/awtrix/constants.js` - Constants and API definitions
- `docs/BACKLOG.md` - ROADMAP-001 status

---

**Status**: ✅ Core driver complete (7/8 criteria)  
**Next Steps**: Device adapter integration, Web UI, hardware testing  
**Build**: #700  
**Date**: 2025-10-13
