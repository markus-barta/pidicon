# PIDICON Architecture Documentation

**Part:** Backend Daemon  
**Generated:** 2025-11-08  
**Version:** 3.2.1

## Executive Summary

The PIDICON backend daemon is a sophisticated event-driven system built on Node.js that manages pixel display devices through MQTT, HTTP, and WebSocket protocols. It features a clean service-oriented architecture with dependency injection, centralized state management, and hot-swappable device drivers.

## Technology Stack

| Category             | Technology        | Version      | Purpose                             |
| -------------------- | ----------------- | ------------ | ----------------------------------- |
| **Runtime**          | Node.js           | 24+ (Alpine) | JavaScript execution environment    |
| **Messaging**        | MQTT              | 5.9.0        | Device control and home automation  |
| **WebSocket**        | Socket.IO         | 4.8.1        | Real-time UI updates                |
| **HTTP Server**      | Express           | 5.1.0        | REST API and static serving         |
| **Image Processing** | Sharp             | 0.33.5       | High-performance image manipulation |
| **Graphics**         | Chart.js, ECharts | 4.5, 6.0     | Chart rendering                     |
| **Validation**       | Joi               | 17.13.3      | Schema validation                   |
| **Testing**          | Node test runner  | Built-in     | Unit and integration testing        |

## Architecture Pattern

**Pattern:** Event-Driven Microservices with Dependency Injection

**Core Principles:**

1. **Single Responsibility** - Each service handles one concern
2. **Dependency Injection** - Loose coupling via DI container
3. **Command Pattern** - MQTT messages routed to handlers
4. **Centralized State** - StateStore as single source of truth
5. **Pure Render Contract** - Scenes just render, no side effects
6. **Hot-Swappable Drivers** - Runtime driver switching

## System Components

### 1. Core Services (`lib/services/`)

#### **DeviceService** (`device-service.js`)

- Device lifecycle management
- Driver registration and switching
- Device health monitoring
- Configuration validation

#### **SceneService** (`scene-service.js`)

- Scene lifecycle (start, stop, pause, resume)
- Scene state publishing to MQTT
- Error handling and recovery

#### **SchedulerService** (`scheduler-service.js`)

- Time-based scene activation
- Weekday filtering
- Schedule management per device

#### **WatchdogService** (`watchdog-service.js`)

- Device health monitoring
- Auto-restart on failure
- Fallback scene activation
- MQTT command execution on failure

#### **MqttConfigService** (`mqtt-config-service.js`)

- MQTT connection configuration
- Credentials management
- Configuration persistence

#### **SystemService** (`system-service.js`)

- System status aggregation
- Version information
- Deployment tracking

#### **DiagnosticsService** (`diagnostics-service.js`)

- Test results parsing
- System diagnostics
- Health checks

#### **ReleaseChecker** (`release-checker.js`)

- GitHub release monitoring
- Update notifications
- Deployment tracking

### 2. Command Handlers (`lib/commands/`)

**Pattern:** Command pattern for MQTT message routing

#### **StateCommandHandler** (`state-command-handler.js`)

- Handles `pixoo/+/state/upd` messages
- Scene switching and parameter updates
- State publishing to MQTT

#### **SceneCommandHandler** (`scene-command-handler.js`)

- Handles `pixoo/+/scene/set` messages
- Direct scene control
- Play/pause/stop/restart commands

#### **DriverCommandHandler** (`driver-command-handler.js`)

- Handles `pixoo/+/driver/set` messages
- Hot-swaps device drivers
- Validates driver availability

#### **ResetCommandHandler** (`reset-command-handler.js`)

- Handles `pixoo/+/reset/set` messages
- Soft/hard device resets
- Screen clearing

### 3. Core Infrastructure

#### **DIContainer** (`di-container.js`)

- Dependency injection container
- Service registration and resolution
- Lazy initialization
- Circular dependency detection

#### **StateStore** (`state-store.js`)

- Centralized state management
- Three state types:
  - Global state (daemon-wide)
  - Device states (per-device runtime)
  - Scene states (per-scene application state)
- State persistence to `/data/runtime-state.json`
- 10-second debounced writes

#### **MqttService** (`mqtt-service.js`)

