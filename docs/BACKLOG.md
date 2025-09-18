# Development Backlog

This backlog tracks the plan and tests for the centralized scene scheduler,
per-device state machine, and robust scene switching. It is the single source
of truth for upcoming work and its validation status.

---

## Summary Table

| ID       | TODO                                                                   | State       | Test Name              | Last Test Result              | Last Test Run        |
| -------- | ---------------------------------------------------------------------- | ----------- | ---------------------- | ----------------------------- | -------------------- |
| SSM-001  | Per-device scene state machine; genId; MQTT mirror                     | in_progress | TEST-SSM-basic         | pass (real, 348/0ba467e)      | 2025-09-18T15:02:40Z |
| SCH-002  | Central per-device scheduler; remove scene-owned timers                | in_progress | TEST-SCH-loop-stop     | pass (real, 348/0ba467e)      | 2025-09-18T15:02:40Z |
| GATE-003 | Gate inputs by (device, scene, generation); drop stale continuations   | completed   | TEST-GATE-stale-drop   | pass (real, 348/0ba467e)      | 2025-09-18T15:02:40Z |
| REF-004  | Refactor all scenes to pure render; no self-MQTT/timers                | in_progress | TEST-REF-scenes-pure   | pass (real, 341/8415058)      | 2025-09-18T13:57:54Z |
| MDEV-005 | Multi-device isolation; parallel schedulers                            | in_progress | TEST-MDEV-dual-device  | pass (real+mock, 343/85f2714) | 2025-09-18T14:26:12Z |
| CFG-006  | Configurable topic base and state keys                                 | completed   | TEST-CFG-topic-base    | pass (real, 338/54f35c6)      | 2025-09-17T18:26:49Z |
| OBS-007  | Observability: publish `/home/pixoo/<ip>/scene/state`; log stale drops | in_progress | TEST-OBS-state-publish | pass (real, 337/8432b30)      | 2025-09-17T18:20:01Z |
| TST-008  | Automation: mock-driver integration tests + manual scripts             | in_progress | TEST-TST-harness       | pass (real, 348/0ba467e)      | 2025-09-18T15:02:40Z |
| SOAK-009 | Stability: 30–60 min soak with frequent switches                       | postponed   | TEST-SOAK-stability    | -                             | -                    |
| DOC-010  | Documentation: dev guide, git readme and backlog hygiene               | in_progress | TEST-DOC-checklist     | -                             | -                    |
| ARC-101  | Architecture audit & alignment with standards                          | planned     | TEST-ARC-audit         | -                             | -                    |
| CON-102  | Consistency pass: naming, contracts, return values                     | planned     | TEST-CON-contracts     | -                             | -                    |
| CLN-103  | Cleanup: dead code, dev overrides, unused branches                     | planned     | TEST-CLN-deadcode      | -                             | -                    |
| REL-104  | Release checklist for public v1.1: final smoke & notes                 | planned     | TEST-REL-smoke         | -                             | -                    |

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
- Test Plan (TEST-SSM-basic):
  - Start scene A, switch to B; verify state topic shows correct transitions
    and new generationId.
  - Rapidly switch A→B→C; verify no regressions, generation increments each time.
  - Multi-device: independent state machines update correctly.

### SCH-002: Central per-device scheduler; remove scene-owned timers

- Summary: One scheduler loop per device controls timing; scenes never own
  timers. Scenes become pure renderers that optionally return `nextDelayMs`.
- Acceptance Criteria:
  - On switch, old device loop halts instantly; new loop starts with new
    generation.
  - No `setTimeout` or MQTT-based continuation remains inside scenes.
- Test Plan (TEST-SCH-loop-stop):
  - Trigger switch while a frame is in-flight; verify only the new loop continues afterward.
  - Verify no callbacks from previous generation fire.

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
- Test Plan (TEST-MDEV-dual-device):
  - Run two devices (mock or real+mock). Switch scenes independently and verify isolation.

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
- Test Plan (TEST-OBS-state-publish):
  - Observe MQTT stream while switching; confirm messages and logs.

### TST-008: Test harness and procedures

- Summary: Add mock-driver integration tests for gating/scheduler; provide manual MQTT scripts for local real-device runs.
- Acceptance Criteria:
  - CI/PNPM script to run integration tests locally.
  - Manual checklist to validate on a real device.
- Test Plan (TEST-TST-harness):
  - Run harness; ensure all tests pass with mock driver.

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
- Test Plan (TEST-CON-contracts):
  - Lint pass zero errors; run harness and perf-once tests; verify no behavior change.

### CLN-103: Cleanup (dead code & dev overrides)

- Summary: Remove dead code, disable dev-only overrides, and delete unused branches.
- Acceptance Criteria:
  - Remove or guard `DEVICE_TARGETS_OVERRIDE` in `lib/device-adapter.js` for
    production.
  - Drop unreachable/unused code paths now superseded by the scheduler (e.g.,
    legacy animation frame handling in update paths) while keeping behavior.
  - Ensure no unused files remain; update README references.
- Test Plan (TEST-CLN-deadcode):
  - Static analysis (unused code/exports), minimal functional smoke via harness.

### REL-104: Release checklist for public v1.1

- Summary: Finalize public release with traceable tests and notes.
- Acceptance Criteria:
  - Run `live_test_perf_once.js`, `live_test_gate.js`, and
    `live_test_harness.js` against live build; record build/commit in
    backlog.
  - Tag release with changelog; confirm README updated.
  - SOAK-009 explicitly postponed.
- Test Plan (TEST-REL-smoke):
  - Execute the three scripts and update this backlog with confirmed
    build/commit and timestamps.

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
