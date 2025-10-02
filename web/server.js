/**
 * @fileoverview Web UI Server - Express server for Pixoo Daemon control panel
 * @description Provides REST API and web UI for managing Pixoo devices
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

const express = require('express');
const path = require('path');

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
  app.use(express.static(path.join(__dirname, 'public')));

  // Basic authentication (DISABLED)
  // if (WEB_UI_AUTH) {
  //   app.use((req, res, next) => {
  //     const auth = req.headers.authorization;
  //
  //     if (!auth) {
  //       res.setHeader('WWW-Authenticate', 'Basic realm="Pixoo Control Panel"');
  //       return res.status(401).json({ error: 'Authentication required' });
  //     }
  //
  //     const [scheme, encoded] = auth.split(' ');
  //     if (scheme !== 'Basic') {
  //       return res.status(401).json({ error: 'Invalid authentication scheme' });
  //     }
  //
  //     const credentials = Buffer.from(encoded, 'base64').toString('utf-8');
  //     if (credentials !== WEB_UI_AUTH) {
  //       res.setHeader('WWW-Authenticate', 'Basic realm="Pixoo Control Panel"');
  //       return res.status(401).json({ error: 'Invalid credentials' });
  //     }
  //
  //     next();
  //   });
  // }

  // Resolve services
  const sceneService = container.resolve('sceneService');
  const deviceService = container.resolve('deviceService');
  const systemService = container.resolve('systemService');

  // =========================================================================
  // API ENDPOINTS
  // =========================================================================

  // GET /api/status - Daemon status
  app.get('/api/status', async (req, res) => {
    try {
      const status = await systemService.getStatus();
      res.json(status);
    } catch (error) {
      logger.error('API /api/status error:', { error: error.message });
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

      const result = await sceneService.switchToScene(req.params.ip, scene, {
        clear,
        payload,
      });

      res.json(result);
    } catch (error) {
      logger.error(`API /api/devices/${req.params.ip}/scene error:`, {
        error: error.message,
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

      const result = await deviceService.setDisplayPower(req.params.ip, on);
      res.json(result);
    } catch (error) {
      logger.error(`API /api/devices/${req.params.ip}/display error:`, {
        error: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/devices/:ip/reset - Reset device
  app.post('/api/devices/:ip/reset', async (req, res) => {
    try {
      const result = await deviceService.resetDevice(req.params.ip);
      res.json(result);
    } catch (error) {
      logger.error(`API /api/devices/${req.params.ip}/reset error:`, {
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

      const result = await deviceService.switchDriver(req.params.ip, driver);
      res.json(result);
    } catch (error) {
      logger.error(`API /api/devices/${req.params.ip}/driver error:`, {
        error: error.message,
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

  // POST /api/daemon/restart - Restart daemon
  app.post('/api/daemon/restart', async (req, res) => {
    try {
      const result = await systemService.restartDaemon();
      res.json(result);
    } catch (error) {
      logger.error('API /api/daemon/restart error:', { error: error.message });
      res.status(500).json({ error: error.message });
    }
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
        '⚠️  Web UI authentication disabled (set PIXOO_WEB_AUTH to enable)',
      );
    }
  });

  return server;
}

module.exports = { startWebServer };
