// scenes/clock.js
module.exports = {
	name: "clock",
	render: async (ctx) => {
	  const { device } = ctx;
	  const now = new Date();
	  const hh = String(now.getHours()).padStart(2, "0");
	  const mm = String(now.getMinutes()).padStart(2, "0");
	  const ss = String(now.getSeconds()).padStart(2, "0");
	  const ms = String(now.getMilliseconds()).padStart(3, "0");

	  const timeString = `${hh}:${mm}:${ss}.${ms}`;
	  const textColor = [255, 255, 255, 255]; // White, fully opaque
	  const bgColor = [0, 0, 255, 255]; // Blue background

	  // Calculate text dimensions (rough estimate: ~4px per character)
	  const textWidth = timeString.length * 4;
	  const textHeight = 5; // Font height

	  // Draw blue background rectangle
	  await device.drawRectangleRgba([2, 0], [textWidth + 4, textHeight + 4], bgColor);

	  // Draw the time text on top
	  await device.drawTextRgbaAligned(timeString, [4, 2], textColor, "left");

	  await device.push("clock", ctx.publishOk);
	},
  };