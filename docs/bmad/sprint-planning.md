# Sprint Planning Document

**Project:** PIDICON v3.2.1  
**Date:** 2025-11-08  
**Sprint Planning Type:** Brownfield Retrospective + Forward Planning  
**Planning Horizon:** v3.3 - v3.5 (Q1 2025 - Q3 2025)

---

## Executive Summary

This sprint planning document organizes PIDICON's development roadmap into actionable sprints, building on the successful v3.2.1 release. With 522 passing tests, comprehensive architecture, and production stability, the project is well-positioned for continued enhancement.

**Current Status:**

- **Production Version:** v3.2.1 (stable)
- **Active Work:** UI-787 (UI Preferences Persistence) - In Progress
- **Backlog:** 21 planned items across 7 categories
- **Team Capacity:** 1 developer (mba)

**Sprint Structure:**

- **Duration:** 2 weeks per sprint
- **Velocity:** ~3-5 story points per sprint (single developer)
- **Planning Cadence:** Rolling sprints with continuous prioritization

---

## Product Roadmap Overview

### Version Milestones

```
v3.2.1 (Current - Nov 2025)
   ↓
v3.3 (Q1 2025 - Target: Jan 2026)
   ├─ UI Preferences Persistence ✅
   ├─ AWTRIX Full Implementation
   ├─ Scene Thumbnails
   └─ Performance Optimizations
   ↓
v3.4 (Q2 2025 - Target: Apr 2026)
   ├─ Scene Marketplace
   ├─ Scene Templates
   ├─ Advanced Analytics
   └─ Scene Transitions/Effects
   ↓
v3.5 (Q3 2025 - Target: Jul 2026)
   ├─ Mobile App (Capacitor)
   ├─ Offline Mode (Service Worker)
   ├─ Cloud Sync (Optional)
   └─ Advanced Scheduling
   ↓
v4.0 (Q4 2025 - Target: Oct 2026)
   ├─ Plugin System
   ├─ Multi-User Authentication
   ├─ RBAC
   └─ Visual Scene Editor
```

---

## Sprint 0: COMPLETE ✅

**Duration:** November 8, 2025  
**Goal:** Complete UI-787 (UI Preferences Persistence)  
**Status:** ✅ **COMPLETE**

### Sprint Backlog

| ID     | Story                      | Priority | Status      | Points | Owner |
| ------ | -------------------------- | -------- | ----------- | ------ | ----- |
| UI-787 | UI Preferences Persistence | P1       | ✅ Complete | 5      | mba   |

### Sprint Goal

Complete the centralized UI preferences system using localStorage with proper key namespacing, versioning, and migration support.

### Acceptance Criteria

✅ = Complete, 🚧 = In Progress, ⏳ = Not Started

**Phase 1: Foundation (Core Infrastructure)**

- ✅ Create `usePreferences` composable
- ✅ Implement localStorage abstraction
- ✅ Add versioning and migration support
- ✅ Write comprehensive tests

**Phase 2: Device Card Preferences**

- ✅ Persist collapsed/expanded state per device
- ✅ Persist show scene details toggle per device
- ✅ Persist show performance metrics per device

**Phase 3: Settings View Preferences**

- ✅ Persist active tab (devices/global/mqtt/scenes)
- ✅ Maintain scroll position (in-memory, not persisted)

**Phase 4: Scene Manager Preferences**

- ✅ Persist selected device filter
- ✅ Persist search query
- ✅ Persist sort order
- ✅ Persist bulk mode toggle

**Phase 5: Logs View Preferences**

- ⏳ Persist filter settings (deferred - logs view not implemented)
- ⏳ Persist auto-scroll toggle (deferred - logs view not implemented)

### Definition of Done

