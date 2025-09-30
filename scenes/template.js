/**
 * @fileoverview Scene Template - Copy this file to create new scenes
 * @description Template for creating new Pixoo scenes with all required patterns and best practices
 * @author [Your Name] ([your initials]) with assistance from Cursor AI
 * @license MIT
 *
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
 *   -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"your_scene_name"}'
 */

/**
 * @fileoverview Scene Template
 * @description Replace this description with your scene's purpose and functionality
 *
 * Features:
 * - Feature 1 description
 * - Feature 2 description
 * - Feature 3 description
 *
 * MQTT Usage:
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
 *   -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"template"}'
 *
 * Parameters:
 * - param1: Description of parameter 1 (optional)
 * - param2: Description of parameter 2 (optional)
 *
 * @author [Your Name] ([your initials]) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

/**
 * Scene name - must match the filename and be unique across all scenes
 */
const name = 'template';

/**
 * Import required modules
 */
const logger = require('../lib/logger');
// const { validateSceneContext } = require('../lib/performance-utils');
// const { validateColor } = require('../lib/validation');

/**
 * Color constants (optional - customize as needed)
 */
const COLORS = Object.freeze({
  BACKGROUND: [20, 20, 40, 255],
  PRIMARY: [255, 255, 255, 255],
  SECONDARY: [100, 150, 255, 255],
  ACCENT: [255, 200, 100, 255],
});

/**
 * Layout constants (optional - customize as needed)
 */
// const LAYOUT = Object.freeze({
//   MARGIN: 2,
//   TEXT_HEIGHT: 5,
//   SPACING: 8,
// });

/**
 * Default configuration values
 */
const DEFAULTS = Object.freeze({
  EXAMPLE_PARAM: 'default_value',
  ANIMATION_SPEED: 100, // ms
});

/**
 * Initialize the scene
 * @param {Object} context - Scene context
 * @param {Object} context.device - Device adapter for drawing
 * @param {Map} context.state - Scene state storage
 * @param {Function} context.getState - State getter function
 * @param {Function} context.setState - State setter function
 * @param {Object} context.payload - MQTT payload data
 * @param {Object} context.env - Environment information
 * @returns {Promise<void>}
 */
async function init(context) {
  logger.debug(`🚀 [TEMPLATE] Scene initialized`);

  // Validate context (recommended)
  // if (!validateSceneContext(context, name)) {
  //   return;
  // }

  // Extract parameters from MQTT payload with defaults
  const { device, setState, payload } = context;
  const config = {
    ...DEFAULTS,
    ...payload, // Override defaults with MQTT parameters
  };

  // Store configuration in scene state
  setState('config', config);
  setState('initialized', true);

  // One-time setup code here
  logger.info(`[TEMPLATE] Configuration:`, config);

  // Validate device object (example validation)
  if (!device || typeof device !== 'object') {
    logger.error(`[TEMPLATE] Invalid device object in context`);
    return;
  }
}

/**
 * Render the scene
 * @param {Object} context - Scene context
 * @param {Object} context.device - Device adapter for drawing
 * @param {Map} context.state - Scene state storage
 * @param {Function} context.getState - State getter function
 * @param {Function} context.setState - State setter function
 * @param {Object} context.payload - MQTT payload data
 * @param {Object} context.env - Environment information
 * @param {boolean} context.loopDriven - Whether called by central loop
 * @param {Function} context.publishOk - Function to publish success metrics
 * @returns {Promise<number|null>} Next delay in milliseconds or null to signal completion
 */
