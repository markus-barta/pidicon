# PIDICON Scene System Documentation

**Generated:** 2025-11-08  
**Version:** 3.2.1  
**Part:** Scene Framework & Implementations

## Executive Summary

PIDICON's scene system is a pure, declarative rendering framework that separates concerns between scene logic (what to render) and scene scheduling (when to render). Scenes follow a simple contract: `init()`, `render()`, `cleanup()`. The framework handles device isolation, performance tracking, and state management.

## Scene Architecture

### Core Principles

1. **Pure Render Contract** - Scenes only render, no side effects
2. **Device Isolation** - Each device has independent scene loop
3. **Centralized Scheduling** - SceneManager orchestrates all scenes
4. **State Management** - StateStore provides reactive state
5. **Frame Gating** - Prevents stale frames during scene transitions
6. **Performance Tracking** - Automatic FPS and frametime metrics

## Scene Contract

### Minimal Scene Structure

```javascript
module.exports = {
  name: 'my-scene', // Unique identifier
  description: 'My custom scene', // Human-readable description
  category: 'custom', // Grouping category
  wantsLoop: true, // true = animated, false = static

  // Optional metadata
  metadata: {
    author: 'Your Name',
    version: '1.0.0',
    tags: ['demo', 'animation'],
  },

  // One-time initialization
  async init(ctx) {
    // Setup resources, load data
    // Access: ctx.device, ctx.logger, ctx.engine, ctx.state
  },

  // Render one frame
  async render(ctx) {
    // Draw to device using ctx.engine
    // Return delay in ms for next frame, or null to finish
    return 1000; // 1 FPS
  },

  // Optional cleanup
  async cleanup(ctx) {
    // Release resources, clear timers
  },
};
```

### Scene Context API (`ctx`)

Every scene lifecycle method receives a context object:

```javascript
{
  device: {              // Device adapter
    ip: string,          // Device IP address
    canvas: Canvas,      // Device canvas (direct pixel access)
    driver: Driver,      // Device driver (push, clear, etc.)
    name: string,        // Device friendly name
    deviceType: string,  // 'pixoo64', 'awtrix', etc.
  },

  engine: GraphicsEngine, // High-level drawing API

  state: {               // State management
    get(key, defaultValue): any,
    set(key, value): void,
    clear(): void,
  },

  logger: Logger,        // Structured logging

  sceneNumber: number,   // Scene execution number (for metrics)
}
```

## Graphics Engine API

**Location:** `lib/graphics-engine.js`

High-level drawing API that abstracts device-specific rendering.

### Drawing Primitives

```javascript
// Rectangle
engine.fillRect(x, y, width, height, color);

// Circle
engine.drawCircle(x, y, radius, color);
engine.fillCircle(x, y, radius, color);

// Line
engine.drawLine(x1, y1, x2, y2, color, (lineWidth = 1));

// Text
engine.drawText(text, x, y, {
  color: '#FFFFFF',
  size: 'medium', // 'small', 'medium', 'large', or numeric
  align: 'left', // 'left', 'center', 'right'
  baseline: 'top', // 'top', 'middle', 'bottom'
  font: 'default',
});

// Clear screen
engine.clear((color = '#000000'));
```

### Gradients

```javascript
// Linear gradient
engine.fillGradientRect({
  x: 0,
  y: 0,
  width: 64,
  height: 64,
  startColor: '#FF0000',
  endColor: '#0000FF',
  direction: 'vertical', // 'horizontal', 'vertical', 'diagonal'
});

// Radial gradient
engine.fillRadialGradient({
  x: 32,
  y: 32,
  width: 64,
  height: 64,
  centerColor: '#FFFFFF',
  outerColor: '#000000',
});

// Conical gradient
engine.fillConicalGradient({
  x: 32,
  y: 32,
  width: 64,
  height: 64,
  colors: ['#FF0000', '#00FF00', '#0000FF'],
});
```

### Advanced Graphics

```javascript
// Image rendering
engine.drawImage(imageBuffer, x, y, width, height);

// Chart rendering
engine.drawChart({
  type: 'line', // 'line', 'bar', 'pie'
  data: [1, 2, 3, 4, 5],
  labels: ['A', 'B', 'C', 'D', 'E'],
  width: 64,
  height: 64,
  colors: ['#FF0000', '#00FF00'],
});
```

## State Management

### Scene State

Each scene has isolated state storage:

