const assert = require('node:assert');
const test = require('node:test');

const logger = require('../../lib/logger');

test.describe('Logger Tests', () => {
  let originalLogLevel;
  let output = [];

  test.before(() => {
    originalLogLevel = process.env.LOG_LEVEL;
    logger.setOutput((log) => output.push(log));
  });

  test.after(() => {
    process.env.LOG_LEVEL = originalLogLevel;
    logger.setOutput(null);
  });

  test.beforeEach(() => {
    output = [];
  });

  const runTest = (level, message, meta) => {
    process.env.LOG_LEVEL = level;
    logger[level](message, meta);
    const parsed = output[0];

    assert.strictEqual(parsed.level, level);
    assert.strictEqual(parsed.message, message);
    assert.deepStrictEqual(parsed.meta, meta);
  };

  test('should log info messages', () => {
    runTest('info', 'test info', { data: 'info123' });
  });

  test('should log warn messages', () => {
    runTest('warn', 'test warning', { data: 'warn456' });
  });

  test('should log error messages', () => {
    runTest('error', 'test error', { data: 'error789' });
  });

  test('should log debug messages when LOG_LEVEL is debug', () => {
    runTest('debug', 'test debug', { data: 'debug101' });
  });

  test('should not log debug messages if LOG_LEVEL is info', () => {
    process.env.LOG_LEVEL = 'info';
    logger.debug('should not appear');
    assert.strictEqual(output.length, 0);
  });
});
