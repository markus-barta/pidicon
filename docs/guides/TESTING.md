# Testing Overview

This document explains how diagnostic tests (runtime health checks) and automated tests (unit, integration, contract, UI) work together for the PIDICON project.

## Test Types

### Diagnostic Tests (runtime)

- Defined in `lib/services/diagnostics-service.js`
- Run against the live daemon to verify health signals
- Categories include `system`, `device`, `mqtt`
- Exposed at `/api/tests` and runnable from the Diagnostics Dashboard (UI)
- Each test exposes `{ id, name, description, category, runnable, latest }`
- `latest` includes status (`green`, `yellow`, `red`), message, details, duration, timestamp
- Test IDs use category-specific prefixes: `SD-` (System), `DD-` (Device), `MD-` (MQTT)

### Automated Tests (development)

- **Node.js test suite** in `test/` directory
  - `test/lib/*.test.js` → unit tests (`unit-tests`) → ID prefix `UT-`
  - `test/integration/*.test.js` → integration tests (`integration-tests`) → ID prefix `IT-`
  - `test/contracts/*.test.js` → contract tests (`contract-tests`) → ID prefix `CT-`
- **Playwright UI tests** in `ui-tests/` directory → ID prefix `UI-`
- Run locally or in CI via `npm test` (Node.js) or `npm run ui:test` (Playwright)
- Results saved to `data/test-results/node-tests.json` and `data/test-results/playwright-tests.json`
- Parsed by `lib/services/test-results-parser.js` and merged into `/api/tests` response
- Read-only in the Diagnostics Dashboard (no run button)

## Test ID System

All tests have stable, short IDs with category-specific prefixes:

| Category           | Prefix | Example         | Source                                |
| ------------------ | ------ | --------------- | ------------------------------------- |
| System Diagnostics | `SD-`  | `SD-1`, `SD-2`  | `lib/services/diagnostics-service.js` |
| Device Diagnostics | `DD-`  | `DD-1`, `DD-2`  | `lib/services/diagnostics-service.js` |
| MQTT Diagnostics   | `MD-`  | `MD-1`          | `lib/services/diagnostics-service.js` |
| Unit Tests         | `UT-`  | `UT-1`, `UT-42` | `test/lib/*.test.js`                  |
| Integration Tests  | `IT-`  | `IT-1`, `IT-23` | `test/integration/*.test.js`          |
| Contract Tests     | `CT-`  | `CT-1`, `CT-15` | `test/contracts/*.test.js`            |
| UI Tests           | `UI-`  | `UI-1`, `UI-8`  | `ui-tests/**/*.spec.ts`               |

Test IDs are:

- **Stable** - generated from hash of (file path + test name)
- **Sequential** - numbered per category
- **Persistent** - stored in `data/test-registry.json`

## Updating Automated Test Results

### Node.js Tests

Run tests and save results:

```bash
npm run test:report
```

This executes the test suite and outputs results to `data/test-results/node-tests.json`. The Diagnostics UI will display one row per test with:

- Short ID (e.g., `UT-42`)
- Test name
- File path and suite hierarchy
- Status (passed/failed/pending)
- Last run time and duration
- Failure details if applicable

### Playwright UI Tests

Run UI tests with results:

```bash
npm run ui:test:report
```

This executes Playwright tests and outputs results to `data/test-results/playwright-tests.json`.

> Test result files are ignored in Git (`data/test-results/*.json`) to avoid churn—regenerate locally whenever needed.

## Adding New Tests

### Diagnostic Test

1. Add entry to `DEFAULT_TESTS` in `lib/services/diagnostics-service.js`
2. Assign unique `id` (e.g., `'my-diagnostic'`)
3. Include `category` (`system`, `device`, or `mqtt`), `type: 'diagnostic'`, and `runnable: true`
4. Implement `run()` function that returns `{ status, message, details }`
5. Test ID will be auto-assigned based on category (e.g., `SD-4`, `DD-3`, `MD-2`)

### Unit/Integration/Contract Test

1. Create test file in appropriate subdirectory:
   - Unit: `test/lib/my-feature.test.js`
   - Integration: `test/integration/my-flow.test.js`
   - Contract: `test/contracts/my-api.test.js`
2. Write Node.js test cases using `node:test` API
3. Run `npm run test:report` to generate results
4. Confirm results appear in Diagnostics UI under expected category with correct ID prefix

### UI Test

1. Create test file in `ui-tests/` directory (e.g., `ui-tests/my-feature.spec.ts`)
2. Write Playwright test cases
3. Run `npm run ui:test:report` to generate results
4. Confirm results appear in Diagnostics UI with `UI-` prefix

## Diagnostics Dashboard Features

- **Grouped sections** by category with colored status indicators (● 3 passed ● 2 failed ● 0 pending)
- **Search** across ID, name, description, latest message
- **Short IDs** for easy reference (e.g., `UT-42`, `SD-1`)
- **Run buttons** only for diagnostic tests (automated tests show last run results)
- **Details modal** shows metadata, last run information, structured details, and failure messages
- **Status dots** with colors: green (passed), red (failed), yellow (pending/skipped)

## Test Results Parser

The `TestResultsParser` service (`lib/services/test-results-parser.js`) handles:

- Reading JSON files from `data/test-results/` directory
- Parsing Node.js TAP output and Playwright JSON format
- Generating stable test IDs using hash + registry
- Normalizing status values to green/yellow/red
- Maintaining test registry in `data/test-registry.json`

## Troubleshooting

- **Diagnostics returning Unknown**: ensure `run()` returns valid status and `latest` persisted in state store
- **Automated tests missing**: verify result files exist in `data/test-results/` and check parser logs for warnings
- **Duplicate or changing test IDs**: test registry may be corrupted; delete `data/test-registry.json` to regenerate
- **Test not appearing in UI**: ensure category matches expected values and test ran successfully
- **Time display incorrect**: check system clock and timestamp formatting
