# Story: Three-Tier Device State Indicator

**Story ID:** 0.2  
**Epic:** Epic 0 - System Stability & Watchdog Reliability  
**Status:** Ready for Dev (Sequential - after 0.1)  
**Priority:** P0 (CRITICAL)  
**Points:** 5  
**Sprint:** Sprint 2 (Nov 12-18) - Late sprint or Sprint 3  
**Owner:** Charlie (after 0.1) or other dev if available  
**UX Support:** Markus (Product Lead)

---

## Story

As a **PIDICON user**,  
I want **clear visual indication of device health with three distinct states (responsive/degraded/unresponsive)**,  
so that **I can distinguish between devices working fine, experiencing delays, and completely offline**.

---

## Context

### Current Limitation

Currently, PIDICON uses a binary responsive/unresponsive indicator. This doesn't show nuanced device health:

- A device with 8-second response time looks the same as one with 500ms response time
- Users can't tell if slowness is temporary or degrading
- No warning before complete failure

### User Need

Users need to understand device health at a glance:

- **"Is this device working normally?"** → Green (responsive)
- **"Is this device slow but still working?"** → Yellow/Amber (degraded)
- **"Is this device completely dead?"** → Red X (**OFFLINE**)

### Business Value

- **Early Warning:** Users see degradation before complete failure
- **Better Decisions:** Users can troubleshoot slow devices proactively
- **Reduced Support:** Clear state communication reduces "why is this not working?" questions
- **User Trust:** Accurate state builds confidence in system monitoring

### Proposed State Definitions

| State      | Response Time | Visual Indicator      | Animation | Meaning             |
| ---------- | ------------- | --------------------- | --------- | ------------------- |
| Responsive | 0-5 seconds   | Green heartbeat/pulse | Animated  | Working normally    |
| Degraded   | 5+ seconds    | Yellow/Amber pulse    | Animated  | Slow but functional |
| Offline    | 30+ seconds   | Red X                 | Static    | **OFFLINE**         |

**Note:** Degraded state covers 5-30 seconds. Device transitions to Offline only after sustained 30+ seconds of no response.

---

## Acceptance Criteria

### AC1: State Definition & Backend Implementation

- [ ] Define three device health states with clear boundaries:
  - Responsive: 0-5s response time
  - Degraded: 5+ seconds response time
  - Offline: 30s+ no response (sustained, not transient)
- [ ] Implement response time tracking per device
  - Track last 5 response times
  - Calculate rolling average
  - Store in device state
- [ ] Implement state transition logic with hysteresis
  - State changes only after 2 consecutive measurements in new range
  - Prevents flapping on threshold boundaries
  - Log all state transitions
- [ ] Add state timestamps
  - When device entered current state
  - Duration in current state
  - Last response time measurement
- [ ] Emit state change events via WebSocket

### AC2: UI - Device Card Visual Indicators

- [ ] Implement three distinct visual states on device cards:

  **Responsive (Green):**
  - Green circular pulse/heartbeat icon
  - Smooth animation (1.5s cycle)
  - Text: "Responsive" or response time (e.g., "2.1s")

  **Degraded (Yellow/Amber):**
  - Yellow/Amber circular pulse icon
  - Slower animation (2s cycle)
  - Text: "Degraded" or response time (e.g., "7.8s")
  - Optional warning icon

  **Offline (Red):**
  - Red X icon (no circle)
  - No animation (static)
  - Text: **"OFFLINE"** (bold, all caps)
  - Gray out device card

- [ ] Ensure visual distinction at a glance
  - Color blind friendly (icons + text)
  - Size appropriate for quick scanning
  - Animation speed distinct between states

### AC3: UI - Device List View

- [ ] Show state indicator in device list
  - Colored dot or icon before device name
  - Text label for state
  - Response time in tooltip
- [ ] Sort/filter by device state
  - Filter: Show only offline
  - Filter: Show degraded or worse
  - Sort by state (offline first)

### AC4: UI - Tooltips & Details

