# Watchdog Architecture Design - Day 2 Plan

**Date:** 2025-11-13 (Wednesday, Sprint 2 Day 2)  
**Owner:** Charlie (Senior Dev)  
**Status:** Ready to Start  
**Goal:** Complete detailed architecture design for Thursday review

---

## Day 1 Summary (Completed)

### ✅ Achievements

- Root cause identified: Dual-path architecture (scene + watchdog both update lastSeenTs)
- Architecture direction confirmed: Watchdog = single source of truth
- Confidence: 85% (validated by Product Lead)

### ✅ Key Decisions

1. **Remove dual-path:** Scene rendering does NOT update "last seen"
2. **Watchdog independence:** Health check completely separate from scene system
3. **Clear separation:** Scene = performance metrics, Watchdog = liveness
4. **Implementation:** Start with state separation (setInterval), can add threading later

---

## Day 2 Objectives

**Primary Goal:** Complete architecture design document ready for Thursday 2 PM review

**Deliverables:**

1. Detailed state structure definitions
2. Data flow diagrams
3. API contract specifications
4. Migration strategy
5. Code change inventory
6. Testing approach

---

## Morning Session (4 hours)

### Task 1: Define New State Structures (1 hour)

**Watchdog State Structure:**

```javascript
class WatchdogService {
  constructor() {
    // NEW: Watchdog maintains its own device health state
    this.deviceHealth = new Map(); // deviceId -> HealthState
  }
}

// HealthState structure
{
  deviceId: '192.168.1.159',
  lastSeenTs: 1699876543210,           // When device last responded to health check
  lastHealthCheck: {
    timestamp: 1699876543210,
    success: true,
    latencyMs: 45,
    error: null
  },
  consecutiveFailures: 0,
  consecutiveSuccesses: 3,
  status: 'online',                    // 'online' | 'degraded' | 'offline'
  offlineSince: null,                  // Timestamp when went offline
  recoveredAt: null,                   // Timestamp when recovered
  checkHistory: []                     // Last 10 checks (optional)
}
```

**Scene Metrics Structure (unchanged, but documented):**

```javascript
device.metrics = {
  frameCount: 1234,
  lastFrametime: 16.7,
  fps: 60,
  pushes: 1234,
  skipped: 0,
  errors: 0,
  // NO health/liveness state
};
```

### Task 2: Map Current Code Paths (1.5 hours)

**Files That Currently Update lastSeenTs:**

1. `lib/device-adapter.js` - DeviceProxy.push() [LINE 411]
2. `lib/services/device-health.js` - DeviceHealthEntry.updateFromPush() [LINE 70]
3. `lib/services/device-health.js` - DeviceHealthEntry.updateLastSeen() [LINE 19]
4. `lib/services/watchdog-service.js` - performHealthCheck() [LINE 168-170]
5. `lib/drivers/pixoo/pixoo-driver.js` - healthCheck() [LINE 343]
6. `lib/drivers/awtrix/awtrix-driver.js` - healthCheck() [LINE 736-737]

**Files That Read lastSeenTs:**

1. `lib/services/watchdog-service.js` - checkDevice() [LINE 274]
2. `lib/services/device-service.js` - getMetrics() [LINE 753]
3. `lib/device-adapter.js` - getMetrics() [LINE 439-442]
4. UI components (frontend)
5. API endpoints

**Action:** Document each file's current behavior and planned changes

### Task 3: Design Migration Strategy (1 hour)

**Migration Steps:**

1. Add new `watchdog.deviceHealth` Map
2. Update watchdog to populate new state
3. Update API to expose new state
4. Update UI to consume new state
5. Remove old lastSeenTs updates from scene system
6. Remove DeviceHealthStore (or repurpose)
7. Update tests

**Backward Compatibility:**

- Keep old API during transition?
- Deprecation warnings?
- Version the API response?

### Task 4: Create Data Flow Diagrams (30 min)

**Current Flow (Broken):**

```
┌─────────────┐
│Scene Render │──┐
└─────────────┘  │
                 ├──> device.health.lastSeenTs ──> Watchdog reads ──> UI displays
┌─────────────┐  │
│Health Check │──┘
└─────────────┘

Problem: Two writers, conflicting signals
```

**New Flow (Fixed):**

```
┌─────────────┐
│Scene Render │──> device.metrics.{fps, frameCount} ──> Performance Charts
└─────────────┘

┌─────────────┐
│Health Check │──> watchdog.deviceHealth[id] ──> UI "Last Seen" / Status
└─────────────┘

Solution: Complete separation, single source of truth
```

---

## Afternoon Session (4 hours)

### Task 5: Define API Changes (1.5 hours)

**Current API (to be changed):**

```javascript
// GET /api/devices/:ip
{
  ip: '192.168.1.159',
  name: 'P00',
  metrics: {
    lastSeenTs: 1699876543210,  // REMOVE THIS
    fps: 60,
    frameCount: 1234
  }
}
```

**New API (proposed):**

```javascript
// GET /api/devices/:ip
{
  ip: '192.168.1.159',
  name: 'P00',

  // Performance metrics (from scene system)
  performance: {
    fps: 60,
    frameCount: 1234,
    lastFrametime: 16.7
  },

  // Health status (from watchdog) - NEW
  health: {
    lastSeenTs: 1699876543210,
    status: 'online',
    lastCheck: {
      timestamp: 1699876543210,
      success: true,
      latencyMs: 45
    },
    consecutiveFailures: 0
  }
}
```

**New Endpoint (optional):**

```javascript
// GET /api/watchdog/status
{
  "192.168.1.159": {
    lastSeenTs: 1699876543210,
    status: 'online',
    consecutiveFailures: 0
  },
  "192.168.1.189": {
    lastSeenTs: 1699876540000,
    status: 'degraded',
    consecutiveFailures: 2
  }
}
```

