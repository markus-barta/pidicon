# UI-787: Professional UI Preferences Persistence

**Status**: In Progress (2025-11-01) | **Priority**: P1 (User Experience)  
**Owner**: mba

## User Story

As a user, I want the UI to accurately reflect the current state of my devices at all times, including after page reloads
and daemon restarts, so that I can trust what I see on screen matches reality.

## Context: Device State Architecture

### The Fundamental Challenge

Devices have no persistent storage. Pixoo and Awtrix devices cannot remember their own state:

- ❌ Devices don't remember their brightness setting
- ❌ Devices don't remember which scene was running
- ❌ Devices don't remember if display was on/off
- ❌ Devices don't remember logging levels or performance settings

#### Solution: Daemon as State Authority

Since devices can't remember, the daemon must be the source of truth:

- ✅ Daemon persists device state to `/data/runtime-state.json` (via StateStore)
- ✅ On restart, daemon restores last known state for each device
- ✅ WebSocket broadcasts state changes to all connected UI clients
- ✅ UI syncs with daemon state on reconnection

See [STATE_PERSISTENCE.md](../../ai/STATE_PERSISTENCE.md) for daemon state persistence details.

### The UI Layer Problem

While daemon persistence solves device state, the UI has its own display preferences that also need persistence:

- UI layout preferences (collapsed/expanded cards)
- Visibility toggles (show scene details, show performance metrics)
- View state (current tab, filters, sort order)

These UI preferences are separate from device state but equally important for user experience.

## Problem

Currently, UI preferences are ephemeral and lost on page reload, making it impossible to maintain a consistent view of
device state:

### What's NOT Persisted (but should be)

- ❌ Device card collapsed/expanded state (per device IP)
- ❌ Show scene details toggle (per device)
- ❌ Show performance metrics toggle (per device)
- ❌ Settings page active tab (devices/global/mqtt/scenes)
- ❌ Scene Manager filters, sort order, selected device
- ❌ Logs view filters and preferences
- ❌ Current view (devices/settings/logs/tests)

### What's Currently Persisted

- ✅ `showDevScenes` toggle (localStorage)
- ✅ Device runtime state (brightness, scene) - via daemon StateStore

### Impact

**State Display Issues:**

- Users lose visibility into device state when UI preferences reset
- Collapsed cards hide whether devices are running correctly
- Can't see performance metrics consistently to monitor device health
- Scene details visibility resets, losing context about what's running

**User Experience Issues:**

- Users must reconfigure UI layout on every page reload
- Multi-device setups become tedious to manage
- Can't maintain preferred monitoring view
- Loss of trust in UI accuracy when state seems to "forget" preferences

**Technical Debt:**

- No centralized preference management leads to inconsistent persistence patterns
- Only one preference (`showDevScenes`) uses localStorage, others are purely in-memory
- Risk of preference conflicts as features grow

## Goal

Implement a robust, centralized UI preferences system using browser localStorage with proper key namespacing, versioning,
and migration support.

**What This Solves:**

1. **Persistent UI Layout** - Remember how user prefers to view their devices
2. **Consistent State Visibility** - Keep device monitoring view consistent across sessions
3. **Seamless Reconnection** - UI preferences survive page reloads, daemon restarts, and browser sessions
4. **Centralized Management** - Single source of truth for all UI preferences

**What This Does NOT Solve (already solved by daemon):**

- Device hardware state (brightness, display power) - handled by StateStore
- Active scene tracking - handled by StateStore
- Device runtime metrics - handled by daemon in-memory
- MQTT connection state - handled by daemon services

**The Complete Picture:**

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  UI Preferences (localStorage)                   │   │
│  │  - Collapsed/expanded cards per device           │   │
│  │  - Show scene details toggles                    │   │
│  │  - Show performance metrics toggles              │   │
│  │  - Current view, active tabs, filters            │   │
│  └──────────────────────────────────────────────────┘   │
│                        ▲                                │
│                        │ Persists across page reloads   │
│                        ▼                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Vue Components (reactive state)                 │   │
│  │  - Syncs with localStorage on mount/change       │   │
│  │  - Syncs with daemon via WebSocket               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │ WebSocket
                         │ (state broadcasts)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      Daemon                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  StateStore (in-memory + /data/runtime-state)    │   │
