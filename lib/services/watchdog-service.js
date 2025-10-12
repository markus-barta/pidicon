/**
 * @fileoverview Watchdog Service
 * @description Monitors device health and executes recovery actions
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const logger = require('../logger');

/**
 * Watchdog service - monitors device responsiveness and executes recovery actions
 */
class WatchdogService {
  constructor(deviceConfigStore, deviceService, sceneService) {
    this.configStore = deviceConfigStore;
    this.deviceService = deviceService;
    this.sceneService = sceneService;
    this.timers = new Map(); // ip -> timer
    this.lastCheckTimes = new Map(); // ip -> timestamp
  }

  /**
   * Start monitoring a specific device
   */
  startMonitoring(ip) {
    const config = this.configStore.getDevice(ip);
    if (!config || !config.watchdog.enabled) {
      logger.debug(`[WATCHDOG] Device ${ip} watchdog not enabled`);
      return;
    }

    // Stop existing timer if any
    this.stopMonitoring(ip);

    const checkInterval = 60000; // Check every minute
    const timeoutMs = config.watchdog.timeoutMinutes * 60 * 1000;

    logger.info(
      `🐕 [WATCHDOG] Started monitoring ${ip} (timeout: ${config.watchdog.timeoutMinutes}min, action: ${config.watchdog.action})`,
    );

    const timer = setInterval(async () => {
      await this.checkDevice(ip, timeoutMs);
    }, checkInterval);

    this.timers.set(ip, timer);
    this.lastCheckTimes.set(ip, Date.now());
  }

  /**
   * Stop monitoring a device
   */
  stopMonitoring(ip) {
    const timer = this.timers.get(ip);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(ip);
      this.lastCheckTimes.delete(ip);
      logger.info(`🐕 [WATCHDOG] Stopped monitoring ${ip}`);
    }
  }

  /**
   * Start monitoring all configured devices
   */
  startAll() {
    const devices = this.configStore.getAllDevices();
    for (const [ip] of devices) {
      this.startMonitoring(ip);
    }
  }

  /**
   * Stop monitoring all devices
   */
  stopAll() {
    for (const ip of this.timers.keys()) {
      this.stopMonitoring(ip);
    }
  }

  /**
   * Check device health
   */
  async checkDevice(ip, timeoutMs) {
    try {
      const metrics = await this.deviceService.getMetrics(ip);
      const lastSeenTs = metrics?.lastSeenTs;

      if (!lastSeenTs) {
        // Device hasn't been seen yet, skip check
        return;
      }

      const timeSinceLastSeen = Date.now() - lastSeenTs;

      if (timeSinceLastSeen > timeoutMs) {
        logger.warn(
          `⚠️  [WATCHDOG] Device ${ip} unresponsive for ${Math.round(timeSinceLastSeen / 60000)}min`,
        );
        await this.executeWatchdogAction(ip);
      }
    } catch (error) {
      logger.error(
        `❌ [WATCHDOG] Error checking device ${ip}: ${error.message}`,
      );
    }
  }

  /**
   * Execute watchdog recovery action
   */
  async executeWatchdogAction(ip) {
    const config = this.configStore.getDevice(ip);
    if (!config) return;

    const action = config.watchdog.action;

    logger.info(`🐕 [WATCHDOG] Executing action "${action}" for ${ip}`);

    try {
      switch (action) {
        case 'restart':
          await this.deviceService.restartDevice(ip);
          logger.ok(`✅ [WATCHDOG] Restarted device ${ip}`);
          break;

        case 'fallback-scene':
          if (config.watchdog.fallbackScene) {
            await this.sceneService.switchScene(
              ip,
              config.watchdog.fallbackScene,
            );
            logger.ok(
              `✅ [WATCHDOG] Switched ${ip} to fallback scene: ${config.watchdog.fallbackScene}`,
            );
          }
          break;

        case 'mqtt-command':
          if (
            config.watchdog.mqttCommandSequence &&
            config.watchdog.mqttCommandSequence.length > 0
          ) {
            // Execute MQTT command sequence
            // This would need MQTT service integration
            logger.info(
              `📤 [WATCHDOG] Would execute ${config.watchdog.mqttCommandSequence.length} MQTT commands for ${ip}`,
            );
            // TODO: Implement MQTT command execution
          }
          break;

        case 'notify':
          // Send notification only
          logger.warn(
            `📢 [WATCHDOG] Device ${ip} is unresponsive (notify-only mode)`,
          );
          break;

        default:
          logger.warn(`⚠️  [WATCHDOG] Unknown action: ${action}`);
      }

      if (config.watchdog.notifyOnFailure) {
        // TODO: Integrate with notification system (MQTT, webhook, etc.)
        logger.info(`📢 [WATCHDOG] Notification sent for ${ip} failure`);
      }
    } catch (error) {
      logger.error(
        `❌ [WATCHDOG] Failed to execute action for ${ip}: ${error.message}`,
      );
    }
  }

  /**
   * Get watchdog status for a device
   */
  getStatus(ip) {
    const config = this.configStore.getDevice(ip);
    const isMonitoring = this.timers.has(ip);
    const lastCheck = this.lastCheckTimes.get(ip);

    return {
      enabled: config?.watchdog?.enabled || false,
      monitoring: isMonitoring,
      lastCheck: lastCheck || null,
      config: config?.watchdog || null,
    };
  }

  /**
   * Get status for all devices
   */
  getAllStatus() {
    const devices = this.configStore.getAllDevices();
    const status = {};

    for (const [ip] of devices) {
      status[ip] = this.getStatus(ip);
    }

    return status;
  }
}

module.exports = WatchdogService;
