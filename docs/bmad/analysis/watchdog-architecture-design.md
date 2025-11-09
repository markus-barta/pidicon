# Watchdog Architecture Design Document

**Version:** 1.0  
**Date:** 2025-11-13 (Sprint 2, Day 2)  
**Author:** Charlie (Senior Dev)  
**Status:** Draft - For Thursday Review  
**Story:** 0.1 - Watchdog Root Cause Analysis & Comprehensive Fix

---

## Executive Summary

This document presents a complete architectural redesign of the PIDICON watchdog system to eliminate false positives caused by conflicting state updates. The solution separates device health monitoring (watchdog) from performance metrics (scene rendering) through strict state isolation.

**Key Changes:**

1. Watchdog becomes the SINGLE source of truth for device liveness
2. Scene rendering provides ONLY performance metrics (FPS, frame count)
3. Complete state separation - no shared state between systems
4. Clean API boundaries with clear responsibilities

**Confidence:** 90% this will eliminate false positives

---

## 1. Problem Statement

### Current Architecture (Broken)

**Dual-Path State Updates:**

```javascript
// PATH 1: Scene Rendering
device.push() → device.health.updateFromPush() → device.health.lastSeenTs = now

// PATH 2: Watchdog Health Check
watchdog.performHealthCheck() → device.health.updateLastSeen() → device.health.lastSeenTs = now

// RESULT: Same state, two writers, conflicting signals
```

**The Problem:**

- Scene rendering can succeed while health check fails (or vice versa)
- Watchdog reads back its own update via `getMetrics()`
- False positives occur when health check fails but device is actually responsive

**Production Evidence:**

```
2025-11-09T11:20:51 ⚠️  [WATCHDOG] Device P00 offline for 106 minutes
```

But user confirms device was actively rendering scenes!

---

## 2. Root Cause Analysis Summary

**Identified Issues:**

1. ❌ Two independent code paths update `device.health.lastSeenTs`
2. ❌ Watchdog trusts health check over actual device activity
3. ❌ Health check and scene rendering can diverge
4. ❌ Conflated state leads to unreliable monitoring

**Confidence:** 85% (validated by Product Lead)

**Full Analysis:** See `watchdog-analysis-day1.md`

---

## 3. Proposed Architecture (Fixed)

### Design Principle: State Separation

**Complete Independence:**

```
Scene Rendering ──> device.metrics.performance  (FPS, frameCount, frametime)
                    ↓
                    NO LIVENESS STATE

Watchdog        ──> watchdog.deviceHealth[id]  (lastSeenTs, status, health)
                    ↓
                    SINGLE SOURCE OF TRUTH
```

**Benefits:**

- ✅ No shared state → No conflicts
- ✅ Single source of truth → No ambiguity
- ✅ Clear separation → Easier testing
- ✅ True independence → Scene can't affect watchdog

---

## 4. Detailed State Structures

### 4.1 Watchdog State (NEW)

**Location:** `WatchdogService.deviceHealth` Map

**Structure:**

```javascript
class WatchdogService {
  constructor(...) {
    // NEW: Watchdog's own device health state
    this.deviceHealth = new Map(); // deviceId -> DeviceHealthState
  }
}

// DeviceHealthState structure
{
  // Identity
  deviceId: '192.168.1.159',          // Device IP
  deviceName: 'P00 • Dev • WZ',       // Device display name

  // Health Status
  status: 'online',                   // 'online' | 'degraded' | 'offline'
  lastSeenTs: 1699876543210,          // When device last responded (milliseconds)

  // Current Health Check
  lastHealthCheck: {
    timestamp: 1699876543210,         // When check was performed
    success: true,                    // Did check succeed?
    latencyMs: 45,                    // Response time in milliseconds
    error: null                       // Error message if failed
  },

  // Failure Tracking
  consecutiveFailures: 0,             // Count of failures in a row
  consecutiveSuccesses: 3,            // Count of successes in a row
  totalChecks: 1234,                  // Total health checks performed

  // Offline Tracking (for alerts)
  offlineSince: null,                 // Timestamp when went offline (null if online)
  offlineDuration: null,              // Duration offline in milliseconds
  recoveredAt: null,                  // Timestamp when recovered from offline

  // Configuration
  checkIntervalSeconds: 10,           // How often to check
  offlineThresholdMinutes: 120,      // When to trigger offline alert

  // Optional: History
  checkHistory: [                     // Last 10 checks (optional for debugging)
    { timestamp, success, latencyMs },
    { timestamp, success, latencyMs },
    // ...
  ]
}
```

