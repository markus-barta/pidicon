// Pixoo Daemon
// - Loads scene modules from `./scenes`
// - Subscribes to MQTT updates per device
// - Routes each state update to the selected scene renderer
// @author Markus Barta (mba) with assistance from Cursor AI

const path = require('path');

const { SCENE_STATE_TOPIC_BASE, SCENE_STATE_KEYS } = require('./lib/config');
const DeploymentTracker = require('./lib/deployment-tracker');
const {
  getContext,
  setDriverForDevice,
  getDriverForDevice,
  devices,
  deviceDrivers,
} = require('./lib/device-adapter');
const DIContainer = require('./lib/di-container');
const logger = require('./lib/logger');
const MqttService = require('./lib/mqtt-service');
const { softReset } = require('./lib/pixoo-http');
const { SceneRegistration } = require('./lib/scene-loader');
const SceneManager = require('./lib/scene-manager');
const versionInfo = require('./version.json');

// Create a logger instance

// MQTT connection config (devices discovered dynamically via PIXOO_DEVICE_TARGETS)
const mqttConfig = {
  brokerUrl: `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`,
  username: process.env.MOSQITTO_USER_MS24,
  password: process.env.MOSQITTO_PASS_MS24,
};

// Default scene per device (set via MQTT)
const deviceDefaults = new Map(); // deviceIp -> default scene

// Stores last state per device IP so we can re-render on driver switch
const lastState = {}; // deviceIp -> { key, payload, sceneName }

// ============================================================================
// DEPENDENCY INJECTION CONTAINER SETUP
// ============================================================================

/**
 * Configure dependency injection container
 * This enables testability and loose coupling between services
 */
const container = new DIContainer();

// Register core services
container.register('logger', () => logger);
container.register('stateStore', ({ logger }) => {
  const StateStore = require('./lib/state-store');
  return new StateStore({ logger });
});
container.register('deploymentTracker', () => new DeploymentTracker());
container.register(
  'sceneManager',
  ({ logger, stateStore }) => new SceneManager({ logger, stateStore }),
);
container.register(
  'mqttService',
  ({ logger }) => new MqttService({ logger, config: mqttConfig }),
);

// Resolve services from container
const stateStore = container.resolve('stateStore');
const deploymentTracker = container.resolve('deploymentTracker');
const sceneManager = container.resolve('sceneManager');
const mqttService = container.resolve('mqttService');

logger.ok('✅ DI Container initialized with services:', {
  services: container.getServiceNames(),
});

// Log StateStore stats for observability (and to satisfy linter)
logger.debug('StateStore initialized:', stateStore.getStats());

// Load all scenes using SceneRegistration utility
// Automatically loads from ./scenes and ./scenes/examples
const sceneLoadResults = SceneRegistration.registerFromStructure(
  sceneManager,
  path.join(__dirname, 'scenes'),
);

// Log any errors during scene loading
if (sceneLoadResults.errors.length > 0) {
  logger.warn(`Failed to load ${sceneLoadResults.errors.length} scene(s):`, {
    errors: sceneLoadResults.errors,
  });
}

logger.ok(`Loaded ${sceneLoadResults.scenes.size} scene(s) successfully`);

const startTs = new Date().toLocaleString('de-AT');
logger.ok(`**************************************************`);
logger.ok(`🚀 Starting Pixoo Daemon at [${startTs}] ...`);
logger.ok(
  `   Version: ${versionInfo.version}, Build: #${versionInfo.buildNumber}, Commit: ${versionInfo.gitCommit}`,
);
logger.ok(`**************************************************`);

// Reference to available commands documentation
try {
  const fs = require('fs');
  const path = require('path');
  const commandsPath = path.join(__dirname, 'MQTT_COMMANDS.md');
  if (fs.existsSync(commandsPath)) {
    logger.info(`Available commands documented in: ${commandsPath}`);
  } else {
    logger.warn('MQTT_COMMANDS.md not found');
  }
} catch (err) {
  logger.warn('Could not check MQTT_COMMANDS.md:', { error: err.message });
}

logger.info('MQTT Broker:', { url: mqttConfig.brokerUrl });
if (deviceDrivers.size > 0) {
  logger.info('Configured Devices and Drivers:');
  Array.from(deviceDrivers.entries()).forEach(([ip, driver]) => {
    logger.info(`  ${ip} → ${driver}`);
  });
} else {
  logger.warn(
    'No device targets configured. Use PIXOO_DEVICE_TARGETS env var or override in code.',
  );
}
logger.info('Loaded scenes:', { scenes: sceneManager.getRegisteredScenes() });

