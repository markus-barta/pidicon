// Performance Test V3 - Simplified adaptive timing test
const name = "test_performance_v3";

// Chart configuration
const CHART_CONFIG = {
    START_Y: 50,
    RANGE_HEIGHT: 20,
    MIN_FRAMETIME: 1,
    MAX_FRAMETIME: 500,
    AXIS_COLOR: [64, 64, 64, 191], // Dark gray with 75% opacity
    CHART_START_X: 1
};

// Performance color gradient (Blue → Green → Yellow → Orange → Red)
function getPerformanceColor(frametime) {
    const normalized = Math.min(CHART_CONFIG.MAX_FRAMETIME,
        Math.max(CHART_CONFIG.MIN_FRAMETIME, frametime));
    const ratio = (normalized - CHART_CONFIG.MIN_FRAMETIME) /
        (CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);

    if (ratio < 0.25) {
        // Blue to Green (0-25%)
        const blend = ratio * 4;
        return [
            Math.round(0 + (0 - 0) * blend),        // R: 0 → 0
            Math.round(0 + (255 - 0) * blend),      // G: 0 → 255
            Math.round(255 + (0 - 255) * blend),    // B: 255 → 0
            191 // 75% opacity
        ];
    } else if (ratio < 0.5) {
        // Green to Yellow (25-50%)
        const blend = (ratio - 0.25) * 4;
        return [
            Math.round(0 + (255 - 0) * blend),      // R: 0 → 255
            Math.round(255 + (255 - 255) * blend),  // G: 255 → 255
            Math.round(0 + (0 - 0) * blend),        // B: 0 → 0
            191
        ];
    } else if (ratio < 0.75) {
        // Yellow to Orange (50-75%)
        const blend = (ratio - 0.5) * 4;
        return [
            Math.round(255 + (255 - 255) * blend),  // R: 255 → 255
            Math.round(255 + (165 - 255) * blend),  // G: 255 → 165
            Math.round(0 + (0 - 0) * blend),        // B: 0 → 0
            191
        ];
    } else {
        // Orange to Red (75-100%)
        const blend = (ratio - 0.75) * 4;
        return [
            Math.round(255 + (255 - 255) * blend),  // R: 255 → 255
            Math.round(165 + (0 - 165) * blend),    // G: 165 → 0
            Math.round(0 + (0 - 0) * blend),        // B: 0 → 0
            191
        ];
    }
}

