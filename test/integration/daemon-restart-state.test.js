/**
 * @fileoverview Daemon Restart State Persistence Tests
 * @description Tests that verify state persistence across daemon restarts
 * with focus on displayOn (device power) state
 * @author Markus Barta (mba) with assistance from Cursor AI
 */

const fs = require('fs');
const assert = require('node:assert');
const { describe, it, beforeEach, afterEach } = require('node:test');
const os = require('os');
const path = require('path');

describe('Daemon Restart - State Persistence Integration', () => {
  let StateStore;
  let DeviceService;
  let SceneManager;
  let tempDir;
  let statePath;
  let allStateStores = [];

  beforeEach(() => {
    // Create temporary directory for state file
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'pidicon-daemon-restart-test-')
    );
    statePath = path.join(tempDir, 'runtime-state.json');

    // Import required modules
    StateStore = require('../../lib/state-store');
    DeviceService = require('../../lib/services/device-service');
    SceneManager = require('../../lib/scene-manager');
    // DeviceAdapter not used directly in tests, only imported for reference

    allStateStores = [];
  });

  afterEach(async () => {
    // Clean up all StateStore instances
    for (const store of allStateStores) {
      if (store) {
        store.disablePersistence();
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

  // Helper to create mock logger
  function createMockLogger() {
    return {
      debug: () => {},
      info: () => {},
      ok: () => {},
      warn: () => {},
      error: () => {},
    };
  }

  // Helper to create StateStore
  function createStateStore() {
    const store = new StateStore({
      logger: createMockLogger(),
      persistPath: statePath,
      debounceMs: 10, // Fast persistence for tests
    });
    allStateStores.push(store);
    return store;
  }

  // Helper to create DeviceService with mocked dependencies
  function createDeviceService(stateStore, sceneManager) {
    const mockDeviceAdapter = {
      setDriverForDevice: async () => {},
      getDriverForDevice: (_ip) => 'mock', // _ip prefix to indicate unused but required param
      getDevice: (ip) => ({
        ip,
        impl: {
          setPower: async () => ({ success: true }),
          setBrightness: async () => ({ success: true }),
          driverType: 'mock',
        },
        setPower: async (on) => ({ success: true, displayOn: on }),
        setBrightness: async (level) => ({
          success: true,
          brightness: level,
        }),
      }),
      getAllDevices: () => [],
    };

    return new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: mockDeviceAdapter,
      sceneManager,
      stateStore,
      softReset: async () => {},
    });
  }

  describe('Display Power State (displayOn) Across Restarts', () => {
    it('should persist displayOn=false and restore after daemon restart', async () => {
      const deviceIp = '192.168.1.100';

      // --- PHASE 1: Initial daemon run ---
      const stateStore1 = createStateStore();
      const sceneManager1 = new SceneManager({ logger: createMockLogger() });
      const deviceService1 = createDeviceService(stateStore1, sceneManager1);

      // Turn display OFF
      await deviceService1.setDisplayPower(deviceIp, false);

      // Verify state is set
      const displayOn1 = stateStore1.getDeviceState(deviceIp, 'displayOn');
      assert.strictEqual(
        displayOn1,
        false,
        'Display should be OFF in first daemon instance'
      );

      // Flush state to disk (simulate daemon shutdown)
      await stateStore1.flush();

      // Verify file was written
      assert.ok(fs.existsSync(statePath), 'State file should exist');
      const fileContent = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      assert.strictEqual(
        fileContent.devices[deviceIp].displayOn,
        false,
        'State file should contain displayOn=false'
      );

      // --- PHASE 2: Daemon restart ---
      const stateStore2 = createStateStore();
      await stateStore2.restore(); // Restore from disk

      const sceneManager2 = new SceneManager({
        logger: createMockLogger(),
        stateStore: stateStore2,
      });
      const deviceService2 = createDeviceService(stateStore2, sceneManager2);

      // Get persisted state
      const persistedState = stateStore2.getDeviceState(deviceIp, 'displayOn');
      assert.strictEqual(
        persistedState,
        false,
        'Restored state should have displayOn=false'
      );

      // Simulate rehydration (what daemon.js does)
      const rehydrateResult = await deviceService2.rehydrateFromState(
        deviceIp,
        {
          displayOn: false,
        }
      );

      assert.ok(
        rehydrateResult.applied.includes('displayOn'),
        'rehydrateFromState should apply displayOn'
      );

      // Verify final state
      const finalDisplayOn = stateStore2.getDeviceState(deviceIp, 'displayOn');
      assert.strictEqual(
        finalDisplayOn,
        false,
        'Display should still be OFF after rehydration'
      );
    });

    it('should persist displayOn=true and restore after daemon restart', async () => {
      const deviceIp = '192.168.1.100';

      // --- PHASE 1: Set display ON ---
      const stateStore1 = createStateStore();
      const sceneManager1 = new SceneManager({ logger: createMockLogger() });
      const deviceService1 = createDeviceService(stateStore1, sceneManager1);

      await deviceService1.setDisplayPower(deviceIp, true);
      await stateStore1.flush();

      // --- PHASE 2: Daemon restart ---
      const stateStore2 = createStateStore();
      await stateStore2.restore();

      const displayOn = stateStore2.getDeviceState(deviceIp, 'displayOn');
      assert.strictEqual(displayOn, true, 'Display should be ON after restore');
    });

    it('should handle multiple devices with different displayOn states', async () => {
      const device1 = '192.168.1.100';
      const device2 = '192.168.1.101';

      // --- PHASE 1: Set different states ---
      const stateStore1 = createStateStore();
      const sceneManager1 = new SceneManager({ logger: createMockLogger() });
      const deviceService1 = createDeviceService(stateStore1, sceneManager1);

      await deviceService1.setDisplayPower(device1, false); // Device 1 OFF
      await deviceService1.setDisplayPower(device2, true); // Device 2 ON
      await stateStore1.flush();

      // --- PHASE 2: Daemon restart ---
      const stateStore2 = createStateStore();
      await stateStore2.restore();

      const device1DisplayOn = stateStore2.getDeviceState(device1, 'displayOn');
      const device2DisplayOn = stateStore2.getDeviceState(device2, 'displayOn');

      assert.strictEqual(
        device1DisplayOn,
        false,
        'Device 1 should be OFF after restore'
      );
      assert.strictEqual(
        device2DisplayOn,
        true,
        'Device 2 should be ON after restore'
      );
    });

    it('should restore displayOn state AND apply it via rehydrateFromState', async () => {
      const deviceIp = '192.168.1.100';

      // --- PHASE 1: Setup ---
      const stateStore1 = createStateStore();
      const sceneManager1 = new SceneManager({ logger: createMockLogger() });
      const deviceService1 = createDeviceService(stateStore1, sceneManager1);

      await deviceService1.setDisplayPower(deviceIp, false);
      await stateStore1.flush();

      // --- PHASE 2: Simulate full daemon restart flow ---
      const stateStore2 = createStateStore();
      await stateStore2.restore(); // Step 1: Restore from disk

      // Step 2: Get snapshot (like daemon.js does)
      const snapshot = stateStore2.getSnapshot();
      const persistedDeviceState = snapshot.devices?.[deviceIp];

      assert.ok(persistedDeviceState, 'Snapshot should contain device state');
      assert.strictEqual(
        persistedDeviceState.displayOn,
        false,
        'Snapshot displayOn should be false'
      );

      // Step 3: Rehydrate (like daemon.js initializeDeployment)
      const sceneManager2 = new SceneManager({
        logger: createMockLogger(),
        stateStore: stateStore2,
      });
      const deviceService2 = createDeviceService(stateStore2, sceneManager2);

      const rehydrateResult = await deviceService2.rehydrateFromState(
        deviceIp,
        persistedDeviceState
      );

      assert.ok(
        rehydrateResult.applied.includes('displayOn'),
        'Should apply displayOn during rehydration'
      );

      // Step 4: Verify final state
      const finalState = stateStore2.getDeviceState(deviceIp, 'displayOn');
      assert.strictEqual(
        finalState,
        false,
        'Final state should be false after full restart flow'
      );
    });
  });

  describe('Brightness State Across Restarts', () => {
    it('should persist and restore brightness level', async () => {
      const deviceIp = '192.168.1.100';
      const testBrightness = 42;

      // --- PHASE 1: Set brightness ---
      const stateStore1 = createStateStore();
      const sceneManager1 = new SceneManager({ logger: createMockLogger() });
      const deviceService1 = createDeviceService(stateStore1, sceneManager1);

      await deviceService1.setDisplayBrightness(deviceIp, testBrightness);
      await stateStore1.flush();

      // --- PHASE 2: Daemon restart ---
      const stateStore2 = createStateStore();
      await stateStore2.restore();

      const brightness = stateStore2.getDeviceState(deviceIp, 'brightness');
      assert.strictEqual(
        brightness,
        testBrightness,
        'Brightness should be restored after restart'
      );
    });
  });

  describe('Combined State Persistence', () => {
    it('should persist and restore all device state together', async () => {
      const deviceIp = '192.168.1.100';

      // --- PHASE 1: Set all state ---
      const stateStore1 = createStateStore();
      const sceneManager1 = new SceneManager({ logger: createMockLogger() });
      const deviceService1 = createDeviceService(stateStore1, sceneManager1);

      await deviceService1.setDisplayPower(deviceIp, false);
      await deviceService1.setDisplayBrightness(deviceIp, 50);
      stateStore1.setDeviceState(deviceIp, 'activeScene', 'test-scene');
      stateStore1.setDeviceState(deviceIp, 'playState', 'paused');
      await stateStore1.flush();

      // --- PHASE 2: Daemon restart ---
      const stateStore2 = createStateStore();
      await stateStore2.restore();

      // Verify all state
      assert.strictEqual(
        stateStore2.getDeviceState(deviceIp, 'displayOn'),
        false,
        'displayOn should be restored'
      );
      assert.strictEqual(
        stateStore2.getDeviceState(deviceIp, 'brightness'),
        50,
        'brightness should be restored'
      );
      assert.strictEqual(
        stateStore2.getDeviceState(deviceIp, 'activeScene'),
        'test-scene',
        'activeScene should be restored'
      );
      assert.strictEqual(
        stateStore2.getDeviceState(deviceIp, 'playState'),
        'paused',
        'playState should be restored'
      );
    });
  });
});
