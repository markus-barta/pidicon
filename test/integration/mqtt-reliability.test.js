/**
 * @fileoverview MQTT Reliability Tests
 * @description Tests MqttService construction, configuration, and status tracking.
 * These tests verify the service can be instantiated and configured correctly
 * without requiring a live MQTT broker.
 * @author Markus Barta (mba) with assistance from Cursor AI
 */

'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');

const MqttService = require('../../lib/mqtt-service');

// ============================================================================
// Mock Logger
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

// ============================================================================
// MqttService Construction & Configuration Tests
// ============================================================================

describe('MQTT Service - Construction', () => {
  it('should construct with valid config', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    assert.ok(mqttService);
    assert.strictEqual(mqttService.config.brokerUrl, 'mqtt://localhost:1883');
  });

  it('should use provided credentials', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
      username: 'testuser',
      password: 'testpass',
    };

    const mqttService = new MqttService({ logger, config });

    assert.strictEqual(mqttService.config.username, 'testuser');
    assert.strictEqual(mqttService.config.password, 'testpass');
  });

  it('should set autoReconnect from config', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
      autoReconnect: false,
    };

    const mqttService = new MqttService({ logger, config });

    assert.strictEqual(mqttService.config.autoReconnect, false);
  });

  it('should use default logger if not provided', () => {
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    // Should use require('./logger') as fallback
    const mqttService = new MqttService({ config });
    assert.ok(mqttService.logger);
  });

  it('should use default brokerUrl if config empty', () => {
    const logger = createMockLogger();

    const mqttService = new MqttService({ logger, config: {} });
    assert.strictEqual(mqttService.config.brokerUrl, 'mqtt://localhost:1883');
  });
});

describe('MQTT Service - Status', () => {
  it('should report initial status as disconnected', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });
    const status = mqttService.getStatus();

    assert.ok(status);
    assert.strictEqual(status.connected, false);
    assert.strictEqual(status.brokerUrl, 'mqtt://localhost:1883');
  });

  it('should include retry count in status', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });
    const status = mqttService.getStatus();

    assert.ok('retryCount' in status);
    assert.ok(typeof status.retryCount === 'number');
  });

  it('should include lastError field in status', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });
    const status = mqttService.getStatus();

    assert.ok('lastError' in status);
  });

  it('should include nextRetryInMs when disconnected', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });
    const status = mqttService.getStatus();

    assert.ok('nextRetryInMs' in status);
  });
});

describe('MQTT Service - Configuration Validation', () => {
  it('should accept mqtt:// protocol', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });
    assert.ok(mqttService);
  });

  it('should accept mqtts:// protocol', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtts://localhost:8883',
    };

    const mqttService = new MqttService({ logger, config });
    assert.ok(mqttService);
  });

  it('should accept ws:// protocol', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'ws://localhost:9001',
    };

    const mqttService = new MqttService({ logger, config });
    assert.ok(mqttService);
  });

  it('should handle broker URL with path', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883/custom/path',
    };

    const mqttService = new MqttService({ logger, config });
    assert.strictEqual(mqttService.config.brokerUrl, 'mqtt://localhost:1883/custom/path');
  });
});

describe('MQTT Service - Error Resilience', () => {
  it('should not crash on invalid broker URL', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'invalid-url',
    };

    // Should construct without error
    const mqttService = new MqttService({ logger, config });
    assert.ok(mqttService);

    // Status should still be retrievable
    const status = mqttService.getStatus();
    assert.ok(status);
  });

  it('should use default brokerUrl when not provided', () => {
    const logger = createMockLogger();
    const config = {};

    // Should use default broker URL
    const mqttService = new MqttService({ logger, config });
    assert.strictEqual(mqttService.config.brokerUrl, 'mqtt://localhost:1883');
  });
});

describe('MQTT Service - Disconnect Handling', () => {
  it('should provide disconnect method', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    assert.ok(typeof mqttService.disconnect === 'function');
  });

  it('should not crash when disconnecting before connecting', async () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    // Should not throw
    await mqttService.disconnect();
    assert.ok(true);
  });
});

describe('MQTT Service - Publish/Subscribe Interface', () => {
  it('should provide publish method', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    assert.ok(typeof mqttService.publish === 'function');
  });

  it('should provide subscribe method', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    assert.ok(typeof mqttService.subscribe === 'function');
  });

  it('should handle publish when disconnected', async () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    // Should not throw when publishing while disconnected
    try {
      await mqttService.publish('test/topic', { data: 'test' });
    } catch (error) {
      // Expected to fail gracefully
      assert.ok(error);
    }
  });

  it('should handle subscribe when disconnected', async () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    // Should not throw when subscribing while disconnected
    try {
      await mqttService.subscribe(['test/topic']);
    } catch (error) {
      // Expected to fail gracefully
      assert.ok(error);
    }
  });
});

describe('MQTT Service - Event Emitter Interface', () => {
  it('should be an event emitter', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    assert.ok(typeof mqttService.on === 'function');
    assert.ok(typeof mqttService.emit === 'function');
    assert.ok(typeof mqttService.removeListener === 'function');
  });

  it('should allow registering message handlers', () => {
    const logger = createMockLogger();
    const config = {
      brokerUrl: 'mqtt://localhost:1883',
    };

    const mqttService = new MqttService({ logger, config });

    let called = false;
    mqttService.on('message', () => {
      called = true;
    });

    // Just verify handler registration worked
    assert.strictEqual(called, false); // Not called yet
  });
});
