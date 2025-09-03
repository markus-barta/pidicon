/**
 * @fileoverview Performance Test V3 - Professional-grade adaptive timing test
 * @description Advanced performance testing scene with real-time metrics, adaptive timing,
 * and professional-grade architecture for the Pixoo device ecosystem.
 * @version 3.0.0
 * @author: Sonic + Cursor + Markus Barta (mba)
 * @license MIT
 */

// MQTT Commands:
// {"scene":"test_performance_v3","mode":"continuous","interval":150}                    - Continuous mode, 63 frames (default)
// {"scene":"test_performance_v3","mode":"continuous","interval":100,"frames":200}       - Continuous mode, 200 frames
// {"scene":"test_performance_v3","mode":"continuous","interval":100,"adaptiveTiming":true} - Adaptive continuous mode, 63 frames
// {"scene":"test_performance_v3","mode":"loop","interval":200,"duration":60000}        - Loop mode, 60s duration
// {"scene":"test_performance_v3","interval":50,"adaptiveTiming":true}                  - Fast adaptive mode, 63 frames
// {"scene":"test_performance_v3","clear":true,"mode":"continuous","interval":150}      - Clear screen before starting test
// {"scene":"test_performance_v3","stop":true}                                          - Stop any running test

'use strict';

const SCENE_NAME = 'test_performance_v3';

// Import external dependencies
const mqtt = require('mqtt');

// Import internal modules
const deviceAdapter = require('../lib/device-adapter');
const { createGradientRenderer } = require('../lib/gradient-renderer');
const {
  CHART_CONFIG,
  getPerformanceColor,
} = require('../lib/performance-utils');
const {
  drawTextRgbaAlignedWithBg,
  drawLine,
  clearRectangle,
  BACKGROUND_COLORS,
} = require('../lib/rendering-utils');

async function init() {
  // Initialize test performance v3 scene - nothing special needed
  console.log(`🚀 [TEST_PERFORMANCE_V3] Scene initialized`);
}

async function cleanup(ctx) {
  try {
    const state = ctx?.state;
    const loopTimer = state?.get('loopTimer');
    if (loopTimer) {
      clearTimeout(loopTimer);
      state.set('loopTimer', null);
    }
    state?.set && state.set('loopScheduled', false);
    state?.set && state.set('testCompleted', true);
  } catch (e) {
    console.warn(`⚠️ [TEST_PERF_V3] Cleanup encountered an issue:`, e?.message);
  }
  console.log(`🧹 [TEST_PERFORMANCE_V3] Scene cleaned up`);
}

/**
 * Test mode enumeration for type safety
 * @readonly
 * @enum {string}
 */
const TEST_MODES = Object.freeze({
  CONTINUOUS: 'continuous',
  BURST: 'burst',
  LOOP: 'loop',
  SWEEP: 'sweep',
});

/**
 * Additional configuration specific to v3
 * @readonly
 * @enum {Object}
 */
const V3_CONFIG = Object.freeze({
  LOOP_DURATION_DEFAULT: 300000, // 5 minutes
  TEXT_COLOR_COMPLETE: [255, 255, 255, 127],
  MQTT_TIMEOUT_MS: 5000,
  MIN_DELAY_MS: 50,
  MAX_DELAY_MS: 2000,
});

// getPerformanceColor function is now imported from performance-utils
/**
 * Professional State Manager for performance test
 * @class
 */
class PerformanceTestState {
  /**
   * @param {Function} getState - State getter function
   * @param {Function} setState - State setter function
   */
  constructor(getState, setState) {
    this.getState = getState;
    this.setState = setState;
  }

  /**
   * Checks if this is a fresh test start
   * @param {Object} state - Current state object
   * @returns {boolean} True if fresh start
   */
  isFreshStart(state) {
    const startTime = this.getState('startTime');
    const isContinuation = Boolean(
      state.get('_isLoopContinuation') || state.get('_isContinuation'),
    );
    const completed = Boolean(this.getState('testCompleted'));
    const rendered = this.getState('framesRendered') || 0;
    const configuredFrames = Number(state.get('frames'));
    const maxFrames =
      Number.isFinite(configuredFrames) && configuredFrames > 0
        ? configuredFrames
        : this.getState('maxFrames') || 63;

    // Fresh start when:
    // - No prior startTime (first run)
    // - Not a continuation message (external trigger)
    // - Previous run completed or reached frame limit
    return !startTime || !isContinuation || completed || rendered >= maxFrames;
  }

