'use strict';

const fs = require('fs');
const path = require('path');

const { getContext } = require('../lib/device-adapter');
const logger = require('../lib/logger');
const SceneManager = require('../lib/scene-manager');

async function loadScenes(sceneManager) {
  const root = path.resolve(__dirname, '..');
  const load = (dir) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
      .filter((f) => f.endsWith('.js'))
      .forEach((file) => {
        const mod = require(path.join(dir, file));
        const name = mod.name || path.basename(file, '.js');
        sceneManager.registerScene(name, mod);
      });
  };
  load(path.join(root, 'scenes'));
  load(path.join(root, 'scenes', 'examples'));
}

async function main() {
  const sm = new SceneManager();
  await loadScenes(sm);

  const host = '127.0.0.6';
  const publishOk = (deviceIp, scene, frametime) => {
    logger.ok(`SMOKE OK [${deviceIp}] ${scene} ft=${frametime}`);
  };

  const all = sm.getRegisteredScenes();
  // Test a curated list to ensure coverage and stability
  const target = [
    'startup',
    'draw_api',
    'fill',
    'empty',
    'advanced_chart',
    'draw_api_animated_v2',
    'performance-test',
    'draw_api_animated',
  ].filter((n) => all.includes(n));

  const results = [];
  for (const name of target) {
    const ctx = getContext(host, name, { scene: name }, publishOk);
    await sm.switchScene(name, ctx);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const st = sm.getDeviceSceneState(host);
    results.push({ name, state: st });
  }

  console.log('SMOKE_RESULTS', JSON.stringify(results));
  process.exit(0);
}

main().catch((e) => {
  console.error('SMOKE_ERROR', e);
  process.exit(1);
});
