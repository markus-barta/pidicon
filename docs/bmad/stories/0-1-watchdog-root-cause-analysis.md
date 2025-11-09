# Story: Watchdog Root Cause Analysis & Comprehensive Fix

**Story ID:** 0.1  
**Epic:** Epic 0 - System Stability & Watchdog Reliability  
**Status:** 🔥 IN PROGRESS  
**Priority:** P0 (CRITICAL)  
**Points:** 8  
**Sprint:** Sprint 2 (Nov 12-18)  
**Owner:** Charlie (Senior Dev)  
**Started:** 2025-11-12

---

## Story

As a **system operator**,  
I want **the watchdog to accurately report device health status without false positives**,  
so that **I can trust the system's health monitoring and respond appropriately to real device failures**.

---

## Context

### Problem Statement

During Epic 1 retrospective (2025-11-09), a critical issue was discovered: Device P00 was reported as "offline for 106 minutes" while clearly responsive and interactive in the UI.

**Evidence from Production Logs:**

```
2025-11-09T11:20:51.680970000Z ⚠ [WARN] ⚠  [WATCHDOG] Device P00 • Dev • WZ (192.168.1.159) offline for 106 minutes (checked 638 times)
```

**Screenshot Evidence:** Device P00 shown as responsive in UI at same timestamp.

### Impact

- **User Trust:** False alarms train users to ignore warnings, causing them to miss real failures
- **System Reliability:** Watchdog cannot be trusted as health monitor
- **Blocking Dependency:** Epic 2 Story 2.3 (Watchdog Restart Cooldown) cannot be built on broken foundation
- **Technical Debt:** Building features on unstable watchdog creates cascading bugs

### Root Cause Hypothesis

Based on multiple failed fix attempts:

1. **Shared State:** Watchdog and scene system may share mutable state
2. **Race Conditions:** Device state updates not atomic or thread-safe
3. **Timing Dependencies:** Watchdog tied to scene render loop timing
4. **Insufficient Separation:** Watchdog not truly independent from scene rendering despite previous fixes

### Historical Context

- Multiple previous attempts to fix watchdog independence
- Each attempt believed to have solved the issue
- Issue has persisted or recurred
- No comprehensive test coverage to catch regressions

### Project Lead Mandate

**Markus (Project Lead):** _"We do this the right way. All epics postponed until we fix this properly. Take all the time you need! THIS HAS TO WORK!"_

**Decision:** Comprehensive solution over quick fix. No shortcuts. Proper analysis, thorough testing.

---

## Acceptance Criteria

### AC1: Root Cause Analysis Complete

- [ ] Complete code audit of watchdog implementation (`lib/watchdog.js` and related)
- [ ] Document all interactions between watchdog and scene system
- [ ] Identify all shared state between watchdog and other subsystems
- [ ] Identify race conditions in device state tracking
- [ ] Identify timing dependencies that could cause false positives
- [ ] Review device heartbeat mechanism and failure detection logic
- [ ] Analyze production logs to identify false positive patterns
- [ ] Document findings in comprehensive analysis report
- [ ] Present findings to team for validation

### AC2: Architecture Design for Fix

- [ ] Design truly independent watchdog architecture
- [ ] Define separation of concerns between watchdog and scene system
- [ ] Design atomic device state updates
- [ ] Design watchdog lifecycle independent of scene rendering
- [ ] Create architecture diagram showing new structure
- [ ] Review design with team (Markus, Charlie, Dana)
- [ ] Get architectural approval before implementation

### AC3: Watchdog Independence Implementation

- [ ] Implement watchdog on separate timer/event loop from scene rendering
- [ ] Eliminate all shared mutable state with scene system
- [ ] Implement atomic device state updates (thread-safe)
- [ ] Separate watchdog lifecycle from scene manager lifecycle
- [ ] Watchdog continues operating even if scene system crashes
- [ ] Watchdog state persists across daemon restarts
- [ ] Add watchdog internal health monitoring

### AC4: Race Condition Fixes

- [ ] Fix all identified race conditions in device state tracking
- [ ] Implement proper locking/synchronization where needed
- [ ] Ensure state updates are atomic
- [ ] Add state transition logging for debugging
- [ ] Test concurrent access scenarios

### AC5: Timing Independence

