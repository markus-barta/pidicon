// Animated Draw API Demo Scene - Moving graphics with alpha blending
// Features:
// - Moving geometric shapes with shadows
// - Animated text with alpha trails
// - Sweeping lines and particles
// - Layered animations at different speeds
// - Alpha blending and transparency effects
// - Runs for ~80 frames with smooth 60fps timing

// MQTT Commands:
// {"scene":"test_draw_api_animated"}                           - Run the animated demo
// {"scene":"test_draw_api_animated","clear":true}              - Clear screen before starting
// {"scene":"test_draw_api_animated","duration":120}            - Custom duration in frames

// @author: Sonic + Cursor + Markus Barta (mba)

const name = 'test_draw_api_animated';

// Import shared utilities
const { validateSceneContext } = require('../lib/performance-utils');

async function init() {
  // Initialize animated draw API demo scene - nothing special needed
  console.log(`🚀 [TEST_DRAW_API_ANIMATED] Scene initialized`);
}

async function cleanup() {
  // Cleanup animated draw API demo scene - nothing special needed
  console.log(`🧹 [TEST_DRAW_API_ANIMATED] Scene cleaned up`);
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, state, getState, setState, publishOk } = ctx;

  // Configuration
  const duration = state.duration || 80; // ~80 frames
  const startTime = getState('startTime') || Date.now();
  // Use frameCount from state if provided (for animation continuation)
  let frameCount = getState('frameCount') || 0;
  if (state.frameCount !== undefined) {
    frameCount = state.frameCount;
    setState('frameCount', frameCount);
  }

  // Initialize on first run
  if (frameCount === 0) {
    setState('startTime', startTime);
    setState('frameCount', 0);
    setState('animationScheduled', false);
    console.log(`🎬 [ANIMATED DEMO] Starting ${duration}-frame animation`);
  }

  // Reset animation scheduling flag for this frame
  setState('animationScheduled', false);

  // Clear screen for fresh frame
  await device.clear();

  // Calculate animation progress (0.0 to 1.0)
  const progress = Math.min(1.0, frameCount / duration);
  const time = (frameCount * Math.PI * 2) / 60; // Smooth oscillation

  // Debug logging for first few frames
  if (frameCount < 3) {
    console.log(
      `🎬 [ANIMATED DEMO] Frame ${frameCount}, progress: ${progress.toFixed(3)}, time: ${time.toFixed(3)}`,
    );
  }

  // Test with a simple pixel first
  if (frameCount < 3) {
    console.log(`🧪 [TEST] Drawing simple pixel...`);
    await device.drawPixelRgba([32, 32], [255, 0, 0, 255]);
    console.log(`✅ [TEST] Simple pixel drawn successfully`);
    // Don't return early - let device.push() send the frame
  } else {
    // Draw animated elements
    await drawAnimatedBackground(device, time);
    await drawMovingShapes(device, time, progress);
    await drawSweepingLines(device, time, progress);
    await drawAnimatedText(device, time, progress);
    await drawParticleSystem(device, time, progress);
    await drawFinalOverlay(device, time, progress);
  }

  // Push frame to device
  await device.push(name, publishOk);

  // Animation control
  const nextFrame = frameCount + 1;
  setState('frameCount', nextFrame);

  if (nextFrame >= duration) {
    // Animation complete - reset for next run
    console.log(
      `🏁 [ANIMATED DEMO] Animation complete after ${duration} frames`,
    );
    setState('frameCount', 0); // Reset for next run
    return; // End this animation cycle
  }

  // Schedule next frame via MQTT (similar to performance tests)
  if (!getState('animationScheduled')) {
    setTimeout(async () => {
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
            console.error(`❌ [ANIMATION] MQTT publish error:`, publishError);
            client.end();
          }
        });

        client.on('error', (error) => {
          console.error(`❌ [ANIMATION] MQTT connection error:`, error.message);
          client.end();
        });
      } catch (error) {
        console.error(`❌ [ANIMATION] Setup error:`, error);
      }
    }, 1000 / 15); // ~15fps for demo

    setState('animationScheduled', true);
  }
}

