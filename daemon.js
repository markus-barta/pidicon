// Pixoo Daemon
// - Loads scene modules from `./scenes`
// - Subscribes to MQTT updates per device
// - Routes each state update to the selected scene renderer
// @author: Sonic + Cursor + Markus Barta (mba)
const fs = require('fs');
const mqtt = require('mqtt');
const path = require('path');

const DeploymentTracker = require('./lib/deployment-tracker');
const {
  getContext,
  setDriverForDevice,
  getDriverForDevice,
  devices,
  deviceDrivers,
} = require('./lib/device-adapter');
const { softReset } = require('./lib/pixoo-http');
const SceneManager = require('./lib/scene-manager');

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
      console.error(`❌ Failed to load scene ${file}:`, error.message);
    }
  }
});

const startTs = new Date().toLocaleString('de-AT');
console.log(`**************************************************`);
console.log(`Starting Pixoo Daemon at [${startTs}] ...`);
console.log(`**************************************************`);
console.log('MQTT Broker:', brokerUrl);
if (deviceDrivers.size > 0) {
  console.log('Configured Devices and Drivers:');
  Array.from(deviceDrivers.entries()).forEach(([ip, driver]) => {
    console.log(`  ${ip} → ${driver}`);
  });
} else {
  console.log(
    'No device targets configured (use PIXOO_DEVICE_TARGETS env var or DEVICE_TARGETS_OVERRIDE in code)',
  );
}
console.log('Loaded scenes:', sceneManager.getRegisteredScenes());
console.log('');