  /**
   * Resets all test state to initial values
   */
  reset() {
    const resetValues = {
      startTime: Date.now(),
      chartData: [],
      chartX: CHART_CONFIG.CHART_START_X,
      lastChartUpdate: Date.now(),
      frameTimes: [],
      perfStats: { sum: 0, count: 0, min: Infinity, max: 0 },
      framesRendered: 0,
      maxFrames: null,
      stop: false,
      testCompleted: false,
      completionTime: null,
      testActive: false,
      _loopIteration: 0,
      axesDrawn: false,
      prevMode: null,
      prevInterval: null,
      prevFps: null,
      loopTimer: null,
      loopScheduled: false,
      _isLoopContinuation: false,
      _isContinuation: false,
    };

    Object.entries(resetValues).forEach(([key, value]) => {
      this.setState(key, value);
    });

    // Clear any existing timers
    const existingTimer = this.getState('loopTimer');
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
  }

  /**
   * Updates performance statistics
   * @param {number} frametime - Current frame time
   */
  updatePerformanceStats(frametime) {
    if (typeof frametime !== 'number' || frametime <= 0) return;

    let frameTimes = this.getState('frameTimes') || [];
    let perfStats = this.getState('perfStats') || {
      sum: 0,
      count: 0,
      min: Infinity,
      max: 0,
    };

    // Clamp frametime to chart bounds to avoid outliers
    const clampedFrametime = Math.min(
      CHART_CONFIG.MAX_FRAMETIME,
      Math.max(CHART_CONFIG.MIN_FRAMETIME, frametime),
    );

    frameTimes.push(clampedFrametime);
    if (frameTimes.length > CHART_CONFIG.MAX_FRAME_SAMPLES) {
      const removed = frameTimes.shift();
      perfStats.sum -= removed;
      perfStats.count--;
    }

    perfStats.sum += clampedFrametime;
    perfStats.count++;
    perfStats.min = Math.min(perfStats.min, clampedFrametime);
    perfStats.max = Math.max(perfStats.max, clampedFrametime);

    this.setState('frameTimes', frameTimes);
    this.setState('perfStats', perfStats);
  }

  /**
   * Gets computed performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const perfStats = this.getState('perfStats') || {
      sum: 0,
      count: 0,
      min: Infinity,
      max: 0,
    };
    const frameTimes = this.getState('frameTimes') || [];

    const avg = perfStats.count > 0 ? perfStats.sum / perfStats.count : 0;
    const avgInt = Math.round(
      Math.min(
        CHART_CONFIG.MAX_FRAMETIME,
        Math.max(CHART_CONFIG.MIN_FRAMETIME, avg),
      ),
    );
    const minInt = Math.round(
      perfStats.min === Infinity
        ? 0
        : Math.max(CHART_CONFIG.MIN_FRAMETIME, perfStats.min),
    );
    const maxInt = Math.round(
      Math.min(CHART_CONFIG.MAX_FRAMETIME, perfStats.max),
    );

    return {
      avgFrametime: avgInt,
      minFrametime: minInt,
      maxFrametime: maxInt,
      sampleCount: frameTimes.length,
      fps: avgInt > 0 ? Math.round(1000 / avgInt) : 0,
    };
  }
}

/**
 * Professional Performance Tracker
 * @class
 */
class PerformanceTracker {
  /**
   * @param {PerformanceTestState} stateManager - State management instance
   */
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.lastLogTime = 0;
  }

  /**
   * Records a frame timing measurement
   * @param {number} frametime - Frame time in milliseconds
   */
  recordFrame(frametime) {
    this.stateManager.updatePerformanceStats(frametime);
  }

