// Pixoo Daemon
// - Loads scene modules from `./scenes`
// - Subscribes to MQTT updates per device
// - Routes each state update to the selected scene renderer
const fs = require("fs");
const path = require("path");
const mqtt = require("mqtt");
const { getContext } = require("./lib/device-adapter");

// MQTT connection config and device list (semicolon-separated IPs)
const brokerUrl = process.env.MQTT_BROKER || "mqtt://localhost:1883";
const devices = (process.env.PIXOO_DEVICES || "").split(";");
const mqttUser = process.env.MOSQITTO_USER_MS24;
const mqttPass = process.env.MOSQITTO_PASS_MS24;

// Stores last state per device IP to avoid redundant renders
const lastState = {};

// Default scene per device (set via MQTT)
const deviceDefaults = new Map(); // deviceIp -> sceneName

// Scene registry: scene name -> render function
const scenes = new Map();

// Load all scenes from ./scenes
fs.readdirSync(path.join(__dirname, "scenes")).forEach((file) => {
  if (file.endsWith(".js")) {
    const scene = require(path.join(__dirname, "scenes", file));
    scenes.set(scene.name, scene.render);
  }
});

console.log("Starting Pixoo Daemon...");
console.log("MQTT Broker:", brokerUrl);
console.log("Devices:", devices);
console.log("Loaded scenes:", Array.from(scenes.keys()));

const client = mqtt.connect(brokerUrl, {
  username: mqttUser,
  password: mqttPass,
});

// On connect, subscribe to per-device state updates
client.on("connect", () => {
  console.log("✅ Connected to MQTT broker as", mqttUser);
  client.subscribe(["pixoo/+/state/upd", "pixoo/+/scene/set"], (err) => {
    if (err) console.error("❌ MQTT subscribe error:", err);
    else
      console.log(
        "📡 Subscribed to pixoo/+/state/upd and pixoo/+/scene/set"
      );
  });
});

client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const parts = topic.split("/"); // pixoo/<device>/<section>/<action?>
    const deviceIp = parts[1];
    const section = parts[2];
    const action = parts[3];

    // Handle scene/set
    if (section === "scene" && action === "set") {
      const name = payload?.name;
      if (!name) {
        console.warn(`⚠️ scene/set for ${deviceIp} missing 'name'`);
        return;
      }
      deviceDefaults.set(deviceIp, name);
      console.log(`🎛️ Default scene for ${deviceIp} set to '${name}'`);
      // Optional ack
      client.publish(
        `pixoo/${deviceIp}/scene`,
        JSON.stringify({ default: name, ts: Date.now() })
      );
      return;
    }

    // Handle state/upd
    if (section === "state" && action === "upd") {
      // Resolve effective scene: payload.scene > saved default > fallback
      const sceneName =
        payload.scene || deviceDefaults.get(deviceIp) || "power_price";
      const renderer = scenes.get(sceneName);
      if (!renderer) {
        console.warn(`⚠️ No renderer found for scene: ${sceneName}`);
        return;
      }

      // Change detection includes scene
      const currentKey = JSON.stringify({ scene: sceneName, state: payload });
      const prevKey = lastState[deviceIp];
      if (prevKey && prevKey === currentKey) {
        console.log(`⏩ No change for ${deviceIp}, skipping render`);
        return;
      }
      lastState[deviceIp] = currentKey;

      console.log(`📥 State update for ${deviceIp} → scene: ${sceneName}`);
      const ctx = getContext(deviceIp, sceneName, payload);
      await renderer(ctx);
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