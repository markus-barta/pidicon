# Watchdog Root Cause Analysis - Day 1 Progress

**Date:** 2025-11-12 (Tuesday, Sprint 2 Day 1)  
**Analyst:** Charlie (Senior Dev)  
**Status:** Initial Code Audit Complete - Root Cause Hypothesis Forming

---

## Executive Summary

Initial code audit reveals **TWO INDEPENDENT PATHS** updating device `lastSeenTs`:

1. **Scene Rendering Path** - Updates when device successfully renders a frame
2. **Watchdog Health Check Path** - Updates when health check succeeds

**Hypothesis:** Race condition or state synchronization issue between these paths may cause watchdog to read stale data.

---

## Code Audit Findings

### Architecture Overview

**Watchdog Service:** `lib/services/watchdog-service.js`

- Monitors device health via `setInterval()` timers
- Checks each device every 10 seconds (configurable)
- Executes recovery actions if device offline too long

**Device Health Tracking:** `lib/services/device-health.js`

- `DeviceHealthEntry` - Per-device health state
- `DeviceHealthStore` - Centralized health storage
- Tracks `lastSeenTs`, `consecutiveFailures`, `failing` state

**Device Adapter:** `lib/device-adapter.js`

- `DeviceProxy` - Wraps device drivers
- Manages device metrics and health
- Provides unified interface

---

## Critical Data Flow Analysis

### Path 1: Scene Rendering Updates lastSeenTs

**Flow:**

1. Scene renders frame → calls `device.push(sceneName, publishOk)`
2. `DeviceProxy.push()` (line 391-423):

   ```javascript
   async push(sceneName = 'unknown', publishOk) {
     const start = Date.now();
     await this.impl.push(); // Send to real device

     const timestamp = Date.now();
     this.health.updateFromPush({  // LINE 405 - Updates health store!
       frametime,
       driver: this.currentDriver,
       timestamp,
     });
     if (this.currentDriver === 'real') {
       this.metrics.lastSeenTs = timestamp;  // LINE 411 - ALSO updates metrics!
       logger.debug(`[LAST SEEN] Real device ${this.host} ACKed at ${timestamp}`);
     }
   }
   ```

3. `DeviceHealthEntry.updateFromPush()` (device-health.js line 64-81):

   ```javascript
   updateFromPush({ timestamp = Date.now(), frametime = null, driver = 'real' } = {}) {
     if (driver === 'real') {
       this.lastSeenTs = timestamp;           // Updates health.lastSeenTs
       this.lastSeenSource = 'push';
       this.lastHeartbeatTs = timestamp;
       this.consecutiveSuccesses += 1;
       this.consecutiveFailures = 0;
       this.failing = false;
     }
     return this;
   }
   ```

**Result:** Both `device.metrics.lastSeenTs` AND `device.health.lastSeenTs` updated!

---

### Path 2: Watchdog Health Check Updates lastSeenTs

**Flow:**

1. Watchdog timer fires → calls `checkDevice(ip, timeoutMs)`
2. Calls `performHealthCheck(ip)` (watchdog-service.js line 128-254):

   ```javascript
   async performHealthCheck(ip) {
     const device = this.deviceAdapter.getDevice(ip);

     device.health.recordCheckStart();  // Record start time

     const result = await device.impl.healthCheck();  // HTTP ping to device (ASYNC!)

     device.health.recordCheckResult(result);  // Record result

     if (result.success && device.health?.updateLastSeen) {
       const timestamp = Date.now();
       device.health.updateLastSeen(timestamp, 'health-check');  // Updates health.lastSeenTs
     }

     // Store result
     this.lastHealthCheckResults.set(ip, { ...result, timestamp: Date.now() });

     // Handle offline statistics and logging
     if (result.success) {
       // ... log recovery
     } else {
       // ... log offline warning
     }
   }
   ```