**API Methods:**

```javascript
// Get health for single device
watchdog.getDeviceHealth(deviceId) -> DeviceHealthState | null

// Get health for all devices
watchdog.getAllDeviceHealth() -> Map<deviceId, DeviceHealthState>

// Get health summary (for API)
watchdog.getHealthSummary(deviceId) -> {
  lastSeenTs,
  status,
  latencyMs,
  consecutiveFailures
}
```

---

### 4.2 Scene Performance Metrics (UNCHANGED)

**Location:** `device.metrics`

**Structure:**

```javascript
// DeviceProxy.metrics (existing, but clarified)
{
  // Frame Rendering Stats
  frameCount: 1234,                   // Total frames rendered
  lastFrametime: 16.7,                // Last frame render time (ms)
  fps: 60,                            // Calculated frames per second

  // Push Stats
  pushes: 1234,                       // Total push operations
  skipped: 0,                         // Frames skipped
  errors: 0,                          // Push errors

  // Timestamps
  ts: 1699876543210,                  // Timestamp of this metrics snapshot

  // REMOVED: lastSeenTs, lastSeenSource, health-related fields
}
```

**No Health State - Only Performance Metrics**

---

### 4.3 API Response Structure (NEW)

**Device Info Endpoint:** `GET /api/devices/:ip`

**New Response:**

```javascript
{
  // Device Identity
  ip: '192.168.1.159',
  name: 'P00 • Dev • WZ',
  deviceType: 'pixoo64',
  driver: 'real',

  // Performance Metrics (from scene system)
  performance: {
    fps: 60,
    frameCount: 1234,
    lastFrametime: 16.7,
    pushes: 1234,
    errors: 0,
    ts: 1699876543210
  },

  // Health Status (from watchdog) - NEW SECTION
  health: {
    status: 'online',                 // 'online' | 'degraded' | 'offline'
    lastSeenTs: 1699876543210,        // When last responded to health check
    lastCheck: {
      timestamp: 1699876543210,
      success: true,
      latencyMs: 45
    },
    consecutiveFailures: 0,
    offlineSince: null
  },

  // Scene State (existing)
  scene: {
    currentScene: 'clock',
    playState: 'playing',
    // ...
  }
}
```

**Watchdog Status Endpoint:** `GET /api/watchdog/status` (NEW)

```javascript
{
  "192.168.1.159": {
    status: 'online',
    lastSeenTs: 1699876543210,
    latencyMs: 45,
    consecutiveFailures: 0
  },
  "192.168.1.189": {
    status: 'degraded',
    lastSeenTs: 1699876540000,
    latencyMs: 234,
    consecutiveFailures: 2
  }
}
```

---

## 5. Data Flow Diagrams

### 5.1 Current Flow (BROKEN)

```
┌──────────────────┐
│ Scene Rendering  │
│  (push frames)   │
└────────┬─────────┘
         │ Updates device.health.lastSeenTs
         ↓
    ┌────────────────────┐
    │ device.health      │ ← SHARED STATE (CONFLICT!)
    │  .lastSeenTs       │
    └────────┬───────────┘
         ↑   │
         │   │ Reads lastSeenTs
         │   ↓
    ┌────────────────────┐
    │ Watchdog Service   │
    │ (health checks)    │
    └────────────────────┘
         │ Updates device.health.lastSeenTs

Problem: Two writers, one state → Conflicts
```

### 5.2 New Flow (FIXED)

```
┌──────────────────┐
│ Scene Rendering  │
│  (push frames)   │
└────────┬─────────┘
         │
         ↓
    ┌────────────────────┐
    │ device.metrics     │ ← Performance only
    │  .fps, .frameCount │
    └────────────────────┘
         │
         ↓
    ┌────────────────────┐
    │ Performance Charts │
    └────────────────────┘


┌──────────────────┐
│ Watchdog Service │
│ (health checks)  │
└────────┬─────────┘
         │
         ↓
    ┌─────────────────────────┐
    │ watchdog.deviceHealth   │ ← Health only (SINGLE SOURCE)
    │  [deviceId].lastSeenTs  │
    └────────┬────────────────┘
         │
         ↓
    ┌────────────────────┐
    │ UI "Last Seen"     │
    │ Health Status      │
    └────────────────────┘

Solution: Separate state, separate concerns, no conflicts
```

---

