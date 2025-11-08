# PIDICON Architecture Document

**Version:** 1.0.0  
**Date:** 2025-11-08  
**Status:** Current Architecture (Retrospective)  
**Project:** PIDICON v3.2.1  
**Type:** Decision-Focused Architecture

---

## Document Purpose

This document serves as the **architectural blueprint** for PIDICON, capturing key architectural decisions, patterns, and design principles that guide system evolution. It is optimized for AI agent consistency and developer onboarding.

**Audience:**

- Architects planning system evolution
- Developers implementing features
- AI agents requiring architectural context
- Stakeholders evaluating technical design

**Related Documents:**

- [PRD](PRD.md) - Product requirements and vision
- [Architecture - Daemon](architecture-daemon.md) - Backend implementation details
- [Architecture - Web](architecture-web.md) - Frontend implementation details
- [Source Tree Analysis](source-tree-analysis.md) - Codebase navigation

---

## Executive Summary

PIDICON is an **event-driven, service-oriented system** built on Node.js that manages pixel displays through MQTT, WebSocket, and HTTP protocols. The architecture emphasizes **clean separation of concerns**, **hot-swappability**, and **production reliability**.

### Core Architecture Principles

1. **Pure Render Contract** - Scenes render, framework schedules
2. **Dependency Injection** - Explicit dependencies, testable services
3. **Command Pattern** - Unified message handling
4. **Event-Driven** - Reactive state propagation
5. **Multi-Tenancy** - Independent device isolation
6. **Fail-Safe Design** - Graceful degradation, auto-recovery

### System Classification

- **Type:** Backend Daemon + Web UI (Monorepo)
- **Architecture Style:** Event-Driven Microservices
- **Communication:** MQTT (external), WebSocket (UI), HTTP (devices)
- **State Management:** Centralized with persistence
- **Deployment:** Docker containerized, self-healing

---

## System Context Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                         External Systems                             │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │
│  │   Home       │   │   Web        │   │   GitHub     │               │
│  │   Automation │   │   Browsers   │   │   (CI/CD)    │               │
│  │   (HA, etc.) │   │              │   │              │               │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘               │
│         │ MQTT             │ HTTP/WS          │ Docker                │
│         │                  │                  │ Image                 │
└─────────┼──────────────────┼──────────────────┼───────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         PIDICON Daemon                               │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│    ┌───────────────────────────────────────────────────────────────┐  │
│    │                     Transport Layer                           │  │
│    │   ┌────────────┐   ┌────────────┐   ┌─────────────────┐      │  │
│    │   │   MQTT     │   │   REST     │   │   WebSocket     │      │  │
│    │   │   Service  │   │   API      │   │   Server        │      │  │
│    │   │  (in/out)  │   │  (Express) │   │  (Socket.IO)    │      │  │
│    │   └─────┬──────┘   └─────┬──────┘   └────────┬────────┘      │  │
│    └─────────┼────────────┬───┼──────────┬────────┼───────────────┘  │
│              │            │   │          │        │                  │
│   ┌──────────┼────────────┴───┴──────────┴────────┼───────────────┐  │
│   │          │         Command Router / API Gateway             │  │
│   └──────────┼──────────────────────────────────────────────────┬──┘  │
│              │                                                  │     │
│   ┌──────────┴──────────────────────────────────────────────────┴──┐  │
│   │                     Service Layer                              │  │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │  │
│   │   │  Device  │ │  Scene   │ │Scheduler │ │ Watchdog │        │  │
│   │   │  Service │ │  Service │ │  Service │ │  Service │        │  │
│   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘        │  │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │  │
│   │   │  System  │ │   MQTT   │ │  Diag.   │ │ Release  │        │  │
│   │   │  Service │ │  Config  │ │  Service │ │  Checker │        │  │
│   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘        │  │
│   │   + 3 more services                                         │  │
│   └──────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│   ┌──────────────────────────┴──────────────────────────────────┐  │
│   │                  Core Infrastructure                        │  │
│   │   ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐    │  │
│   │   │   DI    │ │  State  │ │  Scene   │ │   Command    │    │  │
│   │   │Container│ │  Store  │ │  Manager │ │   Handlers   │    │  │
│   │   └─────────┘ └─────────┘ └──────────┘ └──────────────┘    │  │
│   └──────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│   ┌──────────────────────────┴──────────────────────────────────┐  │
│   │               Device Driver Abstraction                     │  │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│   │   │  Pixoo   │ │  AWTRIX  │ │   Mock   │ │  Future  │     │  │
│   │   │  Driver  │ │  Driver  │ │  Driver  │ │  Drivers │     │  │
│   │   │  (HTTP)  │ │  (MQTT)  │ │  (Sim.)  │ │   ...    │     │  │
│   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │
│   └──────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
          ┌────────────────────┴────────────────────┐
          ▼                                         ▼
     ┌──────────┐                            ┌──────────┐
     │  Pixoo   │                            │  AWTRIX  │
     │  Device  │                            │  Device  │
     │  (HTTP)  │                            │  (MQTT)  │
     └──────────┘                            └──────────┘
