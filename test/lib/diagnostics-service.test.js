'use strict';

const assert = require('node:assert');
const test = require('node:test');

const DiagnosticsService = require('../../lib/services/diagnostics-service');

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

function createMockStateStore(customState = {}) {
  const globalState = { ...customState };
  return {
    getDaemonMetrics: () => ({
      startTime: Date.now() - 10000,
      lastHeartbeat: Date.now() - 1000,
    }),
    getDeviceState: (ip, key, fallback) => {
      return customState[ip]?.[key] ?? fallback;
    },
    getGlobal: (key, fallback) => globalState[key] ?? fallback,
    setGlobal: (key, value) => {
      globalState[key] = value;
    },
  };
}

function createMockDeviceService(devices = []) {
  return {
    async listDevices() {
      return devices;
    },
    async getDeviceInfo(ip) {
      const device = devices.find((d) => d.ip === ip);
      if (!device) {
        throw new Error(`Device ${ip} not found`);
      }
      return device;
    },
  };
}

function createMockSystemService(statusOverride = {}) {
  return {
    async getStatus() {
      return {
        buildNumber: 100,
        uptimeSeconds: 3600,
        mqttStatus: {
          connected: true,
          brokerUrl: 'mqtt://localhost:1883',
          lastHeartbeatTs: Date.now(),
        },
        ...statusOverride,
      };
    },
  };
}

function createMockSceneService(scenes = []) {
  return {
    async listScenes() {
      return scenes;
    },
    async switchScene(ip, sceneName) {
      return { success: true, sceneName };
    },
  };
}

function createMockWatchdogService(statusOverride = {}) {
  return {
    getAllStatus: () => statusOverride,
  };
}

function createMockDeviceConfigStore(devices = {}) {
  return {
    getAllDevices: () => new Map(Object.entries(devices)),
    getDevice: (ip) => devices[ip] || null,
  };
}

// ============================================================================
// DiagnosticsService Construction Tests
// ============================================================================

test('DiagnosticsService constructs with all dependencies', () => {
  const logger = createMockLogger();
  const stateStore = createMockStateStore();
  const deviceService = createMockDeviceService();
  const systemService = createMockSystemService();
  const sceneService = createMockSceneService();
  const watchdogService = createMockWatchdogService();
  const deviceConfigStore = createMockDeviceConfigStore();

  const service = new DiagnosticsService({
    logger,
    stateStore,
    deviceService,
    systemService,
    sceneService,
    watchdogService,
    deviceConfigStore,
    testResultsParser: null,
  });

  assert.ok(service);
  assert.strictEqual(service.logger, logger);
  assert.strictEqual(service.stateStore, stateStore);
});

test('DiagnosticsService loads default tests on construction', () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
    testResultsParser: null,
  });

  const tests = service.listTests();
  assert.ok(tests.length > 0, 'Should have default tests loaded');

  // Verify expected default tests are present
  const testIds = tests.map((t) => t.id);
  assert.ok(testIds.includes('device-last-seen'));
  assert.ok(testIds.includes('watchdog-monitors'));
  assert.ok(testIds.includes('mqtt-status'));
});

// ============================================================================
// Test: device-last-seen
// ============================================================================

test('device-last-seen: returns green when all real devices recent', async () => {
  const now = Date.now();
  const devices = [
    {
      ip: '192.168.1.100',
      name: 'Device 1',
      driver: 'real',
      metrics: { lastSeenTs: now - 30000 }, // 30s ago
    },
    {
      ip: '192.168.1.101',
      name: 'Device 2',
      driver: 'real',
      metrics: { lastSeenTs: now - 10000 }, // 10s ago
    },
  ];

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(devices),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('device-last-seen');

  assert.strictEqual(result.status, 'green');
  assert.ok(result.message.includes('All real devices responded'));
  assert.ok(result.durationMs >= 0);
  assert.ok(result.lastRun);
});

test('device-last-seen: returns yellow when no real devices', async () => {
  const devices = [
    {
      ip: '192.168.1.100',
      name: 'Mock Device',
      driver: 'mock',
      metrics: { lastSeenTs: Date.now() },
    },
  ];

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(devices),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('device-last-seen');

  assert.strictEqual(result.status, 'yellow');
  assert.ok(result.message.includes('No real devices'));
});

