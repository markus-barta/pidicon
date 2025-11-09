# Repository Structure Analysis

**Date:** 2025-11-09  
**Project:** PIDICON v3.2.1  
**Analysis:** Non-BMAD compliant or redundant items

---

## 🎯 Overall Assessment

**Current Status:** Mostly clean, but has some legacy items and unusual structures

---

## Issues Found

### 🔴 **CRITICAL: Broken Directory**

**`--version/`**

- Location: Root level
- Contains: Husky hooks with strange naming
- Issue: Invalid directory name (starts with `--`)
- **Action:** DELETE (appears to be corrupted husky installation)

```bash
# Contains files like:
--version/_/applypatch-msg
--version/_/commit-msg
--version/_/husky.sh
```

**This is a broken/corrupted directory that should not exist.**

---

### 🟡 **Legacy/Redundant Items**

#### 1. **`.deployment` file**

- Location: Root level
- Contains: Old deployment metadata (from Aug 2025)
- Status: Superseded by `version.json`
- **Action:** DELETE (outdated)

#### 2. **`.devenv` directory**

- Location: Root level
- Contains: Nix devenv cache and state
- Size: Multiple database files, profile links
- Status: Development environment cache
- **Action:** KEEP but add to `.gitignore` if not already

#### 3. **`test-dashboard-figma/` directory**

- Location: Root level
- Contains: Separate Vite project for test dashboard
- Status: Development tool
- **Question:** Is this still used? If not, delete.

#### 4. **`tools/` directory**

- Location: Root level
- Status: Empty or minimal content
- **Action:** DELETE if empty, otherwise consolidate into `scripts/`

#### 5. **`test-results/` directory**

- Location: Root level
- Contains: Playwright test results
- Status: Should be in `.gitignore`
- **Action:** Verify in `.gitignore`, contents are temporary

#### 6. **`coverage/` directory**

- Location: Root level
- Contains: Test coverage reports
- Status: Should be in `.gitignore`
- **Action:** Verify in `.gitignore`, contents are temporary

#### 7. **`playwright-report/` directory**

- Location: Root level
- Contains: Playwright HTML reports
- Status: Should be in `.gitignore`
- **Action:** Verify in `.gitignore`, contents are temporary

---

### 🟢 **Documentation Items (Keep)**

#### Root Level Documentation Files

| File        | Status                    | Action              |
| ----------- | ------------------------- | ------------------- |
| `README.md` | ✅ Main project README    | KEEP                |
| `DEBUG.md`  | ✅ Production debug guide | KEEP (very useful!) |
| `LICENSE`   | ✅ Legal requirement      | KEEP                |

#### Subdirectory READMEs

| Location            | Purpose               | Action  |
| ------------------- | --------------------- | ------- |
| `docs/README.md`    | Docs index            | ✅ KEEP |
| `lib/README.md`     | Library documentation | ✅ KEEP |
| `scenes/README.md`  | Scene development     | ✅ KEEP |
| `scripts/README.md` | Scripts documentation | ✅ KEEP |
| `test/README.md`    | Test documentation    | ✅ KEEP |
| `config/README.md`  | Config documentation  | ✅ KEEP |

**All subdirectory READMEs are appropriate and useful.**

---

### 🟣 **BMAD Structure**

#### Current BMAD Setup

```
bmad/                           ✅ BMAD rules (2.5 MB)
├── _cfg/                       ✅ Agent/workflow configs
├── bmm/                        ✅ BMM module
│   ├── agents/                 ✅ 8 agent files
│   ├── workflows/              ✅ 147 workflow files
│   ├── config.yaml             ✅ BMM config
│   └── docs/                   ✅ BMAD documentation
├── core/                       ✅ Core module
│   ├── agents/                 ✅ Core agents
│   ├── tasks/                  ✅ Core tasks
│   ├── workflows/              ✅ Core workflows
│   └── config.yaml             ✅ Core config
└── docs/                       ✅ BMAD instructions

docs/bmad/                      ✅ Project BMAD docs (600 KB)
├── epics/                      ✅ 5 epic files
├── stories/                    ✅ 5 story files
├── guides/                     ✅ 11 developer guides
├── PRD.md                      ✅ Product requirements
├── ARCHITECTURE.md             ✅ Technical architecture
└── sprint-status.yaml          ✅ Sprint tracking
```

