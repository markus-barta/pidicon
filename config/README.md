# PIDICON Device Configuration

This directory contains the device configuration file for PIDICON.

## Configuration File

**File**: `devices.json` (created automatically or via Web UI)  
**Example**: `devices.example.json` (reference template)

### Priority

PIDICON loads configuration in the following order:

1. **`/data/devices.json`** (Docker volume mount) - Primary for production
2. **`config/devices.json`** (Local file) - Development/manual configuration
3. **Environment Variables** - `PIDICON_CONFIG_PATH` to override path
4. **Default** - No devices configured (add via Web UI)

### Configuration Structure

```json
{
  "version": "1.0",
  "lastModified": "2025-10-13T00:00:00Z",
  "settings": {
    "mediaPath": "/data/media",
    "scenesPath": "/data/scenes"
  },
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
        "healthCheckIntervalSeconds": 10,
        "checkWhenOff": true,
        "timeoutMinutes": 120,
        "action": "restart",
        "fallbackScene": "",
        "mqttCommandSequence": [],
        "notifyOnFailure": true
      }
    }
  ]
}
```

### Settings Fields

| Field        | Type   | Required | Description                          |
| ------------ | ------ | -------- | ------------------------------------ |
| `mediaPath`  | string | Yes      | Path to media files directory        |
| `scenesPath` | string | Yes      | Path to custom user scenes directory |

### Device Fields

| Field                                 | Type    | Required | Default   | Description                                      |
| ------------------------------------- | ------- | -------- | --------- | ------------------------------------------------ |
| `id`                                  | string  | Yes      | -         | Unique device identifier (auto-generated)        |
| `name`                                | string  | Yes      | -         | Human-readable device name                       |
| `ip`                                  | string  | Yes      | -         | Device IP address                                |
| `deviceType`                          | string  | Yes      | -         | Device type: `pixoo64`, `awtrix`                 |
| `driver`                              | string  | Yes      | -         | Driver mode: `real`, `mock`                      |
| `startupScene`                        | string  | No       | `null`    | Scene to load on daemon startup                  |
| `brightness`                          | number  | No       | `80`      | Default brightness (0-100)                       |
| `watchdog.enabled`                    | boolean | No       | `false`   | Enable watchdog monitoring & health checks       |
| `watchdog.healthCheckIntervalSeconds` | number  | No       | `10`      | How often to ping device (seconds)               |
| `watchdog.checkWhenOff`               | boolean | No       | `true`    | Health check even when device display is OFF     |
| `watchdog.timeoutMinutes`             | number  | No       | `120`     | Minutes before triggering recovery action        |
| `watchdog.action`                     | string  | No       | `restart` | Action: `restart`, `fallback-scene`, `notify`    |
| `watchdog.fallbackScene`              | string  | No       | `null`    | Scene to show if device fails                    |
| `watchdog.mqttCommandSequence`        | array   | No       | `[]`      | MQTT commands to send on failure                 |
| `watchdog.notifyOnFailure`            | boolean | No       | `true`    | Log warnings when recovery actions are triggered |

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

| Type      | Resolution | Status       | Notes                 |
| --------- | ---------- | ------------ | --------------------- |
| `pixoo64` | 64x64      | ✅ Stable    | Divoom Pixoo 64       |
| `awtrix`  | 32x8       | ✅ Supported | AWTRIX 3 (HTTP-based) |

### Directory Structure (Docker)

When using Docker with `/data` mount:

```
/data/
  ├── devices.json         # Device configuration (auto-created)
  ├── media/               # Media files for scenes
  │   ├── logo.png
  │   └── animation.gif
  └── scenes/              # Custom user scenes
      ├── my-scene.js
      └── work/
          └── dashboard.js
```

The `media/` and `scenes/` directories are automatically created on first run.

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
- Check daemon logs for watchdog messages (`[WATCHDOG]` prefix)
- Use API endpoint `/api/system/watchdog-status` to debug health check status

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
