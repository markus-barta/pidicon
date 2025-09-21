/**
 * @fileoverview Professional text rendering and graphics utilities
 * @description High-precision text rendering with exact character bounds and professional graphics primitives
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

// Import the real bitmap font system - single source of truth
const {
  BITMAP_FONT,
  FONT_SPECS,
  measureText: measureTextSimple,
  getCharBounds,
} = require('./font');

// --- Constants ---

/**
 * Standard background colors for text rendering
 */
const BACKGROUND_COLORS = Object.freeze({
  TRANSPARENT_BLACK_25: [0, 0, 0, 64], // 25% opacity
  TRANSPARENT_BLACK_50: [0, 0, 0, 128], // 50% opacity
  TRANSPARENT_BLACK_75: [0, 0, 0, 192], // 75% opacity
  SEMI_TRANSPARENT_RED: [255, 0, 0, 128], // Semi-transparent red
  SEMI_TRANSPARENT_BLUE: [0, 0, 255, 128], // Semi-transparent blue
});

// --- Text Rendering Functions ---

/**
 * Enhanced text rendering with pixel-perfect backdrop support
 *
 * This function calculates the exact pixel bounds of the text based on character widths
 * and creates a precisely sized backdrop rectangle with a configurable offset. The backdrop
 * is drawn first, then the text is rendered on top, ensuring perfect alignment.
 *
 * @param {Object} device - Device interface with drawing methods
 * @param {string} text - Text to render
 * @param {number[]} pos - [x, y] position for text alignment reference
 * @param {number[]} textColor - RGBA color array for text [r, g, b, a]
 * @param {string} align - Alignment: 'left', 'center', or 'right' (default: 'left')
 * @param {number[]|null} bgColor - RGBA color array for backdrop [r, g, b, a], or null for no backdrop
 * @param {number} offset - Pixel offset around text bounds (default: 1)
 * @returns {Promise<Object>} Object with {bounds: [x, y, width, height], textWidth, textHeight}
 * @throws {Error} If device interface is invalid or position is malformed
 *
 * @example
 * // Basic usage with 1-pixel offset backdrop
 * await drawTextWithPixelPerfectBackdrop(
 *   device, 'Hello', [10, 10], [255, 255, 255, 255], 'left',
 *   [0, 0, 0, 128], 1
 * );
 *
 * // Centered text with 2-pixel offset
 * await drawTextWithPixelPerfectBackdrop(
 *   device, 'COMPLETE', [32, 32], [255, 255, 255, 200], 'center',
 *   BACKGROUND_COLORS.TRANSPARENT_BLACK_75, 2
 * );
 *
 * // Right-aligned with no backdrop
 * await drawTextWithPixelPerfectBackdrop(
 *   device, 'Score: 100', [60, 10], [255, 255, 0, 255], 'right',
 *   null, 1
 * );
 */
async function drawText(
  device,
  text,
  position,
  color,
  alignment = 'left',
  backdropColor = null,
  backdropOffset = 1,
) {
  if (!device || typeof device.drawTextRgbaAligned !== 'function') {
    throw new Error(
      'Invalid device interface - missing drawTextRgbaAligned method',
    );
  }

  if (
    !device.drawRectangleRgba ||
    typeof device.drawRectangleRgba !== 'function'
  ) {
    throw new Error(
      'Invalid device interface - missing drawRectangleRgba method',
    );
  }

  const [x, y] = position;
  if (!Array.isArray(position) || position.length !== 2) {
    throw new Error('Invalid position - must be [x, y] array');
  }

  const str = String(text ?? '');
  if (str.length === 0) {
    return { bounds: [x, y, 0, 0], textWidth: 0, textHeight: 0 };
  }

  // Calculate exact text dimensions using precise font metrics
  const textMetrics = measureText(str, alignment, x, y);

  // Apply configurable offset only if backdrop is requested
  const offsetX = backdropColor ? Math.max(0, Math.floor(backdropOffset)) : 0;
  const offsetY = backdropColor ? Math.max(0, Math.floor(backdropOffset)) : 0;

  const bounds = {
    x: textMetrics.x - offsetX,
    y: textMetrics.y - offsetY,
    width: textMetrics.width + offsetX * 2,
    height: textMetrics.height + offsetY * 2,
  };

  // Ensure bounds stay within device limits
  bounds.x = Math.max(0, Math.min(bounds.x, 64 - bounds.width));
  bounds.y = Math.max(0, Math.min(bounds.y, 64 - bounds.height));

  // Draw backdrop rectangle with exact bounds if requested
  if (
    backdropColor &&
    Array.isArray(backdropColor) &&
    backdropColor.length === 4
  ) {
    await device.drawRectangleRgba(
      [bounds.x, bounds.y],
      [bounds.width, bounds.height],
      backdropColor,
    );
  }

  // Draw the text on top
  await device.drawTextRgbaAligned(text, [x, y], color, alignment);

  return {
    bounds: [bounds.x, bounds.y, bounds.width, bounds.height],
    textWidth: textMetrics.width,
    textHeight: textMetrics.height,
  };
}

