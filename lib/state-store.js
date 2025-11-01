/**
 * @fileoverview State Store - Centralized state management
 * @description Single source of truth for all application state.
 * Consolidates fragmented state from scene-manager.js, device-adapter.js,
 * and individual scenes into a unified, observable state tree.
 *
 * State Hierarchy:
 * - globalState: Daemon-wide configuration and metadata
 * - deviceStates: Per-device state (activeScene, generation, status, etc.)
 * - sceneStates: Per-scene, per-device state (scene-specific data)
 *
 * Features:
 * - Path-based get/set API (e.g., 'device.192.168.1.159.activeScene')
 * - State observation/subscription (optional)
 * - Immutable state snapshots
 * - Clear separation of concerns
 * - Type-safe state access
 *
 * Usage:
 *   const stateStore = new StateStore();
 *   stateStore.setDeviceState('192.168.1.159', 'activeScene', 'startup');
 *   const scene = stateStore.getDeviceState('192.168.1.159', 'activeScene');
 *
 * @module lib/state-store
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

/**
 * State Store - Centralized state management
 *
 * Manages three types of state:
 * 1. Global state - daemon-wide configuration
 * 2. Device state - per-device runtime state
 * 3. Scene state - per-scene, per-device application state
 *
 * @class
 */
class StateStore {
  /**
   * Create a StateStore instance
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} [dependencies.logger] - Logger instance
   * @param {string} [dependencies.persistPath] - Path for persistence file
   * @param {number} [dependencies.debounceMs] - Debounce interval for persistence (default: 10000ms)
   */
  constructor({ logger, persistPath = null, debounceMs = 10000 } = {}) {
    this.logger = logger || require('./logger');

    // Global state (daemon-wide)
    this.globalState = new Map();

    // Device states: Map<deviceId, DeviceState>
    // DeviceState: { activeScene, targetScene, generationId, status, loopTimer, ... }
    this.deviceStates = new Map();

    // Scene states: Map<"deviceId::sceneName", SceneState>
    // SceneState: Map of scene-specific key-value pairs
    this.sceneStates = new Map();

    // Subscribers for state changes (optional feature)
    this.subscribers = new Map();

    // Persistence configuration
    this.persistFallbackPath = null;
    this.persistPath =
      persistPath || this._resolvePersistPath('/data/runtime-state.json');
    this.persistEnabled = true;
    this.persistDirty = false;
    this.persistTimer = null;
    this.PERSIST_DEBOUNCE_MS = debounceMs;

    this.daemonInfo = {
      startTime: null,
      lastHeartbeat: null,
    };

    this.logger.debug('StateStore initialized', {
      persistPath: this.persistPath,
      persistFallbackPath: this.persistFallbackPath,
      debounceMs: this.PERSIST_DEBOUNCE_MS,
    });
  }

