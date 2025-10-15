# PIDICON API Documentation

**Version**: 3.1.0  
**Last Updated**: 2025-10-13 (Build #697+)

Complete API reference for PIDICON (Pixel Display Controller) services, commands, and integrations.

**Multi-Device Support**: v3.0+ supports multiple device types (Pixoo 64x64, AWTRIX 32x8, etc.)

---

## Table of Contents

- [Service Layer API](#service-layer-api)
  - [DeviceService](#deviceservice)
  - [SceneService](#sceneservice)
  - [SystemService](#systemservice)
- [Web REST API](#web-rest-api)
  - [Device Configuration API (v3.0+)](#device-configuration-api-v30)
  - [Scene Control API](#scene-control-api)
  - [System API](#system-api)
- [WebSocket API](#websocket-api)
- [MQTT Protocol](#mqtt-protocol)
  - [Multi-Device MQTT Topics (v3.0+)](#multi-device-mqtt-topics-v30)
- [Scene Development API](#scene-development-api)
- [Graphics Engine API](#graphics-engine-api)

---

## Service Layer API

The service layer provides high-level business logic operations. All services are injectable via the DI container.

### DeviceService

**Location**: `lib/services/device-service.js`

Manages Pixoo devices, driver switching, and device operations.

#### Methods

##### `listDevices()`

Get all configured devices with their current state.

**Returns**: `Promise<Array<Device>>`

```javascript
const devices = await deviceService.listDevices();
// [{ ip, driver, currentScene, status, metrics, ... }]
```

##### `getDevice(ip)`

Get information for a specific device.

**Parameters:**

- `ip` (string) - Device IP address

**Returns**: `Promise<Device>`

```javascript
const device = await deviceService.getDevice('192.168.1.100');
```

##### `switchDriver(ip, driver)`

Switch device driver (real/mock).

**Parameters:**

- `ip` (string) - Device IP address
- `driver` (string) - 'real' or 'mock'

**Returns**: `Promise<{success: boolean, message: string}>`

```javascript
await deviceService.switchDriver('192.168.1.100', 'mock');
```

##### `setDisplayPower(ip, on)`

Turn display on/off.

**Parameters:**

- `ip` (string) - Device IP address
- `on` (boolean) - true = on, false = off

**Returns**: `Promise<{success: boolean}>`

##### `setDisplayBrightness(ip, brightness)`

Set display brightness (0-100).

**Parameters:**

- `ip` (string) - Device IP address
- `brightness` (number) - Brightness level (0-100)

**Returns**: `Promise<{success: boolean}>`

##### `resetDevice(ip)`

Soft reset device.

**Parameters:**

- `ip` (string) - Device IP address

**Returns**: `Promise<{success: boolean}>`

---

### SceneService

**Location**: `lib/services/scene-service.js`

Manages scene lifecycle, switching, and scene parameters.

#### Methods

##### `listScenes()`

List all available scenes with metadata.

**Returns**: `Promise<Array<Scene>>`

```javascript
const scenes = await sceneService.listScenes();
// [{ name, wantsLoop, metadata, filePath, sceneNumber }]
```

##### `switchScene(deviceIp, sceneName, options)`

Switch to a different scene.

**Parameters:**

- `deviceIp` (string) - Target device IP
- `sceneName` (string) - Scene name
- `options` (object) - Optional settings
  - `clear` (boolean) - Clear screen before switch

**Returns**: `Promise<{success: boolean}>`

```javascript
await sceneService.switchScene('192.168.1.100', 'startup', { clear: true });
```

##### `pauseScene(deviceIp)`

Pause the current scene (animation freezes).

**Parameters:**

- `deviceIp` (string) - Target device IP

**Returns**: `Promise<{success: boolean}>`

##### `resumeScene(deviceIp)`

Resume a paused scene.

**Parameters:**

- `deviceIp` (string) - Target device IP

**Returns**: `Promise<{success: boolean}>`

##### `stopScene(deviceIp)`

Stop the current scene (clears screen).

**Parameters:**

- `deviceIp` (string) - Target device IP

**Returns**: `Promise<{success: boolean, currentScene: string}>`

##### `getCurrentScene(deviceIp)`

Get current scene information.

**Parameters:**

- `deviceIp` (string) - Target device IP

**Returns**: `Promise<{currentScene: string, status: string, playState: string}>`

---

### SystemService

**Location**: `lib/services/system-service.js`

System-wide operations and status.

#### Methods

##### `getStatus()`

Get daemon status and build information.

**Returns**: `Promise<Object>`

```javascript
const status = await systemService.getStatus();
// { version, buildNumber, uptime, devices, scenes, ... }
```

##### `restartDaemon()`

Restart the daemon process.

**Returns**: `Promise<{success: boolean}>`

---

## Web REST API

**Base URL**: `http://localhost:10829/api`

All endpoints return JSON. Errors return `{error: string}`.

---

### Device Configuration API (v3.0+)

Manage device configurations, startup scenes, brightness, and watchdog settings via Web UI.

**New in v3.0**: Device configurations are stored in `config/devices.json` (gitignored) and can be managed via REST API without editing environment variables or restarting the daemon.

#### `GET /api/config/devices`

List all configured devices.

**Response:**

```json
[
  {
    "id": "pidicon-1697123456789",
    "name": "Living Room Pixoo",
    "ip": "192.168.1.100",
    "deviceType": "pixoo64",
    "driver": "real",
    "startupScene": "startup",
    "brightness": 80,
    "watchdog": {
      "enabled": true,
      "unresponsiveThresholdHours": 4,
      "action": "restart",
      "fallbackScene": "empty",
      "mqttCommandSequence": []
    }
  }
]
```

#### `GET /api/config/devices/:ip`

Get configuration for a specific device.

**Parameters:**

- `ip` (path) - Device IP address

**Response:** Single device configuration object (see above)

#### `POST /api/config/devices`

Add a new device configuration.

**Request Body:**

```json
{
  "name": "Office AWTRIX",
  "ip": "192.168.1.200",
  "deviceType": "awtrix",
  "driver": "real",
  "startupScene": "clock",
  "brightness": 60,
  "watchdog": {
    "enabled": true,
    "unresponsiveThresholdHours": 2,
    "action": "mqtt-command",
    "mqttCommandSequence": [
      { "topic": "awtrix_abc123/reboot", "payload": "true" }
    ]
  }
}
```

**Response:** Created device configuration with generated `id`

#### `PUT /api/config/devices/:ip`

Update an existing device configuration.

**Parameters:**

- `ip` (path) - Device IP address

**Request Body:** Partial or full device configuration (same as POST)

**Response:** Updated device configuration

#### `DELETE /api/config/devices/:ip`

Remove a device configuration.

**Parameters:**

- `ip` (path) - Device IP address

**Response:**

```json
{
  "success": true,
  "message": "Device 192.168.1.100 removed"
}
```

#### `POST /api/config/devices/:ip/test`

Test connectivity to a device without adding it to the configuration.

**Parameters:**

- `ip` (path) - Device IP address

**Query Parameters (optional):**

- `deviceType` - Device type to test (default: `pixoo64`)
- `driver` - Driver to use (`real` or `mock`, default: `real`)

**Response:**

```json
{
  "success": true,
  "message": "Device is reachable",
  "latency": 45
}
```

Or error response:

```json
{
  "success": false,
  "error": "Connection timeout"
}
```

#### `GET /api/scenes/list`

List available scenes, optionally filtered by device type.

**Query Parameters (optional):**

- `deviceType` - Filter scenes compatible with device type (e.g., `pixoo64`, `awtrix`)

**Response:**

```json
{
  "scenes": [
    {
      "name": "startup",
      "path": "scenes/startup.js",
      "compatibleWith": ["pixoo64", "awtrix"]
    },
    {
      "name": "pixoo_showcase",
      "path": "scenes/examples/pixoo_showcase.js",
      "compatibleWith": ["pixoo64"]
    }
  ]
}
```

---

### Scene Control API

#### Devices

#### `GET /api/devices`

List all devices.

**Response:**

```json
{
  "devices": [
    {
      "ip": "192.168.1.100",
      "driver": "real",
      "currentScene": "startup",
      "status": "running",
      "playState": "playing",
      "metrics": { "fps": 5, "frametime": 200, "pushes": 100 }
    }
  ]
}
```

#### `GET /api/devices/:ip`

Get specific device info.

#### `POST /api/devices/:ip/scene`

Switch scene.

**Request:**

```json
{
  "scene": "fill",
  "clear": true
}
```

#### `POST /api/devices/:ip/scene/pause`

Pause current scene.

#### `POST /api/devices/:ip/scene/resume`

Resume paused scene.

#### `POST /api/devices/:ip/scene/stop`

Stop scene and clear display.

#### `POST /api/devices/:ip/display/power`

Set display power.

**Request:**

```json
{
  "on": true
}
```

#### `POST /api/devices/:ip/display/brightness`

Set brightness.

**Request:**

```json
{
  "brightness": 75
}
```

#### `POST /api/devices/:ip/reset`

Reset device.

#### `POST /api/devices/:ip/driver`

Switch driver.

**Request:**

```json
{
  "driver": "mock"
}
```

### Scenes

#### `GET /api/scenes`

List all scenes.

**Response:**

```json
{
  "scenes": [
    {
      "name": "startup",
      "wantsLoop": true,
      "metadata": {
        "description": "Startup animation",
        "author": "mba"
      },
      "filePath": "scenes/startup.js",
      "sceneNumber": 1
    }
  ]
}
```

### System

#### `GET /api/status`

Get system status.

**Response:**

```json
{
  "version": "2.0.0",
  "buildNumber": 602,
  "uptime": 3600,
  "deviceCount": 2,
  "sceneCount": 15
}
```

#### `POST /api/restart`

Restart daemon.

---

## WebSocket API

**URL**: `ws://localhost:10829/ws`

Real-time bidirectional communication for instant updates.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:10829/ws');

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};
```

### Message Types

#### Client → Server

##### `ping`

Keepalive ping.

```json
{
  "type": "ping"
}
```

#### Server → Client

##### `init`

Initial state on connection.

```json
{
  "type": "init",
  "data": {
    "devices": [...],
    "scenes": [...],
    "timestamp": 1697040000000
  }
}
```

##### `devices_update`

Full device list update (every 5s).

```json
{
  "type": "devices_update",
  "data": [...devices...],
  "timestamp": 1697040000000
}
```

##### `device_update`

Single device update.

```json
{
  "type": "device_update",
  "deviceIp": "192.168.1.100",
  "data": { ...device... }
}
```

##### `scene_switch`

Scene changed notification.

```json
{
  "type": "scene_switch",
  "deviceIp": "192.168.1.100",
  "scene": "fill"
}
```

##### `metrics_update`

Real-time metrics.

```json
{
  "type": "metrics_update",
  "deviceIp": "192.168.1.100",
  "metrics": { "fps": 5, "frametime": 200 }
}
```

##### `pong`

Keepalive response.

```json
{
  "type": "pong",
  "timestamp": 1697040000000
}
```

---

## MQTT Protocol

**Topic Base**: `/home/pixoo` (configurable via `SCENE_STATE_TOPIC_BASE`)

### Subscribe Topics

#### `/home/pixoo/<ip>/scene/switch`

Switch scene on device.

**Payload:**

```json
{
  "scene": "fill",
  "color": [255, 0, 0, 255]
}
```

#### `/home/pixoo/<ip>/driver/switch`

Switch driver.

**Payload:**

```json
{
  "driver": "mock"
}
```

#### `/home/pixoo/<ip>/device/reset`

Reset device.

**Payload:** (empty or any)

### Publish Topics

#### `/home/pixoo/<ip>/scene/state`

Scene state updates (published on every change).

**Payload:**

```json
{
  "currentScene": "fill",
  "status": "running",
  "generationId": 42,
  "playState": "playing",
  "timestamp": 1697040000000
}
```

---

### Multi-Device MQTT Topics (v3.0+)

**Device Type Prefix**: MQTT topics remain `/home/pixoo/` for backward compatibility, but device type information is now available in device state messages.

#### Device Configuration via MQTT (Planned)

Future versions will support device-type-specific MQTT topics:

```
/home/pidicon/<deviceType>/<ip>/<command>
```

Examples:

```bash
# Pixoo device
mosquitto_pub -t "/home/pidicon/pixoo64/192.168.1.100/scene/switch" -m '{"scene":"startup"}'

# AWTRIX device
mosquitto_pub -t "/home/pidicon/awtrix/192.168.1.200/scene/switch" -m '{"scene":"clock"}'
```

#### Device State Messages (Enhanced in v3.0+)

Scene state messages now include device type and capabilities:

**Payload:**

```json
{
  "currentScene": "startup",
  "status": "running",
  "generationId": 42,
  "playState": "playing",
  "deviceType": "pixoo64",
  "capabilities": {
    "width": 64,
    "height": 64,
    "hasAudio": false
  },
  "timestamp": 1697040000000
}
```

#### Backward Compatibility

- ✅ All v2.x MQTT commands continue to work
- ✅ Topic base `/home/pixoo/` unchanged
- ✅ Existing automations require no changes
- ✅ Device type auto-detected or defaults to `pixoo64`

---

## Scene Development API

Complete guide: [SCENE_DEVELOPMENT.md](SCENE_DEVELOPMENT.md)

### Scene Structure

```javascript
module.exports = {
  name: 'my-scene',

  // Metadata (displayed in Web UI)
  metadata: {
    description: 'My awesome scene',
    author: 'Your Name',
    version: '1.0.0',
  },

  // Initialization (optional)
  async init(context) {
    // Setup scene state
    context.setState('counter', 0);
  },

  // Render function (required)
  async render(context) {
    const { device, state, getState, setState } = context;

    // Draw something
    await device.clear();
    await device.drawText(10, 10, 'Hello!', [255, 255, 255, 255]);
    await device.push();

    // Return next delay (ms) or null to stop
    return 1000; // Render again in 1 second
  },

  // Cleanup (optional)
  async cleanup(context) {
    // Clean up resources
  },

  // Animation flag
  wantsLoop: true, // false for static scenes
};
```

### Context Object

**Properties:**

- `device` - PixooCanvas instance (drawing API)
- `state` - Map for scene state
- `env` - Environment info (host, width, height)
- `payload` - MQTT payload data
- `getState(key, default)` - Get state value
- `setState(key, value)` - Set state value
- `publishOk(data)` - Publish success metrics

---

## Graphics Engine API

**Location**: `lib/graphics-engine.js`

Advanced rendering with hardware-aware animations (4-5fps optimized).

### Features

- Text effects (shadows, outlines, gradients)
- Fade transitions
- Gradient backgrounds
- Animation easing
- Resource caching

### Example Usage

```javascript
const GraphicsEngine = require('./lib/graphics-engine');
const engine = new GraphicsEngine(device);

// Enhanced text with shadow
await engine.drawTextEnhanced({
  x: 10,
  y: 10,
  text: 'Hello',
  color: [255, 255, 255, 255],
  effects: {
    shadow: {
      offsetX: 1,
      offsetY: 1,
      color: [0, 0, 0, 128],
    },
  },
});

// Fade transition
engine.startFadeTransition('in', 1000);
const alpha = engine.updateFadeTransition();

// Gradient background
await engine.drawGradientBackground(
  [255, 0, 0, 255],
  [0, 0, 255, 255],
  'vertical',
);
```

---

## Configuration

**Environment Variables:**

- `PIXOO_WEB_PORT` - Web UI port (default: 10829)
- `PIXOO_WEB_AUTH` - Basic auth "user:password" (optional)
- `MQTT_BROKER_URL` - MQTT broker URL
- `MQTT_USERNAME` - MQTT username
- `MQTT_PASSWORD` - MQTT password
- `SCENE_STATE_TOPIC_BASE` - MQTT topic base (default: /home/pixoo)

---

## Error Handling

All API methods may throw errors. Use try/catch:

```javascript
try {
  await sceneService.switchScene(ip, 'fill');
} catch (error) {
  console.error('Scene switch failed:', error.message);
}
```

**Common Errors:**

- `SceneNotFoundError` - Scene doesn't exist
- `DeviceNotFoundError` - Device not configured
- `ValidationError` - Invalid parameters
- `TimeoutError` - Operation timeout

---

## Examples

See [scenes/examples/](../scenes/examples/) for complete working examples:

- `framework-static-demo.js` - Static scene
- `framework-animated-demo.js` - Animated scene
- `framework-data-demo.js` - Data-driven scene
- `graphics-engine-demo.js` - Graphics features
- `config-validator-demo.js` - Configuration validation

---

## Support

- **Documentation**: [docs/](../docs/)
- **Issues**: GitHub Issues
- **Code Quality**: [CODE_QUALITY.md](CODE_QUALITY.md)
- **Standards**: [STANDARDS.md](../STANDARDS.md)

---

**Build**: 603 | **Version**: 2.1.0 | **Status**: Production
