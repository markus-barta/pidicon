// scenes/test_performance_v2.js
// Performance testing scene 2.0 with incremental rendering
// Features:
// - Labels half-transparent, values fully opaque
// - Detailed performance chart with gradient colors
// - No fullscreen background
// - Incremental rendering with background clearing
// - Configurable chart parameters

// Chart configuration constants
const CHART_CONFIG = {
  START_Y: 50,           // Starting Y position for chart
  RANGE_HEIGHT: 20,      // Height of chart in pixels (zoomed for detail)
  MIN_FRAMETIME: 1,      // Minimum frametime for scaling (1ms)
  MAX_FRAMETIME: 500,    // Maximum frametime for scaling (500ms)
  AXIS_COLOR: [64, 64, 64, 255], // Dark gray for axes
  CHART_START_X: 1       // Start chart at x=1 (leave space for y-axis)
};

// Color gradient function for performance levels
function getPerformanceColor(frametime) {
  const ratio = (frametime - CHART_CONFIG.MIN_FRAMETIME) / (CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);

  if (ratio <= 0.2) {
    // Blue to blue-green (0-100ms)
    return [0, Math.round(255 * (ratio / 0.2)), Math.round(255 * ratio), 255];
  } else if (ratio <= 0.4) {
    // Blue-green to green (100-200ms)
    const subRatio = (ratio - 0.2) / 0.2;
    return [0, 255, Math.round(128 + 127 * subRatio), 255];
  } else if (ratio <= 0.6) {
    // Green to yellow-green (200-300ms)
    const subRatio = (ratio - 0.4) / 0.2;
    return [Math.round(255 * subRatio), 255, Math.round(255 * (1 - subRatio)), 255];
  } else if (ratio <= 0.8) {
    // Yellow to orange (300-400ms)
    const subRatio = (ratio - 0.6) / 0.2;
    return [255, Math.round(255 * (1 - subRatio)), 0, 255];
  } else {
    // Orange to red (400-500ms+)
    const subRatio = Math.min(1, (ratio - 0.8) / 0.2);
    return [255, Math.round(128 * (1 - subRatio)), 0, 255];
  }
}

