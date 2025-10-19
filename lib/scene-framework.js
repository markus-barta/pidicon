/**
 * @fileoverview Scene Framework - Base classes and composition system for Pixoo scenes
 * @description Provides standardized patterns, base classes, and composition utilities
 * to dramatically reduce boilerplate and accelerate scene development.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const logger = require('./logger');
const { validateSceneContext } = require('./performance-utils');

/**
 * Abstract base class for all Pixoo scenes
 * Provides common functionality and standardized lifecycle management
 */
class BaseScene {
  constructor(options = {}) {
    this.name = options.name || this.constructor.name.toLowerCase();
    this.config = { ...this.getDefaultConfig(), ...options.config };
    this.logger = logger;
    this._isInitialized = false;
    this._isRunning = false;
  }

  /**
   * Get default configuration for this scene type
   * @returns {Object} Default configuration object
   */
  getDefaultConfig() {
    return {
      debug: false,
      maxFrames: null, // null = run indefinitely
      frameRate: null, // null = adaptive
    };
  }

  /**
   * Initialize the scene
   * @param {Object} context - Scene context
   * @returns {Promise<void>}
   */
  async init(context) {
    if (!validateSceneContext(context, this.name)) {
      throw new Error(`Invalid context provided to ${this.name} scene`);
    }

    const { device, setState } = context;

    // Set up scene state
    setState('sceneConfig', this.config);
    setState('sceneName', this.name);
    setState('initialized', true);
    setState('startTime', Date.now());

    this._isInitialized = true;

    if (this.config.debug) {
      this.logger.info(`🎬 [${this.name}] Scene initialized`, {
        config: this.config,
        hasDevice: !!device,
      });
    }
  }

  /**
   * Render the scene - to be implemented by subclasses
   * @param {Object} context - Scene context
   * @returns {Promise<number|null>} Next delay in ms or null to complete
   */
  async render(/* context */) {
    throw new Error(`${this.constructor.name} must implement render() method`);
  }

  /**
   * Clean up the scene
   * @param {Object} context - Scene context
   * @returns {Promise<void>}
   */
  async cleanup(context) {
    const { setState } = context;

    if (setState) {
      setState('cleanupTime', Date.now());
      setState('isRunning', false);
    }

    this._isRunning = false;
    this._isInitialized = false;

    if (this.config.debug) {
      this.logger.info(`🧹 [${this.name}] Scene cleaned up`);
    }
  }

