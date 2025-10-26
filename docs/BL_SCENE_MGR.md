# COMPREHENSIVE ENHANCED SCENE MANAGER PLAN

## Executive Summary

Extending the existing Scene Manager (Phase 1 complete) with universal parameters, scheduling, metadata, and advanced features. Total estimated effort: 10-17 hours.

---

## PHASE 1: BASIC SCENE MANAGER ✅ COMPLETE

**Status**: Already implemented and working

**What was done**:

- Added `configSchema` to all scene files
- Updated `DeviceConfig` class with `sceneDefaults` storage
- Modified `SceneService` to merge device-specific defaults
- Created API endpoints for scene defaults CRUD
- Built `SceneManager.vue` component with master-detail UI
- Integrated into Settings as new subtab

**Files modified**: All scenes, `lib/device-config-store.js`, `lib/services/scene-service.js`, `web/server.js`, `web/frontend/src/views/Settings.vue`, created `web/frontend/src/views/SceneManager.vue`

---

## PHASE 2: UNIVERSAL PARAMETERS & METADATA

### 2.1 Universal Timing Parameters (ALL Scenes)

**Goal**: Every scene has consistent timing/lifecycle controls

**Parameters to add** (overridable per-device):

- `renderInterval` - milliseconds between frames (default: 250ms, max: 5000ms)
- `adaptiveTiming` - boolean, if true: next frame waits for measured frame time before scheduling (default: true)
- `sceneTimeout` - max runtime in minutes before auto-stop (default: null = infinite)
- `scheduleEnabled` - boolean, enable time-based scheduling (default: false)
- `scheduleStartTime` - HH:MM format (default: null)
- `scheduleEndTime` - HH:MM format (default: null)
- `scheduleWeekdays` - array [0-6] where 0=Sunday (default: [0,1,2,3,4,5,6])

**Implementation**:

1. **Create base schema** in `lib/scene-framework.js` or new `lib/universal-scene-config.js`:

```javascript
const UNIVERSAL_CONFIG_SCHEMA = {
  renderInterval: {
    type: 'number',
    default: 250,
    min: 50,
    max: 5000,
    description: 'Milliseconds between frames',
  },
  adaptiveTiming: {
    type: 'boolean',
    default: true,
    description: 'Adjust timing based on measured frame duration',
  },
  sceneTimeout: {
    type: 'number',
    default: null,
    min: 1,
    max: 1440,
    description: 'Auto-stop after N minutes (null = infinite)',
  },
  scheduleEnabled: {
    type: 'boolean',
    default: false,
    description: 'Enable time-based scheduling',
  },
  scheduleStartTime: {
    type: 'string',
    default: null,
    description: 'Start time (HH:MM format)',
  },
  scheduleEndTime: {
    type: 'string',
    default: null,
    description: 'End time (HH:MM format)',
  },
  scheduleWeekdays: {
    type: 'array',
    default: [0, 1, 2, 3, 4, 5, 6],
    description: 'Active weekdays (0=Sun, 6=Sat)',
  },
};
```

2. **Update scene rendering pipeline** in `lib/scene-manager.js`:
   - Wrap existing `_renderLoop()` to check timing parameters
   - Add adaptive timing logic (measure frame time, adjust next interval)
   - Add timeout tracking (start timestamp, check elapsed time)
   - Add schedule checking before scene activation

3. **UI merge strategy**:
   - Frontend: When loading a scene in SceneManager, merge `UNIVERSAL_CONFIG_SCHEMA` + `scene.configSchema`
   - Display universal params in separate expandable section: "Universal Settings" vs "Scene Parameters"
   - Backend: Store flat in `sceneDefaults[sceneName]` (no nesting)

### 2.2 Scene Metadata (Read-Only, Defined in Code)

**Goal**: Rich scene information for display/filtering

**New exports to add to ALL scene files**:

```javascript
module.exports = {
  // Existing
  name,
  render,
  init,
  cleanup,
  wantsLoop,

  // Already have (keep):
  description,
  category,
  deviceTypes,
  tags,
  configSchema,

  // NEW METADATA:
  sceneType: 'user', // 'example' | 'dev' | 'user'
  author: 'PIDICON Team',
  version: '1.0.0',
  thumbnail: null, // optional path to preview image
  isHidden: false, // user can hide scene (ignored in dev mode)
  sortOrder: 0, // manual ordering (lower = earlier in list)
};
```

**Implementation**:

1. Add these fields to ALL scene files (go through every scene)
2. Update `SceneManager` class in `lib/scene-manager.js` to expose metadata
3. Add to API response: `GET /api/scenes/list-with-schema` includes all metadata
4. UI: Filter scenes by `sceneType`, respect `isHidden` (unless devMode)

### 2.3 Custom Scene Names (Per-Device Override)

**Goal**: Users can rename scenes per-device

**Storage**: In `sceneDefaults[sceneName]`:

```json
{
  "sceneDefaults": {
    "fill": {
      "customName": "My Red Background",
      "color": [255, 0, 0, 255]
    }
  }
}
```

**Implementation**:

1. Add `customName` as special key in `sceneDefaults`
2. UI: Show text field at top of Scene Manager detail view
3. Display logic: Use `customName` if set, fallback to `scene.name`
4. Update `DeviceConfig.getSceneDefaults()` to return customName

### 2.4 Markdown Descriptions

**Goal**: Rich scene documentation

**Implementation**:

1. Keep `description` field as is (already in scenes)
2. Frontend: Install markdown renderer (e.g., `marked` or `markdown-it`)
3. Update `SceneManager.vue`: Render `scene.description` as markdown in detail view
4. Update scene selector (if has description display): Also render as markdown
5. Keep it simple - basic markdown only (no need for full GFM)

---

## PHASE 3: SCHEDULING & USAGE TRACKING

### 3.1 Scene Scheduling Service

**Goal**: Time-based scene activation/deactivation

**Storage**: Use universal params above (`scheduleEnabled`, `scheduleStartTime`, etc.)

**Implementation**:

1. **Create `lib/services/scheduler-service.js`**:

```javascript
class SchedulerService {
  constructor({ logger, sceneService, deviceConfigStore }) {
    this.logger = logger;
    this.sceneService = sceneService;
    this.deviceConfigStore = deviceConfigStore;
    this.checkInterval = null;
  }

  start() {
    // Check every minute if any scenes should start/stop
    this.checkInterval = setInterval(() => this.checkSchedules(), 60000);
  }

  checkSchedules() {
    // For each device, check each scene's schedule params
    // If should be active and isn't, call sceneService.switchToScene()
    // If should be inactive and is, call sceneService.stopScene()
  }

  stop() {
    clearInterval(this.checkInterval);
  }
}
```

2. **Register in DI container** (`daemon.js`):

```javascript
container.register(
  'schedulerService',
  ({ logger, sceneService, deviceConfigStore }) =>
    new SchedulerService({ logger, sceneService, deviceConfigStore })
);
// Start it after initialization
const schedulerService = container.get('schedulerService');
schedulerService.start();
```

3. **UI updates**: Scene Manager shows schedule fields (already in universal params)

### 3.2 Usage Tracking

**Goal**: Track when scenes were last used and how often

**Storage**: Per-device in `devices.json`:

```json
{
  "sceneUsage": {
    "fill": {
      "lastUsed": "2025-10-26T10:30:00Z",
      "useCount": 42,
      "isFavorite": false
    }
  }
}
```

**Implementation**:

1. **Update `DeviceConfig` class**:

```javascript
class DeviceConfig {
  constructor({ ..., sceneUsage = {} }) {
    // ...
    this.sceneUsage = sceneUsage;
  }

  trackSceneUsage(sceneName) {
    if (!this.sceneUsage[sceneName]) {
      this.sceneUsage[sceneName] = { lastUsed: null, useCount: 0, isFavorite: false };
    }
    this.sceneUsage[sceneName].lastUsed = new Date().toISOString();
    this.sceneUsage[sceneName].useCount++;
  }

  toggleFavorite(sceneName) {
    if (!this.sceneUsage[sceneName]) {
      this.sceneUsage[sceneName] = { lastUsed: null, useCount: 0, isFavorite: false };
    }
    this.sceneUsage[sceneName].isFavorite = !this.sceneUsage[sceneName].isFavorite;
  }

  toJSON() {
    return { ..., sceneUsage: this.sceneUsage };
  }
}
```

2. **Update `SceneService.switchToScene()`**: Call `deviceConfig.trackSceneUsage(sceneName)` after successful switch

3. **Add API endpoints** (`web/server.js`):
   - `POST /api/config/devices/:ip/scenes/:sceneName/favorite` - Toggle favorite
   - `GET /api/config/devices/:ip/scene-usage` - Get usage stats

4. **UI updates**:
   - Scene list: Show favorite star icon (clickable)
   - Scene list: Show last used timestamp & use count
   - Sorting options: By name, by last used, by use count, by favorites first

### 3.3 Favorites vs Ordering

**Decision needed from user**:

- Option A: Keep both - `isFavorite` for quick access, `sortOrder` for manual arrangement
- Option B: Just use `sortOrder` - users manually order, favorites = low sortOrder values
- **User's answer**: "Consult me on that; how you would do it? I don't want to overcomplicate it, but I want it to be comfortable as well. Your best guess is what we will do now."

**My recommendation**: **Option A** (keep both)

- Favorites = quick toggle for "scenes I use often"
- Sort order = manual fine-grained control for advanced users
- UI: Default sort is "Favorites first, then by sortOrder, then by name"
- Simple toggle button, separate from drag-to-reorder (Phase 4 feature)

---

## PHASE 4: ADVANCED UI FEATURES

### 4.1 Scene Testing Mode

**Goal**: Test scene with temporary parameters without saving

**Implementation**:

1. **Add "Test" button** in Scene Manager detail view
2. **On click**:
   - Gather current form values (including unsaved changes)
   - Call `POST /api/devices/:ip/scenes/:sceneName/switch` with params
   - Show toast: "Testing scene on device..."
3. **No persistence** - params only used for this render
4. **Future enhancement**: Add "Stop Test" button to return to previous scene

### 4.2 Bulk Operations

**Goal**: Apply changes to multiple scenes at once

**Implementation**:

1. **Add checkboxes** to scene list in Scene Manager
2. **Add "Bulk Actions" dropdown**:
   - Set visibility (show/hide selected scenes)
   - Set scene type (mark as user/example/dev)
   - Reset to defaults (clear all custom settings)
   - Export selected scenes' config
3. **Add API endpoint**: `POST /api/config/devices/:ip/scenes/bulk` with `{ sceneNames: [], action: 'hide|show|reset|export' }`

### 4.3 UI Polish

**Changes**:

1. **Default value display**:
   - Show scene defaults in light gray text
   - Add tiny label below: "DEFAULT VALUE" in 5px uppercase caps
   - Label disappears when user enters custom value

2. **Markdown rendering**:
   - Install `marked` library
   - Render `scene.description` as HTML in Scene Manager detail view
   - Render in scene selector dropdown (if space allows, else truncate)

3. **Universal params section**:
   - Collapsible "Universal Settings" section (default: collapsed)
   - Scene-specific params in "Scene Parameters" section (default: expanded)

### 4.4 Dev Mode Override

**Goal**: In dev mode, ALL scenes visible regardless of `isHidden` flag

**Implementation**:

1. **Check if dev mode** is already tracked (look for existing devMode flag/env var)
2. **Update scene filtering**:
   - In `SceneService.listScenesWithSchema()`: Include `isHidden` in response
   - In `SceneManager.vue`: Filter out hidden scenes ONLY if `!devMode`
3. **UI indicator**: Show badge "DEV MODE" in Settings header when active

---

## PHASE 5: FAILURE HANDLING (BACKLOG)

**Goal**: Track scene failures and auto-disable problematic scenes

**Features** (for future implementation):

- `failureThreshold` param (e.g., 5 failures in 10 minutes)
- Auto-disable scene if threshold exceeded
- Notification to user
- Manual re-enable button

**Decision**: Not implementing now, add to backlog

---

## ARCHITECTURE DECISIONS SUMMARY

Based on user feedback:

1. **Storage**: Flat structure in `devices.json` under each device:

```json
{
  "ip": "192.168.1.100",
  "sceneDefaults": {
    "fill": { "customName": "...", "color": [...], "renderInterval": 250 }
  },
  "sceneUsage": {
    "fill": { "lastUsed": "...", "useCount": 42, "isFavorite": false }
  }
}
```

2. **Universal params**: Defined in `lib/universal-scene-config.js`, merged with scene-specific `configSchema` in UI

3. **Scene metadata**: Exported from each scene file, read-only (not overridable per-device except `customName`)

4. **Timing**: All scenes use same timing wrapper in `SceneManager._renderLoop()`

5. **Defaults display**: Light gray text + "DEFAULT VALUE" label (5px caps) that disappears when customized

6. **Required params**: None - all should have fallbacks

7. **Autostart**: No (conflicts with `startupScene` per device)

8. **Favorites**: Use `isFavorite` flag (separate from `sortOrder`)

---

## FILES TO CREATE

1. `lib/universal-scene-config.js` - Universal config schema definition
2. `lib/services/scheduler-service.js` - Time-based scene scheduling

---

## FILES TO MODIFY

### Backend