## 6. Implementation Changes

### 6.1 Files to Modify

**Priority 1: Core Watchdog (Critical)**

1. **`lib/services/watchdog-service.js`** - Major Changes

   ```javascript
   // ADD: Own device health state
   this.deviceHealth = new Map();

   // MODIFY: performHealthCheck()
   async performHealthCheck(ip) {
     const result = await device.impl.healthCheck();

     // UPDATE: Store in watchdog's own state
     this.updateDeviceHealth(ip, result);

     // REMOVE: Don't update device.health.lastSeenTs
   }

   // ADD: New methods
   updateDeviceHealth(deviceId, healthCheckResult) { ... }
   getDeviceHealth(deviceId) { ... }
   getAllDeviceHealth() { ... }

   // MODIFY: checkDevice()
   // Read from this.deviceHealth, not from device.getMetrics()
   ```

2. **`lib/device-adapter.js`** - Moderate Changes

   ```javascript
   // MODIFY: DeviceProxy.push()
   async push(sceneName, publishOk) {
     await this.impl.push();

     // UPDATE: Only performance metrics
     this.metrics.frameCount++;
     this.metrics.lastFrametime = frametime;

     // REMOVE: health.updateFromPush()
     // REMOVE: this.metrics.lastSeenTs = timestamp
   }

   // MODIFY: getMetrics()
   getMetrics() {
     return {
       frameCount: this.metrics.frameCount,
       fps: this.metrics.fps,
       lastFrametime: this.metrics.lastFrametime,
       // REMOVE: lastSeenTs, health
     };
   }
   ```

**Priority 2: Health Store (Deprecate or Refactor)**

3. **`lib/services/device-health.js`** - Refactor or Remove

   ```javascript
   // OPTION A: Remove entirely (watchdog has own state)
   // OPTION B: Repurpose for watchdog-only use
   // OPTION C: Keep for backward compat, deprecate methods

   // REMOVE: updateFromPush() - scene shouldn't update health
   // REMOVE: lastSeenTs field from DeviceHealthEntry
   ```

**Priority 3: Drivers (Minor Changes)**

4. **`lib/drivers/pixoo/pixoo-driver.js`** - Minor

   ```javascript
   async healthCheck() {
     try {
       await httpPost(this.host, { Command: 'Channel/GetHttpGifId' });
       const latencyMs = Date.now() - startTime;

       // REMOVE: this.stats.lastSeenTs = Date.now()

       return { success: true, latencyMs };
     }
   }
   ```

5. **`lib/drivers/awtrix/awtrix-driver.js`** - Minor

   ```javascript
   async healthCheck() {
     const stats = await this._httpRequest('GET', '/stats');
     const latencyMs = Date.now() - startTime;

     // REMOVE: this.stats.lastSeenTs = Date.now()
     // REMOVE: this.stats.lastUpdate = Date.now()

     return { success: true, latencyMs, stats };
   }
   ```

**Priority 4: API Layer**

6. **`lib/services/device-service.js`** - Moderate

   ```javascript
   // MODIFY: getDeviceInfo()
   async getDeviceInfo(deviceIp) {
     const device = this.deviceAdapter.getDevice(deviceIp);
     const metrics = device.getMetrics(); // Performance only

     // ADD: Get health from watchdog
     const health = this.watchdogService.getDeviceHealth(deviceIp);

     return {
       ip: deviceIp,
       performance: metrics,  // NEW: Separated
       health: health,        // NEW: From watchdog
       scene: sceneState
     };
   }
   ```

7. **API Routes** - Minor Changes
   - Update `/api/devices/:ip` to use new structure
   - Add `/api/watchdog/status` endpoint

**Priority 5: Frontend (UI Changes)**

8. **`web/frontend/src/components/DeviceCard.vue`**

   ```vue
   <!-- BEFORE -->
   <div>Last Seen: {{ device.metrics.lastSeenTs }}</div>

   <!-- AFTER -->
   <div>Last Seen: {{ device.health.lastSeenTs }}</div>
   <div>Status: {{ device.health.status }}</div>
   ```

9. **Frontend API Client**
   - Update type definitions for new response structure
   - Update all components reading lastSeenTs

---

### 6.2 Code Change Summary

**Additions:**

- `WatchdogService.deviceHealth` Map
- `WatchdogService.updateDeviceHealth()` method
- `WatchdogService.getDeviceHealth()` method
- `WatchdogService.getAllDeviceHealth()` method
- New API endpoint `/api/watchdog/status`
- New response structure with `performance` and `health` sections