```

---

## Architectural Decisions (ADRs)

### ADR-001: Pure Render Contract for Scenes

**Status:** ✅ Accepted and Implemented  
**Date:** 2025-03-15 (v2.0)  
**Deciders:** Core development team

#### Context

Original scene implementation had each scene managing its own timing with `setInterval`/`setTimeout`. This led to:

- Timer leaks on scene transitions
- Difficulty in centralized control
- Complex scene switching logic
- Stale frame issues

#### Decision

Scenes return a delay (ms) for next frame or `null` to finish. Central scheduler (SceneManager) handles all timing.

**Contract:**

```javascript
{
  async init(ctx) {},      // One-time setup
  async render(ctx) {      // Render one frame
    return 1000;           // Delay until next frame (ms)
    // or null to finish
  },
  async cleanup(ctx) {}    // Resource cleanup
}
```

#### Rationale

- **Centralized Control:** One scheduler per device, easy to stop/pause
- **No Timer Leaks:** Framework manages all timers
- **Frame Gating:** Can detect and drop stale frames
- **Simpler Scenes:** Scene developers don't manage timing
- **Testability:** Easier to unit test render logic

#### Consequences

**Positive:**

- ✅ Zero timer leaks
- ✅ Clean scene transitions
- ✅ Frame gating prevents stale frames
- ✅ Simpler scene development
- ✅ Centralized performance tracking

**Negative:**

- ⚠️ Scenes can't use complex timing patterns (mitigated by state management)
- ⚠️ Requires migration of legacy scenes (completed in v2.0)

**Trade-offs:**

- Gained: Reliability, simplicity, control
- Lost: Scene timing flexibility (acceptable for use cases)

---

### ADR-002: Hot-Swappable Device Drivers

**Status:** ✅ Accepted and Implemented  
**Date:** 2025-02-20 (v1.5)  
**Deciders:** Core development team

#### Context

Development iteration was slow:

- Had to wait for device availability
- Device conflicts when multiple devs test
- Needed to physically access device for testing
- Scene logic testing coupled with hardware

#### Decision

Implement runtime driver switching between `real` and `mock` drivers via MQTT command or Web UI toggle.

**Interface:**

```javascript
class DeviceDriver {
  async initialize(device) {}
  async push(canvas, metadata) {}
  async clear() {}
  async setBrightness(level) {}
  async setDisplayPower(on) {}
  // ... capability methods
}
```

#### Rationale

- **Fast Development:** Test scene logic without device
- **No Conflicts:** Multiple devs can work simultaneously
- **Production Flexibility:** Switch drivers for debugging
- **Testability:** Mock driver for automated tests

#### Consequences

**Positive:**

- ✅ 10x faster development iteration
- ✅ Zero device conflicts
- ✅ Comprehensive automated testing (522 tests)
- ✅ Production debugging capability

**Negative:**

- ⚠️ Need to maintain mock driver parity (mitigated by capability system)
- ⚠️ Slightly more complex driver abstraction (acceptable overhead)

**Trade-offs:**

- Gained: Development speed, test coverage, flexibility
- Lost: Minimal - driver abstraction complexity is small

---

### ADR-003: WebSocket for Real-Time UI Updates

**Status:** ✅ Accepted and Implemented  
**Date:** 2025-04-10 (v2.1)  
**Deciders:** Core development team

#### Context

Original implementation used HTTP polling (5-second interval):

- 5-second latency for state updates
- High server load (constant polling)
- Poor user experience
- Battery drain on mobile devices

#### Decision

Use Socket.IO for bidirectional WebSocket communication between daemon and web UI.

**Events:**

- `device-state-changed` - Device status updates
- `scene-changed` - Scene transitions
- `metrics-updated` - Performance metrics
- `mqtt-status-changed` - MQTT connection status

#### Rationale

- **Low Latency:** < 100ms vs 5000ms
- **Reduced Load:** Push updates vs pull polling
- **Better UX:** Instant feedback
- **Industry Standard:** Socket.IO is battle-tested

#### Consequences

**Positive:**

- ✅ 50x latency improvement (< 100ms achieved)
- ✅ 90% reduction in server load
- ✅ Excellent user experience
- ✅ Mobile-friendly (no constant polling)

**Negative:**

- ⚠️ Requires persistent connection (mitigated by auto-reconnect)
- ⚠️ Slightly more complex than REST (acceptable for benefits)

**Trade-offs:**

- Gained: Real-time UX, performance, user satisfaction
- Lost: Simplicity of polling (worth it for 50x improvement)

---

### ADR-004: Vue 3 Composition API with Vuetify 3

**Status:** ✅ Accepted and Implemented  
**Date:** 2025-07-01 (v3.0)  
**Deciders:** Core development team

#### Context

Need for modern, maintainable web UI:

- Legacy UI was Vue 2 Options API
- Vuetify 2 was becoming outdated
- Needed better composition and reusability
- Material Design 3 updates

#### Decision

Migrate to Vue 3 Composition API with Vuetify 3 Material Design.

**Key Patterns:**

- Composition API for logic reuse
- Composables (`useWebSocket`, `useApi`, `usePreferences`)
- Pinia for state management
- Vite for fast builds

#### Rationale

- **Modern Stack:** Vue 3 is current standard
- **Composition:** Better code organization and reuse
- **Material Design 3:** Modern, accessible UI
- **Developer Experience:** Fast HMR with Vite
- **Maintainability:** Clear component structure

#### Consequences

**Positive:**

- ✅ Clean, maintainable codebase
- ✅ Reusable composables
- ✅ Fast development (HMR < 100ms)
- ✅ Modern UI/UX
- ✅ Excellent documentation and ecosystem

**Negative:**

- ⚠️ Migration effort (one-time cost, completed)
- ⚠️ Learning curve for Vue 2 developers (mitigated by good docs)

**Trade-offs:**

- Gained: Maintainability, modern stack, developer experience
- Lost: Migration time (one-time investment, already paid)

---

### ADR-005: Dependency Injection Container

**Status:** ✅ Accepted and Implemented  
**Date:** 2025-05-01 (v2.0)  
**Deciders:** Core development team

#### Context

Original implementation had tightly coupled services:

- Hard to test in isolation
- Difficult to mock dependencies
- Circular dependency issues
- Poor separation of concerns

#### Decision

Implement lightweight DI container for service management.

**Pattern:**

```javascript
// Registration
container.register(
  'deviceService',
  (c) => new DeviceService(c.resolve('stateStore'), c.resolve('logger'))
);

