# Development Standards

## Quick Reference for PIDICON Development

**Last Updated**: 2025-10-31  
**Status**: Active

---

## 🎯 Core Philosophy

**Pragmatism over Dogma**: Standards are guidelines for quality and consistency, not rigid rules.
The goal is a robust, maintainable system that delivers value.

> "Write code that is clear, maintainable, and testable. Optimize for the next developer (probably you in 6 months)."

---

## 📚 Documentation Structure

This is a **quick reference guide**. For comprehensive details, see:

- **[CODE_QUALITY.md](./CODE_QUALITY.md)** - Comprehensive code quality standards
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design patterns
- **[SCENE_DEVELOPMENT.md](./SCENE_DEVELOPMENT.md)** - Scene development guide
- **[TESTING.md](./TESTING.md)** - Testing strategy and protocols
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment workflows
- **[VERSIONING.md](./VERSIONING.md)** - Version management

---

## ✅ Pre-Commit Checklist

Before committing, verify:

- [ ] **Zero lint errors**: Run `npm run lint:fix`
- [ ] **Zero markdown errors**: Run `npm run md:fix`
- [ ] **Tests pass**: Run `npm test`
- [ ] **No magic numbers**: Extracted to named constants
- [ ] **Functions < 50 lines**: Break down complex functions
- [ ] **JSDoc on public APIs**: Document all `/lib` and `/scenes` exports
- [ ] **README updates**: Update docs if behavior changed

---

## 💎 Code Quality Essentials

### **The Big Five**

1. **No Magic Numbers** - Always use named constants
2. **Small Functions** - Max 50 lines, complexity < 10
3. **Fail Fast** - Validate early with guard clauses
4. **Pure Functions** - Prefer functions without side effects
5. **Structured Logging** - Use `lib/logger.js` with appropriate levels

### **Naming Conventions**

| Type      | Convention             | Example            |
| --------- | ---------------------- | ------------------ |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`  |
| Variables | `camelCase`            | `deviceCount`      |
| Functions | `verbNoun`             | `getUserData()`    |
| Classes   | `PascalCase`           | `DeviceManager`    |
| Private   | `_prefixed`            | `_validateInput()` |
| Boolean   | `is/has/can` prefix    | `isActive`         |

### **Configuration Pattern**

```javascript
const SCENE_CONFIG = Object.freeze({
  DISPLAY: {
    WIDTH: 64,
    HEIGHT: 64,
    CENTER_X: 32,
    CENTER_Y: 32,
  },
  TIMING: {
    FRAME_INTERVAL_MS: 200,
    MAX_FRAMES: 100,
  },
});
```

**👉 See [CODE_QUALITY.md](./CODE_QUALITY.md) for comprehensive guidelines.**

---

## 📝 Documentation Requirements

### **JSDoc**

Required for all public functions in `/lib` and `/scenes`:

```javascript
/**
 * Renders a scene frame to the device
 * @param {Object} ctx - Scene context with device and state
 * @param {string} ctx.deviceId - Target device identifier
 * @returns {number|null} Delay in ms or null when complete
 * @author Markus Barta (mba) with assistance from Cursor AI
 */
async function render(ctx) {
  // ...
}
```

### **README Files**

Every major directory (`/lib`, `/scenes`, `/docs`) must have a README explaining:

- Purpose and responsibility
- Key components
- Usage examples

---

## 🧪 Testing Strategy

### **Coverage Targets**

- **Critical paths**: 100% coverage
- **New code**: 80%+ coverage
- **Legacy code**: Improve gradually

### **Testing Pyramid**

1. **Unit Tests** (foundation) - Fast, isolated
2. **Integration Tests** - Module interactions
3. **E2E Tests** - Visual validation (manual or automated)

### **Local Testing**

```bash
# Preferred: Mock driver (fast, no conflicts)
PIXOO_DEFAULT_DRIVER=mock node daemon.js

# Real device: Get user permission first
PIXOO_DEFAULT_DRIVER=real node daemon.js
```

**👉 See [TESTING.md](./TESTING.md) for complete testing protocols.**

---

## 📝 Commit Guidelines

**Format**: `type(scope): description`

**Common Types**:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `refactor` - Code restructuring
- `test` - Tests
- `chore` - Build, deps, tooling

**Examples**:

```text
feat(scenes): add weather display scene
fix(mqtt): handle connection timeout gracefully
docs(api): update scene development guide
```

---

## 🐟 Shell Standards

### **Interactive Development**

- **Preferred**: `fish` shell for local development
- **Fallback**: `bash` if `fish` adds complexity

### **Scripts & CI**

- **Required**: `#!/usr/bin/env bash` shebang
- **Portability**: POSIX-compliant for server (NixOS) compatibility
- **Location**: Place in `/scripts` directory