**Removals:**

- `DeviceHealthEntry.updateFromPush()` method
- `DeviceHealthEntry.lastSeenTs` field (move to watchdog)
- `DeviceProxy.push()` health updates
- `DeviceProxy.metrics.lastSeenTs` field
- Driver `healthCheck()` lastSeenTs updates

**Modifications:**

- `WatchdogService.performHealthCheck()` - update own state
- `WatchdogService.checkDevice()` - read own state
- `DeviceProxy.getMetrics()` - return performance only
- `DeviceService.getDeviceInfo()` - combine performance + health
- UI components - read from `device.health`

**Lines of Code:**

- Estimated additions: ~200 lines
- Estimated removals: ~100 lines
- Estimated modifications: ~150 lines
- **Net change:** ~250 lines

---

## 7. Migration Strategy

### 7.1 Migration Phases

**Phase 1: Add New State (Non-Breaking)**

- Add `watchdog.deviceHealth` Map
- Populate it in parallel with old state
- Both systems running side-by-side
- Test in development

**Phase 2: Update API (Backward Compatible)**

- Add new `performance` and `health` fields to API
- Keep old `metrics.lastSeenTs` field temporarily
- Deprecation warnings in logs
- Update API clients gradually

**Phase 3: Update UI (Feature Flag)**

- Feature flag: `USE_NEW_HEALTH_API`
- UI reads from new structure when flag enabled
- Test with subset of users
- Monitor for issues

**Phase 4: Remove Old State (Breaking)**

- Remove `device.health.lastSeenTs` updates from push
- Remove old API fields
- Remove feature flag
- Full cutover

### 7.2 Rollback Plan

**If issues arise:**

1. Toggle feature flag OFF
2. Revert to old API structure
3. UI falls back to old `metrics.lastSeenTs`
4. Investigate and fix
5. Retry cutover

**Safety:** Parallel state during migration allows instant rollback

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Watchdog Service Tests:**

```javascript
test('updateDeviceHealth() stores health state', () => {
  const watchdog = new WatchdogService(...);
  const result = { success: true, latencyMs: 45 };

  watchdog.updateDeviceHealth('192.168.1.159', result);

  const health = watchdog.getDeviceHealth('192.168.1.159');
  expect(health.lastHealthCheck.success).toBe(true);
  expect(health.lastHealthCheck.latencyMs).toBe(45);
});

test('consecutive failures increment correctly', () => {
  const watchdog = new WatchdogService(...);

  watchdog.updateDeviceHealth('192.168.1.159', { success: false });
  watchdog.updateDeviceHealth('192.168.1.159', { success: false });

  const health = watchdog.getDeviceHealth('192.168.1.159');
  expect(health.consecutiveFailures).toBe(2);
});

test('status transitions: online → degraded → offline', () => {
  // Test state machine transitions
});
```

**Device Adapter Tests:**

```javascript
test('push() does NOT update health state', () => {
  const device = new DeviceProxy(...);

  await device.push('test-scene', publishOk);

  // Verify no health state was touched
  expect(device.health.lastSeenTs).toBeUndefined();
  expect(device.metrics.lastSeenTs).toBeUndefined();
});

test('getMetrics() returns only performance data', () => {
  const device = new DeviceProxy(...);
  const metrics = device.getMetrics();

  expect(metrics.fps).toBeDefined();
  expect(metrics.frameCount).toBeDefined();
  expect(metrics.lastSeenTs).toBeUndefined(); // NO health data
});
```

### 8.2 Integration Tests

**Independence Tests (Critical):**

```javascript
test('scene rendering succeeds while health check fails', async () => {
  // Mock: Health check returns failure
  mockHealthCheck.mockReturnValue({ success: false });

  // Scene renders successfully
  await device.push('test-scene', publishOk);

  // Verify: Performance metrics updated
  expect(device.metrics.frameCount).toBeGreaterThan(0);

  // Verify: Health state NOT updated by push
  const health = watchdog.getDeviceHealth(deviceIp);
  expect(health.lastHealthCheck.success).toBe(false);

  // Verify: Systems independent
});

test('health check succeeds while scene rendering fails', async () => {
  // Mock: Scene rendering throws error
  device.impl.push.mockRejectedValue(new Error('Render failed'));

  // Health check succeeds
  await watchdog.performHealthCheck(deviceIp);

  // Verify: Health updated
  const health = watchdog.getDeviceHealth(deviceIp);
  expect(health.lastHealthCheck.success).toBe(true);

  // Verify: No cross-contamination
});
```

