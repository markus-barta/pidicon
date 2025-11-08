# PIDICON Project Overview

**Generated:** 2025-11-08  
**Version:** 3.2.1  
**Type:** Monorepo (Backend Daemon + Web UI)

## Executive Summary

PIDICON (Pixel Display Controller) is a production-ready, universal daemon for managing pixel displays (Pixoo 64, AWTRIX). It features a sophisticated backend daemon with MQTT integration, scene management, and device drivers, coupled with a modern Vue 3 web interface for real-time control and configuration.

## Project Classification

- **Repository Type:** Monorepo
- **Primary Language:** JavaScript (Node.js 24+)
- **Architecture:** Event-driven microservices with WebSocket real-time updates
- **Deployment:** Docker (multi-stage builds), GitHub Actions CI/CD

## Parts

### 1. Backend Daemon (`daemon.js`, `lib/`)

**Type:** Backend/Daemon  
**Purpose:** Core engine for device management, scene rendering, MQTT communication

**Key Responsibilities:**

- Device lifecycle management (Pixoo, AWTRIX)
- Scene scheduling and execution
- MQTT message routing
- State persistence
- WebSocket broadcasting
- Watchdog monitoring

**Entry Point:** `daemon.js`

### 2. Web Frontend (`web/`)

**Type:** Web Application (Vue 3 + Express)  
**Purpose:** Real-time control panel and configuration UI

**Key Responsibilities:**

- Device control interface
- Scene browser and manager
- Real-time metrics display
- Settings management
- WebSocket client for live updates

**Entry Points:**

- Server: `web/server.js` (Express API + static serving)
- Frontend: `web/frontend/src/main.js` (Vue 3 SPA)

## Technology Stack Summary

### Backend

- **Runtime:** Node.js 24 (Alpine)
- **Protocols:** MQTT (v5.9.0), WebSocket (Socket.IO 4.8.1), HTTP
- **Graphics:** Sharp, PNGjs, Chart.js, ECharts
- **Key Libraries:** Express 5.1, Joi (validation)

### Frontend

- **Framework:** Vue 3.5 (Composition API)
- **UI:** Vuetify 3.7 (Material Design)
- **State:** Pinia 3.0
- **Build:** Vite 5.4
- **Real-time:** Socket.IO Client 4.8.1

### Development

- **Testing:** Node test runner (522 tests), Playwright (UI tests)
- **Quality:** ESLint, Prettier, Commitlint, Lint-staged
- **Coverage:** c8
- **Deployment:** Docker, GitHub Actions

## Architecture Highlights

1. **Dependency Injection** - Clean service management via DI container
2. **State Store** - Centralized state with persistence
3. **Command Pattern** - MQTT message handlers
4. **Service Layer** - Business logic abstraction
5. **Driver Abstraction** - Hot-swappable device drivers (real/mock)
6. **Scene Framework** - Pure render contract with centralized scheduling

## Key Features

- ✅ Multi-device support (independent control)
- ✅ Web-based configuration
- ✅ Real-time WebSocket updates (< 100ms latency)
- ✅ Scene scheduling with weekday filtering
- ✅ MQTT integration for home automation
- ✅ Watchdog monitoring with fallback scenes
- ✅ Hot-swap drivers (real ↔ mock)
- ✅ Comprehensive logging (5 levels)
- ✅ State persistence across restarts
- ✅ Performance metrics and FPS display

## Repository Structure

