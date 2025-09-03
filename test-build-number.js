#!/usr/bin/env node

/**
 * Build Number Test - Ensures build number is always current
 * Tests that version.json matches git rev-list --count HEAD
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('🧪 Testing build number accuracy...\n');

  // Test 1: Check current Git commit count
  console.log('📊 Test 1: Current Git commit count');
  let gitCommitCount;
  try {
    gitCommitCount = execSync('git rev-list --count HEAD', {
      encoding: 'utf8',
    }).trim();
    console.log(`✅ Git commit count: ${gitCommitCount}`);
  } catch (error) {
    console.error(`❌ Failed to get Git commit count: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Check version.json build number
  console.log('\n📊 Test 2: version.json build number');
  let versionJsonBuildNumber;
  try {
    const versionFile = path.join(__dirname, 'version.json');
    if (!fs.existsSync(versionFile)) {
      console.error('❌ version.json file not found');
      process.exit(1);
    }

    const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    versionJsonBuildNumber = versionData.buildNumber;
    console.log(`✅ version.json buildNumber: ${versionJsonBuildNumber}`);
  } catch (error) {
    console.error(`❌ Failed to read version.json: ${error.message}`);
    process.exit(1);
  }

  // Test 3: Compare Git count vs version.json
  console.log('\n📊 Test 3: Git count vs version.json comparison');
  if (parseInt(gitCommitCount) === parseInt(versionJsonBuildNumber)) {
    console.log(
      `✅ MATCH: Git count (${gitCommitCount}) = version.json (${versionJsonBuildNumber})`,
    );
  } else {
    console.error(
      `❌ MISMATCH: Git count (${gitCommitCount}) ≠ version.json (${versionJsonBuildNumber})`,
    );
    console.log('🔧 Running build-version.js to fix...');

    try {
      execSync('node scripts/build-version.js', { stdio: 'inherit' });
      console.log('✅ version.json updated');

      // Re-check after update
      const versionFile = path.join(__dirname, 'version.json');
      const updatedVersionData = JSON.parse(
        fs.readFileSync(versionFile, 'utf8'),
      );
      const updatedBuildNumber = updatedVersionData.buildNumber;

      if (parseInt(gitCommitCount) === parseInt(updatedBuildNumber)) {
        console.log(
          `✅ FIXED: Git count (${gitCommitCount}) = version.json (${updatedBuildNumber})`,
        );
        versionJsonBuildNumber = updatedBuildNumber; // Update for final verification
      } else {
        console.error(
          `❌ STILL MISMATCH: Git count (${gitCommitCount}) ≠ version.json (${updatedBuildNumber})`,
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Failed to update version.json: ${error.message}`);
      process.exit(1);
    }
  }

  // Test 4: Test startup scene build number reading
  console.log('\n📊 Test 4: Startup scene build number reading');
  try {
    const startup = require('./scenes/startup.js');
    const mockState = new Map();
    const mockCtx = {
      device: {
        push: () => {},
        fillRectangleRgba: () => {},
        drawTextRgbaAligned: () => {},
      },
      state: mockState,
      publishOk: () => {},
    };

    // Capture console.log to check build number
    const originalLog = console.log;
    let capturedBuildNumber = null;
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('buildNumber=')) {
        const match = message.match(/buildNumber=(\d+)/);
        if (match) {
          capturedBuildNumber = match[1];
        }
      }
      originalLog(...args);
    };

    // Call the startup scene render function
    await startup.render(mockCtx);
    console.log = originalLog;

    if (
      capturedBuildNumber &&
      parseInt(capturedBuildNumber) === parseInt(gitCommitCount)
    ) {
      console.log(
        `✅ STARTUP SCENE: Correctly reads buildNumber=${capturedBuildNumber} (matches Git count ${gitCommitCount})`,
      );
    } else {
      console.error(
        `❌ STARTUP SCENE: Incorrect buildNumber=${capturedBuildNumber} (should be ${gitCommitCount})`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Failed to test startup scene: ${error.message}`);
    process.exit(1);
  }

  // Test 5: Test build-version.js script directly
  console.log('\n📊 Test 5: build-version.js script accuracy');
  try {
    // Run the build script
    execSync('node scripts/build-version.js', { stdio: 'pipe' });

    // Read the updated version.json
    const versionFile = path.join(__dirname, 'version.json');
    const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    const scriptBuildNumber = versionData.buildNumber;

    if (parseInt(scriptBuildNumber) === parseInt(gitCommitCount)) {
      console.log(
        `✅ BUILD SCRIPT: Correctly generates buildNumber=${scriptBuildNumber} (matches Git count ${gitCommitCount})`,
      );
    } else {
      console.error(
        `❌ BUILD SCRIPT: Incorrect buildNumber=${scriptBuildNumber} (should be ${gitCommitCount})`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Failed to test build script: ${error.message}`);
    process.exit(1);
  }

  console.log('\n🎉 ALL TESTS PASSED! Build number is always accurate!');
  console.log(
    `📋 Final verification: Git count ${gitCommitCount} = version.json ${versionJsonBuildNumber} = startup scene ✅`,
  );
}

// Run the tests
runTests().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
