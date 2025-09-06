// Pixoo Daemon
// - Loads scene modules from `./scenes`
// - Subscribes to MQTT updates per device
// - Routes each state update to the selected scene renderer
// @author: Sonic + Cursor + Markus Barta (mba)

const fs = require('fs');
const mqtt = require('mqtt');
const path = require('path');

console.log(
  '****************************************************************************************************',
);
console.log('🚀 [DAEMON] Starting Pixoo Daemon...');
console.log(
  '****************************************************************************************************',
);

const DeploymentTracker = require('./lib/deployment-tracker');
console.log('✅ [DAEMON] DeploymentTracker loaded');
const {
  getContext,
  setDriverForDevice,
  getDriverForDevice,
  devices,
  deviceDrivers,
} = require('./lib/device-adapter');
const logger = require('./lib/logger');
const { softReset } = require('./lib/pixoo-http');
const SceneManager = require('./lib/scene-manager');

// Create a logger instance

// MQTT connection config (devices discovered dynamically via PIXOO_DEVICE_TARGETS)
const brokerUrl = `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`;
const mqttUser = process.env.MOSQITTO_USER_MS24;
const mqttPass = process.env.MOSQITTO_PASS_MS24;

// Default scene per device (set via MQTT)
const deviceDefaults = new Map(); // deviceIp -> default scene

// Stores last state per device IP so we can re-render on driver switch
const lastState = {}; // deviceIp -> { key, payload, sceneName }

// Device boot state tracking
const deviceBootState = new Map(); // deviceIp -> { booted: boolean, lastActivity: timestamp }

// Initialize deployment tracker and scene manager
const deploymentTracker = new DeploymentTracker();
const sceneManager = new SceneManager();

// Load all scenes from ./scenes
fs.readdirSync(path.join(__dirname, 'scenes')).forEach((file) => {
  if (file.endsWith('.js')) {
    try {
      const scene = require(path.join(__dirname, 'scenes', file));
      sceneManager.registerScene(scene.name, scene);
    } catch (error) {
      logger.error(`Failed to load scene ${file}:`, { error: error.message });
    }
  }
});

// Also load scenes from ./scenes/examples
const exampleScenesDir = path.join(__dirname, 'scenes', 'examples');
if (fs.existsSync(exampleScenesDir)) {
  fs.readdirSync(exampleScenesDir).forEach((file) => {
    if (file.endsWith('.js')) {
      try {
        const scene = require(path.join(exampleScenesDir, file));
        sceneManager.registerScene(scene.name, scene);
        logger.info(`Loaded example scene: ${scene.name}`);
      } catch (error) {
        logger.error(`Failed to load example scene ${file}:`, {
          error: error.message,
        });
      }
    }
  });
}

const startTs = new Date().toLocaleString('de-AT');
logger.info(`**************************************************`);
logger.info(`Starting Pixoo Daemon at [${startTs}] ...`);
logger.info(`**************************************************`);

// Reference to available commands documentation
try {
  const fs = require('fs');
  const path = require('path');
  const commandsPath = path.join(__dirname, 'PIXOO_COMMANDS.md');
  if (fs.existsSync(commandsPath)) {
    logger.info(`Available commands documented in: ${commandsPath}`);
  } else {
    logger.warn('PIXOO_COMMANDS.md not found');
  }
} catch (err) {
  logger.warn('Could not check PIXOO_COMMANDS.md:', { error: err.message });
}

logger.info('MQTT Broker:', { url: brokerUrl });
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
    logger.info('Deployment tracker initialized.');
    logger.info(deploymentTracker.getLogString());

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
            logger.info(`Startup scene loaded for ${deviceIp.trim()}`);
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

const client = mqtt.connect(brokerUrl, {
  username: mqttUser,
  password: mqttPass,
});

function publishMetrics(deviceIp) {
  const dev = devices.get(deviceIp);
  if (!dev) return;
  const metrics = dev.getMetrics();
  client.publish(`pixoo/${deviceIp}/metrics`, JSON.stringify(metrics));
}

// Device boot state management
function markDeviceActive(deviceIp) {
  const now = Date.now();
  const bootState = deviceBootState.get(deviceIp) || {
    booted: false,
    lastActivity: 0,
    firstSeen: now,
  };

  // Only consider it a fresh boot if this is the very first time we've seen this device
  // or if it's been more than 30 minutes since last activity (much less aggressive)
  if (!bootState.lastActivity || now - bootState.lastActivity > 1800000) {
    if (!bootState.firstSeen || now - bootState.firstSeen < 60000) {
      // Only in the first minute of seeing the device
      console.log(`🔄 [BOOT] Potential fresh boot detected for ${deviceIp}`);
      bootState.booted = false;
    }
  }

  bootState.lastActivity = now;
  deviceBootState.set(deviceIp, bootState);
}

function markDeviceBooted(deviceIp) {
  const bootState = deviceBootState.get(deviceIp) || {
    booted: false,
    lastActivity: Date.now(),
  };
  if (!bootState.booted) {
    logger.info(`[BOOT] Device ${deviceIp} marked as booted`);
    bootState.booted = true;
  }
  deviceBootState.set(deviceIp, bootState);
}

function isDeviceFreshlyBooted(deviceIp) {
  const bootState = deviceBootState.get(deviceIp);
  return bootState && !bootState.booted;
}

