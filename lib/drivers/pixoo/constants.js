/**
 * @fileoverview Pixoo Driver Constants
 * @description Constants specific to Pixoo 64x64 devices
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const PIXOO_CONSTANTS = {
  // Display dimensions
  WIDTH: 64,
  HEIGHT: 64,
  TOTAL_PIXELS: 4096, // 64 * 64

  // Communication
  HTTP_TIMEOUT: 5000,
  MAX_RETRIES: 3,
  DEFAULT_PORT: 80,

  // Font (bitmap font)
  FONT_WIDTH: 4,
  FONT_HEIGHT: 5,
  FONT_SPACING: 1,

  // Pixoo API commands
  COMMANDS: {
    DRAW: 'Draw/SendHttpGif',
    CLEAR_TEXT: 'Draw/ClearHttpText',
    RESET_HTTP_GIF: 'Draw/ResetHttpGifId',
    SET_BRIGHTNESS: 'Channel/SetBrightness',
    GET_SETTINGS: 'Device/GetDeviceSettings',
  },
};

module.exports = PIXOO_CONSTANTS;
