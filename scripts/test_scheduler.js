'use strict';

// Lightweight scheduler/state test using mock device

const fs = require('fs');
const path = require('path');

const { getContext } = require('../lib/device-adapter');
const logger = require('../lib/logger');
const SceneManager = require('../lib/scene-manager');

async function loadScenes(sceneManager) {
  // Load base scenes
  const baseDir = path.join(__dirname, '..', 'scenes');
  fs.readdirSync(baseDir)
    .filter((f) => f.endsWith('.js'))
    .forEach((file) => {
      const mod = require(path.join(baseDir, file));
      const name = mod.name || path.basename(file, '.js');
      sceneManager.registerScene(name, mod);
    });

  // Load example scenes
  const examplesDir = path.join(baseDir, 'examples');
  fs.readdirSync(examplesDir)
    .filter((f) => f.endsWith('.js'))
    .forEach((file) => {
      const mod = require(path.join(examplesDir, file));
      const name = mod.name || path.basename(file, '.js');
      sceneManager.registerScene(name, mod);
    });
}

async function main() {
  const sceneManager = new SceneManager();
  await loadScenes(sceneManager);

  // Use a host not present in deviceDrivers to force mock driver
  const host = '127.0.0.2';

  const publishOk = (deviceIp, scene, frametime) => {
    logger.ok(`TEST OK [${deviceIp}] scene=${scene} frametime=${frametime}`);
  };

  // Start with v2
  const ctxV2 = getContext(
    host,
    'draw_api_animated_v2',
    { scene: 'draw_api_animated_v2' },
    publishOk,
  );
  await sceneManager.switchScene('draw_api_animated_v2', ctxV2);

  // Allow some loop ticks
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Switch to draw_api
  const ctxDraw = getContext(
    host,
    'draw_api',
    { scene: 'draw_api' },
    publishOk,
  );
  await sceneManager.switchScene('draw_api', ctxDraw);

  await new Promise((resolve) => setTimeout(resolve, 300));

  const state = sceneManager.getDeviceSceneState(host);
  console.log('DEVICE_STATE', JSON.stringify(state));

  // Done
  process.exit(0);
}

main().catch((e) => {
  console.error('TEST_ERROR', e);
  process.exit(1);
});
