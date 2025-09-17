/**
 * @fileoverview Scene Manager - Centralized scene lifecycle management
 * @description Manages the registration, switching, and rendering of scenes.
 * This class is responsible for the entire lifecycle of a scene, from loading
 * to cleanup.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

/**
 * Scene Manager - Centralized scene management with lifecycle hooks
 */
class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.activeScenes = new Map(); // deviceIp -> sceneName (legacy)
    // Central scheduler state (per device)
    this.deviceActiveScene = new Map(); // host -> sceneName
    this.deviceGeneration = new Map(); // host -> generationId
    this.deviceLoopTimers = new Map(); // host -> timeoutId
    this.deviceStatus = new Map(); // host -> 'switching'|'running'|'stopping'
    this.sceneStates = new Map();
    this.logger = require('./logger');
  }

  /**
   * Register a scene with the manager
   * @param {string} name - Scene name
   * @param {Object} sceneModule - Scene module with required methods
   */
  registerScene(name, sceneModule) {
    // Validate scene interface
    if (!this.validateSceneInterface(sceneModule)) {
      throw new Error(
        `Scene ${name} does not implement required interface. ` +
          `Must have: render, init methods`,
      );
    }

    this.scenes.set(name, sceneModule);
    this.sceneStates.set(name, new Map()); // Isolated state per scene

    this.logger.ok(`Scene registered: ${name}`);
  }

  /**
   * Validate that a scene implements the required interface
   * @param {Object} sceneModule - Scene module to validate
   * @returns {boolean} True if valid
   */
  validateSceneInterface(sceneModule) {
    return (
      sceneModule &&
      typeof sceneModule.render === 'function' &&
      typeof sceneModule.init === 'function'
    );
  }

  /**
   * Get a registered scene
   * @param {string} name - Scene name
   * @returns {Object|null} Scene module or null if not found
   */
  getScene(name) {
    return this.scenes.get(name) || null;
  }

  /**
   * Get scene state container
   * @param {string} name - Scene name
   * @returns {Map} Scene state container
   */
  getSceneState(name) {
    if (!this.sceneStates.has(name)) {
      this.sceneStates.set(name, new Map());
    }
    return this.sceneStates.get(name);
  }

  /**
   * Switch to a new scene (auto-cleanup previous scene)
   * @param {string} sceneName - Name of scene to switch to
   * @param {Object} context - Scene context (device, state, etc.)
   * @returns {Promise<boolean>} Success status
   */
  async switchScene(sceneName, context) {
    try {
      const host = context?.env?.host;
      if (!host) {
        throw new Error('Missing host in context.env.host for switchScene');
      }

      // Mark switching state for device
      this.deviceStatus.set(host, 'switching');

      // Stop previous loop for this device and cleanup its scene
      const prevScene = this.deviceActiveScene.get(host);
      if (prevScene && prevScene !== sceneName) {
        this.deviceStatus.set(host, 'stopping');
        const prevTimer = this.deviceLoopTimers.get(host);
        if (prevTimer) {
          clearTimeout(prevTimer);
          this.deviceLoopTimers.delete(host);
        }
        try {
          const { getContext } = require('./device-adapter');
          const cleanupCtx = getContext(
            host,
            prevScene,
            {},
            context?.publishOk,
          );
          await this.cleanupScene(prevScene, cleanupCtx);
        } catch (e) {
          this.logger.warn('Cleanup fallback for device failed', {
            host,
            scene: prevScene,
            error: e?.message,
          });
          await this.cleanupScene(prevScene, context);
        }
      }

      // Get new scene
      const scene = this.getScene(sceneName);
      if (!scene) {
        throw new Error(`Scene not found: ${sceneName}`);
      }

      // Initialize new scene for this device
      await this.initScene(sceneName, context);

      // Record device-scoped active scene and generation
      const newGen = (this.deviceGeneration.get(host) || 0) + 1;
      this.deviceActiveScene.set(host, sceneName);
      this.deviceGeneration.set(host, newGen);
      this.deviceStatus.set(host, 'running');

      // Decide loop policy: only loop if scene opts in
      const sceneModule = this.getScene(sceneName);
      const wantsLoop = !!sceneModule?.wantsLoop;

      if (wantsLoop) {
        // Start central device loop (loop-driven rendering) that respects scene-provided delays
        const deviceLoop = async () => {
          // Abort if scene changed or generation advanced
          const active = this.deviceActiveScene.get(host);
          const gen = this.deviceGeneration.get(host);
          if (active !== sceneName || gen !== newGen) return;

          let nextDelayMs = 0;
          try {
            nextDelayMs = await this.renderScene(sceneName, {
              ...context,
              loopDriven: true,
              generationId: newGen,
            });
          } catch (err) {
            this.logger.warn('Device loop render error', {
              host,
              scene: sceneName,
              error: err?.message,
            });
          }

          const delay =
            typeof nextDelayMs === 'number' && nextDelayMs >= 0
              ? nextDelayMs
              : 0;
          const timerId = setTimeout(deviceLoop, delay);
          this.deviceLoopTimers.set(host, timerId);
        };

        // Kick off the loop immediately
        await deviceLoop();
      } else {
        // Single render for static scenes
        await this.renderScene(sceneName, {
          ...context,
          loopDriven: false,
          generationId: newGen,
        });
      }

      this.logger.ok(
        `Scene switched to: ${sceneName} (host=${host}, gen=${newGen})`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `❌ Failed to switch to scene ${sceneName}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Update scene parameters without full re-initialization
   * @param {string} sceneName - Name of scene to update
   * @param {Object} context - Scene context
   * @returns {Promise<boolean>} Success status
   */
  async updateSceneParameters(sceneName, context) {
    try {
      const isDifferentScene = this.activeScene !== sceneName;
      if (isDifferentScene) {
        // If it's a different scene, do a full switch
        return await this.switchScene(sceneName, context);
      }

      // Same scene, update the scene state with new parameters
      const state = this.getSceneState(sceneName);

      // Update state with new parameters from context.payload (the MQTT payload)
      if (context.payload && typeof context.payload === 'object') {
        this.logger.info(`Updating state for ${sceneName}:`, context.payload);
        Object.entries(context.payload).forEach(([key, value]) => {
          if (key !== 'scene') {
            // Don't overwrite scene name
            state.set(key, value);
            this.logger.info(`   Set ${key} = ${JSON.stringify(value)}`);
          }
        });
        // If no explicit stop provided, clear any stale stop flag
        if (!Object.prototype.hasOwnProperty.call(context.payload, 'stop')) {
          state.set('stop', false);
        }
      } else {
        this.logger.warn(`No payload in context for ${sceneName}`);
      }

      this.logger.info(`🔄 Updating parameters for scene: ${sceneName}`);

      // Check if this is an animation continuation frame
      const isAnimationFrame =
        context.payload && context.payload._isAnimationFrame === true;

      if (isAnimationFrame) {
        // For animation frames, just render without cleanup/init to preserve state
        this.logger.info(
          `🎬 Animation frame detected - skipping cleanup/init for ${sceneName}`,
        );
        await this.renderScene(sceneName, context);
        return true;
      }

      // Re-init same scene updates to ensure a clean start (for real parameter changes)
      const scene = this.getScene(sceneName);
      const sameSceneState = this.getSceneState(sceneName);

      // Run cleanup to stop any running timers/loops
      if (typeof scene.cleanup === 'function') {
        await scene.cleanup({ ...context, state: sameSceneState, sceneName });
      }

      // Re-run init to apply defaults and prepare fresh rendering
      if (typeof scene.init === 'function') {
        await scene.init({ ...context, state: sameSceneState, sceneName });
      }

      // Immediately render once to kick off any self-scheduling logic
      await this.renderScene(sceneName, { ...context, state: sameSceneState });
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Failed to update scene parameters for ${sceneName}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Initialize a scene
   * @param {string} sceneName - Scene name
   * @param {Object} context - Scene context
   */
  async initScene(sceneName, context) {
    const scene = this.getScene(sceneName);
    const state = this.getSceneState(sceneName);

    // Merge deployment state with scene state
    if (context.state && context.state instanceof Map) {
      context.state.forEach((value, key) => {
        state.set(key, value);
      });
    }

    // Add state to context
    const sceneContext = {
      ...context,
      state,
      sceneName,
    };

    // Call scene init if it exists
    if (typeof scene.init === 'function') {
      await scene.init(sceneContext);
    }

    this.logger.ok(`🚀 Scene initialized: ${sceneName}`);
  }

  /**
   * Cleanup a scene
   * @param {string} sceneName - Scene name
   * @param {Object} context - Scene context
   */
  async cleanupScene(sceneName, context) {
    const scene = this.getScene(sceneName);
    const state = this.getSceneState(sceneName);

    // Call scene cleanup if it exists
    if (typeof scene.cleanup === 'function') {
      try {
        await scene.cleanup({ ...context, state, sceneName });
      } catch (error) {
        this.logger.warn(
          `⚠️ Scene cleanup failed for ${sceneName}:`,
          error.message,
        );
      }
    }

    // Clear scene state
    state.clear();

    this.logger.info(`🧹 Scene cleaned up: ${sceneName}`);
  }

  /**
   * Render the active scene
   * @param {Object} context - Scene context
   * @returns {Promise<boolean>} Success status
   */
  async renderActiveScene(context) {
    // Use scene name from context if provided, otherwise fall back to activeScene
    const host = context?.env?.host;
    const sceneName =
      context.sceneName ||
      (host ? this.deviceActiveScene.get(host) : this.activeScene);

    if (!sceneName) {
      this.logger.warn('⚠️ No scene to render');
      return false;
    }

    try {
      const scene = this.getScene(sceneName);
      const state = this.getSceneState(sceneName);

      // Pass the authoritative state Map so scenes can manage timers/flags reliably
      const sceneContext = {
        ...context,
        state, // do NOT copy; timers rely on consistent state references
        sceneName: sceneName,
        payload: context.payload,
        publishOk: context.publishOk,
        device: context.device,
      };

      await scene.render(sceneContext);
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Scene render failed for ${sceneName}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Get list of registered scene names
   * @returns {string[]} Array of scene names
   */
  getRegisteredScenes() {
    return Array.from(this.scenes.keys());
  }

  /**
   * Check if a scene is registered
   * @param {string} name - Scene name
   * @returns {boolean} True if registered
   */
  hasScene(name) {
    return this.scenes.has(name);
  }

  /**
   * Render a specific scene
   * @param {string} sceneName - Scene name to render
   * @param {Object} context - Scene context
   * @returns {Promise<boolean>} Success status
   */
  async renderScene(sceneName, context) {
    try {
      const scene = this.getScene(sceneName);
      const state = this.getSceneState(sceneName);

      // Pass the authoritative state Map (no copying)
      const sceneContext = {
        ...context,
        state,
        sceneName: sceneName,
        payload: context.payload,
        publishOk: context.publishOk,
        device: context.device,
      };

      await scene.render(sceneContext);
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Scene render failed for ${sceneName}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Get current active scene name
   * @returns {string|null} Active scene name or null
   */
  getActiveScene() {
    return this.activeScene; // legacy accessor (single scene); prefer per-device maps
  }

  /**
   * Get active scene for a specific device host
   * @param {string} host
   * @returns {string|undefined}
   */
  getActiveSceneForDevice(host) {
    return this.deviceActiveScene.get(host);
  }

  /**
   * Get scene state for device (for MQTT observability)
   * @param {string} host
   * @returns {{currentScene: string|null, generationId: number|null, status: string|null}}
   */
  getDeviceSceneState(host) {
    return {
      currentScene: this.deviceActiveScene.get(host) || null,
      generationId: this.deviceGeneration.get(host) || null,
      status: this.deviceStatus.get(host) || null,
    };
  }

  /**
   * Manually set device status (optional helper)
   * @param {string} host
   * @param {string} status
   */
  setDeviceStatus(host, status) {
    this.deviceStatus.set(host, status);
  }
}

module.exports = SceneManager;
