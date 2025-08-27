/**
 * Deployment Tracker - Manages version numbers and deployment information
 * @author: Sonic + Cursor + Markus Barta (mba)
 */

// File system operations removed - version info comes from Git

class DeploymentTracker {
  constructor() {
    // Version info comes from Git, not from persistent files
    // This ensures version is always accurate and source-controlled
    console.log(
      `🔍 [DEPLOYMENT] Using Git-based versioning (no persistent files)`,
    );

    this.deploymentInfo = null;
  }

  /**
   * Initialize deployment tracking
   */
  async initialize() {
    try {
      console.log(
        `🔍 [DEPLOYMENT] Starting Git-based deployment initialization...`,
      );

      // Get version info from Git (no persistent files needed)
      this.deploymentInfo = this.getGitDeploymentInfo();

      console.log(`🔍 [DEPLOYMENT] Git-based deployment info:`);
      console.log(`   deploymentId: ${this.deploymentInfo.deploymentId}`);
      console.log(`   buildNumber: ${this.deploymentInfo.buildNumber}`);
      console.log(`   gitCommit: ${this.deploymentInfo.gitCommit}`);
      console.log(`   buildTime: ${this.deploymentInfo.buildTime}`);

      return this.deploymentInfo;
    } catch (error) {
      console.error(
        `❌ [DEPLOYMENT] Git deployment tracking failed: ${error.message}`,
      );
      console.error(`❌ [DEPLOYMENT] Error stack: ${error.stack}`);
      console.log(`🔄 [DEPLOYMENT] Falling back to default deployment...`);
      return this.createDefaultDeployment();
    }
  }

  // File loading removed - version info comes from Git

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

  // File-based methods removed - version info comes from Git

  /**
   * Get current deployment info
   */
  getDeploymentInfo() {
    return this.deploymentInfo;
  }

  /**
   * Get deployment info for scene context
   */
  getSceneContext() {
    if (!this.deploymentInfo) return {};

    return {
      deploymentId: this.deploymentInfo.deploymentId,
      buildTime: this.deploymentInfo.buildTime,
      daemonStart: this.deploymentInfo.daemonStart,
      buildNumber: this.deploymentInfo.buildNumber,
      gitCommit: this.deploymentInfo.gitCommit,
      environment: this.deploymentInfo.environment,
    };
  }

  /**
   * Get deployment info from Git or environment variables
   */
  getGitDeploymentInfo() {
    // Try environment variables first (set by deployment process)
    if (process.env.GIT_COMMIT && process.env.GIT_COMMIT_COUNT) {
      const gitCommit = process.env.GIT_COMMIT;
      const buildNumber = parseInt(process.env.GIT_COMMIT_COUNT);
      const deploymentId = `v1.0.0-${gitCommit}`;

      console.log(
        `🔍 [DEPLOYMENT] Using env vars: commit=${gitCommit}, count=${buildNumber}`,
      );

      return {
        deploymentId,
        buildNumber,
        buildTime: new Date().toISOString(),
        daemonStart: new Date().toISOString(),
        gitCommit,
        environment: process.env.NODE_ENV || 'development',
      };
    }

    // Fallback to Git commands (may not work in Docker)
    try {
      const { execSync } = require('child_process');

      // Get git commit hash
      const gitCommit = execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
      }).trim();

      // Get commit count for build number
      let buildNumber = 1;
      try {
        const commitCount = execSync('git rev-list --count HEAD', {
          encoding: 'utf8',
        }).trim();
        buildNumber = parseInt(commitCount) || 1;
      } catch {
        // Fallback to timestamp-based build number
        buildNumber = Math.floor(Date.now() / 1000);
      }

      const deploymentId = `v1.0.0-${gitCommit}`;

      console.log(
        `🔍 [DEPLOYMENT] Using Git commands: commit=${gitCommit}, count=${buildNumber}`,
      );

      return {
        deploymentId,
        buildNumber,
        buildTime: new Date().toISOString(),
        daemonStart: new Date().toISOString(),
        gitCommit,
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error) {
      console.warn(`⚠️ Git info unavailable: ${error.message}`);
      return this.createDefaultDeployment();
    }
  }

  /**
   * Try to get current git commit hash
   */
  getGitCommit() {
    try {
      const { execSync } = require('child_process');
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
    if (!this.deploymentInfo) return 'Deployment info not available';

    return `🚀 Deployment ${this.deploymentInfo.deploymentId} (build #${this.deploymentInfo.buildNumber}) - ${this.deploymentInfo.buildTime.split('T')[0]} - Git: ${this.deploymentInfo.gitCommit}`;
  }
}

module.exports = DeploymentTracker;
