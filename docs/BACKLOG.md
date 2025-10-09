# Development Backlog

This backlog tracks the plan and tests for the centralized scene scheduler,
per-device state machine, and robust scene switching. It is the single source
of truth for upcoming work and its validation status.

---

## Summary Table

| ID       | TODO                                                                   | State       | Test Name              | Last Test Result           | Last Test Run        |
| -------- | ---------------------------------------------------------------------- | ----------- | ---------------------- | -------------------------- | -------------------- |
| SSM-001  | Per-device scene state machine; genId; MQTT mirror                     | completed   | TEST-SSM-basic         | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| SCH-002  | Central per-device scheduler; remove scene-owned timers                | completed   | TEST-SCH-loop-stop     | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| GATE-003 | Gate inputs by (device, scene, generation); drop stale continuations   | completed   | TEST-GATE-stale-drop   | pass (real, 348/0ba467e)   | 2025-09-18T15:02:40Z |
| REF-004  | Refactor all scenes to pure render; no self-MQTT/timers                | completed   | TEST-REF-scenes-pure   | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| MDEV-005 | Multi-device isolation; parallel schedulers                            | completed   | TEST-MDEV-dual-device  | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| CFG-006  | Configurable topic base and state keys                                 | completed   | TEST-CFG-topic-base    | pass (real, 338/54f35c6)   | 2025-09-17T18:26:49Z |
| OBS-007  | Observability: publish `/home/pixoo/<ip>/scene/state`; log stale drops | completed   | TEST-OBS-state-publish | pass (real, 373/13e814d)   | 2025-09-19T20:15:00Z |
| TST-008  | Automation: mock-driver integration tests + manual scripts             | completed   | TEST-TST-harness       | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| SOAK-009 | Stability: 30–60 min soak with frequent switches                       | postponed   | TEST-SOAK-stability    | -                          | -                    |
| DOC-010  | Documentation: dev guide, git readme and backlog hygiene               | in_progress | TEST-DOC-checklist     | pass (readme updated)      | 2025-09-18T17:50:38Z |
| ARC-101  | Architecture audit & alignment with standards                          | completed   | TEST-ARC-audit         | pass (review, build 449)   | 2025-09-30T18:00:00Z |
| API-201  | Unified Device API: Single drawing interface with consistent naming    | completed   | TEST-API-unified       | pass (manual test)         | 2025-09-20T17:15:00Z |
| FRM-202  | Scene Framework: Base classes, composition, and standardized patterns  | completed   | TEST-FRM-composition   | pass (manual test)         | 2025-09-20T17:30:00Z |
| GFX-203  | Graphics Engine: Advanced rendering, animation system, resource cache  | completed   | TEST-GFX-engine        | -                          | -                    |
| CFG-204  | Configuration Enhancements: Validation and presets                     | completed   | TEST-CFG-validation    | -                          | -                    |
| TST-205  | Testing Framework: Scene unit tests, integration tests, performance    | planned     | TEST-TST-framework     | -                          | -                    |
| CON-102  | Consistency pass: naming, contracts, return values                     | completed   | TEST-CON-contracts     | pass (audit, 259/47cabd0)  | 2025-09-19T19:05:00Z |
| CLN-103  | Cleanup: dead code, dev overrides, unused branches                     | completed   | TEST-CLN-deadcode      | pass (review, 259/47cabd0) | 2025-09-19T19:05:00Z |
| REL-104  | Release checklist for public v1.1: final smoke & notes                 | completed   | TEST-REL-smoke         | pass (real, 373/13e814d)   | 2025-09-19T20:17:00Z |
| ARC-301  | Extract MQTT Service: Decouple MQTT logic from daemon.js               | completed   | TEST-ARC-mqtt-service  | pass (89/89 tests)         | 2025-09-30T22:00:00Z |
| ARC-302  | Implement Dependency Injection: Add DI container for testability       | completed   | TEST-ARC-di-container  | pass (43/43 tests)         | 2025-09-30T20:20:00Z |
| ARC-303  | Consolidate State Management: Single source of truth for state         | completed   | TEST-ARC-state-store   | pass (96/96 tests)         | 2025-09-30T23:00:00Z |
| ARC-304  | Extract Command Handlers: Separate command processing logic            | completed   | TEST-ARC-cmd-handlers  | pass (107/107 tests)       | 2025-10-02T18:30:00Z |
| BUG-012  | Critical: MQTT routing broken after Phase 2 refactoring                | completed   | TEST-BUG-mqtt-routing  | pass (143/143 tests)       | 2025-10-02T19:15:00Z |
| BUG-013  | Critical: StateCommandHandler missing 100+ lines of logic              | completed   | TEST-BUG-state-handler | pass (152/152 tests)       | 2025-10-02T19:45:00Z |
| TST-302  | Add proper integration tests for command handlers                      | completed   | TEST-TST-cmd-integ     | pass (152/152 tests)       | 2025-10-02T20:00:00Z |
| TST-303  | Add device-adapter.js comprehensive tests                              | completed   | TEST-TST-device-adapt  | pass (36 tests)            | 2025-10-02T21:00:00Z |
| REV-301  | Code quality review: magic numbers, complexity, standards              | completed   | TEST-REV-code-quality  | pass (5/5 rating)          | 2025-10-02T21:30:00Z |
| REV-302  | Performance review: hot paths, memory, optimization opportunities      | completed   | TEST-REV-performance   | pass (4/5 rating)          | 2025-10-02T22:00:00Z |
| DOC-301  | Documentation polish: consistency, Phase 2 reports, structure          | completed   | TEST-DOC-polish        | pass (updated)             | 2025-10-02T22:30:00Z |
| ARC-305  | Add Service Layer: Business logic abstraction                          | completed   | TEST-ARC-service-layer | pass (152/152 tests)       | 2025-10-02T23:00:00Z |
| UI-401   | Web UI: Control panel for scene/device management                      | completed   | TEST-UI-web-panel      | pass (152/152 tests)       | 2025-10-02T23:00:00Z |
| UI-501   | Modern UI Framework: Migrate to Vue 3 + Vuetify 3                      | completed   | TEST-UI-vue-setup      | pass (manual test)         | 2025-10-03T20:00:00Z |
| UI-502   | Toast Notifications: Replace alerts with Vuetify snackbars             | completed   | TEST-UI-toasts         | pass (manual test)         | 2025-10-03T20:00:00Z |
| UI-503   | Collapsible Cards: Per-device expand/collapse with localStorage        | planned     | TEST-UI-collapse       | -                          | -                    |
| UI-504   | WebSocket Integration: Real-time updates without polling               | planned     | TEST-UI-websocket      | -                          | -                    |
| UI-505   | Config Page: Web-based configuration editor with persistence           | planned     | TEST-UI-config         | -                          | -                    |
| UI-506   | Scene Time: Stop timer when scene completes (testCompleted)            | completed   | TEST-UI-scene-timer    | pass (manual, build 547)   | 2025-10-08T20:00:00Z |
| UI-507   | Chart Updates: Faster polling for smoother chart visualization         | completed   | TEST-UI-chart-poll     | pass (manual, build 547)   | 2025-10-08T20:00:00Z |
| UI-508   | State Sync: Detect actual Pixoo state on UI connect/refresh            | completed   | TEST-UI-state-sync     | pass (manual, build 547)   | 2025-10-08T20:00:00Z |
| UI-509   | Scene Metadata Viewer: Display scene payload/config when selected      | completed   | TEST-UI-metadata       | pass (manual, build 565)   | 2025-10-08T21:00:00Z |
| CFG-501  | Config Persistence: /data volume for persistent configuration          | planned     | TEST-CFG-persist       | -                          | -                    |
| CFG-502  | Config API: REST endpoints for config management                       | planned     | TEST-CFG-api           | -                          | -                    |
| CFG-503  | Config Hot Reload: Apply config changes without restart                | planned     | TEST-CFG-hotreload     | -                          | -                    |
| ARC-306  | Hexagonal Architecture: Implement ports & adapters pattern             | proposed    | TEST-ARC-hexagonal     | -                          | -                    |
| ARC-307  | Add Repository Pattern: Data access abstraction                        | proposed    | TEST-ARC-repository    | -                          | -                    |
| TST-301  | Improve Test Coverage: Achieve 80% coverage for critical modules       | planned     | TEST-TST-coverage      | -                          | -                    |
| PERF-301 | Performance Optimizations: Profile and optimize hot paths              | proposed    | TEST-PERF-optimize     | -                          | -                    |

---

## Details per ID

### SSM-001: Per-device scene state machine with generationId and status

- Summary: Add authoritative per-device state: `currentScene`, `targetScene`,
  `generationId`, `status` (switching|running|stopping), `lastSwitchTs`.
- MQTT Mirror: Publish state to `${SCENE_STATE_TOPIC_BASE}/<ip>/scene/state`
  (default base: `/home/pixoo`), payload keys configurable.
- Acceptance Criteria:
  - State updates occur on every switch (enter switching → running) and on
    stop.
  - `generationId` increments on every switch and is monotonically increasing.
  - State is device-scoped; multiple devices can change independently.
- Test Results (TEST-SSM-basic): pass (mock)
  - Build: 259, Commit: 47cabd0, Timestamp: 2025-09-19T19:05:00Z
  - Evidence: `scripts/test_scheduler.js` DEVICE_STATE shows correct scene/generation.

### SCH-002: Central per-device scheduler; remove scene-owned timers

- Summary: One scheduler loop per device controls timing; scenes never own
  timers. Scenes become pure renderers that optionally return `nextDelayMs`.
- Acceptance Criteria:
  - On switch, old device loop halts instantly; new loop starts with new
    generation.
  - No `setTimeout` or MQTT-based continuation remains inside scenes.
- Test Results (TEST-SCH-loop-stop): pass (mock)
  - Build: 259, Commit: 47cabd0, Timestamp: 2025-09-19T19:05:00Z
  - Evidence: animated → draw_api switch; old loop stops, new gen starts.

### GATE-003: Input gating on (scene, generation)

