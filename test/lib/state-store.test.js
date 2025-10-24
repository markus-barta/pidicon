/**
 * @fileoverview Tests for StateStore
 * @description Comprehensive test suite for centralized state management
 */

const assert = require('node:assert');
const { describe, it } = require('node:test');

const StateStore = require('../../lib/state-store');

describe('StateStore', () => {
  describe('Construction and Initialization', () => {
    it('should create StateStore instance', () => {
      const store = new StateStore();

      assert.ok(store instanceof StateStore);
      assert.ok(store.globalState instanceof Map);
      assert.ok(store.deviceStates instanceof Map);
      assert.ok(store.sceneStates instanceof Map);
    });

    it('should accept injected logger', () => {
      const mockLogger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      };

      const store = new StateStore({ logger: mockLogger });
      assert.strictEqual(store.logger, mockLogger);
    });
  });

  describe('Global State', () => {
    it('should set and get global state', () => {
      const store = new StateStore();

      store.setGlobal('version', '2.0.0');
      const version = store.getGlobal('version');

      assert.strictEqual(version, '2.0.0');
    });

    it('should return default value for missing global key', () => {
      const store = new StateStore();

      const value = store.getGlobal('missing', 'default');
      assert.strictEqual(value, 'default');
    });

    it('should check if global key exists', () => {
      const store = new StateStore();

      store.setGlobal('key', 'value');

      assert.strictEqual(store.hasGlobal('key'), true);
      assert.strictEqual(store.hasGlobal('missing'), false);
    });

    it('should delete global key', () => {
      const store = new StateStore();

      store.setGlobal('key', 'value');
      assert.strictEqual(store.hasGlobal('key'), true);

      const deleted = store.deleteGlobal('key');
      assert.strictEqual(deleted, true);
      assert.strictEqual(store.hasGlobal('key'), false);
    });

    it('should get global state snapshot', () => {
      const store = new StateStore();

      store.setGlobal('a', 1);
      store.setGlobal('b', 2);

      const snapshot = store.getGlobalSnapshot();
      assert.deepStrictEqual(snapshot, { a: 1, b: 2 });
    });

    it('should support method chaining for global state', () => {
      const store = new StateStore();

      const result = store
        .setGlobal('a', 1)
        .setGlobal('b', 2)
        .setGlobal('c', 3);

      assert.strictEqual(result, store);
      assert.strictEqual(store.getGlobal('a'), 1);
      assert.strictEqual(store.getGlobal('b'), 2);
      assert.strictEqual(store.getGlobal('c'), 3);
    });
  });

  describe('Device State', () => {
    it('should initialize device state', () => {
      const store = new StateStore();

      store.initDevice('192.168.1.1');

      assert.strictEqual(store.hasDevice('192.168.1.1'), true);
      const device = store.getDevice('192.168.1.1');
      assert.ok(device);
      assert.strictEqual(device.activeScene, null);
      assert.strictEqual(device.generationId, 0);
      assert.strictEqual(device.status, 'idle');
    });

    it('should set and get device state properties', () => {
      const store = new StateStore();

      store.setDeviceState('192.168.1.1', 'activeScene', 'startup');
      store.setDeviceState('192.168.1.1', 'generationId', 5);

      assert.strictEqual(
        store.getDeviceState('192.168.1.1', 'activeScene'),
        'startup'
      );
      assert.strictEqual(
        store.getDeviceState('192.168.1.1', 'generationId'),
        5
      );
    });

    it('should return default value for missing device property', () => {
      const store = new StateStore();

      const value = store.getDeviceState('192.168.1.1', 'missing', 'default');
      assert.strictEqual(value, 'default');
    });

    it('should get entire device state', () => {
      const store = new StateStore();

      store.initDevice('192.168.1.1');
      store.setDeviceState('192.168.1.1', 'activeScene', 'test');

      const device = store.getDevice('192.168.1.1');
      assert.ok(device);
      assert.strictEqual(device.activeScene, 'test');
    });

    it('should delete device and associated scene states', () => {
      const store = new StateStore();

      store.setDeviceState('192.168.1.1', 'activeScene', 'test');
      store.setSceneState('192.168.1.1', 'scene1', 'key', 'value');

      const deleted = store.deleteDevice('192.168.1.1');

      assert.strictEqual(deleted, true);
      assert.strictEqual(store.hasDevice('192.168.1.1'), false);
      assert.strictEqual(store.getScene('192.168.1.1', 'scene1'), null);
    });

    it('should get all device IDs', () => {
      const store = new StateStore();

      store.initDevice('192.168.1.1');
      store.initDevice('192.168.1.2');
      store.initDevice('192.168.1.3');

      const ids = store.getDeviceIds();
      assert.deepStrictEqual(ids.sort(), [
        '192.168.1.1',
        '192.168.1.2',
        '192.168.1.3',
      ]);
    });

    it('should set multiple device properties at once', () => {
      const store = new StateStore();

      store.setDeviceStateMultiple('192.168.1.1', {
        activeScene: 'startup',
        generationId: 10,
        status: 'running',
      });

      assert.strictEqual(
        store.getDeviceState('192.168.1.1', 'activeScene'),
        'startup'
      );
      assert.strictEqual(
        store.getDeviceState('192.168.1.1', 'generationId'),
        10
      );
      assert.strictEqual(
        store.getDeviceState('192.168.1.1', 'status'),
        'running'
      );
    });

    it('should support method chaining for device state', () => {
      const store = new StateStore();

      const result = store
        .setDeviceState('192.168.1.1', 'activeScene', 'test')
        .setDeviceState('192.168.1.1', 'generationId', 5);

      assert.strictEqual(result, store);
    });
  });

  describe('Scene State', () => {
    it('should initialize scene state', () => {
      const store = new StateStore();

      store.initSceneState('192.168.1.1', 'startup');

      const sceneState = store.getScene('192.168.1.1', 'startup');
      assert.ok(sceneState instanceof Map);
      assert.strictEqual(sceneState.size, 0);
    });

    it('should set and get scene state properties', () => {
      const store = new StateStore();

      store.setSceneState('192.168.1.1', 'startup', 'frameCount', 10);
      store.setSceneState('192.168.1.1', 'startup', 'isRunning', true);

      assert.strictEqual(
        store.getSceneState('192.168.1.1', 'startup', 'frameCount'),
        10
      );
      assert.strictEqual(
        store.getSceneState('192.168.1.1', 'startup', 'isRunning'),
        true
      );
    });

    it('should return default value for missing scene property', () => {
      const store = new StateStore();

      const value = store.getSceneState(
        '192.168.1.1',
        'test',
        'missing',
        'default'
      );
      assert.strictEqual(value, 'default');
    });

    it('should get scene state snapshot', () => {
      const store = new StateStore();

      store.setSceneState('192.168.1.1', 'test', 'a', 1);
      store.setSceneState('192.168.1.1', 'test', 'b', 2);

      const snapshot = store.getSceneSnapshot('192.168.1.1', 'test');
      assert.deepStrictEqual(snapshot, { a: 1, b: 2 });
    });

    it('should clear scene state', () => {
      const store = new StateStore();

      store.setSceneState('192.168.1.1', 'test', 'key', 'value');
      assert.ok(store.getScene('192.168.1.1', 'test'));

      const cleared = store.clearSceneState('192.168.1.1', 'test');
      assert.strictEqual(cleared, true);
      assert.strictEqual(store.getScene('192.168.1.1', 'test'), null);
    });

    it('should get all scenes for a device', () => {
      const store = new StateStore();

      store.setSceneState('192.168.1.1', 'scene1', 'key', 'val1');
      store.setSceneState('192.168.1.1', 'scene2', 'key', 'val2');
      store.setSceneState('192.168.1.1', 'scene3', 'key', 'val3');

      const scenes = store.getDeviceScenes('192.168.1.1');
      assert.deepStrictEqual(scenes.sort(), ['scene1', 'scene2', 'scene3']);
    });

    it('should set multiple scene properties at once', () => {
      const store = new StateStore();

      store.setSceneStateMultiple('192.168.1.1', 'test', {
        frameCount: 100,
        isRunning: true,
        lastUpdate: Date.now(),
      });

      assert.strictEqual(
        store.getSceneState('192.168.1.1', 'test', 'frameCount'),
        100
      );
      assert.strictEqual(
        store.getSceneState('192.168.1.1', 'test', 'isRunning'),
        true
      );
      assert.ok(store.getSceneState('192.168.1.1', 'test', 'lastUpdate') > 0);
    });

    it('should support method chaining for scene state', () => {
      const store = new StateStore();

      const result = store
        .setSceneState('192.168.1.1', 'test', 'a', 1)
        .setSceneState('192.168.1.1', 'test', 'b', 2);

      assert.strictEqual(result, store);
    });
  });

  describe('State Isolation', () => {
    it('should isolate state between different devices', () => {
      const store = new StateStore();

      store.setDeviceState('192.168.1.1', 'activeScene', 'scene1');
      store.setDeviceState('192.168.1.2', 'activeScene', 'scene2');

      assert.strictEqual(
        store.getDeviceState('192.168.1.1', 'activeScene'),
        'scene1'
      );
      assert.strictEqual(
        store.getDeviceState('192.168.1.2', 'activeScene'),
        'scene2'
      );
    });

    it('should isolate scene state between devices', () => {
      const store = new StateStore();

      store.setSceneState('192.168.1.1', 'startup', 'count', 10);
      store.setSceneState('192.168.1.2', 'startup', 'count', 20);

      assert.strictEqual(
        store.getSceneState('192.168.1.1', 'startup', 'count'),
        10
      );
      assert.strictEqual(
        store.getSceneState('192.168.1.2', 'startup', 'count'),
        20
      );
    });

    it('should isolate scene state between different scenes on same device', () => {
      const store = new StateStore();

      store.setSceneState('192.168.1.1', 'scene1', 'data', 'value1');
      store.setSceneState('192.168.1.1', 'scene2', 'data', 'value2');

      assert.strictEqual(
        store.getSceneState('192.168.1.1', 'scene1', 'data'),
        'value1'
      );
      assert.strictEqual(
        store.getSceneState('192.168.1.1', 'scene2', 'data'),
        'value2'
      );
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to global state changes', () => {
      const store = new StateStore();
      const changes = [];

      store.subscribe('global', (path, value) => {
        changes.push({ path, value });
      });

      store.setGlobal('test', 'value');

      assert.strictEqual(changes.length, 1);
      assert.strictEqual(changes[0].path, 'test');
      assert.strictEqual(changes[0].value, 'value');
    });

    it('should subscribe to device state changes', () => {
      const store = new StateStore();
      const changes = [];

      store.subscribe('device', (path, value) => {
        changes.push({ path, value });
      });

      store.setDeviceState('192.168.1.1', 'activeScene', 'startup');

      assert.ok(changes.length > 0);
      assert.ok(changes.some((c) => c.path.includes('activeScene')));
    });

    it('should subscribe to all state changes with wildcard', () => {
      const store = new StateStore();
      const changes = [];

      store.subscribe('*', (type, path, value) => {
        changes.push({ type, path, value });
      });

      store.setGlobal('global', 'val');
      store.setDeviceState('192.168.1.1', 'active', 'scene');
      store.setSceneState('192.168.1.1', 'test', 'key', 'value');

      assert.ok(changes.length >= 3);
      assert.ok(changes.some((c) => c.type === 'global'));
      assert.ok(changes.some((c) => c.type === 'device'));
      assert.ok(changes.some((c) => c.type === 'scene'));
    });

    it('should unsubscribe from state changes', () => {
      const store = new StateStore();
      const changes = [];

      const unsubscribe = store.subscribe('global', (path, value) => {
        changes.push({ path, value });
      });

      store.setGlobal('test1', 'value1');
      assert.strictEqual(changes.length, 1);

      unsubscribe();

      store.setGlobal('test2', 'value2');
      assert.strictEqual(changes.length, 1); // Still 1, not 2
    });
  });

  describe('Utility Methods', () => {
    it('should clear all state', () => {
      const store = new StateStore();

      store.setGlobal('global', 'value');
      store.setDeviceState('192.168.1.1', 'active', 'scene');
      store.setSceneState('192.168.1.1', 'test', 'key', 'value');

      store.clear();

      assert.strictEqual(store.globalState.size, 0);
      assert.strictEqual(store.deviceStates.size, 0);
      assert.strictEqual(store.sceneStates.size, 0);
    });

    it('should get complete state snapshot', () => {
      const store = new StateStore();

      store.setGlobal('version', '2.0.0');
      store.setDeviceState('192.168.1.1', 'activeScene', 'startup');
      store.setSceneState('192.168.1.1', 'startup', 'count', 10);

      const snapshot = store.getSnapshot();

      assert.ok(snapshot.global);
      assert.strictEqual(snapshot.global.version, '2.0.0');
      assert.ok(snapshot.devices['192.168.1.1']);
      assert.strictEqual(
        snapshot.devices['192.168.1.1'].activeScene,
        'startup'
      );
      assert.ok(snapshot.scenes['192.168.1.1::startup']);
      assert.strictEqual(snapshot.scenes['192.168.1.1::startup'].count, 10);
    });

    it('should get state statistics', () => {
      const store = new StateStore();

      store.setGlobal('a', 1);
      store.setGlobal('b', 2);
      store.initDevice('192.168.1.1');
      store.initDevice('192.168.1.2');
      store.setSceneState('192.168.1.1', 'scene1', 'key', 'val');
      store.setSceneState('192.168.1.1', 'scene2', 'key', 'val');

      const stats = store.getStats();

      assert.strictEqual(stats.globalKeys, 2);
      assert.strictEqual(stats.devices, 2);
      assert.strictEqual(stats.scenes, 2);
    });
  });

  // ============================================================================
  // Edge Cases (Phase 4)
  // ============================================================================

  describe('State Deletion', () => {
    it('should delete device state by setting to undefined', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      store.initDevice(deviceIp);
      store.setDeviceState(deviceIp, 'brightness', 75);
      assert.strictEqual(store.getDeviceState(deviceIp, 'brightness'), 75);

      // Delete by setting to undefined
      store.setDeviceState(deviceIp, 'brightness', undefined);
      assert.strictEqual(
        store.getDeviceState(deviceIp, 'brightness', 100),
        100
      );
    });

    it('should store undefined as a value in global state', () => {
      const store = new StateStore();

      store.setGlobal('testKey', 'testValue');
      assert.strictEqual(store.getGlobal('testKey'), 'testValue');

      // Setting to undefined stores undefined, doesn't delete
      store.setGlobal('testKey', undefined);
      assert.strictEqual(store.getGlobal('testKey'), undefined);
      // Fallback is only used if key doesn't exist
      assert.strictEqual(store.getGlobal('testKey', 'default'), undefined);
    });

    it('should store undefined as a value in scene state', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';
      const sceneName = 'clock';

      store.setSceneState(deviceIp, sceneName, 'counter', 42);
      assert.strictEqual(
        store.getSceneState(deviceIp, sceneName, 'counter'),
        42
      );

      // Setting to undefined stores undefined
      store.setSceneState(deviceIp, sceneName, 'counter', undefined);
      assert.strictEqual(
        store.getSceneState(deviceIp, sceneName, 'counter'),
        undefined
      );
    });
  });

  describe('State Merging and Partial Updates', () => {
    it('should support partial device state updates', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      store.initDevice(deviceIp);
      store.setDeviceState(deviceIp, 'brightness', 75);
      store.setDeviceState(deviceIp, 'displayOn', true);
      store.setDeviceState(deviceIp, 'activeScene', 'clock');

      // Partial update - only brightness
      store.setDeviceState(deviceIp, 'brightness', 50);

      // Other fields unchanged
      assert.strictEqual(store.getDeviceState(deviceIp, 'brightness'), 50);
      assert.strictEqual(store.getDeviceState(deviceIp, 'displayOn'), true);
      assert.strictEqual(
        store.getDeviceState(deviceIp, 'activeScene'),
        'clock'
      );
    });

    it('should handle complex nested objects in device state', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      const complexState = {
        metrics: {
          fps: 5,
          frametime: 200,
          pushCount: 1234,
        },
        settings: {
          brightness: 75,
          displayOn: true,
        },
      };

      store.initDevice(deviceIp);
      store.setDeviceState(deviceIp, 'deviceData', complexState);

      const retrieved = store.getDeviceState(deviceIp, 'deviceData');
      assert.deepStrictEqual(retrieved, complexState);
      assert.strictEqual(retrieved.metrics.fps, 5);
      assert.strictEqual(retrieved.settings.brightness, 75);
    });

    it('should merge arrays correctly', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      store.initDevice(deviceIp);
      store.setDeviceState(deviceIp, 'history', [1, 2, 3]);

      const history = store.getDeviceState(deviceIp, 'history');
      assert.deepStrictEqual(history, [1, 2, 3]);

      // Replace array (not merge - arrays are replaced, not merged)
      store.setDeviceState(deviceIp, 'history', [4, 5, 6]);
      const newHistory = store.getDeviceState(deviceIp, 'history');
      assert.deepStrictEqual(newHistory, [4, 5, 6]);
    });
  });

  describe('Large State Performance', () => {
    it('should handle large device state efficiently', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      store.initDevice(deviceIp);

      // Create large state object (~100KB)
      const largeData = new Array(1000).fill(null).map((_, i) => ({
        id: i,
        value: `value_${i}`,
        timestamp: Date.now(),
        nested: {
          field1: i * 2,
          field2: `nested_${i}`,
        },
      }));

      const startTime = Date.now();
      store.setDeviceState(deviceIp, 'largeData', largeData);
      const writeTime = Date.now() - startTime;

      assert.ok(writeTime < 100, `Write time ${writeTime}ms should be < 100ms`);

      const readStart = Date.now();
      const retrieved = store.getDeviceState(deviceIp, 'largeData');
      const readTime = Date.now() - readStart;

      assert.ok(readTime < 50, `Read time ${readTime}ms should be < 50ms`);
      assert.strictEqual(retrieved.length, 1000);
      assert.strictEqual(retrieved[0].id, 0);
      assert.strictEqual(retrieved[999].id, 999);
    });

    it('should handle many devices efficiently', () => {
      const store = new StateStore();
      const deviceCount = 100;

      const startTime = Date.now();

      // Initialize 100 devices
      for (let i = 0; i < deviceCount; i++) {
        const ip = `192.168.1.${i}`;
        store.initDevice(ip);
        store.setDeviceState(ip, 'brightness', 75);
        store.setDeviceState(ip, 'displayOn', true);
        store.setDeviceState(ip, 'activeScene', 'clock');
      }

      const totalTime = Date.now() - startTime;

      assert.ok(
        totalTime < 1000,
        `Initializing ${deviceCount} devices took ${totalTime}ms (should be < 1s)`
      );

      // Verify all devices stored correctly
      const stats = store.getStats();
      assert.strictEqual(stats.devices, deviceCount);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent reads during write', async () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      store.initDevice(deviceIp);
      store.setDeviceState(deviceIp, 'counter', 0);

      // Simulate concurrent operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(
          new Promise((resolve) => {
            store.setDeviceState(deviceIp, 'counter', i);
            const value = store.getDeviceState(deviceIp, 'counter');
            resolve(value);
          })
        );
      }

      const results = await Promise.all(operations);
      // All operations should succeed (no crashes)
      assert.strictEqual(results.length, 100);
      // Final value should be the last write
      assert.strictEqual(store.getDeviceState(deviceIp, 'counter'), 99);
    });

    it('should maintain state consistency during rapid updates', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      store.initDevice(deviceIp);

      // Rapid sequential updates
      for (let i = 0; i < 1000; i++) {
        store.setDeviceState(deviceIp, 'brightness', i % 101);
      }

      // State should be consistent
      const brightness = store.getDeviceState(deviceIp, 'brightness');
      assert.ok(brightness >= 0 && brightness <= 100);
    });
  });

  describe('Global vs Device State Isolation', () => {
    it('should keep global and device state separate', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      // Set same key in both global and device state
      store.setGlobal('activeScene', 'global_scene');
      store.initDevice(deviceIp);
      store.setDeviceState(deviceIp, 'activeScene', 'device_scene');

      // They should remain separate
      assert.strictEqual(store.getGlobal('activeScene'), 'global_scene');
      assert.strictEqual(
        store.getDeviceState(deviceIp, 'activeScene'),
        'device_scene'
      );
    });

    it('should not leak device state to other devices', () => {
      const store = new StateStore();
      const device1 = '192.168.1.100';
      const device2 = '192.168.1.200';

      store.initDevice(device1);
      store.initDevice(device2);

      store.setDeviceState(device1, 'brightness', 25);
      store.setDeviceState(device2, 'brightness', 75);

      assert.strictEqual(store.getDeviceState(device1, 'brightness'), 25);
      assert.strictEqual(store.getDeviceState(device2, 'brightness'), 75);
    });

    it('should not leak scene state between devices', () => {
      const store = new StateStore();
      const device1 = '192.168.1.100';
      const device2 = '192.168.1.200';

      store.setSceneState(device1, 'clock', 'counter', 10);
      store.setSceneState(device2, 'clock', 'counter', 20);

      assert.strictEqual(store.getSceneState(device1, 'clock', 'counter'), 10);
      assert.strictEqual(store.getSceneState(device2, 'clock', 'counter'), 20);
    });
  });

  describe('State Reset and Clear', () => {
    it('should clear all device state for a device', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      store.initDevice(deviceIp);
      store.setDeviceState(deviceIp, 'brightness', 75);
      store.setDeviceState(deviceIp, 'displayOn', true);
      store.setDeviceState(deviceIp, 'activeScene', 'clock');

      // Clear device state
      store.deviceStates.delete(deviceIp);

      // State should be gone
      assert.strictEqual(
        store.getDeviceState(deviceIp, 'brightness', null),
        null
      );
      assert.strictEqual(
        store.getDeviceState(deviceIp, 'displayOn', null),
        null
      );
      assert.strictEqual(
        store.getDeviceState(deviceIp, 'activeScene', null),
        null
      );
    });

    it('should clear specific scene state by deleting from sceneStates', () => {
      const store = new StateStore();
      const deviceIp = '192.168.1.100';

      store.setSceneState(deviceIp, 'clock', 'counter', 42);
      store.setSceneState(deviceIp, 'clock', 'lastUpdate', Date.now());

      // Verify state exists
      assert.strictEqual(store.getSceneState(deviceIp, 'clock', 'counter'), 42);

      // Clear scene state by deleting the composite key
      const sceneKey = `${deviceIp}::clock`;
      store.sceneStates.delete(sceneKey);

      // Scene state should be gone (fallback to default)
      assert.strictEqual(
        store.getSceneState(deviceIp, 'clock', 'counter', null),
        null
      );
      assert.strictEqual(
        store.getSceneState(deviceIp, 'clock', 'lastUpdate', null),
        null
      );
    });
  });
});
