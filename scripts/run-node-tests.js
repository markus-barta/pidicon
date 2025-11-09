#!/usr/bin/env node

'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const TEST_ROOT = path.join(__dirname, '..', 'test');
const TEST_PATTERN = /\.(test|spec)\.js$/i;
const RESULTS_DIR = path.join(__dirname, '..', 'data', 'test-results');
const RESULTS_FILE = path.join(RESULTS_DIR, 'node-tests.json');

function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (TEST_PATTERN.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse TAP output from Node.js test runner and convert to JSON.
 * @param {string} tapOutput
 * @param {string} testFilePath - The actual file path being tested
 * @returns {Array<Object>} Array of test results
 */
function parseTapToJson(tapOutput, testFilePath) {
  const lines = tapOutput.split('\n');
  const tests = [];
  let currentTest = null;
  let currentSuite = null;
  let inMetadataBlock = false;
  let pendingTest = null; // Hold test until we check if it's a suite

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract nested subtest markers (indented) - these are suite names
    const nestedSubtestMatch = line.match(/^\s+# Subtest: (.+)$/);
    if (nestedSubtestMatch) {
      currentSuite = nestedSubtestMatch[1];
      continue;
    }

    // Top-level subtests (non-indented) are also suite names, not file paths
    const topLevelSubtestMatch = line.match(/^# Subtest: (.+)$/);
    if (topLevelSubtestMatch) {
      // This is a top-level suite - reset currentSuite
      currentSuite = topLevelSubtestMatch[1];
      continue;
    }

    // Check for metadata block start
    if (line.trim() === '---') {
      inMetadataBlock = true;
      continue;
    }

    // Check for metadata block end
    if (line.trim() === '...' && inMetadataBlock) {
      inMetadataBlock = false;
      // If we have a pending test and it wasn't marked as suite, add it
      if (pendingTest) {
        tests.push(pendingTest);
        pendingTest = null;
      }
      continue;
    }

    // Check if this test is actually a suite (in metadata block)
    if (inMetadataBlock && line.includes("type: 'suite'")) {
      // Discard the pending test - it's a suite container
      pendingTest = null;
      // Reset suite when exiting a suite block
      currentSuite = null;
      continue;
    }

    // Test result lines: "ok 1 - test name" or "not ok 1 - test name"
    // Handles both top-level and indented (nested) tests
    const testMatch = line.match(/^\s*(ok|not ok) \d+ - (.+?)(\s+#\s+(.+))?$/);
    if (testMatch) {
      const [, status, name, , meta] = testMatch;

      // Skip SKIP markers
      if (meta && meta.includes('SKIP')) {
        continue;
      }

      // Extract duration from inline metadata
      const durationMatch = meta?.match(/duration_ms: ([\d.]+)/);
      const testName = name.trim();

      // If we have a pending test, finalize it first
      if (pendingTest) {
        tests.push(pendingTest);
      }

      // Create new pending test (will be added after checking metadata block)
      // Use the actual test file path passed as parameter
      pendingTest = {
        name: testName,
        file: testFilePath, // Use the actual file path from parameter
        suite: currentSuite,
        status: status === 'ok' ? 'pass' : 'fail',
        duration: durationMatch ? parseFloat(durationMatch[1]) : 0,
        error: null,
      };
      currentTest = pendingTest;
      continue;
    }

    // Error details in subsequent lines (starts with spaces and "error:")
    if (
      currentTest &&
      currentTest.status === 'fail' &&
      line.trim().startsWith('error:')
    ) {
      const errorMsg = line
        .replace(/^\s*error:\s*/, '')
        .replace(/^['"]|['"]$/g, '');
      currentTest.error = { message: errorMsg };
    }
  }

  // Add any remaining pending test
  if (pendingTest) {
    tests.push(pendingTest);
  }

  return tests;
}

/**
 * Run a single test file and return parsed results.
 * @param {string} testFile - Path to test file
 * @returns {Promise<Array<Object>>} Array of test results
 */
function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--test', '--test-reporter=tap', testFile],
      {
        stdio: ['inherit', 'pipe', 'inherit'],
      }
    );

    let tapOutput = '';
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      tapOutput += chunk;
      // DEBUG: Output raw TAP for watchdog tests
      if (testFile.includes('watchdog-service.test.js')) {
        process.stderr.write(chunk);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Test exited due to signal ${signal}`));
        return;
      }

      // Parse TAP output with the actual file path
      const tests = parseTapToJson(tapOutput, testFile);
      resolve({ code, tests });
    });
  });
}

/**
 * Save test results to JSON file.
 * @param {Object} results
 */
function saveResults(results) {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf8');
    console.log(`[test-runner] Results saved to ${RESULTS_FILE}`);
  } catch (error) {
    console.error('[test-runner] Failed to save results:', error.message);
  }
}

async function main() {
  if (!fs.existsSync(TEST_ROOT)) {
    console.error('[test-runner] Test directory not found:', TEST_ROOT);
    process.exit(1);
  }

  const testFiles = collectTestFiles(TEST_ROOT);

  if (testFiles.length === 0) {
    console.warn(
      '[test-runner] No *.test.js or *.spec.js files found under',
      TEST_ROOT
    );
    process.exit(0);
  }

  console.log(`[test-runner] Running ${testFiles.length} test files...`);

  const allTests = [];
  let totalFailures = 0;

  for (const testFile of testFiles) {
    const relPath = path.relative(process.cwd(), testFile);
    process.stdout.write(`[test-runner] Running ${relPath}...`);

    try {
      const { code, tests } = await runTestFile(testFile);
      allTests.push(...tests);

      const failures = tests.filter((t) => t.status === 'fail').length;
      totalFailures += failures;

      if (code === 0) {
        console.log(` ✓ (${tests.length} tests)`);
      } else {
        console.log(` ✗ (${failures} failures)`);
      }
    } catch (error) {
      console.log(` ERROR: ${error.message}`);
      totalFailures++;
    }
  }

  // Save consolidated results
  const results = {
    timestamp: new Date().toISOString(),
    tests: allTests,
  };

  saveResults(results);

  console.log(
    `\n[test-runner] Total: ${allTests.length} tests, ${totalFailures} failures`
  );

  process.exit(totalFailures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('[test-runner] Unexpected error:', error);
  process.exit(1);
});
