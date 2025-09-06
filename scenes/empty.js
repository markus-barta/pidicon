/**
 * @fileoverview Empty Scene
 * @description This scene does nothing and is used as a default when no other
 * scene is specified. It can also be used to clear the screen by rendering an
 * empty frame.
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)
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
