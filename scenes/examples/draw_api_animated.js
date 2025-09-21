/**
 * @fileoverview Draw API Animated
 * @description Smoothly animated scene using the central scheduler with an
 * FPS/frametime overlay. The ms value is color-coded by performance and the
 * overlay background is 50% black for readability.
 *
 * Controls:
 * - interval: number | null  → null (adaptive ASAP) or fixed interval in ms
 * - frames: number           → if omitted or <0 runs indefinitely; otherwise
 *                              stops after N pushes and shows a centered
 *                              "COMPLETE" overlay
 *
 * @mqtt
 * # Indefinite (adaptive)
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated"}'
 *
 * # Finite (adaptive, 64 frames)
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated","frames":64}'
 *
 * # Finite (fixed 200ms interval, 100 frames)
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated","interval":200,"frames":100}'
 * @version 2.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^(render|init|cleanup)$" }] */

const SCENE_NAME = 'draw_api_animated';

// Visual constants and animation parameters
const ANIMATION_CONFIG = Object.freeze({
  SCREEN_SIZE: 64,
  CENTER_X: 32,
  CENTER_Y: 32,
  DEFAULT_MODE: 'adaptive', // 'adaptive' or 'fixed'
  DEFAULT_INTERVAL_MS: 0, // used only for fixed mode
});

// Movement smoothing configuration
const MOVEMENT_LIMITS = Object.freeze({
  MAX_DELTA_SLOW: 1, // default per-frame pixel movement
  MAX_DELTA_FAST: 2, // when frames are slow
  FAST_THRESHOLD_MS: 300, // if frametime exceeds this, allow 2px
});

// Imports
const logger = require('../../lib/logger');
const {
  CHART_CONFIG,
  getPerformanceColor,
  validateSceneContext,
} = require('../../lib/performance-utils');
const {
  drawTextWithPixelPerfectBackdrop,
  BACKGROUND_COLORS,
} = require('../../lib/rendering-utils');

// --- FPS/frametime overlay utilities (lightweight copies from performance test) ---
function estimateTextWidth(str) {
  let estimatedWidth = 0;
  for (const char of String(str ?? '')) {
    if (char === ' ' || char === ':') estimatedWidth += 3;
    else if (char === 'M' || char === 'W') estimatedWidth += 5;
    else if (char >= '0' && char <= '9') estimatedWidth += 4;
    else estimatedWidth += 4;
  }
  return Math.max(1, Math.min(64, estimatedWidth));
}

async function drawStatusLine(device, fpsOneDecimal, frametimeMs, msColor) {
  // Clear status line area (y = 10)
  await device.drawRectangleRgba(
    [0, 10],
    [64, 7],
    BACKGROUND_COLORS.TRANSPARENT_BLACK_50,
  );

  let x = 2;
  const y = 10;
  const darkGray = CHART_CONFIG.TEXT_COLOR_STATS;

  // FPS numeric (white), then one pixel gap, then 'FPS'
  const fpsVal = `${fpsOneDecimal}`;
  await device.drawTextRgbaAligned(
    fpsVal,
    [x, y],
    [255, 255, 255, 255],
    'left',
  );

  x += estimateTextWidth(fpsVal) + 1;
  await device.drawTextRgbaAligned('FPS', [x, y], darkGray, 'left');
  x += estimateTextWidth('FPS');

  // Comma and space
  await device.drawTextRgbaAligned(', ', [x, y], darkGray, 'left');
  x += estimateTextWidth(', ');

  // ms numeric (colored by measurement), then one pixel gap, then 'ms'
  const msVal = `${frametimeMs}`;
  const msTextColor = [msColor[0], msColor[1], msColor[2], 255];
  await device.drawTextRgbaAligned(msVal, [x, y], msTextColor, 'left');
  x += estimateTextWidth(msVal) + 1;
  await device.drawTextRgbaAligned('ms', [x, y], darkGray, 'left');
}

// --- State utilities ---
class AnimatedV2State {
  constructor(getState, setState) {
    this.getState = getState;
    this.setState = setState;
  }

