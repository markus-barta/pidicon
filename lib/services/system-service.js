/**
 * @fileoverview SystemService - Business logic for system operations
 * @description Centralizes daemon-level operations like status, restart, and logs.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const { ValidationError } = require('../errors');

/**
 * Service for system-level operations
 * Provides high-level API for daemon management
 */
class SystemService {
  /**
   * Create a SystemService
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.versionInfo - Version information
   * @param {Object} dependencies.deploymentTracker - Deployment tracker instance
   * @param {Object} [dependencies.mqttConfig] - MQTT configuration
   */
  constructor({ logger, versionInfo, deploymentTracker, mqttConfig }) {
    if (!logger) {
      throw new ValidationError('logger is required');
    }
    if (!versionInfo) {
      throw new ValidationError('versionInfo is required');
    }
    if (!deploymentTracker) {
      throw new ValidationError('deploymentTracker is required');
    }

    this.logger = logger;
    this.versionInfo = versionInfo;
    this.deploymentTracker = deploymentTracker;
    this.mqttConfig = mqttConfig || {};
    this.startTime = Date.now();
  }

  /**
   * Get system status
   * @returns {Promise<Object>} System status information
   */
  async getStatus() {
    try {
      const os = require('os');
      const uptime = Date.now() - this.startTime;
      const memoryUsage = process.memoryUsage();

      // Extract MQTT broker host from brokerUrl (e.g., "mqtt://miniserver24:1883" -> "miniserver24")
      let mqttBroker = 'localhost';
      if (this.mqttConfig.brokerUrl) {
        try {
          const { URL } = require('url');
          const url = new URL(this.mqttConfig.brokerUrl);
          mqttBroker = url.hostname;
        } catch {
          // If URL parsing fails, try to extract host from string
          const match = this.mqttConfig.brokerUrl.match(/\/\/([^:/]+)/);
          if (match) mqttBroker = match[1];
        }
      }

      return {
        version: this.versionInfo.version,
        buildNumber: this.versionInfo.buildNumber,
        gitCommit: this.versionInfo.gitCommit,
        gitTag: this.versionInfo.gitTag,
        environment: this.versionInfo.environment || 'unknown',
        uptime: Math.floor(uptime / 1000), // seconds
        uptimeFormatted: this._formatUptime(uptime),
        memory: {
          heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
          rss: Math.floor(memoryUsage.rss / 1024 / 1024), // MB
        },
        nodeVersion: process.version,
        hostname: os.hostname(),
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        status: 'running',
        startTime: this.startTime, // Add explicit startTime for uptime calculation
        mqttBroker, // MQTT broker hostname
      };
    } catch (error) {
      this.logger.error('Failed to get system status:', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Restart the daemon using wrapper script or exit code signal
   * @returns {Promise<Object>} Result with success status
   */
  async restartDaemon() {
    try {
      this.logger.warn('Daemon restart requested');

      setTimeout(() => {
        this.logger.ok('Signaling restart to wrapper script...');

        // Signal restart via marker file (for wrapper script)
        try {
          const fs = require('fs');
          fs.writeFileSync(
            '/tmp/pixoo-restart-requested',
            Date.now().toString(),
          );
          this.logger.ok('Restart marker created');
        } catch (err) {
          this.logger.warn('Could not create restart marker:', {
            error: err.message,
          });
        }

        // Exit with special code 42 to signal restart
        setTimeout(() => {
          this.logger.ok('Exiting with restart code (42)...');
          process.exit(42);
        }, 500);
      }, 1000);

      return {
        success: true,
        message: 'Daemon restarting in 1 second...',
      };
    } catch (error) {
      this.logger.error('Failed to restart daemon:', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get daemon logs (last N lines)
   * @param {number} lines - Number of lines to return (default: 50)
   * @returns {Promise<Array<string>>} Log lines
   */
  async getLogs(lines = 50) {
    try {
      // Note: This is a placeholder. In production, you'd read from a log file
      // or use a proper logging system with queryable logs.
      this.logger.info(`Fetching last ${lines} log lines`);

      return [
        'Log retrieval not yet implemented',
        'To implement: Read from log file or use logging service',
        'For now, check Docker logs: docker logs pidicon',
      ];
    } catch (error) {
      this.logger.error('Failed to get logs:', { error: error.message });
      throw error;
    }
  }

  /**
   * Format uptime in human-readable format
   * @param {number} ms - Uptime in milliseconds
   * @returns {string} Formatted uptime (e.g., "2h 15m 30s")
   * @private
   */
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = SystemService;
