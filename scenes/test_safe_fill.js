// scenes/test_safe_fill.js
module.exports = {
	name: "test_safe_fill",
	render: async (ctx) => {
	  const { device, state } = ctx;
  
	  // Default color = blue
	  const color = state.color || [0, 0, 255, 255];
  
	  // Fill the whole 64x64 with the chosen color
	  await device.clear();
	  for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
		  await device.drawPixelRgba([x, y], color);
		}
	  }
  
	  // Push in full-frame mode
	  const diffPixels = await device.push("test_safe_fill", ctx.publishOk);
  
	  console.log(
		`🧪 test_safe_fill rendered with color: ${JSON.stringify(
		  color
		)}, diffPixels=${diffPixels}`
	  );
	},
  };