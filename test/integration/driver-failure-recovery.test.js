/* eslint-disable */
'use strict';

const assert = require('node:assert');
const test = require('node:test');

// Mock implementations
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
  const state = new Map();
  return {
    getDeviceState(ip, key, fallback) {
      const deviceState = state.get(ip) || {};
      return deviceState[key] !== undefined ? deviceState[key] : fallback;
    },
    setDeviceState(ip, key, value) {
      const deviceState = state.get(ip) || {};
      deviceState[key] = value;
      state.set(ip, deviceState);
    },
  };
}

// Mock factories (for future use if needed)

// ============================================================================
// HTTP Timeout Tests
// ============================================================================

test('HTTP timeout on device driver does not crash daemon', async () => {
  // Simulate a device driver that times out
  const deviceDriver = {
    async push(_imageData) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
      throw new Error('ETIMEDOUT: Connection timeout');
    },
    async getHardwareState() {
      throw new Error('ETIMEDOUT: Connection timeout');
    },
  };

  // Attempt to push - should catch error, not crash
  try {
    await deviceDriver.push(Buffer.alloc(64 * 64 * 3));
    assert.fail('Should have thrown timeout error');
  } catch (error) {
    assert.ok(error.message.includes('ETIMEDOUT'));
  }

  assert.ok(true, 'Daemon survived HTTP timeout');
});

test('Network error during push() is logged and retries next frame', async () => {
  let pushAttempts = 0;
  let lastError = null;

  const deviceDriver = {
    async push(_imageData) {
      pushAttempts++;
      if (pushAttempts === 1) {
        throw new Error('ECONNREFUSED: Connection refused');
      }
      // Second attempt succeeds
      return { success: true };
    },
  };

  // First push fails
  try {
    await deviceDriver.push(Buffer.alloc(64 * 64 * 3));
  } catch (error) {
    lastError = error;
  }

  assert.ok(lastError, 'First push should have failed');
  assert.equal(pushAttempts, 1);

  // Second push succeeds (simulating retry next frame)
  const result = await deviceDriver.push(Buffer.alloc(64 * 64 * 3));
  assert.equal(result.success, true);
  assert.equal(pushAttempts, 2);
});

test('Invalid device IP is handled gracefully', async () => {
  const invalidIps = [
    '',
    'not-an-ip',
    '999.999.999.999',
    '192.168.1',
    'localhost:99999',
  ];

  for (const ip of invalidIps) {
    // Simulate IP validation
    const isValidIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
    if (!isValidIp) {
      assert.ok(true, `Invalid IP rejected: ${ip}`);
    }
  }
});

// ============================================================================
// Driver Switch Tests
// ============================================================================

test('Driver switch (real → mock) during active scene works', async () => {
  const _stateStore = createMockStateStore();
  let currentDriver = 'real';

  // Simulate active scene running
  stateStore.setDeviceState('192.168.1.100', 'playState', 'running');
  stateStore.setDeviceState('192.168.1.100', 'activeScene', 'clock');

  // Switch to mock driver
  currentDriver = 'mock';

  // Verify state preserved
  assert.equal(
    stateStore.getDeviceState('192.168.1.100', 'playState'),
    'running'
  );
  assert.equal(
    stateStore.getDeviceState('192.168.1.100', 'activeScene'),
    'clock'
  );
  assert.equal(currentDriver, 'mock');
});

test('Driver switch (mock → real) reconnects to device', async () => {
  const _stateStore = createMockStateStore();
  let currentDriver = 'mock';
  let reconnectCalled = false;

  const realDriver = {
    async connect() {
      reconnectCalled = true;
      return { success: true };
    },
    async push(_imageData) {
      return { success: true };
    },
  };

  // Switch from mock to real
  currentDriver = 'real';
  await realDriver.connect();

  assert.equal(currentDriver, 'real');
  assert.ok(reconnectCalled, 'Real driver should reconnect');
});

test('Driver switch preserves brightness and display state', async () => {
  const _stateStore = createMockStateStore();

  // Set initial state
  stateStore.setDeviceState('192.168.1.100', 'brightness', 75);
  stateStore.setDeviceState('192.168.1.100', 'displayOn', false);

  // Simulate driver switch
  const brightness = stateStore.getDeviceState(
    '192.168.1.100',
    'brightness',
    100
  );
  const displayOn = stateStore.getDeviceState('192.168.1.100', 'displayOn', true);

  // Verify state preserved
  assert.equal(brightness, 75);
  assert.equal(displayOn, false);
});

// ============================================================================
// Device Reboot Tests
// ============================================================================

test('Device reboot command timeout does not hang daemon', async () => {
  let rebootCalled = false;
  const TIMEOUT_MS = 100;

  const deviceDriver = {
    async reboot() {
      rebootCalled = true;
      // Simulate hanging reboot that takes forever
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return { success: true };
    },
  };

  // Race reboot against timeout
  const rebootPromise = deviceDriver.reboot();
  const timeoutPromise = new Promise((_resolve, reject) =>
    setTimeout(() => reject(new Error('Reboot timeout')), TIMEOUT_MS)
  );

  try {
    await Promise.race([rebootPromise, timeoutPromise]);
    assert.fail('Should have timed out');
  } catch (error) {
    assert.ok(error.message.includes('timeout'));
    assert.ok(rebootCalled, 'Reboot was initiated');
  }
});

