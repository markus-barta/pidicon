/**
 * Deployment Tracker - Manages version numbers and deployment information
 * @author: Sonic + Cursor + Markus Barta (mba)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logger = require('./logger');

class DeploymentTracker {
  constructor() {
    // Version info comes from Git, not from persistent files
    // This ensures version is always accurate and source-controlled
    logger.info(
      `🔍 [DEPLOYMENT] Using Git-based versioning (no persistent files)`,
    );

    this.deploymentId = 'unknown';
    this.buildNumber = 'unknown';
    this.gitCommit = 'unknown';
    this.buildTime = 'unknown';
    this.daemonStart = new Date().toISOString();
  }

  /**
   * Initialize deployment tracking
   */
  async initialize() {
    try {
      this.gitInfo = this.getGitDeploymentInfo();
      this.versionInfo = await this.readVersionInfo();

      this.deploymentId =
        this.versionInfo.deploymentId ||
        this.gitInfo.latestTag ||
        this.deploymentId;
      this.buildNumber =
        this.versionInfo.buildNumber || this.gitInfo.commitCount || '0';
      this.gitCommit =
        this.versionInfo.gitCommit || this.gitInfo.commitHash || 'unknown';
      this.buildTime = this.versionInfo.buildTime || new Date().toISOString();
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
   * Get deployment info from version.json file
   */
  async readVersionInfo() {
    try {
      const versionPath = path.join(__dirname, '..', 'version.json');
      if (fs.existsSync(versionPath)) {
        const content = await fs.promises.readFile(versionPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      logger.warn('Could not read version.json', { error: error.message });
    }
    return {};
  }

  getGitDeploymentInfo() {
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
