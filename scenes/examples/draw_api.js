/**
 * @fileoverview Draw API Example
 * @description A simple example scene to test the draw API. This scene provides a
 * playground for testing the various drawing commands available in the Pixoo API.
 * It is intended for development and debugging purposes.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api"}'
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const logger = require('../../lib/logger');
const { validateSceneContext } = require('../../lib/performance-utils');

const name = 'draw_api';

function init() {
  // Initialize test draw API scene - nothing special needed
  logger.debug(`🚀 [TEST_DRAW_API] Scene initialized`);
}

async function render(ctx) {
  // Validate scene context
  if (!validateSceneContext(ctx, name)) {
    return;
  }

  const { device, state } = ctx;
  const testType = state.test || 'all'; // "all", "pixels", "rectangles", "lines", "text", "gradients"

  await device.clear();

  logger.debug(`🧪 [API TEST] Running test: ${testType}`);

  switch (testType) {
    case 'pixels':
      await testPixels(device);
      break;
    case 'rectangles':
      await testRectangles(device);
      break;
    case 'lines':
      await testLines(device);
      break;
    case 'text':
      await testText(device);
      break;
    case 'gradients':
      await testGradients(device);
      break;
    default:
      await testAll(device);
      break;
  }

  // Push the rendered frame to the device
  await device.push(name);
}

async function testPixels(device) {
  // Test individual pixel drawing
  logger.debug(`📍 [PIXEL TEST] Drawing individual pixels`);

  // Color gradient test
  for (let x = 0; x < 64; x++) {
    for (let y = 0; y < 64; y++) {
      const r = Math.round((x / 63) * 255);
      const g = Math.round((y / 63) * 255);
      const b = 128;
      await device.drawPixelRgba([x, y], [r, g, b, 255]);
    }
  }

  await device.drawTextRgbaAligned(
    'PIXEL TEST',
    [16, 30],
    [255, 255, 255, 255],
    'center',
  );
}

async function testRectangles(device) {
  // Test rectangle drawing functions
  logger.debug(`⬜ [RECTANGLE TEST] Drawing rectangles`);

  // Filled rectangles in different colors
  await device.fillRectangleRgba([5, 5], [20, 20], [255, 0, 0, 255]); // Red
  await device.fillRectangleRgba([30, 5], [20, 20], [0, 255, 0, 255]); // Green
  await device.fillRectangleRgba([5, 30], [20, 20], [0, 0, 255, 255]); // Blue
  await device.fillRectangleRgba([30, 30], [20, 20], [255, 255, 0, 255]); // Yellow

  // Outline rectangles
  await device.drawRectangleRgba([45, 5], [15, 15], [255, 255, 255, 255]);
  await device.drawRectangleRgba([45, 25], [15, 15], [255, 0, 255, 255]);
  await device.drawRectangleRgba([45, 45], [15, 15], [0, 255, 255, 255]);

  await device.drawTextRgbaAligned(
    'RECTANGLES',
    [16, 55],
    [255, 255, 255, 255],
    'center',
  );
}

async function testLines(device) {
  // Test line drawing
  logger.debug(`📏 [LINE TEST] Drawing lines`);

  // Horizontal lines
  for (let y = 10; y <= 50; y += 10) {
    const color = [Math.round((y / 50) * 255), 128, 255, 255];
    await device.drawLineRgba([5, y], [58, y], color);
  }

  // Vertical lines
  for (let x = 10; x <= 50; x += 10) {
    const color = [255, Math.round((x / 50) * 255), 128, 255];
    await device.drawLineRgba([x, 5], [x, 58], color);
  }

  // Diagonal lines
  await device.drawLineRgba([5, 5], [58, 58], [255, 0, 0, 255]); // Red diagonal
  await device.drawLineRgba([58, 5], [5, 58], [0, 255, 0, 255]); // Green diagonal

  await device.drawTextRgbaAligned(
    'LINES',
    [32, 30],
    [255, 255, 255, 255],
    'center',
  );
}

async function testText(device) {
  // Test text rendering
  logger.debug(`📝 [TEXT TEST] Drawing text`);

  // Test different alignments
  await device.drawTextRgbaAligned(
    'LEFT',
    [0, 5],
    [255, 255, 255, 255],
    'left',
  );
  await device.drawTextRgbaAligned(
    'CENTER',
    [32, 15],
    [255, 255, 255, 255],
    'center',
  );
  await device.drawTextRgbaAligned(
    'RIGHT',
    [63, 25],
    [255, 255, 255, 255],
    'right',
  );

  // Test different colors
  await device.drawTextRgbaAligned('RED', [5, 35], [255, 0, 0, 255], 'left');
  await device.drawTextRgbaAligned('GREEN', [5, 43], [0, 255, 0, 255], 'left');
  await device.drawTextRgbaAligned('BLUE', [5, 51], [0, 0, 255, 255], 'left');

  // Test alpha
  await device.drawTextRgbaAligned(
    '50% ALPHA',
    [20, 35],
    [255, 255, 255, 127],
    'center',
  );
  await device.drawTextRgbaAligned(
    '100% ALPHA',
    [20, 43],
    [255, 255, 255, 255],
    'center',
  );

  await device.drawTextRgbaAligned(
    'TEXT TEST',
    [16, 59],
    [255, 255, 0, 255],
    'center',
  );
}

async function testGradients(device) {
  // Test gradient-like effects using pixels
  logger.debug(`🌈 [GRADIENT TEST] Creating gradients`);

  // Horizontal gradient (left to right)
  for (let x = 0; x < 64; x++) {
    const r = Math.round((x / 63) * 255);
    const g = 255 - r;
    const b = 128;
    for (let y = 0; y < 20; y++) {
      await device.drawPixelRgba([x, y], [r, g, b, 255]);
    }
  }

  // Vertical gradient (top to bottom)
  for (let y = 25; y < 45; y++) {
    const r = 128;
    const g = Math.round(((y - 25) / 19) * 255);
    const b = 255 - g;
    for (let x = 0; x < 64; x++) {
      await device.drawPixelRgba([x, y], [r, g, b, 255]);
    }
  }

  // Circular gradient effect
  const centerX = 32;
  const centerY = 55;
  for (let x = 0; x < 64; x++) {
    for (let y = 50; y < 64; y++) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const intensity = Math.max(0, 1 - distance / 15);
      const color = Math.round(intensity * 255);
      await device.drawPixelRgba([x, y], [color, color, color, 255]);
    }
  }

  await device.drawTextRgbaAligned(
    'GRADIENTS',
    [16, 2],
    [0, 0, 0, 255],
    'center',
  );
}

async function testAll(device) {
  // Comprehensive test of all API functions
  logger.debug(`🎯 [FULL API TEST] Testing all drawing functions`);

  // Section 1: Basic shapes (top-left)
  await device.fillRectangleRgba([2, 2], [15, 15], [255, 0, 0, 255]); // Red square
  await device.drawRectangleRgba([20, 2], [15, 15], [0, 255, 0, 255]); // Green outline
  await device.drawLineRgba([38, 2], [50, 16], [0, 0, 255, 255]); // Blue line

  // Section 2: Text rendering (top-right)
  await device.drawTextRgbaAligned(
    'API',
    [35, 5],
    [255, 255, 255, 255],
    'left',
  );
  await device.drawTextRgbaAligned(
    'TEST',
    [35, 13],
    [255, 255, 0, 255],
    'left',
  );

  // Section 3: Pixel patterns (middle)
  for (let x = 2; x < 30; x += 3) {
    for (let y = 20; y < 35; y += 3) {
      const color = [(x * 8) % 255, (y * 8) % 255, 128, 255];
      await device.drawPixelRgba([x, y], color);
    }
  }

  // Section 4: Gradient strip (bottom)
  for (let x = 0; x < 64; x++) {
    const intensity = Math.round((x / 63) * 255);
    for (let y = 40; y < 50; y++) {
      await device.drawPixelRgba(
        [x, y],
        [intensity, 255 - intensity, 128, 255],
      );
    }
  }

  // Section 5: Alpha test (bottom-right)
  await device.fillRectangleRgba([45, 52], [10, 10], [255, 255, 255, 64]); // 25% white
  await device.fillRectangleRgba([57, 52], [5, 5], [255, 0, 0, 127]); // 50% red

  await device.drawTextRgbaAligned(
    'FULL API TEST',
    [16, 59],
    [255, 255, 255, 255],
    'center',
  );
}

async function cleanup() {
  // Cleanup test draw API scene - nothing special needed
  logger.debug(`🧹 [TEST_DRAW_API] Scene cleaned up`);
}

const wantsLoop = false;
module.exports = { name, render, init, cleanup, wantsLoop };
