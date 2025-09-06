/**
 * @fileoverview Pixoo HTTP Client
 * @description Provides a low-level HTTP client for communicating with the Pixoo
 * device. It handles the details of sending commands and processing responses,
 * and is not intended for direct use by scenes.
 * @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)
 * @license MIT
 */

const logger = require('./logger');

// lib/pixoo-http.js
// Minimal Pixoo 64 HTTP adapter: full-frame push via Draw/SendHttpGif.
// No images, no animations. Focused on power_price scene primitives.
// @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)

const WIDTH = 64;
const HEIGHT = 64;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function idx(x, y) {
  return (y * WIDTH + x) * 3; // RGB
}

// Complete 3x5 bitmap font - extracted from Node-RED implementation
const FONT = {
  // Numbers
  0: [1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
  1: [1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
  2: [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
  3: [1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1],
  4: [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
  5: [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  6: [1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  8: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],

  // Lowercase letters
  a: [0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  b: [0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1],
  c: [0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1],
  d: [0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0],
  e: [0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1],
  f: [0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0],
  g: [0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1],
  h: [0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  i: [0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1],
  j: [0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0],
  k: [0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  l: [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1],
  m: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  n: [0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1],
  o: [0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0],
  p: [0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0],
  q: [0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1],
  r: [0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  s: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
  t: [0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  u: [0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1],
  v: [0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0],
  w: [0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  x: [0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
  y: [0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0],
  z: [0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1],

  // Uppercase letters
  A: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  B: [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
  C: [0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1],
  D: [1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
  E: [1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1],
  F: [1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0],
  G: [0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1],
  H: [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  I: [1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
  J: [1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0],
  K: [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  L: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1],
  M: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
  N: [1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
  O: [0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0],
  P: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0],
  Q: [0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1],
  R: [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  S: [0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
  T: [1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  U: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1],
  V: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0],
  W: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  X: [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
  Y: [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  Z: [1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1],

  // Special characters and symbols
  ' ': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  '!': [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  '#': [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  "'": [0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  '(': [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
  ')': [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
  '+': [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
  ',': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
  '-': [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  '<': [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  '=': [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0],
  '>': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
  '?': [1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0],
  '[': [1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0],
  ']': [0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1],
  '^': [0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  ':': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  '/': [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
  '{': [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1],
  '|': [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  '}': [1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0],
  '~': [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],

  // Special symbols from the original implementation
  $: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0],
  '@': [0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1],
  '%': [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1],
  '°': [0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  '*': [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],

  // Arrows and symbols
  '→': [0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0], // Right Arrow
  '←': [0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0], // Left Arrow
  '↑': [0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], // Up Arrow
  '↓': [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0], // Down Arrow

  // Special UI symbols
  '•': [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // Bullet (single center pixel)
  '"': [1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Double Quote
  ';': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0], // Semicolon
  '✓': [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0], // Checkmark
  '✗': [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // Cross Mark / Ballot X
  '♥': [0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0], // Heart
  '█': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Full Block
};

const FONT_W = 3;
const FONT_H = 5;
const CHAR_SP = 1;

async function httpPost(host, body, timeoutMs = 5000) {
  const url = `http://${host}/post`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const data = await res.json().catch(() => ({}));
    if (typeof data.error_code === 'number' && data.error_code !== 0) {
      throw new Error(`Pixoo err ${data.error_code}`);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Pixoo HTTP timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

async function tryInit(host, retryCount = 0, maxRetries = 3) {
  const maxDelay = 1000; // Maximum delay between retries
  const baseDelay = 200; // Base delay

  try {
    logger.info(
      `🔄 [INIT] Initializing device ${host} (attempt ${retryCount + 1}/${maxRetries + 1})`,
    );

    // First, try to reset HTTP GIF ID
    await httpPost(host, {
      Command: 'Draw/ResetHttpGifId',
    });

    // Small delay to let device process
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Then set channel to Custom mode
    await httpPost(host, {
      Command: 'Channel/SetIndex',
      SelectIndex: 3, // @index: 0 (Faces), 1 (Cloud Channel), 2 (Visualizer), 3 (Custom), 4 (Black screen)
    });

    logger.info(`✅ [INIT] Device ${host} initialized successfully`);
    return true;
  } catch (error) {
    logger.warn(
      `⚠️ [INIT] Device ${host} init attempt ${retryCount + 1} failed: ${error.message}`,
    );

    if (retryCount < maxRetries) {
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, retryCount) + Math.random() * 100,
        maxDelay,
      );
      logger.info(`🔄 [INIT] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return tryInit(host, retryCount + 1, maxRetries);
    }

    logger.error(
      `❌ [INIT] Failed to initialize device ${host} after ${maxRetries + 1} attempts`,
    );
    throw new Error(
      `Device initialization failed after ${maxRetries + 1} attempts: ${error.message}`,
    );
  }
}

class RealPixoo {
  constructor(host, size = 64) {
    this.host = host;
    this.size = size;
    this.buf = new Uint8Array(WIDTH * HEIGHT * 3);
    this.initialized = false;
    this.picIdCounter = 1; // start counter at 1
    this.lastSuccessfulPush = 0;
  }

  async isReady() {
    // Consider device ready if initialized and had a successful push in last 30 seconds
    const timeSinceLastSuccess = Date.now() - this.lastSuccessfulPush;
    return this.initialized && timeSinceLastSuccess < 30000;
  }

  async clear() {
    this.buf.fill(0);
  }

  _setPixel(x, y, r, g, b) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    const i = idx(x, y);
    this.buf[i] = r;
    this.buf[i + 1] = g;
    this.buf[i + 2] = b;
  }

  _blendPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    const i = idx(x, y);
    const alpha = clamp(a, 0, 255) / 255;
    const dr = this.buf[i];
    const dg = this.buf[i + 1];
    const db = this.buf[i + 2];
    this.buf[i] = Math.round(r * alpha + dr * (1 - alpha));
    this.buf[i + 1] = Math.round(g * alpha + dg * (1 - alpha));
    this.buf[i + 2] = Math.round(b * alpha + db * (1 - alpha));
  }

  async drawPixelRgba(pos, color) {
    const [x, y] = pos;
    const [r, g, b, a = 255] = color;
    this._blendPixel(x, y, r, g, b, a);
  }

  async drawLineRgba(start, end, color) {
    const [x0, y0] = start;
    const [x1, y1] = end;
    const [r, g, b, a = 255] = color;

    let x = x0 | 0;
    let y = y0 | 0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this._blendPixel(x, y, r, g, b, a);
      if (x === (x1 | 0) && y === (y1 | 0)) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  async drawRectangleRgba(pos, size, color) {
    const [x0, y0] = pos;
    const [w, h] = size;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        await this.drawPixelRgba([x0 + x, y0 + y], color);
      }
    }
  }

  // Alias for consistency with other device implementations
  async fillRectangleRgba(pos, size, color) {
    return this.drawRectangleRgba(pos, size, color);
  }

  _textWidth(str) {
    let w = 0;
    for (const ch of String(str)) {
      const glyph = FONT[ch] || FONT['?'] || FONT[' '];
      const gw = Math.floor(glyph.length / FONT_H) || FONT_W;
      w += gw + CHAR_SP;
    }
    return w > 0 ? w - CHAR_SP : 0;
  }

  async drawTextRgbaAligned(text, pos, color, align = 'left') {
    const [r, g, b, a = 255] = color;
    let [x, y] = pos;
    const str = String(text ?? '');

    const totalW = this._textWidth(str);
    if (align === 'right') x -= totalW;
    else if (align === 'center') {
      const chars = Array.from(str);
      // For odd-length strings, align the true center of the middle glyph
      if (chars.length % 2 === 1) {
        const midIndex = Math.floor(chars.length / 2);
        const leftStr = chars.slice(0, midIndex).join('');
        // Width of everything left of the middle glyph, including the spacing before middle
        const leftWidth =
          this._textWidth(leftStr) + (leftStr.length ? CHAR_SP : 0);
        // Width of the middle glyph itself
        const midWidth = this._textWidth(chars[midIndex]);
        x = x - Math.floor(midWidth / 2) - leftWidth;
      } else {
        // Even-length: standard centering with rounding
        x -= Math.round(totalW / 2);
      }
    }

    for (const ch of str) {
      const glyph = FONT[ch] || FONT[' '];
      const gw = Math.floor(glyph.length / FONT_H) || FONT_W;
      for (let i = 0; i < glyph.length; i++) {
        if (glyph[i]) {
          const px = x + (i % gw);
          const py = y + Math.floor(i / gw);
          this._blendPixel(px, py, r, g, b, a);
        }
      }
      x += gw + CHAR_SP;
    }
    return totalW;
  }

  async drawCustomFloatText(value, pos, color, align = 'right') {
    // Minimal version: apply your current rules (near-zero, <10 with 1 dec, otherwise int)
    let v = Number(value);
    if (!Number.isFinite(v)) return 0;

    const abs = Math.abs(v);
    let display;
    if (abs < 0.005) display = 0.0;
    else if (abs < 10) display = Math.round(v * 10) / 10;
    else display = Math.round(v);

    // Convert to string with up to one decimal for small values
    let str = String(display);
    if (abs < 10 && abs >= 0.005) {
      if (!str.includes('.')) str = `${str}.0`;
    }

    const w = this._textWidth(str);
    await this.drawTextRgbaAligned(str, pos, color, align);
    return w;
  }

  async push() {
    if (!this.initialized) {
      await tryInit(this.host);
      this.initialized = true;
    }

    // Always reset GIF ID before sending (with proper error handling)
    try {
      await httpPost(this.host, { Command: 'Draw/ResetHttpGifId' });
    } catch (error) {
      logger.warn(
        `⚠️ [PUSH] Failed to reset GIF ID for ${this.host}: ${error.message}`,
      );
      // Don't throw here, try to continue with the push
    }

    const base64 = Buffer.from(this.buf).toString('base64');

    // ✅ assign and increment counter safely
    const picId = this.picIdCounter++;
    if (this.picIdCounter > 9999) this.picIdCounter = 1;

    const body = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: WIDTH,
      PicHeight: HEIGHT,
      PicOffset: 0,
      PicID: picId, // ✅ unique ID each push
      PicSpeed: 1000,
      PicData: base64,
    };

    await httpPost(this.host, body);

    // Track successful push
    this.lastSuccessfulPush = Date.now();

    logger.info(
      `🟢 [PUSH OK] ${this.host} bytes=${this.buf.length} (full-frame) PicID=${picId}`,
    );
  }
}

async function softReset(host) {
  try {
    const response = await httpPost(host, { Command: 'Device/TimeAndReset' });
    logger.ok(`🔄 Soft reset done for ${host}`);
    return response.ReturnCode === 0;
  } catch (error) {
    logger.warn(`Soft reset failed for ${host}:`, { error: error.message });
    return false;
  }
}

module.exports = { RealPixoo, softReset };
