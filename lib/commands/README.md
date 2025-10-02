# Command Handlers

## MQTT Command Processing using Command Pattern

This directory implements the Command pattern for handling MQTT messages in a
clean, testable, and maintainable way.

---

## 📁 Files

### **Core**

- **`command-handler.js`** - Base class for all command handlers
- **`command-router.js`** - Routes MQTT messages to appropriate handlers

### **Handlers**

- **`scene-command-handler.js`** - Handles `scene/set` commands
- **`driver-command-handler.js`** - Handles `driver/set` commands
- **`reset-command-handler.js`** - Handles `reset/set` commands
- **`state-command-handler.js`** - Handles `state/upd` commands

---

## 🎯 Architecture

### Command Pattern Benefits

1. **Separation of Concerns**: Each command type has its own handler
2. **Testability**: Handlers can be tested in isolation with mocks
3. **Extensibility**: Easy to add new command types
4. **Consistency**: All handlers follow the same interface
5. **Maintainability**: Changes to one command don't affect others

### Flow

```text
MQTT Message
    ↓
MqttService
    ↓
CommandRouter.route(topic, payload)
    ↓
Parse topic → { deviceIp, section, action }
    ↓
Get handler for section
    ↓
Handler.handle(deviceIp, action, payload)
    ↓
Validate, process, publish response
```

---

## 🔧 Usage

### Creating the Command System

```javascript
const CommandRouter = require('./lib/commands/command-router');
const SceneCommandHandler = require('./lib/commands/scene-command-handler');
const DriverCommandHandler = require('./lib/commands/driver-command-handler');
const ResetCommandHandler = require('./lib/commands/reset-command-handler');
const StateCommandHandler = require('./lib/commands/state-command-handler');

// Create handlers
const sceneHandler = new SceneCommandHandler({
  logger,
  mqttService,
  deviceDefaults,
});

const driverHandler = new DriverCommandHandler({
  logger,
  mqttService,
  setDriverForDevice,
  lastState,
  sceneManager,
  getContext,
  publishMetrics,
});

const resetHandler = new ResetCommandHandler({
  logger,
  mqttService,
  softReset,
});

const stateHandler = new StateCommandHandler({
  logger,
  mqttService,
  sceneManager,
  getContext,
  publishMetrics,
  deviceDefaults,
  lastState,
});

// Create router
const commandRouter = new CommandRouter({
  logger,
  handlers: {
    scene: sceneHandler,
    driver: driverHandler,
    reset: resetHandler,
    state: stateHandler,
  },
});

// Route messages
mqttService.on('message', async ({ topic, payload }) => {
  await commandRouter.route(topic, payload);
});
```

---

## 📝 Handler Interface

All handlers extend `CommandHandler` and implement:

```javascript
class MyCommandHandler extends CommandHandler {
  constructor({ logger, mqttService, ...dependencies }) {
    super({ logger, mqttService });
    // Store dependencies
  }

  async handle(deviceIp, action, payload) {
    // Implement command logic
  }
}
```

### Base Class Methods

**Protected Helpers**:

- `_validatePayload(payload, requiredFields)` - Validate payload
- `_publishResponse(deviceIp, topic, data)` - Publish MQTT response
- `_publishError(deviceIp, errorMessage, context)` - Publish error

---

## 🧪 Testing

### Unit Tests

Each handler can be tested in isolation:

```javascript
const mockLogger = {
  ok: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockMqttService = {
  publish: jest.fn(),
};

const handler = new SceneCommandHandler({
  logger: mockLogger,
  mqttService: mockMqttService,
  deviceDefaults: new Map(),
});

// Test
await handler.handle('192.168.1.1', 'set', { name: 'test' });

// Assert
expect(mockMqttService.publish).toHaveBeenCalledWith(
  'pixoo/192.168.1.1/scene',
  expect.objectContaining({ default: 'test' }),
);
```

### Integration Tests

Test the full command flow:

