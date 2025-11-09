# Epic 4: Scene Marketplace & Advanced Features

**Status:** Backlog  
**Target Version:** v3.4  
**Priority:** P2  
**Owner:** mba  
**Target Start:** Q2 2025 (Apr 2025)  
**Target Completion:** Q2 2025 (Jun 2025)

---

## Epic Overview

Enable scene sharing, discovery, and installation through a marketplace system. Implement scene dimension adaptation, multi-device management, and visual scene editor. Transform PIDICON from a single-device tool to a community-driven platform.

### Business Value

- **Community Growth:** Marketplace enables scene sharing and community engagement
- **User Experience:** Visual editor lowers barrier to custom scene creation
- **Device Flexibility:** Dimension adapter makes scenes portable across devices
- **Market Differentiation:** Scene marketplace is a unique competitive advantage

### Success Criteria

- [ ] Scene marketplace functional with import/export
- [ ] Scene dimension adapter handles 32x8, 64x64, and custom sizes
- [ ] Multi-device scene manager coordinates scenes across devices
- [ ] Visual scene editor creates functional scenes without coding
- [ ] At least 10 community-contributed scenes in marketplace
- [ ] All tests passing with marketplace features

---

## Stories

### Story 4.1: Scene Marketplace (ROADMAP-010)

**Status:** Backlog  
**Priority:** P2  
**Points:** 13  
**Sprint:** Sprint 4-5

**Description:**
Implement scene marketplace with package format, local library management, import/export, preview/thumbnails, and version management.

**Acceptance Criteria:**

- [ ] Scene package format defined (JSON + assets)
- [ ] Local scene library management UI
- [ ] Import scene from file/URL
- [ ] Export scene to package file
- [ ] Scene preview with thumbnails
- [ ] Version management (semantic versioning)
- [ ] Scene metadata (author, description, tags, dependencies)
- [ ] Scene validation before installation
- [ ] Dependency resolution for scenes

**Scene Package Format:**

```json
{
  "name": "weather-dashboard",
  "version": "1.2.0",
  "author": "mba",
  "description": "Display weather with forecast",
  "tags": ["weather", "dashboard"],
  "targetDevices": ["64x64"],
  "dependencies": {
    "weather-api": "^1.0.0"
  },
  "thumbnail": "thumbnail.png",
  "scene": {
    "code": "scene.js",
    "assets": ["icon1.png", "icon2.png"],
    "config": "config.json"
  }
}
```

**Technical Details:**

- ZIP-based package format
- Metadata validation schema
- Asset bundling and extraction
- Scene installation directory structure
- Version conflict resolution
- Rollback on installation failure

**Definition of Done:**

- [ ] Scene package format implemented
- [ ] Import/export functional
- [ ] Scene library UI complete
- [ ] Validation prevents invalid scenes
- [ ] Version management works
- [ ] Unit tests for packaging logic
- [ ] E2E tests for marketplace UI
- [ ] Documentation updated
- [ ] Deployed to production

---

### Story 4.2: Scene Dimension Adapter (ROADMAP-002)

**Status:** Backlog  
**Priority:** P2  
**Points:** 8  
**Sprint:** Sprint 5

**Description:**
Automatically adapt scenes to different display sizes using scaling, layout adapters, and aspect ratio handling.

**Acceptance Criteria:**

- [ ] Auto-scale graphics for different dimensions
- [ ] Layout adapters (64x64 → 32x8, 64x64 → 16x16, etc.)
- [ ] Aspect ratio handling (preserve vs stretch)
- [ ] Scene compatibility detection
- [ ] Testing framework for multi-size rendering
- [ ] Configuration per scene (scaling strategy)

**Scaling Strategies:**

1. **Fit:** Scale to fit, maintain aspect ratio, add padding
2. **Fill:** Scale to fill, may crop content
3. **Stretch:** Ignore aspect ratio, fill entire display
4. **Manual:** Scene defines custom rendering per size

**Technical Details:**

- Canvas scaling utilities
- Layout transformation algorithms
- Font size adaptation
- Icon/sprite scaling
- Positioning calculations for different sizes
- Scene metadata for preferred scaling

**Supported Conversions:**

- 64x64 → 32x8 (AWTRIX)
- 64x64 → 16x16 (small displays)
- 32x8 → 64x64 (upscaling)
- Custom sizes via configuration

**Definition of Done:**

- [ ] Dimension adapter functional
- [ ] Multiple scaling strategies work
- [ ] Compatibility detection accurate
- [ ] Testing framework complete
- [ ] Unit tests for scaling logic
- [ ] Visual regression tests
- [ ] Documentation updated
- [ ] Deployed to production

---

### Story 4.3: Multi-Device Scene Manager (ROADMAP-005)

