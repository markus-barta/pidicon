/**
 * @fileoverview 🎨 ULTIMATE Pixoo Showcase Scene
 * @description THE definitive demo of ALL Pixoo daemon capabilities
 * Inspired by C64 demo scene - pushing hardware to the absolute limit!
 * @category Demo
 * @author Cursor AI - Going Above and Beyond Edition
 * @license MIT
 */

const GraphicsEngine = require('../../lib/graphics-engine');
const {
  drawFilledCircle,
  drawCircleOutline,
  drawGradientCircle,
  drawGlowCircle,
} = require('../../lib/rendering-utils');

// 🎬 EPIC DEMO PHASES - Inspired by C64 legends
const PHASES = {
  INTRO: 0, // Particle explosion intro
  TEXT_SHOWCASE: 1, // All text effects
  GRADIENT_PARADISE: 2, // Copper bars & gradients
  PLASMA: 3, // Classic plasma effect
  GEOMETRY: 4, // Circles, lines, shapes
  STARFIELD: 5, // 3D starfield
  TUNNEL: 6, // Rotating tunnel
  ANIMATION_FEST: 7, // Bouncing, rotating madness
  IMAGE_GALLERY: 8, // Moon, sun, blending
  FINALE: 9, // Epic goodbye
};

const PHASE_DURATION = 45; // frames per phase (~9 seconds at 5fps) - Total ~90s demo
const FADE_DURATION = 5; // frames for fades
const IMAGE_PHASE_DURATION = 70; // images phase gets extra time

