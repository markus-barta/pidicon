# Development Standards

## Professional Engineering Guidelines for Pixoo Daemon

**Last Updated**: 2025-10-08  
**Status**: Active

---

## 🎯 Mission Statement

This guide establishes the professional engineering standards for the Pixoo
Daemon project, fostering a high-quality, maintainable, and performant
codebase.

---

## ⭐ Guiding Principle

**Pragmatism over Dogma**: Standards are guidelines, not immutable laws. The
ultimate goal is a robust and maintainable system. Always favor clarity,
simplicity, and pragmatism.

---

## 📋 Documentation Structure

This project follows a hierarchical documentation approach:

### **Quick Reference** (This File)

- Project-specific rules and workflows
- Testing protocols
- Commit guidelines
- Shell standards

### **Detailed Guides** (docs/)

- **[CODE_QUALITY.md](./docs/CODE_QUALITY.md)** - Modern best practices for
  senior developers
  - No magic numbers
  - Function design (complexity, parameters, purity)
  - Naming conventions
  - Error handling
  - Async/await patterns
  - Defensive programming
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design and patterns
- **[SCENE_DEVELOPMENT.md](./docs/SCENE_DEVELOPMENT.md)** - Scene development
  guide

---

## 📋 Table of Contents

- [Code Quality](#code-quality)
- [Documentation](#documentation)
- [Testing & Performance](#testing--performance)
- [Error Handling & Security](#error-handling--security)
- [Formatting & Commits](#formatting--commits)
- [Scene Development](#scene-development)
- [Testing Protocol](#testing-protocol)
- [Shell Standards](#shell-standards)
- [Developer Checklists](#developer-checklists)

---

## 💎 Code Quality

### **Core Standards**

- **No Magic Numbers**: Use named constants (see
  [CODE_QUALITY.md](./docs/CODE_QUALITY.md#no-magic-numbers))
- **DRY Principle**: Abstract repeated logic into `/lib` utilities
- **SOLID Principles**: Follow Single Responsibility, Open/Closed, Liskov
  Substitution, Interface Segregation, Dependency Inversion
- **Function Limits**:
  - Max 50 lines per function (error if exceeded)
  - Max 5 parameters (use options object for 5+)
  - Max cyclomatic complexity: 10
- **Immutability**: Use `Object.freeze()` for constants, spread operators for
  copies
- **Pure Functions**: Prefer functions without side effects

**👉 See [docs/CODE_QUALITY.md](./docs/CODE_QUALITY.md) for comprehensive
guidelines.**

### **Naming Conventions**

- **Constants**: `SCREAMING_SNAKE_CASE` with `Object.freeze()`
- **Variables**: `camelCase`
- **Functions**: `verbNoun` pattern (e.g., `getUserData`, `isValid`)
- **Classes**: `PascalCase`
- **Private**: Prefix with `_` (e.g., `_privateMethod`)
- **Boolean**: `is`, `has`, `can` prefix (e.g., `isActive`, `hasPermission`)

---

## 📚 Documentation

### **JSDoc Requirements**

- **Required**: All public functions and classes in `/lib` and `/scenes`
- **Include**: Purpose, parameters, return values, examples
- **Author Tag**: `[Name] ([initials]) with assistance from [AI Tool]`
  - Example: `Markus Barta (mba) with assistance from Cursor AI`

### **README Requirements**

- **Required**: Every major directory (`/lib`, `/scenes`, `/docs`)
- **Content**: Purpose, architecture, usage examples

---

## 🧪 Testing & Performance

### **Testing Strategy**

- **Philosophy**: Build confidence, prevent regressions
- **Pyramid**:
  - **Unit Tests**: Fast, isolated (foundation)
  - **Integration Tests**: Module interactions
  - **E2E/Manual**: Visual validation
- **Coverage**:
  - Critical paths: 100%
  - New code: 80%+
  - Legacy: Improve gradually

### **Performance**

- **Data Structures**: Use `Map` for lookups, `Set` for unique values, `Array`
  for ordered data
- **Batching**: Minimize device communication overhead
- **Profiling**: Identify bottlenecks before optimizing

---

## 🚨 Error Handling & Security

### **Error Handling**

- **Fail Fast**: Validate inputs early with guard clauses
- **Specific Errors**: Use custom error types (`ValidationError`,
  `DeviceError`)
- **Structured Logging**: Use `lib/logger.js` with levels (`error`, `warn`,
  `ok`, `info`, `debug`)
- **Actionable Messages**: Include context (what failed, why, how to fix)

### **Security**

- **Input Validation**: Never trust external inputs (MQTT, user input)
- **Dependencies**: Keep updated, scan for vulnerabilities
- **Error Messages**: Don't leak sensitive information

---

## 📝 Formatting & Commits

### **Linting**

- **Zero Errors Policy**: All `.md` and `.js` files must have zero lint errors
- **Auto-Fix**: Run `npm run lint:fix` before committing
- **Line Length**: Target 80 chars, max 120 chars

### **Markdown**

- **Languages**: Always specify language for code blocks
- **Blank Lines**: Around headings and lists
- **Auto-Fix**: Run `npm run md:fix` before committing

### **Commit Guidelines**

- **Format**: `type(scope): description`
- **Types**:
  - `feat`: New feature
  - `fix`: Bug fix
  - `docs`: Documentation
  - `style`: Formatting (no code change)
  - `refactor`: Code restructuring
  - `test`: Tests
  - `chore`: Build, deps, etc.
- **Examples**:
  - `feat(scenes): add weather display scene`
  - `fix(mqtt): handle connection timeout`
  - `docs: update deployment guide`

---

## 🎨 Scene Development

### **Scene Interface**

Scenes must export:

- **Required**: `name`, `render`, `wantsLoop`
- **Recommended**: `init`, `cleanup`

### **Render Contract**

- **Return**: Number (delay in ms) or non-number (`null`) to signal completion
- **Device Push**: Always call `await device.push()` to display changes
- **Minimize Pushes**: It's time-intensive, batch operations when possible

### **Configuration**

- **No Magic Numbers**: Use configuration objects (see
  [SCENE_DEVELOPMENT.md](./docs/SCENE_DEVELOPMENT.md#configurable-constants))
- **Example**:

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
  },
});
```

**👉 See [docs/SCENE_DEVELOPMENT.md](./docs/SCENE_DEVELOPMENT.md) for complete
guide.**

---

## 🧪 Testing Protocol

### **Local Testing**

- **Preferred**: Use `mock` driver to avoid conflicts
- **Real Device**: Get user permission first
- **Command**: `node daemon.js` with appropriate driver setting

### **Live Server Testing**

1. **Deploy**: Push changes, wait for Watchtower to deploy
2. **Confirm**: User confirms daemon restart
3. **Verify Build**: Check `/home/pixoo/<ip>/scene/state` topic for matching
   `buildNumber` and `gitCommit`
4. **Run Tests**: If build matches, proceed
5. **Traceability**: Record results in `docs/BACKLOG.md` with exact
   `buildNumber`, `gitCommit`, timestamp

### **Build Reference**

- **Required**: Every test entry MUST include exact `buildNumber` and
  `gitCommit`
- **Format**: `buildNumber: 447, gitCommit: 36d0981`

---

## 🐟 Shell Standards

### **Interactive Use**

- **Preferred**: `fish` shell syntax for local development
- **Fallback**: `bash` if `fish` adds complexity

### **Scripts & Hooks**

- **Required**: `#!/usr/bin/env bash` shebang
- **Portability**: POSIX-compliant for server (NixOS) compatibility
- **Location**: Place in `/scripts` directory

---

## ✅ Developer Checklists

### **Before Committing**

- [ ] Code follows [CODE_QUALITY.md](./docs/CODE_QUALITY.md) standards
- [ ] No magic numbers (extracted to named constants)
- [ ] Functions < 50 lines, complexity < 10
- [ ] All public functions have JSDoc
- [ ] Tests written/updated (80%+ coverage for new code)
- [ ] `npm run lint:fix` passes
- [ ] `npm run md:fix` passes
- [ ] `npm test` passes
- [ ] Documentation updated (READMEs, guides)

### **Code Review**

- [ ] Does code solve the problem effectively?
- [ ] Is architecture sound and code readable?
- [ ] Are there magic numbers? (should be constants)
- [ ] Is complexity manageable? (functions < 50 lines, complexity < 10)
- [ ] Is testing coverage adequate?
- [ ] Does documentation reflect changes?

### **Backlog Hygiene**

- **Single Source of Truth**: `docs/BACKLOG.md` is authoritative
- **Structure**: Maintain summary table (ID, TODO, State, Test Name, Result,
  Timestamp)
- **Traceability**: Update when tasks start, tests run, results known
- **New Items**: Create backlog ID immediately for new issues (e.g., BUG-011)
- **Build Reference**: Every test MUST include exact `buildNumber` and
  `gitCommit`

---

## 📚 Related Documentation

### **Core Standards**

- **[CODE_QUALITY.md](./docs/CODE_QUALITY.md)** - ⭐ Comprehensive code quality
  guide
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design patterns
- **[SCENE_DEVELOPMENT.md](./docs/SCENE_DEVELOPMENT.md)** - Scene development
  guide

### **Operations**

- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment pipeline & CI/CD
- **[VERSIONING.md](./docs/VERSIONING.md)** - Version management strategy

### **Project Management**

- **[BACKLOG.md](./docs/BACKLOG.md)** - Task tracking & test results

---

## 🤖 Cursor AI Rules

### Official Location

**✅ USE**: `.cursor/rules/*.mdc` (YAML frontmatter + Markdown)  
**❌ NEVER**: `.cursorrules` at project root

### Why This Matters

Cursor's built-in UI creates rules in `.cursor/rules/` when you use:

```text
Menu → New → Rule
```

This is the **official** Cursor location. Trust what the UI creates!

### Current Rules File

- **`.cursor/rules/pidicon.mdc`** - Main project rules (10 rules)

### Validation

Pre-commit hook validates `.cursor/rules/*.mdc` structure automatically.

See `.cursor/rules/README.md` for detailed documentation.

---

## 📦 Deployment References

When mentioning Watchtower deployment or build releases in commit messages,
documentation, or communication, **ALWAYS** include:

1. Git commit hash (short form, 7 characters)
2. Build number (= git commit count)

**Example**:

```text
Pushed to main in commit `abc1234` (Build #560). Watchtower will deploy shortly!
```

**How to get build number**:

```bash
git rev-list --count HEAD
```

This helps track which build to expect on the server and correlates with
deployment logs and Web UI build information.

---

## 🎓 Summary

Write code that is **clear, maintainable, and testable**:

1. **No magic numbers** - Use named constants
2. **Keep functions small** - Max 50 lines, complexity < 10
3. **Fail fast** - Validate early with guard clauses
4. **Test everything** - 80%+ coverage for new code
5. **Document well** - JSDoc for all public APIs

**When in doubt**: Prefer simplicity over cleverness, and optimize for the next
developer (probably you in 6 months).

---

**Status**: ✅ Active and enforced via ESLint, code review, and CI/CD  
**Last Updated**: 2025-10-08
