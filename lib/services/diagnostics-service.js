/**
 * @fileoverview DiagnosticsService
 * @description Runs lightweight health checks focused on UI-visible behaviour
 * and exposes recent results for the dashboard.
 * @license GPL-3.0-or-later
 */

'use strict';

const DEFAULT_TESTS = (logger) => [
  {
    id: 'device-last-seen',
    name: 'Device Responsiveness',
    description:
      'Verifies real devices reported a recent heartbeat so the UI can show green status.',
    run: async ({ deviceService }) => {
      const devices = await deviceService.listDevices();
      const realDevices = devices.filter((d) => d.driver === 'real');

      if (realDevices.length === 0) {
        return {
          status: 'yellow',
          message: 'No real devices configured – responsiveness not evaluated.',
          details: { devices: [] },
        };
      }

      const staleMs = 60_000;
      const now = Date.now();
      const stale = realDevices.filter((device) => {
        const ts = device.metrics?.lastSeenTs;
        return !ts || now - ts > staleMs;
      });

      if (stale.length === 0) {
        return {
          status: 'green',
          message: 'All real devices responded within the past 60 seconds.',
          details: {
            deviceCount: realDevices.length,
          },
        };
      }

      logger.warn('[DIAG] Stale device metrics detected', {
        stale: stale.map((d) => d.ip),
      });

      return {
        status: 'red',
        message: `${stale.length} real device(s) missing recent heartbeat`,
        details: {
          stale: stale.map((device) => ({
            ip: device.ip,
            lastSeenTs: device.metrics?.lastSeenTs || null,
          })),
        },
      };
    },
  },
  {
    id: 'watchdog-monitors',
    name: 'Watchdog Monitoring',
    description:
      'Ensures watchdog monitoring is running for devices that enable it in config.',
    run: async ({ deviceConfigStore, watchdogService }) => {
      if (!watchdogService?.getAllStatus) {
        return {
          status: 'yellow',
          message: 'Watchdog service not available – skipping monitor checks.',
          details: {},
        };
      }

      const statuses = watchdogService.getAllStatus();
      if (!statuses) {
        return {
          status: 'yellow',
          message: 'Watchdog service not available – skipping monitor checks.',
          details: {},
        };
      }

      const configured = Array.from(
        deviceConfigStore.getAllDevices().values()
      ).filter((device) => device.watchdog?.enabled);

      if (configured.length === 0) {
        return {
          status: 'yellow',
          message: 'No devices have watchdog enabled.',
          details: {},
        };
      }

      const inactive = configured.filter((device) => {
        const status = statuses[device.ip];
        return !status?.monitoring;
      });

      if (inactive.length === 0) {
        return {
          status: 'green',
          message: 'Watchdog monitoring active for all enabled devices.',
          details: {
            monitoredCount: configured.length,
          },
        };
      }

      return {
        status: 'red',
        message: `${inactive.length} watchdog enabled device(s) are not being monitored.`,
        details: {
          inactive: inactive.map((device) => device.ip),
        },
      };
    },
  },
  {
    id: 'system-heartbeat',
    name: 'System Heartbeat',
    description:
      'Validates daemon heartbeat metadata so the UI uptime indicator remains trustworthy.',
    run: async ({ stateStore, systemService }) => {
      const status = await systemService.getStatus();
      const metrics = stateStore.getDaemonMetrics();
      const now = Date.now();

      if (!metrics.lastHeartbeat) {
        return {
          status: 'red',
          message: 'Daemon heartbeat not recorded.',
          details: {},
        };
      }

      const delta = now - metrics.lastHeartbeat;
      if (delta > 30_000) {
        return {
          status: 'yellow',
          message: 'Heartbeat older than 30 seconds. UI uptime may be stale.',
          details: {
            lastHeartbeat: metrics.lastHeartbeat,
            deltaMs: delta,
          },
        };
      }

      return {
        status: 'green',
        message: 'Heartbeat recent and uptime metrics available.',
        details: {
          buildNumber: status.buildNumber,
          uptimeSeconds: status.uptimeSeconds,
        },
      };
    },
  },
];

/**
 * Service responsible for running diagnostics tests and caching latest results.
 */
class DiagnosticsService {
  /**
   * @param {Object} deps
   * @param {import('../logger')} deps.logger
   * @param {import('../state-store')} deps.stateStore
   * @param {import('./device-service')} deps.deviceService
   * @param {import('./system-service')} deps.systemService
   * @param {import('./scene-service')} deps.sceneService
   * @param {import('./watchdog-service')} deps.watchdogService
   * @param {import('../device-config-store').DeviceConfigStore} deps.deviceConfigStore
   */
  constructor({
    logger,
    stateStore,
    deviceService,
    systemService,
    sceneService,
    watchdogService,
    deviceConfigStore,
  }) {
    this.logger = logger || require('../logger');
    this.stateStore = stateStore;
    this.deviceService = deviceService;
    this.systemService = systemService;
    this.sceneService = sceneService;
    this.watchdogService = watchdogService;
    this.deviceConfigStore = deviceConfigStore;

    this.tests = new Map();
    DEFAULT_TESTS(this.logger).forEach((test) => this.tests.set(test.id, test));

    this.results = this.stateStore.getGlobal('diagnostics.results', {});
  }

  /**
   * List available diagnostics tests with their latest status.
   * @returns {Array<Object>}
   */
  listTests() {
    return Array.from(this.tests.values()).map((test) => ({
      id: test.id,
      name: test.name,
      description: test.description,
      latest: this.results[test.id] || null,
    }));
  }

  /**
   * Get last result for a test.
   * @param {string} testId
   * @returns {Object|null}
   */
  getResult(testId) {
    return this.results[testId] || null;
  }

  /**
   * Run a single diagnostics test.
   * @param {string} testId
   * @returns {Promise<Object>}
   */
  async runTest(testId) {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Unknown diagnostics test: ${testId}`);
    }

    const start = Date.now();
    try {
      const context = {
        deviceService: this.deviceService,
        systemService: this.systemService,
        sceneService: this.sceneService,
        watchdogService: this.watchdogService,
        stateStore: this.stateStore,
        deviceConfigStore: this.deviceConfigStore,
      };
      const outcome = await test.run(context);
      const durationMs = Date.now() - start;
      const result = this._normaliseResult(outcome, durationMs);
      this._storeResult(testId, result);
      return { id: testId, ...result };
    } catch (error) {
      const durationMs = Date.now() - start;
      const failure = {
        status: 'red',
        message:
          error.message || 'Diagnostics test failed with unexpected error.',
        details: {},
        durationMs,
        lastRun: new Date().toISOString(),
      };
      this._storeResult(testId, failure);
      return { id: testId, ...failure };
    }
  }

  /**
   * Run all diagnostics tests sequentially.
   * @returns {Promise<Array<Object>>}
   */
  async runAll() {
    const results = [];
    for (const testId of this.tests.keys()) {
      const result = await this.runTest(testId);
      results.push(result);
    }
    return results;
  }

  _normaliseResult(outcome, durationMs) {
    const status = ['green', 'yellow', 'red'].includes(outcome.status)
      ? outcome.status
      : 'red';
    return {
      status,
      message: outcome.message || 'Diagnostics test completed.',
      details: outcome.details || {},
      durationMs,
      lastRun: new Date().toISOString(),
    };
  }

  _storeResult(testId, result) {
    this.results = {
      ...this.results,
      [testId]: {
        ...result,
        lastRun: result.lastRun,
        durationMs: result.durationMs,
      },
    };
    this.stateStore.setGlobal('diagnostics.results', this.results);
  }
}

module.exports = DiagnosticsService;
