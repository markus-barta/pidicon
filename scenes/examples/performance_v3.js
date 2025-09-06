/**
 * @fileoverview Performance Test V3 - Professional Edition
 * @description Clean performance testing with two modes:
 * - Adaptive: Next frame starts immediately after current frame completes
 * - Fixed: Frames run at specified interval (e.g., every 150ms)
 * @mqtt Examples:
 * Adaptive mode: mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance_v3"}'
 * Fixed 150ms, 100 frames: mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance_v3","interval":150,"frames":100}'
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
  clearRectangle,
  BACKGROUND_COLORS,
} = require('../../lib/rendering-utils');

const name = 'performance_v3';

// Configuration defaults
const DEFAULT_FRAMES = 100;

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
      minFrametime: Infinity,
      maxFrametime: 0,
      sumFrametime: 0,
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
        minFrametime: Infinity,
        maxFrametime: 0,
        sumFrametime: 0,
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

    // Update statistics (skip first frame)
    if (frametime > 0 && state.frameCount > 0) {
      state.samples.push(frametime);
      state.sumFrametime += frametime;
      state.minFrametime = Math.min(state.minFrametime, frametime);
      state.maxFrametime = Math.max(state.maxFrametime, frametime);
    }

    // Calculate metrics
    const avgFrametime =
      state.samples.length > 0
        ? Math.round(state.sumFrametime / state.samples.length)
        : 0;

    // Render UI
    await renderUI(device, state, avgFrametime, frametime);

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

    if (shouldContinue && !isContinuation) {
      // Only schedule next frame on initial render, not on continuations
      // This prevents double-scheduling
      if (state.config.interval === null) {
        // Adaptive mode: schedule immediately
        scheduleNextFrame(context, device, 0);
      } else {
        // Fixed interval mode
        scheduleNextFrame(context, device, state.config.interval);
      }
    } else if (!shouldContinue) {
      // Test completed
      state.isRunning = false;
      const duration = now - state.startTime;
      logger.ok(
        `✅ [PERF V3] Test completed: ${state.frameCount} frames in ${duration}ms (avg: ${avgFrametime}ms)`,
      );

      // Show completion overlay
      await drawTextRgbaAlignedWithBg(
        device,
        'COMPLETE',
        [32, 32],
        [255, 255, 255, 127],
        'center',
        true,
        BACKGROUND_COLORS.TRANSPARENT_BLACK_75,
      );
      await device.push(name, publishOk);
    }
  } catch (error) {
    logger.error(`❌ [PERF V3] Render error: ${error.message}`);
  }
}

/**
 * Render the UI elements
 */
async function renderUI(device, state, avgFrametime, currentFrametime) {
  // Mode and timing header
  const modeText =
    state.config.interval === null
      ? 'ADAPTIVE'
      : `FIXED ${state.config.interval}ms`;
  await drawTextRgbaAlignedWithBg(
    device,
    modeText,
    [2, 2],
    CHART_CONFIG.TEXT_COLOR_HEADER,
    'left',
    true,
    null,
  );

  // Current frametime and FPS
  if (currentFrametime > 0) {
    const fps = Math.round(1000 / currentFrametime);
    const timingText = `${fps}FPS/${currentFrametime}ms`;
    await drawTextRgbaAlignedWithBg(
      device,
      timingText,
      [2, 10],
      CHART_CONFIG.TEXT_COLOR_HEADER,
      'left',
      true,
      null,
    );
  }

  // Clear statistics area
  await clearRectangle(device, 0, 51, 64, 13, CHART_CONFIG.BG_COLOR);

  // Frame counter
  await drawTextRgbaAlignedWithBg(
    device,
    'Frame:',
    [0, 52],
    CHART_CONFIG.TEXT_COLOR_STATS,
    'left',
    false,
    null,
  );
  await drawTextRgbaAlignedWithBg(
    device,
    state.frameCount.toString(),
    [25, 52],
    CHART_CONFIG.TEXT_COLOR_HEADER,
    'left',
    false,
    null,
  );

  // Average
  await drawTextRgbaAlignedWithBg(
    device,
    'Av:',
    [0, 58],
    CHART_CONFIG.TEXT_COLOR_STATS,
    'left',
    false,
    null,
  );
  const avgColor = getPerformanceColor(avgFrametime);
  await drawTextRgbaAlignedWithBg(
    device,
    `${avgFrametime}`,
    [12, 58],
    avgColor,
    'left',
    false,
    null,
  );

  // Min/Max
  if (state.minFrametime !== Infinity) {
    const minColor = getPerformanceColor(state.minFrametime);
    await drawTextRgbaAlignedWithBg(
      device,
      'Lo:',
      [28, 58],
      CHART_CONFIG.TEXT_COLOR_STATS,
      'left',
      false,
      null,
    );
    await drawTextRgbaAlignedWithBg(
      device,
      `${state.minFrametime}`,
      [40, 58],
      minColor,
      'left',
      false,
      null,
    );
  }

  if (state.maxFrametime > 0) {
    const maxColor = getPerformanceColor(state.maxFrametime);
    await drawTextRgbaAlignedWithBg(
      device,
      'Hi:',
      [52, 52],
      CHART_CONFIG.TEXT_COLOR_STATS,
      'left',
      false,
      null,
    );
    await drawTextRgbaAlignedWithBg(
      device,
      `${state.maxFrametime}`,
      [63, 52],
      maxColor,
      'right',
      false,
      null,
    );
  }
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
}

/**
 * Schedule the next frame using MQTT
 */
function scheduleNextFrame(context, device, delay) {
  const timer = setTimeout(() => {
    // Get broker config from environment
    const brokerHost = process.env.MOSQITTO_HOST_MS24 || 'localhost';
    const brokerUrl = `mqtt://${brokerHost}:1883`;

    const client = mqtt.connect(brokerUrl, {
      username: process.env.MOSQITTO_USER_MS24,
      password: process.env.MOSQITTO_PASS_MS24,
      connectTimeout: 5000,
      reconnectPeriod: 0,
    });

    client.on('connect', () => {
      const deviceIp = device?.host || '192.168.1.159';
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
