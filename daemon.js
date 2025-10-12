// Pixoo Daemon
// - Loads scene modules from `./scenes`
// - Subscribes to MQTT updates per device
// - Routes each state update to the selected scene renderer
// @author Markus Barta (mba) with assistance from Cursor AI

const path = require('path');

const DriverCommandHandler = require('./lib/commands/driver-command-handler');
const ResetCommandHandler = require('./lib/commands/reset-command-handler');
const SceneCommandHandler = require('./lib/commands/scene-command-handler');
const StateCommandHandler = require('./lib/commands/state-command-handler');
const DeploymentTracker = require('./lib/deployment-tracker');
const {
  getContext,
  setDriverForDevice,
  getDevice,
  getDriverForDevice,
  devices,
  deviceDrivers,
} = require('./lib/device-adapter');
const { setStateStore } = require('./lib/device-adapter');
const DIContainer = require('./lib/di-container');
const logger = require('./lib/logger');
const MqttService = require('./lib/mqtt-service');
const { softReset } = require('./lib/pixoo-http');
const { SceneRegistration } = require('./lib/scene-loader');
const SceneManager = require('./lib/scene-manager');
const DeviceService = require('./lib/services/device-service');
const SceneService = require('./lib/services/scene-service');
const SystemService = require('./lib/services/system-service');
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

// Register services in DI container
container.register(
  'sceneService',
  ({ logger, sceneManager, mqttService }) =>
    new SceneService({
      logger,
      sceneManager,
      deviceAdapter: { getContext, getDevice, deviceDrivers },
      mqttService,
      versionInfo,
      publishOk, // Pass global publishOk callback for WebSocket broadcasts
    }),
);

container.register(
  'deviceService',
  ({ logger, sceneManager, stateStore }) =>
    new DeviceService({
      logger,
      deviceAdapter: {
        deviceDrivers,
        getDriverForDevice,
        getDevice,
        setDriverForDevice,
        getContext,
      },
      sceneManager,
      stateStore,
      softReset,
    }),
);

container.register(
  'systemService',
  ({ logger, deploymentTracker }) =>
    new SystemService({
      logger,
      versionInfo,
      deploymentTracker,
      mqttConfig,
    }),
);

// Register command handlers in DI container
container.register(
  'sceneCommandHandler',
  ({ logger, mqttService }) =>
    new SceneCommandHandler({
      logger,
      mqttService,
      deviceDefaults,
    }),
);

container.register(
  'driverCommandHandler',
  ({ logger, mqttService, sceneManager }) =>
    new DriverCommandHandler({
      logger,
      mqttService,
      setDriverForDevice,
      lastState,
      sceneManager,
      getContext,
      publishMetrics,
    }),
);

container.register(
  'resetCommandHandler',
  ({ logger, mqttService }) =>
    new ResetCommandHandler({
      logger,
      mqttService,
      softReset,
    }),
);

container.register(
  'stateCommandHandler',
  ({ logger, mqttService, sceneManager }) =>
    new StateCommandHandler({
      logger,
      mqttService,
      deviceDefaults,
      lastState,
      sceneManager,
      getContext,
      publishMetrics,
      getDevice,
      getDriverForDevice,
      versionInfo,
    }),
);

logger.ok('✅ DI Container initialized with services:', {
  services: container.getServiceNames(),
});

// Log StateStore stats for observability (and to satisfy linter)
logger.debug('StateStore initialized:', stateStore.getStats());

// Inject StateStore into device-adapter for per-device logging preferences
setStateStore(stateStore);

// ============================================================================
// WEB UI SERVER (OPTIONAL)
// ============================================================================

/**
 * Start Web UI server if enabled
 */
const WEB_UI_ENABLED = process.env.PIXOO_WEB_UI !== 'false';
let webServer = null;

if (WEB_UI_ENABLED) {
  try {
    const { startWebServer } = require('./web/server');
    webServer = startWebServer(container, logger);
    logger.info(`🔍 webServer initialized:`, {
      hasWebServer: !!webServer,
      hasWsBroadcast: !!webServer?.wsBroadcast,
      webServerType: typeof webServer,
      webServerKeys: webServer ? Object.keys(webServer).join(', ') : 'null',
    });
  } catch (error) {
    logger.warn('Failed to start Web UI:', { error: error.message });
    logger.info('Web UI is optional. Daemon will continue without it.');
  }
}

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
  // DEBUG: Log webServer state on FIRST call only
  if (!publishOk._logged) {
    logger.info(`🔍 publishOk called - webServer state:`, {
      hasWebServer: !!webServer,
      hasWsBroadcast: !!webServer?.wsBroadcast,
      webServerType: typeof webServer,
    });
    publishOk._logged = true;
  }

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

  // Check device logging level (respect per-device logging preferences)
  const loggingLevel = stateStore.getDeviceState(deviceIp, '__logging_level');
  const { getDriverForDevice } = require('./lib/device-adapter');
  const driver = getDriverForDevice(deviceIp);
  const defaultLevel = driver === 'real' ? 'warn' : 'none';
  const effectiveLevel =
    loggingLevel !== null && loggingLevel !== undefined
      ? loggingLevel
      : defaultLevel;

  // Only log if device logging allows it (debug = all, warn = warn/error only, none = silent)
  if (effectiveLevel === 'debug') {
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
  }

  // Publish to MQTT
  mqttService.publish(`pixoo/${deviceIp}/ok`, msg);

  // Event-driven WebSocket update: Broadcast when frame is actually rendered
  if (webServer?.wsBroadcast) {
    // Get deviceService reference BEFORE async callback (closure capture)
    const deviceService = container.resolve('deviceService');

    // Broadcast asynchronously (non-blocking)
    setTimeout(async () => {
      try {
        const deviceInfo = await deviceService.getDeviceInfo(deviceIp);
        webServer.wsBroadcast({
          type: 'device_update',
          deviceIp,
          data: deviceInfo,
          timestamp: Date.now(),
        });

        // Respect device logging level
        if (effectiveLevel === 'debug') {
          logger.debug(`📡 Broadcast device_update for ${deviceIp}`);
        }
      } catch (error) {
        // Log errors even in production
        logger.warn('WebSocket broadcast failed:', {
          deviceIp,
          error: error.message,
        });
      }
    }, 0);
  } else if (webServer) {
    logger.warn('❌ webServer exists but wsBroadcast is missing!', {
      hasWsBroadcast: !!webServer.wsBroadcast,
      webServerKeys: Object.keys(webServer || {}).join(', '),
    });
  }
}

// Register command handlers with MqttService
// Each handler is resolved from the DI container and registered
mqttService.registerHandler('scene', async (deviceIp, action, payload) => {
  const handler = container.resolve('sceneCommandHandler');
  await handler.handle(deviceIp, action, payload);
});

mqttService.registerHandler('driver', async (deviceIp, action, payload) => {
  const handler = container.resolve('driverCommandHandler');
  await handler.handle(deviceIp, action, payload);
});

mqttService.registerHandler('reset', async (deviceIp, action, payload) => {
  const handler = container.resolve('resetCommandHandler');
  await handler.handle(deviceIp, action, payload);
});

mqttService.registerHandler('state', async (deviceIp, action, payload) => {
  const handler = container.resolve('stateCommandHandler');
  await handler.handle(deviceIp, action, payload);
});

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

// Global MQTT error logging
mqttService.on('error', (err) => {
  logger.error('MQTT error:', { error: err.message });
});
