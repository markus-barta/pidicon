# Product Requirements Document (PRD)

## PIDICON: Pixel Display Controller

**Version:** 1.0.0 (Retrospective)  
**Date:** 2025-11-08  
**Document Type:** Retrospective PRD  
**Status:** Current State Documentation  
**Author:** Markus Barta  
**Product Version:** 3.2.1

---

## Executive Summary

PIDICON (Pixel Display Controller) is a production-ready, universal daemon for managing pixel displays in smart home environments. It transforms consumer-grade pixel displays (Pixoo 64, AWTRIX) into sophisticated, programmable information displays through MQTT integration, web-based configuration, and a powerful scene rendering framework.

### Product Vision

**"Transform pixel displays into intelligent, automated information hubs for smart homes."**

PIDICON bridges the gap between consumer pixel displays and smart home automation, providing a professional-grade control layer that enables:

- Automated scene scheduling based on time and context
- Real-time information visualization (energy prices, weather, system metrics)
- Seamless integration with home automation platforms via MQTT
- Multi-device orchestration from a single control point
- Extensible architecture for custom visualizations

### Strategic Goals

1. **Universal Device Support** - Support all major pixel display types with a unified API
2. **Smart Home Integration** - First-class MQTT integration for automation platforms
3. **Professional Reliability** - Production-ready stability with comprehensive monitoring
4. **Developer Experience** - Clean APIs and frameworks for custom scene development
5. **User Experience** - Intuitive web interface for configuration and control

---

## Product Context

### Problem Statement

Consumer pixel displays (Pixoo, AWTRIX) offer attractive hardware but lack:

- **Automation Integration** - No native smart home platform support
- **Scene Scheduling** - Manual scene switching only
- **Multi-Device Management** - One app per device, no unified control
- **Custom Visualizations** - Limited to vendor-provided scenes
- **Reliability** - Consumer apps prone to crashes and connectivity issues

### Solution

PIDICON provides a universal control layer that:

- Exposes displays through standard MQTT protocol for automation
- Enables time-based and event-driven scene scheduling
- Manages multiple devices from a single daemon and web UI
- Provides a powerful framework for custom scene development
- Delivers production-grade reliability with monitoring and auto-recovery

### Target Users

1. **Smart Home Enthusiasts**
   - Need: Integrate displays into home automation
   - Benefit: MQTT control, automated scheduling, multi-device management

2. **Developers**
   - Need: Create custom visualizations and data displays
   - Benefit: Clean scene API, graphics engine, hot-reload development

3. **System Administrators**
   - Need: Reliable, observable, maintainable display infrastructure
   - Benefit: Comprehensive logging, metrics, health monitoring, Docker deployment

---

## Success Metrics

### Current Achievements (v3.2.1)

| Metric                | Target        | Achieved                          | Status      |
| --------------------- | ------------- | --------------------------------- | ----------- |
| **Device Support**    | 2+ types      | Pixoo 64 (stable), AWTRIX (ready) | ✅ Met      |
| **Test Coverage**     | > 400 tests   | 522 tests passing                 | ✅ Exceeded |
| **Scene Library**     | 10+ scenes    | 18 production scenes              | ✅ Exceeded |
| **API Endpoints**     | 15+           | 25+ REST endpoints                | ✅ Exceeded |
| **Uptime**            | 99%+          | Self-restart, watchdog monitoring | ✅ Met      |
| **WebSocket Latency** | < 200ms       | < 100ms typical                   | ✅ Exceeded |
| **Documentation**     | Comprehensive | 100+ docs, 2500+ LOC              | ✅ Exceeded |

### Quality Metrics

- **Code Quality:** ESLint + Prettier enforced, conventional commits
- **Architecture:** DI container, service layer, command pattern
- **Observability:** 5 log levels, MQTT state mirroring, real-time metrics
- **Build System:** Automated versioning, CI/CD with GitHub Actions
- **Deployment:** Docker multi-stage build, Watchtower auto-updates

---