// Initialize deployment tracking and load startup scene
async function initializeDeployment() {
  logger.info('Starting deployment initialization...');
  try {
    logger.info('Initializing deployment tracker...');
    await deploymentTracker.initialize();
    logger.ok('Deployment tracker initialized.');
    logger.ok(deploymentTracker.getLogString());

    // Auto-load startup scene for all configured devices
    const deviceTargets = Array.from(deviceDrivers.keys());
    if (deviceTargets.length > 0) {
      logger.info('Auto-loading startup scene for configured devices...');
      for (const deviceIp of deviceTargets) {
        if (deviceIp.trim()) {
          try {
            const ctx = getContext(
              deviceIp.trim(),
              'startup',
              deploymentTracker.getSceneContext(),
              publishOk,
            );
            await sceneManager.switchScene('startup', ctx);
            await sceneManager.renderActiveScene(ctx);
            logger.ok(`Startup scene loaded for ${deviceIp.trim()}`);
          } catch (error) {
            logger.warn(
              `Failed to load startup scene for ${deviceIp.trim()}: ${error.message}`,
            );
          }
        }
      }
    }
  } catch (error) {
    logger.error('Deployment initialization failed:', { error: error.message });
  }
}

// Initialize deployment and startup scenes
logger.info('Initializing deployment...');
initializeDeployment();

// SCENE_STATE_TOPIC_BASE is provided by lib/config.js

function publishMetrics(deviceIp) {
  const dev = devices.get(deviceIp);
  if (!dev) return;
  const metrics = dev.getMetrics();
  mqttService.publish(`pixoo/${deviceIp}/metrics`, metrics);
}

function publishOk(deviceIp, sceneName, frametime, diffPixels, metrics) {
  const msg = {
    scene: sceneName,
    frametime,
    diffPixels,
    pushes: metrics.pushes,
    skipped: metrics.skipped,
    errors: metrics.errors,
    version: versionInfo.version,
    buildNumber: versionInfo.buildNumber,
    gitCommit: versionInfo.gitCommit,
    ts: Date.now(),
  };

  // Log locally
  logger.ok(`OK [${deviceIp}]`, {
    scene: sceneName,
    frametime,
    diffPixels,
    pushes: metrics.pushes,
    skipped: metrics.skipped,
    errors: metrics.errors,
    version: versionInfo.version,
    buildNumber: versionInfo.buildNumber,
    gitCommit: versionInfo.gitCommit,
  });

  // Publish to MQTT
  mqttService.publish(`pixoo/${deviceIp}/ok`, msg);
}

// Register MQTT message handlers with MqttService
mqttService.registerHandler('scene', handleSceneCommand);
mqttService.registerHandler('driver', handleDriverCommand);
mqttService.registerHandler('reset', handleResetCommand);
mqttService.registerHandler('state', handleStateUpdate);

// Connect to MQTT broker and subscribe to topics
mqttService.on('connect', async () => {
  await mqttService.subscribe([
    'pixoo/+/state/upd',
    'pixoo/+/scene/set',
    'pixoo/+/driver/set',
    'pixoo/+/reset/set',
  ]);
});

// Start MQTT service
mqttService.connect().catch((err) => {
  logger.error('Failed to connect to MQTT broker:', { error: err.message });
  process.exit(1);
});

async function handleSceneCommand(deviceIp, action, payload) {
  if (action === 'set') {
    const name = payload?.name;
    if (!name) {
      logger.warn(`scene/set for ${deviceIp} missing 'name'`);
      return;
    }
    deviceDefaults.set(deviceIp, name);
    logger.ok(`Default scene for ${deviceIp} → '${name}'`);
    mqttService.publish(`pixoo/${deviceIp}/scene`, {
      default: name,
      ts: Date.now(),
    });
  }
}

async function handleDriverCommand(deviceIp, action, payload) {
  if (action === 'set') {
    const drv = payload?.driver;
    if (!drv) {
      logger.warn(`driver/set for ${deviceIp} missing 'driver'`);
      return;
    }
    const applied = setDriverForDevice(deviceIp, drv);
    logger.ok(`Driver for ${deviceIp} set → ${applied}`);
    mqttService.publish(`pixoo/${deviceIp}/driver`, {
      driver: applied,
      ts: Date.now(),
    });

    // Optional: re-render with last known state
    const prev = lastState[deviceIp];
    if (prev && prev.payload) {
      try {
        const sceneName = prev.sceneName || 'empty';
        if (sceneManager.hasScene(sceneName)) {
          const ctx = getContext(deviceIp, sceneName, prev.payload, publishOk);
          try {
            await sceneManager.renderActiveScene(ctx);
            publishMetrics(deviceIp);
          } catch (err) {
            logger.error(`Render error for ${deviceIp}:`, {
              error: err.message,
            });
            mqttService.publish(`pixoo/${deviceIp}/error`, {
              error: err.message,
              scene: sceneName,
              ts: Date.now(),
            });
            publishMetrics(deviceIp);
          }
        }
      } catch (e) {
        logger.warn(`Re-render after driver switch failed: ${e.message}`);
      }
    }
  }
}

async function handleResetCommand(deviceIp, action) {
  if (action === 'set') {
    logger.warn(`Reset requested for ${deviceIp}`);
    const ok = await softReset(deviceIp);
    mqttService.publish(`pixoo/${deviceIp}/reset`, {
      ok,
      ts: Date.now(),
    });
  }
}

