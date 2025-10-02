/**
 * @fileoverview Base CommandHandler class for MQTT command processing
 * @description Provides a base class for implementing command handlers using
 * the Command pattern. Each handler processes a specific type of MQTT command
 * (scene, driver, reset, state) with consistent validation and error handling.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const { ValidationError } = require('../errors');

/**
 * Base class for command handlers
 * Implements the Command pattern for MQTT message processing
 * @abstract
 */
class CommandHandler {
  /**
   * Create a CommandHandler
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.mqttService - MQTT service for publishing responses
   */
  constructor({ logger, mqttService }) {
    if (!logger) {
      throw new ValidationError('Logger is required');
    }
    if (!mqttService) {
      throw new ValidationError('MqttService is required');
    }

    this.logger = logger;
    this.mqttService = mqttService;
  }

  /**
   * Handle a command
   * @param {string} deviceIp - Device IP address
   * @param {string} action - Action to perform (e.g., 'set', 'get')
   * @param {Object} payload - Command payload
   * @returns {Promise<void>}
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars
  async handle(deviceIp, action, payload) {
    throw new Error('handle() must be implemented by subclass');
  }

  /**
   * Validate required fields in payload
   * @param {Object} payload - Payload to validate
   * @param {string[]} requiredFields - List of required field names
   * @throws {ValidationError} If validation fails
   * @protected
   */
  _validatePayload(payload, requiredFields) {
    if (!payload || typeof payload !== 'object') {
      throw new ValidationError('Payload must be an object');
    }

    for (const field of requiredFields) {
      if (!(field in payload)) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Publish response to MQTT
   * @param {string} deviceIp - Device IP address
   * @param {string} topic - Topic suffix (e.g., 'scene', 'driver')
   * @param {Object} data - Data to publish
   * @protected
   */
  _publishResponse(deviceIp, topic, data) {
    const fullTopic = `pixoo/${deviceIp}/${topic}`;
    const payload = {
      ...data,
      ts: Date.now(),
    };
    this.mqttService.publish(fullTopic, payload);
  }

  /**
   * Publish error to MQTT
   * @param {string} deviceIp - Device IP address
   * @param {string} errorMessage - Error message
   * @param {Object} [context] - Additional error context
   * @protected
   */
  _publishError(deviceIp, errorMessage, context = {}) {
    this._publishResponse(deviceIp, 'error', {
      error: errorMessage,
      ...context,
    });
  }

  /**
   * Get command name (for logging)
   * @returns {string} Command name
   * @protected
   */
  _getCommandName() {
    return this.constructor.name.replace('CommandHandler', '').toLowerCase();
  }
}

module.exports = CommandHandler;