  _resolvePersistPath(preferredPath) {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const candidates = [];
    const seenPaths = new Set();

    const addCandidate = (candidatePath, reason) => {
      if (!candidatePath) return;
      const resolvedPath = path.resolve(candidatePath);
      if (seenPaths.has(resolvedPath)) return;
      seenPaths.add(resolvedPath);
      candidates.push({ path: resolvedPath, reason });
    };

    const envPath = process.env.PIDICON_STATE_PATH;
    if (envPath) {
      addCandidate(envPath, 'env-path');
    }
    const envDir = process.env.PIDICON_STATE_DIR;
    if (!envPath && envDir) {
      addCandidate(path.join(envDir, 'runtime-state.json'), 'env-dir');
    }

    addCandidate(preferredPath, 'preferred');

    const homeDir = os.homedir();
    if (homeDir) {
      addCandidate(
        path.join(homeDir, '.pidicon', 'runtime-state.json'),
        'home'
      );
    }

    let preferredError = null;

    for (const candidate of candidates) {
      try {
        fs.mkdirSync(path.dirname(candidate.path), { recursive: true });

        if (candidate.reason === 'env-path' || candidate.reason === 'env-dir') {
          this.logger.info('Using persistence path from environment', {
            path: candidate.path,
          });
        } else if (candidate.reason === 'home') {
          this.logger.info('Persist directory fallback to user home', {
            path: candidate.path,
          });
        }

        return candidate.path;
      } catch (error) {
        if (candidate.reason === 'preferred') {
          preferredError = error;
          this.logger.warn('Preferred persist directory unavailable', {
            path: candidate.path,
            error: error.message,
          });
        } else if (
          candidate.reason === 'env-path' ||
          candidate.reason === 'env-dir'
        ) {
          this.logger.warn(
            'Failed to prepare persistence path from environment',
            {
              path: candidate.path,
              error: error.message,
            }
          );
        } else if (candidate.reason === 'home') {
          this.logger.warn('Failed to prepare persistence path in user home', {
            path: candidate.path,
            error: error.message,
          });
        }
      }
    }

    const fallbackDir = path.join(os.tmpdir(), 'pidicon-state');
    let fallbackPath = path.join(fallbackDir, 'runtime-state.json');

    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
    } catch (fallbackError) {
      this.logger.warn('Failed to prepare fallback persist directory', {
        error: fallbackError.message,
        fallbackDir,
      });
      fallbackPath = path.join(os.tmpdir(), 'pidicon-runtime-state.json');
    }

    this.persistFallbackPath = fallbackPath;

    this.logger.warn('Persist directory not writable, using fallback path', {
      preferredPath,
      fallbackPath,
      error: preferredError ? preferredError.message : undefined,
    });