// Resolution
const deviceService = container.resolve('deviceService');
```

#### Rationale

- **Testability:** Easy to inject mocks
- **Separation:** Clear service boundaries
- **Lifecycle Management:** Singleton pattern
- **Dependency Clarity:** Explicit dependencies
- **Flexibility:** Can swap implementations

#### Consequences

**Positive:**

- ✅ 100% testable services (522 tests)
- ✅ Clear dependency graph
- ✅ No circular dependencies
- ✅ Easy to add new services

**Negative:**

- ⚠️ Slightly more boilerplate (acceptable for benefits)
- ⚠️ Learning curve for DI pattern (mitigated by documentation)

**Trade-offs:**

- Gained: Testability, maintainability, clarity
- Lost: Some simplicity (worth it for test coverage)

---

### ADR-006: Monorepo Structure (Backend + Frontend)

**Status:** ✅ Accepted and Implemented  
**Date:** 2025-03-01 (v1.0)  
**Deciders:** Core development team

#### Context

Decision needed: separate repos vs monorepo?

- Backend (daemon) and frontend tightly coupled
- Shared types and contracts
- Need atomic changes across stack
- Single deployment artifact desired

#### Decision

Single monorepo with backend (daemon) and frontend (Vue app).

**Structure:**

```
pidicon/
├── daemon.js          # Backend entry point
├── lib/               # Backend core
├── web/
│   ├── frontend/      # Vue 3 SPA
│   └── server.js      # Express API
├── scenes/            # Shared scenes
└── test/              # Tests (backend + frontend)
```

#### Rationale

- **Atomic Changes:** API + UI changes in one PR
- **Simplified Versioning:** Single version number
- **Easier Development:** One clone, one install
- **Single Deployment:** Docker image contains both
- **Shared Code:** Scenes, types, constants

#### Consequences

**Positive:**

- ✅ Atomic feature development
- ✅ Simplified CI/CD
- ✅ Single Docker image
- ✅ Easier local development

**Negative:**

- ⚠️ Larger repository (acceptable - still < 20K LOC)
- ⚠️ Backend/frontend dependencies mixed (mitigated by clear structure)

**Trade-offs:**

- Gained: Development speed, consistency, simplicity
- Lost: Repo separation (not needed for this project size)

---

### ADR-007: Centralized State Store with Persistence

**Status:** ✅ Accepted and Implemented  
**Date:** 2025-04-01 (v2.0)  
**Deciders:** Core development team

#### Context

State was scattered across components:

- Hard to track state changes
- Difficult to persist state
- Inconsistent state management
- Race conditions

#### Decision

Implement centralized StateStore with three state types:

1. **Global State** - Daemon-wide configuration
2. **Device State** - Per-device runtime state
3. **Scene State** - Per-scene application state

**Features:**

- Debounced persistence (10-second delay)
- Atomic file operations
- Restore on startup

#### Rationale

- **Single Source of Truth:** One place for all state
- **Consistency:** Atomic updates
- **Observability:** Track all state changes
- **Reliability:** Atomic writes, restore on crash
- **Performance:** Debounced writes reduce I/O

#### Consequences

**Positive:**

- ✅ Zero state inconsistencies
- ✅ Automatic state restoration
- ✅ Easy to track state changes
- ✅ Efficient persistence (debounced)

**Negative:**

- ⚠️ 10-second delay for persistence (acceptable for use case)
- ⚠️ Need to manage state size (not an issue yet)

**Trade-offs:**

- Gained: Consistency, reliability, observability
- Lost: Immediate persistence (acceptable with 10s debounce)

---

### ADR-008: Command Pattern for MQTT Message Handling

**Status:** ✅ Accepted and Implemented  
**Date:** 2025-03-20 (v2.0)  
**Deciders:** Core development team

#### Context

MQTT message handling was scattered in monolithic handler:

- Hard to add new commands
- Difficult to test individual commands
- Poor separation of concerns
- Duplicate validation logic

#### Decision

Implement Command Pattern with dedicated handlers for each command type.

**Handlers:**

- `StateCommandHandler` - `pixoo/+/state/upd`
- `SceneCommandHandler` - `pixoo/+/scene/set`
- `DriverCommandHandler` - `pixoo/+/driver/set`
- `ResetCommandHandler` - `pixoo/+/reset/set`

**Pattern:**

```javascript
class CommandHandler {
  async handle(deviceIp, action, payload) {
    // Validation
    // Execution
    // Response
  }
}
```

#### Rationale

- **Single Responsibility:** One handler per command
- **Testability:** Easy to unit test handlers
- **Extensibility:** Add new handlers easily
- **Consistency:** Shared base class

#### Consequences

**Positive:**

- ✅ Easy to add new commands
- ✅ Comprehensive command tests
- ✅ Clear command boundaries
- ✅ Consistent error handling

**Negative:**

- ⚠️ More files (6 handlers vs 1 monolith) - acceptable
- ⚠️ Need router to dispatch (simple implementation)

**Trade-offs:**

- Gained: Maintainability, testability, extensibility
- Lost: Single-file simplicity (worth it for 6+ commands)

---

## Architecture Patterns

### Pattern 1: Service Layer Architecture

**Problem:** How to organize business logic separate from transport layer?

**Solution:** Service layer provides high-level operations consumed by REST API, MQTT handlers, and internal components.

**Structure:**

```
Transport Layer (REST, MQTT, WebSocket)
         ↓