  /**
   * Gets current performance metrics
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    return this.stateManager.getPerformanceMetrics();
  }

  /**
   * Logs performance data with intelligent throttling
   * @param {string} mode - Current test mode
   * @param {boolean} shouldRender - Whether rendering is active
   */
  logPerformance(mode, shouldRender) {
    const now = Date.now();
    if (now - this.lastLogTime < 1000) return; // Log max once per second

    const metrics = this.getMetrics();
    console.log(
      `🎮 [PERF V3] ${mode} mode | ` +
        `FT:${metrics.avgFrametime.toFixed(1)}ms | ` +
        `FPS:${metrics.fps} | ` +
        `Samples:${metrics.sampleCount} | ` +
        `Render:${shouldRender}`,
    );

    this.lastLogTime = now;
  }
}

/**
 * Handles continuation message processing
 * @param {Object} state - Current state
 * @param {Function} getState - State getter
 * @param {Function} setState - State setter
 */
function handleContinuationMessages(state, getState, setState) {
  if (state.get('_isLoopContinuation')) {
    const existingTimer = getState('loopTimer');
    if (existingTimer) {
      clearTimeout(existingTimer);
      setState('loopTimer', null);
    }
    setState('loopScheduled', false);
    setState('_loopIteration', state.get('_loopIteration') || 0);
  }
}

/**
 * Handles fresh start initialization
 * @param {Object} device - Device interface
 * @param {Object} stateManager - State manager instance
 * @param {Object} config - Test configuration
 */
