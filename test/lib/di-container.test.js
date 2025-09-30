/**
 * @fileoverview Tests for DI Container
 * @description Comprehensive test suite for dependency injection container
 */

const assert = require('node:assert');
const { describe, it } = require('node:test');

const DIContainer = require('../../lib/di-container');

describe('DIContainer', () => {
  describe('Basic Registration and Resolution', () => {
    it('should register and resolve a simple service', () => {
      const container = new DIContainer();
      const logger = { log: () => {} };

      container.register('logger', () => logger);
      const resolved = container.resolve('logger');

      assert.strictEqual(resolved, logger);
    });

    it('should register and resolve a value', () => {
      const container = new DIContainer();
      const config = { port: 3000 };

      container.registerValue('config', config);
      const resolved = container.resolve('config');

      assert.strictEqual(resolved, config);
    });

    it('should throw error when resolving unregistered service', () => {
      const container = new DIContainer();

      assert.throws(
        () => container.resolve('unknown'),
        /Service 'unknown' is not registered/,
      );
    });

    it('should throw error when registering with invalid name', () => {
      const container = new DIContainer();

      assert.throws(
        () => container.register('', () => {}),
        /Service name must be a non-empty string/,
      );
    });

    it('should throw error when registering with non-function factory', () => {
      const container = new DIContainer();

      assert.throws(
        () => container.register('service', 'not a function'),
        /Factory for 'service' must be a function/,
      );
    });
  });

  describe('Lifetime Management', () => {
    it('should create singleton instances only once', () => {
      const container = new DIContainer();
      let callCount = 0;

      container.register('service', () => {
        callCount++;
        return { id: callCount };
      });

      const first = container.resolve('service');
      const second = container.resolve('service');

      assert.strictEqual(callCount, 1);
      assert.strictEqual(first, second);
      assert.strictEqual(first.id, 1);
    });

    it('should create transient instances each time', () => {
      const container = new DIContainer();
      let callCount = 0;

      container.register(
        'service',
        () => {
          callCount++;
          return { id: callCount };
        },
        { lifetime: 'transient' },
      );

      const first = container.resolve('service');
      const second = container.resolve('service');

      assert.strictEqual(callCount, 2);
      assert.notStrictEqual(first, second);
      assert.strictEqual(first.id, 1);
      assert.strictEqual(second.id, 2);
    });

    it('should throw error for invalid lifetime', () => {
      const container = new DIContainer();

      assert.throws(
        () => container.register('service', () => {}, { lifetime: 'invalid' }),
        /Invalid lifetime/,
      );
    });
  });

  describe('Dependency Injection', () => {
    it('should inject dependencies with destructured parameters', () => {
      const container = new DIContainer();
      const logger = { log: () => 'logged' };

      container.register('logger', () => logger);
      container.register('service', ({ logger }) => ({
        loggerInstance: logger,
      }));

      const service = container.resolve('service');
      assert.strictEqual(service.loggerInstance, logger);
    });

    it('should inject multiple dependencies', () => {
      const container = new DIContainer();
      const logger = { log: () => {} };
      const config = { port: 3000 };

      container.register('logger', () => logger);
      container.register('config', () => config);
      container.register('service', ({ logger, config }) => ({
        logger,
        config,
      }));

      const service = container.resolve('service');
      assert.strictEqual(service.logger, logger);
      assert.strictEqual(service.config, config);
    });

    it('should resolve nested dependencies', () => {
      const container = new DIContainer();

      container.register('level1', () => ({ name: 'level1' }));
      container.register('level2', ({ level1 }) => ({
        name: 'level2',
        level1,
      }));
      container.register('level3', ({ level2 }) => ({
        name: 'level3',
        level2,
      }));

      const service = container.resolve('level3');
      assert.strictEqual(service.name, 'level3');
      assert.strictEqual(service.level2.name, 'level2');
      assert.strictEqual(service.level2.level1.name, 'level1');
    });

    it('should detect circular dependencies', () => {
      const container = new DIContainer();

      container.register('a', ({ b }) => ({ b }));
      container.register('b', ({ a }) => ({ a }));

      assert.throws(
        () => container.resolve('a'),
        /Circular dependency detected/,
      );
    });

    it('should detect multi-level circular dependencies', () => {
      const container = new DIContainer();

      container.register('a', ({ b }) => ({ b }));
      container.register('b', ({ c }) => ({ c }));
      container.register('c', ({ a }) => ({ a }));

      assert.throws(
        () => container.resolve('a'),
        /Circular dependency detected/,
      );
    });
  });

  describe('Container Utilities', () => {
    it('should check if service is registered', () => {
      const container = new DIContainer();

      container.register('logger', () => ({}));
      container.registerValue('config', {});

      assert.strictEqual(container.has('logger'), true);
      assert.strictEqual(container.has('config'), true);
      assert.strictEqual(container.has('unknown'), false);
    });

    it('should return all service names', () => {
      const container = new DIContainer();

      container.register('logger', () => ({}));
      container.register('config', () => ({}));
      container.registerValue('version', '1.0.0');

      const names = container.getServiceNames();
      assert.deepStrictEqual(names, ['config', 'logger', 'version']);
    });

    it('should clear singletons while keeping registrations', () => {
      const container = new DIContainer();
      let callCount = 0;

      container.register('service', () => {
        callCount++;
        return { id: callCount };
      });

      const first = container.resolve('service');
      assert.strictEqual(callCount, 1);

      container.clearSingletons();

      const second = container.resolve('service');
      assert.strictEqual(callCount, 2);
      assert.notStrictEqual(first, second);
    });

    it('should reset container completely', () => {
      const container = new DIContainer();

      container.register('logger', () => ({}));
      container.registerValue('config', {});

      assert.strictEqual(container.getServiceNames().length, 2);

      container.reset();

      assert.strictEqual(container.getServiceNames().length, 0);
      assert.throws(() => container.resolve('logger'));
    });
  });

  describe('Chaining', () => {
    it('should support method chaining for registration', () => {
      const container = new DIContainer();

      const result = container
        .register('logger', () => ({ log: () => {} }))
        .register('config', () => ({ port: 3000 }))
        .registerValue('version', '1.0.0');

      assert.strictEqual(result, container);
      assert.strictEqual(container.getServiceNames().length, 3);
    });
  });

  describe('Scoped Containers', () => {
    it('should create scoped container with inherited registrations', () => {
      const container = new DIContainer();

      container.register('logger', () => ({ type: 'parent' }));

      const scope = container.createScope();
      const logger = scope.resolve('logger');

      assert.strictEqual(logger.type, 'parent');
    });

    it('should have separate singleton instances in scopes', () => {
      const container = new DIContainer();
      let id = 0;

      container.register('service', () => ({ id: ++id }));

      const parent1 = container.resolve('service');
      const parent2 = container.resolve('service');

      const scope = container.createScope();
      const scoped1 = scope.resolve('service');
      const scoped2 = scope.resolve('service');

      // Parent singletons are same
      assert.strictEqual(parent1, parent2);
      assert.strictEqual(parent1.id, 1);

      // Scoped singletons are same within scope
      assert.strictEqual(scoped1, scoped2);
      assert.strictEqual(scoped1.id, 2);

      // But different from parent
      assert.notStrictEqual(parent1, scoped1);
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should work with class constructors', () => {
      const container = new DIContainer();

      class Logger {
        log(msg) {
          return `Logged: ${msg}`;
        }
      }

      class SceneManager {
        constructor({ logger }) {
          this.logger = logger;
        }
      }

      container.register('logger', () => new Logger());
      container.register(
        'sceneManager',
        ({ logger }) => new SceneManager({ logger }),
      );

      const sceneManager = container.resolve('sceneManager');
      assert.ok(sceneManager.logger instanceof Logger);
      assert.strictEqual(sceneManager.logger.log('test'), 'Logged: test');
    });

    it('should work with require statements', () => {
      const container = new DIContainer();

      // Simulate requiring a module
      const loggerModule = {
        ok: (msg) => msg,
        error: (msg) => msg,
      };

      container.register('logger', () => loggerModule);

      const logger = container.resolve('logger');
      assert.strictEqual(logger.ok('test'), 'test');
    });

    it('should handle complex dependency graph', () => {
      const container = new DIContainer();

      // Simulate realistic service graph
      container.register('config', () => ({ broker: 'localhost' }));
      container.register('logger', () => ({ log: () => {} }));
      container.register('mqtt', ({ config, logger }) => ({ config, logger }));
      container.register('deviceAdapter', ({ logger }) => ({ logger }));
      container.register('sceneManager', ({ logger, deviceAdapter }) => ({
        logger,
        deviceAdapter,
      }));
      container.register('daemon', ({ mqtt, sceneManager }) => ({
        mqtt,
        sceneManager,
      }));

      const daemon = container.resolve('daemon');

      assert.ok(daemon.mqtt);
      assert.ok(daemon.sceneManager);
      assert.ok(daemon.sceneManager.logger);
      assert.ok(daemon.sceneManager.deviceAdapter);
    });
  });
});
