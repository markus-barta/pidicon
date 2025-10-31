# UI-782: MQTT Header Tooltip Detail

**Status**: Completed (2025-10-21) | **Priority**: P1 (Important)
**Effort**: 2-3 hours | **Owner**: mba

## Problem

Header shows only online/offline indicator; troubleshooting requires full `mqttStatusDetails`
context.

## Goal

Provide a tooltip summarizing connection state, last error, retry counters, next retry timing.

## Tasks

1. Render tooltip content derived from `mqttStatusDetails` with human-readable formatting.
2. Ensure accessibility (keyboard focus + aria) and responsive layout.
3. Localize copy hooks for future i18n.

## Tests

- Unit: tooltip formatter utility (if extracted).
- UI: Playwright hover/assert verifying tooltip contents update with mocked status.
