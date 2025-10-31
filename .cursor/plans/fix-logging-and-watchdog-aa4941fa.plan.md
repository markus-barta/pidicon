<!-- aa4941fa-8010-422b-9d87-b30113de9edf 73392d86-b4d1-4625-aaec-31eb8b5b5894 -->

# Fix Logging Spam and Watchdog Service Bugs

## Issues Identified

From the Docker logs analysis, three critical issues:

### 1. Log Spam from Offline Devices (All Types)

- **Problem**: Every 4-10 seconds, offline devices flood logs with ERROR-level messages
- **Example**: `❌ [ERROR] [AWTRIX] HTTP GET /stats failed: "fetch failed"` (thousands of times)
- **Root Cause**: Drivers log every HTTP failure at ERROR level
- **Impact**: Makes logs unreadable, fills disk space, hides real issues

### 2. Watchdog Service Bugs (3 separate bugs)

- **Bug A**: Missing `this.lastHealthCheckResults` initialization (line 28)
- **Bug B**: Constructor receives `deviceConfigStore` but uses `this.configStore` (never assigned)
- **Bug C**: Calls `this.deviceService.restartDevice()` which doesn't exist
  - Error: `this.deviceService.restartDevice is not a function`
  - Should use `resetDevice()` or `rebootDevice()` instead

### 3. Scene Usage Tracking Error (minor)

- Warning: `this.deviceConfigStore.saveConfig is not a function`
- Needs investigation in scene-service

## Implementation Plan

### Phase 1: Fix Critical Watchdog Bugs

**File**: `lib/services/watchdog-service.js`

1. Add missing `lastHealthCheckResults` initialization in constructor
2. Fix `deviceConfigStore` assignment (change `this.configStore` to `this.deviceConfigStore`)
3. Update all references from `this.configStore` to `this.deviceConfigStore`
4. Fix `restartDevice` call to use correct method name (`resetDevice()`)

**Decision**: Use `resetDevice()` for watchdog recovery - it's lighter (restarts scene) and faster than hardware reboot.

### Phase 2: Implement Collated Offline Device Logging

**File**: `lib/services/watchdog-service.js`

Implement centralized offline statistics tracking with periodic summary logs:

1. **Add offline statistics tracking**:

   ```javascript
   this.offlineStats = new Map(); // ip -> {
   //   firstFailure: timestamp,
   //   lastCheck: timestamp,
   //   failureCount: number,
   //   lastSummaryLog: timestamp,
   //   deviceName: string
   // }
   ```

2. **In `performHealthCheck()` method**:
   - On failure: Update stats (increment counter, set firstFailure if new)
   - On success: Clear stats if device was previously offline (log recovery)
   - Check if summary log is due (every 5 minutes)

3. **Summary log format** (every 5 minutes while offline):

   ```
   ⚠️ [WATCHDOG] Device 192.168.1.159 (Awtrix Office) offline for 10 minutes (checked 123 times)
   ```

4. **First failure**: Immediate WARN log when device goes offline
5. **Recovery**: Immediate INFO log when device comes back online

**Configuration**: 5 minute summary interval (hardcoded, can be made configurable later)

### Phase 3: Reduce Driver-Level Error Logging

**Files**:

- `lib/drivers/awtrix/awtrix-driver.js`
- `lib/drivers/pixoo/pixoo-driver.js` (if it has similar issues)

1. Change HTTP connection failure logs from ERROR → DEBUG
2. Keep functional errors (bad responses, validation) at ERROR level
3. Drivers focus on functional issues; connectivity tracked by watchdog

**Rationale**: Watchdog service now handles all device availability logging centrally.

### Phase 4: Verify and Test

1. Test watchdog recovery actions work correctly
2. Verify offline device logging shows summaries every 5 minutes
3. Check logs are clean and readable
4. Investigate scene usage tracking issue (if time permits)

## Files to Modify

- `lib/services/watchdog-service.js` (critical fixes + collated offline logging)
- `lib/drivers/awtrix/awtrix-driver.js` (reduce error log level)
- `lib/drivers/pixoo/pixoo-driver.js` (reduce error log level if needed)
- Possibly `lib/services/scene-service.js` (config tracking issue)

## Expected Outcomes

1. **Watchdog will work**: Recovery actions execute successfully when devices are unresponsive
2. **Clean logs**: Offline devices show periodic summaries instead of spam
   - Example: "Device 192.168.1.159 offline for 10 minutes (checked 123 times)" every 5 min

3. **Better debugging**: Easier to spot real issues in production logs
4. **Universal solution**: Applies to all device types, not just Awtrix

### To-dos

- [ ] Add missing lastHealthCheckResults Map initialization in watchdog constructor
- [ ] Fix deviceConfigStore assignment and update all references from this.configStore
- [ ] Change restartDevice() call to correct method (resetDevice or rebootDevice)
- [ ] Add connection state tracking to Awtrix driver (wasConnected flag)
- [ ] Update \_httpRequest error handling to log state changes instead of every failure
- [ ] Test watchdog recovery actions work with offline devices
- [ ] Verify log output is clean when Awtrix device is offline
