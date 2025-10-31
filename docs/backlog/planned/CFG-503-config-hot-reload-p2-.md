# CFG-503: Config Hot Reload (P2) 🟢

**Status**: proposed | **Priority**: P2 (Convenience)
**Effort**: 2 days | **Risk**: Medium

## Problem

Apply config changes without daemon restart.
**Reloadable Settings**:

- MQTT broker/credentials (reconnect)
- Device list (add/remove)
- Device drivers (hot-swap)
- Scene list (rescan)
  **Not Reloadable** (restart required):
- Web UI port
- Auth settings
  **Recommendation**: Nice to have, but restart is acceptable for config changes.
