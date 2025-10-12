/**
 * @fileoverview Device Configuration Store
 * @description Manages persistent device configurations (name, type, watchdog, etc.)
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const fs = require('fs').promises;
const path = require('path');

const { DEVICE_TYPES, DRIVER_TYPES } = require('./core/constants');
const logger = require('./logger');

/**
 * Device configuration class
 */
class DeviceConfig {
  constructor({
    ip,
    name = `Device ${ip}`,
    deviceType = DEVICE_TYPES.PIXOO64,
    driver = DRIVER_TYPES.MOCK,
    startupScene = null,
    brightness = 80,
    watchdog = {},
  }) {
    this.ip = ip;
    this.name = name;
    this.deviceType = deviceType;
    this.driver = driver;
    this.startupScene = startupScene;
    this.brightness = brightness;
    this.watchdog = {
      enabled: watchdog.enabled || false,
      timeoutMinutes: watchdog.timeoutMinutes || 120,
      action: watchdog.action || 'restart',
      mqttCommandSequence: watchdog.mqttCommandSequence || [],
      fallbackScene: watchdog.fallbackScene || null,
      notifyOnFailure: watchdog.notifyOnFailure || true,
    };
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    if (!this.ip) errors.push('IP address is required');
    if (!Object.values(DEVICE_TYPES).includes(this.deviceType)) {
      errors.push(`Invalid device type: ${this.deviceType}`);
    }
    if (!Object.values(DRIVER_TYPES).includes(this.driver)) {
      errors.push(`Invalid driver: ${this.driver}`);
    }
    if (this.brightness < 0 || this.brightness > 100) {
      errors.push('Brightness must be between 0 and 100');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON() {
    return {
      ip: this.ip,
      name: this.name,
      deviceType: this.deviceType,
      driver: this.driver,
      startupScene: this.startupScene,
      brightness: this.brightness,
      watchdog: this.watchdog,
    };
  }
}

/**
 * Device configuration store - manages persistent device configs
 */
class DeviceConfigStore {
  constructor(configPath = './config/devices.json') {
    this.configPath = path.resolve(configPath);
    this.devices = new Map(); // ip -> DeviceConfig
    this.loaded = false;
  }

  /**
   * Load device configurations from JSON file
   */
  async load() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const json = JSON.parse(data);

      this.devices.clear();
      for (const [ip, config] of Object.entries(json.devices || {})) {
        this.devices.set(ip, new DeviceConfig(config));
      }

      this.loaded = true;
      logger.info(
        `📋 [CONFIG] Loaded ${this.devices.size} device configuration(s)`,
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('📋 [CONFIG] No device config file found, starting fresh');
        this.loaded = true;
      } else {
        logger.error(
          `❌ [CONFIG] Failed to load device config: ${error.message}`,
        );
        throw error;
      }
    }
  }

  /**
   * Save device configurations to JSON file
   */
  async save() {
    try {
      const json = {
        version: '1.0',
        lastModified: new Date().toISOString(),
        devices: {},
      };

      for (const [ip, config] of this.devices.entries()) {
        json.devices[ip] = config.toJSON();
      }

      // Ensure config directory exists
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });

      await fs.writeFile(
        this.configPath,
        JSON.stringify(json, null, 2),
        'utf8',
      );
      logger.info(
        `💾 [CONFIG] Saved ${this.devices.size} device configuration(s)`,
      );
    } catch (error) {
      logger.error(
        `❌ [CONFIG] Failed to save device config: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Add a new device configuration
   */
  async addDevice(config) {
    const deviceConfig = new DeviceConfig(config);
    const validation = deviceConfig.validate();

    if (!validation.valid) {
      throw new Error(`Invalid device config: ${validation.errors.join(', ')}`);
    }

    if (this.devices.has(deviceConfig.ip)) {
      throw new Error(`Device ${deviceConfig.ip} already exists`);
    }

    this.devices.set(deviceConfig.ip, deviceConfig);
    await this.save();

    logger.info(
      `➕ [CONFIG] Added device ${deviceConfig.ip} (${deviceConfig.name})`,
    );
    return deviceConfig;
  }

  /**
   * Update existing device configuration
   */
  async updateDevice(ip, updates) {
    const existing = this.devices.get(ip);
    if (!existing) {
      throw new Error(`Device ${ip} not found`);
    }

    const updated = new DeviceConfig({ ...existing.toJSON(), ...updates, ip });
    const validation = updated.validate();

    if (!validation.valid) {
      throw new Error(`Invalid device config: ${validation.errors.join(', ')}`);
    }

    this.devices.set(ip, updated);
    await this.save();

    logger.info(`✏️  [CONFIG] Updated device ${ip} (${updated.name})`);
    return updated;
  }

  /**
   * Remove device configuration
   */
  async removeDevice(ip) {
    if (!this.devices.has(ip)) {
      throw new Error(`Device ${ip} not found`);
    }

    this.devices.delete(ip);
    await this.save();

    logger.info(`🗑️  [CONFIG] Removed device ${ip}`);
  }

  /**
   * Get device configuration
   */
  getDevice(ip) {
    return this.devices.get(ip);
  }

  /**
   * Get all device configurations
   */
  getAllDevices() {
    return this.devices;
  }

  /**
   * Check if any devices are configured
   */
  hasDevices() {
    return this.devices.size > 0;
  }
}

module.exports = { DeviceConfigStore, DeviceConfig };
