/**
 * Deployment Tracker - Manages version numbers and deployment information
 * @author: Sonic + Cursor + Markus Barta (mba)
 */

const fs = require('fs').promises;
const path = require('path');

class DeploymentTracker {
  constructor() {
    // Try to use a mounted volume path that persists between restarts
    // The /app directory is inside the container and gets reset
    let deploymentPath;

    // Try different possible mounted paths
    const possiblePaths = [
      '/home/mba/docker/mounts/pixoo-daemon/app/.deployment', // Server mount path
      '/app/.deployment', // Container path (fallback)
      path.join(process.cwd(), '.deployment'), // Current working directory
      '/tmp/.deployment', // Temporary directory (might persist)
      '/var/tmp/.deployment', // System temp directory
    ];

    // First, let's see what directories are actually available
    console.log(`🔍 [DEPLOYMENT] Checking available directories:`);
    try {
      const dirs = require('fs').readdirSync('/');
      console.log(`   Root dir contents: ${dirs.slice(0, 10).join(', ')}...`);
    } catch (error) {
      console.log(`   Cannot read root directory: ${error.message}`);
    }

    try {
      const dirs = require('fs').readdirSync('/app');
      console.log(`   /app dir contents: ${dirs.slice(0, 10).join(', ')}...`);
    } catch (error) {
      console.log(`   Cannot read /app directory: ${error.message}`);
    }

    // Check which path exists and is writable
    for (const testPath of possiblePaths) {
      try {
        // Try to create a test file to check if writable
        const testFile = testPath + '.test';
        require('fs').writeFileSync(testFile, 'test');
        require('fs').unlinkSync(testFile);
        deploymentPath = testPath;
        console.log(`🔍 [DEPLOYMENT] Found writable path: ${deploymentPath}`);
        break;
      } catch (error) {
        console.log(
          `🔍 [DEPLOYMENT] Path not writable: ${testPath} (${error.message})`,
        );
      }
    }

    // Fallback to container path if none work
    if (!deploymentPath) {
      const daemonDir = path.dirname(require.main.filename);
      deploymentPath = path.join(daemonDir, '.deployment');
      console.log(`🔍 [DEPLOYMENT] Using fallback path: ${deploymentPath}`);
    }

    this.deploymentFile = deploymentPath;

    console.log(
      `🔍 [DEPLOYMENT] Constructor - Final deploymentFile: ${this.deploymentFile}`,
    );
    console.log(
      `🔍 [DEPLOYMENT] Constructor - require.main.filename: ${require.main.filename}`,
    );
    console.log(`🔍 [DEPLOYMENT] Constructor - __dirname: ${__dirname}`);
    console.log(
      `🔍 [DEPLOYMENT] Constructor - process.cwd(): ${process.cwd()}`,
    );

    this.deploymentInfo = null;
  }

  /**
   * Initialize deployment tracking
   */
  async initialize() {
    try {
      await this.loadDeploymentInfo();

      console.log(`🔍 [DEPLOYMENT] Initialize check:`);
      console.log(`   deploymentInfo exists: ${!!this.deploymentInfo}`);
      console.log(`   buildNumber: ${this.deploymentInfo?.buildNumber}`);
      console.log(`   deploymentId: ${this.deploymentInfo?.deploymentId}`);
      console.log(`   File path: ${this.deploymentFile}`);

      // Only increment if this is a fresh start (no existing deployment)
      if (!this.deploymentInfo || !this.deploymentInfo.buildNumber) {
        console.log(
          `🔄 [DEPLOYMENT] Fresh start detected, calling incrementDeployment()`,
        );
        await this.incrementDeployment();
      } else {
        // Update daemon start time on every restart
        console.log(`🔄 [DEPLOYMENT] Updating deployment info on restart...`);
        console.log(
          `   Previous build number: ${this.deploymentInfo.buildNumber}`,
        );
        console.log(`   Previous version: ${this.deploymentInfo.deploymentId}`);

        this.deploymentInfo.daemonStart = new Date().toISOString();
        // Also increment build number on every restart for development
        this.deploymentInfo.buildNumber++;
        this.deploymentInfo.deploymentId = `v1.0.${this.deploymentInfo.buildNumber}`;
        this.deploymentInfo.buildTime = new Date().toISOString();

        console.log(`   New build number: ${this.deploymentInfo.buildNumber}`);
        console.log(`   New version: ${this.deploymentInfo.deploymentId}`);
        console.log(`   Saving to: ${this.deploymentFile}`);

        await this.saveDeploymentInfo();
        console.log(`✅ [DEPLOYMENT] Deployment info updated and saved`);
      }
      return this.deploymentInfo;
    } catch (error) {
      console.warn(`⚠️ Deployment tracking failed: ${error.message}`);
      return this.createDefaultDeployment();
    }
  }

  /**
   * Load existing deployment info
   */
  async loadDeploymentInfo() {
    try {
      console.log(`📖 [DEPLOYMENT] Loading from: ${this.deploymentFile}`);
      const data = await fs.readFile(this.deploymentFile, 'utf8');
      console.log(`📖 [DEPLOYMENT] File content: ${data}`);
      this.deploymentInfo = JSON.parse(data);
      console.log(
        `📖 [DEPLOYMENT] Loaded deployment info:`,
        this.deploymentInfo,
      );
    } catch (error) {
      console.log(`📖 [DEPLOYMENT] File load failed: ${error.message}`);
      // File doesn't exist or is invalid, create default
      this.deploymentInfo = this.createDefaultDeployment();
      console.log(
        `📖 [DEPLOYMENT] Created default deployment info:`,
        this.deploymentInfo,
      );
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
   * Increment deployment counter
   */
  async incrementDeployment() {
    if (!this.deploymentInfo) {
      this.deploymentInfo = this.createDefaultDeployment();
    }

    // Increment build number
    this.deploymentInfo.buildNumber++;

    // Update deployment ID with build number
    this.deploymentInfo.deploymentId = `v1.0.${this.deploymentInfo.buildNumber}`;

    // Update build time
    this.deploymentInfo.buildTime = new Date().toISOString();

    // Update daemon start time
    this.deploymentInfo.daemonStart = new Date().toISOString();

    // Save to file
    await this.saveDeploymentInfo();
  }

  /**
   * Save deployment info to file
   */
  async saveDeploymentInfo() {
    try {
      console.log(`💾 [DEPLOYMENT] Saving deployment info to file...`);
      const data = JSON.stringify(this.deploymentInfo, null, 2);
      console.log(`   Data to save: ${data}`);

      // Check if file exists before writing
      try {
        const stats = await fs.stat(this.deploymentFile);
        console.log(
          `   File exists, size: ${stats.size} bytes, modified: ${stats.mtime}`,
        );
      } catch {
        console.log(`   File does not exist yet`);
      }

      await fs.writeFile(this.deploymentFile, data);

      // Verify file was written
      const stats = await fs.stat(this.deploymentFile);
      console.log(
        `   File written, new size: ${stats.size} bytes, modified: ${stats.mtime}`,
      );

      console.log(`✅ [DEPLOYMENT] File saved successfully`);
    } catch (error) {
      console.error(
        `❌ [DEPLOYMENT] Failed to save deployment info: ${error.message}`,
      );
      console.error(`   File path: ${this.deploymentFile}`);
      console.error(`   Error details:`, error);
    }
  }

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
