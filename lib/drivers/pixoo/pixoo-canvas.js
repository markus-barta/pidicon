/**
 * @fileoverview PixooCanvas - Unified Device API for Pixoo Daemon
 * @description Provides a clean, consistent interface for all drawing operations
 * with proper validation, bounds checking, and backward compatibility.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const logger = require('./logger');

/**
 * PixooCanvas - Unified drawing API for Pixoo devices
 * Provides consistent method naming, validation, and backward compatibility
 */
class PixooCanvas {
  constructor(device = null) {
    this.device = device;
    this.host = device?.host || 'unknown';
    this._deprecatedWarnings = new Set();
  }

  /**
   * Set the underlying device (for composition pattern)
   * @param {Object} device - Device instance
   */
  setDevice(device) {
    if (!device) {
      throw new Error('Device instance is required');
    }
    this.device = device;
    this.host = device.host || 'unknown';
  }

  /**
   * Ensure device is set before operations
   * @private
   */
  _ensureDevice() {
    if (!this.device) {
      throw new Error(
        'Device not set. Call setDevice() first or pass device to constructor.',
      );
    }
  }

  /**
   * Clear the entire display
   * @returns {Promise<void>}
   */
  async clear() {
    this._ensureDevice();
    return this.device.clear();
  }

  /**
   * Draw a single pixel
   * @param {number[]} position - [x, y] coordinates
   * @param {number[]} color - RGBA color array [r, g, b, a]
   * @returns {Promise<void>}
   */
  async drawPixel(position, color) {
    this._ensureDevice();
    this._validatePosition(position);
    this._validateColor(color);
    return this.device.drawPixelRgba(position, color);
  }

  /**
   * Draw a line between two points
   * @param {number[]} start - [x, y] start coordinates
   * @param {number[]} end - [x, y] end coordinates
   * @param {number[]} color - RGBA color array [r, g, b, a]
   * @returns {Promise<void>}
   */
  async drawLine(start, end, color) {
    this._ensureDevice();
    this._validatePosition(start);
    this._validatePosition(end);
    this._validateColor(color);
    return this.device.drawLineRgba(start, end, color);
  }

  /**
   * Draw a filled rectangle
   * @param {number[]} position - [x, y] top-left coordinates
   * @param {number[]} size - [width, height] dimensions
   * @param {number[]} color - RGBA color array [r, g, b, a]
   * @returns {Promise<void>}
   */
  async fillRect(position, size, color) {
    this._ensureDevice();
    this._validatePosition(position);
    this._validateSize(size);
    this._validateColor(color);
    return this.device.fillRectangleRgba(position, size, color);
  }

  /**
   * Draw a rectangle outline
   * @param {number[]} position - [x, y] top-left coordinates
   * @param {number[]} size - [width, height] dimensions
   * @param {number[]} color - RGBA color array [r, g, b, a]
   * @returns {Promise<void>}
   */
  async drawRect(position, size, color) {
    this._ensureDevice();
    this._validatePosition(position);
    this._validateSize(size);
    this._validateColor(color);
    return this.device.drawRectangleRgba(position, size, color);
  }

  /**
   * Draw text with alignment
   * @param {string} text - Text to render
   * @param {number[]} position - [x, y] position for text alignment
   * @param {number[]} color - RGBA color array [r, g, b, a]
   * @param {string} alignment - 'left', 'center', or 'right'
   * @returns {Promise<void>}
   */
  async drawText(text, position, color, alignment = 'left') {
    this._ensureDevice();
    if (typeof text !== 'string') {
      throw new Error(`Text must be a string, got ${typeof text}`);
    }
    this._validatePosition(position);
    this._validateColor(color);
    this._validateAlignment(alignment);

    return this.device.drawTextRgbaAligned(text, position, color, alignment);
  }