- ✅ All acceptance criteria met (except deferred logs view)
- ✅ Unit tests passing (25 tests for `usePreferences.js` composable)
- ✅ **E2E tests passing (18 Playwright test files, 123 test cases covering all phases):**
  - Phase 1: 4 test files - core infrastructure (init, migration, corruption, quota)
  - Phase 2: 4 test files - device card preferences (collapse, toggles, per-device, daemon conflict)
  - Phase 3: 4 test files - navigation & view persistence (view, tabs, unsaved changes, WebSocket)
  - Phase 4: 4 test files - view-specific preferences (scene manager, tests view, logs future, existing tests)
  - Phase 5: 4 test files - multi-tab & edge cases (sync, reset, export/import, URL param)
- ✅ Test coverage ≥ 90% for preferences logic
- ✅ No flaky tests (all deterministic with proper fixtures)
- ✅ Documentation updated (README, E2E test report, sprint status report)
- ✅ No regression in existing functionality (all existing Playwright tests pass)
- ✅ Code review complete (self-review with AI assistance)
- ✅ Deployed to production (miniserver24:10829)
- ✅ Production validation complete (comprehensive E2E testing on live environment)

---

## Sprint 1: AWTRIX Implementation & Performance

**Target Start:** After UI-787 completion (Est. Late Nov 2025)  
**Duration:** 2 weeks  
**Goal:** Complete AWTRIX driver implementation and optimize performance

### Sprint Backlog

| ID          | Story                             | Priority | Status     | Points | Owner |
| ----------- | --------------------------------- | -------- | ---------- | ------ | ----- |
| ROADMAP-001 | AWTRIX Driver Full Implementation | P1       | ⏳ Planned | 8      | mba   |
| PERF-301    | Performance Optimizations         | P1       | ⏳ Planned | 3      | mba   |
| BUG-011     | Performance Scene Reset Bug       | P2       | ⏳ Planned | 2      | mba   |
| DEV-001     | BMAD Sprint Status Display Scene  | P2       | ⏳ Planned | 3      | mba   |

**Total Sprint Points:** 16 (may split across 2 sprints)

### Sprint Goal

Enable full AWTRIX support with complete scene rendering and optimize system performance for multi-device scenarios.

### Key Deliverables

**ROADMAP-001: AWTRIX Driver**

- Complete MQTT-based communication
- Implement 32x8 canvas rendering
- Add AWTRIX-specific capabilities
- Create AWTRIX-optimized scenes
- Write integration tests
- Document AWTRIX setup guide

**PERF-301: Performance Optimizations**

- Optimize scene render loop
- Reduce WebSocket message overhead
- Improve state store debouncing
- Profile and eliminate bottlenecks
- Add performance benchmarks

**BUG-011: Performance Scene Reset**

- Fix scene state not fully resetting on restart
- Add cleanup verification
- Update performance test scene
- Add regression test

**DEV-001: BMAD Sprint Status Display Scene**

- Create 64x64 pixel scene showing sprint status
- Display current in-progress story with short description
- Show BMAD workflow stage and progress
- Visualize story completion metrics
- Parse sprint-status.yaml for data
- Optimize layout for readability on pixel display
- Test on physical Pixoo 64 device

### Definition of Done

- AWTRIX device fully functional
- At least 3 AWTRIX-optimized scenes
- Performance metrics show improvement
- All tests passing (including AWTRIX integration tests)
- BMAD sprint status scene functional and readable on Pixoo 64
- Documentation updated with AWTRIX setup and BMAD scene
- Deployed to production

---

## Sprint 2: Configuration & Observability

**Target Start:** Early Dec 2025  
**Duration:** 2 weeks  
**Goal:** Enhance configuration management and system observability

### Sprint Backlog

| ID      | Story                             | Priority | Status     | Points | Owner |
| ------- | --------------------------------- | -------- | ---------- | ------ | ----- |
| CFG-503 | Config Hot-Reload                 | P2       | ⏳ Planned | 5      | mba   |
| UI-524  | Live Log Viewer (Dev Mode)        | P2       | ⏳ Planned | 3      | mba   |
| OPS-414 | Watchdog Restart Cooldown Backoff | P2       | ⏳ Planned | 3      | mba   |
| SYS-415 | Smart Release Checker Caching     | P3       | ⏳ Planned | 2      | mba   |

