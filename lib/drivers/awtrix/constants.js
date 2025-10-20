/**
 * @fileoverview AWTRIX Driver Constants
 * @description Constants specific to AWTRIX (Ulanzi TC001) 32x8 devices
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 * @see https://blueforcer.github.io/awtrix3/#/api
 * @see https://github.com/Blueforcer/awtrix3/blob/main/docs/api.md
 */

const AWTRIX_CONSTANTS = {
  // Display dimensions
  WIDTH: 32,
  HEIGHT: 8,
  TOTAL_PIXELS: 256, // 32 * 8

  // Protocol support
  SUPPORTS_MQTT: true,
  SUPPORTS_HTTP: true,
  DEFAULT_HTTP_PORT: 80,
  DEFAULT_MQTT_PORT: 1883,

  // MQTT Configuration
  MQTT_PREFIX: 'awtrix_',

  // HTTP API Base
  HTTP_API_BASE: '/api',

  // MQTT Topics (relative to awtrix_{deviceId})
  TOPICS: {
    // Custom apps (per-app rendering)
    CUSTOM: '/custom/', // + appName

    // Temporary notifications (overlay)
    NOTIFY: '/notify',

    // Device settings
    SETTINGS: '/settings',

    // Status indicators (top pixel row)
    INDICATOR: '/indicator/', // + index (1-3)

    // Audio
    SOUND: '/sound',
    RTTTL: '/rtttl',

    // System control
    COMMAND: '/command',
    UPDATE: '/update',
    POWER: '/power',
    SLEEP: '/sleep',

    // Device info
    STATS: '/stats',
    SCREEN: '/screen',
    LOOP: '/loop',

    // App control
    SWITCH: '/switch',
    NEXTAPP: '/nextapp',
    PREVIOUSAPP: '/previousapp',
  },

  // HTTP Endpoints (relative to /api)
  HTTP_ENDPOINTS: {
    NOTIFY: '/notify',
    CUSTOM: '/custom/', // + appName
    SETTINGS: '/settings',
    STATS: '/stats',
    POWER: '/power',
    SLEEP: '/sleep',
    INDICATOR: '/indicator',
    SOUND: '/sound',
    RTTTL: '/rtttl',
    SCREEN: '/screen',
  },

  // Icon system
  ICON_SIZE: 8, // 8x8 pixel icons
  MAX_ICONS: 10000, // Large built-in icon library
  ICON_URL_BASE: 'https://developer.lametric.com/api/v1/icons/',

  // Text rendering
  MAX_TEXT_LENGTH: 256,
  SUPPORTS_SCROLLING: true,
  SUPPORTS_RAINBOW: true,

  // Colors
  COLOR_FORMAT: 'RGB565', // 16-bit color or HTML hex
  SUPPORTS_24BIT_COLOR: true,

  // Audio
  SUPPORTS_AUDIO: true,
  SUPPORTS_RTTTL: true,
  MAX_RTTTL_LENGTH: 1024,

  // Effects
  EFFECTS: ['fade', 'scroll', 'blink', 'rainbow', 'slide', 'zoom', 'rotate'],

  // Default values
  DEFAULT_DURATION: 5000, // ms
  DEFAULT_REPEAT: 1,
  DEFAULT_BRIGHTNESS: 100, // 0-255
  DEFAULT_SPEED: 100, // scroll speed

  // Notification priorities
  PRIORITIES: {
    LOW: 0,
    NORMAL: 1,
    HIGH: 2,
    URGENT: 3,
  },

  // Settings keys
  SETTINGS_KEYS: {
    BRIGHTNESS: 'BRI', // 0-255
    AUTO_BRIGHTNESS: 'ABRI', // boolean
    TEMPERATURE: 'TEMP', // boolean (color temperature)
    HUM: 'HUM', // boolean (humidity)
    BAT: 'BAT', // boolean (battery)
    BLOCK_KEYS: 'BLOCKKEYS', // boolean
    UPPERCASE: 'UPPERCASE', // boolean
    SOUND: 'SOUND', // boolean
    TRANSITION: 'TEFF', // transition effect
    APP_TIME: 'ATIME', // app display time (ms)
    SCROLL_SPEED: 'SSPEED', // scroll speed
    TIME_FORMAT: 'TIME_FORMAT', // "%H:%M:%S" or "%I:%M:%S %p"
    DATE_FORMAT: 'DATE_FORMAT', // "%d.%m.%y"
    VOLUME: 'VOL', // 0-30
    WIFI_STRENGTH: 'WD', // boolean
  },
};

module.exports = AWTRIX_CONSTANTS;
