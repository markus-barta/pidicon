# Story 2.2: Live Log Viewer

**Story ID:** 2-2-live-log-viewer  
**Epic:** Epic 2 - Configuration & Observability  
**Status:** Backlog  
**Priority:** P2  
**Points:** 3  
**Owner:** mba

---

## User Story

As a **developer debugging PIDICON**,  
I want **to see live daemon and UI logs in a searchable web interface**,  
So that **I can troubleshoot issues without SSH access to the server**.

---

## Context

Currently, the Logs tab in dev mode shows only placeholder content with instructions to SSH into the server and use `docker logs -f`. This is inconvenient for:

- Debugging production issues without SSH access
- Correlating UI behavior with daemon logs
- Searching through historical log entries
- Monitoring log levels in real-time

The infrastructure is partially in place:

- ✅ Logs tab visible in dev mode
- ✅ WebSocket connection already established
- ✅ Logger has `setOutput()` for capturing logs
- ✅ Filter toggles (Daemon/UI) in UI
- ⚠️ Per-device scene logging controls exist but are separate from global daemon logging

---

## Acceptance Criteria

### AC1: Backend - Log Capture & Streaming

- [ ] Hook `logger.setOutput()` in `web/server.js` to capture daemon logs
- [ ] Create circular buffer to store last 500-1000 log entries
- [ ] Add WebSocket message type `log_entry` for streaming logs
- [ ] Send buffer history to new WebSocket clients on connection
- [ ] Handle high log volume (>100 logs/second) without performance degradation

### AC2: Frontend - Log Display (`Logs.vue`)

- [ ] Remove placeholder content and SSH instructions
- [ ] Create scrollable log container with virtualized rendering (if >1000 entries)
- [ ] Implement auto-scroll to bottom (with pause on manual scroll up)
- [ ] Add clear logs button
- [ ] Display timestamp, level, source, and message for each entry

### AC3: Frontend - Source & Level Filtering

- [ ] Wire up Daemon/UI filter chips to actually filter displayed logs
- [ ] Add level filter: error, warn, info, debug (checkboxes or chips)
- [ ] Implement client-side filtering logic
- [ ] Show log count per active filter
- [ ] Persist filter preferences (using UI preferences system from UI-787)

### AC4: Frontend - Text Search

- [ ] Add search input field with clear button
- [ ] Implement text search with case-insensitive matching
- [ ] Highlight matching text in log entries
- [ ] Add prev/next navigation for search results
- [ ] Show match count (e.g., "5 of 42 matches")

### AC5: Frontend - Visual Polish

- [ ] Color code by level (error=red, warn=yellow, info=blue, debug=gray)
- [ ] Format timestamps consistently (relative or absolute time)
- [ ] Monospace font for log messages
- [ ] Compact metadata display (collapsible if needed)
- [ ] Responsive layout for different screen sizes

### AC6: Log History Buffer Management

- [ ] Implement circular buffer with configurable size (default 1000)
- [ ] Auto-trim old entries when buffer full
- [ ] Track buffer utilization in metrics
- [ ] Display buffer status in UI (e.g., "showing 1000 of 2456 total")

### AC7: Auto-scroll Behavior

- [ ] Auto-scroll to bottom when new logs arrive
- [ ] Pause auto-scroll on manual scroll up
- [ ] Resume auto-scroll on scroll to bottom
- [ ] Show "New Logs" badge when paused and logs arrive
- [ ] Add "Jump to Bottom" button when paused

---

## Phase 2: Advanced Features (Optional - Defer)

### Optional AC8: Global Daemon Log Level Control

- [ ] Add API endpoint `PUT /api/system/log-level`
- [ ] Add dropdown in Logs tab to set global log level
- [ ] Persist log level preference
- [ ] Show current log level in UI

### Optional AC9: UI Error Capture

- [ ] Intercept `console.error/warn` in UI
- [ ] Send UI errors to log stream with `source: 'ui'` tag
- [ ] Auto-capture toast notifications
- [ ] Include browser info (user agent, viewport size)

### Optional AC10: Export & Download

- [ ] Add export button to download logs as `.txt` or `.json`
- [ ] Include active filters in export
- [ ] Add timestamp range selection
- [ ] Generate filename with timestamp

### Optional AC11: Advanced Search

- [ ] Regex search support (with validation)
- [ ] Filter by device IP or scene name
- [ ] Time-based filtering (last hour, today, custom range)
- [ ] Save search presets

---

## Technical Design

### Backend Architecture

```javascript
// Circular buffer for log storage
class LogBuffer {
  constructor(maxSize = 1000) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.totalCount = 0;
  }

  push(logEntry) {
    this.buffer.push(logEntry);
    this.totalCount++;
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getAll() {
    return this.buffer;
  }
}

// WebSocket log streaming
wss.on('connection', (ws) => {
  // Send buffer history on connect
  ws.send(
    JSON.stringify({
      type: 'log_history',
      logs: logBuffer.getAll(),
    })
  );
});

// Hook logger output
logger.setOutput((level, message, meta) => {
  const logEntry = {
    timestamp: Date.now(),
    level,
    source: 'daemon',
    message,
    meta,
  };
  logBuffer.push(logEntry);
  broadcastLog(logEntry);
});
```

### Frontend Architecture

