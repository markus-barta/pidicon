# Documentation Structure & Consolidation Plan

**Last Updated**: 2025-09-30  
**Status**: Phase 1 Complete - Documentation Audit

---

## 📊 Current Documentation Inventory

### **Root Level** (7 files, ~2,800 lines)

| File                                  | Lines | Purpose                                | Status     |
| ------------------------------------- | ----- | -------------------------------------- | ---------- |
| `README.md`                           | ~489  | Main project overview, quick start     | ✅ Current |
| `ARCHITECTURE_ANALYSIS.md`            | ~448  | Architecture review & Phase 1 status   | ✅ Current |
| `STANDARDS.md`                        | ~241  | Development standards & best practices | ✅ Current |
| `SCENE_DEVELOPMENT_BEST_PRACTICES.md` | ~369  | Scene development guide                | ✅ Current |
| `MQTT_COMMANDS.md`                    | ~200  | MQTT API reference                     | ✅ Current |
| `DEPLOYMENT.md`                       | ~210  | Deployment guide & CI/CD               | ✅ Current |
| `VERSIONING.md`                       | ~330  | Versioning strategy                    | ✅ Current |

### **docs/** (3 files, ~1,300 lines)

| File                              | Lines | Purpose                         | Status       |
| --------------------------------- | ----- | ------------------------------- | ------------ |
| `docs/BACKLOG.md`                 | ~864  | Project backlog & task tracking | ✅ Current   |
| `docs/PHASE1-COMPLETE.md`         | ~268  | Phase 1 completion report       | ✅ Current   |
| `docs/ARC-302-PHASE1-COMPLETE.md` | ~332  | ARC-302 detailed report         | ⚠️ Redundant |

### **Subdirectories** (3 files, ~600 lines)

| File               | Lines | Purpose                       | Status     |
| ------------------ | ----- | ----------------------------- | ---------- |
| `lib/README.md`    | ~434  | Library modules documentation | ✅ Current |
| `scenes/README.md` | ~212  | Scenes directory guide        | ✅ Current |
| `src/README.md`    | ~7    | Placeholder                   | ⚠️ Minimal |

**Total**: 13 files, ~4,700 lines of documentation

---

## 🎯 Consolidation Recommendations

### **Proposed Structure**

```text
Documentation Hierarchy (Post-Consolidation)

Root Level (User-Facing)
├── README.md                              # Quick start, highlights, links
├── STANDARDS.md                           # Dev standards (keep as-is)
└── MQTT_COMMANDS.md                       # API reference (keep as-is)

docs/ (Detailed Documentation)
├── ARCHITECTURE.md                        # ← Consolidate ARCHITECTURE_ANALYSIS.md
├── DEPLOYMENT.md                          # ← Move from root
├── VERSIONING.md                          # ← Move from root
├── SCENE_DEVELOPMENT.md                   # ← Rename from SCENE_DEVELOPMENT_BEST_PRACTICES.md
├── BACKLOG.md                             # Keep as-is
└── reports/                               # ← NEW: Historical reports
    ├── PHASE1_COMPLETE.md                 # ← Rename from PHASE1-COMPLETE.md
    └── ARCHIVE/
        └── ARC-302_DETAILED.md            # ← Archive ARC-302-PHASE1-COMPLETE.md

lib/
└── README.md                              # Keep as-is

scenes/
└── README.md                              # Keep as-is

src/
└── (remove README.md or expand properly)
```

---

## 🏗️ Naming Conventions

### **Principle**: Purpose + Scope, not Type

**❌ Poor Naming**:

- `SCENE_DEVELOPMENT_BEST_PRACTICES.md` (too verbose, screaming case with underscores)
- `ARC-302-PHASE1-COMPLETE.md` (task ID in filename)
- `ARCHITECTURE_ANALYSIS.md` (implies temporary analysis)

**✅ Good Naming**:

- `SCENE_DEVELOPMENT.md` (clear purpose, concise)
- `ARCHITECTURE.md` (living document)
- `reports/PHASE1_COMPLETE.md` (organized by type, clear snapshot)

### **Naming Standards**

1. **Case**: `SCREAMING_SNAKE_CASE` for root docs (visibility), `snake_case` for subdirs
2. **Length**: Max 20 characters (excluding extension)
3. **Descriptive**: Purpose > Type (e.g., "DEPLOYMENT" not "DEPLOY_GUIDE")
4. **Dates**: Only in `/reports` or `/archive` (e.g., `PHASE1_2025Q3.md`)

### **Category Prefixes** (for `docs/` subdirectory)

- `ARCHITECTURE.md` - System design
- `DEPLOYMENT.md` - Ops & deployment
- `BACKLOG.md` - Task tracking
- `reports/` - Historical snapshots
- `guides/` - How-to guides (future)

