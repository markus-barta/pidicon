/**
 * @fileoverview Device Capabilities System
 * @description Defines display capabilities and device profiles for multi-device support
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

/**
 * Display capabilities for a pixel display device
 */
class DisplayCapabilities {
  constructor({
    width,
    height,
    supportsAnimations = true,
    supportsAudio = false,
    maxFps = 5,
    colorDepth = 24,
    supportsBrightness = true,
    supportsIcons = false,
    protocolType = 'http', // 'http', 'mqtt', 'custom'
  }) {
    this.width = width;
    this.height = height;
    this.supportsAnimations = supportsAnimations;
    this.supportsAudio = supportsAudio;
    this.maxFps = maxFps;
    this.colorDepth = colorDepth;
    this.supportsBrightness = supportsBrightness;
    this.supportsIcons = supportsIcons;
    this.protocolType = protocolType;
  }

  /**
   * Get total pixels for this display
   */
  get totalPixels() {
    return this.width * this.height;
  }

  /**
   * Check if this display is compatible with a scene's requirements
   */
  isCompatibleWith(requirements) {
    if (requirements.minWidth && this.width < requirements.minWidth)
      return false;
    if (requirements.minHeight && this.height < requirements.minHeight)
      return false;
    if (requirements.requiresAudio && !this.supportsAudio) return false;
    if (requirements.requiresIcons && !this.supportsIcons) return false;
    return true;
  }
}

/**
 * Predefined device profiles
 */
const DEVICE_PROFILES = {
  PIXOO64: new DisplayCapabilities({
    width: 64,
    height: 64,
    supportsAnimations: true,
    supportsAudio: false,
    maxFps: 5,
    colorDepth: 24,
    supportsBrightness: true,
    supportsIcons: false,
    protocolType: 'http',
  }),

  AWTRIX: new DisplayCapabilities({
    width: 32,
    height: 8,
    supportsAnimations: true,
    supportsAudio: true,
    maxFps: 10,
    colorDepth: 24,
    supportsBrightness: true,
    supportsIcons: true,
    protocolType: 'mqtt',
  }),
};

module.exports = {
  DisplayCapabilities,
  DEVICE_PROFILES,
};