**Status:** ✅ **Perfect BMAD structure!** Both `bmad/` (rules) and `docs/bmad/` (project docs) are well-organized.

**Duplicate Configs:**

- `bmad/core/config.yaml` ✅ (Core BMAD config)
- `bmad/bmm/config.yaml` ✅ (BMM module config)
- These are NOT duplicates - they're module-specific configs (correct!)

---

### 📁 **Project Structure Assessment**

#### ✅ **Well-Organized Directories**

| Directory   | Purpose                              | Status   |
| ----------- | ------------------------------------ | -------- |
| `lib/`      | Core library code                    | ✅ Clean |
| `scenes/`   | Scene implementations                | ✅ Clean |
| `web/`      | Web UI (frontend/backend)            | ✅ Clean |
| `scripts/`  | Utility scripts                      | ✅ Clean |
| `test/`     | Test suites                          | ✅ Clean |
| `ui-tests/` | Playwright E2E tests                 | ✅ Clean |
| `config/`   | Configuration examples               | ✅ Clean |
| `data/`     | Runtime data (secrets, test results) | ✅ Clean |
| `.github/`  | CI/CD workflows                      | ✅ Clean |
| `.cursor/`  | Cursor rules/commands                | ✅ Clean |
| `.husky/`   | Git hooks                            | ✅ Clean |

---

## 🎯 Recommendations

### Priority 1: DELETE (Critical)

```bash
# Delete broken directory
rm -rf --version/

# Delete legacy deployment file
rm .deployment
```

### Priority 2: VERIFY (Check .gitignore)

Ensure these are in `.gitignore`:

- `coverage/`
- `test-results/`
- `playwright-report/`
- `.devenv/`
- `node_modules/`

### Priority 3: EVALUATE (Conditional)

**Ask yourself:**

1. **`test-dashboard-figma/`** - Still used? If not, delete.
2. **`tools/`** - Empty? If so, delete. If has content, move to `scripts/`.
3. **`.devenv*` files** - Using Nix devenv? If not, delete:
   - `.devenv/`
   - `.devenv.flake.nix`
   - `devenv.lock`
   - `devenv.nix`
   - `devenv.nix~`
   - `devenv.yaml`
   - `.direnv`
   - `.envrc`
   - `.envrc~`
   - `flake.lock`
   - `flake.nix`
   - `flake.nix~`

---

## ✅ What's Already Perfect

1. **`docs/bmad/`** - Clean BMAD project documentation
2. **`bmad/`** - Well-organized BMAD rules
3. **Core directories** - All properly organized
4. **READMEs** - Appropriately placed
5. **`DEBUG.md`** - Excellent production debug guide (keep!)

---

## 📊 Summary

### Files to Delete: 2

- `--version/` (broken directory)
- `.deployment` (legacy file)

### Files to Evaluate: 10+

- Nix devenv files (if not using Nix)
- `test-dashboard-figma/` (if not used)
- `tools/` (if empty)

### Files to Keep: Everything else

**Overall:** 🎉 **Repository is in excellent shape!** Only 1-2 critical issues (broken directory, legacy file).

---

## 🔧 Quick Cleanup Commands

```bash
# Critical cleanup
rm -rf --version/
rm .deployment

# Optional: If not using Nix devenv
rm -rf .devenv/ .direnv/
rm .devenv.flake.nix devenv.lock devenv.nix devenv.nix~ devenv.yaml
rm .envrc .envrc~ flake.lock flake.nix flake.nix~

# Optional: If test-dashboard-figma is unused
rm -rf test-dashboard-figma/

# Optional: If tools/ is empty
rmdir tools/
```

---

**Analysis Complete!**
**Status:** Repository is 95% clean, only minor legacy items to remove.
