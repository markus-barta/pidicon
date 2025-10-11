# Development Backlog

**Active backlog for Pixoo Daemon project. Completed items moved to BACKLOG_DONE.md.**

**Last Updated**: 2025-10-11 (Build 601)  
**Status**: Production | **Version**: 2.0.0

---

## Quick Status

| Priority          | Count | Status                  |
| ----------------- | ----- | ----------------------- |
| P0 (Critical)     | 1     | 🔴 High priority        |
| P1 (Important)    | 4     | 🟡 Should have          |
| P2 (Nice to Have) | 5     | 🟢 Future consideration |
| Total Active      | 10    |                         |

---

## Critical Bugs & Issues

### BUG-020: Stop + Play Scene Restart (P0) 🔴

- **Status**: in_progress
- **Priority**: P0 (Critical - UX blocker)
- **Effort**: 4-6 hours
- **Risk**: Medium

**Problem**:

After pressing Stop, then Play, the scene sometimes shows only dark screen instead of restarting properly.
The issue is intermittent and related to scene state management during stop→play transitions.

**Analysis Needed**:

1. Verify cleanup is completing before init
2. Check generationId increments properly
3. Ensure devicePlayState transitions correctly
4. Validate scene state reset on stop

**Implementation Plan**:

1. Add comprehensive logging to track stop→play flow (IN PROGRESS)
2. Identify exact failure point from logs
3. Fix state transition race condition
4. Add integration test for stop→play→restart cycle
5. Verify with multiple scene types (static, animated, data)

**Acceptance Criteria**:

- [ ] Stop + Play reliably restarts scene (100% success rate)
- [ ] Scene initializes fully (not dark screen)
- [ ] Behavior identical to Restart button
- [ ] Works across all scene types
- [ ] No race conditions in state transitions

**Test Plan** (TEST-BUG-stop-play):

1. Select animated scene (e.g., performance-test)
2. Let it run for 5 seconds
3. Press Stop → verify screen clears
4. Press Play → verify scene restarts from beginning
5. Repeat 20 times → should succeed every time
6. Test with static scenes (startup, fill)
7. Test with data scenes (power_price, advanced_chart)

---

## High Priority (P1) - Should Have

### UI-504: WebSocket Integration (P1) ✅

- **Status**: completed (Build 602)
- **Priority**: P1 (Important - Performance & UX)
- **Effort**: 2-3 days
- **Risk**: Medium
- **Dependencies**: None

**Summary**: Replace HTTP polling with WebSocket for real-time device/scene state updates.

**Current Problem**:

- App polls every 5s for device state
- Device cards poll every 200ms for metrics
- Inefficient, creates unnecessary load
- Slight delay in seeing state changes
- Flashing during updates

**Implementation Plan**:

1. Add WebSocket server to Express backend (ws library)
2. Broadcast state changes to all connected clients:
   - Device state changes (scene switches)
   - Metrics updates (FPS, frametime)
   - Scene lifecycle events (start, stop, complete)
3. Create Vue composable `useWebSocket()`:
   - Auto-connect on page load
   - Auto-reconnect on disconnect
   - Integrate with Pinia stores
4. Add connection status indicator in header
5. Keep polling as fallback for compatibility
6. Add heartbeat/ping-pong (30s interval)

**Message Types**:

```javascript
// Initial connection
{ type: 'init', data: { devices: [...], scenes: [...] } }

// State updates
{ type: 'device_update', deviceIp: '...', data: {...} }
{ type: 'scene_switch', deviceIp: '...', scene: '...' }
{ type: 'metrics_update', deviceIp: '...', metrics: {...} }

// Heartbeat
{ type: 'ping' } / { type: 'pong' }
```

**Acceptance Criteria**:

- [ ] WebSocket connection on page load
- [ ] Real-time updates (< 100ms latency)
- [ ] Auto-reconnect on disconnect (5s backoff)
- [ ] Connection status indicator (green/yellow/red dot)
- [ ] Polling disabled when WebSocket connected
- [ ] Smooth updates without flashing
- [ ] Multiple clients stay synchronized

