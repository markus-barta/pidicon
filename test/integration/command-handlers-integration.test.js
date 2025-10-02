/**
 * @fileoverview Integration tests for command handlers
 * @description PROPER integration tests that verify the full MQTT → Handler → SceneManager flow
 * This is what we should have done from the start.
 * @author Markus Barta (mba) with assistance from Cursor AI
 */

const assert = require('node:assert');
const { describe, it, beforeEach } = require('node:test');

const DriverCommandHandler = require('../../lib/commands/driver-command-handler');
const ResetCommandHandler = require('../../lib/commands/reset-command-handler');
const SceneCommandHandler = require('../../lib/commands/scene-command-handler');
const StateCommandHandler = require('../../lib/commands/state-command-handler');

describe('Command Handlers - Integration Tests', () => {
  // Helper to create a mock logger that captures logs
  function createMockLogger() {
    const logs = [];
    return {
      logs,
      ok: (msg, ctx) => logs.push({ level: 'ok', msg, ctx }),
      info: (msg, ctx) => logs.push({ level: 'info', msg, ctx }),
      warn: (msg, ctx) => logs.push({ level: 'warn', msg, ctx }),
      error: (msg, ctx) => logs.push({ level: 'error', msg, ctx }),
      debug: (msg, ctx) => logs.push({ level: 'debug', msg, ctx }),
    };
  }

  // Helper to create a mock MQTT service that captures publishes
  function createMockMqttService() {
    const published = [];
    return {
      published,
      publish: (topic, payload) => {
        published.push({ topic, payload });
      },
    };
  }

  describe('StateCommandHandler - Full Integration', () => {
    let logger, mqttService, sceneManager, deviceDefaults, lastState;
    let switchSceneCalls, getDeviceSceneStateCalls;

    beforeEach(() => {
      logger = createMockLogger();
      mqttService = createMockMqttService();
      deviceDefaults = new Map([['192.168.1.100', 'empty']]);
      lastState = {};
      switchSceneCalls = [];
      getDeviceSceneStateCalls = [];

      sceneManager = {
        hasScene: (name) => {
          return ['empty', 'test-scene', 'graphics_engine_demo'].includes(name);
        },
        switchScene: async (sceneName, context) => {
          switchSceneCalls.push({ sceneName, context });
          return true; // success
        },
        getDeviceSceneState: (deviceIp) => {
          getDeviceSceneStateCalls.push(deviceIp);
          return {
            currentScene: 'empty',
            generationId: 1,
            status: 'running',
          };
        },
      };
    });

    it('should handle scene change request end-to-end', async () => {
      const handler = new StateCommandHandler({
        logger,
        mqttService,
        deviceDefaults,
        lastState,
        sceneManager,
        getContext: (deviceIp, sceneName) => ({
          deviceIp,
          env: { host: deviceIp, width: 64, height: 64 },
          scene: sceneName,
        }),
        publishMetrics: () => {},
        getDevice: () => ({ clear: async () => {} }),
        getDriverForDevice: () => 'mock',
        versionInfo: {
          version: '2.0.0',
          buildNumber: 478,
          gitCommit: 'd8328a6',
        },
      });

      // Simulate MQTT message: {"scene":"test-scene"}
      await handler.handle('192.168.1.100', 'upd', { scene: 'test-scene' });

      // Verify switchScene was called
      assert.strictEqual(switchSceneCalls.length, 1);
      assert.strictEqual(switchSceneCalls[0].sceneName, 'test-scene');
      assert.strictEqual(switchSceneCalls[0].context.deviceIp, '192.168.1.100');

      // Verify scene state was published
      const statePublishes = mqttService.published.filter((p) =>
        p.topic.includes('/scene/state'),
      );
      assert.ok(statePublishes.length >= 2); // switching + running

      // Verify lastState was updated
      assert.strictEqual(lastState['192.168.1.100'].sceneName, 'test-scene');

      // Verify logs indicate success
      const infoLogs = logger.logs.filter((l) => l.level === 'info');
      assert.ok(infoLogs.some((l) => l.msg.includes('State update')));
    });

    it('should reject unknown scene', async () => {
      const handler = new StateCommandHandler({
        logger,
        mqttService,
        deviceDefaults,
        lastState,
        sceneManager,
        getContext: () => ({
          deviceIp: '192.168.1.100',
          env: { host: '192.168.1.100' },
        }),
        publishMetrics: () => {},
        getDevice: () => ({ clear: async () => {} }),
        getDriverForDevice: () => 'mock',
        versionInfo: {
          version: '2.0.0',
          buildNumber: 478,
          gitCommit: 'd8328a6',
        },
      });

      // Simulate MQTT message with unknown scene
      await handler.handle('192.168.1.100', 'upd', { scene: 'unknown-scene' });

      // Verify switchScene was NOT called
      assert.strictEqual(switchSceneCalls.length, 0);

      // Verify warning was logged
      const warnLogs = logger.logs.filter((l) => l.level === 'warn');
      assert.ok(warnLogs.some((l) => l.msg.includes('No renderer found')));
    });

    it('should use default scene when no scene specified', async () => {
      const handler = new StateCommandHandler({
        logger,
        mqttService,
        deviceDefaults,
        lastState,
        sceneManager,
        getContext: (deviceIp, sceneName) => ({
          deviceIp,
          sceneName,
          env: { host: deviceIp },
        }),
        publishMetrics: () => {},
        getDevice: () => ({ clear: async () => {} }),
        getDriverForDevice: () => 'mock',
        versionInfo: {
          version: '2.0.0',
          buildNumber: 478,
          gitCommit: 'd8328a6',
        },
      });

      // Simulate MQTT message without scene (should use default)
      await handler.handle('192.168.1.100', 'upd', {});

      // Verify switchScene was called with default scene
      assert.strictEqual(switchSceneCalls.length, 1);
      assert.strictEqual(switchSceneCalls[0].sceneName, 'empty'); // default from deviceDefaults
    });

    it('should gate animation frames', async () => {
      const handler = new StateCommandHandler({
        logger,
        mqttService,
        deviceDefaults,
        lastState,
        sceneManager,
        getContext: () => ({
          deviceIp: '192.168.1.100',
          env: { host: '192.168.1.100' },
        }),
        publishMetrics: () => {},
        getDevice: () => ({ clear: async () => {} }),
        getDriverForDevice: () => 'mock',
        versionInfo: {
          version: '2.0.0',
          buildNumber: 478,
          gitCommit: 'd8328a6',
        },
      });

      // Simulate animation frame (should be ignored)
      await handler.handle('192.168.1.100', 'upd', {
        scene: 'test-scene',
        _isAnimationFrame: true,
        generationId: 123,
      });

      // Verify switchScene was NOT called (animation frames are gated)
      assert.strictEqual(switchSceneCalls.length, 0);

      // Verify log indicates gating
      const infoLogs = logger.logs.filter((l) => l.level === 'info');
      assert.ok(infoLogs.some((l) => l.msg.includes('[GATE]')));
    });

    it('should clear screen on scene change', async () => {
      let clearCalled = false;
      const handler = new StateCommandHandler({
        logger,
        mqttService,
        deviceDefaults,
        lastState: { '192.168.1.100': { sceneName: 'old-scene', payload: {} } },
        sceneManager,
        getContext: (deviceIp, sceneName) => ({
          deviceIp,
          sceneName,
          env: { host: deviceIp },
        }),
        publishMetrics: () => {},
        getDevice: () => ({
          clear: async () => {
            clearCalled = true;
          },
        }),
        getDriverForDevice: () => 'mock',
        versionInfo: {
          version: '2.0.0',
          buildNumber: 478,
          gitCommit: 'd8328a6',
        },
      });

      // Simulate scene change
      await handler.handle('192.168.1.100', 'upd', { scene: 'test-scene' });

      // Verify clear was called
      assert.strictEqual(clearCalled, true);

      // Verify log indicates clearing
      const okLogs = logger.logs.filter((l) => l.level === 'ok');
      assert.ok(okLogs.some((l) => l.msg.includes('Cleared screen')));
    });
  });

  describe('SceneCommandHandler - Full Integration', () => {
    it('should set default scene for device', async () => {
      const logger = createMockLogger();
      const mqttService = createMockMqttService();
      const deviceDefaults = new Map();

      const handler = new SceneCommandHandler({
        logger,
        mqttService,
        deviceDefaults,
      });

      // Simulate MQTT: pixoo/192.168.1.100/scene/set {"name":"test-scene"}
      await handler.handle('192.168.1.100', 'set', { name: 'test-scene' });

      // Verify default was set
      assert.strictEqual(deviceDefaults.get('192.168.1.100'), 'test-scene');

      // Verify MQTT publish
      assert.strictEqual(mqttService.published.length, 1);
      assert.strictEqual(
        mqttService.published[0].topic,
        'pixoo/192.168.1.100/scene',
      );
      assert.strictEqual(
        mqttService.published[0].payload.default,
        'test-scene',
      );

      // Verify log
      const okLogs = logger.logs.filter((l) => l.level === 'ok');
      assert.ok(okLogs.some((l) => l.msg.includes('Default scene')));
    });
  });

  describe('DriverCommandHandler - Full Integration', () => {
    it('should switch driver and re-render', async () => {
      const logger = createMockLogger();
      const mqttService = createMockMqttService();
      const lastState = {
        '192.168.1.100': {
          sceneName: 'test-scene',
          payload: { data: 'test' },
        },
      };
      let driverSet = null;
      const renderCalls = [];

      const handler = new DriverCommandHandler({
        logger,
        mqttService,
        setDriverForDevice: (deviceIp, driver) => {
          driverSet = { deviceIp, driver };
          return driver;
        },
        lastState,
        sceneManager: {
          hasScene: () => true,
          renderActiveScene: async (ctx) => {
            renderCalls.push(ctx);
          },
        },
        getContext: (deviceIp, sceneName) => ({
          deviceIp,
          sceneName,
          env: { host: deviceIp },
        }),
        publishMetrics: () => {},
      });

      // Simulate MQTT: pixoo/192.168.1.100/driver/set {"driver":"real"}
      await handler.handle('192.168.1.100', 'set', { driver: 'real' });

      // Verify driver was set
      assert.ok(driverSet);
      assert.strictEqual(driverSet.deviceIp, '192.168.1.100');
      assert.strictEqual(driverSet.driver, 'real');

      // Verify re-render was triggered
      assert.strictEqual(renderCalls.length, 1);
      assert.strictEqual(renderCalls[0].deviceIp, '192.168.1.100');

      // Verify MQTT publish
      const driverPublishes = mqttService.published.filter((p) =>
        p.topic.includes('/driver'),
      );
      assert.ok(driverPublishes.length > 0);
      assert.strictEqual(driverPublishes[0].payload.driver, 'real');
    });
  });

  describe('ResetCommandHandler - Full Integration', () => {
    it('should perform soft reset', async () => {
      const logger = createMockLogger();
      const mqttService = createMockMqttService();
      let resetCalled = null;

      const handler = new ResetCommandHandler({
        logger,
        mqttService,
        softReset: async (deviceIp) => {
          resetCalled = deviceIp;
          return true; // success
        },
      });

      // Simulate MQTT: pixoo/192.168.1.100/reset/set {}
      await handler.handle('192.168.1.100', 'set', {});

      // Verify reset was called
      assert.strictEqual(resetCalled, '192.168.1.100');

      // Verify MQTT publish
      assert.strictEqual(mqttService.published.length, 1);
      assert.strictEqual(
        mqttService.published[0].topic,
        'pixoo/192.168.1.100/reset',
      );
      assert.strictEqual(mqttService.published[0].payload.ok, true);

      // Verify log
      const okLogs = logger.logs.filter((l) => l.level === 'ok');
      assert.ok(okLogs.some((l) => l.msg.includes('reset successfully')));
    });
  });

  describe('Error Handling - Integration', () => {
    it('should publish error on scene switch failure', async () => {
      const logger = createMockLogger();
      const mqttService = createMockMqttService();

      const handler = new StateCommandHandler({
        logger,
        mqttService,
        deviceDefaults: new Map(),
        lastState: {},
        sceneManager: {
          hasScene: () => true,
          switchScene: async () => {
            throw new Error('Scene switch failed!');
          },
          getDeviceSceneState: () => ({
            currentScene: 'empty',
            generationId: 1,
            status: 'running',
          }),
        },
        getContext: () => ({
          deviceIp: '192.168.1.100',
          env: { host: '192.168.1.100' },
        }),
        publishMetrics: () => {},
        getDevice: () => ({ clear: async () => {} }),
        getDriverForDevice: () => 'mock',
        versionInfo: {
          version: '2.0.0',
          buildNumber: 478,
          gitCommit: 'd8328a6',
        },
      });

      // This should not throw, but should publish error
      await handler.handle('192.168.1.100', 'upd', { scene: 'test-scene' });

      // Verify error was published to MQTT
      const errorPublishes = mqttService.published.filter((p) =>
        p.topic.includes('/error'),
      );
      assert.ok(errorPublishes.length > 0);
      assert.ok(
        errorPublishes[0].payload.error.includes('Scene switch failed'),
      );

      // Verify error was logged
      const errorLogs = logger.logs.filter((l) => l.level === 'error');
      assert.ok(
        errorLogs.some((l) => l.ctx.error.includes('Scene switch failed')),
      );
    });
  });
});