test('device-last-seen: returns red when devices stale (>60s)', async () => {
  const now = Date.now();
  const devices = [
    {
      ip: '192.168.1.100',
      name: 'Stale Device',
      driver: 'real',
      metrics: { lastSeenTs: now - 120000 }, // 2 minutes ago
    },
  ];

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(devices),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('device-last-seen');

  assert.strictEqual(result.status, 'red');
  assert.ok(result.message.includes('missing recent heartbeat'));
  assert.ok(result.details.stale);
  assert.strictEqual(result.details.stale.length, 1);
  assert.strictEqual(result.details.stale[0].ip, '192.168.1.100');
});

test('device-last-seen: returns red when lastSeenTs missing', async () => {
  const devices = [
    {
      ip: '192.168.1.100',
      name: 'No Metrics Device',
      driver: 'real',
      metrics: { lastSeenTs: null }, // No timestamp
    },
  ];

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(devices),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('device-last-seen');

  assert.strictEqual(result.status, 'red');
  assert.ok(result.details.stale);
});

test('device-last-seen: handles mixed real and mock devices correctly', async () => {
  const now = Date.now();
  const devices = [
    {
      ip: '192.168.1.100',
      driver: 'real',
      metrics: { lastSeenTs: now - 10000 }, // Recent
    },
    {
      ip: '192.168.1.101',
      driver: 'mock',
      metrics: { lastSeenTs: now - 200000 }, // Stale but mock
    },
  ];

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(devices),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('device-last-seen');

  // Should be green because only real device matters and it's recent
  assert.strictEqual(result.status, 'green');
});

// ============================================================================
// Test: watchdog-monitors
// ============================================================================

test('watchdog-monitors: returns green when all monitors active', async () => {
  const deviceConfigStore = createMockDeviceConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: { enabled: true },
    },
    '192.168.1.101': {
      ip: '192.168.1.101',
      watchdog: { enabled: true },
    },
  });

  const watchdogService = createMockWatchdogService({
    '192.168.1.100': { monitoring: true },
    '192.168.1.101': { monitoring: true },
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService,
    deviceConfigStore,
  });

  const result = await service.runTest('watchdog-monitors');

  assert.strictEqual(result.status, 'green');
  assert.ok(result.message.includes('Watchdog monitoring active'));
  assert.strictEqual(result.details.monitoredCount, 2);
});

test('watchdog-monitors: returns yellow when no watchdog enabled', async () => {
  const deviceConfigStore = createMockDeviceConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: { enabled: false },
    },
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService({}),
    deviceConfigStore,
  });

  const result = await service.runTest('watchdog-monitors');

  assert.strictEqual(result.status, 'yellow');
  assert.ok(result.message.includes('No devices have watchdog enabled'));
});

test('watchdog-monitors: returns red when monitors inactive', async () => {
  const deviceConfigStore = createMockDeviceConfigStore({
    '192.168.1.100': {
      ip: '192.168.1.100',
      watchdog: { enabled: true },
    },
  });

  const watchdogService = createMockWatchdogService({
    '192.168.1.100': { monitoring: false }, // Not monitoring!
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService,
    deviceConfigStore,
  });

  const result = await service.runTest('watchdog-monitors');

  assert.strictEqual(result.status, 'red');
  assert.ok(result.message.includes('not being monitored'));
  assert.ok(result.details.inactive);
  assert.strictEqual(result.details.inactive.length, 1);
});

test('watchdog-monitors: returns yellow when watchdogService unavailable', async () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: null, // No watchdog service
    deviceConfigStore: createMockDeviceConfigStore({}),
  });

  const result = await service.runTest('watchdog-monitors');

  assert.strictEqual(result.status, 'yellow');
  assert.ok(result.message.includes('Watchdog service not available'));
});

test('watchdog-monitors: returns yellow when getAllStatus missing', async () => {
  const watchdogService = {}; // No getAllStatus method

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService,
    deviceConfigStore: createMockDeviceConfigStore({}),
  });

  const result = await service.runTest('watchdog-monitors');

  assert.strictEqual(result.status, 'yellow');
});

