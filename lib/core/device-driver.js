/**
 * @fileoverview Device Driver Interface
 * @description Base class and interface for all pixel display drivers
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

/**
 * Base class for all device drivers
 * All device-specific drivers must extend this class and implement its methods
 */
class DeviceDriver {
  constructor(host, capabilities) {
    if (new.target === DeviceDriver) {
      throw new Error(
        'DeviceDriver is an abstract class and cannot be instantiated directly',
      );
    }
    this.host = host;
    this.capabilities = capabilities;
    this.buffer = null; // Canvas buffer (driver-specific)
    this.metrics = {
      pushCount: 0,
      errorCount: 0,
      lastPushTime: null,
      lastErrorTime: null,
    };
  }

  // ============================================================================
  // REQUIRED METHODS - All drivers must implement these
  // ============================================================================

  /**
   * Initialize the device connection
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error(
      'DeviceDriver.initialize() must be implemented by subclass',
    );
  }

  /**
   * Clear the display (all pixels black)
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('DeviceDriver.clear() must be implemented by subclass');
  }

  /**
   * Push the current buffer to the device
   * @returns {Promise<void>}
   */
  async push() {
    throw new Error('DeviceDriver.push() must be implemented by subclass');
  }

  /**
   * Draw a single pixel
   * @param {[number, number]} _pos - [x, y] position
   * @param {[number, number, number, number]} _color - [r, g, b, a] color
   * @returns {Promise<void>}
   */
  async drawPixel(_pos, _color) {
    throw new Error('DeviceDriver.drawPixel() must be implemented by subclass');
  }

  /**
   * Draw text on the display
   * @param {string} _text - Text to draw
   * @param {[number, number]} _pos - [x, y] position
   * @param {[number, number, number, number]} _color - [r, g, b, a] color
   * @param {string} _align - Alignment ('left', 'center', 'right')
   * @returns {Promise<void>}
   */
  async drawText(_text, _pos, _color, _align = 'left') {
    throw new Error('DeviceDriver.drawText() must be implemented by subclass');
  }

  /**
   * Draw a line
   * @param {[number, number]} _start - [x, y] start position
   * @param {[number, number]} _end - [x, y] end position
   * @param {[number, number, number, number]} _color - [r, g, b, a] color
   * @returns {Promise<void>}
   */
  async drawLine(_start, _end, _color) {
    throw new Error('DeviceDriver.drawLine() must be implemented by subclass');
  }

  /**
   * Fill a rectangle
   * @param {[number, number]} _topLeft - [x, y] top-left position
   * @param {[number, number]} _bottomRight - [x, y] bottom-right position
   * @param {[number, number, number, number]} _color - [r, g, b, a] color
   * @returns {Promise<void>}
   */
  async fillRect(_topLeft, _bottomRight, _color) {
    throw new Error('DeviceDriver.fillRect() must be implemented by subclass');
  }

  // ============================================================================
  // OPTIONAL METHODS - Default implementations return false/null
  // ============================================================================

  /**
   * Play a tone (for devices with audio support)
   * @param {number} _frequency - Frequency in Hz
   * @param {number} _duration - Duration in milliseconds
   * @returns {Promise<boolean>} - true if supported and played, false otherwise
   */
  async playTone(_frequency, _duration) {
    return false; // Not supported by default
  }

  /**
   * Set a predefined icon (for devices with icon support like AWTRIX)
   * @param {string} _iconId - Icon identifier
   * @returns {Promise<boolean>} - true if supported and set, false otherwise
   */
  async setIcon(_iconId) {
    return false; // Not supported by default
  }

  /**
   * Set display brightness
   * @param {number} _level - Brightness level 0-100
   * @returns {Promise<boolean>} - true if supported and set, false otherwise
   */
  async setBrightness(_level) {
    return false; // Not supported by default
  }

  /**
   * Get device metrics (push count, errors, timing)
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return {
      ...this.metrics,
      capabilities: this.capabilities,
    };
  }

  /**
   * Check if device is ready for operations
   * @returns {boolean}
   */
  isReady() {
    return this.buffer !== null;
  }
}

module.exports = DeviceDriver;