- MQTT connection management
- Message routing to handlers
- Subscription management
- Auto-reconnect with backoff
- Connection state tracking

#### **SceneManager** (`scene-manager.js`)

- Scene registration and discovery
- Scene lifecycle coordination
- Per-device scene loops
- Frame gating (prevents stale frames)
- Performance metrics tracking

#### **SceneLoader** (`scene-loader.js`)

- Dynamic scene discovery
- Hot-reload capability
- Scene metadata extraction
- Validation

### 4. Device Drivers

**Architecture:** Abstract driver interface with concrete implementations

#### **DeviceDriver** (`core/device-driver.js`)

- Abstract base class
- Methods: `initialize()`, `push()`, `clear()`, `getBrightness()`, etc.

#### **PixooDriver** (`drivers/pixoo/pixoo-driver.js`)

- HTTP-based implementation
- Endpoint: `POST http://{ip}:80/post`
- 64x64 pixel canvas
- Brightness control
- Full feature support

#### **AwtrixDriver** (`drivers/awtrix/awtrix-driver.js`)

- MQTT-based implementation
- 32x8 pixel canvas
- Implementation in progress

**Driver Capabilities System:**

- Feature detection (brightness, display power, rotation)
- Per-driver capability flags
- Runtime capability queries

### 5. Graphics & Rendering

#### **GraphicsEngine** (`graphics-engine.js`)

- Device-agnostic drawing API
- Primitives: fillRect, drawText, drawLine, drawCircle
- Gradients: linear, radial, conical
- Font rendering with custom fonts
- Performance optimizations

#### **PixooCanvas** (`pixoo-canvas.js`)

- Canvas abstraction for pixel displays
- RGB buffer management
- Push optimization (only send changed pixels)
- Metrics tracking (frametime, pushes, errors)

#### **Font** (`font.js`)

- Bitmap font rendering
- Multiple font sizes
- Text measurement
- Alignment support

### 6. Scene Framework

#### **SceneBase** (`scene-base.js`)

- Base class for all scenes
- Lifecycle hooks: `init()`, `render()`, `cleanup()`
- State management helpers
- Context access

#### **Scene Contract:**

```javascript
{
  name: string,           // Unique scene identifier
  description: string,    // Human-readable description
  category: string,       // Grouping category
  wantsLoop: boolean,     // true = animated, false = static

  async init(ctx) {},     // One-time setup
  async render(ctx) {     // Frame rendering
    // Return delay in ms for next frame
    // or null to finish
    return 1000;
  },
  async cleanup(ctx) {}   // Resource cleanup
}
```

### 7. API Layer (`web/server.js`)

**REST Endpoints:**

- `GET /api/status` - System status and metrics
- `GET /api/devices` - List all devices
- `POST /api/devices` - Add new device
- `PUT /api/devices/:deviceIp` - Update device
- `DELETE /api/devices/:deviceIp` - Remove device
- `POST /api/devices/:deviceIp/test` - Test device connection
- `GET /api/scenes` - List all scenes
- `GET /api/scenes/:deviceIp` - Device-specific scenes
- `POST /api/scenes/:deviceIp/schedule` - Create schedule
- `GET /api/config/*` - Configuration endpoints
- `POST /api/mqtt/connect` - MQTT connect
- `POST /api/mqtt/disconnect` - MQTT disconnect
- `GET /api/diagnostics` - System diagnostics

**WebSocket Events:**

- `device-state-changed` - Device status updates
- `scene-changed` - Scene transition events
- `metrics-updated` - Performance metrics
- `mqtt-status-changed` - MQTT connection status

## Data Flow

### Scene Rendering Flow

```
1. MQTT Message → MqttService
2. MqttService → CommandRouter
3. CommandRouter → StateCommandHandler
4. StateCommandHandler → SceneService.startScene()
5. SceneService → SceneManager.switchScene()
6. SceneManager → Scene.init()
7. SceneManager starts render loop:
   a. Scene.render() → returns delay
   b. Device.push() → sends pixels
   c. WebSocket broadcast → UI update
   d. MQTT publish → state update
   e. Wait delay ms
   f. Loop to (a)
```

### State Persistence Flow

