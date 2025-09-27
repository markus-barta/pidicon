/**
 * @fileoverview Framework Data Scene Demo
 * @description Demonstrates the DataScene base class with simulated sensor data
 * @version 1.0.0
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

'use strict';

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^(render|init|cleanup)$" }] */

const { DataScene } = require('../../lib/scene-framework');

const name = 'framework_data_demo';

/**
 * Simulated sensor dashboard using the framework
 */
class SensorDashboardScene extends DataScene {
  constructor(options = {}) {
    super({
      name: 'sensor_dashboard',
      config: {
        debug: false,
        updateInterval: 3000, // Update every 3 seconds
        temperatureUnit: 'C',
        ...options.config,
      },
    });
  }

  async fetchData(/* context */) {
    // Simulate fetching sensor data
    // In a real implementation, this would fetch from MQTT, APIs, etc.

    // Simulate some variation
    const baseTemp = 22;
    const tempVariation = Math.sin(Date.now() / 10000) * 3; // Slow sine wave
    const temperature = baseTemp + tempVariation + (Math.random() - 0.5) * 2;

    const humidity =
      45 + Math.sin(Date.now() / 15000) * 10 + (Math.random() - 0.5) * 5;
    const pressure =
      1013 + Math.sin(Date.now() / 20000) * 5 + (Math.random() - 0.5) * 2;

    // Simulate device statuses
    const devices = [
      {
        name: 'Thermostat',
        status: Math.random() > 0.1 ? 'online' : 'offline',
      },
      { name: 'Sensor1', status: Math.random() > 0.05 ? 'online' : 'offline' },
      { name: 'Sensor2', status: Math.random() > 0.08 ? 'online' : 'offline' },
      { name: 'Gateway', status: Math.random() > 0.02 ? 'online' : 'offline' },
    ];

    const onlineCount = devices.filter((d) => d.status === 'online').length;

    return {
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      pressure: Math.round(pressure * 10) / 10,
      devices,
      onlineCount,
      totalDevices: devices.length,
      timestamp: Date.now(),
    };
  }

  async renderFrame(context) {
    const { device, frameCount, elapsedSeconds } = context;
    const data = this.getCurrentData(context);
    const { temperatureUnit } = this.config;

    // Clear screen with dark background
    await device.clear();
    await device.fillRect([0, 0], [64, 64], [15, 15, 35, 255]);

    // Title
    await device.drawText(
      'Sensor Dashboard',
      [32, 2],
      [255, 255, 255, 255],
      'center',
    );

    // Temperature display
    const tempColor =
      data.temperature > 25
        ? [255, 100, 100, 255]
        : data.temperature < 18
          ? [100, 100, 255, 255]
          : [100, 255, 100, 255];

    await device.drawText(
      `${data.temperature}°${temperatureUnit}`,
      [32, 12],
      tempColor,
      'center',
    );

    // Humidity and pressure
    await device.drawText(
      `H:${data.humidity}%`,
      [8, 22],
      [200, 200, 255, 255],
      'left',
    );
    await device.drawText(
      `P:${data.pressure}`,
      [8, 30],
      [255, 200, 200, 255],
      'left',
    );

    // Device status
    const statusColor =
      data.onlineCount === data.totalDevices
        ? [0, 255, 0, 255]
        : data.onlineCount > data.totalDevices * 0.5
          ? [255, 255, 0, 255]
          : [255, 0, 0, 255];

    await device.drawText(
      `${data.onlineCount}/${data.totalDevices}`,
      [56, 22],
      statusColor,
      'right',
    );
    await device.drawText('Devices', [56, 30], [200, 200, 200, 255], 'right');

    // Status indicator
    const indicatorSize = 3;
    const indicatorX = 32 - indicatorSize / 2;
    const indicatorY = 38;

    await device.fillRect(
      [indicatorX, indicatorY],
      [indicatorSize, indicatorSize],
      statusColor,
    );

    // Animated pulse effect for the indicator
    const pulse = Math.sin(elapsedSeconds * 2) * 0.5 + 0.5;
    const pulseSize = Math.round(indicatorSize + pulse * 2);
    const pulseAlpha = Math.round(100 + pulse * 50);

    await device.fillRect(
      [
        indicatorX - (pulseSize - indicatorSize) / 2,
        indicatorY - (pulseSize - indicatorSize) / 2,
      ],
      [pulseSize, pulseSize],
      [...statusColor.slice(0, 3), pulseAlpha],
    );

    // Framework info
    await device.drawText(
      'Framework Demo',
      [32, 50],
      [150, 150, 150, 255],
      'center',
    );
    await device.drawText(
      `Frame: ${frameCount}`,
      [32, 58],
      [120, 120, 120, 255],
      'center',
    );

    // Data freshness indicator (small dot that changes color based on data age)
    const dataAge = Date.now() - (data.timestamp || 0);
    const freshnessColor =
      dataAge < 1000
        ? [0, 255, 0, 255]
        : dataAge < 5000
          ? [255, 255, 0, 255]
          : [255, 0, 0, 255];

    await device.fillRect([2, 2], [2, 2], freshnessColor);
  }
}

// Create and export the scene instance
const scene = new SensorDashboardScene();

// Export in the standard scene format
const init = (context) => scene.init(context);
const render = (context) => scene.render(context);
const cleanup = (context) => scene.cleanup(context);
const wantsLoop = true;

module.exports = { name, render, init, cleanup, wantsLoop };
