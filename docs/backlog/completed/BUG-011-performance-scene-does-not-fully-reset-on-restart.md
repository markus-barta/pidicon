# BUG-011: Performance scene does not fully reset on restart

**Status**: ✅ Complete  
**Priority**: P2  
**Sprint**: Sprint 1  
**Completed**: 2025-11-09

## Issue Description

The performance-test scene's `cleanup()` function was not fully resetting all state variables
used during rendering. This caused issues when restarting the scene, as old state values
(frame counts, metrics, chart positions) would persist between runs.

## Root Cause

The `cleanup()` function in `/scenes/pixoo/dev/performance-test.js` was manually resetting
only a subset of state variables instead of using the `PerformanceTestState.reset()` method,
which properly resets all 15+ state variables used by the scene.

**Missing state resets:**

- `framesRendered`, `startTime`, `minFrametime`, `maxFrametime`
- `sumFrametime`, `samples`, `chartX`, `lastY`, `lastValue`

## Solution

Updated the `cleanup()` function to use `PerformanceTestState.reset()` to ensure all state variables are consistently reset:

```javascript
async function cleanup(context) {
  const { log, getState, setState } = context;
  try {
    // Clear any pending timers
    const loopTimer = getState?.('loopTimer');
    if (loopTimer) {
      clearTimeout(loopTimer);
      setState('loopTimer', null);
    }

    // Reset ALL state variables to ensure clean restart
    const performanceState = new PerformanceTestState(getState, setState);
    performanceState.reset();

    // Reset additional control flags
    setState?.('loopScheduled', false);
    setState?.('inFrame', false);
    setState?.('chartInitialized', false);
    setState?.('hasPrevPoint', false);
    setState?.('testCompleted', true);
    setState?.('config', null);
    setState?.('chartX', CHART_CONFIG.CHART_START_X + 1);
    setState?.('lastY', 0);
    setState?.('lastValue', 0);

    log?.(`🧹 Scene fully cleaned up and reset`, 'debug');
  } catch (e) {
    log?.(`⚠️ Cleanup encountered an issue: ${e?.message}`, 'warning');
  }
}
```

## Testing

Added comprehensive regression tests in `test/lib/scene-controls.test.js`:

1. **Test 1**: Verifies all 15 state variables are reset to their initial values after cleanup
2. **Test 2**: Verifies second run starts from clean slate (not continuing from old state)

**Test Results**: All 533 tests pass (including 2 new BUG-011 regression tests)

## Files Changed

- `/scenes/pixoo/dev/performance-test.js` - Fixed cleanup() function
- `/test/lib/scene-controls.test.js` - Added 2 regression tests

## Verification

- ✅ Unit tests pass (533/533)
- ✅ Regression tests added and passing
- ✅ All state variables properly reset
- ⏳ Production testing pending (requires physical device)
