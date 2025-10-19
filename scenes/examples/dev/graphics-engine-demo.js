/**
 * @fileoverview Graphics Engine Demo Scene
 * @description Demonstrates text effects, fade transitions, gradients, and animations
 * Hardware-aware implementation for 4-5fps Pixoo display
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const path = require('path');
const GraphicsEngine = require(
  path.join(__dirname, '../../../lib/graphics-engine'),
);

// Configuration constants
const GFX_DEMO_CONFIG = {
  // Display dimensions
  DISPLAY: {
    WIDTH: 64,
    HEIGHT: 64,
    CENTER_X: 32,
    CENTER_Y: 32,
  },

  // Demo phases
  PHASES: {
    TEXT_EFFECTS: 0,
    GRADIENTS: 1,
    ANIMATIONS: 2,
    IMAGES: 3,
    FADE_OUT: 4,
  },

  // Timing and animation
  TIMING: {
    PHASE_DURATION_FRAMES: 60, // ~12 seconds at 5fps
    FADE_IN_DURATION_MS: 1000,
    FADE_OUT_DURATION_MS: 3000,
    FRAME_TIME_HISTORY_SIZE: 10,
  },

  // Text effects phase
  TEXT_EFFECTS: {
    TITLE_POSITION: [32, 8], // "TEXT EFFECTS" title
    SHADOW_POSITION: [32, 20], // (not used in current code)
    OUTLINE_POSITION: [32, 20], // "OUTLINE" text
    GRADIENT_POSITION: [32, 32], // "GRADIENT" text
    COMBO_POSITION: [32, 44], // "COMBO" text
    TITLE_COLOR: [255, 255, 255], // White (alpha will be added)
    SHADOW_COLOR: [100, 50, 0], // Brown (for outline)
    OUTLINE_COLOR: [255, 200, 100], // Orange
    GRADIENT_COLOR: [100, 200, 255], // Light blue
    COMBO_COLOR: [255, 100, 255], // Magenta
    COMBO_OUTLINE_COLOR: [60, 20, 100], // Dark purple for combo outline
  },

  // Gradients phase
  GRADIENTS: {
    TITLE_POSITION: [32, 8],
    VERTICAL_POSITION: [32, 20],
    HORIZONTAL_TEXT_POSITION: [32, 33], // "H-RGB" text position
    HORIZONTAL_GRADIENT_START_X: 8, // Start position for horizontal gradient
    HORIZONTAL_GRADIENT_Y: 30, // Y position for horizontal gradient
    HORIZONTAL_WIDTH: 48,
    TITLE_COLOR: [255, 255, 255], // White (alpha will be added)
    VERTICAL_TEXT_COLOR: [255, 255, 255], // White (alpha will be added)
    HORIZONTAL_TEXT_COLOR: [255, 255, 255], // White (alpha will be added)
    VERTICAL_GRADIENT: {
      START: [255, 0, 0, 255], // Red top
      END: [0, 0, 255, 255], // Blue bottom
    },
    HORIZONTAL_GRADIENT: {
      START: [255, 0, 255, 255], // Magenta left
      END: [0, 255, 255, 255], // Cyan right
    },
  },

  // Animations phase
  ANIMATIONS: {
    TITLE_POSITION: [32, 8],
    SMOOTH_POSITION: [32, 52],
    RAINBOW_POSITION: [32, 40],
    BOUNCE_AREA: {
      MIN_Y: 24,
      MAX_Y: 48,
      START_Y: 32,
    },
    BOUNCE_SPEED: 2.0,
    RAINBOW_TEXT: {
      START_X: -20,
      END_X: 50,
      SPEED: 1.5,
    },
    COLORFUL_BOXES: {
      START_X: 10,
      END_X: 50,
      SPEED: 1.5,
      STRIPE_COUNT: 6,
      STRIPE_WIDTH: 6,
      STRIPE_HEIGHT: 6,
      SATURATION: 0.8,
      VALUE: 0.5,
    },
    HUE_INCREMENT: 5,
    TITLE_COLOR: [255, 255, 255, 255],
    SMOOTH_COLOR: [200, 200, 200, 255],
    BOUNCE_COLOR: [255, 100, 100, 255],
    TRAIL_COLOR: [100, 100, 255, 150],
    BALL_SIZE: 4,
  },

  // Images phase
  IMAGES: {
    TITLE_POSITION: [32, 8],
    INFO_POSITION: [32, 50],
    MOON: {
      RADIUS: 18,
      SIZE: [5, 5],
      PHASE_COUNT: 26,
      ANGLE_INCREMENT: 0.05,
    },
    SUN: {
      RADIUS: 18,
      SIZE: [9, 9],
      ANGLE_INCREMENT: 0.05,
      ORBIT_OFFSET: Math.PI, // Opposite side of moon
    },
    TITLE_COLOR: [255, 255, 255, 255],
    INFO_COLOR: [180, 180, 255, 200],
  },

  // Fade out phase
  FADE_OUT: {
    GOODBYE_POSITION: [32, 40],
    FADE_OUT_POSITION: [32, 16],
    SPARKLE_COUNT: 5,
    SPARKLE_SPEED: 0.2,
    WAVE_BAR_COUNT: 3,
    GOODBYE_COLOR: [255, 255, 255, 255],
    FADE_OUT_COLOR: [255, 255, 255, 255],
  },

  // Performance display
  PERFORMANCE: {
    BAR_HEIGHT: 7,
    BAR_Y: 57,
    TEXT_Y: 58,
    FPS_COLORS: {
      GOOD: [100, 255, 100], // Green for <=200ms
      MEDIUM: [255, 255, 100], // Yellow for 200-300ms
      BAD: [255, 100, 100], // Red for >300ms
    },
    THRESHOLDS: {
      GOOD_MS: 200,
      MEDIUM_MS: 300,
    },
    DARK_GRAY: [100, 100, 100, 255],
  },

  // Colors
  COLORS: {
    BLACK: [0, 0, 0, 255],
    WHITE: [255, 255, 255, 255],
    TRANSPARENT_BLACK: [0, 0, 0, 120],
    SEMI_TRANSPARENT_BLACK: [0, 0, 0, 150],
  },

  // Animation parameters
  ANIMATION: {
    GLOBAL_OVERLAY_ALPHA: 25, // 10% transparency
    PARTICLE_COUNT: 5,
    PARTICLE_SIZE: 2,
    ROTATING_TEXT_RADIUS: 15,
    ROTATING_TEXT_SPEED: 0.05,
  },
};

class GraphicsEngineDemoScene {
  constructor() {
    this.name = 'graphics_engine_demo';
    this.frameCount = 0;
    this.graphicsEngine = null;

    // Demo state - using config constants
    this.demoPhase = GFX_DEMO_CONFIG.PHASES.TEXT_EFFECTS;
    this.phaseStartFrame = 0;
    this.phaseDuration = GFX_DEMO_CONFIG.TIMING.PHASE_DURATION_FRAMES;

    // Animation variables - using config constants
    this.bounceY = GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_AREA.START_Y;
    this.bounceDirection = 1;
    this.bounceSpeed = GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_AREA.START_Y; // Will be set properly in setup

    // Color cycling
    this.hue = 0;
  }

  async init(context) {
    // Initialize graphics engine
    this.graphicsEngine = new GraphicsEngine(context.device);

    // Preload any resources (placeholder for now)
    await this.graphicsEngine.preloadResources([
      'scenes/media/moonphase/5x5/Moon_00.png', // Example resource
    ]);

    // Start with fade in - using config constants
    this.graphicsEngine.startFadeTransition(
      GFX_DEMO_CONFIG.TIMING.FADE_IN_DURATION_MS,
      0,
      1,
    );

    this.frameCount = 0;
    this.demoPhase = GFX_DEMO_CONFIG.PHASES.TEXT_EFFECTS;
    this.phaseStartFrame = 0;

    // Animation state - using config constants
    this.bounceY = GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_AREA.START_Y;
    this.bounceDirection = 1;
    this.bounceSpeed = GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_SPEED;
    this.hue = 0;
    this.rainbowX = GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.START_X;
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
    // Reset animation state - using config constants
    this.bounceY = GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_AREA.START_Y;
    this.bounceDirection = 1;
    this.bounceSpeed = GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_SPEED;
    this.hue = 0;
    this.rainbowX = GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.START_X;
    this.rainbowTextX = GFX_DEMO_CONFIG.ANIMATIONS.RAINBOW_TEXT.START_X;
  }

  _setupImagesPhase() {
    // Reset moon animation
    this.moonPhase = 0;
    this.moonAngle = 0;
  }

  _setupFadeOutPhase() {
    // Start fade out transition - using config constants
    this.graphicsEngine.startFadeTransition(
      GFX_DEMO_CONFIG.TIMING.FADE_OUT_DURATION_MS,
      1,
      0,
    );
  }

  async render(context) {
    const currentTime = Date.now();
    this.frameCount++;

    // Track frame time for performance monitoring
    const frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameTimes.push(frameTime);

    // Keep only configured frame times for averaging - using config constants
    if (
      this.frameTimes.length > GFX_DEMO_CONFIG.TIMING.FRAME_TIME_HISTORY_SIZE
    ) {
      this.frameTimes.shift();
    }

    // Calculate FPS
    const avgFrameTime =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = Math.round(1000 / avgFrameTime);

    // Debug logging disabled

    // Update fade transition
    const opacity = this.graphicsEngine.updateFadeTransition();

    // Clear screen with gradient background
    await this._drawBackground(opacity);

    // Add global transparency overlay for depth - using config constants
    if (this.demoPhase !== GFX_DEMO_CONFIG.PHASES.FADE_OUT) {
      // Skip during fade out
      await context.device.fillRect(
        [0, 0],
        [GFX_DEMO_CONFIG.DISPLAY.WIDTH, GFX_DEMO_CONFIG.DISPLAY.HEIGHT],
        [
          0,
          0,
          0,
          Math.round(GFX_DEMO_CONFIG.ANIMATION.GLOBAL_OVERLAY_ALPHA * opacity),
        ],
      );
    }

    // Update demo phase (moonphase takes twice as long) - using config constants
    const framesInPhase = this.frameCount - this.phaseStartFrame;
    const currentPhaseDuration =
      this.demoPhase === GFX_DEMO_CONFIG.PHASES.IMAGES
        ? this.phaseDuration * 2
        : this.phaseDuration;
    if (framesInPhase >= currentPhaseDuration) {
      this.demoPhase = (this.demoPhase + 1) % 5;
      this.phaseStartFrame = this.frameCount;

      // Switch configurations for each phase - using config constants
      switch (this.demoPhase) {
        case GFX_DEMO_CONFIG.PHASES.TEXT_EFFECTS:
          this._setupTextEffectsPhase();
          break;
        case GFX_DEMO_CONFIG.PHASES.GRADIENTS:
          this._setupGradientsPhase();
          break;
        case GFX_DEMO_CONFIG.PHASES.ANIMATIONS:
          this._setupAnimationsPhase();
          break;
        case GFX_DEMO_CONFIG.PHASES.IMAGES:
          this._setupImagesPhase();
          break;
        case GFX_DEMO_CONFIG.PHASES.FADE_OUT:
          this._setupFadeOutPhase();
          break;
      }
    }

    try {
      // Render current demo phase - using config constants
      switch (this.demoPhase) {
        case GFX_DEMO_CONFIG.PHASES.TEXT_EFFECTS:
          await this._renderTextEffects(opacity);
          break;
        case GFX_DEMO_CONFIG.PHASES.GRADIENTS:
          await this._renderGradients(opacity);
          break;
        case GFX_DEMO_CONFIG.PHASES.ANIMATIONS:
          await this._renderAnimations(opacity);
          break;
        case GFX_DEMO_CONFIG.PHASES.IMAGES:
          await this._renderImages(opacity);
          break;
        case GFX_DEMO_CONFIG.PHASES.FADE_OUT:
          await this._renderFadeOut(opacity);
          break;
      }

      // Performance info now in bottom bar

      // Draw FPS/frametime display (semi-transparent overlay)
      await this._drawPerformanceMetrics(fps, avgFrameTime);

      // Push frame to display
      await context.device.push('graphics_engine_demo', context.publishOk);

      return 0; // Adaptive timing - render as soon as possible (~5fps max)
    } catch {
      // logger.error(`🎨 GFX Demo render error: ${error.message}`);

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

    // Debug: Log background drawing (disabled)

    try {
      await this.graphicsEngine.drawGradientBackground(
        topColor,
        bottomColor,
        'vertical',
      );
      if (this.frameCount % 60 === 1) {
        // logger.debug(`🎨 GFX Demo background drawn successfully`);
      }
    } catch {
      // logger.error(`🎨 GFX Demo background draw error: ${error.message}`);
    }
  }

  async _renderTextEffects(opacity) {
    // context is available from the parent render method
    const phaseProgress =
      (this.frameCount - this.phaseStartFrame) / this.phaseDuration;
    const alpha = Math.round(255 * opacity);

    // Title with shadow - using config constants
    await this.graphicsEngine.drawTextEnhanced(
      'TEXT EFFECTS',
      GFX_DEMO_CONFIG.TEXT_EFFECTS.TITLE_POSITION,
      [...GFX_DEMO_CONFIG.TEXT_EFFECTS.TITLE_COLOR, alpha],
      {
        alignment: 'center',
        effects: {
          shadow: true,
          shadowOffset: 1,
          shadowColor: GFX_DEMO_CONFIG.COLORS.SEMI_TRANSPARENT_BLACK,
        },
      },
    );

    // Outlined text (animated) - using config constants
    const outlineWidth = Math.floor(phaseProgress * 3);
    await this.graphicsEngine.drawTextEnhanced(
      'OUTLINE',
      GFX_DEMO_CONFIG.TEXT_EFFECTS.OUTLINE_POSITION,
      [...GFX_DEMO_CONFIG.TEXT_EFFECTS.OUTLINE_COLOR, alpha],
      {
        alignment: 'center',
        effects: {
          outline: true,
          outlineColor: [...GFX_DEMO_CONFIG.TEXT_EFFECTS.SHADOW_COLOR, alpha],
          outlineWidth: outlineWidth,
        },
      },
    );

    // Gradient text - using config constants
    await this.graphicsEngine.drawTextEnhanced(
      'GRADIENT',
      GFX_DEMO_CONFIG.TEXT_EFFECTS.GRADIENT_POSITION,
      [...GFX_DEMO_CONFIG.TEXT_EFFECTS.GRADIENT_COLOR, alpha],
      {
        alignment: 'center',
        effects: {
          gradient: true,
        },
      },
    );

    // Combined effects (shadow + outline + gradient) - using config constants
    await this.graphicsEngine.drawTextEnhanced(
      'COMBO',
      GFX_DEMO_CONFIG.TEXT_EFFECTS.COMBO_POSITION,
      [...GFX_DEMO_CONFIG.TEXT_EFFECTS.COMBO_COLOR, alpha],
      {
        alignment: 'center',
        effects: {
          shadow: true,
          outline: true,
          gradient: true,
          outlineColor: [
            ...GFX_DEMO_CONFIG.TEXT_EFFECTS.COMBO_OUTLINE_COLOR,
            alpha,
          ],
        },
      },
    );
  }

  async _renderGradients(opacity) {
    const alpha = Math.round(255 * opacity);

    // Title - using config constants
    await this.graphicsEngine.drawTextEnhanced(
      'GRADIENTS',
      GFX_DEMO_CONFIG.GRADIENTS.TITLE_POSITION,
      [...GFX_DEMO_CONFIG.GRADIENTS.TITLE_COLOR, alpha],
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );

    // Vertical gradient demo - using config constants
    await this.graphicsEngine.drawGradientBackground(
      [...GFX_DEMO_CONFIG.GRADIENTS.VERTICAL_GRADIENT.START.slice(0, 3), alpha],
      [...GFX_DEMO_CONFIG.GRADIENTS.VERTICAL_GRADIENT.END.slice(0, 3), alpha],
      'vertical',
    );

    // Add some text over the gradient - using config constants
    await this.graphicsEngine.drawTextEnhanced(
      'VERTICAL',
      GFX_DEMO_CONFIG.GRADIENTS.VERTICAL_POSITION,
      [...GFX_DEMO_CONFIG.GRADIENTS.VERTICAL_TEXT_COLOR, alpha],
      {
        alignment: 'center',
        effects: {
          outline: true,
          outlineColor: [...GFX_DEMO_CONFIG.COLORS.BLACK.slice(0, 3), alpha],
        },
      },
    );

    // Horizontal gradient demo - using config constants
    for (let x = 0; x < GFX_DEMO_CONFIG.GRADIENTS.HORIZONTAL_WIDTH; x++) {
      const factor = x / (GFX_DEMO_CONFIG.GRADIENTS.HORIZONTAL_WIDTH - 1);
      const r = Math.round(255 * factor);
      const g = Math.round(255 * (1 - factor));
      const b = 100;
      await this.graphicsEngine.device.fillRect(
        [
          GFX_DEMO_CONFIG.GRADIENTS.HORIZONTAL_GRADIENT_START_X + x,
          GFX_DEMO_CONFIG.GRADIENTS.HORIZONTAL_GRADIENT_Y,
        ],
        [1, 16],
        [r, g, b, alpha],
      );
    }

    await this.graphicsEngine.drawTextEnhanced(
      'H-RGB',
      GFX_DEMO_CONFIG.GRADIENTS.HORIZONTAL_TEXT_POSITION,
      [...GFX_DEMO_CONFIG.GRADIENTS.HORIZONTAL_TEXT_COLOR, alpha],
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

    // Title - using config constants
    await this.graphicsEngine.drawTextEnhanced(
      'ANIMATIONS',
      GFX_DEMO_CONFIG.ANIMATIONS.TITLE_POSITION,
      GFX_DEMO_CONFIG.ANIMATIONS.TITLE_COLOR.map((c) =>
        c === 255 ? alpha : c,
      ),
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );

    // Bouncing ball animation - using config constants
    this.bounceY +=
      GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_SPEED * this.bounceDirection;

    if (
      this.bounceY >= GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_AREA.MAX_Y ||
      this.bounceY <= GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_AREA.MIN_Y
    ) {
      this.bounceDirection *= -1;
    }

    // Draw "ball" as a filled circle with glow effect - using config constants
    const ballX = GFX_DEMO_CONFIG.DISPLAY.CENTER_X;
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

    // Rainbow color cycling - using config constants
    this.hue = (this.hue + GFX_DEMO_CONFIG.ANIMATIONS.HUE_INCREMENT) % 360;
    const rainbowColor = this._hslToRgb(this.hue / 360, 0.9, 0.7);

    // Moving colorful squares right-to-left (rtl) - using config constants
    this.rainbowX -= GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.SPEED;
    if (this.rainbowX < GFX_DEMO_CONFIG.ANIMATIONS.RAINBOW_TEXT.START_X)
      this.rainbowX = GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.END_X;

    // Moving rainbow text left-to-right (ltr) - opposite direction - using config constants
    if (!this.rainbowTextX)
      this.rainbowTextX = GFX_DEMO_CONFIG.ANIMATIONS.RAINBOW_TEXT.START_X;
    this.rainbowTextX += GFX_DEMO_CONFIG.ANIMATIONS.RAINBOW_TEXT.SPEED;
    if (this.rainbowTextX > GFX_DEMO_CONFIG.ANIMATIONS.RAINBOW_TEXT.END_X)
      this.rainbowTextX = GFX_DEMO_CONFIG.ANIMATIONS.RAINBOW_TEXT.START_X;

    // Draw rainbow background stripes for visibility - using config constants
    for (
      let i = 0;
      i < GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.STRIPE_COUNT;
      i++
    ) {
      const stripeHue = ((this.hue + i * 60) % 360) / 360;
      const stripeColor = this._hslToRgb(
        stripeHue,
        GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.SATURATION,
        GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.VALUE,
      );
      await this.graphicsEngine.device.fillRect(
        [
          Math.round(this.rainbowX) +
            i * GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.STRIPE_WIDTH,
          GFX_DEMO_CONFIG.ANIMATIONS.RAINBOW_POSITION[1] - 2,
        ],
        [
          GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.STRIPE_WIDTH,
          GFX_DEMO_CONFIG.ANIMATIONS.COLORFUL_BOXES.STRIPE_HEIGHT,
        ],
        [...stripeColor, alpha],
      );
    }

    await this.graphicsEngine.drawTextEnhanced(
      'RAINBOW',
      [
        Math.round(this.rainbowTextX),
        GFX_DEMO_CONFIG.ANIMATIONS.RAINBOW_POSITION[1],
      ], // Independent ltr movement
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
    } catch {
      // logger.error(`🎨 GFX Demo performance metrics error: ${error.message}`);
    }
  }

  async _renderImages(opacity) {
    const alpha = Math.round(255 * opacity);

    // Title with transparency effect - using config constants
    await this.graphicsEngine.drawTextEnhanced(
      'IMAGES',
      GFX_DEMO_CONFIG.IMAGES.TITLE_POSITION,
      GFX_DEMO_CONFIG.IMAGES.TITLE_COLOR.map((c) => (c === 255 ? alpha : c)),
      {
        alignment: 'center',
        effects: { shadow: true },
      },
    );

    // Separate moon and sun animations - sun moves opposite to moon - using config constants
    const moonFrame = this.frameCount % GFX_DEMO_CONFIG.IMAGES.MOON.PHASE_COUNT;
    const moonImagePath = `scenes/media/moonphase/5x5/Moon_${moonFrame.toString().padStart(2, '0')}.png`;

    // Sun animation - static image (not animated) - using config constants
    const sunImagePath = 'scenes/media/sun.png';
    const sunImageSize = GFX_DEMO_CONFIG.IMAGES.SUN.SIZE;

    // Moon movement (clockwise) - using config constants
    this.moonAngle += GFX_DEMO_CONFIG.IMAGES.MOON.ANGLE_INCREMENT;
    const moonX = Math.round(
      GFX_DEMO_CONFIG.DISPLAY.CENTER_X +
        Math.cos(this.moonAngle) * GFX_DEMO_CONFIG.IMAGES.MOON.RADIUS,
    );
    const moonY = Math.round(
      GFX_DEMO_CONFIG.DISPLAY.CENTER_Y +
        Math.sin(this.moonAngle) * GFX_DEMO_CONFIG.IMAGES.MOON.RADIUS,
    );

    // Sun movement (clockwise, same direction as moon but positioned opposite) - using config constants
    this.sunAngle =
      (this.sunAngle || 0) + GFX_DEMO_CONFIG.IMAGES.SUN.ANGLE_INCREMENT;
    // Position sun opposite to moon by adding π (180 degrees) to angle
    const sunX = Math.round(
      GFX_DEMO_CONFIG.DISPLAY.CENTER_X +
        Math.cos(this.sunAngle + GFX_DEMO_CONFIG.IMAGES.SUN.ORBIT_OFFSET) *
          GFX_DEMO_CONFIG.IMAGES.SUN.RADIUS,
    );
    const sunY = Math.round(
      GFX_DEMO_CONFIG.DISPLAY.CENTER_Y +
        Math.sin(this.sunAngle + GFX_DEMO_CONFIG.IMAGES.SUN.ORBIT_OFFSET) *
          GFX_DEMO_CONFIG.IMAGES.SUN.RADIUS,
    );

    try {
      // Draw moon with shadow
      await this.graphicsEngine.drawImageBlended(
        moonImagePath,
        [moonX + 1, moonY + 1],
        [5, 5],
        Math.round(80 * opacity),
        'normal',
      );
      await this.graphicsEngine.drawImageBlended(
        moonImagePath,
        [moonX, moonY],
        [5, 5],
        alpha,
        'multiply',
      );

      // Draw sun with shadow (opposite position)
      await this.graphicsEngine.drawImageBlended(
        sunImagePath,
        [sunX + 1, sunY + 1],
        sunImageSize,
        Math.round(80 * opacity),
        'normal',
      );
      await this.graphicsEngine.drawImageBlended(
        sunImagePath,
        [sunX, sunY],
        sunImageSize,
        alpha,
        'multiply',
      );

      // Show info
      const moonInfo = `Moon:${moonFrame}`;

      await this.graphicsEngine.device.drawText(
        moonInfo,
        [32, 50],
        [180, 180, 255, Math.round(200 * opacity)],
        'center',
      );
    } catch {
      // Fallback
      await this.graphicsEngine.device.drawText(
        '🌙 MOON ☀️ SUN',
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

  async _renderFadeOut(/* opacity */) {
    // Calculate fade progress (0 to 1 over the phase duration)
    const phaseProgress =
      (this.frameCount - this.phaseStartFrame) / this.phaseDuration;
    const fadeProgress = Math.min(1, phaseProgress * 1.5); // Fade over first 2/3 of phase

    // Everything fades out based on fadeProgress
    const alpha = Math.round(255 * (1 - fadeProgress));

    if (alpha > 0) {
      // Only draw elements while they have opacity
      await this.graphicsEngine.drawTextEnhanced(
        'FADE OUT',
        [32, 16],
        [255, 255, 255, alpha],
        {
          alignment: 'center',
          effects: {
            shadow: true,
            shadowColor: [0, 0, 0, Math.round(alpha * 0.8)],
          },
        },
      );

      // GOODBYE text that fades out
      await this.graphicsEngine.drawTextEnhanced(
        'GOODBYE',
        [32, 40],
        [255, 100, 100, alpha],
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

      // Add some final sparkle effects that also fade
      if (fadeProgress < 0.7) {
        for (let i = 0; i < 5; i++) {
          const sparkleX = Math.round(
            32 + Math.sin(this.frameCount * 0.2 + i * 1.3) * 20,
          );
          const sparkleY = Math.round(
            25 + Math.cos(this.frameCount * 0.15 + i * 0.8) * 15,
          );
          const sparkleAlpha = Math.round(alpha * 0.6 * (1 - fadeProgress));

          if (sparkleAlpha > 10) {
            await this.graphicsEngine.device.fillRect(
              [sparkleX, sparkleY],
              [2, 2],
              [255, 255, 200, sparkleAlpha],
            );
          }
        }
      }
    }

    // Clear the screen completely when fade is done
    if (fadeProgress >= 1) {
      await this.graphicsEngine.device.clear();
    }

    // Check if phase is complete and restart
    if (this.frameCount - this.phaseStartFrame >= this.phaseDuration) {
      // Restart demo
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

  async cleanup() {
    // Cleanup graphics engine demo
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

module.exports = {
  name,
  render,
  init,
  cleanup,
  wantsLoop,
  metadata: {
    phases: ['Text Effects', 'Gradients', 'Animations', 'Images', 'Fade Out'],
    phaseDuration: 60, // frames per phase (~12s at 5fps)
    features: [
      'Text rendering with shadows and outlines',
      'Vertical and horizontal gradients',
      'Bounce animations and rainbow effects',
      'Image loading and display',
    ],
    description:
      "Showcases advanced graphics capabilities with stunning visual effects. Watch text shadows, bouncing animations, rainbow gradients, and smooth transitions. Cycles through 5 different demo phases every 12 seconds - perfect for admiring the display's rendering power and testing visual quality.",
  },
};