- [ ] Add tooltip on hover showing:
  - Current state name
  - Current response time
  - Average response time (last 5)
  - Time in current state (e.g., "Degraded for 3m 24s")
  - Last state transition timestamp
- [ ] Add expandable device details panel showing:
  - State history (last 10 transitions)
  - Response time graph (last hour)
  - State duration statistics

### AC5: State History Visualization

- [ ] Store last 10 state transitions per device
  - Timestamp
  - Old state → New state
  - Response time at transition
  - Triggering event (if known)
- [ ] Display state history timeline in UI
  - Visual timeline showing state changes
  - Click to see details
  - Export to CSV for analysis

### AC6: Notifications & Alerts

- [ ] Optional notification when device transitions to degraded
  - User preference: enable/disable
  - Toast notification in UI
  - Desktop notification (if permissions granted)
- [ ] Alert when device transitions to offline
  - Always show (cannot disable)
  - Prominent visual alert with **"OFFLINE"** text
  - Sound alert (optional, user preference)
- [ ] Clear notification when device recovers from offline to responsive/degraded

### AC7: Configuration & Tuning

- [ ] Make state thresholds configurable
  - Global defaults in daemon config
  - Per-device overrides in device config
  - UI for adjusting thresholds
- [ ] Configuration options:
  - Responsive threshold (default: 5s)
  - Offline threshold (default: 30s)
  - Hysteresis count (default: 2 consecutive measurements)
  - Rolling average window (default: 5 measurements)

### AC8: Testing & Validation

- [ ] E2E tests for all three states
  - Test responsive state display
  - Test degraded state display
  - Test offline state display
  - Test state transitions
- [ ] Test state transition logic
  - Test hysteresis (prevents flapping)
  - Test rolling average calculation
  - Test threshold boundaries
- [ ] Manual testing on physical devices
  - Verify responsive state under normal operation
  - Simulate network latency for degraded state
  - Disconnect device for offline state
  - Verify visual indicators clear and distinct
  - Verify **"OFFLINE"** text is bold and in caps

---

## Tasks / Subtasks

### Task 1: Backend State Management (AC1)

**Duration:** 1 day

- [ ] 1.1: Define state enum/constants

  ```javascript
  const DeviceState = {
    RESPONSIVE: 'responsive',
    DEGRADED: 'degraded',
    OFFLINE: 'offline',
  };
  ```

- [ ] 1.2: Add response time tracking to device state
  - Track last 5 response times
  - Calculate rolling average
  - Store timestamps

- [ ] 1.3: Implement state calculation logic

  ```javascript
  function calculateDeviceState(avgResponseTime, lastResponseTime) {
    if (avgResponseTime < 5000) return DeviceState.RESPONSIVE;
    if (avgResponseTime < 30000) return DeviceState.DEGRADED;
    return DeviceState.OFFLINE; // 30+ seconds
  }
  ```

- [ ] 1.4: Implement state transition with hysteresis
  - Track consecutive measurements in new state
  - Require 2+ consecutive to transition
  - Prevent flapping on threshold boundary

- [ ] 1.5: Add state timestamps
  - `stateEnteredAt`: when device entered current state
  - `stateDuration`: calculated duration in current state
  - `lastResponseTime`: most recent measurement
  - `avgResponseTime`: rolling average

- [ ] 1.6: Emit state change events
  - WebSocket event: `device:state:changed`
  - Payload: `{ deviceId, oldState, newState, responseTime, timestamp }`

- [ ] 1.7: Add state logging
  - Log all state transitions
  - Include response times and reason
  - Debug logging for state calculations

### Task 2: Configuration System (AC7)

**Duration:** 0.5 days

- [ ] 2.1: Add configuration schema

  ```javascript
  {
    deviceState: {
      thresholds: {
        responsive: 5000,      // ms
        offline: 30000         // ms (degraded is 5000-30000)
      },
      hysteresisCount: 2,
      rollingAverageWindow: 5
    }
  }
  ```