  reset() {
    const now = Date.now();
    this.setState('isRunning', true);
    this.setState('loopScheduled', false);
    this.setState('loopTimer', null);
    this.setState('inFrame', false);
    this.setState('startTime', now);
    this.setState('framesRendered', 0);
    this.setState('frameCount', 0);
    // metrics
    this.setState('minFrametime', Infinity);
    this.setState('maxFrametime', 0);
    this.setState('sumFrametime', 0);
    this.setState('samples', []);
  }

  updateMetrics(frametime) {
    if (!(frametime > 0)) return;
    const framesRendered = (this.getState('framesRendered') || 0) + 1;
    const samples = this.getState('samples') || [];
    const sumFrametime = (this.getState('sumFrametime') || 0) + frametime;
    const minFrametime = Math.min(
      this.getState('minFrametime') || Infinity,
      frametime,
    );
    const maxFrametime = Math.max(
      this.getState('maxFrametime') || 0,
      frametime,
    );

    samples.push(frametime);

    this.setState('framesRendered', framesRendered);
    this.setState('samples', samples);
    this.setState('sumFrametime', sumFrametime);
    this.setState('minFrametime', minFrametime);
    this.setState('maxFrametime', maxFrametime);
  }

  getMetrics() {
    const framesRendered = this.getState('framesRendered') || 0;
    const samples = this.getState('samples') || [];
    const sumFrametime = this.getState('sumFrametime') || 0;
    const minFrametime = this.getState('minFrametime') || 0;
    const maxFrametime = this.getState('maxFrametime') || 0;
    const avgFrametime = samples.length > 0 ? sumFrametime / samples.length : 0;
    const fps = avgFrametime > 0 ? 1000 / avgFrametime : 0;
    return {
      framesRendered,
      avgFrametime,
      minFrametime: minFrametime === Infinity ? 0 : minFrametime,
      maxFrametime,
      sampleCount: samples.length,
      fps,
    };
  }
}

// --- Helpers ---
/**
 * Clamp value movement per frame
 * @param {number} prev - Previous value
 * @param {number} target - Target value
 * @param {number} maxDelta - Maximum delta per frame
 * @returns {number} Clamped next value
 */
function stepTowards(prev, target, maxDelta) {
  const delta = target - prev;
  if (Math.abs(delta) <= maxDelta) return target;
  return prev + Math.sign(delta) * maxDelta;
}

function getPrev(getState, key, fallback) {
  const v = getState(key);
  return typeof v === 'number' ? v : fallback;
}

function setPrev(setState, key, value) {
  setState(key, value);
}

