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
| ARC-305  | Add Service Layer: Business logic abstraction                          | planned     | TEST-ARC-service-layer | -                          | -                    |
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
