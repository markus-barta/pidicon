/**
 * @fileoverview Device Configuration Store
 * @description Manages persistent device configurations (name, type, watchdog, etc.)
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
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
      healthCheckIntervalSeconds: watchdog.healthCheckIntervalSeconds ?? 10,
      checkWhenOff: watchdog.checkWhenOff ?? true,
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
  constructor(configPath = null) {
    // Priority: explicit path > env var > /data mount > fallback to ./config
    this.configPath = path.resolve(
      configPath ||
        process.env.PIDICON_CONFIG_PATH ||
        (this._checkDataMount()
          ? '/data/devices.json'
          : './config/devices.json'),
    );
    this.devices = new Map(); // ip -> DeviceConfig
    this.settings = {
      mediaPath: process.env.PIDICON_MEDIA_PATH || '/data/media',
      scenesPath: process.env.PIDICON_SCENES_PATH || '/data/scenes',
      mqttBrokerUrl:
        process.env.PIDICON_MQTT_BROKER_URL || 'mqtt://localhost:1883',
      mqttUsername: process.env.PIDICON_MQTT_USERNAME || '',
    };
    this.loaded = false;

    logger.info(`📋 [CONFIG] Using config path: ${this.configPath}`);
  }

  /**
   * Check if /data mount exists (for Docker volumes)
   * @private
   */
  _checkDataMount() {
    try {
      const fs = require('fs');
      return fs.existsSync('/data') && fs.statSync('/data').isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Ensure media and scenes directories exist
   * @private
   */
  async _ensureDirectories() {
    try {
      await fs.mkdir(this.settings.mediaPath, { recursive: true });
      await fs.mkdir(this.settings.scenesPath, { recursive: true });
      logger.info(
        `✅ [CONFIG] Ensured directories exist: ${this.settings.mediaPath}, ${this.settings.scenesPath}`,
      );
    } catch (error) {
      logger.warn(
        `⚠️  [CONFIG] Failed to create directories: ${error.message}`,
      );
    }
  }

  /**
   * Load device configurations from JSON file
   */
  async load() {
    logger.info(`📋 [CONFIG] Loading config from: ${this.configPath}`);
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const json = JSON.parse(data);

      // Load settings
      if (json.settings) {
        this.settings = {
          mediaPath: json.settings.mediaPath || this.settings.mediaPath,
          scenesPath: json.settings.scenesPath || this.settings.scenesPath,
          mqttBrokerUrl:
            json.settings.mqttBrokerUrl || this.settings.mqttBrokerUrl,
          mqttUsername:
            json.settings.mqttUsername || this.settings.mqttUsername || '',
        };
      }

      // Load devices (support both array and object formats)
      this.devices.clear();
      const devices = Array.isArray(json.devices)
        ? json.devices
        : Object.values(json.devices || {});

      for (const config of devices) {
        this.devices.set(config.ip, new DeviceConfig(config));
      }

      // Ensure media and scenes directories exist
      await this._ensureDirectories();

      this.loaded = true;
      logger.info(
        `📋 [CONFIG] Loaded ${this.devices.size} device configuration(s) from ${this.configPath}`,
      );
      logger.info(`📁 [CONFIG] Media path: ${this.settings.mediaPath}`);
      logger.info(`📁 [CONFIG] Scenes path: ${this.settings.scenesPath}`);
      logger.info(
        `📡 [CONFIG] MQTT broker: ${this.settings.mqttBrokerUrl || 'n/a'}`,
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info(
          `📋 [CONFIG] No device config file found at ${this.configPath}, starting fresh`,
        );
        await this._ensureDirectories();
        this.loaded = true;
      } else {
        logger.error(
          `❌ [CONFIG] Failed to load device config from ${this.configPath}: ${error.message}`,
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
        settings: this.settings,
        devices: [],
      };

      for (const [_ip, config] of this.devices.entries()) {
        json.devices.push(config.toJSON());
      }

      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      logger.debug(`📋 [CONFIG] Ensured config directory exists: ${configDir}`);

      await fs.writeFile(
        this.configPath,
        JSON.stringify(json, null, 2),
        'utf8',
      );
      logger.info(
        `💾 [CONFIG] Saved ${this.devices.size} device configuration(s) to ${this.configPath}`,
      );
    } catch (error) {
      logger.error(
        `❌ [CONFIG] Failed to save device config to ${this.configPath}: ${error.message}`,
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

  /**
   * Get settings (media path, scenes path)
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    if (!this.settings.mqttBrokerUrl) {
      this.settings.mqttBrokerUrl = 'mqtt://localhost:1883';
    }

    this.settings.mqttUsername = this.settings.mqttUsername || '';
    await this._ensureDirectories();
    await this.save();
    logger.info(`⚙️  [CONFIG] Updated settings`);
  }
}

module.exports = { DeviceConfigStore, DeviceConfig };
