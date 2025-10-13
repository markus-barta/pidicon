/**
 * @fileoverview Core Constants
 * @description Device-agnostic constants for PIDICON
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

/**
 * Core constants that apply across all device types
 */
const CORE_CONSTANTS = {
  // Frame rate
  DEFAULT_FPS: 5,
  MIN_FPS: 1,
  MAX_FPS: 30,

  // Brightness
  MIN_BRIGHTNESS: 0,
  MAX_BRIGHTNESS: 100,
  DEFAULT_BRIGHTNESS: 80,

  // Color
  COLOR_CHANNELS: 4, // RGBA
  MIN_COLOR_VALUE: 0,
  MAX_COLOR_VALUE: 255,

  // Timing
  DEFAULT_SCENE_TIMEOUT: 300000, // 5 minutes
  METRICS_UPDATE_INTERVAL: 1000, // 1 second

  // State
  MAX_SCENE_STATES: 100, // Maximum number of scene states to keep in memory
};

/**
 * Device type identifiers
 */
const DEVICE_TYPES = {
  PIXOO64: 'pixoo64',
  AWTRIX: 'awtrix',
  CUSTOM: 'custom',
};

/**
 * Driver types
 */
const DRIVER_TYPES = {
  REAL: 'real',
  MOCK: 'mock',
};

/**
 * Protocol types
 */
const PROTOCOL_TYPES = {
  HTTP: 'http',
  MQTT: 'mqtt',
  WEBSOCKET: 'websocket',
  CUSTOM: 'custom',
};

module.exports = {
  CORE_CONSTANTS,
  DEVICE_TYPES,
  DRIVER_TYPES,
  PROTOCOL_TYPES,
};
