/**
 * @fileoverview Scene Manager - Centralized scene lifecycle management
 * @description Manages the registration, switching, and rendering of scenes.
 * This class is responsible for the entire lifecycle of a scene, from loading
 * to cleanup.
 * @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)
 * @license MIT
 */

/**
 * Scene Manager - Centralized scene management with lifecycle hooks
 */
class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.activeScene = null;
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

    this.logger.info(`Scene registered: ${name}`);
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
      // Auto-cleanup previous scene if exists
      if (this.activeScene && this.activeScene !== sceneName) {
        await this.cleanupScene(this.activeScene, context);
      }

      // Get new scene
      const scene = this.getScene(sceneName);
      if (!scene) {
        throw new Error(`Scene not found: ${sceneName}`);
      }

      // Initialize new scene
      await this.initScene(sceneName, context);

      // Render the scene immediately after initialization
      await this.renderScene(sceneName, context);

      this.activeScene = sceneName;
      this.logger.info(`Scene switched to: ${sceneName}`);

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

    this.logger.info(`🚀 Scene initialized: ${sceneName}`);
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
    const sceneName = context.sceneName || this.activeScene;

    if (!sceneName) {
      this.logger.warn('⚠️ No scene to render');
      return false;
    }

    try {
      const scene = this.getScene(sceneName);
      const state = this.getSceneState(sceneName);

      // Synchronize context state with scene manager state
      const sceneContext = {
        ...context,
        state: new Map([...state]), // Create a copy of the scene state
        sceneName: sceneName,
        // Preserve payload and other context properties
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

      // Create scene context with merged state
      const sceneContext = {
        ...context,
        state: new Map([...state]), // Create a copy of the scene state
        sceneName: sceneName,
        // Preserve payload and other context properties
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
    return this.activeScene;
  }
}

module.exports = SceneManager;
