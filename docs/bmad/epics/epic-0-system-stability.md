# Epic 0: System Stability & Watchdog Reliability

**Status:** Current Priority  
**Target Version:** v3.3 (Stability Release)  
**Priority:** P0 (CRITICAL)  
**Owner:** mba  
**Started:** 2025-11-09  
**Target Completion:** 2025-11-23 (2 sprints)

---

## Epic Overview

**CRITICAL PRIORITY:** All planned epics (Epic 2-5) postponed until this stability work is complete.

Fix critical watchdog false positives and implement three-tier device state communication. This epic addresses fundamental reliability issues discovered during Epic 1 retrospective that undermine system trust and user experience.

### Business Value

- **System Reliability:** Accurate device health monitoring is foundation for user trust
- **User Experience:** Clear state communication (responsive/degraded/unresponsive) enables informed decisions
- **Technical Foundation:** Stable watchdog required for all future observability features
- **Debt Prevention:** Fixing now prevents cascading bugs and technical debt

### Problem Statement

**Issue Discovered:** Device P00 reported as "offline for 106 minutes" while clearly responsive and interactive in UI.

**Evidence:**

```
2025-11-09T11:20:51.680970000Z ⚠ [WARN] ⚠  [WATCHDOG] Device P00 • Dev • WZ (192.168.1.159) offline for 106 minutes (checked 638 times)
```

**Impact:**

- Watchdog cannot be trusted as health monitor
- False alarms train users to ignore warnings, missing real failures
- Binary responsive/unresponsive doesn't show degraded states
- Multiple previous fix attempts have failed

**Root Cause Hypothesis:**

- Watchdog not truly independent from scene rendering despite previous fixes
- Race conditions or timing dependencies in device state tracking
- Insufficient test coverage prevented detection of false positives

### Success Criteria

- [ ] Watchdog reports accurate device state (zero false positives/negatives)
- [ ] Watchdog operates independently from scene rendering (proven by tests)
- [ ] Users can distinguish between responsive, degraded, and unresponsive device states
- [ ] System runs stable for 7 days in production with no watchdog anomalies
- [ ] Comprehensive test suite prevents regression
- [ ] All tests passing (522+ tests maintained + new stability tests)

---

## Stories

### Story 0.1: Watchdog Root Cause Analysis & Comprehensive Fix (BUG-CRITICAL-001)

**Status:** Pending  
**Priority:** P0  
**Points:** 8  
**Sprint:** Sprint 2

**Description:**
Conduct comprehensive audit of watchdog implementation to identify and fix root cause of false positive device offline reports. Implement truly independent watchdog mechanism that operates reliably regardless of scene rendering state.

**Acceptance Criteria:**

**Phase 1: Root Cause Analysis**

- [ ] Complete audit of watchdog implementation code
- [ ] Document all interactions between watchdog and scene system
- [ ] Identify race conditions in device state tracking
- [ ] Identify timing dependencies that could cause false positives
- [ ] Review device heartbeat mechanism
- [ ] Analyze logs from production showing false positive pattern

**Phase 2: Comprehensive Fix Implementation**

- [ ] Implement truly independent watchdog mechanism
- [ ] Separate watchdog lifecycle from scene rendering lifecycle
- [ ] Fix identified race conditions
- [ ] Eliminate timing dependencies
- [ ] Improve device state tracking accuracy
- [ ] Add watchdog internal health monitoring

**Phase 3: Verification**

- [ ] Prove watchdog independence with integration tests
- [ ] Verify no false positives over 24-hour continuous run
- [ ] Verify all real offline states detected within 30 seconds
- [ ] Performance impact minimal (< 1% CPU overhead)

**Definition of Done:**

- [ ] Root cause identified and documented
- [ ] Fix implemented and deployed
- [ ] Watchdog operates independently from scene rendering
- [ ] Zero false positives in 24-hour production test
- [ ] Zero false negatives (all real failures detected)
- [ ] Integration tests passing
- [ ] Documentation updated with architecture changes
- [ ] Code review complete

---

### Story 0.2: Three-Tier Device State Indicator (UI-CRITICAL-001)

**Status:** Pending  
**Priority:** P0  
**Points:** 5  
**Sprint:** Sprint 2

**Description:**
Replace binary responsive/unresponsive indicator with three-tier state communication system that shows nuanced device health. Enable users to distinguish between "working fine", "degraded performance", and "completely offline".

**Acceptance Criteria:**

