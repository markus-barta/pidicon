# ROADMAP-004: Enhanced Watchdog Features

**Status**: Planned | **Priority**: P1 (Important)
**Effort**: 3-5 hours | **Risk**: Low

## Goal

More robust device health monitoring and recovery
**Current Features** (v3.0):

- ✅ Track `lastSeenTs` per device
- ✅ Configurable timeout thresholds
- ✅ Actions: restart, fallback-scene, mqtt-command, notify
  **New Features**:
- Email/SMS notifications on device failure
- Webhook support (POST to external URL)
- Retry logic with exponential backoff
- Historical failure tracking (last 100 events)
- Failure pattern detection (flapping devices)
- Auto-disable watchdog if device offline >24h
- Recovery success metrics

## Tasks

1. Add notification channels (email, SMS, webhook)
2. Implement retry logic with backoff
3. Create failure history store
4. Add pattern detection (flapping alerts)
5. Add metrics dashboard to Web UI
6. Email/webhook configuration UI