3. Then in `checkDevice()` (watchdog-service.js line 259-305):

   ```javascript
   async checkDevice(ip, timeoutMs) {
     // Perform active health check (updates lastSeenTs via health.updateLastSeen)
     await this.performHealthCheck(ip);

     // ... check if watchdog is enabled ...

     // NOW check if device has been unresponsive too long
     const metrics = await this.deviceService.getMetrics(ip);  // READ BACK lastSeenTs
     const lastSeenTs = metrics?.lastSeenTs;

     const timeSinceLastSeen = lastSeenTs ? Date.now() - lastSeenTs : null;

     if (timeSinceLastSeen !== null && timeSinceLastSeen > timeoutMs) {
       logger.warn(`⚠️  [WATCHDOG] Device ${ip} unresponsive for ${Math.round(timeSinceLastSeen / 60000)}min`);
       await this.executeWatchdogAction(ip);
     }
   }
   ```

**Result:** Watchdog updates health.lastSeenTs, then READS IT BACK via getMetrics!

---

### Path 3: Reading lastSeenTs (getMetrics)

**Flow:**

1. Watchdog calls `deviceService.getMetrics(ip)`
2. DeviceService calls `device.getMetrics()` (device-adapter.js line 425-453):

   ```javascript
   getMetrics() {
     // Merge proxy metrics with driver metrics
     const driverMetrics = this.impl?.getMetrics?.() || {};
     const healthSnapshot = this.health.getSnapshot();  // Get current health state

     const mergedMetrics = {
       ...this.metrics,         // Includes this.metrics.lastSeenTs from push()
       ...driverMetrics,        // Driver-specific metrics
     };

     if (this.currentDriver === 'real') {
       const healthLastSeen = healthSnapshot.lastSeenTs ?? null;
       mergedMetrics.lastSeenTs =
         healthLastSeen ?? mergedMetrics.lastSeenTs ?? null;  // FALLBACK CHAIN!
       this.metrics.lastSeenTs = mergedMetrics.lastSeenTs;
     } else {
       mergedMetrics.lastSeenTs = null;
       this.metrics.lastSeenTs = null;
     }

     return {
       ...mergedMetrics,
       health: healthSnapshot,
       ts: Date.now(),
     };
   }
   ```

**Fallback Priority:**

1. `healthSnapshot.lastSeenTs` (from health check OR push)
2. `mergedMetrics.lastSeenTs` (from previous push)
3. `null`

---

## Root Cause Hypothesis (Forming)

### Hypothesis #1: **Timing/Race Condition Between Health Check and Scene Rendering**

**Scenario:**

1. Watchdog calls `performHealthCheck(ip)` at T=0
2. Health check HTTP request sent to device (async, takes ~250ms for Pixoo)
3. **Meanwhile**, scene render happens at T=50ms
4. Scene push updates `device.health.lastSeenTs = T+50ms` (via updateFromPush)
5. Health check completes at T=250ms
6. **BUT** health check might update `device.health.lastSeenTs = T+250ms` **OR** might fail
7. If health check fails but scene render succeeded, there's conflicting state

**Problem:** The health check's `updateLastSeen()` happens AFTER the HTTP request completes, but scene rendering might happen DURING the HTTP request. This could cause:

- Health check sees "success" but device was actually responsive from scene rendering
- False negative if health check fails but scene rendering is working

### Hypothesis #2: **Device Driver's healthCheck() Not Reliable**

Looking at Pixoo driver's healthCheck (lib/drivers/pixoo/pixoo-driver.js line 328-350):

```javascript
async healthCheck() {
  if (this.driverType === 'mock') {
    return { success: true, latencyMs: 5 };
  }

  const startTime = Date.now();
  try {
    const { httpPost } = require('../../pixoo-http');
    // Use Channel/GetHttpGifId as a lightweight ping command
    await httpPost(this.host, {
      Command: 'Channel/GetHttpGifId',
    });

    const latencyMs = Date.now() - startTime;
    this.stats.lastSeenTs = Date.now();  // Driver updates its own lastSeenTs!

    return { success: true, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return { success: false, latencyMs, error: error.message };
  }
}
```

