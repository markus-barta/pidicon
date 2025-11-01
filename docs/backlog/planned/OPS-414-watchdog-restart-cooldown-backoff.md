# OPS-414: Watchdog Restart Cooldown and Backoff

**Status**: Planned | **Priority**: P1 (Important)
**Effort**: 3-4 hours | **Risk**: Low
**Owner**: TBD

## Problem

When the watchdog detects an unresponsive device and attempts a restart, it currently lacks cooldown/backoff mechanisms. This can lead to:

- Restart spam when devices are persistently unresponsive
- No breathing room after a restart command is sent
- Potential flooding of MQTT commands to devices
- False positive restarts during temporary network issues

## Goal

Implement intelligent cooldown and backoff mechanisms for device watchdog restart attempts:

1. **Post-restart cooldown**: After sending a restart command, wait before monitoring again (device needs time to reboot)
2. **Failure backoff**: If device remains unresponsive after restart attempts, use exponential backoff to avoid spam

## Tasks

1. Add per-device restart attempt tracking to state store
2. Implement post-restart cooldown period (e.g., 60-120 seconds configurable)
   - After restart command sent, pause watchdog checks
   - Resume monitoring after cooldown expires
3. Implement exponential backoff for repeated failures
   - Track consecutive restart attempts
   - Apply backoff schedule: 1min → 2min → 5min → 10min → 30min → 60min → 24h (capped)
   - Reset backoff counter on successful device response
   - Persist backoff state across daemon restarts
4. Add configuration options:
   - `watchdog.restartCooldownMs` (default: 120000 = 2min)
   - `watchdog.backoffSchedule` (default: [60000, 120000, 300000, 600000, 1800000, 3600000, 86400000])
   - `watchdog.maxBackoffMs` (default: 86400000 = 24h)
   - `watchdog.maxRestartAttempts` (default: null = unlimited)
5. Add metrics tracking:
   - Last restart timestamp per device
   - Consecutive restart attempt count
   - Current backoff delay (ms)
   - Next restart attempt timestamp
   - Watchdog state (active, cooldown, backoff, disabled)
6. Update Web UI to display watchdog status per device:
   - Current state badge (monitoring, cooldown, backing-off, paused)
   - Time until next restart attempt (if in cooldown/backoff)
   - Consecutive failure count
   - Last restart timestamp
   - Manual override to reset backoff counter
7. Add logging for cooldown/backoff events:
   - Log level INFO when entering cooldown
   - Log level WARN when entering backoff (with attempt count)
   - Log level ERROR after max attempts reached

## Tests

- Unit: Verify cooldown timer prevents immediate re-restart
- Unit: Verify backoff schedule progression (1min → 2min → 5min → 10min → 30min → 60min → 24h, then stays at 24h)
- Unit: Verify backoff counter persists across daemon restarts
- Unit: Verify backoff reset on successful device response
- Unit: Verify manual UI override resets backoff counter
- Integration: Simulate unresponsive device and verify backoff applied over time
- Integration: Verify watchdog state transitions (monitoring → cooldown → backoff)
- UI: Playwright test to verify cooldown/backoff status displayed in device card with countdown timer
- UI: Verify manual reset button works and updates state immediately

## Notes

- Should integrate with existing `ROADMAP-004` (Enhanced Watchdog Features)
- Backoff schedule is configurable via array for flexibility (can support exponential, linear, or custom patterns)
- Consider optional notification when device enters extended backoff (>1 hour)
- After reaching max backoff (24h), continue trying once per day indefinitely
- Manual device restart via UI should reset backoff counter (shows user action succeeded)
- Consider different cooldown periods for different restart actions (soft restart vs hard reboot)

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
