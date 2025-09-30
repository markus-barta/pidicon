# lib/ - Core Utilities

This directory contains core utility modules that provide shared functionality
across the Pixoo Daemon application. Each module is designed to have a single
responsibility, following SOLID principles.

## 🏗️ Architecture Overview

The library is organized into several functional areas:

- **Scene Management**: Scene lifecycle, state machine, loader, base classes
- **Device Communication**: Device adapter, context, MQTT utilities
- **Rendering**: Graphics engine, canvas, gradients, text rendering
- **Configuration**: Config management, validation, presets
- **Observability**: Logging, error handling, performance monitoring, deployment tracking

---

## 📦 Core Modules

### Scene Management

#### `scene-manager.js`

Manages the complete lifecycle of scenes with centralized scheduling:

- Per-device state machine (`currentScene`, `targetScene`, `generationId`, `status`)
- Centralized scheduler loop (one per device)
- Input gating to prevent stale frames
- MQTT state mirroring for observability
- Scene switching with generation tracking

**Key Features**: Pure-render contract enforcement, multi-device isolation,
graceful error recovery.

#### `scene-base.js` ⭐ NEW in v2.0.0

Professional base classes for scene development:

- `StaticScene`: Single-render scenes (displays once and completes)
- `AnimatedScene`: Loop-driven scenes with automatic frame timing
- `DataScene`: Data-driven scenes with refresh intervals
- Common lifecycle hooks: `init()`, `render()`, `cleanup()`
- Built-in error handling and state management
- Consistent logging and metrics

**Benefits**: 80% reduction in boilerplate, standardized patterns, easier
scene development.

#### `scene-loader.js` ⭐ NEW in v2.0.0

Automatic scene discovery and registration:

- Scans `scenes/` and `scenes/examples/` directories
- Validates scene interface (name, render, wantsLoop)
- Reports registration errors with helpful diagnostics
- Supports both class-based and object-based scenes
- Hot-reload capability for development

**Usage**: Automatically invoked during daemon startup.

#### `scene-framework.js`

Higher-level scene composition and utilities:

- Scene composition system for layering
- Standardized configuration handling
- Schema validation integration
- Helper utilities for common scene patterns

---

### Device Communication

#### `device-adapter.js`

Adapter layer for Pixoo device communication:

- Driver abstraction (`real` HTTP driver vs `mock` driver)
- Per-device driver assignment via `PIXOO_DEVICE_TARGETS`
- Drawing API wrapper (fillRect, drawText, drawLine, etc.)
- Buffer management and push operations
- Hot-swappable drivers for testing

**Key Feature**: Switch between real device and mock driver without code changes.

#### `device-context.js` ⭐ NEW in v2.0.0

Provides rich context objects for scene rendering:

- Device instance with drawing API
- Per-scene state management (Map-based)
- Version and build metadata
- MQTT publish callbacks
- Configuration access
- Helper utilities

**Structure**:

```javascript
{
  device,           // Device adapter instance
  state,            // Per-scene state Map
  payload,          // MQTT payload data
  version,          // Semantic version
  buildNumber,      // Build number
  gitCommit,        // Git commit hash
  publishOk,        // Callback for success publishing
  publishError,     // Callback for error publishing
}
```

#### `mqtt-utils.js` ⭐ NEW in v2.0.0

Consolidated MQTT publishing utilities:

- Scene state publishing (`/home/pixoo/<ip>/scene/state`)
- Success notifications (`pixoo/<ip>/ok`)
- Error notifications (`pixoo/<ip>/error`)
- Configurable topic bases
- Structured payload formatting
- Build metadata embedding

**Eliminates**: ~70% duplication in MQTT publishing code across modules.

#### `pixoo-http.js`

Direct HTTP API for Pixoo device commands:

- System commands (brightness, rotation, power)
- Channel switching
- Image/animation uploads
- Device status queries

---

### Rendering & Graphics

#### `graphics-engine.js`

Advanced rendering capabilities optimized for Pixoo hardware:

- **Text Effects**: Shadows, outlines, gradients with `drawTextEnhanced()`
- **Fade Transitions**: `startFadeTransition()`, `updateFadeTransition()`
- **Gradient Backgrounds**: Vertical/horizontal gradients
- **Animation Easing**: Linear, easeIn, easeOut, bounce
- **Value Animation**: `animateValue()` with callbacks
- **Resource Caching**: Image preloading and caching
- **Performance Monitoring**: Frame stats, animation tracking

**Hardware-Aware**: Optimized for 4-5fps displays with smooth transitions.

#### `pixoo-canvas.js`

Unified drawing API with consistent naming:

- Single entry point for all drawing operations
- Type-safe parameter validation
- Automatic bounds checking
- Backward-compatible with legacy APIs

#### `gradient-renderer.js`

Specialized gradient rendering:

- Smooth color interpolation
- Linear and radial gradients
- Efficient pixel-level operations

#### `rendering-utils.js`

Common rendering helpers:

- Color utilities (RGBA manipulation, interpolation)
- Coordinate transformations
- Text measurement with `FONT_METRICS`
- Pixel-perfect rendering helpers

#### `font.js`

Font metrics and text rendering:

- Character-level width definitions
- Baseline and line height constants
- Text measurement utilities
- Pixel-perfect text positioning

---

### Configuration & Validation

#### `config.js`

Centralized configuration management:

- Environment variable handling
- MQTT broker configuration
- Device targets and driver mappings
- Topic base configurations
- Defaults and overrides

#### `config-validator.js`

Configuration validation and presets:

- JSON schema validation
- Built-in presets (text, charts, status indicators)
- Runtime validation with clear error messages
- Custom schema/preset support
- Deep merging for preset overrides

---

### Observability

#### `logger.js`

Structured logging with context:

- Log levels: `error`, `warn`, `ok`, `info`, `debug`
- Metadata objects for context
- Consistent formatting
- Environment-aware (respects `LOG_LEVEL`)

**Usage**: `logger.ok('Scene switched', { scene: 'startup', device: ip })`

#### `error-handler.js` ⭐ NEW in v2.0.0

Professional error handling and recovery:

- Error classification (ValidationError, DeviceError, etc.)
- Recovery strategies
- External error reporting via MQTT
- Error context preservation
- Graceful degradation

**Benefits**: Consistent error handling, better debugging, production resilience.

#### `performance-utils.js`

Performance monitoring and validation:

- Scene context validation
- Frame timing measurements
- Performance metrics collection
- Bottleneck identification

#### `deployment-tracker.js`

Version and deployment tracking:

- Reads `version.json` for build metadata
- Git information extraction
- Version display formatting
- Used by `startup` scene for visual confirmation

---

### Data Processing

#### `advanced-chart.js`

Professional charting capabilities:

- Multi-series line charts
- Gradient fills
- Auto-scaling axes
- Grid rendering
- Legend support

---

## 🎯 Module Dependencies

```text
scene-manager.js
  ├── scene-loader.js (scene discovery)
  ├── device-context.js (context creation)
  ├── mqtt-utils.js (state publishing)
  └── error-handler.js (error recovery)

scene-base.js
  ├── device-context.js (context usage)
  ├── logger.js (logging)
  └── error-handler.js (error handling)

graphics-engine.js
  ├── pixoo-canvas.js (drawing API)
  ├── rendering-utils.js (color utilities)
  └── font.js (text metrics)
```

---

## 📝 Development Guidelines

### Adding New Modules

1. **Single Responsibility**: Each module should have one clear purpose
2. **JSDoc Documentation**: Document all exported functions and classes
3. **Error Handling**: Use error-handler.js for consistent error management
4. **Logging**: Use logger.js with appropriate levels and metadata
5. **Testing**: Add unit tests in `scripts/test_*.js`

### Module Structure

```javascript
/**
 * Module description
 *
 * @module lib/module-name
 * @author Your Name with assistance from Cursor AI
 */

'use strict';

// Imports
const logger = require('./logger');
const { ValidationError } = require('./errors');

// Module code

// Exports
module.exports = { ... };
```

---

## 🔄 Migration Notes

### v2.0.0 Changes

**New Modules** (5 additions):

- `scene-base.js` - Base classes for scene development
- `scene-loader.js` - Automatic scene discovery
- `device-context.js` - Rich context objects
- `mqtt-utils.js` - MQTT publishing utilities
- `error-handler.js` - Professional error handling

**Code Reduction**:

- ~500 lines of duplicated code eliminated
- ~80% reduction in state management duplication
- ~70% reduction in MQTT publishing duplication

**Breaking Changes**: None - all changes are backward compatible.

---

## 📚 Related Documentation

- [STANDARDS.md](../STANDARDS.md) - Development standards
- [VERSIONING.md](../VERSIONING.md) - Version management strategy
- [scenes/README.md](../scenes/README.md) - Scene development guide
- [SCENE_DEVELOPMENT_BEST_PRACTICES.md](../SCENE_DEVELOPMENT_BEST_PRACTICES.md) - Best practices

---

**Summary**: Professional, modular architecture with clear responsibilities,
comprehensive error handling, and maximum code reusability. Each module follows
SOLID principles and contributes to a maintainable, production-ready system.