// ============================================================================
// Test: system-heartbeat
// ============================================================================

test('system-heartbeat: returns green when heartbeat recent', async () => {
  const stateStore = createMockStateStore();
  stateStore.getDaemonMetrics = () => ({
    startTime: Date.now() - 100000,
    lastHeartbeat: Date.now() - 5000, // 5 seconds ago
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore,
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('system-heartbeat');

  assert.strictEqual(result.status, 'green');
  assert.ok(result.message.includes('Heartbeat recent'));
});

test('system-heartbeat: returns yellow when heartbeat >30s old', async () => {
  const stateStore = createMockStateStore();
  const oldTimestamp = Date.now() - 35000; // 35 seconds ago
  stateStore.getDaemonMetrics = () => ({
    startTime: Date.now() - 100000,
    lastHeartbeat: oldTimestamp,
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore,
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('system-heartbeat');

  assert.strictEqual(result.status, 'yellow');
  assert.ok(result.message.includes('older than 30 seconds'));
  assert.strictEqual(result.details.lastHeartbeat, oldTimestamp);
});

test('system-heartbeat: returns red when heartbeat not recorded', async () => {
  const stateStore = createMockStateStore();
  stateStore.getDaemonMetrics = () => ({
    startTime: Date.now() - 100000,
    lastHeartbeat: null, // No heartbeat!
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore,
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('system-heartbeat');

  assert.strictEqual(result.status, 'red');
  assert.ok(result.message.includes('Daemon heartbeat not recorded'));
});

// ============================================================================
// Test: mqtt-status
// ============================================================================

test('mqtt-status: returns green when MQTT connected', async () => {
  const systemService = createMockSystemService({
    mqttStatus: {
      connected: true,
      brokerUrl: 'mqtt://localhost:1883',
      lastHeartbeatTs: Date.now(),
    },
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService,
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
    testResultsParser: null,
  });

  const result = await service.runTest('mqtt-status');

  assert.strictEqual(result.status, 'green');
  assert.ok(result.message.includes('MQTT connected'));
  assert.strictEqual(result.details.brokerUrl, 'mqtt://localhost:1883');
});

test('mqtt-status: returns red when MQTT disconnected', async () => {
  const systemService = createMockSystemService({
    mqttStatus: {
      connected: false,
      brokerUrl: 'mqtt://localhost:1883',
      lastError: 'Connection refused',
    },
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService,
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('mqtt-status');

  assert.strictEqual(result.status, 'red');
  assert.ok(result.message.includes('Connection refused'));
});

test('mqtt-status: returns red with generic message when no error', async () => {
  const systemService = createMockSystemService({
    mqttStatus: {
      connected: false,
      brokerUrl: 'mqtt://localhost:1883',
      lastError: null,
    },
  });

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService,
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('mqtt-status');

  assert.strictEqual(result.status, 'red');
  assert.ok(result.message.includes('MQTT disconnected'));
});

// ============================================================================
// DiagnosticsService Core Methods
// ============================================================================

test('listTests returns all tests with latest results', () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
    testResultsParser: null,
  });

  const tests = service.listTests();

  assert.ok(Array.isArray(tests));
  tests.forEach((test) => {
    assert.ok(test.id);
    assert.ok(test.name);
    assert.ok(test.description);
    // latest can be null if test never run
    assert.ok('latest' in test);
  });
});

test('getResult returns null for test never run', () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
    testResultsParser: null,
  });

  const result = service.getResult('device-last-seen');

  assert.strictEqual(result, null);
});

test('getResult returns latest result after test run', async () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService([
      {
        ip: '192.168.1.100',
        driver: 'real',
        metrics: { lastSeenTs: Date.now() },
      },
    ]),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  await service.runTest('device-last-seen');
  const result = service.getResult('device-last-seen');

  assert.ok(result);
  assert.ok(result.status);
  assert.ok(result.lastRun);
});

test('runTest throws for unknown test', async () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  await assert.rejects(
    async () => {
      await service.runTest('non-existent-test');
    },
    {
      message: /Unknown diagnostics test/,
    }
  );
});

