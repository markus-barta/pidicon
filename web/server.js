/**
 * @fileoverview Web UI Server - Express server for Pixoo Daemon control panel
 * @description Provides REST API and web UI for managing Pixoo devices
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

const express = require('express');
const path = require('path');
const WebSocket = require('ws');

const WEB_UI_PORT = parseInt(process.env.PIXOO_WEB_PORT || '10829', 10);
const WEB_UI_AUTH = process.env.PIXOO_WEB_AUTH; // format: "user:password"

/**
 * Start the web server
 * @param {Object} container - DI container with services
 * @param {Object} logger - Logger instance
 * @returns {Object} Server instance
 */
function startWebServer(container, logger) {
  const app = express();

  // Middleware
  app.use(express.json());

  if (WEB_UI_AUTH) {
    app.use((req, res, next) => {
      const auth = req.headers.authorization;

      if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Pixoo Control Panel"');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [scheme, encoded] = auth.split(' ');
      if (scheme !== 'Basic') {
        return res.status(401).json({ error: 'Invalid authentication scheme' });
      }

      const credentials = Buffer.from(encoded, 'base64').toString('utf-8');
      if (credentials !== WEB_UI_AUTH) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Pixoo Control Panel"');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      next();
    });
  }

  // Static assets (served after auth middleware registration so UI is protected when auth enabled)
  app.use(express.static(path.join(__dirname, 'public')));

  // Resolve services
  const sceneService = container.resolve('sceneService');
  const deviceService = container.resolve('deviceService');
  const systemService = container.resolve('systemService');
  const mqttConfigService = container.resolve('mqttConfigService');
  const watchdogService = container.resolve('watchdogService');
  const deviceConfigStore = container.resolve('deviceConfigStore'); // Use shared instance from DI container
  const diagnosticsService = container.resolve('diagnosticsService');
  const stateStore = container.resolve('stateStore');

  // Track running test process
  let runningTestProcess = null;
  let testProgress = { completed: 0, total: 0, running: false };

  // =========================================================================
  // API ENDPOINTS
  // =========================================================================

  // GET /api/status - Daemon status
  app.get('/api/status', async (_req, res) => {
    try {
      const status = await systemService.getStatus();
      const mqttServiceInstance = container.resolveIfRegistered('mqttService');
      const mqttStatus = mqttServiceInstance?.getStatus?.() || {};
      if (!('autoReconnect' in mqttStatus)) {
        try {
          const savedConfig = await mqttConfigService.loadConfig();
          if (savedConfig?.autoReconnect !== undefined) {
            mqttStatus.autoReconnect = savedConfig.autoReconnect !== false;
          }
        } catch (configError) {
          logger.warn(
            'Failed to load MQTT config for status autoReconnect fallback',
            {
              error: configError.message,
            }
          );
        }
      }
      const scenes = await sceneService.listScenes();
      res.json({
        ...status,
        mqttStatus,
        devSceneCount: scenes.filter((scene) => scene.isDevScene).length,
      });
    } catch (error) {
      logger.error('API /api/status error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/releases/check - Check for new releases via GitHub Pages
  app.get('/api/releases/check', async (_req, res) => {
    try {
      const releaseChecker = container.resolve('releaseChecker');
      const updateInfo = await releaseChecker.checkForUpdate();
      res.json(updateInfo);
    } catch (error) {
      logger.error('API /api/releases/check error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/devices - List all devices
  app.get('/api/devices', async (req, res) => {
    try {
      const devices = await deviceService.listDevices();
      res.json({ devices });
    } catch (error) {
      logger.error('API /api/devices error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/devices/:ip - Get device info
  app.get('/api/devices/:ip', async (req, res) => {
    try {
      const deviceInfo = await deviceService.getDeviceInfo(req.params.ip);
      res.json(deviceInfo);
    } catch (error) {
      logger.error(`API /api/devices/${req.params.ip} error:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/devices/:ip/metrics - Get device metrics
  app.get('/api/devices/:ip/metrics', async (req, res) => {
    try {
      const metrics = await deviceService.getDeviceMetrics(req.params.ip);
      res.json(metrics);
    } catch (error) {
      logger.error(`API /api/devices/${req.params.ip}/metrics error:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/scene - Switch scene
  app.post('/api/devices/:ip/scene', async (req, res) => {
    try {
      const { scene, clear = true, payload = {} } = req.body;

      if (!scene) {
        return res.status(400).json({ error: 'Scene name is required' });
      }

      logger.ok(`[WEB UI] Switching ${req.params.ip} to scene: ${scene}`, {
        clear,
        source: 'web-ui',
      });

      const result = await sceneService.switchToScene(req.params.ip, scene, {
        clear,
        payload,
      });

      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to switch scene on ${req.params.ip}:`, {
        error: error.message,
        scene: req.body.scene,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/display - Turn display on/off
  app.post('/api/devices/:ip/display', async (req, res) => {
    try {
      const { on } = req.body;

      if (typeof on !== 'boolean') {
        return res.status(400).json({ error: '"on" must be a boolean' });
      }

      logger.ok(`[WEB UI] Display ${on ? 'ON' : 'OFF'} for ${req.params.ip}`, {
        source: 'web-ui',
      });

      const result = await deviceService.setDisplayPower(req.params.ip, on);
      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to set display on ${req.params.ip}:`, {
        error: error.message,
        on: req.body.on,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/brightness - Set display brightness
  app.post('/api/devices/:ip/brightness', async (req, res) => {
    try {
      const { brightness } = req.body;

      if (typeof brightness !== 'number') {
        return res
          .status(400)
          .json({ error: '"brightness" must be a number (0-100)' });
      }

      logger.ok(
        `[WEB UI] Set brightness to ${brightness}% for ${req.params.ip}`,
        {
          source: 'web-ui',
        }
      );

      const result = await deviceService.setDisplayBrightness(
        req.params.ip,
        brightness
      );
      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to set brightness on ${req.params.ip}:`, {
        error: error.message,
        brightness: req.body.brightness,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/reset - Reset device
  app.post('/api/devices/:ip/reset', async (req, res) => {
    try {
      logger.warn(`[WEB UI] Resetting device ${req.params.ip}`, {
        source: 'web-ui',
      });

      const result = await deviceService.resetDevice(req.params.ip);
      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to reset ${req.params.ip}:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/driver - Switch driver
  app.post('/api/devices/:ip/driver', async (req, res) => {
    try {
      const { driver } = req.body;

      if (!driver || !['real', 'mock'].includes(driver)) {
        return res
          .status(400)
          .json({ error: 'Driver must be "real" or "mock"' });
      }

      logger.ok(`[WEB UI] Switching ${req.params.ip} to ${driver} driver`, {
        source: 'web-ui',
      });

      const result = await deviceService.switchDriver(req.params.ip, driver);
      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to switch driver on ${req.params.ip}:`, {
        error: error.message,
        driver: req.body.driver,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/logging - Set device logging level
  app.post('/api/devices/:ip/logging', async (req, res) => {
    try {
      const { level } = req.body;

      const validLevels = ['debug', 'info', 'warning', 'error', 'silent'];
      if (!level || !validLevels.includes(level)) {
        return res.status(400).json({
          error: `level must be one of: ${validLevels.join(', ')}`,
        });
      }

      logger.ok(`[WEB UI] Setting ${level} logging for ${req.params.ip}`, {
        source: 'web-ui',
      });

      const result = await deviceService.setDeviceLogging(req.params.ip, level);
      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to set logging on ${req.params.ip}:`, {
        error: error.message,
        level: req.body.level,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/scenes - List all scenes with metadata
  app.get('/api/scenes', async (req, res) => {
    try {
      const scenes = await sceneService.listScenes();
      res.json({ scenes });
    } catch (error) {
      logger.error('API /api/scenes error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/scenes/list-with-schema - List all scenes with configSchema
  app.get('/api/scenes/list-with-schema', async (req, res) => {
    try {
      const scenes = await sceneService.listScenesWithSchema();
      res.json({ scenes });
    } catch (error) {
      logger.error('API /api/scenes/list-with-schema error:', {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/scene/pause - Pause current scene
  app.post('/api/devices/:ip/scene/pause', async (req, res) => {
    try {
      logger.ok(`[WEB UI] Pausing scene on ${req.params.ip}`, {
        source: 'web-ui',
      });

      const result = await sceneService.pauseScene(req.params.ip);
      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to pause scene on ${req.params.ip}:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/scene/resume - Resume paused scene
  app.post('/api/devices/:ip/scene/resume', async (req, res) => {
    try {
      logger.ok(`[WEB UI] Resuming scene on ${req.params.ip}`, {
        source: 'web-ui',
      });

      const result = await sceneService.resumeScene(req.params.ip);
      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to resume scene on ${req.params.ip}:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/scene/stop - Stop current scene
  app.post('/api/devices/:ip/scene/stop', async (req, res) => {
    try {
      logger.ok(`[WEB UI] Stopping scene on ${req.params.ip}`, {
        source: 'web-ui',
      });

      const result = await sceneService.stopScene(req.params.ip);
      res.json(result);
    } catch (error) {
      logger.error(`[WEB UI] Failed to stop scene on ${req.params.ip}:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/devices/:ip/frametime - Get current frametime/FPS
  app.get('/api/devices/:ip/frametime', async (req, res) => {
    try {
      const deviceInfo = await deviceService.getDeviceInfo(req.params.ip);
      res.json({
        deviceIp: req.params.ip,
        frametime: deviceInfo.metrics.lastFrametime || 0,
        fps: deviceInfo.metrics.lastFrametime
          ? (1000 / deviceInfo.metrics.lastFrametime).toFixed(1)
          : 0,
      });
    } catch (error) {
      logger.error(`API /api/devices/${req.params.ip}/frametime error:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // =========================================================================
  // DEVICE CONFIGURATION API
  // =========================================================================

  // GET /api/config/devices - List all configured devices
  app.get('/api/config/devices', async (req, res) => {
    try {
      const devices = deviceConfigStore.getAllDevices();
      const deviceList = Array.from(devices.values()).map((d) => d.toJSON());
      res.json({
        devices: deviceList,
        defaults: deviceConfigStore.getDefaults(),
      });
    } catch (error) {
      logger.error('API /api/config/devices error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/config/devices/:ip - Get single device config
  app.get('/api/config/devices/:ip', async (req, res) => {
    try {
      const device = deviceConfigStore.getDevice(req.params.ip);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json(device.toJSON());
    } catch (error) {
      logger.error(`API /api/config/devices/${req.params.ip} error:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/config/devices - Add new device
  app.post('/api/config/devices', async (req, res) => {
    try {
      const device = await deviceConfigStore.addDevice(req.body);
      logger.ok(`[WEB UI] Added device config: ${device.ip} (${device.name})`);

      // Activate the device immediately
      try {
        await deviceService.activateDevice(device.ip);
      } catch (activationError) {
        logger.warn(
          `Device config saved but activation failed: ${activationError.message}`
        );
      }

      res.json({
        device: device.toJSON(),
        defaults: deviceConfigStore.getDefaults(),
      });
    } catch (error) {
      logger.error('API /api/config/devices POST error:', {
        error: error.message,
      });
      res.status(400).json({ error: error.message });
    }
  });

  // PUT /api/config/devices/:ip - Update device config
  app.put('/api/config/devices/:ip', async (req, res) => {
    try {
      const device = await deviceConfigStore.updateDevice(
        req.params.ip,
        req.body
      );
      logger.ok(
        `[WEB UI] Updated device config: ${device.ip} (${device.name})`
      );

      // Re-activate device with updated config
      try {
        await deviceService.activateDevice(device.ip);
      } catch (activationError) {
        logger.warn(
          `Device config updated but activation failed: ${activationError.message}`
        );
      }

      res.json({
        device: device.toJSON(),
        defaults: deviceConfigStore.getDefaults(),
      });
    } catch (error) {
      logger.error(`API /api/config/devices/${req.params.ip} PUT error:`, {
        error: error.message,
      });
      res.status(400).json({ error: error.message });
    }
  });

  // DELETE /api/config/devices/:ip - Remove device config
  app.delete('/api/config/devices/:ip', async (req, res) => {
    try {
      // Deactivate device first
      try {
        await deviceService.deactivateDevice(req.params.ip);
      } catch (deactivationError) {
        logger.warn(`Device deactivation failed: ${deactivationError.message}`);
      }

      await deviceConfigStore.removeDevice(req.params.ip);
      logger.ok(`[WEB UI] Removed device config: ${req.params.ip}`);
      res.json({ success: true, defaults: deviceConfigStore.getDefaults() });
    } catch (error) {
      logger.error(`API /api/config/devices/${req.params.ip} DELETE error:`, {
        error: error.message,
      });
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // SCENE DEFAULTS API ENDPOINTS
  // ============================================================================

  // GET /api/config/devices/:ip/scene-defaults - Get all scene defaults for a device
  app.get('/api/config/devices/:ip/scene-defaults', async (req, res) => {
    try {
      const device = deviceConfigStore.getDevice(req.params.ip);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({
        deviceIp: req.params.ip,
        sceneDefaults: device.sceneDefaults || {},
      });
    } catch (error) {
      logger.error(
        `API /api/config/devices/${req.params.ip}/scene-defaults GET error:`,
        { error: error.message }
      );
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/config/devices/:ip/scene-defaults/:sceneName - Get scene defaults for specific scene
  app.get(
    '/api/config/devices/:ip/scene-defaults/:sceneName',
    async (req, res) => {
      try {
        const device = deviceConfigStore.getDevice(req.params.ip);
        if (!device) {
          return res.status(404).json({ error: 'Device not found' });
        }
        const defaults = device.getSceneDefaults(req.params.sceneName);
        res.json({
          deviceIp: req.params.ip,
          sceneName: req.params.sceneName,
          defaults: defaults || {},
        });
      } catch (error) {
        logger.error(
          `API /api/config/devices/${req.params.ip}/scene-defaults/${req.params.sceneName} GET error:`,
          { error: error.message }
        );
        res.status(500).json({ error: error.message });
      }
    }
  );

  // PUT /api/config/devices/:ip/scene-defaults/:sceneName - Update scene defaults
  app.put(
    '/api/config/devices/:ip/scene-defaults/:sceneName',
    async (req, res) => {
      try {
        const device = deviceConfigStore.getDevice(req.params.ip);
        if (!device) {
          return res.status(404).json({ error: 'Device not found' });
        }

        const { defaults } = req.body;
        if (!defaults || typeof defaults !== 'object') {
          return res
            .status(400)
            .json({ error: 'defaults object is required in request body' });
        }

        device.setSceneDefaults(req.params.sceneName, defaults);
        await deviceConfigStore.save();

        logger.ok(
          `[WEB UI] Updated scene defaults for ${req.params.ip}/${req.params.sceneName}`,
          { defaults }
        );

        res.json({
          success: true,
          deviceIp: req.params.ip,
          sceneName: req.params.sceneName,
          defaults,
        });
      } catch (error) {
        logger.error(
          `API /api/config/devices/${req.params.ip}/scene-defaults/${req.params.sceneName} PUT error:`,
          { error: error.message }
        );
        res.status(500).json({ error: error.message });
      }
    }
  );

  // DELETE /api/config/devices/:ip/scene-defaults/:sceneName - Remove scene defaults
  app.delete(
    '/api/config/devices/:ip/scene-defaults/:sceneName',
    async (req, res) => {
      try {
        const device = deviceConfigStore.getDevice(req.params.ip);
        if (!device) {
          return res.status(404).json({ error: 'Device not found' });
        }

        device.removeSceneDefaults(req.params.sceneName);
        await deviceConfigStore.save();

        logger.ok(
          `[WEB UI] Removed scene defaults for ${req.params.ip}/${req.params.sceneName}`
        );

        res.json({
          success: true,
          deviceIp: req.params.ip,
          sceneName: req.params.sceneName,
        });
      } catch (error) {
        logger.error(
          `API /api/config/devices/${req.params.ip}/scene-defaults/${req.params.sceneName} DELETE error:`,
          { error: error.message }
        );
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ============================================================================
  // SCENE USAGE & MANAGEMENT API ENDPOINTS
  // ============================================================================

  // GET /api/config/devices/:ip/scene-usage - Get all scene usage stats for a device
  app.get('/api/config/devices/:ip/scene-usage', async (req, res) => {
    try {
      const device = deviceConfigStore.getDevice(req.params.ip);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json({
        deviceIp: req.params.ip,
        sceneUsage: device.getAllSceneUsage(),
      });
    } catch (error) {
      logger.error(
        `API /api/config/devices/${req.params.ip}/scene-usage GET error:`,
        { error: error.message }
      );
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/config/devices/:ip/scenes/:sceneName/sort-order - Update scene sort order
  app.put(
    '/api/config/devices/:ip/scenes/:sceneName/sort-order',
    async (req, res) => {
      try {
        const device = deviceConfigStore.getDevice(req.params.ip);
        if (!device) {
          return res.status(404).json({ error: 'Device not found' });
        }

        const { sortOrder } = req.body;
        if (typeof sortOrder !== 'number') {
          return res.status(400).json({ error: 'sortOrder must be a number' });
        }

        device.setSceneSortOrder(req.params.sceneName, sortOrder);
        await deviceConfigStore.save();

        logger.ok(
          `[WEB UI] Updated sort order for ${req.params.ip}/${req.params.sceneName}: ${sortOrder}`
        );

        res.json({
          success: true,
          deviceIp: req.params.ip,
          sceneName: req.params.sceneName,
          sortOrder,
        });
      } catch (error) {
        logger.error(
          `API /api/config/devices/${req.params.ip}/scenes/${req.params.sceneName}/sort-order PUT error:`,
          { error: error.message }
        );
        res.status(500).json({ error: error.message });
      }
    }
  );

  // POST /api/devices/:ip/scenes/:sceneName/test - Test scene with temporary parameters
  app.post('/api/devices/:ip/scenes/:sceneName/test', async (req, res) => {
    try {
      const { params = {} } = req.body;

      // Switch to scene with test parameters (no persistence)
      await sceneService.switchToScene(req.params.ip, req.params.sceneName, {
        clear: true,
        payload: params,
      });

      logger.ok(
        `[WEB UI] Testing scene ${req.params.sceneName} on ${req.params.ip} with temp params`,
        { params }
      );

      res.json({
        success: true,
        deviceIp: req.params.ip,
        sceneName: req.params.sceneName,
        message: 'Scene activated with test parameters (not saved)',
      });
    } catch (error) {
      logger.error(
        `API /api/devices/${req.params.ip}/scenes/${req.params.sceneName}/test POST error:`,
        { error: error.message }
      );
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/config/devices/:ip/scenes/bulk - Bulk operations on scenes
  app.post('/api/config/devices/:ip/scenes/bulk', async (req, res) => {
    try {
      const device = deviceConfigStore.getDevice(req.params.ip);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      const { sceneNames, action } = req.body;
      if (!Array.isArray(sceneNames) || sceneNames.length === 0) {
        return res.status(400).json({ error: 'sceneNames array is required' });
      }
      if (!action) {
        return res.status(400).json({ error: 'action is required' });
      }

      const results = [];

      switch (action) {
        case 'hide':
        case 'show': {
          // Note: isHidden is scene metadata, not per-device
          // This would require a different approach or should be removed
          // For now, return an error
          return res.status(400).json({
            error:
              'hide/show actions require scene file modifications, not supported via API',
          });
        }

        case 'reset': {
          // Remove scene defaults for selected scenes
          for (const sceneName of sceneNames) {
            device.removeSceneDefaults(sceneName);
            results.push({ sceneName, action: 'reset', success: true });
          }
          await deviceConfigStore.save();
          break;
        }

        case 'export': {
          // Export scene defaults for selected scenes
          const exportData = {};
          for (const sceneName of sceneNames) {
            const defaults = device.getSceneDefaults(sceneName);
            if (defaults) {
              exportData[sceneName] = defaults;
            }
          }
          return res.json({
            success: true,
            deviceIp: req.params.ip,
            action: 'export',
            data: exportData,
          });
        }

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }

      logger.ok(
        `[WEB UI] Bulk ${action} operation on ${req.params.ip} for ${sceneNames.length} scenes`
      );

      res.json({
        success: true,
        deviceIp: req.params.ip,
        action,
        results,
      });
    } catch (error) {
      logger.error(
        `API /api/config/devices/${req.params.ip}/scenes/bulk POST error:`,
        { error: error.message }
      );
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GLOBAL CONFIG API ENDPOINTS
  // ============================================================================

  // GET /api/config/global - Global PIDICON defaults/settings
  app.get('/api/config/global', async (req, res) => {
    try {
      const settings = deviceConfigStore.getSettings();
      res.json({
        config: {
          defaultDriver: settings.defaults.driver,
          defaultBrightness: settings.defaults.brightness,
          watchdog: settings.defaults.watchdog,
          mediaPath: settings.mediaPath,
          scenesPath: settings.scenesPath,
        },
      });
    } catch (error) {
      logger.error('API /api/config/global error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/config/global - Update global defaults/settings
  app.post('/api/config/global', async (req, res) => {
    try {
      const payload = req.body || {};
      const {
        defaultDriver,
        defaultBrightness,
        watchdog,
        mediaPath,
        scenesPath,
      } = payload;

      const defaults = await deviceConfigStore.updateDefaults({
        driver: defaultDriver,
        brightness: defaultBrightness,
        watchdog,
      });

      const mergedSettings = {
        mediaPath,
        scenesPath,
        defaults,
      };

      await deviceConfigStore.updateSettings(mergedSettings);

      res.json({
        config: {
          defaultDriver: defaults.driver,
          defaultBrightness: defaults.brightness,
          watchdog: defaults.watchdog,
          mediaPath:
            mergedSettings.mediaPath ||
            deviceConfigStore.getSettings().mediaPath,
          scenesPath:
            mergedSettings.scenesPath ||
            deviceConfigStore.getSettings().scenesPath,
        },
      });
    } catch (error) {
      logger.error('API /api/config/global POST error:', {
        error: error.message,
      });
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/config/global/reset - Reset defaults to built-in values
  app.post('/api/config/global/reset', async (_req, res) => {
    try {
      const defaults = await deviceConfigStore.updateDefaults({
        driver: 'real',
        brightness: 80,
        watchdog: {
          timeoutMinutes: 240,
          action: 'restart',
          healthCheckIntervalSeconds: 10,
          checkWhenOff: true,
          notifyOnFailure: true,
          mqttCommandSequence: [],
          fallbackScene: null,
        },
      });

      await deviceConfigStore.updateSettings({ defaults });

      res.json({
        config: {
          defaultDriver: defaults.driver,
          defaultBrightness: defaults.brightness,
          watchdog: defaults.watchdog,
        },
      });
    } catch (error) {
      logger.error('API /api/config/global/reset error:', {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/scenes/list - List scenes with device type filtering
  app.get('/api/scenes/list', async (req, res) => {
    try {
      const { deviceType } = req.query;
      const scenes = await sceneService.listScenes();

      // TODO: Filter scenes by device type once scene organization is complete
      // For now, return all scenes
      const filtered = scenes.filter((_scene) => {
        if (!deviceType) return true;
        // Future: Check scene compatibility with device type
        return true;
      });

      res.json({ scenes: filtered });
    } catch (error) {
      logger.error('API /api/scenes/list error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/config/devices/:ip/test - Test device connection
  app.post('/api/config/devices/:ip/test', async (req, res) => {
    try {
      // Try to get device info to test connectivity
      const deviceInfo = await deviceService.getDeviceInfo(req.params.ip);
      res.json({
        success: true,
        connected: true,
        deviceInfo,
      });
    } catch (error) {
      logger.warn(`[WEB UI] Device test failed for ${req.params.ip}:`, {
        error: error.message,
      });
      res.json({
        success: false,
        connected: false,
        error: error.message,
      });
    }
  });

  // =========================================================================
  // DAEMON MANAGEMENT
  // =========================================================================

  // POST /api/daemon/restart - Restart daemon
  app.post('/api/daemon/restart', async (req, res) => {
    try {
      logger.warn('[WEB UI] Daemon restart requested', { source: 'web-ui' });

      const result = await systemService.restartDaemon();
      res.json(result);
    } catch (error) {
      logger.error('[WEB UI] Failed to restart daemon:', {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/system/watchdog-status - Get watchdog/health status
  app.get('/api/system/watchdog-status', (req, res) => {
    try {
      const status = watchdogService.getAllStatus();
      res.json(status);
    } catch (error) {
      logger.error('API /api/system/watchdog-status error:', {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostics API
  app.get('/api/tests', async (req, res) => {
    try {
      const tests = await diagnosticsService.getAllTests();
      res.json({ tests });
    } catch (error) {
      logger.error('API /api/tests error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tests/:id/run', async (req, res) => {
    try {
      const result = await diagnosticsService.runTest(req.params.id);
      res.json(result);
    } catch (error) {
      logger.error(`API /api/tests/${req.params.id}/run error:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tests/run', async (req, res) => {
    try {
      const results = await diagnosticsService.runAll();
      res.json({ results });
    } catch (error) {
      logger.error('API /api/tests/run error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get test progress
  app.get('/api/tests/progress', (req, res) => {
    res.json(testProgress);
  });

  // Run automated tests (npm test) on the server
  app.post('/api/tests/run-automated', async (req, res) => {
    try {
      // Check if test infrastructure exists (not available in production Docker images)
      const fs = require('fs');
      const testScriptPath = path.join(process.cwd(), 'test');
      if (!fs.existsSync(testScriptPath)) {
        return res.status(501).json({
          error: 'Test infrastructure not available in this environment',
          message:
            'Tests are pre-run during Docker build. Test results are already available.',
        });
      }

      // Check if tests are already running
      if (runningTestProcess && !runningTestProcess.killed) {
        return res.status(409).json({ error: 'Tests are already running' });
      }

      logger.info('[WEB UI] Running automated tests on server...', {
        source: 'web-ui',
      });

      testProgress = { completed: 0, total: 0, running: true };

      const { spawn } = require('child_process');
      runningTestProcess = spawn('npm', ['test'], {
        cwd: process.cwd(),
        env: process.env,
      });

      let responseTimeout;
      let responseSent = false;

      // Parse TAP output for progress
      runningTestProcess.stdout.on('data', (data) => {
        const chunk = data.toString();

        // Count test completions in TAP format
        const testMatches = chunk.match(/^(ok|not ok) \d+/gm);
        if (testMatches) {
          testProgress.completed += testMatches.length;
        }

        // Extract total from TAP plan line (e.g., "1..454")
        const planMatch = chunk.match(/^1\.\.(\d+)$/m);
        if (planMatch) {
          testProgress.total = parseInt(planMatch[1], 10);
        }
      });

      runningTestProcess.on('close', async (code) => {
        // Set responseSent immediately to prevent race condition with timeout
        if (responseSent) return;
        responseSent = true;

        testProgress.running = false;
        runningTestProcess = null;
        clearTimeout(responseTimeout);

        logger.info('[WEB UI] Automated tests completed', {
          exitCode: code,
          source: 'web-ui',
        });

        // Reload tests to get fresh results
        try {
          const tests = await diagnosticsService.getAllTests();
          const automatedTests = tests.filter((t) => t.type === 'automated');

          res.json({
            success: code === 0,
            exitCode: code,
            message:
              code === 0
                ? 'Tests completed successfully'
                : 'Tests completed with failures',
            totalTests: automatedTests.length,
            tests: automatedTests,
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: 'Tests ran but failed to load results: ' + error.message,
          });
        }
      });

      runningTestProcess.on('error', (error) => {
        if (responseSent) return;
        responseSent = true;

        testProgress.running = false;
        runningTestProcess = null;
        clearTimeout(responseTimeout);

        res.status(500).json({
          success: false,
          error: error.message,
        });
      });

      // Timeout after 5 minutes
      responseTimeout = setTimeout(() => {
        if (runningTestProcess && !runningTestProcess.killed) {
          runningTestProcess.kill('SIGTERM');
          testProgress.running = false;

          if (!responseSent) {
            responseSent = true;
            res.status(408).json({
              success: false,
              error: 'Test execution timed out after 5 minutes',
            });
          }
        }
      }, 300000);
    } catch (error) {
      testProgress.running = false;
      logger.error('API /api/tests/run-automated error:', {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Force stop running tests
  app.post('/api/tests/stop', (req, res) => {
    try {
      if (!runningTestProcess || runningTestProcess.killed) {
        return res
          .status(404)
          .json({ error: 'No tests are currently running' });
      }

      logger.info('[WEB UI] Force stopping tests', { source: 'web-ui' });

      runningTestProcess.kill('SIGTERM');
      testProgress.running = false;
      runningTestProcess = null;

      res.json({ success: true, message: 'Tests stopped' });
    } catch (error) {
      logger.error('API /api/tests/stop error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get settings
  app.get('/api/settings', (req, res) => {
    try {
      const settings = {
        runTestsOnStartup:
          stateStore.getGlobal('settings.runTestsOnStartup') || false,
        showTestPageOnError:
          stateStore.getGlobal('settings.showTestPageOnError') || false,
        testFailedOnStartup:
          stateStore.getGlobal('testFailedOnStartup') || false,
      };
      res.json(settings);
    } catch (error) {
      logger.error('API /api/settings error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update settings
  app.post('/api/settings', (req, res) => {
    try {
      const { runTestsOnStartup, showTestPageOnError } = req.body;

      if (typeof runTestsOnStartup === 'boolean') {
        stateStore.setGlobal('settings.runTestsOnStartup', runTestsOnStartup);
      }
      if (typeof showTestPageOnError === 'boolean') {
        stateStore.setGlobal(
          'settings.showTestPageOnError',
          showTestPageOnError
        );
      }

      logger.info('[WEB UI] Settings updated', {
        source: 'web-ui',
        updates: req.body,
      });

      res.json({
        success: true,
        settings: {
          runTestsOnStartup: stateStore.getGlobal('settings.runTestsOnStartup'),
          showTestPageOnError: stateStore.getGlobal(
            'settings.showTestPageOnError'
          ),
        },
      });
    } catch (error) {
      logger.error('API /api/settings error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/system/mqtt-config', async (req, res) => {
    try {
      const config = await mqttConfigService.loadConfig();
      const mqttStatus =
        container.resolveIfRegistered('mqttService')?.getStatus?.() || {};
      const safeConfig = {
        brokerUrl: config.brokerUrl || '',
        username: config.username || '',
        clientId: config.clientId || '',
        keepalive: config.keepalive ?? 60,
        tls: !!config.tls,
        autoReconnect: config.autoReconnect !== false,
        hasPassword: Boolean(config.password),
      };
      res.json({
        config: safeConfig,
        status: mqttStatus,
      });
    } catch (error) {
      logger.error('API /api/system/mqtt-config error:', {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/system/mqtt-config', async (req, res) => {
    try {
      const previousConfig = JSON.parse(
        JSON.stringify(await mqttConfigService.loadConfig())
      );
      const updated = await mqttConfigService.updateConfig(req.body || {});
      const mqttServiceInstance = container.resolveIfRegistered('mqttService');

      const connectionFields = [
        'brokerUrl',
        'username',
        'password',
        'clientId',
        'keepalive',
        'tls',
      ];

      const connectionChanged = connectionFields.some((field) => {
        const prevValue = previousConfig ? previousConfig[field] : undefined;
        const nextValue = updated ? updated[field] : undefined;
        return prevValue !== nextValue;
      });

      let status = mqttServiceInstance?.getStatus?.() || {};

      if (mqttServiceInstance && connectionChanged) {
        logger.info('MQTT configuration changed, cycling connection');
        try {
          await mqttServiceInstance.disconnect();
        } catch (disconnectError) {
          logger.warn('MQTT disconnect during config update failed', {
            error: disconnectError.message,
          });
        }

        try {
          await mqttServiceInstance.connect();
          status = mqttServiceInstance.getStatus?.() || {};
        } catch (connectError) {
          logger.error('Failed to reconnect MQTT after config update', {
            error: connectError.message,
          });
          status = mqttServiceInstance.getStatus?.() || status;
        }
      } else if (mqttServiceInstance) {
        status = mqttServiceInstance.getStatus?.() || status;
      }

      const safeConfig = {
        brokerUrl: updated.brokerUrl || '',
        username: updated.username || '',
        clientId: updated.clientId || '',
        keepalive: updated.keepalive ?? 60,
        tls: !!updated.tls,
        autoReconnect: updated.autoReconnect !== false,
        hasPassword: Boolean(updated.password),
      };

      res.json({
        config: safeConfig,
        status,
        connectionChanged,
      });
    } catch (error) {
      logger.error('API /api/system/mqtt-config (POST) error:', {
        error: error.message,
      });
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/system/mqtt/connect', async (_req, res) => {
    try {
      const mqttServiceInstance = container.resolveIfRegistered('mqttService');
      if (!mqttServiceInstance) {
        return res
          .status(503)
          .json({ error: 'MQTT service is not available in this deployment' });
      }

      await mqttServiceInstance.connect();
      const status = mqttServiceInstance.getStatus?.() || {};

      logger.ok('MQTT connect triggered manually', {
        broker: status.brokerUrl,
        connected: status.connected,
      });

      res.json({ status });
    } catch (error) {
      logger.error('API /api/system/mqtt/connect error', {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/system/mqtt/disconnect', async (_req, res) => {
    try {
      const mqttServiceInstance = container.resolveIfRegistered('mqttService');
      if (!mqttServiceInstance) {
        return res
          .status(503)
          .json({ error: 'MQTT service is not available in this deployment' });
      }

      await mqttServiceInstance.disconnect();
      const status = mqttServiceInstance.getStatus?.() || {};

      logger.warn('MQTT disconnect triggered manually');

      res.json({ status });
    } catch (error) {
      logger.error('API /api/system/mqtt/disconnect error', {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // =========================================================================
  // SPA FALLBACK - Serve index.html for all non-API routes
  // =========================================================================

  // Catch-all middleware for Vue Router (must be last!)
  // Express 5 compatibility: use middleware instead of app.get('*')
  app.use((req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    // Only handle GET requests for HTML routes
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    // Serve index.html for all other routes (SPA)
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // =========================================================================
  // START SERVER
  // =========================================================================

  const server = app.listen(WEB_UI_PORT, () => {
    logger.ok(`🌐 Web UI started on http://localhost:${WEB_UI_PORT}`);
    if (WEB_UI_AUTH) {
      logger.info('🔒 Web UI authentication enabled');
    } else {
      logger.warn(
        '⚠️  Web UI authentication disabled (set PIXOO_WEB_AUTH to enable)'
      );
    }
  });

  // =========================================================================
  // WEBSOCKET SERVER
  // =========================================================================

  const wss = new WebSocket.Server({ server, path: '/ws' });
  const clients = new Set();

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info(`🔌 WebSocket client connected from ${clientIp}`);
    clients.add(ws);

    // Send initial state
    (async () => {
      try {
        const devices = await deviceService.listDevices();
        const scenes = await sceneService.listScenes();

        ws.send(
          JSON.stringify({
            type: 'init',
            data: {
              devices,
              scenes,
              timestamp: Date.now(),
            },
          })
        );
      } catch (error) {
        logger.error('Failed to send initial WebSocket state:', {
          error: error.message,
        });
      }
    })();

    // Setup ping/pong for keepalive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000); // Every 30 seconds

    ws.on('pong', () => {
      // Client responded to ping, connection is alive
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        logger.error('Invalid WebSocket message:', { error: error.message });
      }
    });

    ws.on('close', () => {
      logger.info(`🔌 WebSocket client disconnected from ${clientIp}`);
      clients.delete(ws);
      clearInterval(pingInterval);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', { error: error.message, clientIp });
      clients.delete(ws);
      clearInterval(pingInterval);
    });
  });

  // Broadcast function for state updates
  function broadcast(message) {
    const payload = JSON.stringify(message);
    let sent = 0;
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        sent++;
      }
    });
    if (sent > 0) {
      logger.debug(
        `📡 WebSocket broadcast to ${sent} client(s): ${message.type}`
      );
    }
  }

  // Attach broadcast function to server for external use
  server.wsBroadcast = broadcast;

  // Setup periodic state broadcasts (only for slow-changing data)
  // Event-driven updates handle frame metrics via publishOk callback
  setInterval(async () => {
    if (clients.size > 0) {
      try {
        const devices = await deviceService.listDevices();
        broadcast({
          type: 'devices_update',
          data: devices,
          timestamp: Date.now(),
        });
      } catch (error) {
        logger.error('Failed to broadcast device updates:', {
          error: error.message,
        });
      }
    }
  }, 2000); // Every 2s for scene state changes (metrics are event-driven)

  logger.ok(`🔌 WebSocket server started on ws://localhost:${WEB_UI_PORT}/ws`);

  return server;
}

module.exports = { startWebServer };
