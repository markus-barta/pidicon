/**
 * @fileoverview Release Checker - Checks for new versions via GitHub Pages
 * @description Queries version.json from GitHub Pages CDN (no rate limits)
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

/**
 * ReleaseChecker - Checks if newer version is available on GitHub Pages
 *
 * Uses GitHub Pages CDN to avoid rate limits. Caches results for 1 hour.
 * Falls back gracefully if GitHub is unreachable.
 *
 * @class
 */
class ReleaseChecker {
  /**
   * @param {Object} deploymentTracker - DeploymentTracker instance
   * @param {Object} logger - Logger instance
   */
  constructor(deploymentTracker, logger) {
    this.deploymentTracker = deploymentTracker;
    this.logger = logger;
    this.cache = null;
    this.lastCheck = null;
    this.CACHE_DURATION = 60 * 60 * 1000; // 1 hour
    this.VERSION_URL = 'https://markus-barta.github.io/pidicon/version.json';
  }

  /**
   * Check for updates (uses cache if valid)
   *
   * @async
   * @returns {Promise<Object>} Update info with updateAvailable flag
   */
  async checkForUpdate() {
    // Return cached result if still valid
    if (
      this.cache &&
      this.lastCheck &&
      Date.now() - this.lastCheck < this.CACHE_DURATION
    ) {
      this.logger.debug('Using cached update check result', {
        age: Math.round((Date.now() - this.lastCheck) / 1000) + 's',
      });
      return this.cache;
    }

    try {
      this.logger.debug('Checking for updates from GitHub Pages');

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.VERSION_URL, {
        headers: {
          'User-Agent': 'PIDICON-Update-Check',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const latestVersion = await response.json();
      const currentBuild = parseInt(this.deploymentTracker.buildNumber) || 0;
      const latestBuild = parseInt(latestVersion.buildNumber) || 0;

      this.cache = {
        updateAvailable: latestBuild > currentBuild,
        current: {
          buildNumber: currentBuild,
          version: this.deploymentTracker.deploymentId,
          gitCommit: this.deploymentTracker.gitCommit,
        },
        latest: {
          buildNumber: latestBuild,
          version: latestVersion.version,
          gitCommit: latestVersion.gitCommit,
          releaseDate: latestVersion.buildTime,
        },
        checkedAt: new Date().toISOString(),
      };

      this.lastCheck = Date.now();

      if (this.cache.updateAvailable) {
        this.logger.info('New version available', {
          current: currentBuild,
          latest: latestBuild,
        });
      } else {
        this.logger.debug('No updates available', {
          currentBuild,
        });
      }

      return this.cache;
    } catch (error) {
      this.logger.warn('Could not check for updates', {
        error: error.message,
        url: this.VERSION_URL,
      });

      // Return cached data if available
      if (this.cache) {
        this.logger.debug('Returning cached update info after error');
        return {
          ...this.cache,
          error: 'Could not reach update server, showing cached data',
        };
      }

      // Fallback: No update info available
      return {
        updateAvailable: false,
        error: 'Could not reach update server',
        current: {
          buildNumber: parseInt(this.deploymentTracker.buildNumber) || 0,
          version: this.deploymentTracker.deploymentId,
          gitCommit: this.deploymentTracker.gitCommit,
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Force check for updates (ignores cache)
   *
   * @async
   * @returns {Promise<Object>} Update info with updateAvailable flag
   */
  async forceCheck() {
    this.logger.debug('Forcing update check (clearing cache)');
    this.cache = null;
    this.lastCheck = null;
    return this.checkForUpdate();
  }
}

module.exports = ReleaseChecker;
