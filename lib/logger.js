/**
 * @fileoverview A simple logger module that wraps console logging.
 * @description This module provides a simple logger that can be used throughout the
 * application. It is designed to be easily replaceable with a more robust logging
 * library like pino or winston in the future.
 * @version 1.0.0
 * @author Sonic + Cursor + Markus Barta (mba)
 * @license MIT
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Default to 'info' if not specified
let currentLogLevel =
  LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;

let outputOverride = null;

/**
 * Logs a message with a given level.
 * @param {string} level - The log level (e.g., 'info', 'warn', 'error').
 * @param {string} message - The message to log.
 * @param {Object} [meta] - Optional metadata to include with the log.
 */
function log(level, message, meta) {
  currentLogLevel =
    LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;
  if (LOG_LEVELS[level] <= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const logObject = {
      timestamp,
      level,
      message,
      meta,
    };

    if (outputOverride) {
      outputOverride(logObject);
      return;
    }

    // Use console for output, which can be configured for different environments
    // (e.g., console.error for 'error' level).
    const output = JSON.stringify(logObject, null, 2);

    console[level](output);
  }
}

const logger = {
  /**
   * Logs an info message.
   * @param {string} message - The message to log.
   * @param {Object} [meta] - Optional metadata.
   */
  info: (message, meta = {}) => log('info', message, meta),

  /**
   * Logs a warning message.
   * @param {string} message - The message to log.
   * @param {Object} [meta] - Optional metadata.
   */
  warn: (message, meta = {}) => log('warn', message, meta),

  /**
   * Logs an error message.
   * @param {string} message - The message to log.
   * @param {Object} [meta] - Optional metadata.
   */
  error: (message, meta = {}) => log('error', message, meta),

  /**
   * Logs a debug message.
   * @param {string} message - The message to log.
   * @param {Object} [meta] - Optional metadata.
   */
  debug: (message, meta = {}) => log('debug', message, meta),

  /**
   * Sets a function to override the default console output.
   * @param {Function|null} outputFn - The function to call with the log object.
   */
  setOutput: (outputFn) => {
    outputOverride = outputFn;
  },
};

module.exports = logger;
