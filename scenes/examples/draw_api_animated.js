/**
 * @fileoverview Draw API Animated Example
 * @description An example scene that demonstrates the animation capabilities
 * of the Pixoo API. It cycles through various drawing commands to create a
 * dynamic visual effect.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated"}'
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const logger = require('../../lib/logger');
const { validateSceneContext } = require('../../lib/performance-utils');

const name = 'draw_api_animated';

// Animation constants
const ANIMATION_CONFIG = {
  DEFAULT_DURATION: 80, // frames
  MAX_FPS: 5, // maximum frames per second (realistic for Pixoo)
  MIN_FRAME_INTERVAL: 1000 / 5, // 200ms minimum interval
  ADAPTIVE_OFFSET_MS: 10, // small offset after frame completion
  SCREEN_SIZE: 64,
  CENTER_X: 32,
  CENTER_Y: 32,
};

async function init() {
  // Initialize animated draw API demo scene - nothing special needed
  logger.debug(`🚀 [TEST_DRAW_API_ANIMATED] Scene initialized`);
}

async function cleanup(ctx) {
  // Cleanup animated draw API demo scene - clear animation state
  const { getState, setState } = ctx;

  // Clear any existing timer
  const existingTimer = getState('animationTimer');
  if (existingTimer) {
    clearTimeout(existingTimer);
    setState('animationTimer', null);
  }

  // Clear animation scheduling flag to stop any pending frames
  setState('animationScheduled', false);
  setState('frameCount', 0);
  setState('isRunning', false);

  logger.debug(
    `🧹 [TEST_DRAW_API_ANIMATED] Scene cleaned up - animation state reset`,
  );
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, state, getState, setState, publishOk, loopDriven } = ctx;

  // If explicitly stopped via state (e.g., during scene switch), abort render quickly
  if (getState('isRunning') === false) {
    return;
  }

  // Configuration
  const duration = state.get('duration') || ANIMATION_CONFIG.DEFAULT_DURATION;
  const startTime = getState('startTime') || Date.now();
  // Handle animation continuation messages
  const isContinuation =
    !ctx.loopDriven && Boolean(state.get('_isAnimationFrame'));
  let frameCount = getState('frameCount') || 0;

  // For continuation messages, use the frameCount from the payload
  if (isContinuation && state.get('frameCount') !== undefined) {
    frameCount = state.get('frameCount');
    setState('frameCount', frameCount);
  }

  // Debug logging for frameCount
  logger.debug(
    `🔍 [DEBUG] Frame count: ${frameCount}, isContinuation: ${isContinuation}, state frameCount: ${state.get('frameCount')}`,
  );

  // Initialize on first run (not a continuation)
  if (!isContinuation && frameCount === 0) {
    setState('startTime', startTime);
    setState('frameCount', 0);
    setState('animationScheduled', false);
    setState('isRunning', true);
    logger.debug(`🎬 [ANIMATED DEMO] Starting ${duration}-frame animation`);
  }

  // Don't reset animation scheduling flag here - let it be managed by the scheduling logic

  // Clear screen for fresh frame
  await device.clear();

  // Calculate animation progress (0.0 to 1.0)
  const progress = Math.min(1.0, frameCount / duration);
  const time = (frameCount * Math.PI * 2) / 60; // Smooth oscillation

  // Debug logging for first few frames
  if (frameCount < 3) {
    logger.debug(
      `🎬 [ANIMATED DEMO] Frame ${frameCount}, progress: ${progress.toFixed(3)}, time: ${time.toFixed(3)}`,
    );
  }

  // Draw animated elements
  await drawAnimatedBackground(device, time, progress, frameCount);
  await drawMovingShapes(device, time, progress);
  await drawSweepingLines(device, time, progress);
  await drawAnimatedText(device, time, progress);
  await drawParticleSystem(device, time, progress);
  await drawFinalOverlay(device, time, progress);

  // Measure frame rendering time for adaptive timing
  const frameStartTime = Date.now();

  // Push frame to device
  await device.push(name, publishOk);

  // Calculate actual frame rendering time
  const frameDuration = Date.now() - frameStartTime;

  // Animation control
  const nextFrame = frameCount + 1;
  setState('frameCount', nextFrame);

  if (nextFrame >= duration) {
    // Animation complete - reset for next run
    logger.debug(
      `🏁 [ANIMATED DEMO] Animation complete after ${duration} frames`,
    );
    setState('frameCount', 0); // Reset for next run
    return; // End this animation cycle
  }

  // Schedule next frame with adaptive timing (disabled if loopDriven is true)
  if (
    !loopDriven &&
    !getState('animationScheduled') &&
    getState('isRunning') !== false
  ) {
    setState('animationScheduled', true); // Set flag immediately to prevent race conditions

    // Calculate adaptive delay: frame duration + small offset, but respect max FPS
    const adaptiveDelay = Math.max(
      frameDuration + ANIMATION_CONFIG.ADAPTIVE_OFFSET_MS,
      ANIMATION_CONFIG.MIN_FRAME_INTERVAL,
    );

    logger.debug(
      `🎬 [ANIMATION] Frame ${frameCount} took ${frameDuration}ms, scheduling next in ${adaptiveDelay}ms`,
    );

    const timer = setTimeout(async () => {
      // Abort if scene has been stopped/cleaned up to avoid re-switching scenes
      try {
        if (
          getState('isRunning') === false ||
          getState('animationScheduled') === false
        ) {
          setState('animationScheduled', false);
          return;
        }
      } catch {
        // If state access fails, be safe and do nothing
        return;
      }
      try {
        const mqtt = require('mqtt');
        const brokerUrl = `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`;

        const client = mqtt.connect(brokerUrl, {
          username: process.env.MOSQITTO_USER_MS24,
          password: process.env.MOSQITTO_PASS_MS24,
          connectTimeout: 5000,
          reconnectPeriod: 0,
        });

        client.on('connect', () => {
          try {
            const payload = JSON.stringify({
              scene: name,
              frameCount: nextFrame,
              _isAnimationFrame: true,
            });

            const targetHost = process.env.PIXOO_DEVICES
              ? process.env.PIXOO_DEVICES.split(';')[0].trim()
              : '192.168.1.159';

            client.publish(`pixoo/${targetHost}/state/upd`, payload, {
              qos: 1,
            });
            client.end();
          } catch (publishError) {
            logger.error(`❌ [ANIMATION] MQTT publish error:`, publishError);
            client.end();
          }
        });

        client.on('error', (error) => {
          logger.error(`❌ [ANIMATION] MQTT connection error:`, error.message);
          setState('animationScheduled', false); // Reset flag on error
          client.end();
        });

        client.on('close', () => {
          setState('animationScheduled', false); // Reset flag when connection closes
        });
      } catch (error) {
        logger.error(`❌ [ANIMATION] Setup error:`, error);
        setState('animationScheduled', false); // Reset flag on error
      }
    }, adaptiveDelay); // Dynamic timing based on actual frame performance

    // Store timer for cleanup
    setState('animationTimer', timer);
  }
}

// If central scheduler is active (loopDriven), it will invoke render repeatedly.
// This legacy scene avoids self-scheduling when loopDriven is true.

async function drawAnimatedBackground(device, time, progress, frameCount) {
  // Animated gradient background
  // NOTE: This uses 4096 individual drawPixelRgba calls (64x64) which is inefficient
  // Consider using fillRectangleRgba with larger blocks for better performance
  for (let y = 0; y < ANIMATION_CONFIG.SCREEN_SIZE; y++) {
    for (let x = 0; x < ANIMATION_CONFIG.SCREEN_SIZE; x++) {
      const wave1 = Math.sin((x * 0.1 + time) * 0.5) * 30 + 30;
      const wave2 = Math.sin((y * 0.1 + time * 0.7) * 0.3) * 20 + 20;
      const intensity = Math.max(0, Math.min(255, wave1 + wave2));

      // Subtle animated background
      if (intensity > 10) {
        const r = Math.round(intensity * 0.1);
        const g = Math.round(intensity * 0.05);
        const b = Math.round(intensity * 0.2);
        const color = [r, g, b, 60];

        // Debug first few pixels
        if (x === 0 && y === 0 && frameCount < 3) {
          logger.debug(
            `🎨 [BACKGROUND] Pixel [${x},${y}]: intensity=${intensity.toFixed(1)}, color=[${color.join(',')}]`,
          );
        }

        await device.drawPixelRgba([x, y], color);
      }
    }
  }
}

async function drawMovingShapes(device, time) {
  // Multiple moving shapes with shadows

  // Shape 1: Large moving rectangle with shadow
  const rectX = Math.max(
    2,
    Math.min(47, Math.round(Math.sin(time * 0.5) * 20 + 32)),
  );
  const rectY = Math.max(
    2,
    Math.min(47, Math.round(Math.cos(time * 0.3) * 15 + 32)),
  );

  // Shadow (offset and low alpha) - keep within bounds
  const shadowX = Math.max(0, Math.min(49, rectX + 2));
  const shadowY = Math.max(0, Math.min(49, rectY + 2));
  await device.fillRectangleRgba([shadowX, shadowY], [15, 15], [0, 0, 0, 80]);

  // Main shape
  await device.fillRectangleRgba(
    [rectX, rectY],
    [15, 15],
    [255, 100, 100, 200],
  );

  // Shape 2: Smaller orbiting circle (simulated with pixels)
  const orbitX = Math.max(
    8,
    Math.min(56, Math.round(Math.sin(time * 1.2) * 25 + 32)),
  );
  const orbitY = Math.max(
    8,
    Math.min(56, Math.round(Math.cos(time * 1.2) * 25 + 32)),
  );

  // Circle shadow
  for (let dx = -8; dx <= 8; dx++) {
    for (let dy = -8; dy <= 8; dy++) {
      if (dx * dx + dy * dy <= 64) {
        // Circle equation
        const px = Math.round(orbitX + dx + 1);
        const py = Math.round(orbitY + dy + 1);
        if (
          px >= 0 &&
          px < ANIMATION_CONFIG.SCREEN_SIZE &&
          py >= 0 &&
          py < ANIMATION_CONFIG.SCREEN_SIZE
        ) {
          await device.drawPixelRgba([px, py], [0, 0, 0, 40]);
        }
      }
    }
  }

  // Main circle
  for (let dx = -8; dx <= 8; dx++) {
    for (let dy = -8; dy <= 8; dy++) {
      if (dx * dx + dy * dy <= 64) {
        const px = Math.round(orbitX + dx);
        const py = Math.round(orbitY + dy);
        if (
          px >= 0 &&
          px < ANIMATION_CONFIG.SCREEN_SIZE &&
          py >= 0 &&
          py < ANIMATION_CONFIG.SCREEN_SIZE
        ) {
          await device.drawPixelRgba([px, py], [100, 255, 100, 180]);
        }
      }
    }
  }

  // Shape 3: Rotating triangle
  const angle = time * 2;
  const size = 10; // Reduced size to fit better
  for (let i = 0; i < 3; i++) {
    const triangleX = Math.max(
      2,
      Math.min(
        62,
        Math.round(Math.sin(angle + (i * Math.PI * 2) / 3) * size + 32),
      ),
    );
    const triangleY = Math.max(
      35,
      Math.min(
        55,
        Math.round(Math.cos(angle + (i * Math.PI * 2) / 3) * size + 45),
      ),
    );

    // Triangle shadow
    const shadowX = Math.round(triangleX + 1);
    const shadowY = Math.round(triangleY + 1);
    if (shadowX >= 0 && shadowX < 64 && shadowY >= 0 && shadowY < 64) {
      await device.drawPixelRgba([shadowX, shadowY], [0, 0, 0, 60]);
    }

    // Triangle point
    const mainX = Math.round(triangleX);
    const mainY = Math.round(triangleY);
    if (mainX >= 0 && mainX < 64 && mainY >= 0 && mainY < 64) {
      await device.drawPixelRgba([mainX, mainY], [100, 100, 255, 220]);
    }
  }
}

async function drawSweepingLines(device, time) {
  // Horizontal sweeping line
  const sweepY = Math.round(Math.sin(time * 2) * 25 + 32);
  for (let x = 0; x < 64; x++) {
    const alpha = Math.round(Math.max(0, 255 - Math.abs(x - 32) * 4)); // Fade from center
    await device.drawPixelRgba([x, sweepY], [255, 255, 0, alpha]);
  }

  // Vertical sweeping line
  const sweepX = Math.round(Math.cos(time * 1.5) * 25 + 32);
  for (let y = 0; y < 64; y++) {
    const alpha = Math.round(Math.max(0, 255 - Math.abs(y - 32) * 4));
    await device.drawPixelRgba([sweepX, y], [0, 255, 255, alpha]);
  }

  // Diagonal sweeping line
  const diagProgress = ((time * 20) % 128) - 64; // -64 to +64
  for (let i = -32; i < 32; i++) {
    const x = Math.round(32 + i);
    const y = Math.round(32 + i + diagProgress);
    if (x >= 0 && x < 64 && y >= 0 && y < 64) {
      const alpha = Math.round(Math.max(0, 200 - Math.abs(i) * 3));
      await device.drawPixelRgba([x, y], [255, 0, 255, alpha]);
    }
  }
}

async function drawAnimatedText(device, time) {
  // Animated text with trails

  // Main text that moves around
  const textX = Math.round(Math.sin(time * 0.8) * 15 + 32);
  const textY = Math.round(Math.cos(time * 0.6) * 10 + 20);

  // Text shadow
  await device.drawTextRgbaAligned(
    'ANIM',
    [textX + 1, textY + 1],
    [0, 0, 0, 120],
    'center',
  );
  await device.drawTextRgbaAligned(
    'ATED',
    [textX + 1, textY + 9],
    [0, 0, 0, 120],
    'center',
  );

  // Main text
  await device.drawTextRgbaAligned(
    'ANIM',
    [textX, textY],
    [255, 255, 255, 255],
    'center',
  );
  await device.drawTextRgbaAligned(
    'ATED',
    [textX, textY + 8],
    [255, 200, 100, 255],
    'center',
  );

  // Scrolling frame counter at bottom
  const frameText = `F:${Math.round(time * 10)}`;
  const scrollX = 64 - ((time * 30) % (64 + 40)); // Scroll from right to left
  const safeScrollX = Math.max(-20, Math.min(64, Math.round(scrollX))); // Keep text visible
  await device.drawTextRgbaAligned(
    frameText,
    [safeScrollX, 58],
    [200, 200, 200, 180],
    'left',
  );
}

async function drawParticleSystem(device, time) {
  // Simple particle system - moving dots
  const numParticles = 8;

  for (let i = 0; i < numParticles; i++) {
    const particleTime = time + (i * Math.PI) / 4;
    const x = Math.max(
      2,
      Math.min(62, Math.round(Math.sin(particleTime * 1.5) * 25 + 32)),
    );
    const y = Math.max(
      2,
      Math.min(62, Math.round(Math.cos(particleTime * 1.2) * 20 + 32)),
    );

    // Particle trail effect
    for (let trail = 0; trail < 3; trail++) {
      const trailX = Math.max(
        0,
        Math.min(
          64,
          Math.round(Math.sin((particleTime - trail * 0.1) * 1.5) * 25 + 32),
        ),
      );
      const trailY = Math.max(
        0,
        Math.min(
          64,
          Math.round(Math.cos((particleTime - trail * 0.1) * 1.2) * 20 + 32),
        ),
      );
      const trailAlpha = Math.round((3 - trail) * 60);

      if (trailX >= 0 && trailX < 64 && trailY >= 0 && trailY < 64) {
        await device.drawPixelRgba([trailX, trailY], [255, 150, 0, trailAlpha]);
      }
    }

    // Main particle
    if (x >= 0 && x < 64 && y >= 0 && y < 64) {
      await device.drawPixelRgba([x, y], [255, 255, 255, 255]);
    }
  }
}

async function drawFinalOverlay(device, time) {
  // Progress bar at top
  const barWidth = Math.round(((time % 10) / 10) * 60);
  for (let x = 2; x < 2 + barWidth && x < 64; x++) {
    await device.drawPixelRgba([x, 2], [100, 200, 255, 180]);
    await device.drawPixelRgba([x, 3], [150, 220, 255, 200]);
  }

  // Corner decorations
  await device.fillRectangleRgba([0, 0], [3, 3], [255, 255, 255, 100]); // Top-left
  await device.fillRectangleRgba([61, 0], [3, 3], [255, 255, 255, 100]); // Top-right
  await device.fillRectangleRgba([0, 61], [3, 3], [255, 255, 255, 100]); // Bottom-left
  await device.fillRectangleRgba([61, 61], [3, 3], [255, 255, 255, 100]); // Bottom-right
}

module.exports = { name, render, init, cleanup, wantsLoop: true };
