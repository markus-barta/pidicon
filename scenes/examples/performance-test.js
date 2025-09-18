/**
 * @fileoverview Performance Test V3 - Simplified Two-Mode Version
 * @description A scene for performance benchmarking with adaptive and fixed interval modes.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance-test"}'
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */
'use strict';
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^(render|init|cleanup)$" }] */

const SCENE_NAME = 'performance-test';

// Visual constants for headers and lines
const MODE_COLORS = Object.freeze({
  ADAPTIVE: [0, 128, 255, 255], // Bright blue for adaptive
  INTERVAL: [255, 255, 255, 255], // White for fixed interval
});
const LINE_ALPHA = 178; // ~70%

// Import external dependencies

// Import internal modules
const logger = require('../../lib/logger');
const {
  CHART_CONFIG,
  getPerformanceColor,
} = require('../../lib/performance-utils');
const {
  drawTextRgbaAlignedWithBg,
  drawLine,
  BACKGROUND_COLORS,
} = require('../../lib/rendering-utils');

// Default configuration
const DEFAULT_FRAMES = 100;

/**
 * Professional State Manager for performance test
 * @class
 */
class PerformanceTestState {
  constructor(getState, setState) {
    this.getState = getState;
    this.setState = setState;
  }

  reset() {
    this.setState('framesRendered', 0);
    this.setState('startTime', Date.now());
    this.setState('minFrametime', Infinity);
    this.setState('maxFrametime', 0);
    this.setState('sumFrametime', 0);
    this.setState('samples', []);
    this.setState('chartX', CHART_CONFIG.CHART_START_X + 1);
    this.setState('isRunning', true);
    this.setState('testCompleted', false);
    this.setState('lastRenderTime', Date.now());
  }

  getMetrics() {
    const framesRendered = this.getState('framesRendered') || 0;
    const samples = this.getState('samples') || [];
    const sumFrametime = this.getState('sumFrametime') || 0;
    const minFrametime = this.getState('minFrametime') || 0;
    const maxFrametime = this.getState('maxFrametime') || 0;

    const avgFrametime = samples.length > 0 ? sumFrametime / samples.length : 0;
    const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;

    return {
      framesRendered,
      avgFrametime,
      minFrametime: minFrametime === Infinity ? 0 : minFrametime,
      maxFrametime,
      sampleCount: samples.length,
      fps,
    };
  }
}

/**
 * Performance Chart Renderer
 * @class
 */
class PerformanceChartRenderer {
  constructor(device) {
    this.device = device;
  }

  async renderChartStatic() {
    // Draw chart background
    await this.device.drawRectangleRgba(
      [CHART_CONFIG.CHART_START_X, CHART_CONFIG.CHART_START_Y],
      [CHART_CONFIG.CHART_WIDTH, CHART_CONFIG.CHART_HEIGHT],
      CHART_CONFIG.BG_COLOR,
    );

    // Draw Y-axis (left boundary)
    await drawLine(
      this.device,
      CHART_CONFIG.CHART_START_X,
      CHART_CONFIG.CHART_START_Y,
      CHART_CONFIG.CHART_START_X,
      CHART_CONFIG.CHART_BOTTOM_Y,
      CHART_CONFIG.AXIS_COLOR,
    );

    // Draw X-axis (mid at ~250ms relative to MAX_VALUE / CHART_HEIGHT)
    const midRatio = 250 / CHART_CONFIG.MAX_VALUE;
    const midY =
      CHART_CONFIG.CHART_BOTTOM_Y -
      Math.round(midRatio * CHART_CONFIG.CHART_HEIGHT);
    await drawLine(
      this.device,
      CHART_CONFIG.CHART_START_X,
      midY,
      CHART_CONFIG.CHART_END_X,
      midY,
      CHART_CONFIG.AXIS_COLOR,
    );

    // Draw Y-axis grid lines (subtle)
    for (let i = 1; i <= 4; i++) {
      const y =
        CHART_CONFIG.CHART_BOTTOM_Y - (i * CHART_CONFIG.CHART_HEIGHT) / 5;
      await drawLine(
        this.device,
        CHART_CONFIG.CHART_START_X,
        y,
        CHART_CONFIG.CHART_END_X,
        y,
        CHART_CONFIG.GRID_COLOR,
      );
    }
  }

