/**
 * @fileoverview Scene Base Classes - Consolidated scene state management
 * @description Provides base classes and utilities for scene development, eliminating
 * duplication and ensuring consistent state management patterns across all scenes.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const logger = require('./logger');

/**
 * Base Scene State Manager - Eliminates state management duplication
 * Provides consistent state handling patterns for all scenes
 */
class BaseSceneState {
  constructor(getState, setState) {
    this.getState = getState;
    this.setState = setState;
  }

  /**
   * Reset all scene state to initial values
   * @param {Object} initialState - Optional initial state overrides
   */
  reset(initialState = {}) {
    const defaultState = {
      isRunning: true,
      loopScheduled: false,
      loopTimer: null,
      inFrame: false,
      startTime: Date.now(),
      frameCount: 0,
      framesPushed: 0,
      framesRendered: 0,
      // Performance metrics
      minFrametime: Infinity,
      maxFrametime: 0,
      sumFrametime: 0,
      samples: [],
      // Scene-specific state
      ...initialState,
    };

    Object.entries(defaultState).forEach(([key, value]) => {
      this.setState(key, value);
    });

    logger.debug(`🔄 [BASE] State reset for scene`);
  }

  /**
   * Update performance metrics
   * @param {number} frametime - Frame time in milliseconds
   */
  updateMetrics(frametime) {
    if (!(frametime > 0)) return;

    const framesRendered = (this.getState('framesRendered') || 0) + 1;
    const samples = this.getState('samples') || [];
    const sumFrametime = (this.getState('sumFrametime') || 0) + frametime;

    const minFrametime = Math.min(
      this.getState('minFrametime') || Infinity,
      frametime,
    );
    const maxFrametime = Math.max(
      this.getState('maxFrametime') || 0,
      frametime,
    );

    this.setState('framesRendered', framesRendered);
    this.setState('minFrametime', minFrametime);
    this.setState('maxFrametime', maxFrametime);
    this.setState('sumFrametime', sumFrametime);
    this.setState('samples', [...samples, frametime].slice(-100)); // Keep last 100 samples
  }

  /**
   * Get computed performance metrics
   * @returns {Object} Performance metrics object
   */
  getMetrics() {
    const framesRendered = this.getState('framesRendered') || 0;
    const sumFrametime = this.getState('sumFrametime') || 0;
    const samples = this.getState('samples') || [];

    return {
      framesRendered,
      avgFrametime: framesRendered > 0 ? sumFrametime / framesRendered : 0,
      minFrametime: this.getState('minFrametime') || 0,
      maxFrametime: this.getState('maxFrametime') || 0,
      sampleCount: samples.length,
    };
  }

  /**
   * Check if scene should continue based on frame limit
   * @param {number} framesCap - Maximum frames to render (null for unlimited)
   * @returns {boolean} True if scene should continue
   */
  shouldContinue(framesCap) {
    const framesPushed = this.getState('framesPushed') || 0;
    return framesCap == null || framesCap < 0 || framesPushed < framesCap;
  }
}

/**
 * Frame Counter - Dedicated frame counting with proper reset logic
 */
class FrameCounter {
  constructor(getState, setState) {
    this.getState = getState;
    this.setState = setState;
  }

  /**
   * Increment frame count and return current count
   * @returns {number} Current frame count
   */
  incrementFrame() {
    const frameCount = (this.getState('frameCount') || 0) + 1;
    this.setState('frameCount', frameCount);
    return frameCount;
  }

  /**
   * Increment pushed frames count and return current count
   * @returns {number} Current pushed frames count
   */
  incrementPushed() {
    const framesPushed = (this.getState('framesPushed') || 0) + 1;
    this.setState('framesPushed', framesPushed);
    return framesPushed;
  }

  /**
   * Reset all frame counters
   */
  reset() {
    this.setState('frameCount', 0);
    this.setState('framesPushed', 0);
  }

  /**
   * Check if scene should continue based on frame limit
   * @param {number|null} maxFrames - Maximum frames to render, null for indefinite
   * @returns {boolean} True if should continue, false if should stop
   */
  shouldContinue(maxFrames) {
    if (maxFrames === null || maxFrames === undefined || maxFrames < 0) {
      // Null/undefined/negative means run indefinitely
      return true;
    }
    const framesPushed = this.getState('framesPushed') || 0;
    return framesPushed < maxFrames;
  }
}

/**
 * Common Scene Utilities - Shared functions for all scenes
 */