---

## 📋 Consolidation Actions

### **Phase 1: Immediate (Low Risk)**

1. **Move detailed docs to `docs/`**:

   ```bash
   mv DEPLOYMENT.md docs/
   mv VERSIONING.md docs/
   mv SCENE_DEVELOPMENT_BEST_PRACTICES.md docs/SCENE_DEVELOPMENT.md
   ```

2. **Rename for consistency**:

   ```bash
   mv docs/PHASE1-COMPLETE.md docs/reports/PHASE1_COMPLETE.md
   mv ARCHITECTURE_ANALYSIS.md docs/ARCHITECTURE.md
   ```

3. **Archive redundant reports**:

   ```bash
   mkdir -p docs/reports/ARCHIVE
   mv docs/ARC-302-PHASE1-COMPLETE.md docs/reports/ARCHIVE/
   ```

4. **Remove or enhance minimal docs**:
   - Either remove `src/README.md` or add proper content
   - Add note in `README.md` pointing to consolidated structure

### **Phase 2: Update Links (Medium Risk)**

Update internal links in:

- `README.md` → Update "See X" references
- `STANDARDS.md` → Update file references
- Other docs → Search & replace old paths

### **Phase 3: Update CI/CD (Low Risk)**

- Update any scripts that reference doc paths
- Update `.cursor/rules` if they reference doc locations

---

## 🎨 Proposed Root `README.md` Structure

**Keep it focused on getting started:**

```markdown
# Pixoo Daemon

## Quick Start

- Installation
- First command
- Basic usage

## Key Features

- Bullet points

## Documentation

**Getting Started**:

- [Quick Start](#quick-start) (this file)
- [MQTT Commands](./MQTT_COMMANDS.md) - API reference
- [Standards](./STANDARDS.md) - Development guidelines

**Detailed Guides** (in `docs/`):

- [Architecture](./docs/ARCHITECTURE.md) - System design
- [Scene Development](./docs/SCENE_DEVELOPMENT.md) - Scene guide
- [Deployment](./docs/DEPLOYMENT.md) - Ops guide
- [Versioning](./docs/VERSIONING.md) - Version strategy

**Project Management**:

- [Backlog](./docs/BACKLOG.md) - Task tracking
- [Phase 1 Report](./docs/reports/PHASE1_COMPLETE.md) - Completion status

## Contributing

- Link to STANDARDS.md
```

---

## ✅ Benefits of Consolidation

1. **Reduced Clutter**: Root has only 3 user-facing docs
2. **Clear Hierarchy**: Root = quick start, `docs/` = depth
3. **Better Organization**: Reports separated from guides
4. **Consistent Naming**: All follow same convention
5. **Easier Maintenance**: Clear purpose per file
6. **Better Navigation**: Logical grouping

---

## 📊 Before/After Comparison

| Aspect             | Before                        | After                   |
| ------------------ | ----------------------------- | ----------------------- |
| Root Files         | 7 .md files                   | 3 .md files             |
| Naming Style       | Mixed (SCREAMING, snake_case) | Consistent              |
| Organization       | Flat                          | Hierarchical            |
| Historical Reports | Mixed with docs               | In `reports/`           |
| Total Files        | 13                            | 11 (2 archived/removed) |

---

## 🚀 Implementation Priority

**Must Do** (High Value, Low Risk):

1. ✅ Move `DEPLOYMENT.md`, `VERSIONING.md` to `docs/`
2. ✅ Rename `SCENE_DEVELOPMENT_BEST_PRACTICES.md` → `docs/SCENE_DEVELOPMENT.md`
3. ✅ Create `docs/reports/` and move phase reports
4. ✅ Rename `ARCHITECTURE_ANALYSIS.md` → `docs/ARCHITECTURE.md`

**Should Do** (Medium Value, Medium Risk):

1. ⚠️ Update all internal links (requires testing)
2. ⚠️ Remove or enhance `src/README.md`

**Nice to Have** (Low Value, Low Risk):

1. 💡 Archive `ARC-302-PHASE1-COMPLETE.md` (redundant with PHASE1)
2. 💡 Update README.md structure to be more focused

---

## 📝 Notes

- Keep `lib/README.md` and `scenes/README.md` as-is (module-specific)
- `MQTT_COMMANDS.md` stays at root (API reference = frequently accessed)
- `STANDARDS.md` stays at root (development reference)
- All root docs should be skimmable in < 5 minutes
- All `docs/` files are for depth/details

---

**Status**: ✅ Ready for consolidation  
**Risk Level**: Low (mostly file moves + renames)  
**Estimated Time**: 20-30 minutes + testing
