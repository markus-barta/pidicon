// Pixoo Daemon
// - Loads scene modules from `./scenes`
// - Subscribes to MQTT updates per device
// - Routes each state update to the selected scene renderer
// @author: Sonic + Cursor + Markus Barta (mba)
const fs = require("fs");
const path = require("path");
const mqtt = require("mqtt");
const {
  getContext,
  setDriverForDevice,
  getDriverForDevice,
  devices,
  resolveDriver,
  deviceDrivers,
} = require("./lib/device-adapter");
const { softReset } = require("./lib/pixoo-http");

// MQTT connection config (devices discovered dynamically via PIXOO_DEVICE_TARGETS)
const brokerUrl = `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`;
const mqttUser = process.env.MOSQITTO_USER_MS24;
const mqttPass = process.env.MOSQITTO_PASS_MS24;

// Default scene per device (set via MQTT)
const deviceDefaults = new Map(); // deviceIp -> default scene

// Stores last state per device IP so we can re-render on driver switch
const lastState = {}; // deviceIp -> { key, payload, sceneName }

// Device boot state tracking
const deviceBootState = new Map(); // deviceIp -> { booted: boolean, lastActivity: timestamp }

// Scene registry: scene name -> render function
const scenes = new Map();

// Load all scenes from ./scenes
fs.readdirSync(path.join(__dirname, "scenes")).forEach((file) => {
  if (file.endsWith(".js")) {
    const scene = require(path.join(__dirname, "scenes", file));
    scenes.set(scene.name, {
      render: scene.render,
    });
  }
});

const startTs = new Date().toLocaleString("de-AT");
console.log(`**************************************************`);
console.log(`Starting Pixoo Daemon at [${startTs}] ...`);
console.log(`**************************************************`);
console.log("MQTT Broker:", brokerUrl);
if (deviceDrivers.size > 0) {
  console.log("Configured Devices and Drivers:");
  Array.from(deviceDrivers.entries()).forEach(([ip, driver]) => {
    console.log(`  ${ip} → ${driver}`);
  });
} else {
  console.log("No device targets configured (use PIXOO_DEVICE_TARGETS env var or DEVICE_TARGETS_OVERRIDE in code)");
}
console.log("Loaded scenes:", Array.from(scenes.keys()));
console.log("");

// Reference to available commands documentation
try {
  const fs = require("fs");
  const path = require("path");
  const commandsPath = path.join(__dirname, "PIXOO_COMMANDS.md");
  if (fs.existsSync(commandsPath)) {
    console.log(`📋 Available commands documented in: ${commandsPath}`);
  } else {
    console.log("⚠️  PIXOO_COMMANDS.md not found");
  }
} catch (err) {
  console.log("⚠️  Could not check PIXOO_COMMANDS.md:", err.message);
}
console.log("");

const client = mqtt.connect(brokerUrl, {
  username: mqttUser,
  password: mqttPass,
});

function publishMetrics(deviceIp) {
  const dev = devices.get(deviceIp);
  if (!dev) return;
  const metrics = dev.getMetrics();
  client.publish(`pixoo/${deviceIp}/metrics`, JSON.stringify(metrics));
}

// Device boot state management
function markDeviceActive(deviceIp) {
  const now = Date.now();
  const bootState = deviceBootState.get(deviceIp) || { booted: false, lastActivity: 0 };

  // If this is the first activity or it's been more than 5 minutes since last activity,
  // consider it a potential fresh boot
  if (!bootState.lastActivity || (now - bootState.lastActivity) > 300000) {
    console.log(`🔄 [BOOT] Potential fresh boot detected for ${deviceIp}`);
    bootState.booted = false;
  }

  bootState.lastActivity = now;
  deviceBootState.set(deviceIp, bootState);
}

function markDeviceBooted(deviceIp) {
  const bootState = deviceBootState.get(deviceIp) || { booted: false, lastActivity: Date.now() };
  if (!bootState.booted) {
    console.log(`✅ [BOOT] Device ${deviceIp} marked as booted`);
    bootState.booted = true;
  }
  deviceBootState.set(deviceIp, bootState);
}

function isDeviceFreshlyBooted(deviceIp) {
  const bootState = deviceBootState.get(deviceIp);
  return bootState && !bootState.booted;
}

function publishOk(deviceIp, sceneName, frametime, diffPixels, metrics) {
  const msg = {
    scene: sceneName,
    frametime,
    diffPixels,
    pushes: metrics.pushes,
    skipped: metrics.skipped,
    errors: metrics.errors,
    ts: Date.now(),
  };

  // Log locally
  console.log(
    `✅ OK [${deviceIp}] scene=${sceneName} frametime=${frametime}ms diffPixels=${diffPixels} pushes=${metrics.pushes} skipped=${metrics.skipped} errors=${metrics.errors}`
  );

  // Publish to MQTT
  client.publish(`pixoo/${deviceIp}/ok`, JSON.stringify(msg));
}

