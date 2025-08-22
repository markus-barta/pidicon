// scenes/test_fill.js
module.exports = {
	name: "test_fill",
	render: async (ctx) => {
	  const { device, state } = ctx;
	  const color = state.color || [255, 0, 0, 255];

	  await device.clear();
	  for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
		  await device.drawPixelRgba([x, y], color);
		}
	  }

	  const diffPixels = await device.push("test_fill", ctx.publishOk);

	  console.log(
		`🧪 test_fill rendered with color: ${JSON.stringify(
		  color
		)}, diffPixels=${diffPixels}`
	  );
	},
  };