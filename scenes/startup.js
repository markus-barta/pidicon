// Startup Scene - Shows deployment information on daemon start
// MQTT Commands:
// {"scene":"startup"} - Show startup info
// @author: Sonic + Cursor + Markus Barta (mba)

const name = 'startup';

// Import shared utilities
const { validateSceneContext } = require('../lib/performance-utils');

async function init() {
  console.log(`🚀 [STARTUP] Scene initialized`);
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, state } = ctx;

  // Get deployment info from state or use defaults
  const deploymentId = state.get('deploymentId') || 'v1.0.0';
  const buildTime = state.get('buildTime') || new Date().toISOString();
  const daemonStart = state.get('daemonStart') || new Date().toLocaleString();

  // Clear screen with dark background
  await device.fillRectangleRgba([0, 0], [64, 64], [20, 20, 40, 255]);

  // Draw title
  await device.drawTextRgbaAligned(
    'PIXOO DAEMON',
    [32, 8],
    [255, 255, 255, 255],
    'center',
  );

  // Draw deployment ID (larger, prominent)
  await device.drawTextRgbaAligned(
    deploymentId,
    [32, 20],
    [0, 255, 255, 255], // Cyan
    'center',
  );

  // Draw build time
  await device.drawTextRgbaAligned(
    `Built: ${buildTime.split('T')[0]}`,
    [32, 32],
    [200, 200, 200, 255], // Light gray
    'center',
  );

  // Draw daemon start time
  await device.drawTextRgbaAligned(
    `Started: ${daemonStart.split(' ')[1]}`,
    [32, 44],
    [200, 200, 200, 255], // Light gray
    'center',
  );

  // Draw status indicator
  await device.drawTextRgbaAligned(
    'READY',
    [32, 56],
    [0, 255, 0, 255], // Green
    'center',
  );

  // Push the startup frame to the device
  await device.push(name, ctx.publishOk);

  console.log(`🚀 [STARTUP] Deployment ${deploymentId} displayed`);
}

async function cleanup() {
  console.log(`🧹 [STARTUP] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