  async renderHeader(modeHeaderText, modeHeaderColor) {
    if (modeHeaderText) {
      await drawTextRgbaAlignedWithBg(
        this.device,
        modeHeaderText,
        [2, 2],
        modeHeaderColor,
        'left',
        true,
        null,
      );
    }
  }

  async renderStatistics(metrics) {
    if (metrics.sampleCount > 0) {
      // Clear area below the chart axis (axis is at y=50, so start at y=51)
      await this.device.drawRectangleRgba(
        [0, 51],
        [64, 13],
        CHART_CONFIG.BG_COLOR,
      );

      // Draw labels in gray, values in white with exact positioning from v2
      await drawTextRgbaAlignedWithBg(
        this.device,
        'Frame:',
        [0, 52],
        CHART_CONFIG.TEXT_COLOR_STATS,
        'left',
        false,
      );
      const totalFrames = metrics.framesRendered.toString();
      await drawTextRgbaAlignedWithBg(
        this.device,
        totalFrames,
        [23, 52],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        false,
      );
      await drawTextRgbaAlignedWithBg(
        this.device,
        'Av:',
        [36, 52],
        CHART_CONFIG.TEXT_COLOR_STATS,
        'left',
        false,
      );
      await drawTextRgbaAlignedWithBg(
        this.device,
        String(Math.round(metrics.avgFrametime)),
        [47, 52],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        false,
      );
      await drawTextRgbaAlignedWithBg(
        this.device,
        'Lo:',
        [0, 58],
        CHART_CONFIG.TEXT_COLOR_STATS,
        'left',
        false,
      );
      await drawTextRgbaAlignedWithBg(
        this.device,
        Math.round(metrics.minFrametime).toString(),
        [11, 58],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        false,
      );
      await drawTextRgbaAlignedWithBg(
        this.device,
        'Hi:',
        [36, 58],
        CHART_CONFIG.TEXT_COLOR_STATS,
        'left',
        false,
      );
      await drawTextRgbaAlignedWithBg(
        this.device,
        Math.round(metrics.maxFrametime).toString(),
        [47, 58],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        false,
      );
    }
  }

  async renderCompletion() {
    await drawTextRgbaAlignedWithBg(
      this.device,
      'COMPLETE',
      [32, 32],
      [255, 255, 255, 127], // White with 50% transparency
      'center',
      true,
      BACKGROUND_COLORS.TRANSPARENT_BLACK_75,
    ); // Semi-transparent black background
  }
}

// Utility: clamp and compose color with custom alpha
function withAlpha(color, alpha) {
  return [color[0] | 0, color[1] | 0, color[2] | 0, alpha | 0];
}

// Utility: compute chart Y from frametime
function computeYFromFrametime(frametime) {
  const normalizedValue = Math.min(
    Math.max(frametime, 0),
    CHART_CONFIG.MAX_VALUE,
  );
  const scaledValue =
    (normalizedValue / CHART_CONFIG.MAX_VALUE) * CHART_CONFIG.CHART_HEIGHT;
  return CHART_CONFIG.CHART_BOTTOM_Y - Math.round(scaledValue);
}

// Estimate text width similar to drawTextRgbaAlignedWithBg internal logic
function estimateTextWidth(str) {
  let estimatedWidth = 0;
  for (const char of String(str ?? '')) {
    if (char === ' ' || char === ':') estimatedWidth += 3;
    else if (char === 'M' || char === 'W') estimatedWidth += 5;
    else if (char >= '0' && char <= '9') estimatedWidth += 4;
    else estimatedWidth += 4;
  }
  return Math.max(1, Math.min(64, estimatedWidth));
}