- [ ] Remove all timing dependencies on scene render loop
- [ ] Implement independent watchdog check interval (configurable)
- [ ] Ensure watchdog operates reliably regardless of scene performance
- [ ] Test watchdog with slow scenes, fast scenes, no scenes
- [ ] Verify watchdog timing accuracy

### AC6: Integration Testing

- [ ] Prove watchdog independence with integration tests
- [ ] Test watchdog during active scene rendering
- [ ] Test watchdog with no scenes active
- [ ] Test watchdog during scene crashes
- [ ] Test watchdog during scene slowdowns
- [ ] Test watchdog during rapid scene switching
- [ ] Test watchdog under heavy load (multiple devices)

### AC7: Production Validation

- [ ] Deploy to staging environment
- [ ] Run 24-hour continuous test with no false positives
- [ ] Verify all real offline states detected within 30 seconds
- [ ] Monitor for any false positives or false negatives
- [ ] Performance impact < 1% CPU overhead
- [ ] Deploy to production
- [ ] Monitor for 7 days with no anomalies

### AC8: Documentation & Knowledge Transfer

- [ ] Document new watchdog architecture in `docs/bmad/guides/`
- [ ] Update inline code documentation
- [ ] Document configuration options
- [ ] Create troubleshooting guide for watchdog issues
- [ ] Present findings and solution to team
- [ ] Knowledge transfer session with Dana (QA) for test maintenance

---

## Tasks / Subtasks

### Task 1: Code Audit & Analysis (AC1)

**Duration:** 1-2 days  
**Status:** ✅ Day 1 Complete (2025-11-12)

- [x] 1.1: Read and understand entire `lib/services/watchdog-service.js` implementation
- [x] 1.2: Trace all watchdog interactions with scene rendering
- [x] 1.3: Trace all watchdog interactions with device drivers (Pixoo, AWTRIX)
- [x] 1.4: Identify all device state mutation points (found TWO paths!)
- [x] 1.5: Map data flow: device → health → watchdog → metrics
- [x] 1.6: Document current architecture in analysis report
- [ ] 1.7: Review git history of previous watchdog fixes (TODO Day 2)
- [ ] 1.8: Analyze production logs for false positive patterns (TODO Day 2)
  - Search for "offline" warnings during periods of known activity
  - Calculate false positive rate
  - Identify conditions that trigger false positives
- [x] 1.9: Create comprehensive analysis report document (`docs/bmad/analysis/watchdog-analysis-day1.md`)
- [ ] 1.10: Review findings with Markus and team (Thu mid-sprint check-in)

### Task 2: Root Cause Identification (AC1)

**Duration:** 1 day  
**Status:** ✅ Complete (2025-11-12)

- [x] 2.1: Identify primary root cause of false positives (Dual-path architecture)
- [x] 2.2: Identify secondary contributing factors (State conflicts)
- [x] 2.3: Document specific code locations causing issues (device-adapter.js, watchdog-service.js)
- [x] 2.4: Create reproduction scenario (Health check fails, scene succeeds)
- [x] 2.5: Test hypothesis with targeted experiments (Code analysis)
- [x] 2.6: Validate root cause findings with team (Markus confirmed)
- [x] 2.7: Document root cause in analysis report (watchdog-analysis-day1.md)

### Task 3: Architecture Design (AC2)

**Duration:** 1 day  
**Status:** ✅ Complete (2025-11-13)

- [x] 3.1: Design new watchdog architecture (State separation, single source of truth)
  - Independent watchdog state (watchdog.deviceHealth Map)
  - No shared mutable state (scene metrics ≠ health state)
  - Clear separation of concerns (scene = performance, watchdog = liveness)
- [x] 3.2: Create architecture diagrams (Current vs. New flow)
- [x] 3.3: Define interfaces between watchdog and other components (API contracts)
- [x] 3.4: Design state management approach (WatchdogService.deviceHealth)
- [x] 3.5: Design configuration approach (Keep existing, add health state)
- [x] 3.6: Write architecture design document (watchdog-architecture-design.md - 400+ lines)
- [x] 3.7: Review with Markus, Alice, Bob, Dana (Thu 2 PM - APPROVED)
- [x] 3.8: Incorporate feedback and get approval (Thu 2 PM - UNANIMOUS GO)

### Task 4: Watchdog Independence Implementation (AC3)

**Duration:** 2-3 days  
**Status:** ✅ Phase 1 Complete (Day 4 - Friday)

