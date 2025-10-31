'use strict';

const assert = require('node:assert');
const { test, afterEach } = require('node:test');

const WatchdogService = require('../../lib/services/watchdog-service');

// Track all watchdog services created during tests for cleanup
const watchdogInstances = [];

// Global cleanup to prevent timer leaks
afterEach(() => {
  watchdogInstances.forEach((service) => service.stopAll());
  watchdogInstances.length = 0;
});

// Helper to create and track watchdog services for auto-cleanup
function createTrackedWatchdogService(...args) {
  const service = new WatchdogService(...args);
  watchdogInstances.push(service);
  return service;
}

class MockConfigStore {
  constructor(configs) {
    this._entries = new Map(Object.entries(configs));
  }

  getDevice(ip) {
    const entry = this._entries.get(ip);
    if (!entry) {
      return null;
    }
    return {
      ...entry,
      watchdog: {
        enabled: entry.watchdog.enabled,
        checkWhenOff: entry.watchdog.checkWhenOff,
        timeoutMinutes: entry.watchdog.timeoutMinutes,
        action: entry.watchdog.action,
        notifyOnFailure: Boolean(entry.watchdog.notifyOnFailure),
        fallbackScene: entry.watchdog.fallbackScene,
        mqttCommandSequence: entry.watchdog.mqttCommandSequence,
        healthCheckIntervalSeconds: entry.watchdog.healthCheckIntervalSeconds,
      },
    };
  }

  getAllDevices() {
    return this._entries;
  }

  updateDevice(ip, updates) {
    const existing = this._entries.get(ip) || {};
    const merged = { ...existing, ...updates };
    this._entries.set(ip, merged);
    return merged;
  }
}

function createMockDeviceService(metricsByIp, healthEntries = {}) {
  return {
    async getMetrics(ip) {
      return metricsByIp[ip] ?? null;
    },
    updateMetrics(ip, updater) {
      if (!metricsByIp[ip]) {
        metricsByIp[ip] = {};
      }
      updater(metricsByIp[ip]);
    },
    async restartDevice(ip) {
      metricsByIp[ip].restartCalled = true;
    },
    async resetDevice(ip) {
      metricsByIp[ip].restartCalled = true;
    },
    getHealthEntry(ip) {
      return healthEntries[ip];
    },
  };
}

function createMockSceneService() {
  return {
    async switchScene() {},
  };
}

function createMockStateStore(states = {}) {
  return {
    getDeviceState(ip, key, fallback) {
      return states[ip]?.[key] ?? fallback;
    },
  };
}

test('executeWatchdogAction runs restart flow', async () => {
  const configStore = new MockConfigStore({
    '127.0.0.1': {
      ip: '127.0.0.1',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 240,
        action: 'restart',
        notifyOnFailure: false,
      },
    },
  });

  const metricsStore = {
    '127.0.0.1': {
      lastSeenTs: Date.now(),
      restartCalled: false,
    },
  };

  const healthEntries = {
    '192.168.1.100': {
      lastSeenTs: null,
      lastSeenSource: null,
    },
  };

  const deviceService = createMockDeviceService(metricsStore, healthEntries);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  await watchdogService.executeWatchdogAction('127.0.0.1');

  assert.equal(metricsStore['127.0.0.1'].restartCalled, true);
});

