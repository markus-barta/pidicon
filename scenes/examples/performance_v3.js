/**
 * @fileoverview Performance Test V3 - Professional Edition
 * @description Clean performance testing with two modes:
 * - Adaptive: Next frame starts immediately after current frame completes
 * - Fixed: Frames run at specified interval (e.g., every 150ms)
 * @mqtt Examples:
 * Adaptive mode: mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance_v3"}'
 * Fixed 150ms: mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance_v3","interval":150,"frames":100}'
 * @version 3.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI (Claude 3.5 Sonnet)
 * @license MIT
 */

'use strict';

const mqtt = require('mqtt');

const logger = require('../../lib/logger');
const {
  CHART_CONFIG,
  getPerformanceColor,
} = require('../../lib/performance-utils');
const {
  drawTextRgbaAlignedWithBg,
  BACKGROUND_COLORS,
} = require('../../lib/rendering-utils');

const name = 'performance_v3';

// Configuration constants
const DEFAULT_FRAMES = 100; // number of frames to run
const MAX_SAMPLES = 64; // matches chart width

/**
 * Initialize the performance test scene
 */
function init() {
  logger.debug(`🚀 [PERF V3] Scene initialized`);
}

/**
 * Cleanup the performance test scene
 */
function cleanup(context) {
  logger.debug(`🧹 [PERF V3] Scene cleaned up`);

  // Cancel any pending timers
  const timer = context.getState?.('timer');
  if (timer) {
    clearTimeout(timer);
    context.setState?.('timer', null);
  }
}

/**
 * Main render function
 */
async function render(context) {
  const { device, publishOk, payload, getState, setState } = context;

  try {
    // Get configuration from payload
    const interval = payload?.interval || null; // null = adaptive mode
    const frames = payload?.frames || DEFAULT_FRAMES;
    const isContinuation = payload?._continuation === true;

    // Initialize or get state
    let state = getState?.('perfState') || {
      samples: [],
      frameCount: 0,
      startTime: Date.now(),
      chartX: CHART_CONFIG.CHART_START_X,
      isRunning: false,
      config: { interval, frames },
    };

    // Reset if not a continuation and config changed
    if (!isContinuation && !state.isRunning) {
      state = {
        samples: [],
        frameCount: 0,
        startTime: Date.now(),
        chartX: CHART_CONFIG.CHART_START_X,
        isRunning: true,
        config: { interval, frames },
      };

      // Clear screen on new test
      await device.clear();
      logger.ok(
        `🎯 [PERF V3] Starting ${interval ? `fixed ${interval}ms` : 'adaptive'} test for ${frames} frames`,
      );
    }

    // Calculate timing
    const now = Date.now();
    const frametime = context.frametime || 0;

    // Add sample (skip first frame)
    if (frametime > 0 && state.frameCount > 0) {
      state.samples.push(frametime);
      if (state.samples.length > MAX_SAMPLES) {
        state.samples.shift();
      }
    }

    // Calculate metrics
    const avgFrametime =
      state.samples.length > 0
        ? Math.round(
            state.samples.reduce((a, b) => a + b, 0) / state.samples.length,
          )
        : 0;

    // Render display
    await renderDisplay(device, state, avgFrametime, frametime);

    // Draw chart point
    if (frametime > 0 && state.chartX <= CHART_CONFIG.CHART_END_X) {
      await drawChartPoint(device, state.chartX, frametime);
      state.chartX++;
    }

    // Push frame
    await device.push(name, publishOk);

    // Update state
    state.frameCount++;
    setState?.('perfState', state);

    // Check if test should continue
    const shouldContinue =
      state.frameCount < state.config.frames &&
      state.chartX <= CHART_CONFIG.CHART_END_X;

    if (shouldContinue) {
      // Schedule next iteration
      if (state.config.interval === null) {
        // Adaptive mode: immediate
        scheduleNextFrame(context, 0);
      } else {
        // Fixed interval mode
        const elapsed = now - (state.lastFrameTime || now);
        const delay = Math.max(0, state.config.interval - elapsed);
        scheduleNextFrame(context, delay);
      }
      state.lastFrameTime = now;
    } else {
      // Test completed
      state.isRunning = false;
      const duration = now - state.startTime;
      logger.ok(
        `✅ [PERF V3] Test completed: ${state.frameCount} frames in ${duration}ms (avg: ${avgFrametime}ms)`,
      );
    }
  } catch (error) {
    logger.error(`❌ [PERF V3] Render error: ${error.message}`);
  }
}