**Total Sprint Points:** 13

### Sprint Goal

Improve developer experience with hot-reload configuration and live logging, while enhancing system reliability through smarter watchdog and release checking.

### Key Deliverables

**CFG-503: Config Hot-Reload**

- Watch config files for changes
- Reload without daemon restart
- Validate before applying
- UI notification on reload
- Add reload endpoint

**UI-524: Live Log Viewer**

- Real-time log streaming via WebSocket
- Filter by level, source, device
- Search/grep functionality
- Auto-scroll toggle
- Export logs to file

**OPS-414: Watchdog Cooldown**

- Exponential backoff for restart attempts
- Maximum restart rate limiting
- Alert on repeated failures
- Dashboard for watchdog history

**SYS-415: Release Checker Caching**

- Cache GitHub API responses
- Reduce API calls (rate limit friendly)
- Configurable check interval
- Manual refresh option

### Definition of Done

- Config changes apply without restart
- Live logs visible in Web UI
- Watchdog prevents rapid restart loops
- Release checker respects rate limits
- All tests passing
- Documentation updated
- Deployed to production

---

## Sprint 3: Testing & Documentation

**Target Start:** Late Dec 2025  
**Duration:** 2 weeks  
**Goal:** Increase test coverage and improve documentation

### Sprint Backlog

| ID      | Story                          | Priority | Status     | Points | Owner |
| ------- | ------------------------------ | -------- | ---------- | ------ | ----- |
| TST-301 | Improve Test Coverage to 80%+  | P1       | ⏳ Planned | 8      | mba   |
| DOC-011 | API Documentation Enhancement  | P1       | ⏳ Planned | 3      | mba   |
| TST-205 | Testing Framework Enhancements | P2       | ⏳ Planned | 5      | mba   |

**Total Sprint Points:** 16 (may split across 2 sprints)

### Sprint Goal

Achieve 80%+ test coverage, enhance API documentation, and improve testing infrastructure.

### Key Deliverables

**TST-301: Test Coverage**

- Add unit tests for uncovered modules
- Increase integration test coverage
- Add more E2E tests (Playwright)
- Generate coverage reports
- Set up coverage gates in CI/CD

**DOC-011: API Documentation**

- Enhance API.md with more examples
- Add request/response samples
- Document error codes
- Add authentication guide
- Create Postman collection

**TST-205: Testing Framework**

- Improve test harness
- Add performance testing suite
- Enhance mocking capabilities
- Add contract testing for MQTT
- Improve test reporting

### Definition of Done

- Test coverage ≥ 80%
- API documentation comprehensive
- Testing framework enhanced
- Coverage reports in CI/CD
- All tests passing
- Documentation updated
- Deployed to production

---

## Sprint 4-6: v3.4 Features (Q2 2025)

**Target:** Apr-Jun 2025  
**Goal:** Scene Marketplace and Advanced Features

### High-Level Backlog

| ID          | Epic/Story                 | Priority | Points | Target Sprint |
| ----------- | -------------------------- | -------- | ------ | ------------- |
| ROADMAP-010 | Scene Marketplace          | P2       | 13     | Sprint 4-5    |
| ROADMAP-002 | Scene Dimension Adapter    | P2       | 8      | Sprint 5      |
| ROADMAP-005 | Multi-Device Scene Manager | P2       | 8      | Sprint 6      |
| UI-601      | Scene Editor               | P2       | 13     | Sprint 6      |

**Total:** ~42 points (~6 weeks of work)

### Scene Marketplace (ROADMAP-010)

**Vision:** Enable scene sharing, discovery, and installation.

**Key Features:**

- Scene package format (metadata, assets, code)
- Local scene library management
- Import/export functionality
- Scene preview/thumbnails
- Version management
- Community contributions (future)

### Scene Dimension Adapter (ROADMAP-002)

**Vision:** Automatically adapt scenes to different display sizes.

**Key Features:**

- Auto-scale graphics for different dimensions
- Layout adapters (64x64 → 32x8, etc.)
- Aspect ratio handling
- Scene compatibility detection
- Testing framework for multi-size

