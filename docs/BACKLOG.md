# Development Backlog

**Active backlog for PIDICON (Pixel Display Controller). Completed items moved to BACKLOG_DONE.md.**

**Last Updated**: 2025-10-13 (Build #697)  
**Status**: Production | **Version**: 3.1.0  
**Recent**: ✅ Persistent config storage, ✅ GitHub rename complete

---

## Quick Status

| Priority          | Count | Status                  |
| ----------------- | ----- | ----------------------- |
| P0 (Critical)     | 0     | ✅ All resolved         |
| P1 (Important)    | 6     | 🟡 Multi-device roadmap |
| P2 (Nice to Have) | 8     | 🟢 Future consideration |
| Total Active      | 14    |                         |

---

## 🌐 Multi-Device Roadmap (v3.0+)

**Context**: PIDICON v3.0 introduced multi-device support with abstract DeviceDriver interface, DisplayCapabilities system, and web-based device configuration.

**Current Status**:

- ✅ Core architecture complete (DeviceDriver, DisplayCapabilities)
- ✅ Pixoo driver fully functional (100% feature parity)
- ✅ AWTRIX driver stub prepared (interface ready)
- ✅ Web UI for device management
- ✅ Watchdog service
- ✅ Device-agnostic Graphics Engine
- ✅ Scene framework supports capabilities
- ✅ Persistent config storage (/data mount) - Build #697
- ✅ GitHub repository renamed (pidicon) - Build #695

### ROADMAP-001: AWTRIX Driver Implementation (P1) 🟡

- **Priority**: P1 (Important)
- **Effort**: 10-15 hours (8 hours spent)
- **Risk**: Medium (MQTT complexity)
- **Status**: 🟡 In Progress - Core driver complete, integration pending

**Goal**: Full AWTRIX 3 device support via MQTT protocol

**Tasks**:

1. ✅ MQTT client integration (`mqtt` package) - Uses existing MqttService
2. ✅ Topic structure implementation (`awtrix_<id>/notify`, `/custom/<app>`)
3. ✅ CustomApp API (text + icon rendering)
4. ✅ Icon library mapping (8-bit icons)
5. ✅ Audio/RTTTL support (beeper, melodies)
6. ✅ Settings API (brightness, sleep mode)
7. ✅ Notification API (temporary text overlays)
8. ⏸️ State synchronization (device → daemon) - Pending integration

**Acceptance Criteria**:

- [x] MQTT connection established ✅
- [x] Text rendering works via CustomApp ✅
- [x] Icons display correctly ✅
- [x] Audio/RTTTL playback functional ✅
- [x] Brightness control works ✅
- [ ] Scenes run on AWTRIX hardware (needs DeviceAdapter integration)
- [ ] Watchdog integration (needs DeviceAdapter integration)
- [ ] Web UI shows AWTRIX device status (needs DeviceAdapter integration)

**Completed (Build #700)**:

- ✅ AWTRIX driver implementation with full MQTT support
- ✅ AwtrixCanvas compatibility layer for scenes
- ✅ Complete constants and API definitions
- ✅ Settings, notifications, custom apps, audio support

**Remaining Work**:

- DeviceAdapter integration (make AWTRIX devices selectable)
- Device configuration UI updates
- Testing with real AWTRIX hardware
- Example scenes optimized for 32x8 display

**References**:

- AWTRIX 3 API: <https://blueforcer.github.io/awtrix3/#/api>
- Driver implementation: `lib/drivers/awtrix/awtrix-driver.js`
- Canvas adapter: `lib/drivers/awtrix/awtrix-canvas.js`
- Constants: `lib/drivers/awtrix/constants.js`

---

### ROADMAP-002: Scene Dimension Adapter (P1)

- **Priority**: P1 (Important)
- **Effort**: 3-5 hours
- **Risk**: Low
- **Status**: Not Started

**Goal**: Auto-adapt existing Pixoo scenes to AWTRIX and other display sizes

**Features**:

- Auto-scale graphics to fit different resolutions
- Crop/letterbox options for aspect ratio mismatch
- Font size adaptation (smaller displays = smaller text)
- Layout compression (reduce margins for small displays)
- Optional scene compatibility matrix UI

**Tasks**:

1. Create `SceneDimensionAdapter` class
2. Implement scaling algorithms (nearest-neighbor, bilinear)
3. Add crop/letterbox modes
4. Font size auto-adjustment
5. Test with Pixoo 64x64 → AWTRIX 32x8 conversion
6. Add compatibility matrix to Web UI

**Use Cases**:

- Run `pixoo_showcase` on AWTRIX (scaled down)
- Run `power_price` chart on smaller displays
- Universal scenes work on any device

---

### ROADMAP-003: Device Auto-Discovery (P2)

- **Priority**: P2 (Nice to Have)
- **Effort**: 5-8 hours
- **Risk**: Medium (network scanning)
- **Status**: Not Started

**Goal**: Automatically detect pixel displays on the network

**Features**:

- Pixoo device discovery (mDNS/SSDP)
- AWTRIX device discovery (MQTT broker scan)
- Network scanner for unknown devices
- "Add Discovered Device" button in Web UI
- Auto-detect device type and capabilities

**Tasks**:

1. Implement mDNS scanner for Pixoo
2. Implement MQTT discovery for AWTRIX
3. Create discovery service (`lib/services/discovery-service.js`)
4. Add REST API endpoint `/api/devices/discover`
5. Add "Discover Devices" button to Web UI
6. Show discovered devices in modal with "Add" button

**Security**:

- Only scan local network (192.168.x.x, 10.x.x.x)
- User must manually approve before adding device
- No automatic configuration changes

---

### ROADMAP-004: Enhanced Watchdog Features (P1)

- **Priority**: P1 (Important)
- **Effort**: 3-5 hours
- **Risk**: Low
- **Status**: Partially Complete (basic watchdog exists)

**Goal**: More robust device health monitoring and recovery

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

**Tasks**:

1. Add notification channels (email, SMS, webhook)
2. Implement retry logic with backoff
3. Create failure history store
4. Add pattern detection (flapping alerts)
5. Add metrics dashboard to Web UI
6. Email/webhook configuration UI

---

### ROADMAP-005: Multi-Device Scene Manager (P2)

- **Priority**: P2 (Nice to Have)
- **Effort**: 3-5 hours
- **Risk**: Low
- **Status**: Not Started

**Goal**: Run different scenes on different devices simultaneously

**Current Limitation**: All devices run the same scene (or manually switch)

**Features**:

- Per-device scene selection in Web UI
- Scene compatibility matrix (which scenes work on which devices)
- Scene recommendations based on device capabilities
- Bulk scene switching (set all devices at once)
- Scene groups (living room, bedroom, kitchen)

**Use Cases**:

- Pixoo in living room shows `power_price`
- AWTRIX in kitchen shows `clock`
- Pixoo in bedroom shows `pixoo_showcase`

**Tasks**:

1. Update state management to support per-device scenes
2. Add scene compatibility checks
3. Create scene recommendation engine
4. Update Web UI for per-device scene control
5. Add scene groups feature

---

### ROADMAP-006: Device Profiles & Testing UI (P2)

- **Priority**: P2 (Nice to Have)
- **Effort**: 2-3 hours
- **Risk**: Low
- **Status**: Not Started

**Goal**: Visual device capability display and per-device testing

**Features**:

- Visual capability matrix (table showing all devices + features)
- Device type switcher (test scenes on different virtual devices)
- Test mode per device (preview scenes before deploying)
- Capability comparison tool (compare 2 devices side-by-side)
- Scene simulator (render scene to PNG without hardware)

**Tasks**:

1. Create `DeviceProfilesView.vue`
2. Add capability visualization component
3. Implement device simulator
4. Add test mode toggle
5. Scene preview/simulator

---

### ROADMAP-007: Configuration Backup & Sync (P2)

- **Priority**: P2 (Nice to Have)
- **Effort**: 2-3 hours
- **Risk**: Low
- **Status**: Not Started

**Goal**: Backup and restore device configurations

**Features**:

- Automatic config backups (daily, weekly)
- Export config as JSON (download)
- Import config from JSON (upload)
- Cloud sync (optional, via user's S3/Dropbox)
- Config versioning (rollback to previous version)
- Migration tool (v2.x → v3.x config conversion)

**Tasks**:

1. Implement backup service
2. Add export/import to Web UI
3. Create config versioning system
4. Optional: Cloud sync integration
5. Migration tool for old configs

---

### ROADMAP-008: Additional Device Support (P2)

- **Priority**: P2 (Nice to Have)
- **Effort**: Varies (5-15 hours per device)
- **Risk**: Medium to High (device-specific)
- **Status**: Not Started

**Goal**: Support more pixel display devices

**Candidates**:

1. **WS2812B LED Strips** (variable dimensions)
   - Protocol: SPI/Serial
   - Driver complexity: Medium
   - Use case: Ambient lighting, signs

2. **MAX7219 Matrix Displays** (8x8, 16x16, 32x8)
   - Protocol: SPI
   - Driver complexity: Low
   - Use case: DIY displays, cheap matrices

3. **Generic MQTT Displays**
   - Protocol: MQTT (configurable topics)
   - Driver complexity: Low
   - Use case: Custom displays, ESP32 projects

4. **HUB75 RGB Panels** (64x32, 128x64)
   - Protocol: Parallel GPIO (via Raspberry Pi)
   - Driver complexity: High
   - Use case: Large outdoor displays

**Priority Order**:

1. Generic MQTT (low effort, high flexibility)
2. WS2812B (popular, medium effort)
3. MAX7219 (simple, low effort)
4. HUB75 (complex, high effort, low demand)

---

### ROADMAP-009: Plugin System (P2)

- **Priority**: P2 (Future)
- **Effort**: 8-12 hours
- **Risk**: High (architecture change)
- **Status**: Not Started

**Goal**: Dynamic driver loading and community contributions

**Features**:

- NPM package-based drivers (`pidicon-driver-<device>`)
- Driver registry and discovery
- Automatic driver installation via Web UI
- Driver marketplace (list community drivers)
- Version management and updates
- Security: sandboxed driver execution

**Architecture**:

```javascript
// Dynamic driver loading
const MyDriver = require('pidicon-driver-mydevice');
deviceAdapter.registerDriver('mydevice', MyDriver);
```

**Community Benefits**:

- Anyone can add device support
- No need to fork PIDICON
- Faster ecosystem growth
- Share drivers on npm

---

### ROADMAP-010: Scene Marketplace (P2)

- **Priority**: P2 (Future)
- **Effort**: 10-15 hours
- **Risk**: Medium (moderation required)
- **Status**: Not Started

**Goal**: Community scene sharing and discovery

**Features**:

- Browse public scenes by category
- One-click install scene from marketplace
- Scene ratings and reviews
- Upload your own scenes
- Device compatibility filters
- Scene preview GIFs/videos

**Categories**:

- Productivity (clocks, timers, counters)
- Home Automation (sensors, energy, weather)
- Entertainment (animations, games, art)
- Information (news, stocks, crypto)
- Ambient (colors, gradients, effects)

**Moderation**:

- Manual review before publishing
- Report inappropriate scenes
- DMCA takedown process
- Terms of use enforcement

---

## Critical Bugs & Issues

### BUG-021: Real Device "Last Seen" Tracking (P0) ✅

- **Status**: completed (Build 603)
- **Priority**: P0 (Critical - User requested 3x!)
- **Effort**: 1 hour
- **Risk**: Low
- **Dependencies**: None

**Summary**: Track and display when real hardware device last gave definitive ACK.

**Implementation**:

- `lib/device-adapter.js:209-215`: Added `lastSeenTs` to metrics
- `lib/device-adapter.js:312-316`: Set `lastSeenTs` only on real hardware ACK
- `web/frontend/src/components/DeviceCard.vue:536-565`: Display relative time next to IP

**Features**:

- ✅ Real device shows accurate "last seen" timestamp
- ✅ Mock device shows "N/A"
- ✅ Updates in real-time via WebSocket (event-driven)
- ✅ Positioned next to IP in device card header
- ✅ User-friendly format: "Just now", "3s ago", "5m ago", "2h ago"
- ✅ Shows "Never" if real device has no ACK yet
- ✅ Only tracks REAL hardware responses (not mock)

---

### BUG-020: Stop + Play Scene Restart (P0) ✅

- **Status**: completed (Build 603)
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

### CFG-501: Config Persistence (P2) ✅

- **Status**: completed (Build #697)
- **Priority**: P2
- **Effort**: 1 day (actual)
- **Risk**: Low

**Summary**: Persistent device configuration via `/data` volume mount.

**Implementation Complete**:

1. ✅ `/data` directory in Dockerfile
2. ✅ Auto-detect `/data` mount at runtime
3. ✅ Priority: explicit > env var > /data > fallback
4. ✅ Documentation: `docs/CONFIG_PERSISTENCE.md`
5. ✅ Logging of config path on startup

**Files Changed**:

- `lib/device-config-store.js` - Auto-detection logic
- `Dockerfile` - Create /data directory
- `docs/CONFIG_PERSISTENCE.md` - Complete guide

**Migration**: See `docs/CONFIG_PERSISTENCE.md` for deployment guide.

---

### CFG-502: Config API (P2) ✅

- **Status**: completed (Build #600s)
- **Priority**: P2
- **Effort**: Done
- **Risk**: Low

**Summary**: REST API for device configuration management.

**Implementation**: Already exists in `web/server.js`:

- ✅ `GET /api/config/devices` - List devices
- ✅ `POST /api/config/devices` - Add device
- ✅ `PUT /api/config/devices/:ip` - Update device
- ✅ `DELETE /api/config/devices/:ip` - Remove device
- ✅ Web UI for device management (Settings page)

**Note**: This was already implemented as part of Phase 9 (Web UI).

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

### BACKLOG-045: Per-Device MQTT Override (P1)

- **Priority**: P1 (Important)
- **Effort**: 6-8 hours
- **Risk**: Medium (security, UI complexity)
- **Status**: Not Started

**Goal**: Allow overriding global MQTT credentials/settings for individual devices.

**Notes**:

- Depends on global MQTT secrets store (Build #772).
- Required for mixed-environment setups (multiple brokers, custom auth).
- Must ensure per-device overrides remain encrypted at rest.

**Tasks**:

1. Extend device schema/config UI to capture optional MQTT overrides (host/port/credentials/TLS).
2. Persist overrides securely (reuse secrets store or per-device envelope).
3. Update `MqttService` and device adapter to use override when present.
4. Provide merge strategy and validation in Web UI + API.
5. Document fallback rules (device override → global → defaults).
6. Add tests (unit & Playwright) covering override set/reset flows.

**Related**: BACKLOG-021 (Multi-broker support), Build #772 (Global MQTT settings).

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
