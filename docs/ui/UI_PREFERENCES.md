# UI Preferences Persistence

> **Scope**: This document covers **UI preferences** persistence (collapsed cards, filters, view state).
> For **daemon/device runtime state** persistence (scenes, brightness, hardware state), see
> [STATE_PERSISTENCE.md](../ai/STATE_PERSISTENCE.md).
>
> **Status**: Implemented 2025-11-01 (UI-787). UI preferences are managed client-side via browser
> localStorage.

## Overview

The UI preferences system provides centralized persistence for all user interface layout and display
preferences. This ensures that user preferences (collapsed cards, active tabs, filters) persist across
page reloads, browser sessions, and daemon restarts.

## Architecture

### Separation of Concerns

**UI Preferences (localStorage) - This System:**

- Device card collapsed/expanded state (per device)
- Show scene details toggles (per device)
- Show performance metrics toggles (per device)
- Current view (devices/settings/logs/tests)
- Settings page active tab
- Scene manager filters and selections
- Tests view search and expanded sections

**Device State (Daemon StateStore) - NOT This System:**

- Device hardware state (brightness, display power)
- Active scene and play state
- Device runtime metrics
- Logging levels

> **Critical**: UI preferences **never** override daemon-managed device state. The daemon is the
> authoritative source for device hardware state.

### Storage Mechanism

- **Location**: Browser `localStorage`
- **Key**: `pidicon:preferences:v1`
- **Format**: JSON with schema versioning
- **Fallback**: In-memory storage when localStorage unavailable (private browsing)

### Composable API

All preferences are accessed via the `usePreferences` composable:

```javascript
import { usePreferences } from '@/composables/usePreferences';

const prefs = usePreferences();

// Get preference
const currentView = prefs.getPreference('currentView', 'devices');

// Set preference
prefs.setPreference('currentView', 'settings');

// Device card helpers
const isCollapsed = prefs.getDeviceCardPref(deviceIp, 'collapsed', false);
prefs.setDeviceCardPref(deviceIp, 'collapsed', true);

// Scene manager helpers
const sortBy = prefs.getSceneManagerPref('sortBy', 'sortOrder');
prefs.setSceneManagerPref('sortBy', 'name');

// Tests view helpers
const searchQuery = prefs.getTestsViewPref('searchQuery', '');
prefs.setTestsViewPref('searchQuery', 'query text');
```

