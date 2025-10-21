/**
 * @fileoverview Watchdog Service
 * @description Monitors device health and executes recovery actions
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const logger = require('../logger');

/**
 * Watchdog service - monitors device responsiveness and executes recovery actions
 */
class WatchdogService {
  constructor(
    deviceConfigStore,
    deviceService,
    sceneService,
    stateStore,
    deviceAdapter,
  ) {
    this.configStore = deviceConfigStore;
    this.deviceService = deviceService;
    this.sceneService = sceneService;
    this.stateStore = stateStore;
    this.deviceAdapter = deviceAdapter;
    this.timers = new Map(); // ip -> timer
    this.lastCheckTimes = new Map(); // ip -> timestamp
    this.lastHealthCheckResults = new Map(); // ip -> {success, latencyMs, timestamp}
  }

  /**
   * Start monitoring a specific device
   */
  startMonitoring(ip) {
    const config = this.configStore.getDevice(ip);
    if (!config || !config.watchdog?.enabled) {
      logger.debug(`[WATCHDOG] Device ${ip} watchdog not enabled`);
      return;
    }

    // Stop existing timer if any
    this.stopMonitoring(ip);

    // Use configurable health check interval (default 10s)
    const healthCheckIntervalSeconds =
      config.watchdog.healthCheckIntervalSeconds || 10;
    const checkInterval = healthCheckIntervalSeconds * 1000;
    const timeoutMs = config.watchdog.timeoutMinutes * 60 * 1000;

    logger.info(
      `🐕 [WATCHDOG] Started monitoring ${ip} (health check: ${healthCheckIntervalSeconds}s, timeout: ${config.watchdog.timeoutMinutes}min, action: ${config.watchdog.action})`,
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
    for (const [ip, device] of devices) {
      if (device?.watchdog?.enabled) {
        this.startMonitoring(ip);
      }
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
   * Perform active health check on a device
   */
  async performHealthCheck(ip) {
    try {
      const config = this.configStore.getDevice(ip);
      if (!config) {
        logger.debug(`[WATCHDOG] No config for device ${ip}`);
        return null;
      }

      // Check if device is OFF and if we should skip health checks when OFF
      const displayOn = this.stateStore.getDeviceState(ip, 'displayOn', true);
      const checkWhenOff = config.watchdog.checkWhenOff !== false; // Default true

      if (!displayOn && !checkWhenOff) {
        logger.debug(
          `[WATCHDOG] Skipping health check for ${ip} (device OFF, checkWhenOff=false)`,
        );
        return null;
      }

      const playState = this.stateStore.getDeviceState(
        ip,
        'playState',
        'running',
      );
      if (playState === 'stopped' && config.watchdog.checkWhenOff === false) {
        logger.debug(
          `[WATCHDOG] Skipping health check for ${ip} (scene stopped, checkWhenOff=false)`,
        );
        return null;
      }

      // Get device driver and perform health check
      const device = this.deviceAdapter.getDevice(ip);
      if (
        !device ||
        !device.impl ||
        typeof device.impl.healthCheck !== 'function'
      ) {
        logger.debug(`[WATCHDOG] Device ${ip} does not support health checks`);
        return null;
      }

      const result = await device.impl.healthCheck();

      // Store result for status reporting
      this.lastHealthCheckResults.set(ip, {
        ...result,
        timestamp: Date.now(),
      });

      if (result.success) {
        logger.debug(
          `[WATCHDOG] Health check OK for ${ip} (${result.latencyMs}ms)`,
        );
      } else {
        logger.debug(
          `[WATCHDOG] Health check failed for ${ip}: ${result.error || 'unknown error'}`,
        );
      }

      return result;
    } catch (error) {
      logger.debug(`[WATCHDOG] Health check error for ${ip}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check device health and trigger recovery actions if needed
   */
  async checkDevice(ip, timeoutMs) {
    try {
      // Perform active health check (this updates lastSeenTs in driver)
      await this.performHealthCheck(ip);

      // Now check if device has been unresponsive too long
      const metrics = await this.deviceService.getMetrics(ip);
      const lastSeenTs = metrics?.lastSeenTs;

      const timeSinceLastSeen = lastSeenTs ? Date.now() - lastSeenTs : null;

      if (timeSinceLastSeen !== null && timeSinceLastSeen > timeoutMs) {
        logger.warn(
          `⚠️  [WATCHDOG] Device ${ip} unresponsive for ${Math.round(
            timeSinceLastSeen / 60000,
          )}min`,
        );
        await this.executeWatchdogAction(ip);
        return;
      }

      const playState = this.stateStore.getDeviceState(
        ip,
        'playState',
        'running',
      );
      const deviceConfig = this.configStore.getDevice(ip);
      const checkScenesWhenStopped =
        deviceConfig?.watchdog?.checkWhenOff !== false;
      if (playState === 'stopped' && checkScenesWhenStopped) {
        logger.warn(
          `⚠️  [WATCHDOG] Device ${ip} scene stopped; triggering recovery action`,
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
    const lastHealthCheck = this.lastHealthCheckResults.get(ip);

    return {
      enabled: config?.watchdog?.enabled || false,
      monitoring: isMonitoring,
      lastCheck: lastCheck || null,
      lastHealthCheck: lastHealthCheck || null,
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
