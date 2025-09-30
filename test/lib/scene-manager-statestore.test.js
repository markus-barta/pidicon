/**
 * @fileoverview Tests for SceneManager StateStore integration
 * @module test/lib/scene-manager-statestore.test.js
 */

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const SceneManager = require('../../lib/scene-manager');
const StateStore = require('../../lib/state-store');

// Mock logger
const createMockLogger = () => ({
  ok: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
});

// Simple test scene
const createTestScene = (name) => ({
  name,
  render: async () => null,
  init: async () => {},
  cleanup: async () => {},
});

describe('SceneManager - StateStore Integration', () => {
  describe('Without StateStore (Legacy Maps)', () => {
    it('should work with direct Map storage', () => {
      const logger = createMockLogger();
      const manager = new SceneManager({ logger });

      // Verify Maps are created
      assert.ok(manager.deviceActiveScene instanceof Map);
      assert.ok(manager.deviceGeneration instanceof Map);
      assert.ok(manager.deviceStatus instanceof Map);
      assert.ok(manager.sceneStates instanceof Map);

      // Register a scene
      const scene = createTestScene('test');
      manager.registerScene('test', scene);

      // Verify scene state initialized
      const sceneState = manager.getSceneState('test');
      assert.ok(sceneState instanceof Map);
    });

    it('should track device state in Maps', () => {
      const logger = createMockLogger();
      const manager = new SceneManager({ logger });

      const host = '192.168.1.1';

      // Set device state
      manager._setDeviceState(host, 'activeScene', 'startup');
      manager._setDeviceState(host, 'generationId', 42);
      manager._setDeviceState(host, 'status', 'running');

      // Verify state can be retrieved
      assert.strictEqual(
        manager._getDeviceState(host, 'activeScene'),
        'startup',
      );
      assert.strictEqual(manager._getDeviceState(host, 'generationId'), 42);
      assert.strictEqual(manager._getDeviceState(host, 'status'), 'running');

      // Verify Maps contain data
      assert.strictEqual(manager.deviceActiveScene.get(host), 'startup');
      assert.strictEqual(manager.deviceGeneration.get(host), 42);
      assert.strictEqual(manager.deviceStatus.get(host), 'running');
    });
  });

  describe('With StateStore (Integrated)', () => {
    it('should work with StateStore', () => {
      const logger = createMockLogger();
      const stateStore = new StateStore({ logger });
      const manager = new SceneManager({ logger, stateStore });

      // Verify StateStore is set
      assert.strictEqual(manager.stateStore, stateStore);

      // Maps should still be created for backward compatibility
      assert.ok(manager.deviceActiveScene instanceof Map);
      assert.ok(manager.deviceGeneration instanceof Map);
      assert.ok(manager.deviceStatus instanceof Map);

      // Register a scene
      const scene = createTestScene('test');
      manager.registerScene('test', scene);

      // Verify scene state still works
      const sceneState = manager.getSceneState('test');
      assert.ok(sceneState instanceof Map);
    });

    it('should store device state in StateStore', () => {
      const logger = createMockLogger();
      const stateStore = new StateStore({ logger });
      const manager = new SceneManager({ logger, stateStore });

      const host = '192.168.1.1';

      // Set device state via helper methods
      manager._setDeviceState(host, 'activeScene', 'startup');
      manager._setDeviceState(host, 'generationId', 42);
      manager._setDeviceState(host, 'status', 'running');

      // Verify state is in StateStore
      assert.strictEqual(
        stateStore.getDeviceState(host, 'activeScene'),
        'startup',
      );
      assert.strictEqual(stateStore.getDeviceState(host, 'generationId'), 42);
      assert.strictEqual(stateStore.getDeviceState(host, 'status'), 'running');

      // Verify helper methods retrieve from StateStore
      assert.strictEqual(
        manager._getDeviceState(host, 'activeScene'),
        'startup',
      );
      assert.strictEqual(manager._getDeviceState(host, 'generationId'), 42);
      assert.strictEqual(manager._getDeviceState(host, 'status'), 'running');
    });

    it('should use StateStore for getDeviceSceneState()', () => {
      const logger = createMockLogger();
      const stateStore = new StateStore({ logger });
      const manager = new SceneManager({ logger, stateStore });

      const host = '192.168.1.1';

      // Set device state
      manager._setDeviceState(host, 'activeScene', 'test-scene');
      manager._setDeviceState(host, 'generationId', 99);
      manager._setDeviceState(host, 'status', 'running');

      // Get state via public method
      const state = manager.getDeviceSceneState(host);

      assert.strictEqual(state.currentScene, 'test-scene');
      assert.strictEqual(state.generationId, 99);
      assert.strictEqual(state.status, 'running');
    });

    it('should handle default values correctly', () => {
      const logger = createMockLogger();
      const stateStore = new StateStore({ logger });
      const manager = new SceneManager({ logger, stateStore });

      const host = '192.168.1.1';

      // Get non-existent state with default
      const activeScene = manager._getDeviceState(
        host,
        'activeScene',
        'default-scene',
      );
      const generationId = manager._getDeviceState(host, 'generationId', 0);

      assert.strictEqual(activeScene, 'default-scene');
      assert.strictEqual(generationId, 0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work identically with or without StateStore', () => {
      const logger = createMockLogger();

      // Without StateStore
      const managerWithoutStore = new SceneManager({ logger });

      // With StateStore
      const stateStore = new StateStore({ logger });
      const managerWithStore = new SceneManager({ logger, stateStore });

      const host = '192.168.1.1';

      // Set same state in both
      managerWithoutStore._setDeviceState(host, 'activeScene', 'test');
      managerWithoutStore._setDeviceState(host, 'generationId', 42);

      managerWithStore._setDeviceState(host, 'activeScene', 'test');
      managerWithStore._setDeviceState(host, 'generationId', 42);

      // Both should return same values
      assert.strictEqual(
        managerWithoutStore._getDeviceState(host, 'activeScene'),
        managerWithStore._getDeviceState(host, 'activeScene'),
      );
      assert.strictEqual(
        managerWithoutStore._getDeviceState(host, 'generationId'),
        managerWithStore._getDeviceState(host, 'generationId'),
      );

      // Both should have same device scene state
      const stateWithout = managerWithoutStore.getDeviceSceneState(host);
      const stateWith = managerWithStore.getDeviceSceneState(host);

      assert.strictEqual(stateWithout.currentScene, stateWith.currentScene);
      assert.strictEqual(stateWithout.generationId, stateWith.generationId);
    });
  });
});
