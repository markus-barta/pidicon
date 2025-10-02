/**
 * @fileoverview SceneCommandHandler - Handles scene switching commands
 * @description Processes MQTT commands for setting default scenes per device.
 * When a scene/set command is received, it updates the device's default scene
 * and publishes the change to MQTT.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const CommandHandler = require('./command-handler');
const { ValidationError } = require('../errors');

/**
 * Handles scene-related MQTT commands
 * @extends CommandHandler
 */
class SceneCommandHandler extends CommandHandler {
  /**
   * Create a SceneCommandHandler
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.mqttService - MQTT service
   * @param {Map} dependencies.deviceDefaults - Map of device IP to default scene name
   */
  constructor({ logger, mqttService, deviceDefaults }) {
    super({ logger, mqttService });

    if (!deviceDefaults) {
      throw new ValidationError('deviceDefaults Map is required');
    }

    this.deviceDefaults = deviceDefaults;
  }

  /**
   * Handle scene command
   * @param {string} deviceIp - Device IP address
   * @param {string} action - Action ('set')
   * @param {Object} payload - Command payload with 'name' field
   * @returns {Promise<void>}
   */
  async handle(deviceIp, action, payload) {
    if (action === 'set') {
      await this._handleSet(deviceIp, payload);
    } else {
      this.logger.warn(`Unknown scene action: ${action}`);
    }
  }

  /**
   * Handle scene/set command
   * @param {string} deviceIp - Device IP address
   * @param {Object} payload - Payload with 'name' field
   * @returns {Promise<void>}
   * @private
   */
  async _handleSet(deviceIp, payload) {
    try {
      // Validate payload
      this._validatePayload(payload, ['name']);

      const sceneName = payload.name;

      // Update default scene for device
      this.deviceDefaults.set(deviceIp, sceneName);

      this.logger.ok(`Default scene for ${deviceIp} → '${sceneName}'`);

      // Publish response
      this._publishResponse(deviceIp, 'scene', {
        default: sceneName,
      });
    } catch (error) {
      this.logger.error(`Scene command failed for ${deviceIp}:`, {
        error: error.message,
      });

      if (error instanceof ValidationError) {
        this.logger.warn(`scene/set for ${deviceIp} missing 'name'`);
      }
    }
  }
}

module.exports = SceneCommandHandler;