- [ ] 2.2: Support per-device threshold overrides
  - Allow device-specific configuration
  - Fall back to global defaults

- [ ] 2.3: Add runtime configuration updates
  - Hot-reload threshold changes
  - Validate threshold values
  - Apply immediately to state calculations

### Task 3: UI - Device Card Indicators (AC2)

**Duration:** 1 day

- [ ] 3.1: Create DeviceStateIndicator component
  - Props: `state`, `responseTime`, `stateEnteredAt`
  - Renders appropriate icon and color
  - Handles animation

- [ ] 3.2: Implement Responsive state visual
  - Green circular pulse icon
  - CSS animation: smooth heartbeat (1.5s cycle)
  - Display response time
  - Style: `color: #00FF00`, animated

- [ ] 3.3: Implement Degraded state visual
  - Yellow/Amber circular pulse icon
  - CSS animation: slower pulse (2s cycle)
  - Display response time with warning
  - Style: `color: #FFA500`, animated
  - Optional warning triangle icon

- [ ] 3.4: Implement Offline state visual
  - Red X icon (static, no animation)
  - Gray out device card background
  - Display **"OFFLINE"** text (bold, all caps)
  - Style: `color: #FF0000`, `font-weight: bold`, static
  - Opacity: device card at 60%

- [ ] 3.5: Ensure accessibility
  - Screen reader support
  - Color blind friendly (icons + text labels)
  - Keyboard navigation
  - ARIA labels

- [ ] 3.6: Test visual distinctions
  - Side-by-side comparison of all three states
  - Readability at distance
  - Animation timing feels natural

### Task 4: UI - Device List View (AC3)

**Duration:** 0.5 days

- [ ] 4.1: Add state indicator to device list rows
  - Colored dot or small icon
  - Text label
  - Compact design

- [ ] 4.2: Add filter controls
  - Dropdown: "All", "Unresponsive Only", "Degraded or Worse"
  - Filter updates list immediately

- [ ] 4.3: Add sort by state
  - Option: Sort by state (unresponsive first, then degraded, then responsive)
  - Option: Sort by response time (slowest first)

### Task 5: UI - Tooltips & Details (AC4)

**Duration:** 1 day

- [ ] 5.1: Create DeviceStateTooltip component
  - Shows on hover over state indicator
  - Content:
    - State name
    - Current response time
    - Average response time
    - Time in current state
    - Last transition time

- [ ] 5.2: Create DeviceStateDetails panel (expandable)
  - Accordion or collapsible section in device card
  - State history timeline
  - Response time mini-graph
  - State statistics

- [ ] 5.3: Implement response time graph
  - Line chart: last 60 minutes
  - X-axis: time, Y-axis: response time (ms)
  - Threshold lines at 5s and 10s
  - Color zones (green/yellow/red)

### Task 6: State History (AC5)

**Duration:** 0.5 days

- [ ] 6.1: Store state history per device
  - Array of last 10 transitions
  - Structure: `{ timestamp, oldState, newState, responseTime, reason }`
  - Persist to device state store

- [ ] 6.2: Create StateHistoryTimeline component
  - Visual timeline with dots for each transition
  - Color-coded by state
  - Hover shows transition details
  - Compact design (fits in device card)

- [ ] 6.3: Add export functionality
  - Button: "Export State History"
  - Format: CSV with all history data
  - Useful for debugging and analysis

### Task 7: Notifications & Alerts (AC6)

**Duration:** 0.5 days

- [ ] 7.1: Implement degraded state notification (optional)
  - User preference: `notifyOnDegraded` (default: false)
  - Toast notification: "Device X is responding slowly (7.2s)"
  - Auto-dismiss after 5 seconds

- [ ] 7.2: Implement offline state alert (always on)
  - Prominent banner notification
  - Sound alert (optional, user preference)
  - Does not auto-dismiss (manual dismiss)
  - Text: "Device X is **OFFLINE**" (bold, caps)