// --- Frame renderer ---
async function renderFrame(context, config) {
  const { device, publishOk, getState, setState } = context;

  if (!getState('isRunning')) {
    return;
  }

  if (getState('inFrame')) {
    return;
  }
  setState('inFrame', true);

  // Use previous push duration as measured frametime
  const lastPushMetrics = device.getMetrics?.() || {};
  const frametime = lastPushMetrics.lastFrametime || 0;

  // Update metrics
  const perf = new AnimatedV2State(getState, setState);
  if (frametime > 0) perf.updateMetrics(frametime);
  const metrics = perf.getMetrics();

  // Time base: use elapsed real time for smooth animation independent of FPS
  const startTime = getState('startTime') || Date.now();
  const elapsedMs = Date.now() - startTime;
  const t = elapsedMs / 1000; // seconds

  // Determine allowed per-frame delta
  const maxDelta =
    (frametime || 0) > MOVEMENT_LIMITS.FAST_THRESHOLD_MS
      ? MOVEMENT_LIMITS.MAX_DELTA_FAST
      : MOVEMENT_LIMITS.MAX_DELTA_SLOW;

  // Frame counter for functions that use discrete steps
  const frameCount = (getState('frameCount') || 0) + 1;
  setState('frameCount', frameCount);

  // Clear screen at the beginning of each frame
  await device.clear();

  // Draw animated layers (ported from draw_api_animated.js)
  await drawAnimatedBackground(device, t, frameCount);
  await drawMovingShapes(device, t, getState, setState, maxDelta);
  await drawSweepingLines(device, t, getState, setState, maxDelta);
  await drawAnimatedText(device, t, getState, setState, maxDelta);
  await drawParticleSystem(device, t, getState, setState, maxDelta);
  await drawFinalOverlay(device, t);

  // Header label with pixel-perfect backdrop
  await drawTextWithPixelPerfectBackdrop(
    device,
    'TEST: ANIMATED',
    [32, 42],
    [0, 200, 255, 178], // Cyan text with transparency
    'center',
    [0, 0, 0, 102], // Semi-transparent black backdrop
    1, // 1-pixel offset
  );

  // Status line: FPS, ms (use color scale from performance utils)
  const colorEnd = getPerformanceColor(
    Math.round(metrics.avgFrametime || frametime),
  );
  const currentFps = frametime > 0 ? 1000 / frametime : 0;
  await drawStatusLine(
    device,
    currentFps.toFixed(1),
    Math.round(frametime),
    colorEnd,
  );

  // Measure time for draw+push (for fixed-interval correction)
  const frameStart = Date.now();
  await device.push(SCENE_NAME, publishOk);
  const timeTaken = Date.now() - frameStart;

  // Track frames pushed independent of frametime measurement
  const nextPushed = (getState('framesPushed') || 0) + 1;
  setState('framesPushed', nextPushed);

  setState('inFrame', false);

  // Continue unless frames cap specified
  const framesCap = typeof config.frames === 'number' ? config.frames : null;
  const shouldContinue =
    framesCap == null || framesCap < 0 || nextPushed < framesCap;
  if (!shouldContinue) {
    await renderCompletion(device, publishOk);
    setState('isRunning', false);
    // Signal completion to central scheduler: return non-number
    return null;
  }

  // Compute next delay for central scheduler
  if (config.interval === null) {
    // Adaptive mode: schedule ASAP
    return 0;
  }
  return Math.max(0, (config.interval || 0) - timeTaken);
}

// --- Scene lifecycle ---
async function init() {
  logger.debug('🚀 [ANIM V2] Scene initialized');
}

async function cleanup(context) {
  try {
    const { setState } = context;
    setState?.('isRunning', false);
  } catch (e) {
    logger.warn('⚠️ [ANIM V2] Cleanup issue', { message: e?.message });
  }
  logger.debug('🧹 [ANIM V2] Scene cleaned up');
}

async function render(context) {
  if (!validateSceneContext(context, SCENE_NAME)) return;
  const { device, payload, getState, setState, loopDriven } = context;
  try {
    // Derive configuration
    const interval = payload?.interval ?? null; // null => adaptive
    const frames = payload?.frames ?? null; // null => endless
    const config = { interval, frames };
    setState('config', config);

    if (!getState('isRunning')) {
      // Reset state and clear
      const s = new AnimatedV2State(getState, setState);
      s.reset();
      await device.clear();
      logger.ok(
        `🎬 [ANIM V2] Starting ${interval ? `fixed ${interval}ms` : 'adaptive'} animation${frames ? ` for ${frames} frames` : ''}`,
      );
      // Under central scheduler, we do not self-schedule
      // No self-scheduling in pure-render contract
    }

    // Loop-driven: render a frame directly each tick
    if (loopDriven && getState('isRunning')) {
      return await renderFrame(context, getState('config') || config);
    }
  } catch (error) {
    logger.error(`❌ [ANIM V2] Render error: ${error.message}`);
  }
}

