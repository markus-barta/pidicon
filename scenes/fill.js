/**
 * @fileoverview Fill Scene
 * @description A simple scene that fills the entire screen with a solid color.
 * The color can be specified via an MQTT message. If no color is provided, it
 * defaults to black.
 * @mqtt
 * mosquitto_pub -h localhost -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"fill", "color":[255,0,0,255]}'
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)
 * @license MIT
 */

const logger = require('../lib/logger');
const { isValidColor } = require('../lib/performance-utils');

const name = 'fill';

function init() {
  logger.debug(`🚀 [FILL] Scene initialized`);
}

async function render(device, context) {
  // Get color from context state (MQTT payload) or scene state
  const defaultColor = [0, 0, 0, 255]; // Black
  let color =
    context.payload?.color || context.getState('color') || defaultColor;

  // Validate color format using shared utility
  if (!isValidColor(color)) {
    logger.error(
      `❌ [FILL] Invalid color format: ${JSON.stringify(color)}, expected [R,G,B,A] array with values 0-255`,
    );
    // Fallback to default color
    color = defaultColor;
  }

  // Fill entire screen with the specified color
  try {
    await device.fill(color);
  } catch (err) {
    logger.error(`Error in fill scene: ${err}`);
    return;
  }

  // Push the filled frame to the device
  await device.push(name, context.publishOk);

  logger.debug(`🎨 [FILL] Screen filled with color: [${color.join(',')}]`);
}

function cleanup() {
  logger.debug(`🧹 [FILL] Scene cleaned up`);
}

module.exports = {
  name,
  init,
  render,
  cleanup,
};
