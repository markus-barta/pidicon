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
  }

  async render(context) {
    this.frameCount++;

    // Update fade transition
    const opacity = this.graphicsEngine.updateFadeTransition();

    // Clear screen with gradient background
    await this._drawBackground(opacity);

    // Update demo phase
    const framesInPhase = this.frameCount - this.phaseStartFrame;
    if (framesInPhase >= this.phaseDuration) {
      this.demoPhase = (this.demoPhase + 1) % 4;
      this.phaseStartFrame = this.frameCount;
      logger.debug(
        `🎨 [${context.device.host}] Switching to demo phase ${this.demoPhase}`,
      );
    }

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

    // Performance info (bottom right)
    await this._drawPerformanceInfo();

    return 200; // ~5fps
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

    await this.graphicsEngine.drawGradientBackground(
      topColor,
      bottomColor,
      'vertical',
    );
  }

  async _renderTextEffects(opacity) {
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

    // Combined effects (shadow + outline)
    await this.graphicsEngine.drawTextEnhanced(
      'COMBO',
      [32, 44],
      [255, 100, 255, alpha],
      {
        alignment: 'center',
        effects: {
          shadow: true,
          outline: true,
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

    // Horizontal gradient demo (smaller area)
    for (let x = 0; x < 32; x++) {
      const factor = x / 31;
      const r = Math.round(255 * factor);
      const g = Math.round(255 * (1 - factor));
      const b = 100;
      await this.graphicsEngine.device.fillRect(
        [32 + x, 30],
        [1, 16],
        [r, g, b, alpha],
      );
    }

    await this.graphicsEngine.drawTextEnhanced(
      'HORIZONTAL',
      [48, 38],
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

    // Bouncing ball animation
    this.bounceY += this.bounceSpeed * this.bounceDirection;

    if (this.bounceY >= 52 || this.bounceY <= 20) {
      this.bounceDirection *= -1;
    }

    // Draw "ball" as a filled circle (using pixels)
    const ballX = 32;
    const ballY = Math.round(this.bounceY);
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (dx * dx + dy * dy <= 9) {
          // Circle equation
          const x = ballX + dx;
          const y = ballY + dy;
          if (x >= 0 && x < 64 && y >= 0 && y < 64) {
            await this.graphicsEngine.device.drawPixel(
              [x, y],
              [255, 200, 100, alpha],
            );
          }
        }
      }
    }

    // Color cycling text
    this.hue = (this.hue + 2) % 360;
    const rainbowColor = this._hslToRgb(this.hue / 360, 0.8, 0.6);

    await this.graphicsEngine.drawTextEnhanced(
      'RAINBOW',
      [32, 48],
      [...rainbowColor, alpha],
      {
        alignment: 'center',
        effects: { outline: true, outlineColor: [255, 255, 255, alpha] },
      },
    );

    // Easing demo - moving text
    const easeProgress = this.graphicsEngine.ease(phaseProgress, 'easeInOut');
    const easedX = 10 + easeProgress * 44;

    await this.graphicsEngine.drawTextEnhanced(
      'EASE',
      [Math.round(easedX), 56],
      [200, 255, 200, alpha],
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
    // Small performance counter (bottom right)
    await this.graphicsEngine.device.drawText(
      `F:${this.frameCount}`,
      [50, 58],
      [150, 150, 150, 180],
      'left',
    );
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

module.exports = GraphicsEngineDemoScene;
