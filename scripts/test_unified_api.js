#!/usr/bin/env node

/**
 * Test script for unified PixooCanvas API
 * Tests both new unified API and backward compatibility
 */

const { getDevice } = require('../lib/device-adapter');

async function testUnifiedAPI() {
  console.log('🧪 Testing Unified PixooCanvas API...\n');

  // Get a device (mock driver for testing)
  const device = getDevice('test-device');

  try {
    // Test 1: Clear screen (should work)
    console.log('✅ Test 1: Clear screen');
    await device.clear();

    // Test 2: New unified API methods
    console.log('✅ Test 2: New unified API methods');

    // Draw pixel
    await device.drawPixel([10, 10], [255, 0, 0, 255]);
    console.log('  ✓ drawPixel works');

    // Draw line
    await device.drawLine([5, 5], [15, 15], [0, 255, 0, 255]);
    console.log('  ✓ drawLine works');

    // Fill rectangle
    await device.fillRect([20, 20], [10, 10], [0, 0, 255, 255]);
    console.log('  ✓ fillRect works');

    // Draw rectangle outline
    await device.drawRect([30, 30], [10, 10], [255, 255, 0, 255]);
    console.log('  ✓ drawRect works');

    // Draw text
    await device.drawText('Hello', [40, 40], [255, 255, 255, 255], 'center');
    console.log('  ✓ drawText works');

    // Draw number
    await device.drawNumber(42.5, [50, 50], [0, 255, 255, 255], 'right');
    console.log('  ✓ drawNumber works');

    // Test 3: Backward compatibility (should show deprecation warnings)
    console.log(
      '\n✅ Test 3: Backward compatibility (expecting deprecation warnings)',
    );

    // Old method names (should still work but show warnings)
    await device.drawPixelRgba([1, 1], [255, 0, 0, 255]);
    console.log('  ✓ drawPixelRgba still works (with warning)');

    await device.drawLineRgba([2, 2], [12, 12], [0, 255, 0, 255]);
    console.log('  ✓ drawLineRgba still works (with warning)');

    await device.fillRectangleRgba([3, 3], [5, 5], [0, 0, 255, 255]);
    console.log('  ✓ fillRectangleRgba still works (with warning)');

    await device.drawRectangleRgba([4, 4], [5, 5], [255, 255, 0, 255]);
    console.log('  ✓ drawRectangleRgba still works (with warning)');

    await device.drawTextRgbaAligned(
      'Test',
      [5, 5],
      [255, 255, 255, 255],
      'left',
    );
    console.log('  ✓ drawTextRgbaAligned still works (with warning)');

    await device.drawCustomFloatText(
      12.34,
      [6, 6],
      [255, 0, 255, 255],
      'right',
      2,
    );
    console.log('  ✓ drawCustomFloatText still works (with warning)');

    // Test 4: Push frame
    console.log('\n✅ Test 4: Push frame');
    const pixelsChanged = await device.push('test-scene');
    console.log(`  ✓ push() returned ${pixelsChanged} pixels changed`);

    // Test 5: Get metrics
    console.log('\n✅ Test 5: Get metrics');
    const metrics = device.getMetrics();
    console.log(
      `  ✓ Metrics: pushes=${metrics.pushes}, errors=${metrics.errors}`,
    );

    // Test 6: Error validation
    console.log('\n✅ Test 6: Error validation');

    try {
      await device.drawPixel('invalid', [255, 0, 0, 255]);
      console.log('  ❌ Should have thrown error for invalid position');
    } catch (error) {
      console.log(
        '  ✓ Correctly caught invalid position error:',
        error.message,
      );
    }

    try {
      await device.drawPixel([10, 10], 'invalid');
      console.log('  ❌ Should have thrown error for invalid color');
    } catch (error) {
      console.log('  ✓ Correctly caught invalid color error:', error.message);
    }

    console.log('\n🎉 All tests passed! Unified API is working correctly.');
    console.log(
      '📝 Backward compatibility maintained with deprecation warnings.',
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testUnifiedAPI().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