Service Layer (11 services)
         ↓
Core Infrastructure (DI, State, Scene Manager)
         ↓
Device Drivers
         ↓
Hardware Devices
```

**Benefits:**

- Business logic reuse across transports
- Testable without transport layer
- Clear separation of concerns

**Implementation:**

- 11 services: Device, Scene, Scheduler, Watchdog, System, MQTT Config, Diagnostics, Release Checker, Device Health, Test Results Parser, Scene Service
- All services injectable via DI container
- Services use core infrastructure, not transport

---

### Pattern 2: Repository Pattern for Configuration

**Problem:** How to manage persistent configuration across restarts?

**Solution:** Repository pattern for configuration storage with validation.

**Implementations:**

- `DeviceConfigStore` - Device configurations
- `MqttConfigService` - MQTT broker settings
- `StateStore` - Runtime state persistence

**Benefits:**

- Centralized configuration management
- Validation before persistence
- Easy to swap storage backends
- Atomic file operations

---

### Pattern 3: Adapter Pattern for Device Abstraction

**Problem:** How to support multiple device types with different protocols?

**Solution:** Device driver adapter pattern with capability detection.

**Structure:**

```javascript
DeviceDriver (abstract)
    ↓
    ├── PixooDriver (HTTP)
    ├── AwtrixDriver (MQTT)
    └── MockDriver (Simulation)