```
pidicon/
├── daemon.js              # Main daemon entry point
├── lib/                   # Backend core library
│   ├── services/         # Business logic services (10 files)
│   ├── commands/         # MQTT command handlers (6 files)
│   ├── drivers/          # Device drivers (Pixoo, AWTRIX)
│   ├── core/             # Core abstractions
│   └── util/             # Utilities (crypto, secrets)
├── web/                   # Web UI
│   ├── frontend/         # Vue 3 SPA (29 files)
│   │   └── src/
│   │       ├── components/  # UI components (16 Vue files)
│   │       ├── views/       # Page views
│   │       ├── composables/ # Composition API hooks
│   │       └── store/       # Pinia stores
│   ├── server.js         # Express API server
│   └── public/           # Built frontend assets
├── scenes/               # Scene definitions
│   ├── pixoo/           # Pixoo-specific scenes (16 files)
│   ├── awtrix/          # AWTRIX scenes (2 files)
│   └── media/           # Scene assets (86 files)
├── test/                # Test suite (27 files, 522 tests)
├── scripts/             # Build and test scripts
└── docs/                # Documentation (100+ files)
    ├── guides/          # User guides (11 files)
    ├── backlog/         # Project backlog (93 items)
    └── ai/              # AI-specific docs (8 files)
```

## Integration Points

### Daemon ↔ Web Frontend

- **WebSocket:** Real-time state broadcasts (device status, scene changes, metrics)
- **REST API:** Configuration endpoints (`/api/*`)
- **Shared State:** Via WebSocket events

### Daemon ↔ MQTT Broker

- **Topics:**
  - `pixoo/+/state/upd` - Scene control
  - `pixoo/+/scene/set` - Scene commands
  - `pixoo/+/driver/set` - Driver switching
  - `/home/pixoo/+/scene/state` - State publishing

### Daemon ↔ Devices

- **Pixoo:** HTTP API (POST /post)
- **AWTRIX:** MQTT commands

## Deployment

- **Container:** Docker (multi-stage build, Node 24 Alpine)
- **Registry:** ghcr.io/markus-barta/pidicon:latest
- **CI/CD:** GitHub Actions (build, test, publish)
- **Auto-deploy:** Watchtower on production server
- **Port:** 10829 (Web UI)
- **Persistence:** `/data/` volume for config and state

## Development Workflow

```bash
# Setup
npm install

# Development
npm start              # Run daemon
npm run ui:dev         # Vite dev server (port 3000)

# Testing
npm test               # 522 tests
npm run ui:test        # Playwright UI tests

# Quality
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix
npm run format         # Prettier format
npm run md:fix         # Markdown formatting

# Build
npm run build          # Build version + UI
npm run build:version  # Update version.json
npm run ui:build       # Build Vue app
```

## Next Steps for Brownfield PRD

When planning new features or improvements:

1. **Reference Key Architecture:**
   - Backend services: `lib/services/`
   - Command handlers: `lib/commands/`
   - Web components: `web/frontend/src/components/`

2. **Integration Patterns:**
   - New services: Register in DI container (`daemon.js`)
   - MQTT commands: Extend command handlers
   - UI features: Add to Vue components + WebSocket events
   - Device drivers: Implement driver interface

3. **State Management:**
   - Backend: StateStore (`lib/state-store.js`)
   - Frontend: Pinia stores (`web/frontend/src/store/`)
   - Persistence: Automatic via StateStore

4. **Testing Strategy:**
   - Unit tests: `test/lib/*.test.js`
   - Integration: `test/integration/*.test.js`
   - UI tests: `ui-tests/*.spec.ts` (Playwright)

## Documentation Index

- **[Architecture](../guides/ARCHITECTURE.md)** - Detailed system design
- **[API Reference](../guides/API.md)** - Complete API documentation (917 lines)
- **[Scene Development](../guides/SCENE_DEVELOPMENT.md)** - Scene creation guide
- **[Development Standards](../guides/DEVELOPMENT_STANDARDS.md)** - Coding standards
- **[Backlog](../backlog/README.md)** - Project roadmap (93 items)

## Metrics

- **Codebase Size:** ~15,000 LOC (excluding node_modules)
- **Test Coverage:** 522 tests passing
- **Components:** 16 Vue components
- **Services:** 11 backend services
- **Scenes:** 18 scene definitions
- **Documentation:** 100+ markdown files
- **Build Number:** 924 (active development)
