# BUG-020: Stop + Play Scene Restart (P0) ✅

**Status**: completed (Build 603) | **Priority**: P0 (Critical - UX blocker)
**Effort**: 4-6 hours | **Risk**: Medium

## Problem

After pressing Stop, then Play, the scene sometimes shows only dark screen instead of restarting properly.
The issue is intermittent and related to scene state management during stop→play transitions.
**Analysis Needed**:

1. Verify cleanup is completing before init
2. Check generationId increments properly
3. Ensure devicePlayState transitions correctly
4. Validate scene state reset on stop
   **Implementation Plan**:
5. Add comprehensive logging to track stop→play flow (IN PROGRESS)
6. Identify exact failure point from logs
7. Fix state transition race condition
8. Add integration test for stop→play→restart cycle
9. Verify with multiple scene types (static, animated, data)
   **Acceptance Criteria**:

- [ ] Stop + Play reliably restarts scene (100% success rate)
- [ ] Scene initializes fully (not dark screen)
- [ ] Behavior identical to Restart button
- [ ] Works across all scene types
- [ ] No race conditions in state transitions
      **Test Plan** (TEST-BUG-stop-play):

1. Select animated scene (e.g., performance-test)
2. Let it run for 5 seconds
3. Press Stop → verify screen clears
4. Press Play → verify scene restarts from beginning
5. Repeat 20 times → should succeed every time
6. Test with static scenes (startup, fill)
7. Test with data scenes (power_price, advanced_chart)
