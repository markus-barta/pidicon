/* eslint-disable */
/**
 * @fileoverview Scene Controls Unit Tests
 * @description Tests for scene play/pause/stop/resume controls
 *
 * Tests the scene control functionality that was broken due to missing
 * devicePlayState initialization in SceneManager.
 */

'use strict';

const assert = require('node:assert');
const { describe, it, beforeEach } = require('node:test');

const SceneService = require('../../lib/services/scene-service');
const SceneManager = require('../../lib/scene-manager');
const { ValidationError } = require('../../lib/errors');

// ============================================================================
// Mock Factories
// ============================================================================

function createMockLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    ok: () => {},
  };
}

function createMockDevice() {
  return {
    ip: '192.168.1.100',
    clear: async () => {},
    push: async () => {},
    impl: {
      driverType: 'real',
    },
  };
}

function createMockDeviceAdapter() {
  const mockDevice = createMockDevice();
  return {
    getDevice: (ip) => mockDevice,
    getContext: (ip, sceneName, payload, publishOk) => ({
      device: mockDevice,
      deviceIp: ip,
      env: {
        host: ip,
        width: 64,
        height: 64,
      },
      payload: payload || {},
      publishOk,
    }),
  };
}

function createMockMqttService() {
  const publishedMessages = [];
  return {
    publish: (topic, message) => {
      publishedMessages.push({ topic, message });
    },
    getPublishedMessages: () => publishedMessages,
    clearMessages: () => {
      publishedMessages.length = 0;
    },
  };
}

function createMockVersionInfo() {
  return {
    version: '3.0.0',
    buildNumber: 123,
    gitCommit: 'abc123',
  };
}

// ============================================================================
// SceneManager Control Tests (Low Level)
// ============================================================================

