# ROADMAP-002: Scene Dimension Adapter

**Status**: Not Started | **Priority**: P1 (Important)
**Effort**: 3-5 hours | **Risk**: Low

## Goal

Auto-adapt existing Pixoo scenes to AWTRIX and other display sizes
**Features**:

- Auto-scale graphics to fit different resolutions
- Crop/letterbox options for aspect ratio mismatch
- Font size adaptation (smaller displays = smaller text)
- Layout compression (reduce margins for small displays)
- Optional scene compatibility matrix UI

## Tasks

1. Create `SceneDimensionAdapter` class
2. Implement scaling algorithms (nearest-neighbor, bilinear)
3. Add crop/letterbox modes
4. Font size auto-adjustment
5. Test with Pixoo 64x64 → AWTRIX 32x8 conversion
6. Add compatibility matrix to Web UI
   **Use Cases**:

- Run `pixoo_showcase` on AWTRIX (scaled down)
- Run `power_price` chart on smaller displays
- Universal scenes work on any device