module.exports = {
  name: 'pixoo_showcase',
  description:
    '🔥 ULTIMATE Pixoo Demo - 10 phases of mind-blowing effects! Plasma, tunnels, starfields, and more!',
  category: 'Demo',
  wantsLoop: true,

  async init(context) {
    context.setState('phase', PHASES.INTRO);
    context.setState('frame', 0);
    context.setState('phaseFrame', 0);
    context.setState('globalFrame', 0);

    // Animation states
    context.setState('particles', this.initParticles(20));
    context.setState('stars', this.initStars(30));
    context.setState('tunnelAngle', 0);
    context.setState('plasmaOffset', 0);
    context.setState('hue', 0);
    context.setState('bounceY', 32);
    context.setState('bounceDir', 1);
  },

  initParticles(count) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: 32,
        y: 32,
        vx: (Math.random() - 0.5) * 2.5, // Slower initial velocity
        vy: (Math.random() - 0.5) * 2.5,
        life: 1.0,
        hue: Math.random() * 360,
      });
    }
    return particles;
  },

  initStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * 64,
        y: Math.random() * 64,
        z: Math.random() * 2 + 0.5, // 0.5-2.5 range for speed/brightness
      });
    }
    return stars;
  },

  async render(context) {
    const { device, getState, setState } = context;
    const gfx = new GraphicsEngine(device);

    const phase = getState('phase', PHASES.INTRO);
    const phaseFrame = getState('phaseFrame', 0);
    const globalFrame = getState('globalFrame', 0);

    device.clear();

    // 🎬 Render current phase
    switch (phase) {
      case PHASES.INTRO:
        await this.renderIntro(device, gfx, phaseFrame, getState);
        break;
      case PHASES.TEXT_SHOWCASE:
        await this.renderTextShowcase(device, gfx, phaseFrame);
        break;
      case PHASES.GRADIENT_PARADISE:
        await this.renderGradientParadise(device, gfx, phaseFrame);
        break;
      case PHASES.PLASMA:
        await this.renderPlasma(device, getState, setState, phaseFrame);
        break;
      case PHASES.GEOMETRY:
        await this.renderGeometry(device, gfx, phaseFrame);
        break;
      case PHASES.STARFIELD:
        await this.renderStarfield(device, gfx, getState, setState);
        break;
      case PHASES.TUNNEL:
        await this.renderTunnel(device, getState, setState, phaseFrame);
        break;
      case PHASES.ANIMATION_FEST:
        await this.renderAnimationFest(
          device,
          gfx,
          getState,
          setState,
          phaseFrame,
        );
        break;
      case PHASES.IMAGE_GALLERY:
        await this.renderImageGallery(device, gfx, phaseFrame);
        break;
      case PHASES.FINALE:
        await this.renderFinale(device, gfx, getState, setState, phaseFrame);
        break;
    }

    // Phase transition logic
    setState('phaseFrame', phaseFrame + 1);
    setState('globalFrame', globalFrame + 1);

    // Use longer duration for image gallery phase
    const currentPhaseDuration =
      phase === PHASES.IMAGE_GALLERY ? IMAGE_PHASE_DURATION : PHASE_DURATION;

    if (phaseFrame >= currentPhaseDuration) {
      const nextPhase = (phase + 1) % Object.keys(PHASES).length;
      setState('phase', nextPhase);
      setState('phaseFrame', 0);
      context.log(`Phase: ${Object.keys(PHASES)[nextPhase]}`, 'info');
    }

    await device.push('pixoo_showcase', context.publishOk);
    return 0; // Adaptive timing
  },

  async cleanup(context) {
    context.setState('phase', PHASES.INTRO);
    context.setState('frame', 0);
  },

  // ============================================================================
  // 🎬 PHASE 1: INTRO - Particle Explosion
  // ============================================================================
  async renderIntro(device, gfx, frame, getState) {
    const fadeIn = Math.min(frame / FADE_DURATION, 1);
    const particles = getState('particles', []);

    // Update particles (slower, smoother)
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.01; // Slower decay
      p.vy += 0.05; // Gentler gravity
    });

    // Draw particles
    for (const p of particles) {
      if (p.life > 0) {
        const rgb = this.hslToRgb(p.hue / 360, 1, 0.5);
        const alpha = Math.floor(255 * p.life * fadeIn);
        if (p.x >= 0 && p.x < 64 && p.y >= 0 && p.y < 64) {
          await drawGlowCircle(
            device,
            [Math.floor(p.x), Math.floor(p.y)],
            2,
            4,
            [...rgb, alpha],
          );
        }
      }
    }

    // Title
    const alpha = Math.floor(255 * fadeIn);
    await gfx.drawTextEnhanced('PIXOO', [32, 20], [255, 200, 0, alpha], {
      alignment: 'center',
      effects: {
        shadow: true,
        shadowOffset: 1, // Less offset
        shadowColor: [100, 50, 0, alpha],
      },
    });

    await gfx.drawTextEnhanced(
      'ULTIMATE DEMO',
      [32, 35],
      [200, 200, 255, alpha],
      {
        alignment: 'center',
      },
    );
  },

  // ============================================================================
  // 🎬 PHASE 2: TEXT SHOWCASE - All Text Effects
  // ============================================================================
  async renderTextShowcase(device, gfx, frame) {
    // Dark gradient background
    await gfx.drawGradientBackground(
      [10, 10, 30, 255],
      [5, 5, 15, 255],
      'vertical',
    );

    // Shadow effect - higher, centered
    await gfx.drawTextEnhanced('SHADOW', [32, 8], [100, 200, 255, 255], {
      alignment: 'center',
      effects: {
        shadow: true,
        shadowOffset: 2,
        shadowColor: [20, 40, 50, 200],
      },
    });

    // Outline effect (animated thickness)
    const outlineWidth = Math.floor(Math.abs(Math.sin(frame * 0.2)) * 2) + 1;
    await gfx.drawTextEnhanced('OUTLINE', [32, 20], [255, 200, 100, 255], {
      alignment: 'center',
      effects: {
        outline: true,
        outlineWidth,
        outlineColor: [100, 50, 0, 255],
      },
    });

    // Rainbow gradient text
    const hue = (frame * 10) % 360;
    const rgb = this.hslToRgb(hue / 360, 0.8, 0.6);
    await device.drawText('RAINBOW', [32, 32], [...rgb, 255], 'center');

    // Pulsing combo effect with outline
    const pulse = Math.sin(frame * 0.15) * 0.4 + 0.6;
    const pulseAlpha = Math.floor(255 * pulse);
    await gfx.drawTextEnhanced('COMBO', [32, 44], [255, 100, 255, pulseAlpha], {
      alignment: 'center',
      effects: {
        shadow: true,
        outline: true,
        shadowOffset: 1,
        outlineWidth: 1,
        shadowColor: [60, 20, 100, Math.floor(150 * pulse)],
        outlineColor: [150, 50, 150, pulseAlpha],
      },
    });

    // Glitching text
    const glitchX = 32 + (Math.random() > 0.9 ? (Math.random() - 0.5) * 4 : 0);
    await device.drawText('GLITCH', [glitchX, 56], [255, 0, 0, 255], 'center');
  },

  // ============================================================================
  // 🎬 PHASE 3: GRADIENT PARADISE - Copper Bars
  // ============================================================================
  async renderGradientParadise(device, gfx, frame) {
    // Copper bars effect (C64 style!)
    for (let y = 0; y < 64; y++) {
      const wave1 = Math.sin((y + frame * 2) * 0.1) * 0.5 + 0.5;
      const wave2 = Math.cos((y - frame * 1.5) * 0.15) * 0.5 + 0.5;
      const hue = ((y * 5 + frame * 3) % 360) / 360;
      const rgb = this.hslToRgb(hue, 0.8, 0.3 + wave1 * 0.3);

      for (let x = 0; x < 64; x++) {
        const xWave = Math.sin((x + frame) * 0.1) * 0.2 + 0.8;
        const r = Math.max(
          0,
          Math.min(255, Math.floor(rgb[0] * xWave * wave2)),
        );
        const g = Math.max(
          0,
          Math.min(255, Math.floor(rgb[1] * xWave * wave2)),
        );
        const b = Math.max(
          0,
          Math.min(255, Math.floor(rgb[2] * xWave * wave2)),
        );
        await device.drawPixel([x, y], [r, g, b, 255]);
      }
    }

    // Title with outline
    await gfx.drawTextEnhanced('COPPER', [32, 28], [255, 255, 255, 255], {
      alignment: 'center',
      effects: {
        outline: true,
        outlineColor: [0, 0, 0, 255],
        outlineWidth: 2,
      },
    });
  },

  // ============================================================================
  // 🎬 PHASE 4: PLASMA - Classic C64 Plasma Effect
  // ============================================================================
  async renderPlasma(device, getState, setState, frame) {
    const offset = getState('plasmaOffset', 0);

    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const value =
          Math.sin(x * 0.05 + offset) +
          Math.sin(y * 0.07 - offset) +
          Math.sin((x + y) * 0.04 + offset * 2) +
          Math.sin(Math.sqrt(x * x + y * y) * 0.08 + offset);

        const hue = ((value + 4) * 30 + frame * 5) % 360;
        const rgb = this.hslToRgb(hue / 360, 1, 0.5);

        await device.drawPixel([x, y], [...rgb, 255]);
      }
    }

    setState('plasmaOffset', offset + 0.1);

    // Title
    await device.drawText('PLASMA', [32, 28], [255, 255, 255, 255], 'center');
  },

  // ============================================================================
  // 🎬 PHASE 5: GEOMETRY - Circle Functions Showcase
  // ============================================================================
  async renderGeometry(device, gfx, frame) {
    // Gradient background
    await gfx.drawGradientBackground(
      [10, 10, 25, 255],
      [5, 5, 15, 255],
      'vertical',
    );

    // Title
    await device.drawText('CIRCLES', [32, 2], [255, 255, 255, 255], 'center');

    // Single large gradient circle in center - pulsing
    const radius = 12 + Math.sin(frame * 0.15) * 4;
    await drawGradientCircle(
      device,
      [32, 32],
      Math.floor(radius),
      [255, 200, 0, 255],
      [255, 0, 100, 150],
    );

    // Outline circle overlay - pulsing thickness
    const outlineRadius = 18 + Math.cos(frame * 0.12) * 3;
    const thickness = Math.floor(Math.abs(Math.sin(frame * 0.2)) * 2) + 1;
    await drawCircleOutline(
      device,
      [32, 32],
      Math.floor(outlineRadius),
      [0, 255, 255, 255],
      thickness,
    );

    // Small orbiting circles
    for (let i = 0; i < 4; i++) {
      const angle = frame * 0.08 + (i * Math.PI) / 2;
      const orbitX = 32 + Math.cos(angle) * 22;
      const orbitY = 32 + Math.sin(angle) * 22;
      const hue = ((frame * 5 + i * 90) % 360) / 360;
      const rgb = this.hslToRgb(hue, 1, 0.6);
      await drawFilledCircle(
        device,
        [Math.floor(orbitX), Math.floor(orbitY)],
        3,
        [...rgb, 255],
      );
    }
  },

  // ============================================================================
  // 🎬 PHASE 6: STARFIELD - Simplified 2D Starfield
  // ============================================================================
  async renderStarfield(device, gfx, getState, setState) {
    // Black space background
    device.fillRect([0, 0], [64, 64], [0, 0, 10, 255]);

    // Simple 2D scrolling stars - much faster
    const stars = getState('stars', []);

    // Draw stars (larger, brighter, more visible)
    for (const star of stars) {
      // Move stars across screen
      star.x -= star.z * 0.3; // speed based on z (depth)

      // Wrap around when off screen
      if (star.x < -5) {
        star.x = 68;
        star.y = Math.random() * 64;
      }

      // Draw star and glow
      const brightness = Math.floor(star.z * 80 + 100); // Much brighter!
      const size = Math.floor(star.z * 1.5); // Bigger stars for closer ones

      // Main star pixel
      const x = Math.floor(star.x);
      const y = Math.floor(star.y);
      if (x >= 0 && x < 64 && y >= 0 && y < 64) {
        await device.drawPixel(
          [x, y],
          [brightness, brightness, brightness, 255],
        );

        // Add glow pixels around it for visibility
        if (size >= 1) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const gx = x + dx;
              const gy = y + dy;
              if (gx >= 0 && gx < 64 && gy >= 0 && gy < 64) {
                await device.drawPixel(
                  [gx, gy],
                  [brightness / 2, brightness / 2, brightness / 2, 150],
                );
              }
            }
          }
        }
      }
    }

    setState('stars', stars);

    // Title
    await device.drawText('STARS', [32, 2], [255, 255, 255, 255], 'center');
  },

  // ============================================================================
  // 🎬 PHASE 7: TUNNEL - Rotating Tunnel Effect
  // ============================================================================
  async renderTunnel(device, getState, setState, frame) {
    const angle = getState('tunnelAngle', 0);

    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const dx = x - 32;
        const dy = y - 32;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const a = Math.atan2(dy, dx) + angle;

        const tunnelDist = 32 / (dist + 1);
        const tunnelAngle = a * 5;

        // Ensure hue is always positive (JS modulo keeps sign)
        const hueValue =
          (tunnelDist * 100 + tunnelAngle * 50 + frame * 5) % 360;
        const hue = (hueValue < 0 ? hueValue + 360 : hueValue) / 360;
        const brightness = Math.sin(tunnelDist * 2 + frame * 0.1) * 0.5 + 0.5;
        const rgb = this.hslToRgb(hue, 1, brightness * 0.5);

        await device.drawPixel([x, y], [...rgb, 255]);
      }
    }

    setState('tunnelAngle', angle + 0.05);

    // Title
    await device.drawText('TUNNEL', [32, 28], [255, 255, 255, 255], 'center');
  },

  // ============================================================================
  // 🎬 PHASE 8: ANIMATION FEST - Everything Moving!
  // ============================================================================
  async renderAnimationFest(device, gfx, getState, setState, frame) {
    // Nice gradient background
    await gfx.drawGradientBackground(
      [30, 30, 50, 255],
      [15, 15, 30, 255],
      'vertical',
    );

    // Title at top center
    await device.drawText('MOVEMENT', [32, 2], [255, 255, 255, 255], 'center');

    // Bouncing ball - large and visible
    let bounceY = getState('bounceY', 32);
    let bounceDir = getState('bounceDir', 1);

    bounceY += bounceDir * 2;
    if (bounceY >= 50 || bounceY <= 18) bounceDir *= -1;

    setState('bounceY', bounceY);
    setState('bounceDir', bounceDir);

    await drawFilledCircle(
      device,
      [16, Math.floor(bounceY)],
      6,
      [255, 150, 150, 255],
    );

    // Rotating square - bright and visible
    const angle = frame * 0.1;
    const size = 10;
    for (let i = 0; i < 4; i++) {
      const a1 = angle + (i * Math.PI) / 2;
      const a2 = angle + ((i + 1) * Math.PI) / 2;
      const x1 = 32 + Math.cos(a1) * size;
      const y1 = 32 + Math.sin(a1) * size;
      const x2 = 32 + Math.cos(a2) * size;
      const y2 = 32 + Math.sin(a2) * size;
      await device.drawLine(
        [Math.floor(x1), Math.floor(y1)],
        [Math.floor(x2), Math.floor(y2)],
        [150, 255, 150, 255],
      );
    }

    // Pulsing circle on right
    const pulseRadius = 5 + Math.sin(frame * 0.2) * 3;
    await drawFilledCircle(
      device,
      [48, 32],
      Math.floor(pulseRadius),
      [150, 150, 255, 255],
    );

    // Rainbow text at bottom
    const hue = (frame * 8) % 360;
    const rgb = this.hslToRgb(hue / 360, 1, 0.7);
    await device.drawText('MOTION!', [32, 56], [...rgb, 255], 'center');
  },

  // ============================================================================
  // 🎬 PHASE 9: IMAGE GALLERY - Moon Phases & Sun
  // ============================================================================
  async renderImageGallery(device, gfx, frame) {
    // Gradient background
    await gfx.drawGradientBackground(
      [20, 20, 40, 255],
      [10, 10, 20, 255],
      'vertical',
    );

    // Moon phase cycling
    const moonPhase = Math.floor(frame / 2) % 26;
    const moonPath = `scenes/media/moonphase/5x5/Moon_${moonPhase.toString().padStart(2, '0')}.png`;

    // Sun
    const sunPath = 'scenes/media/sun.png';

    // Orbital animation
    const orbitAngle = frame * 0.1;
    const moonX = Math.floor(32 + Math.cos(orbitAngle) * 18);
    const moonY = Math.floor(32 + Math.sin(orbitAngle) * 18);
    const sunX = Math.floor(32 - Math.cos(orbitAngle) * 18);
    const sunY = Math.floor(32 - Math.sin(orbitAngle) * 18);

    try {
      await gfx.drawImageBlended(
        moonPath,
        [moonX, moonY],
        [5, 5],
        255,
        'normal',
      );
      await gfx.drawImageBlended(sunPath, [sunX, sunY], [9, 9], 255, 'normal');
    } catch {
      // Fallback
      await device.drawText(
        '🌙',
        [moonX, moonY],
        [255, 255, 255, 255],
        'center',
      );
      await device.drawText('☀️', [sunX, sunY], [255, 200, 0, 255], 'center');
    }

    // Title
    await device.drawText('IMAGES', [32, 2], [255, 255, 255, 255], 'center');
    await device.drawText(
      `Phase: ${moonPhase}`,
      [32, 58],
      [180, 180, 255, 200],
      'center',
    );
  },

  // ============================================================================
  // 🎬 PHASE 10: FINALE - Epic Goodbye
  // ============================================================================
  async renderFinale(device, gfx, getState, setState, frame) {
    const fadeOut = Math.max(0, 1 - frame / PHASE_DURATION);
    const particles = getState('particles', []);

    // Fireworks particles
    if (frame % 5 === 0 && frame < PHASE_DURATION * 0.7) {
      const newParticles = [];
      const cx = Math.random() * 64;
      const cy = Math.random() * 40 + 10;
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        newParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 1.0,
          hue: Math.random() * 360,
        });
      }
      setState('particles', [...particles, ...newParticles].slice(-50));
    }

    // Update and draw particles
    const updatedParticles = particles.filter((p) => p.life > 0);
    updatedParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.life -= 0.03;
    });

    for (const p of updatedParticles) {
      const rgb = this.hslToRgb(p.hue / 360, 1, 0.5);
      const alpha = Math.floor(255 * p.life * fadeOut);
      if (p.x >= 0 && p.x < 64 && p.y >= 0 && p.y < 64 && alpha > 0) {
        await device.drawPixel(
          [Math.floor(p.x), Math.floor(p.y)],
          [...rgb, alpha],
        );
      }
    }
    setState('particles', updatedParticles);

    // Finale text - clean and elegant
    const alpha = Math.floor(255 * fadeOut);
    if (alpha > 0) {
      await gfx.drawTextEnhanced('THANKS!', [32, 24], [255, 255, 100, alpha], {
        alignment: 'center',
        effects: {
          shadow: true,
          shadowOffset: 2,
          shadowColor: [80, 80, 0, Math.floor(alpha * 0.7)],
        },
      });

      await gfx.drawTextEnhanced(
        'PIXOO RULES',
        [32, 40],
        [100, 200, 255, alpha],
        {
          alignment: 'center',
          effects: {
            shadow: true,
            shadowOffset: 1,
            shadowColor: [30, 60, 80, Math.floor(alpha * 0.6)],
          },
        },
      );
    }
  },

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
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
  },
};
