/**
 * @fileoverview Graphics Engine Test Script
 * @description Comprehensive tests for GFX-203 Graphics Engine implementation
 * Tests text effects, fade transitions, gradients, and animations
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

// const logger = require('../lib/logger'); // Not needed for unit tests
const GraphicsEngine = require('../lib/graphics-engine');

// Mock device for testing
class MockDevice {
  constructor() {
    this.host = 'test-device';
    this.drawCalls = [];
    this.clearCalls = [];
  }

  async drawText(text, position, color, alignment) {
    this.drawCalls.push({
      type: 'text',
      text,
      position: [...position],
      color: [...color],
      alignment,
    });
  }

  async drawPixel(position, color) {
    this.drawCalls.push({
      type: 'pixel',
      position: [...position],
      color: [...color],
    });
  }

  async fillRect(position, size, color) {
    this.drawCalls.push({
      type: 'rect',
      position: [...position],
      size: [...size],
      color: [...color],
    });
  }

  async clear() {
    this.clearCalls.push('clear');
  }

  reset() {
    this.drawCalls = [];
    this.clearCalls = [];
  }
}

async function testGraphicsEngine() {
  console.log('🧪 Testing Graphics Engine (GFX-203)\n');

  const mockDevice = new MockDevice();
  const graphics = new GraphicsEngine(mockDevice);

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
  await runTest(
    'GraphicsEngine initialization',
    () => graphics.device === mockDevice && graphics.host === 'test-device',
  );

  await runTest('Text shadow effect', async () => {
    mockDevice.reset();
    await graphics.drawTextEnhanced('TEST', [10, 10], [255, 255, 255, 255], {
      effects: { shadow: true },
    });

    const shadowCalls = mockDevice.drawCalls.filter(
      (call) =>
        call.type === 'text' &&
        call.text === 'TEST' &&
        call.position[0] === 11 &&
        call.position[1] === 11,
    );

    return shadowCalls.length > 0;
  });

  await runTest('Text outline effect', async () => {
    mockDevice.reset();
    await graphics.drawTextEnhanced('TEST', [10, 10], [255, 255, 255, 255], {
      effects: { outline: true, outlineWidth: 1 },
    });

    // Should have multiple text calls for outline (main text + outline pixels)
    const textCalls = mockDevice.drawCalls.filter(
      (call) => call.type === 'text',
    );
    return textCalls.length > 1; // At least main text + some outline
  });

  await runTest('Text gradient effect', async () => {
    mockDevice.reset();
    await graphics.drawTextEnhanced('TEST', [10, 10], [255, 0, 0, 255], {
      effects: { gradient: true },
    });

    const textCalls = mockDevice.drawCalls.filter(
      (call) => call.type === 'text',
    );
    return textCalls.length >= 3; // Should have multiple gradient layers
  });

  await runTest('Fade transition start', () => {
    graphics.startFadeTransition(1000, 0, 1);
    return graphics.isFadeActive() && graphics.fadeState.currentOpacity === 0;
  });

  await runTest('Fade transition update', () => {
    const opacity = graphics.updateFadeTransition();
    return typeof opacity === 'number' && opacity >= 0 && opacity <= 1;
  });

  await runTest('Gradient background', async () => {
    mockDevice.reset();
    await graphics.drawGradientBackground(
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      'vertical',
    );

    const rectCalls = mockDevice.drawCalls.filter(
      (call) => call.type === 'rect',
    );
    return rectCalls.length > 0;
  });

  await runTest('Animation easing functions', () => {
    const linear = graphics.ease(0.5, 'linear');
    const easeIn = graphics.ease(0.5, 'easeIn');
    const easeOut = graphics.ease(0.5, 'easeOut');
    const bounce = graphics.ease(0.5, 'bounce');

    return (
      linear === 0.5 &&
      easeIn < 0.5 &&
      easeOut > 0.5 &&
      typeof bounce === 'number'
    );
  });

  await runTest('Value animation', async () => {
    let animatedValue = 0;
    const stopAnimation = graphics.animateValue(
      0,
      100,
      1000,
      'linear',
      (value) => {
        animatedValue = value;
      },
      () => {
        /* complete */
      },
    );

    // Simulate some animation frames
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    stopAnimation(); // Stop the animation

    return typeof animatedValue === 'number';
  });

  await runTest('Resource preloading', async () => {
    await graphics.preloadResources(['test1.png', 'test2.png']);
    return graphics.resourceCache.size === 2;
  });

  await runTest('Performance statistics', () => {
    const stats = graphics.getPerformanceStats();
    return (
      typeof stats === 'object' &&
      'frameCount' in stats &&
      'fadeActive' in stats &&
      'cacheSize' in stats
    );
  });

  await runTest('Clean shutdown', () => {
    graphics.shutdown();
    return graphics.resourceCache.size === 0 && !graphics.isFadeActive();
  });

  await runTest('Graphics Engine Demo scene', () => {
    const sceneModule = require('../scenes/examples/graphics-engine-demo.js');

    return (
      sceneModule.name === 'graphics_engine_demo' &&
      typeof sceneModule.init === 'function' &&
      typeof sceneModule.render === 'function'
    );
  });

  // Summary
  console.log(`\n📊 Test Results: ${passCount}/${testCount} passed`);

  if (passCount === testCount) {
    console.log('🎉 All Graphics Engine tests passed! GFX-203 is ready.');
    return true;
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run tests
if (require.main === module) {
  testGraphicsEngine().catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testGraphicsEngine };
