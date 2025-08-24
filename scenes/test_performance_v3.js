/**
 * @fileoverview Performance Test V3 - Professional-grade adaptive timing test
 * @description Advanced performance testing scene with real-time metrics, adaptive timing,
 * and professional-grade architecture for the Pixoo device ecosystem.
 * @version 3.0.0
 * @author Senior Development Team
 * @license MIT
 */

'use strict';

const SCENE_NAME = 'test_performance_v3';

/**
 * Professional-grade configuration with comprehensive documentation
 * @typedef {Object} ChartConfiguration
 * @property {number} START_Y - Y-coordinate where chart rendering begins
 * @property {number} RANGE_HEIGHT - Vertical height of the performance chart
 * @property {number} MIN_FRAMETIME - Minimum frametime value for scaling (ms)
 * @property {number} MAX_FRAMETIME - Maximum frametime value for scaling (ms)
 * @property {number[]} AXIS_COLOR - RGBA color for chart axes [r,g,b,a]
 * @property {number} CHART_START_X - X-coordinate where chart data begins
 * @property {number} MAX_CHART_POINTS - Maximum number of data points to retain
 * @property {number} MAX_FRAME_SAMPLES - Maximum number of frame time samples
 * @property {number} UPDATE_INTERVAL_MS - Chart update interval in milliseconds
 * @property {number} LOOP_DURATION_DEFAULT - Default loop duration in milliseconds
 * @property {number} TEST_TIMEOUT_MS - Maximum test duration before auto-termination
 */
const CHART_CONFIG = Object.freeze({
    // Chart Layout
    START_Y: 50,
    RANGE_HEIGHT: 20,
    CHART_START_X: 1,

    // Performance Scaling
    MIN_FRAMETIME: 1,
    MAX_FRAMETIME: 500,

    // Visual Configuration
    AXIS_COLOR: [64, 64, 64, 191],
    TEXT_COLOR_HEADER: [255, 255, 255, 255],
    TEXT_COLOR_STATS: [128, 128, 128, 255],
    TEXT_COLOR_COMPLETE: [255, 255, 255, 127],
    BG_COLOR: [0, 0, 0, 255],

    // Performance Limits
    MAX_CHART_POINTS: 64,
    MAX_FRAME_SAMPLES: 50,
    UPDATE_INTERVAL_MS: 100,

    // Timing Configuration
    LOOP_DURATION_DEFAULT: 300000, // 5 minutes
    TEST_TIMEOUT_MS: 60000, // 1 minute max
    MQTT_TIMEOUT_MS: 5000,
    MIN_DELAY_MS: 50,
    MAX_DELAY_MS: 2000
});

/**
 * Test mode enumeration for type safety
 * @readonly
 * @enum {string}
 */
const TEST_MODES = Object.freeze({
    CONTINUOUS: 'continuous',
    BURST: 'burst',
    LOOP: 'loop',
    SWEEP: 'sweep'
});

/**
 * Error types for better error handling
 * @readonly
 * @enum {string}
 */
const ERROR_TYPES = Object.freeze({
    RENDER_ERROR: 'RENDER_ERROR',
    MQTT_ERROR: 'MQTT_ERROR',
    STATE_ERROR: 'STATE_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR'
});

/**
 * Performance color cache for optimal rendering
 * @type {Map<number, number[]>}
 */
const COLOR_CACHE = new Map();

/**
 * Calculates performance-based colors with intelligent caching
 * @param {number} frametime - Frame time in milliseconds
 * @returns {number[]} RGBA color array [r, g, b, a]
 * @throws {Error} If frametime is invalid
 */
