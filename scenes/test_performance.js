// scenes/test_performance.js
// Performance testing scene to find minimum feasible frame delays
// Tests different update intervals and tracks frametime statistics
// Visual display shows current mode, stats, and real-time updates
// MQTT payload: { "mode": "burst|continuous|sweep", "interval": 50, "duration": 10000 }

module.exports = {
	name: "test_performance",
	render: async (ctx) => {
	  const { device, state, getState, setState } = ctx;

	  // Configuration with defaults - focused on 100-200ms sweet spot
	  const mode = state.mode || "continuous"; // burst, continuous, sweep
	  const testInterval = state.interval || 150; // milliseconds between frames (start at 150ms)
	  const testDuration = state.duration || 5000; // test duration in ms
	  const startTime = getState("startTime") || Date.now();

	  // Performance tracking
	  const frameTimes = getState("frameTimes") || [];
	  const lastRender = getState("lastRender") || 0;
	  const testActive = getState("testActive") !== false;
	  const currentInterval = getState("currentInterval") || testInterval;

	  const now = Date.now();
	  const elapsed = now - startTime;
	  const timeSinceLast = now - lastRender;

	  // Update performance stats
	  if (ctx.frametime !== undefined) {
	    frameTimes.push(ctx.frametime);
	    if (frameTimes.length > 100) frameTimes.shift(); // Keep last 100 frames
	  }

	  // Calculate statistics
	  const avgFrametime = frameTimes.length > 0 ?
	    frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
	  const minFrametime = frameTimes.length > 0 ? Math.min(...frameTimes) : 0;
	  const maxFrametime = frameTimes.length > 0 ? Math.max(...frameTimes) : 0;

	  // Test logic
	  let shouldRender = false;
	  let displayText = "";

	  if (mode === "burst") {
	    // Burst mode: rapid-fire frames for a short period
	    if (testActive && elapsed < testDuration) {
	      shouldRender = timeSinceLast >= currentInterval;
	      displayText = `BURST ${currentInterval}ms\n${Math.round(elapsed/1000)}s/${Math.round(testDuration/1000)}s`;
	    } else if (testActive && elapsed >= testDuration) {
	      setState("testActive", false);
	      displayText = "BURST COMPLETE";
	    } else {
	      displayText = "BURST READY\nSend MQTT to start";
	    }
	  } else if (mode === "continuous") {
	    // Continuous mode: steady interval testing
	    shouldRender = timeSinceLast >= currentInterval;
	    const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
	    displayText = `${currentInterval}ms\nFPS:${fps}\nAVG:${Math.round(avgFrametime)}ms`;
	  } else if (mode === "sweep") {
	    // Sweep mode: focused on 100-200ms sweet spot (known working range)
	    const intervals = [100, 120, 140, 160, 180, 200]; // 100-200ms range
	    const sweepIndex = Math.floor(elapsed / 4000) % intervals.length; // 4s per interval
	    const sweepInterval = intervals[sweepIndex];

	    shouldRender = timeSinceLast >= sweepInterval;
	    if (shouldRender) {
	      setState("currentInterval", sweepInterval);
	    }

	    const cycle = Math.floor(elapsed / 3000) + 1;
	    displayText = `SWEEP CYCLE:${cycle}\n${sweepInterval}ms\n${frameTimes.length} samples`;
	  }

	  // Visual rendering
	  await device.clear();

	  // Background color based on performance (optimized for 100-200ms range)
	  let bgColor = [0, 0, 0, 255]; // Black background
	  if (avgFrametime > 300) bgColor = [120, 0, 0, 255]; // Red for very slow (>300ms)
	  else if (avgFrametime > 200) bgColor = [100, 50, 0, 255]; // Orange for slow (200-300ms)
	  else if (avgFrametime > 160) bgColor = [100, 100, 0, 255]; // Yellow for medium (160-200ms)
	  else if (avgFrametime >= 100) bgColor = [0, 100, 0, 255]; // Green for good (100-160ms)
	  else if (avgFrametime > 0) bgColor = [0, 150, 0, 255]; // Bright green for excellent (<100ms)

	  // Draw background rectangle
	  await device.drawRectangleRgba([0, 0], [64, 64], bgColor);

	  // Draw performance text
	  const textColor = [255, 255, 255, 255];
	  const lines = displayText.split('\n');

	  for (let i = 0; i < lines.length; i++) {
	    await device.drawTextRgbaAligned(lines[i], [2, 2 + (i * 6)], textColor, "left");
	  }

	  // Draw performance bar (visual indicator of frametime)
	  if (avgFrametime > 0) {
	    const barWidth = Math.min(60, Math.round(avgFrametime / 5)); // Scale for 100-200ms range
	    const barColor = avgFrametime > 200 ? [255, 0, 0, 255] :    // Red for slow
	                     avgFrametime > 160 ? [255, 165, 0, 255] :  // Orange for medium
	                     avgFrametime > 100 ? [255, 255, 0, 255] :  // Yellow for good
	                     [0, 255, 0, 255];                          // Green for excellent
	    await device.drawRectangleRgba([2, 50], [barWidth, 4], barColor);
	  }

	  // Draw statistics at bottom
	  if (frameTimes.length > 0) {
	    const statsText = `${frameTimes.length}F MIN:${Math.round(minFrametime)} AVG:${Math.round(avgFrametime)} MAX:${Math.round(maxFrametime)}`;
	    await device.drawTextRgbaAligned(statsText, [2, 56], [200, 200, 200, 255], "left");
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

	  // Log performance data
	  if (ctx.frametime !== undefined && frameTimes.length % 10 === 0) {
	    console.log(`🎯 [PERF TEST] ${mode} mode, interval:${currentInterval}ms, frametime:${ctx.frametime}ms, avg:${Math.round(avgFrametime)}ms, samples:${frameTimes.length}`);
	  }

	  await device.push("test_performance", ctx.publishOk);
	},
  };
