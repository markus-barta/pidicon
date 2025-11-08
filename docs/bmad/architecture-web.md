# PIDICON Architecture Documentation

**Part:** Web Frontend  
**Generated:** 2025-11-08  
**Version:** 3.2.1

## Executive Summary

The PIDICON web frontend is a modern, reactive Vue 3 single-page application built with Vuetify 3 Material Design components. It provides real-time device control, scene management, and system configuration through WebSocket-driven updates with < 100ms latency.

## Technology Stack

| Category             | Technology       | Version | Purpose                                 |
| -------------------- | ---------------- | ------- | --------------------------------------- |
| **Framework**        | Vue              | 3.5.0   | Reactive UI framework (Composition API) |
| **UI Library**       | Vuetify          | 3.7.0   | Material Design components              |
| **State Management** | Pinia            | 3.0.3   | Centralized state stores                |
| **Build Tool**       | Vite             | 5.4.0   | Lightning-fast dev server and bundling  |
| **WebSocket**        | Socket.IO Client | 4.8.1   | Real-time updates from daemon           |
| **Charts**           | vue-echarts      | 8.0.0   | Data visualization                      |
| **Markdown**         | marked           | 11.0.0  | Markdown rendering                      |
| **Icons**            | @mdi/font        | 7.4.47  | Material Design Icons                   |
| **Testing**          | Playwright       | 1.56.1  | E2E UI testing                          |

## Architecture Pattern

**Pattern:** Component-Based SPA with Composition API

**Core Principles:**

1. **Reactive Data Flow** - Vue 3 reactivity system
2. **Composition over Inheritance** - Composables for reusable logic
3. **Component Isolation** - Self-contained, testable components
4. **Real-time Sync** - WebSocket-driven state updates
5. **Material Design** - Consistent, accessible UI
6. **Progressive Enhancement** - Works without WebSocket (polling fallback)

## Application Structure

```
web/frontend/src/
├── main.js              # App entry point, Vue initialization
├── App.vue              # Root component, layout shell
├── components/          # Reusable UI components (16 files)
│   ├── DeviceCard.vue           # Per-device control card
│   ├── DeviceConfigForm.vue     # Device configuration form
│   ├── SystemStatus.vue         # System header with status
│   ├── SceneBrowser.vue         # Scene selection dropdown
│   ├── PlaybackControls.vue     # Play/pause/stop buttons
│   ├── PerformanceMetrics.vue   # FPS and frametime display
│   └── ... (10 more)
├── views/               # Page-level views
│   ├── DeviceView.vue           # Main devices dashboard
│   ├── Settings.vue             # Settings page
│   ├── SceneManager.vue         # Scene management UI
│   ├── Logs.vue                 # Log viewer
│   └── Tests.vue                # Diagnostics page
├── composables/         # Composition API hooks
│   ├── useWebSocket.js          # WebSocket connection management
│   ├── useApi.js                # REST API client
│   ├── useDevices.js            # Device state management
│   ├── usePreferences.js        # UI preferences (localStorage)
│   └── useToast.js              # Toast notifications
├── store/               # Pinia stores
│   ├── dev-mode.js              # Dev mode toggle state
│   └── devices.js               # Device state (if using store pattern)
└── styles/              # Global styles
    └── variables.css            # CSS custom properties
```

## Key Components

### 1. Core Components

#### **App.vue** - Application Shell

- **Purpose:** Root layout, navigation, WebSocket initialization
- **Features:**
  - System header with status indicators
  - Navigation tabs (Devices, Settings, Logs, Tests)
  - WebSocket connection management
  - Global error handling
  - Toast notification container

#### **DeviceCard.vue** - Device Control Card

- **Purpose:** Per-device control interface
- **Features:**
  - Real-time state display (scene, playState, driver)
  - Scene browser dropdown
  - Playback controls (play/pause/stop/restart)
  - Brightness slider
  - Display power toggle
  - Performance metrics (FPS, frametime)
  - Collapsible details
  - Device-specific settings
- **Props:**
  - `device` - Device state object
  - `scenes` - Available scenes array
- **Emits:**
  - Scene changes, control actions, settings updates

#### **SystemStatus.vue** - System Header

- **Purpose:** Global status and navigation
- **Features:**
  - Combined state badge (OK, Warning, Error)
  - MQTT connection indicator
  - WebSocket connection status
  - Build number and version display
  - Navigation tabs
  - Quick actions menu
- **Real-time Updates:** WebSocket-driven

#### **SceneBrowser.vue** - Scene Selection

- **Purpose:** Scene dropdown with grouping
- **Features:**
  - Grouped by folder/category
  - Numbered scenes
  - Full path display
  - Dev scenes toggle
  - Search/filter capability
  - Recently used scenes
