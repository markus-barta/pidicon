/**
 * @fileoverview Dependency Injection Container
 * @description Lightweight DI container for managing service dependencies and
 * lifecycle. Inspired by Awilix but simplified for our specific needs.
 *
 * Features:
 * - Constructor injection
 * - Singleton and transient lifetimes
 * - Lazy initialization
 * - Circular dependency detection
 * - Clear error messages
 *
 * Usage:
 *   const container = new DIContainer();
 *   container.register('logger', () => require('./logger'), { lifetime: 'singleton' });
 *   container.register('sceneManager', ({ logger }) => new SceneManager({ logger }));
 *   const sceneManager = container.resolve('sceneManager');
 *
 * @module lib/di-container
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

/**
 * Service registration configuration
 * @typedef {Object} ServiceConfig
 * @property {Function} factory - Factory function to create the service
 * @property {string} lifetime - 'singleton' or 'transient'
 * @property {Array<string>} dependencies - Array of dependency names
 */

/**
 * Dependency Injection Container
 *
 * Manages service registration, resolution, and lifecycle.
 * Supports constructor injection with automatic dependency resolution.
 *
 * @class
 */
class DIContainer {
  constructor() {
    /** @type {Map<string, ServiceConfig>} */
    this.registrations = new Map();

    /** @type {Map<string, any>} */
    this.singletons = new Map();

    /** @type {Set<string>} */
    this.resolving = new Set();
  }

  /**
   * Register a service with the container
   *
   * @param {string} name - Service name (e.g., 'logger', 'sceneManager')
   * @param {Function} factory - Factory function that creates the service
   *   - For simple modules: () => require('./logger')
   *   - For classes with deps: ({ logger, config }) => new SceneManager({ logger, config })
   * @param {Object} options - Registration options
   * @param {string} [options.lifetime='singleton'] - 'singleton' or 'transient'
   * @returns {DIContainer} Returns this for chaining
   *
   * @example
   *   // Register singleton (created once, reused)
   *   container.register('logger', () => require('./logger'));
   *
   *   // Register with dependencies
   *   container.register('sceneManager', ({ logger, errorHandler }) =>
   *     new SceneManager({ logger, errorHandler })
   *   );
   *
   *   // Register transient (created each time)
   *   container.register('requestId', () => generateId(), { lifetime: 'transient' });
   */
  register(name, factory, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }

    if (typeof factory !== 'function') {
      throw new Error(`Factory for '${name}' must be a function`);
    }

    const lifetime = options.lifetime || 'singleton';
    if (lifetime !== 'singleton' && lifetime !== 'transient') {
      throw new Error(
        `Invalid lifetime '${lifetime}' for '${name}'. Must be 'singleton' or 'transient'`,
      );
    }

    // Extract dependency names from factory function parameters
    const dependencies = this._extractDependencies(factory);

    this.registrations.set(name, {
      factory,
      lifetime,
      dependencies,
    });

    return this; // Enable chaining
  }

  /**
   * Register a constant value (always singleton)
   *
   * @param {string} name - Service name
   * @param {any} value - The value to register
   * @returns {DIContainer} Returns this for chaining
   *
   * @example
   *   container.registerValue('config', { port: 3000 });
   */
  registerValue(name, value) {
    this.singletons.set(name, value);
    return this;
  }

  /**
   * Resolve a service by name
   *
   * @param {string} name - Service name to resolve
   * @returns {any} The resolved service instance
   * @throws {Error} If service not registered or circular dependency detected
   *
   * @example
   *   const logger = container.resolve('logger');
   *   const sceneManager = container.resolve('sceneManager');
   */
  resolve(name) {
    // Check if it's a registered value
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if service is registered
    if (!this.registrations.has(name)) {
      throw new Error(
        `Service '${name}' is not registered. Available services: ${Array.from(this.registrations.keys()).join(', ')}`,
      );
    }

    const config = this.registrations.get(name);

    // For singletons, return cached instance if exists
    if (config.lifetime === 'singleton' && this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Detect circular dependencies
    if (this.resolving.has(name)) {
      const chain = Array.from(this.resolving).join(' → ');
      throw new Error(`Circular dependency detected: ${chain} → ${name}`);
    }

    // Mark as resolving
    this.resolving.add(name);

    try {
      // Resolve dependencies
      const deps = {};
      for (const depName of config.dependencies) {
        deps[depName] = this.resolve(depName);
      }

      // Create instance
      const instance = config.factory(deps);

      // Cache singleton
      if (config.lifetime === 'singleton') {
        this.singletons.set(name, instance);
      }

      return instance;
    } finally {
      // Always remove from resolving set
      this.resolving.delete(name);
    }
  }

  resolveIfRegistered(name) {
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }
    if (!this.registrations.has(name)) {
      return undefined;
    }
    return this.resolve(name);
  }

  /**
   * Check if a service is registered
   *
   * @param {string} name - Service name
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.registrations.has(name) || this.singletons.has(name);
  }

  /**
   * Get all registered service names
   *
   * @returns {Array<string>} Array of service names
   */
  getServiceNames() {
    const registered = Array.from(this.registrations.keys());
    const values = Array.from(this.singletons.keys()).filter(
      (k) => !this.registrations.has(k),
    );
    return [...registered, ...values].sort();
  }

  /**
   * Clear all singletons (useful for testing)
   * Note: Registrations remain intact
   */
  clearSingletons() {
    this.singletons.clear();
  }

  /**
   * Reset container (clear all registrations and singletons)
   * Use with caution - typically only in tests
   */
  reset() {
    this.registrations.clear();
    this.singletons.clear();
    this.resolving.clear();
  }

  /**
   * Extract dependency names from factory function parameters
   *
   * @private
   * @param {Function} factory - Factory function
   * @returns {Array<string>} Array of parameter names
   */
  _extractDependencies(factory) {
    // Handle arrow functions and regular functions
    const fnStr = factory.toString();

    // Match: ({ dep1, dep2 }) or (deps) or ()
    const match =
      fnStr.match(
        /^\s*(?:async\s+)?(?:\w+\s*=>|\(([^)]*)\)\s*=>|\w+\([^)]*\))/,
      ) || fnStr.match(/function\s*\w*\s*\(([^)]*)\)/);

    if (!match) {
      return [];
    }

    const params = match[1] || '';

    // Handle destructured parameters: ({ logger, config })
    if (params.trim().startsWith('{')) {
      const destructured = params.match(/\{\s*([^}]+)\s*\}/);
      if (destructured) {
        return destructured[1]
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
      }
    }

    // Handle single parameter or multiple parameters
    return params
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }

  /**
   * Create a scoped container (child container)
   * Inherits parent registrations but has separate singleton instances
   *
   * @returns {DIContainer} New scoped container
   */
  createScope() {
    const scope = new DIContainer();

    // Copy registrations (but not singletons)
    for (const [name, config] of this.registrations.entries()) {
      scope.registrations.set(name, config);
    }

    return scope;
  }
}

module.exports = DIContainer;