  /**
   * Draw formatted number text (for prices, temperatures, etc.)
   * @param {number} value - Numeric value to display
   * @param {number[]} position - [x, y] position
   * @param {number[]} color - RGBA color array [r, g, b, a]
   * @param {string} alignment - 'left', 'center', or 'right'
   * @param {number} maxDigits - Maximum total digits to display
   * @returns {Promise<number>} Width of rendered text
   */
  async drawNumber(value, position, color, alignment = 'right', maxDigits = 2) {
    this._ensureDevice();
    if (typeof value !== 'number' && !isNaN(Number(value))) {
      value = Number(value);
    }
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Value must be a valid number, got ${value}`);
    }
    this._validatePosition(position);
    this._validateColor(color);
    this._validateAlignment(alignment);

    return this.device.drawCustomFloatText(
      value,
      position,
      color,
      alignment,
      maxDigits,
    );
  }

  /**
   * Draw an image with alpha transparency
   * @param {string} path - Path to image file
   * @param {number[]} position - [x, y] position
   * @param {number[]} size - [width, height] dimensions
   * @param {number} alpha - Alpha transparency (0-255, default 255)
   * @returns {Promise<void>}
   */
  async drawImage(path, position, size, alpha = 255) {
    this._ensureDevice();
    if (typeof path !== 'string') {
      throw new Error(`Image path must be a string, got ${typeof path}`);
    }
    this._validatePosition(position);
    this._validateSize(size);
    this._validateAlpha(alpha);

    return this.device.drawImageWithAlpha(path, position, size, alpha);
  }

  /**
   * Push the current frame to the device
   * @param {string} sceneName - Name of the scene for logging
   * @param {Function} publishOk - Callback for success metrics
   * @returns {Promise<number>} Number of changed pixels
   */
  async push(sceneName = 'unknown', publishOk = null) {
    this._ensureDevice();
    return this.device.push(sceneName, publishOk);
  }

  /**
   * Get device metrics
   * @returns {Object} Device performance metrics
   */
  getMetrics() {
    this._ensureDevice();
    return this.device.getMetrics();
  }

  /**
   * Check if device is ready
   * @returns {Promise<boolean>} True if device is ready
   */
  async isReady() {
    this._ensureDevice();
    return this.device.isReady();
  }

  // ============================================================================
  // BACKWARD COMPATIBILITY METHODS (with deprecation warnings)
  // ============================================================================

  /**
   * @deprecated Use drawPixel() instead
   */
  async drawPixelRgba(position, color) {
    this._ensureDevice();
    this._warnDeprecated('drawPixelRgba', 'drawPixel');
    return this.drawPixel(position, color);
  }

  /**
   * @deprecated Use drawLine() instead
   */
  async drawLineRgba(start, end, color) {
    this._ensureDevice();
    this._warnDeprecated('drawLineRgba', 'drawLine');
    return this.drawLine(start, end, color);
  }

  /**
   * @deprecated Use fillRect() instead
   */
  async fillRectangleRgba(position, size, color) {
    this._ensureDevice();
    this._warnDeprecated('fillRectangleRgba', 'fillRect');
    return this.fillRect(position, size, color);
  }

  /**
   * @deprecated Use drawRect() instead
   */
  async drawRectangleRgba(position, size, color) {
    this._ensureDevice();
    this._warnDeprecated('drawRectangleRgba', 'drawRect');
    return this.drawRect(position, size, color);
  }

  /**
   * @deprecated Use drawText() instead
   */
  async drawTextRgbaAligned(text, position, color, alignment = 'left') {
    this._ensureDevice();
    this._warnDeprecated('drawTextRgbaAligned', 'drawText');
    return this.drawText(text, position, color, alignment);
  }

  /**
   * @deprecated Use drawNumber() instead
   */
  async drawCustomFloatText(
    value,
    position,
    color,
    alignment = 'right',
    maxDigits = 2,
  ) {
    this._ensureDevice();
    this._warnDeprecated('drawCustomFloatText', 'drawNumber');
    return this.drawNumber(value, position, color, alignment, maxDigits);
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  _validatePosition(position) {
    if (!Array.isArray(position) || position.length !== 2) {
      throw new Error(`Position must be [x, y] array, got ${position}`);
    }
    const [x, y] = position;
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      isNaN(x) ||
      isNaN(y)
    ) {
      throw new Error(
        `Position coordinates must be valid numbers, got [${x}, ${y}]`,
      );
    }
    if (x < 0 || x > 63 || y < 0 || y > 63) {
      logger.warn(
        `Position [${x}, ${y}] is outside device bounds [0,0]-[63,63]`,
      );
    }
  }

  _validateSize(size) {
    if (!Array.isArray(size) || size.length !== 2) {
      throw new Error(`Size must be [width, height] array, got ${size}`);
    }
    const [width, height] = size;
    if (
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      isNaN(width) ||
      isNaN(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error(
        `Size dimensions must be positive numbers, got [${width}, ${height}]`,
      );
    }
  }

  _validateColor(color) {
    if (!Array.isArray(color) || color.length !== 4) {
      throw new Error(`Color must be [r, g, b, a] array, got ${color}`);
    }
    const [r, g, b, a] = color;
    if (
      !color.every(
        (c) => typeof c === 'number' && !isNaN(c) && c >= 0 && c <= 255,
      )
    ) {
      throw new Error(
        `Color components must be numbers 0-255, got [${r}, ${g}, ${b}, ${a}]`,
      );
    }
  }

  _validateAlignment(alignment) {
    const validAlignments = ['left', 'center', 'right'];
    if (!validAlignments.includes(alignment)) {
      throw new Error(
        `Alignment must be one of ${validAlignments.join(', ')}, got '${alignment}'`,
      );
    }
  }

  _validateAlpha(alpha) {
    if (typeof alpha !== 'number' || isNaN(alpha) || alpha < 0 || alpha > 255) {
      throw new Error(`Alpha must be a number 0-255, got ${alpha}`);
    }
  }

  _warnDeprecated(oldMethod, newMethod) {
    if (!this._deprecatedWarnings.has(oldMethod)) {
      this._deprecatedWarnings.add(oldMethod);
      logger.warn(
        `⚠️ [${this.host}] Deprecated method '${oldMethod}' used. Consider using '${newMethod}' instead.`,
      );
    }
  }
}

module.exports = PixooCanvas;
