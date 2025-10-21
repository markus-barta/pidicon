#!/usr/bin/env node

'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const TEST_ROOT = path.join(__dirname, '..', 'test');
const TEST_PATTERN = /\.(test|spec)\.js$/i;

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

if (!fs.existsSync(TEST_ROOT)) {
  console.error('[test-runner] Test directory not found:', TEST_ROOT);
  process.exit(1);
}

const testFiles = collectTestFiles(TEST_ROOT);

if (testFiles.length === 0) {
  console.warn(
    '[test-runner] No *.test.js or *.spec.js files found under',
    TEST_ROOT,
  );
  process.exit(0);
}

const child = spawn(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('[test-runner] Failed to launch node --test:', error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.warn(`[test-runner] node --test exited due to signal ${signal}`);
    process.exit(1);
  }
  process.exit(code);
});
