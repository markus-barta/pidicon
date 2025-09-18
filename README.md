# Pixoo Daemon 🧩💡

<p align="center">
  <img src="pixxo_opener.png" alt="Pixoo Daemon" width="600">
</p>

A friendly, MQTT-driven scene renderer for Divoom Pixoo 64 devices, written in
Node.js. It listens to MQTT messages, manages scenes, and renders pixels with a
focus on clean architecture and helpful, positive logs.

---

## ✨ Features

- **Central Scheduler**: One loop per device; scenes are pure renderers and return
  a next delay (ms) or `null` when complete.
- **Per-Device State Machine**: Tracks `currentScene`, `generationId`, and
  `status` (switching/running) for robust scene switching.
- **Pure-Render Scenes**: No scene-owned timers or MQTT; timing and gating are
  handled centrally.
- **MQTT Control**: Full control per device (scene selection, driver switching,
  resets) and metrics.
- **Observability**: Publishes `/home/pixoo/<ip>/scene/state` with version,
  build number, git commit for traceability.
- **Hot-Swappable Drivers**: Switch between `real` HTTP driver and `mock` driver
  on the fly.
- **Advanced Renderers**: High-quality renderers for charts, gradients, and
  smooth animations.
- **Smart Boot Handling**: Detects freshly booted devices and handles them
  gracefully.
- **Structured Logging**: Clean, informative logs with helpful context.

---

## 🚀 Quick Start

**Prerequisites**: Node.js 18+, an MQTT broker, and a Pixoo 64 on your network.

```bash
git clone https://github.com/markus-barta/pixoo-daemon.git
cd pixoo-daemon
npm install

# Configure your MQTT credentials and device IPs in a .env file (see .env.example)
# Or set environment variables manually.

npm start
```

Send your first command (replace the IP with your device's):

```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'
```

---

## 🛠️ Usage & Configuration

For detailed information on configuration, MQTT topics, scene development, and
deployment, please refer to the documents below:

- **[MQTT Commands (`MQTT_COMMANDS.md`)]**: A quick reference for all scene commands.
- **[Deployment Guide (`DEPLOYMENT.md`)]**: Instructions for deploying the daemon with Docker and GitHub Actions.
- **[Development Standards (`STANDARDS.md`)]**: Our guide to code quality, testing, and contributions.
- **[Scenes Guide (`scenes/README.md`)]**: Scene contract, `wantsLoop`, and
  pure-render architecture.

---

## ❤️ Contributing

Contributions are warmly welcome! Please open an issue to discuss any substantial
changes, and be sure to follow the guidelines in `STANDARDS.md`. We love clean
code and good commit messages.

---

## 📄 License

MIT License — do good things, be kind, and give credit where due.
