'use strict';

// Central configuration for MQTT topics and payload keys

const SCENE_STATE_TOPIC_BASE =
  process.env.SCENE_STATE_TOPIC_BASE || '/home/pixoo';

// Payload keys for scene state publications (configurable if needed later)
const SCENE_STATE_KEYS = Object.freeze({
  currentScene: 'currentScene',
  targetScene: 'targetScene',
  status: 'status',
  generationId: 'generationId',
  version: 'version',
  buildNumber: 'buildNumber',
  gitCommit: 'gitCommit',
  ts: 'ts',
});

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_SECRETS_DIR =
  process.env.PIDICON_SECRETS_DIR ||
  path.resolve(__dirname, '..', 'data', 'secrets');

function ensureSecretKey(directory) {
  const envKey = process.env.PIDICON_SECRET_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  const keyFile = path.join(directory, '.key');
  try {
    const existing = fs.readFileSync(keyFile, 'utf8').trim();
    if (existing.length > 0) {
      return existing;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[CONFIG] Failed to read secrets key file:', error.message);
    }
  }

  try {
    fs.mkdirSync(directory, { recursive: true });
    const generated = crypto.randomBytes(32).toString('base64');
    fs.writeFileSync(keyFile, generated, { encoding: 'utf8', mode: 0o600 });
    console.info('[CONFIG] Generated new PIDICON secret key at', keyFile);
    return generated;
  } catch (error) {
    console.warn(
      '[CONFIG] Failed to generate secrets key file:',
      error.message,
    );
    return undefined;
  }
}

const secretsKey = ensureSecretKey(DEFAULT_SECRETS_DIR);

module.exports = {
  SCENE_STATE_TOPIC_BASE,
  SCENE_STATE_KEYS,
  secretsDir: DEFAULT_SECRETS_DIR,
  secretsKey,
};
