/**
 * PixooDevice Class for Pixoo Integration
 *
 * 2025-01-19:
 * - Added support for multiple pixoo devices
 * 2025-01-19:
 * - Enhanced image processing with improved color space handling
 * - Better support for web-optimized PNGs from Pixelmator Pro
 * - Legacy methods preserved with x_legacy_ prefix
 * - Improved metadata handling and validation
 * - Optimized buffer processing for web exports
 * 2024-12-01:
 * - Unified mode and action management through setDeviceMode
 * - Enhanced state validation and error handling
 * - Improved state transition management
 * 2024-11-01:
 * - Initial Version
 *
 * DESCRIPTION
 * 
 * This class encapsulates the configuration, control, and rendering capabilities of a Pixoo device.
 * It allows for multiple instances to be managed independently and provides high-level drawing primitives.
 *
 * Each instance maintains its own configuration, including:
 * - Device mode and state management
 * - Current action (used for various modes including IMAGE_GALLERY and CAM0_STREAM)
 * - Brightness and channel settings
 * - Rendering buffer and display state
 *
 * MQTT Integration:
 * - Automatic state management and updates
 * - Standardized topic structure (home/{room}/display/{hostAddress}/{subtopic})
 * - Payload includes mode, action, and timestamp information
 * - Built-in state change detection and emission
 *
 * Usage Examples:
 *
 * 1. Creating and initializing a PixooDevice (in a Node-RED function):
 *    const pixooManager = context.global.PixooManager;
 *    const PixooAPI = await global.get('PixooAPI')();
 *    const device = await pixooManager.initializeDevice('192.168.1.100', PixooAPI);
 *
 * 2. Get the device in (another) function node:
 *    const pixooManager = context.global.PixooManager;
 *    const hostAddress = 'my-pixoo-hostname-or-ip';
 *    const device = pixooManager.getDevice(hostAddress);
 *
 * 3. Setting device mode and action (unified approach):
 *    await device.setDeviceMode(PixooDevice.MODES.IMAGE_GALLERY, PixooDevice.ACTIONS.PLAY);  // Set both
 *    await device.setDeviceMode(PixooDevice.MODES.ENERGY_LEVELS);                           // Set mode only
 *    await device.setDeviceMode(null, PixooDevice.ACTIONS.PAUSE);                          // Set action only
 *    const currentMode = device.getMode();
 *    const currentAction = device.getCurrentAction();
 *
 * 4. Checking if the device is in a specific mode:
 *    const isInGalleryMode = device.isInMode(PixooDevice.MODES.IMAGE_GALLERY);
 *
 * 5. Getting MQTT topic and payload:
 *    const topic = device.getMqttTopic('state');
 *    const payload = device.getMqttPayload();
 *
 * 6. Retrieving all device settings:
 *    const settings = await device.getAllSettings();
 *
 * 7. Basic rendering operations:
 *    await device.clear();                                          // Clear display
 *    await device.drawPixelRgba([10, 10], [255, 0, 0, 153]);          // Draw red pixel with 60% alpha
 *    await device.drawLineRgba([0, 0], [63, 63], [0, 255, 0, 179]);   // Draw green line with 70% alpha
 *    await device.drawRectangleRgba([0, 0], [32, 32], [0, 0, 255]);   // Draw blue rectangle fully opaque
 *
 * 8. Text rendering with options:
 *    await device.drawTextRgbaAligned("Hello", [10, 10], [255, 255, 255], 'left');         // Draw white text
 *    await device.drawCustomFloatText(42.5123, [32, 32], [255, 255, 0], 'center'); // Draw centered number
 *    await device.drawCustomFloatText(42.5123, [32, 32], [255, 255, 0], 'left', 4); // Draw "42,51" left aligned number opaque
 *    await device.drawCustomFloatText(5.678, [32, 32], [255, 255, 0, 125], 'right', 2); // Draw "5.7" right aligned number with 50 % alpha
 *
 * 9. Image handling with transparency:
 *    await device.drawImageWithAlpha("/path/to/image.png", [0, 0], [64, 64], 128);       // Draw semi-transparent image
 *
 * Notes:
 * - The PixooAPI is expected to be available in the global context of Node-RED
 * - All color values support alpha channel [r, g, b, a] where a is optional (defaults to 255)
 * - Coordinates are specified as [x, y] arrays with (0,0) at top-left
 * - Text supports alignment options: 'left', 'center', 'right'
 * - Custom float text supports configurable decimal precision and special formatting
 * - All drawing operations are asynchronous and should be awaited
 * - Display updates are handled automatically by the internal API
 */

const debug = false;

function debugLog(text) {
  if (!debug) { return }
  node.warn(text);
}


class PixooDevice {
  /**
   * Static device mode definitions
   * @readonly
   * @enum {string}
   */
  static MODES = Object.freeze({
    OFF: "OFF",
    IDLE: "IDLE",
    IMAGE_GALLERY: "IMAGE_GALLERY",
    ENERGY_LEVELS: "ENERGY_LEVELS",
    CAM0_STREAM: "CAM0_STREAM",
    ROOM_PLAN: "ROOM_PLAN",
    POWER_PRICE: "POWER_PRICE",
    POWER_FLOW: "POWER_FLOW",
  });

  /**
   * Static action definitions for device control
   * @readonly
   * @enum {string|null}
   */
  static ACTIONS = Object.freeze({
    NONE: null,
    PLAY: "play",
    PAUSE: "pause",
    STOP: "stop",
    NEXT: "next",
    PRIOR: "prior",
  });

  /**
   * Mapping of valid actions for each mode
   * Defines which actions are allowed in specific device modes
   * @readonly
   * @type {Object.<string, Array<string>>}
   */
  static MODE_ACTIONS = Object.freeze({
    [PixooDevice.MODES.IMAGE_GALLERY]: [
      PixooDevice.ACTIONS.PLAY,
      PixooDevice.ACTIONS.PAUSE,
      PixooDevice.ACTIONS.STOP,
      PixooDevice.ACTIONS.NEXT,
      PixooDevice.ACTIONS.PRIOR,
    ],
    [PixooDevice.MODES.CAM0_STREAM]: [
      PixooDevice.ACTIONS.PLAY,
      PixooDevice.ACTIONS.PAUSE,
      PixooDevice.ACTIONS.STOP,
    ],
    [PixooDevice.MODES.ENERGY_LEVELS]: [
      PixooDevice.ACTIONS.PLAY,
      PixooDevice.ACTIONS.PAUSE,
    ],
    [PixooDevice.MODES.ROOM_PLAN]: [
      PixooDevice.ACTIONS.PLAY,
      PixooDevice.ACTIONS.PAUSE,
    ],
    [PixooDevice.MODES.POWER_PRICE]: [
      PixooDevice.ACTIONS.PLAY,
      PixooDevice.ACTIONS.PAUSE,
    ],
    [PixooDevice.MODES.POWER_FLOW]: [
      PixooDevice.ACTIONS.PLAY,
      PixooDevice.ACTIONS.PAUSE,
    ],
  });

