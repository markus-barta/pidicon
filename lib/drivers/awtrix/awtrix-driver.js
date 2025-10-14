/**
 * @fileoverview AWTRIX (Ulanzi TC001) Device Driver
 * @description Full driver implementation for AWTRIX 32x8 pixel displays via HTTP
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 * @see https://blueforcer.github.io/awtrix3/#/api
 * @see https://github.com/Blueforcer/awtrix3
 */

const AWTRIX_CONSTANTS = require('./constants');
const { DEVICE_PROFILES } = require('../../core/device-capabilities');
const DeviceDriver = require('../../core/device-driver');

/**
 * AWTRIX driver implementation using HTTP protocol
 *
 * @example
 * const driver = new AwtrixDriver('192.168.1.100', { logger });
 * await driver.initialize();
 * await driver.showNotification({ text: 'Hello', color: '#00FF00' });
 */
class AwtrixDriver extends DeviceDriver {
  /**
   * Create AWTRIX driver instance
   * @param {string} host - Device IP address (e.g., '192.168.1.100')
   * @param {Object} options - Configuration options
   * @param {Object} [options.logger] - Logger instance
   * @param {string} [options.driverType='real'] - 'real' or 'mock'
   * @param {number} [options.port=80] - HTTP port (default: 80)
   */
  constructor(host, { logger = null, driverType = 'real', port = 80 } = {}) {
    super(host, DEVICE_PROFILES.AWTRIX);

    this.host = host;
    this.port = port;
    this.driverType = driverType;
    this.logger = logger || console;

    // HTTP API base URL
    this.apiUrl = `http://${host}:${port}${AWTRIX_CONSTANTS.HTTP_API_BASE}`;

    // State tracking
    this.initialized = false;
    this.currentApp = 'pidicon_main';
    this.buffer = {
      pixels: new Array(AWTRIX_CONSTANTS.TOTAL_PIXELS).fill(0),
      dirty: false,
    };

    // Performance tracking
    this.stats = {
      messagesSent: 0,
      lastUpdate: Date.now(),
      connected: false,
    };
  }

  // ============================================================================
  // LIFECYCLE METHODS
  // ============================================================================

  /**
   * Initialize HTTP connection and verify device
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.driverType === 'mock') {
      this.logger.info(`[AWTRIX Mock] Initialized for ${this.host}`);
      this.initialized = true;
      this.stats.connected = true;
      return true;
    }

    try {
      // Verify device is reachable by getting stats
      const stats = await this._httpRequest('GET', '/stats');
      if (stats) {
        this.initialized = true;
        this.stats.connected = true;
        this.logger.info(
          `[AWTRIX] Initialized device at ${this.host} (${stats.bat || 'AC'}% battery)`,
        );
        return true;
      }
      throw new Error('No response from device');
    } catch (error) {
      this.logger.error(
        `[AWTRIX] Initialization failed for ${this.host}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.driverType === 'mock') return;

    // Clear display
    await this.clear();

    this.initialized = false;
    this.stats.connected = false;
    this.logger.info(`[AWTRIX] Cleaned up device: ${this.deviceId}`);
  }

  /**
   * Get hardware information (battery level, etc.)
   * @returns {Promise<Object>} Hardware info { batteryLevel, lux, etc. }
   */
  async getHardwareInfo() {
    if (this.driverType === 'mock') {
      return { batteryLevel: 100 };
    }

    try {
      const stats = await this._httpRequest(
        'GET',
        AWTRIX_CONSTANTS.HTTP_ENDPOINTS.STATS,
      );
      return {
        batteryLevel: stats?.bat || null,
        lux: stats?.lux || null,
      };
    } catch (error) {
      this.logger.debug(
        `[AWTRIX] Failed to get hardware info: ${error.message}`,
      );
      return {};
    }
  }

  // ============================================================================
  // CORE DISPLAY METHODS
  // ============================================================================

  /**
   * Clear the display (remove current custom app)
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    if (this.driverType === 'mock') {
      this.buffer.pixels.fill(0);
      this.buffer.dirty = false;
      return true;
    }

    // Remove the current custom app by sending empty payload
    return await this._httpRequest(
      'POST',
      `/custom?name=${encodeURIComponent(this.currentApp)}`,
      {},
    );
  }

  /**
   * Push current buffer to device (not applicable for AWTRIX)
   * AWTRIX uses immediate rendering via MQTT messages
   * @returns {Promise<boolean>} Success status
   */
  async push() {
    // AWTRIX renders immediately on MQTT messages
    // This method exists for DeviceDriver interface compatibility
    this.buffer.dirty = false;
    return true;
  }

