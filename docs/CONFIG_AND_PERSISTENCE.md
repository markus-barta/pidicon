# Configuration & Persistence Guide

**Status**: ✅ Active  
**Last Updated**: 2025-10-03

---

## 🔧 How Configuration Works

### Current Implementation

The Pixoo Daemon currently uses **environment variables** for configuration, loaded at startup. There is **no persistent file-based configuration** yet.

### Configuration Sources (Priority Order)

1. **Environment Variables** (highest priority)
   - Set directly in shell or Docker environment
   - Read once at daemon startup
2. **Docker Compose** `env_file`
   - Mounted secrets file (e.g., `/home/mba/secrets/smarthome.env`)
3. **Default Values** (fallback)
   - Hardcoded defaults in `daemon.js`

---

## 📋 Configuration Variables

| Variable                 | Description                     | Example                                 | Default       |
| ------------------------ | ------------------------------- | --------------------------------------- | ------------- |
| `MOSQITTO_HOST_MS24`     | MQTT broker host                | `miniserver24`                          | `localhost`   |
| `MOSQITTO_USER_MS24`     | MQTT username                   | `smarthome`                             | (none)        |
| `MOSQITTO_PASS_MS24`     | MQTT password                   | `your-password`                         | (none)        |
| `PIXOO_DEVICE_TARGETS`   | Device IP to driver mapping     | `192.168.1.159=real;192.168.1.189=mock` | (none)        |
| `PIXOO_DEFAULT_DRIVER`   | Fallback driver for new devices | `real` or `mock`                        | `mock`        |
| `PIXOO_WEB_UI`           | Enable/disable Web UI           | `true` or `false`                       | `true`        |
| `PIXOO_WEB_UI_PORT`      | Web UI HTTP port                | `10829`                                 | `10829`       |
| `PIXOO_WEB_AUTH`         | Basic auth (user:pass)          | `admin:secret`                          | (disabled)    |
| `SCENE_STATE_TOPIC_BASE` | MQTT state topic base           | `/home/pixoo`                           | `/home/pixoo` |
| `LOG_LEVEL`              | Logging verbosity               | `debug`, `info`, `warn`, `error`        | `info`        |

---

## 🔄 Mock Mode Switching

### What is Mock Mode?

Mock mode is a **driver-level feature** that allows you to test scenes without a physical Pixoo device:

- **Real Driver** (`real`):
  - Sends HTTP commands to actual Pixoo hardware (`192.168.1.x`)
  - Requires device to be powered on and connected
  - Full hardware interaction (display, buttons, etc.)

- **Mock Driver** (`mock`):
  - Simulates device without sending HTTP requests
  - Logs operations to console instead
  - Fast, no network delays
  - Perfect for development and testing

### How Switching Works

**1. Initial Configuration** (at startup)

```bash
# Environment variable sets initial driver per device
PIXOO_DEVICE_TARGETS="192.168.1.159=real;192.168.1.189=mock"
```

**2. Runtime Switching** (via MQTT or Web UI)

#### Via MQTT:

```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
  -t "pixoo/192.168.1.159/driver/set" -m 'mock'
```

#### Via Web UI:

- Click the "Mock Mode" toggle switch on any device card
- Driver switches immediately, no restart required

**3. Internal Process:**

```javascript
// lib/services/device-service.js
async switchDriver(deviceIp, newDriver) {
  // 1. Stop current scene rendering
  this.sceneManager.stopDevice(deviceIp);

  // 2. Update driver in DeviceAdapter
  this.deviceAdapter.setDriverForDevice(deviceIp, newDriver);

  // 3. Re-render current scene with new driver
  this.sceneManager.renderActiveScene(deviceIp);
}
```

**4. Behavior:**

- ✅ **Scene state preserved**: Current scene continues running
- ✅ **No frame loss**: Graceful transition
- ✅ **Hot-swappable**: No daemon restart required

---

## 💾 Persistence & State

### What IS Persistent

1. **Environment Variables**
   - Set in Docker Compose `environment:` or `env_file:`
   - Persist across container restarts (Docker handles this)
   - **Limitation**: Changes require container restart

2. **Build Metadata** (`version.json`)
   - Written at build time by `scripts/build-version.js`
   - Baked into Docker image
   - Includes: version, build number, git commit, timestamp

3. **MQTT State Topics**
   - Scene state published to `/home/pixoo/<ip>/scene/state`
   - Retained by MQTT broker (if configured)
   - **Limitation**: Lost if broker restarts without persistence

### What is NOT Persistent