- [x] 4.1: Create new watchdog state management (`deviceHealth` Map) - Running in parallel
  - Use Node.js `setInterval` or timer-based approach
  - Configurable check interval (default: 10s)
  - Independent of any scene timers
- [ ] 4.2: Refactor device state management
  - Remove shared mutable state
  - Implement immutable state updates
  - Add state versioning/timestamps
- [ ] 4.3: Implement atomic state updates
  - Use appropriate synchronization primitives
  - Ensure thread-safety (if applicable)
  - Test concurrent access
- [ ] 4.4: Separate watchdog lifecycle from scene manager
  - Watchdog starts before scene manager
  - Watchdog continues if scene manager crashes
  - Watchdog cleanup independent
- [ ] 4.5: Add watchdog internal health monitoring
  - Self-check mechanism
  - Log watchdog loop iterations
  - Detect if watchdog itself is stuck
- [ ] 4.6: Implement watchdog state persistence
  - Save state across daemon restarts
  - Restore gracefully on startup
  - Handle corrupted state files

### Task 5: Race Condition & Timing Fixes (AC4, AC5)

**Duration:** 1-2 days

- [ ] 5.1: Fix identified race conditions
  - Add proper locking/synchronization
  - Implement atomic operations
  - Test concurrent scenarios
- [ ] 5.2: Remove timing dependencies on scene render loop
  - Watchdog timing independent of scene FPS
  - Watchdog unaffected by scene performance
  - Test with various scene loads
- [ ] 5.3: Add state transition logging
  - Log every device state change
  - Include timestamps and triggering events
  - Configurable log level
- [ ] 5.4: Test edge cases
  - Device connects during watchdog check
  - Device disconnects during scene render
  - Multiple state changes in quick succession
  - Network latency scenarios

### Task 6: Configuration & Tuning (AC5)

**Duration:** 0.5 days

- [ ] 6.1: Make watchdog check interval configurable
  - Add to daemon configuration
  - Default: 10 seconds
  - Minimum: 5 seconds, Maximum: 60 seconds
- [ ] 6.2: Make offline threshold configurable
  - Default: 30 seconds
  - Per-device override capability
- [ ] 6.3: Add watchdog debug mode
  - Verbose logging of all checks
  - State transition details
  - Performance metrics
- [ ] 6.4: Document all configuration options

### Task 7: Integration Testing (AC6)

**Duration:** 1-2 days

- [ ] 7.1: Write integration test: watchdog + active scenes
  - Verify watchdog operates during scene rendering
  - Verify accurate state reporting
  - Verify no false positives
- [ ] 7.2: Write integration test: watchdog + no scenes
  - Verify watchdog continues without scenes
  - Verify state tracking accurate
- [ ] 7.3: Write integration test: watchdog + scene crash
  - Simulate scene crash
  - Verify watchdog unaffected
  - Verify state tracking continues
- [ ] 7.4: Write integration test: watchdog + slow scenes
  - Simulate slow scene rendering (>5s)
  - Verify watchdog unaffected
  - Verify accurate offline detection
- [ ] 7.5: Write integration test: watchdog + rapid scene switching
  - Switch scenes every 1 second
  - Verify watchdog stability
  - Verify no false positives
- [ ] 7.6: Write integration test: watchdog + heavy load
  - 10+ devices simultaneously
  - Multiple scenes active
  - Verify performance and accuracy
- [ ] 7.7: Run all integration tests in CI/CD
- [ ] 7.8: Fix any failures discovered

### Task 8: Performance Testing (AC7)

**Duration:** 1 day

- [ ] 8.1: Measure watchdog CPU overhead
  - Baseline without watchdog
  - With watchdog active
  - Target: < 1% CPU
- [ ] 8.2: Measure watchdog memory usage
  - Monitor for memory leaks
  - Long-running stability test (24+ hours)
- [ ] 8.3: Test watchdog timing accuracy
  - Measure actual check intervals
  - Verify within acceptable tolerance
- [ ] 8.4: Profile hotspots if performance issues found
- [ ] 8.5: Optimize if needed

### Task 9: Production Validation (AC7)

**Duration:** 8+ days (includes monitoring)

- [ ] 9.1: Deploy to staging environment
- [ ] 9.2: Run 24-hour continuous test
  - Monitor logs for false positives
  - Monitor logs for false negatives
  - Verify all real failures detected