### Scene Editor (UI-601)

**Vision:** Visual scene creation without coding.

**Key Features:**

- Drag-and-drop interface
- Live preview
- Widget library
- Timeline for animations
- Export to scene format
- Template system

---

## Sprint 7-9: v3.5 Features (Q3 2025)

**Target:** Jul-Sep 2025  
**Goal:** Mobile App and Offline Capabilities

### High-Level Backlog

| ID                            | Epic/Story | Priority | Points     | Target Sprint |
| ----------------------------- | ---------- | -------- | ---------- | ------------- |
| Mobile App (Capacitor)        | P2         | 21       | Sprint 7-8 |
| Offline Mode (Service Worker) | P2         | 8        | Sprint 8   |
| Advanced Scheduling           | P2         | 8        | Sprint 9   |

**Total:** ~37 points (~6 weeks of work)

### Mobile App

**Vision:** Native mobile app for iOS and Android.

**Key Features:**

- Capacitor integration
- Native device controls
- Push notifications
- Offline caching
- Touch-optimized UI
- App store deployment

### Offline Mode

**Vision:** Continue working when daemon is unreachable.

**Key Features:**

- Service Worker implementation
- Offline state management
- Queue operations for sync
- Offline indicator
- Auto-sync on reconnection

---

## Sprint 10+: v4.0 Features (Q4 2025)

**Target:** Oct-Dec 2025  
**Goal:** Plugin System and Multi-User Auth

### High-Level Backlog

| ID                             | Epic/Story    | Priority | Points       | Target Sprint |
| ------------------------------ | ------------- | -------- | ------------ | ------------- |
| ROADMAP-009                    | Plugin System | P2       | 21           | Sprint 10-11  |
| Multi-User Auth                | P3            | 13       | Sprint 12    |
| RBAC                           | P3            | 8        | Sprint 12    |
| Visual Scene Editor (Advanced) | P3            | 21       | Sprint 13-14 |

**Total:** ~63 points (~12 weeks of work)

### Plugin System (ROADMAP-009)

**Vision:** Third-party scene plugins and extensions.

**Key Features:**

- Plugin API specification
- Plugin loader/manager
- Sandboxed execution
- Plugin marketplace
- Versioning and dependencies
- Hot-reload support

---

## Backlog Categories

### 1. Bug Fixes (2 items)

| ID       | Title                        | Priority | Points |
| -------- | ---------------------------- | -------- | ------ |
| BUG-011  | Performance scene reset bug  | P2       | 2      |
| (Future) | Any bugs found in production | P0-P1    | TBD    |

### 2. Performance (1 item)

| ID       | Title                     | Priority | Points |
| -------- | ------------------------- | -------- | ------ |
| PERF-301 | Performance Optimizations | P1       | 3      |

### 3. Configuration (1 item)

| ID      | Title             | Priority | Points |
| ------- | ----------------- | -------- | ------ |
| CFG-503 | Config Hot-Reload | P2       | 5      |

### 4. Operations (2 items)

| ID      | Title                     | Priority | Points |
| ------- | ------------------------- | -------- | ------ |
| OPS-414 | Watchdog Restart Cooldown | P2       | 3      |
| SYS-415 | Release Checker Caching   | P3       | 2      |

### 5. Testing (2 items)

| ID      | Title                 | Priority | Points |
| ------- | --------------------- | -------- | ------ |
| TST-301 | Improve Test Coverage | P1       | 8      |
| TST-205 | Testing Framework     | P2       | 5      |

### 6. Documentation (1 item)

| ID      | Title             | Priority | Points |
| ------- | ----------------- | -------- | ------ |
| DOC-011 | API Documentation | P1       | 3      |

### 7. UI Enhancements (3 items)

| ID     | Title                      | Priority | Points |
| ------ | -------------------------- | -------- | ------ |
| UI-787 | UI Preferences Persistence | P1       | 5      |
| UI-524 | Live Log Viewer            | P2       | 3      |
| UI-601 | Scene Editor               | P2       | 13     |

