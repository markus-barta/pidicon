# Pixoo Daemon 🧩💡

<p align="center">
  <img src="pixxo_opener.png" alt="Pixoo Daemon" width="600">
</p>

Pixoo Daemon is a friendly, MQTT-driven scene renderer for the Divoom Pixoo 64.
It listens to MQTT messages, manages scenes, and renders pixels with an upbeat
vibe and a professional, production-ready architecture.

Think: clean code, smart scheduling, rock-solid scene switching, and beautiful
visuals – all under your control with a few simple MQTT messages.

---

## ✨ Highlights

- **Centralized Scheduler**: One device loop per Pixoo; scenes are pure
  renderers that return a delay (ms) or `null` to finish.
- **Per-Device State Machine**: Authoritative `currentScene`, `targetScene`,
  `generationId`, and `status` mirrored to MQTT for observability.
- **Pure-Render Contract**: Scenes do not own timers or publish MQTT. No
  zombies, no stale frames.
- **Input Gating**: Stale animation frames are ignored if scene/generation do
  not match – because correctness matters.
- **Hot-Swappable Drivers**: Switch between `real` HTTP and lightning-fast
  `mock` drivers on the fly.
- **Observability Built-In**: Publishes `/home/pixoo/<ip>/scene/state` with
  build metadata for traceable runs.
- **Advanced Renderers**: High-quality charting, gradients, and smooth
  animation primitives.
- **Structured Logging**: Clear, cheerful logs with context (`ok`, `info`,
  `warn`, `error`).

---

## 📚 Table of Contents