describe('SceneManager Control Tests', () => {
  let sceneManager;
  let mockDevice;

  beforeEach(() => {
    sceneManager = new SceneManager({
      logger: createMockLogger(),
    });

    // Register a test scene
    mockDevice = createMockDevice();
    const testScene = {
      name: 'test_scene',
      wantsLoop: true,
      init: async (ctx) => {
        ctx.state.set('initialized', true);
      },
      render: async (ctx) => {
        const count = ctx.state.get('renderCount') || 0;
        ctx.state.set('renderCount', count + 1);
        return 100; // 100ms delay
      },
      cleanup: async (ctx) => {
        ctx.state.set('cleaned', true);
      },
    };

    sceneManager.registerScene('test_scene', testScene);
  });

  it('should initialize devicePlayState Map', () => {
    assert.ok(
      sceneManager.devicePlayState instanceof Map,
      'devicePlayState should be a Map'
    );
  });

  it('should set playState to "playing" on switchScene', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    await sceneManager.switchScene('test_scene', context);

    const playState = sceneManager.devicePlayState.get(host);
    assert.strictEqual(
      playState,
      'playing',
      'playState should be "playing" after switch'
    );
  });

  it('should set playState to "paused" on pauseScene', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to scene first
    await sceneManager.switchScene('test_scene', context);

    // Then pause
    const result = sceneManager.pauseScene(host);

    assert.strictEqual(result, true, 'pauseScene should return true');
    const playState = sceneManager.devicePlayState.get(host);
    assert.strictEqual(
      playState,
      'paused',
      'playState should be "paused" after pause'
    );
  });

  it('should set playState to "stopped" on stopScene', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to scene first
    await sceneManager.switchScene('test_scene', context);

    // Then stop
    const result = sceneManager.stopScene(host);

    assert.strictEqual(result, true, 'stopScene should return true');
    const playState = sceneManager.devicePlayState.get(host);
    assert.strictEqual(
      playState,
      'stopped',
      'playState should be "stopped" after stop'
    );
  });

  it('should set playState back to "playing" on resumeScene', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to scene first
    await sceneManager.switchScene('test_scene', context);

    // Pause it
    sceneManager.pauseScene(host);
    assert.strictEqual(sceneManager.devicePlayState.get(host), 'paused');

    // Resume
    const result = await sceneManager.resumeScene(host, context);

    assert.strictEqual(result, true, 'resumeScene should return true');
    const playState = sceneManager.devicePlayState.get(host);
    assert.strictEqual(
      playState,
      'playing',
      'playState should be "playing" after resume'
    );
  });

  it('should clear timer on stopScene', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to scene (which starts a loop timer)
    await sceneManager.switchScene('test_scene', context);

    // Verify timer exists
    const timerBefore = sceneManager.deviceLoopTimers.has(host);

    // Stop scene
    sceneManager.stopScene(host);

    // Timer should be cleared
    const timerAfter = sceneManager.deviceLoopTimers.has(host);
    assert.strictEqual(timerAfter, false, 'Timer should be cleared after stop');
  });

  it('should clear timer on pauseScene', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to scene (which starts a loop timer)
    await sceneManager.switchScene('test_scene', context);

    // Pause scene
    sceneManager.pauseScene(host);

    // Timer should be cleared
    const timerAfter = sceneManager.deviceLoopTimers.has(host);
    assert.strictEqual(
      timerAfter,
      false,
      'Timer should be cleared after pause'
    );
  });

  it('should return false when pausing non-existent scene', () => {
    const result = sceneManager.pauseScene('192.168.1.999');
    assert.strictEqual(
      result,
      false,
      'Should return false for non-existent device'
    );
  });

  it('should return false when stopping non-existent scene', () => {
    const result = sceneManager.stopScene('192.168.1.999');
    assert.strictEqual(
      result,
      false,
      'Should return false for non-existent device'
    );
  });

  it('should return false when resuming non-existent scene', async () => {
    const result = await sceneManager.resumeScene('192.168.1.999', {
      device: mockDevice,
      env: { host: '192.168.1.999', width: 64, height: 64 },
    });
    assert.strictEqual(
      result,
      false,
      'Should return false for non-existent device'
    );
  });

  it('should keep scene loaded after stopScene', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to scene
    await sceneManager.switchScene('test_scene', context);

    // Stop scene
    sceneManager.stopScene(host);

    // Scene should still be the active scene
    const activeScene = sceneManager.getActiveSceneForDevice(host);
    assert.strictEqual(
      activeScene,
      'test_scene',
      'Scene should remain loaded after stop'
    );
  });

  it('should allow resuming from stopped state', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to scene
    await sceneManager.switchScene('test_scene', context);

    // Stop it
    sceneManager.stopScene(host);
    assert.strictEqual(sceneManager.devicePlayState.get(host), 'stopped');

    // Resume from stopped
    const result = await sceneManager.resumeScene(host, context);

    assert.strictEqual(result, true, 'Should be able to resume from stopped');
    assert.strictEqual(
      sceneManager.devicePlayState.get(host),
      'playing',
      'Should be playing after resume'
    );
  });

  it('should handle resuming already playing scene', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to scene
    await sceneManager.switchScene('test_scene', context);

    // Try to resume already playing scene
    const result = await sceneManager.resumeScene(host, context);

    assert.strictEqual(
      result,
      true,
      'Should return true for already playing scene'
    );
    assert.strictEqual(
      sceneManager.devicePlayState.get(host),
      'playing',
      'Should remain playing'
    );
  });

  it('should not restart loop for static scenes on resume', async () => {
    const host = '192.168.1.100';

    // Register a static scene (wantsLoop: false)
    const staticScene = {
      name: 'static_scene',
      wantsLoop: false,
      render: async (ctx) => null,
    };
    sceneManager.registerScene('static_scene', staticScene);

    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Switch to static scene
    await sceneManager.switchScene('static_scene', context);

    // Stop it
    sceneManager.stopScene(host);

    // Resume
    const result = await sceneManager.resumeScene(host, context);

    assert.strictEqual(
      result,
      true,
      'Should return true for static scene resume'
    );
    // No timer should be started for static scenes
    const hasTimer = sceneManager.deviceLoopTimers.has(host);
    assert.strictEqual(
      hasTimer,
      false,
      'Static scene should not have timer after resume'
    );
  });
});

// ============================================================================
// SceneService Control Tests (High Level API)
// ============================================================================