// Draw colored status line: X.Y FPS, Z ms
async function drawStatusLine(device, fpsOneDecimal, frametimeMs, msColor) {
  // Clear status line area (y = 10)
  await device.drawRectangleRgba([0, 10], [64, 7], CHART_CONFIG.BG_COLOR);

  let x = 2;
  const y = 10;
  const darkGray = CHART_CONFIG.TEXT_COLOR_STATS;

  // FPS numeric (white), then one pixel gap, then 'FPS'
  const fpsVal = `${fpsOneDecimal}`;
  await device.drawTextRgbaAligned(
    fpsVal,
    [x, y],
    [255, 255, 255, 255],
    'left',
  );
  x += estimateTextWidth(fpsVal) + 1;
  await device.drawTextRgbaAligned('FPS', [x, y], darkGray, 'left');
  x += estimateTextWidth('FPS');

  // Comma and space
  await device.drawTextRgbaAligned(', ', [x, y], darkGray, 'left');
  x += estimateTextWidth(', ');

  // ms numeric (colored by measurement), then one pixel gap, then 'ms'
  const msVal = `${frametimeMs}`;
  const msTextColor = [msColor[0], msColor[1], msColor[2], 255];
  await device.drawTextRgbaAligned(msVal, [x, y], msTextColor, 'left');
  x += estimateTextWidth(msVal) + 1;
  await device.drawTextRgbaAligned('ms', [x, y], darkGray, 'left');
}

// Draw gradient line between last and current sample
async function drawGradientSegment(
  device,
  x1,
  y1,
  x2,
  y2,
  colorStart,
  colorEnd,
) {
  // DDA stepping with per-step color interpolation
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps <= 0) {
    await device.drawPixelRgba([x1, y1], withAlpha(colorEnd, LINE_ALPHA));
    return;
  }
  const xInc = dx / steps;
  const yInc = dy / steps;
  let x = x1;
  let y = y1;
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 1 : i / steps;
    const r = Math.round(colorStart[0] + (colorEnd[0] - colorStart[0]) * t);
    const g = Math.round(colorStart[1] + (colorEnd[1] - colorStart[1]) * t);
    const b = Math.round(colorStart[2] + (colorEnd[2] - colorStart[2]) * t);
    await device.drawPixelRgba(
      [Math.round(x), Math.round(y)],
      [r, g, b, LINE_ALPHA],
    );
    x += xInc;
    y += yInc;
  }
}

/**
 * Generates display content based on test configuration
 * @param {Object} config - Test configuration
 * @param {number} frametime - Current frame time
 * @param {Function} getState - State getter
 * @param {PerformanceTestState} performanceState - Performance state manager
 * @returns {Object} Display content object
 */
function generateDisplayContent(config, frametime, performanceState) {
  const metrics = performanceState.getMetrics();
  let modeText = '';
  let modeHeaderText = '';
  let modeHeaderColor = MODE_COLORS.ADAPTIVE;

  if (config.interval === null) {
    // Adaptive mode
    modeText = 'ADAPTIVE';
    modeHeaderText = `ADAPTIVE ${config.frames}F`;
    modeHeaderColor = MODE_COLORS.ADAPTIVE;
  } else {
    // Fixed interval mode
    modeText = `FIXED ${config.interval}ms`;
    modeHeaderText = `INTERVAL ${config.interval}ms`;
    modeHeaderColor = MODE_COLORS.INTERVAL;
  }

  return {
    modeText,
    frametime: frametime || 0,
    metrics,
    modeHeaderText,
    modeHeaderColor,
  };
}

/**
 * Schedules the next frame internally with mode-specific timing
 * @param {Object} context - Render context
 * @param {Object} config - Test configuration
 * @param {number} timeTaken - Time taken for the previous frame (for fixed mode adjustment)
 */
// Removed internal scheduling to honor pure-render contract

/**
 * Internal frame rendering function with accurate timing
 * @param {Object} context - Render context
 * @param {Object} config - Test configuration
 */
