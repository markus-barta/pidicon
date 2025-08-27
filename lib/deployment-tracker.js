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
      // Get version info from Git (no persistent files needed)
      this.deploymentInfo = this.getGitDeploymentInfo();

      console.log(`🔍 [DEPLOYMENT] Git-based deployment info:`);
      console.log(`   deploymentId: ${this.deploymentInfo.deploymentId}`);
      console.log(`   buildNumber: ${this.deploymentInfo.buildNumber}`);
      console.log(`   gitCommit: ${this.deploymentInfo.gitCommit}`);
      console.log(`   buildTime: ${this.deploymentInfo.buildTime}`);

      return this.deploymentInfo;
    } catch (error) {
      console.warn(`⚠️ Git deployment tracking failed: ${error.message}`);
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
   * Get deployment info from Git
   */
  getGitDeploymentInfo() {
    try {
      const { execSync } = require('child_process');

      // Get git commit hash
      const gitCommit = execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
      }).trim();

      // Get git tag if available
      let deploymentId = 'v1.0.0';
      try {
        const gitTag = execSync('git describe --tags --abbrev=0', {
          encoding: 'utf8',
        }).trim();
        if (gitTag) {
          deploymentId = gitTag;
        }
      } catch {
        // No tags, use commit-based version
        deploymentId = `v1.0.0-${gitCommit}`;
      }

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
