'use strict';

const mqtt = require('mqtt');

const host = process.env.MOSQITTO_HOST_MS24 || 'localhost';
const user = process.env.MOSQITTO_USER_MS24 || undefined;
const pass = process.env.MOSQITTO_PASS_MS24 || undefined;
const ip = process.env.PIXOO_DEV_IP || '192.168.1.159';

const stateTopicBase = process.env.SCENE_STATE_TOPIC_BASE || '/home/pixoo';
const stateTopic = `${stateTopicBase}/${ip}/scene/state`;
const cmdTopic = `pixoo/${ip}/state/upd`;
const okTopic = `pixoo/${ip}/ok`;

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

function collectOkForScene(client, topic, sceneName, needed, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!(needed > 0)) return resolve([]);
    const msgs = [];
    let count = 0;
    const timer = setTimeout(() => {
      client.removeListener('message', onMsg);
      reject(new Error('timeout waiting for ok messages'));
    }, timeoutMs);
    function onMsg(t, payload) {
      if (t !== topic) return;
      try {
        const obj = JSON.parse(payload.toString('utf8'));
        if (obj && obj.scene === sceneName) {
          msgs.push(obj);
          count++;
          if (count >= needed) {
            clearTimeout(timer);
            client.removeListener('message', onMsg);
            resolve(msgs);
          }
        }
      } catch {
        // ignore parse errors
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

  // Determine optional frames cap from CLI args
  const arg = process.argv[2];
  const frames = arg != null ? Number(arg) : undefined;
  const framesCap = Number.isFinite(frames) ? frames : undefined;

  // Publish test scene (with optional frames cap)
  const payload = { scene: 'draw_api_animated' };
  if (typeof framesCap === 'number' && framesCap >= 0) {
    payload.frames = framesCap;
  }
  client.publish(cmdTopic, JSON.stringify(payload), {
    qos: 0,
  });

  // Capture switching and running (up to 45s)
  const msgs = await collectN(client, stateTopic, 2, 45000);
  for (let i = 0; i < msgs.length; i++) {
    console.log(`STATE${i + 1}`, msgs[i]);
  }

  // If framesCap provided and >=0, wait for that many frame pushes + 1 overlay push
  if (typeof framesCap === 'number' && framesCap >= 0) {
    const needed = Math.max(1, framesCap + 1);
    const oks = await collectOkForScene(
      client,
      okTopic,
      'draw_api_animated',
      needed,
      Math.min(120000, 2000 + needed * 1000),
    );
    console.log(`ANIM_OK count=${oks.length}`);
  }

  client.end(true, () => process.exit(0));
}

main().catch((e) => {
  console.error('LIVE_TEST_ERROR', e?.message || e);
  process.exit(1);
});