## Product Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PIDICON Daemon                        │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   MQTT       │  │  REST API    │  │  WebSocket   │  │
│  │   Service    │  │  (Express)   │  │  Server      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│  ┌──────┴──────────────────┴──────────────────┴──────┐  │
│  │            Service Layer (11 Services)            │  │
│  │  • DeviceService    • SceneService                │  │
│  │  • SchedulerService • WatchdogService             │  │
│  │  • SystemService    • DiagnosticsService          │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                              │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │         Scene Manager (Multi-Device Loops)        │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                              │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │      Device Drivers (Pixoo, AWTRIX)               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                          │
           ▼                          ▼
     ┌──────────┐             ┌──────────────┐
     │  Pixoo   │             │   MQTT       │
     │  Device  │             │   Broker     │
     │  (HTTP)  │             │              │
     └──────────┘             └──────────────┘
```

### Technology Stack

**Backend:**

- Node.js 24 (Alpine)
- Express 5.1 (REST API)
- Socket.IO 4.8 (WebSocket)
- MQTT 5.9 (Messaging)
- Sharp 0.33 (Image processing)

**Frontend:**

- Vue 3.5 (Composition API)
- Vuetify 3.7 (Material Design)
- Pinia 3.0 (State management)
- Vite 5.4 (Build tool)

**Infrastructure:**

- Docker (multi-stage build)
- GitHub Actions (CI/CD)
- Watchtower (auto-deploy)

---

## Functional Requirements

### Epic 1: Device Management

**Goal:** Manage multiple pixel displays from a unified interface

#### FR-1.1: Multi-Device Support

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Support multiple devices (Pixoo 64, AWTRIX) with independent control
- **Acceptance Criteria:**
  - ✅ Add/edit/delete devices via Web UI
  - ✅ Each device has independent scene loop
  - ✅ Device-specific settings (brightness, power, driver)
  - ✅ Hot-swap drivers (real ↔ mock) without restart
  - ✅ Device health monitoring

#### FR-1.2: Device Configuration Persistence

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Persistent device configuration across daemon restarts
- **Acceptance Criteria:**
  - ✅ Store config in `/data/devices-config.json`
  - ✅ Web UI for device management
  - ✅ Legacy environment variable support
  - ✅ Startup scene per device
  - ✅ Watchdog configuration per device

#### FR-1.3: Device Driver Abstraction

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Abstract driver interface supporting multiple device types
- **Acceptance Criteria:**
  - ✅ Abstract `DeviceDriver` base class
  - ✅ Pixoo driver (HTTP-based, 64x64)
  - ✅ AWTRIX driver (MQTT-based, 32x8)
  - ✅ Mock driver for development
  - ✅ Capability detection system

### Epic 2: Scene Framework

**Goal:** Powerful, extensible scene rendering system

#### FR-2.1: Scene Lifecycle Management

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Manage scene initialization, rendering, and cleanup
- **Acceptance Criteria:**
  - ✅ Pure render contract (`init`, `render`, `cleanup`)
  - ✅ Centralized scheduling (one loop per device)
  - ✅ Frame gating (prevent stale frames)
  - ✅ Scene state isolation
  - ✅ Performance metrics (FPS, frametime)

#### FR-2.2: Scene Library

- **Priority:** P1 (High)
- **Status:** ✅ Implemented (18 scenes)
- **Description:** Comprehensive library of production-ready scenes
- **Acceptance Criteria:**
  - ✅ System scenes (startup, empty, fill)
  - ✅ Data visualization scenes (power_price, charts)
  - ✅ Demo scenes (graphics_engine_demo, draw_api_animated)
  - ✅ Dev scenes (performance-test, template)
  - ✅ Scene metadata (author, version, tags)

#### FR-2.3: Graphics Engine

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** High-level drawing API for scene development
- **Acceptance Criteria:**
  - ✅ Primitives (rect, circle, line, text)
  - ✅ Gradients (linear, radial, conical)
  - ✅ Font rendering (multiple sizes)
  - ✅ Chart rendering (Chart.js, ECharts)
  - ✅ Image rendering (Sharp integration)

#### FR-2.4: Scene Scheduling

- **Priority:** P1 (High)
- **Status:** ✅ Implemented (v3.2)
- **Description:** Time-based scene activation with weekday filtering
- **Acceptance Criteria:**
  - ✅ Schedule configuration per device
  - ✅ Start/end time specification
  - ✅ Weekday filtering (Mon-Sun)
  - ✅ Schedule enable/disable toggle
  - ✅ Automatic scene switching

### Epic 3: MQTT Integration

**Goal:** First-class MQTT integration for smart home automation

#### FR-3.1: MQTT Command Interface

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Control devices via MQTT messages
- **Acceptance Criteria:**
  - ✅ Command pattern architecture (6 handlers)
  - ✅ `pixoo/+/state/upd` - Scene switching
  - ✅ `pixoo/+/scene/set` - Scene control (play/pause/stop)
  - ✅ `pixoo/+/driver/set` - Driver switching
  - ✅ `pixoo/+/reset/set` - Device reset

#### FR-3.2: MQTT State Publishing

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Description:** Publish device state changes to MQTT
- **Acceptance Criteria:**
  - ✅ State topic: `/home/pixoo/{ip}/scene/state`
  - ✅ Full state payload (scene, status, playState, version)
  - ✅ Metrics topic: `pixoo/{ip}/metrics`
  - ✅ Per-frame metrics: `pixoo/{ip}/ok`
  - ✅ Build metadata in state

#### FR-3.3: MQTT Configuration Management

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Description:** Persistent MQTT broker configuration
- **Acceptance Criteria:**
  - ✅ Broker URL, credentials, options
  - ✅ Web UI configuration
  - ✅ Auto-reconnect with exponential backoff
  - ✅ Connection status tracking
  - ✅ Error throttling (prevent log spam)

### Epic 4: Web Interface

**Goal:** Modern, responsive web UI for device control and configuration

#### FR-4.1: Device Control Panel

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Real-time device control via web interface
- **Acceptance Criteria:**
  - ✅ Per-device control cards
  - ✅ Scene browser with grouping
  - ✅ Playback controls (play/pause/stop/restart)
  - ✅ Brightness control
  - ✅ Display power toggle
  - ✅ Performance metrics display

#### FR-4.2: Real-Time Updates

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented (< 100ms latency)
- **Description:** WebSocket-driven real-time state synchronization
- **Acceptance Criteria:**
  - ✅ Socket.IO integration
  - ✅ Device state updates
  - ✅ Scene change events
  - ✅ Metrics updates
  - ✅ MQTT status changes

#### FR-4.3: Settings Management

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Description:** Comprehensive settings interface
- **Acceptance Criteria:**
  - ✅ Device management (add/edit/delete)
  - ✅ Global daemon settings
  - ✅ MQTT configuration
  - ✅ Config import/export
  - ✅ Form validation

#### FR-4.4: Scene Manager (v3.2)

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Description:** Advanced scene management and scheduling
- **Acceptance Criteria:**
  - ✅ Universal scene parameters
  - ✅ Schedule configuration UI
  - ✅ Usage tracking and analytics
  - ✅ Scene favorites
  - ✅ Bulk operations

#### FR-4.5: UI Preferences Persistence

- **Priority:** P2 (Medium)
- **Status:** 🚧 In Progress (UI-787)
- **Description:** Persist UI preferences in browser localStorage
- **Acceptance Criteria:**
  - ⏳ Device card collapsed state
  - ⏳ Current view selection
  - ⏳ Settings tab selection
  - ⏳ Dev mode toggle state
  - ⏳ Centralized preference system

### Epic 5: Monitoring & Observability

**Goal:** Comprehensive system monitoring and diagnostics

#### FR-5.1: Logging System

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Structured logging with multiple levels
- **Acceptance Criteria:**
  - ✅ 5 log levels (debug, info, warning, error, silent)
  - ✅ Structured JSON logs with metadata
  - ✅ Per-device logging configuration
  - ✅ Log viewer in Web UI
  - ✅ Log filtering and search

#### FR-5.2: Watchdog Monitoring

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Description:** Automatic device health monitoring and recovery
- **Acceptance Criteria:**
  - ✅ Configurable check interval
  - ✅ Failure threshold
  - ✅ Recovery actions (restart daemon, fallback scene, MQTT command)
  - ✅ Health status tracking
  - ✅ Per-device configuration

#### FR-5.3: Performance Metrics

- **Priority:** P1 (High)
- **Status:** ✅ Implemented
- **Description:** Real-time performance monitoring
- **Acceptance Criteria:**
  - ✅ FPS calculation (animated scenes)
  - ✅ Frametime measurement
  - ✅ Push count tracking
  - ✅ Error count tracking
  - ✅ Real-time UI display

#### FR-5.4: System Diagnostics

- **Priority:** P2 (Medium)
- **Status:** ✅ Implemented
- **Description:** System health checks and diagnostics
- **Acceptance Criteria:**
  - ✅ Test results viewer
  - ✅ System information display
  - ✅ Connection tests
  - ✅ Device diagnostics
  - ✅ Diagnostics API endpoint

### Epic 6: State Management

**Goal:** Reliable state persistence and synchronization

#### FR-6.1: State Persistence

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Persistent state across daemon restarts
- **Acceptance Criteria:**
  - ✅ Global state (daemon-wide)
  - ✅ Device state (per-device)
  - ✅ Scene state (per-scene)
  - ✅ Debounced writes (10s delay)
  - ✅ Atomic file operations

#### FR-6.2: State Store Architecture

- **Priority:** P0 (Critical)
- **Status:** ✅ Implemented
- **Description:** Centralized state management
- **Acceptance Criteria:**
  - ✅ Single source of truth
  - ✅ Reactive updates
  - ✅ State isolation (device/scene)
  - ✅ Change notification
  - ✅ State restoration on startup

---

## Non-Functional Requirements

### NFR-1: Performance

| Requirement        | Target  | Achieved              |
| ------------------ | ------- | --------------------- |
| Scene Render Time  | < 100ms | < 50ms typical        |
| WebSocket Latency  | < 200ms | < 100ms typical       |
| MQTT Response Time | < 500ms | < 200ms typical       |
| State Persistence  | < 10s   | 10s debounce          |
| UI Initial Load    | < 3s    | < 2s production build |
| Memory Usage       | < 200MB | ~150MB typical        |

### NFR-2: Reliability

- **Uptime Target:** 99.9%
- **Mean Time Between Failures:** > 30 days
- **Recovery Time Objective:** < 30 seconds (self-restart)
- **Error Handling:** Comprehensive try-catch, graceful degradation
- **Watchdog:** Automatic health monitoring and recovery

### NFR-3: Scalability

- **Concurrent Devices:** 10+ devices per daemon instance
- **Scene Complexity:** Support up to 60 FPS scenes
- **State Size:** Support states up to 10MB
- **WebSocket Clients:** 10+ concurrent clients
- **MQTT Message Rate:** 100+ messages/second

### NFR-4: Maintainability

- **Code Quality:** ESLint + Prettier enforced, < 5 warnings
- **Test Coverage:** 522 tests passing, comprehensive coverage
- **Documentation:** 100+ docs, API reference, guides
- **Architecture:** Clean separation (service layer, DI, command pattern)
- **Deployment:** Automated CI/CD, Docker containerization

### NFR-5: Security

- **Authentication:** Optional Basic Auth for Web UI
- **Credential Storage:** Encrypted secrets in config
- **MQTT Security:** Username/password authentication
- **Input Validation:** Joi schema validation
- **API Security:** Input sanitization, error handling

### NFR-6: Usability

- **Web UI Responsiveness:** Works on desktop, tablet, mobile
- **Real-Time Feedback:** < 100ms latency for UI updates
- **Error Messages:** Clear, actionable error messages
- **Toast Notifications:** Non-blocking, auto-dismissing
- **Help Documentation:** Comprehensive guides and API docs

### NFR-7: Compatibility

- **Node.js:** 18+ required, 24+ recommended
- **Browsers:** Chrome 90+, Firefox 88+, Safari 14+
- **Docker:** Multi-platform (amd64, arm64)
- **MQTT:** MQTT 3.1.1 and 5.0
- **Devices:** Pixoo 64, AWTRIX 3 (extensible)

---

## Technical Architecture

### Architecture Patterns

1. **Dependency Injection**
   - Lightweight DI container
   - Service registration and resolution
   - Lazy initialization
   - Circular dependency detection

2. **Service Layer**
   - Business logic abstraction
   - 11 services (Device, Scene, Scheduler, Watchdog, etc.)
   - Clean separation from transport layer
   - Testable, reusable

3. **Command Pattern**
   - MQTT message routing to handlers
   - 6 command handlers (state, scene, driver, reset)
   - Command validation and execution
   - Centralized error handling

4. **Event-Driven Architecture**
   - MQTT for external events
   - WebSocket for UI updates
   - State change notifications
   - Reactive data flow

5. **Repository Pattern**
   - State Store for persistence
   - Device Config Store for configuration
   - Abstracted storage layer
   - Atomic operations

### Key Design Decisions

#### Decision 1: Pure Render Contract

**Context:** Original scenes managed their own timing with setInterval/setTimeout  
**Decision:** Scenes return delay, central scheduler manages timing  
**Rationale:**

- Centralized control of scheduling
- Prevents timer leaks
- Enables frame gating
- Simplifies scene development
  **Status:** ✅ Implemented, proven successful

#### Decision 2: Hot-Swappable Drivers

**Context:** Need for fast development without real devices  
**Decision:** Runtime driver switching (real ↔ mock)  
**Rationale:**

- Fast development iteration
- No device conflicts
- Test scene logic in isolation
- Production flexibility
  **Status:** ✅ Implemented, widely used

#### Decision 3: WebSocket for Real-Time Updates

**Context:** Polling was inefficient and laggy  
**Decision:** Socket.IO for bidirectional real-time communication  
**Rationale:**

- < 100ms latency (vs 5s polling)
- Reduced server load
- Better UX
- Industry standard
  **Status:** ✅ Implemented, < 100ms achieved

#### Decision 4: Vue 3 + Vuetify 3 for Web UI

**Context:** Need for modern, responsive UI  
**Decision:** Vue 3 Composition API with Vuetify 3 Material Design  
**Rationale:**

- Reactive, component-based architecture
- Material Design best practices
- Strong ecosystem
- Excellent documentation
  **Status:** ✅ Implemented, highly maintainable

#### Decision 5: Monorepo Structure

**Context:** Backend and frontend tightly coupled  
**Decision:** Single repository with daemon + web frontend  
**Rationale:**

- Atomic changes across stack
- Simplified versioning
- Easier development workflow
- Single deployment artifact
  **Status:** ✅ Implemented, works well

---

## Dependencies & Integrations

### External Dependencies

**Production:**

- Express 5.1 - REST API server
- Socket.IO 4.8 - WebSocket server
- MQTT 5.9 - MQTT client
- Sharp 0.33 - Image processing
- Joi 17.13 - Schema validation
- Vue 3.5 - Frontend framework
- Vuetify 3.7 - UI component library
- Pinia 3.0 - State management
- Chart.js 4.5 - Chart rendering
- ECharts 6.0 - Advanced charts

**Development:**

- ESLint - Linting
- Prettier - Formatting
- Playwright 1.56 - E2E testing
- c8 - Coverage reporting
- Husky - Git hooks
- Commitlint - Commit validation

### Integration Points

1. **MQTT Broker**
   - Protocol: MQTT 3.1.1 / 5.0
   - Direction: Bidirectional
   - Purpose: Device control, state publishing

2. **Pixoo Device**
   - Protocol: HTTP POST
   - Endpoint: `http://{ip}:80/post`
   - Direction: Outbound
   - Purpose: Frame rendering