### 8. Roadmap Items (10 items)

| ID          | Title                      | Priority | Points |
| ----------- | -------------------------- | -------- | ------ |
| ROADMAP-001 | AWTRIX Implementation      | P1       | 8      |
| ROADMAP-002 | Scene Dimension Adapter    | P2       | 8      |
| ROADMAP-003 | Device Auto-Discovery      | P3       | 5      |
| ROADMAP-004 | Enhanced Watchdog          | P3       | 5      |
| ROADMAP-005 | Multi-Device Scene Manager | P2       | 8      |
| ROADMAP-006 | Device Profiles Testing    | P3       | 5      |
| ROADMAP-007 | Config Backup/Sync         | P3       | 5      |
| ROADMAP-008 | Additional Device Support  | P3       | 13     |
| ROADMAP-009 | Plugin System              | P2       | 21     |
| ROADMAP-010 | Scene Marketplace          | P2       | 13     |

---

## Sprint Metrics & Velocity

### Historical Velocity (Estimated)

Based on v3.0 → v3.2.1 development:

| Version     | Duration | Story Points | Velocity (SP/week) |
| ----------- | -------- | ------------ | ------------------ |
| v3.0        | 8 weeks  | ~50 SP       | ~6.25 SP/week      |
| v3.1        | 4 weeks  | ~20 SP       | ~5.0 SP/week       |
| v3.2        | 6 weeks  | ~30 SP       | ~5.0 SP/week       |
| **Average** | -        | -            | **~5.5 SP/week**   |

### Projected Velocity (Conservative)

**Single Developer (mba):**

- **Sprint Capacity:** 10-12 SP per 2-week sprint
- **Adjusted for Overhead:** ~8-10 SP (accounting for meetings, maintenance, support)
- **Conservative Estimate:** 8 SP per sprint for planning

### Sprint Planning Guidelines

1. **Sprint Length:** 2 weeks (10 working days)
2. **Capacity:** 8 story points per sprint (conservative)
3. **Buffer:** 20% for unplanned work (bugs, support, etc.)
4. **Focus:** 1-2 major features per sprint maximum

---

## Risk Management

### Sprint Risks

| Risk                      | Impact | Probability | Mitigation                                 |
| ------------------------- | ------ | ----------- | ------------------------------------------ |
| **Scope Creep**           | High   | Medium      | Strict sprint commitment, defer to backlog |
| **Technical Complexity**  | Medium | Low         | Spike stories, proof-of-concepts           |
| **Single Developer**      | Medium | N/A         | Excellent documentation, clear ADRs        |
| **External Dependencies** | Low    | Low         | Abstract drivers, mock implementations     |
| **Production Issues**     | High   | Low         | Comprehensive testing, staged rollouts     |

### Mitigation Strategies

1. **Time-Boxing:** Strict 2-week sprints, move incomplete work to next sprint
2. **Technical Debt:** Reserve 10% capacity for refactoring and cleanup
3. **Testing:** Maintain 80%+ coverage, automated CI/CD gates
4. **Documentation:** Update docs as part of Definition of Done
5. **Rollback Plan:** Git tags for versions, Docker image rollback capability

---

## Sprint Ceremonies

### Sprint Planning (Start of Sprint)

**Duration:** 2 hours  
**Participants:** mba (solo developer)  
**Artifacts:**

- Updated sprint backlog
- Sprint goal defined
- Story points estimated
- Acceptance criteria clarified

**Process:**

1. Review previous sprint
2. Prioritize backlog items
3. Estimate story points
4. Commit to sprint goal
5. Break down stories into tasks

### Daily Stand-up (Optional for Solo Dev)

**Duration:** 5 minutes (self-reflection)  
**Format:** Written notes or mental check-in  
**Questions:**

- What did I accomplish yesterday?
- What will I work on today?
- Are there any blockers?

### Sprint Review (End of Sprint)

**Duration:** 1 hour  
**Participants:** mba  
**Artifacts:**

