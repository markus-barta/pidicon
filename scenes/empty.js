/**
 * @fileoverview Empty Scene
 * @description This scene does nothing and is used as a default when no other
 * scene is specified. It can also be used to clear the screen by rendering an
 * empty frame.
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)
 * @license MIT
 */

const logger = require('../lib/logger');

const name = 'empty';

function init() {
  logger.debug(`🚀 [EMPTY] Scene initialized`);
}

async function render(device) {
  await device.clear();
  logger.debug(`🖤 [EMPTY] Screen cleared to black`);
}

function cleanup() {
  logger.debug(`🧹 [EMPTY] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