**Phase 1: State Definition & Thresholds**

- [ ] Define three device states:
  - **Responsive:** 0-5s response time (green, animated heartbeat)
  - **Degraded:** 5-10s response time (yellow/amber, animated pulse)
  - **Unresponsive:** 30s+ no response (red X, static, no animation)
- [ ] Document state transition logic
- [ ] Define threshold configuration (tunable per deployment)

**Phase 2: Backend State Tracking**

- [ ] Implement response time tracking per device
- [ ] Calculate rolling average response time (last 5 interactions)
- [ ] Implement state transition logic with hysteresis (prevent flapping)
- [ ] Add state change event emissions
- [ ] WebSocket updates for state changes

**Phase 3: UI Implementation**

- [ ] Update device card to show three states visually
- [ ] Implement green animated heartbeat for responsive
- [ ] Implement yellow/amber animated pulse for degraded
- [ ] Implement red static X for unresponsive
- [ ] Add tooltip showing response time and state duration
- [ ] Add state history visualization (last 10 state changes)

**Phase 4: User Feedback**

- [ ] Optional notification when device transitions to degraded
- [ ] Alert when device transitions to unresponsive
- [ ] Clear state indicator in device list view
- [ ] Visual distinction between all three states at a glance

**Definition of Done:**

- [ ] Three-tier state system implemented
- [ ] UI shows all three states visually distinct
- [ ] State transitions tracked and logged
- [ ] Response time displayed in UI
- [ ] E2E tests covering all state transitions
- [ ] Manual testing on physical devices confirms accuracy
- [ ] Documentation updated with new state system
- [ ] Deployed to production

---

### Story 0.3: Stability Test Suite (TST-CRITICAL-001)

**Status:** Pending  
**Priority:** P0  
**Points:** 5  
**Sprint:** Sprint 2

**Description:**
Build comprehensive test infrastructure to prove watchdog reliability and prevent regression. Create gold standard stability test suite that validates watchdog independence, state accuracy, and system resilience under various conditions.

**Acceptance Criteria:**

**Phase 1: Watchdog Independence Tests**

- [ ] Test watchdog continues operating during scene rendering
- [ ] Test watchdog operates correctly with no scenes active
- [ ] Test watchdog unaffected by scene crashes
- [ ] Test watchdog unaffected by scene slowdowns
- [ ] Test watchdog accuracy during heavy scene load
- [ ] Test watchdog during rapid scene switching

**Phase 2: State Transition Tests**

- [ ] Test responsive → degraded transition (5s threshold)
- [ ] Test degraded → unresponsive transition (10s threshold)
- [ ] Test unresponsive → responsive recovery
- [ ] Test state hysteresis (prevent flapping on threshold boundary)
- [ ] Test state transitions logged correctly
- [ ] Test WebSocket notifications for state changes

**Phase 3: False Positive/Negative Detection**

- [ ] Test no false positives (device online but reported offline)
- [ ] Test no false negatives (device offline but reported online)
- [ ] Test detection of actual device failures within 30s
- [ ] Test recovery detection when device comes back online
- [ ] Test partial failures (device responsive but degraded)

**Phase 4: Performance & Load Tests**

- [ ] Test watchdog performance with 1 device
- [ ] Test watchdog performance with 10 devices
- [ ] Test watchdog performance with 50 devices
- [ ] Test watchdog CPU overhead (< 1% target)
- [ ] Test watchdog memory stability (no leaks)
- [ ] Test long-running stability (24+ hours)

**Phase 5: Integration Tests**

- [ ] Test watchdog + scene system integration
- [ ] Test watchdog + WebSocket notification integration
- [ ] Test watchdog + UI state display integration
- [ ] Test watchdog + device driver integration
- [ ] Test watchdog during daemon restart
- [ ] Test watchdog state persistence

**Definition of Done:**

- [ ] All test phases implemented
- [ ] Test suite passes on CI/CD
- [ ] Coverage >= 90% for watchdog module
- [ ] Performance tests within targets
- [ ] No false positives/negatives in 24-hour run
- [ ] Test documentation comprehensive
- [ ] Tests integrated into regression suite
- [ ] Code review complete

---

## Epic Definition of Done

- [ ] All 3 stories completed (0/3)
- [ ] All acceptance criteria met
- [ ] Watchdog accurate (zero false positives/negatives)
- [ ] Three-tier state system operational
- [ ] Comprehensive test suite passing
- [ ] System stable for 7 days in production
- [ ] All tests passing (522+ existing + new stability tests)
- [ ] Documentation comprehensive
- [ ] Deployed to production
- [ ] Epic retrospective completed