const SceneUtils = {
  /**
   * Validate scene context - standardized validation for all scenes
   * @param {Object} context - Scene context object
   * @param {string} sceneName - Name of the scene for error messages
   * @returns {boolean} True if context is valid
   */
  validateContext(context, sceneName = 'unknown') {
    if (!context || typeof context !== 'object') {
      logger.error(`❌ [${sceneName}] Invalid context: not an object`);
      return false;
    }

    const requiredProps = ['device', 'publishOk'];
    const missingProps = requiredProps.filter((prop) => !(prop in context));

    if (missingProps.length > 0) {
      logger.error(
        `❌ [${sceneName}] Missing context properties: ${missingProps.join(', ')}`,
      );
      return false;
    }

    if (typeof context.publishOk !== 'function') {
      logger.error(`❌ [${sceneName}] context.publishOk must be a function`);
      return false;
    }

    if (!(context.state instanceof Map)) {
      logger.error(`❌ [${sceneName}] context.state must be a Map`);
      return false;
    }

    return true;
  },

  /**
   * Get configuration from payload with defaults
   * @param {Object} payload - MQTT payload
   * @param {Object} defaults - Default configuration values
   * @returns {Object} Configuration object
   */
  getConfig(payload, defaults = {}) {
    // Start with defaults
    const config = { ...defaults };

    // Override with payload values (but don't override defaults with undefined/null)
    if (payload) {
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined && payload[key] !== null) {
          config[key] = payload[key];
        }
      });
    }

    return config;
  },

  /**
   * Create standardized error response
   * @param {Error} error - Error object
   * @param {string} sceneName - Scene name
   * @param {Object} context - Scene context for additional logging
   * @returns {Object} Standardized error response
   */
  createErrorResponse(error, sceneName, context = {}) {
    const errorResponse = {
      error: error.message,
      scene: sceneName,
      ts: Date.now(),
      context: {
        device: context.device?.host || 'unknown',
        frametime: context.frametime || 0,
      },
    };

    logger.error(`❌ [${sceneName}] Render error: ${error.message}`, {
      stack: error.stack,
      context: errorResponse.context,
    });

    return errorResponse;
  },

  /**
   * Create standardized success response
   * @param {string} sceneName - Scene name
   * @param {Object} metrics - Performance metrics
   * @param {Object} context - Additional context
   * @returns {Object} Standardized success response
   */
  createSuccessResponse(sceneName, metrics = {}, context = {}) {
    const successResponse = {
      scene: sceneName,
      frametime: metrics.frametime || 0,
      diffPixels: metrics.diffPixels || 0,
      pushes: metrics.pushes || 0,
      skipped: metrics.skipped || 0,
      errors: metrics.errors || 0,
      version: context.version || 'unknown',
      buildNumber: context.buildNumber || 'unknown',
      gitCommit: context.gitCommit || 'unknown',
      ts: Date.now(),
    };

    logger.ok(`✅ [${sceneName}] Success`, {
      frametime: successResponse.frametime,
      diffPixels: successResponse.diffPixels,
      pushes: successResponse.pushes,
    });

    return successResponse;
  },
};

/**
 * Scene Template Generator - Creates consistent scene structures
 */
const SceneTemplate = {
  /**
   * Generate a standard scene render function
   * @param {string} sceneName - Name of the scene
   * @param {Function} renderLogic - Custom render logic function
   * @param {Object} options - Options for the scene
   * @returns {Function} Scene render function
   */
  createRenderFunction(sceneName, renderLogic, options = {}) {
    return async function render(context) {
      // Standardized context validation
      if (!SceneUtils.validateContext(context, sceneName)) {
        return null;
      }

      const { device, payload, getState, setState, loopDriven, publishOk } =
        context;

      try {
        // Get configuration
        const config = SceneUtils.getConfig(payload, options.defaults);

        // Initialize state if not running
        if (!getState('isRunning')) {
          const state = new BaseSceneState(getState, setState);
          state.reset(options.initialState);
          logger.ok(`🎬 [${sceneName}] Starting scene`);
        }

        // Execute custom render logic
        const result = await renderLogic({
          device,
          payload,
          getState,
          setState,
          loopDriven,
          publishOk,
          config,
          sceneName,
        });

        // Handle frame counting and completion
        const frameCounter = new FrameCounter(getState, setState);
        const framesPushed = frameCounter.incrementPushed();

        if (!frameCounter.shouldContinue(config.frames)) {
          // Scene completed
          logger.ok(`🏁 [${sceneName}] Completed after ${framesPushed} frames`);
          return null;
        }

        return result;
      } catch (error) {
        return SceneUtils.createErrorResponse(error, sceneName, {
          device: device?.host,
          frametime: device?.getMetrics?.()?.lastFrametime || 0,
        });
      }
    };
  },
};

module.exports = {
  BaseSceneState,
  FrameCounter,
  SceneUtils,
  SceneTemplate,
};
