/**
 * @fileoverview Empty Scene
 * @description Clears the screen.
 * @mqtt
 * mosquitto_pub -h localhost -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"empty"}'
 * @version 1.0.0
 * @author Sonic + Cursor + Markus Barta (mba)
 * @license MIT
 */

const name = 'empty';

// Import shared utilities
const { validateSceneContext } = require('../lib/performance-utils');

async function init() {
  // Initialize empty scene - nothing special needed
  console.log(`🚀 [EMPTY] Scene initialized`);
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, publishOk } = ctx;

  // Clear screen to black (device appears "off")
  await device.clear();

  // Push the cleared frame to actually update the device
  await device.push(name, publishOk);

  console.log(`🖤 [EMPTY] Screen cleared to black`);
}

async function cleanup() {
  // Cleanup empty scene - nothing special needed
  console.log(`🧹 [EMPTY] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
