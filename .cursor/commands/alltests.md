🚀 Kick off all automated test suites

```bash
echo "✨ Starting full test refresh..." && \
  npm run test:report && \
  npm run ui:test:report && \
  echo "✅ All test results refreshed — open the Diagnostics tab for the latest statuses!"
```

📝 This command regenerates `data/test-results/node-tests.json` and `data/test-results/playwright-tests.json`, keeping the dashboard in sync.
