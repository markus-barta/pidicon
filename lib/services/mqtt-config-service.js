'use strict';

const Joi = require('joi');

const { readSecret, writeSecret } = require('../util/secrets-store');

const MQTT_SCHEMA = Joi.object({
  brokerUrl: Joi.string()
    .uri({ scheme: ['mqtt', 'mqtts', 'ws', 'wss'] })
    .required(),
  username: Joi.string().allow('', null),
  password: Joi.string().allow('', null),
  clientId: Joi.string().allow('', null),
  keepalive: Joi.number().integer().min(0).max(65535).default(60),
  clean: Joi.boolean().default(true),
  tls: Joi.boolean().default(false),
  autoReconnect: Joi.boolean().default(true),
});

const DEFAULT_CONFIG = Object.freeze({
  brokerUrl: 'mqtt://localhost:1883',
  username: '',
  password: '',
  clientId: '',
  keepalive: 60,
  clean: true,
  tls: false,
  autoReconnect: true,
});

class MqttConfigService {
  constructor({ logger, mqttService } = {}) {
    this.logger = logger || console;
    this.cache = null;
    this.mqttService = mqttService;
  }

  async loadConfig() {
    if (this.cache) {
      return this.cache;
    }

    try {
      const data = await readSecret();
      if (!data) {
        this.cache = { ...DEFAULT_CONFIG };
      } else {
        const { value, error } = MQTT_SCHEMA.validate(data, {
          allowUnknown: true,
          stripUnknown: true,
        });
        if (error) {
          this.logger.warn(
            'Invalid persisted MQTT config; falling back to defaults',
            {
              error: error.message,
            }
          );
          this.cache = { ...DEFAULT_CONFIG };
        } else {
          this.cache = { ...DEFAULT_CONFIG, ...value };
        }
      }
    } catch (error) {
      this.logger.error('Failed to load MQTT config; using defaults', {
        error: error.message,
      });
      this.cache = { ...DEFAULT_CONFIG };
    }

    return this.cache;
  }

  async updateConfig(patch) {
    const current = await this.loadConfig();
    const merged = { ...current, ...patch };
    const { value, error } = MQTT_SCHEMA.validate(merged, {
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      throw new Error(`Invalid MQTT configuration: ${error.message}`);
    }

    await writeSecret(value);
    this.cache = value;

    if (this.mqttService?.updateConfig) {
      this.mqttService.updateConfig(value);
    }

    return this.cache;
  }

  getDefaults() {
    return { ...DEFAULT_CONFIG };
  }
}

module.exports = MqttConfigService;