    return fallbackPath;
  }

  // ============================================================================
  // GLOBAL STATE
  // ============================================================================

  /**
   * Set global state value
   * @param {string} key - Global state key
   * @param {any} value - Value to set
   * @returns {StateStore} Returns this for chaining
   */
  setGlobal(key, value) {
    this.globalState.set(key, value);
    this._notify('global', key, value);
    return this;
  }

  /**
   * Get global state value
   * @param {string} key - Global state key
   * @param {any} [defaultValue] - Default value if key doesn't exist
   * @returns {any} The value or defaultValue
   */
  getGlobal(key, defaultValue = undefined) {
    return this.globalState.has(key) ? this.globalState.get(key) : defaultValue;
  }

  /**
   * Check if global key exists
   * @param {string} key - Global state key
   * @returns {boolean} True if key exists
   */
  hasGlobal(key) {
    return this.globalState.has(key);
  }

  /**
   * Delete global state key
   * @param {string} key - Global state key
   * @returns {boolean} True if key was deleted
   */
  deleteGlobal(key) {
    const deleted = this.globalState.delete(key);
    if (deleted) {
      this._notify('global', key, undefined);
    }
    return deleted;
  }

  /**
   * Get all global state as object
   * @returns {Object} Global state snapshot
   */
  getGlobalSnapshot() {
    return Object.fromEntries(this.globalState);
  }

  // ==========================================================================
  // DAEMON METRICS
  // ==========================================================================

  recordDaemonStart(startTime = Date.now()) {
    const ts = startTime instanceof Date ? startTime.getTime() : startTime;
    if (this.daemonInfo.startTime !== ts) {
      this.daemonInfo.startTime = ts;
      this.daemonInfo.lastHeartbeat = ts;
      this._markDirty();
    }
  }

  recordHeartbeat(time = Date.now()) {
    const ts = time instanceof Date ? time.getTime() : time;
    if (this.daemonInfo.lastHeartbeat !== ts) {
      this.daemonInfo.lastHeartbeat = ts;
      this._markDirty();
    }
  }

  getDaemonMetrics() {
    return {
      startTime: this.daemonInfo.startTime,
      lastHeartbeat: this.daemonInfo.lastHeartbeat,
    };
  }

  // ============================================================================
  // DEVICE STATE
  // ============================================================================

  /**
   * Initialize device state
   * @param {string} deviceId - Device ID (e.g., IP address)
   * @returns {StateStore} Returns this for chaining
   */
  initDevice(deviceId) {
    if (!this.deviceStates.has(deviceId)) {
      this.deviceStates.set(deviceId, {
        activeScene: null,
        targetScene: null,
        generationId: 0,
        status: 'idle', // idle|switching|running|stopping
        loopTimer: null,
        lastSwitchTime: null,
        metadata: {},
      });
      this.logger.debug(`Device state initialized: ${deviceId}`);
    }
    return this;
  }

  /**
   * Set device state property
   * @param {string} deviceId - Device ID
   * @param {string} key - Property key
   * @param {any} value - Value to set
   * @returns {StateStore} Returns this for chaining
   */
  setDeviceState(deviceId, key, value) {
    this.initDevice(deviceId);
    const deviceState = this.deviceStates.get(deviceId);
    deviceState[key] = value;
    this._notify('device', `${deviceId}.${key}`, value);

    // Mark state as dirty if this is persistable state
    const persistableKeys = [
      'activeScene',
      'playState',
      'brightness',
      'displayOn',
      '__logging_level',
    ];
    if (persistableKeys.includes(key)) {
      this._markDirty();
    }

    return this;
  }

  /**
   * Get device state property
   * @param {string} deviceId - Device ID
   * @param {string} key - Property key
   * @param {any} [defaultValue] - Default value if key doesn't exist
   * @returns {any} The value or defaultValue
   */
  getDeviceState(deviceId, key, defaultValue = undefined) {
    const deviceState = this.deviceStates.get(deviceId);
    if (!deviceState) {
      return defaultValue;
    }
    return deviceState[key] !== undefined ? deviceState[key] : defaultValue;
  }

  /**
   * Get entire device state
   * @param {string} deviceId - Device ID
   * @returns {Object|null} Device state object or null
   */
  getDevice(deviceId) {
    return this.deviceStates.get(deviceId) || null;
  }

  /**
   * Check if device exists
   * @param {string} deviceId - Device ID
   * @returns {boolean} True if device exists
   */
  hasDevice(deviceId) {
    return this.deviceStates.has(deviceId);
  }

  /**
   * Delete device state
   * @param {string} deviceId - Device ID
   * @returns {boolean} True if device was deleted
   */
  deleteDevice(deviceId) {
    // Also delete associated scene states
    const prefix = `${deviceId}::`;
    for (const key of this.sceneStates.keys()) {
      if (key.startsWith(prefix)) {
        this.sceneStates.delete(key);
      }
    }

    const deleted = this.deviceStates.delete(deviceId);
    if (deleted) {
      this.logger.debug(`Device state deleted: ${deviceId}`);
      this._notify('device', deviceId, undefined);
    }
    return deleted;
  }

  /**
   * Get all device IDs
   * @returns {Array<string>} Array of device IDs
   */
  getDeviceIds() {
    return Array.from(this.deviceStates.keys());
  }

  // ============================================================================
  // SCENE STATE
  // ============================================================================

  /**
   * Generate scene state key
   * @private
   * @param {string} deviceId - Device ID
   * @param {string} sceneName - Scene name
   * @returns {string} Combined key
   */
  _sceneKey(deviceId, sceneName) {
    return `${deviceId}::${sceneName}`;
  }

  /**
   * Initialize scene state for a device
   * @param {string} deviceId - Device ID
   * @param {string} sceneName - Scene name
   * @returns {StateStore} Returns this for chaining
   */
  initSceneState(deviceId, sceneName) {
    const key = this._sceneKey(deviceId, sceneName);
    if (!this.sceneStates.has(key)) {
      this.sceneStates.set(key, new Map());
      this.logger.debug(`Scene state initialized: ${key}`);
    }
    return this;
  }

  /**
   * Set scene state property
   * @param {string} deviceId - Device ID
   * @param {string} sceneName - Scene name
   * @param {string} key - Property key
   * @param {any} value - Value to set
   * @returns {StateStore} Returns this for chaining
   */
  setSceneState(deviceId, sceneName, key, value) {
    const stateKey = this._sceneKey(deviceId, sceneName);
    this.initSceneState(deviceId, sceneName);
    const sceneState = this.sceneStates.get(stateKey);
    sceneState.set(key, value);
    this._notify('scene', `${stateKey}.${key}`, value);
    return this;
  }

  /**
   * Get scene state property
   * @param {string} deviceId - Device ID
   * @param {string} sceneName - Scene name
   * @param {string} key - Property key
   * @param {any} [defaultValue] - Default value if key doesn't exist
   * @returns {any} The value or defaultValue
   */
  getSceneState(deviceId, sceneName, key, defaultValue = undefined) {
    const stateKey = this._sceneKey(deviceId, sceneName);
    const sceneState = this.sceneStates.get(stateKey);
    if (!sceneState) {
      return defaultValue;
    }
    return sceneState.has(key) ? sceneState.get(key) : defaultValue;
  }

  /**
   * Get entire scene state as Map
   * @param {string} deviceId - Device ID
   * @param {string} sceneName - Scene name
   * @returns {Map|null} Scene state Map or null
   */
  getScene(deviceId, sceneName) {
    const stateKey = this._sceneKey(deviceId, sceneName);
    return this.sceneStates.get(stateKey) || null;
  }

  /**
   * Get scene state as object
   * @param {string} deviceId - Device ID
   * @param {string} sceneName - Scene name
   * @returns {Object} Scene state snapshot
   */
  getSceneSnapshot(deviceId, sceneName) {
    const sceneState = this.getScene(deviceId, sceneName);
    return sceneState ? Object.fromEntries(sceneState) : {};
  }

  /**
   * Clear scene state
   * @param {string} deviceId - Device ID
   * @param {string} sceneName - Scene name
   * @returns {boolean} True if scene state was deleted
   */
  clearSceneState(deviceId, sceneName) {
    const stateKey = this._sceneKey(deviceId, sceneName);
    const deleted = this.sceneStates.delete(stateKey);
    if (deleted) {
      this.logger.debug(`Scene state cleared: ${stateKey}`);
      this._notify('scene', stateKey, undefined);
    }
    return deleted;
  }

  /**
   * Get all scene state keys for a device
   * @param {string} deviceId - Device ID
   * @returns {Array<string>} Array of scene names
   */
  getDeviceScenes(deviceId) {
    const prefix = `${deviceId}::`;
    const scenes = [];
    for (const key of this.sceneStates.keys()) {
      if (key.startsWith(prefix)) {
        scenes.push(key.substring(prefix.length));
      }
    }
    return scenes;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Set multiple device state properties at once
   * @param {string} deviceId - Device ID
   * @param {Object} properties - Key-value pairs to set
   * @returns {StateStore} Returns this for chaining
   */
  setDeviceStateMultiple(deviceId, properties) {
    this.initDevice(deviceId);
    const deviceState = this.deviceStates.get(deviceId);
    for (const [key, value] of Object.entries(properties)) {
      deviceState[key] = value;
      this._notify('device', `${deviceId}.${key}`, value);
    }
    return this;
  }

  /**
   * Set multiple scene state properties at once
   * @param {string} deviceId - Device ID
   * @param {string} sceneName - Scene name
   * @param {Object} properties - Key-value pairs to set
   * @returns {StateStore} Returns this for chaining
   */
  setSceneStateMultiple(deviceId, sceneName, properties) {
    const stateKey = this._sceneKey(deviceId, sceneName);
    this.initSceneState(deviceId, sceneName);
    const sceneState = this.sceneStates.get(stateKey);
    for (const [key, value] of Object.entries(properties)) {
      sceneState.set(key, value);
      this._notify('scene', `${stateKey}.${key}`, value);
    }
    return this;
  }

  // ============================================================================
  // OBSERVATION / SUBSCRIPTIONS (Optional Feature)
  // ============================================================================

  /**
   * Subscribe to state changes
   * @param {string} type - State type ('global', 'device', 'scene', or '*')
   * @param {Function} callback - Callback function (path, value) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(type);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  /**
   * Notify subscribers of state change
   * @private
   * @param {string} type - State type
   * @param {string} path - State path
   * @param {any} value - New value
   */
  _notify(type, path, value) {
    // Notify type-specific subscribers
    const typeSubs = this.subscribers.get(type);
    if (typeSubs) {
      for (const callback of typeSubs) {
        try {
          callback(path, value);
        } catch (error) {
          this.logger.error('Error in state subscriber:', {
            error,
            type,
            path,
          });
        }
      }
    }

    // Notify wildcard subscribers
    const wildcardSubs = this.subscribers.get('*');
    if (wildcardSubs) {
      for (const callback of wildcardSubs) {
        try {
          callback(type, path, value);
        } catch (error) {
          this.logger.error('Error in wildcard subscriber:', {
            error,
            type,
            path,
          });
        }
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Clear all state
   * @returns {StateStore} Returns this for chaining
   */
  clear() {
    this.globalState.clear();
    this.deviceStates.clear();
    this.sceneStates.clear();
    this.logger.debug('All state cleared');
    return this;
  }

  /**
   * Get complete state snapshot
   * @returns {Object} Complete state tree
   */
  getSnapshot() {
    return {
      global: this.getGlobalSnapshot(),
      devices: Object.fromEntries(
        Array.from(this.deviceStates.entries()).map(([id, state]) => [
          id,
          { ...state },
        ])
      ),
      scenes: Object.fromEntries(
        Array.from(this.sceneStates.entries()).map(([key, state]) => [
          key,
          Object.fromEntries(state),
        ])
      ),
    };
  }

  /**
   * Get state statistics
   * @returns {Object} State statistics
   */
  getStats() {
    return {
      globalKeys: this.globalState.size,
      devices: this.deviceStates.size,
      scenes: this.sceneStates.size,
      subscribers: Array.from(this.subscribers.entries()).map(
        ([type, subs]) => ({
          type,
          count: subs.size,
        })
      ),
    };
  }

  // ============================================================================
  // PERSISTENCE (Runtime State Recovery)
  // ============================================================================

  /**
   * Mark state as dirty (needs persistence)
   * @private
   */
  _markDirty() {
    this.logger.info(
      `[DEBUG] _markDirty() called - persistEnabled: ${this.persistEnabled}`
    );
    if (!this.persistEnabled) {
      this.logger.info('[DEBUG] Persistence disabled, skipping markDirty');
      return;
    }

    this.persistDirty = true;
    this.logger.info(
      `[DEBUG] State marked dirty, will persist in ${this.PERSIST_DEBOUNCE_MS}ms`
    );

    // Debounce: Save after 10s of inactivity
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.logger.info('[DEBUG] Debounce timer expired, calling persist()');
      this.persist().catch((error) => {
        this.logger.warn('Failed to persist state:', { error: error.message });
      });
    }, this.PERSIST_DEBOUNCE_MS);
  }

  /**
   * Save critical runtime state to disk
   * @returns {Promise<void>}
   */
  async persist() {
    // Debug logging to diagnose persistence issues
    this.logger.info(
      `[DEBUG] persist() called - persistEnabled: ${this.persistEnabled}, persistDirty: ${this.persistDirty}`
    );

    if (!this.persistEnabled || !this.persistDirty) {
      this.logger.info('[DEBUG] Skipping persist due to early return');
      return;
    }

    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Only persist critical runtime state (not transient metrics)
      const persistData = {
        version: 1,
        timestamp: new Date().toISOString(),
        daemon: {
          startTime: this.daemonInfo.startTime,
          lastHeartbeat: this.daemonInfo.lastHeartbeat,
        },
        devices: {},
      };

      // For each device, save only stable runtime state
      for (const [deviceId, deviceState] of this.deviceStates.entries()) {
        persistData.devices[deviceId] = {
          activeScene: deviceState.activeScene,
          playState: deviceState.playState || 'stopped',
          brightness:
            deviceState.brightness !== undefined ? deviceState.brightness : 100,
          displayOn: deviceState.displayOn !== false,
          loggingLevel: deviceState.__logging_level || null,
          // Don't persist: status, loopTimer, generationId (transient)
        };
      }

      // Ensure directory exists
      const dir = path.dirname(this.persistPath);
      await fs.mkdir(dir, { recursive: true });

      // Write atomically (write to temp file, then rename)
      const tempPath = `${this.persistPath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(persistData, null, 2));
      await fs.rename(tempPath, this.persistPath);

      this.persistDirty = false;

      this.logger.ok(
        `💾 [STATE] Persisted runtime state for ${Object.keys(persistData.devices).length} device(s)`
      );
    } catch (error) {
      // Attempt fallback if available and not already using it
      if (
        this.persistFallbackPath &&
        this.persistPath !== this.persistFallbackPath
      ) {
        this.logger.warn(
          'Primary persist path failed, retrying with fallback',
          {
            error: error.message,
            persistPath: this.persistPath,
            fallbackPath: this.persistFallbackPath,
          }
        );
        this.persistPath = this.persistFallbackPath;
        this.persistFallbackPath = null;
        await this.persist();
        return;
      }

      this.logger.warn('Failed to persist state:', { error: error.message });
    }
  }

  /**
   * Load runtime state from disk (call on daemon startup)
   * @returns {Promise<void>}
   */
  async restore() {
    if (!this.persistEnabled) {
      return;
    }

    try {
      const fs = require('fs').promises;

      const data = await fs.readFile(this.persistPath, 'utf8');
      const persistData = JSON.parse(data);

      if (!persistData.devices) {
        persistData.devices = {};
      }
      if (!persistData.daemon) {
        persistData.daemon = {
          startTime: null,
          lastHeartbeat: null,
        };
      }

      let restored = 0;
      for (const [deviceId, deviceState] of Object.entries(
        persistData.devices
      )) {
        this.initDevice(deviceId);

        // Restore runtime state
        if (deviceState.activeScene)
          this.setDeviceState(deviceId, 'activeScene', deviceState.activeScene);
        if (deviceState.playState)
          this.setDeviceState(deviceId, 'playState', deviceState.playState);
        if (deviceState.brightness !== undefined)
          this.setDeviceState(deviceId, 'brightness', deviceState.brightness);
        if (deviceState.displayOn !== undefined)
          this.setDeviceState(deviceId, 'displayOn', deviceState.displayOn);
        if (deviceState.loggingLevel !== null)
          this.setDeviceState(
            deviceId,
            '__logging_level',
            deviceState.loggingLevel
          );

        restored++;
      }

      this.daemonInfo.startTime = persistData.daemon.startTime || null;
      this.daemonInfo.lastHeartbeat = persistData.daemon.lastHeartbeat || null;

      this.logger.ok(
        `📂 [STATE] Restored runtime state for ${restored} device(s) from ${persistData.timestamp}`
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.info('No persisted runtime state found, starting fresh');
      } else {
        this.logger.warn('Failed to restore state:', { error: error.message });
      }
    }
  }

  /**
   * Force immediate persistence (useful on shutdown)
   * @returns {Promise<void>}
   */
  async flush() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.persistDirty) {
      await this.persist();
    }
  }

  /**
   * Disable persistence (useful for tests)
   */
  disablePersistence() {
    this.persistEnabled = false;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
  }
}

module.exports = StateStore;