---

## Dependencies

**External Dependencies:**

- Production environment for 7-day stability validation
- Physical devices for state transition testing

**Internal Dependencies:**

- Device driver infrastructure (existing)
- WebSocket notification system (existing)
- Scene system (must continue operating normally)

**Blocking:**

- **Epic 2 (Configuration & Observability)** - Story 2.3 depends on reliable watchdog
- **Epic 3-5** - All postponed until stability proven

---

## Risks & Mitigations

| Risk                               | Impact | Probability | Mitigation                                                |
| ---------------------------------- | ------ | ----------- | --------------------------------------------------------- |
| Root cause deeper than expected    | High   | Medium      | Allocated 8 points, can extend if needed                  |
| Fix breaks existing functionality  | High   | Low         | Comprehensive test suite (522+ tests) catches regressions |
| State thresholds need tuning       | Medium | Medium      | Make thresholds configurable, test multiple values        |
| False positives persist after fix  | High   | Low         | 24-hour validation before declaring done                  |
| Performance impact from monitoring | Medium | Low         | Performance tests with < 1% CPU target                    |

---

## Technical Context

### Current Watchdog Issues

**Observed Symptoms:**

- Device P00 reported offline while actively rendering scenes
- Multiple previous fix attempts have failed
- False alarm frequency: Unknown (needs analysis)

**Previous Fix Attempts:**

- Multiple attempts to separate watchdog from scene rendering
- Each attempt thought to have solved the issue
- Issue has persisted or recurred

**Suspected Root Causes:**

1. Shared state between watchdog and scene manager
2. Race conditions in device state updates
3. Timing dependencies on scene render loop
4. Inadequate separation of concerns

### Architecture Goals

**Watchdog Independence:**

- Watchdog runs on separate timer/event loop from scene rendering
- No shared mutable state with scene system
- Device state updates atomic and thread-safe
- Watchdog continues operating even if scene system crashes

**State Tracking:**

- Response time tracking per device
- Rolling average over recent interactions
- State transitions with hysteresis to prevent flapping
- Historical state data for debugging

**Testing Strategy:**

- Integration tests prove independence
- Long-running tests catch timing issues
- Load tests validate performance
- Continuous monitoring in production

---

## Notes

### Priority Rationale

This epic received P0 (CRITICAL) priority during Epic 1 retrospective because:

1. **System Trust:** False watchdog alarms undermine entire system reliability
2. **User Experience:** Users need accurate health information to make decisions
3. **Blocking Dependencies:** Epic 2 Story 2.3 cannot be built on broken watchdog
4. **Multiple Failed Fixes:** Quick fixes haven't worked - need comprehensive solution
5. **Technical Debt:** Building more features on broken foundation creates cascading bugs

### Project Lead Mandate

**Markus (Project Lead):** _"We do this the right way. All epics postponed until we fix this properly. Take all the time you need! THIS HAS TO WORK!"_

**Decision:** Stability over features. No shortcuts. Comprehensive solution.

### Sprint Planning

- **Total Points:** 18 SP (8 + 5 + 5)
- **Duration:** 2 sprints (Sprint 2-3)
- **Focus:** Quality over speed, comprehensive over quick
- **Buffer:** Extra time allocated if root cause deeper than expected

### Success Metrics

**Binary Success Criteria:**

- Zero false positives in 24-hour production run
- Zero false negatives (all real failures detected)
- All 522+ existing tests still passing
- New stability test suite passing

**Production Validation:**

- 7 days continuous operation
- No watchdog anomalies
- State transitions accurate
- User feedback positive

---

## References

- **Retrospective:** [docs/bmad/retrospectives/epic-1-retro-2025-11-09.md](../retrospectives/epic-1-retro-2025-11-09.md)
- **Sprint Status:** [docs/bmad/sprint-status.yaml](../sprint-status.yaml)
- **Watchdog Code:** `lib/watchdog.js` (to be audited)
- **Device Driver:** `lib/device-driver.js`
- **Scene Manager:** `lib/scene-manager.js`

---

**Epic Status:** 🚀 Current Priority  
**Created:** 2025-11-09 (during Epic 1 retrospective)  
**Justification:** Critical stability issue discovered  
**Roadmap Impact:** Epic 2-5 postponed until complete

_"Stability first. Do it right."_
