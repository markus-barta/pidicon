# Pixoo Daemon

🎨✨

<p align="center">
  <img src="pixxo_opener.png" alt="Pixoo Daemon" width="600">
</p>

<p align="center">

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/markus-barta/pixoo-daemon)
[![License](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)
[![Release](https://img.shields.io/badge/release-stable-green)](https://github.com/markus-barta/pixoo-daemon)

</p>

**MQTT-driven scene renderer for Divoom Pixoo 64** with clean architecture, smart scheduling, and beautiful visuals. Control your display with simple MQTT messages or through the built-in Web UI.

---

## ✨ Highlights

- **🌐 Web UI Control Panel** - Manage your Pixoo devices from any browser (port 10829)
- **📡 MQTT Integration** - Full control via MQTT messages for automation
- **🎬 Smart Scene System** - Hot-swappable scenes with automatic scheduling
- **🔄 Self-Restarting** - In-container restart with clean Docker networking
- **🎨 Advanced Graphics** - Professional rendering with gradients, charts, and smooth animations
- **🔍 Full Observability** - Real-time metrics, FPS monitoring, and deployment tracking
- **🚀 Production Ready** - Robust error handling, comprehensive logging, and 152/152 tests passing
- **💨 Hot-Swap Drivers** - Switch between real and mock drivers on the fly

---

## 🌐 Web UI - Vue 3 + Vuetify 3

<p align="center">
  <strong>Modern Material Design control panel built with Vue 3</strong>
</p>

**Technology Stack:**

- **Vue 3** - Modern reactive framework with Composition API
- **Vuetify 3** - Material Design component library
- **Pinia** - State management
- **Vite** - Lightning-fast build tool

**Features:**

- 🎮 **Per-Device Control** - Independent scene selection and control for each device
- 📊 **Real-Time Metrics** - FPS display, frametime monitoring, live uptime counter
- 🎨 **Scene Browser** - Categorized scenes with descriptions and animation indicators
- 🔄 **Quick Actions** - Restart daemon, switch drivers, reset devices, display on/off
- 💬 **Toast Notifications** - Non-blocking success/error messages (no more alerts!)
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile
- 🌙 **Material Dark Theme** - Professional UI with smooth animations
- ⚡ **Next/Prev Navigation** - Quick scene switching with keyboard-friendly controls
- 🏷️ **Smart Indicators** - Color-coded status, driver badges, category labels

**Access:** `http://your-server:10829` (configurable via `PIXOO_WEB_UI_PORT`)

**Development Mode:**

```bash
npm run ui:dev     # Vite dev server on port 3000 (hot reload)
npm start          # Backend on port 10829
```

---

## 🚀 Quick Start

**Prerequisites:** Node.js 18+, MQTT broker, Pixoo 64 on your network

```bash
git clone https://github.com/markus-barta/pixoo-daemon.git
cd pixoo-daemon
npm install

# Configure environment variables
export MOSQITTO_HOST_MS24="your-mqtt-broker"
export MOSQITTO_USER_MS24="your-username"
export MOSQITTO_PASS_MS24="your-password"
export PIXOO_DEVICE_TARGETS="192.168.1.159=real;192.168.1.189=mock"

# Start the daemon
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

See `scenes/template.js` for a complete starter template and [docs/SCENE_DEVELOPMENT.md](docs/SCENE_DEVELOPMENT.md) for the full guide.

---

## ✅ Testing

**Run Tests:**

```bash
npm test  # Full test suite (152 tests)
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
  "generationId": 42,
  "version": "2.0.0",
  "buildNumber": 495,
  "gitCommit": "b788c8e",
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
pixoo-daemon:
  image: ghcr.io/markus-barta/pixoo-daemon:latest
  container_name: pixoo-daemon
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
A: The number is the delay (ms) before next frame. `null` signals completion. This lets the central scheduler manage timing cleanly.

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
A: Check `await device.push()` is called, `wantsLoop: true` for animated scenes, and verify scene exports `name`, `render`, etc.

---

## 🔧 Troubleshooting

| Issue                     | Solution                                                                      |
| ------------------------- | ----------------------------------------------------------------------------- |
| **Scene not loading**     | Check logs for "Scene registered" messages. Verify exports: `name`, `render`  |
| **MQTT not working**      | Verify environment variables. Test with: `mosquitto_pub -t 'test' -m 'hello'` |
| **Device unreachable**    | Ping device. Check IP in `PIXOO_DEVICE_TARGETS`. Try mock driver first        |
| **Performance issues**    | Use `LOG_LEVEL=debug` to profile. Check `cleanup()` is implemented properly   |
| **Web UI empty**          | Hard refresh browser (Cmd+Shift+R). Check console for errors                  |
| **Container won't start** | Check logs with: `docker logs pixoo-daemon --tail 100`                        |

**Debug Commands:**

```bash
# Debug logging
LOG_LEVEL=debug npm start

# Monitor MQTT
mosquitto_sub -h $MOSQITTO_HOST_MS24 -t 'pixoo/+/#' -v

# Check device state
mosquitto_sub -h $MOSQITTO_HOST_MS24 -t '/home/pixoo/+/scene/state'

# Docker logs
docker logs pixoo-daemon -f --timestamps --tail 100
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

- [STANDARDS.md](STANDARDS.md) - Development standards and best practices
- [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md) - Code quality guidelines
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and patterns
- [docs/SCENE_DEVELOPMENT.md](docs/SCENE_DEVELOPMENT.md) - Scene development guide
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide
- [docs/VERSIONING.md](docs/VERSIONING.md) - Version management strategy
- [MQTT_COMMANDS.md](MQTT_COMMANDS.md) - Complete MQTT command reference

---

## 📄 License

MIT License — do good things, be kind, and give credit where due.

---

**Made with ❤️ and lots of pixels**
