/**
 * @fileoverview Empty Scene
 * @description This scene does nothing and is used as a default when no other
 * scene is specified. It can also be used to clear the screen by rendering an
 * empty frame.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"empty"}'
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)
 * @license MIT
 */

const logger = require('../lib/logger');

const name = 'empty';

function init() {
  logger.debug(`🚀 [EMPTY] Scene initialized`);
}

async function render(context) {
  const { device, publishOk } = context;

  // Clear screen to black
  await device.clear();

  // Push the cleared frame to actually update the device
  await device.push(name, publishOk);

  logger.debug(`🖤 [EMPTY] Screen cleared to black`);
}

function cleanup() {
  logger.debug(`🧹 [EMPTY] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
