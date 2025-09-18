# scenes/ - Visual Scenes

This directory contains all the visual scenes that can be displayed on the
Pixoo device. Each file represents a self-contained module that exports a
standard interface for the `SceneManager` to use.

## Scene Architecture

A valid scene is a JavaScript module that exports an object with the following
properties:

- `name` (string): A unique identifier for the scene. This is used in MQTT
  commands to select the scene.
- `init` (async function): Optional. Called once when the scene is initialized
  for a device. Use for one-time setup.
- `render` (async function): The main rendering function. It receives a
  `context` object containing the device, state, and utilities. It should draw
  to the device's buffer and then return either:
  - a `number` (milliseconds) indicating the next desired delay for the central
    scheduler (loop-driven scenes), or
  - `null` to signal completion (the scheduler will stop looping this scene).
- `cleanup` (async function): Optional. Called when switching away from the
  scene. Use to clean up resources.
- `wantsLoop` (boolean): Whether the scene should be driven by the central
  scheduler loop. Animated scenes set `true`; static scenes set `false`.

**IMPORTANT:** Every `render` that draws to the screen **must** call
`await device.push()` to make changes visible on the device.

Pure-render contract: Scenes must not manage their own timers or publish MQTT
continuations. Timing is handled centrally; use the `render` return value to
control cadence.

## Core Scenes

- `advanced_chart.js`: Renders an advanced, dynamic line chart.
- `empty.js`: A blank scene, used to clear the display.
- `fill.js`: Fills the entire screen with a solid color.
- `startup.js`: Displays deployment and version information when the daemon
  starts.

## Example Scenes

The `scenes/examples/` directory contains scenes used for testing and
demonstration purposes. These are fully functional and provide good examples of
how to use the drawing API.

- `draw_api_animated.js`: Demonstrates various animation techniques.
- `draw_api.js`: Shows examples of all available drawing primitives.
- `performance-test.js`: Used for performance benchmarking.
