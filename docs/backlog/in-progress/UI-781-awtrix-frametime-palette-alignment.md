# UI-781: AWTRIX Frametime Palette Alignment

**Status**: In Progress (2025-10-21) | **Priority**: P2 (Nice to Have)
**Effort**: 2-3 hours | **Owner**: mba

## Problem

AWTRIX frametime chart renders black bars for low-duration samples, inconsistent with Pixoo palette.

## Goal

Apply Pixoo color scheme to AWTRIX frametime visualization.

## Tasks

1. Reuse Pixoo palette tokens in AWTRIX chart component.
2. Verify gradient thresholds (<=1ms vs >1ms) show proper colors.
3. Update visual regression/UI tests if required.

## Tests

- Unit: snapshot test for chart config (color mapping).
- UI: Playwright check ensuring AWTRIX frametime legend colors match tokens.
