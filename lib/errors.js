/**
 * @fileoverview Custom error types for consistent error handling
 * @description Provides standardized error classes with proper error codes and metadata
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const logger = require('./logger');

/**
 * Base error class for all application errors
 */
class PixooError extends Error {
  constructor(message, code, metadata = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to log-friendly object
   * @returns {Object} Error details for logging
   */
  toLogObject() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Log this error with appropriate level
   * @param {string} level - Log level ('error', 'warn', 'info')
   */
  log(level = 'error') {
    const logData = {
      error: this.message,
      code: this.code,
      ...this.metadata,
    };

    logger[level](`${this.name}: ${this.message}`, logData);
  }
}

/**
 * Scene-related errors
 */
class SceneError extends PixooError {
  constructor(message, sceneName, metadata = {}) {
    super(message, 'SCENE_ERROR', { sceneName, ...metadata });
  }
}

class SceneNotFoundError extends SceneError {
  constructor(sceneName) {
    super(`Scene '${sceneName}' not found`, sceneName);
  }
}

class SceneInterfaceError extends SceneError {
  constructor(sceneName, missingMethods) {
    super(
      `Scene '${sceneName}' missing required methods: ${missingMethods.join(', ')}`,
      sceneName,
      { missingMethods },
    );
  }
}

class SceneValidationError extends SceneError {
  constructor(sceneName, validationDetails) {
    super(`Scene '${sceneName}' failed validation`, sceneName, {
      validationDetails,
    });
  }
}

/**
 * Device-related errors
 */
class DeviceError extends PixooError {
  constructor(message, deviceIp, metadata = {}) {
    super(message, 'DEVICE_ERROR', { deviceIp, ...metadata });
  }
}

class DeviceCommunicationError extends DeviceError {
  constructor(deviceIp, originalError) {
    super(`Communication error with device ${deviceIp}`, deviceIp, {
      originalError: originalError?.message,
    });
  }
}

class DeviceTimeoutError extends DeviceError {
  constructor(deviceIp, timeoutMs) {
    super(
      `Device ${deviceIp} operation timed out after ${timeoutMs}ms`,
      deviceIp,
      {
        timeoutMs,
      },
    );
  }
}

/**
 * MQTT-related errors
 */
class MqttError extends PixooError {
  constructor(message, topic, metadata = {}) {
    super(message, 'MQTT_ERROR', { topic, ...metadata });
  }
}

class MqttConnectionError extends MqttError {
  constructor(brokerUrl) {
    super(`Failed to connect to MQTT broker: ${brokerUrl}`, null, {
      brokerUrl,
    });
  }
}

class MqttSubscriptionError extends MqttError {
  constructor(topics, originalError) {
    super(`Failed to subscribe to topics: ${topics.join(', ')}`, null, {
      topics,
      originalError: originalError?.message,
    });
  }
}

/**
 * Configuration-related errors
 */
class ConfigError extends PixooError {
  constructor(message, configKey, metadata = {}) {
    super(message, 'CONFIG_ERROR', { configKey, ...metadata });
  }
}

class MissingConfigError extends ConfigError {
  constructor(configKey) {
    super(`Required configuration missing: ${configKey}`, configKey);
  }
}

class InvalidConfigError extends ConfigError {
  constructor(configKey, value, reason) {
    super(`Invalid configuration for ${configKey}: ${reason}`, configKey, {
      value,
      reason,
    });
  }
}

/**
 * Validation errors
 */
class ValidationError extends PixooError {
  constructor(message, field, metadata = {}) {
    super(message, 'VALIDATION_ERROR', { field, ...metadata });
  }
}

class ColorValidationError extends ValidationError {
  constructor(color, reason) {
    super(`Invalid color format: ${reason}`, 'color', { color, reason });
  }
}

class PayloadValidationError extends ValidationError {
  constructor(payload, missingFields) {
    super(`Invalid MQTT payload: missing required fields`, 'payload', {
      payload,
      missingFields,
    });
  }
}

/**
 * Utility function to wrap errors with context
 * @param {Error} error - Original error
 * @param {string} context - Context description
 * @param {Object} metadata - Additional metadata
 * @returns {PixooError} Wrapped error
 */
function wrapError(error, context, metadata = {}) {
  const wrappedError = new PixooError(
    `${context}: ${error.message}`,
    'WRAPPED_ERROR',
    {
      originalError: error.message,
      originalStack: error.stack,
      ...metadata,
    },
  );

  return wrappedError;
}

/**
 * Utility function to handle async errors with logging
 * @param {Function} asyncFn - Async function that might throw
 * @param {string} context - Context for error logging
 * @param {Object} metadata - Additional metadata for logging
 * @returns {Promise} Promise that resolves to function result or throws wrapped error
 */
async function withErrorHandling(asyncFn, context, metadata = {}) {
  try {
    return await asyncFn();
  } catch (error) {
    const wrappedError = wrapError(error, context, metadata);
    wrappedError.log('error');
    throw wrappedError;
  }
}

module.exports = {
  PixooError,
  SceneError,
  SceneNotFoundError,
  SceneInterfaceError,
  SceneValidationError,
  DeviceError,
  DeviceCommunicationError,
  DeviceTimeoutError,
  MqttError,
  MqttConnectionError,
  MqttSubscriptionError,
  ConfigError,
  MissingConfigError,
  InvalidConfigError,
  ValidationError,
  ColorValidationError,
  PayloadValidationError,
  wrapError,
  withErrorHandling,
};
