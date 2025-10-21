/**
 * @fileoverview SceneService - Business logic for scene operations
 * @description Centralizes all scene-related business logic, providing a clean
 * API for switching scenes, listing scenes, and managing scene state. Used by
 * both MQTT handlers and Web UI to avoid code duplication.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

const { ValidationError } = require('../errors');

function normalizeScenePath(filePath, fallbackName) {
  const pathValue = filePath || `${fallbackName}.js`;
  return pathValue.replace(/\\/g, '/');
}

/**
 * Service for scene-related operations
 * Provides high-level API for scene management
 */
class SceneService {
  /**
   * Create a SceneService
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.sceneManager - SceneManager instance
   * @param {Object} dependencies.deviceAdapter - Device adapter for device operations
   * @param {Object} dependencies.mqttService - MQTT service for state publishing
   * @param {Object} dependencies.versionInfo - Version information
   * @param {Function} dependencies.publishOk - Callback for frame success metrics
   */
  constructor({
    logger,
    sceneManager,
    deviceAdapter,
    mqttService,
    versionInfo,
    publishOk,
  }) {
    if (!logger) {
      throw new ValidationError('logger is required');
    }
    if (!sceneManager) {
      throw new ValidationError('sceneManager is required');
    }
    if (!deviceAdapter) {
      throw new ValidationError('deviceAdapter is required');
    }
    if (!mqttService) {
      throw new ValidationError('mqttService is required');
    }
    if (!versionInfo) {
      throw new ValidationError('versionInfo is required');
    }

    this.logger = logger;
    this.sceneManager = sceneManager;
    this.deviceAdapter = deviceAdapter;
    this.mqttService = mqttService;
    this.versionInfo = versionInfo;
    this.publishOk = publishOk; // Store for getContext calls
  }

  /**
   * Switch to a different scene
   * @param {string} deviceIp - Device IP address
   * @param {string} sceneName - Name of scene to switch to
   * @param {Object} options - Switch options
   * @param {boolean} [options.clear=true] - Clear screen before switching
   * @param {Object} [options.payload] - Scene-specific payload
   * @returns {Promise<Object>} Result with success status
   */
  async switchToScene(deviceIp, sceneName, options = {}) {
    const { clear = true, payload = {} } = options;

    try {
      // Validate scene exists
      if (!this.sceneManager.hasScene(sceneName)) {
        throw new ValidationError(`Scene '${sceneName}' not found`);
      }

      this.logger.info(`Switching ${deviceIp} to scene: ${sceneName}`, {
        clear,
        hasPayload: Object.keys(payload).length > 0,
      });

      // Get device context (pass publishOk for WebSocket broadcasts)
      const context = this.deviceAdapter.getContext(
        deviceIp,
        sceneName,
        payload,
        this.publishOk,
      );

      // Clear screen if requested
      if (clear) {
        const device = this.deviceAdapter.getDevice(deviceIp);
        await device.clear();
        this.logger.ok(`Cleared screen for ${deviceIp}`);
      }

      // Publish "switching" state
      await this._publishSceneState(deviceIp, sceneName, 'switching');

      // Switch scene
      const success = await this.sceneManager.switchScene(sceneName, context);

      if (!success) {
        throw new Error(`Failed to switch to scene: ${sceneName}`);
      }

      // Publish "running" state
      await this._publishSceneState(deviceIp, sceneName, 'running');

      this.logger.ok(`Successfully switched ${deviceIp} to ${sceneName}`);

      return {
        success: true,
        deviceIp,
        sceneName,
        message: `Switched to ${sceneName}`,
      };
    } catch (error) {
      this.logger.error(`Failed to switch scene for ${deviceIp}:`, {
        error: error.message,
        sceneName,
      });

      // Publish error state
      await this._publishError(deviceIp, error.message, { sceneName });

      throw error;
    }
  }