function getPerformanceColor(frametime) {
    if (typeof frametime !== 'number' || frametime < 0) {
        throw new Error(`Invalid frametime: ${frametime}`);
    }

    const cacheKey = Math.round(frametime);
    let color = COLOR_CACHE.get(cacheKey);

    if (color) {
        return color;
    }

    const normalized = Math.min(CHART_CONFIG.MAX_FRAMETIME,
        Math.max(CHART_CONFIG.MIN_FRAMETIME, frametime));
    const ratio = (normalized - CHART_CONFIG.MIN_FRAMETIME) /
        (CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);

    // Optimized color gradient calculation with pre-computed values
    if (ratio < 0.25) {
        const blend = ratio * 4;
        color = [0, Math.round(255 * blend), Math.round(255 * (1 - blend)), 191];
    } else if (ratio < 0.5) {
        const blend = (ratio - 0.25) * 4;
        color = [Math.round(255 * blend), 255, 0, 191];
    } else if (ratio < 0.75) {
        const blend = (ratio - 0.5) * 4;
        color = [255, Math.round(255 * (1 - blend * 0.35)), 0, 191];
    } else {
        const blend = (ratio - 0.75) * 4;
        color = [255, Math.round(165 * (1 - blend)), 0, 191];
    }

    COLOR_CACHE.set(cacheKey, color);
    return color;
}
/**
 * Professional State Manager for performance test
 * @class
 */
class PerformanceTestState {
    /**
     * @param {Function} getState - State getter function
     * @param {Function} setState - State setter function
     */
    constructor(getState, setState) {
        this.getState = getState;
        this.setState = setState;
    }

    /**
     * Checks if this is a fresh test start
     * @param {Object} state - Current state object
     * @returns {boolean} True if fresh start
     */
    isFreshStart(state) {
        const startTime = this.getState("startTime");
        const isNewMessage = !state._isLoopContinuation && !state._isContinuation;
        return !startTime || isNewMessage;
    }

    /**
     * Resets all test state to initial values
     */
    reset() {
        const resetValues = {
            startTime: Date.now(),
            chartData: [],
            chartX: CHART_CONFIG.CHART_START_X,
            lastChartUpdate: Date.now(),
            frameTimes: [],
            perfStats: { sum: 0, count: 0, min: Infinity, max: 0 },
            testCompleted: false,
            completionTime: null,
            testActive: false,
            _loopIteration: 0,
            axesDrawn: false,
            prevMode: null,
            prevInterval: null,
            prevFps: null,
            loopTimer: null,
            loopScheduled: false
        };

        Object.entries(resetValues).forEach(([key, value]) => {
            this.setState(key, value);
        });

        // Clear any existing timers
        const existingTimer = this.getState("loopTimer");
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
    }

    /**
     * Updates performance statistics
     * @param {number} frametime - Current frame time
     */
    updatePerformanceStats(frametime) {
        if (typeof frametime !== 'number' || frametime <= 0) return;

        let frameTimes = this.getState("frameTimes") || [];
        let perfStats = this.getState("perfStats") || { sum: 0, count: 0, min: Infinity, max: 0 };

        frameTimes.push(frametime);
        if (frameTimes.length > CHART_CONFIG.MAX_FRAME_SAMPLES) {
            const removed = frameTimes.shift();
            perfStats.sum -= removed;
            perfStats.count--;
        }

        perfStats.sum += frametime;
        perfStats.count++;
        perfStats.min = Math.min(perfStats.min, frametime);
        perfStats.max = Math.max(perfStats.max, frametime);

        this.setState("frameTimes", frameTimes);
        this.setState("perfStats", perfStats);
    }

    /**
     * Gets computed performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        const perfStats = this.getState("perfStats") || { sum: 0, count: 0, min: Infinity, max: 0 };
        const frameTimes = this.getState("frameTimes") || [];

        return {
            avgFrametime: perfStats.count > 0 ? perfStats.sum / perfStats.count : 0,
            minFrametime: perfStats.min === Infinity ? 0 : perfStats.min,
            maxFrametime: perfStats.max,
            sampleCount: frameTimes.length,
            fps: perfStats.count > 0 ? Math.round(1000 / (perfStats.sum / perfStats.count)) : 0
        };
    }
}

/**
 * Professional Performance Tracker
 * @class
 */
class PerformanceTracker {
    /**
     * @param {PerformanceTestState} stateManager - State management instance
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.lastLogTime = 0;
    }

    /**
     * Records a frame timing measurement
     * @param {number} frametime - Frame time in milliseconds
     */
    recordFrame(frametime) {
        this.stateManager.updatePerformanceStats(frametime);
    }

    /**
     * Gets current performance metrics
     * @returns {Object} Current performance metrics
     */
    getMetrics() {
        return this.stateManager.getPerformanceMetrics();
    }