```javascript
// Send MQTT message
mqttService.emit('message', {
  topic: 'pixoo/192.168.1.1/scene/set',
  payload: { name: 'test' },
});

// Verify handler was called
// Verify response was published
```

---

## 📊 Command Types

### Scene Command (`scene/set`)

**Purpose**: Set default scene for a device

**Payload**:

```json
{
  "name": "scene_name"
}
```

**Response**: `pixoo/{deviceIp}/scene`

### Driver Command (`driver/set`)

**Purpose**: Switch device driver (real/mock)

**Payload**:

```json
{
  "driver": "real" // or "mock"
}
```

**Response**: `pixoo/{deviceIp}/driver`

**Side Effect**: Re-renders current scene with new driver

### Reset Command (`reset/set`)

**Purpose**: Soft reset device (stop scene, clear scheduler)

**Payload**: (none required)

**Response**: `pixoo/{deviceIp}/reset`

### State Command (`state/upd`)

**Purpose**: Render scene with payload data

**Payload**:

```json
{
  "scene": "scene_name", // optional, uses device default if omitted
  "clear": true // optional, clear screen before render
  // ...scene-specific data
}
```

**Response**: `pixoo/{deviceIp}/ok` or `pixoo/{deviceIp}/error`

---

## 🔒 Error Handling

All handlers implement consistent error handling:

1. **Validation Errors**: Missing required fields
   - Log warning
   - No MQTT response (invalid request)

2. **Execution Errors**: Scene not found, render failure
   - Log error with context
   - Publish to `pixoo/{deviceIp}/error`

3. **Unexpected Errors**: Crashes, exceptions
   - Caught by handler
   - Published as error
   - System continues running

---

## ➕ Adding a New Command Handler

1. **Create Handler Class**:

   ```javascript
   class MyCommandHandler extends CommandHandler {
     constructor({ logger, mqttService, ...deps }) {
       super({ logger, mqttService });
       this.myDependency = deps.myDependency;
     }

     async handle(deviceIp, action, payload) {
       if (action === 'set') {
         await this._handleSet(deviceIp, payload);
       }
     }

     async _handleSet(deviceIp, payload) {
       // Validate
       this._validatePayload(payload, ['requiredField']);

       // Process
       const result = await this.myDependency.doSomething(payload);

       // Respond
       this._publishResponse(deviceIp, 'my-topic', { result });
     }
   }
   ```

2. **Register with Router**:

   ```javascript
   const myHandler = new MyCommandHandler({
     logger,
     mqttService,
     myDependency,
   });

   const commandRouter = new CommandRouter({
     logger,
     handlers: {
       // ...existing handlers
       mytopic: myHandler, // Matches MQTT topic section
     },
   });
   ```

3. **Subscribe to MQTT Topic**:

   ```javascript
   await mqttService.subscribe(['pixoo/+/mytopic/set']);
   ```

4. **Write Tests**:
   - Unit tests for handler
   - Integration tests for full flow

---

## 🎨 Design Patterns

### Command Pattern

**Intent**: Encapsulate a request as an object

**Benefits**:

- Decouples sender (MQTT) from receiver (handlers)
- Supports undo/redo (if needed)
- Commands can be queued, logged, tested

### Strategy Pattern

**Intent**: Define family of algorithms, make them interchangeable

**Benefits**:

- Different handlers for different command types
- Easy to swap or extend

### Dependency Injection

**Intent**: Provide dependencies from outside

**Benefits**:

- Testable with mocks
- Loose coupling
- Configuration flexibility

---

## 📚 Related Documentation

- [../README.md](../README.md) - Library overview
- [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) - System architecture
- [../../docs/CODE_QUALITY.md](../../docs/CODE_QUALITY.md) - Code standards
- [../../docs/PHASE2_PLAN.md](../../docs/PHASE2_PLAN.md) - Phase 2 roadmap

---

**Status**: ✅ Complete (ARC-304 implementation)  
**Test Coverage**: Target 90%+ (tests pending)  
**Last Updated**: 2025-09-30
