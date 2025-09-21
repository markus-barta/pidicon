/**
 * @fileoverview Device Context Management - Unified context creation and validation
 * @description Centralized utilities for creating and validating device contexts
 * with consistent patterns and error handling.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 * @stability Production-grade with comprehensive validation
 */

const { getContext } = require('./device-adapter');
const logger = require('./logger');
const { MqttPublisher } = require('./mqtt-utils');
const versionInfo = require('../version.json');

/**
 * Device Context Factory - Creates standardized device contexts
 */
class DeviceContextFactory {
  constructor(mqttClient) {
    this.mqttClient = mqttClient;
    this.publisher = new MqttPublisher(mqttClient);
  }

  /**
   * Create standardized device context
   * @param {string} deviceIp - Device IP address
   * @param {string} sceneName - Scene name
   * @param {Object} payload - MQTT payload
   * @param {Function} publishOk - Success callback function
   * @returns {Object} Standardized device context
   */
  createContext(deviceIp, sceneName, payload = {}, publishOk = null) {
    try {
      // Get device instance
      const device = getContext(deviceIp, sceneName, payload, publishOk);

      // Create standardized context
      const context = {
        // Core components
        device,
        state: device.state,
        publishOk: publishOk || this.createPublishOk(deviceIp, sceneName),

        // Context information
        env: {
          deviceIp,
          sceneName,
          host: deviceIp,
          width: device?.size || 64,
          height: device?.size || 64,
        },

        // State management functions
        getState: (key, defaultValue = null) => {
          try {
            const stateKey = this.getStateKey(deviceIp, sceneName);
            const sceneState = device.state.get(stateKey) || new Map();
            return sceneState.get(key) ?? defaultValue;
          } catch (error) {
            logger.warn(`Failed to get state for ${sceneName}:`, {
              key,
              error: error.message,
            });
            return defaultValue;
          }
        },

        setState: (key, val) => {
          try {
            const stateKey = this.getStateKey(deviceIp, sceneName);
            let sceneState = device.state.get(stateKey);
            if (!sceneState) {
              sceneState = new Map();
              device.state.set(stateKey, sceneState);
            }
            sceneState.set(key, val);
          } catch (error) {
            logger.warn(`Failed to set state for ${sceneName}:`, {
              key,
              val,
              error: error.message,
            });
          }
        },

        // Payload data
        payload,

        // Loop control
        loopDriven: true,

        // Version information
        version: versionInfo.version,
        buildNumber: versionInfo.buildNumber,
        gitCommit: versionInfo.gitCommit,

        // Utilities
        logger: logger,
        utils: {
          publishOk: this.createPublishOk(deviceIp, sceneName),
          publishError: this.createPublishError(deviceIp, sceneName),
          publishMetrics: this.createPublishMetrics(deviceIp),
        },
      };

      logger.debug(`📋 Created context for ${sceneName} on ${deviceIp}`);
      return context;
    } catch (error) {
      logger.error(`❌ Failed to create context for ${sceneName}:`, {
        deviceIp,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create state key for scene state storage
   * @param {string} deviceIp - Device IP address
   * @param {string} sceneName - Scene name
   * @returns {string} State key
   */
  getStateKey(deviceIp, sceneName) {
    return `${deviceIp}::${sceneName}`;
  }

  /**
   * Create publishOk function for the context
   * @param {string} deviceIp - Device IP address
   * @param {string} sceneName - Scene name
   * @returns {Function} publishOk function
   */
  createPublishOk(deviceIp, sceneName) {
    return async (
      deviceIpArg,
      sceneNameArg,
      frametime,
      diffPixels,
      metrics,
    ) => {
      const deviceIpToUse = deviceIpArg || deviceIp;
      const sceneNameToUse = sceneNameArg || sceneName;

      try {
        await this.publisher.publishOk(deviceIpToUse, sceneNameToUse, {
          frametime,
          diffPixels,
          pushes: metrics?.pushes || 0,
          skipped: metrics?.skipped || 0,
          errors: metrics?.errors || 0,
        });
      } catch (error) {
        logger.warn(`Failed to publish success for ${sceneNameToUse}:`, {
          error: error.message,
        });
      }
    };
  }

  /**
   * Create publishError function for the context
   * @param {string} deviceIp - Device IP address
   * @param {string} sceneName - Scene name
   * @returns {Function} publishError function
   */
  createPublishError(deviceIp, sceneName) {
    return async (error, context = {}) => {
      try {
        await this.publisher.publishError(deviceIp, sceneName, error, context);
      } catch (publishError) {
        logger.warn(`Failed to publish error for ${sceneName}:`, {
          error: publishError.message,
        });
      }
    };
  }

  /**
   * Create publishMetrics function for the context
   * @param {string} deviceIp - Device IP address
   * @returns {Function} publishMetrics function
   */
  createPublishMetrics(deviceIp) {
    return async (metrics = {}) => {
      try {
        await this.publisher.publishMetrics(deviceIp, metrics);
      } catch (error) {
        logger.warn(`Failed to publish metrics for ${deviceIp}:`, {
          error: error.message,
        });
      }
    };
  }

  /**
   * Validate device context
   * @param {Object} context - Device context to validate
   * @param {string} sceneName - Scene name for error messages
   * @returns {boolean} True if context is valid
   */
  validateContext(context, sceneName = 'unknown') {
    if (!context || typeof context !== 'object') {
      logger.error(`❌ [${sceneName}] Invalid context: not an object`);
      return false;
    }

    const requiredProps = [
      'device',
      'publishOk',
      'state',
      'getState',
      'setState',
    ];
    const missingProps = requiredProps.filter((prop) => !(prop in context));

    if (missingProps.length > 0) {
      logger.error(
        `❌ [${sceneName}] Missing context properties: ${missingProps.join(', ')}`,
      );
      return false;
    }

    // Validate required functions
    const requiredFunctions = ['publishOk'];
    const missingFunctions = requiredFunctions.filter(
      (prop) => typeof context[prop] !== 'function',
    );

    if (missingFunctions.length > 0) {
      logger.error(
        `❌ [${sceneName}] Invalid context functions: ${missingFunctions.join(', ')}`,
      );
      return false;
    }

    // Validate state is a Map
    if (!(context.state instanceof Map)) {
      logger.error(`❌ [${sceneName}] context.state must be a Map`);
      return false;
    }

    return true;
  }
}

/**
 * Context Utilities - Common context handling functions
 */
const ContextUtils = {
  /**
   * Extract standard properties from context
   * @param {Object} context - Device context
   * @returns {Object} Destructured context properties
   */
  extractContext(context) {
    const { device, publishOk, getState, setState, payload, loopDriven, env } =
      context;

    return {
      device,
      publishOk,
      getState,
      setState,
      payload,
      loopDriven,
      env,
    };
  },

  /**
   * Create context wrapper with error handling
   * @param {Object} context - Device context
   * @param {string} sceneName - Scene name for error messages
   * @returns {Object} Wrapped context with error handling
   */
  wrapContext(context, sceneName = 'unknown') {
    return {
      ...context,

      // Safe state access with error handling
      safeGetState: (key, defaultValue = null) => {
        try {
          return context.getState(key, defaultValue);
        } catch (error) {
          logger.warn(`Safe getState error in ${sceneName}:`, {
            key,
            error: error.message,
          });
          return defaultValue;
        }
      },

      safeSetState: (key, val) => {
        try {
          return context.setState(key, val);
        } catch (error) {
          logger.warn(`Safe setState error in ${sceneName}:`, {
            error: error.message,
          });
        }
      },

      // Error reporting
      reportError: (error, additionalContext = {}) => {
        logger.error(`❌ [${sceneName}] Context error:`, {
          error: error.message,
          context: additionalContext,
        });
      },
    };
  },

  /**
   * Create minimal context for testing
   * @param {Object} options - Options for context creation
   * @returns {Object} Minimal test context
   */
  createTestContext(options = {}) {
    const {
      deviceIp = '127.0.0.1',
      sceneName = 'test',
      payload = {},
    } = options;

    return {
      device: {
        host: deviceIp,
        size: 64,
        clear: async () => {},
        push: async () => {},
      },
      state: new Map(),
      publishOk: () => {},
      env: {
        deviceIp,
        sceneName,
        host: deviceIp,
        width: 64,
        height: 64,
      },
      getState: (key, defaultValue = null) => defaultValue,
      setState: (key, val) => {}, // eslint-disable-line no-unused-vars
      payload,
      loopDriven: true,
      version: 'test',
      buildNumber: '0',
      gitCommit: 'test',
    };
  },
};

module.exports = {
  DeviceContextFactory,
  ContextUtils,
};
