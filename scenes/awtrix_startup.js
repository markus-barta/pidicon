/**
 * @fileoverview Awtrix/Ulanzi Startup Scene
 * @description Simple startup scene for 32x8 pixel AWTRIX displays
 * Shows PIDICON branding with minimal pixel design
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const name = 'awtrix_startup';

// Scene metadata
const description = 'Awtrix startup scene (32x8)';
const category = 'System';
const wantsLoop = false; // Static display
const deviceTypes = ['awtrix']; // Only for Awtrix/Ulanzi devices

const COLORS = Object.freeze({
  PIDICON: '#00FF88', // Bright green
  VERSION: '#FFD700', // Gold
  BACKGROUND: '#000000', // Black
});

async function init(ctx) {
  ctx.log(`Awtrix startup scene initialized`, 'debug');
}

async function render(ctx) {
  const { device } = ctx;

  // For Awtrix, we use createCustomApp with draw commands
  // 32x8 display requires minimal design

  const appName = 'pidicon_startup';

  // Build draw commands for Awtrix
  const drawCommands = {
    text: 'PIDICON',
    color: COLORS.PIDICON,
    // Center text on 32x8 display
    // Awtrix will auto-center if no position given
  };

  // Send to device via custom app API
  if (device.createCustomApp) {
    await device.createCustomApp(appName, drawCommands);
  } else {
    ctx.log('Device does not support createCustomApp', 'warning');
  }

  // Static scene - no loop needed
  return null;
}

async function cleanup(ctx) {
  const { device } = ctx;

  // Remove custom app on cleanup
  if (device.removeCustomApp) {
    await device.removeCustomApp('pidicon_startup');
  }

  ctx.log('Awtrix startup scene cleaned up', 'debug');
}

module.exports = {
  name,
  description,
  category,
  wantsLoop,
  deviceTypes,
  init,
  render,
  cleanup,
};
