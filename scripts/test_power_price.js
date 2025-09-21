#!/usr/bin/env node

/**
 * Test script for the power_price scene
 * Tests the migrated functionality from Node-RED
 */

const logger = require('../lib/logger');
const { RealPixoo } = require('../lib/pixoo-http');

async function testPowerPrice() {
  const device = new RealPixoo('192.168.1.159'); // Update with your device IP

  try {
    await device.clear();

    // Create test context
    const context = {
      device,
      state: new Map(), // Required for validation
      publishOk: () => {}, // Required for device.push
      payload: {
        // Test data - normally would come from MQTT
        powerPriceData: {
          data: {
            '2025-09-21-12': { currentCentPrice: 15.5 },
            '2025-09-21-13': { currentCentPrice: 18.2 },
            '2025-09-21-14': { currentCentPrice: 22.0 }, // Current hour
            '2025-09-21-15': { currentCentPrice: 25.5 }, // Overflow
            '2025-09-21-16': { currentCentPrice: -2.5 }, // Negative
            '2025-09-21-17': { currentCentPrice: 0.001 }, // Zero
            '2025-09-21-18': { currentCentPrice: 12.0 },
          },
        },
        currentCentPrice: 22.0,
        dailyPvDataActual: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
        pvHourlyYieldPrediction: [
          150, 250, 350, 450, 550, 650, 750, 850, 950, 1050,
        ],
        batteryStatus: {
          USOC: 75,
          BatteryCharging: true,
          BatteryDischarging: false,
        },
        uviData: {
          currentUvi: [null, 5, 7], // Current: 5, Next: 7
        },
        enableAnimation: true,
        frames: null, // Run continuously
      },
      getState: (key, defaultValue) => defaultValue,
      setState: () => {},
      env: {},
      loopDriven: true,
    };

    // Load and run the scene
    const powerPriceScene = require('../scenes/power_price');

    logger.ok('Testing power_price scene...');

    // Run a few frames
    for (let i = 0; i < 5; i++) {
      const delay = await powerPriceScene.render(context);

      if (delay === null) {
        logger.ok('Scene completed');
        break;
      }

      logger.info(`Frame ${i + 1} rendered, next delay: ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    logger.ok('Test completed!');
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run the test
testPowerPrice().catch(console.error);
