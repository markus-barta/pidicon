/**
 * @fileoverview ResetCommandHandler - Handles device reset commands
 * @description Processes MQTT commands for soft-resetting devices.
 * A reset stops the current scene, clears the scheduler, and resets metrics.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const CommandHandler = require('./command-handler');
const { ValidationError } = require('../errors');

/**
 * Handles reset-related MQTT commands
 * @extends CommandHandler
 */
class ResetCommandHandler extends CommandHandler {
  /**
   * Create a ResetCommandHandler
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.mqttService - MQTT service
   * @param {Function} dependencies.softReset - Function to perform soft reset
   */
  constructor({ logger, mqttService, softReset }) {
    super({ logger, mqttService });

    if (!softReset) {
      throw new ValidationError('softReset function is required');
    }

    this.softReset = softReset;
  }

  /**
   * Handle reset command
   * @param {string} deviceIp - Device IP address
   * @param {string} action - Action ('set')
   * @param {Object} payload - Command payload (unused for reset)
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async handle(deviceIp, action, payload) {
    if (action === 'set') {
      await this._handleSet(deviceIp);
    } else {
      this.logger.warn(`Unknown reset action: ${action}`);
    }
  }

  /**
   * Handle reset/set command
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<void>}
   * @private
   */
  async _handleSet(deviceIp) {
    try {
      this.logger.warn(`Reset requested for ${deviceIp}`);

      // Perform soft reset
      const success = await this.softReset(deviceIp);

      // Publish response
      this._publishResponse(deviceIp, 'reset', {
        ok: success,
      });

      if (success) {
        this.logger.ok(`Device ${deviceIp} reset successfully`);
      } else {
        this.logger.warn(`Device ${deviceIp} reset failed`);
      }
    } catch (error) {
      this.logger.error(`Reset command failed for ${deviceIp}:`, {
        error: error.message,
      });

      this._publishError(deviceIp, error.message, {
        context: 'reset command',
      });
    }
  }
}

module.exports = ResetCommandHandler;
