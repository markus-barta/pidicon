# Story: Stability Test Suite

**Story ID:** 0.3  
**Epic:** Epic 0 - System Stability & Watchdog Reliability  
**Status:** Ready for Dev (Sequential - after 0.1 & 0.2)  
**Priority:** P0 (CRITICAL)  
**Points:** 5  
**Sprint:** Sprint 3 (Nov 19-23)  
**Owners:** Bob (SM) + Dana (QA) - Collaboration story

---

## Story

As a **development team**,  
I want **comprehensive test infrastructure that proves watchdog reliability and prevents regression**,  
so that **we can be confident the stability fixes work and will continue working over time**.

---

## Context

### Problem Statement

Previous watchdog fixes appeared to work but regressed because:

- Insufficient test coverage
- No tests for watchdog independence
- No long-running stability tests
- No tests for false positive/negative detection
- No performance tests under load

### Solution Approach

Build **gold standard stability test suite** that:

1. Proves watchdog operates independently from scene rendering
2. Detects false positives and false negatives
3. Validates performance under various loads
4. Prevents regression through comprehensive coverage
5. Provides confidence for production deployment

### Success Criteria

- Comprehensive test coverage proving watchdog reliability
- All tests pass consistently (no flakiness)
- Tests catch regressions if watchdog independence breaks
- Performance tests validate < 1% CPU overhead
- Long-running tests prove 24+ hour stability

---

## Acceptance Criteria

### AC1: Watchdog Independence Tests

**Goal:** Prove watchdog operates correctly regardless of scene system state

- [ ] Test: Watchdog continues during active scene rendering
  - Start scene rendering
  - Verify watchdog checks continue on schedule
  - Verify accurate device state reporting
  - Verify watchdog timing unaffected by scene FPS

- [ ] Test: Watchdog operates with no scenes active
  - Stop all scenes
  - Verify watchdog continues running
  - Verify device state tracking accurate
  - Verify no errors or crashes

- [ ] Test: Watchdog unaffected by scene crashes
  - Simulate scene crash (throw error)
  - Verify watchdog continues operating
  - Verify watchdog detects scene failure
  - Verify device monitoring unaffected

- [ ] Test: Watchdog unaffected by scene slowdowns
  - Create intentionally slow scene (5s+ render)
  - Verify watchdog checks remain on schedule
  - Verify watchdog timing independent of scene performance
  - Verify no missed checks

- [ ] Test: Watchdog during rapid scene switching
  - Switch scenes every 1 second
  - Verify watchdog stability
  - Verify no false positives
  - Verify state tracking accurate

- [ ] Test: Watchdog lifecycle independent of scene manager
  - Start watchdog before scene manager
  - Stop scene manager while watchdog running
  - Restart scene manager
  - Verify watchdog unaffected throughout

### AC2: State Transition Tests

**Goal:** Validate device state calculation and transition logic

- [ ] Test: Responsive → Degraded transition (5s threshold)
  - Device response time crosses 5s threshold
  - Verify state changes to degraded after hysteresis
  - Verify WebSocket event emitted
  - Verify UI updates

- [ ] Test: Degraded → Unresponsive transition (10s threshold)
  - Device response time crosses 10s threshold
  - Verify state changes to unresponsive after hysteresis
  - Verify alert triggered
  - Verify UI updates

- [ ] Test: Unresponsive → Responsive recovery
  - Device comes back online with good response time
  - Verify state returns to responsive
  - Verify recovery notification
  - Verify state history updated

- [ ] Test: State hysteresis (prevent flapping)
  - Response time oscillates around threshold
  - Verify state doesn't flap rapidly
  - Verify hysteresis count enforced
  - Verify state remains stable

- [ ] Test: State transitions logged correctly
  - Trigger multiple state transitions
  - Verify all transitions logged with timestamps
  - Verify log contains old state, new state, response time
  - Verify log format parseable

- [ ] Test: WebSocket notifications for state changes
  - Subscribe to state change events
  - Trigger state transitions
  - Verify events received for each transition
  - Verify event payload structure correct

### AC3: False Positive/Negative Detection Tests

**Goal:** Ensure watchdog accurately reflects device health

- [ ] Test: No false positives (device online but reported offline)
  - Device responding normally
  - Verify watchdog reports responsive
  - Run for 1 hour, verify no false offline reports
  - **THIS IS THE CRITICAL TEST** - must pass