- [Highlights](#-highlights)
- [Architecture Overview](#-architecture-overview)
- [Scenes](#-scenes)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [MQTT Topics & Commands](#-mqtt-topics--commands)
- [Local Development](#-local-development)
- [Testing & Live Recipes](#-testing--live-recipes)
- [Observability](#-observability)
- [FAQ](#-faq)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 Architecture Overview

- **Centralized Per-Device Scheduler**: A single loop per device drives all
  loop-enabled scenes. Scenes signal cadence by returning a number (ms), and
  signal completion by returning `null`.
- **Per-Device State Machine**: Each device tracks `currentScene`,
  `generationId`, and `status` (`switching` → `running`). The authoritative
  state is available to scenes and mirrored to MQTT.
- **Pure-Render Contract**: Scenes never own timers or publish MQTT messages
  for "next frame". This eliminates race conditions and stale updates.
- **Input Gating**: Messages tagged as animation frames are dropped unless they
  match the active `(scene, generation)`. No more zombie frames.
- **Hot Drivers**: Swap between `real` (HTTP) and `mock` drivers without
  restarting. Great for local development and CI.

For a deeper dive into the scene interface and responsibilities, see
`scenes/README.md` and `STANDARDS.md`.

---

## 🎨 Scenes

Core scenes:

- `startup`: Build and version info on boot.
- `empty`: Clears the display.
- `fill`: Solid color fill.
- `advanced_chart`: A dynamic, well-styled chart renderer.

Examples:

- `draw_api`: Showcases the drawing API primitives.
- `draw_api_animated`: Rich animation demo with FPS/ms overlay. Supports
  optional `interval` and `frames`.
- `performance-test`: Finite or adaptive benchmarking with beautiful
  gradients and a centered "COMPLETE" overlay.

All animated scenes declare `wantsLoop: true` and follow the pure-render
contract by returning either a next delay or `null`.

---

## 🚀 Quick Start

Prerequisites: Node.js 18+, an MQTT broker, and a Pixoo 64 on your network.

```bash
git clone https://github.com/markus-barta/pixoo-daemon.git
cd pixoo-daemon
npm install

# Set environment variables (examples below) and then start
npm start
```

Send your first command (replace IP):

```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
  -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'
```

---

## ⚙️ Configuration

Environment variables (recommended to set via your shell or `.env`):

- `MOSQITTO_HOST_MS24` / `MOSQITTO_USER_MS24` / `MOSQITTO_PASS_MS24`:
  MQTT connection.
- `PIXOO_DEVICE_TARGETS`: Mapping of device IPs to drivers. Example:
  `192.168.1.159=real;192.168.1.189=mock`.
- `PIXOO_DEFAULT_DRIVER`: Fallback driver (`real` or `mock`).
- `SCENE_STATE_TOPIC_BASE`: Base topic for scene state (default `/home/pixoo`).

Tip: During development, the mock driver is fast and conflict-free. Use the
real driver when you want to see pixels on your device.

---

## 📡 MQTT Topics & Commands

The daemon listens to device-scoped commands like `pixoo/<ip>/state/upd`. It
also publishes scene state to `/home/pixoo/<ip>/scene/state` (configurable).

Starter commands:

```bash
# Clear screen
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
  -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"empty"}'

# Fill red
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
  -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"fill","color":[255,0,0,255]}'

# Animated demo (indefinite)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
  -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated"}'

# Animated demo (adaptive, 64 frames)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
  -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated","frames":64}'

# Performance test (fixed 150ms, 100 frames)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 \
  -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance-test","interval":150,"frames":100}'
```

For the full list, see `MQTT_COMMANDS.md`.

---

## 🧑‍💻 Local Development

- Scripts:
  - `npm start`: run the daemon
  - `npm run build:version`: update `version.json`
  - `npm run lint` / `npm run lint:fix`: ESLint
  - `npm run md:lint` / `npm run md:fix`: Markdownlint

- Scene interface (pure-render contract):

```javascript
'use strict';

module.exports = {
  name: 'my_scene',
  wantsLoop: true, // animated scenes opt in; static scenes set false
  async init(ctx) {
    // one-time setup
  },
  async render(ctx) {
    const { device } = ctx;
    // draw your frame...
    await device.push('my_scene', ctx.publishOk);

    // return next delay in ms (loop-driven) or null to finish
    return 0; // schedule next frame ASAP
  },
  async cleanup(ctx) {
    // free resources; keep it idempotent
  },
};
```

---

## ✅ Testing & Live Recipes

We provide mock tests and live helpers in `scripts/`:

- `scripts/live_test_harness.js`: quick scene cycle smoke test
- `scripts/live_test_gate.js`: verifies stale frame gating
- `scripts/live_test_perf_once.js`: single finite perf run
- `scripts/live_test_perf_repeat.js`: consecutive perf runs
- `scripts/live_test_draw_animated.js [frames]`: run animated demo; if
  `frames >= 0` it stops and shows a centered "COMPLETE" overlay

Use the mock driver whenever possible. When testing live, confirm the device is
free and that the build/commit on the device matches your local before you run
tests (see `STANDARDS.md` "Live Server Testing Protocol").

---

## 👀 Observability

Scene state is published to:

- `${SCENE_STATE_TOPIC_BASE}/<ip>/scene/state` (default `/home/pixoo`)

Payload keys include `currentScene`, `targetScene`, `status`, `generationId`,
`version`, `buildNumber`, `gitCommit`, and `ts`. You can watch these to confirm
the right build is live before running tests.

Each successful `push()` also emits `pixoo/<ip>/ok` with per-frame metrics.

---

## ❓ FAQ

- **Why do scenes return a number or `null`?**
  - Returning a number (ms) tells the central scheduler when to render the next
    frame. Returning `null` signals completion so the loop stops cleanly.

- **Can scenes manage their own timers or publish next-frame MQTT?**
  - No. That would break the pure-render contract and reintroduce race
    conditions. The central loop does the timing; scenes focus on pixels.

- **How are stale frames avoided?**
  - Input gating drops animation-frame messages whose `(scene, generation)` do
    not match the active device state. Old scenes cannot affect the screen.

- **Can I run multiple devices?**
  - Yes. Each device has its own state machine and scheduler loop; devices are
    fully isolated.

---

## 🗺️ Roadmap

- Public v1.1 released with centralized scheduler, pure-render scenes, and
  improved observability.
- Stability soak test (SOAK-009) planned for a later milestone.

See `docs/BACKLOG.md` for detailed tasks, status, and traceable test results.

---

## ❤️ Contributing

We love contributions! Please open an issue or PR and follow the guidelines in
`STANDARDS.md`. Keep commits conventional, code clean, and docs helpful.

---

## 📄 License

MIT License — do good things, be kind, and give credit where due.