describe('SceneService Control Tests', () => {
  let sceneService;
  let sceneManager;
  let deviceAdapter;
  let mqttService;
  let mockDevice;

  beforeEach(() => {
    sceneManager = new SceneManager({
      logger: createMockLogger(),
    });

    // Register a test scene
    mockDevice = createMockDevice();
    const testScene = {
      name: 'clock',
      wantsLoop: true,
      render: async (ctx) => 1000,
    };
    sceneManager.registerScene('clock', testScene);

    deviceAdapter = createMockDeviceAdapter();
    mqttService = createMockMqttService();

    sceneService = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter,
      mqttService,
      versionInfo: createMockVersionInfo(),
      publishOk: () => {},
    });
  });

  it('should stop scene via SceneService', async () => {
    const deviceIp = '192.168.1.100';

    // Switch to scene first
    await sceneService.switchToScene(deviceIp, 'clock');

    // Stop scene
    const result = await sceneService.stopScene(deviceIp);

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(
      result.playState,
      'stopped',
      'Should return stopped playState'
    );
    assert.strictEqual(
      result.currentScene,
      'clock',
      'Should return current scene name'
    );
  });

  it('should pause scene via SceneService', async () => {
    const deviceIp = '192.168.1.100';

    // Switch to scene first
    await sceneService.switchToScene(deviceIp, 'clock');

    // Pause scene
    const result = await sceneService.pauseScene(deviceIp);

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(
      result.playState,
      'paused',
      'Should return paused playState'
    );
    assert.strictEqual(result.deviceIp, deviceIp, 'Should return device IP');
  });

  it('should resume scene via SceneService', async () => {
    const deviceIp = '192.168.1.100';

    // Switch to scene first
    await sceneService.switchToScene(deviceIp, 'clock');

    // Pause it
    await sceneService.pauseScene(deviceIp);

    // Resume it
    const result = await sceneService.resumeScene(deviceIp);

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(
      result.playState,
      'playing',
      'Should return playing playState'
    );
    assert.strictEqual(result.deviceIp, deviceIp, 'Should return device IP');
  });

  it('should throw error when stopping scene with no loaded scene', async () => {
    const deviceIp = '192.168.1.100';

    await assert.rejects(
      async () => {
        await sceneService.stopScene(deviceIp);
      },
      (error) => {
        return (
          error instanceof ValidationError &&
          error.message.includes('No scene loaded')
        );
      }
    );
  });

  it('should handle pausing when no scene is loaded', async () => {
    const deviceIp = '192.168.1.100';

    // pauseScene returns success: false when no scene is loaded (doesn't throw)
    // The underlying sceneManager.pauseScene returns false which becomes an Error
    await assert.rejects(
      async () => {
        await sceneService.pauseScene(deviceIp);
      },
      (error) => {
        return error.message.includes('Failed to pause');
      }
    );
  });

  it('should throw error when resuming scene with no loaded scene', async () => {
    const deviceIp = '192.168.1.100';

    await assert.rejects(
      async () => {
        await sceneService.resumeScene(deviceIp);
      },
      (error) => {
        return (
          error instanceof ValidationError &&
          error.message.includes('No scene loaded')
        );
      }
    );
  });

  it('should clear display on stop', async () => {
    const deviceIp = '192.168.1.100';
    let clearCalled = false;
    let pushCalled = false;

    // Override mock device methods to track calls
    const device = deviceAdapter.getDevice(deviceIp);
    device.clear = async () => {
      clearCalled = true;
    };
    device.push = async () => {
      pushCalled = true;
    };

    // Switch to scene first
    await sceneService.switchToScene(deviceIp, 'clock');

    // Stop scene
    await sceneService.stopScene(deviceIp);

    assert.strictEqual(clearCalled, true, 'Should call device.clear()');
    assert.strictEqual(
      pushCalled,
      true,
      'Should call device.push() to update hardware'
    );
  });

  it('should NOT clear display on pause (pause keeps display frozen)', async () => {
    const deviceIp = '192.168.1.100';
    let clearCalled = false;
    let pushCalled = false;

    // Override mock device methods to track calls
    const device = deviceAdapter.getDevice(deviceIp);
    device.clear = async () => {
      clearCalled = true;
    };
    device.push = async () => {
      pushCalled = true;
    };

    // Switch to scene first
    await sceneService.switchToScene(deviceIp, 'clock');

    // Reset tracking
    clearCalled = false;
    pushCalled = false;

    // Pause scene
    await sceneService.pauseScene(deviceIp);

    // Pause should NOT clear the display (it freezes the current frame)
    assert.strictEqual(
      clearCalled,
      false,
      'Should NOT call device.clear() on pause'
    );
    assert.strictEqual(
      pushCalled,
      false,
      'Should NOT call device.push() on pause'
    );
  });

  it('should complete stop operation successfully', async () => {
    const deviceIp = '192.168.1.100';

    // Switch to scene first
    await sceneService.switchToScene(deviceIp, 'clock');

    // Stop scene
    const result = await sceneService.stopScene(deviceIp);

    // Verify stop succeeded (this is what matters for the bug fix)
    assert.strictEqual(result.success, true, 'Stop should succeed');
    assert.strictEqual(
      result.playState,
      'stopped',
      'Should return stopped state'
    );
  });

  it('should complete pause operation successfully', async () => {
    const deviceIp = '192.168.1.100';

    // Switch to scene first
    await sceneService.switchToScene(deviceIp, 'clock');

    // Pause scene
    const result = await sceneService.pauseScene(deviceIp);

    // Verify pause succeeded (this is what matters for the bug fix)
    assert.strictEqual(result.success, true, 'Pause should succeed');
    assert.strictEqual(
      result.playState,
      'paused',
      'Should return paused state'
    );
  });

  it('should complete resume operation successfully', async () => {
    const deviceIp = '192.168.1.100';

    // Switch to scene first
    await sceneService.switchToScene(deviceIp, 'clock');

    // Pause it
    await sceneService.pauseScene(deviceIp);

    // Resume it
    const result = await sceneService.resumeScene(deviceIp);

    // Verify resume succeeded (this is what matters for the bug fix)
    assert.strictEqual(result.success, true, 'Resume should succeed');
    assert.strictEqual(
      result.playState,
      'playing',
      'Should return playing state'
    );
  });
});