**Status:** Backlog  
**Priority:** P2  
**Points:** 8  
**Sprint:** Sprint 6

**Description:**
Coordinate scene deployment across multiple devices with synchronized timing, grouped management, and scene orchestration.

**Acceptance Criteria:**

- [ ] Device groups (tag-based)
- [ ] Deploy scene to multiple devices simultaneously
- [ ] Synchronized scene transitions
- [ ] Scene scheduling per group
- [ ] Health monitoring across device group
- [ ] Rollback failed deployments per group

**Use Cases:**

1. **Sync Displays:** Show same scene across multiple displays
2. **Coordinated Show:** Orchestrate multi-device light show
3. **Zone Management:** Manage devices by room/location
4. **Bulk Operations:** Update multiple devices at once

**Technical Details:**

- Device grouping system
- Multi-device command coordination
- Timing synchronization protocol
- Group health monitoring
- Broadcast message optimization
- Rollback coordination

**Definition of Done:**

- [ ] Device grouping functional
- [ ] Multi-device deployment works
- [ ] Synchronized transitions accurate
- [ ] Group health monitoring complete
- [ ] Unit tests for coordination logic
- [ ] Integration tests for multi-device
- [ ] Documentation updated
- [ ] Deployed to production

---

### Story 4.4: Scene Editor (UI-601)

**Status:** Backlog  
**Priority:** P2  
**Points:** 13  
**Sprint:** Sprint 6

**Description:**
Create visual scene editor with drag-and-drop interface, live preview, widget library, timeline for animations, and export to scene format.

**Acceptance Criteria:**

- [ ] Drag-and-drop interface for scene composition
- [ ] Live preview on virtual display
- [ ] Widget library (text, images, shapes, charts)
- [ ] Timeline for animations
- [ ] Export to scene.js format
- [ ] Template system (start from templates)
- [ ] Asset manager (upload images, fonts)
- [ ] Scene configuration UI

**Editor Features:**

- Canvas with grid
- Widget palette
- Property inspector
- Layer management
- Animation timeline
- Code preview/export
- Save/load projects

**Widget Types:**

- Text (static, scrolling)
- Image (static, animated)
- Shape (rect, circle, line)
- Chart (bar, line, pie)
- Clock/date
- Weather
- Custom (API data)

**Technical Details:**

- Vue.js-based editor UI
- Canvas API for rendering
- Code generation from visual scene
- Template engine
- Asset management system
- Export as standalone scene

**Definition of Done:**

- [ ] Visual editor functional
- [ ] Widget library complete
- [ ] Animation timeline works
- [ ] Export generates valid scenes
- [ ] Template system functional
- [ ] Unit tests for code generation
- [ ] E2E tests for editor UI
- [ ] Documentation with tutorials
- [ ] Deployed to production

---

## Epic Definition of Done

- [ ] All stories completed (0/4)
- [ ] All acceptance criteria met
- [ ] Scene marketplace live with ≥10 scenes
- [ ] Dimension adapter supports major display sizes
- [ ] Multi-device manager coordinates scenes
- [ ] Visual editor creates functional scenes
- [ ] All tests passing
- [ ] Documentation comprehensive
- [ ] Deployed to production
- [ ] Epic retrospective completed

---

## Dependencies

**External Dependencies:**

- Community contributors for marketplace scenes
- Design assets for scene templates

**Internal Dependencies:**

- Scene system (existing)
- Device management (existing)
- WebSocket infrastructure (existing)

---

## Risks & Mitigations

| Risk                                    | Impact | Probability | Mitigation                                      |
| --------------------------------------- | ------ | ----------- | ----------------------------------------------- |
| Low community adoption of marketplace   | High   | Medium      | Seed with high-quality scenes, marketing effort |
| Scene compatibility issues              | Medium | High        | Comprehensive testing, validation framework     |
| Editor complexity exceeds estimate      | High   | Medium      | MVP first, advanced features later              |
| Performance impact of dimension adapter | Medium | Low         | Optimize scaling algorithms, cache results      |

---

## Notes

**Sprint Planning:**

- **Total Points:** 42 SP (~6 weeks for single developer)
- **Duration:** 3 sprints (6 weeks)
- **Focus:** Community features and visual tools

**Strategic Importance:**

- Marketplace creates network effects
- Visual editor opens PIDICON to non-developers
- Multi-device management scales to large installations
- These features differentiate PIDICON from competitors

**Phasing Strategy:**

- Sprint 4-5: Marketplace foundation
- Sprint 5: Dimension adapter (enables scene portability)
- Sprint 6: Multi-device manager + Editor (high-value features)

---

**Epic Status:** Backlog  
**Last Updated:** 2025-11-09  
**Previous Epic:** Epic 3 - Testing & Documentation  
**Next Epic:** Epic 5 - Mobile & Offline Capabilities
