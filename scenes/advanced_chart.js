/**
 * @fileoverview Advanced Chart Scene - Professional data visualization
 * @description Demonstrates the advanced chart rendering capabilities extracted from legacy Node-RED code.
 * Shows sophisticated chart features like negative values, overflow handling, and gradient rendering.
 * Only available when PIXOO_ENABLE_ADVANCED_CHART=true
 * @version 1.0.0
 * @author: Sonic + Cursor + Markus Barta (mba)
 * @license MIT
 */

// MQTT Commands:
// {"scene":"advanced_chart","mode":"demo","dataType":"power","updateInterval":2000,"scale":5}       - Power price demo
// {"scene":"advanced_chart","mode":"demo","dataType":"temperature","updateInterval":2000,"scale":1}  - Temperature demo
// {"scene":"advanced_chart","mode":"demo","dataType":"random","updateInterval":2000,"scale":2}        - Random data demo
// {"scene":"advanced_chart","dataType":"power","scale":10}                                           - High scale power demo

'use strict';

const SCENE_NAME = 'advanced_chart';

/**
 * Advanced Chart Scene - Professional data visualization
 * @param {Object} ctx - Render context
 * @returns {Promise<void>}
 */
async function render(ctx) {
    const { device, state, getState, setState } = ctx;
    const deviceAdapter = require('../lib/device-adapter');
    const ADVANCED_FEATURES = deviceAdapter.ADVANCED_FEATURES || {
        GRADIENT_RENDERING: false,
        ADVANCED_CHART: false,
        ENHANCED_TEXT: false,
        IMAGE_PROCESSING: false,
        ANIMATIONS: false,
        PERFORMANCE_MONITORING: true
    };

    // Check if advanced chart is enabled
    if (!ADVANCED_FEATURES.ADVANCED_CHART) {
        // Fallback to simple message if feature not enabled
        await device.clear();

        const message = [
            "Advanced Chart",
            "Not Enabled",
            "",
            "Set env var:",
            "PIXOO_ENABLE_ADVANCED_CHART=true"
        ];

        for (let i = 0; i < message.length; i++) {
            await device.drawTextRgbaAligned(
                message[i],
                [32, 10 + i * 8],
                [255, 255, 255, 255],
                "center"
            );
        }

        await device.push(SCENE_NAME);
        return;
    }

    // Initialize advanced chart renderer
    const { createAdvancedChartRenderer } = require('../lib/advanced-chart');
    const chartRenderer = createAdvancedChartRenderer(device);

    // Configuration
    const config = {
        mode: state.mode || 'demo',
        dataType: state.dataType || 'power', // 'power', 'temperature', 'random'
        updateInterval: state.updateInterval || 2000,
        scale: state.scale || 5
    };

    // Generate demo data based on configuration
    const demoData = generateDemoData(config);

    // Render the chart
    const result = await chartRenderer.renderPowerChart(demoData, {
        scale: config.scale,
        maxHeight: 30
    });

    // Add chart title and info
    const title = `${config.dataType.toUpperCase()} CHART`;
    await device.drawTextRgbaAligned(title, [32, 2], [255, 255, 255, 255], "center");

    // Add statistics
    if (result.success && result.metadata) {
        const stats = result.metadata.statistics;
        const statsText = `MIN:${Math.round(stats.min)} MAX:${Math.round(stats.max)} AVG:${Math.round(stats.avg)}`;
        await device.drawTextRgbaAligned(statsText, [32, 58], [128, 128, 128, 255], "center");
    }

    // Push the rendered frame
    await device.push(SCENE_NAME);

    // Log performance
    if (result.success) {
        console.log(`📊 [ADVANCED CHART] Rendered ${result.dataPoints} points in ${result.renderTime}ms`);
    } else {
        console.error(`❌ [ADVANCED CHART] Render failed: ${result.error}`);
    }
}

/**
 * Generates demo data for the advanced chart
 * @param {Object} config - Chart configuration
 * @returns {number[]} Array of demo data points
 */
function generateDemoData(config) {
    const dataPoints = 32; // Number of data points to generate
    const data = [];

    switch (config.dataType) {
        case 'power':
            // Generate power price data with some negative values
            for (let i = 0; i < dataPoints; i++) {
                let price = 15 + Math.sin(i * 0.3) * 8 + Math.random() * 5;
                // Add some negative prices occasionally
                if (Math.random() < 0.1) price = -Math.abs(price) * 0.3;
                data.push(Math.round(price * 100) / 100);
            }
            break;

        case 'temperature':
            // Generate temperature data around 20°C
            for (let i = 0; i < dataPoints; i++) {
                const temp = 20 + Math.sin(i * 0.2) * 5 + (Math.random() - 0.5) * 2;
                data.push(Math.round(temp * 10) / 10);
            }
            break;

        case 'random':
        default:
            // Generate random data with some extreme values
            for (let i = 0; i < dataPoints; i++) {
                let value = (Math.random() - 0.5) * 100;
                // Occasionally add extreme values
                if (Math.random() < 0.05) {
                    value = Math.random() > 0.5 ? 200 : -50;
                }
                data.push(Math.round(value * 100) / 100);
            }
            break;
    }

    return data;
}

module.exports = { name: SCENE_NAME, render };
