/**
 * @fileoverview Deployment tracker - Runtime version and build metadata provider
 *
 * This module reads version information at runtime and provides it to scenes,
 * MQTT topics, and logs. It is part of the version management strategy:
 *
 * Version Strategy:
 * 1. Source of Truth: package.json (SemVer) + version.json (build metadata)
 * 2. Build Process: CI/CD regenerates version.json during Docker build
 * 3. Runtime: DeploymentTracker reads version.json from the Docker image
 * 4. Display: Startup scene shows build number on Pixoo device
 *
 * Build Number Lifecycle:
 * - Build number = git commit count (monotonically increasing)
 * - Local version.json updated before each commit (npm run build:version)
 * - CI/CD regenerates it during Docker build
 * - Deployed container has version.json baked in
 * - Pixoo device displays: "Build: 447" (from deployed container)
 * - Local repo might show: "Build: 448" (1 commit ahead, not yet deployed)
 *
 * Truth Sources (priority order):
 * 1. version.json (baked into Docker image) - PRIMARY
 * 2. Git commands (fallback if version.json missing)
 * 3. Environment variables (GIT_COMMIT, GIT_COMMIT_COUNT from CI/CD)
 *
 * See docs/VERSIONING.md and docs/DEPLOYMENT.md for complete documentation.
 *
 * @module lib/deployment-tracker
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logger = require('./logger');

/**
 * DeploymentTracker - Provides runtime version and build metadata
 *
 * Reads version.json (baked into Docker image during CI/CD build) and provides
 * this information to scenes, MQTT topics, and logs.
 *
 * The version.json file contains:
 * - version: SemVer from package.json (e.g., "2.0.0")
 * - buildNumber: Git commit count (e.g., 448)
 * - gitCommit: Short commit hash (e.g., "90b977b")
 * - buildTime: ISO 8601 timestamp
 *
 * @class
 */
class DeploymentTracker {
  constructor() {
    // Version info comes from version.json (baked into Docker image)
    // Falls back to Git commands if version.json not available
    // This ensures version is always accurate and traceable
    logger.info(
      `🔍 [DEPLOYMENT] Initializing version tracking from version.json`,
    );

    this.deploymentId = 'unknown';
    this.buildNumber = 'unknown';
    this.gitCommit = 'unknown';
    this.buildTime = 'unknown';
    this.daemonStart = new Date().toISOString();
  }