  /**
   * Handle errors with standardized logging and recovery
   * @param {Error} error - Error that occurred
   * @param {string} operation - Operation that failed
   * @param {Object} context - Additional context
   */
  handleError(error, operation = 'render', context = {}) {
    this.logger.error(`❌ [${this.name}] Error in ${operation}:`, {
      error: error.message,
      stack: error.stack,
      context,
    });

    // Attempt recovery for common issues
    if (operation === 'render' && context.device) {
      // Try to clear device on render errors
      try {
        context.device.clear();
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Check if scene should continue based on configuration
   * @param {Object} context - Scene context
   * @returns {boolean} True if should continue
   */
  shouldContinue(context) {
    const { getState } = context;
    const maxFrames = this.config.maxFrames;
    const currentFrames = getState('frameCount') || 0;

    if (maxFrames && currentFrames >= maxFrames) {
      if (this.config.debug) {
        this.logger.info(`🏁 [${this.name}] Reached max frames (${maxFrames})`);
      }
      return false;
    }

    return true;
  }

  /**
   * Get standardized scene metadata
   * @returns {Object} Scene metadata
   */
  getMetadata() {
    return {
      name: this.name,
      type: this.constructor.name,
      version: '1.0.0',
      config: this.config,
      isInitialized: this._isInitialized,
      isRunning: this._isRunning,
    };
  }
}

/**
 * Static scene - renders once and completes
 * Ideal for simple displays, status screens, or one-time messages
 */
class StaticScene extends BaseScene {
  constructor(options = {}) {
    super(options);
    this.renderFunction =
      options.renderFunction || this.renderContent.bind(this);
  }

  /**
   * Default render implementation - override renderContent() in subclasses
   * @param {Object} context - Scene context
   * @returns {Promise<null>} Always returns null to complete
   */
  async render(context) {
    try {
      if (!this._isInitialized) {
        await this.init(context);
      }

      const { device, getState, setState, publishOk } = context;

      // Track frame count
      const frameCount = (getState('frameCount') || 0) + 1;
      setState('frameCount', frameCount);

      // Render content
      await this.renderFunction(context);

      // Push to device
      await device.push(this.name, publishOk);

      if (this.config.debug) {
        this.logger.debug(
          `🖼️ [${this.name}] Static frame rendered (frame ${frameCount})`,
        );
      }

      // Static scenes complete after one render
      return null;
    } catch (error) {
      this.handleError(error, 'render', context);
      return null;
    }
  }

  /**
   * Override this method to implement scene content
   * @param {Object} context - Scene context
   */
  async renderContent(context) {
    // Default implementation - override in subclasses
    const { device } = context;
    await device.clear();
    await device.drawText(
      `Static Scene: ${this.name}`,
      [16, 28],
      [255, 255, 255, 255],
      'center',
    );
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      autoPush: true,
    };
  }
}

/**
 * Animated scene - renders continuously with timing control
 * Ideal for animations, real-time displays, and dynamic content
 */
class AnimatedScene extends BaseScene {
  constructor(options = {}) {
    super(options);
    this.renderFunction = options.renderFunction || this.renderFrame.bind(this);
    this.frameRate = options.frameRate || null; // null = adaptive
  }

  /**
   * Render implementation with animation loop management
   * @param {Object} context - Scene context
   * @returns {Promise<number|null>} Next delay or null to complete
   */
  async render(context) {
    try {
      if (!this._isInitialized) {
        await this.init(context);
        this._isRunning = true;
      }

      const { device, getState, setState, publishOk, loopDriven } = context;

      // Check if we should continue
      if (!this.shouldContinue(context)) {
        this._isRunning = false;
        return null;
      }

      // Track frame count and timing
      const frameCount = (getState('frameCount') || 0) + 1;
      setState('frameCount', frameCount);
      setState('lastRenderTime', Date.now());

      // Calculate elapsed time for smooth animation
      const startTime = getState('startTime');
      const elapsedMs = Date.now() - startTime;
      const elapsedSeconds = elapsedMs / 1000;

      // Render frame
      const frameContext = {
        ...context,
        frameCount,
        elapsedMs,
        elapsedSeconds,
        loopDriven,
      };

      await this.renderFunction(frameContext);

      // Push to device
      await device.push(this.name, publishOk);

      if (this.config.debug && frameCount % 60 === 0) {
        // Log every ~1 second at 60fps
        this.logger.debug(
          `🎬 [${this.name}] Animation frame ${frameCount} (elapsed: ${elapsedSeconds.toFixed(1)}s)`,
        );
      }

      // Return next delay (adaptive or fixed)
      return this.frameRate || 0; // 0 = ASAP for adaptive
    } catch (error) {
      this.handleError(error, 'render', context);
      return null;
    }
  }

  /**
   * Override this method to implement frame rendering
   * @param {Object} context - Extended scene context with timing info
   */
  async renderFrame(context) {
    // Default implementation - override in subclasses
    const { device, frameCount, elapsedSeconds } = context;
    await device.clear();

    // Simple animated pattern
    const x = 16 + Math.sin(elapsedSeconds) * 10;
    const y = 28 + Math.cos(elapsedSeconds * 1.5) * 5;
    await device.fillRect([x, y], [8, 8], [255, 255, 255, 255]);

    await device.drawText(
      `Animated Scene: ${this.name}`,
      [16, 10],
      [255, 255, 255, 255],
      'center',
    );
    await device.drawText(
      `Frame: ${frameCount}`,
      [16, 45],
      [200, 200, 200, 255],
      'center',
    );
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      frameRate: null, // Adaptive by default
      smoothAnimation: true,
    };
  }
}

/**
 * Data-driven scene - renders based on external data sources
 * Ideal for dashboards, status displays, and sensor data visualization
 */
class DataScene extends AnimatedScene {
  constructor(options = {}) {
    super(options);
    this.dataSources = options.dataSources || {};
    this.updateInterval = options.updateInterval || 5000; // 5 seconds
    this.lastDataUpdate = 0;
  }

