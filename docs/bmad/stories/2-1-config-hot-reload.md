# Story 2.1: Config Hot-Reload

**Story ID:** 2-1-config-hot-reload  
**Epic:** Epic 2 - Configuration & Observability  
**Status:** Backlog  
**Priority:** P2  
**Points:** 5  
**Owner:** mba

---

## User Story

As a **PIDICON administrator**,  
I want **configuration changes to apply without restarting the daemon**,  
So that **I can tune settings quickly without service interruption**.

---

## Context

Currently, any configuration change (MQTT settings, device list, scene updates) requires a full daemon restart. This is inconvenient for:

- Production environments (causes brief service interruption)
- Development iteration (slows down config testing)
- Remote administration (requires reconnection after restart)

**Reloadable Settings:**

- MQTT broker/credentials (reconnect required)
- Device list (add/remove devices)
- Device drivers (hot-swap)
- Scene list (rescan)

**Not Reloadable** (restart required):

- Web UI port
- Authentication settings
- Core daemon configuration

---

## Acceptance Criteria

### AC1: Configuration File Watching

- [ ] Watch `daemon.json` for changes using file system watcher
- [ ] Watch `config.yml` if present
- [ ] Detect changes within 1 second of file save
- [ ] Debounce rapid changes (wait 500ms after last change)

### AC2: Configuration Validation

- [ ] Validate configuration before applying
- [ ] Use existing JSON schema validation
- [ ] Check for syntax errors (malformed JSON/YAML)
- [ ] Check for semantic errors (invalid IPs, missing required fields)
- [ ] Validate MQTT connectivity before applying new broker settings

### AC3: Hot Reload Process

- [ ] Load new configuration from file
- [ ] Validate completely before making any changes
- [ ] Apply changes atomically where possible
- [ ] Rollback to previous config on validation failure
- [ ] Log reload start, success, and failure events

### AC4: MQTT Hot-Reload

- [ ] Disconnect from old MQTT broker gracefully
- [ ] Connect to new broker with new credentials
- [ ] Re-establish device subscriptions
- [ ] Preserve device state during transition
- [ ] Handle reconnection timeout (max 10 seconds)

### AC5: Device List Hot-Reload

- [ ] Add new devices without restart
- [ ] Remove deleted devices gracefully (cleanup subscriptions)
- [ ] Update modified device configurations
- [ ] Preserve connection state for unchanged devices
- [ ] Clean up removed device state from StateStore

### AC6: Scene List Hot-Reload

- [ ] Rescan scene directories for new/removed scenes
- [ ] Hot-reload modified scene files (existing feature)
- [ ] Update scene registry
- [ ] Notify connected clients of scene list changes

### AC7: REST API Endpoint

- [ ] Add `POST /api/system/reload-config` endpoint
- [ ] Trigger manual reload on request
- [ ] Return validation errors if config invalid
- [ ] Return success with applied changes list
- [ ] Require authentication (if auth enabled)

### AC8: WebSocket Notifications

- [ ] Broadcast `config_reloaded` event to all clients
- [ ] Include list of changed settings (high-level)
- [ ] Include reload timestamp
- [ ] Show toast notification in UI

### AC9: UI Configuration

- [ ] Add "Reload Configuration" button in System settings
- [ ] Show last reload timestamp
- [ ] Display reload status (success/failure)
- [ ] Show validation errors in UI on failure
- [ ] Confirm before manual reload (with checkbox for auto-reload)

### AC10: Error Handling

- [ ] Preserve current config if new config invalid
- [ ] Log detailed error messages
- [ ] Show user-friendly error in UI
- [ ] Auto-retry on transient errors (file locked, etc.)
- [ ] Emit error event to monitoring systems

---

## Technical Design

### Configuration Watcher Service

```javascript
class ConfigWatcher {
  constructor(configPath, logger) {
    this.watcher = fs.watch(configPath, this.handleChange.bind(this));
    this.debounceTimer = null;
  }

  handleChange(eventType, filename) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.triggerReload();
    }, 500);
  }

  async triggerReload() {
    const newConfig = await this.loadConfig();
    const validation = await this.validateConfig(newConfig);
    if (validation.valid) {
      await this.applyConfig(newConfig);
    } else {
      this.logger.error('Config validation failed', validation.errors);
    }
  }
}
```

### Reload Sequence

1. **Detect Change** - File watcher triggers after debounce
2. **Load Config** - Read file from disk
3. **Validate** - Run through validation schema
4. **Apply** - Execute hot-reload for changed sections
5. **Notify** - Broadcast to WebSocket clients
6. **Log** - Record reload event with changes