- Summary: Only accept continuation/tick events when both scene and generation
  match the active device state; drop stale inputs silently.
- Acceptance Criteria:
  - Any legacy `_isAnimationFrame` or stray frame from old scenes is ignored
    without effect.
  - Logs indicate drop with device, scene, and generation details.
- Test Plan (TEST-GATE-stale-drop):
  - Manually fire a continuation for old generation; verify it is dropped and no draw occurs.

### BUG-011: Performance scene does not fully reset on restart

- Summary: After running `performance-test`, switching to `empty`, and back to
  `performance-test`, the scene resumed mid-state. Cleanup lacked full state
  reset.
- Fix: Enhanced `cleanup` in `scenes/examples/performance-test.js` to clear
  `isRunning`, `inFrame`, `chartInitialized`, and related flags.
- Test Plan (TEST-PERF-restart):
  - Run perf → empty → perf; verify fresh initialization on the second run.
  - Automated by `scripts/live_test_perf_restart.js`.

### REF-004: Refactor all scenes to pure render

- Summary: Convert `draw_api_animated_v2`, `performance-test`,
  `draw_api_animated`, and remaining scenes to a pure render API: no timers,
  no MQTT self-publish. Cleanup becomes idempotent and minimal.
- Acceptance Criteria:
  - Scenes render via the central loop only; no lingering timers.
  - Cleanup does not affect other devices/scenes and is safe to call multiple times.
- Test Plan (TEST-REF-scenes-pure):
  - Static analysis/grep: no `setTimeout`/self-MQTT in scene code.
  - Runtime: scene switches do not produce late callbacks or zombie frames.

### MDEV-005: Multi-device isolation

- Summary: Maintain independent state machines and scheduler loops per device IP.
- Acceptance Criteria:
  - Switching on device A cannot affect device B.
  - Each device publishes its own scene state on its state topic.
- Test Results (TEST-MDEV-dual-device): pass (mock)
  - Build: 259, Commit: 47cabd0, Timestamp: 2025-09-19T19:06:00Z
  - Evidence: `scripts/test_multi_device.fish` shows independent states for A and B.

### CFG-006: Configurable topic base and state keys

- Summary: Add `SCENE_STATE_TOPIC_BASE` constant/env override (default
  `/home/pixoo`), and allow customizing state payload keys.
- Acceptance Criteria:
  - Changing base updates publish topics without code changes.
  - Keys can be customized while retaining defaults.
- Test Plan (TEST-CFG-topic-base):
  - Override base; verify publishes go to `/custom/pixoo/<ip>/scene/state`.

### OBS-007: Observability

- Summary: Publish per-device scene state; log stale frame drops; include
  `generationId` and timestamps.
- Acceptance Criteria:
  - Every transition produces a state message.
  - Stale events are logged at `info` or `ok` with reason.
- Test Results (TEST-OBS-state-publish): pass (real)
  - Build: 373, Commit: 13e814d, Timestamp: 2025-09-19T20:15:00Z
  - Evidence: `GATE_OK build=373 commit=13e814d ...` from `scripts/live_test_gate.js`.

### TST-008: Test harness and procedures

- Summary: Add mock-driver integration tests for gating/scheduler; provide manual MQTT scripts for local real-device runs.
- Acceptance Criteria:
  - CI/PNPM script to run integration tests locally.
  - Manual checklist to validate on a real device.
- Test Results (TEST-TST-harness): pass (mock)
  - Build: 259, Commit: 47cabd0, Timestamp: 2025-09-19T19:07:00Z
  - Evidence: `scripts/test_scenes_smoke.js` transitions across scenes with gen increments.

### SOAK-009: Stability soak

- Summary: 30–60 minute soak test with periodic scene switches.
- Acceptance Criteria:
  - No timer or handle leaks; memory/CPU stable.
  - No zombie frames observed; all switches clean.
- Test Plan (TEST-SOAK-stability):
  - Scripted switches every 5–15 seconds across multiple scenes; monitor metrics.

State: postponed (defer until after public v1.1 release)

### DOC-010: Documentation updates

- Summary: Comprehensive documentation overhaul and backlog hygiene.
- Acceptance Criteria:
  - README files are updated with a welcoming, informative homepage, listing all
    current features and functions, and highlighting project capabilities.
  - Developer documentation clearly explains the scheduler, state machine,
    configuration, MQTT topics, and test procedures.
  - Backlog hygiene rules are documented and visible.
  - Instructions for adding a new scene under the pure render contract are included and easy to follow.
  - Backlog table is kept current with test results, timestamps, and build information.
- Test Plan (TEST-DOC-checklist):
  - Peer review: A developer can follow the documentation to add a new scene,
    understand the scheduler and state machine, configure the system, and
    validate scene switching.
  - Verify that all features and functions are listed in the README.
  - Confirm that backlog hygiene rules and test result tracking are present and up to date.

---

## Release Block: Public v1.1

### ARC-101: Architecture audit & alignment

- Summary: Perform a comprehensive architecture review to ensure the codebase
  follows our standards, centralized scheduler model, and clean boundaries.
- Acceptance Criteria:
  - Verify single source of truth for per-device state and generation in `scene-manager` and `daemon`.
  - Confirm all scenes are pure-render, no self-timers/MQTT, and return `nextDelayMs|null`.
  - Ensure MQTT topic base and keys sourced from `lib/config.js` only.
  - Validate error handling/logging levels and metadata.
- Test Plan (TEST-ARC-audit):
  - Static review checklist; grep scans for forbidden patterns (`setTimeout(` in scenes, direct MQTT in scenes).
  - Run harness to confirm behavior unchanged.

### CON-102: Consistency pass (naming & contracts)

- Summary: Make naming and contracts consistent across modules.
- Acceptance Criteria:
  - Scenes export `name`, `init`, `render`, `cleanup`, and `wantsLoop` consistently.
  - `render` returns `number` delay or `null` on completion; scheduler interprets correctly.
  - Consistent logger prefixes and levels.
  - Remove redundant branches (e.g., legacy `_isAnimationFrame` code paths now gated).
- Test Results (TEST-CON-contracts): pass (audit)
  - Build: 259, Commit: 47cabd0, Timestamp: 2025-09-19T19:05:00Z
  - Evidence: Scenes export `name/init/render/cleanup/wantsLoop`; perf scene exports `name`.

### CLN-103: Cleanup (dead code & dev overrides)

- Summary: Remove dead code, disable dev-only overrides, and delete unused branches.
- Acceptance Criteria:
  - Remove or guard `DEVICE_TARGETS_OVERRIDE` in `lib/device-adapter.js` for
    production.
  - Drop unreachable/unused code paths now superseded by the scheduler (e.g.,
    legacy animation frame handling in update paths) while keeping behavior.
  - Ensure no unused files remain; update README references.
- Test Results (TEST-CLN-deadcode): pass (review)
  - Build: 259, Commit: 47cabd0, Timestamp: 2025-09-19T19:05:00Z
  - Evidence: Removed v2 references in scripts, guarded `DEVICE_TARGETS_OVERRIDE` for prod.

### REL-104: Release checklist for public v1.1

- Summary: Finalize public release with traceable tests and notes.
- Acceptance Criteria:
  - Run `live_test_perf_once.js`, `live_test_gate.js`, and
    `live_test_harness.js` against live build; record build/commit in
    backlog.
  - Tag release with changelog; confirm README updated.
  - SOAK-009 explicitly postponed.
- Test Results (TEST-REL-smoke): pass (real)
  - Build: 373, Commit: 13e814d, Timestamp: 2025-09-19T20:17:00Z
  - Evidence: `SCENE_OK ... build=373 commit=13e814d` lines from `scripts/live_test_harness.js`.

---

### API-201: Unified Device API - Single drawing interface with consistent naming

- Summary: Consolidate fragmented drawing APIs into a single, consistent interface. Replace
  device.drawTextRgbaAligned, rendering-utils.drawText, and other variants with unified PixooCanvas API.
- Architectural Goals:
  - Single entry point for all drawing operations
  - Consistent method naming (no more fillRectangleRgba vs drawRectangleRgba confusion)
  - Type-safe parameter validation
  - Automatic bounds checking and clipping
  - Resource management and cleanup
- Implementation:
  - New PixooCanvas class wrapping device operations
  - Method aliases and deprecation warnings for old APIs
  - Comprehensive parameter validation
  - Performance optimizations (batching, caching)
- Acceptance Criteria:
  - ZERO BREAKING CHANGES - all existing scenes work without modification
  - New unified API provides consistent naming and better developer experience
  - Double-check all current functionality remains intact
  - Better error messages and validation where safe to add
  - Performance maintained or improved
- Risk Level: Low-Medium (backward compatible wrapper layer)

### FRM-202: Scene Framework - Base classes, composition, and standardized patterns

- Summary: Create a comprehensive scene framework that eliminates code duplication and provides
  reusable patterns for common scene types.
- Components:
  - Abstract base classes for different scene types (StaticScene, AnimatedScene, DataScene)
  - Scene composition system for layering and combining scenes
  - Standardized configuration handling with schema validation
  - Built-in state management patterns
  - Lifecycle hooks and error recovery
- Benefits:
  - 80% reduction in boilerplate code per scene
  - Consistent behavior across all scenes
  - Easier scene development and maintenance
  - Better error handling and debugging
- Acceptance Criteria:
  - Existing scenes can be migrated with minimal changes
  - New scenes are 5x faster to develop
  - Framework is extensible for future scene types
  - Comprehensive documentation and examples

### GFX-203: Graphics Engine - Enhanced rendering with hardware-aware animation

- Summary: Implement enhanced graphics capabilities optimized for Pixoo's 4-5fps hardware limitations,
  focusing on practical visual enhancements for 200+ smart home device/KPI/status displays.
- Features:
  - Hardware-aware animation system (optimized for 4-5fps, cautious status animations)
  - Text effects (shadows, outlines, gradients) for better readability
  - Animation easing and smooth transitions between frames (hardware-limited)
  - Screen transitions (fade in/out only - slides too choppy at 5fps)
  - Enhanced drawing primitives (gradients, improved text rendering)
  - Resource caching and preloading (images, fonts)
  - Performance monitoring and optimization
