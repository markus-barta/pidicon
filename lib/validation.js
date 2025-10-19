/**
 * @fileoverview Runtime validation utilities for input validation and type checking
 * @description Provides comprehensive validation functions for MQTT payloads, scene parameters, and context objects
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const { VALIDATION } = require('./constants');
const { ValidationError, ColorValidationError } = require('./errors');

/**
 * Validates if a value is a valid RGBA color array
 * @param {Array} color - Color array to validate
 * @returns {boolean} True if valid
 * @throws {ColorValidationError} If color format is invalid
 */
function validateColor(color) {
  if (!Array.isArray(color)) {
    throw new ColorValidationError(color, 'Must be an array');
  }

  if (color.length !== VALIDATION.REQUIRED_COLOR_CHANNELS) {
    throw new ColorValidationError(
      color,
      `Must have ${VALIDATION.REQUIRED_COLOR_CHANNELS} channels (RGBA)`,
    );
  }

  for (let i = 0; i < color.length; i++) {
    const channel = color[i];
    if (!Number.isInteger(channel)) {
      throw new ColorValidationError(color, `Channel ${i} must be an integer`);
    }

    if (
      channel < VALIDATION.MIN_COLOR_VALUE ||
      channel > VALIDATION.MAX_COLOR_VALUE
    ) {
      throw new ColorValidationError(
        color,
        `Channel ${i} must be between ${VALIDATION.MIN_COLOR_VALUE} and ${VALIDATION.MAX_COLOR_VALUE}`,
      );
    }
  }

  return true;
}

/**
 * Validates MQTT payload structure and required fields
 * @param {Object} payload - MQTT payload to validate
 * @param {string[]} requiredFields - Array of required field names
 * @param {string} context - Context description for error messages
 * @returns {boolean} True if valid
 * @throws {ValidationError} If payload is invalid
 */
function validatePayload(
  payload,
  requiredFields = [],
  context = 'MQTT payload',
) {
  if (payload === null || payload === undefined) {
    throw new ValidationError(
      `${context} cannot be null or undefined`,
      'payload',
    );
  }

  if (typeof payload !== 'object') {
    throw new ValidationError(`${context} must be an object`, 'payload', {
      receivedType: typeof payload,
    });
  }

  const missingFields = requiredFields.filter((field) => !(field in payload));

  if (missingFields.length > 0) {
    throw new ValidationError(
      `${context} missing required fields: ${missingFields.join(', ')}`,
      'payload',
      { missingFields },
    );
  }

  return true;
}

/**
 * Validates scene context object structure
 * @param {Object} context - Scene context to validate
 * @param {string} sceneName - Name of the scene being validated
 * @returns {boolean} True if valid
 * @throws {ValidationError} If context is invalid
 */
function validateSceneContext(context, sceneName) {
  if (!context) {
    throw new ValidationError(
      `Scene '${sceneName}' received null or undefined context`,
      'context',
    );
  }

  if (typeof context !== 'object') {
    throw new ValidationError(
      `Scene '${sceneName}' context must be an object`,
      'context',
      { receivedType: typeof context },
    );
  }

  // Check required properties
  const requiredProps = ['device', 'publishOk', 'state'];
  const missingProps = requiredProps.filter((prop) => !(prop in context));

  if (missingProps.length > 0) {
    throw new ValidationError(
      `Scene '${sceneName}' context missing required properties: ${missingProps.join(', ')}`,
      'context',
      { missingProps },
    );
  }

  // Validate device object
  if (typeof context.device !== 'object' || context.device === null) {
    throw new ValidationError(
      `Scene '${sceneName}' context.device must be a valid object`,
      'device',
    );
  }

  // Validate publishOk function
  if (typeof context.publishOk !== 'function') {
    throw new ValidationError(
      `Scene '${sceneName}' context.publishOk must be a function`,
      'publishOk',
    );
  }

  // Validate state (should be a Map)
  if (!(context.state instanceof Map)) {
    throw new ValidationError(
      `Scene '${sceneName}' context.state must be a Map`,
      'state',
      { receivedType: typeof context.state },
    );
  }

  return true;
}

/**
 * Validates numeric range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Name of the field being validated
 * @returns {boolean} True if valid
 * @throws {ValidationError} If value is out of range
 */