1. **Driver Switches** (via Web UI or MQTT)
   - ❌ Lost on daemon restart
   - Reverts to `PIXOO_DEVICE_TARGETS` on startup
   - **Workaround**: Update environment variable in Docker Compose

2. **Scene State** (which scene is running)
   - ❌ Not automatically restored after restart
   - Daemon starts in idle state
   - **Workaround**: Trigger scene via MQTT in startup automation

3. **Web UI Preferences**
   - ❌ No localStorage/cookies (yet)
   - Collapsed device cards, view preferences not saved
   - **Future**: UI-501-504 backlog items address this

---

## 🚀 Planned: File-Based Configuration (Backlog)

### Future Implementation (CFG-501 to CFG-503)

**Goal**: Web UI config page with persistent storage

```yaml
# /data/pixoo-daemon/config.yaml (example)
mqtt:
  host: miniserver24
  username: smarthome
  password: '***'

devices:
  - ip: 192.168.1.159
    name: 'Office Display'
    driver: real
    defaultScene: power_price
  - ip: 192.168.1.189
    name: 'Conference Room'
    driver: mock
    defaultScene: empty

webui:
  enabled: true
  port: 10829
  auth:
    enabled: false
    username: admin
    password: '***'

logging:
  level: info
```

**Benefits:**

- ✅ Persistent driver switches
- ✅ Per-device default scenes
- ✅ Web UI editing
- ✅ Hot reload (no restart)
- ✅ Backup/restore via volume

**Docker Volume Mount:**

```yaml
volumes:
  - ./data/pixoo-daemon:/data # Config persistence
```

---

## 🔍 Current Limitations & Workarounds

| Limitation                  | Impact                         | Workaround                                   | Backlog Item |
| --------------------------- | ------------------------------ | -------------------------------------------- | ------------ |
| No driver persistence       | Manual re-switch after restart | Update `PIXOO_DEVICE_TARGETS` in Docker      | CFG-501      |
| No scene restoration        | Devices idle on restart        | MQTT automation to trigger default scene     | -            |
| No Web UI state persistence | Collapsed cards reset          | Refresh after changes                        | UI-503       |
| Config requires restart     | Downtime for config changes    | Plan changes in batches                      | CFG-503      |
| No backup/restore           | Manual reconstruction if lost  | Save `docker-compose.yml` + env files to Git | CFG-502      |

---

## 📝 How to Change Configuration

### 1. Environment Variables (Current Method)

**On Server:**

```bash
# Edit env file
nano /home/mba/secrets/smarthome.env

# Add/modify variables
PIXOO_DEVICE_TARGETS="192.168.1.159=mock"

# Restart container
cd /home/mba/docker
docker compose restart pixoo-daemon
```

**Docker Compose:**

```yaml
pixoo-daemon:
  environment:
    - PIXOO_DEVICE_TARGETS=192.168.1.159=real;192.168.1.189=mock
    - PIXOO_DEFAULT_DRIVER=mock
  env_file:
    - /home/mba/secrets/smarthome.env
```

### 2. Runtime Driver Switch (Temporary)

**Via Web UI:**

- Toggle "Mock Mode" switch on device card
- ⚠️ Lost on restart

**Via MQTT:**

```bash
mosquitto_pub ... -t "pixoo/<ip>/driver/set" -m 'mock'
```

### 3. Scene Switch (Temporary)

**Via Web UI:**

- Select scene from dropdown
- Use Prev/Next buttons

**Via MQTT:**

```bash
mosquitto_pub ... -t "pixoo/<ip>/state/upd" -m '{"scene":"empty"}'
```

---

## 🎯 Best Practices

1. **Document Your Config**
   - Keep `docker-compose.yml` in version control
   - Comment env variables for future reference

2. **Use Mock for Development**
   - Start with `PIXOO_DEFAULT_DRIVER=mock`
   - Switch to `real` only when testing hardware

3. **Automate Scene Restoration**
   - Use Node-RED or Home Assistant to trigger default scenes on startup

4. **Plan for Future Config System**
   - Don't hardcode values in scenes
   - Use payload properties for flexibility

5. **Monitor MQTT State**
   - Subscribe to `/home/pixoo/+/scene/state` for observability
   - Check `buildNumber` matches deployed version

---

## 🔮 Future Enhancements (Backlog)

- **CFG-501**: File-based config with `/data` volume
- **CFG-502**: REST API for config management
- **CFG-503**: Hot reload (apply config without restart)
- **UI-503**: Collapsible cards with localStorage
- **UI-505**: Config page in Web UI

---

**Questions?** See `MQTT_COMMANDS.md` for command reference or `docs/BACKLOG.md` for roadmap.
