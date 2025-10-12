/**
 * @fileoverview Pixoo Showcase - Comprehensive Feature Demo
 * @description A creative demonstration of all Pixoo daemon capabilities:
 * - Static & animated graphics
 * - Text effects (outline, shadow, gradient)
 * - Gradients (linear, radial, multi-stop)
 * - Animations (bounce, fade, rainbow, particle effects)
 * - Image rendering
 * - Performance metrics display
 *
 * Perfect for demonstrating the system or testing new hardware!
 *
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const fs = require('fs');
const path = require('path');

const GraphicsEngine = require('../../lib/graphics-engine');

// Scene phases - each shows different capabilities
const PHASES = {
  INTRO: 0, // Welcome screen with fade-in
  TEXT_EFFECTS: 1, // Outline, shadow, gradient text
  GRADIENTS: 2, // Linear, radial, multi-stop gradients
  ANIMATIONS: 3, // Bounce, rainbow, particles
  IMAGES: 4, // Image rendering with effects
  PERFORMANCE: 5, // FPS and system metrics
  OUTRO: 6, // Fade out to finish
};

const PHASE_DURATION = 80; // ~16 seconds per phase at 5fps
const FADE_DURATION = 20; // ~4 seconds fade

module.exports = {
  name: 'pixoo_showcase',
  description: '🎨 Comprehensive showcase of all Pixoo daemon features',
  category: 'Demo',
  wantsLoop: true,

  async init(context) {
    // Scene initialization (called once when scene starts)
    context.setState('initialized', false);
    context.setState('phase', PHASES.INTRO);
    context.setState('frame', 0);
    context.setState('startTime', Date.now());
  },

  async render(context) {
    const { device, getState, setState } = context;
    const gfx = new GraphicsEngine();

    // Initialize state
    if (!getState('initialized')) {
      setState('phase', PHASES.INTRO);
      setState('frame', 0);
      setState('startTime', Date.now());
      setState('initialized', true);
    }

    const phase = getState('phase');
    const frame = getState('frame');

    // Clear screen
    device.clear();

    // Render current phase
    switch (phase) {
      case PHASES.INTRO:
        renderIntro(device, gfx, frame);
        break;
      case PHASES.TEXT_EFFECTS:
        renderTextEffects(device, gfx, frame);
        break;
      case PHASES.GRADIENTS:
        renderGradients(device, gfx, frame);
        break;
      case PHASES.ANIMATIONS:
        renderAnimations(device, gfx, frame);
        break;
      case PHASES.IMAGES:
        renderImages(device, gfx, frame);
        break;
      case PHASES.PERFORMANCE:
        renderPerformance(device, gfx, frame, context);
        break;
      case PHASES.OUTRO:
        renderOutro(device, gfx, frame);
        break;
    }

    // Advance frame and check for phase transition
    setState('frame', frame + 1);
    if (frame >= PHASE_DURATION) {
      setState('frame', 0);
      const nextPhase = (phase + 1) % Object.keys(PHASES).length;
      setState('phase', nextPhase);

      // Loop back to intro after outro
      if (nextPhase === PHASES.INTRO) {
        setState('startTime', Date.now());
      }
    }

    // Push to device
    await device.push('pixoo_showcase', context.publishOk);

    return 200; // ~5fps for smooth animations
  },

  async cleanup(context) {
    // Scene cleanup (called when switching away from scene)
    context.setState('initialized', false);
  },
};

// ============================================================================
// PHASE 1: INTRO - Welcome screen with fade-in
// ============================================================================
function renderIntro(device, gfx, frame) {
  const fadeProgress = Math.min(frame / FADE_DURATION, 1);

  // Background gradient (dark blue to black)
  for (let y = 0; y < 64; y++) {
    const color = [0, 0, Math.floor(50 * (1 - y / 64) * fadeProgress), 255];
    for (let x = 0; x < 64; x++) {
      device.drawPixel([x, y], color);
    }
  }

  // Title with fade-in
  const titleAlpha = Math.floor(255 * fadeProgress);
  gfx.drawText(device, 'PIXOO', [32, 20], {
    color: [255, 200, 0, titleAlpha],
    fontSize: 2,
    align: 'center',
    outline: { width: 1, color: [100, 50, 0, titleAlpha] },
  });

  gfx.drawText(device, 'SHOWCASE', [32, 35], {
    color: [200, 200, 255, titleAlpha],
    fontSize: 1,
    align: 'center',
  });

  // Animated dots
  const dots = '...';
  const dotsToShow = Math.floor(frame / 10) % 4;
  gfx.drawText(device, dots.substring(0, dotsToShow), [32, 48], {
    color: [150, 150, 150, titleAlpha],
    fontSize: 1,
    align: 'center',
  });
}

// ============================================================================
// PHASE 2: TEXT EFFECTS - Showcase text rendering capabilities
// ============================================================================
function renderTextEffects(device, gfx, frame) {
  // Dark background
  device.fillRect([0, 0], [64, 64], [10, 10, 20, 255]);

  // Title
  gfx.drawText(device, 'TEXT FX', [32, 5], {
    color: [255, 255, 255, 255],
    fontSize: 1,
    align: 'center',
  });

  // Outline text (breathing effect)
  const breathe = Math.sin(frame * 0.1) * 0.3 + 0.7;
  const outlineAlpha = Math.floor(255 * breathe);
  gfx.drawText(device, 'OUTLINE', [32, 18], {
    color: [255, 200, 100, outlineAlpha],
    fontSize: 1,
    align: 'center',
    outline: { width: 1, color: [100, 50, 0, outlineAlpha] },
  });

  // Shadow text
  gfx.drawText(device, 'SHADOW', [32, 30], {
    color: [100, 200, 255, 255],
    fontSize: 1,
    align: 'center',
    shadow: { offset: [2, 2], color: [20, 40, 50, 200] },
  });

  // Gradient text (animated hue shift)
  const hueShift = (frame * 2) % 360;
  const [r, g, b] = hsvToRgb(hueShift / 360, 0.8, 1.0);
  gfx.drawText(device, 'GRADIENT', [32, 42], {
    color: [r, g, b, 255],
    fontSize: 1,
    align: 'center',
  });

  // Combined effects (pulsing)
  const pulse = Math.sin(frame * 0.15) * 0.4 + 0.6;
  const pulseAlpha = Math.floor(255 * pulse);
  gfx.drawText(device, 'COMBO', [32, 54], {
    color: [255, 100, 255, pulseAlpha],
    fontSize: 1,
    align: 'center',
    outline: { width: 1, color: [60, 20, 100, pulseAlpha] },
    shadow: { offset: [1, 1], color: [20, 10, 30, Math.floor(150 * pulse)] },
  });
}

// ============================================================================
// PHASE 3: GRADIENTS - Showcase gradient rendering
// ============================================================================
function renderGradients(device, gfx, frame) {
  // Clear background
  device.fillRect([0, 0], [64, 64], [5, 5, 5, 255]);

  // Title
  gfx.drawText(device, 'GRADIENTS', [32, 5], {
    color: [255, 255, 255, 255],
    fontSize: 1,
    align: 'center',
  });

  // Linear gradient (animated)
  const gradientOffset = Math.sin(frame * 0.05) * 10;
  gfx.drawGradient(device, {
    type: 'linear',
    start: [10, 15 + gradientOffset],
    end: [54, 25 + gradientOffset],
    colors: [
      { pos: 0, color: [255, 0, 0, 255] },
      { pos: 0.5, color: [255, 255, 0, 255] },
      { pos: 1, color: [0, 255, 0, 255] },
    ],
    rect: [
      [10, 15],
      [44, 10],
    ],
  });

  // Radial gradient (pulsing)
  const radius = 8 + Math.sin(frame * 0.1) * 3;
  gfx.drawGradient(device, {
    type: 'radial',
    center: [32, 40],
    radius,
    colors: [
      { pos: 0, color: [255, 200, 255, 255] },
      { pos: 0.6, color: [100, 50, 200, 200] },
      { pos: 1, color: [20, 10, 50, 100] },
    ],
    rect: [
      [20, 28],
      [24, 24],
    ],
  });

  // Multi-stop vertical gradient
  for (let y = 50; y < 62; y++) {
    const progress = (y - 50) / 12;
    const [r, g, b] = hsvToRgb(progress, 1.0, 1.0);
    for (let x = 10; x < 54; x++) {
      device.drawPixel([x, y], [r, g, b, 255]);
    }
  }
}

// ============================================================================
// PHASE 4: ANIMATIONS - Showcase animation capabilities
// ============================================================================
function renderAnimations(device, gfx, frame) {
  // Animated background (scrolling gradient)
  const bgOffset = frame % 64;
  for (let y = 0; y < 64; y++) {
    const hue = ((y + bgOffset) * 5) % 360;
    const [r, g, b] = hsvToRgb(hue / 360, 0.3, 0.2);
    for (let x = 0; x < 64; x++) {
      device.drawPixel([x, y], [r, g, b, 255]);
    }
  }

  // Title
  gfx.drawText(device, 'ANIMATE', [32, 5], {
    color: [255, 255, 255, 255],
    fontSize: 1,
    align: 'center',
    shadow: { offset: [1, 1], color: [0, 0, 0, 150] },
  });

  // Bouncing ball
  const bounceY = 20 + Math.abs(Math.sin(frame * 0.15)) * 15;
  const ballSize = 4;
  for (let dy = -ballSize; dy <= ballSize; dy++) {
    for (let dx = -ballSize; dx <= ballSize; dx++) {
      if (dx * dx + dy * dy <= ballSize * ballSize) {
        device.drawPixel([15 + dx, bounceY + dy], [255, 100, 100, 255]);
      }
    }
  }

  // Rainbow moving text
  const rainbowX = -20 + ((frame * 0.8) % 90);
  const rainbowHue = (frame * 5) % 360;
  const [rr, rg, rb] = hsvToRgb(rainbowHue / 360, 1.0, 1.0);
  gfx.drawText(device, 'RAINBOW', [rainbowX, 40], {
    color: [rr, rg, rb, 255],
    fontSize: 1,
    align: 'left',
  });

  // Particle trail
  for (let i = 0; i < 10; i++) {
    const trailX = 50 + Math.sin((frame + i * 3) * 0.1) * 8;
    const trailY = 52 + i * 1;
    const trailAlpha = Math.floor(255 * (1 - i / 10));
    device.drawPixel([Math.floor(trailX), trailY], [100, 200, 255, trailAlpha]);
  }
}

// ============================================================================
// PHASE 5: IMAGES - Showcase image rendering
// ============================================================================
function renderImages(device, gfx, frame) {
  // Dark background
  device.fillRect([0, 0], [64, 64], [15, 15, 25, 255]);

  // Title
  gfx.drawText(device, 'IMAGES', [32, 5], {
    color: [255, 255, 255, 255],
    fontSize: 1,
    align: 'center',
  });

  // Try to load and render an image if available
  try {
    const mediaPath = path.join(__dirname, '../media');
    const sunPath = path.join(mediaPath, 'sun.png');

    if (fs.existsSync(sunPath)) {
      // Animated position (circular motion)
      const centerX = 32 + Math.cos(frame * 0.1) * 10;
      const centerY = 35 + Math.sin(frame * 0.1) * 8;

      // Draw with rotation effect (simulated with alpha)
      const rotation = Math.sin(frame * 0.08) * 0.5 + 0.5;
      const imageAlpha = Math.floor(150 + 105 * rotation);

      gfx.drawImage(device, sunPath, {
        position: [Math.floor(centerX), Math.floor(centerY)],
        alpha: imageAlpha,
        align: 'center',
      });
    } else {
      // Fallback: draw a sun manually
      const sunX = 32 + Math.cos(frame * 0.1) * 10;
      const sunY = 35 + Math.sin(frame * 0.1) * 8;

      // Sun rays
      for (let i = 0; i < 8; i++) {
        const angle = frame * 0.05 + (i * Math.PI) / 4;
        const rayX = sunX + Math.cos(angle) * 8;
        const rayY = sunY + Math.sin(angle) * 8;
        device.drawPixel(
          [Math.floor(rayX), Math.floor(rayY)],
          [255, 200, 0, 255],
        );
      }

      // Sun center
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx + dy * dy <= 9) {
            device.drawPixel(
              [Math.floor(sunX + dx), Math.floor(sunY + dy)],
              [255, 220, 0, 255],
            );
          }
        }
      }
    }
  } catch {
    // Fallback: draw placeholder
    gfx.drawText(device, 'IMAGE', [32, 35], {
      color: [200, 200, 200, 255],
      fontSize: 1,
      align: 'center',
    });
  }

  gfx.drawText(device, 'with effects', [32, 55], {
    color: [150, 150, 150, 255],
    fontSize: 1,
    align: 'center',
  });
}

// ============================================================================
// PHASE 6: PERFORMANCE - Show FPS and metrics
// ============================================================================
function renderPerformance(device, gfx, frame, context) {
  // Dark background
  device.fillRect([0, 0], [64, 64], [10, 15, 20, 255]);

  // Title
  gfx.drawText(device, 'METRICS', [32, 5], {
    color: [255, 255, 255, 255],
    fontSize: 1,
    align: 'center',
  });

  // Get metrics
  const metrics = context.device.getMetrics();
  const frametime = metrics.lastFrametime || 0;
  const fps = frametime > 0 ? (1000 / frametime).toFixed(1) : '-.--';

  // FPS display
  gfx.drawText(device, `FPS: ${fps}`, [32, 20], {
    color: [100, 255, 100, 255],
    fontSize: 1,
    align: 'center',
  });

  // Frame time bar graph
  const barWidth = Math.min(Math.floor(frametime / 5), 60);
  const barColor =
    frametime < 200
      ? [0, 255, 0, 255]
      : frametime < 300
        ? [255, 200, 0, 255]
        : [255, 50, 0, 255];
  device.fillRect([2, 30], [barWidth, 6], barColor);
  device.drawRect([2, 30], [60, 6], [80, 80, 80, 255]);

  gfx.drawText(device, `${frametime}ms`, [32, 40], {
    color: [200, 200, 200, 255],
    fontSize: 1,
    align: 'center',
  });

  // Stats
  const uptime = Math.floor(
    (Date.now() - (context.getState('startTime') || Date.now())) / 1000,
  );
  gfx.drawText(device, `Frames: ${metrics.pushes}`, [32, 50], {
    color: [150, 150, 255, 255],
    fontSize: 1,
    align: 'center',
  });

  gfx.drawText(device, `Time: ${uptime}s`, [32, 58], {
    color: [255, 150, 150, 255],
    fontSize: 1,
    align: 'center',
  });
}

// ============================================================================
// PHASE 7: OUTRO - Fade out
// ============================================================================
function renderOutro(device, gfx, frame) {
  const fadeProgress = 1 - Math.min(frame / FADE_DURATION, 1);

  // Fading background
  const bgBrightness = Math.floor(30 * fadeProgress);
  device.fillRect(
    [0, 0],
    [64, 64],
    [bgBrightness, bgBrightness, bgBrightness * 2, 255],
  );

  // Fading text
  const textAlpha = Math.floor(255 * fadeProgress);
  gfx.drawText(device, 'THANKS!', [32, 25], {
    color: [255, 255, 255, textAlpha],
    fontSize: 2,
    align: 'center',
  });

  gfx.drawText(device, 'Pixoo Daemon', [32, 42], {
    color: [200, 200, 255, textAlpha],
    fontSize: 1,
    align: 'center',
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert HSV to RGB
 * @param {number} h - Hue (0-1)
 * @param {number} s - Saturation (0-1)
 * @param {number} v - Value (0-1)
 * @returns {number[]} RGB array [r, g, b]
 */
function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r, g, b;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}
