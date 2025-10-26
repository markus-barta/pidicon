/**
 * @fileoverview Startup Scene (Looping)
 * @description Looping version of the startup scene that displays current build
 * information and real-time date/time updates every second. Shows daemon version,
 * git commit hash, and live clock for continuous status monitoring.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const name = 'startup';
const { validateSceneContext } = require('../../lib/performance-utils');

const COLORS = Object.freeze({
  BACKGROUND: [20, 20, 40, 255],
  HEADER: [255, 255, 255, 255],
  BUILD_NUMBER: [255, 255, 0, 255], // Yellow
  GIT_HASH: [255, 150, 0, 255], // Orange
  STATUS_TEXT: [0, 155, 55, 255], // Green
  STATUS_BOX: [255, 255, 255, 255], // White
  FOOTER_TEXT: [200, 200, 200, 255], // Light gray
});

const LAYOUT = Object.freeze({
  HEADER_Y: 3,
  BUILD_NUMBER_Y: 12,
  GIT_HASH_Y: 19,
  STATUS_Y: 36,
  FOOTER_DATE_Y: 50,
  FOOTER_TIME_Y: 57,
  STATUS_PADDING: 2,
  STATUS_FONT_HEIGHT: 5,
});

async function init() {
  // No logging in init - use render context for device-specific logging
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, state } = ctx;

  // Track render start time for precise 1-second ticks
  const renderStartTime = Date.now();

  // Only log debug information on first render
  if (!state.get('initialized')) {
    logDebugInfo(ctx, state);
    state.set('initialized', true);
  }

  // Build version information
  const versionInfo = buildVersionInfo(ctx, state);

  // Clear screen and draw startup information with current time
  await drawStartupInfo(device, versionInfo);

  // Push the startup frame to the device
  await device.push(name, ctx.publishOk);

  // Calculate how long this render took
  const renderTime = Date.now() - renderStartTime;

  // Return delay to get exactly 1-second ticks
  // If render took 50ms, we wait 950ms to render again
  // This compensates for frame rendering time and ensures second-sharp updates
  const targetInterval = 1000; // 1 second
  const nextDelay = Math.max(0, targetInterval - renderTime);

  return nextDelay;
}

function logDebugInfo(ctx, state) {
  // Get deployment info from state or use defaults
  ctx.log(
    `Deployment ${state.get('deploymentId')} (build ${state.get('buildNumber')}) loaded`,
    'info'
  );
}

function getStateValue(state, key, defaultValue) {
  return state.get(key) || defaultValue;
}

function buildVersionInfo(ctx, state) {
  const gitSha = process.env.GITHUB_SHA?.substring(0, 7);

  // Always read the latest version.json to ensure current build number
  let currentVersionInfo = {};
  try {
    const fs = require('fs');
    const path = require('path');
    const versionFile = path.join(__dirname, '..', '..', 'version.json');

    if (fs.existsSync(versionFile)) {
      const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      currentVersionInfo = {
        version: versionData.version,
        deploymentId: versionData.deploymentId,
        buildNumber: versionData.buildNumber,
        gitCommit: versionData.gitCommit,
        buildTime: versionData.buildTime,
      };
      ctx.log(
        `Read current version.json: buildNumber=${currentVersionInfo.buildNumber}`,
        'info'
      );
    }
  } catch (error) {
    ctx.log(`Failed to read version.json: ${error.message}`, 'warning');
  }

  return {
    version:
      process.env.IMAGE_TAG ||
      gitSha ||
      currentVersionInfo.version ||
      getStateValue(state, 'version', '1.0.0'),
    deploymentId:
      currentVersionInfo.deploymentId ||
      getStateValue(state, 'deploymentId', 'v1.0.0'),
    buildNumber:
      currentVersionInfo.buildNumber ||
      getStateValue(state, 'buildNumber', '1'),
    gitCommit:
      gitSha ||
      currentVersionInfo.gitCommit ||
      getStateValue(state, 'gitCommit', 'unknown'),
    buildTime:
      currentVersionInfo.buildTime ||
      getStateValue(state, 'buildTime', new Date().toISOString()),
    daemonStart: getStateValue(
      state,
      'daemonStart',
      new Date().toLocaleString()
    ),
  };
}

async function drawStartupInfo(device, versionInfo) {
  const { buildNumber, gitCommit } = versionInfo;

  // Clear screen with dark background
  await device.fillRectangleRgba([0, 0], [64, 64], COLORS.BACKGROUND);

  // Header section
  // Draw title
  await device.drawTextRgbaAligned(
    `PIDICON v${versionInfo.version}`,
    [32, LAYOUT.HEADER_Y],
    COLORS.HEADER,
    'center'
  );

  // Main info section
  // Build number (with leading '#')
  await device.drawTextRgbaAligned(
    `Build:${buildNumber}`,
    [32, LAYOUT.BUILD_NUMBER_Y],
    COLORS.BUILD_NUMBER,
    'center'
  );

  // Git hash
  await device.drawTextRgbaAligned(
    `Commit:${gitCommit}`,
    [32, LAYOUT.GIT_HASH_Y],
    COLORS.GIT_HASH,
    'center'
  );

  // Status indicator (centered, with white background box)
  const STATUS_Y = LAYOUT.STATUS_Y;

  // Color constants for easy changing
  const STATUS_TEXT = 'LIVE';

  // Font is 3x5, so height is 5px
  const statusFontHeight = LAYOUT.STATUS_FONT_HEIGHT;
  const statusPadding = LAYOUT.STATUS_PADDING;
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
    COLORS.STATUS_BOX
  );

  // Draw status text in green, centered
  await device.drawTextRgbaAligned(
    STATUS_TEXT,
    [32, STATUS_Y],
    COLORS.STATUS_TEXT,
    'center'
  );

  // // Latest tag/version (smaller)
  // await device.drawTextRgbaAligned(
  //   `v${version}`,
  //   [32, 34],
  //   [0, 255, 255, 255], // Cyan
  //   'center',
  // );

  // Footer section (48px - 64px)
  // Current date
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  await device.drawTextRgbaAligned(
    currentDate,
    [32, LAYOUT.FOOTER_DATE_Y],
    COLORS.FOOTER_TEXT,
    'center'
  );

  // Current time (24h format)
  const currentTime = now.toLocaleTimeString('de-AT', { hour12: false });
  await device.drawTextRgbaAligned(
    currentTime,
    [32, LAYOUT.FOOTER_TIME_Y],
    COLORS.FOOTER_TEXT,
    'center'
  );
}

async function cleanup() {
  // No logging in cleanup - cleanup is usually silent
}

const wantsLoop = true;
const description =
  'Live startup scene with real-time updates every second. Displays build information, daemon version, git commit hash, and continuously updating current date and time. Perfect for monitoring system status and showing the device is actively running.';
const category = 'System';
const deviceTypes = ['pixoo64'];
const tags = ['system', 'startup'];

// Scene has no user-configurable parameters (uses system version info)
const configSchema = null;

// Scene metadata
const sceneType = 'dev';
const author = 'PIDICON Team';
const version = '1.0.0';
const thumbnail = null;
const isHidden = false;
const sortOrder = 100;

module.exports = {
  name,
  render,
  init,
  cleanup,
  wantsLoop,
  description,
  category,
  deviceTypes,
  tags,
  configSchema,
  sceneType,
  author,
  version,
  thumbnail,
  isHidden,
  sortOrder,
};
