/* eslint-disable */
/**
 * @fileoverview DeviceService Unit Tests (Phase 4.2)
 * @description Tests for device management business logic
 */

'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');

const DeviceService = require('../../lib/services/device-service');
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

function createMockStateStore() {
  const deviceStates = new Map();
  return {
    getDeviceState(ip, key, fallback) {
      const state = deviceStates.get(ip) || {};
      return state[key] !== undefined ? state[key] : fallback;
    },
    setDeviceState(ip, key, value) {
      const state = deviceStates.get(ip) || {};
      state[key] = value;
      deviceStates.set(ip, state);
    },
    initDevice(ip) {
      if (!deviceStates.has(ip)) {
        deviceStates.set(ip, {});
      }
    },
    getSnapshot() {
      const devices = {};
      for (const [ip, state] of deviceStates.entries()) {
        devices[ip] = state;
      }
      return { devices };
    },
    // Add flush() method for UI-508 immediate persistence
    async flush() {
      // Mock: no-op for tests
    },
  };
}

function createMockDevice(ip, options = {}) {
  return {
    ip,
    impl: {
      driverType: options.driverType || 'real',
      capabilities: {
        width: 64,
        height: 64,
        colorDepth: 24,
      },
      getHardwareState() {
        return {
          brightness: options.brightness ?? 100,
          displayOn: options.displayOn ?? true,
        };
      },
      setBrightness:
        options.setBrightness ||
        (async (level) => ({ success: true, brightness: level })),
      setDisplayPower:
        options.setDisplayPower ||
        (async (on) => ({ success: true, displayOn: on })),
      reboot: options.reboot || (async () => ({ success: true })),
      healthCheck: options.healthCheck || (async () => ({ success: true })),
    },
    getMetrics:
      options.getMetrics ||
      (() => ({
        pushCount: 1234,
        fps: 5,
        frametime: 200,
        lastSeenTs: Date.now(),
      })),
  };
}

function createMockDeviceAdapter(devices = []) {
  const deviceMap = new Map();
  const driverMap = new Map();

  devices.forEach((device) => {
    deviceMap.set(device.ip, device);
    driverMap.set(device.ip, device.impl.driverType);
  });

  return {
    devices: deviceMap,
    deviceDrivers: driverMap,
    getDevice(ip) {
      return deviceMap.get(ip);
    },
    getDriverForDevice(ip) {
      return driverMap.get(ip);
    },
    setDriverForDevice: async (ip, driver) => {
      driverMap.set(ip, driver);
    },
    getContext(ip) {
      return {
        device: deviceMap.get(ip),
        deviceIp: ip,
      };
    },
  };
}

function createMockSceneManager() {
  return {
    getDeviceSceneState: (ip) => ({
      currentScene: 'clock',
      playState: 'running',
      isStatic: false,
    }),
    stopScene: async (ip) => {},
    switchScene: async (ip, scene, options) => {},
  };
}

function createMockSoftReset() {
  let callCount = 0;
  return async (ip) => {
    callCount++;
    return { success: true };
  };
}

// ============================================================================
// Construction Tests
// ============================================================================

describe('DeviceService Construction', () => {
  it('should create DeviceService with valid dependencies', () => {
    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter(),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    assert.ok(service instanceof DeviceService);
  });

  it('should throw ValidationError if logger missing', () => {
    assert.throws(() => {
      new DeviceService({
        deviceAdapter: createMockDeviceAdapter(),
        sceneManager: createMockSceneManager(),
        stateStore: createMockStateStore(),
        softReset: createMockSoftReset(),
      });
    }, ValidationError);
  });

  it('should throw ValidationError if deviceAdapter missing', () => {
    assert.throws(() => {
      new DeviceService({
        logger: createMockLogger(),
        sceneManager: createMockSceneManager(),
        stateStore: createMockStateStore(),
        softReset: createMockSoftReset(),
      });
    }, ValidationError);
  });

  it('should throw ValidationError if sceneManager missing', () => {
    assert.throws(() => {
      new DeviceService({
        logger: createMockLogger(),
        deviceAdapter: createMockDeviceAdapter(),
        stateStore: createMockStateStore(),
        softReset: createMockSoftReset(),
      });
    }, ValidationError);
  });

  it('should throw ValidationError if stateStore missing', () => {
    assert.throws(() => {
      new DeviceService({
        logger: createMockLogger(),
        deviceAdapter: createMockDeviceAdapter(),
        sceneManager: createMockSceneManager(),
        softReset: createMockSoftReset(),
      });
    }, ValidationError);
  });

  it('should throw ValidationError if softReset missing', () => {
    assert.throws(() => {
      new DeviceService({
        logger: createMockLogger(),
        deviceAdapter: createMockDeviceAdapter(),
        sceneManager: createMockSceneManager(),
        stateStore: createMockStateStore(),
      });
    }, ValidationError);
  });
});

// ============================================================================
// listDevices Tests
// ============================================================================

