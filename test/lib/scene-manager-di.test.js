/**
 * @fileoverview Tests for SceneManager with Dependency Injection
 * @description Verify SceneManager works with DI and backward compatibility
 */

const assert = require('node:assert');
const { describe, it } = require('node:test');

const SceneManager = require('../../lib/scene-manager');

describe('SceneManager - Dependency Injection', () => {
  describe('Backward Compatibility', () => {
    it('should work without injected dependencies (fallback to require)', () => {
      const sceneManager = new SceneManager();

      assert.ok(
        sceneManager.logger,
        'Logger should be loaded via require fallback',
      );
      assert.ok(typeof sceneManager.logger.ok === 'function');
    });

    it('should work with empty object', () => {
      const sceneManager = new SceneManager({});

      assert.ok(
        sceneManager.logger,
        'Logger should be loaded via require fallback',
      );
    });
  });

  describe('Dependency Injection', () => {
    it('should accept injected logger', () => {
      const mockLogger = {
        ok: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      const sceneManager = new SceneManager({ logger: mockLogger });

      assert.strictEqual(
        sceneManager.logger,
        mockLogger,
        'Should use injected logger',
      );
    });

    it('should use injected logger for logging', () => {
      const logs = [];
      const mockLogger = {
        ok: (msg, meta) => logs.push({ level: 'ok', msg, meta }),
        info: (msg, meta) => logs.push({ level: 'info', msg, meta }),
        warn: (msg, meta) => logs.push({ level: 'warn', msg, meta }),
        error: (msg, meta) => logs.push({ level: 'error', msg, meta }),
        debug: (msg, meta) => logs.push({ level: 'debug', msg, meta }),
      };

      const sceneManager = new SceneManager({ logger: mockLogger });

      // Register a simple scene
      const simpleScene = {
        name: 'test',
        render: async () => null,
      };

      sceneManager.registerScene('test', simpleScene);

      // Verify logger was called
      assert.ok(logs.length > 0, 'Logger should have been called');
      // Find the 'ok' level log (may not be first due to debug logs)
      const okLog = logs.find((l) => l.level === 'ok');
      assert.ok(okLog, 'Should have an ok-level log');
      assert.ok(
        okLog.msg.includes('Scene registered'),
        'Should log registration',
      );
    });
  });

  describe('Core Functionality with DI', () => {
    it('should register and retrieve scenes with injected logger', () => {
      const mockLogger = {
        ok: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      const sceneManager = new SceneManager({ logger: mockLogger });

      const testScene = {
        name: 'test',
        render: async () => null,
      };

      sceneManager.registerScene('test', testScene);
      const retrieved = sceneManager.getScene('test');

      assert.strictEqual(
        retrieved,
        testScene,
        'Should retrieve registered scene',
      );
    });

    it('should initialize state maps correctly', () => {
      const mockLogger = {
        ok: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };
      const sceneManager = new SceneManager({ logger: mockLogger });

      assert.ok(sceneManager.scenes instanceof Map);
      assert.ok(sceneManager.deviceActiveScene instanceof Map);
      assert.ok(sceneManager.deviceGeneration instanceof Map);
      assert.ok(sceneManager.deviceLoopTimers instanceof Map);
      assert.ok(sceneManager.deviceStatus instanceof Map);
      assert.ok(sceneManager.sceneStates instanceof Map);
    });
  });
});
