# BMAD Migration Guide

**Date:** 2025-11-09  
**Project:** PIDICON v3.2.1  
**Migration Type:** Custom Sprint Structure → Standard BMAD BMM Workflow

---

## Executive Summary

PIDICON has successfully migrated from a custom sprint planning structure to the standard BMAD (Business Model Methodology) workflow system. This enables:

- **Structured Epic-Based Planning** - Work organized into 5 epics aligned with product roadmap
- **Standard Story Workflows** - Full BMAD lifecycle from brainstorming → development → done
- **Automated Sprint Management** - Sprint-planning workflow generates status tracking
- **Agent-Driven Development** - Access to full BMAD agent suite (SM, Dev, Architect, etc.)

---

## Migration Summary

### What Was Created

**Epic Files (5 total):**

1. `epic-1-core-foundation.md` - v3.3 foundation (Sprint 0-1, COMPLETE)
2. `epic-2-configuration-observability.md` - v3.3 config & ops (Sprint 2)
3. `epic-3-testing-documentation.md` - v3.3 quality (Sprint 3)
4. `epic-4-scene-marketplace.md` - v3.4 marketplace features (Sprint 4-6)
5. `epic-5-mobile-offline.md` - v3.5 mobile & offline (Sprint 7-9)

**Sprint Status File:**

- `sprint-status.yaml` - BMAD-compliant status tracking with all epics and stories

**Story Files:**

- `stories/1-4-bmad-sprint-status-display-scene.md` - Renamed from old format

**Preserved Files:**

- `sprint-planning.md` - Comprehensive planning document (kept for reference)
- `PRD.md` - Existing PRD (already aligned with BMAD)
- `ARCHITECTURE.md` - Existing architecture (already aligned with BMAD)

---

## New BMAD Workflow Structure

### Epic Hierarchy

```
PIDICON Project
│
├── Epic 1: Core Foundation (v3.3)
│   ├── Story 1.1: UI Preferences Persistence (✅ done)
│   ├── Story 1.2: AWTRIX Driver Implementation (✅ done)
│   ├── Story 1.3: Performance Scene Reset Bug (✅ done)
│   ├── Story 1.4: BMAD Sprint Status Display Scene (✅ done)
│   └── Epic 1 Retrospective (optional)
│
├── Epic 2: Configuration & Observability (v3.3) ← NEXT SPRINT
│   ├── Story 2.1: Config Hot-Reload (backlog)
│   ├── Story 2.2: Live Log Viewer (backlog)
│   ├── Story 2.3: Watchdog Restart Cooldown Backoff (backlog)
│   ├── Story 2.4: Smart Release Checker Caching (backlog)
│   └── Epic 2 Retrospective (optional)
│
├── Epic 3: Testing & Documentation (v3.3)
│   ├── Story 3.1: Improve Test Coverage to 80%+ (backlog)
│   ├── Story 3.2: API Documentation Enhancement (backlog)
│   ├── Story 3.3: Testing Framework Enhancements (backlog)
│   └── Epic 3 Retrospective (optional)
│
├── Epic 4: Scene Marketplace & Advanced Features (v3.4)
│   ├── Story 4.1: Scene Marketplace (backlog)
│   ├── Story 4.2: Scene Dimension Adapter (backlog)
│   ├── Story 4.3: Multi-Device Scene Manager (backlog)
│   ├── Story 4.4: Scene Editor (backlog)
│   └── Epic 4 Retrospective (optional)
│
└── Epic 5: Mobile & Offline Capabilities (v3.5)
    ├── Story 5.1: Mobile App (Capacitor) (backlog)
    ├── Story 5.2: Offline Mode (Service Worker) (backlog)
    ├── Story 5.3: Advanced Scheduling (backlog)
    └── Epic 5 Retrospective (optional)
```

---

## Story Status Lifecycle

Stories now follow the standard BMAD lifecycle:

```
backlog → drafted → ready-for-dev → in-progress → review → done
```

**Status Definitions:**

- **backlog** - Story exists in epic file only
- **drafted** - Story file created in `docs/bmad/stories/{story-key}.md`
- **ready-for-dev** - Story context created, approved for development
- **in-progress** - Developer actively working on implementation
- **review** - Implementation complete, under review
- **done** - Story completed and deployed

