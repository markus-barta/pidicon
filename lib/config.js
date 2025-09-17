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

module.exports = {
  SCENE_STATE_TOPIC_BASE,
  SCENE_STATE_KEYS,
};
