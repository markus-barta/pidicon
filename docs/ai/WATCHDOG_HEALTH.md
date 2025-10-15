# Watchdog & Device Health Monitoring

**Version**: 3.1.0  
**Last Updated**: 2025-10-15

This document describes PIDICON's unified watchdog and device health monitoring system.

---

## Overview

The **WatchdogService** provides active device health monitoring and automated recovery actions. It continuously pings devices via HTTP to verify they are alive, updates their "last seen" timestamps, and triggers recovery actions if devices become unresponsive for too long.

### Key Features

- **Active Health Checking**: Periodic HTTP pings to verify device availability
- **Independent of Scene Rendering**: Health checks run even when no scene is active or device is OFF
- **Configurable Intervals**: Per-device health check frequency (default 10s)
- **Recovery Actions**: Automatic restart, fallback scenes, or custom actions
- **Awtrix Support**: Fixes "always unresponsive" issue for Awtrix devices
- **UI Integration**: Responsive indicators driven by real-time health data

---

## Architecture

### Unified Design

The watchdog service combines two responsibilities in one service:

1. **Health Monitoring**: Active HTTP pings → update `lastSeenTs` in device drivers
2. **Recovery Management**: Check `lastSeenTs` → trigger actions if timeout exceeded

**Flow**:

```
Every N seconds (configurable):
  ┌─────────────────────────────────────────┐
  │ WatchdogService.checkDevice(ip)         │
  │                                         │
  │  1. performHealthCheck(ip)              │
  │     ├─ Check if device is OFF           │
  │     ├─ Skip if OFF && !checkWhenOff     │
  │     ├─ Get device driver                │
  │     └─ driver.healthCheck()             │
  │        ├─ HTTP ping to device           │
  │        └─ Update driver.stats.lastSeenTs│
  │                                         │
  │  2. Check if timeout exceeded           │
  │     ├─ Read lastSeenTs from driver      │
  │     ├─ Calculate time since last seen   │
  │     └─ If > timeoutMinutes:             │
  │        └─ executeWatchdogAction(ip)     │
  └─────────────────────────────────────────┘
```

### Driver-Level Health Checks

Each device driver implements a `healthCheck()` method:

**Pixoo64**:

```javascript
async healthCheck() {
  const startTime = Date.now();
  try {
    await httpPost(this.host, { Command: 'Channel/GetHttpGifId' });
    const latencyMs = Date.now() - startTime;
    this.stats.lastSeenTs = Date.now();
    return { success: true, latencyMs };
  } catch (error) {
    return { success: false, latencyMs: Date.now() - startTime, error: error.message };
  }
}
```

**Awtrix (Ulanzi TC001)**:

```javascript
async healthCheck() {
  const startTime = Date.now();
  try {
    const stats = await this._httpRequest('GET', '/api/stats');
    const latencyMs = Date.now() - startTime;
    this.stats.lastSeenTs = Date.now();
    return { success: true, latencyMs, stats };
  } catch (error) {
    return { success: false, latencyMs: Date.now() - startTime, error: error.message };
  }
}
```

**Mock Devices**:

```javascript
async healthCheck() {
  return { success: true, latencyMs: 5 }; // Instant success
}
```

---

## Configuration

### Per-Device Settings

Configure watchdog behavior per device in `config/devices.json`:

```json
{
  "devices": [
    {
      "ip": "192.168.1.100",
      "name": "Living Room Pixoo",
      "deviceType": "pixoo64",
      "driver": "real",
      "watchdog": {
        "enabled": true,
        "healthCheckIntervalSeconds": 10,
        "checkWhenOff": true,
        "timeoutMinutes": 5,
        "action": "restart",
        "fallbackScene": "startup",
        "notifyOnFailure": true
      }
    }
  ]
}
```

### Configuration Fields

| Field                        | Type    | Default   | Description                                            |
| ---------------------------- | ------- | --------- | ------------------------------------------------------ |
| `enabled`                    | boolean | `false`   | Enable watchdog monitoring for this device             |
| `healthCheckIntervalSeconds` | number  | `10`      | How often to ping device (seconds)                     |
| `checkWhenOff`               | boolean | `true`    | Continue health checks even when device display is OFF |
| `timeoutMinutes`             | number  | `120`     | Minutes of unresponsiveness before triggering recovery |
| `action`                     | string  | `restart` | Recovery action: `restart`, `fallback-scene`, `notify` |
| `fallbackScene`              | string  | `null`    | Scene to switch to if action is `fallback-scene`       |
| `mqttCommandSequence`        | array   | `[]`      | MQTT commands to execute if action is `mqtt-command`   |
| `notifyOnFailure`            | boolean | `true`    | Log warnings when recovery actions are triggered       |

### Default Values

If `watchdog` is not specified or fields are missing, defaults are applied:

```javascript
{
  enabled: false,
  healthCheckIntervalSeconds: 10,
  checkWhenOff: true,
  timeoutMinutes: 120,
  action: 'restart',
  fallbackScene: null,
  mqttCommandSequence: [],
  notifyOnFailure: true
}
```

