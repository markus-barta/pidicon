/**
 * @fileoverview Universal Scene Configuration Schema
 * @description Defines universal timing and scheduling parameters that apply to all scenes.
 * These parameters can be overridden per-device via sceneDefaults.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

/**
 * Universal configuration schema applied to all scenes
 * These parameters control timing, scheduling, and lifecycle behavior
 */
const UNIVERSAL_CONFIG_SCHEMA = {
  renderInterval: {
    type: 'number',
    default: 250,
    min: 50,
    max: 5000,
    description: 'Milliseconds between frames (render loop delay)',
  },
  adaptiveTiming: {
    type: 'boolean',
    default: true,
    description:
      'Adjust timing based on measured frame duration (wait for frame completion before next)',
  },
  sceneTimeout: {
    type: 'number',
    default: null,
    min: 1,
    max: 1440,
    description: 'Auto-stop scene after N minutes (null = infinite)',
  },
  scheduleEnabled: {
    type: 'boolean',
    default: false,
    description: 'Enable time-based scheduling for this scene',
  },
  scheduleStartTime: {
    type: 'string',
    default: null,
    description: 'Start time in HH:MM format (24-hour)',
  },
  scheduleEndTime: {
    type: 'string',
    default: null,
    description: 'End time in HH:MM format (24-hour)',
  },
  scheduleWeekdays: {
    type: 'array',
    default: [0, 1, 2, 3, 4, 5, 6],
    description: 'Active weekdays (0=Sunday, 6=Saturday)',
  },
};

/**
 * Validate a time string in HH:MM format
 * @param {string} time - Time string to validate
 * @returns {boolean} True if valid
 */
function isValidTimeFormat(time) {
  if (!time || typeof time !== 'string') return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Check if a given time falls within a schedule
 * @param {Object} schedule - Schedule configuration
 * @param {string} schedule.startTime - Start time (HH:MM)
 * @param {string} schedule.endTime - End time (HH:MM)
 * @param {Array<number>} schedule.weekdays - Active weekdays [0-6]
 * @param {Date} [now] - Current time (for testing)
 * @returns {boolean} True if current time is within schedule
 */
function isWithinSchedule(schedule, now = new Date()) {
  if (!schedule || !schedule.startTime || !schedule.endTime) {
    return false;
  }

  // Check weekday
  const currentDay = now.getDay();
  if (!schedule.weekdays || !schedule.weekdays.includes(currentDay)) {
    return false;
  }

  // Parse times
  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight schedules (end < start)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Merge universal schema with scene-specific schema
 * @param {Object} sceneSchema - Scene-specific config schema
 * @returns {Object} Merged schema (universal + scene-specific)
 */
function mergeSchemas(sceneSchema) {
  return {
    ...UNIVERSAL_CONFIG_SCHEMA,
    ...(sceneSchema || {}),
  };
}

/**
 * Get default values from schema
 * @param {Object} schema - Configuration schema
 * @returns {Object} Default values
 */
function getDefaults(schema) {
  const defaults = {};
  for (const [key, config] of Object.entries(schema)) {
    defaults[key] = config.default;
  }
  return defaults;
}

module.exports = {
  UNIVERSAL_CONFIG_SCHEMA,
  isValidTimeFormat,
  isWithinSchedule,
  mergeSchemas,
  getDefaults,
};
