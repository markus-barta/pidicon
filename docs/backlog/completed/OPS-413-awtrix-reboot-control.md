# OPS-413: AWTRIX Reboot Control

**Status**: Completed (2025-10-21) | **Priority**: P1 (Important)
**Effort**: 4-6 hours | **Owner**: mba

## Problem

The AWTRIX device action labeled "Reset" only refreshes the UI scene and never triggers a hardware
reboot, so hung firmware remains stuck.

## Goal

Invoke the official AWTRIX reboot command when requested and align UI wording/feedback.

## Tasks

1. Implement reboot via MQTT API (`command` topic `{ "cmd": "reboot" }`).
2. Update device service + driver wiring with logging and mock support.
3. Rename UI control to "Reboot" with AWTRIX-specific confirmation text.
4. Add backend + Playwright tests covering reboot dispatch and UI copy.

## Tests

- Unit: driver/device service MQTT payload emission (mock mqtt client).
- UI: Device card Playwright spec verifying button label + confirmation + API call.
