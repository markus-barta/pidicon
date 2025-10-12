/**
 * @fileoverview AWTRIX Driver Constants
 * @description Constants specific to AWTRIX (Ulanzi TC001) 32x8 devices
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 * @see https://github.com/Blueforcer/awtrix3
 */

const AWTRIX_CONSTANTS = {
  // Display dimensions
  WIDTH: 32,
  HEIGHT: 8,
  TOTAL_PIXELS: 256, // 32 * 8

  // MQTT Configuration
  MQTT_PREFIX: 'awtrix_',
  DEFAULT_PORT: 1883,

  // MQTT Topics (appended to awtrix_{deviceId})
  TOPICS: {
    NOTIFY: '/notify',
    CUSTOM: '/custom/',
    SETTINGS: '/settings',
    INDICATOR: '/indicator',
    SOUND: '/sound',
    RTTTL: '/rtttl',
    REBOOT: '/reboot',
    UPDATE: '/update',
    STATS: '/stats',
  },

  // Icon system
  ICON_SIZE: 8, // 8x8 pixel icons
  MAX_ICONS: 1000,

  // Audio
  SUPPORTS_AUDIO: true,
  RTTTL_FORMAT: true,
};

module.exports = AWTRIX_CONSTANTS;