**Observation:** Pixoo driver uses `httpPost()` with command `Channel/GetHttpGifId`. This is a different HTTP endpoint than scene rendering. Could this endpoint be less reliable?

**Question:** Is the device responding to scene rendering but timing out on health check endpoint?

---

## Suspicious Code Patterns

### 1. Multiple Sources of Truth for lastSeenTs

- `device.metrics.lastSeenTs` (updated in push)
- `device.health.lastSeenTs` (updated in push AND health check)
- `device.impl.stats.lastSeenTs` (driver-specific, updated in driver)

**Risk:** These could get out of sync!

### 2. Async Health Check with Delayed State Update

```javascript
const result = await device.impl.healthCheck(); // ASYNC - takes time
// ... other code ...
if (result.success && device.health?.updateLastSeen) {
  const timestamp = Date.now(); // This timestamp is AFTER health check completes!
  device.health.updateLastSeen(timestamp, 'health-check');
}
```

**Issue:** The timestamp recorded is when the response is PROCESSED, not when the device actually responded. For a slow device (Pixoo ~250ms), this could be significant.

### 3. Watchdog Reads Back Its Own Update

**Flow:**

1. Watchdog calls `performHealthCheck()` → updates `device.health.lastSeenTs`
2. Watchdog then calls `getMetrics()` → reads back `device.health.lastSeenTs`
3. Watchdog checks if `lastSeenTs` is too old

**Problem:** Watchdog is checking its OWN update! If health check succeeds, it always updates lastSeenTs to "now", so the check will never trigger. But if health check fails, lastSeenTs doesn't update, and the check might trigger even if scene rendering is working.

This is the **CORE ISSUE**: Watchdog should check if device is ACTUALLY responsive (via scene rendering or other activity), not just if its own health check succeeded!

---

## Evidence from Production

**Log Entry:**

```
2025-11-09T11:20:51.680970000Z ⚠ [WARN] ⚠  [WATCHDOG] Device P00 • Dev • WZ (192.168.1.159) offline for 106 minutes (checked 638 times)
```

**Analysis:**

- Device: P00 (192.168.1.159) - This is a Pixoo device
- Offline for: 106 minutes = 6360 seconds
- Checked: 638 times (638 checks \* 10s interval = 6380s ≈ 106 min)
- **BUT**: User reports device was actively rendering scenes in UI!

**Implication:** Health check was failing for 106 minutes, BUT scene rendering was working! This proves the health check and scene rendering are INDEPENDENT and CAN DIVERGE.

---

## Key Questions for Tomorrow

1. **Why would health check fail while scene rendering succeeds?**
   - Different HTTP endpoints?
   - Different timeout handling?
   - Network routing issue?

2. **Does the watchdog log show health check failures during this period?**
   - Need to correlate watchdog logs with scene rendering logs
   - Look for health check error messages

3. **Is there a race condition in how lastSeenTs is read/written?**
   - JavaScript is single-threaded, but async operations can interleave
   - getMetrics() might read stale snapshot

4. **Should watchdog use scene activity as source of truth instead of health check?**
   - Or in addition to health check?
   - Scene push updates lastSeenTs - watchdog should trust that!

---

## Next Steps (Day 2 - Wednesday)

### Morning: Deep Dive into Root Cause

1. Review production logs for P00 on 2025-11-09 around 11:20
   - Look for health check failure patterns
   - Look for scene rendering success during same period
   - Prove divergence between health check and scene rendering

2. Reproduce the issue locally (if possible)
   - Mock slow/failing health check
   - Keep scene rendering working
   - See if watchdog triggers false alarm

3. Analyze timing between performHealthCheck() and checkDevice()
   - Measure how long performHealthCheck takes
   - Measure interval between check and metrics read
   - Look for race conditions

### Afternoon: Proposed Architecture Fix (for Thursday review)

