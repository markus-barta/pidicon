/**
 * @fileoverview Configuration Validator Demo Scene
 * @description Demonstrates configuration presets and validation using ConfigValidator
 * Shows how to use presets, validation, and error handling for scene configurations.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const path = require('path');
const ConfigValidator = require(
  path.join(__dirname, '../../../lib/config-validator')
);

class ConfigValidatorDemoScene {
  constructor() {
    this.name = 'config_validator_demo';
    this.frameCount = 0;
    this.configValidator = null;
    this.currentConfig = null;
    this.validationErrors = [];
    this.demoPhase = 0; // 0: presets, 1: validation, 2: errors
    this.phaseStartFrame = 0;
    this.phaseDuration = 120; // ~24 seconds at 5fps
  }

  async init(context) {
    const { log } = context;
    this.log = log; // Store for use in helper methods
    log?.(
      `⚙️ [${context.device.host}] Initializing Config Validator Demo`,
      'info'
    );

    // Initialize config validator
    this.configValidator = new ConfigValidator();

    // Demonstrate preset creation
    this._demonstratePresets();

    this.frameCount = 0;
    this.demoPhase = 0;
    this.phaseStartFrame = 0;
  }

  async render(context) {
    const { log } = context;
    this.log = log; // Store for use in helper methods
    this.frameCount++;

    // Update demo phase
    const framesInPhase = this.frameCount - this.phaseStartFrame;
    if (framesInPhase >= this.phaseDuration) {
      this.demoPhase = (this.demoPhase + 1) % 3;
      this.phaseStartFrame = this.frameCount;

      // Switch configurations for each phase
      switch (this.demoPhase) {
        case 0:
          this._setupPresetDemo();
          break;
        case 1:
          this._setupValidationDemo();
          break;
        case 2:
          this._setupErrorDemo();
          break;
      }

      log?.(
        `⚙️ [${context.device.host}] Config Demo phase ${this.demoPhase}`,
        'debug'
      );
    }

    try {
      // Clear screen
      await context.device.clear();

      // Draw background based on phase
      await this._drawBackground(context.device);

      // Render current demo phase
      switch (this.demoPhase) {
        case 0:
          await this._renderPresetDemo(context);
          break;
        case 1:
          await this._renderValidationDemo(context);
          break;
        case 2:
          await this._renderErrorDemo(context);
          break;
      }

      // Draw UI elements
      await this._drawUI(context);

      // Push frame
      await context.device.push('config_validator_demo', context.publishOk);

      return 200; // ~5fps
    } catch (error) {
      this.log?.(`⚙️ Config Demo render error: ${error.message}`, 'error');

      // Fallback display
      await context.device.clear();
      await context.device.drawText(
        'CONFIG ERROR',
        [32, 32],
        [255, 0, 0, 255],
        'center'
      );
      await context.device.push('config_validator_demo', context.publishOk);

      return 1000;
    }
  }

  _demonstratePresets() {
    this.log?.('⚙️ Demonstrating configuration presets...', 'info');

    // Show available presets
    const presets = this.configValidator.getAllPresets();
    this.log?.(
      `📋 Available presets: ${Array.from(presets.keys()).join(', ')}`,
      'info'
    );

    // Demonstrate preset creation
    const textConfig = this.configValidator.createFromPreset('text-fancy', {
      text: 'HELLO',
      position: [32, 20],
    });
    this.log?.(
      `📋 Created text config from preset: ${JSON.stringify(textConfig)}`,
      'info'
    );

    // Demonstrate chart preset
    const chartConfig = this.configValidator.createFromPreset('chart-basic', {
      data: [10, 20, 30, 40, 50],
    });
    this.log?.(
      `📋 Created chart config from preset: ${JSON.stringify(chartConfig)}`,
      'info'
    );
  }

  _setupPresetDemo() {
    // Create valid configuration from preset
    this.currentConfig = this.configValidator.createFromPreset('text-fancy', {
      text: 'PRESETS',
      position: [32, 20],
    });
    this.validationErrors = [];
  }

  _setupValidationDemo() {
    // Create configuration that passes validation
    this.currentConfig = this.configValidator.createValidatedConfig(
      'text-simple',
      {
        text: 'VALID',
        position: [32, 20],
        color: [0, 255, 0, 255],
      },
      'text'
    );
    this.validationErrors = [];
  }

  _setupErrorDemo() {
    // Create configuration with validation errors
    this.configValidator.createValidatedConfig(
      'text-simple',
      {
        // Missing required 'text' property
        position: [32, 20],
        color: [255, 0, 0, 255],
        invalidProp: 'should not be here',
      },
      'text'
    );
    this.validationErrors = this.configValidator.getErrors();
    this.currentConfig = null;
  }

  async _drawBackground(device) {
    // Different background colors for each phase
    const colors = [
      [20, 20, 40, 255], // Blue for presets
      [20, 40, 20, 255], // Green for validation
      [40, 20, 20, 255], // Red for errors
    ];

    await device.fillRect([0, 0], [64, 64], colors[this.demoPhase]);
  }

  async _renderPresetDemo(context) {
    const { device } = context;

    // Title
    await device.drawText('PRESETS', [32, 8], [255, 255, 255, 255], 'center');

    // Show current preset config
    if (this.currentConfig) {
      await device.drawText(
        this.currentConfig.text,
        this.currentConfig.position,
        this.currentConfig.color,
        this.currentConfig.alignment
      );

      // Show preset info
      await device.drawText(
        'text-fancy',
        [32, 40],
        [200, 200, 200, 255],
        'center'
      );

      await device.drawText('preset', [32, 48], [150, 150, 150, 255], 'center');
    }
  }

  async _renderValidationDemo(context) {
    const { device } = context;

    // Title
    await device.drawText(
      'VALIDATION',
      [32, 8],
      [255, 255, 255, 255],
      'center'
    );

    // Show validated config
    if (this.currentConfig) {
      await device.drawText(
        this.currentConfig.text,
        this.currentConfig.position,
        this.currentConfig.color,
        this.currentConfig.alignment
      );

      // Show validation status
      await device.drawText('VALID', [32, 40], [0, 255, 0, 255], 'center');

      await device.drawText(
        'text schema',
        [32, 48],
        [150, 150, 150, 255],
        'center'
      );
    }
  }

  async _renderErrorDemo(context) {
    const { device } = context;

    // Title
    await device.drawText('ERRORS', [32, 8], [255, 255, 255, 255], 'center');

    // Show validation errors
    if (this.validationErrors.length > 0) {
      await device.drawText('INVALID', [32, 20], [255, 0, 0, 255], 'center');

      // Show first error (truncated)
      const errorText = this.validationErrors[0].substring(0, 12) + '...';
      await device.drawText(
        errorText,
        [32, 32],
        [255, 100, 100, 255],
        'center'
      );

      await device.drawText(
        `${this.validationErrors.length} errors`,
        [32, 44],
        [200, 100, 100, 255],
        'center'
      );
    }
  }

  async _drawUI(context) {
    const { device } = context;

    // Phase indicator
    const phaseColors = [
      [100, 100, 255, 255], // Blue
      [100, 255, 100, 255], // Green
      [255, 100, 100, 255], // Red
    ];

    // Small indicator dots
    for (let i = 0; i < 3; i++) {
      const color = i === this.demoPhase ? phaseColors[i] : [50, 50, 50, 255];
      await device.fillRect([20 + i * 8, 58], [4, 4], color);
    }

    // Frame counter
    await device.drawText(
      `F:${this.frameCount}`,
      [50, 58],
      [150, 150, 150, 180],
      'left'
    );
  }

  async cleanup(context) {
    const { log } = context;
    log?.(
      `🧹 [${context.device.host}] Cleaning up Config Validator Demo`,
      'info'
    );

    if (this.configValidator) {
      // ConfigValidator doesn't need explicit cleanup
      this.configValidator = null;
    }
  }
}

// Create scene instance and export in standard format
const scene = new ConfigValidatorDemoScene();
const name = scene.name;
const render = (context) => scene.render(context);
const init = (context) => scene.init(context);
const cleanup = (context) => scene.cleanup(context);
const wantsLoop = true;

const description =
  'Demonstrates configuration presets and validation using ConfigValidator. Shows how to use presets, validation, and error handling for scene configurations. Tests various config scenarios including valid/invalid parameters and preset loading.';
const category = 'Development';
const deviceTypes = ['pixoo64'];
const tags = ['dev', 'config'];
const configSchema = null;

// Scene metadata
const sceneType = 'dev';
const author = 'PIDICON Team';
const version = '1.0.0';
const thumbnail = null;
const isHidden = false;
const sortOrder = 220;

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