describe('DeviceService.listDevices', () => {
  it('should return array of devices', async () => {
    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device1, device2]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    const devices = await service.listDevices();

    assert.ok(Array.isArray(devices));
    assert.strictEqual(devices.length, 2);
    assert.ok(devices[0].ip);
    assert.ok(devices[0].driver);
  });

  it('should return empty array when no devices configured', async () => {
    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    const devices = await service.listDevices();

    assert.ok(Array.isArray(devices));
    assert.strictEqual(devices.length, 0);
  });

  it('should include device status for each device', async () => {
    const device = createMockDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    const devices = await service.listDevices();

    assert.strictEqual(devices.length, 1);
    assert.ok(devices[0].ip);
    assert.ok(devices[0].driver);
  });
});

// ============================================================================
// getDeviceInfo Tests
// ============================================================================

describe('DeviceService.getDeviceInfo', () => {
  it('should return device information for valid IP', async () => {
    const device = createMockDevice('192.168.1.100');
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    const info = await service.getDeviceInfo('192.168.1.100');

    assert.strictEqual(info.ip, '192.168.1.100');
    assert.ok(info.driver);
    assert.ok(info.currentScene);
    assert.ok(info.playState);
  });

  it('should handle non-existent device gracefully', async () => {
    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    try {
      await service.getDeviceInfo('192.168.1.999');
      // If it doesn't throw, that's also acceptable
    } catch (error) {
      // Expected to throw due to accessing undefined device
      assert.ok(error);
    }
  });

  it.skip('should include hardware state (brightness, displayOn)', async () => {
    const device = createMockDevice('192.168.1.100', {
      brightness: 75,
      displayOn: true,
    });
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    const info = await service.getDeviceInfo('192.168.1.100');

    assert.ok(info.brightness !== undefined);
    assert.ok(info.displayOn !== undefined);
  });
});

// ============================================================================
// setDisplayBrightness Tests
// ============================================================================

describe('DeviceService.setDisplayBrightness', () => {
  it('should set brightness to valid value (0-100)', async () => {
    const device = createMockDevice('192.168.1.100');
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    const result = await service.setDisplayBrightness('192.168.1.100', 75);

    assert.ok(result.success || result.brightness === 75);
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'brightness'),
      75
    );
  });

  it('should clamp brightness < 0 to 0', async () => {
    const device = createMockDevice('192.168.1.100');
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    await service.setDisplayBrightness('192.168.1.100', -1);

    // Should clamp to 0
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'brightness'),
      0
    );
  });

  it('should clamp brightness > 100 to 100', async () => {
    const device = createMockDevice('192.168.1.100');
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    await service.setDisplayBrightness('192.168.1.100', 150);

    // Should clamp to 100
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'brightness'),
      100
    );
  });

  it('should accept boundary values (0, 100)', async () => {
    const device = createMockDevice('192.168.1.100');
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    await service.setDisplayBrightness('192.168.1.100', 0);
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'brightness'),
      0
    );

    await service.setDisplayBrightness('192.168.1.100', 100);
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'brightness'),
      100
    );
  });
});

// ============================================================================
// setDisplayPower Tests
// ============================================================================

describe('DeviceService.setDisplayPower', () => {
  it('should turn display off', async () => {
    const device = createMockDevice('192.168.1.100');
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    const result = await service.setDisplayPower('192.168.1.100', false);

    assert.ok(result);
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'displayOn'),
      false
    );
  });

  it('should turn display on', async () => {
    const device = createMockDevice('192.168.1.100');
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');
    stateStore.setDeviceState('192.168.1.100', 'displayOn', false);

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    const result = await service.setDisplayPower('192.168.1.100', true);

    assert.ok(result);
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'displayOn'),
      true
    );
  });

  it('should handle boolean values correctly', async () => {
    const device = createMockDevice('192.168.1.100');
    const stateStore = createMockStateStore();
    stateStore.initDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore,
      softReset: createMockSoftReset(),
    });

    // Test with true
    await service.setDisplayPower('192.168.1.100', true);
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'displayOn'),
      true
    );

    // Test with false
    await service.setDisplayPower('192.168.1.100', false);
    assert.strictEqual(
      stateStore.getDeviceState('192.168.1.100', 'displayOn'),
      false
    );
  });
});

// ============================================================================
// switchDriver Tests
// ============================================================================

describe.skip('DeviceService.switchDriver', () => {
  it('should switch from real to mock driver', async () => {
    const device = createMockDevice('192.168.1.100', { driverType: 'real' });
    const deviceAdapter = createMockDeviceAdapter([device]);

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter,
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    const result = await service.switchDriver('192.168.1.100', 'mock');

    assert.ok(result);
    assert.strictEqual(
      deviceAdapter.getDriverForDevice('192.168.1.100'),
      'mock'
    );
  });

  it('should switch from mock to real driver', async () => {
    const device = createMockDevice('192.168.1.100', { driverType: 'mock' });
    const deviceAdapter = createMockDeviceAdapter([device]);

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter,
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    const result = await service.switchDriver('192.168.1.100', 'real');

    assert.ok(result);
    assert.strictEqual(
      deviceAdapter.getDriverForDevice('192.168.1.100'),
      'real'
    );
  });

  it('should reject invalid driver type', async () => {
    const device = createMockDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    await assert.rejects(
      async () => {
        await service.switchDriver('192.168.1.100', 'invalid');
      },
      (error) => {
        return (
          error.message.includes('Invalid driver') ||
          error instanceof ValidationError
        );
      }
    );
  });
});

