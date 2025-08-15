// Pixoo Daemon
// - Loads scene modules from `./scenes`
// - Subscribes to MQTT updates per device
// - Routes each state update to the selected scene renderer
const fs = require("fs");
const path = require("path");
const mqtt = require("mqtt");

// MQTT connection config and device list (semicolon-separated IPs)
const brokerUrl = process.env.MQTT_BROKER || "mqtt://localhost:1883";
const devices = (process.env.PIXOO_DEVICES || "").split(";");
const mqttUser = process.env.MOSQITTO_USER_MS24;
const mqttPass = process.env.MOSQITTO_PASS_MS24;

// Stores last state per device IP to avoid redundant renders
const lastState = {};

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
  client.subscribe("pixoo/+/state/upd", (err) => {
    if (err) {
      console.error("❌ MQTT subscribe error:", err);
    } else {
      console.log("📡 Subscribed to pixoo/+/state/upd");
    }
  });
});

client.on("message", (topic, message) => {
  try {
    // Parse message payload and extract device IP from topic
    const payload = JSON.parse(message.toString());
    const parts = topic.split("/"); // pixoo/<device>/state/upd
    const deviceIp = parts[1];

    // Skip if state unchanged for this device
    const prev = lastState[deviceIp];
    const same = prev && JSON.stringify(prev) === JSON.stringify(payload);
    if (same) {
      console.log(`⏩ No change for ${deviceIp}, skipping render`);
      return;
    }
    lastState[deviceIp] = payload;

    // Select scene (fallback to default) and dispatch to renderer
    const sceneName = payload.scene || "power_price";
    const renderer = scenes.get(sceneName);
    if (!renderer) {
      console.warn(`⚠️ No renderer found for scene: ${sceneName}`);
      return;
    }

    console.log(`📥 State update for ${deviceIp} → scene: ${sceneName}`);
    renderer(payload);
  } catch (err) {
    console.error("❌ Error parsing MQTT message:", err);
  }
});

// Global MQTT error logging
client.on("error", (err) => {
  console.error("❌ MQTT error:", err);
});