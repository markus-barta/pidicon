/**
 * @fileoverview Graphics Engine - Enhanced rendering with hardware-aware animations
 * @description Advanced graphics capabilities optimized for Pixoo's 4-5fps hardware
 * with text effects, fade transitions, and smooth animations.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const logger = require('./logger');

/**
 * Graphics Engine - Enhanced rendering system for Pixoo devices
 * Provides text effects, fade transitions, and hardware-aware animations
 */
class GraphicsEngine {
  constructor(device) {
    if (!device) {
      throw new Error('GraphicsEngine requires a device instance');
    }
    this.device = device;
    this.host = device.host || 'unknown';

    // Animation state for fade transitions
    this.fadeState = {
      active: false,
      startTime: 0,
      duration: 0,
      fromOpacity: 0,
      toOpacity: 0,
      currentOpacity: 0,
      onComplete: null,
    };

    // Resource cache for images and fonts
    this.resourceCache = new Map();

    // Performance monitoring
    this.performanceStats = {
      frameCount: 0,
      lastFrameTime: 0,
      averageFrameTime: 0,
      textEffectsRendered: 0,
      animationsActive: 0,
    };
  }

  /**
   * Enhanced text rendering with effects
   * @param {string} text - Text to render
   * @param {number[]} position - [x, y] position
   * @param {number[]} color - RGBA color array
   * @param {Object} options - Rendering options
   * @param {string} options.alignment - 'left', 'center', 'right'
   * @param {Object} options.effects - Text effects to apply
   * @param {boolean} options.effects.shadow - Enable shadow effect
   * @param {boolean} options.effects.outline - Enable outline effect
   * @param {boolean} options.effects.gradient - Enable gradient effect
   * @param {number} options.effects.shadowOffset - Shadow offset in pixels
   * @param {number[]} options.effects.shadowColor - Shadow color
   * @param {number[]} options.effects.outlineColor - Outline color
   * @param {number} options.effects.outlineWidth - Outline width
   */
  async drawTextEnhanced(text, position, color, options = {}) {
    const { alignment = 'left', effects = {} } = options;
    const [x, y] = position;

    // Apply effects in correct order: shadow -> outline -> gradient -> text
    if (effects.shadow) {
      await this._drawTextShadow(text, [x, y], color, alignment, effects);
    }

    if (effects.outline) {
      await this._drawTextOutline(text, [x, y], color, alignment, effects);
    }

    if (effects.gradient) {
      await this._drawTextGradient(text, [x, y], color, alignment, effects);
    } else {
      // Standard text rendering
      await this.device.drawText(text, [x, y], color, alignment);
    }

    this.performanceStats.textEffectsRendered++;
  }

  /**
   * Draw text with shadow effect
   * @private
   */
  async _drawTextShadow(text, position, color, alignment, effects) {
    const [x, y] = position;
    const shadowOffset = effects.shadowOffset || 1;
    const shadowColor = effects.shadowColor || [0, 0, 0, 180]; // Semi-transparent black

    // Draw shadow first
    await this.device.drawText(
      text,
      [x + shadowOffset, y + shadowOffset],
      shadowColor,
      alignment,
    );
  }

  /**
   * Draw text with outline effect
   * @private
   */
  async _drawTextOutline(text, position, color, alignment, effects) {
    const [x, y] = position;
    const outlineColor = effects.outlineColor || [0, 0, 0, 255];
    const outlineWidth = effects.outlineWidth || 1;

    // Draw outline by rendering text multiple times around the main text
    for (let dx = -outlineWidth; dx <= outlineWidth; dx++) {
      for (let dy = -outlineWidth; dy <= outlineWidth; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip center (main text position)
        await this.device.drawText(
          text,
          [x + dx, y + dy],
          outlineColor,
          alignment,
        );
      }
    }
  }

  /**
   * Draw text with gradient effect (simple vertical gradient)
   * @private
   */
  async _drawTextGradient(text, position, baseColor, alignment /* effects */) {
    const [x, y] = position;
    const [r, g, b, a] = baseColor;

    // Create a subtle gradient by drawing text with slightly different colors
    // Top: darker, Middle: normal, Bottom: brighter (dark to bright)
    const colors = [
      [Math.max(0, r - 40), Math.max(0, g - 40), Math.max(0, b - 40), a], // Darker top
      [r, g, b, a], // Normal middle
      [Math.min(255, r + 30), Math.min(255, g + 30), Math.min(255, b + 30), a], // Brighter bottom
    ];

    // Calculate text dimensions for backdrop calculation
    const textWidth = text.length * 4; // Approximate character width
    const textHeight = 7; // Standard text height

    // Draw backdrop for each gradient layer to ensure all text is visible
    for (let i = 0; i < colors.length; i++) {
      const layerY = y + i;
      // Draw semi-transparent backdrop behind each gradient layer
      await this.device.fillRect(
        [x - 1, layerY], // Slight offset for better coverage
        [textWidth + 2, textHeight], // Width + padding, standard height
        [0, 0, 0, Math.round(a * 0.3)], // Semi-transparent black backdrop
      );
    }

    // Now draw the gradient text layers on top of the backdrops
    for (let i = 0; i < colors.length; i++) {
      await this.device.drawText(text, [x, y + i], colors[i], alignment);
    }
  }

