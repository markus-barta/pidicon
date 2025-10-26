/**
 * @fileoverview Scheduler Service - Time-based scene activation/deactivation
 * @description Automatically activates and deactivates scenes based on schedule configuration
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

const { isWithinSchedule } = require('../universal-scene-config');

/**
 * SchedulerService - Manages time-based scene scheduling
 * Checks scene schedules periodically and activates/deactivates scenes accordingly
 */
class SchedulerService {
  /**
   * Create a SchedulerService
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.sceneService - Scene service for switching scenes
   * @param {Object} dependencies.deviceConfigStore - Device config store for accessing scene defaults
   */
  constructor({ logger, sceneService, deviceConfigStore }) {
    if (!logger) {
      throw new Error('logger is required');
    }
    if (!sceneService) {
      throw new Error('sceneService is required');
    }
    if (!deviceConfigStore) {
      throw new Error('deviceConfigStore is required');
    }

    this.logger = logger;
    this.sceneService = sceneService;
    this.deviceConfigStore = deviceConfigStore;
    this.checkInterval = null;
    this.running = false;
  }

  /**
   * Start the scheduler (checks every minute)
   */
  start() {
    if (this.running) {
      this.logger.warn('Scheduler already running');
      return;
    }

    this.running = true;
    this.logger.info('Starting scene scheduler service');

    // Run initial check
    this.checkSchedules().catch((error) => {
      this.logger.error('Initial schedule check failed:', error.message);
    });

    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkSchedules().catch((error) => {
        this.logger.error('Schedule check failed:', error.message);
      });
    }, 60000); // 60 seconds

    this.logger.ok('Scene scheduler service started (checks every 60 seconds)');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.running) {
      this.logger.warn('Scheduler not running');
      return;
    }

    this.running = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.logger.info('Scene scheduler service stopped');
  }

  /**
   * Check all device schedules and activate/deactivate scenes accordingly
   */
  async checkSchedules() {
    try {
      const devices = this.deviceConfigStore.getAllDevices();
      const now = new Date();

      this.logger.debug(
        `Checking schedules for ${devices.length} devices at ${now.toISOString()}`
      );

      for (const device of devices) {
        await this.checkDeviceSchedules(device, now);
      }
    } catch (error) {
      this.logger.error('Error checking schedules:', error.message);
      throw error;
    }
  }

  /**
   * Check schedules for a specific device
   * @param {Object} device - Device configuration
   * @param {Date} now - Current time
   */
  async checkDeviceSchedules(device, now) {
    try {
      // Get all scene defaults for this device
      const sceneDefaults = device.sceneDefaults || {};

      for (const [sceneName, config] of Object.entries(sceneDefaults)) {
        // Skip if scheduling not enabled
        if (!config.scheduleEnabled) {
          continue;
        }

        // Check if schedule parameters are valid
        if (!config.scheduleStartTime || !config.scheduleEndTime) {
          this.logger.warn(
            `Scene ${sceneName} has scheduleEnabled but missing start/end times`,
            {
              device: device.ip,
            }
          );
          continue;
        }

        // Check if scene should be active now
        const schedule = {
          startTime: config.scheduleStartTime,
          endTime: config.scheduleEndTime,
          weekdays: config.scheduleWeekdays || [0, 1, 2, 3, 4, 5, 6],
        };

        const shouldBeActive = isWithinSchedule(schedule, now);

        // Get current scene for this device
        const currentSceneState = await this.sceneService.getCurrentScene(
          device.ip
        );
        const currentScene = currentSceneState?.currentScene || null;

        // If scene should be active but isn't, activate it
        if (shouldBeActive && currentScene !== sceneName) {
          this.logger.info(
            `Activating scheduled scene: ${sceneName} on ${device.ip}`,
            {
              schedule,
            }
          );

          try {
            await this.sceneService.switchToScene(device.ip, sceneName, {
              clear: true,
              payload: config, // Use device-specific defaults
            });

            this.logger.ok(
              `Successfully activated scheduled scene: ${sceneName} on ${device.ip}`
            );
          } catch (error) {
            this.logger.error(
              `Failed to activate scheduled scene: ${sceneName} on ${device.ip}`,
              {
                error: error.message,
              }
            );
          }
        }

        // If scene should not be active but is, deactivate it (stop scene)
        if (!shouldBeActive && currentScene === sceneName) {
          this.logger.info(
            `Deactivating scene outside schedule: ${sceneName} on ${device.ip}`,
            {
              schedule,
            }
          );

          try {
            // Note: We stop the scene but don't switch to another scene
            // The device will keep showing the last frame
            // If a default/fallback scene is desired, that should be configured separately
            await this.sceneService.stopScene(device.ip);

            this.logger.ok(
              `Successfully deactivated scheduled scene: ${sceneName} on ${device.ip}`
            );
          } catch (error) {
            this.logger.error(
              `Failed to deactivate scheduled scene: ${sceneName} on ${device.ip}`,
              {
                error: error.message,
              }
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking schedules for device ${device.ip}:`,
        error.message
      );
      // Continue with other devices even if this one fails
    }
  }

  /**
   * Check if scheduler is running
   * @returns {boolean} True if running
   */
  isRunning() {
    return this.running;
  }
}

module.exports = SchedulerService;