## Preference Schema

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
  "settingsTab": "mqtt",
  "sceneManager": {
    "selectedDeviceIp": "192.168.1.159",
    "sortBy": "name",
    "searchQuery": "test scene",
    "bulkMode": false
  },
  "testsView": {
    "searchQuery": "system",
    "expandedSections": ["system", "device", "mqtt"]
  },
  "showDevScenes": false
}
```

### Schema Versioning

- **Current Version**: `1`
- **Migration**: Legacy `pidicon:showDevScenes` key is automatically migrated on first load
- **Future Versions**: Schema versioning allows graceful migration without breaking existing preferences

## Key Namespaces

### Device Card Preferences

**Path**: `deviceCards.{deviceIp}.{key}`

- `collapsed` (boolean) - Card collapsed/expanded state
- `showDetails` (boolean) - Show scene details toggle
- `showMetrics` (boolean) - Show performance metrics toggle

**Default**: Device cards default to expanded (`collapsed: false`) except mock drivers (`collapsed: true`).

### Global UI Preferences

- `currentView` (string) - Current view: `'devices'`, `'settings'`, `'logs'`, `'tests'`
- `settingsTab` (string) - Settings active tab: `'devices'`, `'global'`, `'mqtt'`, `'import-export'`, `'scene-manager'`
- `showDevScenes` (boolean) - Show dev scenes toggle

### Scene Manager Preferences

**Path**: `sceneManager.{key}`

- `selectedDeviceIp` (string | null) - Currently selected device
- `sortBy` (string) - Sort order: `'sortOrder'`, `'name'`, `'lastUsed'`, `'useCount'`, `'category'`
- `searchQuery` (string) - Scene search query
- `bulkMode` (boolean) - Bulk mode toggle

### Tests View Preferences

**Path**: `testsView.{key}`

- `searchQuery` (string) - Test search query
- `expandedSections` (string[]) - Array of expanded section keys

## What NOT to Persist

### Security & Separation Boundaries

**Never persist in localStorage:**

- ❌ **MQTT credentials** (username, password) - Security risk (XSS vulnerability)
- ❌ **Backend configuration** - Must remain API-driven for multi-instance deployments
- ❌ **Device runtime state** - Comes from daemon StateStore via WebSocket
- ❌ **Form state tracking** - Variables like `hasUnsavedMqttChanges`, `originalMqttSettings`

### Rationale

- **Credentials**: Storing credentials in localStorage exposes them to any JavaScript running on the page
- **Backend Config**: API-driven config supports multiple daemon instances and prevents client/server drift
- **Device State**: Daemon is authoritative source; UI should never override hardware state
- **Form State**: Transient UI state should reset on reload to show current server configuration

## Migration

### Legacy Key Migration

The system automatically migrates the legacy `pidicon:showDevScenes` key on first load:

1. Check for legacy key `pidicon:showDevScenes`
2. If found, migrate value to `showDevScenes` in new schema
3. Preserve legacy key until confirmed working (don't delete immediately)

### Future Schema Migrations

When schema version changes:

1. Detect version mismatch on load
2. Run migration function to transform old schema to new
3. Preserve unknown keys during migration
4. Update version number

## Error Handling

### Corruption Recovery

If localStorage contains invalid JSON or invalid schema:

1. Log warning to console
2. Reset to default preferences
3. Show toast notification to user
4. Continue with defaults (don't crash UI)

### Storage Unavailable

If localStorage is unavailable (private browsing, embedded browser):

1. Fall back to in-memory storage
2. Log console warning
3. UI remains functional but preferences don't persist
4. Preferences reset on page reload

## Multi-Tab Synchronization

Preferences automatically sync across browser tabs:

1. Tab A changes preference → localStorage updated
2. Browser fires `storage` event
3. Tab B receives event → updates reactive state
4. Tab B UI updates automatically

**Strategy**: Last write wins. Race conditions handled gracefully.

## Debug & Maintenance

### Debug Panel

Access via Settings → Advanced → Preferences:

- **View Current Preferences**: Display JSON in dialog
- **Clear All Preferences**: Reset to defaults (with confirmation)
- **Export Preferences**: Download JSON file
- **Import Preferences**: Upload and validate JSON file

### Emergency Reset

**URL Parameter**: `?reset_preferences=1`

Add to URL to automatically clear all preferences on load. Useful for troubleshooting.

### Manual Reset

1. Open browser DevTools → Application → Local Storage
2. Delete key `pidicon:preferences:v1`
3. Reload page

## Testing

### Unit Tests

**File**: `test/composables/usePreferences.test.js`

Tests cover:

- Load/save operations
- Default value fallbacks
- Schema validation
- Legacy migration
- Corruption handling
- Storage unavailable fallback

### E2E Tests (Playwright)

**Files**: `ui-tests/preferences/*.spec.ts`

- `device-card-persistence.spec.ts` - Device card preferences
- `global-ui-persistence.spec.ts` - Global view/tab preferences
- `view-specific-persistence.spec.ts` - Scene Manager and Tests view preferences

### Test Helpers

**File**: `ui-tests/helpers/preferences-helpers.ts`

- `seedPreferences(page, preferences)` - Set localStorage before test
- `clearPreferences(page)` - Clear localStorage after test
- `getPreferences(page)` - Read localStorage for assertions

## Performance

- **Write Frequency**: Debounced (300ms) to reduce localStorage writes
- **Storage Size**: ~1-2KB for typical installation (10-20 devices)
- **Read Performance**: Single localStorage read on component mount
- **Memory Overhead**: Minimal (reactive refs)

## Future Enhancements

- [ ] Server-side preference storage (multi-device sync)
- [ ] Preference import/export UI (completed in debug panel)
- [ ] Per-user preference profiles
- [ ] Preference compression for large installations
- [ ] Preference history/rollback

## Related Documentation

- [STATE_PERSISTENCE.md](../ai/STATE_PERSISTENCE.md) - Daemon device state persistence
- [UI-787](../backlog/in-progress/UI-787-professional-ui-preferences-persistence.md) - Implementation backlog item

---

**Last Updated**: 2025-11-01  
**Version**: 1.0  
**Author**: mba with Cursor AI
