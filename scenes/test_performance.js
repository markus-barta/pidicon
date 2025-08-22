// scenes/test_performance.js
// Performance testing scene to find minimum feasible frame delays
// Tests different update intervals and tracks frametime statistics
// Visual display shows current mode, stats, and real-time updates
// MQTT payload: { "mode": "burst|continuous|sweep", "interval": 50, "duration": 10000 }

module.exports = {
	name: "test_performance",
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
      console.log(`🧹 [LOOP] Cleared existing timer for continuation`);
    }

    setState("loopScheduled", false);
    console.log(`🔄 [LOOP] Continuation message received, iteration: ${continuationIteration}, ready for next scheduling`);
  }

  // Only set startTime once at the beginning of the test
  let startTime = getState("startTime");
  if (!startTime) {
    startTime = Date.now();
    setState("startTime", startTime);
    console.log(`🎯 [LOOP] Starting new test at ${new Date(startTime).toLocaleTimeString()}`);
  }
  const loopEndTime = mode === "loop" ? (startTime + loopDuration) : (startTime + 30000);

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
    console.log(`📊 [PERF] Frame ${frameTimes.length}: frametime=${ctx.frametime}ms`);
  }

  // Calculate statistics
  const avgFrametime = frameTimes.length > 0 ?
    frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
  const minFrametime = frameTimes.length > 0 ? Math.min(...frameTimes) : 0;
  const maxFrametime = frameTimes.length > 0 ? Math.max(...frameTimes) : 0;

  console.log(`📈 [STATS] Frames:${frameTimes.length} Avg:${Math.round(avgFrametime)}ms Min:${Math.round(minFrametime)}ms Max:${Math.round(maxFrametime)}ms`);

	  // Test logic - render continuously for the test duration
	  let shouldRender = now <= loopEndTime; // Keep rendering until loop duration expires
	  let displayText = `${currentInterval}ms\nWAITING FOR DATA`;

	  if (mode === "burst") {
	    // Burst mode: rapid-fire frames for a short period
	    const burstDuration = 10000; // 10 seconds for burst mode
	    if (testActive && elapsed < burstDuration) {
	      const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
	      displayText = `BURST ${currentInterval}ms\n${Math.round(elapsed/1000)}s/${Math.round(burstDuration/1000)}s\nFPS:${fps}`;
	    } else if (testActive && elapsed >= burstDuration) {
	      setState("testActive", false);
	      displayText = "BURST COMPLETE";
	    } else {
	      displayText = "BURST READY\nSend MQTT to start";
	    }
	  } else if (mode === "continuous") {
	    // Continuous mode: steady interval testing - always render for real performance data
	    const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
	    const currentFrametime = ctx.frametime || 0;
	    const remaining = Math.max(0, Math.round((loopEndTime - now) / 1000));
	    displayText = `${currentInterval}ms\nFT:${currentFrametime}ms\nFPS:${fps}\n${remaining}s left`;
	  } else if (mode === "loop") {
	    // Loop mode: extended continuous testing for long-term performance analysis
	    const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
	    const currentFrametime = ctx.frametime || 0;
	    const remaining = Math.max(0, Math.round((loopEndTime - now) / 1000));
	    const minutes = Math.floor(remaining / 60);
	    const seconds = remaining % 60;
	    const iteration = getState("_loopIteration") || 0;
	    displayText = `LOOP ${currentInterval}ms\nFT:${currentFrametime}ms\nFPS:${fps}\n${minutes}:${seconds.toString().padStart(2,'0')} left`;
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
	    const remaining = Math.max(0, Math.round((loopEndTime - now) / 1000));
	    const fps = avgFrametime > 0 ? Math.round(1000 / avgFrametime) : 0;
	    displayText = `SWEEP CYCLE:${cycle}\n${sweepInterval}ms\nFT:${currentFrametime}ms\n${remaining}s left`;
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
    displayText = `${mode.toUpperCase()} COMPLETE\n${frameTimes.length} samples\nAVG:${Math.round(avgFrametime)}ms`;
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
	    // Update the visual display
	    await device.clear();

	    // Background color based on performance (optimized for 180-250ms realistic range)
	    let bgColor = [0, 0, 0, 255]; // Black background
	    if (avgFrametime > 350) bgColor = [120, 0, 0, 255]; // Red for very slow (>350ms)
	    else if (avgFrametime > 280) bgColor = [100, 50, 0, 255]; // Orange for slow (280-350ms)
	    else if (avgFrametime > 220) bgColor = [100, 100, 0, 255]; // Yellow for medium (220-280ms)
	    else if (avgFrametime > 160) bgColor = [0, 100, 0, 255]; // Green for good (160-220ms)
	    else if (avgFrametime >= 100) bgColor = [0, 150, 0, 255]; // Bright green for excellent (100-160ms)
	    else if (avgFrametime > 0) bgColor = [0, 200, 0, 255]; // Very bright green for outstanding (<100ms)

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
	      const barWidth = Math.min(60, Math.round(avgFrametime / 6)); // Scale for 100-350ms range
	      const barColor = avgFrametime > 280 ? [255, 0, 0, 255] :    // Red for slow
	                       avgFrametime > 220 ? [255, 165, 0, 255] :  // Orange for medium
	                       avgFrametime > 160 ? [255, 255, 0, 255] :  // Yellow for good
	                       [0, 255, 0, 255];                          // Green for excellent
	      await device.drawRectangleRgba([2, 50], [barWidth, 4], barColor);
	    }

	    // Draw statistics at bottom
	    if (frameTimes.length > 0) {
	      const statsText = `${frameTimes.length}F MIN:${Math.round(minFrametime)} AVG:${Math.round(avgFrametime)} MAX:${Math.round(maxFrametime)}`;
	      await device.drawTextRgbaAligned(statsText, [2, 56], [200, 200, 200, 255], "left");
	    }
	  }

	    // Log performance data every 10 frames
  if (ctx.frametime !== undefined && frameTimes.length % 10 === 0) {
    console.log(`🎯 [PERF TEST] ${mode} mode, interval:${currentInterval}ms, frametime:${ctx.frametime}ms, avg:${Math.round(avgFrametime)}ms, samples:${frameTimes.length}, shouldRender:${shouldRender}, elapsed:${Math.round(elapsed/1000)}s`);
  }

  // Debug logging for first few renders
  if (frameTimes.length <= 5) {
    console.log(`🔍 [DEBUG] Render ${frameTimes.length}: shouldRender=${shouldRender}, mode=${mode}, elapsed:${Math.round(elapsed/1000)}s, displayText="${displayText.replace(/\n/g, ' | ')}"`);
  }

  // Self-sustaining loop for continuous testing
  if (mode === "loop" && shouldRender && !state.stop) {
    // Check if we already have a loop scheduled to prevent duplicates
    // But allow continuation messages to schedule new iterations
    const isContinuation = state._isLoopContinuation;
    const loopAlreadyScheduled = getState("loopScheduled");

    if (loopAlreadyScheduled && !isContinuation) {
      console.log(`⏭️  Loop already scheduled and not a continuation, skipping duplicate`);
      return;
    }

    if (loopAlreadyScheduled && isContinuation) {
      console.log(`🔄  Loop already scheduled but processing continuation, continuing...`);
    }

    // Calculate when to send next MQTT message to continue the loop
    const nextMessageDelay = Math.max(1000, Math.min(5000, currentInterval * 2)); // 1-5 seconds between messages
    const remainingDuration = Math.max(0, (loopEndTime - now) / 1000); // remaining seconds

    console.log(`🔄 [LOOP] Scheduling next iteration in ${nextMessageDelay}ms (remaining: ${Math.round(remainingDuration)}s)`);

    // Mark loop as scheduled to prevent duplicates
    setState("loopScheduled", true);

    // Use setTimeout to send MQTT message for next iteration
    const loopTimer = setTimeout(() => {
      try {
        console.log(`🚀 [LOOP] Executing scheduled continuation...`);

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
          console.log(`📡 [LOOP] Connected to MQTT, sending continuation message`);

          // Get device IP from environment or use fallback
          const deviceIp = process.env.PIXOO_DEVICES ?
            process.env.PIXOO_DEVICES.split(';')[0].trim() :
            '192.168.1.159';

          const loopIteration = (getState("_loopIteration") || 0) + 1;
          const maxIterations = Math.ceil(loopDuration / 1000) + 10; // Max iterations + buffer

          // Safety check: prevent infinite loops
          if (loopIteration > maxIterations) {
            console.log(`🛑 [LOOP] Maximum iterations (${maxIterations}) reached, stopping loop`);
            setState("loopScheduled", false);
            return;
          }

          const payload = JSON.stringify({
            scene: "test_performance",
            mode: "loop",
            interval: currentInterval,
            duration: loopDuration, // Use original duration, not remaining
            _loopIteration: loopIteration,
            _isLoopContinuation: true // Mark this as a continuation message
          });

          console.log(`📤 [LOOP] Publishing to pixoo/${deviceIp}/state/upd: ${payload}`);
          client.publish(`pixoo/${deviceIp}/state/upd`, payload, { qos: 1 }, (err) => {
            if (err) {
              console.log(`❌ [LOOP] Failed to publish: ${err.message}`);
            } else {
              console.log(`✅ [LOOP] Successfully published continuation message`);
            }
            client.end();
          });
        });

        client.on('error', (err) => {
          clearTimeout(connectionTimeout);
          console.log(`⚠️  [LOOP] MQTT connection failed: ${err.message}`);
          setState("loopScheduled", false); // Reset flag on error
        });

        client.on('close', () => {
          console.log(`🔌 [LOOP] MQTT connection closed`);
          setState("loopScheduled", false); // Reset flag when done
        });

      } catch (err) {
        console.log(`⚠️  [LOOP] Exception in loop continuation: ${err.message}`);
        console.log(`📊 [LOOP] Stack trace: ${err.stack}`);
        setState("loopScheduled", false); // Reset flag on error
      }
    }, nextMessageDelay);

    // Store timer ID for potential cleanup
    setState("loopTimer", loopTimer);
  }

  await device.push("test_performance", ctx.publishOk);
	},
  };
