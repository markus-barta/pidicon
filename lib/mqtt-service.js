/**
 * @fileoverview MQTT Service - Centralized MQTT connection and message routing
 *
 * This service encapsulates all MQTT logic, providing:
 * - Connection management (connect, disconnect, reconnect)
 * - Subscription management via MqttSubscriptionManager
 * - Message routing to registered handlers
 * - Publishing with error handling
 *
 * Benefits:
 * - Testable with mock MQTT clients
 * - Swappable transport layer (MQTT, WebSockets, etc.)
 * - Clean separation from business logic
 * - Centralized MQTT configuration
 *
 * @module lib/mqtt-service
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const EventEmitter = require('events');
const mqtt = require('mqtt');

/**
 * MQTT Service - Manages MQTT connection, subscriptions, and message routing
 * @class
 * @extends EventEmitter
 */
class MqttService extends EventEmitter {
  /**
   * Create an MQTT service
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} [dependencies.config] - MQTT configuration
   * @param {string} [dependencies.config.brokerUrl] - MQTT broker URL
   * @param {string} [dependencies.config.username] - MQTT username
   * @param {string} [dependencies.config.password] - MQTT password
   * @param {Object} [dependencies.config.options] - Additional MQTT options
   */
  constructor({ logger, config = {} }) {
    super();
    this.logger = logger || require('./logger');
    this.config = {
      brokerUrl: config.brokerUrl || 'mqtt://localhost:1883',
      username: config.username,
      password: config.password,
      options: config.options || {},
      autoReconnect:
        config.autoReconnect !== undefined ? config.autoReconnect : true,
    };
    this.client = null;
    this.connected = false;
    this.messageHandlers = new Map(); // section -> handler function
    this.retryCount = 0;
    this.reconnectTimer = null;
    this.lastError = null;
    this.connectPromise = null;
    this.manualDisconnecting = false;
    this.lastHeartbeatTs = null;
    this.publishErrorCount = 0; // Track publish errors to reduce log spam
    this.lastPublishErrorLog = 0; // Timestamp of last publish error log
  }

  updateConfig(config = {}) {
    this.config = {
      brokerUrl: config.brokerUrl || this.config.brokerUrl,
      username: config.username,
      password: config.password,
      options: config.options || this.config.options,
      autoReconnect:
        config.autoReconnect !== undefined
          ? config.autoReconnect
          : this.config.autoReconnect,
    };
  }

  getStatus() {
    return {
      connected: this.connected,
      brokerUrl: this.config.brokerUrl,
      lastError: this.lastError,
      retryCount: this.retryCount,
      nextRetryInMs:
        this.connected || this.config.autoReconnect === false
          ? null
          : this._nextRetryDelay(),
      lastHeartbeatTs: this.lastHeartbeatTs,
      autoReconnect: this.config.autoReconnect !== false,
    };
  }

  _nextRetryDelay() {
    if (this.connected || this.config.autoReconnect === false) {
      return null;
    }
    if (this.retryCount < 5) {
      return 1000;
    }
    if (this.retryCount < 10) {
      return 5000;
    }
    if (this.retryCount < 15) {
      return 60000;
    }
    return 300000;
  }