---

## 🎨 Scene Development Quick Start

### **Scene Contract**

Scenes must export:

```javascript
module.exports = {
  name: 'my_scene', // Required
  description: 'Scene description', // Recommended
  category: 'Custom', // Recommended
  wantsLoop: true, // true = animated, false = static

  async render(ctx) {
    const { device } = ctx;
    // Draw frame
    await device.push('my_scene', ctx.publishOk);
    return 1000; // Return delay in ms, or null to finish
  },
};
```

### **Key Rules**

1. **Always call** `await device.push()` to display changes
2. **Return number** for next frame delay, or **null** when complete
3. **Use `wantsLoop: true`** for animated scenes
4. **No timers or MQTT** in scenes - scheduler handles timing

**👉 See [SCENE_DEVELOPMENT.md](./SCENE_DEVELOPMENT.md) for complete guide.**

---

## 🚀 Deployment References

When mentioning deployments, **always include**:

1. **Git commit hash** (7 chars)
2. **Build number** (git commit count)

**Example**:

```text
Deployed commit `abc1234` (Build #650). Watchtower will pull shortly.
```

**Get build number**:

```bash
git rev-list --count HEAD
```

**👉 See [DEPLOYMENT.md](./DEPLOYMENT.md) and [VERSIONING.md](./VERSIONING.md) for details.**

---

## 🔧 Error Handling

### **The Three Rules**

1. **Fail Fast**: Validate inputs early with guard clauses
2. **Specific Errors**: Use custom error types (`ValidationError`, `DeviceError`)
3. **Actionable Messages**: Include what failed, why, and how to fix

**Example**:

```javascript
function processDevice(deviceId) {
  // Guard clause: fail fast
  if (!deviceId) {
    throw new ValidationError('Device ID is required for processing');
  }

  // Business logic
  // ...
}
```

**👉 See [CODE_QUALITY.md](./CODE_QUALITY.md#error-handling) for patterns.**

---

## 📦 Backlog Management

### **Single Source of Truth**

- **Active Tasks**: `docs/backlog/in-progress/`
- **Planned**: `docs/backlog/planned/`
- **Completed**: `docs/backlog/completed/`
- **Overview**: `docs/backlog/README.md`

### **When Testing**

Always record in backlog:

- Exact `buildNumber` and `gitCommit`
- Test results
- Timestamp

**👉 See [BACKLOG_MANAGEMENT.md](./BACKLOG_MANAGEMENT.md) for workflows.**

---

## 🤖 Cursor AI Rules

### **Official Location**

**✅ USE**: `.cursor/rules/*.mdc` (YAML frontmatter + Markdown)  
**❌ NEVER**: `.cursorrules` at project root

### **Current Rules**

- **`.cursor/rules/pidicon.mdc`** - Main project rules

Pre-commit hook validates structure automatically.

---

## 📊 Performance Guidelines

### **Data Structures**

- **`Map`** - For key-value lookups (O(1))
- **`Set`** - For unique values (O(1))
- **`Array`** - For ordered data

### **Optimization Strategy**

1. **Measure first**: Use profiling to identify bottlenecks
2. **Batch operations**: Minimize device communication overhead
3. **Cache wisely**: Balance memory vs. computation

**👉 See [CODE_QUALITY.md](./CODE_QUALITY.md#performance) for details.**

---

## 🎓 Summary

**The Five Commandments**:

1. **No magic numbers** - Use named constants
2. **Keep functions small** - Max 50 lines
3. **Fail fast** - Validate early
4. **Test thoroughly** - 80%+ coverage for new code
5. **Document well** - JSDoc for all public APIs

**When in doubt**: Prefer simplicity over cleverness, clarity over brevity, and maintainability over
performance (until proven otherwise).

---

## 📚 Related Documentation

### **Essential Reading**

- **[CODE_QUALITY.md](./CODE_QUALITY.md)** - ⭐ Comprehensive code standards (must-read)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design patterns
- **[SCENE_DEVELOPMENT.md](./SCENE_DEVELOPMENT.md)** - Scene development guide

### **Workflow Guides**

- **[TESTING.md](./TESTING.md)** - Testing protocols and strategies
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment workflows
- **[VERSIONING.md](./VERSIONING.md)** - Version management
- **[BACKLOG_MANAGEMENT.md](./BACKLOG_MANAGEMENT.md)** - Task tracking

### **Index**

- **[docs/README.md](../README.md)** - Complete documentation index

---

**Status**: ✅ Active and enforced via ESLint, pre-commit hooks, and code review  
**Enforcement**: Automated via `npm run lint`, `npm run md:fix`, `npm test`
