'use strict';

const mqtt = require('mqtt');

const host = process.env.MOSQITTO_HOST_MS24 || 'localhost';
const user = process.env.MOSQITTO_USER_MS24 || undefined;
const pass = process.env.MOSQITTO_PASS_MS24 || undefined;
const ip = process.env.PIXOO_DEV_IP || '192.168.1.159';
const base = process.env.SCENE_STATE_TOPIC_BASE || '/home/pixoo';

const stateTopic = `${base}/${ip}/scene/state`;
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

function waitFor(client, predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.removeListener('message', onMsg);
      reject(new Error('timeout waiting for predicate'));
    }, timeoutMs);
    function onMsg(t, payload) {
      if (t !== stateTopic) return;
      try {
        const obj = JSON.parse(payload.toString('utf8'));
        if (predicate(obj)) {
          clearTimeout(timer);
          client.removeListener('message', onMsg);
          resolve(obj);
        }
      } catch {
        // ignore parse errors and continue
        return;
      }
    }
    client.on('message', onMsg);
  });
}

async function runScene(client, name, payload = {}, timeout = 30000) {
  // Publish desired scene
  client.publish(cmdTopic, JSON.stringify({ scene: name, ...payload }), {
    qos: 0,
  });
  // Wait for switching and then running
  const switching = await waitFor(
    client,
    (m) => m.targetScene === name && m.status === 'switching',
    timeout,
  );
  const running = await waitFor(
    client,
    (m) => m.currentScene === name && m.status === 'running',
    timeout,
  );
  return { switching, running };
}

async function main() {
  const client = connect();
  await new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('error', reject);
  });

  await new Promise((resolve, reject) => {
    client.subscribe(stateTopic, { qos: 0 }, (err) =>
      err ? reject(err) : resolve(),
    );
  });

  const steps = [
    { name: 'startup' },
    { name: 'draw_api_animated' },
    { name: 'fill', payload: { color: [10, 10, 10, 255] } },
    { name: 'advanced_chart', payload: { mode: 'demo', dataType: 'random' } },
    { name: 'empty' },
  ];

  const results = [];
  for (const step of steps) {
    const { name, payload } = step;
    const res = await runScene(client, name, payload, 45000);
    results.push({ name, ...res });
  }

  // Print concise summary lines
  for (const r of results) {
    const bn = r.running.buildNumber;
    const gc = r.running.gitCommit;
    console.log(
      `SCENE_OK ${r.name} build=${bn} commit=${gc} gen=${r.running.generationId}`,
    );
  }

  client.end(true, () => process.exit(0));
}

main().catch((e) => {
  console.error('HARNESS_ERROR', e?.message || e);
  process.exit(1);
});