- **Smart Grouping:** Automatically groups by `category` field

#### **PlaybackControls.vue** - Scene Playback

- **Purpose:** Cassette player-style controls
- **Features:**
  - Play/Pause/Stop buttons
  - Restart scene
  - Next/Previous scene navigation
  - Visual feedback (disabled states)
  - Keyboard shortcuts
- **State-aware:** Buttons disable based on playState

#### **PerformanceMetrics.vue** - Performance Display

- **Purpose:** Real-time rendering metrics
- **Features:**
  - FPS display (animated scenes)
  - Frametime (ms)
  - Push count
  - Error count
  - Color-coded indicators
  - Historical graphs (optional)

### 2. Views (Page-Level Components)

#### **DeviceView.vue** - Main Dashboard

- **Purpose:** Device control dashboard
- **Layout:**
  - Grid of DeviceCard components
  - Responsive (1-3 columns based on screen size)
  - Empty state when no devices
  - Add device CTA
- **Real-time:** All device states update via WebSocket

#### **Settings.vue** - Configuration Page

- **Purpose:** System and device configuration
- **Tabs:**
  - **Devices:** Add/edit/delete devices
  - **Global:** Daemon global settings
  - **MQTT:** Broker configuration
  - **Import/Export:** Config backup/restore
  - **Scene Manager:** Scheduling, usage tracking
- **Features:**
  - Form validation (Joi schemas)
  - Unsaved changes detection
  - Test device connection
  - Save/cancel/reset actions

#### **SceneManager.vue** - Scene Management (NEW in v3.2)

- **Purpose:** Advanced scene configuration
- **Features:**
  - Universal scene parameters
  - Time-based scheduling
  - Weekday filtering
  - Usage tracking and analytics
  - Bulk operations
  - Favorites system
  - Scene search and filtering
- **Data Persistence:** Backend-driven

#### **Logs.vue** - Log Viewer

- **Purpose:** System log viewing and filtering
- **Features:**
  - Real-time log streaming
  - Level filtering (debug/info/warning/error)
  - Source filtering (daemon/ui/device)
  - Search/grep functionality
  - Export logs
  - Auto-scroll toggle

#### **Tests.vue** - Diagnostics

- **Purpose:** System diagnostics and health checks
- **Features:**
  - Test results display
  - System information
  - Connection tests
  - Performance benchmarks
  - Device diagnostics
  - Expandable sections

### 3. Composables (Reusable Logic)

#### **useWebSocket.js** - WebSocket Management

```javascript
const {
  isConnected, // Connection state
  lastUpdate, // Last message timestamp
  emit, // Send message to server
  on, // Subscribe to event
  off, // Unsubscribe from event
} = useWebSocket();
```

**Features:**

- Auto-connection on mount
- Auto-reconnect with exponential backoff
- Event subscription management
- Connection state tracking
- Error handling

**Events Handled:**

- `device-state-changed` - Device status updates
- `scene-changed` - Scene transitions
- `metrics-updated` - Performance metrics
- `mqtt-status-changed` - MQTT connection status

#### **useApi.js** - REST API Client

```javascript
const api = useApi();

// Device operations
await api.getDevices();
await api.addDevice(deviceConfig);
await api.updateDevice(ip, config);
await api.deleteDevice(ip);
await api.testDevice(ip);

// Scene operations
await api.getScenes();
await api.getDeviceScenes(ip);

// Control operations
await api.startScene(ip, sceneName);
await api.pauseScene(ip);
await api.stopScene(ip);

// Config operations
await api.getConfig();
await api.updateConfig(config);
```

**Features:**

- Automatic error handling
- Request/response logging
- Toast notifications on errors
- Loading state management

#### **usePreferences.js** - UI Preferences (NEW)

```javascript
const prefs = usePreferences();

// Device card preferences
prefs.getDeviceCardPref(ip, 'collapsed', false);
prefs.setDeviceCardPref(ip, 'collapsed', true);

// Global preferences
prefs.get('currentView', 'devices');
prefs.set('settingsTab', 'mqtt');

// Clear all preferences
prefs.clear();
```

**Storage:** Browser localStorage  
**Key:** `pidicon:preferences`  
**Persistence:** Automatic on change

#### **useToast.js** - Toast Notifications

```javascript
const { showToast } = useToast();

showToast('Operation successful!', 'success');
showToast('Error occurred', 'error');
showToast('Warning message', 'warning');
showToast('Information', 'info');
```

**Features:**

- Non-blocking notifications
- Auto-dismiss (3-5 seconds)
- Color-coded by severity
- Queue management
- Dismissible

### 4. State Management

#### **Pinia Stores**

**dev-mode.js** - Development Mode State

```javascript
{
  enabled: boolean,     // Dev mode toggle
  showDevScenes: boolean // Show dev scenes in dropdown
}
```

