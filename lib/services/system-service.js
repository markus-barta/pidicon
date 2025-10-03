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
   */
  constructor({ logger, versionInfo, deploymentTracker }) {
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
    this.startTime = Date.now();
  }

  /**
   * Get system status
   * @returns {Promise<Object>} System status information
   */
  async getStatus() {
    try {
      const uptime = Date.now() - this.startTime;
      const memoryUsage = process.memoryUsage();

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
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        status: 'running',
      };
    } catch (error) {
      this.logger.error('Failed to get system status:', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Restart the daemon by spawning a new process and exiting current one
   * @returns {Promise<Object>} Result with success status
   */
  async restartDaemon() {
    try {
      this.logger.warn('Daemon restart requested - spawning new process');

      setTimeout(() => {
        try {
          const { spawn } = require('child_process');
          const path = require('path');

          // Get the main daemon entry point
          const daemonPath = path.resolve(__dirname, '../../daemon.js');

          this.logger.ok('Spawning new daemon process...');

          // Spawn new daemon process with same environment
          const newProcess = spawn(process.execPath, [daemonPath], {
            detached: true, // Detach from parent
            stdio: 'inherit', // Inherit stdin/stdout/stderr
            env: process.env, // Pass environment variables
            cwd: process.cwd(), // Same working directory
          });

          // Unref so parent can exit independently
          newProcess.unref();

          this.logger.ok(
            `New daemon spawned (PID: ${newProcess.pid}), exiting current process...`,
          );

          // Exit current process after brief delay
          setTimeout(() => {
            process.exit(0);
          }, 500);
        } catch (spawnError) {
          this.logger.error(
            'Failed to spawn new process, falling back to exit:',
            {
              error: spawnError.message,
            },
          );
          // Fallback: just exit and hope Docker/systemd restarts us
          process.exit(1);
        }
      }, 1000);

      return {
        success: true,
        message: 'Daemon restarting - spawning new process in 1 second...',
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
        'For now, check Docker logs: docker logs pixoo-daemon',
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