  /**
   * Get device metrics including lastSeenTs for responsive indicator
   * @returns {Object} Device metrics
   */
  getMetrics() {
    return {
      pushCount: this.stats.messagesSent,
      errorCount: this.stats.errors,
      lastPushTime: this.stats.lastUpdate,
      lastSeenTs: this.driverType === 'real' ? this.stats.lastUpdate : null,
      messagesSent: this.stats.messagesSent,
      errors: this.stats.errors,
      driverType: this.driverType,
      deviceType: 'awtrix',
    };
  }

  // ============================================================================
  // NOTIFICATION API (Temporary overlays)
  // ============================================================================

  /**
   * Show a temporary notification overlay
   * @param {Object} notification - Notification configuration
   * @param {string} notification.text - Text to display
   * @param {string} [notification.color] - Hex color (#RRGGBB)
   * @param {number} [notification.icon] - Icon ID
   * @param {number} [notification.duration=5000] - Display duration (ms)
   * @param {string} [notification.effect] - Transition effect
   * @param {number} [notification.repeat=1] - Number of repeats
   * @param {boolean} [notification.rainbow] - Rainbow text effect
   * @param {number} [notification.scrollSpeed] - Scroll speed
   * @returns {Promise<boolean>} Success status
   */
  async showNotification(notification) {
    const payload = this._buildNotificationPayload(notification);
    return await this._httpRequest(
      'POST',
      AWTRIX_CONSTANTS.HTTP_ENDPOINTS.NOTIFY,
      payload,
    );
  }

  /**
   * Build notification payload
   * @private
   */
  _buildNotificationPayload(notification) {
    const payload = {};

    if (notification.text) payload.text = notification.text;
    if (notification.color)
      payload.color = this._parseColor(notification.color);
    if (notification.icon !== undefined) payload.icon = notification.icon;
    if (notification.duration) payload.duration = notification.duration;
    if (notification.effect) payload.effect = notification.effect;
    if (notification.repeat !== undefined) payload.repeat = notification.repeat;
    if (notification.rainbow) payload.rainbow = true;
    if (notification.scrollSpeed)
      payload.scrollSpeed = notification.scrollSpeed;
    if (notification.pushIcon !== undefined)
      payload.pushIcon = notification.pushIcon;
    if (notification.textCase !== undefined)
      payload.textCase = notification.textCase;

    return payload;
  }

  // ============================================================================
  // CUSTOM APP API (Persistent rendering)
  // ============================================================================

  /**
   * Create or update a custom app
   * @param {string} appName - App name/ID
   * @param {Object} appData - App configuration
   * @param {string} [appData.text] - Text to display
   * @param {string} [appData.color] - Text color
   * @param {number} [appData.icon] - Icon ID
   * @param {number} [appData.lifetime=0] - Auto-remove after ms (0=permanent)
   * @param {boolean} [appData.rainbow] - Rainbow effect
   * @param {Array<number>} [appData.draw] - Raw pixel data
   * @returns {Promise<boolean>} Success status
   */
  async createCustomApp(appName, appData) {
    const payload = this._buildCustomAppPayload(appData);
    const result = await this._httpRequest(
      'POST',
      `${AWTRIX_CONSTANTS.HTTP_ENDPOINTS.CUSTOM}${appName}`,
      payload,
    );

    // Switch to the app to make it visible
    if (result) {
      await this.switchToApp(appName);
    }

    return result;
  }

  /**
   * Switch to a specific app
   * @param {string} appName - Name of the app to switch to
   * @returns {Promise<boolean>} Success status
   */
  async switchToApp(appName) {
    return await this._httpRequest('POST', '/switch', {
      name: appName,
    });
  }

  /**
   * Remove a custom app
   * @param {string} appName - App name to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeCustomApp(appName) {
    // Empty payload removes the app
    return await this._httpRequest(
      'POST',
      `${AWTRIX_CONSTANTS.HTTP_ENDPOINTS.CUSTOM}${appName}`,
      {},
    );
  }

  /**
   * Create or update a persistent custom app (NEW - uses query parameter)
   * This is the CORRECT way to create persistent custom apps over HTTP
   * @param {string} appName - Unique app identifier (e.g., "timestats")
   * @param {Object} appData - App configuration
   * @param {string} [appData.text] - Text to display
   * @param {string} [appData.color] - Text color (hex)
   * @param {number} [appData.icon] - Icon ID
   * @param {Array} [appData.draw] - Draw commands for custom graphics
   * @param {number} [appData.duration] - Time in rotation cycle (seconds)
   * @param {boolean} [appData.hold] - Hold app until dismissed
   * @param {Array} [appData.bar] - Bar graph data
   * @param {number} [appData.progress] - Progress bar (0-100)
   * @returns {Promise<boolean>} Success status
   */
  async drawCustom(appName, appData) {
    const payload = this._buildCustomAppPayload(appData);

    // Update current app name for tracking
    this.currentApp = appName;

    // Use /api/custom?name=<app> for persistent custom apps in rotation
    const result = await this._httpRequest(
      'POST',
      `/custom?name=${encodeURIComponent(appName)}`,
      payload,
    );

    // Switch to the app to make it immediately visible
    if (result) {
      await this.switchToApp(appName);
    }

    return result;
  }

