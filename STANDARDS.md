# Development Guide: Professional Engineering Standards

## 🎯 Mission Statement

This guide establishes the professional engineering standards for the Pixoo
Daemon project, fostering a high-quality, maintainable, and performant
codebase.

## ⭐ Guiding Principle: Pragmatism over Dogma

Standards are guidelines, not immutable laws. The ultimate goal is a robust and
maintainable system. Always favor clarity, simplicity, and pragmatism.

---

## 📋 Table of Contents

- [🧹 Code & Documentation](#code--documentation)
- [🧪 Testing & Performance](#testing--performance)
- [🚨 Error Handling & Security](#error-handling--security)
- [📝 Formatting & Commits](#formatting--commits)
- [🔧 Tooling & Checklists](#tooling--checklists)
- [🐟 Shell Standards](#shell-standards)

---

## 🧹 Code & Documentation {#code-documentation}

### **Code Quality**

- **DRY (Don't Repeat Yourself)**: Abstract repeated logic into shared
  utilities in `/lib`. Avoid duplication.
- **SOLID Principles**: Adhere to Single Responsibility, Open/Closed, Liskov
  Substitution, Interface Segregation, and Dependency Inversion.
- **Best Practices**: Use descriptive names, aim for small functions (<50
  lines), and write comments that explain _why_, not _what_.

### **Documentation**

- **JSDoc**: Document all public functions and classes. Explain the _purpose_
  and _intent_ of the code. The `@author` tag should credit both the human
  developer and any AI assistance. The recommended format is:
  `[Developer Name] ([developer initials]) with assistance from [AI Tool Name] ([Currently selected AI Model])`
  (e.g., `mba (Markus Barta) with assistance from Cursor AI`).
- **READMEs**: Every major directory (`/lib`, `/scenes`) must have a `README.md`
  explaining its purpose and architecture.

---

## 🧪 Testing & Performance {#testing--performance}

### **Testing Strategy**

- **Philosophy**: Build confidence and prevent regressions. Prioritize tests for
  critical paths and complex logic.
- **Pyramid**: Use fast, isolated **Unit Tests** for the foundation,
  **Integration Tests** to verify module interactions, and **Manual/E2E Tests**
  for visual validation.

### **Performance**

- **Data Structures**: Use the right tool for the job (`Map`, `Set`, `Array`).
- **Batching**: Minimize device communication overhead by batching operations.
- **Profiling**: Identify bottlenecks with profiling tools before optimizing.

---

## 🚨 Error Handling & Security {#error-handling--security}

### **Error Handling & Logging**

- **Fail Fast**: Validate inputs and state early. Use specific error types
  (`ValidationError`, `DeviceError`).
- **Structured Logging**: Use the `lib/logger.js` wrapper with appropriate
  levels (`error`, `warn`, `ok`, `info`, `debug`) and always include a
  metadata object for context.

### **Security**

- **Input Validation**: Never trust external inputs. Validate all data from MQTT.
- **Dependencies**: Keep dependencies updated and scan for vulnerabilities.
- **Error Messages**: Do not leak sensitive information in external-facing
  errors.

---

## 📝 Formatting & Commits {#formatting--commits}

### **Markdown & Linting**

- **Zero Errors Policy**: All `.md` and `.js` files must have **zero linting
  errors**.
- **Auto-Fixing**: Run `npm run lint:fix` and `npx markdownlint --fix .` before
  committing.
- **Key Rules**: Target 80-char line length (max 120), add blank lines around
  headings/lists, and specify the language for code blocks.

### **Commit Guidelines**

- **Conventional Commits**: Follow the `type(scope): description` format.
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

---

## 🔧 Tooling & Checklists {#tooling--checklists}

### **Scene Development & Shell Standards**

- **Scene Interface**: Scenes must export `name`, `render`, and `wantsLoop`.
  `init` and `cleanup` are recommended for consistency.
  `render` must return a `number` delay in milliseconds for the central
  scheduler, or a non-number (e.g., `null`) to signal completion.
  **Always** call `await device.push()` to display changes, but minimize its
  use as it is a time-intensive operation.
- **Shell Scripts**: Server-side scripts **must** use `#!/usr/bin/env bash` for
  portability. Use `fish` syntax for local development.
- **Testing Locally**: Local testing is encouraged, but be mindful that the device
  may also be accessed by the server or other users on the local network. Whenever
  possible, use the "mock" driver to avoid conflicts with the physical device. If
  testing on the real device is necessary, always obtain permission from the user
  before proceeding.

### **Live Server Testing Protocol**

- **Deploy & Confirm**: After pushing changes, ask the user to confirm when
  Watchtower has deployed the new build and the daemon has restarted.
- **Single Check**: Once the user confirms, perform a single check of the scene
  state topic (default: `/home/pixoo/<ip>/scene/state`, configurable via
  `SCENE_STATE_TOPIC_BASE`) to verify `buildNumber` and `gitCommit` match the
  local build/commit. If they do not match, stop and notify the user.
- **Run Tests**: If the build matches, proceed with live tests.
- **Traceability**: Record the confirmed `buildNumber`, `gitCommit`, and
  timestamp in the backlog test table when executing live tests. Update the
  relevant row(s) in `docs/BACKLOG.md` with these values.

---

## ✅ Developer Checklists {#developer-checklists}

### **Before Committing**

- [ ] **Plan & Validate**: Have you planned the work and tested it locally?
- [ ] **Quality & Docs**: Is the code clean, DRY, and well-documented? Have you
      updated relevant READMEs?
- [ ] **Standards & Linters**: Does it follow all project standards? Have you
      run the linters and fixed all issues?

### **Backlog Hygiene**

- **Single Source of Truth**: The backlog in `docs/BACKLOG.md` is authoritative
  and must be kept up to date at all times.
- **Structure**: Maintain the summary table (ID, TODO, State, Test Name, Last
  Test Result, Last Test Run) and detailed sections per ID.
- **Traceability**: Update the backlog when tasks start, when tests are run, and
  when results are known.
- **Add New Items**: If new issues or requirements are discovered during work or
  testing, create a new backlog ID immediately (e.g., BUG-011, GATE-012) and
  record the context. Keep the backlog comprehensive and current.
- **Build Reference Required**: Every test entry MUST include the exact
  `buildNumber` (and preferably `gitCommit`) that the test ran against.

#### **Code Review**

- [ ] Does the code solve the problem effectively?
- [ ] Is the architecture sound and the code readable?
- [ ] Is testing coverage adequate and does documentation reflect the changes?

---

## 🐟 Shell Standards {#shell-standards}

- **Command Line Usage**: For local or server-side shell commands, prefer the use
  of `fish` shell syntax (e.g., `set -x VAR value`) whenever practical.
  If `fish` syntax introduces unnecessary complexity or reduces clarity,
  default to standard `bash` syntax.
- **Scripts & Hooks**: All scripts intended for the server (NixOS) or for Git
  hooks **must** use `#!/usr/bin/env bash` and be written in POSIX-compliant
  shell script to ensure maximum portability.