async function renderFrame(context, config) {
  const { device, publishOk, getState, setState } = context;

  // Stop if scene not marked running
  const running = !!getState('isRunning');
  if (!running) {
    logger.ok(`[PERF V3] renderFrame: isRunning=false; abort frame`);
    return;
  }

  // Prevent re-entrancy (e.g., slow frame overlaps)
  if (getState('inFrame')) {
    logger.ok(`[PERF V3] renderFrame: inFrame=true; skip overlapping frame`);
    return;
  }
  setState('inFrame', true);

  // Use previous push duration as the frame's measured frametime
  const lastPushMetrics = device.getMetrics();
  const frametime = lastPushMetrics.lastFrametime || 0;
  logger.ok(`[PERF V3] renderFrame: frametime(prev push)=${frametime}ms`);

  // Create performance state
  const performanceState = new PerformanceTestState(getState, setState);

  // Update statistics using measured frametime from previous push
  if (frametime > 0) {
    await updateStatistics(frametime, getState, setState);
  }

  // Get metrics
  const metrics = performanceState.getMetrics();
  logger.ok(
    `[PERF V3] metrics: frames=${metrics.framesRendered}, avg=${Math.round(
      metrics.avgFrametime,
    )}ms`,
  );

  // Generate display content for current frame (show previous frame time)
  const displayContent = generateDisplayContent(
    config,
    frametime,
    performanceState,
  );

  // Create chart renderer
  const chartRenderer = new PerformanceChartRenderer(device);

  // Render chart static layer only once
  if (!getState('chartInitialized')) {
    await chartRenderer.renderChartStatic();
    setState('chartInitialized', true);
  }

  // Determine X positions
  const chartX = getState?.('chartX') || CHART_CONFIG.CHART_START_X + 1;
  const nextX =
    chartX <= CHART_CONFIG.CHART_END_X ? chartX : CHART_CONFIG.CHART_END_X;

  // Compute current Y
  const currY = computeYFromFrametime(frametime);

  // Compute previous point if available
  const hasPrev =
    (getState?.('hasPrevPoint') || false) &&
    chartX > CHART_CONFIG.CHART_START_X;
  const prevY = getState?.('lastY') || currY;
  const prevValue = getState?.('lastValue') || frametime;

  // Colors for gradient
  const colorStart = getPerformanceColor(prevValue);
  const colorEnd = getPerformanceColor(frametime);

  // Draw gradient segment from previous to current point
  if (hasPrev) {
    await drawGradientSegment(
      device,
      nextX - 1,
      prevY,
      nextX,
      currY,
      colorStart,
      colorEnd,
    );
  } else {
    // First point: just plot a pixel
    await device.drawPixelRgba([nextX, currY], withAlpha(colorEnd, LINE_ALPHA));
    setState('hasPrevPoint', true);
  }

  // Save last point state and advance X
  setState('lastY', currY);
  setState('lastValue', frametime);
  setState('chartX', Math.min(nextX + 1, CHART_CONFIG.CHART_END_X));

  // Render headers (mode on first line)
  await chartRenderer.renderHeader(
    displayContent.modeHeaderText,
    displayContent.modeHeaderColor,
  );

  // Render colored status line on second line
  const currentFps =
    displayContent.frametime > 0 ? 1000 / displayContent.frametime : 0;
  await drawStatusLine(
    device,
    currentFps.toFixed(1),
    Math.round(displayContent.frametime),
    colorEnd,
  );

  // Render statistics
  await chartRenderer.renderStatistics(metrics);

  // Measure actual time for draw+push to schedule fixed interval correctly
  const frameStart = Date.now();

  // Push frame
  await device.push(SCENE_NAME, publishOk);

  const timeTaken = Date.now() - frameStart;

  // Track frames pushed independent of frametime
  const prevPushed = getState('framesPushed') || 0;
  const nextPushed = prevPushed + 1;
  setState('framesPushed', nextPushed);

  // Check if should continue (stop after exactly config.frames pushes)
  const shouldContinue =
    nextPushed < config.frames &&
    (getState('chartX') || CHART_CONFIG.CHART_START_X + 1) <
      CHART_CONFIG.CHART_END_X;

  setState('inFrame', false);
  logger.ok(
    `[PERF V3] shouldContinue=${shouldContinue} pushes=${nextPushed} chartX=${getState('chartX')}`,
  );

  if (!shouldContinue) {
    await handleTestCompletion(context, metrics, chartRenderer);
    // Signal completion to central scheduler: return non-number
    return null;
  }

  // Return next delay for central scheduler
  if (config.interval === null) {
    return 0;
  }
  return Math.max(0, (config.interval || 0) - timeTaken);
}

