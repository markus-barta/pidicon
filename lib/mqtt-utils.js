/**
 * @fileoverview MQTT Publishing Utilities - Consolidated MQTT message handling
 * @description Centralized utilities for publishing MQTT messages with consistent
 * formatting, error handling, and logging patterns.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const logger = require('./logger');
const versionInfo = require('../version.json');

/**
 * MQTT Message Publisher - Centralized MQTT publishing with consistent patterns
 */
class MqttPublisher {
  constructor(client) {
    this.client = client;
  }

  /**
   * Publish a message to MQTT with error handling
   * @param {string} topic - MQTT topic
   * @param {Object} message - Message payload
   * @param {Object} options - Publishing options
   * @returns {Promise<boolean>} True if published successfully
   */
  async publish(topic, message, options = {}) {
    try {
      const payload =
        typeof message === 'string' ? message : JSON.stringify(message);

      return new Promise((resolve) => {
        this.client.publish(topic, payload, options, (err) => {
          if (err) {
            logger.error(`❌ MQTT publish failed: ${topic}`, {
              error: err.message,
              payload:
                payload.substring(0, 100) + (payload.length > 100 ? '...' : ''),
            });
            resolve(false);
          } else {
            logger.debug(`📤 MQTT published: ${topic}`, {
              payloadLength: payload.length,
            });
            resolve(true);
          }
        });
      });
    } catch (error) {
      logger.error(`❌ MQTT publish error: ${topic}`, {
        error: error.message,
        payload: message,
      });
      return false;
    }
  }

  /**
   * Publish success metrics for a scene
   * @param {string} deviceIp - Device IP address
   * @param {string} sceneName - Scene name
   * @param {Object} metrics - Performance metrics
   * @returns {Promise<boolean>} True if published successfully
   */
  async publishOk(deviceIp, sceneName, metrics = {}) {
    const message = {
      scene: sceneName,
      frametime: metrics.frametime || 0,
      diffPixels: metrics.diffPixels || 0,
      pushes: metrics.pushes || 0,
      skipped: metrics.skipped || 0,
      errors: metrics.errors || 0,
      version: versionInfo.version,
      buildNumber: versionInfo.buildNumber,
      gitCommit: versionInfo.gitCommit,
      ts: Date.now(),
    };

    // Log locally
    logger.ok(`✅ [${deviceIp}] ${sceneName}`, {
      frametime: message.frametime,
      diffPixels: message.diffPixels,
      pushes: message.pushes,
    });

    // Publish to MQTT
    const success = await this.publish(`pixoo/${deviceIp}/ok`, message);

    if (success) {
      logger.debug(
        `📤 Published success metrics for ${sceneName} on ${deviceIp}`,
      );
    }

    return success;
  }

  /**
   * Publish error message for a scene
   * @param {string} deviceIp - Device IP address
   * @param {string} sceneName - Scene name
   * @param {Error} error - Error object
   * @param {Object} context - Additional context information
   * @returns {Promise<boolean>} True if published successfully
   */
  async publishError(deviceIp, sceneName, error, context = {}) {
    const message = {
      error: error.message,
      scene: sceneName,
      ts: Date.now(),
      context: {
        device: context.device || deviceIp,
        frametime: context.frametime || 0,
        stack: context.includeStack ? error.stack : undefined,
      },
    };

    // Log locally
    logger.error(`❌ [${deviceIp}] ${sceneName}`, {
      error: error.message,
      context: message.context,
    });

    // Publish to MQTT
    const success = await this.publish(`pixoo/${deviceIp}/error`, message);

    if (success) {
      logger.debug(`📤 Published error for ${sceneName} on ${deviceIp}`);
    }

    return success;
  }

  /**
   * Publish device metrics
   * @param {string} deviceIp - Device IP address
   * @param {Object} metrics - Device metrics object
   * @returns {Promise<boolean>} True if published successfully
   */
  async publishMetrics(deviceIp, metrics = {}) {
    const message = {
      pushes: metrics.pushes || 0,
      skipped: metrics.skipped || 0,
      errors: metrics.errors || 0,
      lastFrametime: metrics.lastFrametime || 0,
      ts: Date.now(),
    };

    const success = await this.publish(`pixoo/${deviceIp}/metrics`, message);

    if (success) {
      logger.debug(`📤 Published metrics for ${deviceIp}`);
    }

    return success;
  }

  /**
   * Publish scene state change
   * @param {string} deviceIp - Device IP address
   * @param {Object} state - Scene state object
   * @returns {Promise<boolean>} True if published successfully
   */
  async publishSceneState(deviceIp, state = {}) {
    const message = {
      currentScene: state.currentScene || 'unknown',
      targetScene: state.targetScene || 'unknown',
      status: state.status || 'unknown',
      generationId: state.generationId || 0,
      version: versionInfo.version,
      buildNumber: versionInfo.buildNumber,
      gitCommit: versionInfo.gitCommit,
      ts: Date.now(),
    };

    const topic = `${state.topicBase || 'pixoo'}/${deviceIp}/scene/state`;
    const success = await this.publish(topic, message);

    if (success) {
      logger.debug(`📤 Published scene state for ${deviceIp}`, {
        status: state.status,
        scene: state.currentScene,
      });
    }

    return success;
  }