  /**
   * Get list of all available scenes with metadata
   * @returns {Promise<Array<Object>>} List of scene objects with name, description, wantsLoop, filePath
   */
  async listScenes() {
    try {
      const sceneNames = this.sceneManager.getRegisteredScenes();
      const scenes = [];

      for (const sceneName of sceneNames) {
        const sceneModule = this.sceneManager.scenes.get(sceneName);
        const normalizedPath = normalizeScenePath(
          sceneModule.filePath,
          sceneName,
        );
        scenes.push({
          name: sceneName,
          description: sceneModule.description || `Scene: ${sceneName}`,
          wantsLoop: sceneModule.wantsLoop || false,
          category: sceneModule.category || 'General',
          metadata: sceneModule.metadata || null, // Scene-specific config/metadata
          filePath: normalizedPath,
          isDevScene:
            sceneModule.isDevScene === true ||
            normalizedPath.startsWith('examples/dev/'),
          deviceTypes: sceneModule.deviceTypes || ['pixoo64', 'pixoo'], // Supported device types (default: all Pixoo)
          metadataSummary: sceneModule.metadataSummary || null,
        });
      }

      // Sort scenes: first by folder, then by name
      scenes.sort((a, b) => {
        const aFolder = a.filePath.includes('/')
          ? a.filePath.split('/')[0]
          : '';
        const bFolder = b.filePath.includes('/')
          ? b.filePath.split('/')[0]
          : '';

        // Compare folders first
        if (aFolder !== bFolder) {
          // Root files (no folder) come first
          if (!aFolder) return -1;
          if (!bFolder) return 1;
          return aFolder.localeCompare(bFolder);
        }

        // Within same folder, sort by name
        return a.name.localeCompare(b.name);
      });

      this.logger.debug(`Listed ${scenes.length} scenes`);
      return scenes;
    } catch (error) {
      this.logger.error('Failed to list scenes:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get current scene for a device
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Current scene state
   */
  async getCurrentScene(deviceIp) {
    try {
      const state = this.sceneManager.getDeviceSceneState(deviceIp);
      return {
        deviceIp,
        currentScene: state.currentScene || null,
        status: state.status || 'idle',
        generationId: state.generationId || 0,
        playState: state.playState || 'stopped',
      };
    } catch (error) {
      this.logger.warn(`Failed to get current scene for ${deviceIp}:`, {
        error: error.message,
      });
      return {
        deviceIp,
        currentScene: null,
        status: 'error',
        generationId: 0,
        playState: 'stopped',
      };
    }
  }

  /**
   * Pause the current scene on a device
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Result with success status
   */
  async pauseScene(deviceIp) {
    try {
      this.logger.info(`Pausing scene on ${deviceIp}`);

      const success = this.sceneManager.pauseScene(deviceIp);

      if (!success) {
        throw new Error('Failed to pause scene');
      }

      this.logger.ok(`Successfully paused scene on ${deviceIp}`);

      return {
        success: true,
        deviceIp,
        playState: 'paused',
        message: 'Scene paused',
      };
    } catch (error) {
      this.logger.error(`Failed to pause scene for ${deviceIp}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Resume the paused scene on a device
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Result with success status
   */
  async resumeScene(deviceIp) {
    try {
      this.logger.info(`Resuming scene on ${deviceIp}`);

      // Get device context
      const state = this.sceneManager.getDeviceSceneState(deviceIp);
      const sceneName = state.currentScene;

      if (!sceneName) {
        throw new ValidationError('No scene loaded to resume');
      }

      const context = this.deviceAdapter.getContext(deviceIp, sceneName, {});

      const success = await this.sceneManager.resumeScene(deviceIp, context);

      if (!success) {
        throw new Error('Failed to resume scene');
      }

      this.logger.ok(`Successfully resumed scene on ${deviceIp}`);

      return {
        success: true,
        deviceIp,
        playState: 'playing',
        message: 'Scene resumed',
      };
    } catch (error) {
      this.logger.error(`Failed to resume scene for ${deviceIp}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Stop the current scene on a device (keeps scene loaded, just stops rendering)
   * @param {string} deviceIp - Device IP address
   * @returns {Promise<Object>} Result with success status
   */
  async stopScene(deviceIp) {
    try {
      this.logger.info(`Stopping scene on ${deviceIp}`);

      // Get current scene state
      const state = this.sceneManager.getDeviceSceneState(deviceIp);
      const sceneName = state.currentScene;

      if (!sceneName) {
        throw new ValidationError('No scene loaded to stop');
      }

      const success = this.sceneManager.stopScene(deviceIp);

      if (!success) {
        throw new Error('Failed to stop scene');
      }

      // Clear the display and push to hardware
      const device = this.deviceAdapter.getDevice(deviceIp);
      await device.clear();
      await device.push(); // Actually send the cleared screen to Pixoo

      this.logger.ok(
        `Successfully stopped scene on ${deviceIp} (screen cleared, scene remains loaded)`,
      );

      return {
        success: true,
        deviceIp,
        playState: 'stopped',
        currentScene: sceneName, // Scene stays loaded
        message: 'Scene stopped',
      };
    } catch (error) {
      this.logger.error(`Failed to stop scene for ${deviceIp}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Publish scene state to MQTT
   * @param {string} deviceIp - Device IP address
   * @param {string} sceneName - Scene name
   * @param {string} status - Scene status (switching, running, stopping)
   * @returns {Promise<void>}
   * @private
   */
  async _publishSceneState(deviceIp, sceneName, status) {
    try {
      const state = this.sceneManager.getDeviceSceneState(deviceIp);
      const payload = {
        currentScene: state.currentScene || sceneName,
        targetScene: sceneName,
        status,
        generationId: state.generationId || 0,
        version: this.versionInfo.version,
        buildNumber: this.versionInfo.buildNumber,
        gitCommit: this.versionInfo.gitCommit,
        ts: Date.now(),
      };

      await this.mqttService.publish(
        `/home/pixoo/${deviceIp}/scene/state`,
        payload,
      );
    } catch (error) {
      this.logger.warn('Failed to publish scene state:', {
        deviceIp,
        error: error.message,
      });
      // Don't throw - state publishing is best-effort
    }
  }

  /**
   * Publish error to MQTT
   * @param {string} deviceIp - Device IP address
   * @param {string} errorMessage - Error message
   * @param {Object} context - Additional context
   * @returns {Promise<void>}
   * @private
   */
  async _publishError(deviceIp, errorMessage, context = {}) {
    try {
      const payload = {
        error: errorMessage,
        ...context,
        ts: Date.now(),
      };

      await this.mqttService.publish(`pixoo/${deviceIp}/error`, payload);
    } catch (error) {
      this.logger.warn('Failed to publish error:', {
        deviceIp,
        error: error.message,
      });
      // Don't throw - error publishing is best-effort
    }
  }
}

module.exports = SceneService;
