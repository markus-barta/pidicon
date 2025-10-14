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

  // For Awtrix startup, use notification API (simpler than custom apps)
  // 32x8 display requires minimal design

  const notification = {
    text: 'PIDICON',
    color: COLORS.PIDICON,
    duration: 5, // Display for 5 seconds
    rainbow: false,
    scrollSpeed: 100,
  };

  // Send notification to device
  if (device.showNotification) {
    await device.showNotification(notification);
  } else {
    ctx.log('Device does not support showNotification', 'warning');
  }

  // Static scene - no loop needed
  return null;
}

async function cleanup(ctx) {
  const { device } = ctx;

  // Clear display on cleanup
  if (device.clear) {
    await device.clear();
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