**Benefits**:

- **Performance**: Eliminate polling overhead
- **UX**: Instant updates, smoother experience
- **Scalability**: Better for multiple devices
- **Battery**: Less network activity on mobile

---

### TST-301: Improve Test Coverage (P1) 🟡

- **Status**: planned
- **Priority**: P1 (Quality & Maintainability)
- **Effort**: 3-5 days
- **Risk**: Low

**Summary**: Increase test coverage to 80%+ for all critical modules.

**Current Status**:

- Total tests: 152/152 passing
- Estimated coverage: ~65%
- Critical modules: Good coverage
- Edge cases: Some gaps
- Integration tests: Good
- E2E tests: Manual only

**Coverage Goals**:

| Module             | Current | Target | Priority |
| ------------------ | ------- | ------ | -------- |
| scene-manager.js   | ~70%    | 85%+   | High     |
| device-adapter.js  | ~75%    | 85%+   | High     |
| scene-framework.js | ~60%    | 80%+   | Medium   |
| graphics-engine.js | ~80%    | 85%+   | Medium   |
| mqtt-service.js    | ~75%    | 85%+   | High     |
| command-handlers   | ~80%    | 85%+   | Medium   |
| web/server.js      | ~50%    | 75%+   | Medium   |

**Implementation Plan**:

1. Add c8 (Istanbul) for coverage reporting
2. Run coverage analysis: `npm run coverage`
3. Identify untested code paths
4. Write unit tests for gaps:
   - Error handling paths
   - Edge cases (empty arrays, null values)
   - Boundary conditions
5. Add integration tests:
   - Multi-device scenarios
   - Concurrent scene switches
   - MQTT reconnection
6. Add coverage gates to CI/CD:
   - Fail if coverage < 80%
   - Require tests for new code

**Acceptance Criteria**:

- [ ] Overall coverage: 80%+
- [ ] Critical modules: 85%+
- [ ] Coverage report in CI/CD
- [ ] All edge cases tested
- [ ] Clear coverage badges in README

---

### PERF-301: Performance Optimizations (P1) 🟡

- **Status**: planned
- **Priority**: P1 (Polish & Scale)
- **Effort**: 2-3 days
- **Risk**: Low

**Summary**: Profile daemon under load, optimize hot paths.

**Current Performance**:

- Scene switch: ~150-200ms (good)
- Render cycle: ~50ms overhead (acceptable)
- Memory: Stable over 24h
- CPU: Low (< 5% typical)

**Optimization Opportunities**:

1. **Scene Loading**:
   - Cache scene modules (avoid re-require)
   - Lazy load scenes on demand
   - Preload frequently used scenes

2. **State Lookups**:
   - Use WeakMap for device state
   - Cache computed properties
   - Reduce Map lookups in hot paths

3. **MQTT**:
   - Batch state publishes (debounce 50ms)
   - Compress large payloads
   - QoS 0 for high-frequency metrics

4. **Metrics**:
   - Optimize frametime chart updates
   - Reduce memory churn in metrics arrays
   - Use circular buffers for history

**Implementation Plan**:

1. Add performance instrumentation:
   - `performance.mark()` / `performance.measure()`
   - Memory profiling with `process.memoryUsage()`
2. Create load test scripts:
   - Rapid scene switches (10/second)
   - 1000 switches over 5 minutes
   - Multi-device concurrent load
3. Profile with Node.js profiler:
   - `node --prof daemon.js`
   - Analyze with `0x` profiler
4. Identify top 10 hot paths
5. Optimize each hot path
6. Add performance regression tests
7. Document performance characteristics

**Acceptance Criteria**:

- [ ] Scene switch: < 150ms (p95)
- [ ] Render overhead: < 30ms
- [ ] Memory stable over 48h
- [ ] CPU < 5% during normal operation
- [ ] Performance tests in CI/CD

---

### DOC-011: API Documentation (P1) 🟡

