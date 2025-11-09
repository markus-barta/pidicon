# UI-787 Test Plan Update - Scrum Master Review

**Date:** 2025-11-08  
**Reviewer:** Bob (Scrum Master)  
**Story:** UI-787 (UI Preferences Persistence)  
**Action:** Enhanced Playwright E2E test coverage requirements

---

## Summary

As the Scrum Master, I've reviewed the UI-787 backlog item and **enhanced the Playwright test requirements** to ensure comprehensive E2E coverage. The story already had basic test mentions, but needed detailed, actionable test specifications aligned with the Definition of Done.

---

## What Was Updated

### 1. Sprint Planning Document (`docs/bmad/sprint-planning.md`)

**Updated Section:** Sprint 0 → Definition of Done

**Added:**

- **18 specific Playwright test files** organized by phase
- Test coverage target: ≥ 90% for preferences logic
- Non-flaky test requirement (deterministic with fixtures)
- CI/CD integration requirement

### 2. Backlog Item (`docs/backlog/in-progress/UI-787-professional-ui-preferences-persistence.md`)

**Updated Section:** Integration Tests (Playwright)

**Added Comprehensive Test Plan:**

#### **Phase 1: Core Infrastructure Tests (4 tests)**

1. `preferences-init.spec.js` - First-time load creates defaults
2. `preferences-migration.spec.js` - Legacy key migration
3. `preferences-corruption.spec.js` - Graceful recovery from invalid JSON
4. `preferences-quota.spec.js` - localStorage quota handling

#### **Phase 2: Device Card Preferences Tests (4 tests)**

5. `device-card-collapse.spec.js` - Collapse state persistence
6. `device-card-toggles.spec.js` - Scene details + performance metrics toggles
7. `device-card-per-device.spec.js` - Independent preferences per device IP
8. `device-card-daemon-conflict.spec.js` - Daemon state wins over preferences

#### **Phase 3: Navigation & View Persistence Tests (4 tests)**

9. `navigation-view.spec.js` - View switching persistence
10. `settings-active-tab.spec.js` - Settings tab persistence
11. `settings-unsaved-changes.spec.js` - Form state NOT persisted
12. `websocket-reconnect.spec.js` - Persistence across reconnects

#### **Phase 4: View-Specific Preferences Tests (4 tests)**

13. `scene-manager-filters.spec.js` - Device filter, sort, search persistence
14. `scene-manager-reset.spec.js` - Reset to defaults functionality
15. `tests-view-search.spec.js` - Diagnostics search persistence
16. `tests-view-expanded.spec.js` - Expanded sections persistence

#### **Phase 5: Multi-Tab & Edge Cases Tests (4 tests)**

17. `multi-tab-sync.spec.js` - Cross-tab storage event sync
18. `preferences-reset.spec.js` - Debug panel clear functionality
19. `preferences-export-import.spec.js` - Export/import preferences
20. `url-reset-param.spec.js` - Emergency reset via URL parameter

---

## Critical Integration Scenarios

Added 4 critical path scenarios that MUST pass:

1. ✅ **Happy Path**: User sets all preferences → reload → all preserved
2. ✅ **Conflict Resolution**: Preferences vs. daemon state → daemon wins
3. ✅ **Form Workflow**: Unsaved changes → reload → form shows server state (not unsaved)
4. ✅ **Graceful Degradation**: localStorage unavailable → app works with in-memory fallback

---

## Test Fixtures Required

Added 3 required test fixtures:

1. `preferences.fixture.js` - Seed/clear preferences for deterministic tests
2. `mockDevices.fixture.js` - Generate multiple device states for per-device testing
3. `localStorage.fixture.js` - Mock localStorage for quota/corruption scenarios

---

## Acceptance Criteria for E2E Tests

- [ ] All 18 Playwright test files created and passing
- [ ] Test coverage ≥ 90% for `usePreferences.js` composable
- [ ] No flaky tests (deterministic, no race conditions)
- [ ] Tests run in < 5 minutes total
- [ ] CI/CD integration with failure reporting

---

## Why This Matters

### Before Update

- Generic mentions of "E2E tests" and "update existing Playwright tests"
- No specific test files or scenarios
- Unclear what "passing tests" means

### After Update

- ✅ **18 specific test files** with clear names and purposes
- ✅ **Organized by phase** (matches implementation phases)
- ✅ **Critical scenarios** explicitly defined
- ✅ **Test fixtures** specified for deterministic testing
- ✅ **Acceptance criteria** with measurable targets

---

## Developer Benefits

**For the Developer (mba):**

1. **Clear roadmap** - Knows exactly which test files to create
2. **No ambiguity** - Each test has a specific purpose and name
3. **Phased approach** - Tests align with implementation phases
4. **Quality gates** - ≥ 90% coverage, no flaky tests, < 5 min runtime

**For Sprint Review:**

- Easy to verify completion (18 test files ✅ or ❌)
- Measurable coverage target (90%)
- Clear pass/fail criteria

**For Production:**

- Comprehensive E2E coverage ensures UI preferences work reliably
- Critical scenarios tested (daemon conflicts, multi-tab sync, corruption handling)
- Emergency escape hatch tested (`?reset_preferences=1`)

---

## Next Steps

1. ✅ **Sprint Planning updated** with enhanced Definition of Done
2. ✅ **Backlog item updated** with 18 specific Playwright test files
3. ⏳ **Developer (mba)** can now implement with clear test requirements
4. ⏳ **Code review** will verify all 18 tests exist and pass
5. ⏳ **Sprint 0 completion** requires all acceptance criteria met

---

## Recommendation

**As Scrum Master, I recommend:**

✅ **APPROVED** - UI-787 now has comprehensive, actionable test requirements that align with the Definition of Done.

**The story is ready for implementation with:**

- Clear test specifications (18 files)
- Measurable acceptance criteria (90% coverage, < 5 min runtime)
- Critical scenarios defined (4 integration paths)
- Test fixtures specified (3 fixtures)

**No blockers.** Developer can proceed with confidence knowing exactly what test coverage is required.

---

**Scrum Master Sign-off:** Bob  
**Status:** UI-787 Test Plan Enhanced ✅  
**Ready for Sprint Execution:** Yes
