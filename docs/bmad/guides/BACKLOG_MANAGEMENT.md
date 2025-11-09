# Backlog Management Guide

This guide explains the folder-based backlog management system for PIDICON.

## Overview

Each backlog item has its own markdown file organized by status in `docs/backlog/`. This makes items easier to find, update, and track through their lifecycle.

## Folder Structure

```
docs/backlog/
├── planned/        # Not started items
├── in-progress/    # Active work
├── completed/      # Done items
└── cancelled/     # Rejected/postponed items
```

## File Naming

Files use the pattern: `{ID}-{slugified-title}.md`

Examples:

- `OPS-413-awtrix-reboot-control.md`
- `UI-781-awtrix-frametime-palette-alignment.md`
- `SYS-415-smart-release-checker-caching.md`

## Item Template

Each backlog item file follows this structure:

```markdown
# {ID}: {Title}

**Status**: {Status} | **Priority**: {Priority}
**Effort**: {Effort} | **Risk**: {Risk}
**Owner**: {Owner}

## User Story (optional)

As a [persona], I want [feature] so that [business value]
_(Only include if naturally identifiable)_

## Problem

...

## Goal

...

## Tasks

...

## Tests

...

## Notes

...
```

## Managing Items

### Creating New Items

1. Determine status (usually `planned/`)
2. Create file: `{ID}-{slugified-title}.md`
3. Use template above
4. Add user story if applicable

### Moving Items Between States

Move the file to the appropriate folder:

- `planned/` → `in-progress/` when starting work
- `in-progress/` → `completed/` when done
- `planned/` → `cancelled/` if rejecting
- Update status field in file metadata

### Finding Items

- Check `docs/backlog/README.md` for overview
- Browse folders by status
- Search by ID or filename

## Quick Reference

- **All items**: `docs/backlog/`
- **Active work**: `docs/backlog/in-progress/`
- **Done items**: `docs/backlog/completed/`
- **Overview**: `docs/backlog/README.md`