- **Status**: planned
- **Priority**: P1 (Developer Experience)
- **Effort**: 2-3 days
- **Risk**: Low

**Summary**: Generate comprehensive API documentation for all public interfaces.

**Current State**:

- JSDoc comments: Inconsistent
- README files: Good but scattered
- Service layer APIs: Documented
- Web API: Partially documented
- Scene framework: Examples only

**Implementation Plan**:

1. **API Documentation Site**:
   - Use JSDoc or TypeDoc to generate HTML docs
   - Host on GitHub Pages
   - Include:
     - Service Layer APIs (SceneService, DeviceService, SystemService)
     - Command Handler APIs
     - Scene Framework (base classes, composition)
     - Graphics Engine (effects, animations)
     - Web REST API (OpenAPI/Swagger spec)

2. **Scene Development Guide**:
   - Step-by-step tutorial
   - Scene lifecycle explained
   - Code examples for each scene type
   - Best practices and patterns
   - Common pitfalls and solutions

3. **MQTT Protocol Documentation**:
   - Complete topic reference
   - Payload schemas
   - Command examples
   - State message formats

4. **Configuration Reference**:
   - All config options explained
   - Environment variable mapping
   - Default values
   - Validation rules

**Acceptance Criteria**:

- [ ] API docs generated and hosted
- [ ] Scene development tutorial complete
- [ ] MQTT protocol fully documented
- [ ] Configuration reference complete
- [ ] Examples for all major APIs
- [ ] Searchable documentation site

---

## Nice to Have (P2) - Future Consideration

### UI-505: Config Page (P2) 🟢

- **Status**: proposed
- **Priority**: P2 (Admin convenience)
- **Effort**: 3-4 days
- **Risk**: Medium
- **Dependencies**: CFG-501, CFG-502

**Summary**: Web-based configuration editor with validation and hot reload.

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

---

### CFG-501: Config Persistence (P2) 🟢

- **Status**: proposed
- **Priority**: P2 (Nice to have)
- **Effort**: 1-2 days
- **Risk**: Low

**Summary**: Add `/data` volume for persistent configuration.

**Current State**: Configuration via environment variables only. Lost on container restart.

**Implementation** (if needed):

1. Add `/data` directory in Docker image
2. Load config from `/data/config.json` (if exists)
3. Merge with environment variables (env overrides)
4. Document volume mount in README
5. Migration guide for existing users

**Recommendation**: Not critical. Current env var approach works well.

---

### CFG-502: Config API (P2) 🟢

- **Status**: proposed
- **Priority**: P2 (Depends on CFG-501)
- **Effort**: 1 day
- **Risk**: Low
- **Dependencies**: CFG-501

**Summary**: REST API for config management.

**Endpoints**:

- `GET /api/config` - Get current config (passwords masked)
- `POST /api/config` - Update config
- `POST /api/config/test` - Test config without saving
- `POST /api/config/reset` - Reset to defaults

**Recommendation**: Only if config persistence (CFG-501) is implemented.

---

### CFG-503: Config Hot Reload (P2) 🟢

- **Status**: proposed
- **Priority**: P2 (Convenience)
- **Effort**: 2 days
- **Risk**: Medium
- **Dependencies**: CFG-501, CFG-502

**Summary**: Apply config changes without daemon restart.

**Reloadable Settings**:

- MQTT broker/credentials (reconnect)
- Device list (add/remove)
- Device drivers (hot-swap)
- Scene list (rescan)

**Not Reloadable** (restart required):

- Web UI port
- Auth settings

**Recommendation**: Nice to have, but restart is acceptable for config changes.

---

### UI-601: Scene Editor (P2) 🟢

- **Status**: proposed
- **Priority**: P2 (Advanced feature)
- **Effort**: 5-7 days
- **Risk**: High

**Summary**: Visual scene editor in Web UI for creating/editing scenes without code.

**Features**:

- Visual canvas editor
- Drag-and-drop components
- Live preview
- Parameter editing
- Save to file
- Template library

