# lib/ - Core Utilities

This directory contains core utility modules that provide shared functionality
across the Pixoo Daemon application. Each module is designed to have a single
responsibility, following SOLID principles.

## Modules

### `advanced-chart.js`

Provides advanced charting capabilities, including rendering complex line charts
with gradients and handling dynamic data.

### `deployment-tracker.js`

Handles version and deployment tracking by reading Git information and
`version.json`. This is used by the `startup` scene to display build information.

### `device-adapter.js`

Acts as an adapter for the Pixoo device, abstracting the underlying hardware
communication and providing a consistent API for drawing and device management.

### `gradient-renderer.js`

A specialized utility for rendering smooth color gradients, used by charting and
other visual scenes.

### `logger.js`

A simple, structured logging wrapper around `console` that can be easily
replaced by a more advanced logging library in the future.

### `performance-utils.js`

A collection of utility functions related to performance monitoring and
validation, such as `validateSceneContext`.

### `pixoo-http.js`

Handles direct HTTP communication with the Pixoo device for commands that are not
supported via the primary drawing protocol.

### `rendering-utils.js`

Provides common rendering helper functions, such as color interpolation and
coordinate calculations, to be reused across different scenes.

### `scene-manager.js`

Manages the lifecycle of scenes, including loading, initialization, rendering,
and cleanup. It ensures smooth transitions between different visual states.
