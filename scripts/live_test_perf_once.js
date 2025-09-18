'use strict';

const mqtt = require('mqtt');

const host = process.env.MOSQITTO_HOST_MS24 || 'localhost';
const user = process.env.MOSQITTO_USER_MS24 || undefined;
const pass = process.env.MOSQITTO_PASS_MS24 || undefined;
const ip = process.env.PIXOO_DEV_IP || '192.168.1.159';
// state topic base not needed for this test (we consume okTopic only)

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

function subscribe(client, topic) {
  return new Promise((resolve, reject) => {
    client.subscribe(topic, { qos: 0 }, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

async function main() {
  const client = connect();
  await new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('error', reject);
  });
  await subscribe(client, okTopic);

  // Start a finite run (20 frames, adaptive)
  client.publish(
    cmdTopic,
    JSON.stringify({ scene: 'performance-test', interval: null, frames: 20 }),
    { qos: 0 },
  );

  let count = 0;
  let lastTs = Date.now();
  let buildNumber = null;
  let gitCommit = null;
  const QUIET_MS = 5000;

  const timer = setInterval(() => {
    if (Date.now() - lastTs > QUIET_MS) {
      clearInterval(timer);
      // Expect ~frames pushes + 1 completion push
      if (count <= 22) {
        console.log(
          `PERF_ONCE_OK frames=20 pushes=${count} build=${buildNumber} commit=${gitCommit}`,
        );
        client.end(true, () => process.exit(0));
      } else {
        console.log(
          `PERF_ONCE_FAIL frames=20 pushes=${count} build=${buildNumber} commit=${gitCommit}`,
        );
        client.end(true, () => process.exit(1));
      }
    }
  }, 500);

  client.on('message', (topic, payload) => {
    if (topic !== okTopic) return;
    try {
      const msg = JSON.parse(payload.toString('utf8'));
      if (msg.scene === 'performance-test') {
        count += 1;
        lastTs = Date.now();
        buildNumber = msg.buildNumber;
        gitCommit = msg.gitCommit;
      }
    } catch {
      // ignore malformed
    }
  });
}

main().catch((e) => {
  console.error('PERF_ONCE_ERROR', e?.message || e);
  process.exit(1);
});