```vue
<!-- Logs.vue -->
<template>
  <div class="logs-container">
    <div class="logs-toolbar">
      <input v-model="searchQuery" placeholder="Search logs..." />
      <div class="filter-chips">
        <chip @click="toggleFilter('error')">Error ({{ errorCount }})</chip>
        <chip @click="toggleFilter('warn')">Warn ({{ warnCount }})</chip>
        <chip @click="toggleFilter('info')">Info ({{ infoCount }})</chip>
        <chip @click="toggleFilter('debug')">Debug ({{ debugCount }})</chip>
      </div>
      <button @click="clearLogs">Clear</button>
    </div>

    <div ref="logContainer" class="log-entries">
      <virtual-scroll :items="filteredLogs" :item-height="24">
        <log-entry
          v-for="log in filteredLogs"
          :key="log.id"
          :log="log"
          :highlight="searchQuery"
        />
      </virtual-scroll>
    </div>

    <div v-if="!isAutoScroll" class="new-logs-badge">
      <button @click="scrollToBottom">↓ New Logs ({{ newLogCount }})</button>
    </div>
  </div>
</template>
```

---

## Tasks

### Task 1: Backend - Log Capture (3h)

- [ ] 1.1: Implement `LogBuffer` circular buffer class
- [ ] 1.2: Hook logger output in `web/server.js`
- [ ] 1.3: Add WebSocket `log_entry` message type
- [ ] 1.4: Send buffer history on client connection
- [ ] 1.5: Test with high log volume (stress test)

### Task 2: Frontend - Log Display Component (4h)

- [ ] 2.1: Remove placeholder content from `Logs.vue`
- [ ] 2.2: Create `LogEntry` component with timestamp, level, message
- [ ] 2.3: Implement virtual scrolling (if needed for performance)
- [ ] 2.4: Add auto-scroll logic with pause on manual scroll
- [ ] 2.5: Style with color coding per log level

### Task 3: Frontend - Filtering (2h)

- [ ] 3.1: Implement client-side filter logic
- [ ] 3.2: Wire up filter chips to toggle filters
- [ ] 3.3: Add log count per level
- [ ] 3.4: Persist filter preferences
- [ ] 3.5: Test filter combinations

### Task 4: Frontend - Search (3h)

- [ ] 4.1: Add search input with clear button
- [ ] 4.2: Implement case-insensitive text search
- [ ] 4.3: Highlight matching text in log entries
- [ ] 4.4: Add prev/next navigation
- [ ] 4.5: Show match count

### Task 5: Frontend - Polish & UX (2h)

- [ ] 5.1: Format timestamps (relative vs absolute)
- [ ] 5.2: Monospace font for messages
- [ ] 5.3: "Jump to Bottom" button
- [ ] 5.4: "New Logs" badge when paused
- [ ] 5.5: Responsive layout

### Task 6: Testing (3h)

- [ ] 6.1: Unit tests for LogBuffer
- [ ] 6.2: Unit tests for filter logic
- [ ] 6.3: Unit tests for search logic
- [ ] 6.4: E2E tests for log viewer UI
- [ ] 6.5: Performance tests with 1000+ logs

### Task 7: Documentation (1h)

- [ ] 7.1: Update developer guide
- [ ] 7.2: Add troubleshooting section
- [ ] 7.3: Document log entry format
- [ ] 7.4: Add screenshots to docs

**Total Estimated Effort:** ~18 hours (~2-3 days)

---

## Testing Strategy

### Unit Tests

- LogBuffer: push, overflow, getAll
- Filter logic: combinations, edge cases
- Search: case-insensitive, special chars
- Auto-scroll: pause/resume logic

### Integration Tests

- WebSocket log streaming
- Buffer history on connection
- High log volume (>100/second)
- WebSocket reconnection

### E2E Tests (Playwright)

- Log viewer displays logs
- Filtering works (daemon/UI, levels)
- Search finds and highlights text
- Auto-scroll pauses on scroll up
- Clear logs button works
- Filter preferences persist

### Performance Tests

- Render 1000 logs without lag
- Virtual scrolling with 10,000 logs
- Search across 1000 logs < 100ms
- Filter update < 50ms

---

## Dependencies

- Existing WebSocket infrastructure
- Logger module (`lib/logger.js`)
- Dev mode store (`web/frontend/src/store/dev-mode.js`)
- UI preferences system (from UI-787)

---

## Risks & Mitigations

| Risk                               | Impact | Probability | Mitigation                         |
| ---------------------------------- | ------ | ----------- | ---------------------------------- |
| Log flooding causes UI lag         | High   | Medium      | Virtual scrolling, rate limiting   |
| Memory leak from buffer            | Medium | Low         | Circular buffer with max size      |
| Verbose scenes flood logs          | Medium | High        | Consider per-scene muting controls |
| WebSocket disconnection loses logs | Low    | Low         | Buffer history sent on reconnect   |

---

## Success Criteria

- Developer can view live logs without SSH
- Search finds logs within 100ms
- Filtering updates instantly (client-side)
- No performance degradation with 1000+ logs
- Clear visual distinction between log levels
- Auto-scroll works intuitively
- All tests passing

---

## Notes

**Separation of Concerns:** Per-device scene logging controls (debug/warning/silent on device cards) control scene-specific output. This log viewer shows global daemon logs. These are complementary features.

**Future Enhancement:** Could add tab/dropdown to switch between "All Logs" and per-device filtered views.

**Potential Issue:** Very verbose scenes could flood the log viewer. Consider rate limiting or scene-specific muting.

**UI Polish:** Consider adding timestamp formatting options (relative vs absolute).

---

## Change Log

| Date       | Author | Change                      |
| ---------- | ------ | --------------------------- |
| 2025-11-09 | Bob/SM | Created from backlog UI-524 |
