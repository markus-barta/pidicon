# UI-505: Config Page (P2) 🟢

**Status**: Planned | **Priority**: P2 (Admin convenience)
**Effort**: 3-4 days | **Risk**: Medium

## Problem

Web-based configuration editor with validation and hot reload.
**Rationale**:
Currently config via environment variables works well. A web UI would be convenient but not essential.
Consider implementing if there's demand from users.
**Features** (if implemented):

- Edit MQTT settings (broker, credentials)
- Manage device list (add/remove/edit)
- Configure Web UI settings
- Test MQTT connection
- Save to `/data/config.json`
- Hot reload without restart
- Import/export config (JSON)
  **Recommendation**: Wait for user feedback before implementing.
