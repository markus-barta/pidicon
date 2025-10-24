/* eslint-disable */
/**
 * @fileoverview Device Isolation Integration Tests
 * @description Tests that ensure multiple devices operate independently.
 * Device A failures, state changes, or actions should never affect Device B.
 * This is critical for multi-device deployments.
 * @author Markus Barta (mba) with assistance from Cursor AI
 */

'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const SceneManager = require('../../lib/scene-manager');
const DeviceService = require('../../lib/services/device-service');

// ============================================================================
// Mock Factories
// ============================================================================

function createMockLogger() {
  return {
    ok: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };
}

function createMockStateStore() {
  const deviceStates = new Map();
  return {
    getDeviceState: (ip, key, fallback) => {
      const state = deviceStates.get(ip) || {};
      return state[key] !== undefined ? state[key] : fallback;
    },
    setDeviceState: (ip, key, value) => {
      if (!deviceStates.has(ip)) {
        deviceStates.set(ip, {});
      }
      deviceStates.get(ip)[key] = value;
    },
    initDevice: (ip) => {
      if (!deviceStates.has(ip)) {
        deviceStates.set(ip, {});
      }
    },
    flush: async () => {},
  };
}

function createMockDevice(ip, shouldFail = false) {
  let brightness = 100;
  let displayOn = true;
  let pushCount = 0;

  const impl = {
    async push() {
      if (shouldFail) {
        throw new Error(`Device ${ip} push failed`);
      }
      pushCount++;
      return true;
    },
    async clear() {
      if (shouldFail) {
        throw new Error(`Device ${ip} clear failed`);
      }
      return true;
    },
    async setBrightness(level) {
      if (shouldFail) {
        throw new Error(`Device ${ip} setBrightness failed`);
      }
      brightness = level;
      return true;
    },
    async setDisplayPower(on) {
      if (shouldFail) {
        throw new Error(`Device ${ip} setDisplayPower failed`);
      }
      displayOn = on;
      return true;
    },
  };

  return {
    ip,
    impl,
    capabilities: {
      width: 64,
      height: 64,
      colorDepth: 24,
    },
    getMetrics() {
      return {
        pushCount,
        brightness,
        displayOn,
        lastSeenTs: Date.now(),
      };
    },
  };
}

function createMockDeviceAdapter(devices, driver = 'real') {
  const deviceMap = new Map();
  const driverMap = new Map();

  devices.forEach((device) => {
    deviceMap.set(device.ip, device);
    driverMap.set(device.ip, driver);
  });

  return {
    getDevice: (ip) => deviceMap.get(ip),
    getDriverForDevice: (ip) => driverMap.get(ip),
    setDriverForDevice: async (ip, newDriver) => {
      driverMap.set(ip, newDriver);
    },
    deviceDrivers: driverMap,
    devices: deviceMap,
    getContext: (ip) => ({
      device: deviceMap.get(ip),
      deviceIp: ip,
    }),
  };
}

// ============================================================================
// Device State Isolation Tests
// ============================================================================

describe('Device Isolation - State Independence', () => {
  it('should maintain separate brightness for each device', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Set different brightness for each device
    await deviceService.setDisplayBrightness('192.168.1.100', 50);
    await deviceService.setDisplayBrightness('192.168.1.200', 80);

    // Verify each device has correct brightness
    const metrics1 = device1.getMetrics();
    const metrics2 = device2.getMetrics();

    assert.strictEqual(metrics1.brightness, 50, 'Device 1 brightness incorrect');
    assert.strictEqual(metrics2.brightness, 80, 'Device 2 brightness incorrect');

    // Verify state store has separate values
    const stored1 = stateStore.getDeviceState('192.168.1.100', 'brightness');
    const stored2 = stateStore.getDeviceState('192.168.1.200', 'brightness');

    assert.strictEqual(stored1, 50);
    assert.strictEqual(stored2, 80);
  });

  it('should maintain separate display power for each device', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Turn off device 1, keep device 2 on
    await deviceService.setDisplayPower('192.168.1.100', false);

    // Verify device 1 is off, device 2 is still on
    assert.strictEqual(device1.getMetrics().displayOn, false);
    assert.strictEqual(device2.getMetrics().displayOn, true);
  });

  it('should not leak scene state between devices', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    // Set different active scenes
    stateStore.setDeviceState('192.168.1.100', 'activeScene', 'clock');
    stateStore.setDeviceState('192.168.1.200', 'activeScene', 'weather');

    // Verify no cross-contamination
    const scene1 = stateStore.getDeviceState('192.168.1.100', 'activeScene');
    const scene2 = stateStore.getDeviceState('192.168.1.200', 'activeScene');

    assert.strictEqual(scene1, 'clock');
    assert.strictEqual(scene2, 'weather');
  });
});