// --- Animated layers (ported from draw_api_animated.js, adapted to use time t) ---
async function drawAnimatedBackground(device, t, frameCount) {
  for (let y = 0; y < ANIMATION_CONFIG.SCREEN_SIZE; y++) {
    for (let x = 0; x < ANIMATION_CONFIG.SCREEN_SIZE; x++) {
      const wave1 = Math.sin((x * 0.1 + t) * 0.5) * 30 + 30;
      const wave2 = Math.sin((y * 0.1 + t * 0.7) * 0.3) * 20 + 20;
      const intensity = Math.max(0, Math.min(255, wave1 + wave2));
      if (intensity > 10) {
        const r = Math.round(intensity * 0.1);
        const g = Math.round(intensity * 0.05);
        const b = Math.round(intensity * 0.2);
        const color = [r, g, b, 60];
        if (x === 0 && y === 0 && frameCount < 3) {
          // very early debug pixel
          logger.debug(
            `🎨 [ANIM V2 BG] Pixel [${x},${y}] intensity=${intensity.toFixed(1)} color=[${color.join(',')}]`,
          );
        }
        await device.drawPixelRgba([x, y], color);
      }
    }
  }
}

async function drawMovingShapes(device, t, getState, setState, maxDelta) {
  const rectXTarget = Math.max(
    2,
    Math.min(47, Math.round(Math.sin(t * 0.5) * 20 + 32)),
  );
  const rectYTarget = Math.max(
    2,
    Math.min(47, Math.round(Math.cos(t * 0.3) * 15 + 32)),
  );
  const rectXPrev = getPrev(getState, 'rectXPrev', rectXTarget);
  const rectYPrev = getPrev(getState, 'rectYPrev', rectYTarget);
  const rectX = stepTowards(rectXPrev, rectXTarget, maxDelta);
  const rectY = stepTowards(rectYPrev, rectYTarget, maxDelta);
  setPrev(setState, 'rectXPrev', rectX);
  setPrev(setState, 'rectYPrev', rectY);
  const shadowX = Math.max(0, Math.min(49, rectX + 2));
  const shadowY = Math.max(0, Math.min(49, rectY + 2));
  await device.fillRectangleRgba([shadowX, shadowY], [15, 15], [0, 0, 0, 80]);
  await device.fillRectangleRgba(
    [rectX, rectY],
    [15, 15],
    [255, 100, 100, 200],
  );

  const orbitXTarget = Math.max(
    8,
    Math.min(56, Math.round(Math.sin(t * 1.2) * 25 + 32)),
  );
  const orbitYTarget = Math.max(
    8,
    Math.min(56, Math.round(Math.cos(t * 1.2) * 25 + 32)),
  );
  const orbitXPrev = getPrev(getState, 'orbitXPrev', orbitXTarget);
  const orbitYPrev = getPrev(getState, 'orbitYPrev', orbitYTarget);
  const orbitX = stepTowards(orbitXPrev, orbitXTarget, maxDelta);
  const orbitY = stepTowards(orbitYPrev, orbitYTarget, maxDelta);
  setPrev(setState, 'orbitXPrev', orbitX);
  setPrev(setState, 'orbitYPrev', orbitY);

  for (let dx = -8; dx <= 8; dx++) {
    for (let dy = -8; dy <= 8; dy++) {
      if (dx * dx + dy * dy <= 64) {
        const px = Math.round(orbitX + dx + 1);
        const py = Math.round(orbitY + dy + 1);
        if (px >= 0 && px < 64 && py >= 0 && py < 64) {
          await device.drawPixelRgba([px, py], [0, 0, 0, 40]);
        }
      }
    }
  }
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

  const angle = t * 2;
  const size = 10;
  for (let i = 0; i < 3; i++) {
    const triangleXTarget = Math.max(
      2,
      Math.min(
        62,
        Math.round(Math.sin(angle + (i * Math.PI * 2) / 3) * size + 32),
      ),
    );
    const triangleYTarget = Math.max(
      35,
      Math.min(
        55,
        Math.round(Math.cos(angle + (i * Math.PI * 2) / 3) * size + 45),
      ),
    );
    const txKey = `tri${i}XPrev`;
    const tyKey = `tri${i}YPrev`;
    const triXPrev = getPrev(getState, txKey, triangleXTarget);
    const triYPrev = getPrev(getState, tyKey, triangleYTarget);
    const triangleX = stepTowards(triXPrev, triangleXTarget, maxDelta);
    const triangleY = stepTowards(triYPrev, triangleYTarget, maxDelta);
    setPrev(setState, txKey, triangleX);
    setPrev(setState, tyKey, triangleY);
    const sx = Math.round(triangleX + 1);
    const sy = Math.round(triangleY + 1);
    if (sx >= 0 && sx < 64 && sy >= 0 && sy < 64) {
      await device.drawPixelRgba([sx, sy], [0, 0, 0, 60]);
    }
    const mx = Math.round(triangleX);
    const my = Math.round(triangleY);
    if (mx >= 0 && mx < 64 && my >= 0 && my < 64) {
      await device.drawPixelRgba([mx, my], [100, 100, 255, 220]);
    }
  }
}