3. **AWTRIX Device**
   - Protocol: MQTT
   - Topics: `awtrix/{mac}/*`
   - Direction: Outbound
   - Purpose: Frame rendering, control

4. **Browser (Web UI)**
   - Protocols: HTTP, WebSocket
   - Direction: Bidirectional
   - Purpose: Configuration, control, monitoring

5. **File System**
   - Paths: `/data/*` (config, state)
   - Purpose: Persistence, configuration

---

## Development & Operations

### Development Workflow

```bash
# Setup
npm install

# Development
npm start              # Run daemon
npm run ui:dev         # Vite dev server (hot reload)

# Quality
npm run lint           # Check code quality
npm run lint:fix       # Auto-fix
npm run format         # Prettier format
npm run md:fix         # Fix markdown

# Testing
npm test               # 522 tests
npm run ui:test        # Playwright E2E
npm run coverage       # Coverage report

# Build
npm run build          # Build version + UI
npm run ui:build       # Build Vue app
```

### Deployment

**Docker:**

```yaml
pidicon:
  image: ghcr.io/markus-barta/pidicon:latest
  ports:
    - '10829:10829'
  volumes:
    - ./data:/data
  environment:
    - TZ=Europe/Vienna
  restart: unless-stopped
```

**CI/CD:**

- GitHub Actions on push to main
- Automated tests (522 tests)
- Docker image build (multi-stage)
- Publish to ghcr.io
- Watchtower auto-deploys on production

