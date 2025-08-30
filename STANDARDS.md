# Development Guide - Senior Developer Best Practices

## 🎯 Mission Statement

This guide establishes professional development standards for the Pixoo daemon project.
It serves as a reference for maintaining high-quality, maintainable, and performant
code while following senior-level engineering practices.

## MOST IMPORTANT RULE

Keep the guide up to date but ALWAYS Ask the user if you change things
(CHANGE/ADD/DELETE) with a summarized question asking for a "yes/no" answer.

## 📋 Table of Contents

- [Code Quality Principles](#code-quality-principles)
- [Documentation Standards](#documentation-standards)
- [Testing Strategy](#testing-strategy)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)
- [Markdown Formatting](#markdown-formatting-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Fish-Aware Shell Standards](#fish-aware-shell-standards)
- [Linting Standards](#linting-standards)

---

## 🧹 Code Quality Principles {#code-quality-principles}

### **DRY (Don't Repeat Yourself)**

- **Extract common functionality** into shared utilities (`lib/performance-utils.js`)
- **Eliminate code duplication** across scenes and modules
- **Use configuration objects** instead of hardcoded values
- **Create reusable functions** for repeated patterns

**Example - Good:**

```javascript
// ✅ DRY: Shared utility function
function validateSceneContext(ctx, sceneName) {
  const required = ['device', 'state'];
  const missing = required.filter((prop) => !ctx[prop]);
  if (missing.length > 0) {
    console.error(
      `❌ [${sceneName.toUpperCase()}] Missing required context` +
        ` properties: ${missing.join(', ')}`,
    );
    return false;
  }
  return true;
}

// Usage across multiple scenes
if (!validateSceneContext(ctx, name)) return;
```

**Example - Bad:**

```javascript
// ❌ WET: Duplicated validation in every scene
if (!ctx || !ctx.device || !ctx.state) {
  console.error(`❌ [SCENE_NAME] Missing required context properties`);
  return;
}
```

### **SOLID Principles**

- **Single Responsibility**: Each function/module has one clear purpose
- **Open/Closed**: Code is open for extension, closed for modification
- **Liskov Substitution**: Derived classes can replace base classes
- **Interface Segregation**: Keep interfaces small and focused
- **Dependency Inversion**: Depend on abstractions, not concretions

### **Clean Code Basics**

- **Meaningful names**: `calculatePerformanceMetrics()` not `calc()`
- **Small functions**: Max 30-50 lines, single responsibility
- **Consistent formatting**: Use Prettier/ESLint
- **Comments for complexity**: Self-documenting code preferred
- **Error handling**: Fail fast with clear error messages

### **Magic Numbers & Constants**

```javascript
// ✅ Good: Named constants
const CHART_CONFIG = Object.freeze({
    MAX_CHART_POINTS: Math.floor((64 - 4) / 2), // Calculated, not magic
    MAX_FRAME_SAMPLES: 50,
    UPDATE_INTERVAL_MS: 100
});

// ❌ Bad: Magic numbers
for (let i = 0; i < 30; i++) { // What does 30 represent?
    if (timeout > 60000) { // What does 60000 represent?
```

---

## 📚 Documentation Standards {#documentation-standards}

### **JSDoc Comments**

Always document public functions and classes:

```javascript
/**
 * @fileoverview Professional Gradient Renderer - Advanced line drawing
 * @description High-performance gradient line rendering with sophisticated color
 * @version 1.0.0
 * @author: Sonic + Cursor + Markus Barta (mba)
 * @license MIT
 */

/**
 * Performance-optimized RGBA color interpolation
 * @param {number[]} startColor - Starting RGBA color [r, g, b, a]
 * @param {number[]} endColor - Ending RGBA color [r, g, b, a]
 * @param {number} factor - Interpolation factor (0.0 to 1.0)
 * @returns {number[]} Interpolated RGBA color
 */
function interpolateColor(startColor, endColor, factor) {
  // Implementation
}
```

### **README Files**

Every major component should have:

- **Purpose**: What it does
- **Usage**: How to use it
- **Examples**: Code examples
- **Dependencies**: What it requires

### **Inline Comments**

```javascript
// ✅ Good: Explain why, not what
await device.clear(); // Clear screen before drawing to prevent content overlap

// ❌ Bad: Redundant comment
await device.clear(); // Clears the screen
```

---

## 🧪 Testing Strategy {#testing-strategy}

### **Unit Testing Requirements**

- Test all public functions
- Test error conditions
- Test edge cases
- Mock external dependencies

### **Integration Testing**

- Test scene loading and rendering
- Test device communication
- Test MQTT message handling
- Test performance benchmarks

### **Manual Testing Checklist**

- [ ] Fresh device boot scenarios
- [ ] Scene transitions
- [ ] Error recovery
- [ ] Performance benchmarks
- [ ] Memory usage validation

### **Performance Testing**

```javascript
// Example performance test structure
async function performanceTest(scene, iterations = 100) {
  const startTime = performance.now();
  for (let i = 0; i < iterations; i++) {
    await scene.render(ctx);
  }
  const avgTime = (performance.now() - startTime) / iterations;
  console.log(`Average render time: ${avgTime.toFixed(2)}ms`);
}
```

---

## ⚡ Performance Optimization {#performance-optimization}

### **Memory Management**

- **Use Maps/Sets** for frequent lookups instead of arrays
- **Implement caching** for expensive operations
- **Clean up resources** properly
- **Monitor memory usage** in long-running processes

```javascript
// ✅ Good: Efficient caching
const GRADIENT_CACHE = new Map();

function getCachedGradient(key, calculateFn) {
  if (GRADIENT_CACHE.has(key)) {
    return GRADIENT_CACHE.get(key);
  }
  const result = calculateFn();
  GRADIENT_CACHE.set(key, result);
  return result;
}
```

### **Algorithm Optimization**

- **Prefer O(1) or O(log n)** over O(n) when possible
- **Batch operations** to reduce overhead
- **Use appropriate data structures** (Map vs Object vs Array)
- **Profile before optimizing** (don't guess bottlenecks)

### **Device-Specific Optimizations**

- **Minimize pixel operations**: Batch drawing commands
- **Use device.isReady()** before operations
- **Handle device boot states** properly
- **Implement retry logic** for network operations

---

## 🚨 Error Handling {#error-handling}

### **Fail Fast Principle**

```javascript
// ✅ Good: Fail fast with clear messages
function validateColor(color) {
  if (!Array.isArray(color) || color.length !== 4) {
    throw new Error(
      `Invalid color format: expected [r,g,b,a], got ${JSON.stringify(color)}`,
    );
  }
  if (color.some((c) => typeof c !== 'number' || c < 0 || c > 255)) {
    throw new Error(
      `Invalid color values: all components must be numbers 0-255`,
    );
  }
  return color;
}
```

### **Error Types**

- **ValidationError**: Invalid input parameters
- **DeviceError**: Hardware communication issues
- **NetworkError**: MQTT/connection problems
- **TimeoutError**: Operations taking too long

### **Graceful Degradation**

```javascript
// ✅ Good: Graceful degradation
async function renderAdvancedChart(device, data) {
  try {
    // Try advanced rendering first
    return await advancedChartRenderer.render(device, data);
  } catch (error) {
    console.warn(
      `Advanced chart failed, falling back to basic: ${error.message}`,
    );
    // Fallback to basic rendering
    return await basicChartRenderer.render(device, data);
  }
}
```

### **Logging Levels**

- **ERROR**: Something is broken, needs immediate attention
- **WARN**: Something unexpected but not critical
- **INFO**: Normal operation information
- **DEBUG**: Detailed information for troubleshooting

---

## 🔒 Security Considerations {#security-considerations}

### **Input Validation**

- **Validate all inputs** from MQTT messages
- **Sanitize data** before processing
- **Use type checking** for critical parameters
- **Implement bounds checking** for coordinates and colors

### **Network Security**

- **Use secure MQTT connections** when possible
- **Validate device IPs** against whitelist
- **Implement rate limiting** for MQTT messages
- **Log security events** appropriately

### **Code Security**

- **Avoid eval()** and other dangerous functions
- **Use constants** for sensitive values
- **Implement proper error handling** (don't leak internal details)
- **Keep dependencies updated** and scan for vulnerabilities

---

## 📝 Markdown Formatting Guidelines {#markdown-formatting-guidelines}

### **🚨 ZERO ERRORS POLICY**

**ALL markdown files MUST have ZERO linting errors.** This includes:

- ❌ **MD013** (line length) - Target 80, max 120 characters (CRITICAL)
- ❌ **MD022** (headings spacing) - Surround headings with blank lines
- ❌ **MD032** (lists spacing) - Surround lists with blank lines
- ❌ **MD040** (code blocks) - Specify language for all code blocks
- ❌ **MD031** (code block spacing) - Surround code blocks with blank lines
- ❌ **MD051** (link fragments) - Use valid anchor links

**Breaking this policy will result in:**

- ⚠️ **Build failures** (if CI is configured)
- ❌ **Code review rejection**
- 🚫 **Commit rejection** (if pre-commit hooks are active)

**Always run `npx markdownlint *.md` before committing!**

### **Common Issues & Solutions**

#### **MD022/MD032: Headings and Lists Spacing**

**❌ Incorrect:**

```markdown
## Heading

Some text

- List item 1
- List item 2
```

**✅ Correct:**

```markdown
## Heading

Some text

- List item 1
- List item 2
```

**Rule**: Always surround headings and lists with blank lines.

**Common Mistakes to Avoid:**

- ❌ No blank line before headings
- ❌ No blank line after headings
- ❌ Lists not surrounded by blank lines
- ❌ Multiple headings without proper spacing

**Quick Fix**: When you see MD022/MD032 errors, add blank lines around headings
and lists.

#### **MD013: Line Length**

**❌ Incorrect:**

```markdown
This is a very long line that exceeds the 80 character limit and will cause a markdownlint error because it's too long to read comfortably.
```

**✅ Correct:**

```markdown
This is a line that stays within the 80 character limit and is easy to read and maintain. Use backslash continuation for long content.
```

**Rule**: Target 80 characters for readability, with 120 characters as strict maximum.

**Exceptions**: Shell commands and MQTT examples may extend to 200 characters for copy-paste convenience.

**Flexible Approach**: Aim for 80 characters when possible, but allow up to 120 when needed for readability or complex content.

**Common Solutions:**

- **Target 80 characters** for optimal readability
- **Strict maximum 120 characters** - never exceed this
- **Shell commands exception**: Up to 200 characters for copy-paste convenience
- Use backslash continuation (`\`) for very long lines
- Break long URLs, commands, or complex expressions
- Shorten descriptions in tables when possible
- Use shorter variable names in code examples

#### **MD051: Link Fragments**

**❌ Incorrect:**

```markdown
[Link Text](#-invalid-fragment)
[Heading](#heading-with-emoji)
```

**✅ Correct:**

```markdown
[Link Text](#valid-fragment)
[Heading](#heading-with-explicit-id)

## Actual Heading {#heading-with-explicit-id}
```

**Rule**: Link fragments must match actual heading IDs or use explicit ID syntax.

**Common Solutions:**

- Use explicit IDs: `## Heading {#custom-id}`
- Avoid leading dashes in fragments
- Match the actual generated ID (lowercase, hyphens for spaces)

### **Markdownlint Rules Reference**

#### **Most Common Issues**

| Rule      | Description         | Solution                           |
| --------- | ------------------- | ---------------------------------- |
| **MD013** | Line length         | Target 80, max 120 characters      |
| **MD022** | Headings spacing    | Add blank lines around headings    |
| **MD032** | Lists spacing       | Add blank lines around lists       |
| **MD040** | Code block language | Specify language after ```         |
| **MD031** | Code block spacing  | Add blank lines around code blocks |
| **MD051** | Link fragments      | Use correct anchor links           |

#### **Running Markdownlint**

```bash
# Check all markdown files
npx markdownlint *.md

# Check specific file
npx markdownlint STANDARDS.md

# Check specific rules
npx markdownlint STANDARDS.md --rules MD022,MD032

# Auto-fix (if supported)
npx markdownlint --fix *.md
```

#### **MD040: Fenced Code Blocks**

**❌ Incorrect:**

```text
// Bad: No language specified
function example() {
    return true;
}
```

**✅ Correct:**

```javascript
// Good: Language specified
function example() {
  return true;
}
```

#### **MD031: Fenced Code Blocks Spacing**

**❌ Incorrect:**

```javascript
function example() {
    return true;
}
More text here.
```

**✅ Correct:**

```javascript
function example() {
  return true;
}
```

More text here.

### **Integrating Markdownlint into Development Workflow**

#### **Pre-commit Hook Setup**

Add markdownlint to your pre-commit hooks to catch issues before committing:

```bash
# .pre-commit-config.yaml (if using pre-commit)
repos:
  - repo: https://github.com/markdownlint/markdownlint
    rev: v0.12.0
    hooks:
      - id: markdownlint
        args: [--config, .markdownlint.json]
```

#### **VS Code Integration**

Add to your `.vscode/settings.json`:

```json
{
  "markdownlint.config": {
    "default": true,
    "MD022": true,
    "MD032": true,
    "MD040": true
  },
  "markdownlint.run": "onType"
}
```

#### **GitHub Actions Integration**

Add to your workflow:

```yaml
- name: Lint Markdown
  uses: github/super-linter/slim@v4
  env:
    VALIDATE_MARKDOWN: true
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### **Markdown Best Practices**

#### **Headers Hierarchy**

```markdown
# Main Title (Level 1)

## Section (Level 2)

### Subsection (Level 3)

#### Sub-subsection (Level 4)
```

#### **Lists**

```markdown
<!-- Bulleted lists -->

- Item 1
- Item 2
  - Nested item
  - Another nested item

<!-- Numbered lists -->

1. First item
2. Second item
   1. Nested numbered item
```

#### **Code Blocks**

```javascript
// For code examples
function example() {
  return 'Use language-specific syntax highlighting';
}
```

#### **Tables**

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

#### **Links and Images**

```markdown
<!-- Links -->

[Link Text](https://example.com)
[Reference Link][ref]

<!-- Images -->

![Alt Text](image.png)
![Reference Image][img-ref]

<!-- References -->

[ref]: https://example.com
[img-ref]: image.png
```

#### **Emphasis**

```markdown
_Italic text_
**Bold text**
`Inline code`
~~Strikethrough~~
```

---

## 📊 Commit Guidelines {#commit-guidelines}

### **Commit Message Format**

```text
type(scope): description

[optional body]

[optional footer]
```

### **Types**

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### **Examples**

```bash
# ✅ Good commit messages
feat(advanced-chart): add negative value handling for charts
fix(fill-scene): correct device.fillRgba to device.fillRectangleRgba
docs(readme): update installation instructions
refactor(performance-utils): extract common chart config constants

# ❌ Bad commit messages
"fixed bug"
"updated code"
"changes"
```

### **Branch Naming**

- **feature/feature-name**: New features
- **bugfix/bug-description**: Bug fixes
- **hotfix/critical-issue**: Urgent fixes
- **refactor/component-name**: Code refactoring

---

## 🎯 Senior Developer Checklist

### **Before Committing Code**

- [ ] **DRY Principle**: No code duplication?
- [ ] **Documentation**: All public functions documented?
- [ ] **Error Handling**: Proper try/catch and validation?
- [ ] **Performance**: No obvious inefficiencies?
- [ ] **Security**: Input validation and safe practices?
- [ ] **Testing**: Basic functionality tested?
- [ ] **Markdown**: Follows formatting guidelines?
- [ ] **ZERO ERRORS**: Run `npx markdownlint *.md` - NO errors allowed?
- [ ] **MD013**: All lines under 120 characters (target 80)?
- [ ] **MD022/MD032**: Headings and lists have proper spacing?
- [ ] **MD051**: Link fragments are valid?
- [ ] **Scene Development**: All scenes have `device.push()` calls?

### **Code Review Checklist**

- [ ] **Architecture**: Follows SOLID principles?
- [ ] **Readability**: Code is self-documenting?
- [ ] **Maintainability**: Easy to modify and extend?
- [ ] **Performance**: Efficient algorithms and data structures?
- [ ] **Security**: No security vulnerabilities?
- [ ] **Testing**: Adequate test coverage?
- [ ] **Documentation**: Updated documentation?
- [ ] **Markdown**: ZERO linting errors in all .md files?
- [ ] **Line Length**: All markdown lines under 120 characters (target 80)?

### **Performance Review Checklist**

- [ ] **Memory**: No memory leaks?
- [ ] **CPU**: Efficient algorithms?
- [ ] **Network**: Minimal overhead?
- [ ] **Device**: Optimized for Pixoo hardware?
- [ ] **Scalability**: Handles edge cases well?

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

---

## 🎬 Scene Development Standards {#scene-development-standards}

### **Critical Scene Requirements**

#### **🚨 ALWAYS Include `device.push()`**

**❌ Common Mistake**: Drawing to device buffer but never pushing to display

```javascript
// ❌ WRONG: Scene draws but nothing shows on Pixoo
async function render(ctx) {
  const { device } = ctx;
  await device.fillRectangleRgba([0, 0], [64, 64], [255, 0, 0, 255]);
  console.log('Red screen drawn');
  // Missing: await device.push(name, ctx.publishOk);
}
```

**✅ CORRECT**: Always push after drawing

```javascript
// ✅ CORRECT: Scene draws AND displays on Pixoo
async function render(ctx) {
  const { device } = ctx;
  await device.fillRectangleRgba([0, 0], [64, 64], [255, 0, 0, 255]);

  // CRITICAL: Push frame to device
  await device.push(name, ctx.publishOk);

  console.log('Red screen drawn and displayed');
}
```

#### **Scene Lifecycle Checklist**

- [ ] **`init()` method**: Scene initialization (optional)
- [ ] **`render()` method**: Main rendering logic
- [ ] **`cleanup()` method**: Scene cleanup (optional)
- [ ] **`device.push()`**: ALWAYS push after drawing
- [ ] **Error handling**: Validate context and handle errors gracefully
- [ ] **State management**: Use `ctx.state` for scene-specific data

#### **Scene Template**

```javascript
const name = 'scene_name';

async function init() {
  console.log(`🚀 [${name.toUpperCase()}] Scene initialized`);
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, state } = ctx;

  // Your rendering logic here
  await device.drawSomething();

  // CRITICAL: Always push to device
  await device.push(name, ctx.publishOk);

  console.log(`✅ [${name.toUpperCase()}] Scene rendered`);
}

async function cleanup() {
  console.log(`🧹 [${name.toUpperCase()}] Scene cleaned up`);
}

module.exports = { name, render, init, cleanup };
```

---

## 🐟 Fish-Aware Shell Standards {#fish-aware-shell-standards}

Our development environment uses the fish shell by default.
When proposing or generating shell commands, scripts, or one-liners,
follow these rules.

### **Server-Side Scripts and Git Hooks**

When creating server-side scripts or git hooks on NixOS:

- ✅ **Use `#!/usr/bin/env bash`** - Portable across different systems
- ✅ **Avoid fish-specific syntax** - Scripts should work in bash
- ✅ **Use `echo 'content' > file`** instead of `cat > file << 'EOF'` in fish
- ✅ **Test scripts in bash** - Ensure they work in the target environment

**Example - Good:**

```bash
echo '#!/usr/bin/env bash
set -e
echo "Script starting..."
cd /path/to/dir
npm install' > script.sh
chmod +x script.sh
```

**Example - Bad (fish-specific):**

```fish
cat > script.sh << 'EOF'
#!/usr/bin/env bash
# This won't work in fish due to redirection syntax
EOF
```

### **Do This (fish syntax)**

- ✅ Use fish syntax, not bash/zsh
- ✅ Variable assignment: `set var value` (not `var=value`)
- ✅ Export env vars: `set -x VAR value` (not `export VAR=value`)
- ✅ Conditionals/loops: `if ...; end`, `for v in list; end` (no `fi`/`done`)
- ✅ Command substitution: `(cmd)` (not `$(cmd)`)
- ✅ Source files: `source file.fish` (not `. file.sh`)
- ✅ When unsure, prefer fish-correct form first

### **Do Not**

- 🚫 Do not silently fall back to bash

### **If bash is required**

- 💡 Explicitly call: `bash -c "..."` and explain why bash-specific
  features are needed

### **Examples**

```fish
# Set and export
set -x PIXOO_IP 192.168.1.159

# Loop
for color in red green blue
  echo $color
end

# Command substitution
set now (date +%s)

# Source configuration
source ~/.config/fish/config.fish
```

```bash
# If you truly need bash-only features (e.g., process substitution)
bash -c 'mapfile -t lines < <(ls); printf "%s\n" "${lines[@]}"'
```

---

## 🔧 Linting Standards {#linting-standards}

### **ESLint Configuration**

Our ESLint configuration uses reasonable limits that balance code quality with practical development:

- **Complexity**: `warn` at 20, `error` at 15 (was 10)
- **Max Parameters**: `warn` at 7, `error` at 6 (was 5)
- **Max Lines per Function**: `warn` at 150, `error` at 120 (was 80)

**Why These Limits?**

- **Complexity 20**: Allows for realistic business logic while preventing overly complex functions
- **Max Params 7**: Accommodates common patterns like event handlers and configuration objects
- **Max Lines 150**: Permits complex functions when necessary, but encourages refactoring

### **Markdown Linting**

We use markdownlint with relaxed rules for better developer experience:

- **Line Length**: 120 characters (was 72)
- **Code Blocks**: No language requirement (MD040 disabled)
- **Headers**: No strict ordering requirements
- **Lists**: Consistent indentation (2 spaces)

### **Auto-Fix Commands**

```bash
# Fix ESLint issues automatically
npm run lint -- --fix

# Fix markdown issues
npx markdownlint --fix "**/*.md"

# Fix all linting issues at once
npm run lint:fix
```

### **When to Refactor vs. Disable**

**✅ Refactor When:**

- Function has multiple responsibilities
- Logic can be extracted into helper functions
- Similar patterns exist elsewhere in codebase

**⚠️ Disable Rule When:**

- Function complexity is justified by business requirements
- Performance-critical code requires optimization
- Third-party library integration requires specific patterns

**Example - Good Refactoring:**

```javascript
// Before: High complexity (15+)
async function render(ctx) {
  if (!validateContext(ctx)) return;
  const { device, state } = ctx;
  const versionInfo = buildVersionInfo(state);
  await drawStartupInfo(device, versionInfo);
  await device.push(name, ctx.publishOk);
}

// After: Low complexity (5)
function buildVersionInfo(state) {
  const gitSha = process.env.GITHUB_SHA?.substring(0, 7);
  return {
    version:
      process.env.IMAGE_TAG ||
      gitSha ||
      getStateValue(state, 'version', '1.0.0'),
    // ... other properties
  };
}
```

### **Pre-commit Hooks**

Consider adding pre-commit hooks to automatically fix common issues:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint:fix && npm run lint:md:fix"
    }
  }
}
```
