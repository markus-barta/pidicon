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

  const versionInfo = {
    version: state.get('version') || '1.0.0',
    deploymentId: state.get('deploymentId') || 'v1.0.0',
    buildNumber: state.get('buildNumber') || '1',
    gitCommit: state.get('gitCommit') || 'unknown',
    buildTime: state.get('buildTime') || new Date().toISOString(),
    daemonStart: state.get('daemonStart') || new Date().toLocaleString(),
  };

  // Clear screen and draw startup information
  await drawStartupInfo(device, versionInfo);

  // Push the startup frame to the device
  await device.push(name, ctx.publishOk);

  console.log(`🚀 [STARTUP] Deployment ${versionInfo.deploymentId} displayed`);
}

async function drawStartupInfo(device, versionInfo) {
  const {
    version,
    deploymentId,
    buildNumber,
    gitCommit,
    buildTime,
    daemonStart,
  } = versionInfo;

  // Clear screen with dark background
  await device.fillRectangleRgba([0, 0], [64, 64], [20, 20, 40, 255]);

  // Draw title
  await device.drawTextRgbaAligned(
    'PIXOO DAEMON',
    [32, 2],
    [255, 255, 255, 255],
    'center',
  );

  // Draw version (larger, prominent)
  await device.drawTextRgbaAligned(
    `v${version}`,
    [32, 14],
    [0, 255, 255, 255], // Cyan
    'center',
  );

  // Draw build number and git hash
  await device.drawTextRgbaAligned(
    `#${buildNumber}`,
    [32, 21],
    [255, 255, 0, 255], // Yellow
    'center',
  );

  // Draw deployment ID (smaller, below version)
  await device.drawTextRgbaAligned(
    deploymentId,
    [32, 28],
    [128, 128, 255, 255], // Light blue
    'center',
  );

  await device.drawTextRgbaAligned(
    gitCommit,
    [32, 35],
    [255, 150, 0, 255], // Orange (more distinct from yellow)
    'center',
  );

  // Draw build time
  await device.drawTextRgbaAligned(
    `Built:${buildTime.split('T')[0]}`,
    [32, 42],
    [200, 200, 200, 255], // Light gray
    'center',
  );

  // Draw daemon start time
  await device.drawTextRgbaAligned(
    `Start:${new Date(daemonStart).toLocaleTimeString('de-AT', { hour12: false })}`,
    [32, 49],
    [200, 200, 200, 255], // Light gray
    'center',
  );

  // Draw status indicator
  await device.drawTextRgbaAligned(
    'READY',
    [32, 57],
    [0, 255, 0, 255], // Green
    'center',
  );
}

async function cleanup() {
  console.log(`🧹 [STARTUP] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
