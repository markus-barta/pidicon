# PIDICON Source Tree Analysis

**Generated:** 2025-11-08  
**Project:** pidicon v3.2.1  
**Type:** Monorepo (Backend Daemon + Web UI)

## Root Structure

```
pidicon/
├── daemon.js                 # Main daemon entry point (bootstraps DI container)
├── start-daemon.sh           # Docker wrapper script (self-restart capability)
├── package.json              # Node.js dependencies and scripts
├── Dockerfile                # Multi-stage Docker build
├── version.json              # Build metadata (generated)
│
├── lib/                      # Backend core library ⭐ CRITICAL
│   ├── services/             # Business logic services (11 files)
│   ├── commands/             # MQTT command handlers (6 files)
│   ├── drivers/              # Device drivers (Pixoo, AWTRIX)
│   ├── core/                 # Core abstractions
│   └── util/                 # Utilities (crypto, secrets)
│
├── web/                      # Web UI ⭐ CRITICAL
│   ├── frontend/             # Vue 3 SPA
│   │   └── src/
│   │       ├── components/   # UI components (16 Vue files)
│   │       ├── views/        # Page views (4 files)
│   │       ├── composables/  # Composition API hooks (4 files)
│   │       └── store/        # Pinia stores (4 files)
│   ├── server.js             # Express API server
│   └── public/               # Built frontend assets (generated)
│
├── scenes/                   # Scene definitions ⭐ CRITICAL
│   ├── pixoo/                # Pixoo-specific scenes (16 files)
│   ├── awtrix/               # AWTRIX scenes (2 files)
│   └── media/                # Scene assets (86 PNG/GIF files)
│
├── test/                     # Test suite (27 files, 522 tests)
│   ├── lib/                  # Unit tests (18 files)
│   ├── integration/          # Integration tests (5 files)
│   └── contracts/            # Contract tests (2 files)
│
├── ui-tests/                 # Playwright E2E tests
│   ├── devices/              # Device control tests
│   ├── preferences/          # UI preferences tests
│   └── settings/             # Settings page tests
│
├── docs/                     # Documentation ⭐ COMPREHENSIVE
│   ├── guides/               # User guides (11 files)
│   ├── backlog/              # Project backlog (93 items)
│   ├── ai/                   # AI-specific docs (8 files)
│   ├── reports/              # Implementation reports (20 files)
│   └── bmad/                 # BMAD workflow documentation
│
├── scripts/                  # Build and test scripts
│   ├── build-version.js      # Version info generator
│   ├── run-node-tests.js     # Test runner
│   └── live_test_*.js        # Live testing scripts
│
├── config/                   # Configuration
│   ├── devices.example.json  # Example device config
│   └── README.md             # Config documentation
│
├── data/                     # Runtime data (Docker volume)
│   ├── devices-config.json   # Device configurations (runtime)
│   ├── mqtt-config.json      # MQTT settings (runtime)
│   ├── runtime-state.json    # State persistence (runtime)
│   └── test-results/         # Test result JSON files
│
└── bmad/                     # BMAD Method rules and workflows
    ├── bmm/                  # Business Modeling Method module
    └── core/                 # Core BMAD workflows
```

## Critical Directories

### `/lib/` - Backend Core Library

**Purpose:** All backend business logic, services, and infrastructure

```
lib/
├── services/                 # ⭐ Service layer (business logic)
│   ├── device-service.js         # Device lifecycle management
│   ├── scene-service.js          # Scene control and state publishing
│   ├── scheduler-service.js      # Time-based scene scheduling
│   ├── watchdog-service.js       # Device health monitoring
│   ├── mqtt-config-service.js    # MQTT configuration management
│   ├── system-service.js         # System status aggregation
│   ├── diagnostics-service.js    # Diagnostics and health checks
│   ├── release-checker.js        # GitHub release monitoring
│   ├── device-health.js          # Device health tracking
│   └── test-results-parser.js    # Test results parsing
│
├── commands/                 # ⭐ MQTT command handlers
│   ├── command-handler.js        # Base command handler class
│   ├── command-router.js         # Routes MQTT messages to handlers
│   ├── state-command-handler.js  # Handles pixoo/+/state/upd
│   ├── scene-command-handler.js  # Handles pixoo/+/scene/set
│   ├── driver-command-handler.js # Handles pixoo/+/driver/set
│   └── reset-command-handler.js  # Handles pixoo/+/reset/set
│
├── drivers/                  # ⭐ Device driver implementations
│   ├── pixoo/
│   │   ├── pixoo-driver.js       # HTTP-based Pixoo driver
│   │   ├── pixoo-canvas.js       # Pixoo canvas implementation
│   │   └── constants.js          # Pixoo-specific constants
│   └── awtrix/
│       ├── awtrix-driver.js      # MQTT-based AWTRIX driver
│       ├── awtrix-canvas.js      # AWTRIX canvas (32x8)
│       └── constants.js          # AWTRIX constants
│
├── core/                     # Core abstractions
│   ├── device-driver.js          # Abstract driver base class
│   ├── device-capabilities.js    # Driver capability system
│   └── constants.js              # Core constants
│
├── util/                     # Utilities
│   ├── crypto-utils.js           # Encryption/decryption
│   └── secrets-store.js          # Secure credential storage
│
├── di-container.js           # ⭐ Dependency injection container
├── state-store.js            # ⭐ Centralized state management
├── mqtt-service.js           # ⭐ MQTT connection & routing
├── scene-manager.js          # ⭐ Scene lifecycle & scheduling
├── scene-loader.js           # Dynamic scene discovery
├── scene-framework.js        # Scene rendering framework
├── scene-base.js             # Base scene class
├── device-adapter.js         # Device proxy & context
├── device-config-store.js    # Device configuration management
├── device-context.js         # Device render context factory
├── graphics-engine.js        # ⭐ Graphics API (gradients, text, shapes)
├── pixoo-canvas.js           # Canvas abstraction
├── pixoo-http.js             # Pixoo HTTP client
├── mqtt-utils.js             # MQTT publishing utilities
├── error-handler.js          # Global error handling
├── errors.js                 # Custom error classes
├── logger.js                 # Structured logging
├── font.js                   # Bitmap font rendering
├── gradient-renderer.js      # Gradient generation
├── rendering-utils.js        # Rendering helpers
├── advanced-chart.js         # Chart rendering
├── performance-utils.js      # Performance measurement
├── config.js                 # Configuration loading
├── config-validator.js       # Config schema validation
├── validation.js             # General validation utilities
├── deployment-tracker.js     # Deployment tracking
├── universal-scene-config.js # Scene configuration helpers
└── constants.js              # Global constants
```

