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
   * @param {Object} dependencies.stateStore - StateStore instance
   * @param {Function} dependencies.softReset - Soft reset function
   * @param {Object} dependencies.deviceConfigStore - Device config store (optional)
   */
  constructor({
    logger,
    deviceAdapter,
    sceneManager,
    stateStore,
    softReset,
    deviceConfigStore,
  }) {
    if (!logger) {
      throw new ValidationError('logger is required');
    }
    if (!deviceAdapter) {
      throw new ValidationError('deviceAdapter is required');
    }
    if (!sceneManager) {
      throw new ValidationError('sceneManager is required');
    }
    if (!stateStore) {
      throw new ValidationError('stateStore is required');
    }
    if (!softReset) {
      throw new ValidationError('softReset function is required');
    }

    this.logger = logger;
    this.stateStore = stateStore;
    this.deviceAdapter = deviceAdapter;
    this.sceneManager = sceneManager;
    this.softReset = softReset;
    this.deviceConfigStore = deviceConfigStore; // Optional - for device metadata

    // Hardware state now tracked in StateStore for persistence
    // (brightness, displayOn) - no separate Map needed
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
      const sceneInternalState =
        this.sceneManager.getSceneInternalState(deviceIp);

      // DEBUG: Log internal state
      if (
        sceneInternalState.testCompleted ||
        sceneInternalState.isRunning === false
      ) {
        this.logger.info(`[DEBUG] Scene internal state for ${deviceIp}:`, {
          testCompleted: sceneInternalState.testCompleted,
          isRunning: sceneInternalState.isRunning,
          framesRendered: sceneInternalState.framesRendered,
        });
      }

      // Get hardware state from StateStore (UI-508)
      const hardwareState = {
        brightness: this.stateStore.getDeviceState(deviceIp, 'brightness', 100),
        displayOn: this.stateStore.getDeviceState(deviceIp, 'displayOn', true),
      };

      // Get device-specific hardware info (e.g., battery for Awtrix)
      let deviceHardwareInfo = {};
      if (device.impl && typeof device.impl.getHardwareInfo === 'function') {
        try {
          deviceHardwareInfo = await device.impl.getHardwareInfo();
        } catch (error) {
          this.logger.debug(
            `Failed to get hardware info for ${deviceIp}: ${error.message}`,
          );
        }
      }

      // Get device config (name, type, etc.)
      const deviceConfig = this.deviceConfigStore?.getDevice(deviceIp);

      return {
        ip: deviceIp,
        name: deviceConfig?.name || null,
        deviceType: deviceConfig?.deviceType || 'unknown',
        driver,
        currentScene: sceneState.currentScene || null,
        status: sceneState.status || 'idle',
        playState: sceneState.playState || 'stopped',
        generationId: sceneState.generationId || 0,
        metrics: {
          pushes: metrics.pushes || 0,
          skipped: metrics.skipped || 0,
          errors: metrics.errors || 0,
          lastFrametime: metrics.lastFrametime || 0,
          lastSeenTs: metrics.lastSeenTs || null, // For "Last Seen" tracking
        },
        sceneState: {
          testCompleted: sceneInternalState.testCompleted || false,
          isRunning: sceneInternalState.isRunning !== false, // default to true
          framesRendered: sceneInternalState.framesRendered || 0,
        },
        hardware: {
          brightness: hardwareState.brightness,
          displayOn: hardwareState.displayOn,
          ...deviceHardwareInfo, // Add device-specific info (e.g., batteryLevel for Awtrix)
        },
        config: deviceConfig
          ? {
              startupScene: deviceConfig.startupScene,
              brightness: deviceConfig.brightness,
              watchdog: deviceConfig.watchdog,
            }
          : null,
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
        playState: 'stopped',
        generationId: 0,
        metrics: { pushes: 0, skipped: 0, errors: 0, lastFrametime: 0 },
        sceneState: {
          testCompleted: false,
          isRunning: true,
          framesRendered: 0,
        },
        hardware: {
          brightness: 100,
          displayOn: true,
        },
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
      // Check if device is in mock mode
      const driver = this.deviceAdapter.getDriverForDevice(deviceIp);

      if (driver === 'mock') {
        this.logger.warn(
          `[MOCK MODE] ⛔ Display Power Command NOT SENT - Would turn display ${on ? 'ON' : 'OFF'} for ${deviceIp}`,
        );
      } else {
        // Use proper Channel/OnOffScreen API
        // OnOff: 1 = on, 0 = off
        const { httpPost } = require('../pixoo-http');
        await httpPost(deviceIp, {
          Command: 'Channel/OnOffScreen',
          OnOff: on ? 1 : 0,
        });

        this.logger.ok(`Turned display ${on ? 'ON' : 'OFF'} for ${deviceIp}`);
      }

      // Track hardware state in StateStore for persistence (UI-508)
      this.stateStore.setDeviceState(deviceIp, 'displayOn', on);

      return {
        success: true,
        deviceIp,
        displayOn: on,
        message: `Display turned ${on ? 'ON' : 'OFF'}${driver === 'mock' ? ' (mock mode)' : ''}`,
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

      // Check if device is in mock mode
      const driver = this.deviceAdapter.getDriverForDevice(deviceIp);

      if (driver === 'mock') {
        this.logger.warn(
          `[MOCK MODE] ⛔ Brightness Command NOT SENT - Would set brightness to ${brightnessValue}% for ${deviceIp}`,
        );
      } else {
        // Get device instance and use driver's setBrightness method (device-type-aware)
        const device = this.deviceAdapter.getDevice(deviceIp);
        const result = await device.impl.setBrightness(brightnessValue);

        if (!result) {
          throw new Error('Device did not accept brightness command');
        }

        this.logger.ok(`Set brightness to ${brightnessValue}% for ${deviceIp}`);
      }

      // Track hardware state in StateStore for persistence (UI-508)
      this.stateStore.setDeviceState(deviceIp, 'brightness', brightnessValue);

      return {
        success: true,
        deviceIp,
        brightness: brightnessValue,
        message: `Brightness set to ${brightnessValue}%${driver === 'mock' ? ' (mock mode)' : ''}`,
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
      // Check if device is in mock mode
      const driver = this.deviceAdapter.getDriverForDevice(deviceIp);

      if (driver === 'mock') {
        this.logger.warn(
          `[MOCK MODE] ⛔ Reset Command NOT SENT - Would reset device ${deviceIp} (showing init screen)`,
        );
      } else {
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
      }

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
        message: `Device reset successfully${driver === 'mock' ? ' (mock mode)' : ''}`,
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
   * Set logging level for a specific device
   * @param {string} deviceIp - Device IP address
   * @param {string} level - Log level: 'debug', 'info', 'warning', 'error', or 'silent'
   * @returns {Promise<Object>} Result
   */
  async setDeviceLogging(deviceIp, level) {
    try {
      const validLevels = ['debug', 'info', 'warning', 'error', 'silent'];
      if (!validLevels.includes(level)) {
        throw new ValidationError(
          `Invalid log level: ${level}. Must be one of: ${validLevels.join(', ')}`,
        );
      }

      // Store logging level in state store
      this.stateStore.setDeviceState(deviceIp, '__logging_level', level);

      const levelDescriptions = {
        debug: 'all logs (debug, info, warning, error)',
        info: 'info, warning, and error logs',
        warning: 'warning and error logs only',
        error: 'error logs only',
        silent: 'no logging',
      };

      this.logger.ok(`Set ${levelDescriptions[level]} for ${deviceIp}`);

      return {
        success: true,
        deviceIp,
        loggingLevel: level,
        message: `Logging set to ${levelDescriptions[level]}`,
      };
    } catch (error) {
      this.logger.error(`Failed to set logging level for ${deviceIp}:`, {
        error: error.message,
        level,
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
      // FPS = 1000 / frametime_ms, rounded to 2 decimal places
      const frametime = metrics.lastFrametime || 0;
      const fps =
        frametime > 0 ? Math.round((1000 / frametime) * 100) / 100 : 0;

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

  /**
   * Register/activate a device from config
   * Called after adding or updating a device in the config store
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Result of device activation
   */
  async activateDevice(deviceIp) {
    try {
      const deviceConfig = this.deviceConfigStore?.getDevice(deviceIp);
      if (!deviceConfig) {
        throw new Error(`Device ${deviceIp} not found in config`);
      }

      this.logger.info(
        `🔌 [DEVICE] Activating device: ${deviceConfig.name} (${deviceIp})`,
      );

      // Register device in deviceDrivers map
      this.deviceAdapter.deviceDrivers.set(deviceIp, deviceConfig.driver);

      // Switch to configured driver (this will initialize the device)
      await this.switchDriver(deviceIp, deviceConfig.driver);

      // Set brightness if configured
      if (
        deviceConfig.brightness !== undefined &&
        deviceConfig.brightness !== null
      ) {
        try {
          await this.setBrightness(deviceIp, deviceConfig.brightness);
        } catch (error) {
          this.logger.warn(
            `Failed to set brightness for ${deviceIp}: ${error.message}`,
          );
        }
      }

      this.logger.ok(
        `✅ [DEVICE] Device activated: ${deviceConfig.name} (${deviceIp})`,
      );

      return {
        success: true,
        deviceIp,
        name: deviceConfig.name,
      };
    } catch (error) {
      this.logger.error(`Failed to activate device ${deviceIp}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Deactivate/unregister a device
   * Called after removing a device from config
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Result of device deactivation
   */
  async deactivateDevice(deviceIp) {
    try {
      this.logger.info(`🔌 [DEVICE] Deactivating device: ${deviceIp}`);

      // Remove from deviceDrivers map
      this.deviceAdapter.deviceDrivers.delete(deviceIp);

      // Clean up any running scenes
      const sceneState = this.sceneManager.getDeviceSceneState(deviceIp);
      if (sceneState.currentScene) {
        await this.sceneManager.stopScene(deviceIp);
      }

      this.logger.ok(`✅ [DEVICE] Device deactivated: ${deviceIp}`);

      return {
        success: true,
        deviceIp,
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate device ${deviceIp}:`, {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = DeviceService;