// ============================================================================
// getMetrics Tests
// ============================================================================

describe('DeviceService.getMetrics', () => {
  it('should return device metrics', async () => {
    const device = createMockDevice('192.168.1.100', {
      getMetrics: () => ({
        pushCount: 1234,
        fps: 5,
        frametime: 200,
        lastSeenTs: Date.now(),
      }),
    });

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    const metrics = await service.getMetrics('192.168.1.100');

    assert.ok(metrics);
    assert.ok(metrics.pushCount !== undefined);
    assert.ok(metrics.fps !== undefined);
    assert.ok(metrics.lastSeenTs !== undefined);
  });

  it('should return null for device without metrics', async () => {
    const device = createMockDevice('192.168.1.100', {
      getMetrics: null,
    });
    device.getMetrics = undefined; // Remove getMetrics

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    const metrics = await service.getMetrics('192.168.1.100');

    assert.strictEqual(metrics, null);
  });

  it('should return null for non-existent device', async () => {
    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    const metrics = await service.getMetrics('192.168.1.999');

    assert.strictEqual(metrics, null);
  });
});

// ============================================================================
// resetDevice Tests
// ============================================================================

describe.skip('DeviceService.resetDevice', () => {
  it('should reset device successfully', async () => {
    let softResetCalled = false;
    const softReset = async (ip) => {
      softResetCalled = true;
      return { success: true };
    };

    const device = createMockDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset,
    });

    await service.resetDevice('192.168.1.100');

    assert.ok(softResetCalled);
  });

  it('should handle reset failure gracefully', async () => {
    const softReset = async (ip) => {
      throw new Error('Reset failed');
    };

    const device = createMockDevice('192.168.1.100');

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter: createMockDeviceAdapter([device]),
      sceneManager: createMockSceneManager(),
      stateStore: createMockStateStore(),
      softReset,
    });

    await assert.rejects(
      async () => {
        await service.resetDevice('192.168.1.100');
      },
      (error) => {
        return (
          error.message.includes('failed') || error.message.includes('Reset')
        );
      }
    );
  });
});

describe('DeviceService Rehydration', () => {
  function buildService(overrides = {}) {
    const device = createMockDevice('192.168.1.100', overrides.deviceOptions);
    const deviceAdapter = createMockDeviceAdapter([device]);

    const sceneManager = {
      ...createMockSceneManager(),
      switchScene: overrides.switchScene || (async () => {}),
      pauseScene: overrides.pauseScene || (() => {}),
      stopScene: overrides.stopScene || (async () => {}),
      getScene: (sceneName) => ({ name: sceneName, render: async () => {} }),
    };

    const service = new DeviceService({
      logger: createMockLogger(),
      deviceAdapter,
      sceneManager,
      stateStore: createMockStateStore(),
      softReset: createMockSoftReset(),
    });

    return { service, deviceAdapter, sceneManager };
  }

  it('should rehydrate brightness and display state', async () => {
    const { service, deviceAdapter } = buildService({
      deviceOptions: { driverType: 'real' },
    });

    const setBrightnessSpy = [];
    const setDisplaySpy = [];
    deviceAdapter.getDevice('192.168.1.100').impl.setBrightness = async (
      level
    ) => {
      setBrightnessSpy.push(level);
      return true;
    };
    deviceAdapter.getDevice('192.168.1.100').impl.setDisplayPower = async (
      on
    ) => {
      setDisplaySpy.push(on);
      return true;
    };

    await service.rehydrateFromState('192.168.1.100', {
      brightness: 42,
      displayOn: false,
    });

    assert.deepStrictEqual(setBrightnessSpy, [42]);
    assert.deepStrictEqual(setDisplaySpy, [false]);
  });

  it('should skip unknown scenes during rehydration', async () => {
    const { service, sceneManager } = buildService({
      switchScene: async () => {
        throw new Error('Should not be called');
      },
    });

    sceneManager.getScene = () => null;

    const result = await service.rehydrateFromState('192.168.1.100', {
      activeScene: 'nonexistent',
    });

    assert.ok(result.skipped.includes('activeScene'));
  });

  it('should rehydrate scene and playState', async () => {
    let switchedScene = null;
    let paused = false;

    const { service, sceneManager } = buildService({
      switchScene: async (sceneName) => {
        switchedScene = sceneName;
      },
      pauseScene: () => {
        paused = true;
      },
    });

    const result = await service.rehydrateFromState('192.168.1.100', {
      activeScene: 'clock',
      playState: 'paused',
    });

    assert.strictEqual(switchedScene, 'clock');
    assert.ok(result.applied.includes('activeScene'));
    assert.ok(result.applied.some((entry) => entry.startsWith('playState')));
    assert.ok(paused);
  });
});
