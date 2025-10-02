# Services - Business Logic Layer

This directory contains service classes that encapsulate business logic for the
Pixoo Daemon. Services provide a clean API for core operations, used by both
MQTT handlers and the Web UI.

---

## 📁 Files

### **Core Services**

- **`scene-service.js`** - Scene management operations
- **`device-service.js`** - Device management operations
- **`system-service.js`** - Daemon/system operations

---

## 🎯 Purpose

Services solve the "code duplication" problem when you have multiple interfaces
(MQTT, Web UI, CLI) that need to perform the same operations.

**Without Services** (Code Duplication):

```text
MQTT Handler        Web UI Handler
    ↓                   ↓
[50 lines of         [50 lines of
 scene logic]         DUPLICATE logic]
```

**With Services** (Single Source of Truth):

```text
MQTT Handler        Web UI Handler
    ↓                   ↓
    └───────┬───────────┘
            ↓
      SceneService
            ↓
   [50 lines of logic - ONCE]
```

---

## 🔧 Usage

### Example: Scene Operations

```javascript
// In MQTT handler or Web UI:
const sceneService = container.resolve('sceneService');

// Switch to a scene
await sceneService.switchToScene('192.168.1.159', 'clock', {
  clear: true,
  payload: { color: 'blue' },
});

// List all scenes
const scenes = await sceneService.listScenes();

// Get current scene
const current = await sceneService.getCurrentScene('192.168.1.159');
```

### Example: Device Operations

```javascript
const deviceService = container.resolve('deviceService');

// List all devices
const devices = await deviceService.listDevices();

// Turn display off
await deviceService.setDisplayPower('192.168.1.159', false);

// Reset device
await deviceService.resetDevice('192.168.1.159');

// Switch driver
await deviceService.switchDriver('192.168.1.159', 'mock');
```

### Example: System Operations

```javascript
const systemService = container.resolve('systemService');

// Get daemon status
const status = await systemService.getStatus();
// → { version, uptime, memory, ... }

// Restart daemon
await systemService.restartDaemon();

// Get logs
const logs = await systemService.getLogs(50);
```

---

## 🏗️ Architecture

### Service Layer Pattern

```text
┌────────────────────────────────────────┐
│         Interfaces (Entry Points)      │
│  ┌──────────┐  ┌──────────┐ ┌───────┐ │
│  │   MQTT   │  │  Web UI  │ │  CLI  │ │
│  └─────┬────┘  └─────┬────┘ └───┬───┘ │
└────────┼─────────────┼──────────┼─────┘
         │             │          │
         └──────┬──────┴──────────┘
                ↓
┌───────────────────────────────────────┐
│      Service Layer (Business Logic)   │
│  ┌───────────────┐  ┌───────────────┐│
│  │ SceneService  │  │ DeviceService ││
│  └───────┬───────┘  └───────┬───────┘│
│  ┌───────────────┐           │        │
│  │ SystemService │           │        │
│  └───────┬───────┘           │        │
└──────────┼───────────────────┼────────┘
           │                   │
           └────────┬──────────┘
                    ↓
┌───────────────────────────────────────┐
│      Domain Layer (Core Logic)        │
│  ┌────────────┐  ┌─────────────────┐ │
│  │SceneManager│  │ DeviceAdapter   │ │
│  └────────────┘  └─────────────────┘ │
│  ┌────────────┐  ┌─────────────────┐ │
│  │ StateStore │  │  MqttService    │ │
│  └────────────┘  └─────────────────┘ │
└───────────────────────────────────────┘
```

### Benefits

1. **No Code Duplication**: Write business logic once, use everywhere
2. **Testability**: Mock services easily, test interfaces separately
3. **Maintainability**: Fix bugs once, affects all interfaces
4. **Extensibility**: Add new interfaces (mobile app, CLI) without rewriting logic
5. **Clear Separation**: Interfaces handle I/O, services handle business logic

---

## 📝 Service Contracts

### SceneService

**Methods**:

- `switchToScene(deviceIp, sceneName, options)` - Switch to a scene
- `listScenes()` - Get all available scenes
- `getCurrentScene(deviceIp)` - Get current scene for device

**Example**:

```javascript
const result = await sceneService.switchToScene('192.168.1.159', 'clock', {
  clear: true,
  payload: { brightness: 80 },
});
// → { success: true, deviceIp, sceneName, message }
```

### DeviceService

**Methods**:

- `listDevices()` - Get all configured devices with status
- `getDeviceInfo(deviceIp)` - Get detailed device information
- `setDisplayPower(deviceIp, on)` - Turn display on/off
- `resetDevice(deviceIp)` - Soft reset device
- `switchDriver(deviceIp, driver)` - Switch between real/mock driver
- `getDeviceMetrics(deviceIp)` - Get device metrics (FPS, errors)

**Example**:

```javascript
const devices = await deviceService.listDevices();
// → [{ ip, driver, currentScene, status, metrics }]

await deviceService.setDisplayPower('192.168.1.159', false);
// → { success: true, displayOn: false, message }
```

### SystemService

**Methods**:

- `getStatus()` - Get daemon status (version, uptime, memory)
- `restartDaemon()` - Restart the daemon
- `getLogs(lines)` - Get recent log lines (placeholder)

**Example**:

```javascript
const status = await systemService.getStatus();
// → { version, buildNumber, uptime, memory, status }

await systemService.restartDaemon();
// → { success: true, message: 'Daemon restarting...' }
```

---

## 🧪 Testing

Services are designed to be easily testable with mocked dependencies:

```javascript
// Example: Testing SceneService
const mockSceneManager = {
  hasScene: jest.fn(() => true),
  switchScene: jest.fn(() => Promise.resolve(true)),
  getDeviceSceneState: jest.fn(() => ({ currentScene: 'clock' })),
};

const sceneService = new SceneService({
  logger: mockLogger,
  sceneManager: mockSceneManager,
  deviceAdapter: mockDeviceAdapter,
  mqttService: mockMqttService,
  versionInfo: mockVersionInfo,
});

await sceneService.switchToScene('192.168.1.159', 'clock');

expect(mockSceneManager.switchScene).toHaveBeenCalled();
```

---

## 🔒 Error Handling

All services follow consistent error handling:

1. **Validation Errors**: Missing/invalid parameters → throw `ValidationError`
2. **Execution Errors**: Scene not found, device offline → throw with context
3. **Best-Effort Operations**: MQTT publishing → log warning, don't throw

**Example**:

```javascript
try {
  await sceneService.switchToScene('192.168.1.159', 'invalid-scene');
} catch (error) {
  // error instanceof ValidationError
  // error.message === "Scene 'invalid-scene' not found"
}
```

---

## 📚 Related Documentation

- **[../commands/README.md](../commands/README.md)** - Command handlers that use services
- **[../README.md](../README.md)** - Core utilities overview
- **[../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)** - System architecture

---

## 🎓 When to Add Services

Add a new service when:

1. **Multiple interfaces** need the same logic (MQTT + Web UI)
2. **Complex business logic** that's >30 lines
3. **Reusable operations** across different handlers

Don't add services for:

- Simple CRUD operations (just use repositories)
- Interface-specific logic (belongs in handlers)
- Infrastructure concerns (belongs in adapters)

---

**See Also**: `docs/BACKLOG.md` for ARC-305 (Service Layer) implementation details.