```

**Capabilities:**

- Brightness control
- Display power
- Rotation
- Feature detection

**Benefits:**

- Easy to add new device types
- Hot-swappable drivers
- Capability-based feature availability

---

### Pattern 4: Observer Pattern for Real-Time Updates

**Problem:** How to notify multiple clients of state changes?

**Solution:** Event-driven architecture with WebSocket broadcasting and MQTT publishing.

**Flow:**

```
State Change
    ↓
StateStore.setDeviceState()
    ↓
    ├─→ WebSocket Broadcast (UI clients)
    └─→ MQTT Publish (automation systems)
```

**Benefits:**

- Real-time updates (< 100ms)
- Multiple subscribers
- Decoupled components

---

### Pattern 5: Strategy Pattern for Scene Rendering

**Problem:** How to support different scene types with different behaviors?

**Solution:** Strategy pattern where scenes implement render contract, framework provides scheduling.

**Contract:**

```javascript
{
  wantsLoop: boolean,     // Animated vs static
  async render(ctx) {
    return delay;         // Strategy returns control
  }
}
```

**Benefits:**

- Extensible scene library
- Consistent framework
- Easy to add new scene types

---

## Technology Stack Decisions

### Backend Technology Choices

| Technology    | Version   | Rationale                                      | Alternatives Considered                                                       |
| ------------- | --------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| **Node.js**   | 24+ (LTS) | JavaScript ecosystem, async I/O, npm packages  | Python (rejected: slower startup), Go (rejected: less flexible for scenes)    |
| **Express**   | 5.1       | De-facto standard for Node.js REST APIs        | Fastify (rejected: less mature ecosystem), Koa (rejected: less documentation) |
| **Socket.IO** | 4.8       | Battle-tested WebSocket library with fallbacks | ws (rejected: no fallbacks), uWebSockets (rejected: C++ complexity)           |
| **MQTT.js**   | 5.9       | Most popular Node.js MQTT client               | Mosca (rejected: deprecated), MQTT.js is standard                             |
| **Sharp**     | 0.33      | Fastest image processing for Node.js           | Jimp (rejected: too slow), Canvas (rejected: native dependencies)             |
| **Joi**       | 17.13     | Schema validation with great error messages    | Yup (rejected: less features), Zod (rejected: TypeScript focus)               |

### Frontend Technology Choices

| Technology  | Version | Rationale                                 | Alternatives Considered                                                              |
| ----------- | ------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| **Vue**     | 3.5     | Composition API, great DX, small bundle   | React (rejected: overkill for size), Svelte (rejected: smaller ecosystem)            |
| **Vuetify** | 3.7     | Material Design components, comprehensive | Quasar (rejected: less Material Design focus), Element Plus (rejected: Chinese docs) |
| **Pinia**   | 3.0     | Official Vue state management, simple API | Vuex (rejected: deprecated for Vue 3), Redux (rejected: too verbose)                 |
| **Vite**    | 5.4     | Fast dev server, great DX                 | Webpack (rejected: slower), Rollup (rejected: more config)                           |

### Infrastructure Choices

| Technology         | Version | Rationale                                  | Alternatives Considered                                               |
| ------------------ | ------- | ------------------------------------------ | --------------------------------------------------------------------- |
| **Docker**         | Latest  | Standard containerization, multi-platform  | Podman (rejected: less widespread), VM (rejected: too heavy)          |
| **Alpine Linux**   | Latest  | Minimal image size (100MB vs 1GB)          | Ubuntu (rejected: large image), Debian (rejected: larger than Alpine) |
| **GitHub Actions** | -       | Free for open source, integrated with repo | GitLab CI (rejected: separate service), CircleCI (rejected: cost)     |

---

## Deployment Architecture

### Containerization Strategy

**Multi-Stage Build:**

```dockerfile
# Stage 1: Build (install all deps, build frontend)
FROM node:24-alpine AS builder
# Install deps, build version, build UI