- [ ] Test: No false negatives (device offline but reported online)
  - Disconnect device completely
  - Verify watchdog detects offline within 30 seconds
  - Verify state changes to unresponsive
  - Verify alert triggered

- [ ] Test: Detection of actual device failures
  - Simulate network disconnect
  - Simulate device power off
  - Simulate device unresponsive (timeout)
  - Verify all failures detected within 30s

- [ ] Test: Recovery detection when device comes back
  - Device offline, then reconnects
  - Verify watchdog detects recovery
  - Verify state returns to responsive
  - Verify recovery notification

- [ ] Test: Partial failures (device responsive but degraded)
  - Introduce network latency (5-10s)
  - Verify watchdog detects degraded state
  - Verify not reported as offline
  - Verify accurate state representation

### AC4: Performance & Load Tests

**Goal:** Validate watchdog performance with available hardware

**Hardware Context:**

- Available: 2 Pixoo devices, 1-2 AWTRIX devices (2-4 devices total)
- Device performance differences:
  - AWTRIX: Very fast, responds in milliseconds
  - Pixoo: Slower, ~250ms for full screen update with current rendering
- Devices connected via WiFi (some network variability expected)
- Watchdog overhead should be minimal given devices are not CPU/memory heavy

- [ ] Test: Watchdog with 1 device (baseline)
  - Single device baseline
  - Measure CPU overhead
  - Measure memory usage
  - Expected: < 0.1% CPU (watchdog is lightweight)

- [ ] Test: Watchdog with all available devices (2-4 devices)
  - All physical devices simultaneously
  - Measure CPU overhead
  - Measure memory usage
  - Expected: < 0.5% CPU (realistic for small device count)
  - Test with mix of AWTRIX (fast) and Pixoo (slower)

- [ ] Test: Long-running overnight stability (10-12 hours)
  - Run watchdog overnight (8pm to 8am)
  - Monitor for memory leaks
  - Monitor for performance degradation
  - Verify no crashes
  - Verify no false positives throughout duration
  - Note: Start with overnight tests, can extend to 24h later

- [ ] Test: Watchdog during heavy scene load
  - Multiple devices rendering complex scenes
  - Verify watchdog timing unaffected
  - Verify device state tracking accurate
  - Account for Pixoo's ~250ms render time vs AWTRIX milliseconds

- [ ] Test: Watchdog timing accuracy (with WiFi variability)
  - Measure actual check intervals vs configured
  - Verify intervals within ±1000ms tolerance (WiFi adds variability)
  - Acknowledge that WiFi connectivity may cause timing variations
  - Focus on consistency over perfect accuracy

### AC5: Integration Tests

**Goal:** Validate watchdog integration with other systems

- [ ] Test: Watchdog + Scene system integration
  - Scenes rendering on multiple devices
  - Watchdog monitoring all devices
  - Verify both systems coexist
  - Verify no interference

- [ ] Test: Watchdog + WebSocket notification integration
  - Clients connected via WebSocket
  - State changes occur
  - Verify clients receive notifications
  - Verify notification payload correct

- [ ] Test: Watchdog + UI state display integration
  - UI showing device states
  - Trigger state transitions
  - Verify UI updates in real-time
  - Verify visual indicators accurate

- [ ] Test: Watchdog + Device driver integration
  - Multiple device types (Pixoo, AWTRIX)
  - Different communication methods
  - Verify watchdog works with all device types
  - Verify state tracking accurate per device

- [ ] Test: Watchdog during daemon restart
  - Daemon running with devices monitored
  - Restart daemon gracefully
  - Verify watchdog state persisted
  - Verify monitoring resumes correctly

- [ ] Test: Watchdog state persistence
  - Device states saved to disk
  - Daemon restart
  - Verify states restored correctly
  - Verify state history preserved

### AC6: Edge Case & Error Handling Tests

**Goal:** Validate watchdog resilience to edge cases

- [ ] Test: Watchdog handles corrupted state
  - Corrupt watchdog state file
  - Restart daemon
  - Verify graceful recovery
  - Verify watchdog initializes with defaults

- [ ] Test: Watchdog handles missing devices
  - Device disappears mid-operation
  - Verify watchdog handles gracefully
  - Verify no crashes
  - Verify state transitions to unresponsive

- [ ] Test: Watchdog handles invalid configuration
  - Provide invalid threshold values
  - Verify validation catches issues
  - Verify falls back to defaults
  - Verify error logged

- [ ] Test: Watchdog handles network issues
  - Introduce packet loss
  - Introduce latency spikes
  - Verify watchdog adapts
  - Verify state reflects reality

