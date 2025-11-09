# Final Repository Audit & Cleanup

**Date:** 2025-11-09  
**Scope:** Complete repository scan including ignore files  
**Status:** ✅ COMPREHENSIVE ANALYSIS

---

## 🔍 Ignore Files Analysis

### Files Examined:

1. `.gitignore` (56 lines)
2. `.cursorignore` (7 lines)
3. `.cursorindexignore` (7 lines)
4. `.dockerignore` (54 lines)
5. `.markdownlintignore` (29 lines)

---

## 📊 .gitignore Analysis

### ✅ Correct Exclusions:

```
node_modules/
.env
version.json (build artifact)
test-results/
coverage/
web/public/ (Vite build output)
web/frontend/dist/
config/devices.json (device-specific)
data/secrets/
data/test-results/*.json
.devenv*
.direnv
playwright-report/
```

### ⚠️ Issues Found:

#### 1. **Duplicate Entries**

```gitignore
# Line 34-42 (duplicates of 46-54)
.devenv*
devenv.local.nix
devenv.local.yaml
.direnv
.pre-commit-config.yaml
```

**Action:** Clean up duplicates

#### 2. **Obsolete Entries**

```gitignore
test-dashboard-figma/  # Already deleted!
legacy-code/           # Doesn't exist
other-code/            # Doesn't exist
ui-test-report/        # Doesn't exist
```

**Action:** Remove from .gitignore (already cleaned up)

#### 3. **Missing Entry**

```gitignore
ui.plan.md  # Line 1 - what is this?
```

**Action:** Verify if this file exists or remove

---

## 📊 .cursorignore & .cursorindexignore Analysis

### Current Content (Identical):

```
node_modules/
.env
web/public/
web/frontend/dist/
other-code/
```

### Issues:

1. **`other-code/`** - Doesn't exist, can be removed
2. **Missing important exclusions:**
   - `coverage/`
   - `test-results/`
   - `playwright-report/`
   - `.devenv/`
   - `.direnv/`
   - `data/secrets/`

**Why this matters:** Cursor indexes everything not excluded, wasting tokens on build artifacts and secrets!

---

## 📊 .markdownlintignore Analysis

### ⚠️ Critical Issues:

#### Lines 6-20: Excludes docs/bmad/ from markdown linting!

```markdownlintignore
# BMAD Method generated documentation (formatting not critical)
docs/bmad/
docs/bmad/**
bmad/
bmad/**
```

**Problem:** This was added when docs were messy. NOW that docs/bmad/ is clean and BMAD-compliant, we SHOULD lint it!

#### Obsolete Entries:

```markdownlintignore
docs/ai/          # Deleted
docs/legacy/      # Deleted
docs/guides/      # Deleted
docs/BACKLOG.md   # Deleted
docs/BACKLOG-TABLE.md  # Deleted
docs/BL_SCENE_MGR.md   # Deleted
docs/reports/SCENE_MANAGER_IMPLEMENTATION.md  # Deleted
```

---

## 🎯 Cleanup Recommendations

### Priority 1: .gitignore Cleanup

```gitignore
# Remove duplicate lines 34-54 (keep 46-54 version)
# Remove obsolete entries:
- test-dashboard-figma/
- legacy-code/
- other-code/
- ui-test-report/
- ui.plan.md (if doesn't exist)
```

### Priority 2: .cursorignore & .cursorindexignore Update

**Add missing exclusions:**

```
coverage/
test-results/
playwright-report/
.devenv/
.direnv/
data/secrets/
data/test-results/
```

**Remove obsolete:**

```
other-code/
```

### Priority 3: .markdownlintignore Cleanup

**ENABLE linting for docs/bmad/:**

```markdownlintignore
# Remove these lines:
docs/bmad/
docs/bmad/**
bmad/
bmad/**
```

**Remove obsolete entries:**

```
docs/ai/**
docs/legacy/**
docs/guides/**
docs/BACKLOG.md
docs/BACKLOG-TABLE.md
docs/BL_SCENE_MGR.md
docs/reports/SCENE_MANAGER_IMPLEMENTATION.md
```

**Keep important exclusions:**

```markdownlintignore
# Keep these (Cursor rules use special syntax)
.cursor/rules/
.cursor/rules/**

# Keep these (not critical)
LICENSE
COPYING
CHANGELOG
NOTICE
```

---

## 💡 Question: Temporary Un-ignore

**User asks:** "How do we provide a way to temporarily allow files that are Cursor ignored?"

### Answer: Multiple Approaches