  /**
   * Draw image with blend mode (Photoshop-style multiply)
   * @param {string} imagePath - Path to image file
   * @param {number[]} position - [x, y] position
   * @param {number[]} size - [width, height] size
   * @param {number} alpha - Alpha value (0-255)
   * @param {string} blendMode - Blend mode: 'normal', 'multiply'
   */
  async drawImageBlended(
    imagePath,
    position,
    size,
    alpha = 255,
    blendMode = 'normal',
  ) {
    if (blendMode === 'multiply') {
      // Photoshop-style multiply blend mode for images without alpha channels
      // Treats black pixels as transparent (multiply with background)
      // Non-black pixels are drawn with normal alpha

      try {
        // For multiply effect on images with black backgrounds:
        // 1. Draw a black rectangle where the image will be (background for multiply)
        // 2. Draw the image with reduced alpha to simulate the multiply effect
        // This creates the illusion that black pixels are "transparent"

        const [x, y] = position;
        const [width, height] = size;

        // Draw black background for multiply effect
        await this.device.fillRect([x, y], [width, height], [0, 0, 0, alpha]);

        // Draw image with reduced alpha to blend with the black background
        // This simulates multiply: dark pixels stay dark, light pixels show through
        const multiplyAlpha = Math.round(alpha * 0.8);
        await this.device.drawImage(imagePath, position, size, multiplyAlpha);
      } catch (error) {
        this._addError(
          `Failed to draw image with multiply blend: ${error.message}`,
        );
      }
    } else {
      // Normal blend mode
      await this.device.drawImage(imagePath, position, size, alpha);
    }
  }

  /**
   * Start a fade transition
   * @param {number} duration - Fade duration in milliseconds
   * @param {number} fromOpacity - Starting opacity (0-1)
   * @param {number} toOpacity - Ending opacity (0-1)
   * @param {Function} onComplete - Callback when fade completes
   */
  startFadeTransition(
    duration,
    fromOpacity = 0,
    toOpacity = 1,
    onComplete = null,
  ) {
    this.fadeState = {
      active: true,
      startTime: Date.now(),
      duration: Math.max(200, duration), // Minimum 200ms for visibility
      fromOpacity,
      toOpacity,
      currentOpacity: fromOpacity,
      onComplete,
    };

    this.performanceStats.animationsActive++;
    logger.debug(
      `🎬 [${this.host}] Started fade transition: ${fromOpacity} → ${toOpacity} over ${duration}ms`,
    );
  }

  /**
   * Update fade transition (call this each frame)
   * @returns {number} Current opacity (0-1)
   */
  updateFadeTransition() {
    if (!this.fadeState.active) {
      return 1; // Default to fully visible
    }

    const elapsed = Date.now() - this.fadeState.startTime;
    const progress = Math.min(1, elapsed / this.fadeState.duration);

    // Hardware-aware easing: linear for 4-5fps (smooth enough)
    this.fadeState.currentOpacity =
      this.fadeState.fromOpacity +
      (this.fadeState.toOpacity - this.fadeState.fromOpacity) * progress;

    if (progress >= 1) {
      // Fade complete
      this.fadeState.active = false;
      if (this.fadeState.onComplete) {
        this.fadeState.onComplete();
      }
      this.performanceStats.animationsActive = Math.max(
        0,
        this.performanceStats.animationsActive - 1,
      );
      logger.debug(`🎬 [${this.host}] Fade transition completed`);
    }

    return this.fadeState.currentOpacity;
  }

  /**
   * Check if fade transition is active
   * @returns {boolean} True if fade is in progress
   */
  isFadeActive() {
    return this.fadeState.active;
  }

  /**
   * Render a simple gradient background
   * @param {number[]} startColor - Starting color [r, g, b, a]
   * @param {number[]} endColor - Ending color [r, g, b, a]
   * @param {string} direction - 'vertical' or 'horizontal'
   */
  async drawGradientBackground(startColor, endColor, direction = 'vertical') {
    const [startR, startG, startB, startA] = startColor;
    const [endR, endG, endB, endA] = endColor;

    if (direction === 'vertical') {
      // Vertical gradient
      for (let y = 0; y < 64; y++) {
        const factor = y / 63; // 0 to 1
        const r = Math.round(startR + (endR - startR) * factor);
        const g = Math.round(startG + (endG - startG) * factor);
        const b = Math.round(startB + (endB - startB) * factor);
        const a = Math.round(startA + (endA - startA) * factor);

        // Draw horizontal line at this Y position
        await this.device.fillRect([0, y], [64, 1], [r, g, b, a]);
      }
    } else {
      // Horizontal gradient
      for (let x = 0; x < 64; x++) {
        const factor = x / 63; // 0 to 1
        const r = Math.round(startR + (endR - startR) * factor);
        const g = Math.round(startG + (endG - startG) * factor);
        const b = Math.round(startB + (endB - startB) * factor);
        const a = Math.round(startA + (endA - startA) * factor);

        // Draw vertical line at this X position
        await this.device.fillRect([x, 0], [1, 64], [r, g, b, a]);
      }
    }
  }

