# ROADMAP-008: Additional Device Support

**Status**: Not Started | **Priority**: P2 (Nice to Have)
**Effort**: Varies (5-15 hours per device) | **Risk**: Medium to High (device-specific)

## Goal

Support more pixel display devices
**Candidates**:

1. **WS2812B LED Strips** (variable dimensions)
   - Protocol: SPI/Serial
   - Driver complexity: Medium
   - Use case: Ambient lighting, signs
2. **MAX7219 Matrix Displays** (8x8, 16x16, 32x8)
   - Protocol: SPI
   - Driver complexity: Low
   - Use case: DIY displays, cheap matrices
3. **Generic MQTT Displays**
   - Protocol: MQTT (configurable topics)
   - Driver complexity: Low
   - Use case: Custom displays, ESP32 projects
4. **HUB75 RGB Panels** (64x32, 128x64)
   - Protocol: Parallel GPIO (via Raspberry Pi)
   - Driver complexity: High
   - Use case: Large outdoor displays
     **Priority Order**:
5. Generic MQTT (low effort, high flexibility)
6. WS2812B (popular, medium effort)
7. MAX7219 (simple, low effort)
8. HUB75 (complex, high effort, low demand)