│  │  - Device hardware state (brightness, displayOn) │   │
│  │  - Active scene, play state, logging level       │   │
│  │  - Persists to disk, restores on restart         │   │
│  └──────────────────────────────────────────────────┘   │
│                        ▲                                │
│                        │ Real-time control              │
│                        ▼                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Devices (Pixoo/Awtrix - NO local storage)       │   │
│  │  - Cannot remember their own state               │   │
│  │  - Daemon is source of truth                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Current Implementation Status (2025-11-01 Code Review)

**App shell** — `web/frontend/src/App.vue`

- `currentView` is a local `ref` defaulting to `'devices'`; it resets on every reload.
- `showDevScenes` is the only persisted preference (stored via `localStorage.getItem('pidicon:showDevScenes')`).
- Navigation tabs in `SystemStatus.vue` mirror `currentView` but do not persist selection across sessions.
- Polling/WebSocket orchestration keeps daemon state accurate; preference persistence must coexist with it.

**Device cards** — `web/frontend/src/components/DeviceCard.vue`

- Collapsed state (`isCollapsed`) defaults to `true` for mock drivers and `false` otherwise; never persisted per device.
- Toggles for `showSceneDetails` and `showPerfMetrics` are local `ref`s; reloading resets to defaults.
- Selected scene `selectedScene` is driven by backend state (`props.device.currentScene`) and kept in sync via
  watchers — no additional persistence required beyond daemon state.
- Brightness, display power, logging level, and metrics flow from daemon StateStore; these remain unchanged.

**Settings view** — `web/frontend/src/views/Settings.vue`

- `activeTab` defaults to `'devices'` each time; no persistence in place.
- Global/MQTT form state is fetched from APIs and separate from UI preferences (should stay API-driven).

**Scene manager** — `web/frontend/src/views/SceneManager.vue`

- `selectedDeviceIp`, `sortBy`, `searchQuery`, and `bulkMode` reset on reload.
- Dev mode toggle (`devMode`) is driven by global store but not persisted across sessions.

**Logs view** — `web/frontend/src/views/Logs.vue`

- `activeFilters` defaults to `['daemon', 'ui']`; future live log viewer (UI-524) will need preference persistence.

**Tests/Diagnostics view** — `web/frontend/src/views/Tests.vue`

- `searchQuery` resets on reload (test search filter).
- `expandedSections` (Set) resets to empty; sections auto-expand on load but don't remember user's preference.

**Dev mode store** — `web/frontend/src/store/dev-mode.js`

- `enabled` flag is session-only; persisting dev mode is optional and should be a deliberate choice.

**Daemon state** — `lib/state-store.js`

- Device state persistence (`activeScene`, `playState`, `brightness`, `displayOn`, `loggingLevel`) already works.
- UI-787 must avoid duplicating daemon persistence; focus is purely UI presentation state.

### What NOT to Persist (Security & Separation)

#### Critical: Do NOT persist backend configuration or credentials

- ❌ **MQTT credentials** (username, password) - These are daemon configuration stored server-side via API. Storing in
  localStorage would be a security vulnerability exposing credentials to client-side scripts.
- ❌ **User authentication/login** - No user login system exists; the UI is open/unauthenticated by design.
- ❌ **Backend configuration** - Global defaults (driver, brightness, paths), watchdog config, MQTT broker settings are
  fetched from `/api/config/*` endpoints. These must remain API-driven to support multi-instance deployments.
- ❌ **Device runtime state** - Device hardware state (`brightness`, `scene`, `displayOn`, `playState`) comes from daemon
  StateStore via WebSocket. This is the authoritative source; localStorage must never override it.
- ❌ **Form state tracking** - Variables like `hasUnsavedMqttChanges`, `originalMqttSettings` are transient UI state for
  change detection. These should reset on reload so users see the current server-side configuration.

#### Why this matters

- Persisting backend config creates drift between what's saved server-side and what localStorage thinks it should be.
- MQTT credentials in localStorage are accessible to any JavaScript running on the page (XSS vulnerability).
- Device state in localStorage could conflict with daemon state during reconnection, creating UI bugs.

## Gap Analysis — What Needs to Change