  /**
   * Build custom app payload
   * @private
   */
  _buildCustomAppPayload(appData) {
    const payload = {};

    if (appData.text) payload.text = appData.text;
    if (appData.color) payload.color = this._parseColor(appData.color);
    if (appData.icon !== undefined) payload.icon = appData.icon;
    if (appData.lifetime !== undefined) payload.lifetime = appData.lifetime;
    if (appData.rainbow) payload.rainbow = true;
    if (appData.draw) payload.draw = appData.draw;
    if (appData.duration !== undefined) payload.duration = appData.duration;
    if (appData.scrollSpeed !== undefined)
      payload.scrollSpeed = appData.scrollSpeed;
    if (appData.effect) payload.effect = appData.effect;

    return payload;
  }

  // ============================================================================
  // PRIMITIVE DRAWING (Via Custom Apps)
  // ============================================================================

  /**
   * Draw text using custom app
   * @param {string} text - Text to display
   * @param {Array<number>} pos - [x, y] position
   * @param {Array<number>} color - [r, g, b] color
   * @param {string} [align='left'] - Text alignment
   * @returns {Promise<boolean>} Success status
   */
  async drawText(text, _pos, color, _align = 'left') {
    // AWTRIX doesn't support absolute positioning
    // We'll use the custom app API instead
    return await this.createCustomApp(this.currentApp, {
      text,
      color: this._rgbToHex(color),
    });
  }

  /**
   * Draw a single pixel (via custom app draw array)
   * @param {Array<number>} pos - [x, y] position
   * @param {Array<number>} color - [r, g, b] color
   * @returns {Promise<boolean>} Success status
   */
  async drawPixel(pos, color) {
    const [x, y] = pos;
    if (
      x < 0 ||
      x >= AWTRIX_CONSTANTS.WIDTH ||
      y < 0 ||
      y >= AWTRIX_CONSTANTS.HEIGHT
    ) {
      return false; // Out of bounds
    }

    // Update buffer
    const index = y * AWTRIX_CONSTANTS.WIDTH + x;
    const rgb565 = this._rgbToRgb565(color);
    this.buffer.pixels[index] = rgb565;
    this.buffer.dirty = true;

    return true;
  }

  /**
   * Draw line (not directly supported, use buffer)
   * @param {Array<number>} start - [x1, y1]
   * @param {Array<number>} end - [x2, y2]
   * @param {Array<number>} color - [r, g, b]
   * @returns {Promise<boolean>} Success status
   */
  async drawLine(start, end, color) {
    // Bresenham's line algorithm
    const [x1, y1] = start;
    const [x2, y2] = end;

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
      await this.drawPixel([x, y], color);

      if (x === x2 && y === y2) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return true;
  }