- [ ] 7.3: Implement recovery notification
  - Toast notification: "Device X has recovered (2.1s)"
  - Auto-dismiss after 3 seconds
  - Positive visual style (green)

- [ ] 7.4: Add notification preferences UI
  - Settings panel: Device Notifications
  - Toggle: Notify on degraded state
  - Toggle: Sound alerts
  - Toggle: Desktop notifications

### Task 8: Testing (AC8)

**Duration:** 1 day

- [ ] 8.1: Unit tests for state calculation logic
  - Test responsive threshold (< 5s)
  - Test degraded threshold (5-30s)
  - Test offline threshold (≥ 30s)
  - Test rolling average calculation
  - Test hysteresis logic

- [ ] 8.2: Unit tests for state transition logic
  - Test state changes with hysteresis
  - Test threshold boundary cases
  - Test flapping prevention

- [ ] 8.3: E2E tests for UI indicators
  - Test responsive state displays correctly
  - Test degraded state displays correctly
  - Test offline state displays correctly (verify **"OFFLINE"** bold and caps)
  - Test state transitions update UI
  - Test animations

- [ ] 8.4: Integration tests for WebSocket events
  - Test state change events emitted
  - Test UI receives and updates on events
  - Test event payload structure

- [ ] 8.5: Manual testing with physical devices
  - Normal operation → Responsive state
  - Introduce network latency (5-30s) → Degraded state
  - Disconnect device (30s+) → Offline state (verify **"OFFLINE"** bold and caps)
  - Reconnect device → Recovery
  - Verify all indicators clear and accurate

---

## Dev Notes

### State Threshold Rationale

**Responsive (0-5s):**

- Normal operation range
- User doesn't notice delay
- Green = "all good"

**Degraded (5-30s):**

- Noticeable slowness but still functional
- Early warning of problems
- Yellow/Amber = "caution, slow"
- Time to investigate
- Covers entire range from "a bit slow" to "very slow but responding"

**Offline (30s+):**

- Effectively offline
- User cannot interact
- Red = "broken, take action immediately"
- **"OFFLINE"** in bold caps for maximum visibility

### Visual Design Considerations

**Color Blind Friendly:**

- Don't rely on color alone
- Use icons (heartbeat, warning, X)
- Use text labels
- Use animation differences

**Animation Purpose:**

- Responsive: Heartbeat = "alive and healthy"
- Degraded: Slower pulse = "struggling but alive"
- Offline: Static = "dead, not moving"

**Accessibility:**

- ARIA labels for screen readers
- Keyboard navigation support
- High contrast for visibility
- Tooltips for additional info

### Component Architecture

```
DeviceCard
├── DeviceStateIndicator (main visual)
│   ├── Icon (heartbeat/warning/X)
│   ├── Animation (CSS)
│   └── Label (state name + response time)
├── DeviceStateTooltip (on hover)
│   └── Detailed state info
└── DeviceStateDetails (expandable)
    ├── StateHistoryTimeline
    ├── ResponseTimeGraph
    └── StateStatistics
```

### State Management

**Device State Object:**

```javascript
{
  id: 'P00',
  name: 'Dev • WZ',
  state: 'responsive',  // 'responsive' | 'degraded' | 'offline'
  stateEnteredAt: '2025-11-11T10:23:45Z',
  stateDuration: 3600000,  // ms
  responseTime: 2100,  // ms, last measurement
  avgResponseTime: 2300,  // ms, rolling average
  responseTimeHistory: [2000, 2200, 2500, 2100, 2300],  // last 5
  stateHistory: [
    {
      timestamp: '2025-11-11T10:23:45Z',
      oldState: 'degraded',
      newState: 'responsive',
      responseTime: 2100,
      reason: 'avg_response_time_improved'
    },
    // ... last 10 transitions
  ]
}
```

### Configuration Example