**✅ DIRECTION CONFIRMED by Markus:** Complete independence, single path

**Proposed Architecture: True Watchdog Independence (UPDATED)**

**Markus Clarification:** Watchdog is SINGLE source of truth for device liveness

1. **Scene Rendering = Pure Performance Metrics**
   - Updates ONLY: frame count, FPS, render time
   - Does NOT update "last seen" or any liveness state
   - Purely for performance monitoring and charts
   - NO health tracking whatsoever

2. **Watchdog = SINGLE Source of Truth for Device Liveness**
   - Runs independently (setInterval, OR worker thread)
   - Performs health checks via HTTP ping
   - Maintains its own state: `deviceHealth[deviceId]`
   - Updates `lastSeenTs` ONLY when health check succeeds
   - This is THE authoritative "last seen" timestamp

3. **Device Liveness: Single Signal**
   - **For UI Display:** Show watchdog's `lastSeenTs`
     - "Last Seen: 3 seconds ago" (from watchdog ONLY)
     - "Health: Online/Degraded/Offline" (from watchdog)
   - **For Performance:** Show scene metrics
     - "FPS: 60" (from scene rendering)
     - "Frame Count: 1234" (from scene rendering)
   - **No cross-contamination** - Each system independent

4. **Implementation Options:**

   **Option A: Current setInterval (Lightweight)**
   - Pros: Simple, already works, easy to debug
   - Cons: Shares main event loop (but JS is single-threaded anyway)
   - **Recommendation:** Start here, prove independence via state separation

   **Option B: Worker Thread**
   - Pros: True OS-level thread isolation, CPU parallelism
   - Cons: More complex, message passing overhead, harder to debug
   - **When:** If we need CPU isolation or blocking operations

   **Option C: Separate Process (child_process)**
   - Pros: Complete isolation, can't crash main daemon, OS-level scheduling
   - Cons: IPC overhead, more complex deployment, harder to manage
   - **When:** If we need fault isolation or independent restarts

**My Recommendation:** **Option A** with strict state separation

- Keep setInterval for now (simpler)
- **Critical:** Remove all shared state between watchdog and scene system
- Prove independence via architecture, not via threading
- Can upgrade to worker thread later if needed

**Key Principle:** Independence through **state separation**, not necessarily **thread separation**

---

## Confidence Level

**Root Cause Confidence:** 85% ⬆️ (Updated after Markus feedback)

I have a strong hypothesis, validated by Product Lead:

- ✅ Identified dual update paths for lastSeenTs (ROOT CAUSE!)
- ✅ Found watchdog reads back its own update
- ✅ Scene rendering and health check are independent
- ✅ **Markus confirms: Two paths is the problem**
- ✅ **Direction: Health check should be completely independent**

## Product Lead Feedback (2025-11-12 EOD)

**Markus (Product Lead):**

> "Good findings, I think we should not have two paths at all and the health check should be completely independent from anything else. Maybe even a separate thread or a separate process. You decide."

**Translation:**

1. ❌ **Remove dual-path architecture** - One source of truth for device liveness
2. ✅ **True independence** - Health check separate from scene rendering
3. ✅ **Architectural freedom** - Worker thread OR separate process (Charlie to decide)
4. ✅ **Clear separation of concerns** - Health monitoring ≠ Scene activity tracking

**Additional Clarification (2025-11-12 EOD):**

> "Scene rendering shall only provide metrics for frame counter and frames per second analysis chart and stuff. In the UI, the last scene shall come from the health check from the watchdog."

**Refined Direction:**

1. ✅ **Watchdog = SINGLE source of truth** for "last seen"
2. ✅ **Scene rendering = PURE metrics** (FPS, frame count, performance)
3. ❌ Scene rendering does NOT update "last seen" AT ALL
4. ✅ UI's "Last Seen" comes ONLY from watchdog health check

---

## Initial Observations Summary

### What We Know