- [ ] 9.3: Analyze staging results
  - Review all watchdog events
  - Confirm zero false positives
  - Confirm all true failures caught
- [ ] 9.4: Deploy to production
- [ ] 9.5: Monitor production for 7 days
  - Daily log review
  - Track false positive rate (target: 0%)
  - Track false negative rate (target: 0%)
  - Performance monitoring
- [ ] 9.6: Create monitoring dashboard for watchdog health

### Task 10: Documentation & Knowledge Transfer (AC8)

**Duration:** 1 day

- [ ] 10.1: Write architecture documentation
  - New watchdog design
  - Component interactions
  - State management approach
  - Configuration options
- [ ] 10.2: Update inline code documentation
  - JSDoc comments for all functions
  - Complex logic explained
  - Configuration parameters documented
- [ ] 10.3: Create troubleshooting guide
  - Common issues and solutions
  - Log interpretation guide
  - Debugging techniques
- [ ] 10.4: Update developer guides
  - How to work with watchdog
  - How to avoid breaking independence
  - Testing best practices
- [ ] 10.5: Present findings to team
  - Root cause analysis
  - Solution approach
  - Lessons learned
- [ ] 10.6: Knowledge transfer with Dana
  - Test maintenance
  - Regression prevention
  - Future enhancements

---

## Dev Notes

### Current Watchdog Implementation

**Files to Audit:**

- `lib/watchdog.js` - Main watchdog implementation
- `lib/scene-manager.js` - Scene lifecycle management
- `lib/device-driver.js` - Device communication
- `lib/device-adapter.js` - Device abstraction
- `lib/state-store.js` - State persistence

**Known Issues from Previous Fixes:**

- Previous attempts focused on timing adjustments
- May not have addressed fundamental architecture issues
- Lack of test coverage allowed regressions

### Architecture Principles

**Independence Requirements:**

1. Watchdog must operate on separate event loop
2. Zero shared mutable state with scene system
3. Device state updates atomic and immutable
4. Watchdog lifecycle independent of scene manager
5. Watchdog resilient to scene system failures

**State Management:**

- Device state should be immutable
- State transitions through pure functions
- Version/timestamp every state change
- Atomic updates with proper synchronization

**Testing Strategy:**

- Integration tests prove independence
- Long-running tests catch timing issues
- Load tests validate performance
- Production monitoring validates reliability

### Risks & Mitigations

| Risk                                        | Impact | Mitigation                                         |
| ------------------------------------------- | ------ | -------------------------------------------------- |
| Root cause deeper than expected             | High   | 8 point estimate with buffer, can extend if needed |
| Fix requires major architecture refactoring | High   | Allocated sufficient points, team prepared         |
| Tests don't catch all edge cases            | Medium | Long-running validation (24h + 7 days production)  |
| Performance impact unacceptable             | Medium | Performance testing with < 1% CPU target           |
| Breaks existing functionality               | High   | 522+ existing tests catch regressions              |

### Success Metrics

**Binary Metrics:**

- Zero false positives in 24-hour staging test
- Zero false negatives (all real failures detected within 30s)
- All 522+ existing tests still passing
- New integration tests passing

**Production Validation:**

- 7 days continuous operation with no anomalies
- No false positive reports from users
- All real device failures detected and reported
- Performance impact < 1% CPU

### Configuration Example

```javascript
// daemon.json
{
  "watchdog": {
    "enabled": true,
    "checkIntervalSeconds": 10,
    "offlineThresholdSeconds": 30,
    "debugMode": false,
    "logLevel": "info",
    "selfCheckEnabled": true
  }
}
```

### References

- **Epic 0:** [docs/bmad/epics/epic-0-system-stability.md](../epics/epic-0-system-stability.md)
- **Retrospective:** [docs/bmad/retrospectives/epic-1-retro-2025-11-09.md](../retrospectives/epic-1-retro-2025-11-09.md)
- **Current Watchdog:** `lib/watchdog.js`
- **Scene Manager:** `lib/scene-manager.js`
- **Device Driver:** `lib/device-driver.js`

---

## Definition of Done

