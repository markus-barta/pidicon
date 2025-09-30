/**
 * @fileoverview Integration test for daemon startup with DI
 * @description Verify that daemon initializes correctly with DI container
 */

const assert = require('node:assert');
const { describe, it } = require('node:test');
const path = require('path');

const DeploymentTracker = require('../../lib/deployment-tracker');
const DIContainer = require('../../lib/di-container');
const { SceneRegistration } = require('../../lib/scene-loader');
const SceneManager = require('../../lib/scene-manager');

describe('Daemon Startup with DI', () => {
  describe('DI Container Configuration', () => {
    it('should initialize container with core services', () => {
      const container = new DIContainer();

      // Mock logger for testing
      const mockLogger = {
        ok: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      // Register core services
      container.register('logger', () => mockLogger);
      container.register('stateStore', ({ logger }) => {
        const StateStore = require('../../lib/state-store');
        return new StateStore({ logger });
      });
      container.register('deploymentTracker', () => new DeploymentTracker());
      container.register(
        'sceneManager',
        ({ logger }) => new SceneManager({ logger }),
      );

      // Verify all services registered
      const services = container.getServiceNames();
      assert.ok(services.includes('logger'));
      assert.ok(services.includes('stateStore'));
      assert.ok(services.includes('deploymentTracker'));
      assert.ok(services.includes('sceneManager'));
    });

    it('should resolve DeploymentTracker', () => {
      const container = new DIContainer();
      const mockLogger = {
        ok: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      container.register('logger', () => mockLogger);
      container.register('deploymentTracker', () => new DeploymentTracker());

      const deploymentTracker = container.resolve('deploymentTracker');

      assert.ok(deploymentTracker instanceof DeploymentTracker);
      // DeploymentTracker is an instance, not a class with methods
      // Verify it has version info properties
      assert.ok(deploymentTracker.version || deploymentTracker.buildNumber);
    });

    it('should resolve SceneManager with injected logger', () => {
      const container = new DIContainer();

      const mockLogger = {
        ok: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      container.register('logger', () => mockLogger);
      container.register(
        'sceneManager',
        ({ logger }) => new SceneManager({ logger }),
      );

      const sceneManager = container.resolve('sceneManager');

      assert.ok(sceneManager instanceof SceneManager);
      assert.strictEqual(sceneManager.logger, mockLogger);
    });
  });

  describe('Scene Loading with DI', () => {
    it('should load scenes into DI-injected SceneManager', () => {
      const container = new DIContainer();

      const logs = [];
      const mockLogger = {
        ok: (msg, meta) => logs.push({ level: 'ok', msg, meta }),
        info: (msg, meta) => logs.push({ level: 'info', msg, meta }),
        warn: (msg, meta) => logs.push({ level: 'warn', msg, meta }),
        error: (msg, meta) => logs.push({ level: 'error', msg, meta }),
        debug: (msg, meta) => logs.push({ level: 'debug', msg, meta }),
      };

      container.register('logger', () => mockLogger);
      container.register(
        'sceneManager',
        ({ logger }) => new SceneManager({ logger }),
      );

      const sceneManager = container.resolve('sceneManager');

      // Load scenes using SceneRegistration (simulating daemon.js)
      const sceneLoadResults = SceneRegistration.registerFromStructure(
        sceneManager,
        path.join(__dirname, '../../scenes'),
      );

      // Verify scenes loaded
      assert.ok(
        sceneLoadResults.scenes.size > 0,
        'Should load at least one scene',
      );
      assert.ok(
        sceneLoadResults.scenes.has('startup'),
        'Should load startup scene',
      );
      assert.ok(
        sceneLoadResults.scenes.has('empty'),
        'Should load empty scene',
      );

      // Verify logger was used
      const okLogs = logs.filter((l) => l.level === 'ok');
      assert.ok(okLogs.length > 0, 'Should have logged scene registrations');
    });

    it('should handle scene registration through DI container', () => {
      const container = new DIContainer();

      const mockLogger = {
        ok: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      container.register('logger', () => mockLogger);
      container.register(
        'sceneManager',
        ({ logger }) => new SceneManager({ logger }),
      );

      const sceneManager = container.resolve('sceneManager');

      // Register a test scene
      const testScene = {
        name: 'test',
        render: async () => null,
      };

      sceneManager.registerScene('test', testScene);
      const retrieved = sceneManager.getScene('test');

      assert.strictEqual(retrieved, testScene);
    });
  });

  describe('Integration: Full Daemon Initialization Flow', () => {
    it('should initialize all services in correct order', () => {
      const container = new DIContainer();

      const initOrder = [];
      const mockLogger = {
        ok: (msg) => initOrder.push(`logger: ${msg}`),
        info: (msg) => initOrder.push(`logger: ${msg}`),
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      // Register services (simulating daemon.js)
      container.register('logger', () => {
        initOrder.push('create: logger');
        return mockLogger;
      });

      container.register('deploymentTracker', () => {
        initOrder.push('create: deploymentTracker');
        return new DeploymentTracker();
      });

      container.register('sceneManager', ({ logger }) => {
        initOrder.push('create: sceneManager');
        return new SceneManager({ logger });
      });

      // Resolve services (simulating daemon.js)
      const deploymentTracker = container.resolve('deploymentTracker');
      const sceneManager = container.resolve('sceneManager');

      // Verify services created
      assert.ok(deploymentTracker instanceof DeploymentTracker);
      assert.ok(sceneManager instanceof SceneManager);

      // Verify initialization order (logger first, then others)
      assert.ok(
        initOrder.indexOf('create: logger') <
          initOrder.indexOf('create: sceneManager'),
      );
    });

    it('should support service singleton behavior', () => {
      const container = new DIContainer();

      let sceneManagerCreateCount = 0;

      const mockLogger = {
        ok: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      container.register('logger', () => mockLogger);
      container.register('sceneManager', ({ logger }) => {
        sceneManagerCreateCount++;
        return new SceneManager({ logger });
      });

      // Resolve multiple times
      const sm1 = container.resolve('sceneManager');
      const sm2 = container.resolve('sceneManager');
      const sm3 = container.resolve('sceneManager');

      // Should create only once (singleton)
      assert.strictEqual(sceneManagerCreateCount, 1);
      assert.strictEqual(sm1, sm2);
      assert.strictEqual(sm2, sm3);
    });
  });
});
