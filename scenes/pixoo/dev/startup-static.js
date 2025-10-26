/**
 * @fileoverview Startup Static Scene
 * @description Static version of the startup scene that shows build information
 * and deployment details without updating. Displays build number, git commit,
 * and deployment status as a one-time render.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup-static"}'
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const name = 'startup-static';
const path = require('path');
const { validateSceneContext } = require(
  path.join(__dirname, '../../../lib/performance-utils')
);

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

async function init(context) {
  const { log } = context;
  log?.(`Scene initialized`, 'info');
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, state, log } = ctx;

  // Log debug information
  logDebugInfo(state, log);

  // Build version information
  const versionInfo = buildVersionInfo(state, log);

  // Clear screen and draw startup information
  await drawStartupInfo(device, versionInfo);

  // Push the startup frame to the device
  await device.push(name, ctx.publishOk);

  log?.(`Deployment ${versionInfo.deploymentId} displayed`, 'info');
}

function logDebugInfo(state, log) {
  // Get deployment info from state or use defaults
  log?.(
    `Startup scene state: ${JSON.stringify({
      stateKeys: Array.from(state.keys()),
      deploymentId: state.get('deploymentId'),
      buildNumber: state.get('buildNumber'),
      gitCommit: state.get('gitCommit'),
      buildTime: state.get('buildTime'),
      daemonStart: state.get('daemonStart'),
      stateType: typeof state,
      stateConstructor: state.constructor.name,
    })}`,
    'debug'
  );

  // Also check environment variables directly
  log?.(
    `Environment variables: ${JSON.stringify({
      GIT_COMMIT: process.env.GIT_COMMIT,
      GIT_COMMIT_COUNT: process.env.GIT_COMMIT_COUNT,
      NODE_ENV: process.env.NODE_ENV,
    })}`,
    'debug'
  );

  // Check all environment variables for debugging
  const envKeys = Object.keys(process.env).filter(
    (key) =>
      key.includes('GIT') || key.includes('DEPLOY') || key.includes('BUILD')
  );
  log?.(`All environment variables: ${JSON.stringify(envKeys)}`, 'debug');
}

function getStateValue(state, key, defaultValue) {
  return state.get(key) || defaultValue;
}

function buildVersionInfo(state, log) {
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
      log?.(
        `Read current version.json: buildNumber=${currentVersionInfo.buildNumber}`,
        'info'
      );
    }
  } catch (error) {
    log?.(`Failed to read version.json: ${error.message}`, 'warning');
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
  const { buildNumber, gitCommit, buildTime, daemonStart } = versionInfo;

  // Clear screen with dark background
  await device.fillRectangleRgba([0, 0], [64, 64], COLORS.BACKGROUND);

  // Header section
  // Draw title
  await device.drawTextRgbaAligned(
    'PIXOO DAEMON',
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
  const STATUS_TEXT = 'READY';

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
  // Build date (robust parsing)
  await device.drawTextRgbaAligned(
    `${(function () {
      try {
        const s = String(buildTime || '');
        const m = s.match(/\d{4}-\d{2}-\d{2}/);
        return m ? m[0] : new Date(s).toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    })()}`,
    [32, LAYOUT.FOOTER_DATE_Y],
    COLORS.FOOTER_TEXT,
    'center'
  );

  // Start time
  await device.drawTextRgbaAligned(
    `${new Date(daemonStart).toLocaleTimeString('de-AT', { hour12: false })}`,
    [32, LAYOUT.FOOTER_TIME_Y],
    COLORS.FOOTER_TEXT,
    'center'
  );
}

async function cleanup(context) {
  const { log } = context;
  log?.(`Scene cleaned up`, 'info');
}

const wantsLoop = false;
const description =
  'Static startup scene displaying build information and deployment details. Shows daemon version, git commit hash, and deployment status without updating. Perfect for static deployment verification where time updates are not needed.';
const category = 'System';
const deviceTypes = ['pixoo64'];
const tags = ['dev'];
const configSchema = null;

// Scene metadata
const sceneType = 'dev';
const author = 'PIDICON Team';
const version = '1.0.0';
const thumbnail = null;
const isHidden = false;
const sortOrder = 270;

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
