// scenes/test_fill.js
module.exports = {
	name: "test_fill",
	renderMode: "incremental", // 👈 tell daemon to use incremental mode
	render: async (ctx) => {
	  const { device, state } = ctx;
  
	  // Default color = red
	  const color = state.color || [255, 0, 0, 255];
  
	  // Clear overlay buffer (not the Pixoo screen, just our local buffer)
	  await device.clear();
  
	  // Fill the whole 64x64 with the chosen color
	  for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
		  await device.drawPixelRgba([x, y], color);
		}
	  }
  
	  // Push in incremental mode
	  await device.push("test_fill", ctx.publishOk, "incremental");
  
	  console.log(`🧪 test_fill rendered with color: ${JSON.stringify(color)}`);
	},
  };