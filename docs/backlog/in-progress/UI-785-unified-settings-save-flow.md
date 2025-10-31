# UI-785: Unified Settings Save Flow

**Status**: In Progress (2025-10-21) – Single Save Settings CTA wired, unsaved-change pulse active. Awaiting | **Priority**: P1 (Important)
**Effort**: 4-6 hours | **Owner**: mba

## User Story

As a user, I want a single save button for all settings with visual indication of unsaved changes, so that I don't accidentally leave configuration incomplete.

## Problem

Separate "Save" buttons for global and MQTT lead to confusion; unsaved changes are not visible.

## Goal

Merge into single "Save settings" action with unsaved-change indicator.

## Tasks

1. Consolidate API payload to handle both global + MQTT settings.
2. Implement change detection to pulse/glow button until saved.
3. Handle success/error toasts with merged messaging.

## Tests

- Unit: settings store change detector.
- UI: Playwright verifying button pulse on change and resets after save.
