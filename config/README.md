# PIDICON Device Configuration

This directory contains the device configuration file for PIDICON.

## Configuration File

**File**: `devices.json` (created automatically or via Web UI)  
**Example**: `devices.example.json` (reference template)

### Priority

PIDICON loads devices in the following order:

1. **`config/devices.json`** (if exists) - Web UI managed configuration
2. **Environment Variables** - `PIDICON_DEVICE_TARGETS` (legacy/fallback)
3. **Default** - No devices configured

### Configuration Structure

```json
{
  "version": "1.0",
  "lastModified": "2025-10-13T00:00:00Z",
  "devices": [
    {
      "id": "pidicon-1728888000000",
      "name": "Living Room Pixoo",
      "ip": "192.168.1.100",
      "deviceType": "pixoo64",
      "driver": "real",
      "startupScene": "startup",
      "brightness": 80,
      "watchdog": {
        "enabled": true,
        "unresponsiveThresholdHours": 4,
        "action": "restart",
        "fallbackScene": "",
        "mqttCommandSequence": []
      }
    }
  ]
}
```

### Device Fields

| Field                                 | Type    | Required | Description                                   |
| ------------------------------------- | ------- | -------- | --------------------------------------------- |
| `id`                                  | string  | Yes      | Unique device identifier (auto-generated)     |
| `name`                                | string  | Yes      | Human-readable device name                    |
| `ip`                                  | string  | Yes      | Device IP address                             |
| `deviceType`                          | string  | Yes      | Device type: `pixoo64`, `awtrix3`             |
| `driver`                              | string  | Yes      | Driver mode: `real`, `mock`                   |
| `startupScene`                        | string  | No       | Scene to load on daemon startup               |
| `brightness`                          | number  | No       | Default brightness (0-100)                    |
| `watchdog.enabled`                    | boolean | No       | Enable watchdog monitoring                    |
| `watchdog.unresponsiveThresholdHours` | number  | No       | Hours before device considered unresponsive   |
| `watchdog.action`                     | string  | No       | Action: `restart`, `fallback-scene`, `notify` |
| `watchdog.fallbackScene`              | string  | No       | Scene to show if device fails                 |
| `watchdog.mqttCommandSequence`        | array   | No       | MQTT commands to send on failure              |

### Managing Configuration

#### Via Web UI (Recommended)

1. Open PIDICON Web UI (default: `http://localhost:10829`)
2. Click **"Settings"** in the top navigation
3. Go to **"Devices"** tab
4. Click **"Add Device"** or edit existing devices
5. Configuration is automatically saved to `config/devices.json`

#### Manually

1. Copy `devices.example.json` to `devices.json`
2. Edit `devices.json` with your device configuration
3. Restart the daemon: `npm run dev` or restart Docker container

#### Import/Export

From the Web UI Settings page, you can:

- **Export**: Download current configuration as JSON backup
- **Import**: Upload a previously exported configuration
- **Reset**: Clear all devices and start fresh

### Watchdog Actions

| Action           | Description                             |
| ---------------- | --------------------------------------- |
| `restart`        | Restart the device (calls device reset) |
| `fallback-scene` | Switch to a safe fallback scene         |
| `mqtt-command`   | Execute custom MQTT command sequence    |
| `notify`         | Log warning only (no automated action)  |

### Device Types

| Type      | Resolution | Status     | Notes                 |
| --------- | ---------- | ---------- | --------------------- |
| `pixoo64` | 64x64      | ✅ Stable  | Divoom Pixoo 64       |
| `awtrix3` | 32x8       | 🚧 Planned | AWTRIX 3 (MQTT-based) |

### Backward Compatibility

If no `devices.json` is found, PIDICON falls back to environment variables:

```bash
# Legacy format (still supported)
export PIDICON_DEVICE_TARGETS="192.168.1.100=real"
export PIXOO_DEVICE_TARGETS="192.168.1.100=real"  # Also supported
```

**Note**: Web UI configuration takes precedence over environment variables.

### Migration

To migrate from environment variables to `devices.json`:

1. Open the Web UI
2. Add your devices via the Settings page
3. (Optional) Remove `PIDICON_DEVICE_TARGETS` from `.env`

### Troubleshooting

**Daemon doesn't load devices from config:**

- Check file exists: `ls -la config/devices.json`
- Verify JSON syntax: `cat config/devices.json | jq`
- Check daemon logs for errors

**Watchdog not working:**

- Ensure `watchdog.enabled` is `true`
- Verify device is using `real` driver (not mock)
- Check daemon logs for watchdog messages

**Configuration changes not applied:**

- Restart daemon after manual edits
- Web UI changes are applied immediately (no restart needed)

### Security

⚠️ **Important**: `devices.json` is added to `.gitignore` by default.

Do not commit this file to version control as it may contain:

- Internal network IP addresses
- MQTT credentials (if using MQTT commands)
- Device-specific configuration

If you need to share configuration:

1. Use the Web UI Export feature
2. Remove sensitive data before sharing
3. Store backups securely

---

**Last Updated**: 2025-10-13  
**Version**: 3.0.0 (PIDICON Multi-Device Support)