  /**
   * Publish scene command response
   * @param {string} deviceIp - Device IP address
   * @param {string} command - Command type (scene, driver, reset)
   * @param {Object} response - Response data
   * @returns {Promise<boolean>} True if published successfully
   */
  async publishCommandResponse(deviceIp, command, response = {}) {
    const message = {
      ...response,
      ts: Date.now(),
    };

    const success = await this.publish(`pixoo/${deviceIp}/${command}`, message);

    if (success) {
      logger.debug(`📤 Published ${command} response for ${deviceIp}`);
    }

    return success;
  }
}

/**
 * MQTT Subscription Manager - Centralized subscription handling
 */
class MqttSubscriptionManager {
  constructor(client) {
    this.client = client;
    this.subscriptions = new Map();
  }

  /**
   * Subscribe to MQTT topics with error handling
   * @param {string|string[]} topics - Topic or array of topics to subscribe to
   * @param {Function} handler - Message handler function
   * @param {Object} options - Subscription options
   * @returns {Promise<boolean>} True if subscribed successfully
   */
  async subscribe(topics, handler, options = {}) {
    try {
      const topicList = Array.isArray(topics) ? topics : [topics];

      return new Promise((resolve) => {
        this.client.subscribe(topicList, options, (err) => {
          if (err) {
            logger.error('❌ MQTT subscription failed', {
              error: err.message,
              topics: topicList,
            });
            resolve(false);
          } else {
            topicList.forEach((topic) => {
              this.subscriptions.set(topic, handler);
            });

            logger.ok(`📡 MQTT subscribed to ${topicList.length} topics`, {
              topics: topicList,
            });
            resolve(true);
          }
        });
      });
    } catch (error) {
      logger.error('❌ MQTT subscription error', {
        error: error.message,
        topics: Array.isArray(topics) ? topics : [topics],
      });
      return false;
    }
  }

  /**
   * Unsubscribe from MQTT topics
   * @param {string|string[]} topics - Topic or array of topics to unsubscribe from
   * @returns {Promise<boolean>} True if unsubscribed successfully
   */
  async unsubscribe(topics) {
    try {
      const topicList = Array.isArray(topics) ? topics : [topics];

      return new Promise((resolve) => {
        this.client.unsubscribe(topicList, (err) => {
          if (err) {
            logger.error('❌ MQTT unsubscribe failed', {
              error: err.message,
              topics: topicList,
            });
            resolve(false);
          } else {
            topicList.forEach((topic) => {
              this.subscriptions.delete(topic);
            });

            logger.ok(`📡 MQTT unsubscribed from ${topicList.length} topics`, {
              topics: topicList,
            });
            resolve(true);
          }
        });
      });
    } catch (error) {
      logger.error('❌ MQTT unsubscribe error', {
        error: error.message,
        topics: Array.isArray(topics) ? topics : [topics],
      });
      return false;
    }
  }

  /**
   * Get subscription handler for a topic
   * @param {string} topic - MQTT topic
   * @returns {Function|null} Handler function or null if not found
   */
  getHandler(topic) {
    return this.subscriptions.get(topic) || null;
  }

  /**
   * List all active subscriptions
   * @returns {string[]} Array of subscribed topics
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }
}

/**
 * MQTT Topic Utilities - Consistent topic generation
 */
const TopicUtils = {
  /**
   * Generate scene state topic
   * @param {string} deviceIp - Device IP address
   * @param {string} base - Topic base (default: 'pixoo')
   * @returns {string} Scene state topic
   */
  sceneState(deviceIp, base = 'pixoo') {
    return `${base}/${deviceIp}/scene/state`;
  },

  /**
   * Generate command topic
   * @param {string} deviceIp - Device IP address
   * @param {string} section - Topic section (state, scene, driver, reset)
   * @param {string} action - Action (upd, set)
   * @param {string} base - Topic base (default: 'pixoo')
   * @returns {string} Command topic
   */
  command(deviceIp, section, action, base = 'pixoo') {
    return `${base}/${deviceIp}/${section}/${action}`;
  },

  /**
   * Generate device-specific topic
   * @param {string} deviceIp - Device IP address
   * @param {string} suffix - Topic suffix
   * @param {string} base - Topic base (default: 'pixoo')
   * @returns {string} Device-specific topic
   */
  device(deviceIp, suffix, base = 'pixoo') {
    return `${base}/${deviceIp}/${suffix}`;
  },

  /**
   * Parse device IP from topic
   * @param {string} topic - MQTT topic
   * @returns {string|null} Device IP or null if not found
   */
  parseDeviceIp(topic) {
    const parts = topic.split('/');
    return parts.length >= 2 ? parts[1] : null;
  },

  /**
   * Parse topic sections
   * @param {string} topic - MQTT topic
   * @returns {Object} Parsed topic components
   */
  parseTopic(topic) {
    const parts = topic.split('/');
    return {
      base: parts[0] || null,
      deviceIp: parts[1] || null,
      section: parts[2] || null,
      action: parts[3] || null,
    };
  },
};

module.exports = {
  MqttPublisher,
  MqttSubscriptionManager,
  TopicUtils,
};
