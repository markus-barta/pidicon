const mqtt = require("mqtt");

const brokerUrl = process.env.MQTT_BROKER || "mqtt://localhost:1883";
const devices = (process.env.PIXOO_DEVICES || "").split(";");
const mqttUser = process.env.MOSQITTO_USER_MS24;
const mqttPass = process.env.MOSQITTO_PASS_MS24;

const lastState = {}; // store last state per device

console.log("Starting Pixoo Daemon...");
console.log("MQTT Broker:", brokerUrl);
console.log("Devices:", devices);

const client = mqtt.connect(brokerUrl, {
  username: mqttUser,
  password: mqttPass,
});

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
    const payload = JSON.parse(message.toString());
    const parts = topic.split("/"); // pixoo/<device>/state/upd
    const deviceIp = parts[1];

    // Check if state changed
    const prev = lastState[deviceIp];
    const same = prev && JSON.stringify(prev) === JSON.stringify(payload);
    if (same) {
      console.log(`⏩ No change for ${deviceIp}, skipping render`);
      return;
    }

    // Store new state
    lastState[deviceIp] = payload;

    console.log(`📥 State update for ${deviceIp}:`, payload);

    // Fake renderer: just log what we would do
    fakeRender(deviceIp, payload);
  } catch (err) {
    console.error("❌ Error parsing MQTT message:", err);
  }
});

// --- Fake renderer function ---
function fakeRender(deviceIp, state) {
  console.log(`🎨 [FAKE RENDER] Would render to ${deviceIp} with state:`);
  console.log(JSON.stringify(state, null, 2));
}

client.on("error", (err) => {
  console.error("❌ MQTT error:", err);
});