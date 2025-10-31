# UI-784: Global Settings Copy & Styling

**Status**: In Progress (2025-10-21) – UI copy refreshed, slider restyled like device cards, unified defaults | **Priority**: P2 (Nice to Have)
**Effort**: 3-4 hours | **Owner**: mba

## Problem

Global settings form has redundant labels ("Default driver"/"Default brightness") and inconsistent
styling versus device cards.

## Goal

Simplify copy, add explanatory sentence, and align slider design with device card presentation.

## Tasks

1. Remove redundant headings, add single explanatory paragraph for defaults.
2. Reuse device card slider styles and icons.
3. Ensure layout responsive across breakpoints.

## Tests

- UI: Playwright snapshot/assert for text copy and slider class names.