### 8.3 E2E Tests

**UI Tests:**

```javascript
test('UI displays health status from watchdog', async () => {
  // Navigate to device page
  await page.goto('/devices/192.168.1.159');

  // Verify "Last Seen" comes from watchdog
  const lastSeen = await page.$eval('.last-seen', (el) => el.textContent);
  expect(lastSeen).toContain('2 seconds ago');

  // Verify status badge
  const status = await page.$eval('.status-badge', (el) => el.textContent);
  expect(status).toBe('Online');
});

test('Performance charts use scene metrics', async () => {
  await page.goto('/devices/192.168.1.159');

  // Verify FPS chart exists
  const fpsValue = await page.$eval('.fps-value', (el) => el.textContent);
  expect(parseInt(fpsValue)).toBeGreaterThan(0);
});
```

### 8.4 Regression Tests

**Existing Test Updates:**

- Update ~50 tests that check `lastSeenTs`
- Update mocks to use new structure
- Ensure 522 existing tests still pass

---

## 9. Risks and Mitigations

| Risk                                    | Impact | Probability | Mitigation                                          |
| --------------------------------------- | ------ | ----------- | --------------------------------------------------- |
| Breaking changes to UI                  | High   | Medium      | Phase migration, feature flags, backward compat     |
| Missing edge cases in state transitions | Medium | Medium      | Comprehensive unit tests, state machine validation  |
| Performance impact of separate state    | Low    | Low         | Minimal - just separate Maps, same operations       |
| Regression in existing functionality    | High   | Low         | Run all 522 existing tests, phased rollout          |
| Health check still unreliable           | High   | Low         | This fixes state conflicts, not health check itself |

---

## 10. Success Criteria

**Story is successful if:**

- [ ] Zero false positives in 24-hour test
- [ ] Scene rendering and health check provably independent
- [ ] All 522 existing tests pass
- [ ] UI correctly displays health from watchdog
- [ ] Performance metrics unaffected
- [ ] 7-day production stability with no anomalies

---

## 11. Timeline

**Day 2 (Wed):** Architecture design (this document) ✅  
**Day 3 (Thu):** Team review at 2 PM, get approval  
**Day 4 (Fri):** Phase 1 - Add new state  
**Day 5 (Sat):** Phase 2 - Update API  
**Day 6 (Sun):** Phase 3 - Update UI, integration tests  
**Day 7 (Mon):** Phase 4 - Testing, validation, sprint review

---

## 12. Open Questions for Thursday Review

1. **DeviceHealthStore fate?**
   - Remove entirely?
   - Repurpose for watchdog-only?
   - Keep for backward compat?

2. **Migration approach?**
   - Big bang (all at once)?
   - Phased (parallel state during transition)?

3. **API versioning?**
   - Breaking change acceptable?
   - Or support both old + new for one release?

4. **WebSocket events?**
   - Should watchdog emit real-time health updates?
   - For immediate UI feedback without polling?

5. **Health check reliability?**
   - This fixes STATE conflicts
   - But health check itself might need improvement
   - Separate story or part of this one?

---

## 13. Alternatives Considered

### Alternative 1: Keep Dual Path, Add Conflict Resolution

- **Idea:** Keep both updates, add "winner" logic
- **Rejected:** Still has conflicting signals, doesn't solve root cause

### Alternative 2: Make Scene Rendering Update Health

- **Idea:** Only scene push updates health, watchdog just checks config
- **Rejected:** Doesn't work when scene isn't actively rendering

### Alternative 3: Worker Thread for Watchdog

- **Idea:** Run watchdog in separate OS thread
- **Deferred:** State separation proves independence first, can add later

---

## 14. Conclusion

This architecture redesign eliminates the dual-path state conflict that causes false positives. By making watchdog the single source of truth for device liveness and separating performance metrics into scene rendering, we achieve true independence and reliable monitoring.

**Confidence:** 90% this will solve the false positive issue

**Next Steps:**

1. Review this document with team (Thursday 2 PM)
2. Get approval on approach
3. Begin implementation (Friday)

---

**Document Status:** Draft for Review  
**Review Date:** Thursday, November 14, 2025 at 2:00 PM  
**Approvers:** Markus (Product Lead), Alice (PO), Bob (SM), Dana (QA)

---

**End of Architecture Design Document**
