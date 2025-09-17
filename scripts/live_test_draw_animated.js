'use strict';

const mqtt = require('mqtt');

const host = process.env.MOSQITTO_HOST_MS24 || 'localhost';
const user = process.env.MOSQITTO_USER_MS24 || undefined;
const pass = process.env.MOSQITTO_PASS_MS24 || undefined;
const ip = process.env.PIXOO_DEV_IP || '192.168.1.159';

const stateTopicBase = process.env.SCENE_STATE_TOPIC_BASE || '/home/pixoo';
const stateTopic = `${stateTopicBase}/${ip}/scene/state`;
const cmdTopic = `pixoo/${ip}/state/upd`;

function connect() {
  const url = `mqtt://${host}:1883`;
  const client = mqtt.connect(url, {
    username: user,
    password: pass,
    connectTimeout: 8000,
    reconnectPeriod: 0,
  });
  return client;
}

function collectN(client, topic, n, timeoutMs) {
  return new Promise((resolve, reject) => {
    const msgs = [];
    const timer = setTimeout(() => {
      client.removeListener('message', onMsg);
      reject(new Error('timeout waiting for messages'));
    }, timeoutMs);
    function onMsg(t, payload) {
      if (t !== topic) return;
      msgs.push(payload.toString('utf8'));
      if (msgs.length >= n) {
        clearTimeout(timer);
        client.removeListener('message', onMsg);
        resolve(msgs);
      }
    }
    client.subscribe(topic, { qos: 0 }, (err) => {
      if (err) return reject(err);
      client.on('message', onMsg);
    });
  });
}

async function main() {
  const client = connect();
  await new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('error', reject);
  });

  // Subscribe first to ensure we receive switching/running events
  // Publish test scene
  client.publish(cmdTopic, JSON.stringify({ scene: 'draw_api_animated' }), {
    qos: 0,
  });

  // Capture switching and running (up to 45s)
  const msgs = await collectN(client, stateTopic, 2, 45000);
  for (let i = 0; i < msgs.length; i++) {
    console.log(`STATE${i + 1}`, msgs[i]);
  }

  client.end(true, () => process.exit(0));
}

main().catch((e) => {
  console.error('LIVE_TEST_ERROR', e?.message || e);
  process.exit(1);
});