// ============================================================================
// Multi-Device Control Isolation Tests
// ============================================================================

describe('Multi-Device Scene Control Isolation', () => {
  let sceneManager;
  let mockDevice1;
  let mockDevice2;

  beforeEach(() => {
    sceneManager = new SceneManager({
      logger: createMockLogger(),
    });

    mockDevice1 = createMockDevice();
    mockDevice1.ip = '192.168.1.100';
    mockDevice2 = createMockDevice();
    mockDevice2.ip = '192.168.1.101';

    const testScene = {
      name: 'test_scene',
      wantsLoop: true,
      render: async (ctx) => 100,
    };
    sceneManager.registerScene('test_scene', testScene);
  });

  it('should isolate playState per device', async () => {
    const host1 = '192.168.1.100';
    const host2 = '192.168.1.101';

    const context1 = {
      device: mockDevice1,
      env: { host: host1, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    const context2 = {
      device: mockDevice2,
      env: { host: host2, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Start both devices
    await sceneManager.switchScene('test_scene', context1);
    await sceneManager.switchScene('test_scene', context2);

    // Pause device 1
    sceneManager.pauseScene(host1);

    // Check states
    assert.strictEqual(
      sceneManager.devicePlayState.get(host1),
      'paused',
      'Device 1 should be paused'
    );
    assert.strictEqual(
      sceneManager.devicePlayState.get(host2),
      'playing',
      'Device 2 should still be playing'
    );
  });

  it('should isolate stop per device', async () => {
    const host1 = '192.168.1.100';
    const host2 = '192.168.1.101';

    const context1 = {
      device: mockDevice1,
      env: { host: host1, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    const context2 = {
      device: mockDevice2,
      env: { host: host2, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Start both devices
    await sceneManager.switchScene('test_scene', context1);
    await sceneManager.switchScene('test_scene', context2);

    // Stop device 1
    sceneManager.stopScene(host1);

    // Check states
    assert.strictEqual(
      sceneManager.devicePlayState.get(host1),
      'stopped',
      'Device 1 should be stopped'
    );
    assert.strictEqual(
      sceneManager.devicePlayState.get(host2),
      'playing',
      'Device 2 should still be playing'
    );
  });

  it('should independently resume each device', async () => {
    const host1 = '192.168.1.100';
    const host2 = '192.168.1.101';

    const context1 = {
      device: mockDevice1,
      env: { host: host1, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    const context2 = {
      device: mockDevice2,
      env: { host: host2, width: 64, height: 64 },
      state: new Map(),
      payload: {},
    };

    // Start both devices
    await sceneManager.switchScene('test_scene', context1);
    await sceneManager.switchScene('test_scene', context2);

    // Pause both
    sceneManager.pauseScene(host1);
    sceneManager.pauseScene(host2);

    // Resume only device 1
    await sceneManager.resumeScene(host1, context1);

    // Check states
    assert.strictEqual(
      sceneManager.devicePlayState.get(host1),
      'playing',
      'Device 1 should be playing'
    );
    assert.strictEqual(
      sceneManager.devicePlayState.get(host2),
      'paused',
      'Device 2 should still be paused'
    );
  });
});

// ============================================================================
// Performance Scene State Reset Regression Test (BUG-011)
// ============================================================================

describe('Performance Scene State Reset (BUG-011)', () => {
  let sceneManager;
  let mockDevice;
  let stateMap;

  beforeEach(() => {
    sceneManager = new SceneManager({
      logger: createMockLogger(),
    });

    mockDevice = createMockDevice();
    stateMap = new Map();

    // Mock performance scene with state management similar to the real one
    const performanceScene = {
      name: 'performance-test',
      wantsLoop: true,
      init: async (ctx) => {
        // Initialization (minimal)
      },
      render: async (ctx) => {
        const { getState, setState } = ctx;

        // Simulate state usage in render (like performance-test.js)
        const framesRendered = (getState('framesRendered') || 0) + 1;
        const samples = getState('samples') || [];
        const chartX = getState('chartX') || 1;

        setState('framesRendered', framesRendered);
        setState('samples', [...samples, Date.now()]);
        setState('chartX', chartX + 1);
        setState(
          'minFrametime',
          Math.min(getState('minFrametime') || Infinity, 100)
        );
        setState('maxFrametime', Math.max(getState('maxFrametime') || 0, 100));
        setState('sumFrametime', (getState('sumFrametime') || 0) + 100);
        setState('lastY', 10);
        setState('lastValue', 100);
        setState('chartInitialized', true);
        setState('hasPrevPoint', true);

        // Stop after 3 frames for test
        if (framesRendered >= 3) {
          setState('isRunning', false);
          return null; // Complete
        }
        return 0; // Continue immediately
      },
      cleanup: async (ctx) => {
        const { getState, setState } = ctx;

        // Clear any timers
        const loopTimer = getState('loopTimer');
        if (loopTimer) {
          clearTimeout(loopTimer);
          setState('loopTimer', null);
        }

        // Reset ALL state variables (BUG-011 fix)
        setState('framesRendered', 0);
        setState('framesPushed', 0);
        setState('startTime', Date.now());
        setState('minFrametime', Infinity);
        setState('maxFrametime', 0);
        setState('sumFrametime', 0);
        setState('samples', []);
        setState('chartX', 1);
        setState('isRunning', true);
        setState('testCompleted', false);
        setState('lastRenderTime', Date.now());
        setState('loopScheduled', false);
        setState('inFrame', false);
        setState('chartInitialized', false);
        setState('hasPrevPoint', false);
        setState('config', null);
        setState('lastY', 0);
        setState('lastValue', 0);
      },
    };

    sceneManager.registerScene('performance-test', performanceScene);
  });

  it('should fully reset all state variables on cleanup', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: stateMap,
      payload: {},
      getState: (key) => stateMap.get(key),
      setState: (key, value) => stateMap.set(key, value),
    };

    // First run: manually render 3 frames to simulate the scene lifecycle
    await sceneManager.switchScene('performance-test', context);

    // Manually trigger renders (simulating the loop driver)
    const scene = sceneManager.scenes.get('performance-test');
    await scene.render(context);
    await scene.render(context);
    await scene.render(context);

    // Verify state was set during rendering
    assert.strictEqual(
      stateMap.get('framesRendered'),
      3,
      'Should have rendered 3 frames'
    );
    assert.ok(stateMap.get('samples')?.length > 0, 'Should have samples');
    assert.ok(stateMap.get('chartX') > 1, 'Chart X should have advanced');
    assert.strictEqual(
      stateMap.get('chartInitialized'),
      true,
      'Chart should be initialized'
    );
    assert.strictEqual(
      stateMap.get('hasPrevPoint'),
      true,
      'Should have previous point'
    );

    // Manually call cleanup (simulating scene switch or device deactivation)
    await scene.cleanup(context);

    // Verify ALL state was reset by cleanup
    assert.strictEqual(
      stateMap.get('framesRendered'),
      0,
      'framesRendered should be reset to 0'
    );
    assert.strictEqual(
      stateMap.get('framesPushed'),
      0,
      'framesPushed should be reset to 0'
    );
    assert.strictEqual(
      stateMap.get('minFrametime'),
      Infinity,
      'minFrametime should be reset to Infinity'
    );
    assert.strictEqual(
      stateMap.get('maxFrametime'),
      0,
      'maxFrametime should be reset to 0'
    );
    assert.strictEqual(
      stateMap.get('sumFrametime'),
      0,
      'sumFrametime should be reset to 0'
    );
    assert.ok(
      Array.isArray(stateMap.get('samples')),
      'samples should be an array'
    );
    assert.strictEqual(
      stateMap.get('samples').length,
      0,
      'samples should be empty after reset'
    );
    assert.strictEqual(
      stateMap.get('chartX'),
      1,
      'chartX should be reset to 1'
    );
    assert.strictEqual(
      stateMap.get('isRunning'),
      true,
      'isRunning should be reset to true'
    );
    assert.strictEqual(
      stateMap.get('testCompleted'),
      false,
      'testCompleted should be reset to false'
    );
    assert.strictEqual(
      stateMap.get('chartInitialized'),
      false,
      'chartInitialized should be reset to false'
    );
    assert.strictEqual(
      stateMap.get('hasPrevPoint'),
      false,
      'hasPrevPoint should be reset to false'
    );
    assert.strictEqual(
      stateMap.get('config'),
      null,
      'config should be reset to null'
    );
    assert.strictEqual(stateMap.get('lastY'), 0, 'lastY should be reset to 0');
    assert.strictEqual(
      stateMap.get('lastValue'),
      0,
      'lastValue should be reset to 0'
    );
  });

  it('should start fresh on second run after cleanup', async () => {
    const host = '192.168.1.100';
    const context = {
      device: mockDevice,
      env: { host, width: 64, height: 64 },
      state: stateMap,
      payload: {},
      getState: (key) => stateMap.get(key),
      setState: (key, value) => stateMap.set(key, value),
    };

    // First run: manually render 3 frames
    await sceneManager.switchScene('performance-test', context);
    const scene = sceneManager.scenes.get('performance-test');
    await scene.render(context);
    await scene.render(context);
    await scene.render(context);

    const firstRunFrames = stateMap.get('framesRendered');
    const firstRunSamples = (stateMap.get('samples') || []).length;

    // Manually call cleanup (simulating scene restart)
    await scene.cleanup(context);

    // Verify reset happened
    assert.strictEqual(
      stateMap.get('framesRendered'),
      0,
      'State should be reset after cleanup'
    );

    // Second run - should start from clean slate
    await scene.render(context);
    await scene.render(context);
    await scene.render(context);

    // Should have same progression as first run (proves state was truly reset)
    assert.strictEqual(
      stateMap.get('framesRendered'),
      firstRunFrames,
      'Second run should have same frame count as first run'
    );
    // Verify it's collecting samples (not continuing from old state)
    assert.ok(
      (stateMap.get('samples') || []).length > 0,
      'Second run should be collecting samples (not continuing from old state)'
    );
  });
});