---

## How to Use BMAD Workflows

### Access the Scrum Master Agent

```
@bmad/bmm/agents/sm
```

Or reference the SM agent file:

```
@sm.md
```

### Available Workflows

**Sprint Planning & Management:**

- `*sprint-planning` - Generate/update sprint-status.yaml from epic files
- `*workflow-status` - Check workflow status and get recommendations

**Epic Management:**

- `*epic-tech-context` - Create Epic-Tech-Spec for specific epic
- `*validate-epic-tech-context` - Validate Epic Tech Spec

**Story Management:**

- `*create-story` - Create a draft story from epic
- `*validate-create-story` - Validate story draft
- `*story-context` - Generate story context XML for development
- `*validate-story-context` - Validate story context
- `*story-ready-for-dev` - Mark story ready without generating context

**Retrospectives:**

- `*epic-retrospective` - Facilitate epic retrospective
- `*correct-course` - Execute correct-course task

---

## Story Naming Conventions

### File Naming

Stories are named using the format: `{epic}-{story}-{kebab-case-title}.md`

**Examples:**

- `1-1-ui-preferences-persistence.md`
- `2-1-config-hot-reload.md`
- `4-2-scene-dimension-adapter.md`

### Story Keys in sprint-status.yaml

Same format, used as keys:

```yaml
development_status:
  epic-1-core-foundation: contexted
  1-1-ui-preferences-persistence: done
  1-2-awtrix-driver-implementation: done
```

---

## Current Sprint Status

**Sprint 1:** ✅ Complete (Epic 1 - Core Foundation)

- All 4 stories complete
- 18 story points delivered in 1 day (ahead of schedule)

**Sprint 2:** Ready to start (Epic 2 - Configuration & Observability)

- 4 stories planned
- 13 story points
- Target duration: 2 weeks

---

## Next Steps for Sprint 2

### 1. Epic Tech Context (Optional but Recommended)

Generate technical context for Epic 2:

```
@sm.md
*epic-tech-context
```

This creates `epic-2-context.md` with detailed technical guidance extracted from PRD and Architecture.

### 2. Create Story Drafts

For each story in Sprint 2, create detailed story files:

```
@sm.md
*create-story
```

This generates story files like:

- `stories/2-1-config-hot-reload.md`
- `stories/2-2-live-log-viewer.md`
- `stories/2-3-watchdog-restart-cooldown-backoff.md`
- `stories/2-4-smart-release-checker-caching.md`

### 3. Story Context (Optional)

Generate story context XML for developer:

```
@sm.md
*story-context
```

This creates dynamic context files with:

- Epic and story details
- Relevant architecture sections
- Related code references
- Technical constraints

### 4. Development

Use the developer agent to implement stories:

```
@bmad/bmm/agents/dev
*dev-story
```

### 5. Code Review

After implementation, run code review:

```
@sm.md (or appropriate agent)
*code-review
```

### 6. Story Done

Mark story as complete:

```
@sm.md
*story-done
```

---

## File Locations

**BMAD Files:**

- Epics: `docs/bmad/epic-*.md`
- Stories: `docs/bmad/stories/*.md`
- Sprint Status: `docs/bmad/sprint-status.yaml`
- Config: `bmad/bmm/config.yaml`

**Reference Documentation:**

- PRD: `docs/bmad/PRD.md`
- Architecture: `docs/bmad/ARCHITECTURE.md`
- Sprint Planning: `docs/bmad/sprint-planning.md` (reference only)

**BMAD Rules:**

- All BMAD agents/workflows: `.cursor/rules/bmad/`
- Agent files: `.cursor/rules/bmad/bmm/agents/`
- Workflow files: `.cursor/rules/bmad/bmm/workflows/`

---

## Key Benefits of BMAD Structure

### 1. **Structured Planning**

- Clear epic hierarchy aligned with product roadmap
- Systematic story breakdown and estimation
- Predictable development cadence

### 2. **Automated Workflows**

- Sprint-planning workflow generates status tracking
- Story creation workflow ensures consistency
- Context generation provides rich developer guidance

