/**
 * @fileoverview Advanced Charting Module
 * @description Renders a highly customizable chart with advanced features like
 * dynamic scaling, multiple series, and configurable visual elements. This scene
 * is designed for performance and flexibility.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"advanced_chart"}'
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

// MQTT Commands:
// {"scene":"advanced_chart","mode":"demo","dataType":"power","updateInterval":2000,"scale":5}           - Power price demo
// {"scene":"advanced_chart","mode":"demo","dataType":"temperature","updateInterval":2000,"scale":1}      - Temperature demo
// {"scene":"advanced_chart","mode":"demo","dataType":"random","updateInterval":2000,"scale":2}            - Random data demo
// {"scene":"advanced_chart","dataType":"power","scale":10}                                               - High scale power demo
// {"scene":"advanced_chart","clear":true,"mode":"demo","dataType":"power"}                               - Clear screen before drawing

'use strict';

const SCENE_NAME = 'advanced_chart';

// Import shared utilities
const logger = require('../../../lib/logger');
const { validateSceneContext } = require('../../../lib/performance-utils');

/**
 * Advanced Chart Scene - Professional data visualization
 * @param {Object} ctx - Render context
 * @returns {Promise<void>}
 */
async function init() {
  // Initialize advanced chart scene - nothing special needed
  logger.debug(`🚀 [ADVANCED_CHART] Scene initialized`);
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, SCENE_NAME)) {
    return;
  }

  const { device, state, publishOk } = ctx;

  // Advanced chart is always available

  // Initialize advanced chart renderer
  const {
    createAdvancedChartRenderer,
  } = require('../../../lib/advanced-chart');
  const chartRenderer = createAdvancedChartRenderer(device);

  // Configuration
  const config = {
    mode: state.mode || 'demo',
    dataType: state.dataType || 'power', // 'power', 'temperature', 'random'
    updateInterval: state.updateInterval || 2000,
    scale: state.scale || 5,
  };

  // Generate demo data based on configuration
  const demoData = generateDemoData(config);

  // Render the chart
  const result = await chartRenderer.renderPowerChart(demoData, {
    scale: config.scale,
    maxHeight: 30,
  });

  // Add chart title and info
  const title = `${config.dataType.toUpperCase()} CHART`;
  await device.drawTextRgbaAligned(
    title,
    [32, 2],
    [255, 255, 255, 255],
    'center',
  );

  // Add statistics
  if (result.success && result.metadata) {
    const stats = result.metadata.statistics;
    const statsText = `MIN:${Math.round(stats.min)} MAX:${Math.round(stats.max)} AVG:${Math.round(stats.avg)}`;
    await device.drawTextRgbaAligned(
      statsText,
      [32, 58],
      [128, 128, 128, 255],
      'center',
    );
  }

  // Push the rendered frame
  await device.push(SCENE_NAME, publishOk);

  // Log performance
  if (result.success) {
    logger.debug(
      `📊 [ADVANCED CHART] Rendered ${result.dataPoints} points in ${result.renderTime}ms`,
    );
  } else {
    logger.error(`❌ [ADVANCED CHART] Render failed: ${result.error}`);
  }
}

/**
 * Generates demo data for the advanced chart
 * @param {Object} config - Chart configuration
 * @returns {number[]} Array of demo data points
 */
function generateDemoData(config) {
  const dataPoints = 32; // Number of data points to generate
  const data = [];

  switch (config.dataType) {
    case 'power':
      // Generate power price data with some negative values
      for (let i = 0; i < dataPoints; i++) {
        let price = 15 + Math.sin(i * 0.3) * 8 + Math.random() * 5;
        // Add some negative prices occasionally
        if (Math.random() < 0.1) price = -Math.abs(price) * 0.3;
        data.push(Math.round(price * 100) / 100);
      }
      break;

    case 'temperature':
      // Generate temperature data around 20°C
      for (let i = 0; i < dataPoints; i++) {
        const temp = 20 + Math.sin(i * 0.2) * 5 + (Math.random() - 0.5) * 2;
        data.push(Math.round(temp * 10) / 10);
      }
      break;

    case 'random':
    default:
      // Generate random data with some extreme values
      for (let i = 0; i < dataPoints; i++) {
        let value = (Math.random() - 0.5) * 100;
        // Occasionally add extreme values
        if (Math.random() < 0.05) {
          value = Math.random() > 0.5 ? 200 : -50;
        }
        data.push(Math.round(value * 100) / 100);
      }
      break;
  }

  return data;
}

async function cleanup() {
  // Cleanup advanced chart scene - nothing special needed
  logger.debug(`🧹 [ADVANCED_CHART] Scene cleaned up`);
}

const wantsLoop = false;
const description =
  'Advanced charting scene with customizable data visualization. Supports power pricing, temperature monitoring, and random data demos. Features dynamic scaling, configurable update intervals, and professional styling. Accepts MQTT payloads for real-time data updates and mode switching. Perfect for displaying time-series data with smooth animations and clear visual hierarchy.';
const category = 'Data';

module.exports = {
  name: SCENE_NAME,
  render,
  init,
  cleanup,
  wantsLoop,
  description,
  category,
};
