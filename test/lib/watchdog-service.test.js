'use strict';

const assert = require('node:assert');
const test = require('node:test');

const WatchdogService = require('../../lib/services/watchdog-service');

function createMockDeviceConfigStore(configs) {
  const map = new Map();
  Object.entries(configs).forEach(([ip, config]) => {
    map.set(ip, config);
  });

  return {
    getDevice(ip) {
      return map.get(ip);
    },
    getAllDevices() {
      return map;
    },
    updateDevice(ip, updates) {
      const existing = map.get(ip) || {};
      const merged = { ...existing, ...updates };
      map.set(ip, merged);
      return merged;
    },
  };
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

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  ok: () => {},
};

test('WatchdogService executes action when scene is stopped and checkWhenOff true', async () => {
  let actionInvoked = false;

  const configStore = createMockDeviceConfigStore({
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

  watchdogService.logger = {
    ...noopLogger,
    info(message) {
      if (message.includes('Executing action "restart"')) {
        actionInvoked = true;
      }
    },
  };

  await watchdogService.checkDevice('127.0.0.1', 1000 * 60 * 5);

  assert.equal(actionInvoked, true, 'restart action should be invoked');
  assert.equal(metricsStore['127.0.0.1'].restartCalled, true);
});
