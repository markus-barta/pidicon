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

		// Only set startTime once at the beginning of the test
		let startTime = getState("startTime");
		if (!startTime) {
			startTime = Date.now();
			setState("startTime", startTime);
			// Reset chart data for new test
			setState("chartData", []);
			setState("chartX", CHART_CONFIG.CHART_START_X);
			setState("lastChartUpdate", startTime);
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
		let shouldRender = now <= loopEndTime; // Keep rendering until loop duration expires
		let displayText = "READY";

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
			const rawRemaining = (loopEndTime - now) / 1000;
			const remaining = Math.max(0, Math.floor(rawRemaining));
			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			const timeDisplay = rawRemaining > 0.1 ? `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}` : "00:00";
			displayText = `LOOP ${currentInterval}ms\nFT:${currentFrametime}ms\nFPS:${fps}\n${timeDisplay} left`;
		} else if (mode === "loop") {
			// Loop mode: extended continuous testing for long-term performance analysis
			const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
			const currentFrametime = ctx.frametime || 0;
			const rawRemaining = (loopEndTime - now) / 1000;
			const remaining = Math.max(0, Math.floor(rawRemaining));
			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			const timeDisplay = rawRemaining > 0.1 ? `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}` : "00:00";
			const iteration = getState("_loopIteration") || 0;
			displayText = `LOOP ${currentInterval}ms\nFT:${currentFrametime}ms\nFPS:${fps}\n${timeDisplay} left`;
		} else if (mode === "sweep") {
			// Sweep mode: comprehensive testing from 100ms to 350ms (realistic range)
			const intervals = [100, 130, 160, 190, 220, 250, 280, 310, 350]; // 100-350ms range
			const sweepIndex = Math.floor(elapsed / 3000) % intervals.length; // 3s per interval
			const sweepInterval = intervals[sweepIndex];

			// Always render, but update the interval for the sweep
			if (shouldRender) {
				setState("currentInterval", sweepInterval);
			}

			const cycle = Math.floor(elapsed / 4000) + 1;
			const currentFrametime = ctx.frametime || 0;
			const rawRemaining = (loopEndTime - now) / 1000;
			const remaining = Math.max(0, Math.floor(rawRemaining));
			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			const timeDisplay = rawRemaining > 0.1 ? `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}` : "00:00";
			const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
			displayText = `SWEEP CYCLE:${cycle}\n${sweepInterval}ms\nFT:${currentFrametime}ms\n${timeDisplay} left`;
		}

		// Check if test duration has expired
		if (now > loopEndTime) {
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
			}

			// Show "Done" with 50% opacity after a brief delay
			const completionTime = getState("completionTime") || now;
			if (now - completionTime > 2000) { // Show "Done" after 2 seconds
				displayText = "Done";
			} else {
				displayText = `${mode.toUpperCase()} COMPLETE\n${frameTimes.length} samples\nAVG:${Math.round(avgFrametime)}ms`;
			}
		}

		// Handle "Done" display for burst mode completion
		const burstCompleteTime = getState("burstCompleteTime");
		if (burstCompleteTime && now - burstCompleteTime > 2000) {
			displayText = "Done";
		}

		// Handle "Done" display for stopped loop
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
			displayText = "LOOP STOPPED\nBY USER";
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
			for (let y = CHART_CONFIG.START_Y - CHART_CONFIG.RANGE_HEIGHT; y <= CHART_CONFIG.START_Y; y++) {
				await device.drawPixelRgba([0, y], CHART_CONFIG.AXIS_COLOR);
			}
			// X-axis (horizontal line)
			for (let x = CHART_CONFIG.CHART_START_X; x < 64; x++) {
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
				const yPos = CHART_CONFIG.START_Y - yOffset;

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

			// Draw the chart line
			if (chartData.length > 1) {
				for (let i = 0; i < chartData.length; i++) {
					const point = chartData[i];
					await device.drawPixelRgba([point.x, point.y], point.color);
				}
			}

			// Draw performance text with incremental rendering
			const lines = displayText.split('\n');
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const isDoneText = displayText === "Done";

				// For non-"Done" text, separate labels from values
				if (!isDoneText) {
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
				} else {
					// "Done" text - center it with 50% opacity
					await drawTextRgbaAlignedWithBg(device, line, [32, 2 + (i * 6)], [255, 255, 255, 127], "center", true);
				}
			}

			// Draw statistics at bottom with incremental rendering
			if (frameTimes.length > 0) {
				const frameCountText = `${frameTimes.length}F MIN:${Math.round(minFrametime)}`;
				const avgMaxText = `AVG:${Math.round(avgFrametime)} MAX:${Math.round(maxFrametime)}`;

				await drawTextRgbaAlignedWithBg(device, frameCountText, [2, 52], [200, 200, 200, 255], "left", true);
				await drawTextRgbaAlignedWithBg(device, avgMaxText, [2, 58], [200, 200, 200, 255], "left", true);
			}
		}

		// Log performance data every 10 frames
		if (ctx.frametime !== undefined && frameTimes.length % 10 === 0) {
			console.log(`🎯 [PERF TEST V2] ${mode} mode, interval:${currentInterval}ms, frametime:${ctx.frametime}ms, avg:${Math.round(avgFrametime)}ms, samples:${frameTimes.length}, shouldRender:${shouldRender}, elapsed:${Math.round(elapsed/1000)}s`);
		}

		// Self-sustaining loop for continuous testing with frametime-based delays
		if (mode === "loop" && shouldRender && !state.stop) {
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

			// Stop if we've completed all chart positions or exceeded time limit
			if (chartX >= 64 || now >= loopEndTime) {
				console.log(`🏁 [LOOP V2] Test completed: ${chartX - CHART_CONFIG.CHART_START_X}/63 chart points, time: ${Math.round((now - startTime) / 1000)}s`);
				setState("loopScheduled", false);
				return;
			}

			// Use frametime-based delay for continuous rendering
			// The delay is based on the actual rendering complexity
			const frametimeDelay = ctx.frametime || testInterval;
			const nextMessageDelay = Math.max(50, Math.min(2000, frametimeDelay * 2)); // 50ms to 2s based on frametime
			const remainingDuration = Math.max(0, (loopEndTime - now) / 1000);

			const chartPoints = chartX - CHART_CONFIG.CHART_START_X;
			const remainingPoints = 63 - chartPoints;
			console.log(`🔄 [LOOP V2] Chart point ${chartPoints}/63, frametime: ${ctx.frametime}ms, delay: ${nextMessageDelay}ms, remaining: ${remainingPoints} points, ${Math.round(remainingDuration)}s`);

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
						console.log(`📡 [LOOP V2] Connected to MQTT, sending continuation message`);

						// Get device IP from environment or use fallback
						const deviceIp = process.env.PIXOO_DEVICES ?
							process.env.PIXOO_DEVICES.split(';')[0].trim() :
							'192.168.1.159';

						const loopIteration = (getState("_loopIteration") || 0) + 1;
						const chartX = getState("chartX") || CHART_CONFIG.CHART_START_X;

						// Safety check: prevent infinite loops (max chart positions)
						if (loopIteration > 80 || chartX >= 64) { // Allow some buffer
							console.log(`🛑 [LOOP V2] Maximum chart positions reached (${chartX - CHART_CONFIG.CHART_START_X}/63), stopping loop`);
							setState("loopScheduled", false);
							return;
						}

						const payload = JSON.stringify({
							scene: "test_performance_v2",
							mode: "loop",
							interval: currentInterval,
							duration: loopDuration, // Use original duration, not remaining
							_loopIteration: loopIteration,
							_isLoopContinuation: true // Mark this as a continuation message
						});

						console.log(`📤 [LOOP V2] Publishing to pixoo/${deviceIp}/state/upd: ${payload}`);
						client.publish(`pixoo/${deviceIp}/state/upd`, payload, { qos: 1 }, (err) => {
							if (err) {
								console.log(`❌ [LOOP V2] Failed to publish: ${err.message}`);
							} else {
								console.log(`✅ [LOOP V2] Successfully published continuation message`);
							}
							client.end();
						});
					});

					client.on('error', (err) => {
						clearTimeout(connectionTimeout);
						console.log(`⚠️  [LOOP V2] MQTT connection failed: ${err.message}`);
						setState("loopScheduled", false); // Reset flag on error
					});

					client.on('close', () => {
						console.log(`🔌 [LOOP V2] MQTT connection closed`);
						setState("loopScheduled", false); // Reset flag when done
					});

				} catch (err) {
					console.log(`⚠️  [LOOP V2] Exception in loop continuation: ${err.message}`);
					console.log(`📊 [LOOP V2] Stack trace: ${err.stack}`);
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
