'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended for GCM

function deriveKey(secret) {
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('Secret key is required for encryption');
  }

  return crypto.createHash('sha256').update(secret).digest();
}

function encryptObject(data, secret) {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const payload = Buffer.from(JSON.stringify(data), 'utf8');
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    data: encrypted.toString('base64'),
  };
}

function decryptObject(envelope, secret) {
  if (!envelope) {
    return null;
  }

  if (!envelope.iv || !envelope.tag || !envelope.data) {
    throw new Error('Invalid encrypted payload');
  }

  const key = deriveKey(secret);
  const iv = Buffer.from(envelope.iv, 'base64');
  const authTag = Buffer.from(envelope.tag, 'base64');
  const encrypted = Buffer.from(envelope.data, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length for encrypted data');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = {
  encryptObject,
  decryptObject,
};