- [ ] Test: Concurrent state updates
  - Multiple threads updating device state
  - Verify no race conditions
  - Verify state remains consistent
  - Verify no deadlocks

### AC7: Regression Prevention Tests

**Goal:** Ensure future changes don't break watchdog

- [ ] All tests must be:
  - Deterministic (no flakiness)
  - Fast enough for CI/CD (< 5 minutes for quick tests)
  - Comprehensive (cover all critical paths)
  - Maintainable (clear, well-documented)

- [ ] Test suite integrated into CI/CD pipeline
  - Run on every commit
  - Block merge if tests fail
  - Run long-running tests nightly

- [ ] Coverage metrics tracked
  - Watchdog module: 90%+ coverage target
  - State management: 95%+ coverage target
  - Integration points: 80%+ coverage target

- [ ] Test documentation comprehensive
  - Each test explains what it validates
  - Test rationale documented
  - Failure scenarios documented

---

## Tasks / Subtasks

### Task 1: Test Infrastructure Setup (AC7)

**Duration:** 0.5 days

- [ ] 1.1: Create test directory structure

  ```
  test/
  ├── integration/
  │   ├── watchdog-independence.test.js
  │   ├── watchdog-state-transitions.test.js
  │   └── watchdog-integration.test.js
  ├── performance/
  │   ├── watchdog-performance.test.js
  │   └── watchdog-load.test.js
  └── stability/
      └── watchdog-long-running.test.js
  ```

- [ ] 1.2: Set up test utilities
  - Mock device factory
  - Mock scene factory
  - Time manipulation helpers
  - Assertion helpers for watchdog state

- [ ] 1.3: Configure test framework
  - Jest or Mocha + Chai
  - Code coverage (nyc/c8)
  - Test timeouts for long-running tests
  - Parallel test execution where possible

- [ ] 1.4: Set up CI/CD integration
  - GitHub Actions or similar
  - Run tests on PR
  - Block merge on test failure
  - Nightly long-running test job

### Task 2: Watchdog Independence Tests (AC1)

**Duration:** 1 day

- [ ] 2.1: Test watchdog during active scene rendering

  ```javascript
  test('watchdog continues during scene rendering', async () => {
    const device = createMockDevice();
    const scene = createMockScene({ renderTime: 100 });

    startScene(device, scene);
    await waitForSceneRenders(5);

    expect(watchdog.checkCount).toBeGreaterThan(3);
    expect(device.state).toBe('responsive');
  });
  ```

- [ ] 2.2: Test watchdog with no scenes
- [ ] 2.3: Test watchdog during scene crashes
- [ ] 2.4: Test watchdog during scene slowdowns
- [ ] 2.5: Test watchdog during rapid scene switching
- [ ] 2.6: Test watchdog lifecycle independence

### Task 3: State Transition Tests (AC2)

**Duration:** 1 day

- [ ] 3.1: Test responsive → degraded transition

  ```javascript
  test('state transitions to degraded at 5s threshold', async () => {
    const device = createMockDevice({ responseTime: 6000 });

    await waitForHysteresisChecks(2);

    expect(device.state).toBe('degraded');
    expect(stateChangeEvent).toHaveBeenEmitted({
      oldState: 'responsive',
      newState: 'degraded',
    });
  });
  ```

- [ ] 3.2: Test degraded → unresponsive transition
- [ ] 3.3: Test unresponsive → responsive recovery
- [ ] 3.4: Test state hysteresis (prevent flapping)
- [ ] 3.5: Test state transition logging
- [ ] 3.6: Test WebSocket notifications

### Task 4: False Positive/Negative Tests (AC3)

**Duration:** 1 day

- [ ] 4.1: Test no false positives (1 hour run)

  ```javascript
  test('no false positives over 1 hour', async () => {
    const device = createMockDevice({ responseTime: 2000 });
    const duration = 60 * 60 * 1000; // 1 hour

    await runFor(duration);

    const falsePositives = getFalsePositiveCount(device);
    expect(falsePositives).toBe(0);
  }, 3600000); // 1 hour timeout
  ```

- [ ] 4.2: Test no false negatives (device offline detection)
- [ ] 4.3: Test actual device failure detection
- [ ] 4.4: Test recovery detection
- [ ] 4.5: Test partial failure detection (degraded)

### Task 5: Performance & Load Tests (AC4)

**Duration:** 1 day

