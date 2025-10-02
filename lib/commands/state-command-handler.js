/**
 * @fileoverview StateCommandHandler - Handles state update commands
 * @description Processes MQTT state/upd commands to render scenes with payloads.
 * This is the main command for triggering scene rendering with data.
 * Contains full scene switching logic including animation gating, screen clearing,
 * and state publishing.
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
   * @param {Map} dependencies.deviceDefaults - Map of device default scenes
   * @param {Object} dependencies.lastState - Object storing last state per device
   * @param {Function} dependencies.getDevice - Function to get device instance
   * @param {Function} dependencies.getDriverForDevice - Function to get driver name
   * @param {Object} dependencies.versionInfo - Version/build information
   */
  constructor({
    logger,
    mqttService,
    sceneManager,
    getContext,
    publishMetrics,
    deviceDefaults,
    lastState,
    getDevice,
    getDriverForDevice,
    versionInfo,
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
    if (!getDevice) {
      throw new ValidationError('getDevice function is required');
    }
    if (!getDriverForDevice) {
      throw new ValidationError('getDriverForDevice function is required');
    }
    if (!versionInfo) {
      throw new ValidationError('versionInfo is required');
    }

    this.sceneManager = sceneManager;
    this.getContext = getContext;
    this.publishMetrics = publishMetrics;
    this.deviceDefaults = deviceDefaults;
    this.lastState = lastState;
    this.getDevice = getDevice;
    this.getDriverForDevice = getDriverForDevice;
    this.versionInfo = versionInfo;
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
   * Handle state/upd command - FULL IMPLEMENTATION
   * @param {string} deviceIp - Device IP address
   * @param {Object} payload - State payload
   * @returns {Promise<void>}
   * @private
   */
  async _handleUpdate(deviceIp, payload) {
    // Determine scene name (from payload or device default)
    const sceneName =
      payload?.scene || this.deviceDefaults.get(deviceIp) || 'empty';

    // Check if scene exists
    if (!this.sceneManager.hasScene(sceneName)) {
      this.logger.warn(`No renderer found for scene: ${sceneName}`);
      return;
    }

    // Gate legacy animation continuation frames entirely (central scheduler only)
    if (payload && payload._isAnimationFrame === true) {
      try {
        const st = this.sceneManager.getDeviceSceneState(deviceIp);
        const frameScene = payload.scene;
        const frameGen = payload.generationId;
        if (frameScene !== st.currentScene || frameGen !== st.generationId) {
          this.logger.info(
            `⚑ [GATE] Drop stale animation frame for ${frameScene} (gen ${frameGen}) on ${deviceIp}; active ${st.currentScene} (gen ${st.generationId})`,
          );
        } else {
          this.logger.info(
            `⚑ [GATE] Drop animation frame (loop-driven) for ${frameScene} (gen ${frameGen}) on ${deviceIp}`,
          );
        }
      } catch {
        this.logger.info(
          `[GATE] Drop animation frame (no state) on ${deviceIp}`,
        );
      }
      return; // Always ignore animation frame inputs
    }

    // Log state update
    const ts = new Date().toLocaleString('de-AT');
    this.logger.info(`State update for ${deviceIp}`, {
      scene: sceneName,
      driver: this.getDriverForDevice(deviceIp),
      timestamp: ts,
    });

    // Create render context
    const publishOk = (ip, scn, ft, dp, m) => {
      const msg = {
        scene: scn,
        frametime: ft,
        diffPixels: dp,
        pushes: m.pushes,
        skipped: m.skipped,
        errors: m.errors,
        version: this.versionInfo.version,
        buildNumber: this.versionInfo.buildNumber,
        gitCommit: this.versionInfo.gitCommit,
        ts: Date.now(),
      };

      this.logger.ok(`OK [${ip}]`, {
        scene: scn,
        frametime: ft,
        diffPixels: dp,
        pushes: m.pushes,
        skipped: m.skipped,
        errors: m.errors,
        version: this.versionInfo.version,
        buildNumber: this.versionInfo.buildNumber,
        gitCommit: this.versionInfo.gitCommit,
      });

      this.mqttService.publish(`pixoo/${ip}/ok`, msg);
    };

    const ctx = this.getContext(deviceIp, sceneName, payload, publishOk);
    ctx.payload = payload;

    // Detect scene changes and parameter changes
    const lastScene = this.lastState[deviceIp]?.sceneName;
    const lastPayload = this.lastState[deviceIp]?.payload;
    const isSceneChange = !lastScene || lastScene !== sceneName;
    const isParameterChange = lastScene === sceneName && true; // treat any new command as authoritative
    const shouldClear = isSceneChange || payload.clear === true;

    if (isParameterChange) {
      this.logger.info('Parameter change detected', {
        scene: sceneName,
        old: lastPayload,
        new: payload,
      });
    }

    // Store last state
    this.lastState[deviceIp] = { payload, sceneName };

    // Clear screen if needed
    if (shouldClear) {
      const device = this.getDevice(deviceIp);
      await device.clear();
      if (lastScene && lastScene !== sceneName) {
        this.logger.ok(
          `Cleared screen on scene switch from '${lastScene}' to '${sceneName}'`,
        );
      } else if (payload.clear === true) {
        this.logger.ok("Cleared screen as requested by 'clear' parameter");
      }
    }

    try {
      // Publish switching state (optional, best-effort)
      try {
        const prev = this.sceneManager.getDeviceSceneState(deviceIp);
        const genNext = ((prev.generationId || 0) + 1) | 0;
        this.mqttService.publish(`/home/pixoo/${deviceIp}/scene/state`, {
          currentScene: prev.currentScene,
          targetScene: sceneName,
          status: 'switching',
          generationId: genNext,
          version: this.versionInfo.version,
          buildNumber: this.versionInfo.buildNumber,
          gitCommit: this.versionInfo.gitCommit,
          ts: Date.now(),
        });
      } catch (e) {
        this.logger.warn('Failed to publish switching state', {
          deviceIp,
          error: e?.message,
        });
      }

      // **CRITICAL**: Call switchScene, not renderActiveScene!
      const success = await this.sceneManager.switchScene(sceneName, ctx);

      // Publish running state after switch
      try {
        const st = this.sceneManager.getDeviceSceneState(deviceIp);
        this.mqttService.publish(`/home/pixoo/${deviceIp}/scene/state`, {
          currentScene: st.currentScene,
          generationId: st.generationId,
          status: st.status,
          version: this.versionInfo.version,
          buildNumber: this.versionInfo.buildNumber,
          gitCommit: this.versionInfo.gitCommit,
          ts: Date.now(),
        });
      } catch (e) {
        this.logger.warn('Failed to publish device scene state', {
          deviceIp,
          error: e?.message,
        });
      }

      if (!success) {
        throw new Error(`Failed to handle scene update: ${sceneName}`);
      }

      // Rendering is handled by the central device loop; nothing to do here

      // Publish metrics
      this.publishMetrics(deviceIp);
    } catch (err) {
      this.logger.error(`Render error for ${deviceIp}:`, {
        error: err.message,
        scene: sceneName,
      });

      this._publishError(deviceIp, err.message, {
        scene: sceneName,
      });

      // Still publish metrics even on error
      this.publishMetrics(deviceIp);
    }
  }
}

module.exports = StateCommandHandler;