async function drawAnimatedBackground(device, time) {
  // Simplified animated background using rectangles instead of individual pixels
  // This is much more efficient than 4096 individual pixel calls

  // Create animated gradient using larger rectangles
  const waveIntensity = Math.sin(time * 0.5) * 30 + 30;
  const baseColor = [
    Math.round(waveIntensity * 0.1),
    Math.round(waveIntensity * 0.05),
    Math.round(waveIntensity * 0.2),
    60,
  ];

  // Draw background in 8x8 blocks for efficiency
  for (let blockY = 0; blockY < 8; blockY++) {
    for (let blockX = 0; blockX < 8; blockX++) {
      const x = blockX * 8;
      const y = blockY * 8;

      // Vary intensity slightly per block
      const blockIntensity = Math.sin((blockX * 0.5 + time) * 0.3) * 10 + 20;
      const color = [
        Math.round(baseColor[0] * (blockIntensity / 30)),
        Math.round(baseColor[1] * (blockIntensity / 30)),
        Math.round(baseColor[2] * (blockIntensity / 30)),
        60,
      ];

      await device.fillRectangleRgba([x, y], [8, 8], color);
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
        if (px >= 0 && px < 64 && py >= 0 && py < 64) {
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
        if (px >= 0 && px < 64 && py >= 0 && py < 64) {
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
  // Simplified sweeping lines using drawLine instead of individual pixels

  // Horizontal sweeping line
  const sweepY = Math.round(Math.sin(time * 2) * 25 + 32);
  if (sweepY >= 0 && sweepY < 64) {
    await device.drawLineRgba([0, sweepY], [63, sweepY], [255, 255, 0, 200]);
  }

  // Vertical sweeping line
  const sweepX = Math.round(Math.cos(time * 1.5) * 25 + 32);
  if (sweepX >= 0 && sweepX < 64) {
    await device.drawLineRgba([sweepX, 0], [sweepX, 63], [0, 255, 255, 200]);
  }

  // Diagonal sweeping line (simplified)
  const diagProgress = ((time * 20) % 128) - 64; // -64 to +64
  const startX = Math.max(0, Math.min(63, 32 + diagProgress));
  const startY = Math.max(0, Math.min(63, 32 - diagProgress));
  const endX = Math.max(0, Math.min(63, 32 - diagProgress));
  const endY = Math.max(0, Math.min(63, 32 + diagProgress));

  if (startX !== endX || startY !== endY) {
    await device.drawLineRgba(
      [startX, startY],
      [endX, endY],
      [255, 0, 255, 180],
    );
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
  // Simplified particle system using small rectangles instead of individual pixels
  const numParticles = 6; // Reduced for performance

  for (let i = 0; i < numParticles; i++) {
    const particleTime = time + (i * Math.PI) / 3;
    const x = Math.max(
      2,
      Math.min(60, Math.round(Math.sin(particleTime * 1.5) * 25 + 32)),
    );
    const y = Math.max(
      2,
      Math.min(60, Math.round(Math.cos(particleTime * 1.2) * 20 + 32)),
    );

    // Main particle as small rectangle
    if (x >= 0 && x < 63 && y >= 0 && y < 63) {
      await device.fillRectangleRgba([x, y], [2, 2], [255, 255, 255, 200]);
    }

    // Trail as single pixel (reduced complexity)
    const trailX = Math.max(
      0,
      Math.min(63, Math.round(Math.sin((particleTime - 0.2) * 1.5) * 25 + 32)),
    );
    const trailY = Math.max(
      0,
      Math.min(63, Math.round(Math.cos((particleTime - 0.2) * 1.2) * 20 + 32)),
    );

    if (trailX >= 0 && trailX < 64 && trailY >= 0 && trailY < 64) {
      await device.drawPixelRgba([trailX, trailY], [255, 150, 0, 120]);
    }
  }
}

async function drawFinalOverlay(device, time) {
  // Progress bar at top using rectangles
  const barWidth = Math.round(((time % 10) / 10) * 60);
  if (barWidth > 0) {
    await device.fillRectangleRgba([2, 2], [barWidth, 2], [100, 200, 255, 180]);
  }

  // Corner decorations
  await device.fillRectangleRgba([0, 0], [3, 3], [255, 255, 255, 100]); // Top-left
  await device.fillRectangleRgba([61, 0], [3, 3], [255, 255, 255, 100]); // Top-right
  await device.fillRectangleRgba([0, 61], [3, 3], [255, 255, 255, 100]); // Bottom-left
  await device.fillRectangleRgba([61, 61], [3, 3], [255, 255, 255, 100]); // Bottom-right
}

module.exports = { name, render, init, cleanup };
