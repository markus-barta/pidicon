#!/usr/bin/env node

/**
 * Build Version Script
 * Generates version.json with Git information during build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building version information...');

// Helper function to get Git info with environment fallback
function getGitInfo(envVar, gitCommand, defaultValue = null) {
  if (envVar) return envVar;
  try {
    return execSync(gitCommand, { encoding: 'utf8' }).trim();
  } catch {
    return defaultValue;
  }
}

try {
  // Environment variables (CI/CD provided)
  const envSha = process.env.GITHUB_SHA;
  // IMPORTANT: buildNumber must reflect git commit count, not CI run number.
  // Only honor GIT_COMMIT_COUNT if explicitly provided; otherwise read from git.
  const envCommitCount =
    process.env.GIT_COMMIT_COUNT || process.env.BUILD_NUMBER;
  const envBuildDate = process.env.BUILD_DATE;
  const envRefName = process.env.GITHUB_REF_NAME;
  const envRef = process.env.GITHUB_REF || '';
  const envTag = envRef.startsWith('refs/tags/')
    ? envRef.split('/').slice(2).join('/')
    : '';

  // Get Git information
  const gitCommit = getGitInfo(
    envSha?.substring(0, 7),
    'git rev-parse --short HEAD',
  );
  const gitCommitFull = getGitInfo(envSha, 'git rev-parse HEAD');
  const gitCommitCount = getGitInfo(
    envCommitCount,
    'git rev-list --count HEAD',
  );
  const gitBranch = getGitInfo(envRefName, 'git rev-parse --abbrev-ref HEAD');
  const gitTag = getGitInfo(
    envTag,
    'git describe --tags --abbrev=0 2>/dev/null || echo ""',
    '',
  );

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
  const buildNumber = parseInt(gitCommitCount);
  const versionInfo = {
    version: packageVersion,
    deploymentId: gitTag || `v${packageVersion}-${gitCommit}`,
    buildNumber,
    gitCommit,
    gitCommitFull,
    gitCommitCount: buildNumber, // Remove redundancy
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