### `/web/` - Web UI

**Purpose:** Vue 3 frontend and Express API server

```
web/
├── frontend/                 # ⭐ Vue 3 SPA source
│   └── src/
│       ├── main.js               # App entry point
│       ├── App.vue               # Root component
│       │
│       ├── components/           # ⭐ Reusable UI components
│       │   ├── DeviceCard.vue        # Per-device control card
│       │   ├── DeviceConfigDialog.vue # Device configuration form
│       │   ├── DeviceManagement.vue   # Device list management
│       │   ├── SystemStatus.vue       # System header & status
│       │   ├── SceneSelector.vue      # Scene dropdown browser
│       │   ├── SceneMetadataViewer.vue # Scene details display
│       │   ├── FPSMonitor.vue         # Performance metrics
│       │   ├── ToastNotifications.vue # Toast notifications
│       │   ├── ConfirmDialog.vue      # Confirmation dialogs
│       │   ├── TestDetailsDialog.vue  # Test results dialog
│       │   └── AppFooter.vue          # Footer component
│       │
│       ├── views/                # ⭐ Page-level views
│       │   ├── Settings.vue          # Settings page (tabs: devices, global, MQTT)
│       │   ├── SceneManager.vue      # Scene management (NEW v3.2)
│       │   ├── Logs.vue              # Log viewer
│       │   └── Tests.vue             # Diagnostics page
│       │
│       ├── composables/          # ⭐ Composition API hooks
│       │   ├── useWebSocket.js       # WebSocket management
│       │   ├── useApi.js             # REST API client
│       │   ├── usePreferences.js     # UI preferences (localStorage)
│       │   └── useToast.js           # Toast notifications
│       │
│       ├── store/                # Pinia stores
│       │   ├── index.js              # Store initialization
│       │   ├── dev-mode.js           # Dev mode state
│       │   ├── devices.js            # Device state store
│       │   └── scenes.js             # Scene state store
│       │
│       ├── plugins/              # Vue plugins
│       │   └── vuetify.js            # Vuetify configuration
│       │
│       └── lib/                  # Frontend utilities
│           └── performance-utils.js   # Performance helpers
│
├── server.js                 # ⭐ Express API server
│   # Endpoints:
│   # - GET /api/status
│   # - GET /api/devices
│   # - POST /api/devices
│   # - PUT /api/devices/:deviceIp
│   # - DELETE /api/devices/:deviceIp
│   # - GET /api/scenes
│   # - POST /api/scenes/:deviceIp/schedule
│   # - GET /api/config/*
│   # - POST /api/mqtt/connect
│   # - WebSocket server
│
└── public/                   # Built frontend assets (generated by Vite)
    ├── index.html
    └── assets/
        ├── index-{hash}.js
        ├── index-{hash}.css
        └── ... (chunked bundles)
```

### `/scenes/` - Scene Definitions

**Purpose:** Scene implementations for different devices

```
scenes/
├── pixoo/                    # ⭐ Pixoo 64 scenes (16 files)
│   ├── startup.js                # Build info display (animated)
│   ├── startup-static.js         # Static build info
│   ├── empty.js                  # Clear screen
│   ├── fill.js                   # Solid color fill
│   ├── power_price.js            # Energy dashboard
│   ├── advanced_chart.js         # Chart renderer
│   ├── draw_api.js               # Drawing API showcase
│   ├── draw_api_animated.js     # Rich animation demo
│   ├── graphics_engine_demo.js   # Graphics engine demo
│   ├── performance-test.js       # Benchmarking scene
│   └── ... (6 more scenes)
│
├── awtrix/                   # AWTRIX 32x8 scenes (2 files)
│   ├── startup.js                # AWTRIX startup display
│   └── time-display.js           # Time display scene
│
├── media/                    # Scene assets (86 files)
│   ├── *.png                     # Image assets (79 files)
│   └── *.gif                     # Animated assets (7 files)
│
└── README.md                 # Scene development guide
```