/**
 * Render the performance display
 */
async function renderDisplay(device, state, avgFrametime, currentFrametime) {
  const mode =
    state.config.interval === null ? 'ADAPTIVE' : `${state.config.interval}ms`;

  // Title
  await drawTextRgbaAlignedWithBg(
    device,
    'PERF-V3',
    [32, 3],
    [255, 255, 255, 255],
    'center',
    true,
    BACKGROUND_COLORS.TRANSPARENT_BLACK_50,
  );

  // Mode
  await drawTextRgbaAlignedWithBg(
    device,
    mode,
    [32, 11],
    [200, 200, 200, 255],
    'center',
    false,
    null,
  );

  // Current frame time
  if (currentFrametime > 0) {
    const color = getPerformanceColor(currentFrametime);
    await drawTextRgbaAlignedWithBg(
      device,
      `${currentFrametime}ms`,
      [32, 19],
      color,
      'center',
      false,
      null,
    );
  }

  // Average
  await drawTextRgbaAlignedWithBg(
    device,
    `AVG:${avgFrametime}`,
    [32, 56],
    [255, 255, 0, 255],
    'center',
    false,
    BACKGROUND_COLORS.TRANSPARENT_BLACK_50,
  );
}

/**
 * Draw a single chart point
 */
async function drawChartPoint(device, x, frametime) {
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
  await device.drawPixelRgba([x, y], color);

  // Draw grid lines for reference
  if (x === CHART_CONFIG.CHART_START_X) {
    // Y axis
    for (
      let gy = CHART_CONFIG.CHART_TOP_Y;
      gy <= CHART_CONFIG.CHART_BOTTOM_Y;
      gy += 5
    ) {
      await device.drawPixelRgba([x - 1, gy], [100, 100, 100, 255]);
    }
    // X axis
    for (
      let gx = CHART_CONFIG.CHART_START_X;
      gx <= CHART_CONFIG.CHART_END_X;
      gx += 5
    ) {
      await device.drawPixelRgba(
        [gx, CHART_CONFIG.CHART_BOTTOM_Y + 1],
        [100, 100, 100, 255],
      );
    }
  }
}

/**
 * Schedule the next frame
 */
function scheduleNextFrame(context, delay) {
  const timer = setTimeout(() => {
    const brokerUrl =
      process.env.MQTT_BROKER_URL ||
      `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`;

    const client = mqtt.connect(brokerUrl, {
      username: process.env.MOSQITTO_USER_MS24,
      password: process.env.MOSQITTO_PASS_MS24,
      connectTimeout: 5000,
      reconnectPeriod: 0,
    });

    client.on('connect', () => {
      const deviceIp = context.device?.host || '192.168.1.159';
      const state = context.getState?.('perfState');
      const message = {
        scene: 'performance_v3',
        _continuation: true,
        interval: state?.config?.interval,
        frames: state?.config?.frames,
      };

      client.publish(
        `pixoo/${deviceIp}/state/upd`,
        JSON.stringify(message),
        { qos: 1 },
        (err) => {
          if (err) {
            logger.error(`❌ [PERF V3] MQTT publish error: ${err.message}`);
          }
          client.end();
        },
      );
    });

    client.on('error', (err) => {
      logger.error(`❌ [PERF V3] MQTT error: ${err.message}`);
      client.end();
    });
  }, delay);

  context.setState?.('timer', timer);
}

module.exports = { name, init, render, cleanup };
