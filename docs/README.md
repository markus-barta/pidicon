# Documentation Directory

## Comprehensive documentation for the Pixoo Daemon project

---

## 📚 Documentation Index

### **Architecture & Design**

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, design patterns, and Phase 1 completion status
- **[CODE_QUALITY.md](./CODE_QUALITY.md)** - ⭐ Senior-level code quality standards and best practices

### **Development Guides**

- **[SCENE_DEVELOPMENT.md](./SCENE_DEVELOPMENT.md)** - Complete guide for creating and registering scenes
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment pipeline, Docker, and CI/CD workflows
- **[VERSIONING.md](./VERSIONING.md)** - Version management strategy and build numbering

### **Configuration & Setup**

- **[CONFIG_AND_PERSISTENCE.md](./CONFIG_AND_PERSISTENCE.md)** - Configuration management and persistence strategy
- **[WEB_UI_SETUP.md](./WEB_UI_SETUP.md)** - Web UI development and setup guide
- **[WEB_UI_DOCKER_COMPOSE.md](./WEB_UI_DOCKER_COMPOSE.md)** - Docker Compose setup for web UI

### **Project Management**

- **[BACKLOG.md](./BACKLOG.md)** - Task tracking, test results, and traceability

### **Reports** (Archived Completion Documents)

#### **Phase Completion Reports**

- **[reports/PHASE1_COMPLETE.md](./reports/PHASE1_COMPLETE.md)** - Phase 1: DI, MQTT Service, State Management
- **[reports/PHASE2_COMPLETE.md](./reports/PHASE2_COMPLETE.md)** - Phase 2: Command Handlers
- **[reports/PHASE3_COMPLETE.md](./reports/PHASE3_COMPLETE.md)** - Phase 3: Test Coverage & Polish

#### **Code Quality Reports**

- **[reports/PHASE2_CODE_REVIEW.md](./reports/PHASE2_CODE_REVIEW.md)** - Code quality review (⭐⭐⭐⭐⭐ 5/5)
- **[reports/PERFORMANCE_REVIEW.md](./reports/PERFORMANCE_REVIEW.md)** - Performance analysis (⭐⭐⭐⭐ 4/5)
- **[reports/CRITICAL_BUGS_FIXED.md](./reports/CRITICAL_BUGS_FIXED.md)** - Incident report for BUG-012 and BUG-013

#### **Archived Progress Trackers** (Completed)

- **[reports/\[DONE\]\_PHASE1_CHECKLIST.md](./reports/[DONE]_PHASE1_CHECKLIST.md)** - Phase 1 checklist (archived)
- **[reports/\[DONE\]\_PHASE2_PLAN.md](./reports/[DONE]_PHASE2_PLAN.md)** - Phase 2 plan (archived)
- **[reports/\[DONE\]\_PHASE3_PLAN.md](./reports/[DONE]_PHASE3_PLAN.md)** - Phase 3 plan (archived)
- **[reports/\[DONE\]\_UI-501-PROGRESS.md](./reports/[DONE]_UI-501-PROGRESS.md)** - Vue 3 migration tracker (archived)
- **[reports/\[DONE\]\_VUE_MIGRATION_ANALYSIS.md](./reports/[DONE]_VUE_MIGRATION_ANALYSIS.md)** - Vue migration analysis (archived)
- **[reports/\[DONE\]\_CODEBASE_AUDIT.md](./reports/[DONE]_CODEBASE_AUDIT.md)** - Initial codebase audit (archived)
- **[reports/\[DONE\]\_CONSOLIDATION_SUMMARY.md](./reports/[DONE]_CONSOLIDATION_SUMMARY.md)** - Docs consolidation (archived)
- **[reports/\[DONE\]\_DOCUMENTATION_STRUCTURE.md](./reports/[DONE]_DOCUMENTATION_STRUCTURE.md)** - Docs structure plan (archived)
- **[reports/\[DONE\]\_STANDARDS_UPGRADE.md](./reports/[DONE]_STANDARDS_UPGRADE.md)** - Standards upgrade (archived)

---

## 🎯 Quick Reference

### **For New Developers**

Start here:

1. **[../STANDARDS.md](../STANDARDS.md)** - Quick reference for development standards
2. **[CODE_QUALITY.md](./CODE_QUALITY.md)** - Code quality best practices
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Understanding the system design

### **For Scene Development**

- **[SCENE_DEVELOPMENT.md](./SCENE_DEVELOPMENT.md)** - Complete scene development guide

### **For Deployment**

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment workflows
- **[VERSIONING.md](./VERSIONING.md)** - Version numbering system

### **For Project Management**

- **[BACKLOG.md](./BACKLOG.md)** - Current tasks and status
- **[reports/](./reports/)** - Phase completion reports and analysis

---

## 📊 Documentation Structure

```text
docs/
├── README.md                        # This file
├── ARCHITECTURE.md                  # System design & architecture
├── CODE_QUALITY.md                  # ⭐ Code quality standards
├── SCENE_DEVELOPMENT.md             # Scene development guide
├── DEPLOYMENT.md                    # Deployment & ops guide
├── VERSIONING.md                    # Version strategy
├── CONFIG_AND_PERSISTENCE.md        # Configuration management
├── WEB_UI_SETUP.md                  # Web UI dev setup
├── WEB_UI_DOCKER_COMPOSE.md         # Docker Compose setup
├── BACKLOG.md                       # Task tracking & status
└── reports/                         # Archived completion docs
    ├── PHASE1_COMPLETE.md           # Phase 1 report
    ├── PHASE2_COMPLETE.md           # Phase 2 report
    ├── PHASE3_COMPLETE.md           # Phase 3 report
    ├── PHASE2_CODE_REVIEW.md        # Code quality (5/5)
    ├── PERFORMANCE_REVIEW.md        # Performance (4/5)
    ├── CRITICAL_BUGS_FIXED.md       # Bug reports
    ├── [DONE]_*.md                  # Archived progress trackers
    └── ARCHIVE/
        └── ARC-302.md               # Historical artifacts
```

---

## 🎨 Documentation Principles

1. **Hierarchical**: Root for quick reference, `docs/` for depth
2. **Consistent Naming**: `SCREAMING_SNAKE_CASE` for major docs
3. **Single Source of Truth**: Each topic has one authoritative doc
4. **Living Documents**: Updated as system evolves
5. **Professional**: Industry-standard structure and quality

---

## 🔍 Finding Information

### **Code Quality Questions**

→ [CODE_QUALITY.md](./CODE_QUALITY.md)

- No magic numbers
- Function design
- Naming conventions
- Error handling
- Async patterns

### **Architecture Questions**

→ [ARCHITECTURE.md](./ARCHITECTURE.md)

- System design
- Phase 1 completion
- Design patterns
- Migration roadmap

### **Scene Development Questions**

→ [SCENE_DEVELOPMENT.md](./SCENE_DEVELOPMENT.md)

- Scene interface
- Registration process
- Configuration patterns
- Troubleshooting

### **Deployment Questions**

→ [DEPLOYMENT.md](./DEPLOYMENT.md)

- Docker setup
- CI/CD pipeline
- Version tracking
- Watchtower integration

---

## ✅ Quality Standards

All documentation in this directory follows:

- **Zero Markdown lint errors** (`npm run md:lint`)
- **Consistent formatting** (prettier)
- **Clear code examples** with language tags
- **Professional tone** and structure
- **Up-to-date** with current codebase

---

**Status**: ✅ Complete and current  
**Last Updated**: 2025-10-08  
**Last Cleanup**: 2025-10-08 - Archived 9 completed progress/checklist documents to reports/