### `/test/` - Test Suite

**Purpose:** Comprehensive testing infrastructure

```
test/
├── lib/                      # ⭐ Unit tests (18 files)
│   ├── device-adapter.test.js
│   ├── state-store.test.js
│   ├── state-persistence.test.js
│   ├── mqtt-service.test.js
│   ├── scene-manager-*.test.js
│   ├── di-container.test.js
│   ├── logger.test.js
│   └── ... (11 more)
│
├── integration/              # Integration tests (5 files)
│   ├── daemon-startup-di.test.js
│   ├── command-handlers-integration.test.js
│   ├── device-isolation.test.js
│   ├── mqtt-reliability.test.js
│   └── driver-failure-recovery.test.js
│
├── contracts/                # Contract tests (2 files)
│   ├── mqtt-commands.test.js     # MQTT message contracts
│   └── rest-api.test.js          # REST API contracts
│
├── composables/              # Frontend composable tests
│   └── usePreferences.test.js
│
└── README.md                 # Testing documentation
```

## Integration Points

### 1. Daemon ↔ MQTT Broker

- **Topics:**
  - Subscribe: `pixoo/+/state/upd`, `pixoo/+/scene/set`, `pixoo/+/driver/set`
  - Publish: `/home/pixoo/{ip}/scene/state`, `pixoo/{ip}/ok`, `pixoo/{ip}/metrics`
- **Files:** `lib/mqtt-service.js`, `lib/commands/*.js`

### 2. Daemon ↔ Devices (Pixoo/AWTRIX)

- **Pixoo:** HTTP POST to `http://{ip}:80/post`
- **AWTRIX:** MQTT commands to AWTRIX topics
- **Files:** `lib/drivers/pixoo/pixoo-driver.js`, `lib/drivers/awtrix/awtrix-driver.js`

### 3. Daemon ↔ Web Frontend

- **WebSocket:** Real-time state broadcasts (Socket.IO)
- **REST API:** Configuration endpoints via Express
- **Files:** `web/server.js`, `web/frontend/src/composables/useWebSocket.js`

### 4. Frontend ↔ Browser Storage

- **localStorage:** UI preferences persistence
- **Files:** `web/frontend/src/composables/usePreferences.js`

### 5. Daemon ↔ File System

- **Config:** `/data/devices-config.json`, `/data/mqtt-config.json`
- **State:** `/data/runtime-state.json`
- **Files:** `lib/device-config-store.js`, `lib/state-store.js`

## Build Artifacts (Generated)

```
(Generated at build time, not in source control)

version.json              # Build metadata (version, commit, build number)
web/public/              # Built Vue frontend
data/                     # Runtime data (Docker volume)
coverage/                 # Test coverage reports
test-results/             # Test result JSON files
node_modules/             # Dependencies
```

## Configuration Files

```
package.json              # Node.js dependencies and scripts
vite.config.mjs           # Vite build configuration
Dockerfile                # Docker multi-stage build
eslint.config.cjs         # ESLint configuration
playwright.config.js      # Playwright test configuration
commitlint.config.cjs     # Commit linting rules
devenv.nix                # Nix development environment
```

## Entry Points

### Backend Daemon

**File:** `daemon.js`
**Responsibilities:**

- Bootstrap DI container
- Register services
- Initialize MQTT connection
- Start scene loops
- Start Express server
- WebSocket server initialization

### Web Frontend

**File:** `web/frontend/src/main.js`
**Responsibilities:**

- Initialize Vue app
- Configure Vuetify
- Initialize Pinia stores
- Mount root component

### API Server

**File:** `web/server.js`
**Responsibilities:**

- Express server setup
- REST endpoint routing
- WebSocket server
- Static file serving

## Key File Sizes (Approximate)

- `daemon.js`: ~600 LOC
- `lib/scene-manager.js`: ~1,000 LOC
- `lib/graphics-engine.js`: ~800 LOC
- `web/server.js`: ~1,500 LOC
- `lib/state-store.js`: ~900 LOC
- Total Backend LOC: ~10,000
- Total Frontend LOC: ~5,000
- Total Test LOC: ~8,000

## Development Workflow

1. **Local Development:**
   - Backend: `npm start` (daemon.js)
   - Frontend: `npm run ui:dev` (Vite dev server)
   - Tests: `npm test`

2. **Production Build:**
   - `npm run build` (builds version.json + Vue frontend)
   - Docker: Multi-stage build in Dockerfile

3. **CI/CD:**
   - GitHub Actions on push to main
   - Runs tests, builds Docker image
   - Publishes to ghcr.io
   - Watchtower auto-deploys on production server
