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
      this.device = new pixooHttp.MockPixoo(host, PIXOO_CONSTANTS.WIDTH);
    }

    this.buffer = this.device; // For backward compatibility
  }

  /**
   * Initialize the Pixoo device
   */
  async initialize() {
    if (this.driverType === 'real') {
      await this.device.tryInit();
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
   * Draw text on the display
   */
  async drawText(text, pos, color, align = 'left') {
    const [x, y] = pos;
    const [r, g, b, a = 255] = color;
    await this.device.drawText(text, x, y, r, g, b, a, align);
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
   * Set display brightness (Pixoo supports this)
   */
  async setBrightness(level) {
    if (this.driverType === 'real' && this.device.setBrightness) {
      await this.device.setBrightness(level);
      return true;
    }
    return false;
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