### 3. **Agent-Driven Development**

- Scrum Master (SM) manages stories and sprints
- Developer (Dev) implements with context
- Architect reviews technical decisions
- Test Architect (TEA) ensures quality

### 4. **Traceability**

- Every story traces to epic and PRD
- Clear status tracking through lifecycle
- Retrospectives capture learnings

### 5. **Scalability**

- Structure supports multiple developers
- Epic-based organization enables parallel work
- Clear handoffs between workflow stages

---

## Tips for Working with BMAD

### 1. **Start with Epic Context**

Before drafting stories, create epic tech context. This provides technical foundation.

### 2. **Draft Stories Sequentially**

Draft stories as you're ready to work them, not all at once. This allows incorporating learnings.

### 3. **Use Story Context**

Generate story context XML before development. This provides rich, dynamic context.

### 4. **Update Sprint Status**

Re-run `*sprint-planning` workflow to refresh status detection from files.

### 5. **Run Retrospectives**

After completing an epic, run `*epic-retrospective` to capture learnings.

---

## Migration Validation

### ✅ Migration Checklist

- [x] 5 epic files created with complete story breakdown
- [x] Sprint-status.yaml generated in BMAD format
- [x] Existing story migrated to BMAD naming convention
- [x] PRD reviewed (no changes needed)
- [x] Architecture reviewed (no changes needed)
- [x] Migration guide created
- [x] File locations documented
- [x] Workflow instructions provided

### File Verification

Run this command to verify migration:

```bash
cd /Users/markus/Code/pidicon/docs/bmad
ls -la epic-*.md
ls -la sprint-status.yaml
ls -la stories/
```

Expected output:

```
epic-1-core-foundation.md
epic-2-configuration-observability.md
epic-3-testing-documentation.md
epic-4-scene-marketplace.md
epic-5-mobile-offline.md
sprint-status.yaml
stories/1-4-bmad-sprint-status-display-scene.md
```

---

## Comparison: Before vs After

### Before Migration

**Structure:**

- Custom sprint-planning.md with manual tracking
- Ad-hoc story naming
- No epic hierarchy
- Manual status updates

**Workflow:**

- Custom sprint tracking in YAML
- Manual story creation
- No standardized lifecycle

### After Migration

**Structure:**

- 5 epic files with clear hierarchy
- Standard BMAD story naming (epic-story-title)
- Sprint-status.yaml with full epic/story tracking
- Aligned with product roadmap

**Workflow:**

- Full BMAD agent suite available
- Automated sprint-planning workflow
- Standard story lifecycle (backlog → done)
- Story context generation
- Epic tech context available

---

## Common Questions

**Q: Do I need to use all BMAD workflows?**  
A: No. Use what adds value. At minimum, use `*sprint-planning` to track status and `*create-story` for consistency.

**Q: Can I still manually edit story files?**  
A: Yes! BMAD workflows generate starting points. You can always edit directly.

**Q: What happens to my old sprint-planning.md?**  
A: It's preserved as reference documentation. Epics now contain the structured version.

**Q: How do I track current sprint?**  
A: Update `sprint-status.yaml` with in-progress status. The `sprint-planning` workflow auto-detects some statuses.

**Q: Can I skip epic tech context?**  
A: Yes, it's optional. But recommended for complex epics—it provides valuable technical guidance.

---

## Support

**BMAD Documentation:**

- Index: `.cursor/rules/bmad/index.md`
- Workflows: `.cursor/rules/bmad/bmm/workflows/`
- Agents: `.cursor/rules/bmad/bmm/agents/`

**Project Documentation:**

- PRD: `docs/bmad/PRD.md`
- Architecture: `docs/bmad/ARCHITECTURE.md`
- This guide: `docs/bmad/bmad-migration-guide.md`

**Getting Help:**

- Reference `@bmad/index` for full BMAD capabilities
- Use `@sm.md` and type `*help` for SM menu
- Read workflow YAML files for detailed instructions

---

**Migration Status:** ✅ Complete  
**Migration Date:** 2025-11-09  
**Next Action:** Start Sprint 2 using BMAD workflows  
**Prepared By:** Bob (Scrum Master Agent)