async function init() {
  logger.debug(`🚀 [PERF V3] Scene initialized`);
}

async function cleanup(context) {
  try {
    const { getState, setState } = context;
    const loopTimer = getState?.('loopTimer');
    if (loopTimer) {
      clearTimeout(loopTimer);
      setState('loopTimer', null);
    }
    // Ensure the next run fully re-initializes
    setState?.('loopScheduled', false);
    setState?.('inFrame', false);
    setState?.('isRunning', false);
    setState?.('chartInitialized', false);
    setState?.('hasPrevPoint', false);
    setState?.('testCompleted', true);
  } catch (e) {
    logger.warn(`⚠️ [PERF V3] Cleanup encountered an issue:`, e?.message);
  }
  logger.debug(`🧹 [PERF V3] Scene cleaned up`);
}

async function updateStatistics(frametime, getState, setState) {
  if (frametime > 0) {
    const framesRendered = (getState?.('framesRendered') || 0) + 1;
    const samples = getState?.('samples') || [];
    const sumFrametime = (getState?.('sumFrametime') || 0) + frametime;
    const minFrametime = Math.min(
      getState?.('minFrametime') || Infinity,
      frametime,
    );
    const maxFrametime = Math.max(getState?.('maxFrametime') || 0, frametime);

    samples.push(frametime);

    setState('framesRendered', framesRendered);
    setState('samples', samples);
    setState('sumFrametime', sumFrametime);
    setState('minFrametime', minFrametime);
    setState('maxFrametime', maxFrametime);
  }
}

async function handleTestCompletion(context, metrics, chartRenderer) {
  const { getState, setState, device, publishOk } = context;
  const now = Date.now();
  const framesRendered = getState?.('framesRendered') || 0;

  setState('isRunning', false);
  const duration = now - (getState?.('startTime') || now);
  logger.ok(
    `✅ [PERF V3] Test completed: ${framesRendered} frames in ${duration}ms (avg: ${Math.round(metrics.avgFrametime)}ms)`,
  );

  // Show completion overlay
  await chartRenderer.renderCompletion();
  await device.push(SCENE_NAME, publishOk);
}

async function render(context) {
  const { device, payload, getState, setState, loopDriven } = context;

  try {
    // Get configuration from payload
    const interval = payload?.interval ?? null; // null = adaptive
    const frames = payload?.frames ?? DEFAULT_FRAMES;

    const config = { interval, frames };
    setState('config', config);

    // Check if already running
    if (!getState('isRunning')) {
      // Reset state
      const performanceState = new PerformanceTestState(getState, setState);
      performanceState.reset();
      setState('chartInitialized', false);

      // Clear screen on new test
      await device.clear();
      logger.ok(
        `🎯 [PERF V3] Starting ${interval ? `fixed ${interval}ms` : 'adaptive'} test for ${frames} frames`,
      );
      // No self-scheduling in pure-render contract
    }

    // Loop-driven: render a frame directly each tick
    if (loopDriven && getState('isRunning')) {
      return await renderFrame(context, getState('config') || config);
    }
  } catch (error) {
    logger.error(`❌ [PERF V3] Render error: ${error.message}`);
  }
}

module.exports = {
  init,
  cleanup,
  render,
  wantsLoop: true,
};
