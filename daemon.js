// Pixoo Daemon
// - Loads scene modules from `./scenes`
// - Subscribes to MQTT updates per device
// - Routes each state update to the selected scene renderer
const fs = require("fs");
const path = require("path");
const mqtt = require("mqtt");
const {
  getContext,
  setDriverForDevice,
  getDriverForDevice,
  devices,
} = require("./lib/device-adapter");

// MQTT connection config and device list (semicolon-separated IPs)
const brokerUrl = process.env.MQTT_BROKER || "mqtt://localhost:1883";
const deviceList = (process.env.PIXOO_DEVICES || "").split(";");
const mqttUser = process.env.MOSQITTO_USER_MS24;
const mqttPass = process.env.MOSQITTO_PASS_MS24;

// Default scene per device (set via MQTT)
const deviceDefaults = new Map(); // deviceIp -> default scene

// Stores last state per device IP so we can re-render on driver switch
const lastState = {}; // deviceIp -> { key, payload, sceneName }

// Scene registry: scene name -> render function
const scenes = new Map();

// Load all scenes from ./scenes
fs.readdirSync(path.join(__dirname, "scenes")).forEach((file) => {
  if (file.endsWith(".js")) {
    const scene = require(path.join(__dirname, "scenes", file));
    scenes.set(scene.name, {
      render: scene.render,
      renderMode: scene.renderMode || "full",
    });
  }
});

const startTs = new Date().toLocaleString("de-AT");
console.log(`**************************************************`);
console.log(`  Starting Pixoo Daemon at [${startTs}] ...`);
console.log(`**************************************************`);
console.log("MQTT Broker:", brokerUrl);
console.log("Devices:", deviceList);
console.log("Loaded scenes:", Array.from(scenes.keys()));

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
    ["pixoo/+/state/upd", "pixoo/+/scene/set", "pixoo/+/driver/set"],
    (err) => {
      if (err) console.error("❌ MQTT subscribe error:", err);
      else
        console.log(
          "📡 Subscribed to pixoo/+/state/upd, scene/set, driver/set"
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
          const sceneName = prev.sceneName || "power_price";
          const scene = scenes.get(sceneName);
          if (scene) {
            const ctx = getContext(deviceIp, sceneName, prev.payload, publishOk);
            try {
              await scene.render(ctx, scene.renderMode);
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

    // 3) State update
    if (section === "state" && action === "upd") {
      const sceneName =
        payload.scene || deviceDefaults.get(deviceIp) || "power_price";
      const scene = scenes.get(sceneName);
      if (!scene) {
        console.warn(`⚠️ No renderer found for scene: ${sceneName}`);
        return;
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
      try {
        await scene.render(ctx, scene.renderMode);
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