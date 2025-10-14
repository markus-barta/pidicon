/**
 * @fileoverview AWTRIX Canvas Adapter
 * @description Provides Pixoo-like canvas interface for AWTRIX devices
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const AWTRIX_CONSTANTS = require('./constants');

/**
 * Canvas adapter for AWTRIX devices
 * Provides compatibility layer between scenes and AWTRIX driver
 *
 * @example
 * const canvas = new AwtrixCanvas(awtrixDriver);
 * canvas.drawText('Hello', [0, 0], [255, 255, 255]);
 * await canvas.push();
 */
class AwtrixCanvas {
  constructor(driver = null) {
    this.driver = driver;
    this.width = AWTRIX_CONSTANTS.WIDTH;
    this.height = AWTRIX_CONSTANTS.HEIGHT;

    // Internal buffer for accumulated operations
    this.operations = [];
    this.cleared = false;
  }

  /**
   * Set the device driver (for DeviceProxy compatibility)
   * @param {Object} deviceProxy - DeviceProxy instance containing driver impl
   */
  setDevice(deviceProxy) {
    // For Awtrix, we use the impl (AwtrixDriver) from DeviceProxy
    this.driver = deviceProxy.impl;
  }

  // ============================================================================
  // DRAWING METHODS
  // ============================================================================

  /**
   * Draw text
   * @param {string} text - Text to draw
   * @param {Array<number>} pos - [x, y] position (ignored on AWTRIX)
   * @param {Array<number>|string} color - RGB array or hex string
   * @param {string} [align='left'] - Alignment (ignored on AWTRIX)
   */
  async drawText(text, _pos, color, _align = 'left') {
    this.operations.push({
      type: 'text',
      text,
      color: this._parseColor(color),
    });
  }

  /**
   * Draw filled text (same as drawText on AWTRIX)
   */
  async drawFilledText(text, pos, color, align = 'left') {
    return await this.drawText(text, pos, color, align);
  }

  /**
   * Draw a line
   * @param {Array<number>} start - [x1, y1]
   * @param {Array<number>} end - [x2, y2]
   * @param {Array<number>|string} color - RGB array or hex string
   */
  async drawLine(start, end, color) {
    await this.driver.drawLine(start, end, this._parseColorToRgb(color));
  }

  /**
   * Fill rectangle
   * @param {Array<number>} topLeft - [x1, y1]
   * @param {Array<number>} bottomRight - [x2, y2]
   * @param {Array<number>|string} color - RGB array or hex string
   */
  async fillRect(topLeft, bottomRight, color) {
    await this.driver.fillRect(
      topLeft,
      bottomRight,
      this._parseColorToRgb(color),
    );
  }

  /**
   * Draw rectangle outline
   * @param {Array<number>} topLeft - [x1, y1]
   * @param {Array<number>} bottomRight - [x2, y2]
   * @param {Array<number>|string} color - RGB array or hex string
   */
  async drawRect(topLeft, bottomRight, color) {
    const [x1, y1] = topLeft;
    const [x2, y2] = bottomRight;
    const rgb = this._parseColorToRgb(color);

    // Draw four lines
    await this.driver.drawLine([x1, y1], [x2, y1], rgb); // Top
    await this.driver.drawLine([x2, y1], [x2, y2], rgb); // Right
    await this.driver.drawLine([x2, y2], [x1, y2], rgb); // Bottom
    await this.driver.drawLine([x1, y2], [x1, y1], rgb); // Left
  }

  /**
   * Draw a single pixel
   * @param {Array<number>} pos - [x, y]
   * @param {Array<number>|string} color - RGB array or hex string
   */
  async drawPixel(pos, color) {
    await this.driver.drawPixel(pos, this._parseColorToRgb(color));
  }

  /**
   * Set a single pixel (alias for drawPixel)
   */
  async setPixel(pos, color) {
    return await this.drawPixel(pos, color);
  }

  // ============================================================================
  // IMAGE METHODS
  // ============================================================================

  /**
   * Send image data to display
   * @param {Array<number>|Object} data - Pixel array or {frame: pixels}
   */
  async sendImage(data) {
    return await this.driver.sendImage(data);
  }

  /**
   * Draw image (alias for sendImage)
   */
  async drawImage(data, _x, _y) {
    return await this.sendImage(data);
  }

  // ============================================================================
  // DISPLAY CONTROL
  // ============================================================================

  /**
   * Clear the display
   */
  async clear() {
    this.operations = [];
    this.cleared = true;
    return await this.driver.clear();
  }

  /**
   * Push accumulated operations to device
   */
  async push() {
    if (this.operations.length === 0 && !this.cleared) {
      return true; // Nothing to do
    }

    if (this.cleared) {
      this.cleared = false;
      if (this.operations.length === 0) {
        return true; // Just cleared, no new operations
      }
    }

    // Combine text operations into a single custom app
    const textOps = this.operations.filter((op) => op.type === 'text');
    if (textOps.length > 0) {
      // Take the last text operation (most recent)
      const lastText = textOps[textOps.length - 1];
      await this.driver.createCustomApp(this.driver.currentApp, {
        text: lastText.text,
        color: lastText.color,
      });
    }

    // Push any buffered pixel data
    if (this.driver.buffer.dirty) {
      await this.driver.push();
    }

    this.operations = [];
    return true;
  }

  /**
   * Set brightness
   * @param {number} level - Brightness (0-255)
   */
  async setBrightness(level) {
    return await this.driver.setBrightness(level);
  }

  // ============================================================================
  // AWTRIX-SPECIFIC METHODS
  // ============================================================================

  /**
   * Show notification (AWTRIX-specific)
   * @param {Object} notification - Notification config
   */
  async showNotification(notification) {
    return await this.driver.showNotification(notification);
  }

  /**
   * Create custom app (AWTRIX-specific)
   * @param {string} appName - App name
   * @param {Object} appData - App configuration
   */
  async createCustomApp(appName, appData) {
    return await this.driver.createCustomApp(appName, appData);
  }

  /**
   * Play RTTTL tone (AWTRIX-specific)
   * @param {string} rtttl - RTTTL string
   */
  async playRTTTL(rtttl) {
    return await this.driver.playRTTTL(rtttl);
  }

  /**
   * Update settings (AWTRIX-specific)
   * @param {Object} settings - Settings object
   */
  async updateSettings(settings) {
    return await this.driver.updateSettings(settings);
  }

  // ============================================================================
  // COMPATIBILITY METHODS
  // ============================================================================

  /**
   * Get display dimensions
   * @returns {Object} {width, height}
   */
  getSize() {
    return {
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Check if position is in bounds
   * @param {Array<number>} pos - [x, y]
   * @returns {boolean}
   */
  isInBounds(pos) {
    const [x, y] = pos;
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Parse color to AWTRIX hex format
   * @private
   */
  _parseColor(color) {
    if (typeof color === 'string') {
      return color.startsWith('#') ? color : `#${color}`;
    }
    if (Array.isArray(color)) {
      const [r, g, b] = color;
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    return '#FFFFFF'; // Default white
  }

  /**
   * Parse color to RGB array
   * @private
   */
  _parseColorToRgb(color) {
    if (Array.isArray(color)) {
      return color;
    }
    if (typeof color === 'string') {
      const hex = color.startsWith('#') ? color.slice(1) : color;
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return [r, g, b];
    }
    return [255, 255, 255]; // Default white
  }
}

module.exports = AwtrixCanvas;
