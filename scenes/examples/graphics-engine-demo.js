/**
 * @fileoverview Graphics Engine Demo Scene
 * @description Demonstrates text effects, fade transitions, gradients, and animations
 * Hardware-aware implementation for 4-5fps Pixoo display
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const GraphicsEngine = require('../../lib/graphics-engine');
const logger = require('../../lib/logger');

class GraphicsEngineDemoScene {
  constructor() {
    this.name = 'graphics_engine_demo';
    this.frameCount = 0;
    this.graphicsEngine = null;

    // Demo state
    this.demoPhase = 0; // 0: text effects, 1: gradients, 2: animations, 3: fade out
    this.phaseStartFrame = 0;
    this.phaseDuration = 60; // ~12 seconds at 5fps

    // Animation variables
    this.bounceY = 32;
    this.bounceDirection = 1;
    this.bounceSpeed = 0.8;

    // Color cycling
    this.hue = 0;
  }

  async init(context) {
    logger.info(
      `🎨 [${context.device.host}] Initializing Graphics Engine Demo`,
    );

    // Initialize graphics engine
    this.graphicsEngine = new GraphicsEngine(context.device);

    // Preload any resources (placeholder for now)
    await this.graphicsEngine.preloadResources([
      'scenes/media/moonphase/5x5/Moon_00.png', // Example resource
    ]);

    // Start with fade in
    this.graphicsEngine.startFadeTransition(1000, 0, 1);

    this.frameCount = 0;
    this.demoPhase = 0;
    this.phaseStartFrame = 0;

    // Animation state
    this.bounceY = 32;
    this.bounceDirection = 1;
    // Animation state
    this.bounceY = 32;
    this.bounceDirection = 1;
    this.bounceSpeed = 2.0; // Faster bouncing
    this.hue = 0;
    this.rainbowX = 10; // For rainbow text movement
  }

  _setupTextEffectsPhase() {
    // No special setup needed
  }

  _setupGradientsPhase() {
    // No special setup needed
  }

  _setupAnimationsPhase() {
    // Reset animation state
    this.bounceY = 32;
    this.bounceDirection = 1;
    this.hue = 0;
    this.rainbowX = 10;
    this.rainbowX = 10;
    // Start fade out transition
    this.graphicsEngine.startFadeTransition(2000, 1, 0);
  }

  async render(context) {
    this.frameCount++;

    // Debug: Log every 30 frames to avoid spam
    if (this.frameCount % 30 === 1) {
      logger.debug(
        `🎨 [${context.device.host}] GFX Demo render frame ${this.frameCount}, phase ${this.demoPhase}`,
      );
    }

    // Update fade transition
    const opacity = this.graphicsEngine.updateFadeTransition();

    // Clear screen with gradient background
    await this._drawBackground(opacity);

    // Update demo phase
    const framesInPhase = this.frameCount - this.phaseStartFrame;
    if (framesInPhase >= this.phaseDuration) {
      this.demoPhase = (this.demoPhase + 1) % 4;
      this.phaseStartFrame = this.frameCount;

      // Switch configurations for each phase
      switch (this.demoPhase) {
        case 0:
          this._setupTextEffectsPhase();
          break;
        case 1:
          this._setupGradientsPhase();
          break;
        case 2:
          this._setupAnimationsPhase();
          break;
        case 3:
          this._setupFadeOutPhase();
          break;
      }

      logger.debug(
        `🎨 [${context.device.host}] GFX Demo phase ${this.demoPhase}`,
      );
    }

    try {
      // Render current demo phase
      switch (this.demoPhase) {
        case 0:
          await this._renderTextEffects(opacity);
          break;
        case 1:
          await this._renderGradients(opacity);
          break;
        case 2:
          await this._renderAnimations(opacity);
          break;
        case 3:
          await this._renderFadeOut(opacity);
          break;
      }

      // Draw UI elements (performance info)
      await this._drawPerformanceInfo();

      // Push frame to display
      await context.device.push('graphics_engine_demo', context.publishOk);

      return 200; // ~5fps
    } catch (error) {
      logger.error(`🎨 GFX Demo render error: ${error.message}`);

      // Fallback display
      await context.device.clear();
      await context.device.drawText(
        'GFX ERROR',
        [32, 32],
        [255, 0, 0, 255],
        'center',
      );
      await context.device.push('graphics_engine_demo', context.publishOk);

      return 1000;
    }
  }

  async _drawBackground(opacity) {
    // Create a subtle animated gradient background
    const topColor = [
      Math.round(20 + Math.sin(this.frameCount * 0.02) * 10),
      Math.round(20 + Math.cos(this.frameCount * 0.03) * 10),
      Math.round(40 + Math.sin(this.frameCount * 0.01) * 20),
      Math.round(255 * opacity),
    ];

    const bottomColor = [
      Math.round(10 + Math.sin(this.frameCount * 0.025) * 5),
      Math.round(10 + Math.cos(this.frameCount * 0.035) * 5),
      Math.round(20 + Math.sin(this.frameCount * 0.015) * 10),
      Math.round(255 * opacity),
    ];

    // Debug: Log background drawing
    if (this.frameCount % 60 === 1) {
      logger.debug(
        `🎨 [${this.graphicsEngine.device?.host || 'unknown'}] GFX Demo drawing background`,
      );
    }

    try {
      await this.graphicsEngine.drawGradientBackground(
        topColor,
        bottomColor,
        'vertical',
      );
      if (this.frameCount % 60 === 1) {
        logger.debug(`🎨 GFX Demo background drawn successfully`);
      }
    } catch (error) {
      logger.error(`🎨 GFX Demo background draw error: ${error.message}`);
    }
  }

  async _renderTextEffects(opacity) {
    // context is available from the parent render method
    const phaseProgress =
      (this.frameCount - this.phaseStartFrame) / this.phaseDuration;
    const alpha = Math.round(255 * opacity);

    // Title with shadow
    await this.graphicsEngine.drawTextEnhanced(
      'TEXT EFFECTS',
      [32, 8],
      [255, 255, 255, alpha],
      {
        alignment: 'center',
        effects: {
          shadow: true,
          shadowOffset: 1,
          shadowColor: [0, 0, 0, Math.round(150 * opacity)],
        },
      },
    );

    // Outlined text (animated)
    const outlineWidth = Math.floor(phaseProgress * 2) + 1;
    await this.graphicsEngine.drawTextEnhanced(
      'OUTLINE',
      [32, 20],
      [255, 200, 100, alpha],
      {
        alignment: 'center',
        effects: {
          outline: true,
          outlineColor: [100, 50, 0, alpha],
          outlineWidth: outlineWidth,
        },
      },
    );

    // Gradient text
    await this.graphicsEngine.drawTextEnhanced(
      'GRADIENT',
      [32, 32],
      [100, 200, 255, alpha],
      {
        alignment: 'center',
        effects: {
          gradient: true,
        },
      },
    );

    // Combined effects (shadow + outline + gradient)
    await this.graphicsEngine.drawTextEnhanced(
      'COMBO',
      [32, 44],
      [255, 100, 255, alpha],
      {
        alignment: 'center',
        effects: {
          shadow: true,
          outline: true,
          gradient: true,
          outlineColor: [100, 0, 100, alpha],
        },
      },
    );
  }

  async _renderGradients(opacity) {
    const alpha = Math.round(255 * opacity);

    // Title
    await this.graphicsEngine.drawTextEnhanced(
      'GRADIENTS',
      [32, 8],
      [255, 255, 255, alpha],
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );

    // Vertical gradient demo
    await this.graphicsEngine.drawGradientBackground(
      [255, 0, 0, alpha], // Red top
      [0, 0, 255, alpha], // Blue bottom
      'vertical',
    );

    // Add some text over the gradient
    await this.graphicsEngine.drawTextEnhanced(
      'VERTICAL',
      [32, 20],
      [255, 255, 255, alpha],
      {
        alignment: 'center',
        effects: { outline: true, outlineColor: [0, 0, 0, alpha] },
      },
    );

    // Horizontal gradient demo (moved more left, full width)
    for (let x = 0; x < 48; x++) {
      const factor = x / 47;
      const r = Math.round(255 * factor);
      const g = Math.round(255 * (1 - factor));
      const b = 100;
      await this.graphicsEngine.device.fillRect(
        [8 + x, 30],
        [1, 16],
        [r, g, b, alpha],
      );
    }

    await this.graphicsEngine.drawTextEnhanced(
      'H-RGB',
      [32, 38],
      [255, 255, 255, alpha],
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );
  }

  async _renderAnimations(opacity) {
    const alpha = Math.round(255 * opacity);
    const phaseProgress =
      (this.frameCount - this.phaseStartFrame) / this.phaseDuration;

    // Title
    await this.graphicsEngine.drawTextEnhanced(
      'ANIMATIONS',
      [32, 8],
      [255, 255, 255, alpha],
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );

    // Bouncing ball animation - faster and more visible
    this.bounceY += this.bounceSpeed * this.bounceDirection;

    if (this.bounceY >= 48 || this.bounceY <= 24) {
      this.bounceDirection *= -1;
    }

    // Draw "ball" as a filled circle with glow effect
    const ballX = 32;
    const ballY = Math.round(this.bounceY);

    // Draw glow/trail effect (semi-transparent)
    for (let dx = -5; dx <= 5; dx++) {
      for (let dy = -5; dy <= 5; dy++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 5 && distance > 3) {
          const x = ballX + dx;
          const y = ballY + dy;
          if (x >= 0 && x < 64 && y >= 0 && y < 64) {
            const glowAlpha = Math.round(alpha * (1 - (distance - 3) / 2));
            await this.graphicsEngine.device.drawPixel(
              [x, y],
              [255, 150, 50, glowAlpha],
            );
          }
        }
      }
    }

    // Draw main ball
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (dx * dx + dy * dy <= 9) {
          // Circle equation
          const x = ballX + dx;
          const y = ballY + dy;
          if (x >= 0 && x < 64 && y >= 0 && y < 64) {
            await this.graphicsEngine.device.drawPixel(
              [x, y],
              [255, 220, 100, alpha],
            );
          }
        }
      }
    }

    // Rainbow color cycling - faster and more visible
    this.hue = (this.hue + 5) % 360; // Faster cycling
    const rainbowColor = this._hslToRgb(this.hue / 360, 0.9, 0.7);

    // Moving rainbow text across screen
    this.rainbowX += 1.5;
    if (this.rainbowX > 50) this.rainbowX = -20;

    // Draw rainbow background stripes for visibility
    for (let i = 0; i < 6; i++) {
      const stripeHue = ((this.hue + i * 60) % 360) / 360;
      const stripeColor = this._hslToRgb(stripeHue, 0.8, 0.5);
      await this.graphicsEngine.device.fillRect(
        [Math.round(this.rainbowX) + i * 8, 46],
        [6, 6],
        [...stripeColor, alpha],
      );
    }

    await this.graphicsEngine.drawTextEnhanced(
      'RAINBOW',
      [Math.round(this.rainbowX + 20), 48],
      [...rainbowColor, alpha],
      {
        alignment: 'center',
        effects: { outline: true, outlineColor: [255, 255, 255, alpha] },
      },
    );

    // Easing demo - faster moving text
    const easeProgress = this.graphicsEngine.ease(phaseProgress, 'easeInOut');
    const easedX = 5 + easeProgress * 54;

    await this.graphicsEngine.drawTextEnhanced(
      'SMOOTH',
      [Math.round(easedX), 56],
      [150, 255, 150, alpha],
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );
  }

  async _renderFadeOut(opacity) {
    const alpha = Math.round(255 * opacity);

    // Title
    await this.graphicsEngine.drawTextEnhanced(
      'FADE OUT',
      [32, 8],
      [255, 255, 255, alpha],
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );

    // Pulsing elements
    const pulse = Math.sin(this.frameCount * 0.2) * 0.5 + 0.5;
    const pulseAlpha = Math.round(255 * opacity * pulse);

    await this.graphicsEngine.drawTextEnhanced(
      'GOODBYE',
      [32, 32],
      [255, 100, 100, pulseAlpha],
      {
        alignment: 'center',
        effects: {
          shadow: true,
          outline: true,
          outlineColor: [100, 0, 0, pulseAlpha],
        },
      },
    );

    // If this is the last phase, prepare for restart
    if (this.frameCount - this.phaseStartFrame >= this.phaseDuration - 10) {
      // Restart demo
      this.demoPhase = 0;
      this.phaseStartFrame = this.frameCount;
      this.graphicsEngine.startFadeTransition(500, 0, 1);
    }
  }

  async _drawPerformanceInfo() {
    // Debug: Log frame push
    if (this.frameCount % 30 === 1) {
      logger.debug(`🎨 GFX Demo pushing frame ${this.frameCount}`);
    }

    try {
      // Better positioned frame counter with background
      const frameText = `F:${this.frameCount.toString().padStart(3, '0')}`;

      // Draw semi-transparent background for readability
      await this.graphicsEngine.device.fillRect(
        [45, 56],
        [19, 8],
        [0, 0, 0, 150],
      );

      // Draw frame counter
      await this.graphicsEngine.device.drawText(
        frameText,
        [46, 57],
        [200, 200, 200, 255],
        'left',
      );

      if (this.frameCount % 30 === 1) {
        logger.debug(`🎨 GFX Demo text drawn successfully`);
      }
    } catch (error) {
      logger.error(`🎨 GFX Demo performance info error: ${error.message}`);
    }
  }

  // Helper: Convert HSL to RGB
  _hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  async cleanup(context) {
    logger.info(`🧹 [${context.device.host}] Cleaning up Graphics Engine Demo`);

    if (this.graphicsEngine) {
      this.graphicsEngine.shutdown();
      this.graphicsEngine = null;
    }
  }
}

// Create scene instance and export in standard format
const scene = new GraphicsEngineDemoScene();
const name = scene.name;
const render = (context) => scene.render(context);
const init = (context) => scene.init(context);
const cleanup = (context) => scene.cleanup(context);
const wantsLoop = true;

module.exports = { name, render, init, cleanup, wantsLoop };
