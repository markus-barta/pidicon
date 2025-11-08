# PIDICON Project Documentation Index

**Generated:** 2025-11-08  
**Project:** pidicon v3.2.1  
**Documentation Version:** 1.0.0

## 📖 Quick Start

New to PIDICON? Start here:

1. **[PRD (Product Requirements)](PRD.md)** - Product vision, goals, and requirements (Retrospective)
2. **[Architecture Document](ARCHITECTURE.md)** - Architectural decisions and patterns (ADRs)
3. **[Project Overview](project-overview.md)** - Understand the system at a glance
4. **[Architecture - Daemon](architecture-daemon.md)** - Backend system design
5. **[Architecture - Web](architecture-web.md)** - Frontend architecture
6. **[Source Tree Analysis](source-tree-analysis.md)** - Navigate the codebase
7. **[Scene System](scene-system.md)** - Build custom scenes

## 🎯 For Product Planning (PRD)

If you're planning new features or creating a PRD:

### Key Documents for Requirements Analysis

1. **[PRD (Product Requirements Document)](PRD.md)** ⭐ NEW
   - Product vision and strategic goals
   - Complete functional requirements (6 epics)
   - Non-functional requirements (performance, reliability, security)
   - Success metrics and KPIs
   - Epic breakdown (8 completed, 1 in-progress, 5 planned)
   - Technical architecture and design decisions
   - Future roadmap (v3.3 - v4.0)

2. **[Project Overview](project-overview.md)**
   - System classification and capabilities
   - Technology stack summary
   - Current feature set
   - Integration points

3. **[Architecture - Daemon](architecture-daemon.md)**
   - Service layer capabilities
   - Command system architecture
   - Driver extensibility
   - State management patterns

4. **[Architecture - Web](architecture-web.md)**
   - UI component inventory
   - Real-time communication patterns
   - State management (Pinia)
   - User interaction flows

5. **[Source Tree Analysis](source-tree-analysis.md)**
   - File organization
   - Module boundaries
   - Extension points
   - Integration patterns

### Existing Documentation (Reference)

- **[Architecture Guide](../guides/ARCHITECTURE.md)** - Detailed system design (v3.0+)
- **[API Reference](../guides/API.md)** - Complete API documentation (917 lines)
- **[Development Standards](../guides/DEVELOPMENT_STANDARDS.md)** - Code quality and patterns
- **[Testing Guide](../guides/TESTING.md)** - Testing strategy and infrastructure
- **[Backlog](../backlog/README.md)** - Project roadmap (93 items)

## 📁 Documentation Structure

```
docs/
├── bmad/                           # ⭐ NEW: BMAD-generated documentation
│   ├── README.md                   # This file (master index)
│   ├── PRD.md                      # Product Requirements Document (Retrospective)
│   ├── ARCHITECTURE.md             # Architecture Decision Records (ADRs)
│   ├── project-overview.md         # Executive summary and quick reference
│   ├── architecture-daemon.md      # Backend architecture deep-dive
│   ├── architecture-web.md         # Frontend architecture deep-dive
│   ├── source-tree-analysis.md     # Codebase structure and navigation
│   ├── scene-system.md             # Scene framework documentation
│   ├── bmm-workflow-status.yaml    # BMAD workflow tracking
│   └── project-scan-report.json    # Scan metadata (internal)
│
├── guides/                         # Comprehensive guides
│   ├── ARCHITECTURE.md             # System architecture (legacy, still valid)
│   ├── API.md                      # API reference (917 lines)
│   ├── SCENE_DEVELOPMENT.md        # Scene creation guide
│   ├── DRIVER_DEVELOPMENT.md       # Custom driver guide
│   ├── DEVELOPMENT_STANDARDS.md    # Coding standards
│   ├── TESTING.md                  # Testing guide
│   ├── CODE_QUALITY.md             # Quality metrics
│   ├── VERSIONING.md               # Release management
│   ├── BACKLOG_MANAGEMENT.md       # Backlog workflow
│   ├── WEB_UI_SETUP.md             # Frontend setup
│   └── DEV_AND_CI_SETUP.md         # Development environment
│
├── backlog/                        # Project management
│   ├── README.md                   # Backlog overview
│   ├── planned/                    # Future work (21 items)
│   ├── in-progress/                # Active work (1 item)
│   ├── completed/                  # Done (66 items)
│   └── cancelled/                  # Archived (5 items)
│
├── ai/                             # AI-specific documentation
│   ├── CONFIG_AND_PERSISTENCE.md
│   ├── LAST_SEEN_SOLUTION.md
│   ├── PIDICON_MIGRATION_PLAN.md
│   ├── PIDICON_REFACTOR_STATUS.md
│   ├── SCENE_LOGGING_AUDIT.md
│   ├── STATE_PERSISTENCE.md
│   ├── WATCHDOG_HEALTH.md
│   └── WEBSOCKET_ARCHITECTURE.md
│
├── reports/                        # Implementation reports (20 files)
│   └── *.md                        # Feature completion reports
│
├── tests/                          # Test-specific docs
│   └── ui-control-map.md
│
└── ui/                             # UI-specific docs
    └── UI_PREFERENCES.md
```

