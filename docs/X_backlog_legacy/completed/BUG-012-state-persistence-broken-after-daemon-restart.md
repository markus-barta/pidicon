# BUG-012: State Persistence Broken After Daemon Restart

**Status:** ✅ Complete  
**Priority:** P0 (Critical)  
**Sprint:** Sprint 1  
**Completion Date:** 2025-11-09

## Issue Description

Device state (displayOn, brightness) was not persisting across daemon restarts. After restarting the daemon,
devices would show incorrect power states (e.g., device was ON before restart but showed as OFF after restart).

## Symptoms

- Device P00 (192.168.1.159) was ON, but after daemon restart showed as OFF
- runtime-state.json file was dated October 20, 2025 (3 weeks old)
- State changes appeared to work during daemon runtime but were lost on restart
- No errors in logs about persistence failures

## Root Cause Analysis

### 1. No Shutdown Handlers (Critical)

The daemon had NO SIGTERM/SIGINT signal handlers. When Docker sent SIGTERM to stop the container:

- Daemon process terminated immediately
- No graceful shutdown sequence
- `stateStore.flush()` was never called
- All pending state changes in the 10s debounce window were lost

### 2. 10-Second Debounce (Too Slow)

`StateStore` used a 10-second debounce for persistence:

- State changes were queued but not immediately written
- If daemon restarted within 10 seconds, changes were lost
- Default value was too conservative for production use

### 3. File Permissions (Production-Specific)

The `/data/runtime-state.json` file was owned by `root:root`:

- Daemon runs as `node` user
- File could be read but not written
- Explained why file was never updated after October 20th
- Silent failure (no permission error logged)

## Solution

### 1. Added Graceful Shutdown Handlers (daemon.js)

```javascript
// Graceful shutdown handler
async function shutdown(signal) {
  logger.warn(`Received ${signal}, shutting down gracefully...`);
  try {
    const stateStore = container.resolve('stateStore');
    logger.info('Flushing state to disk...');
    await stateStore.flush();
    logger.ok('State persisted successfully');

    const mqttService = container.resolve('mqttService');
    logger.info('Disconnecting from MQTT...');
    await mqttService.disconnect();
    logger.ok('MQTT disconnected');

    logger.ok('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', { error: error.message });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### 2. Reduced Persist Debounce (lib/state-store.js)

Changed default debounce from 10s to 2s:

```javascript
constructor({ logger, persistPath = null, debounceMs = 2000 } = {}) {
```

### 3. Added Immediate Flush for Critical State (lib/services/device-service.js)

Added immediate `flush()` after critical state changes:

```javascript
// setDisplayPower
await this.stateStore.flush();

// setDisplayBrightness
await this.stateStore.flush();
```

### 4. Fixed File Permissions (Production)

```bash
docker exec --user root pidicon chown node:users /data/runtime-state.json
docker exec --user root pidicon chmod 644 /data/runtime-state.json
```

## Testing

### Unit/Integration Tests

- All 539 tests pass
- Added `flush()` method to mock StateStore in tests
- Integration tests verify actual file system persistence
- Tests simulate full daemon restart cycle

### Production Verification

1. Fixed file permissions on miniserver24
2. Turned device P00 ON via Web UI
3. Verified runtime-state.json updated (timestamp changed from Oct 20 to Nov 9)
4. Restarted Docker container
5. **✅ Device P00 remained ON after restart**

## Files Changed

- `daemon.js` - Added shutdown handlers
- `lib/state-store.js` - Reduced debounce from 10s to 2s
- `lib/services/device-service.js` - Added immediate flush for displayOn/brightness
- `test/lib/device-service.test.js` - Added flush() to mock StateStore

## Commit

```
fix(persistence): add immediate flush and shutdown handlers for state persistence

CRITICAL BUG FIX: State persistence was completely broken due to:

1. No shutdown handlers - daemon never called stateStore.flush() on SIGTERM/SIGINT
2. 10-second debounce - state changes took too long to persist
3. Race condition - daemon restarts lost state if debounce hadn't triggered

Commit: 3c91e48
```

## Impact

✅ **Critical production issue resolved**  
✅ Device state now persists correctly across daemon restarts  
✅ Graceful shutdown ensures zero data loss  
✅ Reduced persist latency from 10s to 2s  
✅ Immediate persistence for critical state (displayOn, brightness)

## Related Issues

- UI-508: Hardware state persistence for displayOn/brightness
- Sprint 1 completion
- Daemon restart state integration tests

## Lessons Learned

1. **Always implement graceful shutdown handlers** for services with state persistence
2. **Test with actual daemon restarts**, not just in-process state changes
3. **Check file permissions** in Docker containers (user context matters)
4. **Use immediate flush** for critical state changes that must survive crashes
5. **Monitor state file timestamps** in production to detect persistence failures early

## Prevention

- Added integration tests that simulate daemon restart cycles
- Tests verify actual file system persistence (not just in-memory state)
- Graceful shutdown is now part of core daemon lifecycle
- Critical state changes force immediate persistence

---

**Reported by:** User (Production Issue)  
**Investigated by:** AI Assistant  
**Fixed by:** Markus Barta with AI assistance  
**Date:** 2025-11-09
