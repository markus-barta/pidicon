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

  // Log debug information
  logDebugInfo(state);

  // Build version information
  const versionInfo = buildVersionInfo(state);

  // Clear screen and draw startup information
  await drawStartupInfo(device, versionInfo);

  // Push the startup frame to the device
  await device.push(name, ctx.publishOk);

  console.log(`🚀 [STARTUP] Deployment ${versionInfo.deploymentId} displayed`);
}

function logDebugInfo(state) {
  // Get deployment info from state or use defaults
  console.log('🔍 [DEBUG] Startup scene state:', {
    stateKeys: Array.from(state.keys()),
    deploymentId: state.get('deploymentId'),
    buildNumber: state.get('buildNumber'),
    gitCommit: state.get('gitCommit'),
    buildTime: state.get('buildTime'),
    daemonStart: state.get('daemonStart'),
    stateType: typeof state,
    stateConstructor: state.constructor.name,
  });

  // Also check environment variables directly
  console.log('🔍 [DEBUG] Environment variables:', {
    GIT_COMMIT: process.env.GIT_COMMIT,
    GIT_COMMIT_COUNT: process.env.GIT_COMMIT_COUNT,
    NODE_ENV: process.env.NODE_ENV,
  });

  // Check all environment variables for debugging
  console.log(
    '🔍 [DEBUG] All environment variables:',
    Object.keys(process.env).filter(
      (key) =>
        key.includes('GIT') || key.includes('DEPLOY') || key.includes('BUILD'),
    ),
  );
}

function getStateValue(state, key, defaultValue) {
  return state.get(key) || defaultValue;
}

function buildVersionInfo(state) {
  const gitSha = process.env.GITHUB_SHA?.substring(0, 7);

  return {
    version:
      process.env.IMAGE_TAG ||
      gitSha ||
      getStateValue(state, 'version', '1.0.0'),
    deploymentId: getStateValue(state, 'deploymentId', 'v1.0.0'),
    buildNumber: getStateValue(state, 'buildNumber', '1'),
    gitCommit: gitSha || getStateValue(state, 'gitCommit', 'unknown'),
    buildTime: getStateValue(state, 'buildTime', new Date().toISOString()),
    daemonStart: getStateValue(
      state,
      'daemonStart',
      new Date().toLocaleString(),
    ),
  };
}

async function drawStartupInfo(device, versionInfo) {
  const { buildNumber, gitCommit, buildTime, daemonStart } = versionInfo;

  // Clear screen with dark background
  await device.fillRectangleRgba([0, 0], [64, 64], [20, 20, 40, 255]);

  // Header section
  // Draw title
  await device.drawTextRgbaAligned(
    'PIXOO DAEMON',
    [32, 4],
    [255, 255, 255, 255],
    'center',
  );

  // Main info section
  // Build number
  await device.drawTextRgbaAligned(
    `Build #${buildNumber}`,
    [32, 13],
    [255, 255, 0, 255], // Yellow
    'center',
  );

  // Git hash
  await device.drawTextRgbaAligned(
    gitCommit,
    [32, 20],
    [255, 150, 0, 255], // Orange
    'center',
  );

  // Status indicator (centered, with white background box)
  // Easily set the vertical position of the status indicator
  const STATUS_Y = 34; // Change this value to move the whole status indicator up/down

  // Color constants for easy changing
  const STATUS_TEXT = 'READY';
  const STATUS_TEXT_COLOR = [0, 155, 55, 255]; // Green
  const STATUS_BOX_COLOR = [255, 255, 255, 255]; // White

  // Font is 3x5, so height is 5px
  const statusFontHeight = 5; // px for 3x5 font
  const statusPadding = 2; // px, top and bottom
  const statusBoxHeight = statusFontHeight + statusPadding * 2; // 9px

  // Calculate box and text Y positions based on STATUS_Y
  // STATUS_Y is the vertical center of the status text
  const statusBoxY =
    STATUS_Y -
    Math.floor(statusBoxHeight / 2) +
    Math.floor(statusFontHeight / 2);

  // Draw background box (full width)
  await device.fillRectangleRgba(
    [0, statusBoxY],
    [64, statusBoxHeight],
    STATUS_BOX_COLOR,
  );

  // Draw status text in green, centered
  await device.drawTextRgbaAligned(
    STATUS_TEXT,
    [32, STATUS_Y],
    STATUS_TEXT_COLOR,
    'center',
  );

  // // Latest tag/version (smaller)
  // await device.drawTextRgbaAligned(
  //   `v${version}`,
  //   [32, 34],
  //   [0, 255, 255, 255], // Cyan
  //   'center',
  // );

  // Footer section (48px - 64px)
  // Build date
  await device.drawTextRgbaAligned(
    `${buildTime.split('T')[0]}`,
    [32, 50],
    [200, 200, 200, 255], // Light gray
    'center',
  );

  // Start time
  await device.drawTextRgbaAligned(
    `${new Date(daemonStart).toLocaleTimeString('de-AT', { hour12: false })}`,
    [32, 57],
    [200, 200, 200, 255], // Light gray
    'center',
  );
}

async function cleanup() {
  console.log(`🧹 [STARTUP] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
