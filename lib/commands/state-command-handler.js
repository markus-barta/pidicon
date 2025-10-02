/**
 * @fileoverview StateCommandHandler - Handles state update commands
 * @description Processes MQTT state/upd commands to render scenes with payloads.
 * This is the main command for triggering scene rendering with data.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const CommandHandler = require('./command-handler');
const { ValidationError } = require('../errors');

/**
 * Handles state update MQTT commands
 * @extends CommandHandler
 */
class StateCommandHandler extends CommandHandler {
  /**
   * Create a StateCommandHandler
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.mqttService - MQTT service
   * @param {Object} dependencies.sceneManager - Scene manager instance
   * @param {Function} dependencies.getContext - Function to create render context
   * @param {Function} dependencies.publishMetrics - Function to publish metrics
   * @param {Object} dependencies.deviceDefaults - Map of device defaults
   * @param {Object} dependencies.lastState - Map of last state per device
   */
  constructor({
    logger,
    mqttService,
    sceneManager,
    getContext,
    publishMetrics,
    deviceDefaults,
    lastState,
  }) {
    super({ logger, mqttService });

    if (!sceneManager) {
      throw new ValidationError('sceneManager is required');
    }
    if (!getContext) {
      throw new ValidationError('getContext function is required');
    }
    if (!publishMetrics) {
      throw new ValidationError('publishMetrics function is required');
    }
    if (!deviceDefaults) {
      throw new ValidationError('deviceDefaults is required');
    }
    if (!lastState) {
      throw new ValidationError('lastState is required');
    }

    this.sceneManager = sceneManager;
    this.getContext = getContext;
    this.publishMetrics = publishMetrics;
    this.deviceDefaults = deviceDefaults;
    this.lastState = lastState;
  }

  /**
   * Handle state update command
   * @param {string} deviceIp - Device IP address
   * @param {string} action - Action ('upd')
   * @param {Object} payload - State payload
   * @returns {Promise<void>}
   */
  async handle(deviceIp, action, payload) {
    if (action === 'upd') {
      await this._handleUpdate(deviceIp, payload);
    } else {
      this.logger.warn(`Unknown state action: ${action}`);
    }
  }

  /**
   * Handle state/upd command
   * @param {string} deviceIp - Device IP address
   * @param {Object} payload - State payload
   * @returns {Promise<void>}
   * @private
   */
  async _handleUpdate(deviceIp, payload) {
    try {
      // Determine scene name (from payload or device default)
      const sceneName =
        payload?.scene || this.deviceDefaults.get(deviceIp) || 'empty';

      // Store last state
      this.lastState[deviceIp] = { payload, sceneName };

      // Check if scene exists
      if (!this.sceneManager.hasScene(sceneName)) {
        throw new Error(`Scene not registered: ${sceneName}`);
      }

      // Create render context
      const ctx = this.getContext(deviceIp, sceneName, payload, (ip, msg) =>
        this.mqttService.publish(`pixoo/${ip}/ok`, msg),
      );

      // Render scene
      await this.sceneManager.renderActiveScene(ctx);

      // Publish metrics
      this.publishMetrics(deviceIp);
    } catch (error) {
      this.logger.error(`State update failed for ${deviceIp}:`, {
        error: error.message,
        scene: payload?.scene,
      });

      this._publishError(deviceIp, error.message, {
        scene: payload?.scene || 'unknown',
      });

      // Still publish metrics even on error
      this.publishMetrics(deviceIp);
    }
  }
}

module.exports = StateCommandHandler;