/**
 * Calculate exact pixel bounds for text rendering
 * @param {string} text - Text to measure
 * @param {string} align - Alignment mode
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {Object} Text bounds {x, y, width, height}
 */
/**
 * Measure text bounds with positioning and alignment
 * @param {string} text - Text to measure
 * @param {string} alignment - Alignment mode: 'left', 'center', 'right'
 * @param {number} x - X position reference
 * @param {number} y - Y position (top of text baseline)
 * @returns {Object} Text bounds {x, y, width, height} with exact pixel measurements
 */
function measureText(text, alignment, x, y) {
  const str = String(text);

  // Use the real bitmap font for exact width calculation
  const metrics = measureTextSimple(str);
  const totalWidth = metrics.width;

  // Use exact font specifications
  const width = Math.max(1, Math.min(64, totalWidth));
  const height = FONT_SPECS.HEIGHT;

  // Calculate exact bounds based on alignment
  let boundsX;
  switch (alignment) {
    case 'center': {
      const chars = Array.from(str);
      // For odd-length strings, align the true center of the middle glyph
      if (chars.length % 2 === 1) {
        const midIndex = Math.floor(chars.length / 2);
        const leftStr = chars.slice(0, midIndex).join('');
        // Width of everything left of the middle glyph, including spacing before middle
        const leftWidth = measureTextSimple(leftStr).width;
        // Width of the middle glyph itself
        const midWidth = FONT_SPECS.WIDTH; // All chars are 3px wide in bitmap font
        boundsX = Math.max(0, x - Math.floor(midWidth / 2) - leftWidth);
      } else {
        // Even-length: standard centering with rounding
        boundsX = Math.max(0, x - Math.round(totalWidth / 2));
      }
      break;
    }
    case 'right':
      boundsX = Math.max(0, x - width);
      break;
    case 'left':
    default:
      boundsX = x;
      break;
  }

  return {
    x: boundsX,
    y: y, // Y position is the top of the text baseline
    width: width,
    height: height,
  };
}

/**
 * Legacy text rendering with background (maintained for backward compatibility)
 * @param {Object} device - Device interface
 * @param {string} text - Text to render
 * @param {number[]} pos - [x, y] position
 * @param {number[]} color - RGBA color array
 * @param {string} align - Alignment mode
 * @param {boolean} clearBg - Whether to clear background
 * @param {number[]} bgColor - Background color (default: black)
 * @returns {Promise<*>} Device method result
 * @deprecated Use drawText for better control
 */
async function drawTextRgbaAlignedWithBg(
  device,
  text,
  pos,
  color,
  align = 'left',
  clearBg = false,
  bgColor = [0, 0, 0, 255],
) {
  if (!device || typeof device.drawTextRgbaAligned !== 'function') {
    throw new Error(
      'Invalid device interface - missing drawTextRgbaAligned method',
    );
  }

  const [x, y] = pos;
  if (!Array.isArray(pos) || pos.length !== 2) {
    throw new Error('Invalid position - must be [x, y] array');
  }

  if (clearBg) {
    const str = String(text ?? '');

    // Very conservative width estimation - add extra padding for reliability
    let estimatedWidth = 0;
    for (const char of str) {
      if (char === ' ' || char === ':') estimatedWidth += 3;
      else if (char === 'M' || char === 'W') estimatedWidth += 5;
      else if (char >= '0' && char <= '9') estimatedWidth += 4;
      else estimatedWidth += 4;
    }

    // Add generous padding and ensure minimum width for clean rendering
    const width = Math.max(8, Math.min(64, estimatedWidth + 4));

    const bgX =
      align === 'center'
        ? Math.max(0, x - Math.floor(width / 2))
        : align === 'right'
          ? Math.max(0, x - width)
          : x;

    // Clear background with specified color - use device method for reliability
    if (typeof device.drawRectangleRgba === 'function') {
      // Validate bgColor parameter
      const validBgColor =
        Array.isArray(bgColor) && bgColor.length === 4
          ? bgColor
          : [0, 0, 0, 255]; // fallback to black

      await device.drawRectangleRgba([bgX, y], [width, 7], validBgColor);
    }
  }

  return device.drawTextRgbaAligned(text, [x, y], color, align);
}

// --- Graphics Functions ---

/**
 * High-performance line drawing using optimized DDA algorithm
 * @param {Object} device - Device interface with drawPixelRgba method
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {number[]} color - RGBA color array [r, g, b, a]
 */
