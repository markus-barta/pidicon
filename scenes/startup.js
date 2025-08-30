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
  const { version, buildNumber, gitCommit, buildTime, daemonStart } =
    versionInfo;

  // Clear screen with dark background
  await device.fillRectangleRgba([0, 0], [64, 64], [20, 20, 40, 255]);

  // Header section (top 16px)
  // Draw title
  await device.drawTextRgbaAligned(
    'PIXOO DAEMON',
    [32, 2],
    [255, 255, 255, 255],
    'center',
  );

  // Main info section (16px - 48px)
  // Build number (prominent, larger)
  await device.drawTextRgbaAligned(
    `#${buildNumber}`,
    [32, 18],
    [255, 255, 0, 255], // Yellow
    'center',
  );

  // Git hash (medium size)
  await device.drawTextRgbaAligned(
    gitCommit,
    [32, 28],
    [255, 150, 0, 255], // Orange
    'center',
  );

  // Latest tag/version (smaller)
  await device.drawTextRgbaAligned(
    `v${version}`,
    [32, 38],
    [0, 255, 255, 255], // Cyan
    'center',
  );

  // Footer section (48px - 64px)
  // Build date
  await device.drawTextRgbaAligned(
    `Built:${buildTime.split('T')[0]}`,
    [32, 48],
    [200, 200, 200, 255], // Light gray
    'center',
  );

  // Start time
  await device.drawTextRgbaAligned(
    `Start:${new Date(daemonStart).toLocaleTimeString('de-AT', { hour12: false })}`,
    [32, 56],
    [200, 200, 200, 255], // Light gray
    'center',
  );

  // Status indicator (bottom right corner)
  await device.drawTextRgbaAligned(
    'READY',
    [56, 62],
    [0, 255, 0, 255], // Green
    'right',
  );
}

async function cleanup() {
  console.log(`🧹 [STARTUP] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