  /**
   * Bitmap font definition for display rendering
   * Each character is defined as a 3x5 pixel matrix
   * Currently implements basic numerical and symbolic characters
   * TODO: consider adding full font from API repo
   * @readonly
   * @type {Object.<string, Array<number>>}
   */
  static TEXT_FONT = {
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
    ' ': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '!': [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
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
    '_': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    ':': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    '.': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    '/': [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    '{': [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1],
    '|': [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    '}': [1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0],
    '~': [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    '$': [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0],
    '@': [0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1],
    '%': [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1],
    '°': [0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    '*': [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    '→': [0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0], // Right Arrow
    '←': [0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0], // Left Arrow
    '↑': [0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], // Up Arrow
    '↓': [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0], // Down Arrow
    '•': [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // Bullet (single center pixel)
    '"': [1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Double Quote
    ';': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0], // Semicolon
    '✓': [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0], // Checkmark
    '✗': [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // Cross Mark / Ballot X
    '♥': [0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0], // Heart
    '█': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // Full Block
  };

  /**
   * Font rendering metrics and spacing configuration
   * Defines dimensions and spacing for text rendering
   * @readonly
   * @enum {Object}
   * @property {number} DIGIT_WIDTH - Width of each digit (3 pixels)
   * @property {number} DIGIT_HEIGHT - Height of each digit (5 pixels)
   * @property {number} CHARACTER_SPACING - Space between characters (1 pixel)
   * @property {number} COMMA_SPACING_LEFT - Space before decimal point (1 pixel)
   * @property {number} COMMA_SPACING_RIGHT - Space after decimal point (1 pixel)
   * @property {number} COMMA_HEIGHT_OFFSET - Vertical position of decimal point (4 pixels)
   * @property {number[]} SPECIAL_KERNING_DIGITS - Digits needing special spacing
   * @property {number} SPECIAL_KERNING_OFFSET - Kerning adjustment amount (1 pixel)
   * @property {number} MINUS_SIGN_WIDTH - Width of minus sign (4 pixels)
   */
  static FONT_METRICS = {
    DIGIT_WIDTH: 3,
    DIGIT_HEIGHT: 5,
    CHARACTER_SPACING: 1,
    COMMA_SPACING_LEFT: 1,
    COMMA_SPACING_RIGHT: 1,
    COMMA_HEIGHT_OFFSET: 4,
    SPECIAL_KERNING_DIGITS: [4,7,9],
    SPECIAL_KERNING_OFFSET: 1,
    MINUS_SIGN_WIDTH: 4,
  };

  /**
   * Creates a new PixooDevice instance
   * @param {string} hostAddress - The IP address or hostname of the Pixoo device
   * @param {number} size - The size of the Pixoo display (default: 64)
   */
  constructor(hostAddress, size = 64) {
    this.hostAddress = hostAddress;
    this.size = size;
    this.currentMode = PixooDevice.MODES.ENERGY_LEVELS;
    this.currentAction = PixooDevice.ACTIONS.NONE;
    this.apiInstance = null;
    this.lastEmittedState = null;
    this.dynamicState = {};
    this._initializeRenderState();
  }

  /**
   * Performs cleanup operations for a PixooDevice
   * Releases resources and closes active connections
   * 
   * @returns {Promise<boolean>} Success status of cleanup operation
   * 
   * Cleanup operations:
   * - Closes the API connection if available
   * - Clears API instance reference
   * 
   * @throws {Warning} Logs warning if cleanup fails
   */
  async cleanup() {
    try {
      if (this.apiInstance) {
        // Close any open connections if applicable
        if (typeof this.apiInstance.close === 'function') {
          await this.apiInstance.close();
        }
        this.apiInstance = null;
      }
      return true;
    } catch (error) {
      this._logError("cleanup", error);
      return false;
    }
  }

  /**
   * Updates device mode and/or action state
   * @param {string|null} mode - The mode to set, or null to keep current mode
   * @param {string|null} action - The action to set, or null for no action
   * @returns {Promise<boolean>} Success status
   *
   * Examples:
   * await setDeviceMode(MODES.IMAGE_GALLERY, ACTIONS.PLAY);  // Change both mode and action
   * await setDeviceMode(MODES.ENERGY_LEVELS);                // Change only mode
   * await setDeviceMode(null, ACTIONS.PAUSE);               // Change only action
   */
  async setDeviceMode(mode = null, action = null) {
    // Store current state for change detection
    const oldMode = this.currentMode;
    const oldAction = this.currentAction;
    let stateChanged = false;

    // Handle mode change if specified
    if (mode !== null) {
      if (!Object.values(PixooDevice.MODES).includes(mode)) {
        node.warn(`Invalid mode: ${mode}`);
        return false;
      }
      this.currentMode = mode;
      stateChanged = true;
    }

    // Handle action change if specified
    if (action !== null) {
      if (!Object.values(PixooDevice.ACTIONS).includes(action)) {
        node.warn(`Invalid action: ${action}`);
        return false;
      }
      if (!this._isActionValidForMode(this.currentMode, action)) {
        node.warn(`Action ${action} is not valid for mode ${this.currentMode}`);
        return false;
      }
      this.currentAction = action;
      stateChanged = true;
    }

    // If mode changed, reinitialize device
    if (this.currentMode !== oldMode) {
      await this._reinitialize();
    }

    // Emit state change if needed
    if (stateChanged) {
      await this.checkAndEmitStateChange(oldMode, oldAction);
    }

    return true;
  }

  /**
   * Initializes the rendering state
   * @private
   */
  _initializeRenderState() {
    this.renderState = {
      buffer: new Array(this.size * this.size).fill([0, 0, 0]),
      pushCount: 0,
      pushAvgElapsed: 0,
    };
  }

  /**
   * Validates if an action is allowed for a specific mode
   * @param {string} mode - The mode to check
   * @param {string} action - The action to validate
   * @returns {boolean} Whether the action is valid for the mode
   * @private
   */
  _isActionValidForMode(mode, action) {
    if (action === PixooDevice.ACTIONS.NONE) return true;
    const allowedActions = PixooDevice.MODE_ACTIONS[mode];
    return allowedActions?.includes(action) || false;
  }

  /**
   * Initializes the Pixoo device with the API
   * @param {Object} PixooAPI - The Pixoo API class
   * @returns {Promise<PixooDevice>} - The initialized PixooDevice instance
   */
  async initialize(PixooAPI) {
    this.apiInstance = new PixooAPI(this.hostAddress, this.size);
    await this.apiInstance.initialize();
    return this;
  }

  /**
   * Reinitializes the device when mode changes
   * @private
   */
  async _reinitialize() {
    await this.apiInstance.setChannel(4);
    await this.resetHttpGifId();
    await this.clear();
    await this.apiInstance.push();
  }

  // Core device methods

  /**
   * Clears the display buffer and screen
   * @returns {Promise<void>}
   */
  async clear() {
    await this.apiInstance.clear();
  }

  /**
   * Resets the HTTP GIF ID counter
   * @returns {Promise<void>}
   */
  async resetHttpGifId() {
    await this.apiInstance.resetHttpGifId();
  }

  /**
   * Gets the current device mode
   * @returns {string} Current mode
   */
  getMode() {
    return this.currentMode;
  }

  /**
   * Gets the current device action
   * @returns {string|null} Current action or null if none
   */
  getCurrentAction() {
    return this.currentAction;
  }

  /**
   * Checks if device is in specified mode
   * @param {string} mode - Mode to check
   * @returns {boolean} True if in specified mode
   */
  isInMode(mode) {
    return this.getMode() === mode;
  }

  /**
   * Generates MQTT topic for device communication
   * Formats topic as: home/{room}/display/{hostAddress}/{subtopic}
   * Where room is derived from first 2 characters of hostAddress
   *
   * @param {string} subtopic - Subtopic to append (default: "state")
   * @returns {string} Fully formatted MQTT topic string
   * @example
   * // For device '01-pixoo' requesting 'state'
   * // Returns: 'home/01/display/01-pixoo/state'
   */
  getMqttTopic(subtopic = "state") {
    const room = this.hostAddress.slice(0, 2);
    return `home/${room}/display/${this.hostAddress}/${subtopic}`;
  }

  /**
   * Generates MQTT payload containing current device state
   * Includes mode, action, and timestamp information
   *
   * @returns {Object} State payload object
   * @property {string} mode - Current device mode
   * @property {string|null} action - Current device action or null
   * @property {string} lastCommandSent - ISO timestamp of last command
   * @example
   * // Returns:
   * // {
   * //   mode: "ENERGY_LEVELS",
   * //   action: "PLAY",
   * //   lastCommandSent: "2024-12-01T12:34:56.789Z"
   * // }
   */
  getMqttPayload() {
    return {
      mode: this.getMode(),
      action: this.getCurrentAction(),
      lastCommandSent: new Date().toISOString(),
    };
  }

  /**
   * Gets comprehensive device settings and status
   * Retrieves all available device settings including operational status,
   * current configuration, and timestamp of retrieval
   *
   * @returns {Promise<Object|null>} Device settings or null if device not initialized
   * @property {Object} settings - Various device settings
   * @property {string} timestamp - ISO timestamp of retrieval
   * @throws {Warning} Logs warning if settings cannot be retrieved
   */
  async getAllSettings() {
    if (this.apiInstance) {
      const details = await this.apiInstance.getAllSettings();
      details.timestamp = new Date().toISOString();
      return details;
    }
    return null;
  }

  /**
   * Checks for state changes and triggers state emission if needed
   * Compares current state against previous state to detect changes
   * in mode or action that require notification
   *
   * @param {string} oldMode - Previous device mode
   * @param {string} oldAction - Previous device action
   * @throws {Warning} Logs warning if state emission fails
   */
  async checkAndEmitStateChange(oldMode, oldAction) {
    const newState = this.getMqttPayload();
    if (
      !this.lastEmittedState ||
      newState.mode !== oldMode ||
      newState.action !== oldAction
    ) {
      this.lastEmittedState = newState;
      await this.emitStateChange();
    }
  }

  /**
   * Emits current state to Node-RED and updates node status
   * Sends MQTT message with current state and updates the visual
   * status in the Node-RED flow editor
   *
   * @throws {Warning} Logs warning if MQTT message cannot be sent
   */
  async emitStateChange() {
    const payload = this.getMqttPayload();
    const message = {
      topic: this.getMqttTopic("state"),
      payload: payload,
    };

    node.send(message);
    node.status({
      fill: "green",
      shape: "dot",
      text: `Mode: ${payload.mode}, Action: ${payload.action}`,
    });
  }

  // --- NEW: Generic dynamic state management methods ---
  /**
   * Sets a value in the device-specific dynamic state store.
   * @param {string} key - The key for the state variable.
   * @param {*} value - The value to store.
   */
  setState(key, value) {
    this.dynamicState[key] = value;
  }

  /**
   * Gets a value from the device-specific dynamic state store.
   * @param {string} key - The key for the state variable.
   * @param {*} [defaultValue=undefined] - The value to return if the key is not found.
   * @returns {*} The stored value or the default value.
   */
  getState(key, defaultValue = undefined) {
    const value = this.dynamicState[key];
    // Check for explicit undefined as value could be null or 0 or false
    return value === undefined ? defaultValue : value;
  }

  /**
   * Increments a numeric state value associated with a key in the dynamic state.
   * Initializes to the amount if the key doesn't exist.
   * @param {string} key - The key for the state variable.
   * @param {number} [amount=1] - The amount to increment by.
   * @returns {number} The new value after incrementing.
   */
  incrementState(key, amount = 1) {
    const currentValue = this.getState(key, 0); // Default to 0
    if (typeof currentValue !== 'number') {
      node?.warn(`[PixooDevice] incrementState called on non-numeric key '${key}'`);
      this.setState(key, amount); // Initialize or overwrite non-numeric with amount
      return amount;
    }
    const newValue = currentValue + amount;
    this.setState(key, newValue);
    return newValue;
  }

  /**
   * Toggles a boolean state value associated with a key in the dynamic state.
   * @param {string} key - The key for the state variable.
   * @param {boolean} [defaultValue=false] - The initial value if the key doesn't exist.
   * @returns {boolean} The new boolean value.
   */
  toggleState(key, defaultValue = false) {
    const currentValue = this.getState(key, defaultValue);
    if (typeof currentValue !== 'boolean') {
      node?.warn(`[PixooDevice] toggleState called on non-boolean key '${key}'`);
      this.setState(key, !defaultValue); // Initialize or overwrite non-boolean
      return !defaultValue;
    }
    const newValue = !currentValue;
    this.setState(key, newValue);
    return newValue;
  }
  // -------------------------------------------------


  // =====================================
  // Rendering Methods
  // =====================================
  // Collection of high-level drawing primitives for shapes, text, and images
  // All methods support alpha blending, bounds checking, and error handling

  /**
   * Draws a single pixel with alpha support
   * Performs alpha blending with existing pixel color when alpha < 255
   *
   * @param {number[]} position - [x, y] coordinates
   * @param {number[]} rgbaColor - [r, g, b, a] color values (a is optional, defaults to 255)
   * @returns {Promise<boolean>} Success status
   *
   * Color components:
   * - r: Red channel (0-255)
   * - g: Green channel (0-255)
   * - b: Blue channel (0-255)
   * - a: Alpha channel (0-255, optional)
   *
   * Alpha blending formula:
   * resultColor = (sourceColor * alpha) + (destinationColor * (1 - alpha))
   *
   * @example
   * // Fully opaque red pixel
   * await drawPixelRgba([10, 10], [255, 0, 0]);
   * // Semi-transparent blue pixel
   * await drawPixelRgba([20, 20], [0, 0, 255, 128]);
   *
   * @throws {Warning} Logs warning if pixel drawing fails
   */
  async drawPixelRgba(position, rgbaColor) {
    try {
      const [x, y] = position;
      if (this._isOutOfBounds(x, y)) return true;

      const [r, g, b, a = 255] = rgbaColor;
      const alpha = a / 255;

      if (alpha === 1) {
        await this.apiInstance.drawPixel(x, y, [r, g, b]);
      } else {
        const currentPixel = this.apiInstance.buffer[x + y * this.size] || [
          0, 0, 0,
        ];
        const blendedColor = [
          Math.round(r * alpha + currentPixel[0] * (1 - alpha)),
          Math.round(g * alpha + currentPixel[1] * (1 - alpha)),
          Math.round(b * alpha + currentPixel[2] * (1 - alpha)),
        ];
        await this.apiInstance.drawPixel(x, y, blendedColor);
      }
      return true;
    } catch (error) {
      this._logError("drawPixelRgba", error);
      return false;
    }
  }

  /**
   * Draws a rectangle with optional transparency
   * Creates a filled rectangle by drawing individual pixels with alpha blending
   *
   * @param {number[]} position - [x, y] start position of top-left corner
   * @param {number[]} size - [width, height] of rectangle in pixels
   * @param {number[]} rgbaColor - [r, g, b, a] color values (a is optional, defaults to 255)
   * @returns {Promise<boolean>} Success status
   *
   * Rectangle constraints:
   * - Position coordinates must be within display bounds (0 to display size-1)
   * - Width and height must be positive numbers
   * - Portions of rectangle outside display bounds will be clipped
   *
   * @example
   * // Draw a 10x10 semi-transparent green rectangle
   * await drawRectangleRgba([5, 5], [10, 10], [0, 255, 0, 128]);
   * // Draw a solid blue rectangle
   * await drawRectangleRgba([20, 20], [15, 15], [0, 0, 255]);
   *
   * @throws {Warning} Logs warning if rectangle drawing fails
   */
  async drawRectangleRgba(position, size, rgbaColor) {
    try {
      for (let y = 0; y < size[1]; y++) {
        for (let x = 0; x < size[0]; x++) {
          await this.drawPixelRgba(
            [position[0] + x, position[1] + y],
            rgbaColor,
          );
        }
      }
      return true;
    } catch (error) {
      this._logError("drawRectangleRgba", error);
      return false;
    }
  }

  /**
   * Draws a line between two points with alpha support
   * Implements Bresenham's line algorithm for optimal rendering with alpha blending
   *
   * @param {number[]} start - [x1, y1] start position
   * @param {number[]} end - [x2, y2] end position
   * @param {number[]} rgbaColor - [r, g, b, a] color values (a is optional, defaults to 255)
   * @returns {Promise<boolean>} Success status
   *
   * Algorithm features:
   * - Handles all octants correctly
   * - Performs pixel-perfect line drawing
   * - Supports alpha blending at each pixel
   * - Automatically clips lines outside display bounds
   *
   * Performance characteristics:
   * - Uses integer-only math for speed
   * - Minimizes pixel operations
   * - Single-pass rendering
   *
   * @example
   * // Draw a diagonal red line at 50% opacity
   * await drawLineRgba([0, 0], [63, 63], [255, 0, 0, 128]);
   * // Draw a solid horizontal green line
   * await drawLineRgba([0, 32], [63, 32], [0, 255, 0]);
   *
   * @throws {Warning} Logs warning if line drawing fails
   */
  async drawLineRgba(start, end, rgbaColor) {
    try {
      const dx = Math.abs(end[0] - start[0]);
      const dy = Math.abs(end[1] - start[1]);
      const sx = start[0] < end[0] ? 1 : -1;
      const sy = start[1] < end[1] ? 1 : -1;
      let err = dx - dy;

      const pos = [...start];
      while (true) {
        await this.drawPixelRgba(pos, rgbaColor);
        if (pos[0] === end[0] && pos[1] === end[1]) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          pos[0] += sx;
        }
        if (e2 < dx) {
          err += dx;
          pos[1] += sy;
        }
      }
      return true;
    } catch (error) {
      this._logError("drawLineRgba", error);
      return false;
    }
  }

  /**
   * Draws text with optional alignment and color, supporting transparency
   * Uses built-in bitmap font with alpha blending support for each pixel
   *
   * @param {string} text - Text to draw
   * @param {number[]} position - [x, y] position for text anchor point
   * @param {number[]} rgbaColor - [r, g, b, a] color values (a is optional, defaults to 255)
   * @param {string} alignment - Text alignment ('left', 'center', or 'right', default: 'left')
   * @returns {Promise<boolean>} Success status
   *
   * Font characteristics:
   * - Fixed-width bitmap font (3x5 pixels per character)
   * - Supports digits 0-9, period, minus, question mark, and space
   * - Characters are spaced by FONT_METRICS.CHARACTER_SPACING
   * - Special handling for degree symbol (°) at text end
   *
   * Degree symbol handling:
   * - When text ends with °, renders as single pixel above text baseline
   * - Positioned one pixel right of last character
   * - Uses 75% of original alpha value for visual distinction
   * - Preserves RGB values from original color
   *
   * Alignment behavior:
   * - 'left': Position marks left edge of text
   * - 'center': Position marks horizontal center of text
   * - 'right': Position marks right edge of text
   *
   * Position constraints:
   * - Text may be clipped if it extends beyond display bounds
   * - Y position refers to top of character
   * - X position is adjusted based on alignment
   * - Degree symbol is elevated one pixel above text baseline
   *
   * @example
   * // Draw white centered text
   * await drawTextRgbaAligned("Hello", [32, 10], [255, 255, 255], 'center');
   * // Draw semi-transparent right-aligned red text
   * await drawTextRgbaAligned("123", [63, 20], [255, 0, 0, 128], 'right');
   * // Draw temperature with degree symbol
   * await drawTextRgbaAligned("23°", [32, 29], [255, 255, 255], 'center');
   *
   * @throws {Warning} Logs warning if text rendering fails
   * @see PixooDevice.TEXT_FONT for supported characters
   */
  async drawTextRgbaAligned(text, position, rgbaColor, alignment = "left") {
    try {
      debugLog(`[drawTextRgbaAligned] Rendering text: "${text}", alignment: ${alignment}`);
      const DEGREE_SYMBOL_ALPHA_FACTOR = 0.75;
      let [x, y] = position;
      let renderText = text;
      let hasDegreeSymbol = false;

      // Check for degree symbol and adjust text if needed
      if (text.endsWith("°")) {
        renderText = text.slice(0, -1);
        hasDegreeSymbol = true;
      }

      // For digits, ensure we keep leading zeros by treating them as strings
      if (/^\d+$/.test(renderText)) {
        renderText = String(renderText);
        debugLog(`[drawTextRgbaAligned] Formatted numeric text: "${renderText}"`);
      }

      // Calculate width and adjust for alignment
      if (alignment !== "left") {
        const width = this._calculateTextWidth(renderText);
        x = alignment === "right"
          ? Math.max(0, x - width)
          : Math.max(0, x - Math.floor(width / 2));
      }

      // Track the final x position for degree symbol
      let finalX = x;

      // Render main text character by character
      debugLog(`[drawTextRgbaAligned] Rendering characters: ${[...renderText].map(c => `"${c}"`).join(', ')}`);
      for (const char of renderText) {
        debugLog(`[drawTextRgbaAligned] Processing character: "${char}", charCode: ${char.charCodeAt(0)}`);
        const charMatrix = PixooDevice.TEXT_FONT[char] || PixooDevice.TEXT_FONT["?"];
        const width = Math.floor(charMatrix.length / PixooDevice.FONT_METRICS.DIGIT_HEIGHT);

        for (let i = 0; i < charMatrix.length; i++) {
          if (charMatrix[i] === 1) {
            const px = x + (i % width);
            const py = y + Math.floor(i / width);
            await this.drawPixelRgba([px, py], rgbaColor);
          }
        }

        finalX = x + width;
        x += width + PixooDevice.FONT_METRICS.CHARACTER_SPACING;
      }

      // Add degree symbol if needed
      if (hasDegreeSymbol) {
        const degreeX = finalX + 1;
        const degreeY = y - 1;

        if (!this._isOutOfBounds(degreeX, degreeY)) {
          const degreeColor = [...rgbaColor];
          const originalAlpha = rgbaColor.length === 4 ? rgbaColor[3] : 255;
          degreeColor[3] = Math.round(originalAlpha * DEGREE_SYMBOL_ALPHA_FACTOR);
          await this.drawPixelRgba([degreeX, degreeY], degreeColor);
        }
      }

      return true;
    } catch (error) {
      this._logError("drawTextRgbaAligned", error);
      return false;
    }
  }


  /**
   * Calculates total width for float text rendering
   * Determines exact pixel width needed for number display including sign, digits, and decimal
   *
   * @private
   * @param {boolean} isNegative - Whether number is negative
   * @param {number} integerPart - Integer portion of number
   * @param {boolean} hasMaxDigits - Whether max digits limit is reached
   * @param {number} maxTotalDigits - Maximum total digits allowed
   * @param {number} kerningOffset - Kerning adjustment for special cases
   * @returns {number} Total width in pixels
   *
   * Width components:
   * - Minus sign (if negative): MINUS_SIGN_WIDTH pixels
   * - Integer digits: (DIGIT_WIDTH + spacing) per digit
   * - Decimal point and spacing (if showing decimals)
   * - Fractional digits (if not at max digits)
   * - Kerning adjustments for special cases
   *
   * Special cases:
   * - Single digit integers use fixed width
   * - Multi-digit integers include spacing
   * - Decimal point adds left/right spacing
   * - Kerning offset adjusts specific number combinations
   *
   * @example
   * // Width for "-42.5" with 2 decimal places
   * const width = _calculateFloatWidth(true, 42, false, 2, 0);
   */
  _calculateFloatWidth(
    isNegative,
    integerPart,
    hasMaxDigits,
    maxTotalDigits,
    kerningOffset,
  ) {
    // Calculate integer width accounting for digit spacing
    const integerDigits = Math.abs(integerPart).toString().length;
    const integerWidth =
      integerDigits === 1
        ? PixooDevice.FONT_METRICS.DIGIT_WIDTH
        : PixooDevice.FONT_METRICS.DIGIT_WIDTH * integerDigits +
        (integerDigits - 1);

    // Calculate total width including optional components
    return (
      (isNegative ? PixooDevice.FONT_METRICS.MINUS_SIGN_WIDTH : 0) +
      integerWidth +
      (!hasMaxDigits && maxTotalDigits > 1
        ? PixooDevice.FONT_METRICS.COMMA_SPACING_LEFT +
        1 + // Width of decimal point
        PixooDevice.FONT_METRICS.COMMA_SPACING_RIGHT +
        PixooDevice.FONT_METRICS.DIGIT_WIDTH -
        kerningOffset
        : 0)
    );
  }

  /**
   * Renders float text with all components (sign, integer, decimal)
   * Handles precise positioning and rendering of complex number strings
   *
   * @private
   * @param {number} value - Original value to render
   * @param {number[]} position - Base position [x,y]
   * @param {number[]} rgbaColor - Color with optional alpha
   * @param {string} alignment - Text alignment ('left', 'center', 'right')
   * @param {number} totalWidth - Pre-calculated total width
   * @param {boolean} isNegative - If number is negative
   * @param {number} integerPart - Integer portion
   * @param {number} fractionalPart - Decimal portion
   * @param {boolean} hasMaxDigits - If max digits reached
   * @param {number} maxTotalDigits - Max digits allowed
   * @param {number} kerningOffset - Kerning adjustment
   * @returns {Promise<void>}
   *
   * Rendering sequence:
   * 1. Calculate final base position based on alignment
   * 2. Render minus sign if negative
   * 3. Render integer digits with proper spacing
   * 4. Render decimal point with custom spacing
   * 5. Render fractional digits if applicable
   *
   * Position calculations:
   * - Accounts for total width in alignment
   * - Adjusts for minus sign presence
   * - Handles special kerning cases
   * - Maintains precise decimal alignment
   *
   * @throws {Warning} Logs warning if rendering fails at any stage
   */
  async _renderFloat(
    value,
    position,
    rgbaColor,
    alignment,
    totalWidth,
    isNegative,
    integerPart,
    fractionalPart,
    hasMaxDigits,
    maxTotalDigits,
    kerningOffset,
  ) {
    let baseX = position[0];
    if (alignment === "right") {
      baseX = position[0] - totalWidth;
    } else if (alignment === "center") {
      baseX = position[0] - Math.floor(totalWidth / 2);
    }

    //     node.warn(`[_renderFloat] Starting render with:
    //         integerPart: ${integerPart}
    //         fractionalPart: "${fractionalPart}"
    //         alignment: ${alignment}
    //         baseX: ${baseX}`);

    // Draw minus sign if negative
    if (isNegative) {
      await this.drawTextRgbaAligned("-", [baseX, position[1]], rgbaColor);
    }

    // Calculate integer width for proper decimal point positioning
    const integerDigits = Math.abs(integerPart).toString().length;
    const integerWidth =
      integerDigits === 1
        ? PixooDevice.FONT_METRICS.DIGIT_WIDTH
        : PixooDevice.FONT_METRICS.DIGIT_WIDTH * integerDigits +
        (integerDigits - 1);

    // Draw integer part
    const integerBaseX =
      baseX + (isNegative ? PixooDevice.FONT_METRICS.MINUS_SIGN_WIDTH : 0);

    await this.drawTextRgbaAligned(
      Math.abs(integerPart).toString(),
      [integerBaseX, position[1]],
      rgbaColor,
    );

    // Draw decimal part if needed
    if (!hasMaxDigits && maxTotalDigits > 1) {
      const decimalX =
        baseX +
        (isNegative ? PixooDevice.FONT_METRICS.MINUS_SIGN_WIDTH : 0) +
        integerWidth +
        PixooDevice.FONT_METRICS.COMMA_SPACING_LEFT;

      const decimalY =
        position[1] + PixooDevice.FONT_METRICS.COMMA_HEIGHT_OFFSET;

      // Draw decimal point using line segments
      await this.drawLineRgba(
        [decimalX, decimalY],
        [decimalX, decimalY + 1],
        rgbaColor,
      );

      const fractionX =
        decimalX +
        1 +
        PixooDevice.FONT_METRICS.COMMA_SPACING_RIGHT -
        kerningOffset;

      // Ensure fractionalPart is treated as a string and maintain leading zeros
      const formattedFraction = String(fractionalPart).padStart(maxTotalDigits - integerDigits, '0');
      debugLog(`[_renderFloat] Rendering fraction: "${formattedFraction}" at x:${fractionX}, y:${position[1]}`);

      await this.drawTextRgbaAligned(
        formattedFraction,
        [fractionX, position[1]],
        rgbaColor,
      );
    }
  }

  /**
   * Draws a floating point number with customizable formatting and alignment
   * Provides precise control over number display with space-aware precision adaptation
   *
   * @param {number} value - Number to display
   * @param {number[]} position - [x, y] position
   * @param {number[]} rgbaColor - [r, g, b, a] color values (a is optional, defaults to 255)
   * @param {string} alignment - Text alignment ('left', 'center', 'right', default: 'left')
   * @param {number} maxTotalDigits - Maximum total characters to display (default: 2)
   * @returns {Promise<number>} Width of rendered text in pixels
   *
   * Number formatting rules:
   * - Adapts decimal precision based on integer part length
   * - Available decimal places = maxTotalDigits - integer_length
   * - Rounds to nearest decimal based on available space
   * - Handles negative numbers with consistent spacing
   * - Applies special kerning for aesthetic digit combinations
   *
   * Space-aware formatting cases:
   * - maxTotalDigits=1: Always rounds to integer
   * - Large integers: Decimals reduced or removed to fit maxTotalDigits
   * - Small integers: Uses remaining space for decimal precision
   * - Negative values: Includes minus sign in width but not in digit count
   *
   * @example
   * // Draw "1.23" centered (3 total digits)
   * await drawCustomFloatText(1.2349, [32, 32], [255, 255, 0], 'center', 3);
   * // Draw "12.3" right-aligned (4-digit number limited to 3 chars)
   * await drawCustomFloatText(12.34, [63, 32], [255, 255, 0], 'right', 3);
   * // Draw "123" (integer only when no space for decimals)
   * await drawCustomFloatText(123.456, [32, 32], [255, 255, 0], 'center', 3);
   * // Draw "-1.2" with 50% transparency (negative number handling)
   * await drawCustomFloatText(-1.23, [32, 32], [255, 255, 0, 128], 'left', 3);
   *
   * @throws {Warning} Logs warning if text rendering fails
   */
  async drawCustomFloatText(value, position, rgbaColor, alignment = "left", maxTotalDigits = 2) {
    try {
      debugLog(`[drawCustomFloatText] Raw input value: ${value}, type: ${typeof value}`);

      let roundedValue, integerPart, fractionalPart;
      const isNegative = value < 0;
      const absValue = Math.abs(value);
      const integerDigits = Math.floor(absValue).toString().length;

      if (maxTotalDigits === 1 || integerDigits >= maxTotalDigits) {
        roundedValue = Math.round(value);
        integerPart = roundedValue;
        fractionalPart = "0";
      } else {
        const availableDecimals = maxTotalDigits - integerDigits;
        const multiplier = Math.pow(10, availableDecimals);

        // Enhanced precision handling
        const scaledValue = Math.round(value * multiplier);
        roundedValue = scaledValue / multiplier;

        integerPart = Math.floor(Math.abs(roundedValue));

        // Direct string formatting for fractional part
        const fractionalStr = Math.abs(roundedValue).toFixed(availableDecimals);
        fractionalPart = fractionalStr.split('.')[1] || '0';

        //         node.warn(`[drawCustomFloatText] Precision calculation:
        //           scaledValue: ${scaledValue}
        //           roundedValue: ${roundedValue}
        //           fractionalStr: ${fractionalStr}
        //           fractionalPart: ${fractionalPart}`);
      }

      const hasMaxDigits = Math.abs(integerPart).toString().length >= maxTotalDigits;
      const needsSpecialKerning = !hasMaxDigits &&
        PixooDevice.FONT_METRICS.SPECIAL_KERNING_DIGITS.includes(parseInt(fractionalPart));
      const kerningOffset = needsSpecialKerning ?
        PixooDevice.FONT_METRICS.SPECIAL_KERNING_OFFSET : 0;

      const totalWidth = this._calculateFloatWidth(
        isNegative,
        integerPart,
        hasMaxDigits,
        maxTotalDigits,
        kerningOffset
      );

      debugLog(`[drawCustomFloatText] Final: hasMaxDigits=${hasMaxDigits}, kerningOffset=${kerningOffset}, totalWidth=${totalWidth}`);

      await this._renderFloat(
        value,
        position,
        rgbaColor,
        alignment,
        totalWidth,
        isNegative,
        integerPart,
        fractionalPart,
        hasMaxDigits,
        maxTotalDigits,
        kerningOffset
      );

      return totalWidth;
    } catch (error) {
      this._logError("drawCustomFloatText", error);
      return 0;
    }
  }

  /**
   * Draws an image with transparency support
   * Handles both JPEG and PNG formats with advanced alpha channel processing
   *
   * @param {string} imagePath - Path to image file
   * @param {number[]} position - [x, y] position of top-left corner
   * @param {number[]} size - [width, height] target dimensions
   * @param {number} [alpha] - Optional global alpha value (0-255)
   * @returns {Promise<boolean>} Success status
   *
   * Image processing features:
   * - Automatic format detection (JPEG/PNG)
   * - Resolution scaling to target size
   * - Per-pixel alpha blending for PNGs
   * - Global transparency override option
   * - Bounds checking and clipping
   *
   * Alpha handling:
   * - PNG: Uses built-in alpha channel
   * - JPEG: Treated as fully opaque
   * - Global alpha: Multiplies with per-pixel alpha
   * - Preserves existing display content through blending
   *
   * Performance considerations:
   * - Images are processed pixel-by-pixel
   * - Large images may impact rendering speed
   * - Memory efficient processing
   *
   * @example
   * // Draw PNG with original transparency
   * await drawImageWithAlpha("/icons/status.png", [0, 0], [32, 32]);
   * // Draw JPEG with 50% global transparency
   * await drawImageWithAlpha("/background.jpg", [0, 0], [64, 64], 128);
   *
   * @throws {Warning} Logs warning if image processing fails
   * @requires sharp - Node.js image processing library
   */
  //  async x_legacy_drawImageWithAlpha(imagePath, position, size, alpha = null) {


  /**
   * Renders image with pixel-by-pixel alpha blending
   * Internal method for processing image data and applying transparency
   *
   * @private
   * @param {Buffer} imageBuffer - Raw image data buffer
   * @param {number[]} position - Target position [x,y]
   * @param {number[]} size - Image dimensions [width,height]
   * @param {boolean} isJPG - Whether image is JPG format
   * @param {number|null} alpha - Optional override alpha value
   * @returns {Promise<boolean>} Success status
   *
   * Pixel processing steps:
   * 1. Iterate through each pixel position
   * 2. Extract color channels from buffer
   * 3. Calculate effective alpha value
   * 4. Perform alpha blending with display
   * 5. Update display buffer
   *
   * Alpha calculation:
   * - PNG: source_alpha * (override_alpha/255)
   * - JPG: override_alpha/255 or 1.0
   * - Skips fully transparent pixels
   *
   * Buffer structure:
   * - JPG: RGB (3 bytes per pixel)
   * - PNG: RGBA (4 bytes per pixel)
   * - Pixels arranged row by row
   *
   * Optimization features:
   * - Bounds checking to prevent buffer overruns
   * - Early skip of transparent pixels
   * - Minimal memory allocation
   *
   * @throws {Warning} Logs warning if rendering fails
   */
  //  async x_legacy_renderImage(imageBuffer, position, size, isJPG, alpha = null) {


  /**
   * Process image metadata and configure processing options
   * @private
   * @param {Object} metadata - Sharp metadata object
   */
  async _processImageMetadata(metadata) {
    const config = {
      colorspace: metadata.space || "srgb",
      hasAlpha: metadata.channels === 4,
      format: metadata.format,
      isWebOptimized: metadata.isProgressive || false,
    };

    // Handle web-optimized PNGs (like those from Pixelmator Pro)
    if (
      metadata.format === "png" &&
      (metadata.profile === "sRGB IEC61966-2.1" || metadata.space === "srgb")
    ) {
      config.isWebOptimized = true;
      config.needsColorspaceConversion = false;
    } else {
      config.needsColorspaceConversion = true;
    }

    return config;
  }

  /**
   * Set up image processing pipeline based on metadata
   * @private
   * @param {Object} sharp - Sharp instance
   * @param {Object} config - Processing configuration
   * @param {number[]} size - Target dimensions
   * @returns promise{Object} Configured Sharp pipeline
   */
  async _setupImageProcessing(sharp, config, size) {
    let pipeline = sharp;

    // Ensure consistent color space handling
    if (config.needsColorspaceConversion) {
      pipeline = pipeline.toColorspace("srgb");
    }

    // Handle web-optimized images
    if (config.isWebOptimized) {
      pipeline = pipeline.resize(size[0], size[1], {
        kernel: "lanczos3",
        fit: "fill",
      });
    } else {
      pipeline = pipeline.resize(size[0], size[1]);
    }

    // Configure output format
    return pipeline.raw({
      channels: config.hasAlpha ? 4 : 3,
    });
  }

  /**
   * Enhanced image rendering with improved color space handling
   * @private
   * @param {Buffer} imageBuffer - Raw image data
   * @param {number[]} position - Target position [x,y]
   * @param {number[]} size - Image dimensions [width,height]
   * @param {Object} config - Processing configuration
   * @param {number|null} alpha - Global alpha override
   * @returns {Promise<boolean>} Success status
   */
  async _renderImage(imageBuffer, position, size, config, alpha = null) {
    try {
      const bytesPerPixel = config.hasAlpha ? 4 : 3;
      const stride = size[0] * bytesPerPixel;

      for (let y = 0; y < size[1]; y++) {
        const rowOffset = y * stride;

        for (let x = 0; x < size[0]; x++) {
          const [px, py] = [position[0] + x, position[1] + y];
          if (this._isOutOfBounds(px, py)) continue;

          const pixelOffset = rowOffset + x * bytesPerPixel;
          let pixelAlpha = config.hasAlpha
            ? imageBuffer[pixelOffset + 3] / 255
            : 1;

          // Apply global alpha if specified
          if (alpha !== null) {
            pixelAlpha *= alpha / 255;
          }

          // Skip fully transparent pixels
          if (pixelAlpha === 0) continue;

          const pixelColor = [
            imageBuffer[pixelOffset],
            imageBuffer[pixelOffset + 1],
            imageBuffer[pixelOffset + 2],
            Math.round(pixelAlpha * 255),
          ];

          await this.drawPixelRgba([px, py], pixelColor);
        }
      }
      return true;
    } catch (error) {
      this._logError("_renderImage", error);
      return false;
    }
  }

  /**
   * Enhanced image drawing with improved color space handling
   * Optimized for web-exported PNGs from tools like Pixelmator Pro
   *
   * @param {string} imagePath - Path to image file
   * @param {number[]} position - [x, y] position of top-left corner
   * @param {number[]} size - [width, height] target dimensions
   * @param {number} [alpha] - Optional global alpha value (0-255)
   * @returns {Promise<boolean>} Success status
   */
  async drawImageWithAlpha(imagePath, position, size, alpha = null) {
    try {
      if (alpha !== null && (alpha < 0 || alpha > 255)) {
        throw new Error(`Invalid alpha value ${alpha}`);
      }

      const sharp = await global.get("sharp");
      const image = sharp(imagePath);
      const metadata = await image.metadata();

      // Process metadata and setup configuration
      const config = await this._processImageMetadata(metadata);

      // Configure image processing pipeline
      const pipeline = await this._setupImageProcessing(image, config, size);

      // Process image
      const imageBuffer = await pipeline.toBuffer();

      // Render processed image
      return await this._renderImage(
        imageBuffer,
        position,
        size,
        config,
        alpha,
      );
    } catch (error) {
      this._logError("drawImageWithAlpha", error);
      return false;
    }
  }

  // Utility methods

  /**
   * Calculates text width in pixels
   * @private
   * @param {string} text - Text to measure
   * @returns {number} Width in pixels
   */
  _calculateTextWidth(text) {
    return [...text].reduce((acc, c) => {
      if (!PixooDevice.TEXT_FONT[c]) c = "?";
      const width = Math.floor(
        PixooDevice.TEXT_FONT[c].length / PixooDevice.FONT_METRICS.DIGIT_HEIGHT,
      );
      return acc + width + PixooDevice.FONT_METRICS.CHARACTER_SPACING;
    }, 0);
  }

  /**
   * Checks if coordinates are outside display bounds
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if out of bounds
   */
  _isOutOfBounds(x, y) {
    return x < 0 || x >= this.size || y < 0 || y >= this.size;
  }

  /**
   * Logs errors with context
   * @private
   * @param {string} method - Method where error occurred
   * @param {Error} error - Error object
   */
  _logError(method, error) {
    node.warn(`[PixooDevice.${method}] ${error.message}`);
  }
}

/**
 * PixooManager Class
 *
 * Singleton class that manages multiple PixooDevice instances.
 * Provides centralized device management and initialization.
 */
class PixooManager {
  constructor() {
    if (!PixooManager.instance) {
      this.devices = new Map();
      PixooManager.instance = this;
    }
    return PixooManager.instance;
  }

  /**
   * Cleans up and removes all managed device instances
   * Performs graceful shutdown of all devices in the manager
   * 
   * @returns {Promise<Array>} Array of cleanup results for each device
   * @property {string} host - Device hostname or IP address
   * @property {boolean} success - Whether cleanup was successful
   * @property {string} [error] - Error message if cleanup failed
   * 
   * Process:
   * - Attempts to clean up each device in the collection
   * - Records success/failure status per device
   * - Clears device map after cleanup attempts
   * - Returns detailed results of cleanup operations
   * 
   * Usage:
   * - Typically called before reinitialization
   * - Helps prevent resource leaks during redeployment
   * - Ensures clean state before device re-creation
   * 
   * @example
   * // Clean up all devices before reinitializing
   * const results = await pixooManager.cleanupAllDevices();
   * console.log(`Cleaned up ${results.filter(r => r.success).length} devices successfully`);
   */
  async cleanupAllDevices() {
    const results = [];
    for (const [hostAddress, device] of this.devices.entries()) {
      try {
        await device.cleanup();
        results.push({ host: hostAddress, success: true });
      } catch (error) {
        results.push({ host: hostAddress, success: false, error: error.message });
      }
    }
    // Clear the devices map
    this.devices.clear();
    return results;
  }

  /**
   * Creates a new PixooDevice instance or returns existing one
   * @param {string} hostAddress - Device IP address or hostname
   * @param {number} size - Display size
   * @returns {PixooDevice} Device instance
   */
  createDevice(hostAddress, size) {
    if (!this.devices.has(hostAddress)) {
      const device = new PixooDevice(hostAddress, size);
      this.devices.set(hostAddress, device);
    }
    return this.devices.get(hostAddress);
  }

  /**
   * Retrieves an existing device instance
   * @param {string} hostAddress - Device IP address or hostname
   * @returns {PixooDevice|null} Device instance or null if not found
   */
  getDevice(hostAddress) {
    return this.devices.get(hostAddress) || null;
  }

  /**
   * Initializes a device with the PixooAPI
   * @param {string} hostAddress - Device IP address or hostname
   * @param {Object} PixooAPI - Pixoo API class
   * @param {number} size - Display size (default: 64)
   * @returns {Promise<PixooDevice>} Initialized device instance
   */
  async initializeDevice(hostAddress, PixooAPI, size = 64) {
    const device = this.createDevice(hostAddress, size);
    await device.initialize(PixooAPI);
    return device;
  }
}

/**
 * Initializes a Pixoo device with validation and error handling
 * Performs address validation and manages initialization state
 *
 * @param {string} hostAddress - Device host address (IP or hostname)
 * @param {boolean} silent - Suppress console warnings (default: false)
 * @returns {Promise<PixooDevice|null>} Initialized device or null on failure
 *
 * Validation:
 * - Validates host address format (IPv4 or hostname)
 * - Verifies silent parameter type
 *
 * Status updates:
 * - Reports initialization progress via node status
 * - Logs success/failure messages to console
 * - Provides detailed error information
 *
 * @throws {Error} If input parameters are invalid
 * @requires PixooAPI from global context
 */
async function pixooSetup(hostAddress, silent = false) {
  // Input validation
  if (typeof silent !== "boolean") {
    throw new Error("Invalid input: silent must be a boolean value");
  }

  // Validate hostAddress
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const hostnameRegex =
    /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

  if (!ipRegex.test(hostAddress) && !hostnameRegex.test(hostAddress)) {
    throw new Error(
      "Invalid host address: must be a valid IP address or hostname",
    );
  }

  try {
    // Update status and initialize
    node.status({ fill: "green", shape: "circle", text: "Initializing..." });
    const PixooAPI = await global.get("PixooAPI")();
    const device = await pixooManager.initializeDevice(hostAddress, PixooAPI);

    // Get and report device details
    const details = await device.getAllSettings();
    const initMsg = `${details.timestamp} • Pixoo initialized at ${device.hostAddress}`;
    node.status({ fill: "green", shape: "dot", text: initMsg });

    if (!silent) {
      node.warn(initMsg);
    }

    return device;
  } catch (error) {
    node.status({ fill: "red", shape: "ring", text: error.message });
    node.warn(`Pixoo initialization error: ${error.message}`);
    return null;
  }
}

// Create global singleton instance
const pixooManager = new PixooManager();
context.global.PixooManager = pixooManager;

/**
 * IFFE: Immediately Invoked Function Expression
 * Self-executing initialization function that
 * sets up all specified Pixoo devices.
 * @async
 * @private
 */
(async function initializeAllPixooDevices() {
  node.warn(node.name + ": Multi-device setup starting...");

  // Clean up existing devices first
  if (context.global.PixooManager) {
    node.warn(node.name + ": Cleaning up previous device instances...");
    await context.global.PixooManager.cleanupAllDevices();
  }

  // --- Pixoo devices ---
  const devicesToSetup = [
//     { host: "wz-pixoo-64-00", defaultMode: PixooDevice.MODES.ENERGY_LEVELS }, //oben im wz medienschrank, IP: 192.168.1.159
//     { host: "wz-pixoo-64-01", defaultMode: PixooDevice.MODES.POWER_PRICE }, //unten im wz medienschrank, IP: 192.168.1.189
    { host: "192.168.1.159", defaultMode: PixooDevice.MODES.ENERGY_LEVELS }, //oben im wz medienschrank, IP: 192.168.1.159
    { host: "192.168.1.189", defaultMode: PixooDevice.MODES.POWER_PRICE }, //unten im wz medienschrank, IP: 192.168.1.189
  ];
  // ----------------------------------------

  let initializedCount = 0;
  const totalDevices = devicesToSetup.length;

  // Use Promise.allSettled to attempt initializing all devices even if some fail
  const results = await Promise.allSettled(
    devicesToSetup.map(config => pixooSetup(config.host)) // Call pixooSetup for each host
  );

  // Process results and set default modes
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const config = devicesToSetup[i];

    if (result.status === 'fulfilled' && result.value) {
      // pixooSetup returns the device instance on success
      const device = result.value;
      node.warn(`${node.name}: Successfully initialized ${device.hostAddress}`);
      initializedCount++;

      // Set the specified default mode (and action, if provided)
      try {
        await device.setDeviceMode(config.defaultMode, config.defaultAction || null);
        node.log(`Default mode set for ${device.hostAddress}`);
      } catch (modeError) {
        node.warn(`Failed to set default mode for ${device.hostAddress}: ${modeError.message}`);
      }

    } else {
      // Initialization failed for this device
      const errorMessage = result.reason ? result.reason.message : 'Unknown setup error';
      node.warn(`${node.name}: Failed to initialize ${config.host}. Error: ${errorMessage}`);
      // The pixooSetup function already logs the error and sets node status on failure
    }
  }

  // Final status update
  const finalMsg = `${node.name}: Setup completed. ${initializedCount}/${totalDevices} devices initialized successfully.`;
  node.warn(finalMsg);
  if (initializedCount === totalDevices) {
      node.status({ fill: "green", shape: "dot", text: `Initialized: ${initializedCount}/${totalDevices}` });
  } else if (initializedCount > 0) {
      node.status({ fill: "yellow", shape: "dot", text: `Initialized: ${initializedCount}/${totalDevices}` });
  } else {
      node.status({ fill: "red", shape: "ring", text: `Initialization failed for all ${totalDevices} devices` });
  }

})(); // End of the IIFE

// No return value needed
return null;
