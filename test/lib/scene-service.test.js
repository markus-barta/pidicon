/* eslint-disable */
/**
 * @fileoverview SceneService Unit Tests (Phase 4.3)
 * @description Tests for scene management business logic
 */

'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');

const SceneService = require('../../lib/services/scene-service');
const { ValidationError } = require('../../lib/errors');

// ============================================================================
// Mock Factories
// ============================================================================

function createMockLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    ok: () => {},
  };
}

function createMockSceneManager(scenes = new Map()) {
  return {
    scenes,
    getRegisteredScenes: () => Array.from(scenes.keys()),
    hasScene: (name) => scenes.has(name),
    switchScene: async (ip, scene, options) => ({ success: true }),
    getDeviceSceneState: (ip) => ({
      currentScene: 'clock',
      playState: 'running',
      isStatic: false,
    }),
    stopScene: async (ip) => {},
  };
}

function createMockDeviceAdapter() {
  return {
    getDevice: (ip) => ({
      ip,
      impl: {
        driverType: 'real',
      },
    }),
    getContext: (ip) => ({
      device: { ip },
      deviceIp: ip,
    }),
  };
}

function createMockMqttService() {
  let publishedMessages = [];
  return {
    publish: (topic, message) => {
      publishedMessages.push({ topic, message });
    },
    getPublishedMessages: () => publishedMessages,
  };
}

function createMockVersionInfo() {
  return {
    version: '3.0.0',
    buildNumber: 123,
  };
}

// ============================================================================
// Construction Tests
// ============================================================================

describe('SceneService Construction', () => {
  it('should create SceneService with valid dependencies', () => {
    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    assert.ok(service instanceof SceneService);
  });

  it('should throw ValidationError if logger missing', () => {
    assert.throws(
      () => {
        new SceneService({
          sceneManager: createMockSceneManager(),
          deviceAdapter: createMockDeviceAdapter(),
          mqttService: createMockMqttService(),
          versionInfo: createMockVersionInfo(),
        });
      },
      ValidationError
    );
  });

  it('should throw ValidationError if sceneManager missing', () => {
    assert.throws(
      () => {
        new SceneService({
          logger: createMockLogger(),
          deviceAdapter: createMockDeviceAdapter(),
          mqttService: createMockMqttService(),
          versionInfo: createMockVersionInfo(),
        });
      },
      ValidationError
    );
  });

  it('should throw ValidationError if deviceAdapter missing', () => {
    assert.throws(
      () => {
        new SceneService({
          logger: createMockLogger(),
          sceneManager: createMockSceneManager(),
          mqttService: createMockMqttService(),
          versionInfo: createMockVersionInfo(),
        });
      },
      ValidationError
    );
  });

  it('should throw ValidationError if mqttService missing', () => {
    assert.throws(
      () => {
        new SceneService({
          logger: createMockLogger(),
          sceneManager: createMockSceneManager(),
          deviceAdapter: createMockDeviceAdapter(),
          versionInfo: createMockVersionInfo(),
        });
      },
      ValidationError
    );
  });

  it('should throw ValidationError if versionInfo missing', () => {
    assert.throws(
      () => {
        new SceneService({
          logger: createMockLogger(),
          sceneManager: createMockSceneManager(),
          deviceAdapter: createMockDeviceAdapter(),
          mqttService: createMockMqttService(),
        });
      },
      ValidationError
    );
  });
});

// ============================================================================
// listScenes Tests
// ============================================================================

