/**
 * @fileoverview Web UI Server - Express server for Pixoo Daemon control panel
 * @description Provides REST API and web UI for managing Pixoo devices
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
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
        },
      );

      const result = await deviceService.setDisplayBrightness(
        req.params.ip,
        brightness,
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
        '⚠️  Web UI authentication disabled (set PIXOO_WEB_AUTH to enable)',
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
          }),
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
        `📡 WebSocket broadcast to ${sent} client(s): ${message.type}`,
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