# Stage 2: Production (only runtime deps)
FROM node:24-alpine AS production
# Copy only production code and deps
# Minimal surface area, faster startup
```

**Benefits:**

- Small production image (~150MB)
- Separate build and runtime environments
- Faster deployments

### Self-Restart Pattern

**Problem:** Container crashes require Docker restart policy

**Solution:** Internal restart capability with clean Docker networking

**Implementation:**

```bash
#!/bin/sh
# start-daemon.sh
while true; do
  node daemon.js
  if [ $? -ne 42 ]; then break; fi  # Exit code 42 = restart
  echo "Restarting daemon in 3 seconds..."
  sleep 3
done
```

**Benefits:**

- Fast restart (3s vs Docker restart 10s+)
- Clean network state
- No Docker restart policy needed
- Self-healing capability

### CI/CD Pipeline

**Trigger:** Push to `main` branch

**Stages:**

1. **Test** - Run 522 tests
2. **Build** - Multi-stage Docker build
3. **Publish** - Push to ghcr.io
4. **Deploy** - Watchtower auto-deploys on production

**Deployment Flow:**

```
Git Push → GitHub Actions → Build → GHCR → Watchtower → Production
```

**Result:** Zero-downtime deployments, automatic rollback on failure

---

## Security Architecture

### Authentication & Authorization

**Web UI:**

- Optional Basic Auth via `PIXOO_WEB_AUTH` environment variable
- Format: `username:password`
- All endpoints protected when enabled

**MQTT:**

- Username/password authentication
- Credentials stored in encrypted config
- Auto-reconnect with stored credentials

### Credential Management

**Storage:**

```javascript
{
  "brokerUrl": "mqtt://host:1883",
  "username": "user",
  "password": "encrypted_password"  // Encrypted at rest
}
```

**Encryption:**

- Secrets encrypted using `crypto-utils.js`
- Keys stored separately (environment or secure volume)

### Input Validation

**Joi Schemas:**

- All API inputs validated
- MQTT message payloads validated
- Configuration files validated on load

**Example:**

```javascript
const deviceSchema = Joi.object({
  ip: Joi.string().ip().required(),
  name: Joi.string().min(1).max(50).required(),
  deviceType: Joi.string().valid('pixoo64', 'awtrix').required(),
});
```

### Network Security

**Docker:**

- No host networking required
- Minimal port exposure (10829 only)
- Internal network for MQTT communication

**MQTT:**

- TLS support (optional)
- Username/password authentication
- Topic-based access control (broker-side)

---

## Performance Architecture

### Optimization Strategies

| Component             | Strategy                               | Result                       |
| --------------------- | -------------------------------------- | ---------------------------- |
| **Scene Rendering**   | Frame gating, debouncing               | < 50ms render time           |
| **State Persistence** | 10s debounce, atomic writes            | 90% I/O reduction            |
| **WebSocket**         | Binary protocol, compression           | < 100ms latency              |
| **Image Processing**  | Sharp (libvips), hardware acceleration | 10x faster than alternatives |
| **Frontend Bundle**   | Code splitting, tree shaking           | < 500KB total                |

### Caching Strategy

**Scene Definitions:**

- Loaded once on startup
- Hot-reload for development
- No runtime overhead

**Device State:**

- Cached in StateStore
- Reactive updates via events
- Persisted every 10s

**MQTT Connection:**

- Single persistent connection
- Connection pooling for multiple subscriptions
- Auto-reconnect with exponential backoff

### Monitoring & Metrics

**Real-Time Metrics:**

- FPS (frames per second) for animated scenes
- Frametime (ms) for render + push
- Push count and error count
- WebSocket latency
- MQTT connection status

**Historical Tracking:**

- Scene usage statistics
- Device health trends
- Error rates over time
- Performance degradation detection

---

## Scalability Considerations

### Current Limits

| Resource               | Current Limit | Design Limit | Notes                 |
| ---------------------- | ------------- | ------------ | --------------------- |
| **Devices per Daemon** | 10            | 100          | Limited by CPU/memory |
| **Scenes per Device**  | 1             | 1            | By design (isolation) |
| **WebSocket Clients**  | 10            | 50           | Limited by memory     |
| **MQTT Messages/sec**  | 100           | 1000         | Limited by broker     |
| **Scene FPS**          | 60            | 60           | Hardware limited      |

### Horizontal Scaling

**Current:** Single daemon instance per deployment

**Future (if needed):**

- Multiple daemon instances with device sharding
- Redis for shared state
- Load balancer for Web UI
- MQTT cluster for message distribution

**Decision:** Not needed yet. Current architecture handles 10+ devices well.

---

## Extensibility Points

### Adding New Device Drivers

**Steps:**

1. Extend `DeviceDriver` base class
2. Implement required methods (`initialize`, `push`, `clear`, etc.)
3. Define capabilities
4. Register driver in driver registry
5. Add tests

**Example:**

```javascript
class MyCustomDriver extends DeviceDriver {
  async initialize(device) {
    this.capabilities = {
      brightness: true,
      displayPower: false,
      rotation: false,
    };
  }

