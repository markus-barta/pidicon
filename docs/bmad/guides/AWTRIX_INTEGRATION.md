# Awtrix/Ulanzi Integration Guide

**PIDICON support for Awtrix 3 / Ulanzi TC001 (32x8 pixel displays)**

---

## Overview

PIDICON now supports [Awtrix 3](https://github.com/Blueforcer/awtrix3) devices (like the Ulanzi TC001) via **HTTP API**. This allows you to:

- Display time, weather, home automation stats
- Send notifications
- Control brightness, sleep mode
- Use custom apps with scrolling text and icons
- Draw primitives (text, lines, rectangles)

**Key Differences from Pixoo:**

| Feature          | Pixoo (64x64) | Awtrix (32x8)    |
| ---------------- | ------------- | ---------------- |
| Resolution       | 64x64 pixels  | 32x8 pixels      |
| Protocol         | HTTP          | **HTTP**         |
| Text             | Bitmap font   | Native scrolling |
| Icons            | None          | 10,000+ built-in |
| Audio            | Basic tones   | RTTTL/DFPlayer   |
| Pixel-level draw | ✅ Full       | ⚠️ Draw commands |

---

## Quick Start

### 1. Add Awtrix Device to Config

```json
{
  "devices": [
    {
      "ip": "192.168.1.100",
      "name": "Kitchen Display",
      "deviceType": "awtrix",
      "driver": "real",
      "startupScene": "awtrix_startup",
      "brightness": 80,
      "watchdog": { "enabled": false }
    }
  ]
}
```

Or via Web UI:

1. Open Device Management
2. Click "Add Device"
3. Select "Awtrix" as device type
4. Enter device IP address (e.g., `192.168.1.100`)
5. Set driver to "real"

**Note:** Awtrix uses HTTP communication, so you only need the IP address.

### 2. Create an Awtrix Scene

```javascript
// scenes/my_awtrix_scene.js
const name = 'my_awtrix_scene';
const wantsLoop = true;
const deviceTypes = ['awtrix']; // Only show for Awtrix devices

async function render(ctx) {
  const { device } = ctx;

  // Use Awtrix's native scrolling text
  await device.createCustomApp('my_app', {
    text: 'Hello Awtrix!',
    color: '#00FF00',
    scrollSpeed: 50,
  });

  return 1000; // Update every second
}

module.exports = { name, wantsLoop, deviceTypes, render };
```

### 3. Assign Scene to Device

Via Web UI or MQTT command:

```bash
mosquitto_pub -t 'pidicon/cmd/scene' -m '{
  "device": "192.168.1.100",
  "scene": "my_awtrix_scene"
}'
```

---

## Architecture

### Communication Flow

```
PIDICON (HTTP client)
    ↓
Awtrix Device (HTTP API @ http://{ip}/api)
    - POST /api/custom/{appName}    → Persistent apps
    - POST /api/notify              → Temporary notifications
    - POST /api/settings            → Device settings
    - GET  /api/stats               → Device status
```

### Driver Stack

```
DeviceDriver (abstract base)
    ↑
AwtrixDriver (HTTP client)
    ↑
AwtrixCanvas (compatibility layer)
```

The `AwtrixDriver` provides HTTP-based communication, while `AwtrixCanvas` provides a Pixoo-like API for scenes.

---

## Scene Development

### Basic Scene Structure

```javascript
const name = 'awtrix_example';
const wantsLoop = true; // true = updates periodically
const deviceTypes = ['awtrix']; // ⚠️ REQUIRED for Awtrix-only scenes

async function render(ctx) {
  const { device, state } = ctx;

  // Get data from state store (set via MQTT/API)
  const temp = state.get('home_temp') || 22;

  // Create custom app with text
  await device.createCustomApp('temp_display', {
    text: `${temp}°C`,
    color: '#FFD700',
    icon: 2422, // Weather icon from Awtrix library
  });

  return 5000; // Update every 5 seconds
}

module.exports = { name, wantsLoop, deviceTypes, render };
```

### Awtrix-Specific Features

#### 1. Native Scrolling Text

```javascript
await device.createCustomApp('scroller', {
  text: 'This text will scroll across the display',
  color: '#00FF00',
  scrollSpeed: 50, // Pixels per second
});
```

#### 2. Icons (10,000+ Built-in)

```javascript
await device.createCustomApp('weather', {
  text: '24°C',
  color: '#FFD700',
  icon: 2422, // Cloud icon
  duration: 10000, // Show for 10 seconds
});
```

Browse icons: <https://developer.lametric.com/icons>

#### 3. Draw Commands (Raw Pixel Control)

```javascript
const drawCommands = {
  draw: [
    // Draw text at position
    { dt: [x, y, 'Text', '#FFFFFF'] },

    // Draw line
    { dl: [x1, y1, x2, y2, '#FF0000'] },

    // Draw rectangle
    { dr: [x, y, width, height, '#00FF00'] },

    // Draw filled rectangle
    { df: [x, y, width, height, '#0000FF'] },

    // Draw circle
    { dc: [x, y, radius, '#FFFF00'] },

    // Draw filled circle
    { dfc: [x, y, radius, '#FF00FF'] },
  ],
};

await device.createCustomApp('custom_draw', drawCommands);
```

**Draw Command Reference:**

#### 1. Draw Text (`dt`)

```javascript
{
  dt: [x, y, 'Text', '#FFFFFF'];
}
```

- `x, y`: Position (0,0 = top-left)
- Text: String to display
- Color: Hex color (#RRGGBB)

#### 2. Draw Line (`dl`)

```javascript
{
  dl: [x1, y1, x2, y2, '#FF0000'];
}
```

- `x1, y1`: Start point
- `x2, y2`: End point
- Color: Hex color

#### 3. Draw Rectangle (`dr`)

```javascript
{
  dr: [x, y, width, height, '#00FF00'];
}
```

- `x, y`: Top-left corner
- Width, height: Rectangle dimensions
- Color: Hex color

#### 4. Notifications (Temporary Overlays)

```javascript
await device.showNotification({
  text: 'Alert!',
  color: '#FF0000',
  duration: 5000,
  icon: 7,
  rainbow: true, // Rainbow text effect
});
```

#### 5. Brightness Control

```javascript
await device.setBrightness(128); // 0-255
```

### Example: Time + Status Display

```javascript
const name = 'awtrix_time_status';
const wantsLoop = true;
const deviceTypes = ['awtrix'];

async function render(ctx) {
  const { device } = ctx;

  const time = new Date().toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const drawCommands = {
    draw: [
      // Time in center
      { dt: [3, 0, time, '#FFFFD5'] },

      // Status indicators
      { dr: [0, 6, 2, 2, '#00FF00'] }, // Green square
      { dl: [29, 7, 31, 7, '#FF0000'] }, // Red line
    ],
  };

  await device.createCustomApp('time_display', drawCommands);

  return 1000; // Update every second
}

module.exports = { name, wantsLoop, deviceTypes, render };
```

---

## HTTP API Reference

Awtrix communicates via HTTP REST API at `http://{ip}/api`.

Official docs: <https://blueforcer.github.io/awtrix3/#/api>

### Custom Apps (Scene Rendering)

**Endpoint:** `POST /api/custom/{appName}`

**Payload:**

```json
{
  "text": "Hello",
  "color": "#00FF00",
  "icon": 123,
  "draw": [
    { "dt": [0, 0, "Text", "#FFFFFF"] },
    { "dl": [0, 7, 31, 7, "#FF0000"] }
  ]
}
```

**To remove an app:** Send empty object `{}`

### Notifications (Temporary Overlays)

**Endpoint:** `POST /api/notify`

**Payload:**

```json
{
  "text": "Alert!",
  "color": "#FF0000",
  "icon": 7,
  "duration": 5000,
  "rainbow": true
}
```

### Settings

**Endpoint:** `POST /api/settings`

**Payload:**

```json
{
  "BRI": 128,
  "ABRI": true,
  "TEFF": "fade",
  "ATIME": 10000
}
```

### Device Stats

**Endpoint:** `GET /api/stats`

**Response:**

```json
{
  "bat": 85,
  "lux": 123,
  "temp": 24.5
}
```

---

## Device Type Filtering

Scenes can declare which device types they support:

```javascript
const deviceTypes = ['awtrix']; // Awtrix-only
```

**Rules:**

1. **Scene Declaration**

   ```javascript
   const deviceTypes = ['awtrix']; // Awtrix-only
   const deviceTypes = ['pixoo64']; // Pixoo-only
   const deviceTypes = ['awtrix', 'pixoo64']; // Both
   ```

2. **UI Filtering**  
   When you select an Awtrix device in the Web UI, only scenes with `deviceTypes: ['awtrix']` appear in the scene selector.

Existing scenes without `deviceTypes` work on all devices:

- If `deviceTypes` is undefined/empty → shown for all devices
- Default for legacy scenes: `['pixoo64', 'pixoo']`

---

## Home Automation Integration

### Updating Scene State via MQTT

**1. Update Scene State via MQTT**

```javascript
// In your Home Assistant automation
mqttService.publishSceneState({
  deviceIp: '192.168.1.100',
  sceneName: 'awtrix_timestats',
  stateKey: 'home_vr_smartlock_statusColor',
  value: '#00FF00', // Door unlocked = green
});
```

**2. Scene Reads State**

```javascript
async function render(ctx) {
  const { state } = ctx;

  const doorColor = state.get('home_vr_smartlock_statusColor') || '#FFFF00';

  const drawCommands = {
    draw: [
      { dt: [0, 0, 'Door', '#FFFFFF'] },
      { dl: [29, 7, 31, 7, doorColor] },
    ],
  };

  await device.createCustomApp('timestats', drawCommands);
  return 1000;
}
```

### Example: Node-RED → PIDICON → Awtrix

**Flow:**

1. **In Node-RED**: Publish status to MQTT

   ```javascript
   msg.topic = 'home/vr/smartlock/statusColor';
   msg.payload = '#00FF00'; // Green = unlocked
   return msg;
   ```

2. **In PIDICON Daemon**: Subscribe to MQTT and update state

   ```javascript
   mqttClient.on('message', (topic, message) => {
     if (topic === 'home/vr/smartlock/statusColor') {
       stateStore.setSceneState(
         '192.168.1.100',
         'awtrix_timestats',
         'home_vr_smartlock_statusColor',
         message.toString()
       );
     }
   });
   ```

3. **In Scene**: Read state and render

   ```javascript
   const doorColor = state.get('home_vr_smartlock_statusColor');
   ```

---

## Troubleshooting

### Common Issues

**Problem**: Awtrix scene doesn't show up
**Solution**: Check `deviceTypes` declaration:

```javascript
const deviceTypes = ['awtrix']; // Must be present!
```

**Problem**: Commands not reaching device
**Solution**:

1. Check device IP is reachable: `curl http://192.168.1.100/api/stats`
2. Verify device is powered on and connected to WiFi
3. Check PIDICON logs for HTTP errors

**Problem**: Pixoo scene appears on Awtrix
**Solution**: Scenes without `deviceTypes` show for all devices. Add:

```javascript
const deviceTypes = ['pixoo64']; // Pixoo-only
```

**Problem**: `createCustomApp` does nothing
**Solution**: Check payload format:

```javascript
// Correct ✅
{
  draw: [{ dt: [0, 0, 'Text', '#FFF'] }];
}

// Wrong ❌
{
  draw: [{ type: 'text', x: 0, y: 0 }];
}
```

---

## Example Scenes

See:

- `scenes/awtrix_startup.js` - Simple branding
- `scenes/awtrix_timestats.js` - Time + home stats (full Node-RED port)

---

## API Reference

### AwtrixDriver Methods

```javascript
// Custom apps
await driver.createCustomApp('app_name', {
  text: 'Hello',
  color: '#00FF00',
  draw: [
    /*...*/
  ],
});
await driver.removeCustomApp('app_name');

// Notifications
await driver.showNotification({
  text: 'Alert!',
  color: '#FF0000',
  duration: 5000,
});

// Settings
await driver.setBrightness(128); // 0-255
await driver.updateSettings({ BRI: 128, ABRI: true });
await driver.setSleepMode(true);

// Audio (RTTTL)
await driver.playRTTTL('melody:d=4,o=5,b=100:8c,8d,8e');
await driver.playTone(440, 1000); // 440Hz for 1 second
```

### AwtrixCanvas Methods

Provides Pixoo-like API for compatibility:

```javascript
const canvas = new AwtrixCanvas(driver);

// Drawing (accumulates operations)
await canvas.drawText('Hello', [0, 0], [255, 255, 255]);
await canvas.drawLine([0, 0], [31, 7], [255, 0, 0]);
await canvas.fillRect([0, 0], [10, 10], [0, 255, 0]);

// Push to device
await canvas.push();

// Control
await canvas.clear();
await canvas.setBrightness(128);
```

---

## MQTT Topics (For State Management Only)

PIDICON uses MQTT for scene state management, NOT for device communication:

```
pidicon/state/{deviceIp}/{sceneName}/{key}
```

**Example:**

```bash
# Update scene state
mosquitto_pub -t 'pidicon/state/192.168.1.100/awtrix_timestats/door_status' -m 'open'

# Scene reads this via: state.get('door_status')
```

---

## Next Steps

1. **Create your first Awtrix scene** using `scenes/awtrix_startup.js` as template
2. **Add your Awtrix device** to `config/devices.json`
3. **Integrate with home automation** via MQTT state updates
4. **Explore icons** at <https://developer.lametric.com/icons>
5. **Read official Awtrix docs** at <https://blueforcer.github.io/awtrix3>

---

**Questions?** Check the [PIDICON documentation](../README.md) or [Awtrix official docs](https://blueforcer.github.io/awtrix3).
