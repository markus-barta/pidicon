/**
 * @fileoverview Application constants and configuration values
 * @description Centralized constants to improve maintainability and reduce magic numbers
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

/**
 * Device display specifications
 */
const DISPLAY = Object.freeze({
  WIDTH: 64,
  HEIGHT: 64,
  TOTAL_PIXELS: 64 * 64, // 4096
});

/**
 * MQTT topic patterns and defaults
 */
const MQTT = Object.freeze({
  TOPIC_BASE: 'pixoo',
  STATE_UPDATE_TOPIC: 'pixoo/+/state/upd',
  SCENE_SET_TOPIC: 'pixoo/+/scene/set',
  DRIVER_SET_TOPIC: 'pixoo/+/driver/set',
  RESET_TOPIC: 'pixoo/+/reset/set',
  METRICS_TOPIC: 'pixoo/+/metrics',
  OK_TOPIC: 'pixoo/+/ok',
  ERROR_TOPIC: 'pixoo/+/error',
  DRIVER_TOPIC: 'pixoo/+/driver',
  SCENE_TOPIC: 'pixoo/+/scene',
  RESET_RESPONSE_TOPIC: 'pixoo/+/reset',
});

/**
 * Scene state management
 */
const SCENE_STATE = Object.freeze({
  STATUS_SWITCHING: 'switching',
  STATUS_RUNNING: 'running',
  STATUS_STOPPING: 'stopping',
  DEFAULT_GENERATION_ID: 0,
});

/**
 * Performance and timing constants
 */
const TIMING = Object.freeze({
  DEFAULT_FRAME_INTERVAL: 150, // ms
  MIN_FRAME_INTERVAL: 16, // ~60fps
  MAX_FRAME_INTERVAL: 5000, // 5 seconds
  ADAPTIVE_MODE_DELAY: 0, // ms for immediate next frame
});

/**
 * Chart rendering constants
 */
const CHART = Object.freeze({
  DEFAULT_MAX_VALUE: 500, // ms for frametime charts
  DEFAULT_CHART_WIDTH: 64,
  DEFAULT_CHART_HEIGHT: 30,
  CHART_START_X: 0,
  CHART_END_X: 63,
  CHART_START_Y: 20,
  CHART_BOTTOM_Y: 50,
  GRID_LINES: 4,
});

/**
 * Text rendering constants
 */
const TEXT = Object.freeze({
  DEFAULT_FONT_HEIGHT: 5,
  DEFAULT_FONT_WIDTH: 4,
  MAX_TEXT_WIDTH: 64,
});

/**
 * Color constants for UI elements
 */
const COLORS = Object.freeze({
  // Status colors
  COLOR_SUCCESS: [0, 255, 0, 255], // Green
  COLOR_WARNING: [255, 255, 0, 255], // Yellow
  COLOR_ERROR: [255, 0, 0, 255], // Red
  COLOR_INFO: [0, 255, 255, 255], // Cyan

  // Background colors
  BACKGROUND_BLACK: [0, 0, 0, 255],
  BACKGROUND_WHITE: [255, 255, 255, 255],
  BACKGROUND_TRANSPARENT: [0, 0, 0, 0],

  // Alpha values
  ALPHA_OPAQUE: 255,
  ALPHA_SEMI: 178, // ~70%
  ALPHA_TRANSPARENT: 100,
});

/**
 * Validation constants
 */
const VALIDATION = Object.freeze({
  MAX_COLOR_VALUE: 255,
  MIN_COLOR_VALUE: 0,
  REQUIRED_COLOR_CHANNELS: 4, // RGBA
});

/**
 * Default configuration values
 */
const DEFAULTS = Object.freeze({
  DRIVER: 'mock',
  SCENE: 'empty',
  LOG_LEVEL: 'info',
  MQTT_HOST: 'localhost',
  MQTT_PORT: 1883,
  SCENE_STATE_TOPIC_BASE: '/home/pixoo',
});

/**
 * Error messages and codes
 */
const ERRORS = Object.freeze({
  SCENE_NOT_FOUND: 'Scene not found',
  INVALID_COLOR_FORMAT: 'Invalid color format',
  MISSING_CONTEXT_PROPERTY: 'Missing required context property',
  INVALID_SCENE_INTERFACE: 'Scene does not implement required interface',
  DEVICE_ERROR: 'Device communication error',
  MQTT_ERROR: 'MQTT communication error',
});

module.exports = {
  DISPLAY,
  MQTT,
  SCENE_STATE,
  TIMING,
  CHART,
  TEXT,
  COLORS,
  VALIDATION,
  DEFAULTS,
  ERRORS,
};
