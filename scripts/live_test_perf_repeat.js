'use strict';

const mqtt = require('mqtt');

const host = process.env.MOSQITTO_HOST_MS24 || 'localhost';
const user = process.env.MOSQITTO_USER_MS24 || undefined;
const pass = process.env.MOSQITTO_PASS_MS24 || undefined;
const ip = process.env.PIXOO_DEV_IP || '192.168.1.159';
const base = process.env.SCENE_STATE_TOPIC_BASE || '/home/pixoo';

const stateTopic = `${base}/${ip}/scene/state`;
const okTopic = `pixoo/${ip}/ok`;
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

function subscribe(client, topics) {
  return new Promise((resolve, _reject) => {
    client.subscribe(topics, { qos: 0 }, (err) =>
      err ? _reject(err) : resolve(),
    );
  });
}

function once(client, topic, predicate, timeoutMs) {
  return new Promise((resolve, _reject) => {
    const timer = setTimeout(() => {
      client.removeListener('message', onMsg);
      _reject(new Error('timeout waiting for message'));
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

async function runOnce(client, frames = 8) {
  // Prepare listeners BEFORE publish to avoid race conditions
  const switchingWait = once(
    client,
    stateTopic,
    (m) => m.status === 'switching' && m.targetScene === 'performance-test',
    45000,
  );
  const runningWait = once(
    client,
    stateTopic,
    (m) => m.status === 'running' && m.currentScene === 'performance-test',
    45000,
  );

  // Start perf test (adaptive, N frames)
  client.publish(
    cmdTopic,
    JSON.stringify({ scene: 'performance-test', interval: null, frames }),
    { qos: 0 },
  );

  // Wait for switching and running
  await switchingWait;
  const running = await runningWait;
  const buildNumber = running.buildNumber;
  const gitCommit = running.gitCommit;

  // Count OK pushes for this run until QUIET
  let pushes = 0;
  let lastTs = Date.now();
  const QUIET_MS = 4000;

  function onOk(t, payload) {
    if (t !== okTopic) return;
    try {
      const obj = JSON.parse(payload.toString('utf8'));
      if (obj.scene === 'performance-test') {
        pushes += 1;
        lastTs = Date.now();
      }
    } catch {
      // ignore
    }
  }
  client.on('message', onOk);
  // Wait for quiet period
  while (Date.now() - lastTs < QUIET_MS) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  client.removeListener('message', onOk);

  return { pushes, buildNumber, gitCommit };
}

async function main() {
  const client = connect();
  await new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('error', reject);
  });
  await subscribe(client, [stateTopic, okTopic]);

  const r1 = await runOnce(client, 8);
  const r2 = await runOnce(client, 8);

  if (r1.pushes > 0 && r2.pushes > 0) {
    console.log(
      `PERF_REPEAT_OK run1=${r1.pushes} run2=${r2.pushes} build=${r2.buildNumber} commit=${r2.gitCommit}`,
    );
  } else {
    console.log(
      `PERF_REPEAT_FAIL run1=${r1.pushes} run2=${r2.pushes} build=${r2.buildNumber} commit=${r2.gitCommit}`,
    );
    process.exitCode = 1;
  }

  client.end(true, () => process.exit(process.exitCode || 0));
}

main().catch((e) => {
  console.error('PERF_REPEAT_ERROR', e?.message || e);
  process.exit(1);
});