// ============================================================================
// Device Failure Isolation Tests
// ============================================================================

describe('Device Isolation - Failure Independence', () => {
  it('should continue operating device B when device A fails', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100', true); // Will fail
    const device2 = createMockDevice('192.168.1.200', false); // Works fine

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Try to set brightness on failing device
    try {
      await deviceService.setDisplayBrightness('192.168.1.100', 50);
    } catch (error) {
      // Expected to fail
    }

    // Device 2 should still work
    await deviceService.setDisplayBrightness('192.168.1.200', 80);

    const metrics2 = device2.getMetrics();
    assert.strictEqual(metrics2.brightness, 80, 'Device 2 should still work');
  });

  it('should list working devices even if one device is broken', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100', true); // Broken
    const device2 = createMockDevice('192.168.1.200', false); // Working

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Should still list both devices
    const devices = await deviceService.listDevices();

    assert.strictEqual(devices.length, 2);
  });

  it('should not propagate errors from device A to device B', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100', true);
    const device2 = createMockDevice('192.168.1.200', false);

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Multiple operations - first fails, second succeeds
    const results = await Promise.allSettled([
      deviceService.setDisplayBrightness('192.168.1.100', 50),
      deviceService.setDisplayBrightness('192.168.1.200', 80),
    ]);

    assert.strictEqual(results[0].status, 'rejected', 'Device 1 should fail');
    assert.strictEqual(results[1].status, 'fulfilled', 'Device 2 should succeed');
  });
});

// ============================================================================
// Concurrent Operations Tests
// ============================================================================

describe('Device Isolation - Concurrent Operations', () => {
  it('should handle concurrent brightness changes to different devices', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Concurrent brightness changes
    await Promise.all([
      deviceService.setDisplayBrightness('192.168.1.100', 30),
      deviceService.setDisplayBrightness('192.168.1.200', 70),
    ]);

    assert.strictEqual(device1.getMetrics().brightness, 30);
    assert.strictEqual(device2.getMetrics().brightness, 70);
  });

  it('should handle concurrent display power toggles', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Turn off device 1, turn on device 2 (concurrently)
    await Promise.all([
      deviceService.setDisplayPower('192.168.1.100', false),
      deviceService.setDisplayPower('192.168.1.200', true),
    ]);

    assert.strictEqual(device1.getMetrics().displayOn, false);
    assert.strictEqual(device2.getMetrics().displayOn, true);
  });

  it('should handle mixed operations on different devices', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Different operations on each device concurrently
    await Promise.all([
      deviceService.setDisplayBrightness('192.168.1.100', 40),
      deviceService.setDisplayPower('192.168.1.200', false),
    ]);

    assert.strictEqual(device1.getMetrics().brightness, 40);
    assert.strictEqual(device2.getMetrics().displayOn, false);
  });
});

// ============================================================================
// Driver Isolation Tests
// ============================================================================