## 🎯 Documentation by Role

### For Product Managers

**Understanding the Product:**

1. Read [PRD](PRD.md) for product vision and requirements
2. Read [Project Overview](project-overview.md) for technical capabilities
3. Review [Backlog](../backlog/README.md) for ongoing work
4. Check [Architecture - Daemon](architecture-daemon.md) for technical constraints
5. Reference [API.md](../guides/API.md) for integration capabilities

**Planning Features:**

1. [Source Tree Analysis](source-tree-analysis.md) - Find extension points
2. [Development Standards](../guides/DEVELOPMENT_STANDARDS.md) - Technical requirements
3. [Testing Guide](../guides/TESTING.md) - Quality expectations

### For Architects

**System Design:**

1. [Architecture - Daemon](architecture-daemon.md) - Backend patterns
2. [Architecture - Web](architecture-web.md) - Frontend patterns
3. [Architecture Guide](../guides/ARCHITECTURE.md) - Legacy comprehensive view
4. [API.md](../guides/API.md) - Integration contracts

**Technical Decisions:**

1. [Source Tree Analysis](source-tree-analysis.md) - Module boundaries
2. [Driver Development](../guides/DRIVER_DEVELOPMENT.md) - Extensibility
3. [Scene System](scene-system.md) - Scene framework

### For Developers

**Getting Started:**

1. [Development Standards](../guides/DEVELOPMENT_STANDARDS.md) - Code quality
2. [Source Tree Analysis](source-tree-analysis.md) - Navigate codebase
3. [Architecture - Daemon](architecture-daemon.md) - Backend structure
4. [Architecture - Web](architecture-web.md) - Frontend structure

**Building Features:**

1. [API.md](../guides/API.md) - API contracts
2. [Scene Development](../guides/SCENE_DEVELOPMENT.md) - Custom scenes
3. [Driver Development](../guides/DRIVER_DEVELOPMENT.md) - New drivers
4. [Testing Guide](../guides/TESTING.md) - Testing strategy

**Debugging:**

1. [Scene System](scene-system.md) - Scene lifecycle
2. [State Persistence](../ai/STATE_PERSISTENCE.md) - State management
3. [Watchdog Health](../ai/WATCHDOG_HEALTH.md) - Health monitoring

### For Testers

1. [Testing Guide](../guides/TESTING.md) - Testing infrastructure (522 tests)
2. [Code Quality](../guides/CODE_QUALITY.md) - Quality metrics
3. [API.md](../guides/API.md) - API contracts for testing
4. [Scene System](scene-system.md) - Scene testing patterns

### For UX Designers

1. [Architecture - Web](architecture-web.md) - UI component inventory
2. [UI Preferences](../ui/UI_PREFERENCES.md) - User preference system
3. [WebSocket Architecture](../ai/WEBSOCKET_ARCHITECTURE.md) - Real-time updates
4. [Backlog - UI Items](../backlog/completed/) - Completed UI features

## 📊 Project Statistics

- **Codebase Size:** ~15,000 LOC (backend + frontend)
- **Test Coverage:** 522 tests passing
- **Components:** 16 Vue components
- **Services:** 11 backend services
- **Scenes:** 18 scene implementations
- **Documentation:** 100+ markdown files
- **Build Number:** 924 (active development)

## 🔄 Integration Points

### Backend ↔ MQTT Broker

- **Topics:** `pixoo/+/state/upd`, `pixoo/+/scene/set`, `pixoo/+/driver/set`
- **Docs:** [Architecture - Daemon](architecture-daemon.md), [API.md](../guides/API.md)

### Backend ↔ Devices

- **Protocols:** HTTP (Pixoo), MQTT (AWTRIX)
- **Docs:** [Driver Development](../guides/DRIVER_DEVELOPMENT.md), [Scene System](scene-system.md)

### Backend ↔ Frontend

- **Protocols:** WebSocket (Socket.IO), REST API
- **Docs:** [Architecture - Web](architecture-web.md), [API.md](../guides/API.md)

### Frontend ↔ Browser

- **Storage:** localStorage (UI preferences)
- **Docs:** [Architecture - Web](architecture-web.md), [UI Preferences](../ui/UI_PREFERENCES.md)

## 🛠️ Development Resources

### Setup & Configuration

- [Development Environment](../guides/DEV_AND_CI_SETUP.md)
- [Web UI Setup](../guides/WEB_UI_SETUP.md)
- [Configuration Examples](../../config/README.md)

### Standards & Processes

