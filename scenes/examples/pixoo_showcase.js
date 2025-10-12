/**
 * @fileoverview Pixoo Showcase Scene
 * @description Comprehensive demo of Pixoo daemon capabilities
 * @category Demo
 * @author Cursor AI
 * @license MIT
 */

const GraphicsEngine = require('../../lib/graphics-engine');

const PHASES = {
  INTRO: 0,
  TEXT_EFFECTS: 1,
  GRADIENTS: 2,
  ANIMATIONS: 3,
  OUTRO: 4,
};

const PHASE_DURATION = 120; // frames per phase (~24 seconds at 5fps)
const FADE_DURATION = 30; // frames for fade effects

module.exports = {
  name: 'pixoo_showcase',
  description: '🎨 Comprehensive showcase of all Pixoo daemon features',
  category: 'Demo',

  async init(context) {
    // Scene initialization (called once when scene starts)
    context.setState('phase', PHASES.INTRO);
    context.setState('frame', 0);
    context.setState('startTime', Date.now());
  },

  async render(context) {
    const { device, getState, setState } = context;
    const gfx = new GraphicsEngine(device);

    const phase = getState('phase', PHASES.INTRO);
    const frame = getState('frame', 0);

    // Clear screen
    device.clear();

    // Render current phase
    switch (phase) {
      case PHASES.INTRO:
        await renderIntro(device, gfx, frame);
        break;
      case PHASES.TEXT_EFFECTS:
        await renderTextEffects(device, gfx, frame);
        break;
      case PHASES.GRADIENTS:
        await renderGradients(device, gfx, frame);
        break;
      case PHASES.ANIMATIONS:
        await renderAnimations(device, gfx, frame);
        break;
      case PHASES.OUTRO:
        await renderOutro(device, gfx, frame);
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
    // Scene cleanup
    context.setState('phase', PHASES.INTRO);
    context.setState('frame', 0);
  },
};

// ============================================================================
// PHASE 1: INTRO - Welcome screen with fade-in
// ============================================================================
async function renderIntro(device, gfx, frame) {
  const fadeProgress = Math.min(frame / FADE_DURATION, 1);

  // Background gradient (dark blue to black)
  await gfx.drawGradientBackground(
    [0, 0, Math.floor(50 * fadeProgress), 255],
    [0, 0, 0, 255],
    'vertical',
  );

  // Title with GraphicsEngine
  const titleAlpha = Math.floor(255 * fadeProgress);
  await gfx.drawTextEnhanced('PIXOO', [32, 20], [255, 200, 0, titleAlpha], {
    alignment: 'center',
    effects: {
      shadow: true,
      shadowOffset: 1,
      shadowColor: [100, 50, 0, titleAlpha],
    },
  });

  await gfx.drawTextEnhanced(
    'SHOWCASE',
    [32, 35],
    [200, 200, 255, titleAlpha],
    {
      alignment: 'center',
    },
  );

  // Animated dots
  const dotsToShow = Math.floor(frame / 10) % 4;
  if (dotsToShow > 0) {
    await device.drawText(
      '.'.repeat(dotsToShow),
      [32, 48],
      [150, 150, 150, titleAlpha],
    );
  }
}

// ============================================================================
// PHASE 2: TEXT EFFECTS - Showcase text rendering capabilities
// ============================================================================
async function renderTextEffects(device, gfx, frame) {
  // Dark background
  device.fillRect([0, 0], [64, 64], [10, 10, 20, 255]);

  // Title
  await device.drawText('TEXT FX', [5, 5], [255, 255, 255, 255]);

  // Shadow effect
  await gfx.drawTextEnhanced('SHADOW', [32, 18], [100, 200, 255, 255], {
    alignment: 'center',
    effects: {
      shadow: true,
      shadowOffset: 2,
      shadowColor: [20, 40, 50, 200],
    },
  });

  // Outline effect
  const breathe = Math.sin(frame * 0.1) * 0.3 + 0.7;
  const outlineAlpha = Math.floor(255 * breathe);
  await gfx.drawTextEnhanced(
    'OUTLINE',
    [32, 30],
    [255, 200, 100, outlineAlpha],
    {
      alignment: 'center',
      effects: {
        outline: true,
        outlineWidth: 1,
        outlineColor: [100, 50, 0, outlineAlpha],
      },
    },
  );

  // Gradient text (animated hue shift)
  const hueShift = (frame * 2) % 360;
  const [r, g, b] = hsvToRgb(hueShift / 360, 0.8, 1.0);
  await device.drawText('GRADIENT', [32, 42], [r, g, b, 255]);

  // Combined effects (pulsing)
  const pulse = Math.sin(frame * 0.15) * 0.4 + 0.6;
  const pulseAlpha = Math.floor(255 * pulse);
  await gfx.drawTextEnhanced('COMBO', [32, 54], [255, 100, 255, pulseAlpha], {
    alignment: 'center',
    effects: {
      shadow: true,
      shadowOffset: 1,
      shadowColor: [60, 20, 100, Math.floor(150 * pulse)],
    },
  });
}

// ============================================================================
// PHASE 3: GRADIENTS - Showcase gradient rendering
// ============================================================================
async function renderGradients(device, gfx, frame) {
  // Animated gradient background
  const hue1 = (frame * 1) % 360;
  const hue2 = (hue1 + 120) % 360;
  const [r1, g1, b1] = hsvToRgb(hue1 / 360, 0.8, 0.6);
  const [r2, g2, b2] = hsvToRgb(hue2 / 360, 0.8, 0.4);

  await gfx.drawGradientBackground(
    [r1, g1, b1, 255],
    [r2, g2, b2, 255],
    'vertical',
  );

  // Title
  await device.drawText('GRADIENTS', [32, 28], [255, 255, 255, 255]);
}

// ============================================================================
// PHASE 4: ANIMATIONS - Showcase animation capabilities
// ============================================================================
async function renderAnimations(device, gfx, frame) {
  // Dark background
  device.fillRect([0, 0], [64, 64], [5, 5, 10, 255]);

  // Title
  await device.drawText('ANIMATIONS', [2, 2], [255, 255, 255, 255]);

  // Bouncing ball
  const ballX = 32 + Math.sin(frame * 0.1) * 24;
  const ballY = 32 + Math.abs(Math.sin(frame * 0.15)) * 20;
  device.fillCircle(
    [Math.floor(ballX), Math.floor(ballY)],
    4,
    [255, 100, 100, 255],
  );

  // Rotating square
  const angle = frame * 0.05;
  const size = 8;
  for (let i = 0; i < 4; i++) {
    const a1 = angle + (i * Math.PI) / 2;
    const a2 = angle + ((i + 1) * Math.PI) / 2;
    const x1 = 48 + Math.cos(a1) * size;
    const y1 = 48 + Math.sin(a1) * size;
    const x2 = 48 + Math.cos(a2) * size;
    const y2 = 48 + Math.sin(a2) * size;
    device.drawLine(
      [Math.floor(x1), Math.floor(y1)],
      [Math.floor(x2), Math.floor(y2)],
      [100, 255, 100, 255],
    );
  }

  // Pulsing circle
  const pulseRadius = 3 + Math.sin(frame * 0.2) * 2;
  device.drawCircle([16, 48], Math.floor(pulseRadius), [100, 100, 255, 255]);
}

// ============================================================================
// PHASE 5: OUTRO - Thanks screen with fade-out
// ============================================================================
async function renderOutro(device, gfx, frame) {
  const fadeProgress = Math.max(0, 1 - frame / FADE_DURATION);

  // Background gradient (black to dark blue)
  await gfx.drawGradientBackground(
    [0, 0, 0, 255],
    [0, 0, Math.floor(50 * fadeProgress), 255],
    'vertical',
  );

  // Thank you message
  const alpha = Math.floor(255 * fadeProgress);
  await device.drawText('THANKS!', [32, 28], [255, 255, 255, alpha]);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert HSV to RGB color space
 * @param {number} h - Hue (0-1)
 * @param {number} s - Saturation (0-1)
 * @param {number} v - Value (0-1)
 * @returns {number[]} [r, g, b] (0-255)
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
      ((r = v), (g = t), (b = p));
      break;
    case 1:
      ((r = q), (g = v), (b = p));
      break;
    case 2:
      ((r = p), (g = v), (b = t));
      break;
    case 3:
      ((r = p), (g = q), (b = v));
      break;
    case 4:
      ((r = t), (g = p), (b = v));
      break;
    case 5:
      ((r = v), (g = p), (b = q));
      break;
  }

  return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}
