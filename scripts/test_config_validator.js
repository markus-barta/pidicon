/**
 * @fileoverview Configuration Validator Test Script
 * @description Comprehensive tests for CFG-204 Configuration Validator implementation
 * Tests presets, validation, schemas, and error handling
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

// const logger = require('../lib/logger'); // Not needed for unit tests
const ConfigValidator = require('../lib/config-validator');

async function testConfigValidator() {
  console.log('⚙️ Testing Configuration Validator (CFG-204)\n');

  const validator = new ConfigValidator();
  let testCount = 0;
  let passCount = 0;

  // Helper function to run a test
  const runTest = async (testName, testFunc) => {
    testCount++;
    try {
      const result = await testFunc();
      if (result) {
        console.log(`✅ ${testName}`);
        passCount++;
      } else {
        console.log(`❌ ${testName}`);
      }
    } catch (error) {
      console.log(`❌ ${testName}: ${error.message}`);
    }
  };

  // Run all tests using the helper function
  await runTest('ConfigValidator initialization', () => {
    return validator && validator.presets && validator.schemas;
  });

  await runTest('Built-in presets loaded', () => {
    const presets = validator.getAllPresets();
    return (
      presets.size === 6 &&
      presets.has('text-simple') &&
      presets.has('chart-basic') &&
      presets.has('status-indicator')
    );
  });

  await runTest('Built-in schemas loaded', () => {
    return validator.schemas.has('text') && validator.schemas.has('chart');
  });

  await runTest('Get preset by name', () => {
    const preset = validator.getPreset('text-fancy');
    return preset && preset.fontSize === 'large' && preset.shadow === true;
  });

  await runTest('Create config from preset', () => {
    const config = validator.createFromPreset('text-simple', {
      text: 'HELLO',
      position: [10, 20],
    });
    return (
      config &&
      config.text === 'HELLO' &&
      config.position[0] === 10 &&
      config.color[0] === 255
    ); // default from preset
  });

  await runTest('Preset not found error', () => {
    const config = validator.createFromPreset('nonexistent-preset');
    const errors = validator.getErrors();
    return (
      config === null && errors.length > 0 && errors[0].includes('not found')
    );
  });

  await runTest('Text schema validation - valid', () => {
    const validConfig = {
      text: 'Test',
      position: [10, 20],
      color: [255, 0, 0, 255],
      alignment: 'center',
    };
    return (
      validator.validate(validConfig, 'text') &&
      validator.getErrors().length === 0
    );
  });

  await runTest('Text schema validation - missing required', () => {
    const invalidConfig = {
      position: [10, 20], // missing 'text'
      color: [255, 0, 0, 255],
    };
    return (
      !validator.validate(invalidConfig, 'text') &&
      validator.getErrors().length > 0
    );
  });

  await runTest('Text schema validation - invalid types', () => {
    const invalidConfig = {
      text: 'Test',
      position: 'invalid', // should be array
      color: [255, 0, 0, 255],
    };
    return (
      !validator.validate(invalidConfig, 'text') &&
      validator.getErrors().length > 0
    );
  });

  await runTest('Chart schema validation - valid', () => {
    const validConfig = {
      width: 64,
      height: 32,
      data: [1, 2, 3],
      backgroundColor: [0, 0, 0, 255],
    };
    return (
      validator.validate(validConfig, 'chart') &&
      validator.getErrors().length === 0
    );
  });

  await runTest('Chart schema validation - out of range', () => {
    const invalidConfig = {
      width: 100, // too big for 64px display
      height: 32,
      data: [1, 2, 3],
    };
    return (
      !validator.validate(invalidConfig, 'chart') &&
      validator.getErrors().length > 0
    );
  });

  await runTest('Validated config creation - success', () => {
    const config = validator.createValidatedConfig(
      'text-simple',
      { text: 'Valid', position: [32, 20] },
      'text',
    );
    return (
      config !== null &&
      config.text === 'Valid' &&
      validator.getErrors().length === 0
    );
  });

  await runTest('Validated config creation - validation failure', () => {
    const config = validator.createValidatedConfig(
      'text-simple',
      { position: [32, 20] }, // missing text
      'text',
    );
    return config === null && validator.getErrors().length > 0;
  });

  await runTest('Add custom preset', () => {
    const success = validator.addPreset('custom-text', {
      text: 'Custom',
      color: [100, 100, 100, 255],
    });
    const preset = validator.getPreset('custom-text');
    return success && preset && preset.text === 'Custom';
  });

  await runTest('Add custom schema', () => {
    const success = validator.addSchema('custom', {
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
      required: ['value'],
    });
    const validConfig = { value: 'test' };
    return success && validator.validate(validConfig, 'custom');
  });

  await runTest('Error string formatting', () => {
    validator.createFromPreset('nonexistent');
    const errorString = validator.getErrorString();
    return typeof errorString === 'string' && errorString.length > 0;
  });

  await runTest('Demo scene loads', () => {
    const sceneModule = require('../scenes/examples/config-validator-demo.js');
    return (
      sceneModule.name === 'config_validator_demo' &&
      typeof sceneModule.render === 'function' &&
      typeof sceneModule.init === 'function'
    );
  });

  // Summary
  console.log(`\n📊 Test Results: ${passCount}/${testCount} passed`);

  if (passCount === testCount) {
    console.log(
      '🎉 All Configuration Validator tests passed! CFG-204 is ready.',
    );
    return true;
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run tests
if (require.main === module) {
  testConfigValidator().catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testConfigValidator };
