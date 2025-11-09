# PIDICON Documentation Hub

**Version:** 3.2.1  
**Last Updated:** 2025-11-09  
**Documentation Structure:** BMAD BMM

---

## 📚 Quick Navigation

### 🎯 Planning & Requirements

- **[PRD.md](./PRD.md)** - Product Requirements Document
- **[sprint-status.yaml](./sprint-status.yaml)** - Current sprint tracking
- **[sprint-planning.md](./sprint-planning.md)** - Sprint planning reference

### 🏗️ Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture
- **[architecture-daemon.md](./architecture-daemon.md)** - Daemon architecture details
- **[architecture-web.md](./architecture-web.md)** - Web UI architecture
- **[scene-system.md](./scene-system.md)** - Scene rendering system

### 📋 Epics & Stories

- **[epics/](./epics/)** - All epic files (Epic 1-5)
- **[stories/](./stories/)** - Active story files
- **[sprint-status.yaml](./sprint-status.yaml)** - Story status tracking

### 📖 Developer Guides

- **[guides/API.md](./guides/API.md)** - REST API & WebSocket reference
- **[guides/SCENE_DEVELOPMENT.md](./guides/SCENE_DEVELOPMENT.md)** - Scene development
- **[guides/DRIVER_DEVELOPMENT.md](./guides/DRIVER_DEVELOPMENT.md)** - Driver development
- **[guides/TESTING.md](./guides/TESTING.md)** - Testing strategy
- **[guides/DEVELOPMENT_STANDARDS.md](./guides/DEVELOPMENT_STANDARDS.md)** - Code standards
- **[guides/CODE_QUALITY.md](./guides/CODE_QUALITY.md)** - Quality guidelines
- **[guides/VERSIONING.md](./guides/VERSIONING.md)** - Version management
- **[guides/AWTRIX_INTEGRATION.md](./guides/AWTRIX_INTEGRATION.md)** - AWTRIX guide

### 🔄 BMAD Workflows

- **[bmad-migration-guide.md](./bmad-migration-guide.md)** - BMAD structure guide
- **[DOCUMENTATION_MIGRATION_PLAN.md](./DOCUMENTATION_MIGRATION_PLAN.md)** - Migration plan
- **Access via:** `@bmad/bmm/agents/sm` for Scrum Master workflows

---

## 🗂️ Document Structure

```
docs/bmad/
├── README.md                    # This file
├── PRD.md                       # Product requirements
├── ARCHITECTURE.md              # Technical architecture
├── sprint-status.yaml           # Sprint tracking
├── sprint-planning.md           # Sprint reference
│
├── epics/                       # Epic files
│   ├── epic-1-core-foundation.md
│   ├── epic-2-configuration-observability.md
│   ├── epic-3-testing-documentation.md
│   ├── epic-4-scene-marketplace.md
│   └── epic-5-mobile-offline.md
│
├── stories/                     # Story files
│   ├── 1-4-bmad-sprint-status-display-scene.md
│   ├── 2-1-config-hot-reload.md
│   ├── 2-2-live-log-viewer.md
│   ├── 2-3-watchdog-restart-cooldown-backoff.md
│   └── 2-4-smart-release-checker-caching.md
│
├── guides/                      # Developer documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── SCENE_DEVELOPMENT.md
│   ├── DRIVER_DEVELOPMENT.md
│   ├── TESTING.md
│   ├── DEVELOPMENT_STANDARDS.md
│   ├── CODE_QUALITY.md
│   ├── VERSIONING.md
│   ├── WEB_UI_SETUP.md
│   ├── AWTRIX_INTEGRATION.md
│   └── BACKLOG_MANAGEMENT.md
│
└── migrations/                  # Migration documentation
    ├── bmad-migration-guide.md
    └── DOCUMENTATION_MIGRATION_PLAN.md
```

---

## 🚀 Current Sprint Status

**Sprint 1:** ✅ Complete (Epic 1 - Core Foundation)

- All 4 stories complete
- 18 story points delivered

**Sprint 2:** 🎯 Ready (Epic 2 - Configuration & Observability)

- 4 stories planned
- 13 story points
- Target: 2 weeks

---

## 📖 Getting Started

### For Developers

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
2. Review [DEVELOPMENT_STANDARDS.md](./guides/DEVELOPMENT_STANDARDS.md) - Code standards
3. Check [API.md](./guides/API.md) - API reference
4. See [SCENE_DEVELOPMENT.md](./guides/SCENE_DEVELOPMENT.md) - Scene guide

### For Project Management

1. Review [PRD.md](./PRD.md) - Product vision
2. Check [sprint-status.yaml](./sprint-status.yaml) - Current status
3. Read [bmad-migration-guide.md](./bmad-migration-guide.md) - BMAD workflows
4. Use `@bmad/bmm/agents/sm` - Access Scrum Master agent

### For Contributors

1. Read [DEVELOPMENT_STANDARDS.md](./guides/DEVELOPMENT_STANDARDS.md)
2. Review [CODE_QUALITY.md](./guides/CODE_QUALITY.md)
3. Check [TESTING.md](./guides/TESTING.md)
4. See [VERSIONING.md](./guides/VERSIONING.md)

---

## 🔄 BMAD Workflow Quick Reference

**Access Scrum Master:**

```
@bmad/bmm/agents/sm
```

**Common Commands:**

- `*sprint-planning` - Update sprint status
- `*create-story` - Create story from epic
- `*story-context` - Generate story context
- `*dev-story` - Implement story
- `*workflow-status` - Check workflow state

---

## 📊 Project Metrics

- **Version:** v3.2.1 (production)
- **Epics:** 5 (1 complete, 4 planned)
- **Stories:** 18 total (4 done, 14 planned)
- **Tests:** 522+ passing
- **Architecture Docs:** Comprehensive
- **Developer Guides:** 11 guides

---

## 🗄️ Legacy Documentation

**Note:** Legacy backlog and old documentation has been archived to:

```
docs/X_backlog_legacy/
```

This directory contains historical items for reference only. All active work is tracked through the BMAD structure above.

---

## 📝 Documentation Standards

### Epic Files

- Located in `epics/`
- Named: `epic-{number}-{kebab-case-title}.md`
- Contains all stories for that epic

### Story Files

- Located in `stories/`
- Named: `{epic}-{story}-{kebab-case-title}.md`
- Full BMAD story format

### Status Tracking

- **sprint-status.yaml** - Single source of truth
- Generated by `*sprint-planning` workflow
- Status: backlog → drafted → ready-for-dev → in-progress → review → done

---

## 🤝 Contributing

1. Check [sprint-status.yaml](./sprint-status.yaml) for current work
2. Use BMAD workflows for story creation
3. Follow [DEVELOPMENT_STANDARDS.md](./guides/DEVELOPMENT_STANDARDS.md)
4. Submit PRs with tests and documentation

---

## 📞 Support

- **Documentation Issues:** Update relevant guide and submit PR
- **BMAD Questions:** See [bmad-migration-guide.md](./bmad-migration-guide.md)
- **Architecture Questions:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Questions:** See [guides/API.md](./guides/API.md)

---

**Documentation Status:** ✅ Active  
**BMAD Migration:** ✅ Complete (2025-11-09)  
**Maintainer:** mba