test('checkDevice triggers executeWatchdogAction when scene stopped and checkWhenOff true', async () => {
  let actionInvoked = false;

  const configStore = new MockConfigStore({
    '127.0.0.1': {
      ip: '127.0.0.1',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 240,
        action: 'restart',
      },
    },
  });

  const metricsStore = {
    '127.0.0.1': {
      lastSeenTs: Date.now(),
      restartCalled: false,
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore({
    '127.0.0.1': {
      playState: 'stopped',
    },
  });

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  const originalExecute =
    watchdogService.executeWatchdogAction.bind(watchdogService);
  watchdogService.executeWatchdogAction = async (...args) => {
    actionInvoked = true;
    return originalExecute(...args);
  };

  await watchdogService.checkDevice('127.0.0.1', 1000 * 60 * 5);

  assert.equal(actionInvoked, true, 'restart action should be invoked');
  assert.equal(metricsStore['127.0.0.1'].restartCalled, true);
});

test('WatchdogService does not trigger when scene running and checkWhenOff false', async () => {
  let actionInvoked = false;

  const configStore = new MockConfigStore({
    '127.0.0.2': {
      ip: '127.0.0.2',
      watchdog: {
        enabled: true,
        checkWhenOff: false,
        timeoutMinutes: 240,
        action: 'restart',
      },
    },
  });

  const metricsStore = {
    '127.0.0.2': {
      lastSeenTs: Date.now(),
      restartCalled: false,
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore({
    '127.0.0.2': {
      playState: 'running',
    },
  });

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  watchdogService.executeWatchdogAction = async () => {
    actionInvoked = true;
  };

  await watchdogService.checkDevice('127.0.0.2', 1000 * 60 * 5);

  assert.equal(actionInvoked, false, 'restart action should not be invoked');
  assert.equal(metricsStore['127.0.0.2'].restartCalled, false);
});

// ============================================================================
// Detection Tests
// ============================================================================

test('watchdog detects stale lastSeenTs (device unresponsive)', async () => {
  let actionInvoked = false;

  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60, // 60 minute timeout
        action: 'restart',
      },
    },
  });

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: twoHoursAgo, // Stale!
      restartCalled: false,
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore({
    '192.168.1.100': {
      playState: 'running',
    },
  });

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: false }), // Failing health check
          },
        };
      },
    }
  );

  const originalExecute =
    watchdogService.executeWatchdogAction.bind(watchdogService);
  watchdogService.executeWatchdogAction = async (...args) => {
    actionInvoked = true;
    return originalExecute(...args);
  };

  await watchdogService.checkDevice('192.168.1.100', 60 * 60 * 1000); // 60 min timeout

  assert.equal(
    actionInvoked,
    true,
    'action should be invoked for stale device'
  );
});

test('watchdog does not trigger for healthy device', async () => {
  let actionInvoked = false;

  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const recentTime = Date.now() - 10 * 1000; // 10 seconds ago (healthy)
  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: recentTime,
      restartCalled: false,
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore({
    '192.168.1.100': {
      playState: 'running',
    },
  });

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  watchdogService.executeWatchdogAction = async () => {
    actionInvoked = true;
  };

  await watchdogService.checkDevice('192.168.1.100', 60 * 60 * 1000);

  assert.equal(
    actionInvoked,
    false,
    'action should not be invoked for healthy device'
  );
});

test('watchdog does not trigger when disabled', async () => {
  let actionInvoked = false;

  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: false, // Disabled!
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const staleTime = Date.now() - 2 * 60 * 60 * 1000; // Stale, but watchdog disabled
  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: staleTime,
      restartCalled: false,
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore({
    '192.168.1.100': {
      playState: 'running',
    },
  });

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: false }),
          },
        };
      },
    }
  );

  watchdogService.executeWatchdogAction = async () => {
    actionInvoked = true;
  };

  await watchdogService.checkDevice('192.168.1.100', 60 * 60 * 1000);

  assert.equal(
    actionInvoked,
    false,
    'action should not be invoked when watchdog disabled'
  );
});

// ============================================================================
// Action Tests
// ============================================================================

test('watchdog action "fallback-scene" switches to fallback scene', async () => {
  let sceneSwitchCalled = false;
  let switchedScene = null;

  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'fallback-scene',
        fallbackScene: 'empty',
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const sceneService = {
    async switchScene(ip, sceneName) {
      sceneSwitchCalled = true;
      switchedScene = sceneName;
    },
  };

  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    sceneService,
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  await watchdogService.executeWatchdogAction('192.168.1.100');

  assert.equal(sceneSwitchCalled, true, 'scene switch should be called');
  assert.equal(switchedScene, 'empty', 'should switch to fallback scene');
});