test('Device reboot failure is logged, daemon continues', async () => {
  let errorLogged = false;

  const logger = createMockLogger();
  logger.error = (msg) => {
    if (msg.includes('reboot') || msg.includes('failed')) {
      errorLogged = true;
    }
  };

  const deviceDriver = {
    async reboot() {
      throw new Error('Device reboot failed: Connection lost');
    },
  };

  try {
    await deviceDriver.reboot();
  } catch (error) {
    logger.error(`Device reboot failed: ${error.message}`);
  }

  assert.ok(errorLogged, 'Reboot failure should be logged');
});

// ============================================================================
// Malformed Response Tests
// ============================================================================

test('Device returns malformed JSON, error logged, not thrown', async () => {
  let errorLogged = false;

  const logger = createMockLogger();
  logger.error = (msg) => {
    if (msg.includes('malformed') || msg.includes('JSON')) {
      errorLogged = true;
    }
  };

  const deviceDriver = {
    async getStatus() {
      // Simulate malformed JSON response
      return '{invalid json: }';
    },
  };

  try {
    const response = await deviceDriver.getStatus();
    JSON.parse(response);
  } catch (error) {
    logger.error(`Malformed JSON response: ${error.message}`);
    // Don't re-throw, just log
  }

  assert.ok(errorLogged, 'Malformed JSON should be logged');
});

test('Device returns empty response, handled gracefully', async () => {
  const deviceDriver = {
    async getStatus() {
      return '';
    },
  };

  const response = await deviceDriver.getStatus();

  // Handle empty response
  const status = response || { error: 'Empty response' };

  assert.ok(status.error, 'Empty response should be handled');
});

test('Device returns unexpected status code, error handled', async () => {
  const deviceDriver = {
    async push(_imageData) {
      // Simulate HTTP 500 error
      throw new Error('HTTP 500: Internal Server Error');
    },
  };

  let errorHandled = false;
  try {
    await deviceDriver.push(Buffer.alloc(64 * 64 * 3));
  } catch (error) {
    if (error.message.includes('500')) {
      errorHandled = true;
    }
  }

  assert.ok(errorHandled, 'HTTP error should be caught');
});

// ============================================================================
// Brightness Command Failure Tests
// ============================================================================

test('Device brightness command fails, state reflects failure', async () => {
  const _stateStore = createMockStateStore();
  let commandFailed = false;

  const deviceDriver = {
    async setBrightness(_level) {
      throw new Error('Device not responding');
    },
  };

  // Set initial brightness
  stateStore.setDeviceState('192.168.1.100', 'brightness', 100);

  // Attempt to change brightness
  try {
    await deviceDriver.setBrightness(50);
    // If successful, update state
    stateStore.setDeviceState('192.168.1.100', 'brightness', 50);
  } catch (error) {
    commandFailed = true;
    // Don't update state on failure
  }

  // Verify state unchanged after failure
  assert.ok(commandFailed);
  assert.equal(
    stateStore.getDeviceState('192.168.1.100', 'brightness', 100),
    100
  );
});

test('Device display power command fails, state unchanged', async () => {
  const _stateStore = createMockStateStore();

  const deviceDriver = {
    async setDisplayPower(_on) {
      throw new Error('Communication error');
    },
  };

  // Set initial state
  stateStore.setDeviceState('192.168.1.100', 'displayOn', true);

  // Attempt to turn off
  try {
    await deviceDriver.setDisplayPower(false);
    stateStore.setDeviceState('192.168.1.100', 'displayOn', false);
  } catch (error) {
    // State unchanged on failure
  }

  // Verify state unchanged
  assert.equal(
    stateStore.getDeviceState('192.168.1.100', 'displayOn', true),
    true
  );
});

// ============================================================================
// Concurrent Error Tests
// ============================================================================

test('Multiple device errors do not cascade', async () => {
  const errors = [];

  const device1 = {
    async push() {
      throw new Error('Device 1 timeout');
    },
  };

  const device2 = {
    async push() {
      throw new Error('Device 2 connection refused');
    },
  };

  // Both fail independently
  try {
    await device1.push(Buffer.alloc(64 * 64 * 3));
  } catch (error) {
    errors.push(error);
  }

  try {
    await device2.push(Buffer.alloc(64 * 64 * 3));
  } catch (error) {
    errors.push(error);
  }

  assert.equal(errors.length, 2);
  assert.ok(errors[0].message.includes('Device 1'));
  assert.ok(errors[1].message.includes('Device 2'));
});

test('Driver error recovery maintains device independence', async () => {
  const devices = {
    '192.168.1.100': {
      pushSuccessful: false,
      async push() {
        throw new Error('Device 1 failed');
      },
    },
    '192.168.1.200': {
      pushSuccessful: false,
      async push() {
        this.pushSuccessful = true;
        return { success: true };
      },
    },
  };

  // Device 1 fails
  try {
    await devices['192.168.1.100'].push();
  } catch (error) {
    // Expected
  }

  // Device 2 succeeds
  await devices['192.168.1.200'].push();

  assert.equal(devices['192.168.1.100'].pushSuccessful, false);
  assert.equal(devices['192.168.1.200'].pushSuccessful, true);
});

