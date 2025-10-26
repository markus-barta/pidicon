/**
 * @fileoverview DiagnosticsService
 * @description Runs lightweight health checks focused on UI-visible behaviour
 * and exposes recent results for the dashboard.
 * @license GPL-3.0-or-later
 */

'use strict';

const _CATEGORY_PREFIXES = {
  system: 'SYS',
  device: 'DEV',
  integration: 'IND',
  mqtt: 'MQT',
  scene: 'SCN',
};

const DEFAULT_TESTS = (logger) => [
  // ==================== SYSTEM DIAGNOSTICS ====================
  {
    id: 'SYS001',
    name: 'Daemon Heartbeat',
    description:
      'Validates daemon heartbeat is recent and uptime metrics are available.',
    category: 'system',
    type: 'diagnostic',
    runnable: true,
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
          message: 'Heartbeat older than 30 seconds.',
          details: {
            lastHeartbeat: metrics.lastHeartbeat,
            deltaMs: delta,
          },
        };
      }

      return {
        status: 'green',
        message: 'Heartbeat recent and metrics available.',
        details: {
          buildNumber: status.buildNumber,
          uptimeSeconds: status.uptimeSeconds,
        },
      };
    },
  },
  {
    id: 'SYS002',
    name: 'Configuration Validation',
    description:
      'Validates device configuration file integrity and device settings.',
    category: 'system',
    type: 'diagnostic',
    runnable: true,
    run: async ({ deviceConfigStore }) => {
      try {
        const devices = Array.from(deviceConfigStore.getAllDevices().values());

        if (devices.length === 0) {
          return {
            status: 'yellow',
            message: 'No devices configured.',
            details: {},
          };
        }

        const issues = [];
        devices.forEach((device) => {
          if (!device.ip) {
            issues.push(`Device ${device.name} missing IP address`);
          }
          if (!device.name) {
            issues.push(`Device at ${device.ip} missing name`);
          }
          if (!device.deviceType) {
            issues.push(`Device ${device.name} missing deviceType`);
          }
        });

        if (issues.length > 0) {
          return {
            status: 'red',
            message: `${issues.length} configuration issue(s) found.`,
            details: { issues },
          };
        }

        return {
          status: 'green',
          message: `All ${devices.length} device(s) configured correctly.`,
          details: {
            deviceCount: devices.length,
            deviceTypes: [...new Set(devices.map((d) => d.deviceType))],
          },
        };
      } catch (error) {
        return {
          status: 'red',
          message: `Configuration validation failed: ${error.message}`,
          details: { error: error.message },
        };
      }
    },
  },

  // ==================== DEVICE DIAGNOSTICS ====================
  {
    id: 'DEV001',
    name: 'Device Responsiveness',
    description:
      'Checks that real devices are responsive and reporting recent heartbeats.',
    category: 'device',
    type: 'diagnostic',
    runnable: true,
    run: async ({ deviceService }) => {
      const devices = await deviceService.listDevices();
      const realDevices = devices.filter((d) => d.driver === 'real');

      if (realDevices.length === 0) {
        return {
          status: 'yellow',
          message: 'No real devices configured.',
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
          message: `All ${realDevices.length} real device(s) responsive.`,
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
        message: `${stale.length} device(s) not responding.`,
        details: {
          stale: stale.map((device) => ({
            ip: device.ip,
            name: device.name,
            lastSeenTs: device.metrics?.lastSeenTs || null,
          })),
        },
      };
    },
  },
  {
    id: 'DEV002',
    name: 'Device Communication',
    description:
      'Verifies devices can receive commands (brightness, power, etc.).',
    category: 'device',
    type: 'diagnostic',
    runnable: true,
    run: async ({ deviceService }) => {
      const devices = await deviceService.listDevices();
      const realDevices = devices.filter((d) => d.driver === 'real');

      if (realDevices.length === 0) {
        return {
          status: 'yellow',
          message: 'No real devices to test.',
          details: {},
        };
      }

      const results = [];
      for (const device of realDevices) {
        try {
          // Test if we can read current brightness (non-destructive check)
          await deviceService.getDeviceInfo(device.ip);
          results.push({ ip: device.ip, name: device.name, success: true });
        } catch (error) {
          results.push({
            ip: device.ip,
            name: device.name,
            success: false,
            error: error.message,
          });
        }
      }

      const failed = results.filter((r) => !r.success);

      if (failed.length === 0) {
        return {
          status: 'green',
          message: `All ${realDevices.length} device(s) accepting commands.`,
          details: { deviceCount: realDevices.length },
        };
      }

      return {
        status: 'red',
        message: `${failed.length} device(s) not accepting commands.`,
        details: {
          failed: failed.map((f) => ({
            ip: f.ip,
            name: f.name,
            error: f.error,
          })),
        },
      };
    },
  },
  {
    id: 'DEV003',
    name: 'Device Driver Status',
    description:
      'Checks that all configured devices have valid drivers loaded.',
    category: 'device',
    type: 'diagnostic',
    runnable: true,
    run: async ({ deviceService, deviceConfigStore }) => {
      const devices = await deviceService.listDevices();
      const configured = Array.from(deviceConfigStore.getAllDevices().values());

      if (configured.length === 0) {
        return {
          status: 'yellow',
          message: 'No devices configured.',
          details: {},
        };
      }

      const issues = [];
      configured.forEach((config) => {
        const device = devices.find((d) => d.ip === config.ip);
        if (!device) {
          issues.push(`Device ${config.ip} (${config.name}) not initialized`);
        } else if (!device.driver || device.driver === 'unknown') {
          issues.push(
            `Device ${config.ip} has invalid driver: ${device.driver}`
          );
        }
      });

      if (issues.length > 0) {
        return {
          status: 'red',
          message: `${issues.length} driver issue(s) found.`,
          details: { issues },
        };
      }

      return {
        status: 'green',
        message: `All ${configured.length} device(s) have valid drivers.`,
        details: {
          deviceCount: configured.length,
          drivers: devices.reduce((acc, d) => {
            acc[d.driver] = (acc[d.driver] || 0) + 1;
            return acc;
          }, {}),
        },
      };
    },
  },
  {
    id: 'DEV004',
    name: 'Watchdog Monitoring',
    description:
      'Ensures watchdog monitoring is active for devices that have it enabled.',
    category: 'device',
    type: 'diagnostic',
    runnable: true,
    run: async ({ deviceConfigStore, watchdogService }) => {
      if (!watchdogService?.getAllStatus) {
        return {
          status: 'yellow',
          message: 'Watchdog service not available.',
          details: {},
        };
      }

      const statuses = watchdogService.getAllStatus();
      if (!statuses) {
        return {
          status: 'yellow',
          message: 'Watchdog service not available.',
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
          message: `Watchdog active for all ${configured.length} enabled device(s).`,
          details: {
            monitoredCount: configured.length,
          },
        };
      }

      return {
        status: 'red',
        message: `${inactive.length} enabled device(s) not monitored.`,
        details: {
          inactive: inactive.map((device) => ({
            ip: device.ip,
            name: device.name,
          })),
        },
      };
    },
  },

  // ==================== SCENE DIAGNOSTICS ====================
  {
    id: 'SCN001',
    name: 'Scene Registry',
    description: 'Validates all scenes are loaded and available for rendering.',
    category: 'scene',
    type: 'diagnostic',
    runnable: true,
    run: async ({ sceneService }) => {
      try {
        const scenes = await sceneService.listScenes();

        if (scenes.length === 0) {
          return {
            status: 'red',
            message: 'No scenes loaded.',
            details: {},
          };
        }

        const issues = [];
        scenes.forEach((scene) => {
          if (!scene.name) {
            issues.push('Scene with missing name');
          }
          if (!scene.filePath) {
            issues.push(`Scene ${scene.name} missing filePath`);
          }
        });

        if (issues.length > 0) {
          return {
            status: 'yellow',
            message: `${issues.length} scene issue(s) found.`,
            details: { issues },
          };
        }

        return {
          status: 'green',
          message: `All ${scenes.length} scene(s) loaded successfully.`,
          details: {
            sceneCount: scenes.length,
            sceneNames: scenes.map((s) => s.name),
          },
        };
      } catch (error) {
        return {
          status: 'red',
          message: `Scene validation failed: ${error.message}`,
          details: { error: error.message },
        };
      }
    },
  },
  {
    id: 'SCN002',
    name: 'Active Scenes',
    description: 'Checks that devices have scenes running without errors.',
    category: 'scene',
    type: 'diagnostic',
    runnable: true,
    run: async ({ deviceService, stateStore }) => {
      const devices = await deviceService.listDevices();
      const realDevices = devices.filter((d) => d.driver === 'real');

      if (realDevices.length === 0) {
        return {
          status: 'yellow',
          message: 'No real devices to check.',
          details: {},
        };
      }

      const issues = [];
      realDevices.forEach((device) => {
        const activeScene = stateStore.getDeviceState(
          device.ip,
          'activeScene',
          null
        );
        const displayOn = stateStore.getDeviceState(
          device.ip,
          'displayOn',
          true
        );

        if (displayOn && !activeScene) {
          issues.push(
            `Device ${device.name} (${device.ip}) is ON but no active scene`
          );
        }
      });

      if (issues.length > 0) {
        return {
          status: 'yellow',
          message: `${issues.length} device(s) without active scenes.`,
          details: { issues },
        };
      }

      const activeCount = realDevices.filter((device) => {
        const activeScene = stateStore.getDeviceState(
          device.ip,
          'activeScene',
          null
        );
        return activeScene !== null;
      }).length;

      return {
        status: 'green',
        message: `${activeCount} device(s) running scenes.`,
        details: {
          activeCount,
          totalDevices: realDevices.length,
        },
      };
    },
  },

  // ==================== MQTT DIAGNOSTICS ====================
  {
    id: 'MQT001',
    name: 'MQTT Connectivity',
    description: 'Checks MQTT broker connection status.',
    category: 'mqtt',
    type: 'diagnostic',
    runnable: true,
    run: async ({ systemService }) => {
      const status = await systemService.getStatus();
      const mqttStatus = status.mqttStatus || {};

      if (!mqttStatus.connected) {
        return {
          status: 'red',
          message: mqttStatus.lastError
            ? `MQTT offline: ${mqttStatus.lastError}`
            : 'MQTT disconnected',
          details: mqttStatus,
        };
      }

      return {
        status: 'green',
        message: 'MQTT connected',
        details: {
          brokerUrl: mqttStatus.brokerUrl,
          lastHeartbeatTs: mqttStatus.lastHeartbeatTs || null,
        },
      };
    },
  },

  // ==================== INTEGRATION DIAGNOSTICS ====================
  {
    id: 'IND001',
    name: 'Configuration File Integrity',
    description: 'Validates device configuration file can be read and parsed.',
    category: 'integration',
    type: 'diagnostic',
    runnable: true,
    run: async ({ deviceConfigStore }) => {
      try {
        const settings = deviceConfigStore.getSettings();
        const devices = Array.from(deviceConfigStore.getAllDevices().values());

        return {
          status: 'green',
          message: 'Configuration file is valid and readable.',
          details: {
            deviceCount: devices.length,
            hasCustomPath: !!settings.scenesPath,
            hasMqttConfig: !!settings.mqttBrokerUrl,
          },
        };
      } catch (error) {
        return {
          status: 'red',
          message: `Configuration file error: ${error.message}`,
          details: { error: error.message },
        };
      }
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
    testResultsParser = null,
  }) {
    this.logger = logger || require('../logger');
    this.stateStore = stateStore;
    this.deviceService = deviceService;
    this.systemService = systemService;
    this.sceneService = sceneService;
    this.watchdogService = watchdogService;
    this.deviceConfigStore = deviceConfigStore;
    this.testResultsParser = testResultsParser;

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
      category: test.category || 'system',
      type: test.type || 'diagnostic',
      runnable: typeof test.runnable === 'boolean' ? test.runnable : true,
      latest: this.results[test.id] || null,
    }));
  }

  getDiagnosticTests() {
    return this.listTests();
  }

  async getAllTests() {
    const diagnostics = this.getDiagnosticTests();
    const automated = await this.#parseAutomatedTests();
    return [...diagnostics, ...automated];
  }

  async #parseAutomatedTests() {
    if (!this.testResultsParser?.parse) {
      return [];
    }

    try {
      const results = await this.testResultsParser.parse();
      if (!Array.isArray(results)) {
        return [];
      }

      return results.map((test) => ({
        ...test,
        category: test.category || 'unit-tests',
        type: test.type || 'automated',
        runnable: false,
        latest:
          test.latest && typeof test.latest === 'object'
            ? {
                status: ['green', 'yellow', 'red'].includes(test.latest.status)
                  ? test.latest.status
                  : 'red',
                message: test.latest.message || 'Test result available.',
                details: test.latest.details || {},
                durationMs: test.latest.durationMs ?? null,
                lastRun: test.latest.lastRun || new Date().toISOString(),
              }
            : null,
      }));
    } catch (error) {
      this.logger?.warn?.('[DIAG] Failed to parse automated test results', {
        error: error?.message,
      });
      return [];
    }
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

      // Wrap test execution with timeout (30 seconds)
      const timeoutMs = 30000;
      const outcome = await Promise.race([
        test.run(context),
        new Promise((_resolve, reject) =>
          setTimeout(
            () => reject(new Error(`Test timed out after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);

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