module.exports = {
	name: "test_performance_v2",
	render: async (ctx) => {
		// Performance test runs continuously for 30 seconds after being triggered
		const { device, state, getState, setState } = ctx;

		// Configuration with defaults - focused on 100-200ms sweet spot
		const mode = state.mode || "continuous"; // burst, continuous, sweep, loop
		const testInterval = state.interval || 150; // milliseconds between frames (start at 150ms)
		const loopDuration = state.duration || 300000; // loop duration in ms (5 minutes default for loop mode)

		// Handle loop continuation messages differently
		if (state._isLoopContinuation) {
			// This is a continuation message - preserve the original startTime and iteration
			const continuationIteration = state._loopIteration || 0;
			setState("_loopIteration", continuationIteration);

			// Clear any existing timer and reset flags for continuation
			const existingTimer = getState("loopTimer");
			if (existingTimer) {
				clearTimeout(existingTimer);
				setState("loopTimer", null);
			}

			setState("loopScheduled", false);
		}

		// Clean up variables at start of new test
		let startTime = getState("startTime");

		// Reset logic: new MQTT messages trigger reset, completed tests stay completed until new message
		const isNewMessage = !state._isLoopContinuation && !state._isContinuation;
		const isFreshStart = !startTime || (isNewMessage && !getState("testCompleted"));

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
			setState("burstCompleteTime", null);
			setState("loopStoppedTime", null);
			setState("loopScheduled", false);
			setState("testActive", false);
			setState("_loopIteration", 0);

			// Clear any existing loop timer
			const existingTimer = getState("loopTimer");
			if (existingTimer) {
				clearTimeout(existingTimer);
				setState("loopTimer", null);
			}

			console.log(`🎯 [TEST V2] Starting fresh test run - isNewMessage: ${isNewMessage}, testCompleted: ${getState("testCompleted")}`);
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
		if (ctx.frametime !== undefined && ctx.frametime > 0) {
			frameTimes.push(ctx.frametime);
			if (frameTimes.length > 100) frameTimes.shift(); // Keep last 100 frames
		}

		// Calculate statistics
		const avgFrametime = frameTimes.length > 0 ?
			frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
		const minFrametime = frameTimes.length > 0 ? Math.min(...frameTimes) : 0;
		const maxFrametime = frameTimes.length > 0 ? Math.max(...frameTimes) : 0;

		// Test logic - render continuously for the test duration
		// For sweep mode, keep rendering until test is completed
		let shouldRender = mode === "sweep" ?
			!getState("testCompleted") :
			now <= loopEndTime; // Keep rendering until loop duration expires
		let displayText = "READY";

		// Debug: Log which mode is being processed
		console.log(`🎮 [MODE] Processing mode: ${mode}, shouldRender: ${shouldRender}, testCompleted: ${getState("testCompleted")}`);

		// Mode-specific display logic
		if (mode === "burst") {
			// Burst mode: rapid-fire frames for a short period
			const burstDuration = 10000; // 10 seconds for burst mode
			if (testActive && elapsed < burstDuration) {
				const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
				displayText = `BURST ${currentInterval}ms\n${Math.round(elapsed/1000)}s/${Math.round(burstDuration/1000)}s\nFPS:${fps}`;
			} else if (testActive && elapsed >= burstDuration) {
				setState("testActive", false);
				setState("burstCompleteTime", now);
				displayText = "BURST COMPLETE";
			} else {
				displayText = "BURST READY\nSend MQTT to start";
			}
		} else if (mode === "continuous") {
			// Continuous mode: steady interval testing - always render for real performance data
			const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
			const currentFrametime = ctx.frametime || 0;

			// Calculate remaining time based on remaining iterations * average frametime
			const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;
			const remainingIterations = Math.max(0, 63 - (chartX - CHART_CONFIG.CHART_START_X));
			const estimatedRemainingMs = remainingIterations * avgFrametime;
			const remainingSeconds = Math.max(0, Math.floor(estimatedRemainingMs / 1000));
			const remainingMs = Math.max(0, Math.round(estimatedRemainingMs % 1000)); // Round to 3 digits
			const minutes = Math.floor(remainingSeconds / 60);
			const seconds = remainingSeconds % 60;
			const timeDisplay = remainingIterations > 0 ?
				`${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')},${remainingMs.toString().padStart(3,'0').slice(0,3)}` :
				"00:00,000";

			// Show frametime-based info if using adaptive timing
			const adaptiveInfo = state.adaptiveTiming ? "FT+" : "";
			displayText = `CONTINUOUS ${currentInterval}ms${adaptiveInfo}\nFT:${currentFrametime}ms\nFPS:${fps}\n${timeDisplay} left`;
		} else if (mode === "loop") {
			// Loop mode: extended continuous testing for long-term performance analysis
			const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
			const currentFrametime = ctx.frametime || 0;

			// Calculate remaining time based on remaining iterations * average frametime
			const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;
			const remainingIterations = Math.max(0, 63 - (chartX - CHART_CONFIG.CHART_START_X));
			const estimatedRemainingMs = remainingIterations * avgFrametime;
			const remainingSeconds = Math.max(0, Math.floor(estimatedRemainingMs / 1000));
			const remainingMs = Math.max(0, Math.round(estimatedRemainingMs % 1000)); // Round to 3 digits
			const minutes = Math.floor(remainingSeconds / 60);
			const seconds = remainingSeconds % 60;
			const timeDisplay = remainingIterations > 0 ?
				`${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')},${remainingMs.toString().padStart(3,'0').slice(0,3)}` :
				"00:00,000";

			// Show frametime-based info if using adaptive timing
			const adaptiveInfo = state.adaptiveTiming ? "FT+" : "";
			const iteration = getState("_loopIteration") || 0;
			displayText = `AUTO LOOP ${currentInterval}ms${adaptiveInfo}\nFT:${currentFrametime}ms\nFPS:${fps}\n${timeDisplay} left`;
		} else if (mode === "sweep") {
			// Sweep mode: test each interval for a complete 64-point chart
			const intervals = [100, 130, 160, 190, 220, 250, 280, 310, 350]; // 100-350ms range
			const sweepIndex = getState("sweepIndex") || 0;
			const currentSweepInterval = intervals[sweepIndex];

			// Debug: Log sweep mode entry
			console.log(`🎯 [SWEEP] Mode entered: sweepIndex=${sweepIndex}, interval=${currentSweepInterval}ms, chartX=${chartX}, testCompleted=${getState("testCompleted")}`);

			// Initialize sweep state if not set
			if (getState("sweepIndex") === undefined) {
				setState("sweepIndex", 0);
				setState("sweepStartTime", now);
				setState("sweepChartStart", chartX);
			}

			// Check if we should move to next interval (after 64 points or 30 seconds)
			const sweepStartTime = getState("sweepStartTime") || now;
			const sweepChartStart = getState("sweepChartStart") || chartX;
			const pointsCollected = chartX - sweepChartStart;

			// Debug: Log sweep progress
			console.log(`🔍 [SWEEP] Progress: points=${pointsCollected}/64, elapsed=${Math.round((now - sweepStartTime)/1000)}s, chartX=${chartX}, sweepChartStart=${sweepChartStart}`);

			if (pointsCollected >= 64 || (now - sweepStartTime) >= 30000) {
				console.log(`🎯 [SWEEP] Interval ${sweepIndex + 1} completed: ${pointsCollected} points in ${Math.round((now - sweepStartTime)/1000)}s`);
				// Move to next interval or finish
				const nextIndex = sweepIndex + 1;
				if (nextIndex >= intervals.length) {
					// All intervals completed
					console.log(`🏁 [SWEEP] All intervals completed: ${intervals.length} intervals tested`);
					setState("testCompleted", true);
					setState("completionTime", now);
					setState("loopScheduled", false);
					return;
				} else {
					// Start next interval
					setState("sweepIndex", nextIndex);
					setState("sweepStartTime", now);
					setState("sweepChartStart", chartX);
					console.log(`🎯 [SWEEP] Moving to interval ${intervals[nextIndex]}ms (${nextIndex + 1}/${intervals.length})`);
				}
			}

			// Update interval for current sweep
			if (shouldRender) {
				setState("currentInterval", currentSweepInterval);
			}

			const cycle = sweepIndex + 1;
			const currentFrametime = ctx.frametime || 0;
			const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;

			// Calculate progress within current interval
			const progressPercent = Math.min(100, Math.round((pointsCollected / 64) * 100));
			displayText = `SWEEP ${cycle}/${intervals.length}\n${currentSweepInterval}ms\nFT:${currentFrametime}ms\n${progressPercent}% complete`;
		}

		// Check if test duration has expired (but not for sweep mode)
		if (now > loopEndTime && mode !== "sweep") {
			// Clear any pending loop timer
			const loopTimer = getState("loopTimer");
			if (loopTimer) {
				clearTimeout(loopTimer);
				setState("loopTimer", null);
			}
			setState("loopScheduled", false);

			// Mark test as completed for "Done" display
			const testCompleted = getState("testCompleted");
			if (!testCompleted) {
				setState("testCompleted", true);
				setState("completionTime", now);
				console.log(`🏁 [TEST V2] Test completed: ${chartX - CHART_CONFIG.CHART_START_X}/63 chart points, ${frameTimes.length} samples`);
			}

			// Show completion message, but don't reset automatically
			const modeName = mode === "continuous" ? "CONTINUOUS" :
			                mode === "loop" ? "AUTO LOOP" : mode.toUpperCase();
			displayText = `${modeName} COMPLETE\n${frameTimes.length} samples\nAVG:${Math.round(avgFrametime)}ms`;
		}

		// Handle burst mode completion
		const burstCompleteTime = getState("burstCompleteTime");
		if (burstCompleteTime && now - burstCompleteTime > 2000) {
			displayText = "Done";
		}

		// Handle stopped loop
		const loopStoppedTime = getState("loopStoppedTime");
		if (loopStoppedTime && now - loopStoppedTime > 2000) {
			displayText = "Done";
		}

		// For burst mode, only render if active or ready
		if (mode === "burst" && !testActive && elapsed >= 100) {
			shouldRender = false;
			displayText = "BURST READY\nSend MQTT to start";
		}

		// Special handling for loop mode - keep running until explicitly stopped
		if (mode === "loop" && state.stop) {
			// Clear any pending loop timer
			const loopTimer = getState("loopTimer");
			if (loopTimer) {
				clearTimeout(loopTimer);
				setState("loopTimer", null);
			}
			setState("loopScheduled", false);
			setState("loopStoppedTime", now);
			shouldRender = false;
			displayText = "AUTO LOOP STOPPED\nBY USER";
		}

		// Update state for next render
		setState("lastRender", now);
		setState("frameTimes", frameTimes);
		setState("startTime", startTime);
		setState("currentInterval", currentInterval);

		// Start test if in burst mode and not active
		if (mode === "burst" && !testActive && elapsed < 100) {
			setState("testActive", true);
		}

		// Always push to collect performance data, but only update display if shouldRender
		if (shouldRender) {
			// Clear screen with black background (no fullscreen color)
			await device.clear();

			// Draw chart axes in dark gray
			// Y-axis (vertical line)
			for (let y = CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT; y < CHART_CONFIG.START_Y; y++) {
				await device.drawPixelRgba([0, y], CHART_CONFIG.AXIS_COLOR);
			}
			// X-axis (horizontal line) - don't draw at the very edge
			for (let x = CHART_CONFIG.CHART_START_X; x < 63; x++) {
				await device.drawPixelRgba([x, CHART_CONFIG.START_Y], CHART_CONFIG.AXIS_COLOR);
			}

			// Draw detailed performance chart
			const chartData = getState("chartData") || [];
			const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;
			const lastChartUpdate = getState("lastChartUpdate") || now;

			// Update chart every 100ms with new data point
			if (now - lastChartUpdate >= 100 && chartX < 64) {
				// Calculate Y position based on frametime with new scaling
				const frametime = ctx.frametime || 0;
				const normalizedFrametime = Math.min(CHART_CONFIG.MAX_FRAMETIME,
					Math.max(CHART_CONFIG.MIN_FRAMETIME, frametime));

				// Scale to 20px range (about 25ms per pixel)
				const ratio = (normalizedFrametime - CHART_CONFIG.MIN_FRAMETIME) /
					(CHART_CONFIG.MAX_FRAMETIME - CHART_CONFIG.MIN_FRAMETIME);
				const yOffset = Math.round(ratio * CHART_CONFIG.RANGE_HEIGHT);
				const yPos = CHART_CONFIG.START_Y - 1 - yOffset; // Start 1 pixel higher to avoid axis

				// Get color from gradient
				const chartColor = getPerformanceColor(frametime);

				// Add new data point
				chartData.push({ x: chartX, y: yPos, color: chartColor });
				if (chartData.length > 64 - CHART_CONFIG.CHART_START_X) {
					chartData.shift(); // Keep only points within chart area
				}

				setState("chartData", chartData);
				setState("chartX", chartX + 1);
				setState("lastChartUpdate", now);
			}

			// Draw the chart line connecting points
			if (chartData.length > 0) {
				// Draw first point
				const firstPoint = chartData[0];
				await device.drawPixelRgba([firstPoint.x, firstPoint.y], firstPoint.color);

				// Draw lines connecting subsequent points
				if (chartData.length > 1) {
					for (let i = 1; i < chartData.length; i++) {
						const prev = chartData[i - 1];
						const curr = chartData[i];

						// Draw line between consecutive points
						const dx = Math.abs(curr.x - prev.x);
						const dy = Math.abs(curr.y - prev.y);
						const sx = prev.x < curr.x ? 1 : -1;
						const sy = prev.y < curr.y ? 1 : -1;
						let err = dx - dy;
						let x = prev.x;
						let y = prev.y;

						while (true) {
							await device.drawPixelRgba([x, y], curr.color);

							if (x === curr.x && y === curr.y) break;

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
				}
			}

			// Draw performance text with incremental rendering
			const lines = displayText.split('\n');
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const isDoneText = displayText === "Done";

				// For non-"Done" text, separate labels from values
				if (!isDoneText) {
					// Special handling for time left line (contains "left")
					if (line.includes(" left")) {
						// Time left line - make it gray
						await drawTextRgbaAlignedWithBg(device, line, [2, 2 + (i * 6)], [128, 128, 128, 255], "left", true);
					} else {
						// Draw labels (half transparent) and values (fully opaque) separately
						const labelMatches = line.match(/^([^0-9]+)(.*)$/);
						if (labelMatches) {
							const label = labelMatches[1];
							const value = labelMatches[2];

							// Draw label with 50% opacity (incremental rendering)
							await drawTextRgbaAlignedWithBg(device, label, [2, 2 + (i * 6)], [255, 255, 255, 127], "left", true);

							// Draw value with 100% opacity (incremental rendering)
							const labelWidth = await getTextWidth(label);
							await drawTextRgbaAlignedWithBg(device, value, [2 + labelWidth, 2 + (i * 6)], [255, 255, 255, 255], "left", true);
						} else {
							// Fallback for lines that don't match pattern
							await drawTextRgbaAlignedWithBg(device, line, [2, 2 + (i * 6)], [255, 255, 255, 255], "left", true);
						}
					}
				} else {
					// "Done" text - center it with 50% opacity
					await drawTextRgbaAlignedWithBg(device, line, [32, 2 + (i * 6)], [255, 255, 255, 127], "center", true);
				}
			}

			// Draw statistics at bottom with incremental rendering
			if (frameTimes.length > 0) {
				// Create stats text with proper formatting
				const frameCount = frameTimes.length;
				const minValue = Math.round(minFrametime);
				const avgValue = Math.round(avgFrametime);
				const maxValue = Math.round(maxFrametime);

				// Draw labels in gray, values in white with corrected positioning
				await drawTextRgbaAlignedWithBg(device, "FRAMES ", [0, 52], [128, 128, 128, 255], "left", true);
				await drawTextRgbaAlignedWithBg(device, frameCount.toString(), [25, 52], [255, 255, 255, 255], "left", true);
				
				await drawTextRgbaAlignedWithBg(device, "AV:", [36, 52], [128, 128, 128, 255], "left", true);
				await drawTextRgbaAlignedWithBg(device, avgValue.toString(), [48, 52], [255, 255, 255, 255], "left", true);

				await drawTextRgbaAlignedWithBg(device, "LO:", [0, 58], [128, 128, 128, 255], "left", true);
				await drawTextRgbaAlignedWithBg(device, minValue.toString(), [12, 58], [255, 255, 255, 255], "left", true);

				await drawTextRgbaAlignedWithBg(device, "HI:", [36, 58], [128, 128, 128, 255], "left", true);
				await drawTextRgbaAlignedWithBg(device, maxValue.toString(), [48, 58], [255, 255, 255, 255], "left", true);
			}
		}

		// Log performance data every 10 frames
		if (ctx.frametime !== undefined && frameTimes.length % 10 === 0) {
			console.log(`🎯 [PERF TEST V2] ${mode} mode, interval:${currentInterval}ms, frametime:${ctx.frametime}ms, avg:${Math.round(avgFrametime)}ms, samples:${frameTimes.length}, shouldRender:${shouldRender}, elapsed:${Math.round(elapsed/1000)}s`);
		}

		// Final debug log to see what happens at the end of render
		console.log(`🏁 [RENDER END] mode=${mode}, displayText="${displayText.replace(/\n/g, ' | ')}", shouldRender=${shouldRender}, testCompleted=${getState("testCompleted")}`);

		// Calculate delay based on adaptive timing setting
		const useAdaptiveTiming = state.adaptiveTiming || false;
		const frametimeDelay = ctx.frametime || testInterval;
		const adaptiveDelay = Math.max(50, Math.min(2000, frametimeDelay + 10)); // frametime + 10ms buffer
		const fixedDelay = testInterval; // Use the interval parameter as fixed delay
		const nextMessageDelay = useAdaptiveTiming ? adaptiveDelay : fixedDelay;

		// Self-sustaining loop for modes with adaptive delays or sweep mode
		const shouldContinue = (useAdaptiveTiming && shouldRender && !state.stop) ||
		                      (mode === "sweep" && shouldRender && !state.testCompleted);

		// Debug: Log continuation logic
		console.log(`🔄 [CONTINUATION] mode=${mode}, useAdaptiveTiming=${useAdaptiveTiming}, shouldRender=${shouldRender}, stop=${state.stop}, testCompleted=${state.testCompleted}, shouldContinue=${shouldContinue}`);

		if (shouldContinue) {
			// Check if we already have a loop scheduled to prevent duplicates
			const isContinuation = state._isLoopContinuation;
			const loopAlreadyScheduled = getState("loopScheduled");

			if (loopAlreadyScheduled && !isContinuation) {
				console.log(`⏭️  Loop already scheduled and not a continuation, skipping duplicate`);
				return;
			}

			if (loopAlreadyScheduled && isContinuation) {
				console.log(`🔄  Loop already scheduled but processing continuation, continuing...`);
			}

			// Get current chart position to determine if we should continue
			const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;

			// Handle sweep mode completion differently
			if (mode === "sweep") {
				const sweepIndex = getState("sweepIndex") || 0;
				const intervals = [100, 130, 160, 190, 220, 250, 280, 310, 350];
				const sweepStartTime = getState("sweepStartTime") || now;
				const sweepChartStart = getState("sweepChartStart") || chartX;
				const pointsCollected = chartX - sweepChartStart;

				// Check if current interval is complete
				if (pointsCollected >= 64 || (now - sweepStartTime) >= 30000) {
					const nextIndex = sweepIndex + 1;
					if (nextIndex >= intervals.length) {
						// All intervals completed
						console.log(`🏁 [SWEEP] All intervals completed: ${intervals.length} intervals tested`);
						setState("testCompleted", true);
						setState("completionTime", now);
						setState("loopScheduled", false);
						return;
					} else {
						// Move to next interval - reset chart for new interval
						console.log(`🎯 [SWEEP] Moving to interval ${intervals[nextIndex]}ms (${nextIndex + 1}/${intervals.length})`);
						setState("sweepIndex", nextIndex);
						setState("sweepStartTime", now);
						setState("sweepChartStart", chartX);

						// Clear chart data for new interval (but keep frametime history)
						setState("chartData", []);
						setState("chartX", CHART_CONFIG.CHART_START_X);
						setState("lastChartUpdate", now);
						setState("startTime", now); // Reset start time for new interval

						// Don't return here - continue to schedule next iteration
					}
				}
			} else {
				// Original loop mode logic
				if (chartX >= 64 || now >= loopEndTime) {
					console.log(`🏁 [LOOP V2] Test completed: ${chartX - CHART_CONFIG.CHART_START_X}/63 chart points, time: ${Math.round((now - startTime) / 1000)}s`);
					setState("loopScheduled", false);
					return;
				}
			}

			// Use adaptive delay for continuous rendering
			// The delay adapts to the actual rendering complexity for optimal performance

			const chartPoints = chartX - CHART_CONFIG.CHART_START_X;
			const remainingPoints = 63 - chartPoints;
			const estimatedRemainingMs = remainingPoints * avgFrametime;
			const estimatedSeconds = Math.max(0, Math.floor(estimatedRemainingMs / 1000));
			const delayType = useAdaptiveTiming ? "adaptive" : "fixed";
			console.log(`🔄 [LOOP V2] Chart point ${chartPoints}/63, frametime: ${ctx.frametime}ms, delay: ${nextMessageDelay}ms (${delayType}), remaining: ${remainingPoints} points, ~${estimatedSeconds}s`);

			// Mark loop as scheduled to prevent duplicates
			setState("loopScheduled", true);

			// Use setTimeout to send MQTT message for next iteration
			const loopTimer = setTimeout(() => {
				try {
					console.log(`🚀 [LOOP V2] Executing scheduled continuation...`);

					// Create a new MQTT client for this message
					const mqtt = require('mqtt');
					const brokerUrl = `mqtt://${process.env.MOSQITTO_HOST_MS24 || 'localhost'}:1883`;

					const client = mqtt.connect(brokerUrl, {
						username: process.env.MOSQITTO_USER_MS24,
						password: process.env.MOSQITTO_PASS_MS24,
						connectTimeout: 5000,
						reconnectPeriod: 0, // Don't reconnect, just fail
					});

					let connectionTimeout = setTimeout(() => {
						console.log(`⚠️  MQTT connection timeout`);
						client.end();
					}, 5000);

					client.on('connect', () => {
						clearTimeout(connectionTimeout);
						console.log(`📡 [${mode.toUpperCase()} V2] Connected to MQTT, sending continuation message`);

						// Get device IP from environment or use fallback
						const deviceIp = process.env.PIXOO_DEVICES ?
							process.env.PIXOO_DEVICES.split(';')[0].trim() :
							'192.168.1.159';

						const loopIteration = (getState("_loopIteration") || 0) + 1;
						const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;

						// Safety check: prevent infinite loops (max chart positions or iterations)
						const maxIterations = mode === "sweep" ? 200 : 80; // More iterations for sweep mode
						const maxChartX = mode === "sweep" ? 1000 : 64; // Much higher for sweep mode

						if (loopIteration > maxIterations || chartX >= maxChartX) {
							console.log(`🛑 [${mode.toUpperCase()} V2] Maximum limit reached (iter: ${loopIteration}, chartX: ${chartX}), stopping`);
							setState("loopScheduled", false);
							return;
						}

						// Build payload based on current mode
						let continuationPayload = {
							scene: "test_performance_v2",
							mode: mode,
							interval: currentInterval,
							_loopIteration: loopIteration,
							_isLoopContinuation: true // Mark this as a continuation message
						};

						// Add mode-specific parameters
						if (mode === "loop") {
							continuationPayload.duration = loopDuration;
						} else if (mode === "sweep") {
							// For sweep mode, preserve adaptive timing if enabled
							if (useAdaptiveTiming) {
								continuationPayload.adaptiveTiming = true;
							}
						} else if (useAdaptiveTiming) {
							continuationPayload.adaptiveTiming = true;
						}

						const payload = JSON.stringify(continuationPayload);

						console.log(`📤 [${mode.toUpperCase()} V2] Publishing to pixoo/${deviceIp}/state/upd: ${payload}`);
						client.publish(`pixoo/${deviceIp}/state/upd`, payload, { qos: 1 }, (err) => {
							if (err) {
								console.log(`❌ [${mode.toUpperCase()} V2] Failed to publish: ${err.message}`);
							} else {
								console.log(`✅ [${mode.toUpperCase()} V2] Successfully published continuation message`);
							}
							client.end();
						});
					});

					client.on('error', (err) => {
						clearTimeout(connectionTimeout);
						console.log(`⚠️  [${mode.toUpperCase()} V2] MQTT connection failed: ${err.message}`);
						setState("loopScheduled", false); // Reset flag on error
					});

					client.on('close', () => {
						console.log(`🔌 [${mode.toUpperCase()} V2] MQTT connection closed`);
						setState("loopScheduled", false); // Reset flag when done
					});

				} catch (err) {
					console.log(`⚠️  [${mode.toUpperCase()} V2] Exception in continuation: ${err.message}`);
					console.log(`📊 [${mode.toUpperCase()} V2] Stack trace: ${err.stack}`);
					setState("loopScheduled", false); // Reset flag on error
				}
			}, nextMessageDelay);

			// Store timer ID for potential cleanup
			setState("loopTimer", loopTimer);
		}

		await device.push("test_performance_v2", ctx.publishOk);
	},
};

// Helper function for incremental rendering with background clearing
async function drawTextRgbaAlignedWithBg(device, text, pos, color, align = "left", clearBg = false) {
	const [x, y] = pos;

	if (clearBg) {
		// Clear background with black box (3x5 pixels per character)
		const textWidth = text.length * 3; // 3 pixels per character
		const textHeight = 5; // 5 pixels height

		// Calculate background box position based on alignment
		let bgX = x;
		if (align === "center") {
			bgX = Math.max(0, x - Math.floor(textWidth / 2));
		} else if (align === "right") {
			bgX = Math.max(0, x - textWidth);
		}

		// Draw black background box
		await device.drawRectangleRgba([bgX, y], [Math.min(textWidth, 64 - bgX), textHeight], [0, 0, 0, 255]);
	}

	// Draw the text
	return await device.drawTextRgbaAligned(text, [x, y], color, align);
}

// Helper function to get text width (approximate)
function getTextWidth(text) {
	// Each character is approximately 3 pixels wide, with 1 pixel spacing
	return text.length * 4; // 3 for character + 1 for spacing
}