    /**
     * Logs performance data with intelligent throttling
     * @param {string} mode - Current test mode
     * @param {boolean} shouldRender - Whether rendering is active
     */
    logPerformance(mode, shouldRender) {
        const now = Date.now();
        if (now - this.lastLogTime < 1000) return; // Log max once per second

        const metrics = this.getMetrics();
        console.log(`🎮 [PERF V3] ${mode} mode | ` +
            `FT:${metrics.avgFrametime.toFixed(1)}ms | ` +
            `FPS:${metrics.fps} | ` +
            `Samples:${metrics.sampleCount} | ` +
            `Render:${shouldRender}`);

        this.lastLogTime = now;
    }
}

/**
 * Main render function with professional architecture
 * @param {Object} ctx - Render context
 * @param {Object} ctx.device - Device interface
 * @param {Object} ctx.state - Current state
 * @param {Function} ctx.getState - State getter
 * @param {Function} ctx.setState - State setter
 * @param {Function} ctx.publishOk - Success callback
 * @param {number} ctx.frametime - Current frame time
 */
async function render(ctx) {
    try {
        const { device, state, getState, setState, publishOk, frametime } = ctx;

        // Initialize professional state management
        const stateManager = new PerformanceTestState(getState, setState);
        const performanceTracker = new PerformanceTracker(stateManager);

        // Extract configuration with validation
        const config = {
            mode: TEST_MODES[state.mode] || TEST_MODES.CONTINUOUS,
            testInterval: Math.max(50, Math.min(2000, state.interval || 150)),
            loopDuration: state.duration || CHART_CONFIG.LOOP_DURATION_DEFAULT,
            adaptiveTiming: Boolean(state.adaptiveTiming)
        };

        // Handle continuation messages
        if (state._isLoopContinuation) {
            const existingTimer = getState("loopTimer");
            if (existingTimer) {
                clearTimeout(existingTimer);
                setState("loopTimer", null);
            }
            setState("loopScheduled", false);
            setState("_loopIteration", state._loopIteration || 0);
        }

        // Fresh start logic
        if (stateManager.isFreshStart(state)) {
            await device.clear();
            stateManager.reset();

            console.log(`🎯 [PERF V3] Fresh test start | Mode: ${config.mode} | ` +
                `Interval: ${config.testInterval}ms | Adaptive: ${config.adaptiveTiming}`);
        }

        const startTime = getState("startTime");
        const loopEndTime = config.mode === TEST_MODES.LOOP ?
            (startTime + config.loopDuration) :
            (startTime + CHART_CONFIG.TEST_TIMEOUT_MS);

        // Record performance data
        if (frametime !== undefined && frametime > 0) {
            performanceTracker.recordFrame(frametime);
        }

        const now = Date.now();
        const shouldRender = now <= loopEndTime;

        // Log performance periodically
        performanceTracker.logPerformance(config.mode, shouldRender);

        // Create professional chart and text renderers
        const chartRenderer = new ChartRenderer(device, getState, setState, performanceTracker);
        const textRenderer = new TextRenderer(device, getState, setState, performanceTracker);

        // Generate display content based on mode
        const displayContent = generateDisplayContent(config, frametime, getState, performanceTracker);

        // Render frame if within time limits
        if (shouldRender) {
            await chartRenderer.render(now, config.adaptiveTiming ? frametime : config.testInterval);
            await textRenderer.render(displayContent, now);

            // Check for test completion
            if (chartRenderer.isComplete()) {
                // Update display content to show completion time
                const completionContent = {
                    modeText: displayContent.modeText,
                    timingText: "0ms",
                    fpsText: `0 FPS 00:00,000`,
                    frametime: 0,
                    metrics: performanceTracker.getMetrics()
                };

                await textRenderer.render(completionContent, now);
                await textRenderer.renderCompletion();
                await device.push(SCENE_NAME, publishOk);

                const metrics = performanceTracker.getMetrics();
                console.log(`🏁 [PERF V3] Test completed | ` +
                    `Samples: ${metrics.sampleCount} | ` +
                    `Avg FT: ${metrics.avgFrametime.toFixed(1)}ms | ` +
                    `FPS: ${metrics.fps}`);

                setState("testCompleted", true);
                setState("completionTime", now);

                // Clean up timers
                const existingTimer = getState("loopTimer");
                if (existingTimer) {
                    clearTimeout(existingTimer);
                    setState("loopTimer", null);
                }
                setState("loopScheduled", false);
                return;
            }

            // Handle adaptive timing continuation
            if (config.adaptiveTiming && !getState("loopScheduled")) {
                const delay = Math.max(CHART_CONFIG.MIN_DELAY_MS,
                    Math.min(CHART_CONFIG.MAX_DELAY_MS, (frametime || config.testInterval) + 10));

                scheduleContinuation(ctx, config, delay);
            }

            // Push rendered frame
            await device.push(SCENE_NAME, publishOk);
        }

        // Update render timestamp
        setState("lastRender", now);

    } catch (error) {
        console.error(`❌ [PERF V3] Critical render error:`, error);
        // Attempt graceful recovery
        try {
            setState("testCompleted", true);
            if (publishOk) {
                publishOk(ctx.device?.host || 'unknown', SCENE_NAME, 0, 0, { pushes: 0, skipped: 0, errors: 1, lastFrametime: 0 });
            }
        } catch (recoveryError) {
            console.error(`❌ [PERF V3] Recovery failed:`, recoveryError);
        }
    }
}

/**
 * Professional Chart Renderer with optimized performance
 * @class
 */
class ChartRenderer {
    /**
     * @param {Object} device - Device interface
     * @param {Function} getState - State getter function
     * @param {Function} setState - State setter function
     * @param {PerformanceTracker} performanceTracker - Performance tracker instance
     */
    constructor(device, getState, setState, performanceTracker) {
        this.device = device;
        this.getState = getState;
        this.setState = setState;
        this.performanceTracker = performanceTracker;
    }

