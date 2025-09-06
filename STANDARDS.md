# Development Guide: Professional Engineering Standards

## 🎯 Mission Statement

This guide establishes the professional engineering standards for the Pixoo Daemon
project. Its purpose is to foster a high-quality, maintainable, and performant
codebase through senior-level practices.

## ⭐ Guiding Principle: Pragmatism over Dogma

A senior engineer understands that standards are guidelines, not immutable laws.
The ultimate goal is to create a robust and maintainable system. Always favor
clarity, simplicity, and pragmatism. If a rule stands in the way of a better
solution, be prepared to challenge it, but do so with a clear justification.

---

## 📋 Table of Contents

- [🧹 Code Quality](#-code-quality)
- [📚 Documentation](#-documentation)
- [🧪 Testing Strategy](#-testing-strategy)
- [⚡ Performance](#-performance)
- [🚨 Error Handling & Logging](#-error-handling--logging)
- [🔒 Security](#-security)
- [📝 Markdown Formatting](#-markdown-formatting)
- [📊 Commit Guidelines](#-commit-guidelines)
- [🎬 Scene Development](#-scene-development)
- [🐟 Fish Shell Standards](#-fish-shell-standards)
- [🔧 Linting Standards](#-linting-standards)
- [✅ Developer Checklists](#-developer-checklists)

---

## 🧹 Code Quality {#-code-quality}

### **DRY (Don't Repeat Yourself)**

- **Goal**: Maximize reusability and reduce the cost of change.
- **Action**: Abstract repeated logic into shared utilities (`/lib`). Avoid
  duplication across scenes and modules. Use configuration objects over
  hardcoded values.

### **SOLID Principles**

- **Single Responsibility**: A function or module should do one thing well.
- **Open/Closed**: Extend behavior with new code, don't modify existing, stable
  code.
- **Liskov Substitution**: Subtypes must be substitutable for their base types.
- **Interface Segregation**: Keep interfaces small and focused on a specific role.
- **Dependency Inversion**: Depend on abstractions (like a `logger` interface),
  not on concrete implementations.

### **General Best Practices**

- **Naming**: Names should be descriptive and reveal intent (e.g.,
  `calculatePerformanceMetrics` is better than `calc`).
- **Function Size**: Aim for small, focused functions (under 50 lines is a good
  guideline). If a function is long, it's often a sign it's doing too much.
- **Comments**: Write comments to explain _why_ something is done, not _what_ it
  does. The code itself should explain the "what".

---

## 📚 Documentation {#-documentation}

### **JSDoc**

Document all public functions, classes, and complex logic. The goal is to provide
enough context for another developer to use the code without having to read its
implementation.

```javascript
/**
 * Calculates the optimal interpolation factor for a color gradient.
 * This function uses a non-linear easing curve to ensure a smoother
 * visual transition at the color endpoints.
 *
 * @param {number} factor - The linear interpolation factor (0.0 to 1.0).
 * @returns {number} The eased interpolation factor.
 */
function getEasedFactor(factor) {
  // ... implementation ...
}
```

### **README Files**

Every major directory (`/lib`, `/scenes`) must have a `README.md` that explains
its purpose, architecture, and how to use its contents.

---

## 🧪 Testing Strategy {#-testing-strategy}

### **Philosophy**

Our goal with testing is to build confidence that our system works as expected
and to prevent regressions. We prioritize tests that cover critical paths and
complex business logic.

### **Testing Pyramid**

- **Unit Tests**: The foundation. Test individual functions and modules in
  isolation. They should be fast and focused. We use the built-in `node:test`
  runner.
- **Integration Tests**: Test how different modules interact. For example, verify
  that the `SceneManager` can correctly load and transition between scenes.
- **Manual/E2E Tests**: Use for verifying visual output and device-specific
  behavior that is difficult to automate.

---

## ⚡ Performance {#-performance}

- **Data Structures**: Use the right tool for the job. `Map` for key-value pairs,
  `Set` for unique collections, `Array` for ordered lists.
- **Batching**: Minimize overhead by batching operations, especially when
  communicating with the device.
- **Profiling**: Don't guess. Use profiling tools to identify bottlenecks before
  attempting to optimize.

---

## 🚨 Error Handling & Logging {#-error-handling--logging}

### **Error Handling**

- **Fail Fast**: Validate inputs and state early to catch errors at their source.
- **Custom Error Types**: Use specific error types (`ValidationError`,
  `DeviceError`) to provide more context than generic `Error` objects.
- **Graceful Degradation**: When an operation can fail, have a fallback. For
  example, if an advanced chart fails to render, fall back to a simpler one.

### **Logging**

We use a structured logger (`lib/logger.js`).

- **Levels**: Use the appropriate log level:
  - `error`: For failures that require immediate attention.
  - `warn`: For unexpected but recoverable issues.
  - `info`: For normal operational messages.
  - `debug`: For detailed diagnostic information.
- **Context**: Always include a metadata object with relevant context (e.g.,
  `deviceIp`, `sceneName`, `error`). This makes logs searchable and useful.

---

## 🔒 Security {#-security}

- **Input Validation**: Never trust external inputs. Validate all data received
  from MQTT messages, including type, bounds, and format.
- **Dependencies**: Keep dependencies up-to-date and periodically scan for
  vulnerabilities.
- **Error Messages**: Be careful not to leak sensitive information (like internal
  stack traces) in error messages that are exposed externally.

---

## 📝 Markdown Formatting {#-markdown-formatting}

All `.md` files must have **zero linting errors**. Run `npx markdownlint --fix .`
before committing. The most critical rules are:

- **MD013 (Line Length)**: Target 80 characters for readability, with a hard max
  of 120.
- **MD022/MD032 (Spacing)**: Surround headings and lists with blank lines.
- **MD040 (Code Blocks)**: Always specify the language for syntax highlighting.

---

## 📊 Commit Guidelines {#-commit-guidelines}

We follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification.

- **Format**: `type(scope): description` (e.g., `feat(scenes): add new clock scene`)
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

---

## 🎬 Scene Development {#-scene-development}

- **Interface**: A scene must export `name` (string) and `render` (async
  function). `init` and `cleanup` are optional.
- **`device.push()`**: You **must** call `await device.push()` after drawing to
  make your changes visible on the device.
- **State**: Use the `ctx.state` Map for managing scene-specific data.

---

## 🐟 Fish Shell Standards {#-fish-shell-standards}

- **Local Development**: Use `fish` syntax (`set -x VAR value`).
- **Scripts/Hooks**: All scripts intended for the server or Git hooks **must**
  use `#!/usr/bin/env bash` and be written in POSIX-compliant shell script to
  ensure portability.

---

## 🔧 Linting Standards {#-linting-standards}

Linting rules are in place to catch common errors and enforce consistency.

### **ESLint**

Our configuration is tuned to be pragmatic:

- **Complexity**: Warns at 20, errors at 30.
- **Max Parameters**: Warns at 6.
- **Max Lines/Function**: Warns at 150.

**Refactor vs. Disable**: Always try to refactor code to comply with a rule.
Only disable a rule with an inline comment if the code is justifiably complex or
performance-critical.

### **Auto-Fixing**

Run `npm run lint:fix` and `npx markdownlint --fix .` to automatically fix most
common issues.

---

## ✅ Developer Checklists {#-developer-checklists}

### **Before Committing**

- [ ] Does the code work and is it tested?
- [ ] Is it well-documented with JSDoc and comments?
- [ ] Does it follow our error handling and logging standards?
- [ ] Are there any magic numbers or duplicated code?
- [ ] Have you run the linters and fixed all issues? (`npm run lint:fix`)

### **Code Review**

- [ ] Does the code solve the problem effectively and efficiently?
- [ ] Is the architecture sound and does it align with SOLID principles?
- [ ] Is the code readable, maintainable, and easy to understand?
- [ ] Is the test coverage adequate?
- [ ] Does the documentation reflect the changes?

---

## 📚 Resources

### **Recommended Reading**

- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
  by Robert C. Martin
- [The Pragmatic Programmer](https://www.amazon.com/Pragmatic-Programmer-journey-mastery-Anniversary/dp/0135957052)
  by Hunt & Thomas
- [JavaScript: The Good Parts](https://www.amazon.com/JavaScript-Good-Parts-Douglas-Crockford/dp/0596517742)
  by Douglas Crockford

### **Online Resources**

- [MDN Web Docs](https://developer.mozilla.org/) - JavaScript/Node.js reference
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [JavaScript Info](https://javascript.info/) - Modern JavaScript tutorial

### **Tools**

- [ESLint](https://eslint.org/) - Code linting
- [Prettier](https://prettier.io/) - Code formatting
- [JSDoc](https://jsdoc.app/) - Documentation generator
- [Markdownlint](https://github.com/DavidAnson/markdownlint)
  - Markdown linting

---

**Remember**: Quality is not an accident. It's the result of intelligent effort
and adherence to professional standards. Always strive to write code that your future
self will thank you for maintaining.

_Last updated: 2025-01-27_
_Authors: Sonic + Cursor + Markus Barta (mba)_
