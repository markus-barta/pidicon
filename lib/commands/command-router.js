/**
 * @fileoverview CommandRouter - Routes MQTT messages to appropriate handlers
 * @description Implements command routing pattern to dispatch MQTT messages
 * to the correct command handler based on the topic section (scene, driver,
 * reset, state). Provides consistent error handling and validation.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const { ValidationError } = require('../errors');

/**
 * Routes commands to appropriate handlers
 * Implements the Router pattern for command dispatching
 */
class CommandRouter {
  /**
   * Create a CommandRouter
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.handlers - Map of command handlers
   * @param {Object} dependencies.handlers.scene - SceneCommandHandler
   * @param {Object} dependencies.handlers.driver - DriverCommandHandler
   * @param {Object} dependencies.handlers.reset - ResetCommandHandler
   * @param {Object} dependencies.handlers.state - StateCommandHandler
   */
  constructor({ logger, handlers }) {
    if (!logger) {
      throw new ValidationError('Logger is required');
    }
    if (!handlers || typeof handlers !== 'object') {
      throw new ValidationError('Handlers object is required');
    }

    this.logger = logger;
    this.handlers = new Map();

    // Register handlers
    for (const [section, handler] of Object.entries(handlers)) {
      if (!handler) {
        this.logger.warn(`No handler provided for section: ${section}`);
        continue;
      }

      // Validate handler has handle() method
      if (typeof handler.handle !== 'function') {
        throw new ValidationError(
          `Handler for '${section}' must have handle() method`,
        );
      }

      this.handlers.set(section, handler);
      this.logger.debug(`Registered command handler: ${section}`);
    }

    this.logger.ok(
      `CommandRouter initialized with ${this.handlers.size} handlers`,
    );
  }

  /**
   * Route a command to the appropriate handler
   * @param {string} topic - Full MQTT topic (e.g., "pixoo/192.168.1.1/scene/set")
   * @param {Object} payload - Command payload
   * @returns {Promise<void>}
   */
  async route(topic, payload) {
    try {
      // Parse topic: pixoo/<deviceIp>/<section>/<action>
      const parsed = this._parseTopic(topic);

      if (!parsed) {
        this.logger.warn(`Invalid topic format: ${topic}`);
        return;
      }

      const { deviceIp, section, action } = parsed;

      // Get handler for this section
      const handler = this.handlers.get(section);

      if (!handler) {
        this.logger.warn(`No handler registered for section: ${section}`, {
          topic,
        });
        return;
      }

      // Route to handler
      this.logger.debug(`Routing ${section}/${action} command for ${deviceIp}`);
      await handler.handle(deviceIp, action, payload);
    } catch (error) {
      this.logger.error('Command routing failed:', {
        topic,
        error: error.message,
      });
    }
  }

  /**
   * Parse MQTT topic into components
   * @param {string} topic - MQTT topic
   * @returns {Object|null} Parsed topic or null if invalid
   * @private
   */
  _parseTopic(topic) {
    if (!topic || typeof topic !== 'string') {
      return null;
    }

    // Expected format: pixoo/<deviceIp>/<section>/<action?>
    const parts = topic.split('/');

    if (parts.length < 3 || parts[0] !== 'pixoo') {
      return null;
    }

    return {
      deviceIp: parts[1],
      section: parts[2],
      action: parts[3] || null,
    };
  }

  /**
   * Get list of registered handler sections
   * @returns {string[]} Array of section names
   */
  getHandlerSections() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if handler exists for section
   * @param {string} section - Section name
   * @returns {boolean} True if handler exists
   */
  hasHandler(section) {
    return this.handlers.has(section);
  }
}

module.exports = CommandRouter;