---

## Health Check Behavior

### When Health Checks Run

- **Enabled Devices**: Only if `watchdog.enabled === true`
- **Interval**: Every `healthCheckIntervalSeconds` (default 10s)
- **Device OFF**: Continues if `checkWhenOff === true` (default)
- **Device Type**: All device types (Pixoo, Awtrix, mock)

### What Health Checks Do

1. **Check Display State**: Query `stateStore` for `displayOn`
2. **Skip if Needed**: If device is OFF and `checkWhenOff === false`, skip
3. **HTTP Ping**: Call device-specific lightweight endpoint
4. **Update Metrics**: On success, update `driver.stats.lastSeenTs`
5. **Store Result**: Save success/failure + latency for API/debugging

### HTTP Requests

Health checks use minimal bandwidth:

- **Pixoo**: `POST /post` with `Channel/GetHttpGifId` command (~50 bytes)
- **Awtrix**: `GET /api/stats` (~200 bytes response)
- **Frequency**: Every 10s (default) = ~1.8 KB/minute/device

### Failure Handling

Failed health checks are logged at **debug** level (not error) to avoid log spam for offline devices:

```
[WATCHDOG] Health check failed for 192.168.1.100: ECONNREFUSED
```

The `lastSeenTs` is NOT updated on failure, so the device gradually becomes "unresponsive" after the configured timeout.

---

## Recovery Actions

### Action Types

| Action           | Behavior                                                            |
| ---------------- | ------------------------------------------------------------------- |
| `restart`        | Call `deviceService.restartDevice(ip)` to reset the device          |
| `fallback-scene` | Switch to the configured `fallbackScene` (e.g., safe default scene) |
| `mqtt-command`   | Execute MQTT command sequence (requires MQTT integration)           |
| `notify`         | Log a warning only; no automated action                             |

### When Actions Trigger

Recovery actions execute when:

1. Health check succeeds (device is reachable)
2. BUT `(now - lastSeenTs) > (timeoutMinutes * 60 * 1000)`
3. This means the device was successfully pinged, but hasn't responded to scene rendering

**Example**:

- `timeoutMinutes: 5`
- Device stops responding to scene pushes at 10:00
- Watchdog pings successfully (device is alive)
- At 10:05, watchdog detects 5 minutes of unresponsiveness
- Recovery action triggers (e.g., restart device)

### Action Logs

When a recovery action is triggered:

```
⚠️  [WATCHDOG] Device 192.168.1.100 unresponsive for 5min
🐕 [WATCHDOG] Executing action "restart" for 192.168.1.100
✅ [WATCHDOG] Restarted device 192.168.1.100
```

---

## UI Integration

### Responsive Indicator

The UI uses `lastSeenTs` from device metrics to show responsiveness:

- **Green**: Device seen within last 6 seconds
- **Red**: Device not seen for >6 seconds (unresponsive)

This indicator now works for **all devices** (including Awtrix) because the watchdog actively updates `lastSeenTs` via health checks.

### Last Seen

Display shows:

- "Just now" if seen within last 5 seconds
- "X seconds ago" if <60s
- "X minutes ago" if <60min
- "X hours ago" otherwise

### Device OFF Behavior

If `checkWhenOff === true` (default):

- Responsive indicator continues to work when device display is OFF
- "Last seen" updates every 10s (health check interval)
- User can verify device is online even when display is OFF

If `checkWhenOff === false`:

- Health checks stop when device is turned OFF
- `lastSeenTs` becomes stale
- Responsive indicator may show as unresponsive

---

## API Endpoints

### Get Watchdog Status

**Endpoint**: `GET /api/system/watchdog-status`

Returns watchdog status for all devices:

```json
{
  "192.168.1.100": {
    "enabled": true,
    "monitoring": true,
    "lastCheck": 1697123456789,
    "lastHealthCheck": {
      "success": true,
      "latencyMs": 15,
      "timestamp": 1697123456789
    },
    "config": {
      "enabled": true,
      "healthCheckIntervalSeconds": 10,
      "checkWhenOff": true,
      "timeoutMinutes": 5,
      "action": "restart",
      "fallbackScene": "startup",
      "notifyOnFailure": true
    }
  }
}
```

**Fields**:

- `enabled`: Watchdog is configured for this device
- `monitoring`: Watchdog timer is currently running
- `lastCheck`: Timestamp of last watchdog check (ms since epoch)
- `lastHealthCheck`: Result of most recent health check
- `config`: Current watchdog configuration

---

## Performance Considerations

### HTTP Overhead

- **Default Interval**: 10 seconds
- **Request Size**: ~50-200 bytes per health check
- **3 Devices**: ~1.8 KB/minute total
- **Impact**: Negligible for typical home networks

### CPU/Memory

- **Timers**: One `setInterval` per device
- **3 Devices**: 3 timers, minimal CPU usage
- **Memory**: ~1 KB per device for health check results

