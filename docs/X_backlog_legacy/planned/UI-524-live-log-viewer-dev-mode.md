# UI-524: Live Log Viewer for Dev Mode

**Status**: Planned | **Priority**: P2 (Developer Experience)
**Effort**: 1-2 days | **Risk**: Low
**Owner**: TBD

## User Story

As a developer debugging PIDICON, I want to see live daemon and UI logs in a searchable web interface so that I can
troubleshoot issues without SSH access to the server.

## Problem

Currently, the Logs tab in dev mode shows only placeholder content with instructions to SSH into the server and use
`docker logs -f`. This is inconvenient for:

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

## Goal

Transform the Logs tab into a fully functional live log viewer with:

1. **Live streaming** of daemon logs via WebSocket
2. **Source filtering** (daemon vs UI logs)
3. **Level filtering** (error, warn, info, debug)
4. **Text search** with highlighting
5. **Color coding** by log level
6. **Auto-scroll** with pause capability
7. **Log history buffer** (last 500-1000 entries)

## Tasks

### Phase 1: MVP (Core Features)

- [ ] **Backend: Log Capture & Streaming**
  - [ ] Hook `logger.setOutput()` in `web/server.js` to capture daemon logs
  - [ ] Create circular buffer to store last 500-1000 log entries
  - [ ] Add WebSocket message type `log_entry` for streaming logs
  - [ ] Send buffer history to new WebSocket clients on connection
  - [ ] Test log throughput with high-volume scenarios

- [ ] **Frontend: Log Display (`Logs.vue`)**
  - [ ] Remove placeholder content and SSH instructions
  - [ ] Create scrollable log container with virtualized rendering (if needed)
  - [ ] Implement auto-scroll to bottom (with pause on manual scroll up)
  - [ ] Add clear logs button
  - [ ] Display timestamp, level, source, and message for each entry

- [ ] **Frontend: Filtering**
  - [ ] Wire up Daemon/UI filter chips to actually filter displayed logs
  - [ ] Add level filter (error, warn, info, debug) - checkboxes or chips
  - [ ] Implement client-side filtering logic
  - [ ] Show log count per active filter

- [ ] **Frontend: Search**
  - [ ] Add search input field with clear button
  - [ ] Implement text search with case-insensitive matching
  - [ ] Highlight matching text in log entries
  - [ ] Add prev/next navigation for search results

- [ ] **Frontend: Visual Polish**
  - [ ] Color code by level (error=red, warn=yellow, info=blue, debug=gray)
  - [ ] Format timestamps consistently
  - [ ] Monospace font for log messages
  - [ ] Compact metadata display (collapsible if needed)

### Phase 2: Advanced Features (Optional)

- [ ] **Global Daemon Log Level Control**
  - [ ] Add API endpoint `PUT /api/system/log-level` to change daemon log level
  - [ ] Add dropdown in Logs tab header to set global log level
  - [ ] Persist log level preference using UI preferences system (see [UI-787](../in-progress/UI-787-professional-ui-preferences-persistence.md))
  - [ ] Show current log level in UI

- [ ] **UI Error Capture**
  - [ ] Intercept `console.error/warn` in UI and send to log stream
  - [ ] Tag with `source: 'ui'` for filtering
  - [ ] Auto-capture toast notifications
  - [ ] Include browser info (user agent, viewport size)

- [ ] **Export & Download**
  - [ ] Add export button to download logs as `.txt` or `.json`
  - [ ] Include active filters in export
  - [ ] Add timestamp range selection

- [ ] **Advanced Search**
  - [ ] Regex search support (with validation)
  - [ ] Filter by device IP or scene name
  - [ ] Time-based filtering (last hour, today, custom range)

## Technical Considerations

### Log Volume Management

- Use circular buffer to limit memory usage (~1MB for 1000 entries)
- Consider virtualized scrolling if >1000 entries displayed
- Throttle WebSocket messages if log rate exceeds reasonable threshold

### Performance

- Client-side filtering/search avoids server round-trips
- Virtualized rendering prevents DOM bloat
- WebSocket already established, minimal latency overhead

### Security

- Logs tab only accessible in dev mode (dev mode toggle exists)
- Logs may contain sensitive data (IPs, scene names) - acceptable for dev tool
- Consider adding notice that logs are not persisted

## Tests

- [ ] Verify log streaming works for all log levels
- [ ] Test filtering with various combinations
- [ ] Test search with special characters and edge cases
- [ ] Verify auto-scroll behavior
- [ ] Test with high log volume (100+ logs/second)
- [ ] Verify UI error capture (if implemented)
- [ ] Test WebSocket reconnection after connection loss
- [ ] Verify log history buffer works for late-joining clients

## Dependencies

- Existing WebSocket infrastructure in `web/server.js`
- Logger module in `lib/logger.js`
- Dev mode store in `web/frontend/src/store/dev-mode.js`

## Notes

- **Separation of Concerns**: Per-device scene logging controls (debug/warning/silent on device cards) control
  scene-specific output. This log viewer shows global daemon logs. These are complementary features.
- **Future Enhancement**: Could add tab/dropdown to switch between "All Logs" and per-device filtered views.
- **Potential Issue**: Very verbose scenes could flood the log viewer. Consider rate limiting or scene-specific muting.
- **UI Polish**: Consider adding timestamp formatting options (relative vs absolute).

## Success Criteria

- Developer can view live daemon logs without SSH access
- Search finds logs within 100ms for typical log volume
- Filtering updates instantly (client-side)
- No performance degradation with 1000+ log entries
- Clear visual distinction between log levels
- Auto-scroll works intuitively (pauses on user scroll)
