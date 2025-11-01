# UI-787: Professional UI Preferences Persistence

**Status**: In Progress (2025-11-01) | **Priority**: P1 (User Experience)  
**Effort**: 6-8 hours | **Owner**: mba

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
│  │  - Cannot remember their own state                │   │
│  │  - Daemon is source of truth                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

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

### Phase 1: Core Infrastructure (2-3 hours)

- [ ] Create `composables/usePreferences.js` with localStorage wrapper
- [ ] Implement preference schema with versioning
- [ ] Add migration logic for schema changes
- [ ] Unit tests for preferences composable

### Phase 2: Device Card Preferences (2-3 hours)

- [ ] Persist `isCollapsed` state per device IP
- [ ] Persist `showSceneDetails` toggle per device
- [ ] Persist `showPerfMetrics` toggle per device
- [ ] Update DeviceCard.vue to use preferences composable
- [ ] Restore device card state on mount

### Phase 3: Global UI Preferences (2 hours)

- [ ] Persist `currentView` (devices/settings/logs/tests)
- [ ] Persist Settings page `activeTab`
- [ ] Migrate existing `showDevScenes` to new system
- [ ] Update App.vue and Settings.vue

### Phase 4: Scene Manager Preferences (1 hour)

- [ ] Persist selected device IP
- [ ] Persist sort order and search query
- [ ] Update SceneManager.vue

### Phase 5: Documentation & Polish (1 hour)

- [ ] Update STATE_PERSISTENCE.md to clarify scope (daemon vs UI)
- [ ] Add UI_PREFERENCES.md documentation
- [ ] Add localStorage key documentation
- [ ] Add clear preferences button in Settings (debug feature)

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

- Preferences composable get/set/clear
- Version migration logic
- Default value fallbacks
- Invalid data handling

### Integration Tests (Playwright)

- Device card state persists after page reload
- Settings tab persists after navigation
- Scene manager selections persist
- Clear preferences button works

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