describe('SceneService.listScenes', () => {
  it('should return array of available scenes', async () => {
    const scenes = new Map();
    scenes.set('clock', {
      filePath: 'scenes/pixoo/clock.js',
      description: 'Display current time',
      wantsLoop: true,
      category: 'Utility',
    });
    scenes.set('fill', {
      filePath: 'scenes/pixoo/fill.js',
      description: 'Fill screen with solid color',
      wantsLoop: false,
      category: 'Basic',
    });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    const result = await service.listScenes();

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 2);
    assert.ok(result[0].name);
    assert.ok(result[0].description);
  });

  it('should return empty array when no scenes registered', async () => {
    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(new Map()),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    const result = await service.listScenes();

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  it('should include scene metadata', async () => {
    const scenes = new Map();
    scenes.set('clock', {
      filePath: 'scenes/pixoo/clock.js',
      description: 'Display current time',
      wantsLoop: true,
      category: 'Utility',
      tags: ['time', 'utility'],
      deviceTypes: ['pixoo64'],
    });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    const result = await service.listScenes();

    assert.strictEqual(result[0].name, 'clock');
    assert.strictEqual(result[0].wantsLoop, true);
    assert.strictEqual(result[0].category, 'Utility');
    assert.ok(Array.isArray(result[0].tags));
    assert.ok(Array.isArray(result[0].deviceTypes));
  });

  it('should sort scenes alphabetically by name', async () => {
    const scenes = new Map();
    scenes.set('zebra', { filePath: 'zebra.js' });
    scenes.set('alpha', { filePath: 'alpha.js' });
    scenes.set('beta', { filePath: 'beta.js' });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    const result = await service.listScenes();

    assert.strictEqual(result[0].name, 'alpha');
    assert.strictEqual(result[1].name, 'beta');
    assert.strictEqual(result[2].name, 'zebra');
  });
});

// ============================================================================
// switchToScene Tests
// ============================================================================

describe.skip('SceneService.switchToScene', () => {
  it('should switch to valid scene', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'scenes/pixoo/clock.js' });

    let switchedScene = null;
    const sceneManager = createMockSceneManager(scenes);
    sceneManager.switchScene = async (ip, scene, options) => {
      switchedScene = scene;
      return { success: true };
    };

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    await service.switchToScene('192.168.1.100', 'clock');

    assert.strictEqual(switchedScene, 'clock');
  });

  it('should use default options.clear=true', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    let clearOption = null;
    const sceneManager = createMockSceneManager(scenes);
    sceneManager.switchScene = async (ip, scene, options) => {
      clearOption = options.clear;
      return { success: true };
    };

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    await service.switchToScene('192.168.1.100', 'clock');

    // Default should be true
    assert.strictEqual(clearOption, true);
  });

  it('should respect options.clear=false', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    let clearOption = null;
    const sceneManager = createMockSceneManager(scenes);
    sceneManager.switchScene = async (ip, scene, options) => {
      clearOption = options.clear;
      return { success: true };
    };

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    await service.switchToScene('192.168.1.100', 'clock', { clear: false });

    assert.strictEqual(clearOption, false);
  });

  it('should pass payload to sceneManager', async () => {
    const scenes = new Map();
    scenes.set('fill', { filePath: 'fill.js' });

    let receivedPayload = null;
    const sceneManager = createMockSceneManager(scenes);
    sceneManager.switchScene = async (ip, scene, options) => {
      receivedPayload = options.payload;
      return { success: true };
    };

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    const payload = { color: [255, 0, 0, 255] };
    await service.switchToScene('192.168.1.100', 'fill', { payload });

    assert.deepStrictEqual(receivedPayload, payload);
  });

  it('should reject non-existent scene', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    await assert.rejects(
      async () => {
        await service.switchToScene('192.168.1.100', 'nonexistent');
      },
      (error) => {
        return error.message.includes('not found') || error.message.includes('does not exist');
      }
    );
  });

  it('should publish MQTT status after switch', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    const mqttService = createMockMqttService();

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService,
      versionInfo: createMockVersionInfo(),
    });

    await service.switchToScene('192.168.1.100', 'clock');

    const messages = mqttService.getPublishedMessages();
    assert.ok(messages.length > 0, 'Should publish MQTT message');
  });
});

// ============================================================================
// getCurrentScene Tests
// ============================================================================

describe('SceneService.getCurrentScene', () => {
  it('should return current scene state', async () => {
    const sceneManager = createMockSceneManager();
    sceneManager.getDeviceSceneState = (ip) => ({
      currentScene: 'clock',
      playState: 'running',
      isStatic: false,
    });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    const state = await service.getCurrentScene('192.168.1.100');

    assert.strictEqual(state.currentScene, 'clock');
    assert.strictEqual(state.playState, 'running');
  });

  it('should handle device with no active scene', async () => {
    const sceneManager = createMockSceneManager();
    sceneManager.getDeviceSceneState = (ip) => ({
      currentScene: null,
      playState: 'stopped',
      isStatic: false,
    });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    const state = await service.getCurrentScene('192.168.1.100');

    assert.strictEqual(state.currentScene, null);
    assert.strictEqual(state.playState, 'stopped');
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe.skip('SceneService Error Handling', () => {
  it('should handle sceneManager.switchScene failure', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    const sceneManager = createMockSceneManager(scenes);
    sceneManager.switchScene = async () => {
      throw new Error('Scene switch failed');
    };

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    await assert.rejects(
      async () => {
        await service.switchToScene('192.168.1.100', 'clock');
      },
      (error) => {
        return error.message.includes('failed');
      }
    );
  });

  it('should handle listScenes errors gracefully', async () => {
    const sceneManager = createMockSceneManager();
    sceneManager.getRegisteredScenes = () => {
      throw new Error('Cannot list scenes');
    };

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager,
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    await assert.rejects(
      async () => {
        await service.listScenes();
      },
      (error) => {
        return error.message.includes('Cannot list scenes') || error.message.includes('Failed');
      }
    );
  });

  it('should validate device IP format', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    // Empty IP
    await assert.rejects(
      async () => {
        await service.switchToScene('', 'clock');
      },
      (error) => {
        return error.message.includes('required') || error.message.includes('IP');
      }
    );
  });

  it('should validate scene name is provided', async () => {
    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    // Empty scene name
    await assert.rejects(
      async () => {
        await service.switchToScene('192.168.1.100', '');
      },
      (error) => {
        return error.message.includes('required') || error.message.includes('name');
      }
    );
  });
});

// ============================================================================
// Options Validation Tests
// ============================================================================

describe.skip('SceneService Options Handling', () => {
  it('should handle options as undefined', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    // Should not throw
    await service.switchToScene('192.168.1.100', 'clock', undefined);
    assert.ok(true, 'Handles undefined options');
  });

  it('should handle empty options object', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    await service.switchToScene('192.168.1.100', 'clock', {});
    assert.ok(true, 'Handles empty options');
  });

  it('should ignore extra options fields', async () => {
    const scenes = new Map();
    scenes.set('clock', { filePath: 'clock.js' });

    const service = new SceneService({
      logger: createMockLogger(),
      sceneManager: createMockSceneManager(scenes),
      deviceAdapter: createMockDeviceAdapter(),
      mqttService: createMockMqttService(),
      versionInfo: createMockVersionInfo(),
    });

    // Should not throw with extra fields
    await service.switchToScene('192.168.1.100', 'clock', {
      clear: true,
      unknownField: 'value',
      anotherField: 123,
    });

    assert.ok(true, 'Ignores extra fields');
  });
});

