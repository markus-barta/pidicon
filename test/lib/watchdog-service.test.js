'use strict';

const assert = require('node:assert');
const test = require('node:test');

const WatchdogService = require('../../lib/services/watchdog-service');

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

function createMockDeviceService(metricsByIp) {
  return {
    async getMetrics(ip) {
      return metricsByIp[ip] ?? null;
    },
    async restartDevice(ip) {
      metricsByIp[ip].restartCalled = true;
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

  const deviceService = createMockDeviceService(metricsStore);
  const stateStore = createMockStateStore();

  const watchdogService = new WatchdogService(
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
    },
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

  const watchdogService = new WatchdogService(
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
    },
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

  const watchdogService = new WatchdogService(
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
    },
  );

  watchdogService.executeWatchdogAction = async () => {
    actionInvoked = true;
  };

  await watchdogService.checkDevice('127.0.0.2', 1000 * 60 * 5);

  assert.equal(actionInvoked, false, 'restart action should not be invoked');
  assert.equal(metricsStore['127.0.0.2'].restartCalled, false);
});