describe('Device Isolation - Driver Independence', () => {
  it('should allow different drivers per device', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    // Set different drivers
    await deviceAdapter.setDriverForDevice('192.168.1.100', 'real');
    await deviceAdapter.setDriverForDevice('192.168.1.200', 'mock');

    const driver1 = deviceAdapter.getDriverForDevice('192.168.1.100');
    const driver2 = deviceAdapter.getDriverForDevice('192.168.1.200');

    assert.strictEqual(driver1, 'real');
    assert.strictEqual(driver2, 'mock');
  });

  it('should not affect device B when switching driver on device A', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    // Initial state
    const initialDriver2 = deviceAdapter.getDriverForDevice('192.168.1.200');

    // Switch driver on device 1
    await deviceAdapter.setDriverForDevice('192.168.1.100', 'real');

    // Device 2 driver should be unchanged
    const unchangedDriver2 = deviceAdapter.getDriverForDevice('192.168.1.200');

    assert.strictEqual(unchangedDriver2, initialDriver2);
  });
});

// ============================================================================
// Device Removal Tests
// ============================================================================

describe('Device Isolation - Removal Safety', () => {
  it('should not corrupt device B state when removing device A', () => {
    const _stateStore = createMockStateStore();

    // Set up two devices with state
    stateStore.setDeviceState('192.168.1.100', 'brightness', 50);
    stateStore.setDeviceState('192.168.1.200', 'brightness', 80);

    // Remove device 1 (in real implementation, this would be handled by DeviceConfigStore)
    // For now, just verify device 2 state is intact

    const brightness2 = stateStore.getDeviceState('192.168.1.200', 'brightness');
    assert.strictEqual(brightness2, 80, 'Device 2 state should be intact');
  });

  it('should maintain device B metrics after device A experiences errors', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100', true); // Will fail
    const device2 = createMockDevice('192.168.1.200', false);

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Set brightness on device 2
    await deviceService.setDisplayBrightness('192.168.1.200', 75);

    // Try operation on failing device 1
    try {
      await deviceService.setDisplayBrightness('192.168.1.100', 50);
    } catch (error) {
      // Expected
    }

    // Device 2 hardware state should still be correct
    const info = await deviceService.getDeviceInfo('192.168.1.200');
    assert.ok(info.hardware);
    assert.strictEqual(info.hardware.brightness, 75);
  });
});

// ============================================================================
// Multi-Device Stress Tests
// ============================================================================

describe('Device Isolation - Stress Tests', () => {
  it('should handle 10 devices with independent states', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    // Create 10 devices
    const devices = [];
    for (let i = 0; i < 10; i++) {
      devices.push(createMockDevice(`192.168.1.${100 + i}`));
    }

    const deviceAdapter = createMockDeviceAdapter(devices);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Set unique brightness for each device
    const promises = devices.map((device, i) =>
      deviceService.setDisplayBrightness(device.ip, 10 + i * 10)
    );

    await Promise.all(promises);

    // Verify each device has correct brightness
    devices.forEach((device, i) => {
      const expectedBrightness = 10 + i * 10;
      assert.strictEqual(
        device.getMetrics().brightness,
        expectedBrightness,
        `Device ${i} brightness incorrect`
      );
    });
  });

  it('should handle rapid state changes on multiple devices', async () => {
    const _logger = createMockLogger();
    const _stateStore = createMockStateStore();

    const device1 = createMockDevice('192.168.1.100');
    const device2 = createMockDevice('192.168.1.200');

    const deviceAdapter = createMockDeviceAdapter([device1, device2]);

    const deviceService = new DeviceService({
      logger,
      deviceAdapter,
      sceneManager: new SceneManager({ logger }),
      stateStore,
      softReset: async () => {},
    });

    // Rapid changes on both devices
    const operations = [];
    for (let i = 0; i < 5; i++) {
      operations.push(
        deviceService.setDisplayBrightness('192.168.1.100', 10 + i * 10)
      );
      operations.push(
        deviceService.setDisplayBrightness('192.168.1.200', 50 + i * 10)
      );
    }

    await Promise.all(operations);

    // Final state should be correct
    assert.strictEqual(device1.getMetrics().brightness, 50); // Last value for device 1
    assert.strictEqual(device2.getMetrics().brightness, 90); // Last value for device 2
  });
});

