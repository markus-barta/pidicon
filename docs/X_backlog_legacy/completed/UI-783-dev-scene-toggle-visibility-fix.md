# UI-783: Dev Scene Toggle Visibility Fix

**Status**: Completed (2025-11-01) | **Priority**: P1 (Important)
**Effort**: 4-5 hours | **Owner**: mba

## Problem

Dev scenes remain hidden even when the dev toggle is enabled, blocking QA workflows.

## Goal

Wire toggle to backend/filter logic so dev-tagged scenes appear immediately and persist.

## Tasks

1. Audit scene filtering pipeline (store + API) and ensure dev scenes included when flag on.
2. Persist toggle state across reloads via store or local storage.
3. Provide visual indicator in dropdown for dev scenes.

## Tests

- Unit: scene store/filter tests verifying dev scenes included/excluded.
- UI: Playwright scenario toggling dev scenes and asserting dropdown entries.