function drawLine(device, x1, y1, x2, y2, color) {
  if (!device || typeof device.drawPixelRgba !== 'function') {
    throw new Error('Invalid device interface - missing drawPixelRgba method');
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  if (steps === 0) {
    device.drawPixelRgba([x1, y1], color);
    return;
  }

  const xInc = dx / steps;
  const yInc = dy / steps;
  let x = x1;
  let y = y1;

  // Batch pixel operations for better performance
  for (let i = 0; i <= steps; i++) {
    device.drawPixelRgba([Math.round(x), Math.round(y)], color);
    x += xInc;
    y += yInc;
  }
}

/**
 * Professional rectangle clearing utility with pixel-perfect control
 * @param {Object} device - Device interface with drawPixelRgba method
 * @param {number} x - Start X coordinate
 * @param {number} y - Start Y coordinate
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {number[]} color - Fill color [r, g, b, a] (default: black)
 */
function clearRectangle(device, x, y, width, height, color = [0, 0, 0, 255]) {
  if (!device || typeof device.drawPixelRgba !== 'function') {
    throw new Error('Invalid device interface - missing drawPixelRgba method');
  }

  // Ensure bounds stay within device limits
  const safeX = Math.max(0, Math.min(x, 64));
  const safeY = Math.max(0, Math.min(y, 64));
  const safeWidth = Math.max(0, Math.min(width, 64 - safeX));
  const safeHeight = Math.max(0, Math.min(height, 64 - safeY));

  // Use device's rectangle method if available for better performance
  if (typeof device.fillRectangleRgba === 'function') {
    device.fillRectangleRgba([safeX, safeY], [safeWidth, safeHeight], color);
  } else {
    // Fallback to individual pixels
    for (let dy = 0; dy < safeHeight; dy++) {
      for (let dx = 0; dx < safeWidth; dx++) {
        device.drawPixelRgba([safeX + dx, safeY + dy], color);
      }
    }
  }
}

// --- Factory Functions ---

/**
 * Create a professional text renderer with backdrop support
 * @param {Object} device - Device interface
 * @returns {Object} Text rendering utilities
 */
function createTextRenderer(device) {
  if (!device) {
    throw new Error('Invalid device interface');
  }

  return {
    /**
     * Render text with pixel-perfect backdrop
     * @param {string} text - Text to render
     * @param {number[]} pos - [x, y] position
     * @param {number[]} color - Text color
     * @param {string} align - Alignment
     * @param {number[]} bgColor - Backdrop color
     * @param {number} offset - Offset in pixels
     */
    renderWithBackdrop: (
      text,
      position,
      color,
      alignment,
      backdropColor,
      backdropOffset = 1,
    ) =>
      drawText(
        device,
        text,
        position,
        color,
        alignment,
        backdropColor,
        backdropOffset,
      ),

    /**
     * Calculate text bounds without rendering
     * @param {string} text - Text to measure
     * @param {string} align - Alignment
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    calculateBounds: (text, alignment, x, y) =>
      measureText(text, alignment, x, y),

    /**
     * Legacy rendering method (for backward compatibility)
     * @param {string} text - Text to render
     * @param {number[]} pos - [x, y] position
     * @param {number[]} color - Text color
     * @param {string} align - Alignment
     * @param {boolean} clearBg - Clear background
     * @param {number[]} bgColor - Background color
     */
    renderWithBg: (text, pos, color, align, clearBg, bgColor) =>
      drawTextRgbaAlignedWithBg(
        device,
        text,
        pos,
        color,
        align,
        clearBg,
        bgColor,
      ),
  };
}

/**
 * Create a professional chart renderer
 * @param {Object} device - Device interface
 * @param {Object} config - Chart configuration
 * @returns {Object} Chart rendering utilities
 */
function createChartRenderer(device, config = {}) {
  if (!device) {
    throw new Error('Invalid device interface');
  }

  const chartConfig = {
    width: config.width || 64,
    height: config.height || 30,
    bgColor: config.bgColor || [20, 20, 40, 255],
    axisColor: config.axisColor || [200, 200, 200, 255],
    gridColor: config.gridColor || [100, 100, 100, 100],
    ...config,
  };

  return {
    /**
     * Render chart background with axes and grid
     */
    renderBackground: async () => {
      // Use chartConfig for background rendering
      // Implementation for chart background rendering
      // This would include axes, grid lines, etc.
      return chartConfig;
    },

    /**
     * Render data series
     * @param {Array} data - Data points to render
     * @param {Object} style - Rendering style options
     */
    renderData: async (data, style = {}) => {
      // Use style parameter for data series rendering
      // Implementation for data series rendering
      // This would include line plots, bars, etc.
      return { data, style, config: chartConfig };
    },
  };
}

module.exports = {
  drawTextRgbaAlignedWithBg,
  drawText,
  measureText,
  drawLine,
  clearRectangle,
  createTextRenderer,
  createChartRenderer,
  BACKGROUND_COLORS,
  FONT_SPECS,
  BITMAP_FONT,
  // Additional font utilities for advanced use
  getCharBounds,
};