### Monitoring

**Logs:**

- Structured JSON logs
- 5 levels (debug, info, warning, error, silent)
- Per-device configuration
- Web UI log viewer

**Metrics:**

- Real-time FPS and frametime
- Push count and error count
- WebSocket connection status
- MQTT connection status
- Device health status

**Alerting:**

- Watchdog monitoring
- Auto-restart on failure
- MQTT status alerts
- Error logging

---

## Epic Breakdown

### Completed Epics (v1.0 - v3.2.1)

| Epic                         | Description                      | Status      | Version   |
| ---------------------------- | -------------------------------- | ----------- | --------- |
| **E1: Core Architecture**    | DI, service layer, state store   | ✅ Complete | v2.0      |
| **E2: Multi-Device Support** | Device abstraction, config       | ✅ Complete | v3.0      |
| **E3: Scene Framework**      | Pure render, graphics engine     | ✅ Complete | v1.0-v2.0 |
| **E4: MQTT Integration**     | Commands, state publishing       | ✅ Complete | v1.0-v2.0 |
| **E5: Web UI (Vue 3)**       | Control panel, real-time updates | ✅ Complete | v3.0      |
| **E6: Watchdog Monitoring**  | Health checks, auto-recovery     | ✅ Complete | v2.1      |
| **E7: Scene Scheduling**     | Time-based scheduling            | ✅ Complete | v3.2      |
| **E8: Scene Manager**        | Advanced scene configuration     | ✅ Complete | v3.2      |

