/**
 * @fileoverview Comprehensive State Persistence Tests
 * @description Tests that all UI state is properly persisted and restored
 * across daemon restarts and UI reloads
 * @author Markus Barta (mba) with assistance from Cursor AI
 */

/* eslint-disable max-lines-per-function */

const fs = require('fs');
const assert = require('node:assert');
const { describe, it, beforeEach, afterEach } = require('node:test');
const os = require('os');
const path = require('path');

describe('State Persistence - Full Integration', () => {
  let StateStore;
  let stateStore;
  let tempDir;
  let statePath;
  let allStateStores = []; // Track all instances for cleanup

  beforeEach(() => {
    // Create temporary directory for state file
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pidicon-state-test-'));
    statePath = path.join(tempDir, 'runtime-state.json');

    // Import StateStore
    StateStore = require('../../lib/state-store');

    // Create a silent logger to avoid async issues
    const silentLogger = {
      debug: () => {},
      info: () => {},
      ok: () => {},
      warn: () => {},
      error: () => {},
    };

    stateStore = new StateStore({
      logger: silentLogger,
      persistPath: statePath,
      debounceMs: 10, // Fast persistence for tests
    });
    allStateStores = [stateStore];
  });

  afterEach(async () => {
    // Clean up all StateStore instances
    for (const store of allStateStores) {
      if (store) {
        store.disablePersistence(); // This clears all timers
        await store.flush();
      }
    }
    allStateStores = [];

    // Wait for any pending async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to create and track StateStore instances
  function createStateStore(options = {}) {
    const silentLogger = {
      debug: () => {},
      info: () => {},
      ok: () => {},
      warn: () => {},
      error: () => {},
    };

    const store = new StateStore({
      logger: silentLogger,
      persistPath: statePath,
      debounceMs: 10,
      ...options,
    });
    allStateStores.push(store);
    return store;
  }

  describe('Device Display On/Off State', () => {
    it('should persist and restore displayOn state', async () => {
      const deviceIp = '192.168.1.100';

      // Set display OFF
      stateStore.setDeviceState(deviceIp, 'displayOn', false);

      // Force persistence
      await stateStore.flush();

      // Verify file was written
      assert.ok(fs.existsSync(statePath), 'State file should exist');

      // Create new StateStore instance (simulates daemon restart)
      const newStateStore = createStateStore();
      await newStateStore.restore();

      // Verify displayOn state is restored
      const displayOn = newStateStore.getDeviceState(deviceIp, 'displayOn');
      assert.strictEqual(
        displayOn,
        false,
        'displayOn should be restored as false',
      );
    });

    it('should persist and restore displayOn=true', async () => {
      const deviceIp = '192.168.1.100';

      // Set display ON explicitly
      stateStore.setDeviceState(deviceIp, 'displayOn', true);
      await stateStore.flush();

      // Restore in new instance
      const newStateStore = createStateStore();
      await newStateStore.restore();

      const displayOn = newStateStore.getDeviceState(deviceIp, 'displayOn');
      assert.strictEqual(
        displayOn,
        true,
        'displayOn should be restored as true',
      );
    });

    it('should default to true if never set', async () => {
      const deviceIp = '192.168.1.100';

      // Don't set anything, just restore
      await stateStore.restore();

      const displayOn = stateStore.getDeviceState(deviceIp, 'displayOn', true);
      assert.strictEqual(displayOn, true, 'displayOn should default to true');
    });
  });

  describe('Device Brightness State', () => {
    it('should persist and restore brightness level', async () => {
      const deviceIp = '192.168.1.100';
      const brightness = 75;

      // Set brightness
      stateStore.setDeviceState(deviceIp, 'brightness', brightness);
      await stateStore.flush();

      // Restore in new instance
      const newStateStore = createStateStore();
      await newStateStore.restore();

      const restoredBrightness = newStateStore.getDeviceState(
        deviceIp,
        'brightness',
      );
      assert.strictEqual(
        restoredBrightness,
        brightness,
        'Brightness should be restored correctly',
      );
    });

    it('should persist brightness=0', async () => {
      const deviceIp = '192.168.1.100';

      // Set brightness to 0
      stateStore.setDeviceState(deviceIp, 'brightness', 0);
      await stateStore.flush();

      // Restore
      const newStateStore = createStateStore();
      await newStateStore.restore();

      const brightness = newStateStore.getDeviceState(deviceIp, 'brightness');
      assert.strictEqual(brightness, 0, 'Brightness 0 should be restored');
    });

    it('should persist brightness=100', async () => {
      const deviceIp = '192.168.1.100';

      stateStore.setDeviceState(deviceIp, 'brightness', 100);
      await stateStore.flush();

      const newStateStore = createStateStore();
      await newStateStore.restore();

      const brightness = newStateStore.getDeviceState(deviceIp, 'brightness');
      assert.strictEqual(brightness, 100, 'Brightness 100 should be restored');
    });
  });

  describe('Active Scene State', () => {
    it('should persist and restore active scene', async () => {
      const deviceIp = '192.168.1.100';
      const sceneName = 'clock';

      // Set active scene
      stateStore.setDeviceState(deviceIp, 'activeScene', sceneName);
      await stateStore.flush();

      // Restore
      const newStateStore = createStateStore();
      await newStateStore.restore();

      const restoredScene = newStateStore.getDeviceState(
        deviceIp,
        'activeScene',
      );
      assert.strictEqual(
        restoredScene,
        sceneName,
        'Active scene should be restored',
      );
    });

    it('should handle scene changes', async () => {
      const deviceIp = '192.168.1.100';

      // Set initial scene
      stateStore.setDeviceState(deviceIp, 'activeScene', 'clock');
      await stateStore.flush();

      // Change scene
      stateStore.setDeviceState(deviceIp, 'activeScene', 'weather');
      await stateStore.flush();

      // Restore - should have latest
      const newStateStore = createStateStore();
      await newStateStore.restore();

      const scene = newStateStore.getDeviceState(deviceIp, 'activeScene');
      assert.strictEqual(scene, 'weather', 'Latest scene should be restored');
    });
  });

  describe('Play State', () => {
    it('should persist and restore play state', async () => {
      const deviceIp = '192.168.1.100';

      // Set to paused
      stateStore.setDeviceState(deviceIp, 'playState', 'paused');
      await stateStore.flush();

      // Restore
      const newStateStore = createStateStore();
      await newStateStore.restore();

      const playState = newStateStore.getDeviceState(deviceIp, 'playState');
      assert.strictEqual(playState, 'paused', 'Play state should be restored');
    });

    it('should persist playState=playing', async () => {
      const deviceIp = '192.168.1.100';

      stateStore.setDeviceState(deviceIp, 'playState', 'playing');
      await stateStore.flush();

      const newStateStore = createStateStore();
      await newStateStore.restore();

      const playState = newStateStore.getDeviceState(deviceIp, 'playState');
      assert.strictEqual(
        playState,
        'playing',
        'Playing state should be restored',
      );
    });
  });

  describe('Logging Level', () => {
    it('should persist and restore logging level', async () => {
      const deviceIp = '192.168.1.100';

      // Set logging level
      stateStore.setDeviceState(deviceIp, '__logging_level', 'error');
      await stateStore.flush();

      // Restore
      const newStateStore = createStateStore();
      await newStateStore.restore();

      const logLevel = newStateStore.getDeviceState(
        deviceIp,
        '__logging_level',
      );
      assert.strictEqual(logLevel, 'error', 'Logging level should be restored');
    });

    it('should handle all log levels', async () => {
      const deviceIp = '192.168.1.100';
      const levels = ['debug', 'info', 'warning', 'error', 'silent'];

      for (const level of levels) {
        stateStore.setDeviceState(deviceIp, '__logging_level', level);
        await stateStore.flush();

        const newStateStore = createStateStore();
        await newStateStore.restore();

        const restored = newStateStore.getDeviceState(
          deviceIp,
          '__logging_level',
        );
        assert.strictEqual(
          restored,
          level,
          `Log level ${level} should be restored`,
        );
      }
    });
  });

  describe('Multiple Devices', () => {
    it('should persist state for multiple devices independently', async () => {
      const device1 = '192.168.1.100';
      const device2 = '192.168.1.200';

      // Set different states for each device
      stateStore.setDeviceState(device1, 'displayOn', false);
      stateStore.setDeviceState(device1, 'brightness', 50);
      stateStore.setDeviceState(device1, 'activeScene', 'clock');

      stateStore.setDeviceState(device2, 'displayOn', true);
      stateStore.setDeviceState(device2, 'brightness', 100);
      stateStore.setDeviceState(device2, 'activeScene', 'weather');

      await stateStore.flush();

      // Restore
      const newStateStore = createStateStore();
      await newStateStore.restore();

      // Verify device 1
      assert.strictEqual(
        newStateStore.getDeviceState(device1, 'displayOn'),
        false,
      );
      assert.strictEqual(
        newStateStore.getDeviceState(device1, 'brightness'),
        50,
      );
      assert.strictEqual(
        newStateStore.getDeviceState(device1, 'activeScene'),
        'clock',
      );

      // Verify device 2
      assert.strictEqual(
        newStateStore.getDeviceState(device2, 'displayOn'),
        true,
      );
      assert.strictEqual(
        newStateStore.getDeviceState(device2, 'brightness'),
        100,
      );
      assert.strictEqual(
        newStateStore.getDeviceState(device2, 'activeScene'),
        'weather',
      );
    });
  });

  describe('Complete UI State Restoration', () => {
    it('should restore complete device state after UI reload', async () => {
      const deviceIp = '192.168.1.159';

      // Simulate complete device state (as set by UI)
      stateStore.setDeviceState(deviceIp, 'displayOn', false);
      stateStore.setDeviceState(deviceIp, 'brightness', 75);
      stateStore.setDeviceState(deviceIp, 'activeScene', 'power_price');
      stateStore.setDeviceState(deviceIp, 'playState', 'playing');
      stateStore.setDeviceState(deviceIp, '__logging_level', 'warning');

      await stateStore.flush();

      // Simulate UI reload (create new StateStore and restore)
      const restoredStateStore = createStateStore();
      await restoredStateStore.restore();

      // Verify ALL state is restored
      assert.strictEqual(
        restoredStateStore.getDeviceState(deviceIp, 'displayOn'),
        false,
        'displayOn not restored',
      );
      assert.strictEqual(
        restoredStateStore.getDeviceState(deviceIp, 'brightness'),
        75,
        'brightness not restored',
      );
      assert.strictEqual(
        restoredStateStore.getDeviceState(deviceIp, 'activeScene'),
        'power_price',
        'activeScene not restored',
      );
      assert.strictEqual(
        restoredStateStore.getDeviceState(deviceIp, 'playState'),
        'playing',
        'playState not restored',
      );
      assert.strictEqual(
        restoredStateStore.getDeviceState(deviceIp, '__logging_level'),
        'warning',
        'logging level not restored',
      );
    });

    it('should handle rapid state changes before UI reload', async () => {
      const deviceIp = '192.168.1.100';

      // Simulate rapid UI changes (user clicking around)
      stateStore.setDeviceState(deviceIp, 'brightness', 50);
      stateStore.setDeviceState(deviceIp, 'brightness', 60);
      stateStore.setDeviceState(deviceIp, 'brightness', 70);
      stateStore.setDeviceState(deviceIp, 'brightness', 80);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 50));
      await stateStore.flush();

      // Restore - should have latest value
      const newStateStore = createStateStore();
      await newStateStore.restore();

      const brightness = newStateStore.getDeviceState(deviceIp, 'brightness');
      assert.strictEqual(
        brightness,
        80,
        'Latest brightness value should be restored',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing state file gracefully', async () => {
      // Try to restore when no file exists
      const newStateStore = createStateStore({
        persistPath: path.join(tempDir, 'nonexistent.json'),
      });

      await newStateStore.restore();

      // Should not throw, should use defaults
      const displayOn = newStateStore.getDeviceState(
        '192.168.1.100',
        'displayOn',
        true,
      );
      assert.strictEqual(
        displayOn,
        true,
        'Should use default when no state file',
      );
    });

    it('should handle corrupted state file', async () => {
      // Write invalid JSON
      fs.writeFileSync(statePath, 'not valid json{]');

      const newStateStore = createStateStore();

      await newStateStore.restore();

      // Should not crash, should use defaults
      const displayOn = newStateStore.getDeviceState(
        '192.168.1.100',
        'displayOn',
        true,
      );
      assert.strictEqual(displayOn, true, 'Should handle corrupted file');
    });
  });

  describe('Persistence Timing', () => {
    it('should debounce writes correctly', async () => {
      const deviceIp = '192.168.1.100';
      let writeCount = 0;

      // Override flush to count writes
      const originalFlush = stateStore.flush.bind(stateStore);
      stateStore.flush = async () => {
        writeCount++;
        return originalFlush();
      };

      // Make multiple rapid changes
      for (let i = 0; i < 10; i++) {
        stateStore.setDeviceState(deviceIp, 'brightness', i * 10);
      }

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have written much fewer times than changes
      assert.ok(
        writeCount <= 2,
        `Should debounce writes (writeCount: ${writeCount})`,
      );
    });
  });
});
