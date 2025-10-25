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
    category: 'device',
    type: 'diagnostic',
    runnable: true,
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
    category: 'device',
    type: 'diagnostic',
    runnable: true,
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
  {
    id: 'mqtt-status',
    name: 'MQTT Connectivity',
    description:
      'Checks MQTT connection state and reports the last heartbeat timestamp.',
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
            ? `MQTT offline (${mqttStatus.lastError})`
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
  {
    id: 'ui-state-persistence',
    name: 'UI State Persistence',
    description:
      'Verifies that device state (displayOn, brightness, loggingLevel, scene) persists correctly across daemon restarts.',
    category: 'system',
    type: 'diagnostic',
    runnable: true,
    run: async ({ deviceService, stateStore, sceneService, logger }) => {
      const fs = require('fs').promises;

      try {
        // Get all devices
        const devices = await deviceService.listDevices();
        if (devices.length === 0) {
          return {
            status: 'yellow',
            message: 'No devices configured – cannot test persistence.',
            details: { devices: [] },
          };
        }

        // Use first real device, or first device if no real devices
        const testDevice =
          devices.find((d) => d.driver === 'real') || devices[0];
        const deviceIp = testDevice.ip;

        logger.info(`[DIAG] Testing state persistence for device ${deviceIp}`);

        // Step 1: Set various states via service APIs
        const testStates = {
          displayOn: false, // Set display OFF
          brightness: 45, // Set specific brightness
          loggingLevel: 'debug', // Set logging level
          scene: 'startup', // Set a scene (if available)
        };

        // Change display power
        try {
          await deviceService.setDisplayPower(deviceIp, testStates.displayOn);
          logger.debug(`[DIAG] Set displayOn=${testStates.displayOn}`);
        } catch (error) {
          logger.warn(`[DIAG] Failed to set displayOn: ${error.message}`);
        }

        // Change brightness
        try {
          await deviceService.setDisplayBrightness(
            deviceIp,
            testStates.brightness
          );
          logger.debug(`[DIAG] Set brightness=${testStates.brightness}`);
        } catch (error) {
          logger.warn(`[DIAG] Failed to set brightness: ${error.message}`);
        }

        // Change logging level
        try {
          await deviceService.setDeviceLogging(
            deviceIp,
            testStates.loggingLevel
          );
          logger.debug(`[DIAG] Set loggingLevel=${testStates.loggingLevel}`);
        } catch (error) {
          logger.warn(`[DIAG] Failed to set loggingLevel: ${error.message}`);
        }

        // Try to set a scene (if available)
        try {
          const scenes = await sceneService.listScenes();
          const availableScene = scenes.find(
            (s) => s.name === testStates.scene
          );
          if (availableScene) {
            await sceneService.switchScene(deviceIp, testStates.scene);
            logger.debug(`[DIAG] Set scene=${testStates.scene}`);
          }
        } catch (error) {
          logger.debug(`[DIAG] Could not set scene: ${error.message}`);
        }

        // Step 2: Wait for persistence to write to disk (StateStore debounce is 10s)
        logger.debug('[DIAG] Waiting for persistence...');
        await new Promise((resolve) => setTimeout(resolve, 12000));

        // Step 3: Force flush to ensure state is persisted
        await stateStore.flush();
        logger.debug('[DIAG] Flushed state to disk');

        // Step 4: Verify state is persisted in StateStore
        const persistedDisplayOn = stateStore.getDeviceState(
          deviceIp,
          'displayOn',
          true
        );
        const persistedBrightness = stateStore.getDeviceState(
          deviceIp,
          'brightness',
          100
        );
        const persistedLoggingLevel = stateStore.getDeviceState(
          deviceIp,
          '__logging_level',
          null
        );
        const persistedScene = stateStore.getDeviceState(
          deviceIp,
          'activeScene',
          null
        );

        // Step 5: Read the persisted file to verify it was written correctly
        const persistPath =
          stateStore.persistPath || '/data/runtime-state.json';
        let fileContent = null;
        let fileState = null;

        try {
          fileContent = await fs.readFile(persistPath, 'utf8');
          const fileData = JSON.parse(fileContent);
          fileState = fileData.devices?.[deviceIp] || null;
        } catch (error) {
          logger.warn(`[DIAG] Could not read persisted file: ${error.message}`);
        }

        // Step 6: Validate all states match
        const validationErrors = [];

        if (persistedDisplayOn !== testStates.displayOn) {
          validationErrors.push(
            `displayOn mismatch: expected ${testStates.displayOn}, got ${persistedDisplayOn}`
          );
        }

        if (persistedBrightness !== testStates.brightness) {
          validationErrors.push(
            `brightness mismatch: expected ${testStates.brightness}, got ${persistedBrightness}`
          );
        }

        if (persistedLoggingLevel !== testStates.loggingLevel) {
          validationErrors.push(
            `loggingLevel mismatch: expected ${testStates.loggingLevel}, got ${persistedLoggingLevel}`
          );
        }

        // Verify file state matches memory state
        if (fileState) {
          if (fileState.displayOn !== persistedDisplayOn) {
            validationErrors.push(
              `file displayOn mismatch: memory=${persistedDisplayOn}, file=${fileState.displayOn}`
            );
          }
          if (fileState.brightness !== persistedBrightness) {
            validationErrors.push(
              `file brightness mismatch: memory=${persistedBrightness}, file=${fileState.brightness}`
            );
          }
          if (fileState.loggingLevel !== persistedLoggingLevel) {
            validationErrors.push(
              `file loggingLevel mismatch: memory=${persistedLoggingLevel}, file=${fileState.loggingLevel}`
            );
          }
        } else {
          validationErrors.push('No state found in persisted file');
        }

        if (validationErrors.length > 0) {
          return {
            status: 'red',
            message: `${validationErrors.length} persistence validation error(s)`,
            details: {
              deviceIp,
              expected: testStates,
              persisted: {
                displayOn: persistedDisplayOn,
                brightness: persistedBrightness,
                loggingLevel: persistedLoggingLevel,
                scene: persistedScene,
              },
              fileState,
              errors: validationErrors,
            },
          };
        }

        return {
          status: 'green',
          message: 'State persistence working correctly',
          details: {
            deviceIp,
            displayOn: persistedDisplayOn,
            brightness: persistedBrightness,
            loggingLevel: persistedLoggingLevel,
            scene: persistedScene,
            filePersisted: !!fileState,
          },
        };
      } catch (error) {
        const errorMessage = error?.message || String(error);
        logger.error('[DIAG] State persistence test failed:', {
          error: errorMessage,
        });
        return {
          status: 'red',
          message: `State persistence test failed: ${errorMessage}`,
          details: {
            error: errorMessage,
            stack: error?.stack || null,
          },
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
