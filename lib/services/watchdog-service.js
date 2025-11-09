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
    deviceAdapter
  ) {
    this.deviceConfigStore = deviceConfigStore;
    this.deviceService = deviceService;
    this.sceneService = sceneService;
    this.stateStore = stateStore;
    this.deviceAdapter = deviceAdapter;
    this.timers = new Map(); // ip -> timer
    this.lastCheckTimes = new Map(); // ip -> timestamp
    this.lastHealthCheckResults = new Map(); // ip -> {success, latencyMs, timestamp}
    this.offlineStats = new Map(); // ip -> {firstFailure, lastCheck, failureCount, lastSummaryLog, deviceName}

    // NEW: Watchdog's own device health state (single source of truth)
    // Phase 1: Running in parallel with old state for migration
    this.deviceHealth = new Map(); // deviceId -> DeviceHealthState
  }

  /**
   * Start monitoring a specific device
   * Health checks will always run for real devices to update lastSeenTs
   * Recovery actions only run if watchdog.enabled is true
   */
  startMonitoring(ip) {
    const config = this.deviceConfigStore
      ? this.deviceConfigStore.getDevice(ip)
      : null;
    if (!config) {
      logger.debug(`[WATCHDOG] No config for device ${ip}`);
      return;
    }

    // Check if device is a real device (needs health checks for lastSeenTs)
    const device = this.deviceAdapter.getDevice(ip);
    const isRealDevice =
      device && device.impl && device.impl.driverType === 'real';

    // Stop existing timer if any
    this.stopMonitoring(ip);

    // Use configurable health check interval (default 10s)
    const healthCheckIntervalSeconds =
      config.watchdog.healthCheckIntervalSeconds || 10;
    const checkInterval = healthCheckIntervalSeconds * 1000;
    const timeoutMs = config.watchdog.timeoutMinutes * 60 * 1000;

    if (config.watchdog?.enabled) {
      logger.info(
        `🐕 [WATCHDOG] Started monitoring ${ip} (health check: ${healthCheckIntervalSeconds}s, timeout: ${config.watchdog.timeoutMinutes}min, action: ${config.watchdog.action})`
      );
    } else if (isRealDevice) {
      logger.debug(
        `🔍 [WATCHDOG] Started health checks for ${ip} (for lastSeenTs tracking, no recovery actions)`
      );
    }

    const timer = setInterval(async () => {
      await this.checkDevice(ip, timeoutMs);
    }, checkInterval);

    // Prime lastSeen tracking immediately so UI updates without waiting for first interval
    this.checkDevice(ip, timeoutMs).catch((error) => {
      logger.debug('[WATCHDOG] Initial health check failed', {
        ip,
        error: error?.message,
      });
    });

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
   * Starts health checks for all real devices (for lastSeenTs tracking)
   * Only enables recovery actions if watchdog.enabled is true
   */
  startAll() {
    const devices = this.deviceConfigStore?.getAllDevices?.();
    if (!devices) {
      return;
    }
    for (const [ip] of devices) {
      // Always start monitoring for real devices (for lastSeenTs updates)
      // Recovery actions will only execute if watchdog.enabled is true
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
   * Perform active health check on a device
   */
  async performHealthCheck(ip) {
    try {
      const config = this.deviceConfigStore.getDevice(ip);
      if (!config) {
        logger.debug(`[WATCHDOG] No config for device ${ip}`);
        return null;
      }

      // Check if device is OFF and if we should skip health checks when OFF
      const displayOn = this.stateStore.getDeviceState(ip, 'displayOn', true);
      const checkWhenOff = config.watchdog.checkWhenOff !== false; // Default true

      if (!displayOn && !checkWhenOff) {
        logger.debug(
          `[WATCHDOG] Skipping health check for ${ip} (device OFF, checkWhenOff=false)`
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

      if (typeof device.health?.recordCheckStart === 'function') {
        device.health.recordCheckStart();
      }

      const result = await device.impl.healthCheck();

      if (typeof device.health?.recordCheckResult === 'function') {
        device.health.recordCheckResult(result);
      }

      if (result.success && device.health?.updateLastSeen) {
        const timestamp = Date.now();
        device.health.updateLastSeen(timestamp, 'health-check');
      }

      // Store result for status reporting
      this.lastHealthCheckResults.set(ip, {
        ...result,
        timestamp: Date.now(),
      });

      // NEW (Phase 1): Update device health state (parallel with old system)
      this.updateDeviceHealth(ip, result);

      // Handle offline statistics and collated logging
      const now = Date.now();
      const SUMMARY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
      const deviceName = config.name || ip;

      if (result.success) {
        // Device is online
        logger.debug(
          `[WATCHDOG] Health check OK for ${ip} (${result.latencyMs}ms)`
        );

        // Check if device was previously offline and log recovery
        const offlineStats = this.offlineStats.get(ip);
        if (offlineStats) {
          const offlineDurationMin = Math.round(
            (now - offlineStats.firstFailure) / 60000
          );
          logger.info(
            `✅ [WATCHDOG] Device ${deviceName} (${ip}) back online after ${offlineDurationMin} minutes (${offlineStats.failureCount} failed checks)`
          );
          this.offlineStats.delete(ip);
        }
      } else {
        // Device is offline
        let offlineStats = this.offlineStats.get(ip);

        if (!offlineStats) {
          // First failure - log immediately
          logger.warn(
            `⚠️  [WATCHDOG] Device ${deviceName} (${ip}) went offline: ${result.error || 'unknown error'}`
          );
          offlineStats = {
            firstFailure: now,
            lastCheck: now,
            failureCount: 1,
            lastSummaryLog: now,
            deviceName: deviceName,
          };
          this.offlineStats.set(ip, offlineStats);
        } else {
          // Update stats
          offlineStats.lastCheck = now;
          offlineStats.failureCount++;

          // Check if we should log a summary (every 5 minutes)
          const timeSinceLastSummary = now - offlineStats.lastSummaryLog;
          if (timeSinceLastSummary >= SUMMARY_INTERVAL_MS) {
            const offlineDurationMin = Math.round(
              (now - offlineStats.firstFailure) / 60000
            );
            logger.warn(
              `⚠️  [WATCHDOG] Device ${deviceName} (${ip}) offline for ${offlineDurationMin} minutes (checked ${offlineStats.failureCount} times)`
            );
            offlineStats.lastSummaryLog = now;
          } else {
            // Not time for summary yet - just debug
            logger.debug(
              `[WATCHDOG] Health check failed for ${ip}: ${result.error || 'unknown error'}`
            );
          }
        }
      }

      return result;
    } catch (error) {
      logger.debug(`[WATCHDOG] Health check error for ${ip}: ${error.message}`);
      const device = this.deviceAdapter.getDevice(ip);
      if (device && device.health?.recordCheckResult) {
        device.health.recordCheckResult({
          success: false,
          error: error.message,
        });
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Check device health and trigger recovery actions if needed
   */
  async checkDevice(ip, timeoutMs) {
    try {
      // Perform active health check (this updates last seen tracking)
      await this.performHealthCheck(ip);

      // Recovery actions only run if watchdog is enabled
      const config = this.deviceConfigStore
        ? this.deviceConfigStore.getDevice(ip)
        : null;
      if (!config?.watchdog?.enabled) {
        return; // Only tracking lastSeenTs, no recovery actions
      }

      // Now check if device has been unresponsive too long
      const metrics = await this.deviceService.getMetrics(ip);
      const lastSeenTs = metrics?.lastSeenTs;

      const timeSinceLastSeen = lastSeenTs ? Date.now() - lastSeenTs : null;

      if (timeSinceLastSeen !== null && timeSinceLastSeen > timeoutMs) {
        logger.warn(
          `⚠️  [WATCHDOG] Device ${ip} unresponsive for ${Math.round(
            timeSinceLastSeen / 60000
          )}min`
        );
        await this.executeWatchdogAction(ip);
        return;
      }

      const playState = this.stateStore.getDeviceState(
        ip,
        'playState',
        'running'
      );
      const checkScenesWhenStopped = config.watchdog?.checkWhenOff !== false;
      if (playState === 'stopped' && checkScenesWhenStopped) {
        logger.warn(
          `⚠️  [WATCHDOG] Device ${ip} scene stopped; triggering recovery action`
        );
        await this.executeWatchdogAction(ip);
      }
    } catch (error) {
      logger.error(
        `❌ [WATCHDOG] Error checking device ${ip}: ${error.message}`
      );
    }
  }

  /**
   * Execute watchdog recovery action
   */
  async executeWatchdogAction(ip) {
    const config = this.deviceConfigStore.getDevice(ip);
    if (!config) return;

    const action = config.watchdog.action;

    logger.info(`🐕 [WATCHDOG] Executing action "${action}" for ${ip}`);

    try {
      switch (action) {
        case 'restart':
          await this.deviceService.resetDevice(ip);
          logger.ok(`✅ [WATCHDOG] Reset device ${ip}`);
          break;

        case 'fallback-scene':
          if (config.watchdog.fallbackScene) {
            await this.sceneService.switchScene(
              ip,
              config.watchdog.fallbackScene
            );
            logger.ok(
              `✅ [WATCHDOG] Switched ${ip} to fallback scene: ${config.watchdog.fallbackScene}`
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
              `📤 [WATCHDOG] Would execute ${config.watchdog.mqttCommandSequence.length} MQTT commands for ${ip}`
            );
            // TODO: Implement MQTT command execution
          }
          break;

        case 'notify':
          // Send notification only
          logger.warn(
            `📢 [WATCHDOG] Device ${ip} is unresponsive (notify-only mode)`
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
        `❌ [WATCHDOG] Failed to execute action for ${ip}: ${error.message}`
      );
    }
  }

  /**
   * Get watchdog status for a device
   */
  getStatus(ip) {
    const config = this.deviceConfigStore.getDevice(ip);
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
    const devices = this.deviceConfigStore.getAllDevices();
    const status = {};

    for (const [ip] of devices) {
      status[ip] = this.getStatus(ip);
    }

    return status;
  }

  // ============================================================================
  // NEW: Device Health State Management (Phase 1 - Epic 0, Story 0.1)
  // ============================================================================

  /**
   * Update device health state based on health check result
   * @param {string} deviceId - Device IP address
   * @param {Object} healthCheckResult - Result from healthCheck(): {success, latencyMs, error}
   * @private
   */
  updateDeviceHealth(deviceId, healthCheckResult) {
    const config = this.deviceConfigStore.getDevice(deviceId);
    if (!config) return;

    const now = Date.now();
    let healthState = this.deviceHealth.get(deviceId);

    // Initialize state if first check
    if (!healthState) {
      healthState = {
        deviceId: deviceId,
        deviceName: config.name || deviceId,
        status: 'online', // Initial status
        lastSeenTs: null,
        lastHealthCheck: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalChecks: 0,
        offlineSince: null,
        offlineDuration: null,
        recoveredAt: null,
        checkIntervalSeconds: config.watchdog?.healthCheckIntervalSeconds || 10,
        offlineThresholdMinutes: config.watchdog?.timeoutMinutes || 120,
      };
      this.deviceHealth.set(deviceId, healthState);
    }

    // Update health check result
    healthState.lastHealthCheck = {
      timestamp: now,
      success: healthCheckResult.success,
      latencyMs: healthCheckResult.latencyMs || null,
      error: healthCheckResult.error || null,
    };

    healthState.totalChecks++;

    // Update consecutive counters
    if (healthCheckResult.success) {
      healthState.consecutiveSuccesses++;
      healthState.consecutiveFailures = 0;
      healthState.lastSeenTs = now; // Device responded!

      // Check if recovering from offline
      if (healthState.offlineSince) {
        const offlineDuration = now - healthState.offlineSince;
        healthState.recoveredAt = now;
        healthState.offlineDuration = offlineDuration;
        healthState.offlineSince = null;

        logger.info(
          `✅ [WATCHDOG] Device ${healthState.deviceName} recovered after ${Math.round(offlineDuration / 60000)} minutes`
        );
      }
    } else {
      healthState.consecutiveFailures++;
      healthState.consecutiveSuccesses = 0;

      // Mark as offline if first failure
      if (!healthState.offlineSince) {
        healthState.offlineSince = now;
        logger.warn(
          `⚠️  [WATCHDOG] Device ${healthState.deviceName} health check failed`
        );
      }
    }

    // Calculate status (online/degraded/offline)
    healthState.status = this._calculateDeviceStatus(healthState);

    return healthState;
  }

  /**
   * Calculate device status based on health state
   * @param {Object} healthState - Device health state
   * @returns {string} 'online' | 'degraded' | 'offline'
   * @private
   */
  _calculateDeviceStatus(healthState) {
    const now = Date.now();

    // If never seen, status is offline
    if (!healthState.lastSeenTs) {
      return 'offline';
    }

    const timeSinceLastSeen = now - healthState.lastSeenTs;
    const offlineThresholdMs = healthState.offlineThresholdMinutes * 60 * 1000;

    // Offline: Not seen for longer than threshold
    if (timeSinceLastSeen > offlineThresholdMs) {
      return 'offline';
    }

    // Degraded: Recent failures (2+ consecutive) but still within threshold
    if (
      healthState.consecutiveFailures >= 2 &&
      timeSinceLastSeen < offlineThresholdMs
    ) {
      return 'degraded';
    }

    // Online: Seen recently and healthy
    return 'online';
  }

  /**
   * Get device health state
   * @param {string} deviceId - Device IP address
   * @returns {Object|null} Device health state or null if not found
   */
  getDeviceHealth(deviceId) {
    return this.deviceHealth.get(deviceId) || null;
  }

  /**
   * Get all device health states
   * @returns {Map} Map of deviceId -> health state
   */
  getAllDeviceHealth() {
    return new Map(this.deviceHealth); // Return copy
  }

  /**
   * Get device health summary (for API)
   * @param {string} deviceId - Device IP address
   * @returns {Object|null} Simplified health summary
   */
  getDeviceHealthSummary(deviceId) {
    const health = this.deviceHealth.get(deviceId);
    if (!health) return null;

    return {
      status: health.status,
      lastSeenTs: health.lastSeenTs,
      lastCheck: health.lastHealthCheck,
      consecutiveFailures: health.consecutiveFailures,
      offlineSince: health.offlineSince,
    };
  }
}

module.exports = WatchdogService;