### State Management

- Store previous config in memory for rollback
- Track reload history (last 10 reloads)
- Persist reload timestamp to StateStore
- Include reload count in system metrics

---

## Tasks

### Task 1: Configuration Watcher (4h)

- [ ] 1.1: Implement `ConfigWatcher` service
- [ ] 1.2: Add debouncing for rapid changes
- [ ] 1.3: Handle file system errors gracefully
- [ ] 1.4: Test with actual file modifications

### Task 2: Validation Layer (3h)

- [ ] 2.1: Extract existing validation logic
- [ ] 2.2: Add pre-reload validation hooks
- [ ] 2.3: Implement rollback on validation failure
- [ ] 2.4: Test with invalid configurations

### Task 3: MQTT Hot-Reload (4h)

- [ ] 3.1: Graceful MQTT disconnect
- [ ] 3.2: Reconnect to new broker
- [ ] 3.3: Re-establish subscriptions
- [ ] 3.4: Handle connection timeout
- [ ] 3.5: Test with broker failover

### Task 4: Device List Hot-Reload (3h)

- [ ] 4.1: Detect device additions
- [ ] 4.2: Detect device removals
- [ ] 4.3: Detect device modifications
- [ ] 4.4: Clean up removed device state
- [ ] 4.5: Test with add/remove scenarios

### Task 5: REST API & WebSocket (2h)

- [ ] 5.1: Add `POST /api/system/reload-config` endpoint
- [ ] 5.2: Implement WebSocket `config_reloaded` event
- [ ] 5.3: Add authentication check
- [ ] 5.4: Return detailed reload status

### Task 6: UI Integration (3h)

- [ ] 6.1: Add "Reload Configuration" button
- [ ] 6.2: Display last reload timestamp
- [ ] 6.3: Show validation errors
- [ ] 6.4: Add toast notification on reload
- [ ] 6.5: Test UI reload flow

### Task 7: Testing (3h)

- [ ] 7.1: Unit tests for ConfigWatcher
- [ ] 7.2: Integration tests for hot-reload
- [ ] 7.3: E2E tests for UI reload button
- [ ] 7.4: Test error scenarios
- [ ] 7.5: Test rollback on failure

### Task 8: Documentation (1h)

- [ ] 8.1: Update API.md with reload endpoint
- [ ] 8.2: Document reloadable vs non-reloadable settings
- [ ] 8.3: Add troubleshooting guide
- [ ] 8.4: Update ARCHITECTURE.md

**Total Estimated Effort:** ~23 hours (~3 days)

---

## Testing Strategy

### Unit Tests

- Config file parsing and validation
- Debounce timer logic
- Validation error handling
- Rollback logic

### Integration Tests

- Full reload cycle with real config changes
- MQTT reconnection with broker swap
- Device add/remove scenarios
- Scene list refresh

### E2E Tests

- UI button triggers reload
- Toast notifications appear
- Validation errors displayed
- Device list updates after reload

### Manual Tests

- Modify `daemon.json` while running
- Verify no service interruption
- Test with invalid JSON
- Test with unreachable MQTT broker

---

## Dependencies

- Existing config validation (schema)
- MQTT client reconnection logic
- WebSocket broadcast infrastructure
- StateStore for device management

---

## Risks & Mitigations

| Risk                                     | Impact | Probability | Mitigation                                     |
| ---------------------------------------- | ------ | ----------- | ---------------------------------------------- |
| Partial reload leaves inconsistent state | High   | Medium      | Atomic operations, rollback on failure         |
| File watcher misses changes              | Medium | Low         | Test with various editors, fallback to polling |
| MQTT reconnection timeout                | Medium | Medium      | Configurable timeout, clear error messages     |
| Memory leak from watchers                | Low    | Low         | Proper cleanup on daemon shutdown              |

---

## Success Criteria

- Config changes apply within 2 seconds
- Zero service interruption for reloadable settings
- Validation catches 100% of invalid configs
- UI displays clear success/failure feedback
- All tests passing
- Production stability maintained

---

## Notes

**Recommendation from original backlog:** "Nice to have, but restart is acceptable for config changes."

**Decision:** Implement as P2 (convenience feature). Focus on developer experience and production admin convenience. Not critical path for v3.3.

**Future Enhancement:** Auto-reload on file change (optional setting).

---

## Change Log

| Date       | Author | Change                       |
| ---------- | ------ | ---------------------------- |
| 2025-11-09 | Bob/SM | Created from backlog CFG-503 |
