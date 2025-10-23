'use strict';

const DEFAULT_STALE_MS = 60_000;

class DeviceHealthEntry {
  constructor(host) {
    this.host = host;
    this.lastSeenTs = null;
    this.lastHeartbeatTs = null;
    this.lastHeartbeatDelayMs = null;
    this.failing = false;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastCheckTs = null;
    this.lastError = null;
  }

  updateLastSeen(timestamp = Date.now()) {
    this.lastSeenTs = timestamp;
    this.lastHeartbeatTs = timestamp;
    this.lastHeartbeatDelayMs = 0;
    this.consecutiveSuccesses += 1;
    this.consecutiveFailures = 0;
    this.failing = false;
    return this;
  }

  recordCheckStart(timestamp = Date.now()) {
    this.lastCheckTs = timestamp;
    return this;
  }

  recordCheckResult(result = {}) {
    const {
      success = false,
      latencyMs = null,
      error = null,
      timestamp,
    } = result;
    const ts = timestamp || Date.now();

    if (success) {
      this.consecutiveSuccesses += 1;
      this.consecutiveFailures = 0;
      this.failing = false;
      this.lastError = null;
      this.lastHeartbeatTs = ts;
      if (latencyMs != null) {
        this.lastHeartbeatDelayMs = latencyMs;
      }
    } else {
      this.consecutiveFailures += 1;
      this.consecutiveSuccesses = 0;
      this.failing = true;
      this.lastError = error || 'Unknown error';
    }

    this.lastCheckTs = ts;
    return this;
  }

  updateFromPush({
    timestamp = Date.now(),
    frametime = null,
    driver = 'real',
  } = {}) {
    if (driver === 'real') {
      this.lastSeenTs = timestamp;
      this.lastHeartbeatTs = timestamp;
      if (frametime != null) {
        this.lastHeartbeatDelayMs = frametime;
      }
      this.consecutiveSuccesses += 1;
      this.consecutiveFailures = 0;
      this.failing = false;
    }
    return this;
  }

  isStale(staleMs = DEFAULT_STALE_MS) {
    if (!this.lastSeenTs) return true;
    return Date.now() - this.lastSeenTs > staleMs;
  }

  getSnapshot() {
    return {
      lastSeenTs: this.lastSeenTs,
      lastHeartbeatTs: this.lastHeartbeatTs,
      lastHeartbeatDelayMs: this.lastHeartbeatDelayMs,
      lastCheckTs: this.lastCheckTs,
      failing: this.failing,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastError: this.lastError,
    };
  }
}

class DeviceHealthStore {
  constructor() {
    this.entries = new Map();
    this.monitors = new Map();
  }

  ensureEntry(host) {
    if (!this.entries.has(host)) {
      this.entries.set(host, new DeviceHealthEntry(host));
    }
    return this.entries.get(host);
  }

  updateLastSeen(host, timestamp = Date.now()) {
    return this.ensureEntry(host).updateLastSeen(timestamp);
  }

  recordCheckStart(host) {
    return this.ensureEntry(host).recordCheckStart();
  }

  recordCheckResult(host, result) {
    return this.ensureEntry(host).recordCheckResult(result);
  }

  updateFromPush(host, payload) {
    return this.ensureEntry(host).updateFromPush(payload);
  }

  getSnapshot(host) {
    return this.ensureEntry(host).getSnapshot();
  }

  startMonitoring(host, intervalMs, handler) {
    this.stopMonitoring(host);
    const timer = setInterval(() => handler(host), intervalMs);
    this.monitors.set(host, timer);
  }

  stopMonitoring(host) {
    const timer = this.monitors.get(host);
    if (timer) {
      clearInterval(timer);
      this.monitors.delete(host);
    }
  }

  stopAllMonitoring() {
    for (const host of this.monitors.keys()) {
      this.stopMonitoring(host);
    }
  }
}

module.exports = DeviceHealthStore;
module.exports.DeviceHealthEntry = DeviceHealthEntry;
module.exports.DEFAULT_STALE_MS = DEFAULT_STALE_MS;