// Initialize deployment tracking and load startup scene
async function initializeDeployment() {
  try {
    await deploymentTracker.initialize();
    console.log(deploymentTracker.getLogString());

    // Auto-load startup scene for all configured devices
    const deviceTargets = Array.from(deviceDrivers.keys());
    if (deviceTargets.length > 0) {
      console.log('🚀 Auto-loading startup scene for configured devices...');
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
            console.log(`✅ Startup scene loaded for ${deviceIp.trim()}`);
          } catch (error) {
            console.warn(
              `⚠️ Failed to load startup scene for ${deviceIp.trim()}: ${error.message}`,
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Deployment initialization failed:', error.message);
  }
}

// Initialize deployment and startup scenes
initializeDeployment();

// Reference to available commands documentation
try {
  const fs = require('fs');
  const path = require('path');
  const commandsPath = path.join(__dirname, 'PIXOO_COMMANDS.md');
  if (fs.existsSync(commandsPath)) {
    console.log(`📋 Available commands documented in: ${commandsPath}`);
  } else {
    console.log('⚠️  PIXOO_COMMANDS.md not found');
  }
} catch (err) {
  console.log('⚠️  Could not check PIXOO_COMMANDS.md:', err.message);
}
console.log('');

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
    console.log(`✅ [BOOT] Device ${deviceIp} marked as booted`);
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
  console.log(
    `✅ OK [${deviceIp}] scene=${sceneName} frametime=${frametime}ms diffPixels=${diffPixels} pushes=${metrics.pushes} skipped=${metrics.skipped} errors=${metrics.errors}`,
  );

  // Publish to MQTT
  client.publish(`pixoo/${deviceIp}/ok`, JSON.stringify(msg));
}

// On connect, subscribe to per-device state updates
client.on('connect', () => {
  console.log('✅ Connected to MQTT broker as', mqttUser);
  client.subscribe(
    [
      'pixoo/+/state/upd',
      'pixoo/+/scene/set',
      'pixoo/+/driver/set',
      'pixoo/+/reset/set',
    ],
    (err) => {
      if (err) console.error('❌ MQTT subscribe error:', err);
      else
        console.log(
          '📡 Subscribed to pixoo/+/state/upd, scene/set, driver/set, reset/set',
        );
    },
  );
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const parts = topic.split('/'); // pixoo/<device>/<section>/<action?>
    const deviceIp = parts[1];
    const section = parts[2];
    const action = parts[3];

    // 1) Default scene set
    if (section === 'scene' && action === 'set') {
      const name = payload?.name;
      if (!name) {
        console.warn(`⚠️ scene/set for ${deviceIp} missing 'name'`);
        return;
      }
      deviceDefaults.set(deviceIp, name);
      console.log(`🎛️ Default scene for ${deviceIp} → '${name}'`);
      client.publish(
        `pixoo/${deviceIp}/scene`,
        JSON.stringify({ default: name, ts: Date.now() }),
      );
      return;
    }

    // 2) Driver switch set
    if (section === 'driver' && action === 'set') {
      const drv = payload?.driver;
      if (!drv) {
        console.warn(`⚠️ driver/set for ${deviceIp} missing 'driver'`);
        return;
      }
      const applied = setDriverForDevice(deviceIp, drv);
      console.log(`🧩 Driver for ${deviceIp} set → ${applied}`);
      client.publish(
        `pixoo/${deviceIp}/driver`,
        JSON.stringify({ driver: applied, ts: Date.now() }),
      );

      // Optional: re-render with last known state
      const prev = lastState[deviceIp];
      console.log(
        `🔍 [DEBUG] Driver switch for ${deviceIp}, lastState: ${JSON.stringify(prev || 'none')}`,
      );
      if (prev && prev.payload) {
        try {
          const sceneName = prev.sceneName || 'empty';
          if (sceneManager.hasScene(sceneName)) {
            const ctx = getContext(
              deviceIp,
              sceneName,
              prev.payload,
              publishOk,
            );
            try {
              await sceneManager.renderActiveScene(ctx);
              publishMetrics(deviceIp);
            } catch (err) {
              console.error(`❌ Render error for ${deviceIp}:`, err.message);
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
          console.warn(`⚠️ Re-render after driver switch failed: ${e.message}`);
        }
      }
      return;
    }

    // 3) Reset command
    if (section === 'reset' && action === 'set') {
      console.log(`🔄 Reset requested for ${deviceIp}`);
      const ok = await softReset(deviceIp);
      client.publish(
        `pixoo/${deviceIp}/reset`,
        JSON.stringify({ ok, ts: Date.now() }),
      );
      return;
    }

    // 4) State update
    if (section === 'state' && action === 'upd') {
      console.log(`🔍 [DEBUG] MQTT handler entry for ${deviceIp}:`);
      console.log(
        `   Current lastState: ${JSON.stringify(lastState[deviceIp] || 'none')}`,
      );

      const sceneName =
        payload.scene || deviceDefaults.get(deviceIp) || 'empty';
      if (!sceneManager.hasScene(sceneName)) {
        console.warn(`⚠️ No renderer found for scene: ${sceneName}`);
        return;
      }

      // Track device activity for boot state management
      markDeviceActive(deviceIp);

      // Add delay for freshly booted devices to allow initialization
      if (isDeviceFreshlyBooted(deviceIp)) {
        console.log(
          `⏳ [BOOT] Adding initialization delay for freshly booted device ${deviceIp}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
      }

      const ts = new Date().toLocaleString('de-AT');
      console.log(
        `[${ts}] 📥 State update for ${deviceIp} → scene: ${sceneName} (driver: ${getDriverForDevice(
          deviceIp,
        )})`,
      );
      const ctx = getContext(deviceIp, sceneName, payload, publishOk);
      // Add payload to context for parameter updates
      ctx.payload = payload;

      // Check if this is a scene change or parameter change
      const lastScene = lastState[deviceIp]?.sceneName;
      const lastPayload = lastState[deviceIp]?.payload;
      const isSceneChange = !lastScene || lastScene !== sceneName;
      const isParameterChange =
        lastScene === sceneName &&
        JSON.stringify(lastPayload) !== JSON.stringify(payload);
      const shouldClear = isSceneChange || payload.clear === true;

      // Debug logging for state tracking
      console.log(`🔍 [DEBUG] State analysis for ${deviceIp}:`);
      console.log(`   Last scene: ${lastScene || 'none'}`);
      console.log(`   Current scene: ${sceneName}`);
      console.log(`   Last payload: ${JSON.stringify(lastPayload || 'none')}`);
      console.log(`   Current payload: ${JSON.stringify(payload)}`);
      console.log(`   isSceneChange: ${isSceneChange}`);
      console.log(`   isParameterChange: ${isParameterChange}`);

      // Debug logging for parameter changes
      if (isParameterChange) {
        console.log(
          `🔄 [PARAM] Parameter change detected for scene: ${sceneName}`,
        );
        console.log(`   Old: ${JSON.stringify(lastPayload)}`);
        console.log(`   New: ${JSON.stringify(payload)}`);
      }

      // Remember last state AFTER checking for changes
      console.log(`💾 [DEBUG] Updating lastState for ${deviceIp}:`);
      console.log(
        `   Previous: ${JSON.stringify(lastState[deviceIp] || 'none')}`,
      );
      console.log(`   New: ${JSON.stringify({ payload, sceneName })}`);
      lastState[deviceIp] = { payload, sceneName };

      // Debug: Check if lastState is actually set
      console.log(
        `🔍 [DEBUG] After update, lastState[${deviceIp}] = ${JSON.stringify(lastState[deviceIp])}`,
      );

      if (shouldClear) {
        const device = require('./lib/device-adapter').getDevice(deviceIp);
        await device.clear();
        if (lastScene && lastScene !== sceneName) {
          console.log(
            `🧹 [SCENE] Cleared screen when switching from '${lastScene}' to '${sceneName}'`,
          );
        } else if (payload.clear === true) {
          console.log(
            `🧹 [SCENE] Cleared screen as requested by 'clear' parameter`,
          );
        }
      }

      try {
        // Handle scene switching or parameter updates
        let success;
        if (isSceneChange) {
          // New scene - do full switch
          console.log(`🔄 [SCENE] Switching to new scene: ${sceneName}`);
          success = await sceneManager.switchScene(sceneName, ctx);
        } else if (isParameterChange) {
          // Same scene, new parameters - update parameters
          console.log(`🔄 [PARAM] Updating parameters for scene: ${sceneName}`);
          success = await sceneManager.updateSceneParameters(sceneName, ctx);
        } else {
          // Same scene, same parameters - just render
          console.log(`🔄 [RENDER] Re-rendering same scene: ${sceneName}`);
          success = true;
        }

        if (!success) {
          throw new Error(`Failed to handle scene update: ${sceneName}`);
        }

        // Note: renderActiveScene is not needed here because:
        // - switchScene() handles rendering internally
        // - updateSceneParameters() handles rendering internally
        // - For same scene re-renders, we just return success

        // Mark device as successfully booted after first successful render
        if (isDeviceFreshlyBooted(deviceIp)) {
          markDeviceBooted(deviceIp);
        }

        publishMetrics(deviceIp);
      } catch (err) {
        console.error(`❌ Render error for ${deviceIp}:`, err.message);
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
      return;
    }
  } catch (err) {
    console.error('❌ Error parsing/handling MQTT message:', err);
  }
});

// Global MQTT error logging
client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});