function validateRange(value, min, max, fieldName = 'value') {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(
      `${fieldName} must be a valid number`,
      fieldName,
      { value, expectedType: 'number' },
    );
  }

  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}, got ${value}`,
      fieldName,
      { value, min, max },
    );
  }

  return true;
}

/**
 * Validates string length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Name of the field being validated
 * @returns {boolean} True if valid
 * @throws {ValidationError} If string length is invalid
 */
function validateStringLength(
  value,
  minLength,
  maxLength,
  fieldName = 'value',
) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, {
      value,
      expectedType: 'string',
    });
  }

  if (value.length < minLength || value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} length must be between ${minLength} and ${maxLength} characters`,
      fieldName,
      { value, length: value.length, minLength, maxLength },
    );
  }

  return true;
}

/**
 * Validates IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid
 * @throws {ValidationError} If IP address format is invalid
 */
function validateIpAddress(ip) {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  if (typeof ip !== 'string') {
    throw new ValidationError('IP address must be a string', 'ip', {
      value: ip,
      expectedType: 'string',
    });
  }

  if (!ipv4Regex.test(ip)) {
    throw new ValidationError(`Invalid IPv4 address format: ${ip}`, 'ip', {
      value: ip,
    });
  }

  return true;
}

/**
 * Validates scene module interface
 * @param {Object} sceneModule - Scene module to validate
 * @param {string} sceneName - Name of the scene being validated
 * @returns {boolean} True if valid
 * @throws {ValidationError} If scene module interface is invalid
 */
function validateSceneModule(sceneModule, sceneName) {
  if (!sceneModule || typeof sceneModule !== 'object') {
    throw new ValidationError(
      `Scene '${sceneName}' module must be an object`,
      'sceneModule',
      { sceneName },
    );
  }

  const requiredMethods = ['render'];
  const missingMethods = requiredMethods.filter(
    (method) => typeof sceneModule[method] !== 'function',
  );

  if (missingMethods.length > 0) {
    throw new ValidationError(
      `Scene '${sceneName}' missing required methods: ${missingMethods.join(', ')}`,
      'sceneModule',
      { sceneName, missingMethods },
    );
  }

  // Validate optional methods if present
  const optionalMethods = ['init', 'cleanup'];
  optionalMethods.forEach((method) => {
    if (sceneModule[method] && typeof sceneModule[method] !== 'function') {
      throw new ValidationError(
        `Scene '${sceneName}' method '${method}' must be a function if provided`,
        'sceneModule',
        { sceneName, method },
      );
    }
  });

  // Validate wantsLoop if present
  if (
    sceneModule.wantsLoop !== undefined &&
    typeof sceneModule.wantsLoop !== 'boolean'
  ) {
    throw new ValidationError(
      `Scene '${sceneName}' wantsLoop must be a boolean`,
      'sceneModule',
      { sceneName, wantsLoop: sceneModule.wantsLoop },
    );
  }

  // Validate name if present
  if (sceneModule.name && typeof sceneModule.name !== 'string') {
    throw new ValidationError(
      `Scene '${sceneName}' name must be a string`,
      'sceneModule',
      { sceneName, name: sceneModule.name },
    );
  }

  return true;
}

/**
 * Validates MQTT topic format
 * @param {string} topic - MQTT topic to validate
 * @param {string} expectedPattern - Expected pattern (e.g., 'pixoo/+/state/upd')
 * @returns {boolean} True if valid
 * @throws {ValidationError} If topic format is invalid
 */
function validateMqttTopic(topic, expectedPattern = null) {
  if (typeof topic !== 'string') {
    throw new ValidationError('MQTT topic must be a string', 'topic', {
      topic,
      expectedType: 'string',
    });
  }

  if (topic.length === 0) {
    throw new ValidationError('MQTT topic cannot be empty', 'topic');
  }

  // Basic MQTT topic validation (no wildcards in publish topics)
  if (topic.includes('+') || topic.includes('#')) {
    throw new ValidationError(
      'MQTT topic cannot contain wildcards (+ or #) for this operation',
      'topic',
      { topic },
    );
  }

  if (
    expectedPattern &&
    !topic.match(expectedPattern.replace(/\+/g, '[^/]+').replace(/#/g, '.*'))
  ) {
    throw new ValidationError(
      `MQTT topic does not match expected pattern: ${expectedPattern}`,
      'topic',
      { topic, expectedPattern },
    );
  }

  return true;
}

module.exports = {
  validateColor,
  validatePayload,
  validateSceneContext,
  validateRange,
  validateStringLength,
  validateIpAddress,
  validateSceneModule,
  validateMqttTopic,
};
