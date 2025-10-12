/**
 * @fileoverview Fill Scene
 * @description A simple scene that fills the entire screen with a solid color.
 * The color can be specified via an MQTT message. If no color is provided, it
 * defaults to black.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"fill","color":[255,0,0,255]}'
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const { isValidColor } = require('../lib/performance-utils');

const name = 'fill';

/**
 * Generate a random color with full opacity
 * @returns {number[]} RGBA color array [R, G, B, A]
 */
function getRandomColor() {
  return [
    Math.floor(Math.random() * 256), // R (0-255)
    Math.floor(Math.random() * 256), // G (0-255)
    Math.floor(Math.random() * 256), // B (0-255)
    255, // A (fully opaque)
  ];
}

function init() {
  // No logging in init - use render context for device-specific logging
}

async function render(context) {
  const { device, publishOk, payload, getState } = context;

  // Get color from MQTT payload, scene state, or generate random
  const defaultColor = getRandomColor();
  let color = payload?.color || getState?.('color') || defaultColor;

  // Validate color format using shared utility
  if (!isValidColor(color)) {
    context.log(
      `Invalid color format: ${JSON.stringify(color)}, expected [R,G,B,A] array with values 0-255`,
      'error'
    );
    // Fallback to default color
    color = defaultColor;
  }

  // Fill entire screen with the specified color
  try {
    await device.fillRectangleRgba([0, 0], [64, 64], color);
  } catch (err) {
    context.log(`Render error: ${err.message}`, 'error');
    return;
  }

  // Push the filled frame to the device
  await device.push(name, publishOk);

  context.log(`Screen filled with color: [${color.join(',')}]`, 'debug');

  // Static scene - signal completion by returning null
  return null;
}

function cleanup() {
  // No logging in cleanup - cleanup is usually silent
}

const wantsLoop = false;
const description =
  'Fills the entire 64x64 screen with a single solid color. Accepts RGBA color parameter via MQTT payload (e.g., [255,0,0,255] for red). If no color specified, generates a random vibrant color each time. Perfect for testing color accuracy, brightness settings, or creating custom colored backgrounds.';
const category = 'Test';

module.exports = {
  name,
  init,
  render,
  cleanup,
  wantsLoop,
  description,
  category,
  metadata: {
    color: [255, 0, 0, 255], // Example: red [R, G, B, A]
    description:
      'Specify RGBA color array. If not provided, a random color is generated.',
  },
};
