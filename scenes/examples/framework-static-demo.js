/**
 * @fileoverview Framework Static Scene Demo
 * @description Demonstrates the StaticScene base class - renders once and completes
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^(render|init|cleanup)$" }] */

const { StaticScene } = require('../../lib/scene-framework');

const name = 'framework_static_demo';

/**
 * Simple status display scene using the framework
 */
class StatusDisplayScene extends StaticScene {
  constructor(options = {}) {
    super({
      name: 'status_display',
      config: {
        debug: true,
        title: 'System Status',
        statusColor: [0, 255, 0, 255], // Green
        ...options.config,
      },
    });
  }

  async renderContent(context) {
    const { device } = context;
    const { title, statusColor } = this.config;

    // Clear screen with dark background
    await device.clear();
    await device.fillRect([0, 0], [64, 64], [20, 20, 40, 255]);

    // Title
    await device.drawText(title, [32, 8], [255, 255, 255, 255], 'center');

    // Status indicator
    await device.fillRect([28, 24], [8, 8], statusColor);

    // Status text
    await device.drawText('ONLINE', [32, 40], [200, 200, 200, 255], 'center');

    // Framework info
    await device.drawText(
      'Framework Demo',
      [32, 52],
      [150, 150, 150, 255],
      'center',
    );
  }
}

// Create and export the scene instance
const scene = new StatusDisplayScene();

// Export in the standard scene format
const init = (context) => scene.init(context);
const render = (context) => scene.render(context);
const cleanup = (context) => scene.cleanup(context);
const wantsLoop = false;

module.exports = { name, render, init, cleanup, wantsLoop };
