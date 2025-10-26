# PIDICON: Pixel Display Controller

🎨✨ **Universal daemon for pixel displays** - Pixoo, AWTRIX, and more

<p align="center">
  <img src="pixxo_opener.png" alt="PIDICON" width="600">
</p>

<p align="center">

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/markus-barta/pidicon)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![Release](https://img.shields.io/badge/release-v3.2.0-green)](https://github.com/markus-barta/pidicon)
[![Devices](https://img.shields.io/badge/devices-Pixoo%20%7C%20AWTRIX-blue)](https://github.com/markus-barta/pidicon)
[![Tests](https://img.shields.io/badge/tests-196%20passing-brightgreen)](https://github.com/markus-barta/pidicon)

</p>

**Multi-device, MQTT-driven scene renderer** for pixel displays with clean architecture, smart scheduling, and
beautiful visuals. Control your displays with simple MQTT messages, through the built-in Web UI, or via persistent configuration.

---

## ✨ Highlights

### Core Features

- **🎮 Multi-Device Support** - Manage multiple displays (Pixoo 64, AWTRIX) from one daemon
- **⚙️ Web-Based Configuration** - Add/edit devices, set startup scenes, configure watchdog via UI
- **🌐 Modern Web UI** - Vue 3 + Vuetify 3 control panel with real-time WebSocket updates
- **📡 MQTT Integration** - Full control via MQTT messages for home automation
- **🎬 Smart Scene System** - Hot-swappable scenes with play/pause/stop controls per device
- **⏰ Scene Scheduling** - Time-based scene activation with weekday filtering (NEW in v3.2)
- **📊 Advanced Scene Manager** - Universal timing parameters, usage tracking, favorites (NEW in v3.2)
- **🐕 Watchdog Monitoring** - Auto-restart, fallback scenes, or MQTT commands on device failure
- **💨 Hot-Swap Drivers** - Switch between real and mock drivers on the fly

### Graphics & Performance

- **🎨 Advanced Graphics Engine** - Device-agnostic rendering (gradients, charts, animations)
- **📊 Real-Time Metrics** - FPS display, frametime monitoring, performance tracking
- **🔍 Full Observability** - Comprehensive logging with 5 levels (debug, info, warning, error, silent)
- **🚀 Production Ready** - Robust error handling, comprehensive testing, deployment tracking
- **🔄 Self-Restarting** - In-container restart with clean Docker networking

### Supported Devices

- **✅ Divoom Pixoo 64** (64x64, HTTP) - Stable, full support
- **🚧 AWTRIX 3** (32x8, MQTT) - Driver ready, implementation in progress

---

## 🤔 Why PIDICON?

**PIDICON (Pixel Display Controller)** started as `pidicon` for the Divoom Pixoo 64, but grew into a universal
platform for managing any pixel display device. Version 3.2 brings comprehensive scene management with scheduling,
usage tracking, and advanced configuration options, making it the most powerful pixel display controller available.

**Key Advantages:**

- **Unified Control**: One daemon, one API, multiple devices
- **Device-Agnostic Scenes**: Scenes adapt to different display sizes automatically
- **Persistent Configuration**: Web-based device management with startup scenes
- **Production-Ready**: Battle-tested code, comprehensive logging, robust error handling
- **Extensible Architecture**: Clean driver interface for adding new device types

**Backward Compatible:** Existing `pidicon` installations work out-of-the-box. Environment variables,
MQTT commands, and scenes continue to function as before. The rebranding to PIDICON reflects the expanded
scope while maintaining 100% compatibility.

---

## 🌐 Web UI - Vue 3 + Vuetify 3

<p align="center">
  **Modern Material Design control panel built with Vue 3**
</p>

**Technology Stack:**

- **Vue 3** - Modern reactive framework with Composition API
- **Vuetify 3** - Material Design component library
- **Pinia** - State management
- **Vite** - Lightning-fast build tool

**Features:**

- 🎮 **Per-Device Control** - Independent scene selection and control for each device
- ⚡ **WebSocket Updates** - Real-time state sync with < 100ms latency
- 📊 **Real-Time Metrics** - FPS display, frametime monitoring, live scene performance
- 🎛️ **Cassette Player Controls** - Play, pause, stop, restart, next, prior with visual feedback
- 🎨 **Scene Browser** - Grouped by folder, numbered, with full path display
- ⚙️ **Scene Manager** - Universal parameters, scheduling, usage tracking, bulk operations (NEW in v3.2)
- 🔄 **Quick Actions** - Restart daemon, switch drivers, reset devices, display on/off
- 💬 **Toast Notifications** - Non-blocking success/error messages (no more alerts!)
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile
- 🌙 **Material Dark Theme** - Professional UI with smooth animations
- 🏷️ **Smart Indicators** - Combined state badges, color-coded status, driver badges

**Access:** `http://your-server:10829` (configurable via `PIXOO_WEB_UI_PORT`)

**Development Mode:**

```bash
npm run ui:dev     # Vite dev server on port 3000 (hot reload)
npm start          # Backend on port 10829
```

---

## 🚀 Quick Start

**Prerequisites:** Node.js 18+, MQTT broker (optional), pixel display on your network

### Option 1: Web UI Configuration (Recommended)

```bash
git clone https://github.com/markus-barta/pidicon.git
cd pidicon
npm install

# Configure MQTT (optional, for automation)
export MOSQITTO_HOST_MS24="your-mqtt-broker"
export MOSQITTO_USER_MS24="your-username"
export MOSQITTO_PASS_MS24="your-password"

# Start the daemon
npm start

# Open Web UI and add devices
open http://localhost:10829
```

1. Click **"Settings"** → **"Devices"** tab
2. Click **"Add Device"**
3. Enter device IP, name, type (Pixoo 64 / AWTRIX)
4. Set startup scene and brightness
5. Configure watchdog (optional)
6. Click **"Test Connection"** → **"Add"**

### Option 2: Environment Variables (Legacy)

```bash
# Configure devices via environment variables
export PIDICON_DEVICE_TARGETS="192.168.1.159=pixoo64:real;192.168.1.189=pixoo64:mock"

# Or use legacy format (still supported)
export PIXOO_DEVICE_TARGETS="192.168.1.159=real;192.168.1.189=mock"

npm start
```

**Test it out:**

```bash
# Via MQTT
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
  -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'

# Or open the Web UI
open http://localhost:10829
```

---

## 🎨 Scenes

**Core Scenes:**

- `startup` - Live build info with real-time date/time updates
- `startup-static` - Static build info display (one-time render)
- `empty` - Clears the display
- `fill` - Solid color fill with random color support
- `power_price` - Comprehensive energy dashboard with weather and time
- `advanced_chart` - Dynamic, styled chart renderer

**Example Scenes:**

- `draw_api` - Drawing API showcase
- `draw_api_animated` - Rich animation demo with FPS overlay
- `graphics_engine_demo` - Advanced graphics engine demonstration
- `performance-test` - Benchmarking with beautiful gradients

All scenes follow a clean contract: return delay in ms for next frame, or `null` to finish.

---

## ⚙️ Configuration

**Environment Variables:**

| Variable                 | Description                 | Example                                 |
| ------------------------ | --------------------------- | --------------------------------------- |
| `MOSQITTO_HOST_MS24`     | MQTT broker host            | `miniserver24`                          |
| `MOSQITTO_USER_MS24`     | MQTT username               | `smarthome`                             |
| `MOSQITTO_PASS_MS24`     | MQTT password               | `your-password`                         |
| `PIXOO_DEVICE_TARGETS`   | Device IP to driver mapping | `192.168.1.159=real;192.168.1.189=mock` |
| `PIXOO_DEFAULT_DRIVER`   | Fallback driver             | `real` or `mock`                        |
| `PIXOO_WEB_UI`           | Enable Web UI               | `true` (default)                        |
| `PIXOO_WEB_UI_PORT`      | Web UI port                 | `10829` (default)                       |
| `SCENE_STATE_TOPIC_BASE` | MQTT state topic base       | `/home/pixoo`                           |

**Tip:** Use `mock` driver for fast, conflict-free development. Switch to `real` when you want to see pixels on your device.

---

## 📡 MQTT Commands

**Topic Format:** `pixoo/<ip>/state/upd`

**Examples:**

```bash
# Clear screen
mosquitto_pub ... -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"empty"}'

# Fill with red
mosquitto_pub ... -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"fill","color":[255,0,0,255]}'

# Animated demo
mosquitto_pub ... -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated"}'

# Performance test (100 frames at 150ms)
mosquitto_pub ... -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance-test","interval":150,"frames":100}'

# Switch driver
mosquitto_pub ... -t "pixoo/192.168.1.159/driver/set" -m 'mock'

# Reset device
mosquitto_pub ... -t "pixoo/192.168.1.159/reset" -m 'soft'
```

See [MQTT_COMMANDS.md](MQTT_COMMANDS.md) for the complete reference.

---

## 🏗️ Architecture

### **Core Services**

- **Dependency Injection** - Lightweight container for clean service management
- **MQTT Service** - Centralized connection and message routing
- **State Store** - Single source of truth for all state
- **Scene Manager** - Lifecycle management and scheduling
- **Command Handlers** - Clean pattern for MQTT message processing
- **Service Layer** - Business logic abstraction for Web UI and MQTT

### **Design Principles**

- **Centralized Scheduling** - One loop per device, scenes just render
- **Pure Render Contract** - Scenes return delay or null, no timers or MQTT
- **Input Gating** - Stale frames automatically dropped
- **Hot-Swappable Drivers** - Switch between real/mock without restart
- **Full Observability** - MQTT mirroring with build metadata

For detailed architecture docs, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [lib/README.md](lib/README.md).

---

## 🧑‍💻 Development

### **Scripts**

```bash
npm start              # Run the daemon
npm run build:version  # Update version.json
npm run lint           # Check code quality
npm run lint:fix       # Auto-fix linting issues
npm test               # Run test suite
npm run md:fix         # Fix markdown formatting
```

### **Creating a Scene**

```javascript
'use strict';

module.exports = {
  name: 'my_scene',
  description: 'My awesome scene',
  category: 'Custom',
  wantsLoop: true, // true for animated, false for static

  async init(ctx) {
    // One-time setup
  },

  async render(ctx) {
    const { device } = ctx;

    // Draw your frame
    device.fillRect(0, 0, 64, 64, [0, 0, 0, 255]);
    device.drawText('Hello!', 32, 32);
    await device.push('my_scene', ctx.publishOk);

    // Return delay in ms for next frame, or null to finish
    return 1000; // 1 second
  },

  async cleanup(ctx) {
    // Clean up resources
  },
};
```

See `scenes/examples/dev/template.js` for a complete starter template and
[docs/SCENE_DEVELOPMENT.md](docs/SCENE_DEVELOPMENT.md) for the full guide.

### **Scene Organization**

Scenes are organized into three categories:

- **Core Scenes** (`scenes/`): Production scenes - `startup`, `empty`, `fill`
- **Showcase** (`scenes/examples/`): Feature demonstrations - `pixoo_showcase` (comprehensive demo of all capabilities)
- **Development** (`scenes/examples/dev/`): Advanced scenes, templates, and testing - hidden by default in Web UI

**Toggle Dev Scenes:** Click the "Scene Control" label in the Web UI to show/hide development scenes in the dropdown.

---

## ✅ Testing

**Run Tests:**

```bash
npm test  # Full test suite (196 tests)
```

**Live Testing Scripts:**

```bash
node scripts/live_test_harness.js      # Scene cycle smoke test
node scripts/live_test_gate.js         # Frame gating verification
node scripts/live_test_perf_once.js    # Performance benchmark
```

**Best Practices:**

- Use `mock` driver for fast iteration
- Test with real device only when needed
- Check build number matches before live testing (see [STANDARDS.md](STANDARDS.md))

---

## 👀 Observability

### **MQTT State Topics**

- `${SCENE_STATE_TOPIC_BASE}/<ip>/scene/state` - Full device state
- `pixoo/<ip>/ok` - Per-frame push metrics
- `pixoo/<ip>/metrics` - Device metrics (pushes, errors, frametime)

**State Payload:**

```json
{
  "currentScene": "startup",
  "status": "running",
  "playState": "playing",
  "generationId": 42,
  "version": "2.1.0",
  "buildNumber": 603,
  "gitCommit": "0317b5d",
  "ts": 1696351234567
}
```

### **Web UI Monitoring**

- Real-time FPS and frametime for animated scenes
- Push counts and error tracking
- Device status and scene information
- Build number and version display

---

## 🐳 Docker Deployment

**Docker Compose:**

```yaml
pidicon:
  image: ghcr.io/markus-barta/pidicon:latest
  container_name: pidicon
  restart: unless-stopped # or 'no' - daemon can self-restart
  ports:
    - '10829:10829' # Web UI
  environment:
    - TZ=Europe/Vienna
    - PIXOO_DEVICE_TARGETS=192.168.1.159=real;192.168.1.189=mock
  env_file:
    - /path/to/secrets/smarthome.env
```

**Features:**

- Automatic image updates via Watchtower
- Self-restart capability (no Docker restart policy required)
- Web UI accessible on standard ports
- Clean container networking (no host networking required)
- Persistent configuration via environment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide.

---

## ❓ FAQ

**Q: How do I create a new scene?**  
A: Copy `scenes/template.js`, customize it, and restart the daemon. Follow the pure-render contract.

**Q: Why return a number or null from render()?**  
A: The number is the delay (ms) before next frame. `null` signals completion. This lets the central
scheduler manage timing cleanly.

**Q: Can I run multiple devices?**  
A: Yes! Each device has its own scheduler and state machine. Fully isolated.

**Q: How do I switch drivers?**  
A: Via MQTT: `mosquitto_pub ... -t "pixoo/<ip>/driver/set" -m 'mock'`  
Or via Web UI: Click the driver toggle button.

**Q: Why use mock driver?**  
A: Fast, conflict-free development. No device required. Perfect for testing scene logic.

**Q: How do I debug issues?**  
A: Enable debug logging: `LOG_LEVEL=debug npm start`  
Monitor MQTT: `mosquitto_sub -h $MOSQITTO_HOST_MS24 -t 'pixoo/+/#'`  
Use mock driver to isolate issues.

**Q: What if scenes don't update?**  
A: Check `await device.push()` is called, `wantsLoop: true` for animated scenes, and verify scene
exports `name`, `render`, etc.

---

## 🔧 Troubleshooting

| Issue                     | Solution                                                                      |
| ------------------------- | ----------------------------------------------------------------------------- |
| **Scene not loading**     | Check logs for "Scene registered" messages. Verify exports: `name`, `render`  |
| **MQTT not working**      | Verify environment variables. Test with: `mosquitto_pub -t 'test' -m 'hello'` |
| **Device unreachable**    | Ping device. Check IP in `PIXOO_DEVICE_TARGETS`. Try mock driver first        |
| **Performance issues**    | Use `LOG_LEVEL=debug` to profile. Check `cleanup()` is implemented properly   |
| **Web UI empty**          | Hard refresh browser (Cmd+Shift+R). Check console for errors                  |
| **Container won't start** | Check logs with: `docker logs pidicon --tail 100`                             |

**Debug Commands:**

```bash
# Debug logging
LOG_LEVEL=debug npm start

# Monitor MQTT
mosquitto_sub -h $MOSQITTO_HOST_MS24 -t 'pixoo/+/#' -v

# Check device state
mosquitto_sub -h $MOSQITTO_HOST_MS24 -t '/home/pixoo/+/scene/state'

# Docker logs
docker logs pidicon -f --timestamps --tail 100
```

---

## ❤️ Contributing

Contributions welcome! Please:

- Follow the guidelines in [STANDARDS.md](STANDARDS.md) and [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md)
- Keep commits conventional (`feat:`, `fix:`, `docs:`)
- Write tests for new features
- Update documentation

Open an issue or PR and let's make something great together!

---

## 📚 Documentation

- [docs/API.md](docs/API.md) - **Complete API Reference**
- [docs/reports/SCENE_MANAGER_IMPLEMENTATION.md](docs/reports/SCENE_MANAGER_IMPLEMENTATION.md) - **Scene Manager v3.2** (NEW)
- [STANDARDS.md](STANDARDS.md) - Development standards and best practices
- [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md) - Code quality guidelines
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and patterns
- [docs/SCENE_DEVELOPMENT.md](docs/SCENE_DEVELOPMENT.md) - Scene development guide
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide
- [docs/VERSIONING.md](docs/VERSIONING.md) - Version management strategy
- [MQTT_COMMANDS.md](MQTT_COMMANDS.md) - Complete MQTT command reference
- [docs/BACKLOG.md](docs/BACKLOG.md) - Roadmap and backlog

---

## 📄 License

GNU AGPL v3.0 — free as in freedom. See LICENSE for details.

---

### Made with ❤️ and lots of pixels