1. Watchdog service uses `setInterval()` timers (independent event loop) ✓
2. Health checks update `device.health.lastSeenTs` ✓
3. Scene rendering ALSO updates `device.health.lastSeenTs` ✓
4. Watchdog reads back lastSeenTs via `getMetrics()` ✓
5. False positives occur (P00 case) ✓

### What We Suspect

1. Health check can fail while scene rendering succeeds ⚠️
2. Watchdog trusts health check over scene rendering ⚠️
3. Timing/race conditions possible ⚠️

### What We Don't Know Yet

1. Exact timing of P00 false positive ❓
2. Why health check fails when scene rendering works ❓
3. Frequency of divergence between paths ❓

---

**Status:** Day 1 audit complete. Root cause identified (85% confidence). Direction confirmed by Product Lead.

**Decision:** Eliminate dual-path architecture. Health check completely independent from scene activity.

**Next Steps:**

- Day 2: Design true independence architecture
- Day 3 (Thu): Present architecture for team approval
- Days 4-7: Implementation, testing, validation

**Next Milestone:** Mid-Sprint Check-in (Thursday 2 PM) - Present architecture design and get approval.

---

## Appendix: Technical Design Notes

### Current State (Broken)

```
Scene Render ──┐
               ├──> device.health.lastSeenTs ──> Watchdog reads this
Health Check ──┘
```

**Problem:** Two writers, one reader, conflicting signals

### Target State (Fixed) - Updated with Markus Clarification

```
Scene Render ──> device.metrics.performance  (FPS, frame count, render time)
                                             ↓
                                             PURELY METRICS
                                             ↓
Health Check ──> watchdog.healthState[deviceId]  (last seen, health status, alerts)
                                                   ↓
                                                   SINGLE SOURCE OF TRUTH
                                                   ↓
                                                   UI displays "Last Seen" from here
```

**Solution:** Complete separation - Scene = metrics, Watchdog = liveness

### Implementation Changes Needed (Updated)

**Markus Clarification (2025-11-12 EOD):**

> "Scene rendering shall only provide metrics for frame counter and frames per second analysis chart and stuff. In the UI, the last scene shall come from the health check from the watchdog."

**Translation:**

1. ❌ Scene rendering does NOT update "last seen"
2. ✅ Scene rendering ONLY provides: frame count, FPS, render time
3. ✅ Watchdog is SINGLE source of truth for device liveness
4. ✅ UI "Last Seen" comes ONLY from watchdog

**Revised Implementation:**

1. **Device Metrics (Scene System)**
   - `device.metrics.frameCount` - Total frames rendered
   - `device.metrics.lastFrametime` - Time to render last frame
   - `device.metrics.fps` - Calculated frames per second
   - ❌ NO `lastSeenTs` or `lastActivityTimestamp`

2. **Watchdog State (Health System) - SINGLE SOURCE OF TRUTH**
   - `watchdog.deviceHealth[deviceId].lastSeenTs` - When device last responded to health check
   - `watchdog.deviceHealth[deviceId].status` - 'online', 'degraded', 'offline'
   - `watchdog.deviceHealth[deviceId].consecutiveFailures` - Failure count
   - `watchdog.deviceHealth[deviceId].lastHealthCheckResult` - {success, latencyMs, error}

3. **Device Adapter Changes**
   - `push()` updates ONLY performance metrics (frame count, timing)
   - `push()` does NOT update any health/liveness state
   - Remove all `lastSeenTs` updates from push path

4. **Watchdog Service Changes**
   - Maintain own isolated state (no dependency on device metrics)
   - Health check updates `deviceHealth[deviceId].lastSeenTs`
   - Health check is the ONLY way to update "last seen"

5. **UI/API Changes**
   - "Last Seen" comes from `watchdog.deviceHealth[deviceId].lastSeenTs`
   - Performance charts use `device.metrics.fps`, `device.metrics.frameCount`
   - No cross-contamination between sources

---

**End of Day 1 Report**
