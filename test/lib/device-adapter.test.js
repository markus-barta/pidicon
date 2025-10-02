/**
 * @fileoverview Tests for device-adapter.js
 * @description Comprehensive tests for device management, driver selection,
 * and context creation
 * @author Markus Barta (mba) with assistance from Cursor AI
 */

const assert = require('node:assert');
const { describe, it, beforeEach, afterEach } = require('node:test');

// Import the module - note: this will use the environment at require time
const deviceAdapter = require('../../lib/device-adapter');

describe('device-adapter', () => {
  // Store original env vars to restore after tests
  const originalEnv = {
    PIXOO_DEVICE_TARGETS: process.env.PIXOO_DEVICE_TARGETS,
    PIXOO_DEFAULT_DRIVER: process.env.PIXOO_DEFAULT_DRIVER,
    NODE_ENV: process.env.NODE_ENV,
  };

  afterEach(() => {
    // Restore original environment
    Object.assign(process.env, originalEnv);
  });

  describe('Module Exports', () => {
    it('should export required API functions', () => {
      assert.ok(typeof deviceAdapter.getDevice === 'function');
      assert.ok(typeof deviceAdapter.getContext === 'function');
      assert.ok(typeof deviceAdapter.setDriverForDevice === 'function');
      assert.ok(typeof deviceAdapter.getDriverForDevice === 'function');
      assert.ok(typeof deviceAdapter.resolveDriver === 'function');
    });

    it('should export devices Map', () => {
      assert.ok(deviceAdapter.devices instanceof Map);
    });

    it('should export deviceDrivers Map', () => {
      assert.ok(deviceAdapter.deviceDrivers instanceof Map);
    });

    it('should export ADVANCED_FEATURES', () => {
      assert.ok(deviceAdapter.ADVANCED_FEATURES);
      assert.ok(typeof deviceAdapter.ADVANCED_FEATURES === 'object');
      assert.ok(Object.isFrozen(deviceAdapter.ADVANCED_FEATURES));
    });
  });

  describe('ADVANCED_FEATURES Configuration', () => {
    it('should have all expected feature flags', () => {
      const { ADVANCED_FEATURES } = deviceAdapter;

      assert.ok('GRADIENT_RENDERING' in ADVANCED_FEATURES);
      assert.ok('ADVANCED_CHART' in ADVANCED_FEATURES);
      assert.ok('ENHANCED_TEXT' in ADVANCED_FEATURES);
      assert.ok('IMAGE_PROCESSING' in ADVANCED_FEATURES);
      assert.ok('ANIMATIONS' in ADVANCED_FEATURES);
      assert.ok('PERFORMANCE_MONITORING' in ADVANCED_FEATURES);
    });

    it('should be frozen (immutable)', () => {
      const { ADVANCED_FEATURES } = deviceAdapter;

      assert.ok(Object.isFrozen(ADVANCED_FEATURES));

      // Attempt to modify should fail silently in non-strict mode
      assert.doesNotThrow(() => {
        ADVANCED_FEATURES.NEW_FEATURE = true;
      });
      assert.ok(!('NEW_FEATURE' in ADVANCED_FEATURES));
    });

    it('should have boolean values for all features', () => {
      const { ADVANCED_FEATURES } = deviceAdapter;

      Object.values(ADVANCED_FEATURES).forEach((value) => {
        assert.strictEqual(typeof value, 'boolean');
      });
    });
  });

  describe('getDevice()', () => {
    beforeEach(() => {
      // Clear devices map before each test
      deviceAdapter.devices.clear();
    });

    it('should create a new device on first call', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');

      assert.ok(device);
      assert.strictEqual(device.host, '192.168.1.100');
      assert.ok(deviceAdapter.devices.has('192.168.1.100'));
    });

    it('should return existing device on subsequent calls', () => {
      const device1 = deviceAdapter.getDevice('192.168.1.100');
      const device2 = deviceAdapter.getDevice('192.168.1.100');

      assert.strictEqual(device1, device2);
      assert.strictEqual(deviceAdapter.devices.size, 1);
    });

    it('should create different devices for different hosts', () => {
      const device1 = deviceAdapter.getDevice('192.168.1.100');
      const device2 = deviceAdapter.getDevice('192.168.1.101');

      assert.notStrictEqual(device1, device2);
      assert.strictEqual(device1.host, '192.168.1.100');
      assert.strictEqual(device2.host, '192.168.1.101');
      assert.strictEqual(deviceAdapter.devices.size, 2);
    });

    it('should initialize device with correct driver', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');

      assert.ok(device.currentDriver);
      assert.ok(['real', 'mock'].includes(device.currentDriver));
    });

    it('should create device with canvas proxy', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');

      assert.ok(device.canvas);
      assert.ok(typeof device.drawPixel === 'function');
      assert.ok(typeof device.drawLine === 'function');
      assert.ok(typeof device.fillRect === 'function');
    });
  });

  describe('setDriverForDevice()', () => {
    beforeEach(() => {
      deviceAdapter.devices.clear();
      deviceAdapter.deviceDrivers.clear();
    });

    it('should set driver for new device', () => {
      const result = deviceAdapter.setDriverForDevice('192.168.1.100', 'mock');

      assert.strictEqual(result, 'mock');
      assert.strictEqual(
        deviceAdapter.deviceDrivers.get('192.168.1.100'),
        'mock',
      );
    });

    it('should normalize driver names', () => {
      const result1 = deviceAdapter.setDriverForDevice('192.168.1.100', 'REAL');
      const result2 = deviceAdapter.setDriverForDevice('192.168.1.101', 'Mock');
      const result3 = deviceAdapter.setDriverForDevice(
        '192.168.1.102',
        'invalid',
      );

      assert.strictEqual(result1, 'real');
      assert.strictEqual(result2, 'mock');
      assert.strictEqual(result3, 'mock'); // Invalid becomes mock
    });

    it('should switch driver for existing device', () => {
      // Create device with mock driver
      const device = deviceAdapter.getDevice('192.168.1.100');
      assert.strictEqual(device.currentDriver, 'mock');

      // Switch to real
      deviceAdapter.setDriverForDevice('192.168.1.100', 'real');

      assert.strictEqual(device.currentDriver, 'real');
    });

    it('should handle multiple devices independently', () => {
      deviceAdapter.setDriverForDevice('192.168.1.100', 'real');
      deviceAdapter.setDriverForDevice('192.168.1.101', 'mock');

      assert.strictEqual(
        deviceAdapter.deviceDrivers.get('192.168.1.100'),
        'real',
      );
      assert.strictEqual(
        deviceAdapter.deviceDrivers.get('192.168.1.101'),
        'mock',
      );
    });
  });

  describe('getDriverForDevice()', () => {
    beforeEach(() => {
      deviceAdapter.devices.clear();
      deviceAdapter.deviceDrivers.clear();
    });

    it('should return current driver for existing device', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');
      device.switchDriver('real');

      const driver = deviceAdapter.getDriverForDevice('192.168.1.100');

      assert.strictEqual(driver, 'real');
    });

    it('should resolve driver for non-existent device', () => {
      const driver = deviceAdapter.getDriverForDevice('192.168.1.199');

      assert.ok(['real', 'mock'].includes(driver));
    });
  });

  describe('getContext()', () => {
    beforeEach(() => {
      deviceAdapter.devices.clear();
    });

    it('should create context with device', () => {
      const ctx = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        null,
      );

      assert.ok(ctx.device);
      assert.strictEqual(ctx.device.host, '192.168.1.100');
    });

    it('should create context with state Map', () => {
      const ctx = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        { key1: 'value1', key2: 42 },
        null,
      );

      assert.ok(ctx.state instanceof Map);
      assert.strictEqual(ctx.state.get('key1'), 'value1');
      assert.strictEqual(ctx.state.get('key2'), 42);
    });

    it('should create context with environment info', () => {
      const ctx = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        null,
      );

      assert.ok(ctx.env);
      assert.strictEqual(ctx.env.width, 64);
      assert.strictEqual(ctx.env.height, 64);
      assert.strictEqual(ctx.env.host, '192.168.1.100');
    });

    it('should provide getState/setState functions', () => {
      const ctx = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        null,
      );

      assert.ok(typeof ctx.getState === 'function');
      assert.ok(typeof ctx.setState === 'function');

      // Test setState/getState
      ctx.setState('testKey', 'testValue');
      assert.strictEqual(ctx.getState('testKey'), 'testValue');
    });

    it('should return default value for missing state', () => {
      const ctx = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        null,
      );

      const value = ctx.getState('nonexistent', 'default');

      assert.strictEqual(value, 'default');
    });

    it('should persist state across context creations for same scene', () => {
      const ctx1 = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        null,
      );
      ctx1.setState('persistent', 'value');

      const ctx2 = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        null,
      );

      assert.strictEqual(ctx2.getState('persistent'), 'value');
    });

    it('should isolate state between different scenes', () => {
      const ctx1 = deviceAdapter.getContext(
        '192.168.1.100',
        'scene-a',
        {},
        null,
      );
      ctx1.setState('data', 'scene-a-data');

      const ctx2 = deviceAdapter.getContext(
        '192.168.1.100',
        'scene-b',
        {},
        null,
      );
      ctx2.setState('data', 'scene-b-data');

      assert.strictEqual(ctx1.getState('data'), 'scene-a-data');
      assert.strictEqual(ctx2.getState('data'), 'scene-b-data');
    });

    it('should include publishOk callback', () => {
      const mockPublishOk = () => {};
      const ctx = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        mockPublishOk,
      );

      assert.strictEqual(ctx.publishOk, mockPublishOk);
    });

    it('should include frametime from device metrics', () => {
      const ctx = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        null,
      );

      assert.ok('frametime' in ctx);
      assert.ok(typeof ctx.frametime === 'number');
    });
  });

  describe('Device Metrics', () => {
    beforeEach(() => {
      deviceAdapter.devices.clear();
    });

    it('should initialize metrics to zero', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');
      const metrics = device.getMetrics();

      assert.strictEqual(metrics.pushes, 0);
      assert.strictEqual(metrics.skipped, 0);
      assert.strictEqual(metrics.errors, 0);
      assert.ok('ts' in metrics);
    });

    it('should increment push count on successful push', async () => {
      const device = deviceAdapter.getDevice('192.168.1.100');

      await device.push();
      await device.push();

      const metrics = device.getMetrics();
      assert.strictEqual(metrics.pushes, 2);
    });

    it('should track frametime on push', async () => {
      const device = deviceAdapter.getDevice('192.168.1.100');

      await device.push();

      const metrics = device.getMetrics();
      assert.ok(typeof metrics.lastFrametime === 'number');
      assert.ok(metrics.lastFrametime >= 0);
    });
  });

  describe('Driver Switching', () => {
    beforeEach(() => {
      deviceAdapter.devices.clear();
    });

    it('should switch from mock to real driver', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');
      device.switchDriver('mock');
      assert.strictEqual(device.currentDriver, 'mock');

      device.switchDriver('real');

      assert.strictEqual(device.currentDriver, 'real');
    });

    it('should not recreate impl if driver unchanged', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');
      const impl1 = device.impl;

      device.switchDriver(device.currentDriver);
      const impl2 = device.impl;

      assert.strictEqual(impl1, impl2);
    });

    it('should normalize driver names when switching', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');

      device.switchDriver('REAL');
      assert.strictEqual(device.currentDriver, 'real');

      device.switchDriver('Mock');
      assert.strictEqual(device.currentDriver, 'mock');

      device.switchDriver('invalid');
      assert.strictEqual(device.currentDriver, 'mock');
    });
  });

  describe('Unified API Methods', () => {
    beforeEach(() => {
      deviceAdapter.devices.clear();
    });

    it('should expose unified drawing API', () => {
      const device = deviceAdapter.getDevice('192.168.1.100');

      assert.ok(typeof device.drawPixel === 'function');
      assert.ok(typeof device.drawLine === 'function');
      assert.ok(typeof device.fillRect === 'function');
      assert.ok(typeof device.drawRect === 'function');
      assert.ok(typeof device.drawText === 'function');
      assert.ok(typeof device.drawNumber === 'function');
      assert.ok(typeof device.drawImage === 'function');
    });

    it('should proxy unified API calls to canvas', async () => {
      const device = deviceAdapter.getDevice('192.168.1.100');

      // These should not throw (using correct array format)
      await assert.doesNotReject(async () => {
        await device.clear();
        await device.drawPixel([10, 10], [255, 0, 0, 255]);
        await device.drawLine([0, 0], [10, 10], [0, 255, 0, 255]);
        await device.fillRect([5, 5], [10, 10], [0, 0, 255, 255]);
        await device.push();
      });
    });
  });

  describe('Device Readiness', () => {
    beforeEach(() => {
      deviceAdapter.devices.clear();
    });

    it('should report mock devices as always ready', async () => {
      const device = deviceAdapter.getDevice('192.168.1.100');
      device.switchDriver('mock');

      const ready = await device.isReady();

      assert.strictEqual(ready, true);
    });
  });
});
