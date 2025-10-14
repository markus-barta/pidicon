/**
 * @fileoverview Pixoo 64x64 Device Driver
 * @description Driver implementation for Pixoo 64x64 pixel displays
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const PIXOO_CONSTANTS = require('./constants');
const { DEVICE_PROFILES } = require('../../core/device-capabilities');
const DeviceDriver = require('../../core/device-driver');
const pixooHttp = require('../../pixoo-http');

// Mock device class for testing
class MockPixooDevice {
  constructor(host, size) {
    this.host = host;
    this.size = size;
    this.buf = new Uint8Array(size * size * 3);
    this.initialized = true;
  }

  async push() {
    // No-op for mock
  }
  async clear() {
    this.buf.fill(0);
  }
  drawPixel(_x, _y, _r, _g, _b, _a) {
    // No-op for mock
  }
  async drawPixelRgba(_pos, _color) {
    // No-op for mock
  }
  async drawText(_text, _x, _y, _r, _g, _b, _a, _align) {
    // No-op for mock
  }
  drawLine(_x1, _y1, _x2, _y2, _r, _g, _b, _a) {
    // No-op for mock
  }
  async drawLineRgba(_start, _end, _color) {
    // No-op for mock
  }
  async fillRect(_x1, _y1, _x2, _y2, _r, _g, _b, _a) {
    // No-op for mock
  }
  async drawRectangleRgba(_pos, _size, _color) {
    // No-op for mock
  }
  async fillRectangleRgba(_pos, _size, _color) {
    // No-op for mock
  }
  async drawTextRgbaAligned(_text, _pos, _color, _align) {
    // No-op for mock
  }
  async drawCustomFloatText(_value, _pos, _color, _decimalPlaces, _suffix) {
    // No-op for mock
  }
  async setBrightness(_level) {
    return false;
  }
  isReady() {
    return true;
  }
}

/**
 * Pixoo 64x64 driver implementation
 * Wraps existing pixoo-http implementation with DeviceDriver interface
 */
class PixooDriver extends DeviceDriver {
  constructor(host, driverType = 'real') {
    super(host, DEVICE_PROFILES.PIXOO64);
    this.driverType = driverType;

    // Create underlying Pixoo device instance
    if (driverType === 'real') {
      this.device = new pixooHttp.RealPixoo(host, PIXOO_CONSTANTS.WIDTH);
    } else {
      this.device = new MockPixooDevice(host, PIXOO_CONSTANTS.WIDTH);
    }

    this.buffer = this.device; // For backward compatibility
  }

  /**
   * Initialize the Pixoo device
   */
  async initialize() {
    if (this.driverType === 'real') {
      // tryInit is not a method of device, it's called internally by push()
      // For real devices, initialization happens on first push
    }
    this.metrics.lastPushTime = Date.now();
  }

  /**
   * Clear the display (all pixels black)
   */
  async clear() {
    await this.device.clear();
  }

  /**
   * Push the current buffer to the device
   */
  async push() {
    try {
      await this.device.push();
      this.metrics.pushCount++;
      this.metrics.lastPushTime = Date.now();
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastErrorTime = Date.now();
      throw error;
    }
  }

  /**
   * Draw a single pixel
   */
  async drawPixel(pos, color) {
    const [x, y] = pos;
    const [r, g, b, a = 255] = color;
    this.device.drawPixel(x, y, r, g, b, a);
  }

  /**
   * Draw a single pixel (RGBA format - old API)
   */
  async drawPixelRgba(pos, color) {
    return this.device.drawPixelRgba(pos, color);
  }

  /**
   * Draw text on the display
   */
  async drawText(text, pos, color, align = 'left') {
    const [x, y] = pos;
    const [r, g, b, a = 255] = color;
    await this.device.drawText(text, x, y, r, g, b, a, align);
  }

  /**
   * Draw text with RGBA color and alignment (old API)
   */
  async drawTextRgbaAligned(text, pos, color, align = 'left') {
    return this.device.drawTextRgbaAligned(text, pos, color, align);
  }

  /**
   * Draw custom float text (old API)
   */
  async drawCustomFloatText(value, pos, color, decimalPlaces = 1, suffix = '') {
    if (this.device.drawCustomFloatText) {
      return this.device.drawCustomFloatText(
        value,
        pos,
        color,
        decimalPlaces,
        suffix,
      );
    }
  }

  /**
   * Draw a line
   */
  async drawLine(start, end, color) {
    const [x1, y1] = start;
    const [x2, y2] = end;
    const [r, g, b, a = 255] = color;
    this.device.drawLine(x1, y1, x2, y2, r, g, b, a);
  }

  /**
   * Draw a line (RGBA format - old API)
   */
  async drawLineRgba(start, end, color) {
    return this.device.drawLineRgba(start, end, color);
  }

  /**
   * Fill a rectangle
   */
  async fillRect(topLeft, bottomRight, color) {
    const [x1, y1] = topLeft;
    const [x2, y2] = bottomRight;
    const [r, g, b, a = 255] = color;
    await this.device.fillRect(x1, y1, x2, y2, r, g, b, a);
  }

  /**
   * Draw a rectangle (RGBA format - used by old API)
   */
  async drawRectangleRgba(pos, size, color) {
    return this.device.drawRectangleRgba(pos, size, color);
  }

  /**
   * Fill a rectangle (RGBA format - alias for drawRectangleRgba)
   */
  async fillRectangleRgba(pos, size, color) {
    return this.device.fillRectangleRgba(pos, size, color);
  }

  /**
   * Draw an image from buffer
   */
  async drawImage(imageData, x = 0, y = 0) {
    if (this.device.drawImage) {
      await this.device.drawImage(imageData, x, y);
    }
  }

  /**
   * Load and draw an image file
   */
  async drawImageFile(filePath, x = 0, y = 0) {
    if (this.device.drawImageFile) {
      await this.device.drawImageFile(filePath, x, y);
    }
  }

  /**
   * Draw an image with alpha transparency (unified API)
   * @param {string} path - Path to image file
   * @param {number[]} position - [x, y] coordinates
   * @param {number[]} size - [width, height] dimensions
   * @param {number} _alpha - Alpha transparency (0-255, not supported by Pixoo64)
   */
  async drawImageWithAlpha(path, position, size, _alpha = 255) {
    if (this.device.drawImageFile) {
      // Note: Pixoo64 doesn't support alpha blending natively
      // This method exists for API compatibility
      // Alpha is ignored for now (TODO: implement client-side alpha blending)
      await this.device.drawImageFile(path, position[0], position[1]);
    }
  }

  /**
   * Set display brightness (Pixoo supports this)
   * @param {number} level - Brightness level (0-100)
   * @returns {Promise<boolean>} Success status
   */
  async setBrightness(level) {
    if (this.driverType === 'mock') {
      return true; // Mock mode always succeeds
    }

    try {
      const { httpPost } = require('../../pixoo-http');
      await httpPost(this.host, {
        Command: 'Channel/SetBrightness',
        Brightness: Math.max(0, Math.min(100, Math.round(level))),
      });
      return true;
    } catch (error) {
      const logger = require('../../logger');
      logger.error(
        `Failed to set brightness for ${this.host}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Check if device is ready
   */
  isReady() {
    if (this.device.isReady) {
      return this.device.isReady();
    }
    return this.buffer !== null;
  }

  /**
   * Get device metrics with Pixoo-specific info
   */
  getMetrics() {
    const baseMetrics = super.getMetrics();
    return {
      ...baseMetrics,
      driverType: this.driverType,
      deviceType: 'pixoo64',
    };
  }
}

module.exports = PixooDriver;
