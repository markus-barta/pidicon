/**
 * @fileoverview Fill Scene
 * @description Fills the screen with a solid color.
 * @mqtt
 * mosquitto_pub -h localhost -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"fill", "color":[255,0,0,255]}'
 * @version 1.0.0
 * @author Sonic + Cursor + Markus Barta (mba)
 * @license MIT
 */

const name = 'fill';

// Import shared utilities
const {
  isValidColor,
  validateSceneContext,
} = require('../lib/performance-utils');

async function init() {
  // Initialize fill scene - nothing special needed
  console.log(`🚀 [FILL] Scene initialized`);
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, state } = ctx;

  // Get color from context state (MQTT payload) or scene state
  const defaultColor = [255, 0, 0, 255]; // Red
  let color = defaultColor;

  // Try context state first (MQTT payload), then fall back to scene state
  if (ctx.payload && ctx.payload.color) {
    color = ctx.payload.color;
  } else if (state.get && state.get('color')) {
    color = state.get('color');
  } else if (state.color) {
    color = state.color;
  }

  // Validate color format using shared utility
  if (!isValidColor(color)) {
    console.error(
      `❌ [FILL] Invalid color format: ${JSON.stringify(color)}, expected [R,G,B,A] array with values 0-255`,
    );
    return;
  }

  // Fill entire screen with the specified color
  await device.fillRectangleRgba([0, 0], [64, 64], color);

  // Push the filled frame to the device
  await device.push(name, ctx.publishOk);

  console.log(`🎨 [FILL] Screen filled with color: [${color.join(',')}]`);
}

async function cleanup() {
  // Cleanup fill scene - nothing special needed
  console.log(`🧹 [FILL] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
