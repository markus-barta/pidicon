# Story 2.3: Watchdog Restart Cooldown Backoff

**Story ID:** 2-3-watchdog-restart-cooldown-backoff  
**Epic:** Epic 2 - Configuration & Observability  
**Status:** Backlog  
**Priority:** P2  
**Points:** 3  
**Owner:** mba

---

## User Story

As a **PIDICON system administrator**,  
I want **intelligent cooldown and backoff for watchdog restart attempts**,  
So that **unresponsive devices don't trigger restart spam and system instability**.

---

## Context

When the watchdog detects an unresponsive device and attempts a restart, it currently lacks cooldown/backoff mechanisms. This can lead to:

- Restart spam when devices are persistently unresponsive
- No breathing room after a restart command is sent
- Potential flooding of MQTT commands to devices
- False positive restarts during temporary network issues

---

## Acceptance Criteria

### AC1: Post-Restart Cooldown

- [ ] After sending restart command, pause watchdog checks for cooldown period
- [ ] Default cooldown: 120 seconds (configurable)
- [ ] Resume monitoring after cooldown expires
- [ ] Log cooldown start/end events (INFO level)
- [ ] Display cooldown status in UI

### AC2: Exponential Backoff

- [ ] Track consecutive restart attempts per device
- [ ] Apply backoff schedule: 1min → 2min → 5min → 10min → 30min → 60min → 24h (capped)
- [ ] Reset backoff counter on successful device response
- [ ] Persist backoff state across daemon restarts
- [ ] Log backoff events (WARN level with attempt count)

### AC3: Configuration Options

- [ ] `watchdog.restartCooldownMs` (default: 120000 = 2min)
- [ ] `watchdog.backoffSchedule` (default: [60000, 120000, 300000, 600000, 1800000, 3600000, 86400000])
- [ ] `watchdog.maxBackoffMs` (default: 86400000 = 24h)
- [ ] `watchdog.maxRestartAttempts` (default: null = unlimited)
- [ ] All configurable via `daemon.json`

### AC4: Metrics Tracking

- [ ] Last restart timestamp per device
- [ ] Consecutive restart attempt count
- [ ] Current backoff delay (ms)
- [ ] Next restart attempt timestamp
- [ ] Watchdog state (active, cooldown, backoff, disabled)

### AC5: UI Status Display

- [ ] Current state badge per device (monitoring, cooldown, backing-off, paused)
- [ ] Time until next restart attempt (countdown timer)
- [ ] Consecutive failure count
- [ ] Last restart timestamp
- [ ] Manual override button to reset backoff counter

### AC6: State Persistence

- [ ] Persist backoff state to StateStore
- [ ] Reload state on daemon restart
- [ ] Prevent backoff reset on daemon restart
- [ ] Export/import with device configuration

### AC7: Manual Override

- [ ] UI button to reset backoff counter
- [ ] Immediate retry allowed after override
- [ ] Log manual override event
- [ ] Update watchdog state immediately

---

## Technical Design

### Backoff Algorithm

```javascript
const BACKOFF_SCHEDULE = [
  60000, // 1 minute
  120000, // 2 minutes
  300000, // 5 minutes
  600000, // 10 minutes
  1800000, // 30 minutes
  3600000, // 1 hour
  86400000, // 24 hours (max)
];

function getBackoffDelay(attemptCount) {
  const index = Math.min(attemptCount, BACKOFF_SCHEDULE.length - 1);
  return BACKOFF_SCHEDULE[index];
}
```

### Watchdog State Machine

```
Initial → Monitoring
  ↓ (unresponsive)
Cooldown (2 min) → Monitoring
  ↓ (still unresponsive)
Backoff (exponential) → Monitoring
  ↓ (success)
Reset → Monitoring
```

### State Structure

```javascript
deviceState = {
  watchdog: {
    state: 'monitoring', // monitoring, cooldown, backoff, disabled
    lastRestartTimestamp: 1699564800000,
    consecutiveAttempts: 3,
    currentBackoffMs: 300000, // 5 minutes
    nextAttemptTimestamp: 1699565100000,
    cooldownExpiresAt: null,
  },
};
```

---

## Tasks

### Task 1: Backoff Logic (3h)

- [ ] 1.1: Implement backoff schedule calculation
- [ ] 1.2: Track consecutive restart attempts per device
- [ ] 1.3: Reset counter on successful response
- [ ] 1.4: Handle max attempts limit
- [ ] 1.5: Unit tests for backoff logic

### Task 2: Cooldown Implementation (2h)

