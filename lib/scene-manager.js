/**
 * @fileoverview Scene Manager - Centralized scene lifecycle management
 * @description Manages the registration, switching, and rendering of scenes.
 * This class is responsible for the entire lifecycle of a scene, from loading
 * to cleanup.
 *
 * Key Features:
 * - Per-device state machine (currentScene, targetScene, generationId, status)
 * - Centralized scheduler loop (one per device)
 * - Input gating to prevent stale frames
 * - Pure-render contract enforcement (scenes don't own timers)
 * - Multi-device isolation (independent loops per device)
 * - MQTT state mirroring for observability
 *
 * Scene Interface (only render required):
 * - render(context): async function returning delay (ms) or null
 * - init(context): optional async function for initialization
 * - cleanup(context): optional async function for cleanup
 * - wantsLoop: boolean indicating if scene wants central loop
 * - name: string scene identifier
 *
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

/**
 * Scene Manager - Centralized scene management with lifecycle hooks
 *
 * Implements a per-device state machine with centralized scheduling:
 * - Each device has independent: activeScene, generationId, loopTimer, status
 * - Scene switching increments generationId to invalidate old loops
 * - Input gating drops messages from stale generations
 * - Scenes are pure renderers (no self-timers, no MQTT publishing)
 *
 * Dependencies are injected via constructor for testability.
 *
 * @class
 */
class SceneManager {
  /**
   * Create a SceneManager instance
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} [dependencies.stateStore] - StateStore instance (optional, falls back to Maps)
   */
  constructor({ logger, stateStore } = {}) {
    // Dependency injection - allow passing logger and stateStore for testing
    // Falls back to require() for backward compatibility during migration
    this.logger = logger || require('./logger');
    this.stateStore = stateStore || null;

    this.scenes = new Map();

    // Backward compatibility: Keep Maps if StateStore not provided
    if (!this.stateStore) {
      // Central scheduler state (per device) - LEGACY
      this.deviceActiveScene = new Map(); // host -> sceneName
      this.deviceGeneration = new Map(); // host -> generationId
      this.deviceLoopTimers = new Map(); // host -> timeoutId
      this.deviceStatus = new Map(); // host -> 'switching'|'running'|'stopping'
      this.sceneStates = new Map();
      this.logger.debug(
        'SceneManager using legacy Map-based state (no StateStore)',
      );
    } else {
      // Using StateStore - no need for Maps
      this.logger.debug('SceneManager using StateStore for state management');
    }
  }

  // ============================================================================
  // STATE MANAGEMENT HELPERS (StateStore or Maps)
  // ============================================================================

  /**
   * Get device state property (StateStore or Map)
   * @private
   */
  _getDeviceState(host, key, defaultValue = null) {
    if (this.stateStore) {
      return this.stateStore.getDeviceState(host, key, defaultValue);
    }
    // Legacy Map access
    const map = this[`device${key.charAt(0).toUpperCase()}${key.slice(1)}`];
    return map ? map.get(host) || defaultValue : defaultValue;
  }

  /**
   * Set device state property (StateStore or Map)
   * @private
   */
  _setDeviceState(host, key, value) {
    if (this.stateStore) {
      this.stateStore.setDeviceState(host, key, value);
    } else {
      // Legacy Map access
      const map = this[`device${key.charAt(0).toUpperCase()}${key.slice(1)}`];
      if (map) map.set(host, value);
    }
  }

  /**
   * Get scene state Map for a device (StateStore or Map)
   * @private
   */
  _getSceneState(sceneName) {
    if (this.stateStore) {
      // Not used with StateStore - scene state is per-device
      // This is for backward compatibility with old API
      return new Map(); // Return empty Map for compatibility
    }
    // Legacy Map access
    const key = sceneName;
    if (!this.sceneStates.has(key)) {
      this.sceneStates.set(key, new Map());
    }
    return this.sceneStates.get(key);
  }

  // ============================================================================
  // SCENE REGISTRATION
  // ============================================================================