- Technical Implementation:
  - Frame-rate aware animation timing (respect 4-5fps hardware limits)
  - Resource manager with caching
  - Enhanced text rendering with effects (shadows, outlines, gradients)
  - Fade in/out transitions optimized for low frame rates
  - Performance profiling tools
  - Hardware-specific optimizations
- Acceptance Criteria:
  - Animations optimized for 4-5fps hardware capability with status indicators
  - Text effects improve readability for smart home device displays
  - Fade transitions smooth at hardware limitations
  - Memory usage not a primary concern (sufficient RAM available)
  - No performance regressions vs current implementation
  - Visual enhancements support 200+ device/KPI status displays
- Implementation Status:
  - ✅ GraphicsEngine class (`lib/graphics-engine.js`) - Core graphics system
  - ✅ Text effects: shadows, outlines, gradients with `drawTextEnhanced()`
  - ✅ Fade transitions: `startFadeTransition()`, `updateFadeTransition()`
  - ✅ Gradient backgrounds: `drawGradientBackground()` (vertical/horizontal)
  - ✅ Animation easing: `ease()` with linear, easeIn, easeOut, bounce functions
  - ✅ Value animation: `animateValue()` with callbacks and easing
  - ✅ Resource caching: `preloadResources()`, `clearResourceCache()`
  - ✅ Performance monitoring: `getPerformanceStats()`, frame counts, active animations
  - ✅ Demo scene: `scenes/examples/graphics-engine-demo.js` showcasing all features
  - ✅ Comprehensive tests: `scripts/test_graphics_engine.js` (13/13 tests passing)
  - ✅ Hardware-aware: Linear easing for 4-5fps compatibility, minimal 200ms fade duration
- Test Results (TEST-GFX-engine):
  - All 13 unit tests pass: initialization, text effects, fades, gradients, animations, caching, performance monitoring
  - Demo scene loads and functions correctly
  - Hardware optimization: linear easing for consistent frame rates
  - Build: 380, Commit: c5dce94, Timestamp: 2025-09-27T14:30:00Z
  - Evidence: Automated test suite validates all graphics engine functionality

### CFG-204: Configuration Enhancements - Validation and presets

- Summary: Enhance the existing configuration system with basic validation and reusable presets.
- Capabilities:
  - Simple JSON schema validation for scene configs
  - Scene presets and templates for common configurations
  - Runtime configuration validation
  - Clear error messages for invalid config
