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

const logger = require('../lib/logger');
const { isValidColor } = require('../lib/performance-utils');

const name = 'fill';

function init() {
  logger.debug(`🚀 [FILL] Scene initialized`);
}

async function render(context) {
  const { device, publishOk, payload, getState } = context;

  // Get color from MQTT payload or scene state
  const defaultColor = [0, 0, 0, 255]; // Black
  let color = payload?.color || getState?.('color') || defaultColor;

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
    await device.fillRectangleRgba([0, 0], [64, 64], color);
  } catch (err) {
    logger.error(`Error in fill scene: ${err}`);
    return;
  }

  // Push the filled frame to the device
  await device.push(name, publishOk);

  logger.debug(`🎨 [FILL] Screen filled with color: [${color.join(',')}]`);

  // Static scene - signal completion by returning null
  return null;
}

function cleanup() {
  logger.debug(`🧹 [FILL] Scene cleaned up`);
}

const wantsLoop = false;
module.exports = { name, init, render, cleanup, wantsLoop };