async function handleStateUpdate(deviceIp, action, payload) {
  if (action === 'upd') {
    const sceneName = payload.scene || deviceDefaults.get(deviceIp) || 'empty';
    if (!sceneManager.hasScene(sceneName)) {
      logger.warn(`No renderer found for scene: ${sceneName}`);
      return;
    }

    // Gate legacy animation continuation frames entirely (central scheduler only)
    if (payload && payload._isAnimationFrame === true) {
      try {
        const st = sceneManager.getDeviceSceneState(deviceIp);
        const frameScene = payload.scene;
        const frameGen = payload.generationId;
        if (frameScene !== st.currentScene || frameGen !== st.generationId) {
          logger.info(
            `⚑ [GATE] Drop stale animation frame for ${frameScene} (gen ${frameGen}) on ${deviceIp}; active ${st.currentScene} (gen ${st.generationId})`,
          );
        } else {
          logger.info(
            `⚑ [GATE] Drop animation frame (loop-driven) for ${frameScene} (gen ${frameGen}) on ${deviceIp}`,
          );
        }
      } catch {
        logger.info(`[GATE] Drop animation frame (no state) on ${deviceIp}`);
      }
      return; // Always ignore animation frame inputs
    }

    const ts = new Date().toLocaleString('de-AT');
    logger.info(`State update for ${deviceIp}`, {
      scene: sceneName,
      driver: getDriverForDevice(deviceIp),
      timestamp: ts,
    });
    const ctx = getContext(deviceIp, sceneName, payload, publishOk);
    ctx.payload = payload;

    const lastScene = lastState[deviceIp]?.sceneName;
    const lastPayload = lastState[deviceIp]?.payload;
    const isSceneChange = !lastScene || lastScene !== sceneName;
    const isParameterChange = lastScene === sceneName && true; // treat any new command as authoritative
    const shouldClear = isSceneChange || payload.clear === true;

    if (isParameterChange) {
      logger.info('Parameter change detected', {
        scene: sceneName,
        old: lastPayload,
        new: payload,
      });
    }

    lastState[deviceIp] = { payload, sceneName };

    if (shouldClear) {
      const device = require('./lib/device-adapter').getDevice(deviceIp);
      await device.clear();
      if (lastScene && lastScene !== sceneName) {
        logger.ok(
          `Cleared screen on scene switch from '${lastScene}' to '${sceneName}'`,
        );
      } else if (payload.clear === true) {
        logger.ok("Cleared screen as requested by 'clear' parameter");
      }
    }

    try {
      let success;
      // Always adhere to command: publish switching, then restart via switchScene
      try {
        const prev = sceneManager.getDeviceSceneState(deviceIp);
        const genNext = ((prev.generationId || 0) + 1) | 0;
        mqttService.publish(
          `${SCENE_STATE_TOPIC_BASE}/${deviceIp}/scene/state`,
          {
            [SCENE_STATE_KEYS.currentScene]: prev.currentScene,
            [SCENE_STATE_KEYS.targetScene]: sceneName,
            [SCENE_STATE_KEYS.status]: 'switching',
            [SCENE_STATE_KEYS.generationId]: genNext,
            [SCENE_STATE_KEYS.version]: versionInfo.version,
            [SCENE_STATE_KEYS.buildNumber]: versionInfo.buildNumber,
            [SCENE_STATE_KEYS.gitCommit]: versionInfo.gitCommit,
            [SCENE_STATE_KEYS.ts]: Date.now(),
          },
        );
      } catch (e) {
        logger.warn('Failed to publish switching state', {
          deviceIp,
          error: e?.message,
        });
      }

      success = await sceneManager.switchScene(sceneName, ctx);

      // Publish running state after restart
      try {
        const st = sceneManager.getDeviceSceneState(deviceIp);
        mqttService.publish(
          `${SCENE_STATE_TOPIC_BASE}/${deviceIp}/scene/state`,
          {
            [SCENE_STATE_KEYS.currentScene]: st.currentScene,
            [SCENE_STATE_KEYS.generationId]: st.generationId,
            [SCENE_STATE_KEYS.status]: st.status,
            [SCENE_STATE_KEYS.version]: versionInfo.version,
            [SCENE_STATE_KEYS.buildNumber]: versionInfo.buildNumber,
            [SCENE_STATE_KEYS.gitCommit]: versionInfo.gitCommit,
            [SCENE_STATE_KEYS.ts]: Date.now(),
          },
        );
      } catch (e) {
        logger.warn('Failed to publish device scene state', {
          deviceIp,
          error: e?.message,
        });
      }

      if (!success) {
        throw new Error(`Failed to handle scene update: ${sceneName}`);
      }

      // Rendering is handled by the central device loop; nothing to do here

      publishMetrics(deviceIp);
    } catch (err) {
      logger.error(`Render error for ${deviceIp}:`, {
        error: err.message,
        scene: sceneName,
      });
      mqttService.publish(`pixoo/${deviceIp}/error`, {
        error: err.message,
        scene: sceneName,
        ts: Date.now(),
      });
      publishMetrics(deviceIp);
    }
  }
}

// Global MQTT error logging
mqttService.on('error', (err) => {
  logger.error('MQTT error:', { error: err.message });
});
