/**
 * @fileoverview Framework Animated Scene Demo
 * @description Demonstrates the AnimatedScene base class with smooth animations
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^(render|init|cleanup)$" }] */

const path = require('path');
const { AnimatedScene } = require(
  path.join(__dirname, '../../../lib/scene-framework')
);

const name = 'framework_animated_demo';

/**
 * Bouncing ball animation using the framework
 */
class BouncingBallScene extends AnimatedScene {
  constructor(options = {}) {
    super({
      name: 'bouncing_ball',
      frameRate: 0, // Adaptive timing - render as fast as possible
      config: {
        debug: false,
        ballColor: [255, 100, 100, 255], // Red
        trailColor: [100, 100, 255, 150], // Blue with transparency
        ballSize: 4,
        speed: 0.5, // Animation speed multiplier (10x faster)
        ...options.config,
      },
    });
  }

  async renderFrame(context) {
    const { device, frameCount, elapsedSeconds } = context;
    const { ballColor, trailColor, ballSize, speed } = this.config;

    // Clear screen
    await device.clear();

    // Calculate ball position using smooth sine waves
    const centerX = 32;
    const centerY = 32;
    const amplitude = 20;

    const ballX = Math.round(
      centerX + Math.sin(elapsedSeconds * speed) * amplitude
    );
    const ballY = Math.round(
      centerY + Math.cos(elapsedSeconds * speed * 1.3) * amplitude
    );

    // Draw trail effect (previous positions)
    for (let i = 1; i <= 5; i++) {
      const trailTime = elapsedSeconds - i * 0.1;
      const trailX = Math.round(
        centerX + Math.sin(trailTime * speed) * amplitude
      );
      const trailY = Math.round(
        centerY + Math.cos(trailTime * speed * 1.3) * amplitude
      );
      const alpha = Math.max(30, 150 - i * 25);

      await device.fillRect(
        [trailX - ballSize / 2, trailY - ballSize / 2],
        [ballSize, ballSize],
        [...trailColor.slice(0, 3), alpha]
      );
    }

    // Draw main ball
    await device.fillRect(
      [ballX - ballSize / 2, ballY - ballSize / 2],
      [ballSize, ballSize],
      ballColor
    );

    // Draw info text
    await device.drawText(
      'Framework Demo',
      [32, 8],
      [255, 255, 255, 255],
      'center'
    );
    await device.drawText(
      `Frame: ${frameCount}`,
      [32, 56],
      [200, 200, 200, 255],
      'center'
    );

    // Draw bouncing ball label
    await device.drawText(
      'Bouncing Ball',
      [32, 48],
      [150, 150, 255, 255],
      'center'
    );
  }
}

// Create and export the scene instance
const scene = new BouncingBallScene();

// Export in the standard scene format
const init = (context) => scene.init(context);
const render = (context) => scene.render(context);
const cleanup = (context) => scene.cleanup(context);
const wantsLoop = true;

const description =
  'Demonstrates the AnimatedScene base class with smooth animations, frame counting, and completion handling. Shows proper state management and lifecycle methods for animated scenes.';
const category = 'Framework';
const deviceTypes = ['pixoo64'];
const tags = ['dev', 'framework', 'animation'];
const configSchema = {
  frames: {
    type: 'number',
    default: 50,
    description: 'Number of frames to render before completion',
    min: 1,
    max: 1000,
  },
};

// Scene metadata
const sceneType = 'dev';
const author = 'PIDICON Team';
const version = '1.0.0';
const thumbnail = null;
const isHidden = false;
const sortOrder = 250;

module.exports = {
  name,
  render,
  init,
  cleanup,
  wantsLoop,
  description,
  category,
  deviceTypes,
  tags,
  configSchema,
  sceneType,
  author,
  version,
  thumbnail,
  isHidden,
  sortOrder,
};
