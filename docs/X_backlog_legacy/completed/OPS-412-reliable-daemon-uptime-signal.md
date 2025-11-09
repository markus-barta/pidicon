# OPS-412: Reliable Daemon Uptime Signal

**Status**: Completed (2025-10-21) | **Priority**: P1 (Important)
**Effort**: 6-8 hours | **Owner**: mba

## Problem

Header uptime counter continues to increment while the daemon is offline because it depends on
client-side timers instead of authoritative runtime metadata.

## Goal

Persist true daemon start and heartbeat timestamps server-side and expose them via API so the UI
displays accurate uptime and highlights outages quickly.

## Tasks

1. Persist daemon start timestamp and periodic heartbeat (state store or dedicated atomic file).
2. Extend `SystemService`/`/api/status` to return real uptime seconds, formatted uptime string, and
   stale-heartbeat indicator.
3. Update `SystemStatus.vue` to use new fields, pausing/resuming counters accordingly and surfacing downtime
   messaging.
4. Add unit/UI tests covering restart, downtime, and resume scenarios.
   **Risks**:

- Clock drift between daemon and UI host.
- Persistence survival after abrupt termination.
  **Success Metrics**:
- Uptime resets within <2s after daemon restart.
- UI stops incrementing uptime within <5s when daemon unresponsive.
- CI tests validating uptime persistence pass.