// Bresenham line algorithm for drawing chart lines
function drawLine(device, x1, y1, x2, y2, color) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let x = x1;
    let y = y1;

    while (true) {
        device.drawPixelRgba([x, y], color);
        if (x === x2 && y === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

async function render(ctx) {
    const { device, state, getState, setState } = ctx;
    const frametime = ctx.frametime;

    // Configuration with defaults
    const mode = state.mode || "continuous";
    const testInterval = state.interval || 150;
    const loopDuration = state.duration || 300000; // 5 minutes default

    // Handle loop continuation messages
    if (state._isLoopContinuation) {
        const continuationIteration = state._loopIteration || 0;
        setState("_loopIteration", continuationIteration);
        const existingTimer = getState("loopTimer");
        if (existingTimer) {
            clearTimeout(existingTimer);
            setState("loopTimer", null);
        }
        setState("loopScheduled", false);
    }

    // Clean up variables at start of new test
    let startTime = getState("startTime");

    // Reset logic: any new MQTT message triggers full reset
    const isNewMessage = !state._isLoopContinuation && !state._isContinuation;
    const isFreshStart = !startTime || isNewMessage;

    if (isFreshStart) {
        // Clear screen first
        await device.clear();

        // Reset all test variables for fresh start
        setState("startTime", Date.now());
        setState("chartData", []);
        setState("chartX", CHART_CONFIG.CHART_START_X);
        setState("lastChartUpdate", Date.now());
        setState("frameTimes", []);
        setState("testCompleted", false);
        setState("completionTime", null);
        setState("testActive", false);
        setState("_loopIteration", 0);
        setState("axesDrawn", false);

        // Clear any existing loop timer
        const existingTimer = getState("loopTimer");
        if (existingTimer) {
            clearTimeout(existingTimer);
            setState("loopTimer", null);
        }

        console.log(`🎯 [PERF V3] Starting fresh test run - isNewMessage: ${isNewMessage}, testCompleted: ${getState("testCompleted")}`);
        startTime = getState("startTime");
    }

    const loopEndTime = mode === "loop" ? (startTime + loopDuration) : (startTime + 60000); // Cap at 60 seconds

    // Performance tracking
    const frameTimes = getState("frameTimes") || [];
    const lastRender = getState("lastRender") || 0;
    const testActive = getState("testActive") !== false;
    const currentInterval = getState("currentInterval") || testInterval;

    const now = Date.now();
    const elapsed = now - startTime;
    const timeSinceLast = now - lastRender;

    // Update performance stats
    if (frametime !== undefined && frametime > 0) {
        frameTimes.push(frametime);
        if (frameTimes.length > 100) frameTimes.shift();
    }

    // Calculate statistics
    const avgFrametime = frameTimes.length > 0 ?
        frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
    const minFrametime = frameTimes.length > 0 ? Math.min(...frameTimes) : 0;
    const maxFrametime = frameTimes.length > 0 ? Math.max(...frameTimes) : 0;

    // Test logic - render continuously for the test duration
    let shouldRender = mode === "sweep" ?
        !getState("testCompleted") :
        now <= loopEndTime;
    let displayText = "READY";

    console.log(`🎮 [PERF V3] Processing mode: ${mode}, shouldRender: ${shouldRender}, testCompleted: ${getState("testCompleted")}`);

    // Mode-specific display logic
    if (mode === "continuous" || mode === "loop") {
        const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
        const currentFrametime = frametime || 0;

        // Calculate remaining time based on remaining iterations * average frametime
        const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;
        const remainingIterations = Math.max(0, 63 - (chartX - CHART_CONFIG.CHART_START_X));
        const estimatedRemainingMs = remainingIterations * avgFrametime;
        const remainingSeconds = Math.max(0, Math.floor(estimatedRemainingMs / 1000));
        const remainingMs = Math.max(0, Math.round(estimatedRemainingMs % 1000));
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const timeDisplay = remainingIterations > 0 ?
            `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')},${remainingMs.toString().padStart(3,'0').slice(0,3)}` :
            "00:00,000";

        // Show frametime-based info if using adaptive timing
        const adaptiveInfo = state.adaptiveTiming ? "FT+" : "";
        const modeDisplay = mode === "loop" ? "AUTO LOOP" : "CONTINUOUS";
        const iteration = getState("_loopIteration") || 0;
        displayText = `${modeDisplay} ${currentInterval}ms${adaptiveInfo}\nFT:${currentFrametime}ms\nFPS:${fps}\n${timeDisplay} left`;
    }

    // Clear screen and render if shouldRender is true
    if (shouldRender) {
        // Draw chart axes once (incremental rendering)
        if (!getState("axesDrawn")) {
            for (let y = CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT; y < CHART_CONFIG.START_Y; y++) {
                await device.drawPixelRgba([0, y], CHART_CONFIG.AXIS_COLOR);
            }
            for (let x = CHART_CONFIG.CHART_START_X; x < 63; x++) {
                await device.drawPixelRgba([x, CHART_CONFIG.START_Y], CHART_CONFIG.AXIS_COLOR);
            }
            setState("axesDrawn", true);
        }

        // Update chart every 100ms
        const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;
        const lastChartUpdate = getState("lastChartUpdate") || now;

        if (now - lastChartUpdate >= 100 && chartX < 64) {
            const chartFrametime = frametime || currentInterval;
            const normalizedFrametime = Math.min(CHART_CONFIG.MAX_FRAMETIME,
                Math.max(CHART_CONFIG.MIN_FRAMETIME, chartFrametime));
            const ratio = (normalizedFrametime - CHART_CONFIG.MIN_FRAMETIME) /
                (CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);
            const yOffset = Math.round(ratio * CHART_CONFIG.RANGE_HEIGHT);
            const yPos = CHART_CONFIG.START_Y - 1 - yOffset;

            const chartData = getState("chartData") || [];
            const chartColor = getPerformanceColor(chartFrametime);
            chartData.push({ x: chartX, y: yPos, color: chartColor });

            if (chartData.length > 1) {
                const prev = chartData[chartData.length - 2];
                const curr = chartData[chartData.length - 1];
                drawLine(device, prev.x, prev.y, curr.x, curr.y, curr.color);
            }

            setState("chartData", chartData);
            setState("chartX", chartX + 1);
            setState("lastChartUpdate", now);
        }

        // Display mode and timing info (clear small bg to prevent smearing)
        const useAdaptiveTiming = state.adaptiveTiming || false;
        const modeDisplay = useAdaptiveTiming ? `${mode.toUpperCase()} FT+` : mode.toUpperCase();
        const intervalDisplay = useAdaptiveTiming ? `${Math.round(frametime || 0)}ms` : `${currentInterval}ms`;
        const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;

        await drawTextRgbaAlignedWithBg(device, `${modeDisplay}`, [2, 2], [255, 255, 255, 255], "left", true);
        await drawTextRgbaAlignedWithBg(device, `${intervalDisplay}`, [2, 10], [255, 255, 255, 255], "left", true);
        await drawTextRgbaAlignedWithBg(device, `FPS: ${fps}`, [2, 18], [255, 255, 255, 255], "left", true);

        // Draw statistics at bottom (with background clear)
        if (frameTimes.length > 0) {
            await drawTextRgbaAlignedWithBg(device, `FRAMES: ${frameTimes.length}`, [0, 52], [128, 128, 128, 255], "left", true);
            await drawTextRgbaAlignedWithBg(device, `AVG: ${Math.round(avgFrametime)}ms`, [0, 58], [255, 255, 255, 255], "left", true);
        }

        // Completion check
        if (chartX >= 64) {
            await drawTextRgbaAlignedWithBg(device, "COMPLETE", [32, 32], [255, 255, 255, 127], "center", true);
            // Ensure frame is pushed before exiting
            await device.push("test_performance_v3", ctx.publishOk);
            console.log(`🏁 [PERF V3] Test completed: ${frameTimes.length} samples, avg: ${Math.round(avgFrametime)}ms`);
            setState("testCompleted", true);
            // Clear any scheduled continuation
            const existingTimer = getState("loopTimer");
            if (existingTimer) {
                clearTimeout(existingTimer);
                setState("loopTimer", null);
            }
            setState("loopScheduled", false);
            return;
        }

        // Continue test with adaptive timing
        if (useAdaptiveTiming) {
            const nextMessageDelay = Math.max(50, Math.min(2000, (frametime || currentInterval) + 10));
            const loopTimer = setTimeout(() => {
                try {
                    const mqttClient = require('mqtt').connect(
                        `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`,
                        {
                            username: process.env.MOSQITTO_USER_MS24,
                            password: process.env.MOSQITTO_PASS_MS24,
                            connectTimeout: 5000,
                            reconnectPeriod: 0,
                        }
                    );

                    mqttClient.on('connect', () => {
                        const payload = JSON.stringify({
                            scene: "test_performance_v3",
                            mode: mode,
                            adaptiveTiming: true,
                            interval: currentInterval,
                            _loopIteration: (getState("_loopIteration") || 0) + 1,
                            _isLoopContinuation: true
                        });
                        // Publish to the current device host (matches daemon topic format)
                        const targetHost = (ctx && ctx.env && ctx.env.host) ? ctx.env.host : (process.env.PIXOO_DEVICES ? process.env.PIXOO_DEVICES.split(';')[0].trim() : '192.168.1.159');
                        mqttClient.publish(`pixoo/${targetHost}/state/upd`, payload, { qos: 1 });
                        mqttClient.end();
                    });

                    mqttClient.on('error', () => {
                        try { setState("loopScheduled", false); setState("loopTimer", null); } catch (_) {}
                        mqttClient.end();
                    });
                    mqttClient.on('close', () => {
                        try { setState("loopScheduled", false); setState("loopTimer", null); } catch (_) {}
                    });
                } catch (err) {
                    console.error(`❌ [PERF V3] Continuation error:`, err.message);
                }
            }, nextMessageDelay);
            setState("loopTimer", loopTimer);
            setState("loopScheduled", true);
        }

        // Push frame after drawing when rendering
        await device.push("test_performance_v3", ctx.publishOk);
    }

    // Update render timestamp
    setState("lastRender", now);
}

module.exports = { name, render };

// Helper: incremental text with optional small background clear box
async function drawTextRgbaAlignedWithBg(device, text, pos, color, align = "left", clearBg = false) {
    const [x, y] = pos;
    if (clearBg) {
        const approxWidth = Math.min(64, String(text ?? "").length * 4);
        await device.drawRectangleRgba(
            align === "center" ? [Math.max(0, x - Math.floor(approxWidth / 2)), y] : align === "right" ? [Math.max(0, x - approxWidth), y] : [x, y],
            [approxWidth, 6],
            [0, 0, 0, 255]
        );
    }
    return await device.drawTextRgbaAligned(text, [x, y], color, align);
}