#### 1. **Explicit File Reference** (Recommended)

Even if a file is in `.cursorignore`, you can explicitly reference it:

```
@/path/to/ignored/file.js
```

Cursor will load it despite being ignored.

#### 2. **Temporary Comment Out**

```bash
# In .cursorignore, temporarily comment out:
# coverage/

# Do your work, then uncomment:
coverage/
```

#### 3. **Use `.cursorignore_temp`**

Create a temporary ignore file pattern:

```bash
# Save current
cp .cursorignore .cursorignore.backup

# Edit .cursorignore to remove what you need

# When done, restore
mv .cursorignore.backup .cursorignore
```

#### 4. **Cursor Settings Override**

In `.cursor/settings.json`:

```json
{
  "cursor.ignoredPaths": [] // Temporarily disable all ignores
}
```

#### 5. **Best Practice: Use @mention**

The recommended approach is to @mention specific files:

```
@coverage/lcov-report/index.html
```

This works even if the file is ignored.

---

## 🔧 Proposed .gitignore (Clean Version)

```gitignore
# Dependencies
node_modules/

# Environment
.env

# Build artifacts
version.json
web/public/
web/frontend/dist/

# Test artifacts
test-results/
coverage/
playwright-report/
ui-test-report/
.nyc_output

# Device configuration (sensitive)
config/devices.json

# Secrets
data/secrets/

# Test data
data/test-results/*.json
data/test-registry.json

# Development environment (Nix/DevEnv)
.devenv/
.devenv*
devenv.local.nix
devenv.local.yaml
.direnv

# Development tools
.pre-commit-config.yaml

# OS files
.DS_Store
*.log
npm-debug.log*

# Editor files
*.swp
*.swo
*~
```

---

## 🔧 Proposed .cursorignore (Clean Version)

```
# Dependencies
node_modules/

# Environment
.env

# Build artifacts
web/public/
web/frontend/dist/

# Test artifacts (large, not useful for AI context)
coverage/
test-results/
playwright-report/

# Development environment cache (Nix/DevEnv)
.devenv/
.direnv/

# Secrets
data/secrets/

# Test data (auto-generated)
data/test-results/
```

---

## 🔧 Proposed .markdownlintignore (Clean Version)

```
# Cursor rules (use special syntax, don't lint)
.cursor/rules/
.cursor/rules/**

# License files (not markdown documents)
LICENSE
COPYING
CHANGELOG
NOTICE

# BMAD method rules (special syntax)
bmad/bmm/
bmad/bmm/**
bmad/core/
bmad/core/**

# NOTE: docs/bmad/ is NOT excluded - we want to lint our project docs!
```

---

## 📊 Files Analysis Summary

### .gitignore

- ✅ Generally good
- ⚠️ Has duplicates (lines 34-54)
- ⚠️ Has obsolete entries (4 items)
- 🔧 Needs cleanup

### .cursorignore / .cursorindexignore

- ⚠️ Missing critical exclusions (6 directories)
- ⚠️ Has obsolete entry (other-code/)
- 🔧 Needs significant updates

### .markdownlintignore

- 🔴 Excludes docs/bmad/ (our main docs!)
- ⚠️ Has 7 obsolete entries
- 🔧 Needs major cleanup

### .dockerignore

- ✅ Perfect, no changes needed

---

## 🎯 Execution Plan

### Step 1: Clean .gitignore

- Remove duplicates (lines 34-44)
- Remove obsolete entries (test-dashboard-figma, legacy-code, other-code, ui-test-report)
- Remove ui.plan.md (line 1) if doesn't exist

### Step 2: Update .cursorignore & .cursorindexignore

- Add missing exclusions (coverage/, test-results/, etc.)
- Remove obsolete entry (other-code/)
- Make both files identical (current best practice)

### Step 3: Clean .markdownlintignore

- **CRITICAL:** Remove docs/bmad/ exclusion
- Remove obsolete entries (7 deleted paths)
- Keep only necessary exclusions

### Step 4: Verify

- Run markdownlint on docs/bmad/
- Fix any markdown issues found
- Commit clean ignore files

---

## ✅ Expected Outcome

1. **Clean .gitignore** - No duplicates, no obsolete entries
2. **Proper .cursorignore** - Excludes build artifacts and secrets, saves tokens
3. **Fixed .markdownlintignore** - Lints docs/bmad/, removes obsolete entries
4. **Better AI context** - Cursor won't waste tokens on coverage/test-results
5. **Better documentation** - Markdown linting catches issues in docs/bmad/

---

**Ready to execute cleanup?**