**devices.js** (if using Pinia pattern)

```javascript
{
  devices: Array,       // Device list
  selectedDevice: Object, // Currently selected device
  isLoading: boolean,   // Loading state
  error: String         // Error message
}
```

**Alternative Pattern:** Direct reactive refs in composables (currently used)

## Data Flow

### Initial Load Flow

```
1. main.js initializes Vue app
2. App.vue mounts
3. useWebSocket() connects to server
4. useApi().getDevices() fetches devices
5. useApi().getScenes() fetches scenes
6. DeviceView renders DeviceCard for each device
7. WebSocket subscriptions established
8. Real-time updates begin
```

### WebSocket Update Flow

```
1. Backend publishes device state change
2. WebSocket server broadcasts event
3. useWebSocket receives 'device-state-changed'
4. Event handler updates reactive ref
5. DeviceCard re-renders (< 100ms)
6. UI shows updated state
```

### User Action Flow (Start Scene)

```
1. User selects scene in SceneBrowser
2. DeviceCard emits 'scene-selected' event
3. Parent calls api.startScene(ip, scene)
4. REST request to /api/scenes/{ip}/start
5. Backend processes request
6. WebSocket broadcasts state change
7. UI updates via WebSocket (not API response)
```

## Styling & Theming

### Vuetify Theme

**Primary Colors:**

- Primary: Material Blue
- Secondary: Material Grey
- Accent: Material Light Blue
- Error: Material Red
- Success: Material Green
- Warning: Material Orange

**Dark Mode:** Default enabled

### Component Styling

- **Cards:** Material elevation-2, rounded corners
- **Buttons:** Filled, outlined, text variants
- **Inputs:** Outlined style, validation colors
- **Spacing:** 8px grid system
- **Typography:** Roboto font family

### Responsive Design

**Breakpoints:**

- **xs:** < 600px (mobile)
- **sm:** 600-960px (tablet)
- **md:** 960-1280px (small desktop)
- **lg:** 1280-1920px (desktop)
- **xl:** > 1920px (large desktop)

**Adaptive Layout:**

- Mobile: 1 column device cards
- Tablet: 2 columns
- Desktop: 3 columns
- Settings: Single column form on mobile, two-column on desktop

## Build & Development

### Development Server

```bash
npm run ui:dev     # Vite dev server on port 3000
```

**Features:**

- Hot module replacement (HMR)
- Fast refresh (< 100ms)
- Proxy to backend (localhost:10829)
- Source maps enabled

### Production Build

```bash
npm run ui:build   # Build to web/public/
```

**Optimizations:**

- Code splitting (manual chunks for vuetify, vue-vendor, echarts)
- Tree shaking
- Minification
- Asset optimization
- Chunk size warnings at 600KB

### Bundle Structure

```
web/public/
├── index.html              # Entry HTML
├── assets/
│   ├── index-{hash}.js    # Main bundle
│   ├── vuetify-{hash}.js  # Vuetify chunk
│   ├── vue-vendor-{hash}.js # Vue + Pinia
│   ├── echarts-{hash}.js  # Charts library
│   └── index-{hash}.css   # Styles
└── favicon.ico
```

## Testing Strategy

### E2E Tests (Playwright)

**Location:** `ui-tests/`

**Test Suites:**

- **devices/** - Device control tests
- **preferences/** - UI preferences persistence
- **settings/** - Settings page tests

**Example Test:**

```javascript
test('device control - scene switch persists via API', async ({ page }) => {
  await page.goto('http://localhost:10829');
  // ... test implementation
});
```

### Unit Tests (Vitest)

**Location:** `test/composables/`

**Coverage:**

- Composables logic
- Utility functions
- State management

## Performance Characteristics

- **Initial Load:** < 2s (production build)
- **WebSocket Latency:** < 100ms
- **UI Update Latency:** < 50ms (reactive updates)
- **Bundle Size:** ~500KB (main + chunks)
- **Memory Usage:** ~50MB (typical)

## Browser Compatibility

- **Chrome/Edge:** 90+ (full support)
- **Firefox:** 88+ (full support)
- **Safari:** 14+ (full support)
- **Mobile:** iOS 14+, Android 5+

## Accessibility

- **ARIA Labels:** All interactive elements
- **Keyboard Navigation:** Full support
- **Screen Reader:** Compatible
- **Focus Management:** Proper focus trapping in dialogs
- **Color Contrast:** WCAG AA compliant

## Future Enhancements

- Offline mode with service worker
- Mobile app (Capacitor/Ionic)
- Advanced analytics dashboard
- Scene preview/thumbnails
- Multi-user authentication
- Customizable dashboard layouts
- Drag-and-drop scene ordering
