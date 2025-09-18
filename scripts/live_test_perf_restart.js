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
  return mqtt.connect(url, {
    username: user,
    password: pass,
    connectTimeout: 8000,
    reconnectPeriod: 0,
  });
}

function subscribe(client, topic) {
  return new Promise((resolve, reject) => {
    client.subscribe(topic, { qos: 0 }, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

function once(client, topic, predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.removeListener('message', onMsg);
      reject(new Error('timeout waiting for message'));
    }, timeoutMs);
    function onMsg(t, payload) {
      if (t !== topic) return;
      try {
        const obj = JSON.parse(payload.toString('utf8'));
        if (!predicate || predicate(obj)) {
          clearTimeout(timer);
          client.removeListener('message', onMsg);
          resolve(obj);
        }
      } catch {
        return;
      }
    }
    client.on('message', onMsg);
  });
}

async function runPerfCycle(client) {
  // start perf
  client.publish(cmdTopic, JSON.stringify({ scene: 'performance-test' }), {
    qos: 0,
  });
  await once(client, stateTopic, (m) => m.status === 'switching', 45000);
  const running1 = await once(
    client,
    stateTopic,
    (m) => m.status === 'running' && m.currentScene === 'performance-test',
    45000,
  );
  // switch to empty
  client.publish(cmdTopic, JSON.stringify({ scene: 'empty' }), { qos: 0 });
  await once(client, stateTopic, (m) => m.status === 'switching', 45000);
  await once(
    client,
    stateTopic,
    (m) => m.status === 'running' && m.currentScene === 'empty',
    45000,
  );
  // start perf again
  client.publish(cmdTopic, JSON.stringify({ scene: 'performance-test' }), {
    qos: 0,
  });
  await once(client, stateTopic, (m) => m.status === 'switching', 45000);
  const running2 = await once(
    client,
    stateTopic,
    (m) => m.status === 'running' && m.currentScene === 'performance-test',
    45000,
  );

  console.log(
    `PERF_RESTART_OK build=${running2.buildNumber} commit=${running2.gitCommit} gen1=${running1.generationId} gen2=${running2.generationId}`,
  );
}

async function main() {
  const client = connect();
  await new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('error', reject);
  });
  await subscribe(client, stateTopic);
  await runPerfCycle(client);
  client.end(true, () => process.exit(0));
}

main().catch((e) => {
  console.error('PERF_RESTART_ERROR', e?.message || e);
  process.exit(1);
});