```javascript
// Global configuration in daemon.json
{
  "deviceState": {
    "thresholds": {
      "responsive": 5000,     // 0-5s = responsive
      "offline": 30000        // 30s+ = offline (5-30s = degraded)
    },
    "hysteresisCount": 2,
    "rollingAverageWindow": 5,
    "notifications": {
      "notifyOnDegraded": false,
      "notifyOnOffline": true,
      "soundAlerts": true,
      "desktopNotifications": false
    }
  }
}

// Per-device override in devices.json
{
  "devices": [
    {
      "id": "P00",
      "name": "Dev • WZ",
      "stateThresholds": {
        "responsive": 3000,  // stricter threshold for critical device
        "offline": 20000     // stricter offline threshold
      }
    }
  ]
}
```

### References

- **Epic 0:** [docs/bmad/epics/epic-0-system-stability.md](../epics/epic-0-system-stability.md)
- **Story 0.1:** [docs/bmad/stories/0-1-watchdog-root-cause-analysis.md](./0-1-watchdog-root-cause-analysis.md)
- **Device State Store:** `lib/device-config-store.js`
- **WebSocket Service:** `lib/services/websocket-service.js`
- **Device Card Component:** `web/frontend/components/DeviceCard.vue`

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Three device states implemented and visually distinct
- [ ] Backend state tracking and transition logic working
- [ ] UI shows correct indicators for all states
- [ ] Tooltips and details panels functional
- [ ] State history tracking and visualization complete
- [ ] Notifications working (degraded optional, unresponsive always)
- [ ] Configuration system supports threshold tuning
- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Manual testing on physical devices confirms accuracy
- [ ] Accessibility requirements met
- [ ] Documentation updated
- [ ] Code review complete
- [ ] Deployed to production

---

## Dev Agent Record

### Context Reference

<!-- Story context will be added when story moves to ready-for-dev -->

### Implementation Owner

**TBD** - To be assigned during Epic 0 kickoff

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent during implementation -->

### Completion Notes

<!-- To be filled by dev agent after implementation -->

### File List

<!-- To be filled by dev agent - format:
- MODIFIED: lib/device-driver.js - Add response time tracking
- NEW: web/frontend/components/DeviceStateIndicator.vue - State visual component
- NEW: web/frontend/components/DeviceStateTooltip.vue - Tooltip component
- NEW: web/frontend/components/StateHistoryTimeline.vue - History visualization
- MODIFIED: web/frontend/components/DeviceCard.vue - Integrate state indicator
- NEW: test/e2e/device-state-transitions.spec.js - E2E tests
-->

---

## Change Log

| Date       | Author    | Change                                              |
| ---------- | --------- | --------------------------------------------------- |
| 2025-11-11 | Bob/SM    | Initial story creation (comprehensive draft)        |
| 2025-11-11 | Markus/PL | Modified state thresholds and renamed to Offline    |
| 2025-11-11 | Bob/SM    | Story review complete, marked ready-for-dev         |
| 2025-11-11 | Markus/PL | Sequential workflow confirmed, UX support committed |

---

## Notes

### Dependencies

**⚠️ BLOCKING DEPENDENCY - Story 0.1:**

- Accurate watchdog monitoring is required
- State transitions depend on reliable response time tracking
- **Sequential workflow:** This story waits for 0.1 to complete
- **No parallel work:** Build on solid foundation with real data
- **Decision:** Product Lead confirmed sequential approach (no mock data)

### User Experience Focus

This story is about **communication**, not just monitoring. Users need to understand device health at a glance and know what action to take (if any).

- Green + heartbeat = "Everything's fine, no action needed"
- Yellow + slow pulse = "Something's wrong, investigate when convenient"
- Red + static X + **"OFFLINE"** = "Broken, fix immediately"

---

**Story Status:** Ready for Dev ✅ (Sequential - waits for 0.1)  
**Owner:** Charlie (after 0.1) or other dev if available  
**UX Support:** Markus available for visual/UX decisions  
**Dependencies:** Story 0.1 MUST complete first  
**Target Start:** Late Sprint 2 or early Sprint 3 (after 0.1)
