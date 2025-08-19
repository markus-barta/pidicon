// scenes/test_pattern.js
// Visual test scene for alignment, colors, and incremental diffs.
// Switch mode via MQTT payload: { "mode": "checker" } or { "mode": "gradient" }

module.exports = {
	name: "test_pattern",
	renderMode: "incremental", // use incremental diffs
	render: async (ctx) => {
	  const { device, state } = ctx;
	  const mode = state.mode || "checker"; // default = checkerboard
  
	  // Clear framebuffer
	  await device.clear();
  
	  if (mode === "checker") {
		// Checkerboard: 8x8 blocks alternating red/blue
		const blockSize = 8;
		for (let y = 0; y < 64; y++) {
		  for (let x = 0; x < 64; x++) {
			const isEven =
			  ((Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2) === 0;
			const color = isEven ? [255, 0, 0, 255] : [0, 0, 255, 255];
			await device.drawPixelRgba([x, y], color);
		  }
		}
	  } else if (mode === "gradient") {
		// Gradient: horizontal red→green, vertical blue intensity
		for (let y = 0; y < 64; y++) {
		  for (let x = 0; x < 64; x++) {
			const r = Math.round((x / 63) * 255);
			const g = Math.round(((63 - x) / 63) * 255);
			const b = Math.round((y / 63) * 255);
			await device.drawPixelRgba([x, y], [r, g, b, 255]);
		  }
		}
	  }
  
	  // Push in incremental mode
	  const diffPixels = await device.push(
		"test_pattern",
		ctx.publishOk,
		"incremental"
	  );
  
	  console.log(
		`🧪 test_pattern rendered in mode=${mode}, diffPixels=${diffPixels}`
	  );
	},
  };