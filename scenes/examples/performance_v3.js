/**
 * @fileoverview Performance Test V3 - Simplified Two-Mode Version
 * @description A scene for performance benchmarking with adaptive and fixed interval modes.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance_v3"}'
 * @version 1.0.0
 * @author mba (Markus Barta) with assistance from Cursor AI
 * @license MIT
 */
'use strict';

const SCENE_NAME = 'performance_v3';

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
    this.setState('chartX', CHART_CONFIG.CHART_START_X);
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

  async renderChart() {
    // Draw chart background
    await this.device.drawRectangleRgba(
      [CHART_CONFIG.CHART_START_X, CHART_CONFIG.CHART_START_Y],
      [CHART_CONFIG.CHART_WIDTH, CHART_CONFIG.CHART_HEIGHT],
      CHART_CONFIG.BG_COLOR,
    );

    // Draw chart border
    await drawLine(
      this.device,
      [CHART_CONFIG.CHART_START_X, CHART_CONFIG.CHART_BOTTOM_Y],
      [CHART_CONFIG.CHART_END_X, CHART_CONFIG.CHART_BOTTOM_Y],
      CHART_CONFIG.AXIS_COLOR,
    );

    // Draw Y-axis grid lines
    for (let i = 1; i <= 4; i++) {
      const y =
        CHART_CONFIG.CHART_BOTTOM_Y - (i * CHART_CONFIG.CHART_HEIGHT) / 5;
      await drawLine(
        this.device,
        [CHART_CONFIG.CHART_START_X, y],
        [CHART_CONFIG.CHART_END_X, y],
        CHART_CONFIG.GRID_COLOR,
      );
    }
  }

  async renderHeader(modeText, timingText, fpsText) {
    // Mode and timing header
    if (modeText) {
      await drawTextRgbaAlignedWithBg(
        this.device,
        modeText,
        [2, 2],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        true,
        null,
      );
    }

    // Current frametime and FPS
    if (timingText && fpsText) {
      const combinedText = `${fpsText}/${timingText}`;
      await drawTextRgbaAlignedWithBg(
        this.device,
        combinedText,
        [2, 10],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        true,
      );
    } else if (timingText) {
      await drawTextRgbaAlignedWithBg(
        this.device,
        timingText,
        [2, 10],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        true,
      );
    } else if (fpsText) {
      await drawTextRgbaAlignedWithBg(
        this.device,
        fpsText,
        [2, 10],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        true,
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
        [25, 52],
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
        [48, 52],
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
        [12, 58],
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
        [48, 58],
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
  let timingText = '';
  let fpsText = '';

  if (config.interval === null) {
    // Adaptive mode
    modeText = 'ADAPTIVE';
    timingText = `${Math.round(frametime)}ms`;
    fpsText = `${metrics.fps} FPS`;
  } else {
    // Fixed interval mode
    modeText = `FIXED ${config.interval}ms`;
    timingText = `${config.interval}ms`;
    fpsText = `${metrics.fps} FPS`;
  }

  return {
    modeText,
    timingText,
    fpsText,
    frametime: frametime || 0,
    metrics,
  };
}

/**
 * Schedules the next frame internally with mode-specific timing
 * @param {Object} context - Render context
 * @param {Object} config - Test configuration
 * @param {number} timeTaken - Time taken for the previous frame (for fixed mode adjustment)
 */
async function scheduleNextFrame(context, config, timeTaken = 0) {
  const { getState, setState } = context;

  // Prevent multiple schedules
  if (getState('loopScheduled')) return;
  setState('loopScheduled', true);

  let delay = 0;
  if (config.interval !== null) {
    delay = Math.max(0, config.interval - timeTaken);
  }

  const scheduleFn = setTimeout;

  scheduleFn(async () => {
    try {
      await renderFrame(context, config);
    } catch (error) {
      logger.error(`❌ [PERF V3] Frame error: ${error.message}`);
    } finally {
      setState('loopScheduled', false);
    }
  }, delay);
}

/**
 * Internal frame rendering function with accurate timing
 * @param {Object} context - Render context
 * @param {Object} config - Test configuration
 */
async function renderFrame(context, config) {
  const { device, publishOk, getState, setState } = context;

  const now = Date.now();
  const lastRenderTime = getState('lastRenderTime') || now;
  const frametime = now - lastRenderTime;

  logger.debug(`[PERF V3] Rendering frame with frametime: ${frametime}ms`);

  // Create performance state
  const performanceState = new PerformanceTestState(getState, setState);

  // Update statistics if valid frametime
  if (getState('framesRendered') > 0 || frametime > 0) {
    // Allow first frame with 0
    await updateStatistics(frametime, getState, setState);
  }

  // Get metrics
  const metrics = performanceState.getMetrics();

  // Generate display content
  const displayContent = generateDisplayContent(
    config,
    frametime,
    performanceState,
  );

  // Create chart renderer
  const chartRenderer = new PerformanceChartRenderer(device);

  // Render chart background and grids
  await chartRenderer.renderChart();

  // Draw chart point using current frametime
  await drawChartPoint(device, frametime, getState, setState);

  // Render header
  await chartRenderer.renderHeader(
    displayContent.modeText,
    displayContent.timingText,
    displayContent.fpsText,
  );

  // Render statistics
  await chartRenderer.renderStatistics(metrics);

  // Push frame
  await device.push(SCENE_NAME, publishOk);

  // Update last render time after push
  setState('lastRenderTime', Date.now());

  // Check if should continue
  const framesRendered = getState('framesRendered') || 0;
  const chartX = getState('chartX') || CHART_CONFIG.CHART_START_X;
  const shouldContinue =
    framesRendered < config.frames && chartX <= CHART_CONFIG.CHART_END_X;

  if (shouldContinue) {
    // Schedule next with time taken for this frame (now after push - now at start)
    const timeTaken = Date.now() - now;
    await scheduleNextFrame(context, config, timeTaken);
  } else {
    await handleTestCompletion(context, metrics, chartRenderer);
  }
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
    setState?.('loopScheduled', false);
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

async function drawChartPoint(device, frametime, getState, setState) {
  if (frametime > 0) {
    const chartX = getState?.('chartX') || CHART_CONFIG.CHART_START_X;
    if (chartX <= CHART_CONFIG.CHART_END_X) {
      // Calculate Y position (inverted, 0 at bottom)
      const normalizedValue = Math.min(
        Math.max(frametime, 0),
        CHART_CONFIG.MAX_VALUE,
      );
      const scaledValue =
        (normalizedValue / CHART_CONFIG.MAX_VALUE) * CHART_CONFIG.CHART_HEIGHT;
      const y = CHART_CONFIG.CHART_BOTTOM_Y - Math.round(scaledValue);

      // Get color based on performance
      const color = getPerformanceColor(frametime);

      // Draw the point
      await device.drawPixelRgba([chartX, y], color);

      setState('chartX', chartX + 1);
    }
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
  const { device, payload, getState, setState } = context;

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

      // Clear screen on new test
      await device.clear();
      logger.ok(
        `🎯 [PERF V3] Starting ${interval ? `fixed ${interval}ms` : 'adaptive'} test for ${frames} frames`,
      );

      // Schedule the first frame
      await scheduleNextFrame(context, config);
    } else {
      logger.warn(`⚠️ [PERF V3] Test already running. Skipping new test.`);
      // If test is already running, just push the current state
      await device.push(SCENE_NAME, true);
    }
  } catch (error) {
    logger.error(`❌ [PERF V3] Render error: ${error.message}`);
  }
}

module.exports = {
  name: SCENE_NAME,
  render,
  init,
  cleanup,
};