    /**
     * Renders the performance chart with axes and data points
     * @param {number} currentTime - Current timestamp
     * @param {number} chartFrametime - Frame time for chart data
     */
    async render(currentTime, chartFrametime) {
        await this.renderAxes();
        await this.updateChartData(currentTime, chartFrametime);
    }

    /**
     * Renders chart axes (only once per test)
     */
    async renderAxes() {
        if (this.getState("axesDrawn")) return;

        await clearRectangle(this.device, 0, CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT, 1, CHART_CONFIG.RANGE_HEIGHT);
        await clearRectangle(this.device, CHART_CONFIG.CHART_START_X, CHART_CONFIG.START_Y, 64 - CHART_CONFIG.CHART_START_X, 1);

        // Batch draw Y-axis
        for (let y = CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT; y < CHART_CONFIG.START_Y; y++) {
            this.device.drawPixelRgba([0, y], CHART_CONFIG.AXIS_COLOR);
        }

        // Batch draw X-axis
        for (let x = CHART_CONFIG.CHART_START_X; x < 64; x++) {
            this.device.drawPixelRgba([x, CHART_CONFIG.START_Y], CHART_CONFIG.AXIS_COLOR);
        }

        this.setState("axesDrawn", true);
    }

    /**
     * Updates chart with new data point
     * @param {number} currentTime - Current timestamp
     * @param {number} chartFrametime - Frame time value
     */
    async updateChartData(currentTime, chartFrametime) {
        const chartX = this.getState("chartX") || CHART_CONFIG.CHART_START_X;
        const lastChartUpdate = this.getState("lastChartUpdate") || currentTime;

        if (currentTime - lastChartUpdate < CHART_CONFIG.UPDATE_INTERVAL_MS || chartX >= 64) {
            return;
        }

        // Calculate chart position
        const normalizedFrametime = Math.min(CHART_CONFIG.MAX_FRAMETIME,
            Math.max(CHART_CONFIG.MIN_FRAMETIME, chartFrametime));
        const ratio = (normalizedFrametime - CHART_CONFIG.MIN_FRAMETIME) /
            (CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);
        const yOffset = Math.round(ratio * CHART_CONFIG.RANGE_HEIGHT);
        const yPos = CHART_CONFIG.START_Y - 1 - yOffset;

        // Add data point with memory management
        let chartData = this.getState("chartData") || [];
        if (chartData.length >= CHART_CONFIG.MAX_CHART_POINTS) {
            chartData.shift(); // Remove oldest point
        }

        const chartColor = getPerformanceColor(chartFrametime);
        chartData.push({ x: chartX, y: yPos, color: chartColor });

        // Draw line if we have at least 2 points
        if (chartData.length > 1) {
            const prev = chartData[chartData.length - 2];
            const curr = chartData[chartData.length - 1];
            drawLine(this.device, prev.x, prev.y, curr.x, curr.y, curr.color);
        }

        this.setState("chartData", chartData);
        this.setState("chartX", chartX + 1);
        this.setState("lastChartUpdate", currentTime);
    }

