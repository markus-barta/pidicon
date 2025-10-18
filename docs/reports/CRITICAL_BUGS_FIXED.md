# Critical Bugs Fixed - Phase 2 Refactoring

**Date**: 2025-10-02  
**Severity**: P0 (Critical - System Broken)  
**Status**: ✅ Resolved  
**Build**: 478+ (commits 420cc64, d8328a6)

---

## Executive Summary

Two critical bugs introduced during Phase 2 (ARC-304: Command Handlers) completely
broke MQTT message routing and scene switching. Both bugs have been fixed and
comprehensive integration tests added to prevent future regressions.

**Impact**:

- Scene switching completely broken (no MQTT messages being handled)
- ~2 hours downtime
- Root cause: Inadequate testing during refactoring

**Resolution**:

- Both bugs fixed and deployed
- 9 new integration tests added
- All 152 tests passing

---

## BUG-012: MQTT Routing Broken After Phase 2 Refactoring

### Symptom

```text
[WARN] No handler for topic section: state
```

MQTT messages were being received but not routed to handlers. Scene switching
had zero effect.

### Root Cause

After extracting command handlers, the MQTT routing was broken. The
`MqttService.registerHandler()` calls were registered on the `CommandRouter`
instance, but the MQTT message listener was calling `commandRouter.route()`.
This created a double-indirection that didn't work.

```javascript
// ❌ BROKEN CODE
mqttService.on('message', async ({ deviceIp, section, action, payload }) => {
  await commandRouter.route(section, deviceIp, action, payload);
});

// But handlers were registered on commandRouter, not mqttService!
// mqttService had no handlers registered, so it logged warnings
```

### Fix

Removed the redundant `CommandRouter` class entirely. `MqttService` already has
built-in routing capabilities via `registerHandler()`. We now register handlers
directly with `MqttService`:

```javascript
// ✅ FIXED CODE
mqttService.registerHandler('scene', async (deviceIp, action, payload) => {
  const handler = container.resolve('sceneCommandHandler');
  await handler.handle(deviceIp, action, payload);
});

mqttService.registerHandler('state', async (deviceIp, action, payload) => {
  const handler = container.resolve('stateCommandHandler');
  await handler.handle(deviceIp, action, payload);
});
```

### Files Changed

- `daemon.js`: Removed `CommandRouter`, registered handlers directly with
  `MqttService`
- `lib/commands/command-router.js`: Removed (redundant)
- `test/lib/command-handlers-basic.test.js`: Updated smoke tests

### Test Results

- **Before Fix**: 97/97 tests pass (but system broken!)
- **After Fix**: 143/143 tests pass
- **Build**: 478, Commit: 420cc64, Timestamp: 2025-10-02T19:15:00Z

---

## BUG-013: StateCommandHandler Missing 100+ Lines of Logic

### Symptom

Scene switching didn't work even after BUG-012 was fixed. MQTT messages were
being routed, but scenes weren't actually switching.

### Root Cause

The `StateCommandHandler` was **catastrophically oversimplified** during Phase 2
refactoring. It was missing:

1. ❌ **Scene Switching**: Called wrong method (`renderActiveScene` instead of
   `switchScene`)
2. ❌ **Animation Frame Gating**: No logic to drop stale animation frames
3. ❌ **Screen Clearing**: No screen clearing on scene change
4. ❌ **Scene State Publishing**: No MQTT state publishing
5. ❌ **Scene Change Detection**: No detection of scene vs parameter changes
6. ❌ **Missing Dependencies**: `getDevice`, `getDriverForDevice`, `versionInfo`
   not injected

**Total missing logic**: ~100 lines of critical business logic

### The Bad Extraction

```javascript
// ❌ BAD (from initial refactoring)
async _handleUpdate(deviceIp, payload) {
  const sceneName = payload?.scene || this.deviceDefaults.get(deviceIp) || 'empty';

  // Only checked if scene exists
  if (!this.sceneManager.hasScene(sceneName)) {
    this.logger.warn(`No renderer found for scene: ${sceneName}`);
    return;
  }

  // Called the WRONG method (should be switchScene, not renderActiveScene)
  await this.sceneManager.renderActiveScene(ctx);

  // That's it. No animation gating, no screen clearing, no state publishing.
}
```

### The Complete Fix

```javascript
// ✅ GOOD (full implementation restored)
async _handleUpdate(deviceIp, payload) {
  // ... Gate animation frames FIRST ...
  if (payload && payload._isAnimationFrame === true) {
    // ... detailed gating logic ...
    return; // Drop animation frames
  }

  // ... Determine scene ...
  const sceneName = payload?.scene || this.deviceDefaults.get(deviceIp) || 'empty';

  // ... Check scene exists ...
  if (!this.sceneManager.hasScene(sceneName)) {
    this.logger.warn(`No renderer found for scene: ${sceneName}`);
    return;
  }

  // ... Detect scene changes ...
  const lastScene = this.lastState[deviceIp]?.sceneName;
  const isSceneChange = !lastScene || lastScene !== sceneName;
  const shouldClear = isSceneChange || payload.clear === true;

  // ... Clear screen if needed ...
  if (shouldClear) {
    const device = this.getDevice(deviceIp);
    await device.clear();
  }

  // ... Publish "switching" state ...
  this.mqttService.publish(`${SCENE_STATE_TOPIC_BASE}/${deviceIp}/scene/state`, {
    currentScene: prev.currentScene,
    targetScene: sceneName,
    status: 'switching',
    generationId: genNext,
    // ... version info ...
  });

  // ... Actually switch the scene (CORRECT method!) ...
  success = await this.sceneManager.switchScene(sceneName, ctx);

  // ... Publish "running" state ...
  this.mqttService.publish(`${SCENE_STATE_TOPIC_BASE}/${deviceIp}/scene/state`, {
    currentScene: st.currentScene,
    generationId: st.generationId,
    status: st.status,
    // ... version info ...
  });

  // ... Render is handled by central device loop (no explicit call needed) ...
}
```

