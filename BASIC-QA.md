# BASIC-QA Standards

## Overview

This document defines the essential quality assurance checklist for all code changes in the pixoo-daemon project.

## Pre-Change Checklist

### 1. Planning

- [ ] **Make a plan** if more than one task is involved
- [ ] Break down complex changes into smaller, manageable steps
- [ ] Identify dependencies and potential conflicts

### 2. Code Quality (DRY & Clean Code)

- [ ] **DRY Principle**: Don't Repeat Yourself - eliminate code duplication
- [ ] **Low hanging fruits**: Fix obvious issues like:
  - Unused variables
  - Redundant code
  - Inconsistent naming
  - Missing error handling
- [ ] **Single Responsibility**: Each function should do one thing well
- [ ] **Clear naming**: Variables and functions should be self-documenting

### 3. Documentation Integrity

- [ ] **Update PIXOO_COMMANDS.md** if MQTT commands change
- [ ] **Update README.md** if setup/usage changes
- [ ] **Update inline comments** for complex logic
- [ ] **Verify all examples** in documentation work

### 4. Linter Check

- [ ] **Run linter**: `npm run lint` or `npx eslint`
- [ ] **Fix all errors** (not just warnings)
- [ ] **Check complexity**: Functions should be < 30 complexity, < 150 lines
- [ ] **Check syntax**: `node -c filename.js`

### 5. Testing & Validation

- [ ] **Test the change** manually if possible
- [ ] **Run existing tests** if available
- [ ] **Verify edge cases** work correctly
- [ ] **Check for regressions** in related functionality

### 6. Commit & Sync

- [ ] **Use conventional commits**: `type: description`
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `refactor:` for code improvements
  - `test:` for tests
- [ ] **Commit only when confident** all tests pass
- [ ] **Sync with remote** repository

## Common Issues to Watch For

### Performance Test Specific

- [ ] **Frame counting**: Ensure it matches expected behavior
- [ ] **Chart wrapping**: Verify it wraps at correct pixel (63, not 64)
- [ ] **Line clearing**: Don't erase x-axis (use correct height)
- [ ] **Text labels**: Use uppercase consistently (FRAMES, AVG, LO, HI)

### General Code Issues

- [ ] **State access**: Use `state.get('key')` not `state.key` (Map objects)
- [ ] **Async/await**: Proper error handling in async functions
- [ ] **Memory leaks**: Clear timers and clean up resources
- [ ] **Error handling**: Don't let errors crash the daemon

### Documentation Issues

- [ ] **MQTT examples**: All examples should be valid JSON
- [ ] **Parameter descriptions**: Include all optional parameters
- [ ] **Version consistency**: Update version numbers when needed

## Quick Commands

```bash
# Syntax check
node -c scenes/filename.js

# Linter check
npx eslint scenes/filename.js

# Test build number accuracy
node test-build-number.js

# Commit with conventional format
git commit -m "fix: correct chart wrapping at x=63 instead of x=64"
```

## Quality Gates

**DO NOT COMMIT** if any of these fail:

- ❌ Linter errors
- ❌ Syntax errors
- ❌ Broken documentation examples
- ❌ Unused variables
- ❌ Missing error handling

**MUST PASS** before commit:

- ✅ All linter checks
- ✅ Syntax validation
- ✅ Documentation updated
- ✅ Manual testing completed
- ✅ Conventional commit message

---

_This document should be referenced for every code change to maintain project quality._