test('runTest tracks duration correctly', async () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService([]),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('device-last-seen');

  assert.ok(typeof result.durationMs === 'number');
  assert.ok(result.durationMs >= 0);
  assert.ok(result.durationMs < 1000); // Should be fast
});

test('runTest persists result to StateStore', async () => {
  const stateStore = createMockStateStore();

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore,
    deviceService: createMockDeviceService([]),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  await service.runTest('device-last-seen');

  const persistedResult = service.getResult('device-last-seen');
  assert.ok(persistedResult);
  assert.ok(persistedResult.lastRun);
  assert.ok(persistedResult.durationMs >= 0);
});

test('runTest returns red status on test exception', async () => {
  const deviceService = {
    async listDevices() {
      throw new Error('Simulated device service failure');
    },
  };

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService,
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const result = await service.runTest('device-last-seen');

  assert.strictEqual(result.status, 'red');
  assert.ok(result.message.includes('Simulated device service failure'));
  assert.ok(result.durationMs >= 0);
});

test('runAll executes all tests sequentially', async () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService([]),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const results = await service.runAll();

  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);

  results.forEach((result) => {
    assert.ok(result.id);
    assert.ok(['green', 'yellow', 'red'].includes(result.status));
    assert.ok(result.message);
    assert.ok(typeof result.durationMs === 'number');
    assert.ok(result.lastRun);
  });
});

test('runAll continues after test failure', async () => {
  const deviceService = {
    async listDevices() {
      throw new Error('Device service failed');
    },
  };

  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService,
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const results = await service.runAll();

  // Should still run other tests despite device-last-seen failure
  assert.ok(results.length > 1);

  // At least one should be red (device-last-seen)
  const failedTests = results.filter((r) => r.status === 'red');
  assert.ok(failedTests.length > 0);
});

// ============================================================================
// Result Normalization Tests
// ============================================================================

test('_normaliseResult handles valid green status', () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const outcome = {
    status: 'green',
    message: 'All good',
    details: { count: 5 },
  };

  const result = service._normaliseResult(outcome, 42);

  assert.strictEqual(result.status, 'green');
  assert.strictEqual(result.message, 'All good');
  assert.deepStrictEqual(result.details, { count: 5 });
  assert.strictEqual(result.durationMs, 42);
  assert.ok(result.lastRun);
});

test('_normaliseResult converts invalid status to red', () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const outcome = {
    status: 'invalid-status',
    message: 'Test message',
    details: {},
  };

  const result = service._normaliseResult(outcome, 10);

  assert.strictEqual(result.status, 'red');
});

test('_normaliseResult provides default message', () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const outcome = {
    status: 'green',
    details: {},
  };

  const result = service._normaliseResult(outcome, 10);

  assert.ok(result.message);
  assert.ok(result.message.includes('completed'));
});

test('_normaliseResult provides empty details if missing', () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService(),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  const outcome = {
    status: 'green',
    message: 'Test',
  };

  const result = service._normaliseResult(outcome, 10);

  assert.deepStrictEqual(result.details, {});
});

// ============================================================================
// Concurrent Execution Tests
// ============================================================================

test('concurrent runTest calls dont corrupt results', async () => {
  const service = new DiagnosticsService({
    logger: createMockLogger(),
    stateStore: createMockStateStore(),
    deviceService: createMockDeviceService([]),
    systemService: createMockSystemService(),
    sceneService: createMockSceneService(),
    watchdogService: createMockWatchdogService(),
    deviceConfigStore: createMockDeviceConfigStore(),
  });

  // Run multiple tests concurrently
  const promises = [
    service.runTest('device-last-seen'),
    service.runTest('mqtt-status'),
    service.runTest('system-heartbeat'),
  ];

  const results = await Promise.all(promises);

  // All should complete successfully
  assert.strictEqual(results.length, 3);
  results.forEach((result) => {
    assert.ok(result.status);
    assert.ok(result.message);
  });

  // Results should be stored correctly
  assert.ok(service.getResult('device-last-seen'));
  assert.ok(service.getResult('mqtt-status'));
  assert.ok(service.getResult('system-heartbeat'));
});
