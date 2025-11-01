# PERF-301: Performance Optimizations (P1) 🟡

**Status**: Planned | **Priority**: P1 (Polish & Scale)
**Effort**: 2-3 days | **Risk**: Low

## Problem

Profile daemon under load, optimize hot paths.
**Current Performance**:

- Scene switch: ~150-200ms (good)
- Render cycle: ~50ms overhead (acceptable)
- Memory: Stable over 24h
- CPU: Low (< 5% typical)
  **Optimization Opportunities**:

1. **Scene Loading**:
   - Cache scene modules (avoid re-require)
   - Lazy load scenes on demand
   - Preload frequently used scenes
2. **State Lookups**:
   - Use WeakMap for device state
   - Cache computed properties
   - Reduce Map lookups in hot paths
3. **MQTT**:
   - Batch state publishes (debounce 50ms)
   - Compress large payloads
   - QoS 0 for high-frequency metrics
4. **Metrics**:
   - Optimize frametime chart updates
   - Reduce memory churn in metrics arrays
   - Use circular buffers for history
     **Implementation Plan**:
5. Add performance instrumentation:
   - `performance.mark()` / `performance.measure()`
   - Memory profiling with `process.memoryUsage()`
6. Create load test scripts:
   - Rapid scene switches (10/second)
   - 1000 switches over 5 minutes
   - Multi-device concurrent load
7. Profile with Node.js profiler:
   - `node --prof daemon.js`
   - Analyze with `0x` profiler
8. Identify top 10 hot paths
9. Optimize each hot path
10. Add performance regression tests
11. Document performance characteristics
    **Acceptance Criteria**:

- [ ] Scene switch: < 150ms (p95)
- [ ] Render overhead: < 30ms
- [ ] Memory stable over 48h
- [ ] CPU < 5% during normal operation
- [ ] Performance tests in CI/CD