```javascript
// In init()
ctx.state.set('counter', 0);
ctx.state.set('lastUpdate', Date.now());

// In render()
const counter = ctx.state.get('counter', 0);
ctx.state.set('counter', counter + 1);

// Clear all state
ctx.state.clear();
```

**Persistence:** Scene state persists across render calls but is cleared on scene switch.

### Global State

For cross-scene shared state:

```javascript
// Access global state store
const stateStore = container.resolve('stateStore');

// Global state (daemon-wide)
stateStore.setState('myGlobalKey', value);
const value = stateStore.getState('myGlobalKey', defaultValue);

// Device-specific state (persists across scene changes)
stateStore.setDeviceState(deviceIp, 'myDeviceKey', value);
const value = stateStore.getDeviceState(deviceIp, 'myDeviceKey', defaultValue);
```

## Scene Types

### Animated Scenes (`wantsLoop: true`)

Scenes that render continuously with animation.

**Example: Simple Counter**

```javascript
module.exports = {
  name: 'counter',
  description: 'Animated counter demo',
  category: 'demo',
  wantsLoop: true,

  async init(ctx) {
    ctx.state.set('count', 0);
  },

  async render(ctx) {
    const count = ctx.state.get('count', 0);

    ctx.engine.clear('#000000');
    ctx.engine.drawText(count.toString(), 32, 32, {
      color: '#FFFFFF',
      size: 'large',
      align: 'center',
      baseline: 'middle',
    });

    ctx.state.set('count', count + 1);

    return 1000; // Update every 1 second
  },
};
```

### Static Scenes (`wantsLoop: false`)

Scenes that render once and stop.

**Example: Static Message**

```javascript
module.exports = {
  name: 'message',
  description: 'Display static message',
  category: 'utilities',
  wantsLoop: false,

  async render(ctx) {
    ctx.engine.clear('#000000');
    ctx.engine.drawText('Hello World!', 32, 32, {
      color: '#00FF00',
      size: 'medium',
      align: 'center',
      baseline: 'middle',
    });

    return null; // Don't loop
  },
};
```

## Scene Discovery

### File Structure

```
scenes/
├── pixoo/              # Pixoo 64x64 scenes
│   ├── startup.js
│   ├── power_price.js
│   └── ...
├── awtrix/             # AWTRIX 32x8 scenes
│   ├── startup.js
│   └── time-display.js
└── media/              # Scene assets
    ├── images/
    └── animations/
```

### Scene Loader

**Location:** `lib/scene-loader.js`

**Auto-Discovery:**

- Scans `scenes/{deviceType}/` directories
- Loads all `.js` files
- Validates scene contract
- Assigns scene numbers

**Scene Numbering:**

- Alphabetically sorted
- Stable across restarts
- Used for scene selection

**Dev Scenes:**

- Scenes starting with `dev-` are flagged
- Can be hidden in UI
- Useful for testing

## Scene Lifecycle

### 1. Scene Start

```
1. SceneManager.switchScene(deviceIp, sceneName)
2. Load scene module
3. Create device context
4. Call scene.init(ctx)
5. Start render loop
```

### 2. Render Loop

```
1. Check if scene is still active (frame gating)
2. Call scene.render(ctx)
3. Device driver pushes pixels to hardware
4. Publish state to MQTT
5. Broadcast WebSocket update
6. Track metrics (frametime, FPS)
7. Wait for returned delay (ms)
8. Loop to step 1
```

### 3. Scene Stop

```
1. SceneManager.stopScene(deviceIp)
2. Stop render loop
3. Call scene.cleanup(ctx)
4. Clear scene state
5. Update device state
```

## Performance Optimization

### Frame Gating

Prevents stale frames from rendering during scene transitions:

```javascript
// In scene-manager.js
if (device.sceneNumber !== sceneNumber) {
  logger.debug('Frame discarded (scene changed)', { deviceIp, sceneNumber });
  return; // Don't push stale frame
}
```

### Debounced State Persistence

StateStore debounces writes to disk (10-second delay):

```javascript
// Changes are batched automatically
stateStore.setDeviceState(ip, 'brightness', 100); // Queued
stateStore.setDeviceState(ip, 'scene', 'startup'); // Queued
// ... 10 seconds later ...
// Single write to /data/runtime-state.json
```

### Metrics Tracking

Automatic performance monitoring:

```javascript
{
  frametime: 45,      // Time to render + push (ms)
  fps: 22,            // Frames per second (animated scenes)
  pushCount: 1234,    // Total pushes to device
  errorCount: 2       // Push errors
}
```

