# State Persistence Issue - Investigation & Testing

**Issue:** Device on/off state not properly persisted across daemon restarts  
**Status:** ✅ Tests added, coverage verified  
**Date:** 2025-11-09

---

## Investigation Summary

After reviewing the state persistence code, we found that **the persistence is actually working correctly**:

1. ✅ `displayOn` state IS being saved (line 808-809 in `state-store.js`)
2. ✅ `displayOn` state IS being restored (line 774-833 in `state-store.js`)
3. ✅ `displayOn` state IS being rehydrated (line 496-498 in `device-service.js`)
4. ✅ Daemon startup DOES call `rehydrateFromState` (line 420-423 in `daemon.js`)

## Test Coverage Added

### New Test File: `test/integration/daemon-restart-state.test.js`

**6 comprehensive tests** covering daemon restart scenarios:

1. ✅ **displayOn=false persistence** - Verifies OFF state survives restart
2. ✅ **displayOn=true persistence** - Verifies ON state survives restart
3. ✅ **Multi-device state** - Two devices with different states
4. ✅ **Full restart flow** - Complete snapshot → restore → rehydrate cycle
5. ✅ **Brightness persistence** - Verifies brightness survives restart
6. ✅ **Combined state** - All state (displayOn, brightness, scene, playState) together

### Test Results

```
✅ All 539 tests passing (including 6 new daemon restart tests)
   - 533 existing tests
   - 6 new state persistence tests
```

---

## How State Persistence Works

### Phase 1: State Changes (Runtime)

```javascript
// User turns off display
await deviceService.setDisplayPower(deviceIp, false);
// → StateStore.setDeviceState(deviceIp, 'displayOn', false)
// → Marks state as dirty
// → Schedules debounced persist (10 seconds)
```

### Phase 2: Persistence (Automatic or Shutdown)

```javascript
// Automatic (10s after last change) OR on SIGTERM/SIGINT
await stateStore.persist();
// → Writes to /data/runtime-state.json
// → Saves: displayOn, brightness, activeScene, playState, loggingLevel
```

### Phase 3: Daemon Restart

```javascript
// 1. StateStore restores from disk
await stateStore.restore();
// → Loads /data/runtime-state.json
// → Populates StateStore with saved values

// 2. Daemon gets snapshot
const snapshot = stateStore.getSnapshot();
const persistedDeviceState = snapshot.devices[ip];

// 3. Daemon rehydrates each device
await deviceService.rehydrateFromState(ip, persistedDeviceState);
// → Calls setDisplayPower(ip, persistedDeviceState.displayOn)
// → Applies state to physical hardware
```

---

## Potential Issues (If Still Occurring)

If the issue still persists in production, here are likely causes:

### 1. Debounce Delay

**Issue:** State changes might not be saved if daemon restarts before 10-second debounce completes.

**Solution:** State is flushed on SIGTERM/SIGINT, so graceful shutdowns should work. If daemon crashes or is killed with SIGKILL, last <10s of changes could be lost.

**Mitigation:**

- Daemon already flushes on SIGTERM/SIGINT
- Consider reducing debounce from 10s to 5s for more frequent saves
- Add manual flush on critical state changes (display power toggle)

### 2. File System Issues

**Issue:** `/data/runtime-state.json` might not be writable or readable.

**Check:**

```bash
# Check if file exists
ls -la /data/runtime-state.json

# Check permissions
# Should be owned by daemon user with rw permissions

# Check recent state
cat /data/runtime-state.json | jq
```

### 3. Multiple Daemon Instances

**Issue:** If multiple daemon instances run, they could overwrite each other's state.

**Check:**

```bash
ps aux | grep daemon.js
# Should only show one instance
```

### 4. State Not Being Set

**Issue:** The UI might be bypassing `deviceService.setDisplayPower()`.

**Verification:** Check logs when toggling display power - should see state changes logged.

---

## Files Involved

| File                                            | Purpose                               |
| ----------------------------------------------- | ------------------------------------- |
| `lib/state-store.js`                            | Core state persistence (save/restore) |
| `lib/services/device-service.js`                | Device operations (setDisplayPower)   |
| `daemon.js`                                     | Daemon startup and rehydration        |
| `test/lib/state-persistence.test.js`            | Existing persistence tests            |
| `test/integration/daemon-restart-state.test.js` | **NEW: Daemon restart tests**         |

---

## Recommendations

### Immediate Actions

1. ✅ **Tests Added** - Comprehensive daemon restart tests now in place
2. 📝 **Verify in Production** - Check if issue still occurs after understanding the flow
3. 📊 **Add Logging** - Enhance logging around state persistence if needed

### If Issue Persists

1. **Add Debug Logging**

   ```javascript
   // In device-service.js setDisplayPower()
   this.logger.info(`[STATE] Setting displayOn=${on} for ${deviceIp}`);

   // In state-store.js persist()
   this.logger.info('[STATE] Persisting state:', JSON.stringify(data));

   // In daemon.js rehydrateFromState()
   logger.info('[STATE] Rehydrating device:', ip, persistedDeviceState);
   ```

2. **Reduce Debounce** (in daemon.js)

   ```javascript
   stateStore = new StateStore({
     logger,
     persistPath: '/data/runtime-state.json',
     debounceMs: 5000, // 5 seconds instead of 10
   });
   ```

3. **Add Manual Flush** (optional, for critical operations)
   ```javascript
   // In device-service.js setDisplayPower()
   await this.stateStore.flush(); // Immediate persistence
   ```

---

## Conclusion

The state persistence code is **working as designed** and has comprehensive test coverage. All 6 new daemon restart tests pass, verifying:

- ✅ `displayOn` state survives restarts
- ✅ Brightness state survives restarts
- ✅ Multi-device state is independent
- ✅ Full restart flow works correctly

If the issue persists in production:

1. Check logs for state persistence messages
2. Verify `/data/runtime-state.json` exists and is readable
3. Ensure graceful daemon shutdowns (not SIGKILL)
4. Consider reducing debounce interval if rapid restarts are common

---

**Test Coverage:** 539/539 tests passing ✅  
**New Tests:** 6 daemon restart state tests  
**Files Modified:** 1 new test file  
**Production Impact:** None (tests only)
