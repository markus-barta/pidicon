# PIDICO → PIDICON Migration Plan

**Date**: 2025-10-13  
**Reason**: International branding considerations  
**Status**: In Progress

## Summary

Rename **PIDICO** to **PIDICON** (Pixel Display Controller) across entire codebase.

---

## 📋 Migration Checklist

### Phase 1: Code & Configuration

- [ ] `package.json` - Update `name` field
- [ ] Environment variables (`PIDICO_*` → `PIDICON_*`)
- [ ] All JavaScript/Vue files (PIDICO → PIDICON)
- [ ] All documentation files (PIDICO → PIDICON)
- [ ] HTML title tags

### Phase 2: Folder & Repository

- [ ] Rename folder: `pixoo-daemon` → `pidicon`
- [ ] GitHub repo rename: `pixoo-daemon` → `pidicon`
- [ ] Update git remote URL locally
- [ ] Update any CI/CD references

### Phase 3: Backward Compatibility

- [ ] Keep `PIXOO_*` env vars working (already done)
- [ ] Add `PIDICO_*` → `PIDICON_*` fallback
- [ ] Document migration path for existing users

---

## 🔍 Files to Update

### JavaScript/Vue Files (39 occurrences)

```
package.json
web/frontend/src/components/SystemStatus.vue
web/frontend/index.html
web/frontend/src/main.js
lib/device-adapter.js
daemon.js
web/server.js
lib/device-config-store.js
```

### Documentation (All .md files)

```
README.md
docs/PIDICO_REFACTOR_STATUS.md
config/README.md
docs/VERSIONING.md
docs/ARCHITECTURE.md (future)
docs/SCENE_DEVELOPMENT.md (future)
```

### Configuration

```
.env.example (if exists)
config/devices.example.json
```

---

## 🚀 Execution Steps

### Step 1: Update Code References

```bash
# Find all PIDICO references
grep -r "PIDICO" --include="*.js" --include="*.vue" --include="*.json" --include="*.md" --include="*.html" .

# Replace PIDICO → PIDICON
find . -type f \( -name "*.js" -o -name "*.vue" -o -name "*.json" -o -name "*.md" -o -name "*.html" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/PIDICO/PIDICON/g' {} +

# Replace pidico → pidicon (lowercase)
find . -type f \( -name "*.js" -o -name "*.vue" -o -name "*.json" -o -name "*.md" -o -name "*.html" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/pidico/pidicon/g' {} +
```

### Step 2: Update pixoo-daemon References

```bash
# Find all pixoo-daemon references (excluding node_modules)
grep -r "pixoo-daemon" --include="*.js" --include="*.vue" --include="*.json" --include="*.md" . \
  --exclude-dir=node_modules

# Replace pixoo-daemon → pidicon
find . -type f \( -name "*.js" -o -name "*.vue" -o -name "*.json" -o -name "*.md" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/pixoo-daemon/pidicon/g' {} +
```

### Step 3: Rename Local Folder

```bash
cd /Users/markus/Code
mv pixoo-daemon pidicon
cd pidicon
```

### Step 4: Update Git Remote (After GitHub Rename)

```bash
# On GitHub: Settings → General → Rename repository (pixoo-daemon → pidicon)
# Then locally:
git remote set-url origin git@github.com:markus-barta/pidicon.git
```

### Step 5: Verify & Test

```bash
npm test
npm run lint
grep -r "pidico" . --exclude-dir=node_modules  # Should return 0 results
grep -r "PIDICO" . --exclude-dir=node_modules  # Should return 0 results
```

---

## 🔄 Backward Compatibility

### Environment Variables Priority

```javascript
// In lib/device-adapter.js
const targets =
  process.env.PIDICON_DEVICE_TARGETS || // New name
  process.env.PIDICO_DEVICE_TARGETS || // Fallback (deprecate in v4.0)
  process.env.PIXOO_DEVICE_TARGETS || // Legacy (keep forever)
  '';
```

### Migration Notice for Users

Add to README.md:

```markdown
## ⚠️ Migrating from PIDICO v3.0

PIDICO has been renamed to **PIDICON** as of v3.1 for international branding.

**Action Required**:

1. Rename environment variables: `PIDICO_*` → `PIDICON_*`
2. Update any scripts/configs referencing "PIDICO"
3. Old `PIDICO_*` vars still work but are deprecated

**No changes needed if using**:

- `PIXOO_*` environment variables (still supported)
- Web UI configuration (automatically migrated)
```

---

## 📊 Impact Analysis

### Zero Breaking Changes

- ✅ `PIXOO_*` env vars continue working
- ✅ `PIDICO_*` env vars continue working (with deprecation)
- ✅ Web UI config file format unchanged
- ✅ MQTT commands unchanged
- ✅ Scene files unchanged
- ✅ API endpoints unchanged

### User Action Optional

- Users can continue using existing env vars
- PIDICON is the new recommended name
- Migration to PIDICON\_\* vars recommended but not required

---

## 🎯 Completion Criteria

- [ ] All code references updated
- [ ] All documentation updated
- [ ] Folder renamed
- [ ] GitHub repo renamed
- [ ] Git remote updated
- [ ] CI/CD passing
- [ ] Version bumped to 3.1.0
- [ ] Migration notice added to README
- [ ] CHANGELOG updated

---

**Est. Time**: 30-45 minutes  
**Risk Level**: Low (backward compatible)  
**Rollback Plan**: Git revert + folder rename
