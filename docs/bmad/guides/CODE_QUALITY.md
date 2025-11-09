# Code Quality Standards

## Professional Engineering Best Practices for Senior Developers

**Last Updated**: 2025-09-30  
**Status**: Active

---

## 🎯 Core Philosophy

> "Code is read 10x more than it's written. Optimize for readability and
> maintainability, not cleverness."

**Guiding Principles**:

1. **Clarity over Cleverness**: Explicit is better than implicit
2. **Fail Fast**: Validate early, error clearly
3. **DRY with Intent**: Abstract when pattern emerges 3+ times
4. **YAGNI**: You Aren't Gonna Need It - build what's needed now
5. **Boy Scout Rule**: Leave code cleaner than you found it

---

## 📋 Table of Contents

- [Code Organization](#code-organization)
- [Naming Conventions](#naming-conventions)
- [No Magic Numbers](#no-magic-numbers)
- [Function Design](#function-design)
- [Error Handling](#error-handling)
- [Async/Await Patterns](#asyncawait-patterns)
- [Defensive Programming](#defensive-programming)
- [Performance](#performance)
- [Testing](#testing)

---

## 🗂️ Code Organization

### **File Structure**

```javascript
// 1. External dependencies (sorted alphabetically)
const fs = require('fs');
const path = require('path');

// 2. Internal dependencies (sorted by importance)
const logger = require('./logger');
const { ValidationError } = require('./errors');

// 3. Constants (Object.freeze for immutability)
const CONFIG = Object.freeze({
  MAX_RETRIES: 3,
  TIMEOUT_MS: 5000,
});

// 4. Private helpers (prefix with _)
function _validateInput(data) {
  /* ... */
}

// 5. Public API
class ServiceName {
  /* ... */
}

// 6. Exports
module.exports = { ServiceName };
```

### **Module Size Limits**

- **Max 400 lines per file** (excluding tests)
- **Max 10 exported functions per module**
- **Max 5 dependencies** (consider splitting if more)

If exceeding limits, split into:

- `service-name.js` - Main logic
- `service-name-helpers.js` - Private utilities
- `service-name-constants.js` - Configuration

---

## 🏷️ Naming Conventions

### **Variables & Constants**

```javascript
// ✅ GOOD
const MAX_RETRY_COUNT = 3; // SCREAMING_SNAKE for constants
const isUserActive = true; // camelCase for variables
const userCount = 42; // Descriptive, not abbreviated

// ❌ BAD
const max = 3; // Too generic
const usr_cnt = 42; // Abbreviated and snake_case
const MAXRETRYCOUNT = 3; // Hard to read without underscores
```

### **Functions & Methods**

```javascript
// ✅ GOOD - Verb + Noun pattern
function calculateTotalPrice(items) {
  /* ... */
}
function isValidEmail(email) {
  /* ... */
} // Boolean returns: is/has/can
async function fetchUserData(id) {
  /* ... */
} // Async: fetch/load/get

// ❌ BAD
function total(items) {
  /* ... */
} // Missing verb
function email(e) {
  /* ... */
} // Noun, not verb
function getUserDataAsync(id) {
  /* ... */
} // Redundant "Async" suffix
```

### **Classes**

```javascript
// ✅ GOOD - PascalCase, singular noun
class UserService {
  /* ... */
}
class MqttClient {
  /* ... */
}
class StateStore {
  /* ... */
}

// ❌ BAD
class userService {
  /* ... */
} // lowercase
class Users {
  /* ... */
} // Plural (unless collection)
class MQTT_CLIENT {
  /* ... */
} // SCREAMING_SNAKE
```

### **Private Members**

```javascript
// ✅ GOOD - Prefix with underscore
class Service {
  constructor() {
    this._privateState = {};
  }

  _privateHelper() { /* ... */ }
}

// Public API is clear (no underscore)
getUserData() { /* ... */ }
```

---

## 🔢 No Magic Numbers

**Rule**: Never use unexplained numeric literals in logic.

### **❌ BAD - Magic Numbers**

```javascript
// What do these numbers mean?
if (user.age > 18) {
  /* ... */
}
setTimeout(checkStatus, 5000);
const padding = 10;
canvas.drawRect(32, 32, 64, 64);
```

### **✅ GOOD - Named Constants**

```javascript
// Clear intent, easy to change
const ADULT_AGE_THRESHOLD = 18;
const STATUS_CHECK_INTERVAL_MS = 5000;
const UI_PADDING_PX = 10;

const DISPLAY = Object.freeze({
  WIDTH: 64,
  HEIGHT: 64,
  CENTER_X: 32,
  CENTER_Y: 32,
});

if (user.age > ADULT_AGE_THRESHOLD) {
  /* ... */
}
setTimeout(checkStatus, STATUS_CHECK_INTERVAL_MS);
canvas.drawRect(
  DISPLAY.CENTER_X,
  DISPLAY.CENTER_Y,
  DISPLAY.WIDTH,
  DISPLAY.HEIGHT
);
```

### **When Numbers Are OK**

- **0, 1, -1**: Universal constants (array indices, empty checks)
- **100**: Common percentages
- **Obvious context**: `array.slice(0, 5)` is clear enough

```javascript
// ✅ Acceptable
if (array.length === 0) return;
const percentage = (value / total) * 100;
```

### **Configuration Objects**

```javascript
// ✅ Centralized configuration
const CHART_CONFIG = Object.freeze({
  DISPLAY: {
    WIDTH: 64,
    HEIGHT: 64,
  },
  TIMING: {
    FRAME_DURATION_MS: 200,
    ANIMATION_STEPS: 30,
  },
  COLORS: {
    AXIS: [64, 64, 64, 191],
    GRID: [32, 32, 32, 127],
  },
});
```

**Benefits**:

- Single source of truth
- Easy to modify for different displays/configs
- Self-documenting code
- Testable (can mock config)

---

## ⚙️ Function Design

### **Function Length**

- **Target**: 15-30 lines
- **Max**: 50 lines (error if exceeded)
- **If longer**: Extract helper functions

### **Parameters**

- **Max**: 3-4 positional parameters
- **5+ parameters**: Use options object

```javascript
// ❌ BAD - Too many parameters
function drawText(device, text, x, y, color, bgColor, padding, align) {
  /* ... */
}

// ✅ GOOD - Options object
function drawText(device, text, options = {}) {
  const {
    x = 0,
    y = 0,
    color = [255, 255, 255, 255],
    bgColor = null,
    padding = 0,
    align = 'left',
  } = options;
  /* ... */
}

// Usage
drawText(device, 'Hello', { x: 10, y: 20, align: 'center' });
```

### **Cyclomatic Complexity**

- **Max**: 10 (error if exceeded)
- **Calculation**: Count decision points (if, while, for, case, &&, ||, ?)

```javascript
// ❌ BAD - Complexity: 12
function processUser(user) {
  if (user.isActive && user.age > 18) {
    if (user.hasPermission || user.isAdmin) {
      if (user.emailVerified && !user.isBanned) {
        // ... more conditions
      }
    }
  }
}

// ✅ GOOD - Use guard clauses + helper functions
function processUser(user) {
  if (!user.isActive) return;
  if (!isAdult(user)) return;
  if (!hasAccess(user)) return;
  if (!isVerifiedAndNotBanned(user)) return;

  // Main logic here
}

function isAdult(user) {
  return user.age > ADULT_AGE_THRESHOLD;
}
```

### **Pure Functions Preferred**

```javascript
// ✅ GOOD - Pure function (no side effects)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ⚠️ OK - Side effect clearly named
function saveUserToDatabase(user) {
  // Clearly mutates external state
  database.insert(user);
}

// ❌ BAD - Hidden side effect
function getUser(id) {
  logger.info('Fetching user'); // Side effect!
  analytics.track('user_fetch'); // Side effect!
  return users.find((u) => u.id === id);
}
```

### **Single Responsibility**

Each function should do **one thing** well.

```javascript
// ❌ BAD - Multiple responsibilities
function processUserAndNotify(user) {
  // 1. Validation
  if (!user.email) throw new Error('Invalid email');

  // 2. Database
  database.save(user);

  // 3. Email
  sendEmail(user.email, 'Welcome!');

  // 4. Analytics
  analytics.track('user_registered');
}

// ✅ GOOD - Split responsibilities
function registerUser(user) {
  validateUser(user);
  saveUser(user);
  notifyUser(user);
  trackRegistration(user);
}
```

---

## 🚨 Error Handling

### **Fail Fast with Guard Clauses**

```javascript
// ✅ GOOD - Early returns
function processOrder(order) {
  if (!order) {
    throw new ValidationError('Order is required');
  }
  if (!order.items || order.items.length === 0) {
    throw new ValidationError('Order must have items');
  }
  if (order.total <= 0) {
    throw new ValidationError('Order total must be positive');
  }

  // Main logic here - no nesting!
  return calculateShipping(order);
}
```

### **Specific Error Types**

```javascript
// ✅ GOOD - Custom error types
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class DeviceError extends Error {
  constructor(message, device) {
    super(message);
    this.name = 'DeviceError';
    this.device = device;
  }
}

// Usage
throw new ValidationError('Invalid email format');
throw new DeviceError('Connection timeout', deviceIp);
```

### **Error Messages**

```javascript
// ❌ BAD
throw new Error('Error');
throw new Error('Something went wrong');

// ✅ GOOD - Actionable, specific
throw new ValidationError('Email must be in format: user@domain.com');
throw new DeviceError(
  `Failed to connect to device ${ip} after ${MAX_RETRIES} retries`
);
```

---

## ⏱️ Async/Await Patterns

### **Always Use Async/Await**

```javascript
// ❌ BAD - Callback hell
function fetchData(callback) {
  http.get(url, (err, data) => {
    if (err) return callback(err);
    database.save(data, (err2, result) => {
      if (err2) return callback(err2);
      callback(null, result);
    });
  });
}

// ✅ GOOD - Clean async/await
async function fetchData() {
  const data = await http.get(url);
  const result = await database.save(data);
  return result;
}
```

### **Error Handling in Async**

```javascript
// ✅ GOOD - Try/catch with specific handling
async function loadUserData(id) {
  try {
    const user = await database.findUser(id);
    const profile = await api.fetchProfile(user.profileId);
    return { ...user, profile };
  } catch (error) {
    logger.error('Failed to load user data', { id, error: error.message });
    throw new UserLoadError(`Cannot load user ${id}: ${error.message}`);
  }
}
```

### **Parallel vs Sequential**

```javascript
// ❌ BAD - Sequential (slow)
const user = await fetchUser(id);
const posts = await fetchPosts(id);
const comments = await fetchComments(id);

// ✅ GOOD - Parallel (fast)
const [user, posts, comments] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id),
]);
```

---

## 🛡️ Defensive Programming

### **Input Validation**

```javascript
// ✅ GOOD - Validate all inputs
function calculateDiscount(price, discountPercent) {
  // Type checking
  if (typeof price !== 'number' || typeof discountPercent !== 'number') {
    throw new ValidationError('Price and discount must be numbers');
  }

  // Range checking
  if (price < 0) {
    throw new ValidationError('Price cannot be negative');
  }
  if (discountPercent < 0 || discountPercent > 100) {
    throw new ValidationError('Discount must be between 0 and 100');
  }

  return price * (1 - discountPercent / 100);
}
```

### **Null/Undefined Checks**

```javascript
// ✅ GOOD - Explicit checks
function getUserName(user) {
  if (!user) return 'Guest';
  return user.name ?? 'Anonymous';
}

// Nullish coalescing (??) vs OR (||)
const count = user.count ?? 0; // ✅ Only null/undefined → 0
const name = user.name || 'Guest'; // ⚠️ Empty string '' → 'Guest'
```

### **Immutability**

```javascript
// ✅ GOOD - Immutable patterns
const CONFIG = Object.freeze({
  MAX_RETRIES: 3,
  TIMEOUT: 5000,
});

// Spread operator for copies
function addItem(array, item) {
  return [...array, item]; // New array
}

function updateUser(user, changes) {
  return { ...user, ...changes }; // New object
}

// ❌ BAD - Mutation
function addItem(array, item) {
  array.push(item); // Mutates original!
  return array;
}
```

---

## ⚡ Performance

### **Data Structures**

Choose the right tool:

- **Array**: Ordered data, iteration
- **Map**: Key-value lookups (O(1)), any key type
- **Set**: Unique values, membership checks (O(1))
- **Object**: String keys only, legacy code

```javascript
// ✅ GOOD - Use Map for lookups
const userCache = new Map();
userCache.set(userId, userData); // O(1)
const user = userCache.get(userId); // O(1)

// ❌ BAD - Array for lookups
const users = [];
users.push({ id: userId, data: userData });
const user = users.find((u) => u.id === userId); // O(n)
```

### **Avoid Premature Optimization**

1. **Write clear code first**
2. **Profile to find bottlenecks**
3. **Optimize hot paths only**

```javascript
// ✅ Start here (clear, correct)
function findExpensiveItems(items) {
  return items.filter((item) => item.price > 100);
}

// ⚠️ Only optimize if profiling shows this is slow
```

---

## 🧪 Testing

### **Testable Code**

```javascript
// ❌ BAD - Hard to test (tight coupling)
function processUser() {
  const user = database.getCurrentUser(); // Global dependency!
  sendEmail(user.email); // Side effect!
}

// ✅ GOOD - Easy to test (dependency injection)
function processUser(user, emailService) {
  emailService.send(user.email);
}

// Test
it('processes user', () => {
  const mockEmail = { send: jest.fn() };
  processUser({ email: 'test@example.com' }, mockEmail);
  expect(mockEmail.send).toHaveBeenCalledWith('test@example.com');
});
```

### **Test Coverage**

- **Critical paths**: 100% coverage required
- **New code**: 80%+ coverage required
- **Legacy code**: Improve gradually

---

## 📚 Related Documentation

- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) - Overall development standards
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [lib/README.md](../../lib/README.md) - Module documentation

---

**Summary**: Write code that is **clear, maintainable, and testable**. When in
doubt, prefer simplicity over cleverness, and always optimize for the next
developer who reads your code (probably you in 6 months).

**Status**: ✅ Active and enforced via ESLint, code review, and CI/CD