- Demo of completed work
- Updated documentation
- Deployment verification

**Process:**

1. Demo all completed stories
2. Verify Definition of Done
3. Update version numbers
4. Deploy to production
5. Update backlog

### Sprint Retrospective (End of Sprint)

**Duration:** 30 minutes  
**Participants:** mba  
**Artifacts:**

- Retrospective notes
- Action items for improvement

**Questions:**

- What went well?
- What could be improved?
- What will I change next sprint?

---

## Definition of Done (Sprint Level)

A sprint is considered DONE when:

✅ All committed stories meet their acceptance criteria  
✅ All tests passing (522+ tests)  
✅ Code reviewed (self-review for solo dev, checklist-based)  
✅ Documentation updated  
✅ Deployed to production  
✅ No critical bugs introduced  
✅ Sprint goal achieved  
✅ Retrospective completed  
✅ Next sprint planned

---

## Sprint Status Tracking

### Current Sprint Status

**Sprint 0: UI-787 (In Progress)**

| Metric                 | Target | Actual | Status         |
| ---------------------- | ------ | ------ | -------------- |
| Story Points Committed | 5      | 5      | ✅             |
| Story Points Completed | 5      | 0      | 🚧 In Progress |
| Stories Completed      | 1      | 0      | 🚧 In Progress |
| Sprint Progress        | 100%   | ~30%   | 🚧 On Track    |
| Blockers               | 0      | 0      | ✅ None        |

**Next Sprint:** Sprint 1 (AWTRIX + Performance)

---

## Tools & Resources

### Development Tools

- **IDE:** Cursor (AI-assisted development)
- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions
- **Deployment:** Docker + Watchtower
- **Testing:** Node test runner, Playwright
- **Documentation:** Markdown, BMAD workflows

### Project Management

- **Backlog:** File-system (`docs/backlog/`)
- **Sprint Tracking:** This document + `bmm-workflow-status.yaml`
- **Progress Tracking:** Git commits, version tags
- **Metrics:** Test count, coverage, build number

### Communication

- **Solo Development:** Self-documenting code, comprehensive docs
- **Future Contributors:** README.md, DEVELOPMENT_STANDARDS.md
- **Stakeholders:** PRD, ARCHITECTURE.md, implementation reports

---

## Appendices

### A. Story Point Estimation Guide

| Points | Complexity   | Duration | Example                             |
| ------ | ------------ | -------- | ----------------------------------- |
| 1      | Trivial      | < 1 day  | Fix typo, update docs               |
| 2      | Simple       | 1 day    | Simple bug fix, small feature       |
| 3      | Medium       | 2 days   | Medium feature, refactoring         |
| 5      | Complex      | 3-4 days | Large feature, integration          |
| 8      | Very Complex | 1 week   | Major feature, architectural change |
| 13     | Epic         | 2+ weeks | Break into smaller stories          |
| 21     | Too Large    | -        | Must be split                       |

### B. Priority Definitions

- **P0 (Critical):** Production-breaking bugs, security issues
- **P1 (High):** Important features, significant bugs
- **P2 (Medium):** Nice-to-have features, minor bugs
- **P3 (Low):** Future enhancements, optimizations

### C. Sprint Planning Checklist

**Before Sprint:**

- [ ] Review and prioritize backlog
- [ ] Estimate story points
- [ ] Check team capacity
- [ ] Identify dependencies
- [ ] Set sprint goal

**During Sprint:**

- [ ] Track progress daily
- [ ] Update story status
- [ ] Address blockers immediately
- [ ] Keep documentation current
- [ ] Write tests as you go

**After Sprint:**

- [ ] Complete all DoD items
- [ ] Deploy to production
- [ ] Run retrospective
- [ ] Update metrics
- [ ] Plan next sprint

---

**Document Status:** Active  
**Last Updated:** 2025-11-08  
**Next Review:** End of Sprint 0 (UI-787 completion)  
**Owner:** mba  
**Sprint Cadence:** Rolling 2-week sprints