function publishOk(deviceIp, sceneName, frametime, diffPixels, metrics) {
  const msg = {
    scene: sceneName,
    frametime,
    diffPixels,
    pushes: metrics.pushes,
    skipped: metrics.skipped,
    errors: metrics.errors,
    ts: Date.now(),
  };

  // Log locally
  logger.info(`OK [${deviceIp}]`, {
    scene: sceneName,
    frametime,
    diffPixels,
    pushes: metrics.pushes,
    skipped: metrics.skipped,
    errors: metrics.errors,
  });

  // Publish to MQTT
  client.publish(`pixoo/${deviceIp}/ok`, JSON.stringify(msg));
}

// On connect, subscribe to per-device state updates
client.on('connect', () => {
  logger.info('Connected to MQTT broker', { user: mqttUser });
  client.subscribe(
    [
      'pixoo/+/state/upd',
      'pixoo/+/scene/set',
      'pixoo/+/driver/set',
      'pixoo/+/reset/set',
    ],
    (err) => {
      if (err) {
        logger.error('MQTT subscribe error:', { error: err });
      } else {
        logger.info(
          'Subscribed to pixoo/+/state/upd, scene/set, driver/set, reset/set',
        );
      }
    },
  );
});

const messageHandlers = {
  scene: handleSceneCommand,
  driver: handleDriverCommand,
  reset: handleResetCommand,
  state: handleStateUpdate,
};

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const parts = topic.split('/'); // pixoo/<device>/<section>/<action?>
    const deviceIp = parts[1];
    const section = parts[2];

    const handler = messageHandlers[section];
    if (handler) {
      await handler(deviceIp, parts[3], payload);
    } else {
      logger.warn(`No handler for topic section: ${section}`);
    }
  } catch (err) {
    logger.error('Error parsing/handling MQTT message:', { error: err });
  }
});

async function handleSceneCommand(deviceIp, action, payload) {
  if (action === 'set') {
    const name = payload?.name;
    if (!name) {
      logger.warn(`scene/set for ${deviceIp} missing 'name'`);
      return;
    }
    deviceDefaults.set(deviceIp, name);
    logger.info(`Default scene for ${deviceIp} → '${name}'`);
    client.publish(
      `pixoo/${deviceIp}/scene`,
      JSON.stringify({ default: name, ts: Date.now() }),
    );
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
    logger.info(`Driver for ${deviceIp} set → ${applied}`);
    client.publish(
      `pixoo/${deviceIp}/driver`,
      JSON.stringify({ driver: applied, ts: Date.now() }),
    );

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
            client.publish(
              `pixoo/${deviceIp}/error`,
              JSON.stringify({
                error: err.message,
                scene: sceneName,
                ts: Date.now(),
              }),
            );
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
    logger.info(`Reset requested for ${deviceIp}`);
    const ok = await softReset(deviceIp);
    client.publish(
      `pixoo/${deviceIp}/reset`,
      JSON.stringify({ ok, ts: Date.now() }),
    );
  }
}

async function handleStateUpdate(deviceIp, action, payload) {
  if (action === 'upd') {
    const sceneName = payload.scene || deviceDefaults.get(deviceIp) || 'empty';
    if (!sceneManager.hasScene(sceneName)) {
      logger.warn(`No renderer found for scene: ${sceneName}`);
      return;
    }

    markDeviceActive(deviceIp);

    if (isDeviceFreshlyBooted(deviceIp)) {
      logger.info(
        `[BOOT] Adding initialization delay for freshly booted device ${deviceIp}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
    const isParameterChange =
      lastScene === sceneName &&
      JSON.stringify(lastPayload) !== JSON.stringify(payload);
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
        logger.info(
          `Cleared screen on scene switch from '${lastScene}' to '${sceneName}'`,
        );
      } else if (payload.clear === true) {
        logger.info("Cleared screen as requested by 'clear' parameter");
      }
    }

    try {
      let success;
      if (isSceneChange) {
        logger.info(`Switching to new scene: ${sceneName}`);
        success = await sceneManager.switchScene(sceneName, ctx);
      } else if (isParameterChange) {
        logger.info(`Updating parameters for scene: ${sceneName}`);
        success = await sceneManager.updateSceneParameters(sceneName, ctx);
      } else {
        logger.info(`Re-rendering same scene: ${sceneName}`);
        success = true;
      }

      if (!success) {
        throw new Error(`Failed to handle scene update: ${sceneName}`);
      }

      if (isParameterChange || (!isSceneChange && !isParameterChange)) {
        logger.info(`Rendering scene with updated parameters: ${sceneName}`);
        const renderContext = {
          ...ctx,
          payload: payload,
        };
        await sceneManager.renderActiveScene(renderContext);
      }

      if (isDeviceFreshlyBooted(deviceIp)) {
        markDeviceBooted(deviceIp);
      }

      publishMetrics(deviceIp);
    } catch (err) {
      logger.error(`Render error for ${deviceIp}:`, {
        error: err.message,
        scene: sceneName,
      });
      client.publish(
        `pixoo/${deviceIp}/error`,
        JSON.stringify({
          error: err.message,
          scene: sceneName,
          ts: Date.now(),
        }),
      );
      publishMetrics(deviceIp);
    }
  }
}

// Global MQTT error logging
client.on('error', (err) => {
  logger.error('MQTT error:', { error: err });
});
