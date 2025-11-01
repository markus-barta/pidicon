# ROADMAP-005: Multi-Device Scene Manager

**Status**: Planned | **Priority**: P2 (Nice to Have)
**Effort**: 3-5 hours | **Risk**: Low

## Goal

Run different scenes on different devices simultaneously
**Current Limitation**: All devices run the same scene (or manually switch)
**Features**:

- Per-device scene selection in Web UI
- Scene compatibility matrix (which scenes work on which devices)
- Scene recommendations based on device capabilities
- Bulk scene switching (set all devices at once)
- Scene groups (living room, bedroom, kitchen)
  **Use Cases**:
- Pixoo in living room shows `power_price`
- AWTRIX in kitchen shows `clock`
- Pixoo in bedroom shows `pixoo_showcase`

## Tasks

1. Update state management to support per-device scenes
2. Add scene compatibility checks
3. Create scene recommendation engine
4. Update Web UI for per-device scene control
5. Add scene groups feature