test('watchdog action "notify" only logs, no device action', async () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'notify',
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
      restartCalled: false,
    },
  };

  const healthEntries = {
    '192.168.1.100': {
      lastSeenTs: null,
      lastSeenSource: null,
    },
  };

  const deviceService = createMockDeviceService(metricsStore, healthEntries);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  await watchdogService.executeWatchdogAction('192.168.1.100');

  // Should only log, not restart
  assert.equal(
    metricsStore['192.168.1.100'].restartCalled,
    false,
    'restart should not be called for notify action'
  );
});

// ============================================================================
// Health Check Tests
// ============================================================================

test('health check updates lastSeenTs when successful', async () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
        healthCheckIntervalSeconds: 10,
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {},
  };

  const healthEntries = {
    '192.168.1.100': {
      lastSeenTs: null,
      lastSeenSource: null,
    },
  };

  const deviceService = createMockDeviceService(metricsStore, healthEntries);
  const stateStore = createMockStateStore();

  let healthCheckCalled = false;
  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          host: '192.168.1.100',
          impl: {
            driverType: 'real',
            healthCheck: async () => {
              healthCheckCalled = true;
              return { success: true, latencyMs: 50 };
            },
          },
          health: {
            recordCheckStart() {},
            recordCheckResult() {},
            updateLastSeen(timestamp, source) {
              healthEntries['192.168.1.100'].lastSeenTs = timestamp;
              healthEntries['192.168.1.100'].lastSeenSource = source;
            },
          },
        };
      },
    }
  );

  const result = await watchdogService.performHealthCheck('192.168.1.100');

  assert.equal(healthCheckCalled, true, 'health check should be called');
  assert.equal(result.success, true, 'health check should succeed');
  assert.ok(result.latencyMs, 'should include latency');
  assert.ok(
    healthEntries['192.168.1.100'].lastSeenTs,
    'lastSeenTs should update via health store'
  );
  assert.equal(
    healthEntries['192.168.1.100'].lastSeenSource,
    'health-check',
    'Health store should record health-check source'
  );
});

test('health check skips when device is OFF and checkWhenOff=false', async () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: false, // Don't check when off
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore({
    '192.168.1.100': {
      displayOn: false, // Device is OFF
    },
  });

  let healthCheckCalled = false;
  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => {
              healthCheckCalled = true;
              return { success: true };
            },
          },
        };
      },
    }
  );

  const result = await watchdogService.performHealthCheck('192.168.1.100');

  assert.equal(healthCheckCalled, false, 'health check should be skipped');
  assert.strictEqual(result, null, 'should return null when skipped');
});

test('health check runs when device is OFF and checkWhenOff=true', async () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true, // Check even when off
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore({
    '192.168.1.100': {
      displayOn: false, // Device is OFF
    },
  });

  let healthCheckCalled = false;
  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => {
              healthCheckCalled = true;
              return { success: true };
            },
          },
        };
      },
    }
  );

  await watchdogService.performHealthCheck('192.168.1.100');

  assert.equal(
    healthCheckCalled,
    true,
    'health check should run even when off'
  );
});

// ============================================================================
// Monitoring Lifecycle Tests
// ============================================================================

test('startMonitoring begins monitoring a device', () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
        healthCheckIntervalSeconds: 10,
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            driverType: 'real',
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  try {
    watchdogService.startMonitoring('192.168.1.100');

    assert.ok(
      watchdogService.timers.has('192.168.1.100'),
      'timer should be set for device'
    );
  } finally {
    // Clean up timer to prevent hang
    watchdogService.stopMonitoring('192.168.1.100');
  }
});

