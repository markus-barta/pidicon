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

async function main() {
  const client = connect();
  await new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('error', reject);
  });
  await subscribe(client, stateTopic);

  // Ensure known starting state: switch to startup first
  client.publish(cmdTopic, JSON.stringify({ scene: 'startup' }), {
    qos: 0,
  });
  await once(client, stateTopic, (m) => m.status === 'switching', 45000);
  await once(client, stateTopic, (m) => m.status === 'running', 45000);

  // Switch to animated and wait for running
  client.publish(cmdTopic, JSON.stringify({ scene: 'draw_api_animated' }), {
    qos: 0,
  });
  await once(client, stateTopic, (m) => m.status === 'switching', 45000);
  const running = await once(
    client,
    stateTopic,
    (m) => m.status === 'running',
    45000,
  );
  const currentGen = running.generationId;
  const buildNumber = running.buildNumber;
  const gitCommit = running.gitCommit;

  // Send a stale animation frame (older generation) and ensure generation does not change
  client.publish(
    cmdTopic,
    JSON.stringify({
      scene: 'draw_api_animated',
      _isAnimationFrame: true,
      generationId: typeof currentGen === 'number' ? currentGen - 1 : -1,
    }),
    { qos: 0 },
  );

  let changed = false;
  const endAt = Date.now() + 3000;
  while (Date.now() < endAt) {
    try {
      const msg = await once(
        client,
        stateTopic,
        (m) => m.status === 'running',
        1000,
      );
      if (
        msg.generationId !== currentGen ||
        msg.currentScene !== 'draw_api_animated'
      ) {
        changed = true;
        break;
      }
    } catch {
      // ignore timeout and loop
    }
  }

  if (!changed) {
    console.log(
      `GATE_OK build=${buildNumber} commit=${gitCommit} gen=${currentGen}`,
    );
  } else {
    console.log(
      `GATE_FAIL build=${buildNumber} commit=${gitCommit} gen=${currentGen}`,
    );
    process.exitCode = 1;
  }

  client.end(true, () => process.exit(process.exitCode || 0));
}

main().catch((e) => {
  console.error('GATE_TEST_ERROR', e?.message || e);
  process.exit(1);
});