### In-Progress Epics

| Epic                   | Description              | Status         | Target |
| ---------------------- | ------------------------ | -------------- | ------ |
| **E9: UI Preferences** | localStorage persistence | 🚧 In Progress | v3.3   |

### Planned Epics

| Epic                         | Description                    | Priority | Target |
| ---------------------------- | ------------------------------ | -------- | ------ |
| **E10: AWTRIX Full Support** | Complete AWTRIX implementation | P1       | v3.3   |
| **E11: Scene Marketplace**   | Share/download custom scenes   | P2       | v3.4   |
| **E12: Mobile App**          | Native mobile control app      | P2       | v3.5   |
| **E13: Plugin System**       | Third-party scene plugins      | P2       | v4.0   |
| **E14: Multi-User Auth**     | User accounts and permissions  | P3       | v4.0   |

---

## Risks & Mitigations

### Technical Risks

| Risk                          | Impact | Probability | Mitigation                              | Status       |
| ----------------------------- | ------ | ----------- | --------------------------------------- | ------------ |
| **Device API Changes**        | High   | Medium      | Abstract driver interface               | ✅ Mitigated |
| **MQTT Broker Downtime**      | Medium | Low         | Auto-reconnect, error handling          | ✅ Mitigated |
| **Scene Memory Leaks**        | High   | Low         | Comprehensive testing, cleanup contract | ✅ Mitigated |
| **WebSocket Connection Loss** | Medium | Medium      | Auto-reconnect, state sync              | ✅ Mitigated |
| **State Corruption**          | High   | Low         | Atomic writes, validation               | ✅ Mitigated |