    /**
     * Checks if chart is complete
     * @returns {boolean} True if chart has all data points
     */
    isComplete() {
        const chartX = this.getState("chartX") || CHART_CONFIG.CHART_START_X;
        return chartX >= 64;
    }
}

/**
 * Professional Text Renderer with optimized performance
 * @class
 */
class TextRenderer {
    /**
     * @param {Object} device - Device interface
     * @param {Function} getState - State getter function
     * @param {Function} setState - State setter function
     * @param {PerformanceTracker} performanceTracker - Performance tracker instance
     */
    constructor(device, getState, setState, performanceTracker) {
        this.device = device;
        this.getState = getState;
        this.setState = setState;
        this.performanceTracker = performanceTracker;
    }

    /**
     * Renders all text elements with background clearing
     * @param {Object} displayContent - Content to display
     * @param {number} currentTime - Current timestamp
     */
    async render(displayContent, currentTime) {
        const { modeText, timingText, fpsText, metrics } = displayContent;

        // Render header text
        await this.renderHeader(modeText, timingText, fpsText);

        // Render statistics (always update for accuracy)
        await this.renderStatistics(metrics);
    }

    /**
     * Renders header text elements
     * @param {string} modeText - Mode display text
     * @param {string} timingText - Timing display text
     * @param {string} fpsText - FPS display text
     */
    async renderHeader(modeText, timingText, fpsText) {
        if (modeText) {
            await drawTextRgbaAlignedWithBg(this.device, modeText, [2, 2], CHART_CONFIG.TEXT_COLOR_HEADER, "left", true);
        }
        // Combine FPS and frametime on same line like gaming overlays
        if (timingText && fpsText) {
            const combinedText = `${fpsText}/${timingText}`;
            await drawTextRgbaAlignedWithBg(this.device, combinedText, [2, 10], CHART_CONFIG.TEXT_COLOR_HEADER, "left", true);
        } else if (timingText) {
            await drawTextRgbaAlignedWithBg(this.device, timingText, [2, 10], CHART_CONFIG.TEXT_COLOR_HEADER, "left", true);
        } else if (fpsText) {
            await drawTextRgbaAlignedWithBg(this.device, fpsText, [2, 10], CHART_CONFIG.TEXT_COLOR_HEADER, "left", true);
        }
    }

    /**
     * Renders performance statistics at bottom
     * @param {Object} metrics - Performance metrics
     */
    async renderStatistics(metrics) {
        if (metrics.sampleCount > 0) {
            // Clear area below the chart axis (axis is at y=50, so start at y=51)
            await this.device.drawRectangleRgba([0, 51], [35, 13], CHART_CONFIG.BG_COLOR);

            // Render labels (gray) and values (white) separately, positioned below axis
            await drawTextRgbaAlignedWithBg(this.device, "FRAME: ", [2, 53], CHART_CONFIG.TEXT_COLOR_STATS, "left", false);
            await drawTextRgbaAlignedWithBg(this.device, metrics.sampleCount.toString(), [26, 53], CHART_CONFIG.TEXT_COLOR_HEADER, "left", false);

            await drawTextRgbaAlignedWithBg(this.device, "AVG: ", [2, 59], CHART_CONFIG.TEXT_COLOR_STATS, "left", false);
            await drawTextRgbaAlignedWithBg(this.device, `${Math.round(metrics.avgFrametime)}ms`, [18, 59], CHART_CONFIG.TEXT_COLOR_HEADER, "left", false);
        }
    }

