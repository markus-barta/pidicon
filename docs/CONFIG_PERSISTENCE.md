# Configuration Persistence

**PIDICON** supports persistent storage for device configuration, media files,
and custom user scenes via a `/data` volume mount in Docker.

## Overview

PIDICON stores all user data in a single `/data` directory:

- **`/data/devices.json`** - Device configurations (IP, name, type, watchdog settings)
- **`/data/media/`** - Media files (images, GIFs) used by scenes
- **`/data/scenes/`** - Custom user scenes (JavaScript files)

When running in Docker, mount a persistent volume to `/data` to ensure all
configurations and custom content survive container restarts and redeployments.

## Directory Structure

```text
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

## Configuration Priority

The configuration locations are determined by these priorities:

### Config File (`devices.json`)

1. **Explicit path** (passed to constructor) - highest priority
2. **Environment variable**: `PIDICON_CONFIG_PATH`
3. **/data mount**: `/data/devices.json` (if `/data` directory exists)
4. **Fallback**: `./config/devices.json` (local development)

### Media and Scenes Paths

- **Media**: `PIDICON_MEDIA_PATH` env var or `/data/media` (default)
- **Scenes**: `PIDICON_SCENES_PATH` env var or `/data/scenes` (default)

## Docker Deployment (Recommended)

### Docker Compose Example

```yaml
version: '3.8'

services:
  pidicon:
    image: ghcr.io/markus-barta/pidicon:latest
    container_name: pidicon
    restart: unless-stopped
    network_mode: host

    # Mount persistent volume for all user data
    volumes:
      - ./mounts/pidicon/data:/data
      - ./mounts/shared/tmp:/shared-tmp # Optional: shared temp files

    environment:
      - TZ=Europe/Vienna
      - PIDICON_CONFIG_PATH=/data/devices.json
      - PIDICON_MEDIA_PATH=/data/media
      - PIDICON_SCENES_PATH=/data/scenes
      - PIDICON_WEB_PORT=10829
      - PIDICON_WEB_AUTH=admin:secret

    labels:
      - 'com.centurylinklabs.watchtower.enable=true'
```

### Volume Mount

The `/data` directory should be mounted as a volume:

```bash
docker run -d \
  --name pidicon \
  --restart unless-stopped \
  -v /path/on/host/pidicon-data:/data \
  -p 10829:10829 \
  ghcr.io/markus-barta/pidicon:latest
```

### First-Time Setup

1. **Create host directory**

```bash
mkdir -p ./mounts/pidicon/data/{media,scenes}
chmod -R 755 ./mounts/pidicon
```

1. **Optional: Pre-populate config from example**

```bash
cp config/devices.example.json ./mounts/pidicon/data/devices.json
# Edit the file to match your devices
```

Or create manually:

```bash
cat > ./mounts/pidicon/data/devices.json << 'EOF'
{
  "version": "1.0",
  "lastModified": "2025-10-13T00:00:00Z",
  "settings": {
    "mediaPath": "/data/media",
    "scenesPath": "/data/scenes"
  },
  "devices": [
    {
      "id": "pidicon-001",
      "name": "Living Room Display",
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
EOF
```

1. **Start container**

```bash
docker compose up -d pidicon
```

The container will automatically create `/data/media` and `/data/scenes` directories if they don't exist.

## Local Development

For local development (without Docker), the config file defaults to:

```text
./config/devices.json
```

This file is gitignored to prevent committing sensitive device information.

## Configuration File Format

```json
{
  "devices": {
    "192.168.1.100": {
      "ip": "192.168.1.100",
      "name": "Display Name",
      "deviceType": "pixoo64",
      "driver": "real",
      "startupScene": "startup",
      "brightness": 80,
      "watchdog": {
        "enabled": true,
        "timeoutMinutes": 120,
        "action": "restart",
        "fallbackScene": "empty",
        "notifyOnFailure": true
      }
    }
  }
}
```

## Web UI Management

Devices can be added, edited, and removed via the Web UI:

1. Navigate to: `http://localhost:10829`
2. Click **Settings** → **Devices**
3. Use the UI to manage device configurations
4. Changes are automatically saved to the config file

## Backup & Restore

### Backup

```bash
# From host
cp /home/mba/docker/mounts/pidicon-data/devices.json ~/backups/devices-$(date +%Y%m%d).json

# Or export via Web UI
# Settings → Import/Export → Download Config
```

### Restore

```bash
# Copy backup to volume mount
cp ~/backups/devices-20251013.json /home/mba/docker/mounts/pidicon-data/devices.json

# Restart container
docker compose restart pidicon
```

## Migration from Environment Variables

**Legacy** (v2.x):

```bash
export PIXOO_DEVICE_TARGETS="192.168.1.100=real"
```

**Current** (v3.x):

- Option 1: Use Web UI to configure devices (recommended)
- Option 2: Create `/data/devices.json` manually
- Option 3: Use environment variable (backward compatible)

## Troubleshooting

### Config not persisting after restart

**Symptom**: Device configurations lost after container restart.

**Solution**: Ensure `/data` is mounted as a volume:

```bash
docker inspect pidicon | grep -A 10 Mounts
```

### Permission denied errors

**Symptom**: Cannot write to `/data/devices.json`.

**Solution**: Check directory permissions on host:

```bash
ls -ld /home/mba/docker/mounts/pidicon-data
chmod 755 /home/mba/docker/mounts/pidicon-data
```

### Config path verification

Check which config path is being used:

```bash
docker logs pidicon | grep "\[CONFIG\]"
```

Expected output:

```text
✓ [INFO] 📋 [CONFIG] Using config path: /data/devices.json
✓ [INFO] 📋 [CONFIG] Loaded 1 device configuration(s)
```

## Security Considerations

1. **Gitignore**: `config/devices.json` is gitignored by default
2. **File permissions**: Config file should be `644` (readable, owner writable)
3. **Directory permissions**: `/data` should be `755` (accessible, owner writable)
4. **No credentials**: Don't store passwords/API keys in device config (use env vars)

## Environment Variables

| Variable                 | Default       | Description                             |
| ------------------------ | ------------- | --------------------------------------- |
| `PIDICON_CONFIG_PATH`    | Auto-detected | Override config file path               |
| `PIDICON_DEVICE_TARGETS` | None          | Legacy: Semicolon-separated device list |

## See Also

- [Architecture Documentation](ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Driver Development](DRIVER_DEVELOPMENT.md)