  async push(canvas, metadata) {
    // Send pixels to device
  }
}
```

### Adding New Scene Types

**Steps:**

1. Create scene file in `scenes/{deviceType}/`
2. Implement scene contract (`init`, `render`, `cleanup`)
3. Define metadata (name, description, category)
4. Restart daemon (or hot-reload in dev mode)

**No code changes required** - scenes auto-discovered!

### Adding New MQTT Commands

**Steps:**

1. Create new command handler extending `CommandHandler`
2. Implement `handle(deviceIp, action, payload)` method
3. Register handler in CommandRouter
4. Add validation schema
5. Add tests

**Example:**

```javascript
class MyCommandHandler extends CommandHandler {
  async handle(deviceIp, action, payload) {
    // Validate
    // Execute
    // Respond
  }
}
```

### Adding New Web UI Features

**Steps:**

1. Create Vue component in `web/frontend/src/components/`
2. Add to appropriate view
3. Use composables for API/WebSocket integration
4. Add to navigation if needed
5. Test with Playwright

**Patterns to follow:**

- Use Composition API
- Extract reusable logic to composables
- Use Pinia for global state
- Follow Material Design guidelines

---

## Testing Architecture

### Test Strategy

| Test Type             | Count   | Coverage          | Tools            |
| --------------------- | ------- | ----------------- | ---------------- |
| **Unit Tests**        | 450+    | Services, Utils   | Node test runner |
| **Integration Tests** | 50+     | End-to-end flows  | Node test runner |
| **Contract Tests**    | 20+     | API contracts     | Node test runner |
| **E2E Tests**         | 2+      | UI workflows      | Playwright       |
| **Total**             | **522** | **Comprehensive** | -                |

### Test Pyramid

```
         /\
        /  \  E2E (2 tests)
       /____\
      /      \  Integration (50 tests)
     /________\
    /          \  Unit (450 tests)
   /____________\