  /**
   * Enhanced render with data management
   * @param {Object} context - Scene context
   * @returns {Promise<number|null>} Next delay or null to complete
   */
  async render(context) {
    const { setState } = context;

    // Update data if needed
    const now = Date.now();
    if (now - this.lastDataUpdate > this.updateInterval) {
      try {
        const newData = await this.fetchData(context);
        setState('sceneData', newData);
        setState('lastDataUpdate', now);
        this.lastDataUpdate = now;

        if (this.config.debug) {
          this.logger.debug(`📊 [${this.name}] Data updated`, {
            dataKeys: Object.keys(newData),
          });
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ [${this.name}] Data fetch failed: ${error.message}`,
        );
        // Continue with cached data if available
      }
    }

    // Render with data
    return super.render(context);
  }

  /**
   * Override to implement data fetching logic
   * @param {Object} context - Scene context
   * @returns {Promise<Object>} Fetched data object
   */
  async fetchData(/* context */) {
    // Default implementation - override in subclasses
    return {
      timestamp: Date.now(),
      status: 'sample data',
      mock: true,
    };
  }

  /**
   * Get current scene data
   * @param {Object} context - Scene context
   * @returns {Object} Current data
   */
  getCurrentData(context) {
    const { getState } = context;
    return getState('sceneData') || {};
  }

  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      updateInterval: 5000,
      cacheData: true,
    };
  }
}

/**
 * Scene Composition utilities
 * Allows layering and combining multiple scenes
 */
class SceneComposition {
  constructor() {
    this.layers = [];
    this.logger = logger;
  }

  /**
   * Add a scene layer
   * @param {BaseScene} scene - Scene to add as layer
   * @param {Object} options - Layer options (z-index, blending, etc.)
   */
  addLayer(scene, options = {}) {
    this.layers.push({
      scene,
      options: {
        zIndex: options.zIndex || 0,
        blendMode: options.blendMode || 'normal',
        opacity: options.opacity !== undefined ? options.opacity : 1.0,
        enabled: options.enabled !== false,
        ...options,
      },
    });

    // Sort by z-index
    this.layers.sort((a, b) => a.options.zIndex - b.options.zIndex);
  }

  /**
   * Remove a scene layer
   * @param {string} sceneName - Name of scene to remove
   */
  removeLayer(sceneName) {
    this.layers = this.layers.filter((layer) => layer.scene.name !== sceneName);
  }

  /**
   * Render all layers in order
   * @param {Object} context - Scene context
   * @returns {Promise<number|null>} Next delay or null
   */
  async render(context) {
    // For composition, we need to render each layer and combine them
    // This is a simplified implementation - full composition would need
    // more sophisticated blending and layer management

    let maxDelay = null;

    for (const layer of this.layers) {
      if (!layer.options.enabled) continue;

      try {
        const layerContext = {
          ...context,
          layerOptions: layer.options,
        };

        const delay = await layer.scene.render(layerContext);
        if (delay !== null && (maxDelay === null || delay > maxDelay)) {
          maxDelay = delay;
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ Layer ${layer.scene.name} render failed: ${error.message}`,
        );
      }
    }

    return maxDelay;
  }

  /**
   * Initialize all layers
   * @param {Object} context - Scene context
   */
  async init(context) {
    for (const layer of this.layers) {
      if (layer.options.enabled) {
        await layer.scene.init(context);
      }
    }
  }

  /**
   * Clean up all layers
   * @param {Object} context - Scene context
   */
  async cleanup(context) {
    for (const layer of this.layers) {
      await layer.scene.cleanup(context);
    }
  }
}

/**
 * Scene Factory - Creates scenes from configuration
 */
class SceneFactory {
  static createScene(type, options = {}) {
    switch (type.toLowerCase()) {
      case 'static':
      case 'staticscene':
        return new StaticScene(options);

      case 'animated':
      case 'animatedscene':
        return new AnimatedScene(options);

      case 'data':
      case 'datascene':
        return new DataScene(options);

      default:
        throw new Error(`Unknown scene type: ${type}`);
    }
  }

  static createComposition() {
    return new SceneComposition();
  }
}

module.exports = {
  BaseScene,
  StaticScene,
  AnimatedScene,
  DataScene,
  SceneComposition,
  SceneFactory,
};