  /**
   * Hardware-aware animation easing
   * Optimized for 4-5fps display updates
   * @param {number} t - Time parameter (0-1)
   * @param {string} easing - Easing function type
   * @returns {number} Eased value
   */
  ease(t, easing = 'linear') {
    switch (easing) {
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return 1 - (1 - t) * (1 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'bounce': {
        // Simple bounce optimized for low frame rates
        const bounceT = t * 4;
        if (bounceT < 1) return bounceT * bounceT;
        if (bounceT < 2) return 1 - (bounceT - 1) * (bounceT - 1);
        if (bounceT < 3) return 1 - (bounceT - 2) * (bounceT - 2) * 0.5;
        return 1 - (bounceT - 3) * (bounceT - 3) * 0.25;
      }
      case 'linear':
      default:
        return t; // Linear for hardware compatibility
    }
  }

  /**
   * Animate a value over time with easing
   * @param {number} startValue - Starting value
   * @param {number} endValue - Ending value
   * @param {number} duration - Animation duration in milliseconds
   * @param {string} easing - Easing function type
   * @param {Function} onUpdate - Callback with current value
   * @param {Function} onComplete - Callback when animation completes
   * @returns {Function} Stop function to cancel animation
   */
  animateValue(
    startValue,
    endValue,
    duration,
    easing = 'linear',
    onUpdate,
    onComplete,
  ) {
    const startTime = Date.now();
    let isRunning = true;

    this.performanceStats.animationsActive++;

    // Return stop function
    const stopAnimation = () => {
      isRunning = false;
      this.performanceStats.animationsActive = Math.max(
        0,
        this.performanceStats.animationsActive - 1,
      );
    };

    // Start the animation loop (but don't block)
    const runAnimation = () => {
      if (!isRunning) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = this.ease(progress, easing);

      const currentValue = startValue + (endValue - startValue) * easedProgress;

      if (onUpdate) {
        onUpdate(currentValue, progress);
      }

      if (progress >= 1) {
        // Animation complete
        if (onComplete) {
          onComplete(endValue);
        }
        isRunning = false;
        this.performanceStats.animationsActive = Math.max(
          0,
          this.performanceStats.animationsActive - 1,
        );
      } else {
        // Continue animation (in a real implementation, this would be called by a game loop)
        setTimeout(runAnimation, 16); // ~60fps, but will be limited by hardware
      }
    };

    runAnimation(); // Start the animation

    return stopAnimation;
  }

  /**
   * Preload and cache resources
   * @param {string[]} resourcePaths - Array of resource paths to preload
   */
  async preloadResources(resourcePaths) {
    const promises = resourcePaths.map(async (path) => {
      try {
        // For now, just validate the path exists
        // In a full implementation, this would load and cache images
        if (this.resourceCache.has(path)) {
          return this.resourceCache.get(path);
        }

        // Placeholder: mark as cached
        this.resourceCache.set(path, { loaded: true, path });
        logger.debug(`📦 [${this.host}] Preloaded resource: ${path}`);

        return { loaded: true, path };
      } catch (error) {
        logger.warn(
          `⚠️ [${this.host}] Failed to preload resource ${path}: ${error.message}`,
        );
        return null;
      }
    });

    await Promise.all(promises);
    logger.info(
      `📦 [${this.host}] Preloaded ${resourcePaths.length} resources`,
    );
  }

  /**
   * Clear resource cache
   */
  clearResourceCache() {
    const cacheSize = this.resourceCache.size;
    this.resourceCache.clear();
    logger.debug(
      `🧹 [${this.host}] Cleared resource cache (${cacheSize} items)`,
    );
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      fadeActive: this.fadeState.active,
      cacheSize: this.resourceCache.size,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset performance statistics
   */
  resetPerformanceStats() {
    this.performanceStats = {
      frameCount: 0,
      lastFrameTime: 0,
      averageFrameTime: 0,
      textEffectsRendered: 0,
      animationsActive: 0,
    };
  }

  /**
   * Clean shutdown
   */
  shutdown() {
    this.clearResourceCache();
    this.fadeState.active = false;
    this.resetPerformanceStats();
    logger.info(`🛑 [${this.host}] Graphics engine shut down`);
  }
}

module.exports = GraphicsEngine;