  /**
   * Initialize deployment tracking
   *
   * Reads version.json (primary source) and falls back to Git commands if needed.
   * The version.json file is:
   * - Baked into Docker images during CI/CD build
   * - Updated locally before commits (npm run build:version)
   * - Source of truth for deployed containers
   *
   * Priority order:
   * 1. version.json (from Docker image or local repo)
   * 2. Git commands (fallback if version.json missing)
   * 3. Environment variables (CI/CD build args)
   *
   * @async
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Try to read version.json first (primary source)
      this.versionInfo = await this.readVersionInfo();

      // Fall back to Git if version.json missing or incomplete
      this.gitInfo = this.getGitDeploymentInfo();

      // Merge with priority: version.json > git > defaults
      this.deploymentId =
        this.versionInfo.deploymentId ||
        this.gitInfo.latestTag ||
        this.deploymentId;
      this.buildNumber =
        this.versionInfo.buildNumber || this.gitInfo.commitCount || '0';
      this.gitCommit =
        this.versionInfo.gitCommit || this.gitInfo.commitHash || 'unknown';
      this.buildTime = this.versionInfo.buildTime || new Date().toISOString();

      logger.info('Version tracking initialized', {
        version: this.versionInfo.version || 'unknown',
        buildNumber: this.buildNumber,
        gitCommit: this.gitCommit,
      });
    } catch (error) {
      logger.error('Failed to initialize DeploymentTracker', {
        error: error.message,
      });
    }
  }

  /**
   * Create default deployment info
   */
  createDefaultDeployment() {
    return {
      deploymentId: 'v1.0.0',
      buildNumber: 1,
      buildTime: new Date().toISOString(),
      daemonStart: new Date().toISOString(),
      gitCommit: this.getGitCommit() || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Get current deployment info
   */
  getDeploymentInfo() {
    return {
      deploymentId: this.deploymentId,
      buildNumber: this.buildNumber,
      buildTime: this.buildTime,
      daemonStart: this.daemonStart,
      gitCommit: this.gitCommit,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Get deployment info for scene context
   */
  getSceneContext() {
    return {
      deploymentId: this.deploymentId,
      buildTime: this.buildTime,
      daemonStart: this.daemonStart,
      buildNumber: this.buildNumber,
      gitCommit: this.gitCommit,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Read version.json file
   *
   * This file is the primary source of truth for version metadata:
   * - In Docker containers: Baked in during CI/CD build
   * - In local development: Generated via 'npm run build:version'
   * - Contains: version, buildNumber, gitCommit, buildTime, etc.
   *
   * The file is committed to git (provides baseline) and regenerated during
   * Docker builds to ensure deployed containers have accurate metadata.
   *
   * @async
   * @returns {Promise<Object>} Version info object or empty object if file missing
   */
  async readVersionInfo() {
    try {
      const versionPath = path.join(__dirname, '..', 'version.json');
      if (fs.existsSync(versionPath)) {
        const content = await fs.promises.readFile(versionPath, 'utf8');
        const versionData = JSON.parse(content);
        logger.debug('Read version.json', {
          version: versionData.version,
          buildNumber: versionData.buildNumber,
        });
        return versionData;
      } else {
        logger.warn('version.json not found, will use Git fallback');
      }
    } catch (error) {
      logger.warn('Could not read version.json', { error: error.message });
    }
    return {};
  }

  /**
   * Get Git deployment info as fallback
   *
   * Tries to extract version metadata from Git repository:
   * 1. Environment variables (CI/CD build args)
   * 2. Git commands (commit hash, commit count, latest tag)
   *
   * This is used as fallback when version.json is missing or incomplete.
   *
   * @returns {Object} Git info with commitHash, commitCount, latestTag
   */
  getGitDeploymentInfo() {
    // Initialize gitInfo object
    this.gitInfo = {
      commitHash: 'unknown',
      commitCount: '0',
      latestTag: 'unknown',
    };

    try {
      if (this.tryGitInfoFromEnv()) {
        logger.info('Using GIT info from environment variables');
        return this.gitInfo;
      }

      const gitRoot = this.findGitRoot();
      if (!gitRoot) {
        logger.warn('Could not find .git root directory.');
        return this.gitInfo;
      }

      this.fetchGitInfoFromRepo(gitRoot);

      logger.info('Successfully retrieved GIT info');
    } catch (error) {
      logger.warn('Could not retrieve GIT info', {
        error: error.message.split('\n')[0].trim(),
      });
    }
    return this.gitInfo;
  }

  tryGitInfoFromEnv() {
    if (process.env.GIT_COMMIT && process.env.GIT_COMMIT_COUNT) {
      this.gitInfo.commitHash = process.env.GIT_COMMIT.substring(0, 7);
      this.gitInfo.commitCount = process.env.GIT_COMMIT_COUNT;
      this.gitInfo.latestTag = `build-${process.env.GIT_COMMIT_COUNT}`;
      return true;
    }
    return false;
  }

  fetchGitInfoFromRepo(gitRoot) {
    const execOptions = { cwd: gitRoot, stdio: 'pipe', encoding: 'utf-8' };
    this.gitInfo.commitHash = execSync(
      'git rev-parse --short HEAD',
      execOptions,
    ).trim();
    this.gitInfo.commitCount = execSync(
      'git rev-list --count HEAD',
      execOptions,
    ).trim();
    this.gitInfo.latestTag = execSync(
      'git describe --tags --abbrev=0',
      execOptions,
    ).trim();
  }

  findGitRoot() {
    let currentPath = __dirname;
    for (let i = 0; i < 5; i++) {
      const gitPath = path.join(currentPath, '.git');
      if (fs.existsSync(gitPath)) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    return null;
  }

  /**
   * Try to get current git commit hash
   */
  getGitCommit() {
    try {
      return execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
      }).trim();
    } catch {
      return null;
    }
  }

  /**
   * Format deployment info for logging
   */
  getLogString() {
    return `[Deployment Info] ID: ${this.deploymentId}, Build: ${this.buildNumber}, Commit: ${this.gitCommit}`;
  }
}

module.exports = DeploymentTracker;
