/**
 * @fileoverview Performance Utilities
 * @description Provides utility functions for performance monitoring and
 * benchmarking. This module is used by performance-related scenes to measure
 * and display rendering metrics.
 * @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)
 * @license MIT
 */

const logger = require('./logger');

/**
 * Common chart configuration constants used across performance test scenes
 * @readonly
 * @enum {Object}
 */
const CHART_CONFIG = Object.freeze({
  // Layout
  START_Y: 50,
  RANGE_HEIGHT: 20,
  CHART_START_X: 1,

  // Performance Scaling
  MIN_FRAMETIME: 1,
  MAX_FRAMETIME: 500,

  // Visual Configuration
  AXIS_COLOR: [64, 64, 64, 191],
  TEXT_COLOR_HEADER: [255, 255, 255, 255],
  TEXT_COLOR_STATS: [128, 128, 128, 255],
  BG_COLOR: [0, 0, 0, 255],

  // Performance Limits - calculated to fit within screen bounds
  // Screen: 64px, Margins: 2px left + 2px right = 60px available
  // Each point: 2px (1px bar + 1px spacing), so max 30 points
  MAX_CHART_POINTS: Math.floor((64 - 4) / 2),
  MAX_FRAME_SAMPLES: 50,
  UPDATE_INTERVAL_MS: 100,

  // Timing Configuration
  TEST_TIMEOUT_MS: 60000,
  MQTT_TIMEOUT_MS: 5000,
  MIN_DELAY_MS: 50,
  MAX_DELAY_MS: 2000,
});

/**
 * Performance color cache for optimal rendering
 * @type {Map<number, number[]>}
 */
const COLOR_CACHE = new Map();

/**
 * Calculates performance-based colors with intelligent caching
 * Enhanced version with better caching and error handling
 * @param {number} frametime - Frame time in milliseconds
 * @returns {number[]} RGBA color array [r, g, b, a]
 * @throws {Error} If frametime is invalid
 */
function getPerformanceColor(frametime) {
  if (typeof frametime !== 'number' || frametime < 0) {
    throw new Error(`Invalid frametime: ${frametime}`);
  }

  const cacheKey = Math.round(frametime);
  let color = COLOR_CACHE.get(cacheKey);

  if (color) {
    return color;
  }

  const normalized = Math.min(
    CHART_CONFIG.MAX_FRAMETIME,
    Math.max(CHART_CONFIG.MIN_FRAMETIME, frametime),
  );
  const ratio =
    (normalized - CHART_CONFIG.MIN_FRAMETIME) /
    (CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);

  // Optimized color gradient calculation with pre-computed values
  if (ratio < 0.25) {
    const blend = ratio * 4;
    color = [0, Math.round(255 * blend), Math.round(255 * (1 - blend)), 191];
  } else if (ratio < 0.5) {
    const blend = (ratio - 0.25) * 4;
    color = [Math.round(255 * blend), 255, 0, 191];
  } else if (ratio < 0.75) {
    const blend = (ratio - 0.5) * 4;
    color = [255, Math.round(255 * (1 - blend * 0.35)), 0, 191];
  } else {
    const blend = (ratio - 0.75) * 4;
    color = [255, Math.round(165 * (1 - blend)), 0, 191];
  }

  COLOR_CACHE.set(cacheKey, color);
  return color;
}

/**
 * Simple performance color function (legacy version from v2)
 * @param {number} frametime - Frame time in milliseconds
 * @returns {number[]} RGBA color array [r, g, b, a]
 */
function getSimplePerformanceColor(frametime) {
  const ratio =
    (frametime - CHART_CONFIG.MIN_FRAMETIME) /
    (CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);

  if (ratio <= 0.2) {
    // Blue to blue-green (0-100ms)
    return [0, Math.round(255 * (ratio / 0.2)), Math.round(255 * ratio), 255];
  } else if (ratio <= 0.4) {
    // Blue-green to green (100-200ms)
    const subRatio = (ratio - 0.2) / 0.2;
    return [0, 255, Math.round(128 + 127 * subRatio), 255];
  } else if (ratio <= 0.6) {
    // Green to yellow-green (200-300ms)
    const subRatio = (ratio - 0.4) / 0.2;
    return [
      Math.round(255 * subRatio),
      255,
      Math.round(255 * (1 - subRatio)),
      255,
    ];
  } else if (ratio <= 0.8) {
    // Yellow to orange (300-400ms)
    const subRatio = (ratio - 0.6) / 0.2;
    return [255, Math.round(255 * (1 - subRatio)), 0, 255];
  } else {
    // Orange to red (400-500ms+)
    const subRatio = Math.min(1, (ratio - 0.8) / 0.2);
    return [255, Math.round(128 * (1 - subRatio)), 0, 255];
  }
}

/**
 * Validates color array format
 * @param {any} color - Color value to validate
 * @returns {boolean} True if valid RGBA array
 */
function isValidColor(color) {
  return (
    Array.isArray(color) &&
    color.length === 4 &&
    color.every((c) => typeof c === 'number' && c >= 0 && c <= 255)
  );
}

/**
 * Creates a standardized scene context validator
 * @param {Object} ctx - Scene render context
 * @param {string} sceneName - Name of the scene for error messages
 * @returns {boolean} True if context is valid
 */
function validateSceneContext(ctx, sceneName) {
  const required = ['device', 'state'];
  const missing = required.filter((prop) => !ctx[prop]);

  if (missing.length > 0) {
    logger.error(
      `❌ [${sceneName.toUpperCase()}] Missing required context properties: ${missing.join(', ')}`,
    );
    return false;
  }

  return true;
}

/**
 * Formats performance metrics for display
 * @param {Object} metrics - Performance metrics object
 * @returns {Object} Formatted metrics
 */
function formatPerformanceMetrics(metrics) {
  return {
    fps: Math.round(metrics.fps),
    avgFrametime: Math.round(metrics.avgFrametime),
    minFrametime: Math.round(metrics.minFrametime),
    maxFrametime: Math.round(metrics.maxFrametime),
    sampleCount: metrics.sampleCount,
  };
}

module.exports = {
  CHART_CONFIG,
  COLOR_CACHE,
  getPerformanceColor,
  getSimplePerformanceColor,
  isValidColor,
  validateSceneContext,
  formatPerformanceMetrics,
};
