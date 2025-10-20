const assert = require('node:assert');
const { describe, it } = require('node:test');

const SystemService = require('../../lib/services/system-service');

function createMockStateStore(metrics = {}) {
  return {
    getDaemonMetrics: () => metrics,
  };
}

describe('SystemService - uptime tracking', () => {
  const logger = {
    warn: () => {},
    error: () => {},
  };
  const versionInfo = {
    version: '3.1.0',
    buildNumber: 123,
    gitCommit: 'abcdef',
    gitTag: 'v3.1.0',
    environment: 'test',
  };
  const deploymentTracker = {
    initialize: async () => {},
    getLogString: () => '',
  };

  it('should fall back to process uptime when no metrics available', async () => {
    const systemService = new SystemService({
      logger,
      versionInfo,
      deploymentTracker,
      mqttConfigService: {},
      stateStore: createMockStateStore(),
    });

    const status = await systemService.getStatus();
    assert.ok(status.uptimeTrackedSeconds >= 0);
    assert.strictEqual(status.daemonHeartbeatStale, false);
  });

  it('should use tracked metrics when available', async () => {
    const now = Date.now();
    const start = now - 30_000;
    const heartbeat = now - 2_000;

    const systemService = new SystemService({
      logger,
      versionInfo,
      deploymentTracker,
      mqttConfigService: {},
      stateStore: createMockStateStore({
        startTime: start,
        lastHeartbeat: heartbeat,
      }),
    });

    const status = await systemService.getStatus();
    assert.ok(status.uptimeTrackedSeconds >= 29);
    assert.strictEqual(status.daemonStartTime, new Date(start).toISOString());
    assert.strictEqual(status.daemonHeartbeatStale, false);
  });

  it('marks heartbeat stale when exceeded threshold', async () => {
    const now = Date.now();
    const start = now - 120_000;
    const heartbeat = now - 20_000;

    const systemService = new SystemService({
      logger,
      versionInfo,
      deploymentTracker,
      mqttConfigService: {},
      stateStore: createMockStateStore({
        startTime: start,
        lastHeartbeat: heartbeat,
      }),
    });

    const status = await systemService.getStatus();
    assert.strictEqual(status.daemonHeartbeatStale, true);
  });
});