    /**
     * Renders test completion message
     */
    async renderCompletion() {
        await drawTextRgbaAlignedWithBg(this.device, "COMPLETE", [32, 32], CHART_CONFIG.TEXT_COLOR_COMPLETE, "center", false);
    }
}

/**
 * Generates display content based on test configuration
 * @param {Object} config - Test configuration
 * @param {number} frametime - Current frame time
 * @param {Function} getState - State getter
 * @param {PerformanceTracker} performanceTracker - Performance tracker
 * @returns {Object} Display content object
 */
function generateDisplayContent(config, frametime, getState, performanceTracker) {
    const metrics = performanceTracker.getMetrics();
    const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;
    const remainingIterations = Math.max(0, CHART_CONFIG.MAX_CHART_POINTS - (chartX - CHART_CONFIG.CHART_START_X));

    let modeText = '';
    let timingText = '';
    let fpsText = '';

    if (config.mode === TEST_MODES.CONTINUOUS || config.mode === TEST_MODES.LOOP) {
        const modeLabel = config.mode === TEST_MODES.LOOP ? "AUTO LOOP" : "CONTINUOUS";
        const adaptiveLabel = config.adaptiveTiming ? "FT+" : "";
        const currentFrametime = frametime || 0;

        modeText = `${modeLabel} ${adaptiveLabel}`;
        timingText = config.adaptiveTiming ? `${Math.round(currentFrametime)}ms` : `${config.testInterval}ms`;
        fpsText = `${metrics.fps} FPS`;
    }

    return {
        modeText,
        timingText,
        fpsText,
        frametime: frametime || 0,
        metrics
    };
}

/**
 * Schedules continuation message for adaptive timing
 * @param {Object} ctx - Render context
 * @param {Object} config - Test configuration
 * @param {number} delay - Delay in milliseconds
 */
function scheduleContinuation(ctx, config, delay) {
    const { getState, setState } = ctx;

    const timer = setTimeout(async () => {
        try {
            const mqtt = require('mqtt');
            const brokerUrl = `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`;

            const client = mqtt.connect(brokerUrl, {
                username: process.env.MOSQITTO_USER_MS24,
                password: process.env.MOSQITTO_PASS_MS24,
                connectTimeout: CHART_CONFIG.MQTT_TIMEOUT_MS,
                reconnectPeriod: 0
            });

            client.on('connect', () => {
                try {
                    const payload = JSON.stringify({
                        scene: SCENE_NAME,
                        mode: config.mode,
                        adaptiveTiming: config.adaptiveTiming,
                        interval: config.testInterval,
                        _loopIteration: (getState("_loopIteration") || 0) + 1,
                        _isLoopContinuation: true
                    });

                    const targetHost = (ctx.env && ctx.env.host) ?
                        ctx.env.host :
                        (process.env.PIXOO_DEVICES ? process.env.PIXOO_DEVICES.split(';')[0].trim() : '192.168.1.159');

                    client.publish(`pixoo/${targetHost}/state/upd`, payload, { qos: 1 });
                    client.end();
                } catch (publishError) {
                    console.error(`❌ [PERF V3] MQTT publish error:`, publishError);
                    client.end();
                }
            });

            client.on('error', (error) => {
                console.error(`❌ [PERF V3] MQTT connection error:`, error.message);
                try {
                    setState("loopScheduled", false);
                    setState("loopTimer", null);
                } catch (stateError) {
                    console.error(`❌ [PERF V3] State cleanup error:`, stateError);
                }
                client.end();
            });

            client.on('close', () => {
                try {
                    setState("loopScheduled", false);
                    setState("loopTimer", null);
                } catch (stateError) {
                    console.error(`❌ [PERF V3] State cleanup error:`, stateError);
                }
            });

        } catch (error) {
            console.error(`❌ [PERF V3] Continuation setup error:`, error);
            try {
                setState("loopScheduled", false);
                setState("loopTimer", null);
            } catch (stateError) {
                console.error(`❌ [PERF V3] State cleanup error:`, stateError);
            }
        }
    }, delay);

    setState("loopTimer", timer);
    setState("loopScheduled", true);
}

// Import shared rendering utilities
const { drawTextRgbaAlignedWithBg, drawLine, clearRectangle } = require('../lib/rendering-utils');

module.exports = { name: SCENE_NAME, render };
