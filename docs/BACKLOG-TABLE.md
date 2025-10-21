# Development Backlog Table

This table provides an overview of all project backlog items (stories). Each item's ID is documented in the historical backlog snapshots (`docs/X***_BACKLOG.md`) as well as the current backlog sources (`docs/BACKLOG.md`, `docs/BACKLOG_DONE.md`, reports under `docs/reports/`).

---

## Summary Table

| ID          | TODO                                             | State     | Test Name              | Last Test Result           | Last Test Run        |
| ----------- | ------------------------------------------------ | --------- | ---------------------- | -------------------------- | -------------------- |
| API-201     | Unified Device API                               | Completed | TEST-API-unified       | pass (manual test)         | 2025-09-20T17:15:00Z |
| ARC-101     | Architecture audit & alignment                   | Completed | TEST-ARC-audit         | pass (review, build 449)   | 2025-09-30T18:00:00Z |
| ARC-301     | Extract MQTT Service                             | Completed | TEST-ARC-mqtt-service  | pass (89/89 tests)         | 2025-09-30T22:00:00Z |
| ARC-302     | Implement Dependency Injection                   | Completed | TEST-ARC-di-container  | pass (43/43 tests)         | 2025-09-30T20:20:00Z |
| ARC-303     | Consolidate State Management                     | Completed | TEST-ARC-state-store   | pass (96/96 tests)         | 2025-09-30T23:00:00Z |
| ARC-304     | Extract Command Handlers                         | Completed | TEST-ARC-cmd-handlers  | pass (107/107 tests)       | 2025-10-02T18:30:00Z |
| ARC-305     | Add Service Layer                                | Completed | TEST-ARC-service-layer | pass (152/152 tests)       | 2025-10-02T23:00:00Z |
| BUG-012     | Critical MQTT routing broken                     | Fixed     | TEST-BUG-mqtt-routing  | pass (143/143 tests)       | 2025-10-02T19:15:00Z |
| BUG-013     | StateCommandHandler missing logic                | Fixed     | TEST-BUG-state-handler | pass (152/152 tests)       | 2025-10-02T19:45:00Z |
| BUG-020     | Stop + Play Scene Restart (P0)                   | Completed | TEST-BUG-stop-play     | pass (integration)         | 2025-10-06T10:20:00Z |
| BUG-021     | Real Device "Last Seen" Tracking (P0)            | Completed | TEST-BUG-last-seen     | pass (manual verification) | 2025-10-06T11:00:00Z |
| CFG-006     | Configurable topic base and state keys           | Completed | TEST-CFG-topic-base    | pass (real, 338/54f35c6)   | 2025-09-17T18:26:49Z |
| CFG-204     | Configuration Enhancements                       | Completed | TEST-CFG-validation    | -                          | -                    |
| CFG-501     | Config Persistence (P2)                          | Unknown   | TEST-CFG-persist       | -                          | -                    |
| CFG-502     | Config API (P2)                                  | Unknown   | TEST-CFG-api           | -                          | -                    |
| CFG-503     | Config Hot Reload (P2)                           | Unknown   | TEST-CFG-hotreload     | -                          | -                    |
| CLN-103     | Cleanup                                          | Completed | TEST-CLN-deadcode      | pass (review, 259/47cabd0) | 2025-09-19T19:05:00Z |
| CON-102     | Consistency pass                                 | Completed | TEST-CON-contracts     | pass (audit, 259/47cabd0)  | 2025-09-19T19:05:00Z |
| DOC-010     | Documentation updates                            | Completed | TEST-DOC-checklist     | pass (readme updated)      | 2025-09-18T17:50:38Z |
| DOC-011     | API Documentation (P1)                           | Planned   | TEST-DOC-api           | -                          | -                    |
| DOC-301     | Documentation polish                             | Completed | TEST-DOC-polish        | pass (updated)             | 2025-10-02T22:30:00Z |
| FRM-202     | Scene Framework                                  | Completed | TEST-FRM-composition   | pass (manual test)         | 2025-09-20T17:30:00Z |
| GATE-003    | Input gating on (scene, generation)              | Completed | TEST-GATE-stale-drop   | pass (real, 348/0ba467e)   | 2025-09-18T15:02:40Z |
| GFX-203     | Graphics Engine                                  | Completed | TEST-GFX-engine        | -                          | -                    |
| MDEV-005    | Multi-device isolation                           | Completed | TEST-MDEV-dual-device  | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| OBS-007     | Observability                                    | Completed | TEST-OBS-state-publish | pass (real, 373/13e814d)   | 2025-09-19T20:15:00Z |
| PERF-301    | Performance Optimizations (P1)                   | Planned   | TEST-PERF-optimize     | -                          | -                    |
| REF-004     | Refactor all scenes to pure render               | Completed | TEST-REF-scenes-pure   | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| REL-104     | Release checklist for v1.1                       | Completed | TEST-REL-smoke         | pass (real, 373/13e814d)   | 2025-09-19T20:17:00Z |
| REV-301     | Code quality review                              | Completed | TEST-REV-code-quality  | pass (5/5 rating)          | 2025-10-02T21:30:00Z |
| REV-302     | Performance review                               | Completed | TEST-REV-performance   | pass (4/5 rating)          | 2025-10-02T22:00:00Z |
| ROADMAP-001 | AWTRIX Driver Implementation (P1)                | Planned   | -                      | -                          | -                    |
| ROADMAP-002 | Scene Dimension Adapter (P1)                     | Planned   | -                      | -                          | -                    |
| ROADMAP-003 | Device Auto-Discovery (P2)                       | Planned   | -                      | -                          | -                    |
| ROADMAP-004 | Enhanced Watchdog Features (P1)                  | Planned   | -                      | -                          | -                    |
| ROADMAP-005 | Multi-Device Scene Manager (P2)                  | Planned   | -                      | -                          | -                    |
| ROADMAP-006 | Device Profiles & Testing UI (P2)                | Planned   | -                      | -                          | -                    |
| ROADMAP-007 | Configuration Backup & Sync (P2)                 | Planned   | -                      | -                          | -                    |
| ROADMAP-008 | Additional Device Support (P2)                   | Planned   | -                      | -                          | -                    |
| ROADMAP-009 | Plugin System (P2)                               | Planned   | -                      | -                          | -                    |
| ROADMAP-010 | Scene Marketplace (P2)                           | Planned   | -                      | -                          | -                    |
| SCH-002     | Central per-device scheduler                     | Completed | TEST-SCH-loop-stop     | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| SCN-101     | Fill Scene Random Color                          | Completed | TEST-SCN-fill-random   | pass (manual, build 568)   | 2025-10-08T22:00:00Z |
| SCN-102     | Power Price Scene Metadata                       | Completed | TEST-SCN-pp-metadata   | pass (manual, build 570)   | 2025-10-08T23:00:00Z |
| SCN-201     | Scene Library Expansion (P2)                     | Ongoing   | TEST-SCN-library       | -                          | -                    |
| SOAK-009    | Stability soak ⏸️                                | Postponed | TEST-SOAK-stability    | -                          | -                    |
| SSM-001     | Per-device scene state machine with generationId | Completed | TEST-SSM-basic         | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| TST-008     | Test harness and procedures                      | Completed | TEST-TST-harness       | pass (mock, 259/47cabd0)   | 2025-09-19T19:05:00Z |
| TST-301     | Improve Test Coverage (P1)                       | Planned   | TEST-TST-coverage      | -                          | -                    |
| TST-302     | Integration tests for command handlers           | Completed | TEST-TST-cmd-integ     | pass (152/152 tests)       | 2025-10-02T20:00:00Z |
| TST-303     | Device-adapter tests                             | Completed | TEST-TST-device-adapt  | pass (36 tests)            | 2025-10-02T21:00:00Z |
| UI-401      | Web UI Control Panel                             | Completed | TEST-UI-web-panel      | pass (152/152 tests)       | 2025-10-02T23:00:00Z |
| UI-501      | Vue 3 + Vuetify 3 Migration                      | Completed | TEST-UI-vue-setup      | pass (manual test)         | 2025-10-03T20:00:00Z |
| UI-502      | Toast Notifications                              | Completed | TEST-UI-toasts         | pass (manual test)         | 2025-10-03T20:00:00Z |
| UI-503      | Collapsible Cards                                | Completed | TEST-UI-collapse       | -                          | -                    |
| UI-504      | WebSocket Integration                            | Completed | TEST-UI-websocket      | -                          | -                    |
| UI-505      | Config Page (P2)                                 | Planned   | TEST-UI-config         | -                          | -                    |
| UI-506      | Scene Time Timer Fix                             | Completed | TEST-UI-scene-timer    | pass (manual, build 547)   | 2025-10-08T20:00:00Z |
| UI-507      | Chart Updates Faster Polling                     | Completed | TEST-UI-chart-poll     | pass (manual, build 547)   | 2025-10-08T20:00:00Z |
| UI-508      | State Sync on Connect                            | Completed | TEST-UI-state-sync     | pass (manual, build 547)   | 2025-10-08T20:00:00Z |
| UI-509      | Scene Metadata Viewer                            | Completed | TEST-UI-metadata       | pass (manual, build 565)   | 2025-10-08T21:00:00Z |
| UI-510      | Scene State Display                              | Completed | TEST-UI-scene-state    | pass (manual, build 568)   | 2025-10-08T22:00:00Z |
| UI-511      | Scene Restart Button                             | Completed | TEST-UI-scene-restart  | pass (manual, build 568)   | 2025-10-08T22:00:00Z |
| UI-512      | Vue Confirm Dialog                               | Completed | TEST-UI-vue-confirm    | pass (manual, build 570)   | 2025-10-08T23:00:00Z |
| UI-513      | Chart Update Optimization                        | Completed | TEST-UI-chart-opt      | pass (manual, build 570)   | 2025-10-08T23:00:00Z |
| UI-514      | Metadata Description Fix                         | Completed | TEST-UI-metadata-desc  | pass (manual, build 570)   | 2025-10-08T23:00:00Z |
| UI-515      | Chart Full Width                                 | Completed | TEST-UI-chart-width    | pass (manual, build 572)   | 2025-10-08T23:30:00Z |
| UI-516      | Metrics Layout                                   | Completed | TEST-UI-metrics-layout | pass (manual, build 572)   | 2025-10-08T23:30:00Z |
| UI-517      | Badge Alignment                                  | Completed | TEST-UI-badge-align    | pass (manual, build 572)   | 2025-10-08T23:30:00Z |
| UI-518      | Scene Descriptions                               | Completed | TEST-UI-scene-desc     | pass (manual, build 572)   | 2025-10-08T23:30:00Z |
| UI-519      | Play/Pause/Stop Controls                         | Completed | TEST-UI-controls       | pass (manual, build 595+)  | Build 595+           |
| UI-520      | Combined State Badge                             | Completed | TEST-UI-state-badge    | pass (manual, build 595+)  | Build 595+           |
| UI-521      | Performance Metrics Improvements                 | Completed | TEST-UI-metrics        | pass (manual, build 601)   | Build 601            |
| UI-522      | Scene Organization                               | Completed | TEST-UI-organization   | pass (manual, build 595+)  | Build 595+           |
| UI-523      | Header Improvements                              | Completed | TEST-UI-header         | pass (manual, build 595+)  | Build 595+           |
| UI-601      | Scene Editor (P2)                                | Unknown   | TEST-UI-scene-editor   | -                          | -                    |
