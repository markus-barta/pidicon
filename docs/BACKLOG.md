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
| ARC-101  | Architecture audit & alignment with standards                          | in_progress | TEST-ARC-audit         | pass (review, build 348)   | 2025-09-18T17:21:27Z |
| API-201  | Unified Device API: Single drawing interface with consistent naming    | planned     | TEST-API-unified       | -                          | -                    |
| FRM-202  | Scene Framework: Base classes, composition, and standardized patterns  | planned     | TEST-FRM-composition   | -                          | -                    |
| GFX-203  | Graphics Engine: Advanced rendering, animation system, resource cache  | planned     | TEST-GFX-engine        | -                          | -                    |
| CFG-204  | Configuration Enhancements: Validation and presets                     | planned     | TEST-CFG-validation    | -                          | -                    |
| TST-205  | Testing Framework: Scene unit tests, integration tests, performance    | planned     | TEST-TST-framework     | -                          | -                    |
| CON-102  | Consistency pass: naming, contracts, return values                     | completed   | TEST-CON-contracts     | pass (audit, 259/47cabd0)  | 2025-09-19T19:05:00Z |
| CLN-103  | Cleanup: dead code, dev overrides, unused branches                     | completed   | TEST-CLN-deadcode      | pass (review, 259/47cabd0) | 2025-09-19T19:05:00Z |
| REL-104  | Release checklist for public v1.1: final smoke & notes                 | completed   | TEST-REL-smoke         | pass (real, 373/13e814d)   | 2025-09-19T20:17:00Z |

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
