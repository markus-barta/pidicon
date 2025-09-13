# scenes/ - Visual Scenes

This directory contains all the visual scenes that can be displayed on the Pixoo
device. Each file represents a self-contained module that exports a standard
interface for the `SceneManager` to use.

## Scene Architecture

A valid scene is a JavaScript module that exports an object with the following
properties:

- `name` (string): A unique identifier for the scene. This is used in MQTT
  commands to select the scene.
- `init` (async function): An optional function that is called once when the
  scene is first loaded. Use this for one-time setup.
- `render` (async function): The main rendering function. It receives a `context`
  object containing the device instance, state, and other utilities. This
  function is responsible for drawing to the device's buffer.
- `cleanup` (async function): An optional function that is called when the scene
  is switched away from. Use this to clean up any resources, such as timers or
  intervals.

**IMPORTANT:** Every `render` function that draws to the screen **must** call
`await device.push()` to make the changes visible on the physical display.

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