### Task 6: Create Code Change Inventory (1 hour)

**Files to Modify:**

1. **lib/services/watchdog-service.js** (Major Changes)
   - Add `this.deviceHealth = new Map()`
   - Update `performHealthCheck()` to update deviceHealth
   - Remove `getMetrics()` dependency
   - Add `getDeviceHealth(deviceId)` method
   - Add `getAllDeviceHealth()` method

2. **lib/device-adapter.js** (Moderate Changes)
   - Update `push()` - remove lastSeenTs update
   - Update `getMetrics()` - remove health state merging
   - Keep only performance metrics

3. **lib/services/device-health.js** (Refactor or Remove)
   - Remove `updateFromPush()` method
   - Remove `lastSeenTs` field
   - Or deprecate entire DeviceHealthEntry class

4. **lib/services/device-service.js** (Minor Changes)
   - Update `getMetrics()` to not include health state
   - Add `getDeviceHealth()` that calls watchdog

5. **lib/drivers/pixoo/pixoo-driver.js** (Minor Changes)
   - Remove `this.stats.lastSeenTs = Date.now()` from healthCheck

6. **lib/drivers/awtrix/awtrix-driver.js** (Minor Changes)
   - Remove `this.stats.lastSeenTs = Date.now()` from healthCheck

7. **web/frontend/src/components/DeviceCard.vue** (API Changes)
   - Update to read `device.health.lastSeenTs`
   - Instead of `device.metrics.lastSeenTs`

8. **API Routes** (Minor Changes)
   - Update device endpoints to expose new structure

9. **Tests** (Comprehensive Updates)
   - Update all tests that check lastSeenTs
   - Add new tests for watchdog.deviceHealth
   - Update mocks

### Task 7: Define Testing Approach (1 hour)

**Test Categories:**

1. **Unit Tests - Watchdog Service**
   - Test deviceHealth state updates
   - Test health check success updates state
   - Test health check failure updates state
   - Test consecutive failure counting
   - Test status transitions (online → degraded → offline)

2. **Unit Tests - Device Adapter**
   - Test push() does NOT update health state
   - Test getMetrics() returns only performance metrics

3. **Integration Tests - Independence**
   - Test scene rendering while health check fails
   - Test health check while scene rendering fails
   - Verify no cross-contamination

4. **E2E Tests - UI**
   - Verify "Last Seen" comes from watchdog
   - Verify performance charts use scene metrics
   - Verify status indicators reflect watchdog state

5. **Regression Tests**
   - Ensure all existing tests still pass
   - Update tests that relied on old behavior

### Task 8: Create Architecture Documentation (30 min)

**Document Sections:**

1. Problem Statement (dual-path issue)
2. Root Cause Analysis (from Day 1)
3. Proposed Solution (state separation)
4. State Structures (defined above)
5. Data Flow Diagrams
6. API Changes
7. Migration Plan
8. Testing Strategy
9. Risks and Mitigations
10. Timeline and Milestones

---

## End of Day 2 Deliverables

### Documents to Complete:

1. ✅ `watchdog-architecture-design.md` - Complete design document
2. ✅ State structure diagrams
3. ✅ Data flow diagrams
4. ✅ API contract specifications
5. ✅ Code change inventory with file-by-file breakdown
6. ✅ Testing approach document
7. ✅ Migration strategy

### Preparation for Thursday Review:

- Clean, clear presentation of architecture
- Diagrams ready to share
- Code examples prepared
- Ready to answer questions
- Alternative approaches documented (if any)

---

## Questions to Resolve

### Open Questions:

1. **DeviceHealthStore:** Deprecate or repurpose?
   - Current: Used by both scene and watchdog
   - Proposed: Watchdog-only, OR remove entirely

2. **Backward Compatibility:** Support old API during transition?
   - Option A: Breaking change, update all at once
   - Option B: Dual API (old + new) for one release

3. **Health Check Frequency:** Keep 10s interval?
   - Current: Every 10 seconds
   - Impact on "Last Seen" granularity

4. **WebSocket Updates:** Real-time health updates to UI?
   - Should watchdog emit events on state changes?
   - For immediate UI feedback

5. **Offline Threshold:** When does 'online' → 'offline'?
   - Current: After timeout (60-120 min)
   - Should we use consecutive failures instead?

### Decisions Needed from Thursday Review:

- Approve state structure
- Approve API changes
- Approve migration approach
- Approve testing strategy
- Go/no-go for implementation

---

## Success Criteria for Day 2

**Day 2 is successful if:**

- [ ] Complete architecture design document exists
- [ ] All state structures defined with examples
- [ ] All code changes identified and documented
- [ ] Data flow diagrams clear and accurate
- [ ] Testing approach comprehensive
- [ ] Ready to present to team on Thursday
- [ ] Confidence level: 90%+ that this will work

---

## Risks and Mitigations

| Risk                            | Impact | Mitigation                                    |
| ------------------------------- | ------ | --------------------------------------------- |
| Design too complex to implement | High   | Keep it simple - state separation only        |
| Breaking changes to API/UI      | Medium | Document migration carefully, phase if needed |
| Missing edge cases              | Medium | Thorough code audit, test coverage            |
| Performance impact              | Low    | Watchdog already independent, minimal change  |

---

**Next Steps:**

- Day 2 (Wed): Execute this plan
- Day 3 (Thu): Present at 2 PM mid-sprint check-in
- Day 4-6 (Fri-Sun): Implementation based on approved design
- Day 7 (Mon): Testing, validation, sprint review

---

**Status:** Ready to start Day 2
**Confidence:** High (direction is clear, plan is solid)