1. **Centralized storage**: Introduce `usePreferences` as the single abstraction over `localStorage` with schema/versioning.
2. **Per-device persistence**: Store `isCollapsed`, `showSceneDetails`, and `showPerfMetrics` keyed by device IP.
3. **Global view state**: Persist `currentView`, settings `activeTab`, and navigation selection to match user expectations.
4. **Filter/search persistence**: Capture scene manager filters, tests view filters, and future log filters to maintain workflows.
5. **Tests view preferences**: Persist `searchQuery` and `expandedSections` state so test diagnostic view maintains
   user's preferred layout.
6. **Legacy migration**: Migrate `pidicon:showDevScenes` into the new schema without breaking existing behavior.
7. **Recovery & reset**: Handle corrupt preference payloads gracefully and expose a reset pathway (e.g., settings debug
   action).

## Architecture

### Option 1: Centralized Composable (Recommended)

Create `composables/usePreferences.js`:

```javascript
export function usePreferences() {
  const STORAGE_KEY = 'pidicon:preferences';
  const VERSION = 1;

  const defaultPreferences = {
    version: VERSION,
    deviceCards: {}, // { [deviceIp]: { collapsed, showDetails, showMetrics } }
    currentView: 'devices',
    settingsTab: 'devices',
    sceneManager: {
      selectedDeviceIp: null,
      sortBy: 'sortOrder',
      searchQuery: '',
    },
    showDevScenes: false,
  };

  // Get preferences with fallback
  // Set individual preference
  // Clear all preferences
  // Migrate old preferences
}
```

### Option 2: Vuex/Pinia Store (Alternative)

Create a preferences store with persistence plugin.

### Option 3: Backend API (Future Enhancement)

Store preferences server-side per user/session for multi-device sync.

## Tasks

### Phase 1: Core Infrastructure

- [ ] Create `composables/usePreferences.js` with typed getters/setters, defaults, and schema versioning.
- [ ] Implement safe `localStorage` access with JSON parsing guards and in-memory fallback for SSR/tests.
- [ ] Add migration layer to merge legacy keys (`pidicon:showDevScenes`) into the new schema.
- [ ] Broadcast preference changes via `window.storage` listener so multiple tabs stay in sync.
- [ ] Unit tests covering load/save/migrate/reset paths.
- [ ] Add preference validation to prevent invalid data structures from corrupting state.

### Phase 2: Device Card Preferences

#### Critical: Avoid conflicts with daemon state

- [ ] Wire `isCollapsed`, `showSceneDetails`, and `showPerfMetrics` in `DeviceCard.vue` to preferences keyed by device IP.
- [ ] Ensure watchers **only persist on explicit user action** (button click), never on daemon state updates via WebSocket.
- [ ] Add helper methods (`getDeviceCardPref`, `setDeviceCardPref`) for ergonomic usage.
- [ ] Verify persistence when devices reconnect or the daemon refreshes state.
- [ ] Test edge case: daemon restarts, device state changes, ensure preferences don't override hardware state.
- [ ] Playwright coverage: collapse card, reload, ensure state restored without breaking device controls.

### Phase 3: Global UI Preferences

#### Critical: Don't interfere with backend configuration management