- [ ] 5.1: Test watchdog with 1 device (baseline)

  ```javascript
  test('watchdog CPU overhead minimal with 1 device', async () => {
    const cpuBefore = process.cpuUsage();
    const device = createRealDevice(); // Use real device

    await runFor(60000); // 1 minute

    const cpuAfter = process.cpuUsage();
    const overhead = calculateOverhead(cpuBefore, cpuAfter);
    expect(overhead).toBeLessThan(0.001); // < 0.1%
  });
  ```

- [ ] 5.2: Test watchdog with all available devices (2-4 devices)
  - Use actual physical devices (2 Pixoo + 1-2 AWTRIX)
  - Measure with mix of fast (AWTRIX) and slower (Pixoo) devices
  - Verify < 0.5% CPU with realistic device count

- [ ] 5.3: Test overnight stability (10-12 hours)
  - Run 8pm to 8am (overnight)
  - Monitor memory leaks
  - Log all watchdog events
  - Verify no false positives
  - Can extend to 24h later if needed

- [ ] 5.4: Test watchdog during heavy scene load
  - Account for Pixoo's ~250ms render time
  - Account for AWTRIX's millisecond response time
  - Verify watchdog unaffected by scene performance differences

- [ ] 5.5: Test watchdog timing accuracy (with WiFi)
  - WiFi connectivity adds variability
  - Target: ±1000ms tolerance (realistic for WiFi)
  - Focus on consistency, not perfect accuracy

### Task 6: Integration Tests (AC5)

**Duration:** 1 day

- [ ] 6.1: Test watchdog + scene system integration
- [ ] 6.2: Test watchdog + WebSocket integration
- [ ] 6.3: Test watchdog + UI integration
- [ ] 6.4: Test watchdog + device driver integration
- [ ] 6.5: Test watchdog during daemon restart
- [ ] 6.6: Test watchdog state persistence

### Task 7: Edge Case Tests (AC6)

**Duration:** 0.5 days

- [ ] 7.1: Test corrupted state handling
- [ ] 7.2: Test missing device handling
- [ ] 7.3: Test invalid configuration handling
- [ ] 7.4: Test network issues handling
- [ ] 7.5: Test concurrent state updates

### Task 8: CI/CD Integration & Documentation (AC7)

**Duration:** 0.5 days

- [ ] 8.1: Configure CI/CD pipeline
  - Quick tests on every PR (< 5 minutes)
  - Full suite on merge to main
  - Long-running tests nightly
  - Performance tests weekly

- [ ] 8.2: Set up coverage reporting
  - Generate coverage reports
  - Track coverage trends
  - Set coverage gates (90%+ for watchdog)

- [ ] 8.3: Document test suite
  - README in test directory
  - Each test file has header documentation
  - Test rationale explained
  - Failure scenarios documented

- [ ] 8.4: Create test maintenance guide
  - How to add new tests
  - How to update existing tests
  - Common pitfalls to avoid
  - Debugging test failures

---

## Dev Notes

### Test Philosophy

This test suite is **proof of reliability**, not just code coverage. Each test answers a specific question:

- "Does the watchdog operate independently?" → Independence tests
- "Does it accurately detect failures?" → False positive/negative tests
- "Does it perform well at scale?" → Performance tests
- "Will it stay reliable over time?" → Long-running tests

### Test Categories

**Quick Tests (< 5 minutes):**

- Unit tests for state calculation
- Integration tests for watchdog independence
- State transition tests
- Run on every PR

**Medium Tests (5-30 minutes):**

- Performance tests with multiple devices
- Integration tests with real components
- Run on merge to main

**Long-Running Tests (1+ hours):**

- 24-hour stability test
- False positive detection over time
- Memory leak detection
- Run nightly

### Mock Strategy

**What to Mock:**

- Time (for fast-forward in some tests)
- File system for state persistence (use in-memory for unit tests)

**What to Use REAL:**

- **Physical devices** (2 Pixoo + 1-2 AWTRIX) for integration and long-running tests
- Device communication (real HTTP/WebSocket to actual devices)
- Scene rendering (real rendering to understand actual performance)
- Watchdog logic (must test real code)
- State management (must test real state)
- Configuration loading (test real config)

**Why Real Devices Matter:**

- WiFi connectivity behavior (latency, variability)
- Device-specific performance (AWTRIX fast, Pixoo slower)
- Real-world timing and response patterns
- Actual network conditions
- This is where the false positive bug manifests

### Performance Targets

