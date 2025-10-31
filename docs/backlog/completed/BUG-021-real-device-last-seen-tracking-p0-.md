# BUG-021: Real Device "Last Seen" Tracking (P0) ✅

**Status**: completed (Build 603) | **Priority**: P0 (Critical - User requested 3x!)
**Effort**: 1 hour | **Risk**: Low

## Problem

Track and display when real hardware device last gave definitive ACK.
**Implementation**:

- `lib/device-adapter.js:209-215`: Added `lastSeenTs` to metrics
- `lib/device-adapter.js:312-316`: Set `lastSeenTs` only on real hardware ACK
- `web/frontend/src/components/DeviceCard.vue:536-565`: Display relative time next to IP
  **Features**:
- ✅ Real device shows accurate "last seen" timestamp
- ✅ Mock device shows "N/A"
- ✅ Updates in real-time via WebSocket (event-driven)
- ✅ Positioned next to IP in device card header
- ✅ User-friendly format: "Just now", "3s ago", "5m ago", "2h ago"
- ✅ Shows "Never" if real device has no ACK yet
- ✅ Only tracks REAL hardware responses (not mock)