async function handleFreshStart(device, stateManager, config) {
  // Check if device is ready before proceeding
  const deviceReady = await device.isReady();
  if (!deviceReady) {
    console.log(`⏳ [PERF V3] Device not ready, waiting...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Try again after delay
    const stillNotReady = !(await device.isReady());
    if (stillNotReady) {
      console.warn(`⚠️ [PERF V3] Device still not ready, proceeding anyway`);
    }
  }

  try {
    await device.clear();
    stateManager.reset();

    console.log(
      `🎯 [PERF V3] Fresh test start | Mode: ${config.mode} | ` +
        `Interval: ${config.testInterval}ms | Adaptive: ${config.adaptiveTiming}`,
    );
  } catch (error) {
    console.error(
      `❌ [PERF V3] Failed to clear device on fresh start:`,
      error.message,
    );
    // Continue anyway, the device might recover
  }
}

/**
 * Handles frame counting and completion for continuous mode
 * @param {Object} config - Test configuration
 * @param {number} maxFrames - Maximum frames to render
 * @param {Function} getState - State getter
 * @param {Function} setState - State setter
 * @returns {boolean} True if test should continue
 */
function handleFrameCounting(config, maxFrames, getState, setState) {
  const currentFrames = getState('framesRendered') || 0;
  setState('framesRendered', currentFrames + 1);

  // Infinite looping when maxFrames === -1
  if (maxFrames === -1) {
    return true;
  }

  // Check if we've reached the frame limit
  if (currentFrames + 1 >= maxFrames) {
    console.log(
      `🏁 [PERF V3] Reached frame limit (${maxFrames}) - test complete`,
    );
    setState('testCompleted', true);

    // Clean up timers
    const existingTimer = getState('loopTimer');
    if (existingTimer) {
      clearTimeout(existingTimer);
      setState('loopTimer', null);
    }
    setState('loopScheduled', false);
    return false; // Stop rendering
  }

  return true; // Continue rendering
}

/**
 * Handles test completion
 * @param {Object} chartRenderer - Chart renderer instance
 * @param {Object} textRenderer - Text renderer instance
 * @param {Object} performanceTracker - Performance tracker instance
 * @param {Object} displayContent - Display content
 * @param {Object} device - Device interface
 * @param {Function} publishOk - Success callback
 * @param {Function} getState - State getter
 * @param {Function} setState - State setter
 * @param {number} frametime - Current frame time
 * @param {number} now - Current timestamp
 */
// Note: handleTestCompletion removed; completion handled inline by frame counter

/**
 * Main render function with professional architecture
 * @param {Object} ctx - Render context
 * @param {Object} ctx.device - Device interface
 * @param {Object} ctx.state - Current state
 * @param {Function} ctx.getState - State getter
 * @param {Function} ctx.setState - State setter
 * @param {Function} ctx.publishOk - Success callback
 * @param {number} ctx.frametime - Current frame time
 */
async function render(ctx) {
  const { device, state, getState, setState, publishOk, frametime } = ctx;

  try {
    const ADVANCED_FEATURES = deviceAdapter.ADVANCED_FEATURES || {
      GRADIENT_RENDERING: false,
      ADVANCED_CHART: false,
      ENHANCED_TEXT: false,
      IMAGE_PROCESSING: false,
      ANIMATIONS: false,
      PERFORMANCE_MONITORING: true,
    };

    // Initialize professional state management
    const stateManager = new PerformanceTestState(getState, setState);
    const performanceTracker = new PerformanceTracker(stateManager);

    // Initialize advanced renderers if features are enabled
    let gradientRenderer = null;
    if (ADVANCED_FEATURES.GRADIENT_RENDERING) {
      gradientRenderer = createGradientRenderer(device);
    }

    // Extract configuration with validation
    const config = {
      mode: TEST_MODES[state.get('mode')] || TEST_MODES.CONTINUOUS,
      testInterval: Math.max(50, Math.min(2000, state.get('interval') || 150)),
      loopDuration: state.get('duration') || V3_CONFIG.LOOP_DURATION_DEFAULT,
      adaptiveTiming: Boolean(state.get('adaptiveTiming')),
      stop: Boolean(state.get('stop')),
    };

    // Handle stop command (no full clear; overlay STOPPED)
    if (config.stop) {
      console.log(`🛑 [PERF V3] Stop command received - cleaning up...`);

      // Clean up timers
      const existingTimer = getState('loopTimer');
      if (existingTimer) {
        clearTimeout(existingTimer);
        setState('loopTimer', null);
      }
      setState('loopScheduled', false);
      setState('testCompleted', false); // allow immediate restart
      setState('framesRendered', 0);
      setState('maxFrames', null);
      setState('stop', false); // clear stop flag for next call

      // Overlay STOPPED without full clear
      const {
        drawTextRgbaAlignedWithBg,
        BACKGROUND_COLORS,
      } = require('../lib/rendering-utils');
      await drawTextRgbaAlignedWithBg(
        device,
        'STOPPED',
        [32, 32],
        [255, 100, 100, 255],
        'center',
        true,
        BACKGROUND_COLORS.TRANSPARENT_BLACK_75,
      );
      await device.push(SCENE_NAME, publishOk);

      console.log(`✅ [PERF V3] Test stopped successfully`);
      return;
    }

    // Handle continuation messages
    handleContinuationMessages(state, getState, setState);

    // Fresh start logic with device readiness check
    if (stateManager.isFreshStart(state)) {
      await handleFreshStart(device, stateManager, config);
    } else {
      // Ensure no stale timers or flags prevent a clean rerun
      const existingTimer = getState('loopTimer');
      if (existingTimer) {
        clearTimeout(existingTimer);
        setState('loopTimer', null);
      }
      setState('loopScheduled', false);
      setState('testCompleted', false);
    }

    const configuredFrames = Number(state.get('frames'));
    const maxFrames =
      Number.isFinite(configuredFrames) && configuredFrames > 0
        ? configuredFrames
        : 63; // Default: run once across screen (63 pixels, x=1 to x=63)
    setState('maxFrames', maxFrames);
    const framesRendered = getState('framesRendered') || 0;

    // For continuous mode, check if we've reached the frame limit
    const shouldRender =
      config.mode === TEST_MODES.CONTINUOUS ? framesRendered < maxFrames : true; // Other modes use their own logic

    const now = Date.now();
    const lastRenderTs = getState('lastRenderTs') || 0;
    const measuredFrametime =
      lastRenderTs > 0
        ? Math.max(1, now - lastRenderTs)
        : frametime || config.testInterval || 0;

    // Record performance data using measured frametime
    if (measuredFrametime > 0) {
      performanceTracker.recordFrame(measuredFrametime);
    }

    // Log performance periodically
    performanceTracker.logPerformance(config.mode, shouldRender);

    // Set dynamic update interval on the chart renderer via state
    setState(
      'updateIntervalMs',
      Number.isFinite(config.testInterval)
        ? Math.max(0, Math.min(2000, config.testInterval))
        : 0,
    );

    // Create professional chart and text renderers
    const chartRenderer = new ChartRenderer(
      device,
      getState,
      setState,
      performanceTracker,
      gradientRenderer,
      ADVANCED_FEATURES,
    );
    const textRenderer = new TextRenderer(
      device,
      getState,
      setState,
      performanceTracker,
    );

    // Generate display content based on mode
    const displayContent = generateDisplayContent(
      config,
      frametime,
      getState,
      performanceTracker,
    );

    // Render frame if within time limits
    if (shouldRender) {
      await chartRenderer.render(
        now,
        measuredFrametime > 0
          ? measuredFrametime
          : frametime || config.testInterval,
      );
      await textRenderer.render(displayContent, now);

      // Push rendered frame
      await device.push(SCENE_NAME, publishOk);

      // Update frame count and check for completion
      if (!handleFrameCounting(config, maxFrames, getState, setState)) {
        // Overlay COMPLETE without full clear
        const {
          drawTextRgbaAlignedWithBg,
          BACKGROUND_COLORS,
        } = require('../lib/rendering-utils');
        await drawTextRgbaAlignedWithBg(
          device,
          'COMPLETE',
          [32, 32],
          [255, 255, 255, 127],
          'center',
          true,
          BACKGROUND_COLORS.TRANSPARENT_BLACK_75,
        );
        await device.push(SCENE_NAME, publishOk);
        return; // Test completed
      }

      // Schedule continuation ONLY if test not completed
      if (!getState('loopScheduled')) {
        const hasFixed = Number.isFinite(config.testInterval);
        const delay = hasFixed
          ? Math.max(
              V3_CONFIG.MIN_DELAY_MS,
              Math.min(V3_CONFIG.MAX_DELAY_MS, config.testInterval),
            )
          : 0; // maximize performance when no fixed interval provided

        scheduleContinuation(ctx, config, delay);
      }
    }

    // Update render timestamp
    setState('lastRender', now);
    setState('lastRenderTs', now);
  } catch (error) {
    console.error(`❌ [PERF V3] Critical render error:`, error);
    // Attempt graceful recovery
    try {
      if (typeof setState === 'function') {
        setState('testCompleted', true);
      }
      if (typeof publishOk === 'function') {
        publishOk(device?.host || 'unknown', SCENE_NAME, 0, 0, {
          pushes: 0,
          skipped: 0,
          errors: 1,
          lastFrametime: 0,
        });
      }
    } catch (recoveryError) {
      console.error(`❌ [PERF V3] Recovery failed:`, recoveryError);
    }
  }
}

/**
 * Professional Chart Renderer with optimized performance
 * @class
 */
class ChartRenderer {
  /**
   * @param {Object} device - Device interface
   * @param {Function} getState - State getter function
   * @param {Function} setState - State setter function
   * @param {PerformanceTracker} performanceTracker - Performance tracker instance
   * @param {Object} gradientRenderer - Gradient renderer instance (optional)
   * @param {Object} advancedFeatures - Advanced features configuration
   */
  constructor(
    device,
    getState,
    setState,
    performanceTracker,
    gradientRenderer,
    advancedFeatures,
  ) {
    this.device = device;
    this.getState = getState;
    this.setState = setState;
    this.performanceTracker = performanceTracker;
    this.gradientRenderer = gradientRenderer;
    this.advancedFeatures = advancedFeatures;
  }

  /**
   * Renders the performance chart with axes and data points
   * @param {number} currentTime - Current timestamp
   * @param {number} chartFrametime - Frame time for chart data
   */
  async render(currentTime, chartFrametime) {
    await this.renderAxes();
    await this.updateChartData(currentTime, chartFrametime);
  }

  /**
   * Renders chart axes (only once per test)
   */
  async renderAxes() {
    if (this.getState('axesDrawn')) return;

    await clearRectangle(
      this.device,
      0,
      CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT,
      1,
      CHART_CONFIG.RANGE_HEIGHT,
    );
    await clearRectangle(
      this.device,
      CHART_CONFIG.CHART_START_X,
      CHART_CONFIG.START_Y,
      64 - CHART_CONFIG.CHART_START_X,
      1,
    );

    // Batch draw Y-axis
    for (
      let y = CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT;
      y < CHART_CONFIG.START_Y;
      y++
    ) {
      this.device.drawPixelRgba([0, y], CHART_CONFIG.AXIS_COLOR);
    }

    // Batch draw X-axis
    for (let x = CHART_CONFIG.CHART_START_X; x < 64; x++) {
      this.device.drawPixelRgba(
        [x, CHART_CONFIG.START_Y],
        CHART_CONFIG.AXIS_COLOR,
      );
    }

    this.setState('axesDrawn', true);
  }

  /**
   * Updates chart with new data point
   * @param {number} currentTime - Current timestamp
   * @param {number} chartFrametime - Frame time value
   */
  async updateChartData(currentTime, chartFrametime) {
    const chartX = this.getState('chartX') || CHART_CONFIG.CHART_START_X;
    const lastChartUpdate = this.getState('lastChartUpdate') || currentTime;
    const updateIntervalMs =
      this.getState('updateIntervalMs') ?? CHART_CONFIG.UPDATE_INTERVAL_MS;
    if (currentTime - lastChartUpdate < updateIntervalMs) {
      return;
    }

    // For continuous mode, wrap around when chart reaches the end
    if (chartX >= 63) {
      // Clear the vertical line at the current position before wrapping
      await this.device.drawRectangleRgba(
        [chartX, CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT],
        [1, CHART_CONFIG.RANGE_HEIGHT],
        CHART_CONFIG.BG_COLOR, // Black background
      );

      // Reset chart position for continuous mode
      this.setState('chartX', CHART_CONFIG.CHART_START_X);
      this.setState('chartData', []); // Clear old data
      return;
    }

    // Calculate chart position
    const normalizedFrametime = Math.min(
      CHART_CONFIG.MAX_FRAMETIME,
      Math.max(CHART_CONFIG.MIN_FRAMETIME, chartFrametime),
    );
    const ratio =
      (normalizedFrametime - CHART_CONFIG.MIN_FRAMETIME) /
      (CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);
    const yOffset = Math.round(ratio * CHART_CONFIG.RANGE_HEIGHT);
    const yPos = CHART_CONFIG.START_Y - 1 - yOffset;

    // Add data point with memory management
    let chartData = this.getState('chartData') || [];
    if (chartData.length >= CHART_CONFIG.MAX_CHART_POINTS) {
      chartData.shift(); // Remove oldest point
    }

    const chartColor = getPerformanceColor(chartFrametime);
    chartData.push({ x: chartX, y: yPos, color: chartColor });

    // Clear the current line position before drawing new value
    await this.device.drawRectangleRgba(
      [chartX, CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT],
      [1, CHART_CONFIG.RANGE_HEIGHT],
      CHART_CONFIG.BG_COLOR, // Black background
    );

    // Draw line if we have at least 2 points
    if (chartData.length > 1) {
      const prev = chartData[chartData.length - 2];
      const curr = chartData[chartData.length - 1];

      // Use performance-based color for line drawing
      // Always use the current frame's performance color for the line
      drawLine(this.device, prev.x, prev.y, curr.x, curr.y, curr.color);
    }

    this.setState('chartData', chartData);
    this.setState('chartX', chartX + 1);
    this.setState('lastChartUpdate', currentTime);
  }

  /**
   * Checks if chart is complete
   * @returns {boolean} True if chart has all data points
   */
  isComplete() {
    const chartX = this.getState('chartX') || CHART_CONFIG.CHART_START_X;
    return chartX >= 63;
  }
}

/**
 * Professional Text Renderer with optimized performance
 * @class
 */
class TextRenderer {
  /**
   * @param {Object} device - Device interface
   * @param {Function} getState - State getter function
   * @param {Function} setState - State setter function
   * @param {PerformanceTracker} performanceTracker - Performance tracker instance
   */
  constructor(device, getState, setState, performanceTracker) {
    this.device = device;
    this.getState = getState;
    this.setState = setState;
    this.performanceTracker = performanceTracker;
  }

  /**
   * Renders all text elements with background clearing
   * @param {Object} displayContent - Content to display
   */
  async render(displayContent) {
    const { modeText, timingText, fpsText, metrics } = displayContent;

    // Render header text
    await this.renderHeader(modeText, timingText, fpsText);

    // Render statistics (always update for accuracy)
    await this.renderStatistics(metrics);
  }

  /**
   * Renders header text elements
   * @param {string} modeText - Mode display text
   * @param {string} timingText - Timing display text
   * @param {string} fpsText - FPS display text
   */
  async renderHeader(modeText, timingText, fpsText) {
    if (modeText) {
      await drawTextRgbaAlignedWithBg(
        this.device,
        modeText,
        [2, 2],
        CHART_CONFIG.TEXT_COLOR_HEADER,
        'left',
        true,
      );
    }
    // Combine FPS and frametime on same line like gaming overlays
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

  /**
   * Renders performance statistics at bottom (copied from v2)
   * @param {Object} metrics - Performance metrics
   */
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
      const totalFrames = (this.getState('framesRendered') || 0).toString();
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

  /**
   * Renders test completion message
   */
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
 * @param {PerformanceTracker} performanceTracker - Performance tracker
 * @returns {Object} Display content object
 */
function generateDisplayContent(
  config,
  frametime,
  getState,
  performanceTracker,
) {
  const metrics = performanceTracker.getMetrics();

  let modeText = '';
  let timingText = '';
  let fpsText = '';

  if (
    config.mode === TEST_MODES.CONTINUOUS ||
    config.mode === TEST_MODES.LOOP
  ) {
    const modeLabel =
      config.mode === TEST_MODES.LOOP ? 'AUTO LOOP' : 'CONTINUOUS';
    const adaptiveLabel = config.adaptiveTiming ? 'FT+' : '';
    const currentFrametime = frametime || 0;

    modeText = `${modeLabel} ${adaptiveLabel}`;
    timingText = config.adaptiveTiming
      ? `${Math.round(currentFrametime)}ms`
      : `${config.testInterval}ms`;
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
 * Schedules continuation message for adaptive timing
 * @param {Object} ctx - Render context
 * @param {Object} config - Test configuration
 * @param {number} delay - Delay in milliseconds
 */
function scheduleContinuation(ctx, config, delay) {
  const { getState, setState } = ctx;

  const timer = setTimeout(async () => {
    try {
      const brokerUrl = `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`;

      const client = mqtt.connect(brokerUrl, {
        username: process.env.MOSQITTO_USER_MS24,
        password: process.env.MOSQITTO_PASS_MS24,
        connectTimeout: CHART_CONFIG.MQTT_TIMEOUT_MS,
        reconnectPeriod: 0,
      });

      client.on('connect', () => {
        try {
          const payload = JSON.stringify({
            scene: SCENE_NAME,
            mode: config.mode,
            adaptiveTiming: config.adaptiveTiming,
            interval: config.testInterval,
            frames: getState('maxFrames') || undefined,
            _loopIteration: (getState('_loopIteration') || 0) + 1,
            _isLoopContinuation: true,
          });

          const targetHost =
            ctx.env && ctx.env.host
              ? ctx.env.host
              : process.env.PIXOO_DEVICES
                ? process.env.PIXOO_DEVICES.split(';')[0].trim()
                : '192.168.1.159';

          client.publish(`pixoo/${targetHost}/state/upd`, payload, { qos: 1 });
          client.end();
        } catch (publishError) {
          console.error(`❌ [PERF V3] MQTT publish error:`, publishError);
          client.end();
        }
      });

      client.on('error', (error) => {
        console.error(`❌ [PERF V3] MQTT connection error:`, error.message);
        try {
          setState('loopScheduled', false);
          setState('loopTimer', null);
        } catch (stateError) {
          console.error(`❌ [PERF V3] State cleanup error:`, stateError);
        }
        client.end();
      });

      client.on('close', () => {
        try {
          setState('loopScheduled', false);
          setState('loopTimer', null);
        } catch (stateError) {
          console.error(`❌ [PERF V3] State cleanup error:`, stateError);
        }
      });
    } catch (error) {
      console.error(`❌ [PERF V3] Continuation setup error:`, error);
      try {
        setState('loopScheduled', false);
        setState('loopTimer', null);
      } catch (stateError) {
        console.error(`❌ [PERF V3] State cleanup error:`, stateError);
      }
    }
  }, delay);

  setState('loopTimer', timer);
  setState('loopScheduled', true);
}

module.exports = { name: SCENE_NAME, render, init, cleanup };
