# Testing Overview

This document explains how diagnostic tests (runtime health checks) and automated tests (unit, integration, contract) work together for the PIDICON project.

## Test Types

### Diagnostic Tests (runtime)

- Defined in `lib/services/diagnostics-service.js`
- Run against the live daemon to verify health signals
- Categories include `system`, `device`, `integration`, `mqtt`
- Exposed at `/api/tests` and runnable from the Test Dashboard (UI)
- Each test exposes `{ id, name, description, category, runnable, latest }`
- `latest` includes status (`green`, `yellow`, `red`), message, details, duration, timestamp

### Automated Tests (development)

- Node test suite in `test/` directory
  - `test/lib` → unit tests (`unit-tests`)
  - `test/integration` → integration tests (`integration-tests`)
  - `test/contracts` → contract tests (`contract-tests`)
- Run locally or in CI via `npm test`
- Results saved to `coverage/test-results.json` using Jest JSON reporter configuration in `package.json`
- Parsed by `lib/services/test-results-parser.js` and merged into `/api/tests` response
- Read-only in the Test Dashboard (no run button)

## Updating Automated Test Results

To refresh the dashboard with latest automated test outcomes:

```bash
npm run test:with-results
```

This runs the test suite and regenerates `coverage/test-results.json`. The web UI will display one row per Jest assertion with:

- ID (hash-based)
- Name (test title)
- Description (suite hierarchy + file path)
- Status, last run time, duration
- Failure detail if applicable

> The results file is ignored in Git (`coverage/test-results.json`) to avoid churn—regenerate locally whenever needed.

## Adding New Tests

### Diagnostic Test

1. Add entry to `DEFAULT_TESTS` in `lib/services/diagnostics-service.js`
2. Include `category`, `type: 'diagnostic'`, and `runnable: true`
3. Return `{ status, message, details }`
4. Optionally add metadata in details for UI display

### Automated Test

1. Create file in appropriate subdirectory under `test/`
2. Write Jest test case(s)
3. Run `npm run test:with-results`
4. Confirm results appear in UI under expected category

## Test Dashboard Features

- Grouped sections by category with pass/fail/pending counts
- Search across ID, name, description, latest message
- Diagnostic tests can be executed individually or via "Run All Diagnostics"
- "Details" modal shows metadata, last run information, structured details, and failure messages

## Troubleshooting

- Diagnostics returning `Unknown` or missing statuses: ensure `run()` returns valid status and `latest` persisted in state store
- Automated tests missing: verify `coverage/test-results.json` exists and parser log for warnings
- Time display appears incorrect: check system clock and timestamp formatting