### Recommendations

- **Fast Networks**: Use 10s interval (default)
- **Slow/Unreliable Networks**: Increase to 30s or 60s
- **Bandwidth Concerns**: Set `checkWhenOff: false` for devices that are often OFF
- **Testing**: Use 5s interval for development

---

## Troubleshooting

### Watchdog Not Starting

**Symptoms**: No `[WATCHDOG]` logs on daemon startup

**Causes**:

1. `watchdog.enabled` is `false` (default)
2. Device driver is `mock` (watchdog may still run but has no real effect)
3. Device not in configuration file

**Solutions**:

- Enable watchdog in `config/devices.json`: `"enabled": true`
- Check daemon logs for "Started monitoring" messages
- Use API endpoint `/api/system/watchdog-status` to verify status

### Health Checks Failing

**Symptoms**: `[WATCHDOG] Health check failed` in logs

**Causes**:

1. Device is offline or network unreachable
2. Device IP address changed
3. Device firmware crashed

**Solutions**:

- Verify device is powered on and connected to network
- Ping device manually: `ping 192.168.1.100`
- Check device IP address via router DHCP table
- Update IP in configuration if changed

### Responsive Indicator Not Updating (Awtrix)

**Symptoms**: Awtrix shows as "unresponsive" in UI despite working

**Causes**:

1. Watchdog not enabled for Awtrix device
2. Scene is not rendering (no `push()` calls)
3. Health checks are failing

**Solutions**:

- Enable watchdog: `"enabled": true` in device config
- Check API `/api/system/watchdog-status` for health check results
- Verify Awtrix is reachable: `curl http://awtrix-ip/api/stats`

### Recovery Actions Not Triggering

**Symptoms**: Device unresponsive for hours, no recovery action

**Causes**:

1. `timeoutMinutes` is too high (default 120 minutes = 2 hours)
2. Health checks succeeding but device not rendering scenes
3. `action` is set to `notify` (no automated action)

**Solutions**:

- Lower `timeoutMinutes` to 5-10 minutes for faster recovery
- Check daemon logs for watchdog warnings
- Verify `action` is set to `restart` or `fallback-scene`

### Device OFF Detection Not Working

**Symptoms**: Health checks continue when display should be OFF

**Causes**:

1. `checkWhenOff` is `true` (default, intended behavior)
2. Display state not synced with `stateStore`

**Solutions**:

- If you want health checks to stop when OFF: `"checkWhenOff": false`
- Default behavior is to continue checking (to verify device is online)

---

## Development

### Adding Health Checks to New Drivers

To add health check support to a new device driver:

1. Implement `async healthCheck()` method:

   ```javascript
   async healthCheck() {
     const startTime = Date.now();
     try {
       // Perform lightweight HTTP request to device
       await someHttpCall();
       const latencyMs = Date.now() - startTime;
       this.stats.lastSeenTs = Date.now(); // Update last seen
       return { success: true, latencyMs };
     } catch (error) {
       return {
         success: false,
         latencyMs: Date.now() - startTime,
         error: error.message
       };
     }
   }
   ```

2. Ensure driver extends `DeviceDriver` base class
3. Ensure `this.stats.lastSeenTs` is initialized
4. Test with watchdog enabled in configuration

### Testing Health Checks

```javascript
// In test file
const driver = new MyDeviceDriver({ host: 'test-device', driverType: 'real' });
await driver.initialize();

const result = await driver.healthCheck();
assert.strictEqual(result.success, true);
assert(result.latencyMs > 0);
assert(driver.stats.lastSeenTs > 0);
```

---

## Migration from Previous Watchdog

### Changes in v3.1.0

**Old Behavior (Passive)**:

- Watchdog read `lastSeenTs` from device metrics
- `lastSeenTs` only updated during scene rendering
- Awtrix devices appeared "always unresponsive"

**New Behavior (Active)**:

- Watchdog actively pings devices via HTTP
- `lastSeenTs` updates every N seconds (configurable)
- All devices show accurate responsiveness

### Configuration Migration

**Old Config** (if you had custom watchdog settings):

```json
{
  "watchdog": {
    "enabled": true,
    "timeoutMinutes": 120,
    "action": "restart"
  }
}
```

**New Config** (backward compatible, new fields optional):

```json
{
  "watchdog": {
    "enabled": true,
    "healthCheckIntervalSeconds": 10, // NEW: default 10s
    "checkWhenOff": true, // NEW: default true
    "timeoutMinutes": 120,
    "action": "restart"
  }
}
```

**No action required**: Old configurations continue to work with new defaults.

---

## See Also

- [CONFIG.md](../config/README.md) - Device configuration reference
- [API.md](API.md) - Full API documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview
- [DRIVER_DEVELOPMENT.md](DRIVER_DEVELOPMENT.md) - Creating custom device drivers

---

**Last Updated**: 2025-10-15  
**Version**: 3.1.0 (Unified Watchdog & Health Monitoring)