// On connect, subscribe to per-device state updates
client.on("connect", () => {
  console.log("✅ Connected to MQTT broker as", mqttUser);
  client.subscribe(
    ["pixoo/+/state/upd", "pixoo/+/scene/set", "pixoo/+/driver/set", "pixoo/+/reset/set"],
    (err) => {
      if (err) console.error("❌ MQTT subscribe error:", err);
      else
        console.log(
          "📡 Subscribed to pixoo/+/state/upd, scene/set, driver/set, reset/set"
        );
    }
  );
});

client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const parts = topic.split("/"); // pixoo/<device>/<section>/<action?>
    const deviceIp = parts[1];
    const section = parts[2];
    const action = parts[3];

    // 1) Default scene set
    if (section === "scene" && action === "set") {
      const name = payload?.name;
      if (!name) {
        console.warn(`⚠️ scene/set for ${deviceIp} missing 'name'`);
        return;
      }
      deviceDefaults.set(deviceIp, name);
      console.log(`🎛️ Default scene for ${deviceIp} → '${name}'`);
      client.publish(
        `pixoo/${deviceIp}/scene`,
        JSON.stringify({ default: name, ts: Date.now() })
      );
      return;
    }

    // 2) Driver switch set
    if (section === "driver" && action === "set") {
      const drv = payload?.driver;
      if (!drv) {
        console.warn(`⚠️ driver/set for ${deviceIp} missing 'driver'`);
        return;
      }
      const applied = setDriverForDevice(deviceIp, drv);
      console.log(`🧩 Driver for ${deviceIp} set → ${applied}`);
      client.publish(
        `pixoo/${deviceIp}/driver`,
        JSON.stringify({ driver: applied, ts: Date.now() })
      );

      // Optional: re-render with last known state
      const prev = lastState[deviceIp];
      if (prev && prev.payload) {
        try {
          const sceneName = prev.sceneName || "empty";
          const scene = scenes.get(sceneName);
          if (scene) {
            const ctx = getContext(deviceIp, sceneName, prev.payload, publishOk);
            try {
              await scene.render(ctx);
              publishMetrics(deviceIp);
            } catch (err) {
              console.error(`❌ Render error for ${deviceIp}:`, err.message);
              client.publish(
                `pixoo/${deviceIp}/error`,
                JSON.stringify({
                  error: err.message,
                  scene: sceneName,
                  ts: Date.now(),
                })
              );
              publishMetrics(deviceIp);
            }
          }
        } catch (e) {
          console.warn(`⚠️ Re-render after driver switch failed: ${e.message}`);
        }
      }
      return;
    }

    // 3) Reset command
    if (section === "reset" && action === "set") {
      console.log(`🔄 Reset requested for ${deviceIp}`);
      const ok = await softReset(deviceIp);
      client.publish(
        `pixoo/${deviceIp}/reset`,
        JSON.stringify({ ok, ts: Date.now() })
      );
      return;
    }

    // 4) State update
    if (section === "state" && action === "upd") {
      const sceneName =
        payload.scene || deviceDefaults.get(deviceIp) || "empty";
      const scene = scenes.get(sceneName);
      if (!scene) {
        console.warn(`⚠️ No renderer found for scene: ${sceneName}`);
        return;
      }

      // Track device activity for boot state management
      markDeviceActive(deviceIp);

      // Add delay for freshly booted devices to allow initialization
      if (isDeviceFreshlyBooted(deviceIp)) {
        console.log(`⏳ [BOOT] Adding initialization delay for freshly booted device ${deviceIp}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }

      // Just remember last payload for re-render after driver switch
      lastState[deviceIp] = { payload, sceneName };

      const ts = new Date().toLocaleString("de-AT");
      console.log(
        `[${ts}] 📥 State update for ${deviceIp} → scene: ${sceneName} (driver: ${getDriverForDevice(
          deviceIp
        )})`
      );
      const ctx = getContext(deviceIp, sceneName, payload, publishOk);

      // Clear screen when switching to a new scene OR when explicitly requested
      const lastScene = lastState[deviceIp]?.sceneName;
      const shouldClear = (lastScene && lastScene !== sceneName) || payload.clear === true;

      if (shouldClear) {
        const device = require('./lib/device-adapter').getDevice(deviceIp);
        await device.clear();
        if (lastScene && lastScene !== sceneName) {
          console.log(`🧹 [SCENE] Cleared screen when switching from '${lastScene}' to '${sceneName}'`);
        } else if (payload.clear === true) {
          console.log(`🧹 [SCENE] Cleared screen as requested by 'clear' parameter`);
        }
      }

      try {
        await scene.render(ctx);

        // Mark device as successfully booted after first successful render
        if (isDeviceFreshlyBooted(deviceIp)) {
          markDeviceBooted(deviceIp);
        }

        publishMetrics(deviceIp);
      } catch (err) {
        console.error(`❌ Render error for ${deviceIp}:`, err.message);
        client.publish(
          `pixoo/${deviceIp}/error`,
          JSON.stringify({
            error: err.message,
            scene: sceneName,
            ts: Date.now(),
          })
        );
        publishMetrics(deviceIp);
      }
      return;
    }
  } catch (err) {
    console.error("❌ Error parsing/handling MQTT message:", err);
  }
});

// Global MQTT error logging
client.on("error", (err) => {
  console.error("❌ MQTT error:", err);
});