## Scene Examples

### 1. Power Price Dashboard

**File:** `scenes/pixoo/power_price.js`  
**Category:** Data Visualization

**Features:**

- Fetches real-time energy prices
- Renders candlestick chart
- Color-coded indicators
- Updates every 5 minutes

### 2. Startup Scene

**File:** `scenes/pixoo/startup.js`  
**Category:** System

**Features:**

- Displays build info (version, build number, commit)
- Animated logo
- Used as default/fallback scene
- Static variant available

### 3. Graphics Engine Demo

**File:** `scenes/pixoo/graphics_engine_demo.js`  
**Category:** Demo

**Features:**

- Showcases all drawing primitives
- Gradient demonstrations
- Text rendering examples
- Animation techniques

### 4. Performance Test

**File:** `scenes/pixoo/performance-test.js`  
**Category:** Testing

**Features:**

- Benchmarks rendering performance
- Measures frametime
- Stress tests device driver
- Logs metrics

## Scene Scheduling

### Time-Based Scheduling

**Location:** `lib/services/scheduler-service.js`

**Schedule Configuration:**

```json
{
  "deviceIp": "192.168.1.159",
  "schedules": [
    {
      "scene": "power_price",
      "startTime": "06:00",
      "endTime": "22:00",
      "weekdays": [1, 2, 3, 4, 5], // Mon-Fri
      "enabled": true
    },
    {
      "scene": "startup",
      "startTime": "22:00",
      "endTime": "06:00",
      "enabled": true
    }
  ]
}
```

**Scheduler Tick:**

- Runs every 60 seconds
- Evaluates active schedules
- Auto-switches scenes based on time/weekday
- Publishes schedule status to MQTT

## Error Handling

### Scene Error Recovery

1. **Render Errors:**
   - Caught by SceneManager
   - Scene stopped automatically
   - Fallback to error scene
   - Error logged with context

2. **Device Push Errors:**
   - Retried with exponential backoff
   - Error count tracked
   - Watchdog monitors failures
   - Auto-restart on threshold

3. **Scene Timeout:**
   - Configurable timeout per scene
   - Prevents infinite loops
   - Logged as warning
   - Scene forcibly stopped

## Advanced Features

### Universal Scene Parameters (v3.2+)

**Location:** `lib/universal-scene-config.js`

Centralized parameter system for scenes:

```javascript
{
  "power_price": {
    "refreshInterval": 300000,  // 5 minutes
    "provider": "tibber",
    "currency": "NOK"
  }
}
```

**Access in Scene:**

```javascript
const config = ctx.state.get('sceneConfig', {});
const refreshInterval = config.refreshInterval || 300000;
```

### Scene Metadata Viewer

**UI Component:** `web/frontend/src/components/SceneMetadataViewer.vue`

Displays scene information:

- Author, version, tags
- Description
- Usage statistics
- Last rendered timestamp

### Scene Usage Tracking

Tracks scene execution:

- Start/stop times
- Total render count
- Average frametime
- Error occurrences

**Data Storage:** StateStore device state

## Testing

### Smoke Tests

**File:** `scripts/test_scenes_smoke.js`

Tests all scenes for basic functionality:

```bash
npm run test:scenes:smoke
```

### Live Testing

**File:** `scripts/live_test_harness.js`

Interactive scene testing on real devices:

```bash
node scripts/live_test_harness.js
```

### Performance Testing

**File:** `scripts/live_test_perf_repeat.js`

Benchmarks scene rendering:

```bash
node scripts/live_test_perf_repeat.js
```

## Best Practices

1. **Keep Scenes Pure:**
   - No MQTT publishing
   - No WebSocket broadcasting
   - No direct state persistence
   - Use ctx.state for scene state

2. **Optimize Rendering:**
   - Minimize computations in render()
   - Cache expensive operations in init()
   - Use appropriate frame delays
   - Avoid blocking operations

3. **Handle Errors Gracefully:**
   - Wrap network calls in try-catch
   - Provide fallback data
   - Log errors with context
   - Return null on fatal errors

4. **Use State Management:**
   - Store frame counters in ctx.state
   - Use StateStore for cross-scene data
   - Clear state in cleanup()

5. **Test Thoroughly:**
   - Test on real devices
   - Verify performance metrics
   - Check memory usage
   - Test error scenarios

## Future Enhancements

- Plugin system for third-party scenes
- Scene marketplace
- Visual scene editor
- Scene templates
- Multi-scene composition
- Scene transitions/effects
