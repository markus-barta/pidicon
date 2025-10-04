/**
 * @fileoverview DeviceService - Business logic for device operations
 * @description Centralizes all device-related business logic, providing a clean
 * API for device management, display control, and device metrics.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const { ValidationError } = require('../errors');

/**
 * Service for device-related operations
 * Provides high-level API for device management
 */
class DeviceService {
  /**
   * Create a DeviceService
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.deviceAdapter - Device adapter for device operations
   * @param {Object} dependencies.sceneManager - SceneManager instance
   * @param {Function} dependencies.softReset - Soft reset function
   */
  constructor({ logger, deviceAdapter, sceneManager, softReset }) {
    if (!logger) {
      throw new ValidationError('logger is required');
    }
    if (!deviceAdapter) {
      throw new ValidationError('deviceAdapter is required');
    }
    if (!sceneManager) {
      throw new ValidationError('sceneManager is required');
    }
    if (!softReset) {
      throw new ValidationError('softReset function is required');
    }

    this.logger = logger;
    this.deviceAdapter = deviceAdapter;
    this.sceneManager = sceneManager;
    this.softReset = softReset;
  }

  /**
   * Get list of all configured devices
   * @returns {Promise<Array<Object>>} List of devices with status
   */
  async listDevices() {
    try {
      const devices = [];
      const deviceIps = Array.from(this.deviceAdapter.deviceDrivers.keys());

      for (const deviceIp of deviceIps) {
        const deviceInfo = await this.getDeviceInfo(deviceIp);
        devices.push(deviceInfo);
      }

      this.logger.debug(`Listed ${devices.length} devices`);
      return devices;
    } catch (error) {
      this.logger.error('Failed to list devices:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get information about a specific device
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Device information
   */
  async getDeviceInfo(deviceIp) {
    try {
      const driver = this.deviceAdapter.getDriverForDevice(deviceIp);
      const device = this.deviceAdapter.getDevice(deviceIp);
      const metrics = device.getMetrics();
      const sceneState = this.sceneManager.getDeviceSceneState(deviceIp);

      return {
        ip: deviceIp,
        driver,
        currentScene: sceneState.currentScene || 'none',
        status: sceneState.status || 'idle',
        generationId: sceneState.generationId || 0,
        metrics: {
          pushes: metrics.pushes || 0,
          skipped: metrics.skipped || 0,
          errors: metrics.errors || 0,
          lastFrametime: metrics.lastFrametime || 0,
        },
      };
    } catch (error) {
      this.logger.warn(`Failed to get device info for ${deviceIp}:`, {
        error: error.message,
      });

      return {
        ip: deviceIp,
        driver: 'unknown',
        currentScene: 'unknown',
        status: 'error',
        generationId: 0,
        metrics: { pushes: 0, skipped: 0, errors: 0, lastFrametime: 0 },
      };
    }
  }

  /**
   * Turn device display on or off
   * @param {string} deviceIp - Device IP address
   * @param {boolean} on - True to turn on, false to turn off
   * @returns {Promise<Object>} Result with success status
   */
  async setDisplayPower(deviceIp, on) {
    try {
      // Use proper Channel/OnOffScreen API
      // OnOff: 1 = on, 0 = off
      const { httpPost } = require('../pixoo-http');
      await httpPost(deviceIp, {
        Command: 'Channel/OnOffScreen',
        OnOff: on ? 1 : 0,
      });

      this.logger.ok(`Turned display ${on ? 'ON' : 'OFF'} for ${deviceIp}`);

      return {
        success: true,
        deviceIp,
        displayOn: on,
        message: `Display turned ${on ? 'ON' : 'OFF'}`,
      };
    } catch (error) {
      this.logger.error(`Failed to set display power for ${deviceIp}:`, {
        error: error.message,
        on,
      });
      throw error;
    }
  }

  /**
   * Set device display brightness
   * @param {string} deviceIp - Device IP address
   * @param {number} brightness - Brightness level (0-100)
   * @returns {Promise<Object>} Result with success status
   */
  async setDisplayBrightness(deviceIp, brightness) {
    try {
      // Validate brightness range
      const brightnessValue = Math.max(
        0,
        Math.min(100, Math.round(brightness)),
      );

      const { httpPost } = require('../pixoo-http');
      await httpPost(deviceIp, {
        Command: 'Channel/SetBrightness',
        Brightness: brightnessValue,
      });

      this.logger.ok(`Set brightness to ${brightnessValue}% for ${deviceIp}`);

      return {
        success: true,
        deviceIp,
        brightness: brightnessValue,
        message: `Brightness set to ${brightnessValue}%`,
      };
    } catch (error) {
      this.logger.error(`Failed to set brightness for ${deviceIp}:`, {
        error: error.message,
        brightness,
      });
      throw error;
    }
  }

  /**
   * Reset a device (channel/screen reset - shows init screen)
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Result with success status
   */
  async resetDevice(deviceIp) {
    try {
      this.logger.warn(`Resetting device ${deviceIp} (showing init screen)`);

      // Use Channel/SetIndex with SelectIndex 0 to show init/startup screen
      // This provides visual feedback that device was reset
      const { httpPost } = require('../pixoo-http');
      await httpPost(deviceIp, {
        Command: 'Channel/SetIndex',
        SelectIndex: 0,
      });

      // Wait a moment for init screen to display
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Switch back to custom channel (3) and re-render current scene
      await httpPost(deviceIp, {
        Command: 'Channel/SetIndex',
        SelectIndex: 3,
      });

      // Re-render current scene
      const sceneState = this.sceneManager.getDeviceSceneState(deviceIp);
      if (sceneState.currentScene && sceneState.currentScene !== 'none') {
        this.logger.info(`Re-rendering ${sceneState.currentScene} after reset`);
        const context = this.deviceAdapter.getContext(
          deviceIp,
          sceneState.currentScene,
          {},
        );
        await this.sceneManager.renderActiveScene(context);
      }

      this.logger.ok(`Device ${deviceIp} reset successfully`);

      return {
        success: true,
        deviceIp,
        message: 'Device reset successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to reset device ${deviceIp}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Switch device driver (real/mock)
   * @param {string} deviceIp - Device IP address
   * @param {string} driver - Driver name ('real' or 'mock')
   * @returns {Promise<Object>} Result with success status
   */
  async switchDriver(deviceIp, driver) {
    try {
      if (!['real', 'mock'].includes(driver)) {
        throw new ValidationError(
          `Invalid driver: ${driver}. Must be 'real' or 'mock'`,
        );
      }

      this.deviceAdapter.setDriverForDevice(deviceIp, driver);
      this.logger.ok(`Switched driver to '${driver}' for ${deviceIp}`);

      // Optionally re-render current scene with new driver
      const sceneState = this.sceneManager.getDeviceSceneState(deviceIp);
      if (sceneState.currentScene && sceneState.currentScene !== 'none') {
        this.logger.info(
          `Re-rendering ${sceneState.currentScene} with new driver`,
        );
        const context = this.deviceAdapter.getContext(
          deviceIp,
          sceneState.currentScene,
          {},
        );
        await this.sceneManager.renderActiveScene(context);
      }

      return {
        success: true,
        deviceIp,
        driver,
        message: `Switched to ${driver} driver`,
      };
    } catch (error) {
      this.logger.error(`Failed to switch driver for ${deviceIp}:`, {
        error: error.message,
        driver,
      });
      throw error;
    }
  }

  /**
   * Get device metrics with FPS calculation
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Device metrics
   */
  async getDeviceMetrics(deviceIp) {
    try {
      const device = this.deviceAdapter.getDevice(deviceIp);
      const metrics = device.getMetrics();

      // Calculate FPS from frametime (ms)
      // FPS = 1000 / frametime_ms
      const frametime = metrics.lastFrametime || 0;
      const fps = frametime > 0 ? Math.round(1000 / frametime) : 0;

      return {
        deviceIp,
        pushCount: metrics.pushes || 0, // Frontend expects pushCount
        frameCount: metrics.pushes || 0, // Alias for clarity
        skipped: metrics.skipped || 0,
        errorCount: metrics.errors || 0, // Frontend expects errorCount
        frametime: frametime, // Keep as ms
        fps: fps, // Calculated FPS
        ts: Date.now(),
      };
    } catch (error) {
      this.logger.warn(`Failed to get metrics for ${deviceIp}:`, {
        error: error.message,
      });

      return {
        deviceIp,
        pushCount: 0,
        frameCount: 0,
        skipped: 0,
        errorCount: 0,
        frametime: 0,
        fps: 0,
        ts: Date.now(),
      };
    }
  }
}

module.exports = DeviceService;