- [ ] Root cause identified and documented
- [ ] Architecture design approved by team
- [ ] All acceptance criteria met
- [ ] Watchdog operates independently from scene rendering (proven by tests)
- [ ] Zero false positives in 24-hour staging test
- [ ] Zero false negatives (all real failures detected)
- [ ] Performance impact < 1% CPU
- [ ] All integration tests passing
- [ ] All 522+ existing tests still passing
- [ ] 7 days production stability with no anomalies
- [ ] Documentation comprehensive and reviewed
- [ ] Knowledge transfer complete with Dana (QA)
- [ ] Code review complete
- [ ] Deployed to production

---

## Dev Agent Record

### Context Reference

<!-- Story context will be added when story moves to ready-for-dev -->

### Implementation Owner

**Charlie (Senior Dev)** - Personally owning this fix to ensure comprehensive solution

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent during implementation -->

### Completion Notes

<!-- To be filled by dev agent after implementation -->

### File List

<!-- To be filled by dev agent - format:
- MODIFIED: lib/watchdog.js - Complete refactor for independence
- MODIFIED: lib/device-driver.js - Atomic state updates
- NEW: test/integration/watchdog-independence.test.js - Integration tests
- NEW: docs/bmad/guides/WATCHDOG_ARCHITECTURE.md - Architecture documentation
-->

---

## Change Log

| Date       | Author  | Change                                                                             |
| ---------- | ------- | ---------------------------------------------------------------------------------- |
| 2025-11-11 | Bob/SM  | Initial story creation (comprehensive draft)                                       |
| 2025-11-11 | Bob/SM  | Added detailed tasks based on root cause needs                                     |
| 2025-11-11 | Bob/SM  | Story review complete, marked ready-for-dev                                        |
| 2025-11-11 | Bob/SM  | Confirmed Charlie as owner, staging ready                                          |
| 2025-11-12 | Bob/SM  | Sprint 2 kickoff, moved to IN PROGRESS                                             |
| 2025-11-12 | Charlie | Started: Code Audit & Analysis phase                                               |
| 2025-11-12 | Charlie | Day 1 complete: Code audit done, hypothesis forming (60% confidence)               |
| 2025-11-12 | Charlie | Analysis report created: `docs/bmad/analysis/watchdog-analysis-day1.md`            |
| 2025-11-12 | Markus  | Confirmed root cause: Dual-path architecture is the problem                        |
| 2025-11-12 | Markus  | Direction: Health check completely independent, single path (85% confidence)       |
| 2025-11-12 | Markus  | Clarified: Watchdog = SINGLE source of truth for "last seen", scene = pure metrics |
| 2025-11-13 | Charlie | Day 2 complete: Architecture design finished (watchdog-architecture-design.md)     |
| 2025-11-13 | Charlie | Tasks 1-3 complete: Code audit, root cause, architecture design (90% confidence)   |
| 2025-11-14 | Team    | Mid-sprint check-in: Architecture approved unanimously, GO for implementation      |
| 2025-11-14 | Charlie | Days 1-3 complete, ready for implementation (Fri-Mon)                              |
| 2025-11-15 | Charlie | Phase 1 complete: deviceHealth state live, 547 tests pass, +411 LOC                |
| 2025-11-15 | Charlie | Day 4 complete: New state running in parallel, zero regressions ✅                 |

---

## Notes

### Why This Story Matters

This is the **highest priority story in Epic 0** and potentially the entire project. The watchdog is fundamental to system reliability. False positives undermine user trust and mask real failures.

### Comprehensive Approach Required

This story has 8 points because we're not doing a quick fix. We're:

1. Understanding the complete problem
2. Designing the right solution
3. Implementing thoroughly
4. Testing comprehensively
5. Validating in production

### No Shortcuts

**Project Lead Mandate:** _"Do this the right way. Take all the time you need. THIS HAS TO WORK!"_

This story may extend beyond 8 points if root cause is deeper than expected. **That's okay.** Getting it right is more important than hitting estimates.

---

**Story Status:** 🔥 IN PROGRESS (Started: 2025-11-12)  
**Owner:** Charlie (Senior Dev)  
**Current Phase:** Implementation - Phase 1 Complete ✅ (Day 4/7)  
**Root Cause:** Dual-path architecture identified (90% confidence)  
**Architecture:** Approved unanimously by team (Thu 2 PM)  
**Phase 1:** New deviceHealth state live, 547 tests pass ✅  
**Next:** Phase 2-4 (Sat-Mon), Sprint Review (Mon 3 PM)  
**Dependencies:** None (first story in Epic 0)  
**Infrastructure:** Staging environment ready ✅
