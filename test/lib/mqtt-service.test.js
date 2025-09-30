/**
 * @fileoverview Tests for MqttService
 * @module test/lib/mqtt-service.test.js
 */

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const MqttService = require('../../lib/mqtt-service');

// Mock logger
const createMockLogger = () => ({
  ok: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
});

describe('MqttService', () => {
  describe('Constructor', () => {
    it('should create service with default config', () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      assert.strictEqual(service.logger, logger);
      assert.strictEqual(service.config.brokerUrl, 'mqtt://localhost:1883');
      assert.strictEqual(service.connected, false);
      assert.strictEqual(service.client, null);
    });

    it('should create service with custom config', () => {
      const logger = createMockLogger();
      const config = {
        brokerUrl: 'mqtt://test.broker:1883',
        username: 'testuser',
        password: 'testpass',
        options: { clientId: 'test-client' },
      };
      const service = new MqttService({ logger, config });

      assert.strictEqual(service.config.brokerUrl, 'mqtt://test.broker:1883');
      assert.strictEqual(service.config.username, 'testuser');
      assert.strictEqual(service.config.password, 'testpass');
      assert.deepStrictEqual(service.config.options, {
        clientId: 'test-client',
      });
    });
  });

  describe('Message Handler Registration', () => {
    it('should register message handler', () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      const handler = async () => {};
      service.registerHandler('scene', handler);

      assert.ok(service.messageHandlers.has('scene'));
      assert.strictEqual(service.messageHandlers.get('scene'), handler);
    });

    it('should register multiple handlers', () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      const sceneHandler = async () => {};
      const driverHandler = async () => {};

      service.registerHandler('scene', sceneHandler);
      service.registerHandler('driver', driverHandler);

      assert.strictEqual(service.messageHandlers.size, 2);
      assert.ok(service.messageHandlers.has('scene'));
      assert.ok(service.messageHandlers.has('driver'));
    });

    it('should unregister handlers', () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      const handler = async () => {};
      service.registerHandler('test', handler);
      assert.ok(service.messageHandlers.has('test'));

      service.unregisterHandler('test');
      assert.strictEqual(service.messageHandlers.has('test'), false);
    });

    it('should throw error if handler is not a function', () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      assert.throws(() => {
        service.registerHandler('test', 'not a function');
      }, /Handler for section 'test' must be a function/);
    });
  });

  describe('Message Handling', () => {
    it('should parse and route messages to handlers', async () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      let handlerCalled = false;
      let receivedDeviceIp = null;
      let receivedAction = null;
      let receivedPayload = null;

      const testHandler = async (deviceIp, action, payload) => {
        handlerCalled = true;
        receivedDeviceIp = deviceIp;
        receivedAction = action;
        receivedPayload = payload;
      };

      service.registerHandler('scene', testHandler);

      const topic = 'pixoo/192.168.1.1/scene/set';
      const payload = { scene: 'startup' };
      const message = Buffer.from(JSON.stringify(payload));

      await service._handleMessage(topic, message);

      assert.strictEqual(handlerCalled, true);
      assert.strictEqual(receivedDeviceIp, '192.168.1.1');
      assert.strictEqual(receivedAction, 'set');
      assert.deepStrictEqual(receivedPayload, { scene: 'startup' });
    });

    it('should handle topics without action', async () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      let receivedAction = 'not-null';

      const testHandler = async (_deviceIp, action) => {
        receivedAction = action;
      };

      service.registerHandler('state', testHandler);

      const topic = 'pixoo/192.168.1.1/state';
      const message = Buffer.from(JSON.stringify({ test: 'data' }));

      await service._handleMessage(topic, message);

      assert.strictEqual(receivedAction, null);
    });

    it('should handle invalid JSON gracefully', async () => {
      const logs = [];
      const logger = {
        ok: (msg, meta) => logs.push({ level: 'ok', msg, meta }),
        info: (msg, meta) => logs.push({ level: 'info', msg, meta }),
        warn: (msg, meta) => logs.push({ level: 'warn', msg, meta }),
        error: (msg, meta) => logs.push({ level: 'error', msg, meta }),
        debug: (msg, meta) => logs.push({ level: 'debug', msg, meta }),
      };
      const service = new MqttService({ logger });

      const topic = 'pixoo/192.168.1.1/scene/set';
      const message = Buffer.from('invalid json{');

      let errorEmitted = false;
      let emittedError = null;

      service.once('error', (err) => {
        errorEmitted = true;
        emittedError = err;
      });

      // Should not throw, but log and emit error
      try {
        await service._handleMessage(topic, message);
      } catch {
        assert.fail('_handleMessage should not throw, should catch internally');
      }

      // Verify error was logged
      const errorLogs = logs.filter((l) => l.level === 'error');
      assert.ok(errorLogs.length > 0, 'Should log error for invalid JSON');
      assert.ok(
        errorLogs.some((l) => l.msg.includes('parsing')),
        'Error message should mention parsing',
      );

      // Verify error was emitted
      assert.ok(errorEmitted, 'Should emit error event');
      assert.ok(
        emittedError.message.includes('JSON'),
        'Error should be about JSON parsing',
      );
    });
  });

  describe('Utility Methods', () => {
    it('should report connection status', () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      assert.strictEqual(service.isConnected(), false);

      service.connected = true;
      assert.strictEqual(service.isConnected(), true);
    });

    it('should return registered handlers', () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      service.registerHandler('scene', async () => {});
      service.registerHandler('driver', async () => {});
      service.registerHandler('state', async () => {});

      const handlers = service.getHandlers();

      assert.strictEqual(handlers.length, 3);
      assert.ok(handlers.includes('scene'));
      assert.ok(handlers.includes('driver'));
      assert.ok(handlers.includes('state'));
    });

    it('should start with no handlers', () => {
      const logger = createMockLogger();
      const service = new MqttService({ logger });

      assert.strictEqual(service.getHandlers().length, 0);
    });
  });
});