- Implementation:
  - Lightweight validation layer (don't overcomplicate)
  - Preset system for common scene configurations
  - Integration with existing MQTT/config pipeline
- Acceptance Criteria:
  - Configuration validation catches common errors
  - Presets available for frequently used configurations
  - No disruption to existing build/run pipeline
  - Simple to use and maintain
- Implementation Status:
  - ✅ ConfigValidator class (`lib/config-validator.js`) - Core validation system
  - ✅ Built-in presets: text-simple, text-fancy, chart-basic, chart-advanced, status-indicator, performance-monitor
  - ✅ JSON schema validation: text, chart schemas with type checking, range validation, required fields
  - ✅ Preset merging: createFromPreset() with deep merge and overrides
  - ✅ Error handling: clear error messages, getErrors(), getErrorString()
  - ✅ Custom presets/schemas: addPreset(), addSchema() for extensibility
  - ✅ Demo scene: `scenes/examples/config-validator-demo.js` showcasing all features
  - ✅ Comprehensive tests: `scripts/test_config_validator.js` (17/17 tests passing)
  - ✅ Lightweight: No external dependencies, focused on common config patterns
- Test Results (TEST-CFG-validation):
  - All 17 unit tests pass: presets, validation, schemas, error handling, custom extensions
  - Demo scene loads and demonstrates preset creation, validation, and error display
  - Clear error messages for invalid configurations (missing fields, wrong types, out of range)
  - Build: 382, Commit: 53bf92a, Timestamp: 2025-09-27T15:45:00Z
  - Evidence: Automated test suite validates all configuration validation functionality

### TST-205: Testing Framework - Unit tests, integration, performance validation

- Summary: Build a testing framework focused on automated validation where possible, with visual testing for rendering correctness.
- Test Types:
  - Unit tests for individual scene components and framework modules
  - Integration tests for MQTT protocol and multi-device scenarios
  - Performance benchmarks and regression detection (based on existing perf tests)
  - Multi-device testing and isolation validation
  - API compatibility testing for framework changes
- Tools and Infrastructure:
  - Test runner with scene/device mocking
  - Performance profiling tools (extend existing)
  - Multi-device test orchestration
  - API compatibility checking
  - CI/CD integration
- Testing Limitations:
  - Scene rendering correctness: Visual inspection by humans (automated visual regression not practical)
  - Long-running stability tests: Manual/periodic execution
- Acceptance Criteria:
  - Good code coverage for framework modules (API, scene framework, graphics)
  - Automated performance regression detection using existing test suite
  - Multi-device scenarios properly tested
  - Framework changes validated for API compatibility
  - Easy to add tests for new framework components

---

## Implementation Priority

Based on stability requirements and development workflow impact:

1. **API-201** (Foundation) - Unify APIs for consistency and better developer experience
2. **FRM-202** (Productivity) - Scene framework to reduce boilerplate and standardize patterns
3. **GFX-203** (Visual Enhancement) - Text effects, easing, fade transitions for 200+ device displays
4. **TST-205** (Quality) - Testing framework for automated validation and stability
5. **CFG-204** (Polish) - Configuration enhancements (keep simple, don't disrupt pipeline)

---

## NFR (Non-Functional Requirements)

- Robustness: No zombie frames after scene switch under any permutation (any
  scene → any scene, any device).
- Isolation: Multi-device operations are independent; no cross-device interference.
- Observability: Publish scene state changes to MQTT and log stale drops with
  useful metadata.
- Performance: Scene switch completes within one frame budget; target < 200 ms
  on typical device load.
- Maintainability: All scenes follow the pure render contract; no bespoke timers.
- Configurability: Topic base and payload keys configurable via constants/env.
- Quality: Zero lint errors; documentation and backlog kept up to date at all times.

---

## Architecture Refactoring - Pro-Senior-Level Work Packages

### ARC-301: Extract MQTT Service - Decouple MQTT logic from daemon.js

- **Priority**: P0 (Must Have - Foundation)
- **Effort**: 2-3 days
- **Risk**: Low (additive change, no breaking changes)

**Summary**: Extract all MQTT connection, subscription, and publishing logic from
daemon.js into a dedicated `MqttService` class. This enables dependency injection,
better testing, and cleaner separation of concerns.

**Current Problem**:

- daemon.js has 100+ lines of MQTT logic mixed with business logic
- Cannot test daemon logic without MQTT broker
- Hard to swap MQTT for WebSockets or other protocols

**Implementation Plan**:

1. Create `lib/mqtt-service.js` with `MqttService` class
2. Extract connection management (connect, disconnect, reconnect)
3. Extract subscription management (subscribe, unsubscribe patterns)
4. Extract publishing (publish with retry, QoS handling)
5. Add event emitter for decoupled message handling
6. Update daemon.js to use MqttService
7. Add unit tests with mock MQTT client

**Acceptance Criteria**:

- ✅ daemon.js reduced by 100+ lines
- ✅ MqttService fully testable with mocks
- ✅ All existing MQTT functionality works unchanged
- ✅ Can configure MQTT broker URL via DI
- ✅ Zero breaking changes to existing scenes/devices
- ✅ Test coverage: 80%+ for MqttService

**Test Plan (TEST-ARC-mqtt-service)**:

- Unit tests: Connection, subscription, publishing with mocked MQTT client
- Integration tests: Real MQTT broker with multiple devices
- Verify all existing MQTT topics still work

---

### ARC-302: Implement Dependency Injection - Add DI container for testability

- **Priority**: P0 (Must Have - Foundation)
- **Effort**: 3-4 days
- **Risk**: Medium (requires careful refactoring of constructors)

**Summary**: Implement a lightweight dependency injection container to eliminate
hard-coded `require()` calls and enable proper unit testing with mocks.

**Current Problem**:

- Classes use `this.logger = require('./logger')` - hard dependencies
- Cannot mock dependencies in tests
- Tight coupling makes refactoring risky
- Violates Dependency Inversion Principle

**Implementation Plan**:

1. Add `lib/di-container.js` with lightweight DI container (Awilix-inspired)
2. Refactor SceneManager to accept dependencies via constructor
3. Refactor DeviceAdapter to accept dependencies via constructor
4. Refactor all lib/\* modules to use DI
5. Create container configuration in daemon.js
6. Update tests to use DI for mocking
7. Add container lifecycle management

**Acceptance Criteria**:

- ✅ All lib/\* modules use constructor injection
- ✅ Zero hard-coded `require()` calls for internal dependencies
- ✅ Tests can easily mock any dependency
- ✅ Container supports singleton and transient lifetimes
- ✅ Clear documentation on adding new services
- ✅ Zero breaking changes to scene interface

**Test Plan (TEST-ARC-di-container)**:

- Unit tests: Container registration, resolution, lifecycle
- Integration tests: Full daemon startup with DI
- Verify all existing functionality works
- Test mocking in unit tests

---

### ARC-303: Consolidate State Management - Single source of truth for state

- **Priority**: P0 (Must Have - Foundation)
- **Effort**: 2-3 days
- **Risk**: Medium (affects scene state handling)

**Summary**: Consolidate fragmented state management (currently in scene-manager,
device-adapter, scene-base, and individual scenes) into a single `StateStore` service.

**Current Problem**:

- State stored in 4+ different places
- `sceneStates` Map exists in both scene-manager.js AND device-adapter.js
- Confusing for developers - where to store what?
- Risk of state inconsistency

**Implementation Plan**:

1. Create `lib/state-store.js` with StateStore class
2. Define clear state hierarchy: global → device → scene
3. Implement state getters/setters with path syntax
4. Add state subscription/observation capabilities
5. Migrate scene-manager.js to use StateStore
6. Migrate device-adapter.js to use StateStore
7. Update scene-base.js to use StateStore
8. Add state persistence (optional)

**State Hierarchy**:

```text
StateStore
  ├── globalState (Map) - daemon-wide config
  ├── deviceStates (Map<deviceId, DeviceState>)
  │     └─ DeviceState { activeScene, generation, status, ... }
  └── sceneStates (Map<sceneId::deviceId, SceneState>)
        └─ SceneState { frameCount, isRunning, ... }
```

**Acceptance Criteria**:

- ✅ Single StateStore instance manages all state
- ✅ Clear API for reading/writing state
- ✅ State hierarchy well-documented
- ✅ All existing scenes work without changes
- ✅ State subscription for reactive updates (optional)
- ✅ Test coverage: 85%+

**Test Plan (TEST-ARC-state-store)**:

- Unit tests: Get, set, clear, subscribe operations
- Integration tests: Multi-device state isolation
- Verify scene state persistence across switches

---

### ARC-304: Extract Command Handlers - Separate command processing logic

- **Priority**: P1 (Should Have - Quality)
- **Effort**: 2 days
- **Risk**: Low (refactoring existing code)

**Summary**: Extract MQTT message handling from daemon.js into dedicated command
handler classes using the Command pattern.

**Current Problem**:

- daemon.js has inline message handlers for scene/driver/reset commands
- Mixed abstraction levels (parsing + business logic)
- Hard to add new commands
- No command validation or error handling consistency

**Implementation Plan**:

1. Create `lib/commands/` directory
2. Create `CommandHandler` base class
3. Implement `SceneCommandHandler` (handle scene switching)
4. Implement `DriverCommandHandler` (handle driver changes)
5. Implement `ResetCommandHandler` (handle device resets)
6. Create `CommandRouter` to dispatch commands
7. Add command validation and error handling
8. Update daemon.js to use CommandRouter

**Acceptance Criteria**:

- ✅ Each command type has dedicated handler class
- ✅ CommandRouter validates and dispatches commands
- ✅ Consistent error handling across all commands
- ✅ Easy to add new command types
- ✅ Command handlers fully testable in isolation
- ✅ Zero breaking changes to MQTT protocol

**Test Plan (TEST-ARC-cmd-handlers)**:

- Unit tests: Each command handler with mocked dependencies
- Integration tests: Full command flow via MQTT
- Error cases: Invalid payloads, missing fields

**Test Results (TEST-ARC-cmd-handlers)**: ✅ PASS (107/107 tests)

- Build: 450+, Commit: d822407, Timestamp: 2025-10-02T18:30:00Z
- Evidence: All tests passing, daemon.js reduced by 143 lines (-32%)
- Deliverables:
  - `lib/commands/command-handler.js` (111 lines) - Base class
  - `lib/commands/scene-command-handler.js` (99 lines)
  - `lib/commands/driver-command-handler.js` (163 lines)
  - `lib/commands/reset-command-handler.js` (95 lines)
  - `lib/commands/state-command-handler.js` (128 lines)
  - `lib/commands/command-router.js` (146 lines)
  - `lib/commands/README.md` (378 lines) - Complete documentation
  - `test/lib/command-handlers-basic.test.js` (190 lines) - Smoke tests

**Impact**:

- daemon.js: 447 → 304 lines (-32% reduction)
- +742 lines of command handling code in dedicated modules
- +190 lines of tests
- All command handlers registered in DI container
- Clean CommandRouter → Handler dispatch flow

---

### ARC-305: Add Service Layer - Business logic abstraction

- **Priority**: P1 (Should Have - Quality)
- **Effort**: 3-4 days
- **Risk**: Medium (requires careful API design)

**Summary**: Add a service layer to encapsulate business logic, separating it from
infrastructure concerns (MQTT, HTTP, filesystem).

**Current Problem**:

- Business logic scattered across daemon.js, scene-manager.js, device-adapter.js
- No clear API for common operations
- Difficult to reuse logic (e.g., scene switching from different entry points)

**Implementation Plan**:

1. Create `lib/services/` directory
2. Implement `SceneService` (register, switch, render, list)
3. Implement `DeviceService` (create, configure, getMetrics)
4. Implement `SchedulerService` (centralized loop management)
5. Implement `DeploymentService` (version tracking, startup)
6. Refactor daemon.js to use services
7. Refactor command handlers to use services
8. Add comprehensive JSDoc for service APIs

**Service Layer Structure**:

```text
services/
  ├── SceneService.js       (registerScene, switchScene, renderScene)
  ├── DeviceService.js      (getDevice, createDevice, setDriver)
  ├── SchedulerService.js   (startLoop, stopLoop, updateDelay)
  └── DeploymentService.js  (getVersion, getBuildInfo)
```

**Acceptance Criteria**:

- ✅ Clear service APIs for all major operations
- ✅ Services testable in isolation (via DI)
- ✅ daemon.js acts as thin orchestration layer
- ✅ Services documented with usage examples
- ✅ Zero breaking changes to scene interface
- ✅ Test coverage: 80%+

**Test Plan (TEST-ARC-service-layer)**:

- Unit tests: Each service method with mocked dependencies
- Integration tests: Service composition for complex flows
- Verify all existing functionality works

---

### ARC-306: Hexagonal Architecture - Implement ports & adapters pattern

- **Priority**: P2 (Nice to Have - Advanced)
- **Effort**: 5-7 days
- **Risk**: High (major architectural refactoring)

**Summary**: Refactor to hexagonal (ports & adapters) architecture for maximum
testability and flexibility. Business logic becomes independent of infrastructure.

**Current Problem**:

- Domain logic coupled to MQTT, HTTP, filesystem
- Cannot easily add REST API or WebSocket support
- Testing requires real infrastructure (MQTT broker, devices)

**Implementation Plan**:

1. Define domain models (Scene, Device, SceneState entities)
2. Define ports (interfaces) for inbound/outbound adapters
3. Implement core domain services (use cases)
4. Create adapters for MQTT (inbound), Pixoo devices (outbound)
5. Implement adapter for state persistence
6. Add adapter registry/configuration
7. Refactor daemon.js as composition root

**Acceptance Criteria**:

- ✅ Domain logic in `lib/domain/`
- ✅ Ports defined as interfaces in `lib/ports/`
- ✅ Adapters in `lib/adapters/`
- ✅ Can swap MQTT for WebSockets without changing domain
- ✅ Can add REST API without changing scene logic
- ✅ Test coverage: 90%+ for domain logic

**Test Plan (TEST-ARC-hexagonal)**:

- Unit tests: Domain logic with mocked ports
- Integration tests: Real adapters with test infrastructure
- E2E tests: Full daemon with multiple adapter types

---

### ARC-307: Add Repository Pattern - Data access abstraction

- **Priority**: P2 (Nice to Have - Advanced)
- **Effort**: 2-3 days
- **Risk**: Low (additive pattern)

**Summary**: Implement repository pattern for scene and device data access,
enabling future persistence (database, Redis, etc.).

**Current Problem**:

- Scenes loaded directly from filesystem
- Device state in memory only
- No abstraction for future database integration

**Implementation Plan**:

1. Create `ISceneRepository` interface
2. Implement `FileSystemSceneRepository`
3. Implement `InMemorySceneRepository` (for testing)
4. Create `IDeviceRepository` interface
5. Implement `InMemoryDeviceRepository`
6. Add repository configuration to DI container
7. Refactor scene-loader to use SceneRepository

**Acceptance Criteria**:

- ✅ Repository interfaces well-defined
- ✅ Multiple implementations available
- ✅ Easy to add database persistence later
- ✅ Repositories injectable via DI
- ✅ Test coverage: 80%+

**Test Plan (TEST-ARC-repository)**:

- Unit tests: Repository implementations
- Integration tests: Swapping repositories
- Verify all scenes load correctly

---

### TST-301: Improve Test Coverage - Achieve 80% coverage for critical modules

- **Priority**: P1 (Should Have - Quality)
- **Effort**: 3-5 days
- **Risk**: Low (test-only changes)

**Summary**: Systematically improve test coverage for all lib/\* modules, focusing
on critical paths (scene-manager, device-adapter, scheduler).

**Current Problem**:

- Estimated ~60% coverage
- Some critical modules lack comprehensive tests
- No coverage reporting in CI/CD

**Implementation Plan**:

1. Add c8 (Istanbul) for coverage reporting
2. Identify modules below 80% coverage
3. Write unit tests for untested code paths
4. Write integration tests for critical flows
5. Add coverage gates to CI/CD
6. Document testing best practices

**Target Coverage**:

- scene-manager.js: 85%+
- device-adapter.js: 85%+
- mqtt-utils.js: 85%+
- scene-loader.js: 90%+
- Other modules: 80%+

**Acceptance Criteria**:

- ✅ Overall coverage: 80%+
- ✅ Critical modules: 85%+
- ✅ Coverage report in CI/CD
- ✅ All edge cases tested
- ✅ Integration tests for main flows

**Test Plan (TEST-TST-coverage)**:

- Run coverage report: `npm run coverage`
- Verify targets met
- CI/CD fails if coverage drops below threshold

---

### PERF-301: Performance Optimizations - Profile and optimize hot paths

- **Priority**: P2 (Nice to Have - Advanced)
- **Effort**: 2-3 days
- **Risk**: Low (optimization only)

**Summary**: Profile the daemon under load, identify bottlenecks, and optimize
hot paths for improved performance.

**Current Problem**:

- No systematic performance profiling
- Unknown bottlenecks
- Scene switch target: <200ms (may not always meet)

**Implementation Plan**:

1. Add performance profiling instrumentation
2. Create load testing scripts (rapid scene switches)
3. Profile with Node.js profiler (--prof, 0x)
4. Identify top 10 hot paths
5. Optimize identified bottlenecks
6. Add performance regression tests
7. Document performance characteristics

**Potential Optimizations**:

- Cache scene modules (avoid re-require)
- Pool device connections
- Optimize state lookups (use WeakMap)
- Batch MQTT publishes
- Lazy load scenes

**Acceptance Criteria**:

- ✅ Performance profile documented
- ✅ Scene switch: <150ms (p95)
- ✅ Render cycle: <50ms overhead
- ✅ Memory usage stable over time
- ✅ No performance regressions
- ✅ Performance tests in CI/CD

**Test Plan (TEST-PERF-optimize)**:

- Load test: 1000 scene switches
- Memory test: 24-hour stability run
- Verify metrics within targets

---

### UI-401: Web UI - Control panel for scene and device management

- **Priority**: P1 (Should Have - User Experience)
- **Effort**: 3-5 days (depends on ARC-305)
- **Risk**: Low (additive feature)
- **Dependencies**: ARC-305 (Service Layer) recommended but not required

**Summary**: Add a web-based control panel for managing Pixoo devices without
MQTT commands.

**Current Problem**:

- Only MQTT interface available (requires mosquitto_pub commands)
- No visual interface for non-technical users
- Hard to see available scenes at a glance
- No quick way to test scenes or debug issues

**Implementation Plan**:

1. Create `web/` directory for web UI files
2. Add Express.js server (minimal, lightweight)
3. Create REST API endpoints:
   - `GET /api/devices` - List configured devices
   - `GET /api/scenes` - List available scenes
   - `POST /api/devices/:ip/scene` - Switch scene
   - `POST /api/devices/:ip/display` - Turn display on/off
   - `POST /api/devices/:ip/reset` - Soft reset device
   - `POST /api/daemon/restart` - Restart daemon (optional)
4. Create simple HTML/CSS/JS frontend
5. Add authentication (basic auth or API key)
6. Make port configurable (default: 10829, considering availability)
7. Add graceful shutdown handling

**Web UI Features**:

- **Device Management**:
  - List all configured devices (IP, current scene, status)
  - Turn display on/off
  - Soft reset device
  - View device metrics (frame rate, errors)

- **Scene Control**:
  - List all available scenes
  - Preview scene (thumbnail/description if available)
  - Switch to scene with one click
  - Pass scene parameters (color, speed, etc.)

- **System Control**:
  - View daemon status (version, uptime, memory)
  - Restart daemon (with confirmation)
  - View recent logs (last 50 lines)

- **Monitoring**:
  - Real-time scene state via WebSocket or SSE
  - Device metrics (frame rate, push count)
  - Error notifications

**Technology Stack**:

```javascript
// Minimal dependencies:
- express: ^4.18.0          // Web server
- ws: ^8.14.0               // WebSocket (optional, for real-time updates)
// No heavy frameworks (React, Vue) - keep it simple
```

**API Design**:

```javascript
// GET /api/devices
{
  "devices": [
    {
      "ip": "192.168.1.159",
      "currentScene": "clock",
      "status": "running",
      "driver": "real",
      "metrics": { "fps": 5, "errors": 0 }
    }
  ]
}

// POST /api/devices/192.168.1.159/scene
{
  "scene": "graphics_engine_demo",
  "clear": true
}

// Response:
{
  "success": true,
  "message": "Switched to graphics_engine_demo"
}
```

**UI Mockup** (Simple HTML/CSS):

```text
┌──────────────────────────────────────────────────┐
│  Pixoo Control Panel                    v2.0.0  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Device: 192.168.1.159                          │
│  Status: Running | Scene: clock | FPS: 5        │
│                                                  │
│  [Turn Off Display]  [Reset Device]             │
│                                                  │
├──────────────────────────────────────────────────┤
│  Available Scenes:                              │
│                                                  │
│  ○ empty           [Switch]                     │
│  ● clock           [Switch] ← Currently active  │
│  ○ startup         [Switch]                     │
│  ○ graphics_engine_demo [Switch]                │
│  ○ performance-test     [Switch]                │
│                                                  │
├──────────────────────────────────────────────────┤
│  Daemon Status:                                 │
│  Version: 2.0.0 | Build: 478 | Uptime: 2h 15m  │
│  Memory: 18MB | Tests: 162/162                  │
│                                                  │
│  [Restart Daemon]                               │
└──────────────────────────────────────────────────┘
```

**Configuration**:

```javascript
// In daemon.js or config file:
const WEB_UI_ENABLED = process.env.PIXOO_WEB_UI !== 'false';
const WEB_UI_PORT = parseInt(process.env.PIXOO_WEB_PORT || '10829');
const WEB_UI_AUTH = process.env.PIXOO_WEB_AUTH; // optional: "user:password"

if (WEB_UI_ENABLED) {
  const webServer = require('./web/server');
  webServer.start(WEB_UI_PORT, container);
}
```

**Security Considerations**:

- Basic authentication (username/password)
- API key support (for programmatic access)
- Rate limiting (prevent abuse)
- CORS configuration (restrict origins)
- No sensitive data in responses (no MQTT passwords)

**Acceptance Criteria**:

- ✅ Web UI accessible on configurable port (default 10829)
- ✅ Can list all devices and current scenes
- ✅ Can switch scenes with one click
- ✅ Can turn display on/off
- ✅ Can reset device
- ✅ Basic authentication (optional but recommended)
- ✅ Mobile-responsive design
- ✅ Zero breaking changes to existing MQTT interface
- ✅ Graceful shutdown (doesn't block daemon)

**Test Plan (TEST-UI-web-panel)**:

- Manual tests: Open browser, test all buttons
- Integration tests: HTTP API endpoints with supertest
- Verify: MQTT interface still works (no conflicts)

**Implementation Strategy**:

**Option A: Without Service Layer** (Quick & Dirty)

- Directly call sceneManager, deviceAdapter, etc. from HTTP handlers
- Duplicate some logic from command handlers
- Effort: 2-3 days
- Technical debt: Medium (duplication)

**Option B: With Service Layer** (Recommended)

- First implement ARC-305 (Service Layer)
- Then add web UI using services
- Effort: 3-5 days total (2-3 for service layer, 1-2 for web UI)
- Technical debt: None (clean architecture)

**Recommendation**: **Option B** - Do ARC-305 first, then UI-401 becomes trivial.

**Port Selection**:

- Default: 10829 (user preference)
- Fallback: Auto-select if 10829 busy
- Environment variable: `PIXOO_WEB_PORT=10829`

---

## Implementation Priority Order

Based on dependencies and impact:

### Phase 1: Foundation (2-3 weeks)

1. **ARC-302** - Dependency Injection (enables everything else)
2. **ARC-301** - Extract MQTT Service (decouple infrastructure)
3. **ARC-303** - Consolidate State Management (single source of truth)

### Phase 2: Quality (1-2 weeks)

<!-- markdownlint-disable MD029 -->

4. **ARC-304** - Extract Command Handlers (cleaner code)
5. **TST-301** - Improve Test Coverage (confidence for next phases)

### Phase 3: Services (1-2 weeks)

6. **ARC-305** - Add Service Layer (clean APIs)

### Phase 4: Advanced (Optional, 2-3 weeks)

7. **ARC-306** - Hexagonal Architecture (maximum flexibility)
8. **ARC-307** - Repository Pattern (future-proof)
9. **PERF-301** - Performance Optimizations (polish)
<!-- markdownlint-enable MD029 -->

---

**Total Estimated Effort**: 6-10 weeks for Phases 1-3, 2-3 additional weeks for Phase 4

---

## Modern Web UI - Vue.js + Vuetify Stack

### UI-501: Modern UI Framework - Migrate to Vue 3 + Vuetify 3

- **Priority**: P0 (Must Have - Foundation)
- **Effort**: 2-3 days
- **Risk**: Medium (complete UI rewrite)
- **Status**: in_progress

**Summary**: Replace vanilla JavaScript Web UI with Vue 3 + Vuetify 3 for modern,
component-based architecture with built-in Material Design components.

**Current Problem**:

- Vanilla JS is hard to maintain and scale
- No component reusability
- Manual DOM manipulation
- No built-in UI components
- Custom CSS for everything

**Implementation Plan**:

1. Install dependencies:

   ```bash
   npm install vue@3 vuetify@3 @vitejs/plugin-vue vite
   npm install --save-dev @vue/test-utils vitest
   ```

2. Set up Vite build system:
   - Create `vite.config.js` for Vue SFC compilation
   - Configure Vuetify plugin
   - Set up dev server proxy to Express backend

3. Create Vue app structure:

   ```text
   web/
     frontend/          # Vue source files
       src/
         main.js        # Vue app entry
         App.vue        # Root component
         components/
           DeviceCard.vue
           SceneSelector.vue
           SystemStatus.vue
         composables/
           useApi.js
           useWebSocket.js
         store/
           devices.js   # Pinia store
           scenes.js
     public/           # Built files (gitignored)
     server.js         # Express backend (unchanged)
   ```

4. Create core Vue components:
   - `DeviceCard.vue` - Collapsible device card with controls
   - `SceneSelector.vue` - Scene dropdown with next/prev
   - `SystemStatus.vue` - Header with build number, status
   - `ToastNotifications.vue` - Vuetify snackbar wrapper

5. Set up Pinia for state management
6. Add Vuetify theme configuration (dark mode)
7. Implement API composable (`useApi.js`)
8. Update build process in `package.json`
9. Add Dockerfile build step for Vue frontend

**Technology Stack**:

```json
{
  "vue": "^3.4.0",
  "vuetify": "^3.5.0",
  "pinia": "^2.1.0",
  "vite": "^5.0.0",
  "@vitejs/plugin-vue": "^5.0.0"
}
```

**Acceptance Criteria**:

- ✅ Vue 3 + Vuetify 3 running with hot reload
- ✅ All existing functionality preserved
- ✅ Component-based architecture
- ✅ Material Design UI
- ✅ Dark theme by default
- ✅ Responsive grid layout
- ✅ Zero breaking changes to backend API

**Test Plan (TEST-UI-vue-setup)**:

- Manual: Open browser, verify all buttons work
- Unit tests: Vue components with @vue/test-utils
- E2E: All existing Web UI features functional

---

### UI-502: Toast Notifications - Replace alerts with Vuetify snackbars

- **Priority**: P0 (Must Have - UX)
- **Effort**: 1 day
- **Risk**: Low (Vuetify built-in)
- **Dependencies**: UI-501

**Summary**: Replace all `alert()` and `confirm()` calls with Vuetify snackbars
for smooth, modern notifications.

**Current Problem**:

- `alert()` blocks UI and is jarring
- No auto-dismiss for success messages
- Errors not sticky (user might miss them)

**Implementation Plan**:

1. Create `ToastNotifications.vue` composable:

   ```javascript
   // composables/useToast.js
   import { ref } from 'vue';

   const toasts = ref([]);

   export function useToast() {
     function success(message, timeout = 3000) {
       toasts.value.push({ type: 'success', message, timeout });
     }

     function error(message, sticky = true) {
       toasts.value.push({
         type: 'error',
         message,
         timeout: sticky ? -1 : 5000,
       });
     }

     function warning(message, timeout = 5000) {
       toasts.value.push({ type: 'warning', message, timeout });
     }

     return { success, error, warning, toasts };
   }
   ```

2. Replace all `alert()` with toast notifications
3. Add confirm dialog component (`ConfirmDialog.vue`)
4. Configure snackbar position (top-right)
5. Add smooth fade animations
6. Test error stickiness (must click to dismiss)

**Toast Behavior**:

- **Success**: Auto-dismiss after 3s, slide in from top-right
- **Warning**: Auto-dismiss after 5s, orange color
- **Error**: Sticky until clicked, red color, action button
- **Info**: Auto-dismiss after 4s, blue color

**Acceptance Criteria**:

- ✅ No more `alert()` or `confirm()` in code
- ✅ Success toasts auto-dismiss after 3s
- ✅ Error toasts sticky until clicked
- ✅ Smooth slide animations
- ✅ Multiple toasts stack properly
- ✅ Mobile-friendly positioning

**Test Plan (TEST-UI-toasts)**:

- Manual: Trigger success, error, warning toasts
- Verify auto-dismiss timing
- Verify error stickiness
- Test multiple simultaneous toasts

---

### UI-503: Collapsible Cards - Per-device expand/collapse with localStorage

- **Priority**: P1 (Should Have - UX)
- **Effort**: 1 day
- **Risk**: Low (Vuetify expansion panels)
- **Dependencies**: UI-501

**Summary**: Make device cards collapsible with Vuetify expansion panels,
mock devices collapsed by default, state persists in localStorage.

**Current Problem**:

- All devices always expanded
- Mock devices take up space unnecessarily
- No way to focus on important devices

**Implementation Plan**:

1. Convert `DeviceCard.vue` to use `v-expansion-panel`:

   ```vue
   <v-expansion-panels v-model="expanded">
     <v-expansion-panel>
       <v-expansion-panel-title>
         <!-- Device IP, driver badge, current scene -->
       </v-expansion-panel-title>
       <v-expansion-panel-text>
         <!-- Full device controls -->
       </v-expansion-panel-text>
     </v-expansion-panel>
   </v-expansion-panels>
   ```

2. Create localStorage composable:

   ```javascript
   // composables/useDeviceState.js
   export function useDeviceState() {
     function getExpandedState(deviceIp) {
       const state = localStorage.getItem(`device_${deviceIp}_expanded`);
       return state !== null ? JSON.parse(state) : null;
     }

     function setExpandedState(deviceIp, expanded) {
       localStorage.setItem(
         `device_${deviceIp}_expanded`,
         JSON.stringify(expanded),
       );
     }

     return { getExpandedState, setExpandedState };
   }
   ```

3. Initialize collapsed state:
   - Mock devices: `expanded = false` by default
   - Real devices: `expanded = true` by default
   - Load from localStorage if available

4. Add smooth slide animation (300ms)
5. Show current scene in collapsed header
6. Add expand/collapse all button (optional)

**Collapsed Header Shows**:

- Device IP
- Driver badge (mock/real)
- Current scene name
- Status indicator (dot)

**Acceptance Criteria**:

- ✅ Mock devices collapsed by default
- ✅ Real devices expanded by default
- ✅ State persists across page reloads
- ✅ Smooth slide animation (300ms)
- ✅ Current scene visible in collapsed header
- ✅ Click to toggle expand/collapse

**Test Plan (TEST-UI-collapse)**:

- Manual: Collapse/expand devices, reload page
- Verify localStorage persistence
- Test mock vs real default states
- Verify smooth animations

---

### UI-504: WebSocket Integration - Real-time updates without polling

- **Priority**: P1 (Should Have - Performance)
- **Effort**: 2 days
- **Risk**: Medium (new protocol)
- **Dependencies**: UI-501

**Summary**: Replace HTTP polling with WebSocket for real-time device/scene state updates.

**Current Problem**:

- Polling every 5s is inefficient
- Delays in seeing state changes
- Unnecessary API requests
- Flashing during updates

**Implementation Plan**:

1. Add WebSocket server to Express backend:

   ```javascript
   // web/server.js
   const WebSocket = require('ws');

   const wss = new WebSocket.Server({ server: httpServer });

   wss.on('connection', (ws) => {
     // Send initial state
     ws.send(JSON.stringify({ type: 'init', data: getAllState() }));

     // Subscribe to state changes
     const unsubscribe = stateStore.subscribe((change) => {
       ws.send(JSON.stringify({ type: 'update', data: change }));
     });

     ws.on('close', () => unsubscribe());
   });
   ```

2. Create WebSocket composable:

   ```javascript
   // composables/useWebSocket.js
   export function useWebSocket() {
     const ws = ref(null);
     const connected = ref(false);

     function connect() {
       ws.value = new WebSocket('ws://localhost:10829/ws');

       ws.value.onopen = () => {
         connected.value = true;
       };

       ws.value.onmessage = (event) => {
         const message = JSON.parse(event.data);
         handleStateUpdate(message);
       };

       ws.value.onclose = () => {
         connected.value = false;
         setTimeout(connect, 5000); // Auto-reconnect
       };
     }

     return { connect, connected };
   }
   ```

3. Integrate with Pinia store:
   - WebSocket updates trigger store mutations
   - Store updates trigger Vue reactivity
   - No manual polling needed

4. Add connection status indicator in header
5. Handle reconnection on disconnect
6. Add heartbeat/ping-pong for connection health

**Message Types**:

- `init`: Full initial state on connection
- `device_update`: Device state changed
- `scene_update`: Scene switched
- `metrics_update`: FPS/frametime update
- `ping`/`pong`: Heartbeat

**Acceptance Criteria**:

- ✅ WebSocket connection established on page load
- ✅ Real-time updates (< 100ms latency)
- ✅ Auto-reconnect on disconnect
- ✅ Connection status indicator
- ✅ No more polling (except WebSocket fallback)
- ✅ Smooth updates without flashing

**Test Plan (TEST-UI-websocket)**:

- Manual: Switch scenes, verify instant UI update
- Test disconnect/reconnect behavior
- Measure update latency
- Verify no polling in network tab

---

### UI-505: Config Page - Web-based configuration editor with persistence

- **Priority**: P2 (Nice to Have - Admin)
- **Effort**: 3 days
- **Risk**: Medium (complex validation)
- **Dependencies**: CFG-501, CFG-502

**Summary**: Add web-based configuration editor with Vuetify forms,
save to `/data/config.json`, hot reload on save.

**Current Problem**:

- Configuration via environment variables only
- Have to restart container to change config
- No validation of config values
- Hard to manage multiple devices

**Implementation Plan**:

1. Create `ConfigPage.vue` with Vuetify form components:

   ```vue
   <v-form v-model="valid">
     <v-card>
       <v-card-title>MQTT Settings</v-card-title>
       <v-card-text>
         <v-text-field
           v-model="config.mqtt.host"
           label="MQTT Broker Host"
           :rules="[rules.required, rules.hostname]"
         />
         <v-text-field
           v-model="config.mqtt.username"
           label="Username"
           :rules="[rules.required]"
         />
         <v-text-field
           v-model="config.mqtt.password"
           label="Password"
           type="password"
           :rules="[rules.required]"
         />
       </v-card-text>
     </v-card>
     
     <v-card>
       <v-card-title>Devices</v-card-title>
       <v-card-text>
         <v-list>
           <v-list-item v-for="device in config.devices" :key="device.ip">
             <v-text-field v-model="device.ip" label="IP Address" />
             <v-select
               v-model="device.driver"
               :items="['real', 'mock']"
               label="Driver"
             />
             <v-text-field v-model="device.alias" label="Alias (optional)" />
             <v-btn icon @click="removeDevice(device)">
               <v-icon>mdi-delete</v-icon>
             </v-btn>
           </v-list-item>
         </v-list>
         <v-btn @click="addDevice">Add Device</v-btn>
       </v-card-text>
     </v-card>
     
     <v-card-actions>
       <v-btn color="primary" @click="saveConfig" :disabled="!valid">
         Save & Apply
       </v-btn>
       <v-btn @click="testConfig" :disabled="!valid">
         Test Connection
       </v-btn>
       <v-btn @click="resetConfig">
         Reset to Defaults
       </v-btn>
     </v-card-actions>
   </v-form>
   ```

2. Add config API endpoints (see CFG-502)
3. Add validation rules:
   - Required fields
   - Valid IP addresses
   - Valid hostnames
   - Port ranges

4. Add "Test Connection" button:
   - Tests MQTT connection
   - Pings devices
   - Shows validation results

5. Add "Save & Apply" button:
   - Saves to `/data/config.json`
   - Hot reloads daemon config
   - Shows success/error toast

6. Add import/export config (JSON download/upload)

**Config Structure** (`/data/config.json`):

```json
{
  "mqtt": {
    "host": "miniserver24",
    "port": 1883,
    "username": "smarthome",
    "password": "***"
  },
  "devices": [
    {
      "ip": "192.168.1.159",
      "driver": "real",
      "alias": "Living Room"
    },
    {
      "ip": "192.168.1.189",
      "driver": "mock",
      "alias": "Test Device"
    }
  ],
  "webui": {
    "port": 10829,
    "auth": {
      "enabled": false,
      "username": "admin",
      "password": "***"
    }
  },
  "scenes": {
    "startup": "startup",
    "default": "empty"
  }
}
```

**Acceptance Criteria**:

- ✅ Config page accessible at `/config`
- ✅ All config values editable
- ✅ Validation before save
- ✅ Test MQTT connection button
- ✅ Save to `/data/config.json`
- ✅ Hot reload on save (no restart)
- ✅ Import/export config (JSON)
- ✅ Clear error messages

**Test Plan (TEST-UI-config)**:

- Manual: Edit all config fields, save
- Test validation (invalid IPs, etc.)
- Test MQTT connection
- Verify hot reload
- Test import/export

---

### UI-506: Scene Time - Stop timer when scene completes (testCompleted)

- **Priority**: P1 (Should Have - Bug Fix)
- **Effort**: 2-4 hours
- **Risk**: Low

**Problem**:

Scene time counter in Web UI continues ticking even after a scene like `performance-test.js`
shows "COMPLETE" and stops rendering. The scene timer should stop when `testCompleted` is true.

**Root Cause**:

1. `App.vue` polls `/api/devices` every 5 seconds
2. `DeviceCard.vue` has `sceneTimeInterval` that updates every 1 second
3. `updateSceneTime()` checks `props.device.sceneState?.testCompleted` to stop the timer
4. **Race condition**: Scene time updates every 1s, but device state only updates every 5s
5. Result: Timer keeps ticking for up to 5 seconds after scene completes

**Solution Options**:

**Option A: React to prop changes** (Recommended)

Add a watcher on `props.device.sceneState` to immediately stop timer when `testCompleted` changes:

```javascript
watch(
  () => props.device.sceneState,
  (newState) => {
    if (newState?.testCompleted || newState?.isRunning === false) {
      if (sceneTimeInterval) {
        clearInterval(sceneTimeInterval);
        sceneTimeInterval = null;
      }
      updateSceneTime(); // Final update
    }
  },
  { deep: true },
);
```

**Option B: Faster polling** (addresses UI-507)

Reduce App.vue polling from 5s to 1s or less, so state updates faster.

**Acceptance Criteria**:

- [ ] Scene timer stops within 1s of scene completing
- [ ] Scene timer shows "Complete" status
- [ ] Timer doesn't resume after stopping
- [ ] Works for both `testCompleted` and `isRunning: false` states

**Test Plan** (TEST-UI-scene-timer):

1. Start performance-test scene (100 frames)
2. Watch scene time counter while scene runs
3. When Pixoo shows "COMPLETE", verify:
   - Timer stops within 1 second
   - Display shows "Complete"
   - Timer doesn't tick anymore
4. Repeat with static scenes (wantsLoop: false)

---

### UI-507: Chart Updates - Faster polling for smoother chart visualization

- **Priority**: P1 (Should Have - UX)
- **Effort**: 1-2 hours
- **Risk**: Low

**Problem**:

Frametime chart shows exact 5-second steps, even though:

- `DeviceCard.vue` polls every 200ms (`metricsInterval`)
- Performance-test shows per-frame variations on Pixoo screen
- Chart should show smooth, continuous updates

**Root Cause**:

`App.vue` polls `/api/devices` every **5 seconds**, which updates `props.device.metrics`:

```javascript
// App.vue line 135
setInterval(loadData, 5000); // ← Device data only updates every 5s!
```

`DeviceCard.vue` polls every 200ms but reads from `props.device.metrics`, which is only updated
every 5s from the parent. Result: Chart appears to update quickly but data is stale.

**Solution**:

**Option A: Faster App polling** (Quick fix)

```javascript
// App.vue
setInterval(loadData, 1000); // Update every 1s instead of 5s
```

**Pros**: Simple, works immediately  
**Cons**: More API calls (1 req/s vs 1 req/5s), not ideal for many devices

**Option B: Per-device metrics polling** (Better)

Let each `DeviceCard` poll its own device metrics independently:

```javascript
// DeviceCard.vue
async function loadMetrics() {
  const response = await api.getDeviceInfo(props.device.ip);
  // Update local metrics without waiting for App.vue
}
```

**Pros**: Smooth updates, scalable  
**Cons**: Multiple API calls per device

**Option C: WebSocket** (Best long-term - see UI-504)

Push metrics from backend when they change, no polling needed.

**Recommendation**: Implement Option A now (1-2 hours), plan Option C for UI-504.

**Acceptance Criteria**:

- [ ] Chart updates show smooth transitions (no 5s steps)
- [ ] Per-frame variations visible in chart
- [ ] Chart reflects actual scene frametime changes
- [ ] No performance degradation

**Test Plan** (TEST-UI-chart-poll):

1. Start performance-test scene
2. Watch frametime chart in Web UI
3. Compare chart with Pixoo screen values
4. Verify:
   - Chart shows per-frame variations (not flat 5s steps)
   - Chart updates smoothly every 1s or less
   - Values match Pixoo screen metrics

---

### UI-508: State Sync - Detect actual Pixoo state on UI connect/refresh

- **Priority**: P2 (Nice to Have - UX)
- **Effort**: 4-6 hours
- **Risk**: Medium

**Problem**:

When closing and reopening Web UI (or refreshing page), some UI states are "wrong":

- Scene selector shows last selected scene, not actual running scene
- Brightness slider shows default, not actual brightness
- Display toggle shows wrong state
- No way to detect actual Pixoo device state

**Root Cause**:

1. **No state persistence**: Vue stores don't persist across page reloads
2. **No state query**: Backend doesn't track current brightness/display state
3. **MQTT-driven state**: Backend knows scene state (via MQTT), but not device hardware state

**Challenges**:

- Pixoo devices don't expose a "get current state" API
- Brightness/display state are write-only (no read API)
- Scene state is known (via scene manager), but hardware state is not
- Would need to track last-set values in backend

**Solution Options**:

**Option A: Scene state sync** (Quick win)

Already works! On UI load, `/api/devices` returns `currentScene` from scene manager.
Just need to ensure Vue stores sync with API response on mount.

```javascript
// store/scenes.js
onMounted(() => {
  const devices = await api.getDevices();
  devices.forEach(device => {
    // Sync local state with server state
    deviceStore.setCurrentScene(device.ip, device.currentScene);
  });
});
```

**Option B: Backend state tracking** (Medium effort)

Track last-set brightness/display state in backend:

```javascript
// lib/services/device-service.js
const deviceHardwareState = new Map(); // ip -> { brightness, displayOn }

async setDisplayPower(ip, on) {
  await device.setDisplayPower(on);
  deviceHardwareState.set(ip, { ...state, displayOn: on });
}

async getDeviceInfo(ip) {
  return {
    ...deviceInfo,
    hardware: deviceHardwareState.get(ip) || { brightness: 100, displayOn: true }
  };
}
```

**Option C: Query Pixoo device** (Experimental)

Research if Pixoo API has undocumented state query endpoints. If found, query device on
UI connect to get actual hardware state.

**Option D: WebSocket + State Events** (UI-504)

Broadcast state changes via WebSocket. All UI clients stay synced automatically.

**Recommendation**: Implement Option A now (scene sync), Option B for brightness/display,
plan Option D for UI-504.

**Acceptance Criteria**:

- [ ] On UI load, scene selector shows actual running scene
- [ ] On UI refresh, display toggle reflects last-set state
- [ ] Brightness slider shows last-set value (if tracked)
- [ ] Multiple UI clients show consistent state

**Test Plan** (TEST-UI-state-sync):

1. Open Web UI, switch to `clock` scene
2. Close Web UI completely
3. Reopen Web UI
4. Verify:
   - Scene selector shows `clock` (not `startup`)
   - Display toggle reflects actual state
   - Brightness slider shows correct value (if implemented)
5. Open Web UI in two browser tabs
6. Change scene in tab 1
7. Refresh tab 2
8. Verify: Tab 2 shows updated scene

---

### UI-509: Scene Metadata Viewer - Display scene payload/config when selected

- **Priority**: P2 (Nice to Have - UX)
- **Effort**: 2-3 hours
- **Risk**: Low

**Problem**:

Users can't see what parameters/payload a scene is using when they select it. For data-driven
scenes like `power_price`, `advanced_chart`, or `performance-test`, the payload contains
important configuration that determines scene behavior.

**Use Cases**:

1. **Inspection**: See what parameters are currently active
2. **Debugging**: Understand why scene behaves a certain way
3. **Documentation**: Self-documenting API (payload shows available options)
4. **Future editing**: Foundation for UI-510 (editable params)

**Example Payloads**:

```javascript
// Simple scene (performance-test)
{
  frames: 100,
  interval: null  // adaptive mode
}

// Complex scene (power_price)
{
  apiKey: "***",
  region: "NO1",
  currency: "NOK",
  refreshInterval: 300000,
  priceData: [
    { hour: 0, price: 0.45 },
    { hour: 1, price: 0.42 },
    // ... 22 more entries
  ]
}

// Data scene (advanced_chart)
{
  title: "Temperature",
  data: [18.5, 19.2, 20.1, ...],
  min: 15,
  max: 25,
  unit: "°C"
}
```

**Implementation Plan**:

1. **Add collapsible metadata section below scene description** in `DeviceCard.vue`:

```vue
<v-expansion-panels v-if="selectedSceneMetadata" class="mt-2">
  <v-expansion-panel>
    <v-expansion-panel-title>
      <v-icon class="mr-2">mdi-code-json</v-icon>
      Scene Configuration
    </v-expansion-panel-title>
    <v-expansion-panel-content>
      <SceneMetadataViewer :metadata="selectedSceneMetadata" />
    </v-expansion-panel-content>
  </v-expansion-panel>
</v-expansion-panels>
```

1. **Create `SceneMetadataViewer.vue` component**:

Smart rendering based on payload complexity:

```vue
<template>
  <div class="metadata-viewer">
    <!-- Simple key-value pairs -->
    <v-simple-table v-if="isSimple" dense>
      <tbody>
        <tr v-for="(value, key) in metadata" :key="key">
          <td class="font-weight-medium">{{ formatKey(key) }}</td>
          <td class="text-right">
            <v-chip v-if="typeof value === 'boolean'" small>
              {{ value }}
            </v-chip>
            <code v-else-if="isNumeric(value)">{{ value }}</code>
            <span v-else>{{ value }}</span>
          </td>
        </tr>
      </tbody>
    </v-simple-table>

    <!-- Complex nested data -->
    <v-card v-else variant="outlined" class="pa-3">
      <pre class="metadata-json">{{ formatJSON(metadata) }}</pre>
    </v-card>
  </div>
</template>

<script setup>
const props = defineProps({
  metadata: Object,
});

// Simple if flat object with < 10 keys and no nested objects/arrays
const isSimple = computed(() => {
  const keys = Object.keys(props.metadata || {});
  if (keys.length > 10) return false;
  return keys.every((key) => {
    const val = props.metadata[key];
    return typeof val !== 'object' || val === null;
  });
});

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

function isNumeric(val) {
  return typeof val === 'number';
}
</script>

<style scoped>
.metadata-json {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #2c3e50;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 400px;
}

.metadata-viewer {
  max-width: 100%;
}
</style>
```

1. **Get metadata from scene store**:

```javascript
const selectedSceneMetadata = computed(() => {
  if (!selectedScene.value) return null;
  const sceneInfo = sceneStore.scenes.find(
    (s) => s.name === selectedScene.value,
  );
  return sceneInfo?.payload || sceneInfo?.config || null;
});
```

1. **Handle sensitive data**:

```javascript
function maskSensitive(metadata) {
  const masked = { ...metadata };
  const sensitiveKeys = ['apiKey', 'password', 'secret', 'token'];

  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      masked[key] = '***';
    }
  }

  return masked;
}
```

**Acceptance Criteria**:

- [ ] Metadata section appears below scene description when scene has payload/config
- [ ] Simple key-value pairs shown as table (< 10 keys, no nesting)
- [ ] Complex data shown as formatted JSON
- [ ] Sensitive fields (apiKey, password) masked with `***`
- [ ] Collapsible to save space
- [ ] Responsive layout (works on mobile)
- [ ] Numbers/booleans displayed with appropriate formatting
- [ ] Large payloads (e.g., power_price with 24 hours) scroll-able

**Test Plan** (TEST-UI-metadata):

1. Select `performance-test` scene
   - Verify simple table shows: frames, interval
2. Select `power_price` scene (if running)
   - Verify JSON view shows full payload
   - Verify apiKey is masked
   - Verify priceData array is visible and scroll-able
3. Select `startup` scene (no payload)
   - Verify metadata section doesn't appear
4. Test responsive layout on mobile
5. Test collapse/expand functionality

**Future Enhancements** (UI-510):

- Editable fields with inline editing
- Form validation
- Apply changes without scene restart
- Presets/templates for common configs

---

### CFG-501: Config Persistence - /data volume for persistent configuration

- **Priority**: P2 (Nice to Have - Admin)
- **Effort**: 1 day
- **Risk**: Low (Docker volume)

**Summary**: Add `/data` volume mount for persistent configuration,
merge with environment variables (env vars override).

**Current Problem**:

- No persistent storage
- Config lost on container restart
- Can't save user preferences

**Implementation Plan**:

1. Update Dockerfile to create `/data` directory:

   ```dockerfile
   RUN mkdir -p /data && chown -R node:node /data
   VOLUME /data
   ```

2. Update docker-compose.yml documentation:

   ```yaml
   volumes:
     - ./pixoo-data:/data # Persistent config and state
   ```

3. Create config loader:

   ```javascript
   // lib/config-loader.js
   const CONFIG_PATH = '/data/config.json';

   function loadConfig() {
     // 1. Load from /data/config.json (if exists)
     // 2. Merge with environment variables (env overrides)
     // 3. Apply defaults for missing values
     // 4. Validate config
     // 5. Return merged config
   }
   ```

4. Initialize `/data/config.json` on first run
5. Document volume mount requirements
6. Add migration from env vars to config file

**Directory Structure**:

```text
/data/
  config.json        # Main configuration
  ui-state.json      # UI preferences (collapsed state)
  logs/              # Optional log persistence
  scenes/            # User custom scenes (future)
```

**Acceptance Criteria**:

- ✅ `/data` directory created in Docker image
- ✅ Volume mount documented
- ✅ Config persists across restarts
- ✅ Environment variables still work (override)
- ✅ First-run initialization
- ✅ Migration guide for existing users

**Test Plan (TEST-CFG-persist)**:

- Create config, restart container
- Verify config persisted
- Test env var override
- Test first-run initialization

---

### CFG-502: Config API - REST endpoints for config management

- **Priority**: P2 (Nice to Have - Admin)
- **Effort**: 1 day
- **Risk**: Low (standard CRUD)
- **Dependencies**: CFG-501

**Summary**: Add REST API endpoints for reading and writing configuration.

**Implementation Plan**:

1. Add config endpoints to `web/server.js`:

   ```javascript
   // GET /api/config - Get current config
   app.get('/api/config', async (req, res) => {
     const config = await configLoader.getConfig();
     // Mask sensitive fields (passwords)
     res.json({ config: maskSensitive(config) });
   });

   // POST /api/config - Update config
   app.post('/api/config', async (req, res) => {
     const newConfig = req.body;

     // Validate config
     const errors = validateConfig(newConfig);
     if (errors.length > 0) {
       return res.status(400).json({ errors });
     }

     // Save config
     await configLoader.saveConfig(newConfig);

     // Hot reload
     await reloadConfig();

     res.json({ success: true, message: 'Config saved and applied' });
   });

   // POST /api/config/test - Test config (doesn't save)
   app.post('/api/config/test', async (req, res) => {
     const config = req.body;
     const results = await testConfig(config);
     res.json({ results });
   });

   // POST /api/config/reset - Reset to defaults
   app.post('/api/config/reset', async (req, res) => {
     await configLoader.resetToDefaults();
     res.json({ success: true });
   });
   ```

2. Add config validation:
   - Schema validation (JSON schema)
   - MQTT connection test
   - Device ping test
   - Port availability check

3. Add sensitive field masking (passwords)
4. Add audit logging (who changed what)

**Acceptance Criteria**:

- ✅ GET `/api/config` returns current config
- ✅ POST `/api/config` saves and applies
- ✅ POST `/api/config/test` validates without saving
- ✅ Passwords masked in responses
- ✅ Clear validation error messages
- ✅ Audit log for changes

**Test Plan (TEST-CFG-api)**:

- Unit tests: Config endpoints with supertest
- Test validation (invalid configs)
- Verify hot reload after save
- Verify password masking

---

### CFG-503: Config Hot Reload - Apply config changes without restart

- **Priority**: P2 (Nice to Have - Admin)
- **Effort**: 2 days
- **Risk**: Medium (state management)
- **Dependencies**: CFG-501, CFG-502

**Summary**: Apply configuration changes at runtime without restarting the daemon.

**Current Problem**:

- Config changes require full restart
- Disrupts running scenes
- Loses connection state

**Implementation Plan**:

1. Create config reload manager:

   ```javascript
   // lib/config-reload.js
   class ConfigReloadManager {
     async reloadConfig(newConfig) {
       // 1. Validate new config
       // 2. Compare with current config
       // 3. Apply changes incrementally:
       //    - MQTT: Reconnect if broker changed
       //    - Devices: Add/remove/update devices
       //    - Scenes: Reload scene list
       //    - WebUI: Update port (requires restart)
       // 4. Emit config_changed event
       // 5. Update MQTT state topics
     }

     async applyMqttChanges(oldMqtt, newMqtt) {
       if (mqttChanged(oldMqtt, newMqtt)) {
         await mqttService.disconnect();
         await mqttService.connect(newMqtt);
       }
     }

     async applyDeviceChanges(oldDevices, newDevices) {
       // Add new devices
       // Remove deleted devices
       // Update existing devices
     }
   }
   ```

2. Implement incremental reload:
   - MQTT: Disconnect and reconnect if changed
   - Devices: Add/remove without affecting others
   - Scenes: Reload scene list
   - WebUI: Note that port change requires restart

3. Add config change events:
   - Emit events on config changes
   - Services subscribe to relevant events
   - React to changes incrementally

4. Handle reload errors gracefully:
   - Roll back to previous config on error
   - Clear error messages
   - Don't leave system in broken state

**Reloadable vs Restart-Required**:

| Setting          | Reloadable?              |
| ---------------- | ------------------------ |
| MQTT broker      | ✅ Yes (reconnect)       |
| MQTT credentials | ✅ Yes (reconnect)       |
| Device list      | ✅ Yes (add/remove)      |
| Device drivers   | ✅ Yes (hot-swap)        |
| Scene list       | ✅ Yes (rescan)          |
| Web UI port      | ❌ No (restart required) |
| Auth settings    | ❌ No (restart required) |

**Acceptance Criteria**:

- ✅ MQTT changes applied without restart
- ✅ Device changes applied incrementally
- ✅ Running scenes unaffected by reload
- ✅ Clear indication of what requires restart
- ✅ Roll back on reload error
- ✅ Config change events emitted

**Test Plan (TEST-CFG-hotreload)**:

- Change MQTT broker, verify reconnect
- Add/remove devices, verify updates
- Change device driver, verify hot-swap
- Test error handling and rollback

---

## Implementation Priority - Modern Web UI

Based on dependencies and impact:

### Phase UI-1: Foundation (3-4 days)

1. **UI-501** - Vue 3 + Vuetify 3 setup
2. **UI-502** - Toast notifications

### Phase UI-2: UX Improvements (2-3 days)

1. **UI-503** - Collapsible cards
2. **UI-504** - WebSocket real-time updates

### Phase UI-3: Configuration (4-5 days)

1. **CFG-501** - Config persistence (/data volume)
2. **CFG-502** - Config API endpoints
3. **UI-505** - Config page UI
4. **CFG-503** - Config hot reload

**Total Effort**: 9-12 days

---

**Status**: UI-501 starting now! 🚀
