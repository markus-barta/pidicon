'use strict';

const fs = require('fs/promises');
const path = require('path');

const { encryptObject, decryptObject } = require('./crypto-utils');
const { secretsDir, secretsKey } = require('../config');

const DEFAULT_FILENAME = 'global-mqtt.json';

async function ensureSecretsDir() {
  if (!secretsDir) {
    throw new Error(
      'Secrets directory is not configured (PIDICON_SECRETS_DIR)',
    );
  }
  await fs.mkdir(secretsDir, { recursive: true });
}

async function readSecret(filename = DEFAULT_FILENAME) {
  await ensureSecretsDir();

  if (!secretsKey) {
    return null;
  }

  const filePath = path.join(secretsDir, filename);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const envelope = JSON.parse(raw);
    return decryptObject(envelope, secretsKey);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeSecret(data, filename = DEFAULT_FILENAME) {
  await ensureSecretsDir();

  if (!secretsKey) {
    throw new Error('Secret key unavailable for secrets store');
  }

  const envelope = encryptObject(data, secretsKey);
  const filePath = path.join(secretsDir, filename);
  await fs.writeFile(filePath, JSON.stringify(envelope, null, 2), 'utf8');
  return filePath;
}

module.exports = {
  readSecret,
  writeSecret,
  DEFAULT_FILENAME,
};