  /**
   * Connect to MQTT broker
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        this.logger.warn('Already connected to MQTT broker');
        return resolve();
      }

      if (this.connectPromise) {
        return this.connectPromise.then(resolve).catch(reject);
      }

      const connectOptions = {
        reconnectPeriod: 0,
        clean: true,
        connectTimeout: 30_000,
        ...this.config.options,
        username: this.config.username,
        password: this.config.password,
      };

      const client = mqtt.connect(this.config.brokerUrl, connectOptions);
      this.client = client;
      this.manualDisconnecting = false;

      this.connectPromise = new Promise((resolve, reject) => {
        const cleanup = (err) => {
          this.connectPromise = null;
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };

        client.on('connect', () => {
          if (client !== this.client) {
            client.end(true);
            return;
          }

          const wasReconnecting = this.retryCount > 0;
          this.connected = true;
          this.retryCount = 0;
          this.lastError = null;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          if (wasReconnecting) {
            this.logger.ok('✅ MQTT connection restored', {
              broker: this.config.brokerUrl,
              username: this.config.username,
            });
          } else {
            this.logger.ok('✅ Connected to MQTT broker', {
              broker: this.config.brokerUrl,
              username: this.config.username,
            });
          }
          this.emit('connect');
          cleanup();
        });

        client.on('error', (err) => {
          if (client !== this.client) {
            return;
          }

          this.lastError = err.message;
          this.logger.error('❌ MQTT connection error', { error: err.message });
          this.emit('error', err);

          if (!this.connected && this.connectPromise) {
            cleanup(err);
          }

          if (
            !this.manualDisconnecting &&
            this.config.autoReconnect !== false
          ) {
            this._scheduleReconnect();
          }
        });

        client.on('close', () => {
          if (client !== this.client) {
            return;
          }

          if (this.connected) {
            this.logger.warn('MQTT connection closed');
          }
          this.connected = false;
          this.emit('close');

          if (
            !this.manualDisconnecting &&
            this.config.autoReconnect !== false
          ) {
            this._scheduleReconnect();
          }
        });

        client.on('reconnect', () => {
          if (client !== this.client) {
            return;
          }
          this.logger.info('MQTT reconnecting...');
          this.emit('reconnect');
        });

        client.on('message', (topic, message) => {
          if (client !== this.client) {
            return;
          }
          this.lastHeartbeatTs = Date.now();
          this._handleMessage(topic, message);
        });
      });

      this.connectPromise.then(resolve).catch(reject);
    });
  }

  /**
   * Disconnect from MQTT broker
   * @returns {Promise<void>}
   */
  disconnect(force = true) {
    return new Promise((resolve) => {
      this.manualDisconnecting = true;

      if (!this.client) {
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.connected = false;
        this.manualDisconnecting = false;
        return resolve();
      }

      const client = this.client;
      this.client = null;
      this.connected = false;

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      client.removeAllListeners();
      client.end(force, () => {
        this.logger.info('Disconnected from MQTT broker');
        this.emit('disconnect');
        this.manualDisconnecting = false;
        resolve();
      });
    });
  }

  /**
   * Subscribe to MQTT topics
   * @param {string|string[]} topics - Topic or array of topics to subscribe to
   * @param {Object} [options] - Subscription options
   * @returns {Promise<boolean>} True if subscribed successfully
   */
  subscribe(topics, options = {}) {
    return new Promise((resolve) => {
      if (!this.client || !this.connected) {
        this.logger.error('Cannot subscribe: not connected to MQTT broker');
        return resolve(false);
      }

      const topicList = Array.isArray(topics) ? topics : [topics];

      this.client.subscribe(topicList, options, (err) => {
        if (err) {
          this.logger.error('❌ MQTT subscription failed', {
            error: err.message,
            topics: topicList,
          });
          resolve(false);
        } else {
          this.logger.ok(`📡 MQTT subscribed to ${topicList.length} topics`, {
            topics: topicList,
          });
          this.emit('subscribed', topicList);
          resolve(true);
        }
      });
    });
  }

  /**
   * Unsubscribe from MQTT topics
   * @param {string|string[]} topics - Topic or array of topics
   * @returns {Promise<boolean>} True if unsubscribed successfully
   */
  unsubscribe(topics) {
    return new Promise((resolve) => {
      if (!this.client) {
        return resolve(false);
      }

      const topicList = Array.isArray(topics) ? topics : [topics];

      this.client.unsubscribe(topicList, (err) => {
        if (err) {
          this.logger.error('MQTT unsubscribe error', {
            error: err.message,
            topics: topicList,
          });
          resolve(false);
        } else {
          this.logger.info('MQTT unsubscribed', { topics: topicList });
          this.emit('unsubscribed', topicList);
          resolve(true);
        }
      });
    });
  }