async function drawSweepingLines(device, t, getState, setState, maxDelta) {
  const sweepYTarget = Math.round(Math.sin(t * 2) * 25 + 32);
  const sweepYPrev = getPrev(getState, 'sweepYPrev', sweepYTarget);
  const sweepY = stepTowards(sweepYPrev, sweepYTarget, maxDelta);
  setPrev(setState, 'sweepYPrev', sweepY);
  for (let x = 0; x < 64; x++) {
    const alpha = Math.round(Math.max(0, 255 - Math.abs(x - 32) * 4));
    await device.drawPixelRgba([x, sweepY], [255, 255, 0, alpha]);
  }

  const sweepXTarget = Math.round(Math.cos(t * 1.5) * 25 + 32);
  const sweepXPrev = getPrev(getState, 'sweepXPrev', sweepXTarget);
  const sweepX = stepTowards(sweepXPrev, sweepXTarget, maxDelta);
  setPrev(setState, 'sweepXPrev', sweepX);
  for (let y = 0; y < 64; y++) {
    const alpha = Math.round(Math.max(0, 255 - Math.abs(y - 32) * 4));
    await device.drawPixelRgba([sweepX, y], [0, 255, 255, alpha]);
  }

  const diagTarget = ((t * 20) % 128) - 64;
  const diagPrev = getPrev(getState, 'diagOffsetPrev', diagTarget);
  const diagProgress = stepTowards(diagPrev, diagTarget, maxDelta);
  setPrev(setState, 'diagOffsetPrev', diagProgress);
  for (let i = -32; i < 32; i++) {
    const x = Math.round(32 + i);
    const y = Math.round(32 + i + diagProgress);
    if (x >= 0 && x < 64 && y >= 0 && y < 64) {
      const alpha = Math.round(Math.max(0, 200 - Math.abs(i) * 3));
      await device.drawPixelRgba([x, y], [255, 0, 255, alpha]);
    }
  }
}

async function drawAnimatedText(device, t, getState, setState, maxDelta) {
  const textXTarget = Math.round(Math.sin(t * 0.8) * 15 + 32);
  const textYTarget = Math.round(Math.cos(t * 0.6) * 10 + 20);
  const textXPrev = getPrev(getState, 'textXPrev', textXTarget);
  const textYPrev = getPrev(getState, 'textYPrev', textYTarget);
  const textX = stepTowards(textXPrev, textXTarget, maxDelta);
  const textY = stepTowards(textYPrev, textYTarget, maxDelta);
  setPrev(setState, 'textXPrev', textX);
  setPrev(setState, 'textYPrev', textY);

  // Pixel-perfect backdrop with configurable offset (1 pixel around text)
  const BACKDROP_OFFSET = 1;

  // Draw "ANIM" with pixel-perfect backdrop
  await drawTextWithPixelPerfectBackdrop(
    device,
    'ANIM',
    [textX, textY],
    [255, 255, 255, 255], // White text
    'center',
    [0, 0, 0, 120], // Semi-transparent black backdrop
    BACKDROP_OFFSET,
  );

  // Draw "ATED" with pixel-perfect backdrop
  await drawTextWithPixelPerfectBackdrop(
    device,
    'ATED',
    [textX, textY + 8],
    [255, 200, 100, 255], // Orange text
    'center',
    [0, 0, 0, 120], // Semi-transparent black backdrop
    BACKDROP_OFFSET,
  );

  // Draw scrolling frame counter with pixel-perfect backdrop
  const frameText = `F:${getState('frameCount') || 0}`;
  const scrollTarget = 64 - ((t * 30) % (64 + 40));
  const scrollPrev = getPrev(getState, 'scrollXPrev', scrollTarget);
  const scrollX = stepTowards(scrollPrev, scrollTarget, maxDelta);
  setPrev(setState, 'scrollXPrev', scrollX);
  const safeScrollX = Math.max(-20, Math.min(64, Math.round(scrollX)));

  await drawTextWithPixelPerfectBackdrop(
    device,
    frameText,
    [safeScrollX, 58],
    [200, 200, 200, 180], // Light gray text
    'left',
    [0, 0, 0, 100], // More transparent black backdrop for scrolling text
    BACKDROP_OFFSET,
  );
}