```

### Testing Patterns

**Dependency Injection for Testability:**

```javascript
// Production
const service = new DeviceService(
  container.resolve('stateStore'),
  container.resolve('logger')
);

// Test
const service = new DeviceService(mockStateStore, mockLogger);
```

**Mock Driver for Testing:**

- All tests use mock driver
- No real device required
- Fast execution (< 10s for 522 tests)
- Reliable (no hardware dependencies)

---

## Migration & Evolution Strategy

### Version Migration

**Current:** v3.2.1

**Backward Compatibility:**

- Environment variables (v1.x) still supported
- Legacy MQTT topics still work
- Old scene format still valid

**Breaking Changes:**

- Major version bumps only (v3.0, v4.0)
- Migration guide provided
- Deprecation warnings for 1+ version

### Future Evolution Path

**v3.3 (Q1 2025):**

- UI Preferences persistence (in progress)
- AWTRIX full implementation
- Performance optimizations

**v4.0 (Q4 2025):**

- Plugin system (new architecture)
- Multi-user authentication (breaking change)
- Scene marketplace API

**Architecture Stability:**

- Core architecture patterns (DI, Service Layer, Command Pattern) are stable
- New features extend, don't replace
- ADRs guide decision-making

---

## Appendices

### A. Related Documents

- [PRD](PRD.md) - Product requirements and vision
- [Architecture - Daemon](architecture-daemon.md) - Backend implementation details
- [Architecture - Web](architecture-web.md) - Frontend implementation details
- [Source Tree Analysis](source-tree-analysis.md) - Codebase navigation
- [Scene System](scene-system.md) - Scene framework documentation
- [API Reference](../guides/API.md) - Complete API documentation

### B. Architecture Decision Log

| ADR     | Decision                | Date       | Status      |
| ------- | ----------------------- | ---------- | ----------- |
| ADR-001 | Pure Render Contract    | 2025-03-15 | ✅ Accepted |
| ADR-002 | Hot-Swappable Drivers   | 2025-02-20 | ✅ Accepted |
| ADR-003 | WebSocket for Real-Time | 2025-04-10 | ✅ Accepted |
| ADR-004 | Vue 3 + Vuetify 3       | 2025-07-01 | ✅ Accepted |
| ADR-005 | Dependency Injection    | 2025-05-01 | ✅ Accepted |
| ADR-006 | Monorepo Structure      | 2025-03-01 | ✅ Accepted |
| ADR-007 | Centralized State Store | 2025-04-01 | ✅ Accepted |
| ADR-008 | Command Pattern         | 2025-03-20 | ✅ Accepted |

### C. Glossary

- **ADR:** Architecture Decision Record - Document capturing a significant architectural decision
- **DI:** Dependency Injection - Pattern for managing service dependencies
- **Driver:** Software layer that communicates with specific device hardware
- **Frame Gating:** Mechanism to prevent stale frames during scene transitions
- **Hot-Swap:** Runtime switching between implementations without restart
- **Pure Render:** Scene pattern where scenes only render, don't manage timing
- **Scene:** A visualization or display mode (e.g., clock, chart, animation)
- **Service Layer:** Abstraction layer containing business logic
- **State Store:** Centralized state management with persistence
- **Watchdog:** Monitoring service that detects and recovers from failures

---

**Document Status:** Current Architecture  
**Last Updated:** 2025-11-08  
**Next Review:** Upon architectural changes or v4.0 planning  
**Owner:** Core Development Team  
**Approvers:** Markus Barta
