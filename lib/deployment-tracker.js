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
   * Get deployment info from version.json file
   */
  getGitDeploymentInfo() {
    try {
      // Try to read version.json file (generated during build)
      const versionFile = require('path').join(__dirname, '..', 'version.json');
      const fs = require('fs');

      if (fs.existsSync(versionFile)) {
        const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));

        // Allow environment to override commit and build number for container builds
        const envGitCommit =
          (process.env.GITHUB_SHA || '').substring(0, 7) || null;

        // Choose an env-provided build number if available
        const envBuildNumberCandidate =
          process.env.GIT_COMMIT_COUNT ||
          process.env.GITHUB_RUN_NUMBER ||
          process.env.BUILD_NUMBER ||
          null;

        let effectiveBuildNumber = versionData.buildNumber;
        if (envBuildNumberCandidate && String(envBuildNumberCandidate).trim()) {
          const parsed = parseInt(envBuildNumberCandidate, 10);
          if (Number.isFinite(parsed)) effectiveBuildNumber = parsed;
        } else if (process.env.BUILD_DATE) {
          const ts = Date.parse(process.env.BUILD_DATE);
          if (!Number.isNaN(ts)) {
            effectiveBuildNumber = Math.floor(ts / 1000);
          }
        }

        const effectiveGitCommit = envGitCommit || versionData.gitCommit;
        const effectiveBuildTime =
          process.env.BUILD_DATE || versionData.buildTime;

        // Prefer explicit deploymentId from file; otherwise compose one
        const effectiveDeploymentId =
          versionData.deploymentId ||
          `v${versionData.version || '1.0.0'}-${effectiveGitCommit}`;

        console.log(
          `🔍 [DEPLOYMENT] Using version.json (overrides applied if present): commit=${effectiveGitCommit}, count=${effectiveBuildNumber}`,
        );

        return {
          deploymentId: effectiveDeploymentId,
          buildNumber: effectiveBuildNumber,
          buildTime:
            typeof effectiveBuildTime === 'string'
              ? effectiveBuildTime
              : new Date().toISOString(),
          daemonStart: new Date().toISOString(),
          gitCommit: effectiveGitCommit,
          environment:
            versionData.environment || process.env.NODE_ENV || 'development',
        };
      }

      console.log(
        `🔍 [DEPLOYMENT] version.json not found, trying Git commands...`,
      );

      // Fallback to Git commands (may not work in Docker). First, prefer env.
      try {
        const envGitCommit =
          (process.env.GITHUB_SHA || '').substring(0, 7) || null;

        let buildNumber = null;
        const envBuildNumberCandidate =
          process.env.GIT_COMMIT_COUNT ||
          process.env.GITHUB_RUN_NUMBER ||
          process.env.BUILD_NUMBER ||
          null;
        if (envBuildNumberCandidate && String(envBuildNumberCandidate).trim()) {
          const parsed = parseInt(envBuildNumberCandidate, 10);
          if (Number.isFinite(parsed)) buildNumber = parsed;
        } else if (process.env.BUILD_DATE) {
          const ts = Date.parse(process.env.BUILD_DATE);
          if (!Number.isNaN(ts)) buildNumber = Math.floor(ts / 1000);
        }

        // If env did not provide values, try Git
        let gitCommit = envGitCommit;
        if (!gitCommit || buildNumber === null) {
          const { execSync } = require('child_process');

          // Get git commit hash
          if (!gitCommit) {
            gitCommit = execSync('git rev-parse --short HEAD', {
              encoding: 'utf8',
            }).trim();
          }

          // Get commit count for build number
          if (buildNumber === null) {
            try {
              const commitCount = execSync('git rev-list --count HEAD', {
                encoding: 'utf8',
              }).trim();
              buildNumber = parseInt(commitCount) || 1;
            } catch {
              // Fallback to timestamp-based build number
              buildNumber = Math.floor(Date.now() / 1000);
            }
          }
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
        console.warn(`⚠️ Git commands failed: ${error.message}`);
        return this.createDefaultDeployment();
      }
    } catch (error) {
      console.warn(`⚠️ Version file read failed: ${error.message}`);
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
