/**
 * @fileoverview Professional bitmap font system for Pixoo devices
 * @description Complete 3x5 bitmap font with exact character metrics and rendering utilities
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 * @stability Production-grade with exact font rendering
 */

// --- Font Constants ---
/**
 * Core font specifications - exact dimensions from Pixoo hardware
 */
const FONT_SPECS = Object.freeze({
  WIDTH: 3, // Character width in pixels
  HEIGHT: 5, // Character height in pixels
  SPACING: 1, // Pixels between characters
  LINE_HEIGHT: 7, // Total line height (5px char + 2px padding)
  BASELINE: 5, // Characters sit on this line (0-4 pixels)
});

/**
 * Complete 3x5 bitmap font - single source of truth for all text rendering
 * Each character is represented as 15 bits (3 columns x 5 rows) in column-major order
 */
const BITMAP_FONT = Object.freeze({
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

  // Special characters
  ' ': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Space
  '!': [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0], // Exclamation
  '"': [1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Double quote
  '#': [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1], // Hash
  $: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0], // Dollar
  '%': [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1], // Percent
  '&': [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0], // Ampersand
  "'": [0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Single quote
  '(': [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0], // Left parenthesis
  ')': [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0], // Right parenthesis
  '*': [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0], // Asterisk
  '+': [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], // Plus
  ',': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0], // Comma
  '-': [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0], // Minus
  '.': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], // Period
  '/': [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0], // Forward slash
  ':': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], // Colon
  ';': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0], // Semicolon
  '<': [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], // Less than
  '=': [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0], // Equals
  '>': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0], // Greater than
  '?': [1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0], // Question mark
  '@': [0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1], // At symbol
  '[': [1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0], // Left bracket
  '\\': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1], // Backslash
  ']': [0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1], // Right bracket
  '^': [0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Caret
  _: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1], // Underscore
  '`': [0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Backtick
  '{': [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1], // Left brace
  '|': [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], // Pipe
  '}': [1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0], // Right brace
  '~': [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // Tilde

  // Special symbols from original implementation
  '°': [0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], // Degree
  '→': [0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0], // Right Arrow
  '←': [0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0], // Left Arrow
  '↑': [0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], // Up Arrow
  '↓': [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0], // Down Arrow
  '•': [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // Bullet
  '✓': [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0], // Checkmark
  '✗': [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // X mark
  '♥': [0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0], // Heart
  '█': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Full block
});

/**
 * Calculate exact text dimensions using the real bitmap font
 * @param {string} text - Text to measure
 * @returns {Object} Exact dimensions {width, height}
 */
function measureText(text) {
  if (!text || typeof text !== 'string') {
    return { width: 0, height: FONT_SPECS.HEIGHT };
  }

  let totalWidth = 0;
  for (const char of text) {
    const glyph = BITMAP_FONT[char];
    if (glyph) {
      // Each glyph is 3 pixels wide (FONT_SPECS.WIDTH)
      totalWidth += FONT_SPECS.WIDTH + FONT_SPECS.SPACING;
    } else {
      // Unknown character, use default width
      totalWidth += FONT_SPECS.WIDTH + FONT_SPECS.SPACING;
    }
  }

  // Remove trailing spacing
  if (totalWidth > 0) {
    totalWidth -= FONT_SPECS.SPACING;
  }

  return {
    width: totalWidth,
    height: FONT_SPECS.HEIGHT,
  };
}

/**
 * Get exact character bounds for a specific character
 * @param {string} char - Single character to measure
 * @returns {Object} Character bounds {width, height}
 */
function getCharBounds(char) {
  const glyph = BITMAP_FONT[char];
  if (!glyph) {
    return { width: FONT_SPECS.WIDTH, height: FONT_SPECS.HEIGHT };
  }

  return {
    width: FONT_SPECS.WIDTH,
    height: FONT_SPECS.HEIGHT,
  };
}

/**
 * Render bitmap font character at exact position
 * @param {Object} device - Device interface
 * @param {string} char - Character to render
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number[]} color - RGBA color array
 * @param {number} alpha - Alpha value (0-255)
 */
function renderChar(device, char, x, y, color, alpha = 255) {
  const glyph = BITMAP_FONT[char];
  if (!glyph) return;

  const [r, g, b] = color;

  for (let i = 0; i < glyph.length; i++) {
    if (glyph[i]) {
      const px = x + (i % FONT_SPECS.WIDTH);
      const py = y + Math.floor(i / FONT_SPECS.WIDTH);
      device._blendPixel(px, py, r, g, b, alpha);
    }
  }
}

/**
 * Create a font renderer for the bitmap font
 * @param {Object} device - Device interface
 * @returns {Object} Font rendering utilities
 */
function createFontRenderer(device) {
  if (!device) {
    throw new Error('Invalid device interface');
  }

  return {
    /**
     * Measure text dimensions
     * @param {string} text - Text to measure
     */
    measure: (text) => measureText(text),

    /**
     * Get character bounds
     * @param {string} char - Character to measure
     */
    getCharBounds: (char) => getCharBounds(char),

    /**
     * Render single character
     * @param {string} char - Character to render
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number[]} color - RGBA color
     * @param {number} alpha - Alpha value
     */
    renderChar: (char, x, y, color, alpha = 255) =>
      renderChar(device, char, x, y, color, alpha),

    /**
     * Get font specifications
     */
    getSpecs: () => ({ ...FONT_SPECS }),

    /**
     * Get available characters
     */
    getAvailableChars: () => Object.keys(BITMAP_FONT),
  };
}

module.exports = {
  BITMAP_FONT,
  FONT_SPECS,
  measureText,
  getCharBounds,
  renderChar,
  createFontRenderer,
};