### Operational Risks

| Risk                     | Impact | Probability | Mitigation                       | Status       |
| ------------------------ | ------ | ----------- | -------------------------------- | ------------ |
| **Container Crashes**    | Medium | Low         | Self-restart, Watchtower         | ✅ Mitigated |
| **Network Issues**       | Medium | Medium      | Retry logic, exponential backoff | ✅ Mitigated |
| **Configuration Errors** | Low    | Medium      | Validation, test connection      | ✅ Mitigated |
| **Device Unavailable**   | Low    | Medium      | Watchdog, fallback scenes        | ✅ Mitigated |

---

## Future Roadmap

### Version 3.3 (Q1 2025)

- ✅ UI Preferences Persistence (UI-787)
- 🎯 AWTRIX Full Implementation
- 🎯 Scene Thumbnails
- 🎯 Performance Optimizations

### Version 3.4 (Q2 2025)

- 🎯 Scene Marketplace
- 🎯 Scene Templates
- 🎯 Advanced Analytics
- 🎯 Scene Transitions/Effects

### Version 3.5 (Q3 2025)

- 🎯 Mobile App (Capacitor)
- 🎯 Offline Mode (Service Worker)
- 🎯 Cloud Sync (Optional)
- 🎯 Advanced Scheduling

### Version 4.0 (Q4 2025)