**Rationale**: This would be a significant undertaking. Most users comfortable editing JavaScript files.
Consider only if there's strong demand.

**Recommendation**: Low priority. Code-based scenes work well for target audience.

---

### SCN-201: Scene Library Expansion (P2) 🟢

- **Status**: ongoing
- **Priority**: P2 (Content)
- **Effort**: Ongoing
- **Risk**: Low

**Summary**: Expand built-in scene library with useful smart home displays.

**Potential Scenes**:

1. **Weather Display**:
   - Current temp, conditions, forecast
   - Integration with OpenWeatherMap API
   - Icons for weather conditions

2. **Calendar/Agenda**:
   - Next 3 events from calendar
   - CalDAV integration
   - Countdown to next event

3. **Stock Ticker**:
   - Real-time stock prices
   - Multiple symbols
   - Color-coded gains/losses

4. **System Monitor**:
   - Server CPU/RAM/Disk
   - Network traffic
   - Service status

5. **Package Tracking**:
   - Delivery notifications
   - ETA countdown
   - Multiple carriers

6. **Fitness Tracker**:
   - Daily steps, calories
   - Workout stats
   - Progress toward goals

**Acceptance Criteria**:

- Each scene well-documented
- Metadata export for Web UI
- Robust error handling
- API key management
- Configurable refresh intervals

**Recommendation**: Add scenes as needed. Current library is solid foundation.

---

## Rejected / Not Doing

### ARC-306: Hexagonal Architecture ❌

**Status**: REJECTED (Overkill)

**Rationale**:

Hexagonal (ports & adapters) architecture is excellent for large, complex systems with multiple
integration points. However, for our project:

- **Current architecture is clean**: Service layer provides good abstraction
- **Limited integration points**: MQTT, HTTP, filesystem - all well-isolated
- **High refactoring cost**: 5-7 days of work
- **Minimal benefit**: Already testable with DI
- **Complexity overhead**: Would make codebase harder to understand
- **Team size**: Single/small team doesn't need this level of abstraction

**Decision**: Keep current service layer architecture. It's clean, testable, and appropriate for project scale.

---

### ARC-307: Repository Pattern ❌

**Status**: REJECTED (Unnecessary)

**Rationale**:

Repository pattern makes sense for applications with complex data access needs and multiple
storage backends. However, for our project:

- **Simple data model**: Scenes loaded from filesystem, state in memory
- **No database**: Everything is file-based or in-memory
- **No complex queries**: Simple Map lookups
- **Added abstraction without benefit**: Would complicate scene loading
- **Premature optimization**: No evidence we'll need multiple storage backends

**Decision**: Keep current simple approach. Scene loading via `scene-loader.js` is straightforward
and fits our needs perfectly.

---

## Backlog Hygiene Rules

### Adding New Items

1. Use next available ID in sequence (e.g., UI-601, BUG-021, SCN-202)
2. Include: Status, Priority, Effort, Risk, Dependencies
3. Write clear problem statement
4. Define acceptance criteria
5. Outline test plan

### Prioritization

- **P0 (Critical)**: Blocks users, data loss, security issues
- **P1 (Important)**: Significant value, should do soon
- **P2 (Nice to Have)**: Future consideration, low urgency

### Moving to BACKLOG_DONE.md

When item completed:

1. Update status to "completed"
2. Record final build/commit
3. Document test results
4. Move entire section to BACKLOG_DONE.md (prepend to top)
5. Remove from active BACKLOG.md

### Rejection Criteria

Move to "Rejected / Not Doing" section if:

- Overkill for project scale
- Better solution exists
- Low ROI (effort >> benefit)
- Technical debt would increase
- Unnecessary complexity

---

## Contributing

See STANDARDS.md for development guidelines.  
See SCENE_DEVELOPMENT.md for scene creation guide.  
See ARCHITECTURE.md for system design overview.

---

**Current Focus**: All critical items completed! 🎉  
**Next Up**: Continue improving test coverage incrementally

**Questions?** Check documentation or open an issue.