- [ ] Persist `currentView` in `App.vue` and synchronize with `SystemStatus.vue` navigation tabs.
- [ ] Persist settings `activeTab` in `Settings.vue` (devices/global/mqtt/import-export/scene-manager tabs).
- [ ] Migrate/retain `showDevScenes` toggle inside preferences; remove direct `localStorage` usage.
- [ ] Decide whether `devMode.enabled` should persist (consider: diagnostic mode shouldn't auto-enable on reload).
- [ ] Ensure form state (`hasUnsavedMqttChanges`, `hasUnsavedGlobalChanges`) is **not** persisted.
- [ ] Test: Load settings, make MQTT changes but don't save, reload → should show clean form, not unsaved state.
- [ ] Add smoke tests verifying navigation/tab persistence doesn't break form workflows.

### Phase 4: View-Specific Preferences

- [ ] **Scene Manager**: Persist `selectedDeviceIp`, `sortBy`, `searchQuery`, and `bulkMode` in `SceneManager.vue`.
- [ ] **Tests View**: Persist `searchQuery` and `expandedSections` in `Tests.vue` (diagnostics view).
- [ ] **Logs View**: Coordinate with UI-524 to persist upcoming log viewer filters (`Logs.vue`).
- [ ] Add "Reset to defaults" button for each view (clears only that view's preferences).
- [ ] Test: Preferences in one view don't affect other views.

### Phase 5: Documentation & Safety

- [ ] Update `STATE_PERSISTENCE.md` cross-reference (done).
- [ ] Create `docs/ui/UI_PREFERENCES.md` documenting schema, keys, and migration strategy.
- [ ] Add debug panel in Settings → Advanced with:
  - "View Current Preferences" (show JSON)
  - "Clear All Preferences" (with confirmation)
  - "Export Preferences" (download JSON)
  - "Import Preferences" (upload JSON, validate before applying)
- [ ] Document localStorage key structure in repository README.
- [ ] Add Playwright helpers to seed/clear preferences for deterministic tests.

## Implementation Details

### Storage Key Namespace

```javascript
// Use prefixed keys for easy identification and cleanup
'pidicon:preferences'; // Main preferences object
'pidicon:showDevScenes'; // Legacy (migrate to main preferences)
```

### Data Structure

```json
{
  "version": 1,
  "deviceCards": {
    "192.168.1.159": {
      "collapsed": false,
      "showDetails": true,
      "showMetrics": false
    },
    "192.168.1.160": {
      "collapsed": true,
      "showDetails": false,
      "showMetrics": false
    }
  },
  "currentView": "devices",
  "settingsTab": "global",
  "sceneManager": {
    "selectedDeviceIp": "192.168.1.159",
    "sortBy": "name",
    "searchQuery": ""
  },
  "testsView": {
    "searchQuery": "",
    "expandedSections": ["system", "device", "mqtt"]
  },
  "showDevScenes": false
}
```

### Reactivity Pattern

```javascript
// In component:
const prefs = usePreferences();
const isCollapsed = computed({
  get: () =>
    prefs.getDeviceCardPref(
      props.device.ip,
      'collapsed',
      props.device.driver === 'mock'
    ),
  set: (val) => prefs.setDeviceCardPref(props.device.ip, 'collapsed', val),
});
```

## Testing

### Unit Tests

- `usePreferences` get/set/clear/merge behavior
- Schema migration (legacy key import, version bumps)
- Default value fallbacks when keys missing/corrupted
- Handling of storage quota errors and JSON parsing failures
- Storage event listener propagates remote tab updates

### Integration Tests (Playwright)

#### Required E2E Test Coverage (Playwright)

**Phase 1: Core Infrastructure Tests**

- [ ] `preferences-init.spec.js` - First-time load creates default preferences
- [ ] `preferences-migration.spec.js` - Legacy `pidicon:showDevScenes` migrates to new schema
- [ ] `preferences-corruption.spec.js` - Invalid JSON resets gracefully without crashing
- [ ] `preferences-quota.spec.js` - Large preference objects stay under localStorage quota

**Phase 2: Device Card Preferences Tests**

- [ ] `device-card-collapse.spec.js` - Collapse device card → reload → verify state restored
- [ ] `device-card-toggles.spec.js` - Toggle scene details + performance metrics → reload → verify persisted
- [ ] `device-card-per-device.spec.js` - Different preferences per device IP → reload → verify independent
- [ ] `device-card-daemon-conflict.spec.js` - Daemon restarts with state change → preferences don't override device state

**Phase 3: Navigation & View Persistence Tests**

- [ ] `navigation-view.spec.js` - Switch to Settings/Logs/Tests view → reload → verify view remembered
- [ ] `settings-active-tab.spec.js` - Switch settings tab (devices/global/mqtt) → reload → verify tab persisted
- [ ] `settings-unsaved-changes.spec.js` - Make MQTT changes without saving → reload → verify form is clean (not persisted)
- [ ] `websocket-reconnect.spec.js` - View persists across WebSocket disconnect/reconnect

**Phase 4: View-Specific Preferences Tests**

- [ ] `scene-manager-filters.spec.js` - Set device filter, sort, search → reload → verify all persisted
- [ ] `scene-manager-reset.spec.js` - Click "Reset to defaults" → verify filters cleared
- [ ] `tests-view-search.spec.js` - Search diagnostics → reload → verify search persisted
- [ ] `tests-view-expanded.spec.js` - Expand test sections → reload → verify sections remembered

**Phase 5: Multi-Tab & Edge Cases Tests**

- [ ] `multi-tab-sync.spec.js` - Change preference in tab A → verify tab B updates via storage event
- [ ] `preferences-reset.spec.js` - Use debug panel "Clear All Preferences" → verify reset to defaults
- [ ] `preferences-export-import.spec.js` - Export preferences → import in new session → verify restored
- [ ] `url-reset-param.spec.js` - Load with `?reset_preferences=1` → verify preferences cleared

**Integration Scenarios (Critical Path)**

1. ✅ **Happy Path**: User sets all preferences → reload → all preserved
2. ✅ **Conflict Resolution**: Preferences vs. daemon state → daemon wins
3. ✅ **Form Workflow**: Unsaved changes → reload → form shows server state (not unsaved)
4. ✅ **Graceful Degradation**: localStorage unavailable → app works with in-memory fallback

**Test Fixtures Required**

- [ ] `preferences.fixture.js` - Seed/clear preferences for deterministic tests
- [ ] `mockDevices.fixture.js` - Generate multiple device states for per-device preference testing
- [ ] `localStorage.fixture.js` - Mock localStorage for quota/corruption scenarios

**Acceptance Criteria for E2E Tests**

- [ ] All 18 Playwright test files created and passing
- [ ] Test coverage ≥ 90% for `usePreferences.js` composable
- [ ] No flaky tests (deterministic, no race conditions)
- [ ] Tests run in < 5 minutes total
- [ ] CI/CD integration with failure reporting

## Dependencies & Coordination

### Critical integrations to avoid breaking existing functionality

- **UI-524 (Live Log Viewer)**: Log filter persistence must reuse `usePreferences` namespace. Coordinate schema design.
- **UI-785 (Unified Settings Save Flow)**: Preference persistence must **not** interfere with unsaved-change detection
  (`hasUnsavedMqttChanges`, `hasUnsavedGlobalChanges`). These form state variables should remain ephemeral.
- **Daemon StateStore**: Preferences only store UI presentation choices. Device state comes from daemon via WebSocket.
  Never allow preferences to override daemon state during reconnection.
- **Testing Harness**: Create Playwright fixtures to seed/clear preferences deterministically. Don't let persistent
  state leak between test runs.
- **WebSocket reconnection**: Ensure preference restoration doesn't race with WebSocket state sync. Daemon state wins.

### Integration test scenarios

1. **Settings form workflow**: Make MQTT changes → don't save → reload → form should be clean (not showing "unsaved
   changes" state)
2. **Device state conflict**: Persist card as collapsed → daemon restarts device → UI should show latest device state,
   not stale preference
3. **Multi-tab sync**: Change preference in tab A → tab B should update via storage event
4. **Preference corruption**: Invalid JSON in localStorage → should reset gracefully, not crash UI

## Implementation Notes

**Technical constraints and design decisions:**

- **Namespace**: Use `pidicon:preferences:v1` key to allow clean schema migrations without breaking older versions.
- **Storage availability**: Guard for unavailable `localStorage` (private browsing, embedded browsers). Fall back to
  in-memory storage with console warning. UI should remain functional.
- **Reactivity**: Use `shallowRef`/computed wrappers when binding preferences to components. Avoid deep reactivity on
  large preference objects to prevent performance issues.
- **Ownership boundaries**: Never persist values the daemon owns (`playState`, `brightness`, `activeScene`). These come
  from WebSocket and are authoritative.
- **Cleanup**: Provide utilities to prune per-device preferences when devices are removed from configuration. Prevent
  localStorage bloat from orphaned device entries.
- **Validation**: Schema-validate preferences on load. If validation fails, log error, reset to defaults, show toast to user.
- **Throttling**: For high-frequency updates (e.g., slider changes), debounce localStorage writes. Balance responsiveness
  with write performance.

### Rollback strategy

If preferences cause issues, users can:

1. Clear via debug panel in Settings
2. Manually delete `pidicon:preferences:v1` from browser DevTools → Application → Local Storage
3. Use `?reset_preferences=1` URL parameter to auto-clear on load (emergency escape hatch)

## Risks & Mitigations

### Risk 1: Corrupted localStorage breaks UI

- **Mitigation**: Wrap all localStorage access in try-catch. Validate JSON schema on load. If invalid, reset to defaults
  and notify user via toast.
- **Test**: Manually corrupt localStorage JSON, reload, verify UI doesn't crash and shows reset message.

### Risk 2: Preferences override daemon state

- **Mitigation**: Establish clear precedence: daemon state always wins for device hardware. Preferences only affect UI
  presentation. On WebSocket reconnect, preferences should adapt to device state, not vice versa.
- **Test**: Persist preference showing device card expanded → daemon restarts → device state changes → verify preference
  doesn't override new device state.

### Risk 3: Form state persistence breaks workflows

- **Mitigation**: Explicitly exclude form state variables (`hasUnsavedMqttChanges`, `originalMqttSettings`) from
  persistence. Document which variables are intentionally ephemeral.
- **Test**: Make MQTT changes, don't save, reload → form should be clean, not showing "unsaved changes".

### Risk 4: Multiple tabs cause conflicts

- **Mitigation**: Use `storage` events to propagate preference changes across tabs. Handle race conditions gracefully
  (last write wins).
- **Test**: Open 2 tabs, change preference in tab A, verify tab B updates within 1 second.

### Risk 5: localStorage quota exceeded

- **Mitigation**: Monitor payload size. Implement per-device preference pruning. Show warning if approaching quota.
  Typical limit is 5-10MB; well within bounds for hundreds of devices.
- **Test**: Create preferences for 100+ mock devices, verify under quota.

### Risk 6: Migration breaks existing users

- **Mitigation**: Gracefully handle missing version field. Preserve legacy `pidicon:showDevScenes` key during migration.
  Never delete old keys until new schema is confirmed working.
- **Test**: Seed localStorage with old format, reload, verify migration succeeds and old preferences preserved.

## Non-Goals

- Server-side preference storage (future enhancement)
- Multi-user preference profiles (future enhancement)
- Preference import/export UI (future enhancement)
- Preference sync across browser tabs (use storage events if needed)

## Success Criteria

**Primary Goals (State Visibility):**

- ✅ UI accurately reflects device state at all times
- ✅ Device monitoring view remains consistent across sessions
- ✅ Users can trust that what they see matches device reality
- ✅ State persistence works seamlessly with daemon StateStore (no conflicts)

**Technical Goals (Preferences System):**

- ✅ All device card UI preferences persist across reloads
- ✅ Current view and active tabs persist
- ✅ Scene manager state persists
- ✅ No console errors or localStorage quota issues
- ✅ Graceful handling of invalid/corrupted preferences
- ✅ Clear separation between UI preferences (localStorage) and device state (daemon StateStore)

**User Experience Goals:**

- ✅ First-time users get sensible defaults
- ✅ Returning users see their preferred layout immediately
- ✅ Multi-device setups remain manageable and consistent
- ✅ Preferences system is invisible when working correctly

## Technical Debt

### Current Issues to Address

1. `isCollapsed` in DeviceCard.vue is purely local (line 696)
2. `showSceneDetails` and `showPerfMetrics` reset on reload
3. Settings `activeTab` resets to 'devices' every time
4. No centralized preferences management

### Migration Path

1. Migrate `pidicon:showDevScenes` to new preferences schema
2. Add version field for future migrations
3. Gracefully handle missing or corrupt localStorage data

## Related Work

- **STATE_PERSISTENCE.md**: Covers daemon/device runtime state (separate from UI preferences)
- **UI-785**: Unified settings save flow (backend config, not UI preferences)
- **CFG-501**: Config persistence (device config, not UI state)

## Future Enhancements

- [ ] Backend API for preference storage
- [ ] Multi-device preference sync
- [ ] Preference import/export
- [ ] Preference reset per device
- [ ] User profiles with different preference sets
- [ ] Real-time preference sync across browser tabs (storage events)
- [ ] Preference compression for large installations

---

**Last Updated**: 2025-11-01  
**Build**: TBD  
**Author**: mba with Cursor AI