test('startMonitoring triggers immediate health check', async () => {
  let healthCheckCount = 0;
  let resolveHealthCheck;
  const healthCheckPromise = new Promise((resolve) => {
    resolveHealthCheck = resolve;
  });

  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
        healthCheckIntervalSeconds: 60,
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: null,
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            driverType: 'real',
            async healthCheck() {
              healthCheckCount++;
              resolveHealthCheck();
              return { success: true, latencyMs: 5 };
            },
          },
        };
      },
    }
  );

  try {
    watchdogService.startMonitoring('192.168.1.100');

    // Wait for health check to actually complete with timeout
    await Promise.race([
      healthCheckPromise,
      new Promise((resolve) => setTimeout(resolve, 100)),
    ]);

    assert.ok(healthCheckCount >= 1, 'health check should run immediately');
  } finally {
    watchdogService.stopMonitoring('192.168.1.100');
  }
});

test('stopMonitoring stops monitoring a device', () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            driverType: 'real',
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  // Start then stop
  watchdogService.startMonitoring('192.168.1.100');
  watchdogService.stopMonitoring('192.168.1.100');

  assert.equal(
    watchdogService.timers.has('192.168.1.100'),
    false,
    'timer should be cleared'
  );
});

test('stopAll stops all monitoring', () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
    '192.168.1.200': {
      ip: '192.168.1.200',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': { lastSeenTs: Date.now() },
    '192.168.1.200': { lastSeenTs: Date.now() },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            driverType: 'real',
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  // Start monitoring both
  watchdogService.startMonitoring('192.168.1.100');
  watchdogService.startMonitoring('192.168.1.200');

  // Stop all
  watchdogService.stopAll();

  assert.equal(watchdogService.timers.size, 0, 'all timers should be cleared');
});

// ============================================================================
// Status Reporting Tests
// ============================================================================

test('getAllStatus returns status for all monitored devices', () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            driverType: 'real',
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  try {
    watchdogService.startMonitoring('192.168.1.100');

    const status = watchdogService.getAllStatus();

    assert.ok(status, 'status should be returned');
    assert.ok(
      status['192.168.1.100'],
      'status should include monitored device'
    );
    assert.equal(
      status['192.168.1.100'].monitoring,
      true,
      'device should be marked as monitoring'
    );
  } finally {
    watchdogService.stopMonitoring('192.168.1.100');
  }
});

test('getStatus returns status for specific device', () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            driverType: 'real',
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  try {
    watchdogService.startMonitoring('192.168.1.100');

    const status = watchdogService.getStatus('192.168.1.100');

    assert.ok(status, 'status should be returned');
    assert.equal(status.monitoring, true, 'device should be monitoring');
    assert.ok(status.config, 'status should include config');
  } finally {
    watchdogService.stopMonitoring('192.168.1.100');
  }
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test('watchdog handles device service error gracefully', async () => {
  const configStore = new MockConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: {
        enabled: true,
        checkWhenOff: true,
        timeoutMinutes: 60,
        action: 'restart',
      },
    },
  });

  const deviceService = {
    async getMetrics() {
      throw new Error('Device service error');
    },
    async restartDevice() {
      throw new Error('Restart failed');
    },
  };

  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  // Should not throw
  await watchdogService.checkDevice('192.168.1.100', 60 * 60 * 1000);

  assert.ok(true, 'should handle error gracefully');
});

test('watchdog handles missing device config gracefully', async () => {
  const configStore = new MockConfigStore({});

  const metricsStore = {
    '192.168.1.100': {
      lastSeenTs: Date.now(),
    },
  };

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore();

  const watchdogService = createTrackedWatchdogService(
    configStore,
    deviceService,
    createMockSceneService(),
    stateStore,
    {
      getDevice() {
        return {
          impl: {
            healthCheck: async () => ({ success: true }),
          },
        };
      },
    }
  );

  // Should not throw
  watchdogService.startMonitoring('192.168.1.100');
  await watchdogService.performHealthCheck('192.168.1.100');

  assert.ok(true, 'should handle missing config gracefully');
});
