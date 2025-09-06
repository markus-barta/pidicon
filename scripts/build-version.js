#!/usr/bin/env node

/**
 * Build Version Script
 * Generates version.json with Git information during build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logger = require('../lib/logger');

function getGitInfo(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    logger.warn(`Git command failed: ${command}`);
    return '';
  }
}

function buildVersionInfo() {
  logger.info('Building version information...');
  try {
    // Get Git information with fallbacks for CI environment
    const gitCommit =
      (
        process.env.GITHUB_SHA || getGitInfo('git rev-parse --short HEAD')
      ).substring(0, 7) || 'unknown';
    const gitCommitFull =
      process.env.GITHUB_SHA || getGitInfo('git rev-parse HEAD') || 'unknown';
    const gitCommitCount =
      process.env.GIT_COMMIT_COUNT ||
      getGitInfo('git rev-list --count HEAD') ||
      '0';
    const gitBranch =
      process.env.GITHUB_REF_NAME ||
      getGitInfo('git rev-parse --abbrev-ref HEAD') ||
      'unknown';
    const gitTag =
      (process.env.GITHUB_REF?.startsWith('refs/tags/')
        ? process.env.GITHUB_REF.split('/').slice(2).join('/')
        : getGitInfo('git describe --tags --abbrev=0 2>/dev/null')) || '';

    // Read package.json for semantic version
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    let packageVersion = '1.0.0';
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageVersion = packageJson.version || '1.0.0';
    } catch {
      logger.warn('Could not read package.json, using default version');
    }

    // Build version info
    const buildNumber = parseInt(gitCommitCount);
    const versionData = {
      version: packageVersion,
      deploymentId: gitTag || `v${packageVersion}-${gitCommit}`,
      buildNumber,
      gitCommit,
      gitCommitFull,
      gitCommitCount: buildNumber, // Remove redundancy
      gitBranch,
      gitTag: gitTag || null,
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    // Write to version.json
    const versionFile = path.join(__dirname, '..', 'version.json');
    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
    logger.info('Version file generated:', { file: versionFile });
    logger.info('Version info:', versionData);
  } catch (error) {
    logger.error('Failed to build version info:', {
      error: error.message.split('\n')[0].trim(),
    });
    process.exit(1);
  }
}

buildVersionInfo();