### Files Changed

- `lib/commands/state-command-handler.js`: Complete rewrite (294 lines)
- `daemon.js`: Added `getDevice`, `getDriverForDevice`, `versionInfo` to DI
- `test/lib/command-handlers-basic.test.js`: Updated StateCommandHandler smoke
  tests

### Test Results

- **Before Fix**: System broken, scene switching didn't work
- **After Fix**: 152/152 tests pass
- **Build**: 478, Commit: d8328a6, Timestamp: 2025-10-02T19:45:00Z

---

## TST-302: Proper Integration Tests for Command Handlers

### Problem

Our initial "smoke tests" were **completely inadequate**. They only tested:

- ❌ "Can we instantiate the object?" (useless for catching bugs)
- ❌ "Does calling handle() not crash?" (useless for verifying behavior)

They DID NOT test:

- ❌ Does the full MQTT → Handler → SceneManager flow work?
- ❌ Are scenes actually rendered?
- ❌ Is MQTT state published correctly?

**This is why both bugs made it to production.**

### Solution

Created proper integration tests in
`test/integration/command-handlers-integration.test.js` that verify the **FULL
MQTT flow**:

```text
MQTT message → MqttService → Handler → SceneManager → Scene → Device
```

### New Test Coverage (9 tests added)

**StateCommandHandler**:

1. ✅ Full scene change end-to-end (verifies switchScene called, state
   published)
2. ✅ Reject unknown scene (verifies validation works)
3. ✅ Use default scene when no scene specified (verifies defaults)
4. ✅ Gate animation frames (verifies gating logic)
5. ✅ Clear screen on scene change (verifies screen clearing)

**SceneCommandHandler**:

1. ✅ Set default scene for device (verifies MQTT publish)

**DriverCommandHandler**:

1. ✅ Switch driver and re-render (verifies full driver change flow)

**ResetCommandHandler**:

1. ✅ Perform soft reset (verifies reset called, state published)

**Error Handling**:

1. ✅ Publish error on scene switch failure (verifies error handling)

### Test Results

- **Total Tests**: 152 (143 existing + 9 new)
- **Pass Rate**: 100%
- **Build**: 478, Commit: d8328a6+, Timestamp: 2025-10-02T20:00:00Z

---

## Lessons Learned

### 1. Smoke Tests Are Insufficient

**Problem**: Our "smoke tests" only verified instantiation, not behavior.

**Solution**: Always add integration tests for critical paths. Test the full
flow, not just "does it crash?"

### 2. Refactoring Requires Careful Verification

**Problem**: Extracted code was incomplete (~100 lines missing from
StateCommandHandler).

**Solution**: When extracting logic:

1. Print line count before (`daemon.js` was 447 lines)
2. Print line count after (`daemon.js` is 304 lines)
3. Verify extracted logic (~143 lines) matches the reduction
4. Test the full flow, not just unit tests

### 3. Integration Tests Should Be the Default

**Problem**: We relied on smoke tests for command handlers.

**Solution**: For any class that orchestrates multiple dependencies (like command
handlers), integration tests should be the **default**, not an afterthought.

### 4. Test the MQTT Flow

**Problem**: MQTT routing was broken, but tests passed.

**Solution**: Always test the full MQTT → Handler → Service flow for command
handlers. Don't just test the handler in isolation.

---

## Status

### ✅ All Bugs Fixed

- **BUG-012**: MQTT routing restored
- **BUG-013**: StateCommandHandler complete implementation restored
- **TST-302**: 9 new integration tests added

### ✅ All Tests Passing

- **Total**: 152/152 tests pass
- **Coverage**: Command handlers fully tested
- **Integration**: Full MQTT flow verified

### ✅ Zero Breaking Changes

- All existing MQTT protocol unchanged
- All existing scenes work correctly
- No API changes required

---

## Next Steps

1. ✅ **DONE**: Deploy fixes (commits 420cc64, d8328a6)
2. ✅ **DONE**: Add integration tests (commit d8328a6+)
3. **TODO**: Continue Phase 3 with proper testing
4. **TODO**: Add E2E tests for full daemon startup → MQTT → scene switch flow
5. **TODO**: Document testing best practices in `STANDARDS.md`

---

**Status**: ✅ Resolved and deployed  
**Last Updated**: 2025-10-02  
**Verified By**: Integration tests (152/152 passing)