  /**
   * Publish a message to an MQTT topic
   * @param {string} topic - Topic to publish to
   * @param {Object|string} payload - Message payload (will be JSON.stringified if object)
   * @param {Object} [options] - Publish options (qos, retain, etc.)
   * @returns {Promise<boolean>} True if published successfully
   */
  publish(topic, payload, options = {}) {
    return new Promise((resolve) => {
      if (!this.client || !this.connected) {
        // Log disconnection error at reduced frequency to avoid log spam
        this.publishErrorCount++;
        const now = Date.now();
        const timeSinceLastLog = now - this.lastPublishErrorLog;

        // Log first error, then only every 60 seconds
        if (this.publishErrorCount === 1 || timeSinceLastLog > 60000) {
          this.logger.warn('Cannot publish to MQTT: broker not connected', {
            topic,
            errorCount: this.publishErrorCount,
            brokerUrl: this.config.brokerUrl,
            retryCount: this.retryCount,
          });
          this.lastPublishErrorLog = now;
        }
        return resolve(false);
      }

      // Reset error count when connected
      if (this.publishErrorCount > 0) {
        this.logger.info('MQTT publishing resumed after reconnection', {
          missedPublishes: this.publishErrorCount,
        });
        this.publishErrorCount = 0;
      }

      const message =
        typeof payload === 'string' ? payload : JSON.stringify(payload);

      this.client.publish(topic, message, options, (err) => {
        if (err) {
          this.logger.error('MQTT publish error', {
            error: err.message,
            topic,
          });
          resolve(false);
        } else {
          this.logger.debug('MQTT published', { topic, bytes: message.length });
          this.emit('published', { topic, payload, options });
          resolve(true);
        }
      });
    });
  }

  /**
   * Schedule reconnect with progressive backoff
   * @private
   */
  _scheduleReconnect() {
    if (this.manualDisconnecting || this.config.autoReconnect === false) {
      return;
    }

    if (this.reconnectTimer || this.connected || this.connectPromise) {
      return;
    }

    this.retryCount += 1;
    const delayMs = this._nextRetryDelay();

    this.logger.warn(
      `MQTT reconnect scheduled in ${Math.round(delayMs / 1000)}s (attempt ${this.retryCount})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.logger.info('Attempting MQTT reconnect...');
      this.connect()
        .then(() => {
          this.logger.info('MQTT reconnect successful');
          return true;
        })
        .catch((err) => {
          this.logger.error('MQTT reconnect attempt failed', {
            error: err.message,
            attempt: this.retryCount,
          });
          this._scheduleReconnect();
          return false;
        });
    }, delayMs);
  }

  /**
   * Register a message handler for a specific topic section
   * Section is the 3rd part of topic: pixoo/<device>/<section>/<action>
   * @param {string} section - Topic section (e.g., 'scene', 'driver', 'state')
   * @param {Function} handler - Handler function (deviceIp, action, payload) => void
   */
  registerHandler(section, handler) {
    if (typeof handler !== 'function') {
      throw new Error(
        `Handler for section '${section}' must be a function, got ${typeof handler}`
      );
    }
    this.messageHandlers.set(section, handler);
    this.logger.debug(`Registered MQTT handler for section: ${section}`);
  }

  /**
   * Unregister a message handler
   * @param {string} section - Topic section
   */
  unregisterHandler(section) {
    this.messageHandlers.delete(section);
    this.logger.debug(`Unregistered MQTT handler for section: ${section}`);
  }

  /**
   * Internal message handler - routes to registered handlers
   * @private
   * @param {string} topic - MQTT topic
   * @param {Buffer} message - MQTT message
   */
  async _handleMessage(topic, message) {
    let payload;
    try {
      payload = JSON.parse(message.toString());
      const parts = topic.split('/'); // pixoo/<device>/<section>/<action?>
      const deviceIp = parts[1];
      const section = parts[2];
      const action = parts[3] || null;

      const handler = this.messageHandlers.get(section);
      if (handler) {
        await handler(deviceIp, action, payload);
      } else {
        this.logger.warn(`No handler for topic section: ${section}`, {
          topic,
        });
      }

      // Emit raw message event for advanced use cases
      this.emit('message', { topic, deviceIp, section, action, payload });
    } catch (err) {
      this.logger.error('Error parsing/handling MQTT message', {
        error: err.message,
        topic,
      });
      this.emit('error', err);
    }
  }

  /**
   * Check if connected to MQTT broker
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get registered handlers (for debugging/testing)
   * @returns {string[]} Array of registered section names
   */
  getHandlers() {
    return Array.from(this.messageHandlers.keys());
  }
}

module.exports = MqttService;
