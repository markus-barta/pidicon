# Test Directory

## Unit and integration tests for the Pixoo Daemon

---

## 🧪 Test Structure

```text
test/
├── README.md                              # This file
├── build-number.test.js                   # Build number generation tests
├── lib/                                   # Library module tests
│   ├── di-container.test.js               # Dependency injection tests
│   ├── logger.test.js                     # Logger tests
│   ├── mqtt-service.test.js               # MQTT service tests
│   ├── scene-manager-di.test.js           # SceneManager DI tests
│   ├── scene-manager-statestore.test.js   # SceneManager StateStore tests
│   └── state-store.test.js                # StateStore tests
└── integration/                           # Integration tests
    └── daemon-startup-di.test.js          # Daemon startup with DI tests
```

---

## 🎯 Test Categories

### **Unit Tests** (`test/lib/`)

Test individual modules in isolation:

- **`di-container.test.js`** (31 tests) - Dependency injection container
- **`mqtt-service.test.js`** (12 tests) - MQTT service functionality
- **`state-store.test.js`** (34 tests) - Centralized state management
- **`scene-manager-di.test.js`** (6 tests) - SceneManager with DI
- **`scene-manager-statestore.test.js`** (7 tests) - SceneManager with StateStore
- **`logger.test.js`** - Logger functionality

### **Integration Tests** (`test/integration/`)

Test module interactions:

- **`daemon-startup-di.test.js`** (3 tests) - Daemon initialization with DI container

### **Build Tests** (root level)

- **`build-number.test.js`** - Version and build number generation

---

## 🚀 Running Tests

### **All Tests**

```bash
# Run full test suite
npm test

# Run with coverage
npm run coverage
```

### **Specific Test File**

```bash
# Run single test file
node --test test/lib/di-container.test.js

# Run with verbose output
node --test --test-reporter=spec test/lib/di-container.test.js
```

### **Watch Mode** (Development)

```bash
# Re-run tests on file changes
node --test --watch
```

---

## 📊 Test Results

**Current Status** (v2.1.0, Build 603):

- **Total Tests**: 152
- **Passing**: 152 (100%)
- **Failing**: 0
- **Coverage**: 43.75% (baseline), target 80%+

**Test Breakdown**:

| Module               | Tests | Status |
| -------------------- | ----- | ------ |
| DI Container         | 31    | ✅     |
| StateStore           | 34    | ✅     |
| MQTT Service         | 12    | ✅     |
| SceneManager (DI)    | 6     | ✅     |
| SceneManager (State) | 7     | ✅     |
| Daemon Startup       | 3     | ✅     |
| Build Number         | 3+    | ✅     |

---

## 🎨 Test Patterns

### **Unit Test Template**

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('ModuleName', () => {
  describe('methodName', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = methodName(input);

      // Assert
      assert.strictEqual(result, 'expected');
    });
  });
});
```

### **Async Test Pattern**

```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  assert.strictEqual(result, expected);
});
```

### **Mock Pattern**

```javascript
// Mock logger for testing
const mockLogger = {
  info: () => {},
  error: () => {},
  debug: () => {},
};

// Use in tests
const service = new Service({ logger: mockLogger });
```

---

## ✅ Testing Standards

### **Coverage Requirements**

- **Critical paths**: 100% coverage
- **New code**: 80%+ coverage
- **Legacy code**: Improve gradually

### **Test Quality**

- **Isolated**: Each test independent
- **Fast**: Unit tests < 100ms each
- **Clear**: Descriptive test names
- **Maintainable**: DRY principles apply

### **Naming Conventions**

```javascript
// ✅ GOOD
describe('DIContainer', () => {
  describe('register', () => {
    it('should register service with singleton lifetime', () => {});
    it('should throw error for invalid service name', () => {});
  });
});

// ❌ BAD
describe('test', () => {
  it('works', () => {});
});
```

---

## 🔧 Test Utilities

### **Mock MQTT Client**

```javascript
class MockMqttClient extends EventEmitter {
  connect() {
    this.emit('connect');
  }
  subscribe() {}
  publish() {}
}
```

### **Mock Logger**

```javascript
const mockLogger = {
  ok: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};
```

### **Test Fixtures**

```javascript
// Common test data
const FIXTURES = {
  validService: { name: 'test', value: 42 },
  invalidService: null,
};
```

---

## 🚨 Common Pitfalls

### **Async Issues**

```javascript
// ❌ BAD - Missing await
it('should work', async () => {
  asyncFunction(); // Not awaited!
  assert.strictEqual(result, expected);
});

// ✅ GOOD
it('should work', async () => {
  await asyncFunction();
  assert.strictEqual(result, expected);
});
```

### **Shared State**

```javascript
// ❌ BAD - Shared mutable state
let sharedState = {};

it('test 1', () => {
  sharedState.value = 1; // Affects other tests!
});

// ✅ GOOD - Fresh state per test
it('test 1', () => {
  const state = { value: 1 };
  // Test with isolated state
});
```

---

## 📚 Related Documentation

- [../STANDARDS.md](../STANDARDS.md#testing--performance) - Testing standards
- [../docs/CODE_QUALITY.md](../docs/CODE_QUALITY.md#testing) - Test quality guidelines
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - Architecture and testability

---

## 🎯 Test Development Workflow

### **Adding New Tests**

1. **Create test file**: `test/lib/module-name.test.js`
2. **Follow naming convention**: `describe` → `it` hierarchy
3. **Write isolated tests**: No shared state
4. **Run tests**: `node --test test/lib/module-name.test.js`
5. **Verify coverage**: 80%+ for new code

### **TDD Workflow**

1. **Red**: Write failing test
2. **Green**: Implement minimum code to pass
3. **Refactor**: Improve code while keeping tests green
4. **Repeat**: Continue with next feature

---

## 🔬 Debugging Tests

### **Verbose Output**

```bash
# See detailed test execution
node --test --test-reporter=spec
```

### **Debug Single Test**

```bash
# Run with Node debugger
node --inspect --test test/lib/module.test.js
```

### **Test Timeout**

```javascript
// Increase timeout for slow tests
it('slow test', { timeout: 5000 }, async () => {
  await slowOperation();
});
```

---

**Status**: ✅ 152/152 tests passing  
**Coverage**: 43.75% (baseline), c8 configured, incremental improvement ongoing  
**Version**: 2.1.0 (Build 603)  
**Last Updated**: 2025-10-11