**Note:** Targets adjusted for realistic hardware constraints (2-4 physical devices, WiFi connectivity)

| Test                     | Target      | Acceptable | Fail      |
| ------------------------ | ----------- | ---------- | --------- |
| 1 device CPU             | < 0.1%      | < 0.5%     | ≥ 0.5%    |
| 2-4 devices CPU (actual) | < 0.5%      | < 1%       | ≥ 1%      |
| Memory growth/hour       | < 1 MB      | < 5 MB     | ≥ 5 MB    |
| Timing accuracy (WiFi)   | ± 1000ms    | ± 2000ms   | ≥ 2000ms  |
| Overnight stability      | 10-12 hours | 8+ hours   | < 8 hours |

**WiFi Considerations:**

- Network latency adds variability to response times
- Timing accuracy focus on consistency, not perfection
- Device performance varies (AWTRIX: ms, Pixoo: ~250ms)
- Some flakiness expected due to WiFi nature

### Critical Test: False Positives

**THE TEST THAT MUST PASS:**

```javascript
test('no false positives - device online reported as offline', async () => {
  // Use REAL physical device (P00 or similar)
  const device = getRealDevice('P00'); // 192.168.1.159
  const duration = 60 * 60 * 1000; // 1 hour

  // Device actively rendering scenes (real usage)
  startSceneRendering(device);

  const watchdogEvents = captureWatchdogEvents();
  await runFor(duration);

  // Count any "offline" warnings for this device
  const falseOfflineWarnings = watchdogEvents.filter(
    (e) => e.type === 'offline' && e.deviceId === device.id && device.wasActuallyOnline === true // Device was responding throughout
  );

  expect(falseOfflineWarnings.length).toBe(0); // MUST BE ZERO
});
```

**Note:** This test uses REAL physical device on WiFi. Some response time variability expected, but zero false positives required.

This is the test that validates the entire Epic 0 effort. If this fails, the watchdog fix is incomplete.

### Test Utilities Example

```javascript
// test/utils/watchdog-test-helpers.js

export function createMockDevice(options = {}) {
  return {
    id: options.id || 'TEST-01',
    ip: options.ip || '192.168.1.100',
    responseTime: options.responseTime || 2000,
    state: 'responsive',
    isOnline: true,
  };
}

export function simulateDeviceOffline(device) {
  device.isOnline = false;
  device.responseTime = Infinity;
}

export function simulateSlowDevice(device, responseTime) {
  device.responseTime = responseTime;
}

export async function waitForHysteresisChecks(count = 2) {
  // Wait for watchdog to check `count` times
  const checkInterval = getWatchdogCheckInterval();
  await delay(checkInterval * count + 100);
}

export function getFalsePositiveCount(device) {
  // Check logs for false positive warnings
  const logs = getWatchdogLogs();
  return logs.filter(
    (log) => log.level === 'warn' && log.message.includes('offline') && log.deviceId === device.id && device.isOnline // Device was actually online
  ).length;
}
```

### Coverage Requirements

**Watchdog Module: 90%+ Coverage**

- All critical paths covered
- Edge cases tested
- Error handling tested

**State Management: 95%+ Coverage**

- All state transitions covered
- Hysteresis logic tested
- Rolling average calculation tested

**Integration Points: 80%+ Coverage**

- Device driver integration
- Scene manager integration
- WebSocket integration
- UI integration

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  quick-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm test -- --testPathPattern=integration
      - run: npm run coverage

  overnight-tests:
    # Run on physical hardware with real devices
    # Requires access to miniserver24 with devices
    if: github.event_name == 'schedule'
    runs-on: self-hosted # Physical hardware with devices
    steps:
      - uses: actions/checkout@v2
      - run: npm test -- --testPathPattern=stability
      - run: npm test -- --testPathPattern=performance
