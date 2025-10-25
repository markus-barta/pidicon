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
  registerDevicesFromConfig,
} = require('./lib/device-adapter');
const { setStateStore } = require('./lib/device-adapter');
const { DeviceConfigStore } = require('./lib/device-config-store');
const DIContainer = require('./lib/di-container');
const logger = require('./lib/logger');
const MqttService = require('./lib/mqtt-service');
const { publishOk, publishMetrics } = require('./lib/mqtt-utils');
const { softReset } = require('./lib/pixoo-http');
const { SceneRegistration } = require('./lib/scene-loader');
const SceneManager = require('./lib/scene-manager');
const DeviceService = require('./lib/services/device-service');
const DiagnosticsService = require('./lib/services/diagnostics-service');
const MqttConfigService = require('./lib/services/mqtt-config-service');
const SceneService = require('./lib/services/scene-service');
const SystemService = require('./lib/services/system-service');
const TestResultsParser = require('./lib/services/test-results-parser');
const WatchdogService = require('./lib/services/watchdog-service');
const versionInfo = require('./version.json');

// Create a logger instance

// MQTT connection config defaults – will be overwritten by persisted settings if available
const defaultMqttConfig = {
  brokerUrl: 'mqtt://localhost:1883',
  username: undefined,
  password: undefined,
  autoReconnect: true,
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

async function bootstrap() {
  const mqttConfigService = new MqttConfigService({ logger });
  let persistedMqttConfig = null;
  try {
    persistedMqttConfig = await mqttConfigService.loadConfig();
  } catch (error) {
    logger.warn('Failed to load persisted MQTT configuration, using defaults', {
      error: error.message,
    });
  }

  const mqttConfig = {
    ...defaultMqttConfig,
    ...(persistedMqttConfig || {}),
  };

  container.registerValue('mqttConfigService', mqttConfigService);

  // Register core services
  container.register('logger', () => logger);
  container.register('stateStore', ({ logger }) => {
    const StateStore = require('./lib/state-store');
    return new StateStore({ logger });
  });
  container.register('deploymentTracker', () => new DeploymentTracker());
  container.register('deviceConfigStore', () => new DeviceConfigStore());
  container.register(
    'sceneManager',
    ({ logger, stateStore }) => new SceneManager({ logger, stateStore })
  );
  container.register(
    'mqttService',
    ({ logger }) => new MqttService({ logger, config: mqttConfig })
  );
  container.register('deviceAdapter', () => ({
    getContext,
    getDevice,
    getDriverForDevice,
    setDriverForDevice,
    deviceDrivers,
    devices,
    registerDevicesFromConfig,
  }));

  // Resolve services from container
  const stateStore = container.resolve('stateStore');
  stateStore.recordDaemonStart(Date.now());
  setInterval(() => {
    stateStore.recordHeartbeat(Date.now());
  }, 5000);
  const deploymentTracker = container.resolve('deploymentTracker');
  const deviceConfigStore = container.resolve('deviceConfigStore');
  const sceneManager = container.resolve('sceneManager');
  const mqttService = container.resolve('mqttService');
  mqttConfigService.mqttService = mqttService;

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
      })
  );

  container.register(
    'deviceService',
    ({ logger, sceneManager, stateStore, deviceConfigStore }) =>
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
        deviceConfigStore,
      })
  );

  container.register(
    'systemService',
    ({ logger, deploymentTracker, mqttConfigService, stateStore }) =>
      new SystemService({
        logger,
        versionInfo,
        deploymentTracker,
        mqttConfigService,
        stateStore,
      })
  );

  container.register(
    'watchdogService',
    ({
      deviceConfigStore,
      deviceService,
      sceneService,
      stateStore,
      deviceAdapter,
    }) =>
      new WatchdogService(
        deviceConfigStore,
        deviceService,
        sceneService,
        stateStore,
        deviceAdapter
      )
  );

  container.register(
    'testResultsParser',
    ({ logger }) => new TestResultsParser({ logger })
  );

  container.register(
    'diagnosticsService',
    ({
      logger,
      stateStore,
      deviceService,
      systemService,
      sceneService,
      watchdogService,
      deviceConfigStore,
      testResultsParser,
    }) =>
      new DiagnosticsService({
        logger,
        stateStore,
        deviceService,
        systemService,
        sceneService,
        watchdogService,
        deviceConfigStore,
        testResultsParser,
      })
  );

  // Register command handlers in DI container
  container.register(
    'sceneCommandHandler',
    ({ logger, mqttService }) =>
      new SceneCommandHandler({
        logger,
        mqttService,
        deviceDefaults,
      })
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
      })
  );

  container.register(
    'resetCommandHandler',
    ({ logger, mqttService }) =>
      new ResetCommandHandler({
        logger,
        mqttService,
        softReset,
      })
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
      })
  );

  logger.ok('✅ DI Container initialized with services:', {
    services: container.getServiceNames(),
  });

  // Log StateStore stats for observability (and to satisfy linter)
  logger.debug('StateStore initialized:', stateStore.getStats());

  // Inject StateStore into device-adapter for per-device logging preferences
  setStateStore(stateStore);

  // Restore persisted runtime state from previous session
  try {
    await stateStore.restore();
  } catch (error) {
    logger.warn('Failed to restore runtime state:', { error: error.message });
  }
  const persistedSnapshot = stateStore.getSnapshot();

  // ========================================================================
  // WEB UI SERVER (OPTIONAL)
  // ========================================================================
  const WEB_UI_ENABLED = process.env.PIXOO_WEB_UI !== 'false';
  if (WEB_UI_ENABLED) {
    try {
      const { startWebServer } = require('./web/server');
      startWebServer(container, logger);
    } catch (error) {
      logger.warn('Failed to start Web UI:', { error: error.message });
      logger.info('Web UI is optional. Daemon will continue without it.');
    }
  }

  // Load all scenes using SceneRegistration utility
  const sceneLoadResults = SceneRegistration.registerFromStructure(
    sceneManager,
    path.join(__dirname, 'scenes'),
    null,
    process.env.SCENES_FALLBACK !== 'disabled'
  );

  if (sceneLoadResults.errors.length > 0) {
    logger.warn(`Failed to load ${sceneLoadResults.errors.length} scene(s):`, {
      errors: sceneLoadResults.errors,
    });
  }

  logger.ok(`Loaded ${sceneLoadResults.scenes.size} scene(s) successfully`);

  const startTs = new Date().toLocaleString('de-AT');
  logger.ok('**************************************************');
  logger.ok(`🚀 Starting Pixoo Daemon at [${startTs}] ...`);
  logger.ok(
    `   Version: ${versionInfo.version}, Build: #${versionInfo.buildNumber}, Commit: ${versionInfo.gitCommit}`
  );
  logger.ok('**************************************************');

  logger.info('MQTT Broker:', { url: mqttConfig.brokerUrl });
  if (deviceDrivers.size > 0) {
    logger.info('Configured Devices and Drivers:');
    Array.from(deviceDrivers.entries()).forEach(([ip, driver]) => {
      logger.info(`  ${ip} → ${driver}`);
    });
  } else {
    logger.warn(
      'No device targets configured. Add devices via Web UI or create config/devices.json from example.'
    );
  }
  logger.info('Loaded scenes:', { scenes: sceneManager.getRegisteredScenes() });

  async function initializeDeployment() {
    logger.info('Starting deployment initialization...');
    try {
      logger.info('Initializing deployment tracker...');
      await deploymentTracker.initialize();
      logger.ok('Deployment tracker initialized.');
      logger.ok(deploymentTracker.getLogString());

      logger.info('Loading device configuration...');
      try {
        await deviceConfigStore.load();
        const configSettings = deviceConfigStore.getSettings();
        if (!persistedMqttConfig?.brokerUrl && configSettings.mqttBrokerUrl) {
          mqttConfig.brokerUrl = configSettings.mqttBrokerUrl;
        }
        if (!persistedMqttConfig?.username && configSettings.mqttUsername) {
          mqttConfig.username = configSettings.mqttUsername;
        }
        const configuredDevices = Array.from(
          deviceConfigStore.getAllDevices().values()
        );

        registerDevicesFromConfig(configuredDevices);

        const rehydratedDevices = new Set();
        const deviceService = container.resolve('deviceService');

        const settings = deviceConfigStore.getSettings();
        if (settings.scenesPath) {
          const userSceneResults = SceneRegistration.registerFromStructure(
            sceneManager,
            null, // Don't reload built-in scenes
            settings.scenesPath,
            false
          );
          if (userSceneResults.errors.length > 0) {
            logger.warn(
              `Failed to load ${userSceneResults.errors.length} user scene(s)`
            );
          }
        }

        if (configuredDevices.length > 0) {
          logger.ok(
            `Loaded ${configuredDevices.length} device(s) from configuration file`
          );

          for (const deviceConfig of configuredDevices) {
            const { ip, name, driver, brightness, startupScene, deviceType } =
              deviceConfig;

            logger.info(`Initializing device: ${name} (${ip}) [${deviceType}]`);

            try {
              if (driver) {
                await setDriverForDevice(ip, driver);
                logger.debug(`Set driver for ${ip}: ${driver}`);
              }

              const persistedDeviceState = persistedSnapshot.devices?.[ip];

              if (persistedDeviceState) {
                logger.info(
                  `Rehydrating ${ip} from persisted runtime state`,
                  persistedDeviceState
                );
                const rehydrateResult = await deviceService.rehydrateFromState(
                  ip,
                  persistedDeviceState
                );
                rehydratedDevices.add(ip);
                logger.debug('Rehydration result', rehydrateResult);
              } else {
                if (brightness !== undefined && brightness !== null) {
                  const device = getDevice(ip);
                  if (device && device.setBrightness) {
                    try {
                      await device.setBrightness(brightness);
                      logger.debug(`Set brightness for ${ip}: ${brightness}%`);
                    } catch (error) {
                      logger.warn(
                        `Failed to set brightness for ${ip}: ${error.message}`
                      );
                    }
                  }
                }

                if (startupScene) {
                  logger.info(
                    `Loading startup scene "${startupScene}" for ${name} (${ip})`
                  );
                  const ctx = getContext(
                    ip,
                    deviceDefaults,
                    deviceDrivers,
                    deviceConfigStore
                  );
                  await sceneManager.switchScene(startupScene, ctx);
                }
              }
            } catch (error) {
              logger.warn(
                `Failed to initialize device ${name} (${ip}): ${error.message}`
              );
            }
          }

          const persistedDevices = Object.keys(persistedSnapshot.devices || {});
          for (const ip of persistedDevices) {
            if (!rehydratedDevices.has(ip) && !deviceDrivers.has(ip)) {
              logger.info(
                `Persisted state found for ${ip} but device not configured; skipping rehydration`
              );
            }
          }
        }
      } catch (error) {
        logger.error(
          `Failed to load device configuration: ${error.message}. Falling back to environment variables.`
        );
      }
    } catch (error) {
      logger.error('Deployment initialization failed:', {
        error: error.message,
      });
    }
  }

  await initializeDeployment();

  // Start watchdog service for all devices (health checks and recovery actions)
  const watchdogService = container.resolve('watchdogService');
  watchdogService.startAll();

  // Run automated tests in background to populate test results
  // This runs asynchronously and doesn't block daemon startup
  if (process.env.RUN_TESTS_ON_STARTUP !== 'false') {
    setTimeout(() => {
      logger.info('[STARTUP] Running automated tests to populate dashboard...');
      const { spawn } = require('child_process');
      const testProcess = spawn('npm', ['test'], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'ignore', // Don't pipe output to console
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          logger.ok('[STARTUP] Automated tests completed successfully');
        } else {
          logger.warn('[STARTUP] Automated tests completed with failures', {
            exitCode: code,
          });
        }
      });

      testProcess.on('error', (error) => {
        logger.warn('[STARTUP] Failed to run automated tests:', {
          error: error.message,
        });
      });
    }, 0);
  }

  mqttService.on('connect', async () => {
    await mqttService.subscribe([
      'pixoo/+/state/upd',
      'pixoo/+/scene/set',
      'pixoo/+/driver/set',
      'pixoo/+/reset/set',
    ]);
  });

  mqttService.connect().catch((err) => {
    logger.error('Failed to connect to MQTT broker:', { error: err.message });
    reconnectMqttWithBackoff();
  });

  function reconnectMqttWithBackoff(attempt = 1) {
    const delayMs = Math.min(30000, attempt * 5000);
    logger.info(
      `Retrying MQTT connection in ${delayMs / 1000}s (attempt ${attempt})`
    );
    setTimeout(() => {
      mqttService.connect().catch((err) => {
        logger.error('MQTT reconnect failed:', { error: err.message, attempt });
        reconnectMqttWithBackoff(attempt + 1);
      });
    }, delayMs);
  }

  mqttService.on('error', (err) => {
    logger.error('MQTT error:', { error: err.message });
  });
}

bootstrap().catch((error) => {
  logger.error('Fatal daemon initialization error:', { error: error.message });
  process.exit(1);
});
