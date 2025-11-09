# UI-504: WebSocket Integration (P1) ✅

**Status**: completed (Build 602) | **Priority**: P1 (Important - Performance & UX)
**Effort**: 2-3 days | **Risk**: Medium

## Problem

Replace HTTP polling with WebSocket for real-time device/scene state updates.
**Current Problem**:

- App polls every 5s for device state
- Device cards poll every 200ms for metrics
- Inefficient, creates unnecessary load
- Slight delay in seeing state changes
- Flashing during updates
  **Implementation Plan**:

1. Add WebSocket server to Express backend (ws library)
2. Broadcast state changes to all connected clients:
   - Device state changes (scene switches)
   - Metrics updates (FPS, frametime)
   - Scene lifecycle events (start, stop, complete)
3. Create Vue composable `useWebSocket()`:
   - Auto-connect on page load
   - Auto-reconnect on disconnect
   - Integrate with Pinia stores
4. Add connection status indicator in header
5. Keep polling as fallback for compatibility
6. Add heartbeat/ping-pong (30s interval)
   **Message Types**:

```javascript
// Initial connection
{ type: 'init', data: { devices: [...], scenes: [...] } }
// State updates
{ type: 'device_update', deviceIp: '...', data: {...} }
{ type: 'scene_switch', deviceIp: '...', scene: '...' }
{ type: 'metrics_update', deviceIp: '...', metrics: {...} }
// Heartbeat
{ type: 'ping' } / { type: 'pong' }
```

**Acceptance Criteria**:

- [ ] WebSocket connection on page load
- [ ] Real-time updates (< 100ms latency)
- [ ] Auto-reconnect on disconnect (5s backoff)
- [ ] Connection status indicator (green/yellow/red dot)
- [ ] Polling disabled when WebSocket connected
- [ ] Smooth updates without flashing
- [ ] Multiple clients stay synchronized
      **Benefits**:
- **Performance**: Eliminate polling overhead
- **UX**: Instant updates, smoother experience
- **Scalability**: Better for multiple devices
- **Battery**: Less network activity on mobile
