#!/usr/bin/env node

/**
 * Build Version Script
 * Generates version.json with Git information during build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building version information...');

try {
  // Get Git information
  const gitCommit = execSync('git rev-parse --short HEAD', {
    encoding: 'utf8',
  }).trim();
  const gitCommitFull = execSync('git rev-parse HEAD', {
    encoding: 'utf8',
  }).trim();
  const gitCommitCount = execSync('git rev-list --count HEAD', {
    encoding: 'utf8',
  }).trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf8',
  }).trim();
  const gitTag = execSync(
    'git describe --tags --abbrev=0 2>/dev/null || echo ""',
    { encoding: 'utf8' },
  ).trim();

  // Build version info
  const versionInfo = {
    deploymentId: gitTag || `v1.0.0-${gitCommit}`,
    buildNumber: parseInt(gitCommitCount),
    gitCommit,
    gitCommitFull,
    gitCommitCount: parseInt(gitCommitCount),
    gitBranch,
    gitTag: gitTag || null,
    buildTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  // Write to version.json
  const versionFile = path.join(__dirname, '..', 'version.json');
  fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));

  console.log('✅ Version file generated:', versionFile);
  console.log('📋 Version info:', {
    deploymentId: versionInfo.deploymentId,
    buildNumber: versionInfo.buildNumber,
    gitCommit: versionInfo.gitCommit,
    gitBranch: versionInfo.gitBranch,
  });
} catch (error) {
  console.error('❌ Failed to build version:', error.message);
  process.exit(1);
}