```
1. Device state change
2. StateStore.setDeviceState()
3. StateStore._markDirty()
4. 10-second debounce timer starts
5. (If no changes for 10s)
6. StateStore.persist()
7. Write to /data/runtime-state.json
8. Atomic rename (temp → final)
```

### WebSocket Broadcast Flow

```
1. Device state changes
2. SceneManager detects change
3. publishOk() callback invoked
4. WebSocket server broadcasts
5. All connected UI clients receive update
6. UI updates in < 100ms
```

## Configuration

### Device Configuration

Stored in `/data/devices-config.json`:

```json
{
  "devices": [
    {
      "ip": "192.168.1.159",
      "name": "Living Room Display",
      "deviceType": "pixoo64",
      "driver": "real",
      "startupScene": "startup",
      "brightness": 100,
      "watchdog": {
        "enabled": true,
        "checkIntervalSeconds": 60,
        "maxFailures": 3,
        "action": "restart_daemon",
        "fallbackScene": "startup"
      }
    }
  ]
}
```

### MQTT Configuration

Stored in `/data/mqtt-config.json`:

```json
{
  "brokerUrl": "mqtt://localhost:1883",
  "username": "user",
  "password": "pass",
  "autoReconnect": true
}
```

### Runtime State

Stored in `/data/runtime-state.json`:

```json
{
  "version": 1,
  "timestamp": "2025-11-08T17:00:00.000Z",
  "daemon": {
    "startTime": 1699459200000,
    "lastHeartbeat": 1699459800000
  },
  "devices": {
    "192.168.1.159": {
      "activeScene": "startup",
      "playState": "playing",
      "brightness": 100,
      "displayOn": true,
      "loggingLevel": "warning"
    }
  }
}
```

## Development Patterns

### Adding a New Service

1. Create service class in `lib/services/`
2. Implement constructor with DI dependencies
3. Register in DI container (`daemon.js`)
4. Inject into dependent services
5. Add unit tests in `test/lib/`

### Adding a MQTT Command Handler

1. Create handler class extending `CommandHandler`
2. Implement `handle(deviceIp, action, payload)` method
3. Register in CommandRouter (`daemon.js`)
4. Add contract test in `test/contracts/`

### Adding a New Device Driver

1. Extend `DeviceDriver` base class
2. Implement required methods
3. Add driver-specific canvas if needed
4. Register capabilities
5. Add integration tests

## Testing Strategy

- **Unit Tests:** `test/lib/*.test.js` (49 files)
- **Integration Tests:** `test/integration/*.test.js` (5 files)
- **Contract Tests:** `test/contracts/*.test.js` (2 files)
- **Total:** 522 tests passing

**Test Coverage:**

- Services: Comprehensive unit tests
- Command handlers: Contract tests
- State management: Integration tests
- Scene framework: Unit + integration tests

## Deployment

**Container:** Docker multi-stage build

**Build Stage:**

- Install all dependencies
- Build version info
- Build Vue frontend
- Run tests

**Production Stage:**

- Node 24 Alpine (minimal)
- Production dependencies only
- Health checks disabled by default
- Self-restart capable

**Runtime:**

- Port: 10829 (Web UI)
- Volume: `/data` (persistent config/state)
- Environment: `NODE_ENV=production`

## Performance Characteristics

- **Scene Render Time:** < 50ms typical
- **WebSocket Latency:** < 100ms
- **MQTT Response:** < 200ms
- **State Persistence:** 10s debounce
- **Memory Usage:** ~150MB (typical)
- **CPU Usage:** < 5% (idle), < 20% (active rendering)

## Error Handling

1. **Service Layer:** Try-catch with logging
2. **Command Handlers:** Error responses via MQTT
3. **Scene Rendering:** Fallback to error scene
4. **Device Communication:** Retry with exponential backoff
5. **MQTT:** Auto-reconnect with backoff
6. **WebSocket:** Client auto-reconnect

## Logging

**Levels:** debug, info, warning, error, silent

**Format:** Structured JSON logs with:

- Timestamp
- Level
- Message
- Metadata (contextual data)

**Per-Device Logging:** Configurable via StateStore

## Future Considerations

- Additional device drivers (LED strips, e-paper, etc.)
- Plugin system for custom scenes
- Multi-user authentication
- Cloud synchronization
- Mobile app integration