- 🎯 Plugin System
- 🎯 Multi-User Authentication
- 🎯 Role-Based Access Control
- 🎯 Scene Marketplace API
- 🎯 Visual Scene Editor

---

## Appendices

### A. Related Documents

- **[Project Overview](project-overview.md)** - System summary
- **[Architecture - Daemon](architecture-daemon.md)** - Backend architecture
- **[Architecture - Web](architecture-web.md)** - Frontend architecture
- **[Source Tree Analysis](source-tree-analysis.md)** - Codebase structure
- **[Scene System](scene-system.md)** - Scene framework documentation
- **[API Reference](../guides/API.md)** - Complete API documentation
- **[Backlog](../backlog/README.md)** - Project roadmap (93 items)

### B. Glossary

- **Scene:** A visualization or display mode (e.g., clock, chart, animation)
- **Driver:** Software layer that communicates with specific device hardware
- **Mock Driver:** Simulated driver for development without physical device
- **Frame:** Single rendered image pushed to display
- **Scene State:** Per-scene application state (counters, data, etc.)
- **Device State:** Per-device runtime state (active scene, brightness, etc.)
- **Watchdog:** Monitoring service that detects and recovers from failures
- **Frame Gating:** Mechanism to prevent stale frames during scene transitions
- **Pure Render:** Scene pattern where scenes only render, don't manage timing
- **Graphics Engine:** High-level drawing API for scene development

### C. Version History

| Version | Date       | Changes                              | Status   |
| ------- | ---------- | ------------------------------------ | -------- |
| 3.2.1   | 2025-11-08 | Bug fixes, MQTT logging improvements | Current  |
| 3.2.0   | 2025-10-20 | Scene Manager, scheduling            | Released |
| 3.1.0   | 2025-09-15 | Watchdog, health monitoring          | Released |
| 3.0.0   | 2025-08-01 | Multi-device, Vue 3 UI               | Released |
| 2.1.0   | 2025-06-15 | WebSocket real-time                  | Released |
| 2.0.0   | 2025-05-01 | Architecture refactor                | Released |
| 1.0.0   | 2025-03-01 | Initial release                      | Released |

---

**Document Status:** Current State (Retrospective)  
**Last Updated:** 2025-11-08  
**Next Review:** Upon major feature release (v3.3+)  
**Owner:** Markus Barta  
**Approvers:** N/A (Retrospective documentation)
