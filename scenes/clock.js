// scenes/clock.js
module.exports = {
	name: "clock",
	render: async (ctx) => {
	  const { device } = ctx;
	  const now = new Date();
	  const hh = String(now.getHours()).padStart(2, "0");
	  const mm = String(now.getMinutes()).padStart(2, "0");
	  const color = [255, 255, 255, 110];
  
	  await device.drawTextRgbaAligned(hh, [5, 2], color, "left");
	  await device.drawTextRgbaAligned(":", [12, 2], color, "left");
	  await device.drawTextRgbaAligned(mm, [15, 2], color, "left");
  
	  await device.push();
	},
  };