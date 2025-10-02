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

### **Project Management**

- **[BACKLOG.md](./BACKLOG.md)** - Task tracking, test results, and traceability
- **[PHASE1_CHECKLIST.md](./PHASE1_CHECKLIST.md)** - Phase 1 completion verification

### **Meta Documentation**

- **[DOCUMENTATION_STRUCTURE.md](./DOCUMENTATION_STRUCTURE.md)** - Documentation organization and consolidation plan
- **[CONSOLIDATION_SUMMARY.md](./CONSOLIDATION_SUMMARY.md)** - Documentation consolidation execution report
- **[STANDARDS_UPGRADE.md](./STANDARDS_UPGRADE.md)** - Standards upgrade to senior-level practices

### **Reports**

- **[reports/PHASE1_COMPLETE.md](./reports/PHASE1_COMPLETE.md)** - Phase 1 completion detailed report
- **[reports/ARCHIVE/ARC-302.md](./reports/ARCHIVE/ARC-302.md)** - Archived: ARC-302 detailed report

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

---

## 📊 Documentation Structure

```text
docs/
├── README.md                        # This file
├── ARCHITECTURE.md                  # System design
├── CODE_QUALITY.md                  # ⭐ Best practices
├── SCENE_DEVELOPMENT.md             # Scene guide
├── DEPLOYMENT.md                    # Ops guide
├── VERSIONING.md                    # Version strategy
├── BACKLOG.md                       # Task tracking
├── PHASE1_CHECKLIST.md              # Phase 1 verification
├── DOCUMENTATION_STRUCTURE.md       # Doc organization
├── CONSOLIDATION_SUMMARY.md         # Consolidation report
├── STANDARDS_UPGRADE.md             # Standards upgrade report
└── reports/                         # Historical reports
    ├── PHASE1_COMPLETE.md
    └── ARCHIVE/
        └── ARC-302.md
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
**Last Updated**: 2025-09-30
