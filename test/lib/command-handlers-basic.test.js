/**
 * @fileoverview Basic smoke tests for all command handlers
 * @description Verifies command handlers can be instantiated and handle basic commands
 * without crashing. More detailed integration tests will be added later.
 * @author Markus Barta (mba) with assistance from Cursor AI
 */

const assert = require('node:assert');
const { describe, it } = require('node:test');

const CommandRouter = require('../../lib/commands/command-router');
const DriverCommandHandler = require('../../lib/commands/driver-command-handler');
const ResetCommandHandler = require('../../lib/commands/reset-command-handler');
const SceneCommandHandler = require('../../lib/commands/scene-command-handler');
const StateCommandHandler = require('../../lib/commands/state-command-handler');

describe('Command Handlers - Basic Smoke Tests', () => {
  const mockLogger = {
    ok: () => {},
    warn: () => {},
    error: () => {},
    info: () => {},
    debug: () => {},
  };

  const mockMqttService = {
    publish: () => {},
  };

  describe('SceneCommandHandler', () => {
    it('should instantiate successfully', () => {
      const handler = new SceneCommandHandler({
        logger: mockLogger,
        mqttService: mockMqttService,
        deviceDefaults: new Map(),
      });
      assert.ok(handler);
    });

    it('should handle scene/set without crashing', async () => {
      const deviceDefaults = new Map();
      const handler = new SceneCommandHandler({
        logger: mockLogger,
        mqttService: mockMqttService,
        deviceDefaults,
      });

      await handler.handle('192.168.1.1', 'set', { name: 'test' });
      assert.strictEqual(deviceDefaults.get('192.168.1.1'), 'test');
    });
  });

  describe('DriverCommandHandler', () => {
    it('should instantiate successfully', () => {
      const handler = new DriverCommandHandler({
        logger: mockLogger,
        mqttService: mockMqttService,
        setDriverForDevice: () => 'mock',
        lastState: {},
        sceneManager: { hasScene: () => false },
        getContext: () => ({}),
        publishMetrics: () => {},
      });
      assert.ok(handler);
    });

    it('should handle driver/set without crashing', async () => {
      let capturedDriver = null;
      const handler = new DriverCommandHandler({
        logger: mockLogger,
        mqttService: mockMqttService,
        setDriverForDevice: (_, driver) => {
          capturedDriver = driver;
          return driver;
        },
        lastState: {},
        sceneManager: { hasScene: () => false },
        getContext: () => ({}),
        publishMetrics: () => {},
      });

      await handler.handle('192.168.1.1', 'set', { driver: 'mock' });
      assert.strictEqual(capturedDriver, 'mock');
    });
  });

  describe('ResetCommandHandler', () => {
    it('should instantiate successfully', () => {
      const handler = new ResetCommandHandler({
        logger: mockLogger,
        mqttService: mockMqttService,
        softReset: async () => {},
      });
      assert.ok(handler);
    });

    it('should handle reset/set without crashing', async () => {
      let resetCalled = false;
      const handler = new ResetCommandHandler({
        logger: mockLogger,
        mqttService: mockMqttService,
        softReset: async () => {
          resetCalled = true;
        },
      });

      await handler.handle('192.168.1.1', 'set', {});
      assert.strictEqual(resetCalled, true);
    });
  });

  describe('StateCommandHandler', () => {
    it('should instantiate successfully', () => {
      const handler = new StateCommandHandler({
        logger: mockLogger,
        mqttService: mockMqttService,
        deviceDefaults: new Map(),
        lastState: {},
        sceneManager: {},
        getContext: () => ({}),
        publishMetrics: () => {},
      });
      assert.ok(handler);
    });

    it('should handle state/upd without crashing', async () => {
      const handler = new StateCommandHandler({
        logger: mockLogger,
        mqttService: mockMqttService,
        deviceDefaults: new Map([['192.168.1.1', 'empty']]),
        lastState: {},
        sceneManager: {
          hasScene: () => true,
          render: async () => {},
        },
        getContext: () => ({ deviceIp: '192.168.1.1' }),
        publishMetrics: () => {},
      });

      // Should not throw
      await handler.handle('192.168.1.1', 'upd', {});
      assert.ok(true);
    });
  });

  describe('CommandRouter', () => {
    it('should instantiate successfully', () => {
      const router = new CommandRouter({
        logger: mockLogger,
        handlers: {},
      });
      assert.ok(router);
    });

    it('should register and route commands', async () => {
      let handlerCalled = false;
      const mockHandler = {
        // eslint-disable-next-line no-unused-vars
        handle: async (deviceIp, action, payload) => {
          handlerCalled = true;
        },
      };

      const handlers = { scene: mockHandler };
      const router = new CommandRouter({
        logger: mockLogger,
        handlers,
      });

      await router.route('pixoo/192.168.1.1/scene/set', {});

      assert.strictEqual(
        handlerCalled,
        true,
        'Handler should have been called',
      );
    });

    it('should handle unknown section gracefully', async () => {
      const router = new CommandRouter({
        logger: mockLogger,
        handlers: {},
      });

      // Should not throw
      await router.route('pixoo/192.168.1.1/unknown/set', {});
      assert.ok(true);
    });
  });
});