1. **All scene files** (`scenes/pixoo/*.js`, `scenes/awtrix/*.js`, `scenes/pixoo/dev/*.js`, etc.):
   - Add new metadata exports: `sceneType`, `author`, `version`, `thumbnail`, `isHidden`, `sortOrder`

2. **`lib/device-config-store.js`**:
   - Add `sceneUsage` field to `DeviceConfig` constructor
   - Add methods: `trackSceneUsage()`, `toggleFavorite()`
   - Update `toJSON()` to include `sceneUsage`

3. **`lib/scene-manager.js`**:
   - Wrap `_renderLoop()` with universal timing logic
   - Add adaptive timing support
   - Add scene timeout tracking
   - Expose scene metadata in `listScenes()` response

4. **`lib/services/scene-service.js`**:
   - Update `listScenesWithSchema()` to include all metadata
   - Call `deviceConfig.trackSceneUsage()` in `switchToScene()`
   - Add schedule checking before scene activation

5. **`daemon.js`**:
   - Register `schedulerService` in DI container
   - Start scheduler after initialization

6. **`web/server.js`**:
   - Add endpoints for favorites: `POST /api/config/devices/:ip/scenes/:sceneName/favorite`
   - Add endpoint for usage stats: `GET /api/config/devices/:ip/scene-usage`
   - Add endpoint for bulk operations: `POST /api/config/devices/:ip/scenes/bulk`
   - Add endpoint for testing: `POST /api/devices/:ip/scenes/:sceneName/test`

### Frontend

7. **`web/frontend/src/views/SceneManager.vue`**:
   - Add universal params section (collapsible)
   - Add custom name field at top
   - Add favorite toggle button
   - Add "Test Scene" button
   - Add bulk selection checkboxes
   - Add bulk actions dropdown
   - Implement default value display (light gray + label)
   - Integrate markdown renderer for descriptions
   - Add sorting options (name, last used, use count, favorites first)
   - Add dev mode indicator

8. **`web/frontend/package.json`**:
   - Add dependency: `"marked": "^11.0.0"` (or `markdown-it`)

---

## IMPLEMENTATION ORDER

1. **Phase 2.1**: Universal timing parameters (4-6 hours)
   - Create universal config schema
   - Update scene rendering pipeline
   - Update UI to merge schemas

2. **Phase 2.2**: Scene metadata (2-3 hours)
   - Add metadata exports to all scenes
   - Update API responses
   - Update UI to display/filter metadata

3. **Phase 2.3**: Custom names (1 hour)
   - Add UI field
   - Store in sceneDefaults

4. **Phase 2.4**: Markdown descriptions (1 hour)
   - Install library
   - Update UI rendering

5. **Phase 3.1**: Scheduling (2-3 hours)
   - Create scheduler service
   - Register in daemon
   - Integrate with scene manager

6. **Phase 3.2**: Usage tracking (2 hours)
   - Update DeviceConfig
   - Add API endpoints
   - Update UI

7. **Phase 4.1**: Testing mode (1 hour)
   - Add test button
   - Add API endpoint

8. **Phase 4.2**: Bulk operations (2 hours)
   - Add checkboxes
   - Add bulk actions
   - Add API endpoint

9. **Phase 4.3**: UI polish (2-3 hours)
   - Default value styling
   - Universal params section
   - Dev mode indicator

**Total: ~17-22 hours**

---

## TESTING CHECKLIST

- [ ] All scenes have new metadata exports
- [ ] Universal timing params apply to all scenes
- [ ] Adaptive timing adjusts based on frame duration
- [ ] Scene timeout auto-stops long-running scenes
- [ ] Scheduler activates/deactivates scenes based on time
- [ ] Usage tracking increments on scene switch
- [ ] Favorites toggle persists
- [ ] Custom scene names display correctly
- [ ] Markdown descriptions render in UI
- [ ] Default values show with gray text + label
- [ ] Label disappears when custom value entered
- [ ] Test button switches scene with temp params
- [ ] Bulk operations affect multiple scenes
- [ ] Dev mode shows all scenes (ignores isHidden)
- [ ] Scene sorting works (by name, usage, favorites)

---

## OPEN QUESTIONS FOR USER

None - all decisions made based on last conversation. Ready to proceed with implementation.

---

## NOTES

- Phase 1 already complete ✅
- Failure threshold moved to backlog (not implementing now)
- Autostart rejected (conflicts with startupScene)
- Memory/CPU limits rejected (unnecessary for pixel displays)
- Favorites kept as separate feature from sortOrder
- All scenes will have consistent timing behavior
- No required parameters - all have fallbacks
- Dev mode always shows all scenes
