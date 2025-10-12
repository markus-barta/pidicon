/**
 * @fileoverview Tests for "Last Seen" tracking for real Pixoo devices
 * @description Verifies that lastSeenTs is correctly set when real hardware responds
 * @author Markus Barta (mba) with assistance from Cursor AI
 */

'use strict';

const assert = require('node:assert');
const { test, beforeEach, afterEach } = require('node:test');

test('device-adapter: lastSeenTs tracking', async (t) => {
  // Store original env to restore after tests
  const originalEnv = {
    PIXOO_DEVICE_TARGETS: process.env.PIXOO_DEVICE_TARGETS,
    PIXOO_DEFAULT_DRIVER: process.env.PIXOO_DEFAULT_DRIVER,
  };

  beforeEach(() => {
    // Clear require cache to get fresh module
    delete require.cache[require.resolve('../../lib/device-adapter')];
  });

  afterEach(() => {
    // Restore original environment
    Object.assign(process.env, originalEnv);
    // Clear require cache
    delete require.cache[require.resolve('../../lib/device-adapter')];
  });

  await t.test('should initialize lastSeenTs as null', () => {
    process.env.PIXOO_DEVICE_TARGETS = '192.168.1.100:real';
    const deviceAdapter = require('../../lib/device-adapter');

    const device = deviceAdapter.getDevice('192.168.1.100');
    const metrics = device.getMetrics();

    assert.strictEqual(
      metrics.lastSeenTs,
      null,
      'lastSeenTs should start as null',
    );
  });

  await t.test('should NOT set lastSeenTs for mock devices', async () => {
    process.env.PIXOO_DEVICE_TARGETS = '192.168.1.100:mock';
    const deviceAdapter = require('../../lib/device-adapter');

    const device = deviceAdapter.getDevice('192.168.1.100');
    const context = deviceAdapter.getContext(
      '192.168.1.100',
      'test-scene',
      {},
      () => {},
    );

    // Simulate a frame push
    await device.push('test-scene', context.publishOk);

    const metrics = device.getMetrics();
    assert.strictEqual(
      metrics.lastSeenTs,
      null,
      'Mock device should NOT set lastSeenTs',
    );
  });

  await t.test(
    'should set lastSeenTs for real devices on successful push',
    async () => {
      process.env.PIXOO_DEVICE_TARGETS = '192.168.1.100:real';
      const deviceAdapter = require('../../lib/device-adapter');

      const device = deviceAdapter.getDevice('192.168.1.100');
      const context = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        () => {},
      );

      const beforePush = Date.now();

      // Simulate a frame push
      await device.push('test-scene', context.publishOk);

      const afterPush = Date.now();
      const metrics = device.getMetrics();

      assert.notStrictEqual(
        metrics.lastSeenTs,
        null,
        'Real device should set lastSeenTs',
      );
      assert.ok(
        metrics.lastSeenTs >= beforePush && metrics.lastSeenTs <= afterPush,
        'lastSeenTs should be recent timestamp',
      );
    },
  );

  await t.test('should update lastSeenTs on each successful push', async () => {
    process.env.PIXOO_DEVICE_TARGETS = '192.168.1.100:real';
    const deviceAdapter = require('../../lib/device-adapter');

    const device = deviceAdapter.getDevice('192.168.1.100');
    const context = deviceAdapter.getContext(
      '192.168.1.100',
      'test-scene',
      {},
      () => {},
    );

    // First push
    await device.push('test-scene', context.publishOk);
    const firstTs = device.getMetrics().lastSeenTs;

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second push
    await device.push('test-scene', context.publishOk);
    const secondTs = device.getMetrics().lastSeenTs;

    assert.ok(secondTs > firstTs, 'lastSeenTs should update on each push');
  });

  await t.test(
    'should persist lastSeenTs across getMetrics calls',
    async () => {
      process.env.PIXOO_DEVICE_TARGETS = '192.168.1.100:real';
      const deviceAdapter = require('../../lib/device-adapter');

      const device = deviceAdapter.getDevice('192.168.1.100');
      const context = deviceAdapter.getContext(
        '192.168.1.100',
        'test-scene',
        {},
        () => {},
      );

      // Push a frame
      await device.push('test-scene', context.publishOk);

      const metrics1 = device.getMetrics();
      const metrics2 = device.getMetrics();

      assert.strictEqual(
        metrics1.lastSeenTs,
        metrics2.lastSeenTs,
        'lastSeenTs should persist across getMetrics calls',
      );
    },
  );

  await t.test('should track lastSeenTs independently per device', async () => {
    process.env.PIXOO_DEVICE_TARGETS = '192.168.1.100:real;192.168.1.101:real';
    const deviceAdapter = require('../../lib/device-adapter');

    const device1 = deviceAdapter.getDevice('192.168.1.100');
    const device2 = deviceAdapter.getDevice('192.168.1.101');
    const context1 = deviceAdapter.getContext(
      '192.168.1.100',
      'test-scene',
      {},
      () => {},
    );
    const context2 = deviceAdapter.getContext(
      '192.168.1.101',
      'test-scene',
      {},
      () => {},
    );

    // Push to device 1
    await device1.push('test-scene', context1.publishOk);
    const ts1 = device1.getMetrics().lastSeenTs;

    // Device 2 should still be null
    const ts2Before = device2.getMetrics().lastSeenTs;
    assert.strictEqual(
      ts2Before,
      null,
      'Device 2 should not have lastSeenTs yet',
    );

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Push to device 2
    await device2.push('test-scene', context2.publishOk);
    const ts2After = device2.getMetrics().lastSeenTs;

    assert.notStrictEqual(
      ts1,
      ts2After,
      'Devices should track lastSeenTs independently',
    );
    assert.ok(ts2After > ts1, 'Device 2 timestamp should be later');
  });
});
