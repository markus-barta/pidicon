# Story: BMAD Sprint Status Display Scene

**Status:** backlog

## Story

As a **PIDICON developer using BMAD methodology**,  
I want **a dedicated 64x64 pixel scene showing BMAD sprint status and workflow progress**,  
so that **I can see at a glance whether work is in progress and what stage the current sprint is at**.

## Context

With the BMAD methodology now integrated into the PIDICON development workflow, there's a need to visualize sprint progress and workflow status on the pixel display. The display has very limited space (64x64 pixels), requiring a carefully designed information-dense layout that prioritizes clarity.

## Acceptance Criteria

### AC1: Scene Creation and Registration

- [ ] Create new scene file `bmad-sprint-status.js` in `scenes/pixoo/` directory
- [ ] Scene follows PIDICON scene contract (init, render, cleanup)
- [ ] Scene is automatically discovered and registered by SceneManager
- [ ] Scene has proper metadata (name, description, category, author)

### AC2: Sprint Status Visualization

- [ ] Display clear indicator of sprint status (In Progress / Not Started / Completed / Paused)
- [ ] Use color coding for status clarity:
  - 🟢 Green = Sprint in progress
  - 🔴 Red = Sprint blocked/paused
  - 🔵 Blue = Sprint not started
  - ⚪ Gray = Sprint completed
- [ ] Status indicator must be readable at 64x64 resolution

### AC3: BMAD Workflow Stage Display

- [ ] Show current BMAD workflow stage (e.g., "Planning", "Dev", "Review", "Deploy")
- [ ] Display workflow progress indicator (e.g., step 3 of 8)
- [ ] Stage name must be abbreviated to fit pixel constraints (max 10 chars)

### AC4: Current Story Description

- [ ] Display short description of currently in-progress story
- [ ] Truncate story title to ~15-20 characters if needed (e.g., "1-2-user-auth...")
- [ ] Use 1-2 lines of text (tiny/small font, 5-8px)
- [ ] Show "No active story" when no story is in-progress
- [ ] Handle multiple in-progress stories (show first one or "Multiple")

### AC5: Story Progress Indicator

- [ ] Display count of stories: Completed / In Progress / Total
- [ ] Use visual progress bar or pie chart for story completion
- [ ] Numbers must be legible at small pixel size

### AC6: Data Source Integration

- [ ] Scene reads from `/docs/bmad/sprint-status.yaml` (when it exists)
- [ ] Gracefully handle missing sprint-status.yaml file with "No Sprint Data" message
- [ ] Parse sprint-status.yaml to extract:
  - Current sprint goal
  - Story counts by status
  - Active workflow stage
  - Sprint start/end dates
  - Current in-progress story key/title

### AC7: Scene Performance

- [ ] Scene follows pure render contract (no timers, returns delay)
- [ ] Scene updates every 30 seconds (return 30000ms delay)
- [ ] Scene uses minimal resources (no external API calls)
- [ ] Render time < 100ms

### AC8: Layout Design

- [ ] Information hierarchy optimized for 64x64 display:
  - Top: Sprint status indicator (8 pixels high)
  - Upper-Middle: Current story description (12-14 pixels, 1-2 lines)
  - Lower-Middle: Workflow stage + progress (18 pixels)
  - Bottom: Story completion metrics (18 pixels)
- [ ] Use PIDICON graphics engine drawing API
- [ ] Maintain readability on physical Pixoo 64 device

## Tasks / Subtasks

### Task 1: Scene Foundation (AC1, AC8)

- [ ] 1.1: Create `scenes/pixoo/bmad-sprint-status.js` file
- [ ] 1.2: Implement scene metadata structure
  ```javascript
  {
    name: 'bmad-sprint-status',
    description: 'BMAD Sprint & Workflow Status Display',
    category: 'development',
    wantsLoop: true,
    metadata: {
      author: 'Markus Barta',
      version: '1.0.0',
      tags: ['bmad', 'sprint', 'status', 'development']
    }
  }
  ```
- [ ] 1.3: Implement init/render/cleanup contract
- [ ] 1.4: Test scene registration and loading

### Task 2: Data Source Handler (AC6)

- [ ] 2.1: Create utility function to read `sprint-status.yaml`
- [ ] 2.2: Parse YAML using existing parsers or `js-yaml` library
- [ ] 2.3: Extract relevant fields:
  - `development_status` section → story counts AND in-progress story keys
  - `current_sprint` → sprint metadata
  - `workflow_stage` → current stage
- [ ] 2.4: Find current in-progress story:
  - Iterate through development_status entries
  - Find first entry with status="in-progress"
  - Extract story key (e.g., "1-2-user-authentication")
  - Parse story title from key
- [ ] 2.5: Implement error handling for missing/malformed file
- [ ] 2.6: Return default "demo" data when file doesn't exist

### Task 3: Status Indicator Component (AC2)

