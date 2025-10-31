# UI-786: Global MQTT Status Detail Panel

**Status**: In Progress (2025-10-21) – Detailed MQTT status card implemented in settings panel. Awaiting | **Priority**: P2 (Nice to Have)
**Effort**: 2-3 hours | **Owner**: mba

## Problem

Global settings page shows basic MQTT status text without exposing retry/error metadata.

## Goal

Render detailed status summary (connected, last error, retry count, next retry) using `mqttStatusDetails`.

## Tasks

1. Extend settings view to show structured status block.
2. Reuse tooltip/formatting utilities for consistency.

## Tests

- UI: Playwright verifying status block updates with mocked API responses.
