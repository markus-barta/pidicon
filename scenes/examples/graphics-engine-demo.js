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
    this.demoPhase = 0; // 0: text effects, 1: gradients, 2: animations, 3: images, 4: fade out
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
    this.bounceSpeed = 2.0; // Faster bouncing
    this.hue = 0;
    this.rainbowX = 10; // For rainbow text movement
    this.rotateAngle = 0; // For rotating text effects

    // Performance tracking for FPS/frametime display
    this.lastFrameTime = Date.now();
    this.frameTimes = [];
    this.fpsHistory = [];
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
  }

  _setupImagesPhase() {
    // Reset moon animation
    this.moonPhase = 0;
    this.moonAngle = 0;
  }

  _setupFadeOutPhase() {
    // Start fade out transition - longer duration for better effect
    this.graphicsEngine.startFadeTransition(3000, 1, 0);
  }

  async render(context) {
    const currentTime = Date.now();
    this.frameCount++;

    // Track frame time for performance monitoring
    const frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameTimes.push(frameTime);

    // Keep only last 30 frame times for averaging
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }

    // Calculate FPS
    const avgFrameTime =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = Math.round(1000 / avgFrameTime);

    // Debug: Log every 30 frames to avoid spam
    if (this.frameCount % 30 === 1) {
      logger.debug(
        `🎨 [${context.device.host}] GFX Demo render frame ${this.frameCount}, phase ${this.demoPhase}, FPS: ${fps}, FrameTime: ${Math.round(avgFrameTime)}ms`,
      );
    }

    // Update fade transition
    const opacity = this.graphicsEngine.updateFadeTransition();

    // Clear screen with gradient background
    await this._drawBackground(opacity);

    // Add global transparency overlay for depth
    if (this.demoPhase !== 4) {
      // Skip during fade out
      await context.device.fillRect(
        [0, 0],
        [64, 64],
        [0, 0, 0, Math.round(10 * opacity)],
      );
    }

    // Update demo phase (moonphase takes twice as long)
    const framesInPhase = this.frameCount - this.phaseStartFrame;
    const currentPhaseDuration =
      this.demoPhase === 3 ? this.phaseDuration * 2 : this.phaseDuration;
    if (framesInPhase >= currentPhaseDuration) {
      this.demoPhase = (this.demoPhase + 1) % 5;
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
          this._setupImagesPhase();
          break;
        case 4:
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
          await this._renderImages(opacity);
          break;
        case 4:
          await this._renderFadeOut(opacity);
          break;
      }

      // Performance info now in bottom bar

      // Draw FPS/frametime display (semi-transparent overlay)
      await this._drawPerformanceMetrics(fps, avgFrameTime);

      // Push frame to display
      await context.device.push('graphics_engine_demo', context.publishOk);

      return 0; // Adaptive timing - render as soon as possible (~5fps max)
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
      [32, 33], // Moved up 5px from y=38
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

    // Moving rainbow text across screen (opposite direction of squares)
    this.rainbowX -= 1.5;
    if (this.rainbowX < -20) this.rainbowX = 50;

    // Draw rainbow background stripes for visibility
    for (let i = 0; i < 6; i++) {
      const stripeHue = ((this.hue + i * 60) % 360) / 360;
      const stripeColor = this._hslToRgb(stripeHue, 0.8, 0.5);
      await this.graphicsEngine.device.fillRect(
        [Math.round(this.rainbowX) + i * 8, 38], // Moved 8px up from y=46
        [6, 6],
        [...stripeColor, alpha],
      );
    }

    await this.graphicsEngine.drawTextEnhanced(
      'RAINBOW',
      [Math.round(this.rainbowX + 20), 40], // Moved 8px up from y=48
      [...rainbowColor, Math.round(alpha * 0.5)], // 50% transparent text
      {
        alignment: 'center',
        effects: {
          outline: true,
          outlineColor: [255, 255, 255, Math.round(alpha * 0.5)],
        }, // 50% transparent white outline
      },
    );

    // Easing demo - faster moving text
    const easeProgress = this.graphicsEngine.ease(phaseProgress, 'easeInOut');
    const easedX = 5 + easeProgress * 54;

    await this.graphicsEngine.drawTextEnhanced(
      'SMOOTH',
      [Math.round(easedX), 52], // Moved up from y=56 to avoid bottom bar at y=58+
      [150, 255, 150, alpha],
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );

    // Rotating text effect - simulate rotation by positioning around center
    this.rotateAngle += 0.1; // Slow rotation
    const rotateRadius = 20;
    const rotateX = Math.round(32 + Math.cos(this.rotateAngle) * rotateRadius);
    const rotateY = Math.round(32 + Math.sin(this.rotateAngle) * rotateRadius);

    await this.graphicsEngine.drawTextEnhanced(
      'TURN',
      [rotateX, rotateY],
      [255, 255, 150, Math.round(alpha * 0.8)],
      {
        alignment: 'center',
        effects: {
          outline: true,
          outlineColor: [150, 150, 0, Math.round(alpha * 0.6)],
        },
      },
    );

    // Add floating transparent particles for atmosphere
    for (let i = 0; i < 5; i++) {
      const particleX = Math.round(
        32 + Math.sin(this.frameCount * 0.05 + i * 1.3) * 25,
      );
      const particleY = Math.round(
        20 + Math.cos(this.frameCount * 0.03 + i * 0.8) * 15,
      );
      const particleAlpha = Math.round(
        60 * opacity * (0.3 + Math.sin(this.frameCount * 0.1 + i) * 0.2),
      );

      await this.graphicsEngine.device.fillRect(
        [particleX, particleY],
        [2, 2],
        [200, 220, 255, particleAlpha],
      );
    }
  }

  async _drawPerformanceMetrics(fps, avgFrameTime) {
    try {
      // Draw ultra-compact bottom bar: "4,9/204ms #12345"
      // Reserve bottom 7 pixels for black bar (y=57-63) containing all stats

      // Draw black background bar at bottom (7px height, starting at y=57)
      await this.graphicsEngine.device.fillRect(
        [0, 57],
        [64, 7],
        [0, 0, 0, 255],
      );

      // Format ultra-compact display: "fps,decimal/frametime ms #framecount"
      const fpsValue = 1000 / avgFrameTime; // Calculate actual FPS with decimals
      const fpsInt = Math.floor(fpsValue);
      const fpsDecimal = Math.floor((fpsValue % 1) * 10); // Always 1 decimal, never rounds up
      const frametimeMs = Math.round(avgFrameTime);

      // Color for frametime based on performance
      let msColor;
      if (frametimeMs <= 200)
        msColor = [100, 255, 100]; // Green for <=200ms
      else if (frametimeMs <= 300)
        msColor = [255, 255, 100]; // Yellow for 200-300ms
      else msColor = [255, 100, 100]; // Red for >300ms

      let x = 1; // 1px to the right
      const y = 58; // 1px up from previous 59
      const darkGray = [100, 100, 100, 255];

      // FPS with decimal: "4,9/"
      await this.graphicsEngine.device.drawText(
        `${fpsInt},${fpsDecimal}/`,
        [x, y],
        [255, 255, 255, 255],
        'left',
      );
      x += 4 * 4 + 1; // "4,9/" width + 1px gap

      // Frametime: "204ms"
      const msVal = `${frametimeMs}`;
      await this.graphicsEngine.device.drawText(
        msVal,
        [x, y],
        [msColor[0], msColor[1], msColor[2], 255],
        'left',
      );
      x += msVal.length * 4; // frametime width
      await this.graphicsEngine.device.drawText('ms', [x, y], darkGray, 'left');
      x += 2 * 4 + 2; // 'ms' width + 2px gap

      // Frame counter: " #12345" (right-aligned)
      const frameText = ` #${this.frameCount.toString().padStart(5, '0')}`;
      const frameX = 64 - frameText.length * 4; // Right-aligned, adjusted for new position
      await this.graphicsEngine.device.drawText(
        frameText,
        [frameX, y],
        [200, 200, 200, 255],
        'left',
      );
    } catch (error) {
      logger.error(`🎨 GFX Demo performance metrics error: ${error.message}`);
    }
  }

  async _renderImages(opacity) {
    const alpha = Math.round(255 * opacity);

    // Title with transparency effect
    await this.graphicsEngine.drawTextEnhanced(
      'IMAGES',
      [32, 8],
      [255, 255, 255, alpha],
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );

    // Animated celestial display (moon phases + sun)
    const totalFrames = 26 + 3; // 26 moon phases + 3 sun variations
    const currentFrame = this.frameCount % totalFrames;

    let imagePath, imageSize;
    if (currentFrame < 26) {
      // Moon phases (0-25)
      imagePath = `scenes/media/moonphase/5x5/Moon_${currentFrame.toString().padStart(2, '0')}.png`;
      imageSize = [5, 5];
    } else {
      // Sun images (26-28)
      const sunIndex = currentFrame - 26;
      if (sunIndex === 0) {
        imagePath = 'scenes/media/sun.png';
        imageSize = [16, 16]; // Assuming sun.png is larger
      } else if (sunIndex === 1) {
        imagePath = 'scenes/media/circle-sun.gif';
        imageSize = [16, 16]; // Assuming circle-sun.gif is larger
      } else {
        imagePath = 'scenes/media/circle-sun.gif'; // Repeat for longer display
        imageSize = [16, 16];
      }
    }

    // Circular celestial movement with transparency
    this.moonAngle += 0.05; // Slow rotation
    const celestialX = Math.round(32 + Math.cos(this.moonAngle) * 18);
    const celestialY = Math.round(32 + Math.sin(this.moonAngle) * 12);

    try {
      // Draw celestial object with shadow for depth
      await this.graphicsEngine.drawImageBlended(
        imagePath,
        [celestialX + 1, celestialY + 1],
        imageSize,
        Math.round(80 * opacity), // Semi-transparent shadow
        'normal', // Normal blend for shadow
      );

      // Draw main celestial image with multiply blend mode
      // This treats black background as transparent (Photoshop multiply effect)
      await this.graphicsEngine.drawImageBlended(
        imagePath,
        [celestialX, celestialY],
        imageSize,
        alpha,
        'multiply', // Multiply blend mode (no black background visible)
      );

      // Show celestial info with transparency
      let infoText;
      if (currentFrame < 26) {
        infoText = `Moon:${currentFrame}`;
      } else {
        const sunIndex = currentFrame - 26;
        const sunType = sunIndex === 0 ? 'Static' : 'Circle';
        infoText = `${sunType} Sun`;
      }
      await this.graphicsEngine.device.drawText(
        infoText,
        [32, 50],
        [180, 180, 255, Math.round(200 * opacity)],
        'center',
      );
    } catch {
      // Fallback if image loading fails
      await this.graphicsEngine.device.drawText(
        '🌙 MOON',
        [32, 32],
        [200, 200, 255, alpha],
        'center',
      );
    }

    // Add some transparent overlay effects
    for (let i = 0; i < 3; i++) {
      const waveX = Math.round(32 + Math.sin(this.frameCount * 0.1 + i) * 25);
      const waveY = Math.round(20 + i * 8);
      await this.graphicsEngine.device.fillRect(
        [waveX, waveY],
        [3, 2],
        [100, 150, 255, Math.round(100 * opacity)],
      );
    }
  }

  async _renderFadeOut(opacity) {
    const alpha = Math.round(255 * opacity);

    // Simple, clear fade out - no complex effects that make text invisible
    await this.graphicsEngine.drawTextEnhanced(
      'FADE OUT',
      [32, 16], // Clear position, not too high
      [255, 255, 255, alpha],
      {
        alignment: 'center',
        effects: {
          shadow: true,
          shadowColor: [0, 0, 0, Math.round(alpha * 0.8)], // Strong shadow
        },
      },
    );

    // Clear, visible GOODBYE text throughout entire fade
    await this.graphicsEngine.drawTextEnhanced(
      'GOODBYE',
      [32, 40], // Fixed position, clearly visible
      [255, 100, 100, alpha], // Red text, full alpha throughout
      {
        alignment: 'center',
        effects: {
          shadow: true,
          shadowColor: [100, 0, 0, Math.round(alpha * 0.6)],
          outline: true,
          outlineColor: [150, 50, 50, alpha],
        },
      },
    );

    // If this is the last phase and fade is complete, prepare for restart
    const fadeComplete = !this.graphicsEngine.isFadeActive() && opacity < 0.1;
    if (
      this.frameCount - this.phaseStartFrame >= this.phaseDuration - 10 &&
      fadeComplete
    ) {
      // Restart demo after fade out is complete
      this.demoPhase = 0;
      this.phaseStartFrame = this.frameCount;
      this.graphicsEngine.startFadeTransition(500, 0, 1);
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
