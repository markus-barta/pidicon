# Backlog Management

This directory contains all backlog items organized by status.

## Structure

- **[planned/](./planned/)** - Items not yet started
- **[in-progress/](./in-progress/)** - Active work items
- **[completed/](./completed/)** - Finished items
- **[cancelled/](./cancelled/)** - Rejected or postponed items

## Quick Stats

- **Planned**: 20 items
- **In Progress**: 7 items
- **Completed**: 61 items
- **Cancelled**: 3 items
- **Total**: 91 items

## File Naming

Each item is stored as: `{ID}-{slugified-title}.md`

Examples:

- `OPS-413-awtrix-reboot-control.md`
- `UI-781-awtrix-frametime-palette-alignment.md`
- `SYS-415-smart-release-checker-caching.md`

## Item Structure

Each backlog item file follows this template:

```markdown
# {ID}: {Title}

**Status**: {Status} | **Priority**: {Priority}
**Effort**: {Effort} | **Risk**: {Risk}
**Owner**: {Owner}

## User Story (optional)

As a [persona], I want [feature] so that [business value]

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

### Finding Items

- Browse folders by status
- Search by ID or filename
- Use your editor's search to find content

### Moving Items Between States

Simply move the file to the appropriate folder:

- `planned/` → `in-progress/` when starting work
- `in-progress/` → `completed/` when done
- `planned/` → `cancelled/` if rejecting

Update the **Status** field in the file metadata accordingly.

### Creating New Items

1. Determine appropriate status (usually `planned/`)
2. Create file: `{ID}-{slugified-title}.md`
3. Use template above
4. Add user story if applicable

## Guide

See [BACKLOG_MANAGEMENT.md](../guides/BACKLOG_MANAGEMENT.md) for complete guide on the backlog management system.