async function drawParticleSystem(device, t, getState, setState, maxDelta) {
  const numParticles = 8;
  for (let i = 0; i < numParticles; i++) {
    const pt = t + (i * Math.PI) / 4;
    const xTarget = Math.max(
      2,
      Math.min(62, Math.round(Math.sin(pt * 1.5) * 25 + 32)),
    );
    const yTarget = Math.max(
      2,
      Math.min(62, Math.round(Math.cos(pt * 1.2) * 20 + 32)),
    );
    const pxKey = `p${i}XPrev`;
    const pyKey = `p${i}YPrev`;
    const xPrev = getPrev(getState, pxKey, xTarget);
    const yPrev = getPrev(getState, pyKey, yTarget);
    const x = stepTowards(xPrev, xTarget, maxDelta);
    const y = stepTowards(yPrev, yTarget, maxDelta);
    setPrev(setState, pxKey, x);
    setPrev(setState, pyKey, y);
    for (let trail = 0; trail < 3; trail++) {
      const tx = Math.max(
        0,
        Math.min(64, Math.round(Math.sin((pt - trail * 0.1) * 1.5) * 25 + 32)),
      );
      const ty = Math.max(
        0,
        Math.min(64, Math.round(Math.cos((pt - trail * 0.1) * 1.2) * 20 + 32)),
      );
      const ta = Math.round((3 - trail) * 60);
      if (tx >= 0 && tx < 64 && ty >= 0 && ty < 64) {
        await device.drawPixelRgba([tx, ty], [255, 150, 0, ta]);
      }
    }
    if (x >= 0 && x < 64 && y >= 0 && y < 64) {
      await device.drawPixelRgba([x, y], [255, 255, 255, 255]);
    }
  }
}

async function drawFinalOverlay(device, t) {
  const barWidth = Math.round(((t % 10) / 10) * 60);
  for (let x = 2; x < 2 + barWidth && x < 64; x++) {
    await device.drawPixelRgba([x, 2], [100, 200, 255, 180]);
    await device.drawPixelRgba([x, 3], [150, 220, 255, 200]);
  }
  await device.fillRectangleRgba([0, 0], [3, 3], [255, 255, 255, 100]);
  await device.fillRectangleRgba([61, 0], [3, 3], [255, 255, 255, 100]);
  await device.fillRectangleRgba([0, 61], [3, 3], [255, 255, 255, 100]);
  await device.fillRectangleRgba([61, 61], [3, 3], [255, 255, 255, 100]);
}

// Opt-in to central loop
const wantsLoop = true;

module.exports = { name: SCENE_NAME, render, init, cleanup, wantsLoop };

// --- Completion overlay (pixel-perfect backdrop) ---
async function renderCompletion(device, publishOk) {
  // Use pixel-perfect backdrop for completion text
  await drawTextWithPixelPerfectBackdrop(
    device,
    'COMPLETE',
    [32, 29], // Center position
    [255, 255, 255, 200], // White text with transparency
    'center',
    BACKGROUND_COLORS.TRANSPARENT_BLACK_75, // Semi-transparent black backdrop
    2, // 2-pixel offset for more prominent backdrop
  );

  await device.push(SCENE_NAME, publishOk);
}