```

**Note:** Long-running and performance tests require physical devices, so must run on hardware with access to Pixoo and AWTRIX devices (e.g., miniserver24).

### References

- **Epic 0:** [docs/bmad/epics/epic-0-system-stability.md](../epics/epic-0-system-stability.md)
- **Story 0.1:** [docs/bmad/stories/0-1-watchdog-root-cause-analysis.md](./0-1-watchdog-root-cause-analysis.md)
- **Story 0.2:** [docs/bmad/stories/0-2-three-tier-device-state-indicator.md](./0-2-three-tier-device-state-indicator.md)
- **Current Tests:** `test/` directory
- **Test Framework:** Jest (or Mocha + Chai)

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All test categories implemented:
  - Watchdog independence tests
  - State transition tests
  - False positive/negative tests
  - Performance tests
  - Load tests
  - Integration tests
  - Edge case tests
- [ ] Critical test passes: No false positives over 1 hour
- [ ] Long-running test passes: 24-hour stability with no issues
- [ ] Performance tests meet targets (< 1% CPU with 10 devices)
- [ ] All tests deterministic (no flakiness)
- [ ] Coverage targets met:
  - Watchdog: 90%+
  - State management: 95%+
  - Integration: 80%+
- [ ] CI/CD pipeline configured and working
- [ ] Tests run on every PR
- [ ] Coverage reports generated
- [ ] Test documentation comprehensive
- [ ] Knowledge transfer with Dana complete
- [ ] Code review complete

---

## Dev Agent Record

### Context Reference

<!-- Story context will be added when story moves to ready-for-dev -->

### Implementation Owners

**Bob (SM)** - Test strategy and documentation  
**Dana (QA)** - Test implementation and maintenance

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent during implementation -->

### Completion Notes

<!-- To be filled by dev agent after implementation -->

### File List

<!-- To be filled by dev agent - format:
- NEW: test/integration/watchdog-independence.test.js - Independence tests
- NEW: test/integration/watchdog-state-transitions.test.js - State transition tests
- NEW: test/integration/watchdog-false-positives.test.js - False positive detection
- NEW: test/performance/watchdog-performance.test.js - Performance benchmarks
- NEW: test/performance/watchdog-load.test.js - Load testing
- NEW: test/stability/watchdog-long-running.test.js - 24h stability test
- NEW: test/utils/watchdog-test-helpers.js - Test utilities
- NEW: test/README.md - Test suite documentation
-->

---

## Change Log

| Date       | Author    | Change                                                    |
| ---------- | --------- | --------------------------------------------------------- |
| 2025-11-11 | Bob/SM    | Initial story creation (comprehensive draft)              |
| 2025-11-11 | Dana/QA   | Co-author review and validation                           |
| 2025-11-11 | Markus/PL | Adjusted for hardware reality (2-4 devices, WiFi, 10-12h) |
| 2025-11-11 | Bob/SM    | Story review complete, marked ready-for-dev               |
| 2025-11-11 | Markus/PL | CI infrastructure support confirmed (miniserver24)        |

---

## Notes

### Why This Story Matters

Without comprehensive tests, we have **no proof** that the watchdog fix works. Previous fixes appeared to work but regressed because there were no tests to catch regressions.

This test suite is our **insurance policy** against future breakage.

### Test-Driven Confidence

The goal is that after this story is complete, we can say with confidence:

> "The watchdog operates independently, detects failures accurately, performs well with our actual hardware (2-4 devices over WiFi), and will continue to do so because we have comprehensive tests that prove it."

### Hardware Reality

**Available Hardware:**

- 2 Pixoo devices
- 1-2 AWTRIX devices
- Total: 2-4 physical devices

**Infrastructure Reality:**

- Devices connected via WiFi (not wired ethernet)
- Network latency and variability expected
- Device performance differs significantly (AWTRIX ms vs Pixoo ~250ms)
- Daemon is lightweight (devices not CPU/memory intensive)

**Testing Approach:**

- Use real physical devices for critical tests
- Accept WiFi timing variability (±1-2 seconds realistic)
- Start with overnight tests (10-12 hours), extend to 24h later if needed
- Focus on zero false positives with real hardware
- Account for device-specific performance characteristics

### Gold Standard

This test suite should become the **gold standard** for how we test critical infrastructure:

- Comprehensive coverage
- Realistic scenarios
- Performance validation
- Long-running stability
- Clear documentation

Other components should aspire to this level of test quality.

### Collaboration with Dana

Dana (QA) will co-own this story, bringing QA expertise:

- Test strategy best practices
- Edge case identification
- Performance benchmarking approach
- CI/CD integration patterns
- Test maintenance guidelines

---

**Story Status:** Ready for Dev ✅ (Sequential - after 0.1 & 0.2)  
**Owners:** Bob (SM) + Dana (QA)  
**Dependencies:** Stories 0.1 & 0.2 complete (need watchdog fix and state logic to test)  
**Infrastructure:** Self-hosted CI runner on miniserver24 (setup during sprint)  
**Support:** Markus available for infrastructure setup  
**Target Start:** Sprint 3 (Nov 19-23)
