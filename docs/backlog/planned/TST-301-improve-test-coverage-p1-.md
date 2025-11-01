# TST-301: Improve Test Coverage (P1) 🟡

**Status**: Planned | **Priority**: P1 (Quality & Maintainability)
**Effort**: 3-5 days | **Risk**: Low

## Problem

Increase test coverage to 80%+ for all critical modules.
**Current Status**:

- Total tests: 152/152 passing
- Estimated coverage: ~65%
- Critical modules: Good coverage
- Edge cases: Some gaps
- Integration tests: Good
- E2E tests: Manual only
  **Coverage Goals**:

  | Module             | Current | Target | Priority |
  | ------------------ | ------- | ------ | -------- |
  | scene-manager.js   | ~70%    | 85%+   | High     |
  | device-adapter.js  | ~75%    | 85%+   | High     |
  | scene-framework.js | ~60%    | 80%+   | Medium   |
  | graphics-engine.js | ~80%    | 85%+   | Medium   |
  | mqtt-service.js    | ~75%    | 85%+   | High     |
  | command-handlers   | ~80%    | 85%+   | Medium   |
  | web/server.js      | ~50%    | 75%+   | Medium   |

  **Implementation Plan**:

1. Add c8 (Istanbul) for coverage reporting
2. Run coverage analysis: `npm run coverage`
3. Identify untested code paths
4. Write unit tests for gaps:
   - Error handling paths
   - Edge cases (empty arrays, null values)
   - Boundary conditions
5. Add integration tests:
   - Multi-device scenarios
   - Concurrent scene switches
   - MQTT reconnection
6. Add coverage gates to CI/CD:
   - Fail if coverage < 80%
   - Require tests for new code
     **Acceptance Criteria**:

- [ ] Overall coverage: 80%+
- [ ] Critical modules: 85%+
- [ ] Coverage report in CI/CD
- [ ] All edge cases tested
- [ ] Clear coverage badges in README
