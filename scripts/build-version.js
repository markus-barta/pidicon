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
  // Prefer CI-provided metadata when available
  const envShortSha = (process.env.GITHUB_SHA || '').substring(0, 7) || null;
  const envFullSha = process.env.GITHUB_SHA || null;
  const envRunNumber =
    process.env.GIT_COMMIT_COUNT ||
    process.env.GITHUB_RUN_NUMBER ||
    process.env.BUILD_NUMBER ||
    null;
  const envBuildDate = process.env.BUILD_DATE || null; // ISO if provided
  // GitHub provides GITHUB_REF and GITHUB_REF_NAME
  const envRef = process.env.GITHUB_REF || '';
  const envRefName = process.env.GITHUB_REF_NAME || '';
  const envTag = envRef.startsWith('refs/tags/')
    ? envRef.split('/').slice(2).join('/')
    : '';

  // Get Git information as fallback
  let gitCommit = envShortSha;
  let gitCommitFull = envFullSha;
  if (!gitCommit) {
    gitCommit = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
    }).trim();
  }
  if (!gitCommitFull) {
    gitCommitFull = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  }

  let gitCommitCount = envRunNumber;
  if (!gitCommitCount) {
    gitCommitCount = execSync('git rev-list --count HEAD', {
      encoding: 'utf8',
    }).trim();
  }

  let gitBranch = envRefName;
  if (!gitBranch) {
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim();
  }

  let gitTag = envTag;
  if (!gitTag) {
    gitTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""', {
      encoding: 'utf8',
    }).trim();
  }

  // Read package.json for semantic version
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  let packageVersion = '1.0.0';
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageVersion = packageJson.version || '1.0.0';
  } catch {
    console.warn('⚠️ Could not read package.json, using default version');
  }

  // Build version info
  const versionInfo = {
    version: packageVersion,
    deploymentId: gitTag || `v${packageVersion}-${gitCommit}`,
    buildNumber: parseInt(gitCommitCount),
    gitCommit,
    gitCommitFull,
    gitCommitCount: parseInt(gitCommitCount),
    gitBranch,
    gitTag: gitTag || null,
    buildTime: envBuildDate || new Date().toISOString(),
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