  /**
   * Fill rectangle (buffer-based)
   * @param {Array<number>} topLeft - [x1, y1]
   * @param {Array<number>} bottomRight - [x2, y2]
   * @param {Array<number>} color - [r, g, b]
   * @returns {Promise<boolean>} Success status
   */
  async fillRect(topLeft, bottomRight, color) {
    const [x1, y1] = topLeft;
    const [x2, y2] = bottomRight;

    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        await this.drawPixel([x, y], color);
      }
    }

    return true;
  }

  /**
   * Send buffered pixels to device as custom app
   * @returns {Promise<boolean>} Success status
   */
  async sendImage(imageData) {
    // Support both direct buffer and {frame: buffer} format
    const pixels = imageData?.frame || imageData;

    if (!Array.isArray(pixels)) {
      this.logger.warn('[AWTRIX] Invalid image data format');
      return false;
    }

    // Send as custom app with raw pixel data
    return await this.createCustomApp(this.currentApp, {
      draw: pixels, // RGB565 pixel array
    });
  }

  // ============================================================================
  // SETTINGS & CONTROL
  // ============================================================================

  /**
   * Set brightness
   * @param {number} level - Brightness level (0-100 from UI, converted to 0-255 for Awtrix)
   * @returns {Promise<boolean>} Success status
   */
  async setBrightness(level) {
    // Convert 0-100 to 0-255 for Awtrix
    const brightness = Math.max(
      0,
      Math.min(255, Math.round((level / 100) * 255)),
    );

    // Awtrix expects just the setting key (BRI) without nested object
    return await this._httpRequest('POST', '/settings', {
      BRI: brightness,
    });
  }

  /**
   * Set display power (on/off)
   * @param {boolean} on - True to turn on, false to turn off
   * @returns {Promise<boolean>} Success status
   */
  async setDisplayPower(on) {
    // Awtrix uses the /power endpoint with true/false
    return await this._httpRequest('POST', '/power', on);
  }

  /**
   * Update device settings
   * @param {Object} settings - Settings object (BRI, ABRI, etc.)
   * @returns {Promise<boolean>} Success status
   */
  async updateSettings(settings) {
    return await this._httpRequest(
      'POST',
      AWTRIX_CONSTANTS.HTTP_ENDPOINTS.SETTINGS,
      settings,
    );
  }

  /**
   * Set sleep mode
   * @param {boolean} enabled - Sleep mode enabled
   * @returns {Promise<boolean>} Success status
   */
  async setSleepMode(enabled) {
    return await this._httpRequest(
      'POST',
      AWTRIX_CONSTANTS.HTTP_ENDPOINTS.SLEEP,
      enabled,
    );
  }

  // ============================================================================
  // AUDIO SUPPORT
  // ============================================================================

  /**
   * Play RTTTL tone string
   * @param {string} rtttl - RTTTL format string
   * @returns {Promise<boolean>} Success status
   */
  async playRTTTL(rtttl) {
    if (this.driverType === 'mock') return true;

    return await this._httpRequest(
      'POST',
      AWTRIX_CONSTANTS.HTTP_ENDPOINTS.RTTTL,
      {
        rtttl,
      },
    );
  }

  /**
   * Play tone (converts to RTTTL)
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in ms
   * @returns {Promise<boolean>} Success status
   */
  async playTone(frequency, duration) {
    if (this.driverType === 'mock') return true;

    // Simple RTTTL conversion (single note)
    const note = this._frequencyToNote(frequency);
    const durationCode = Math.round(duration / 250); // Approximate
    const rtttl = `tone:d=4,o=5,b=100:${durationCode}${note}`;

    return await this.playRTTTL(rtttl);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Make HTTP request to Awtrix device
   * @private
   * @param {string} method - HTTP method (GET, POST)
   * @param {string} endpoint - API endpoint (e.g., '/custom/app1')
   * @param {Object|string|boolean} [payload] - Request payload
   * @returns {Promise<any>} Response data or boolean for success
   */
  async _httpRequest(method, endpoint, payload = null) {
    if (this.driverType === 'mock') {
      this.logger.debug(
        `[AWTRIX Mock] ${method} ${endpoint}:`,
        payload !== null ? payload : '(no body)',
      );
      this.stats.messagesSent++;
      return payload !== null ? true : { bat: 100, lux: 100 }; // Mock response
    }

    try {
      const url = `${this.apiUrl}${endpoint}`;
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };

      // Add body for POST requests
      if (method === 'POST' && payload !== null) {
        options.body =
          typeof payload === 'string' ? payload : JSON.stringify(payload);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.stats.messagesSent++;
      this.stats.lastUpdate = Date.now();

      this.logger.debug(`[AWTRIX] ${method} ${url} - OK`);

      // Try to parse JSON response
      try {
        const data = await response.json();
        return data;
      } catch {
        // No JSON body (expected for some endpoints)
        return true;
      }
    } catch (error) {
      this.logger.error(
        `[AWTRIX] HTTP ${method} ${endpoint} failed:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Parse color string to AWTRIX format
   * @private
   */
  _parseColor(color) {
    if (typeof color === 'string') {
      // Remove # if present
      return color.startsWith('#') ? color : `#${color}`;
    }
    if (Array.isArray(color)) {
      return this._rgbToHex(color);
    }
    return color;
  }

  /**
   * Convert RGB to hex string
   * @private
   */
  _rgbToHex(rgb) {
    const [r, g, b] = rgb;
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Convert RGB to RGB565 format
   * @private
   */
  _rgbToRgb565(rgb) {
    const [r, g, b] = rgb;
    return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
  }

  /**
   * Convert frequency to musical note
   * @private
   */
  _frequencyToNote(freq) {
    const notes = [
      'c',
      'c#',
      'd',
      'd#',
      'e',
      'f',
      'f#',
      'g',
      'g#',
      'a',
      'a#',
      'b',
    ];
    const noteNum = Math.round(12 * Math.log2(freq / 440) + 49);
    const octave = Math.floor(noteNum / 12);
    const note = notes[noteNum % 12];
    return `${note}${octave}`;
  }

  /**
   * Get driver statistics
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      ...this.stats,
      host: this.host,
      port: this.port,
      driverType: this.driverType,
      initialized: this.initialized,
    };
  }
}

module.exports = AwtrixDriver;