async function render(context) {
  // Validate context (recommended for robustness)
  // if (!validateSceneContext(context, name)) {
  //   return null;
  // }

  const { device, getState, setState, payload, loopDriven, publishOk } =
    context;

  try {
    // Get current state
    const config = getState('config') || { ...DEFAULTS };
    const frameCount = (getState('frameCount') || 0) + 1;

    // Update frame count
    setState('frameCount', frameCount);

    // Example: Get parameters from payload (override state config)
    const updatedConfig = {
      ...config,
      ...payload, // MQTT parameters take precedence
    };

    // Log loop-driven status for debugging
    if (loopDriven) {
      logger.debug(`[TEMPLATE] Render called by central loop`);
    }

    // Example: Animation logic
    if (updatedConfig.animate) {
      // Animated scene - return delay for next frame
      const delay = updatedConfig.animationSpeed || DEFAULTS.ANIMATION_SPEED;

      // Draw animated content here
      await drawAnimatedFrame(device, frameCount, updatedConfig);

      // Push frame to device
      await device.push(name, publishOk);

      logger.debug(`🎬 [TEMPLATE] Frame ${frameCount} rendered`);

      // Return delay for next frame
      return delay;
    } else {
      // Static scene - draw once and signal completion
      await drawStaticFrame(device, updatedConfig);

      // Push frame to device
      await device.push(name, publishOk);

      logger.debug(`🖼️ [TEMPLATE] Static frame rendered`);

      // Signal completion by returning null
      return null;
    }
  } catch (error) {
    logger.error(`❌ [TEMPLATE] Render error:`, {
      error: error.message,
      scene: name,
    });
    return null; // Stop on error
  }
}

/**
 * Draw static frame content
 * @param {Object} device - Device adapter
 * @param {Object} config - Scene configuration
 * @returns {Promise<void>}
 */
async function drawStaticFrame(device, config) {
  // Use config for static content customization
  logger.debug(`[TEMPLATE] Drawing static frame with config:`, config);
  // Clear screen
  await device.clear();

  // Draw static content here
  await device.drawTextRgbaAligned(
    'TEMPLATE SCENE',
    [32, 20],
    COLORS.PRIMARY,
    'center',
  );

  await device.drawTextRgbaAligned(
    'Static Mode',
    [32, 35],
    COLORS.SECONDARY,
    'center',
  );
}

/**
 * Draw animated frame content
 * @param {Object} device - Device adapter
 * @param {number} frameCount - Current frame number
 * @param {Object} config - Scene configuration
 * @returns {Promise<void>}
 */
async function drawAnimatedFrame(device, frameCount, config) {
  // Use config for animation customization
  logger.debug(
    `[TEMPLATE] Drawing animated frame ${frameCount} with config:`,
    config,
  );
  // Clear screen
  await device.clear();

  // Calculate animation values
  const phase = (frameCount * 10) % 360; // Example: rotating phase
  const x = 32 + Math.cos((phase * Math.PI) / 180) * 20;
  const y = 32 + Math.sin((phase * Math.PI) / 180) * 20;

  // Draw animated content
  await device.fillRectangleRgba([0, 0], [64, 64], COLORS.BACKGROUND);

  await device.drawTextRgbaAligned(
    'TEMPLATE SCENE',
    [32, 20],
    COLORS.PRIMARY,
    'center',
  );

  await device.drawTextRgbaAligned(
    `Frame: ${frameCount}`,
    [32, 35],
    COLORS.ACCENT,
    'center',
  );

  // Animated element
  await device.fillRectangleRgba(
    [Math.floor(x - 2), Math.floor(y - 2)],
    [4, 4],
    COLORS.SECONDARY,
  );
}

/**
 * Cleanup the scene
 * @param {Object} context - Scene context
 * @param {Function} context.getState - State getter function
 * @param {Function} context.setState - State setter function
 * @returns {Promise<void>}
 */
async function cleanup(context) {
  const { getState, setState } = context;

  try {
    // Clean up any resources
    const frameCount = getState('frameCount') || 0;

    // Clear state
    setState('frameCount', 0);
    setState('initialized', false);
    setState('config', null);

    logger.info(`[TEMPLATE] Scene cleaned up (rendered ${frameCount} frames)`);
  } catch (error) {
    logger.warn(`⚠️ [TEMPLATE] Cleanup error:`, {
      error: error.message,
    });
  }
}

/**
 * Whether this scene wants to be driven by the central scheduler loop
 * - true: Animated scenes that need regular updates
 * - false: Static scenes that render once and complete
 */
const wantsLoop = true; // Change to false for static scenes

/**
 * Export the scene interface
 * This object must be exported and contain all required properties
 */
module.exports = {
  name,
  init,
  render,
  cleanup,
  wantsLoop,
};
