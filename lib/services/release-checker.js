/**
 * @fileoverview Release Checker - Checks for new versions via GitHub Pages
 * @description Queries version.json from GitHub Pages CDN (no rate limits, no caching)
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

/**
 * ReleaseChecker - Checks if newer version is available on GitHub Pages
 *
 * Uses GitHub Pages CDN (no rate limits). Always fetches fresh data.
 * Falls back gracefully if GitHub is unreachable.
 *
 * Note: Caching was removed to ensure immediate visibility of new deployments.
 * TODO: Consider re-implementing smart caching if needed (see BACKLOG.md)
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
    this.VERSION_URL = 'https://markus-barta.github.io/pidicon/version.json';
  }

  /**
   * Check for updates (no caching - always fresh)
   *
   * @async
   * @returns {Promise<Object>} Update info with updateAvailable flag
   */
  async checkForUpdate() {
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

      const result = {
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

      if (result.updateAvailable) {
        this.logger.info('New version available', {
          current: currentBuild,
          latest: latestBuild,
        });
      } else {
        this.logger.debug('No updates available', {
          currentBuild,
        });
      }

      return result;
    } catch (error) {
      this.logger.warn('Could not check for updates', {
        error: error.message,
        url: this.VERSION_URL,
      });

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
}

module.exports = ReleaseChecker;
