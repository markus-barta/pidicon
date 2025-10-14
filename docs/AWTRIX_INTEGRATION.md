# Awtrix/Ulanzi Integration Guide

## Overview

PIDICON now supports **Awtrix (Ulanzi TC001)** 32x8 pixel LED matrix displays via MQTT protocol. This guide explains how to use Awtrix devices with PIDICON.

## Device Specifications

- **Display**: 32x8 pixels (256 total)
- **Protocol**: MQTT (primary), HTTP (supported)
- **Color**: RGB565 (16-bit) or HTML hex colors
- **Audio**: RTTTL tones supported
- **Special Features**: Icon library, scrolling text, rainbow effects

## Quick Start

### 1. Add Awtrix Device

```bash
# Via MQTT
mosquitto_pub -h $MQTT_HOST -t "pixoo/add/device" -m '{
  "name": "Kitchen Display",
  "ip": "awtrix_58197c",  # Device ID, not IP!
  "deviceType": "awtrix",
  "driver": "real",
  "startupScene": "awtrix_startup"
}'
```

Or via Web UI:

1. Open Device Management
2. Click "Add Device"
3. Set Device Type: `awtrix`
4. Enter Device ID (e.g., `awtrix_58197c`)

### 2. Configure MQTT

The Awtrix driver requires MQTT. Ensure your daemon has:

```bash
export MQTT_BROKER_URL="mqtt://your-broker:1883"
export MQTT_USERNAME="your_user"
export MQTT_PASSWORD="your_pass"
```

### 3. Available Scenes

When an Awtrix device is selected, only compatible scenes appear:

- **awtrix_startup** - Simple PIDICON branding
- **awtrix_timestats** - Time + home automation status

## Creating Awtrix Scenes

### Scene Template

```javascript
const name = 'my_awtrix_scene';

// Required metadata
const description = 'My Awtrix scene';
const category = 'Custom';
const wantsLoop = true; // true for animated, false for static
const deviceTypes = ['awtrix']; // IMPORTANT: Declares Awtrix-only

async function render(ctx) {
  const { device } = ctx;

  // Create custom app with draw commands
  const drawCommands = {
    text: 'HELLO',
    color: '#00FF00',
    // Or use draw array for pixel-level control
    // draw: [
    //   { dt: [x, y, 'text', '#color'] },
    //   { dl: [x1, y1, x2, y2, '#color'] },
    //   { dr: [x, y, width, height, '#color'] },
    // ],
  };

  await device.createCustomApp('my_app', drawCommands);

  // Return delay in ms for next frame (null for static)
  return 1000;
}

module.exports = {
  name,
  description,
  category,
  wantsLoop,
  deviceTypes, // Critical for filtering!
  render,
};
```

### Draw Commands

Awtrix supports the following draw command types:

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
- Color: Hex color (filled)

### Example: Time Display

```javascript
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
```

## MQTT Topics

Awtrix uses the following MQTT structure:

### Custom Apps (Scene Rendering)

```
awtrix_{deviceId}/custom/{appName}
```

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

**To remove an app:**

```json
{}
```

### Notifications (Temporary Overlays)

```
awtrix_{deviceId}/notify
```

**Payload:**

```json
{
  "text": "Alert!",
  "color": "#FF0000",
  "duration": 5000,
  "repeat": 2,
  "icon": 456
}
```

### Settings

```
awtrix_{deviceId}/settings
```

**Payload:**

```json
{
  "BRI": 128, // Brightness 0-255
  "ABRI": true, // Auto-brightness
  "TEFF": "fade", // Transition effect
  "ATIME": 10000 // App display time (ms)
}
```

### App Control

```
awtrix_{deviceId}/switch
```

**Payload:**

```json
{
  "name": "timestats" // Switch to specific app
}
```

## Device Type Filtering

### How It Works

1. **Scene Declaration**

   ```javascript
   const deviceTypes = ['awtrix']; // Awtrix-only
   // or
   const deviceTypes = ['pixoo64', 'pixoo']; // Pixoo-only
   // or
   const deviceTypes = ['awtrix', 'pixoo64']; // Both
   ```