- [ ] 3.1: Design status indicator visual (top 10 pixels)
- [ ] 3.2: Implement status detection logic:
  ```
  - "In Progress" if any story has status="in-progress"
  - "Blocked" if blockers exist
  - "Completed" if all stories done
  - "Planning" if all stories in backlog
  ```
- [ ] 3.3: Implement color-coded background or icon
- [ ] 3.4: Add status text label (abbreviated if needed)

### Task 4: Workflow Stage Display (AC3)

- [ ] 4.1: Map BMAD workflow stages to short labels:
  - "brainstorm-project" → "BRAINSTORM"
  - "prd" → "PRD"
  - "architecture" → "ARCH"
  - "sprint-planning" → "PLAN"
  - "dev-story" → "DEV"
  - "code-review" → "REVIEW"
  - "story-done" → "DONE"
- [ ] 4.2: Design middle section layout (30 pixels)
- [ ] 4.3: Render workflow stage name
- [ ] 4.4: Add progress indicator (e.g., "Step 3/8" or progress dots)

### Task 5: Current Story Display (AC4)

- [ ] 5.1: Extract in-progress story from sprint-status data
- [ ] 5.2: Format story key for display:
  - Parse "1-2-user-authentication" → "1-2: User Auth"
  - Truncate to fit (~15-20 chars max)
  - Handle edge cases (no story, multiple stories)
- [ ] 5.3: Design story display section (12-14 pixels, upper-middle)
- [ ] 5.4: Implement text wrapping for 1-2 lines:
  - Line 1: Story key (e.g., "Story 1-2:")
  - Line 2: Short title (e.g., "User Auth")
- [ ] 5.5: Use appropriate font size (tiny 5px or small 8px)
- [ ] 5.6: Test truncation with various story titles

### Task 6: Story Metrics Display (AC5)

- [ ] 6.1: Calculate story counts from sprint-status data:
  - Total stories
  - Completed stories
  - In-progress stories
  - Backlog stories
- [ ] 6.2: Design compact metrics display (bottom 18 pixels)
- [ ] 6.3: Implement visual representation:
  - Option A: Progress bar with fraction text
  - Option B: Small pie chart + text
  - Option C: Grid of colored squares
- [ ] 6.4: Ensure numbers are legible on device

### Task 7: Graphics Implementation (AC8)

- [ ] 7.1: Use `ctx.engine.clear()` for background
- [ ] 7.2: Use `ctx.engine.drawRect()` for status indicator and dividers
- [ ] 7.3: Use `ctx.engine.drawText()` for all text elements
- [ ] 7.4: Test font sizes: 'tiny', 'small', 'medium'
- [ ] 7.5: Implement color scheme:
  - Background: #000000 (black)
  - Status colors: per AC2
  - Text: #FFFFFF (white) or #AAAAAA (gray)
  - Current story: #00FFFF (cyan highlight)
- [ ] 7.6: Align elements properly (left, center, right)
- [ ] 7.7: Add subtle dividers between sections (1px lines)

### Task 8: Performance & Polish (AC7)

- [ ] 8.1: Implement 30-second refresh delay
- [ ] 8.2: Profile render time (must be < 100ms)
- [ ] 8.3: Add scene state for caching parsed data
- [ ] 8.4: Implement graceful degradation for missing data
- [ ] 8.5: Add logging at debug level for data loading
- [ ] 8.6: Optimize text rendering (cache formatted strings)

### Task 9: Testing & Validation

- [ ] 9.1: Test with missing sprint-status.yaml file
- [ ] 9.2: Test with valid sprint-status.yaml file
- [ ] 9.3: Test with various story counts (0, 1, 10, 50)
- [ ] 9.4: Test with different workflow stages
- [ ] 9.5: Test with long story titles (truncation)
- [ ] 9.6: Test with no in-progress story
- [ ] 9.7: Test with multiple in-progress stories
- [ ] 9.8: Verify readability on physical Pixoo 64 device
- [ ] 9.9: Test scene switching (cleanup called properly)
- [ ] 9.10: Verify no memory leaks over extended run

### Task 10: Documentation

- [ ] 10.1: Add scene documentation to scenes/README.md
- [ ] 10.2: Document sprint-status.yaml expected format
- [ ] 10.3: Add example sprint-status.yaml structure
- [ ] 10.4: Update SCENE_DEVELOPMENT.md if needed
- [ ] 10.5: Document story title truncation rules

## Dev Notes

### Architecture Context

- **Scene System**: PIDICON uses pure render contract - scenes return delay, SceneManager handles scheduling
- **Graphics Engine**: Available via `ctx.engine` - provides drawText, drawRect, drawCircle, clear, etc.
- **Device**: 64x64 pixel Pixoo device (16.7M colors, but small physical size)
- **Scene Discovery**: Automatic loading from `scenes/pixoo/*.js` and `scenes/pixoo/examples/*.js`

### Project Structure Notes

**Key Files:**

- New scene: `scenes/pixoo/bmad-sprint-status.js`
- Data source: `docs/bmad/sprint-status.yaml` (may not exist yet)
- Scene loader: `lib/scene-loader.js` (auto-discovers scenes)
- Scene manager: `lib/scene-manager.js` (orchestrates lifecycle)
- Graphics engine: `lib/scene-engine.js` (drawing API)

