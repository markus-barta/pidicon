/**
 * @fileoverview DriverCommandHandler - Handles driver switching commands
 * @description Processes MQTT commands for changing the device driver (real/mock).
 * When a driver/set command is received, it switches the driver and optionally
 * re-renders the current scene with the new driver.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const CommandHandler = require('./command-handler');
const { ValidationError } = require('../errors');

/**
 * Handles driver-related MQTT commands
 * @extends CommandHandler
 */
class DriverCommandHandler extends CommandHandler {
  /**
   * Create a DriverCommandHandler
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.mqttService - MQTT service
   * @param {Function} dependencies.setDriverForDevice - Function to set driver for device
   * @param {Object} dependencies.lastState - Map of device IP to last state
   * @param {Object} dependencies.sceneManager - Scene manager instance
   * @param {Function} dependencies.getContext - Function to create render context
   * @param {Function} dependencies.publishMetrics - Function to publish metrics
   */
  constructor({
    logger,
    mqttService,
    setDriverForDevice,
    lastState,
    sceneManager,
    getContext,
    publishMetrics,
  }) {
    super({ logger, mqttService });

    if (!setDriverForDevice) {
      throw new ValidationError('setDriverForDevice function is required');
    }
    if (!lastState) {
      throw new ValidationError('lastState is required');
    }
    if (!sceneManager) {
      throw new ValidationError('sceneManager is required');
    }
    if (!getContext) {
      throw new ValidationError('getContext function is required');
    }
    if (!publishMetrics) {
      throw new ValidationError('publishMetrics function is required');
    }

    this.setDriverForDevice = setDriverForDevice;
    this.lastState = lastState;
    this.sceneManager = sceneManager;
    this.getContext = getContext;
    this.publishMetrics = publishMetrics;
  }

  /**
   * Handle driver command
   * @param {string} deviceIp - Device IP address
   * @param {string} action - Action ('set')
   * @param {Object} payload - Command payload with 'driver' field
   * @returns {Promise<void>}
   */
  async handle(deviceIp, action, payload) {
    if (action === 'set') {
      await this._handleSet(deviceIp, payload);
    } else {
      this.logger.warn(`Unknown driver action: ${action}`);
    }
  }

  /**
   * Handle driver/set command
   * @param {string} deviceIp - Device IP address
   * @param {Object} payload - Payload with 'driver' field
   * @returns {Promise<void>}
   * @private
   */
  async _handleSet(deviceIp, payload) {
    try {
      // Validate payload
      this._validatePayload(payload, ['driver']);

      const requestedDriver = payload.driver;

      // Set driver for device
      const appliedDriver = this.setDriverForDevice(deviceIp, requestedDriver);

      this.logger.ok(`Driver for ${deviceIp} set → ${appliedDriver}`);

      // Publish response
      this._publishResponse(deviceIp, 'driver', {
        driver: appliedDriver,
      });

      // Re-render with last known state if available
      await this._reRenderWithNewDriver(deviceIp);
    } catch (error) {
      this.logger.error(`Driver command failed for ${deviceIp}:`, {
        error: error.message,
      });

      if (error instanceof ValidationError) {
        this.logger.warn(`driver/set for ${deviceIp} missing 'driver'`);
      }
    }
  }

  /**
   * Re-render current scene with new driver
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<void>}
   * @private
   */
  async _reRenderWithNewDriver(deviceIp) {
    const prev = this.lastState[deviceIp];
    if (!prev || !prev.payload) {
      return; // No previous state to re-render
    }

    try {
      const sceneName = prev.sceneName || 'empty';

      if (!this.sceneManager.hasScene(sceneName)) {
        this.logger.warn(`Scene ${sceneName} not found for re-render`);
        return;
      }

      // Create context and render
      const ctx = this.getContext(
        deviceIp,
        sceneName,
        prev.payload,
        (ip, msg) => this.mqttService.publish(`pixoo/${ip}/ok`, msg),
      );

      await this.sceneManager.renderActiveScene(ctx);
      this.publishMetrics(deviceIp);
    } catch (err) {
      this.logger.error(`Re-render after driver switch failed:`, {
        error: err.message,
        deviceIp,
      });

      this._publishError(deviceIp, err.message, {
        context: 're-render after driver switch',
      });

      this.publishMetrics(deviceIp);
    }
  }
}

module.exports = DriverCommandHandler;