2. **Backend** (`scene-service.js`)
   - `listScenes()` includes `deviceTypes` in metadata
   - Default: `['pixoo64', 'pixoo']` if not specified

3. **Frontend** (`SceneSelector.vue`)
   - Receives `:device-type="device.deviceType"`
   - Filters scenes: `scene.deviceTypes.includes(props.deviceType)`
   - Shows all scenes if `deviceTypes` is empty/null

### Backward Compatibility

Existing scenes without `deviceTypes` work on all devices:

- If `deviceTypes` is undefined/empty → shown for all devices
- Default for legacy scenes: `['pixoo64', 'pixoo']`

## Integrating with Home Automation

### Example: Home Assistant → Awtrix Scene

**1. Update Scene State via MQTT**

```javascript
// In your Home Assistant automation
mqtt.publish('pidicon/state/update', {
  deviceIp: 'awtrix_58197c',
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
      { dt: [3, 0, getTime(), '#FFFFD5'] },
      { dl: [29, 7, 31, 7, doorColor] }, // Door status
    ],
  };

  await device.createCustomApp('timestats', drawCommands);
  return 1000;
}
```

### Node-RED Integration

The `awtrix_timestats` scene is ported from Node-RED. To integrate:

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
         deviceIp,
         'awtrix_timestats',
         'home_vr_smartlock_statusColor',
         message.toString(),
       );
     }
   });
   ```

3. **Scene Uses State**: Automatically picks up changes

## API Reference

### AwtrixDriver Methods

```javascript
// Custom apps
await device.createCustomApp(appName, {
  text: 'Hello',
  color: '#00FF00',
  draw: [...],
  lifetime: 0, // 0 = permanent
});

await device.removeCustomApp(appName);

// Notifications
await device.showNotification({
  text: 'Alert',
  color: '#FF0000',
  duration: 5000,
  icon: 123,
});

// Settings
await device.setBrightness(128); // 0-255
await device.updateSettings({ BRI: 128, ABRI: true });
await device.setSleepMode(true);

// Audio
await device.playRTTTL('tone:d=4,o=5,b=100:c,d,e');
await device.playTone(440, 1000); // 440Hz for 1s
```

### Dimensions

```javascript
const AWTRIX_CONSTANTS = {
  WIDTH: 32,
  HEIGHT: 8,
  TOTAL_PIXELS: 256,
};
```

## Troubleshooting

### Scene Not Appearing in Selector

**Problem**: Awtrix scene doesn't show up
**Solution**: Check `deviceTypes` declaration:

```javascript
const deviceTypes = ['awtrix']; // Must be present!
module.exports = { ..., deviceTypes };
```

### MQTT Not Working

**Problem**: Commands not reaching device
**Solution**:

1. Check MQTT broker connection
2. Verify device ID: `awtrix_58197c` (not IP!)
3. Check MQTT topic: `awtrix_{deviceId}/custom/{appName}`

### Display Shows Wrong Content

**Problem**: Pixoo scene appears on Awtrix
**Solution**: Scenes without `deviceTypes` show for all devices. Add:

```javascript
const deviceTypes = ['pixoo64']; // Pixoo-only
```

### Draw Commands Not Rendering

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

## Limitations

1. **No Direct Pixel Access**: Awtrix uses custom apps, not raw pixel buffers
2. **32x8 Resolution**: Much smaller than Pixoo (64x64)
3. **MQTT Required**: HTTP driver exists but MQTT is recommended
4. **No Scene Migration**: Pixoo scenes need complete rewrite for Awtrix
5. **Text Positioning**: Limited control over text placement (mostly centered)

## Examples

See:

- `scenes/awtrix_startup.js` - Simple branding
- `scenes/awtrix_timestats.js` - Time + home stats (full Node-RED port)

## References

- [Awtrix 3 Documentation](https://blueforcer.github.io/awtrix3/#/api)
- [Awtrix GitHub](https://github.com/Blueforcer/awtrix3)
- [Ulanzi TC001 Hardware](https://www.ulanzi.com/products/ulanzi-pixel-smart-clock-2882)

---

**Last Updated**: 2025-10-14  
**Version**: 3.1.0  
**Author**: mba with Cursor AI