  /**
   * Register a scene with the manager
   * @param {string} name - Scene name
   * @param {Object} sceneModule - Scene module with required methods
   * @param {Function} sceneModule.render - Render function that returns delay in ms or null (REQUIRED)
   * @param {Function} [sceneModule.init] - Optional initialization function
   * @param {Function} [sceneModule.cleanup] - Optional cleanup function
   * @param {boolean} [sceneModule.wantsLoop] - Whether scene wants central loop timing
   * @param {string} [sceneModule.name] - Scene name (should match parameter)
   * @throws {Error} If scene interface validation fails
   */
  registerScene(name, sceneModule) {
    // Validate scene interface
    if (!this.validateSceneInterface(sceneModule)) {
      throw new Error(
        `Scene ${name} does not implement required interface. ` +
          `Must have: render() method`,
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
    // Only 'render' is required; 'init' and 'cleanup' are optional
    return sceneModule && typeof sceneModule.render === 'function';
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
   * @param {Object} context - Scene context containing device, state, and utilities
   * @param {Object} context.device - Device adapter for drawing operations
   * @param {Map} context.state - Scene state storage (Map for consistent references)
   * @param {Function} context.publishOk - Function to publish success metrics
   * @param {Object} context.env - Environment info (host, width, height)
   * @param {Function} context.getState - State getter function
   * @param {Function} context.setState - State setter function
   * @param {Object} context.payload - MQTT payload data
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If scene not found or context missing required properties
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
      if (prevScene) {
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

          // If scene signals completion by returning a non-number, stop looping
          if (!(typeof nextDelayMs === 'number' && nextDelayMs >= 0)) {
            // Clear any recorded timer handle for this device to enable clean restarts
            this.deviceLoopTimers.delete(host);
            this.logger.ok(
              `⏹️  Loop completed for ${sceneName} (host=${host}, gen=${newGen})`,
            );
            return;
          }

          const delay = nextDelayMs;
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
      // Determine active scene for this device (per-device state)
      const host = context?.env?.host;
      const activeForDevice = host
        ? this.deviceActiveScene.get(host)
        : this.activeScene;
      const isDifferentScene = activeForDevice !== sceneName;
      if (isDifferentScene) {
        // If it's a different scene for this device, do a full switch
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

      // Render once to apply parameter changes immediately
      await this.renderScene(sceneName, {
        ...context,
        state: sameSceneState,
        loopDriven: !!this.getScene(sceneName)?.wantsLoop,
      });

      // If scene wantsLoop and loop appears stopped (no timer for host), restart loop
      const wantsLoop = !!this.getScene(sceneName)?.wantsLoop;
      if (wantsLoop && host) {
        const timerPresent = this.deviceLoopTimers.has(host);
        if (!timerPresent) {
          // Kick a fresh generation and restart device loop
          const gen = (this.deviceGeneration.get(host) || 0) + 1;
          this.deviceGeneration.set(host, gen);
          const deviceLoop = async () => {
            const active = this.deviceActiveScene.get(host);
            const curGen = this.deviceGeneration.get(host);
            if (active !== sceneName || curGen !== gen) return;
            let delay = 0;
            try {
              delay = await this.renderScene(sceneName, {
                ...context,
                loopDriven: true,
                generationId: gen,
              });
            } catch (err) {
              this.logger.warn('Device loop render error', {
                host,
                scene: sceneName,
                error: err?.message,
              });
            }
            if (!(typeof delay === 'number' && delay >= 0)) return;
            const id = setTimeout(deviceLoop, delay);
            this.deviceLoopTimers.set(host, id);
          };
          await deviceLoop();
        }
      }
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
   * @param {Object} context - Scene context containing device, state, and utilities
   * @returns {Promise<number|null>} Next delay in milliseconds or null to signal completion
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

      const nextDelayMs = await scene.render(sceneContext);
      return nextDelayMs;
    } catch (error) {
      this.logger.error(
        `❌ Scene render failed for ${sceneName}:`,
        error.message,
      );
      return null;
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

      const nextDelayMs = await scene.render(sceneContext);
      return nextDelayMs;
    } catch (error) {
      this.logger.error(
        `❌ Scene render failed for ${sceneName}:`,
        error.message,
      );
      return null;
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