- [ ] 2.1: Add cooldown timer after restart command
- [ ] 2.2: Pause watchdog monitoring during cooldown
- [ ] 2.3: Resume monitoring after cooldown
- [ ] 2.4: Log cooldown events
- [ ] 2.5: Test cooldown behavior

### Task 3: State Persistence (3h)

- [ ] 3.1: Persist backoff state to StateStore
- [ ] 3.2: Load state on daemon startup
- [ ] 3.3: Maintain state across daemon restarts
- [ ] 3.4: Test persistence with daemon restart
- [ ] 3.5: Export/import with device config

### Task 4: Configuration (2h)

- [ ] 4.1: Add watchdog config options to schema
- [ ] 4.2: Load config on startup
- [ ] 4.3: Apply config defaults
- [ ] 4.4: Validate config values
- [ ] 4.5: Document configuration options

### Task 5: UI Status Display (4h)

- [ ] 5.1: Add watchdog state badge to device card
- [ ] 5.2: Display countdown timer for next attempt
- [ ] 5.3: Show consecutive failure count
- [ ] 5.4: Display last restart timestamp
- [ ] 5.5: Add manual reset button
- [ ] 5.6: Test UI updates in real-time

### Task 6: Manual Override (2h)

- [ ] 6.1: Add API endpoint for manual reset
- [ ] 6.2: Reset backoff counter on override
- [ ] 6.3: Allow immediate retry
- [ ] 6.4: Log override event
- [ ] 6.5: Test manual override flow

### Task 7: Testing (3h)

- [ ] 7.1: Unit tests for backoff schedule
- [ ] 7.2: Unit tests for cooldown timer
- [ ] 7.3: Integration tests for state transitions
- [ ] 7.4: Integration tests for persistence
- [ ] 7.5: E2E tests for UI status display
- [ ] 7.6: E2E tests for manual reset

### Task 8: Documentation (1h)

- [ ] 8.1: Update ARCHITECTURE.md with watchdog logic
- [ ] 8.2: Document configuration options
- [ ] 8.3: Add troubleshooting guide
- [ ] 8.4: Document manual override process

**Total Estimated Effort:** ~20 hours (~3 days)

---

## Testing Strategy

### Unit Tests

- Backoff schedule calculation
- Cooldown timer logic
- State persistence/loading
- Counter reset logic

### Integration Tests

- Full watchdog cycle with cooldown/backoff
- State persistence across daemon restarts
- Manual override resets state
- Max attempts limit behavior

### E2E Tests

- UI displays watchdog status
- Countdown timer updates
- Manual reset button works
- State persists after page refresh

---

## Dependencies

- Existing watchdog implementation
- StateStore for persistence
- WebSocket for UI updates
- REST API for manual override

---

## Risks & Mitigations

| Risk                                       | Impact | Probability | Mitigation                               |
| ------------------------------------------ | ------ | ----------- | ---------------------------------------- |
| Backoff too aggressive (device stays down) | Medium | Medium      | Configurable schedule, manual override   |
| State corruption causes incorrect backoff  | Medium | Low         | Validation on load, fallback to defaults |
| Daemon restart resets backoff              | Medium | Low         | Persist to StateStore, unit tests        |
| Users don't understand backoff state       | Low    | Medium      | Clear UI messaging, documentation        |

---

## Success Criteria

- No restart spam for persistently unresponsive devices
- Backoff schedule prevents rapid restarts (< 1/minute)
- State persists across daemon restarts
- UI clearly shows watchdog status and countdown
- Manual override allows immediate retry
- All tests passing
- Documentation clear and comprehensive

---

## Design Decisions

**Why configurable backoff schedule vs strategy?**

- More flexible: supports exponential, linear, or custom patterns
- Easier to tune per deployment (home vs production)
- Avoids complex backoff calculation logic

**Why 24h max backoff?**

- Prevents completely abandoning device monitoring
- Balances responsiveness vs spam protection
- User can still see daily "health check" attempts

**Why persist state?**

- Daemon restarts shouldn't reset backoff counters
- Prevents restart spam after daemon issues
- Maintains context across system updates

**Why manual UI override?**

- User intervention suggests different context (device replaced, network fixed)
- Allows immediate retry without waiting for backoff
- Improves user experience when debugging

---

## Notes

Should integrate with `ROADMAP-004` (Enhanced Watchdog Features) in future epic.

After reaching max backoff (24h), continue trying once per day indefinitely.

Manual device restart via UI should reset backoff counter (shows user action succeeded).

Consider optional notification when device enters extended backoff (>1 hour).

---

## Change Log

| Date       | Author | Change                       |
| ---------- | ------ | ---------------------------- |
| 2025-11-09 | Bob/SM | Created from backlog OPS-414 |