**Similar Scenes to Reference:**

- `scenes/pixoo/startup.js` - Static info display with version/build
- `scenes/pixoo/dev/framework-data-demo.js` - Data-driven scene example
- `scenes/pixoo/dev/performance-test.js` - Metrics display scene

### Design Constraints

**64x64 Pixel Layout:**

```
┌──────────────────────────────────────────┐
│  [●] SPRINT IN PROGRESS            (8px) │  <- Top: Status bar
├──────────────────────────────────────────┤
│  Story 1-2:                        (6px) │  <- Current story
│  UI Preferences                    (6px) │  (12-14px total)
├──────────────────────────────────────────┤
│  WORKFLOW: DEV                     (9px) │  <- Workflow stage
│  ████░░░░ 4/8                      (9px) │  (18px total)
├──────────────────────────────────────────┤
│  Stories: 5/8 ✓                    (9px) │  <- Metrics
│  ████████░░ 62%                    (9px) │  (18px total)
└──────────────────────────────────────────┘
  Total: 8 + 12 + 18 + 18 = 56px (8px margin)
```

**Font Size Recommendations:**

- 'tiny' (5px) - use for labels and story description lines
- 'small' (8px) - use for numbers, workflow stage, and compact text
- 'medium' (12px) - use sparingly for main status text only

**Color Palette:**

- Background: `#000000` (black)
- Sprint Active: `#00FF00` (green)
- Sprint Blocked: `#FF0000` (red)
- Sprint Planning: `#0000FF` (blue)
- Sprint Done: `#888888` (gray)
- Text Primary: `#FFFFFF` (white)
- Text Secondary: `#AAAAAA` (light gray)
- Progress Fill: `#00AAFF` (cyan)
- Progress Empty: `#333333` (dark gray)
- Current Story Highlight: `#00FFFF` (cyan)

### Sprint Status YAML Format (Expected)

```yaml
current_sprint:
  goal: 'Complete UI-787 (UI Preferences Persistence)'
  start_date: '2025-11-08'
  status: 'in-progress'

workflow_stage: 'dev-story' # Current BMAD workflow stage
workflow_progress: { current: 3, total: 8 } # Optional progress tracking

development_status:
  '1-1-user-authentication':
    status: 'done'
  '1-2-ui-preferences-persistence':
    status: 'in-progress'
    title: 'UI Preferences Persistence' # Optional: full title for display
  '1-3-password-reset':
    status: 'backlog'
  '1-4-user-profile':
    status: 'backlog'
```

**Story Key Format:**

- Keys follow pattern: `{epic}-{story}-{kebab-case-title}`
- Example: `"1-2-ui-preferences-persistence"`
- Display parsing:
  - Epic: "1"
  - Story: "2"
  - Title: "ui-preferences-persistence" → "UI Preferences" (shortened)

**Story Title Truncation Rules:**

- Max 20 characters for display
- Abbreviate common words: "authentication" → "auth", "management" → "mgmt"
- If title still too long, truncate with "..." (e.g., "Scene Dimension Ada...")
- Preserve story ID prefix "1-2:" for context

**Status Values:**

- `backlog` - Not started
- `drafted` - Story created, not dev-ready
- `ready` - Ready for development
- `in-progress` - Currently being developed
- `review` - In code review
- `done` - Completed

### Implementation Strategy

1. **Start Simple**: Implement basic "No Data" display first
2. **Iterate Layout**: Test different layouts on physical device
3. **Add Data**: Integrate sprint-status.yaml parsing
4. **Implement Story Display**: Add current story section with truncation
5. **Polish**: Refine colors, spacing, readability
6. **Test Edge Cases**: Handle missing data, large numbers, long text, long story titles

### Testing Standards

- **Unit Tests**: Test YAML parsing, status detection, metrics calculation
- **Visual Tests**: Run scene on mock driver, verify render output
- **Physical Tests**: Deploy to Pixoo 64, verify readability
- **Performance Tests**: Measure render time, memory usage

### References

- Scene Contract: [Source: scenes/README.md#Scene-Architecture]
- Graphics Engine API: [Source: lib/scene-engine.js]
- Scene Manager: [Source: lib/scene-manager.js]
- Scene Examples: [Source: scenes/pixoo/dev/]
- PRD: [Source: docs/bmad/PRD.md]
- Architecture: [Source: docs/bmad/ARCHITECTURE.md]
- Sprint Planning: [Source: docs/bmad/sprint-planning.md]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent during implementation -->

### Completion Notes List

<!-- To be filled by dev agent after implementation -->

### File List

<!-- To be filled by dev agent - format:
- NEW: path/to/file.js - Description
- MODIFIED: path/to/file.js - Description
-->

## Change Log

| Date       | Author | Change                           |
| ---------- | ------ | -------------------------------- |
| 2025-11-08 | Bob/SM | Initial story creation (backlog) |