- [Development Standards](../guides/DEVELOPMENT_STANDARDS.md)
- [Versioning](../guides/VERSIONING.md)
- [Backlog Management](../guides/BACKLOG_MANAGEMENT.md)

### Reference Implementations

- [Source Tree Analysis](source-tree-analysis.md) - Find examples
- [Backlog - Completed](../backlog/completed/) - Implementation reports
- [Reports](../reports/) - Feature completion reports

## 🎓 Learning Paths

### New to PIDICON?

**Day 1: Understand the Product**

1. Read [PRD](PRD.md) for product vision and goals
2. Read [Project Overview](project-overview.md) for technical overview
3. Explore [Source Tree Analysis](source-tree-analysis.md)
4. Review [Architecture - Daemon](architecture-daemon.md)
5. Skim [Architecture - Web](architecture-web.md)

**Day 2: Deep Dive**

1. Read [API.md](../guides/API.md) - Understand integration points
2. Read [Scene System](scene-system.md) - Core functionality
3. Review [Testing Guide](../guides/TESTING.md)
4. Check [Development Standards](../guides/DEVELOPMENT_STANDARDS.md)

**Week 1: Build Something**

1. Follow [Scene Development](../guides/SCENE_DEVELOPMENT.md)
2. Create a custom scene
3. Add tests following [Testing Guide](../guides/TESTING.md)
4. Submit PR following [Development Standards](../guides/DEVELOPMENT_STANDARDS.md)

### Planning a Feature?

**Step 1: Research**

1. Read [PRD](PRD.md) to understand product vision and existing features
2. Search [Backlog](../backlog/) for related work
3. Read [Project Overview](project-overview.md) for current capabilities
4. Review [Architecture - Daemon](architecture-daemon.md) and [Architecture - Web](architecture-web.md)

**Step 2: Design**

1. Identify integration points in [API.md](../guides/API.md)
2. Find extension points in [Source Tree Analysis](source-tree-analysis.md)
3. Consult [Development Standards](../guides/DEVELOPMENT_STANDARDS.md)

**Step 3: Implement**

1. Follow patterns in existing code (see [Source Tree Analysis](source-tree-analysis.md))
2. Add tests (see [Testing Guide](../guides/TESTING.md))
3. Update documentation

## 📝 Documentation Maintenance

### When to Update This Documentation

**BMAD-Generated Docs** (this folder):

- **Project Overview:** After major feature releases (quarterly)
- **Architecture Docs:** When architectural patterns change
- **Source Tree Analysis:** After significant refactoring
- **Scene System:** When scene contract changes

**Existing Docs** (`docs/guides/`):

- **API.md:** After any API changes (immediate)
- **Development Standards:** When coding standards evolve
- **Testing Guide:** When test infrastructure changes

**Backlog:**

- Update on every feature completion
- Follow [Backlog Management](../guides/BACKLOG_MANAGEMENT.md)

### Documentation Principles

1. **Keep Both Updated:** BMAD docs and existing guides complement each other
2. **BMAD = High-Level:** Architecture, overview, navigation
3. **Guides = Detail:** Step-by-step, API contracts, standards
4. **Single Source of Truth:** API.md is canonical for API contracts
5. **Link Liberally:** Cross-reference between documents

## 🚀 Quick Reference Links

### Most Referenced Documents

1. [PRD](PRD.md) - Product requirements and vision
2. [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture decisions (ADRs) ⭐ NEW
3. [API.md](../guides/API.md) - API contracts (updated frequently)
4. [Project Overview](project-overview.md) - System summary (BMAD)
5. [Development Standards](../guides/DEVELOPMENT_STANDARDS.md) - Code quality
6. [Testing Guide](../guides/TESTING.md) - Test strategy
7. [Backlog README](../backlog/README.md) - Project roadmap

### By Feature Area

- **Scenes:** [Scene System](scene-system.md), [Scene Development](../guides/SCENE_DEVELOPMENT.md)
- **Drivers:** [Architecture - Daemon](architecture-daemon.md), [Driver Development](../guides/DRIVER_DEVELOPMENT.md)
- **Web UI:** [Architecture - Web](architecture-web.md), [Web UI Setup](../guides/WEB_UI_SETUP.md)
- **MQTT:** [API.md](../guides/API.md), [Architecture - Daemon](architecture-daemon.md)
- **State:** [State Persistence](../ai/STATE_PERSISTENCE.md), [Architecture - Daemon](architecture-daemon.md)

## 📧 Contact & Contribution

- **Author:** Markus Barta (mba)
- **Repository:** GitHub (ghcr.io/markus-barta/pidicon)
- **License:** GPL-3.0-or-later
- **Contributions:** Follow [Development Standards](../guides/DEVELOPMENT_STANDARDS.md)

---

**Last Updated:** 2025-11-08  
**Generated By:** BMAD document-project workflow  
**Documentation Version:** 1.0.0
