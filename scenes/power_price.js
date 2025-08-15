// scenes/power_price.js
module.exports = {
  name: "power_price",
  render: async (ctx) => {
    const { device, state, getState, setState } = ctx;

    // Defaults to keep this robust on partial payloads
    const price = state.currentCentprice ?? state.price ?? null;

    // Layout (aligned with your prior config)
    const CLOCK = {
      hourPos: [5, 2],
      sepPos: [12, 2],
      minPos: [15, 2],
      color: [255, 255, 255, 110],
    };
    const PRICE = {
      pos: [56, 2],
      color: [255, 255, 255, 255],
      align: "right",
    };

    // 1) Clock (simple version; no fancy fading yet)
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    await device.drawTextRgbaAligned(hh, CLOCK.hourPos, CLOCK.color, "left");
    await device.drawTextRgbaAligned(":", CLOCK.sepPos, CLOCK.color, "left");
    await device.drawTextRgbaAligned(mm, CLOCK.minPos, CLOCK.color, "left");

    // 2) Price (apply your simple rules)
    if (typeof price === "number") {
      const abs = Math.abs(price);
      let display = price;
      let maxDigits;

      if (abs < 0.005) {
        display = 0.0;
        maxDigits = 2;
      } else if (abs < 10) {
        display = Math.round(price * 10) / 10;
        const intDigits = Math.floor(Math.abs(display)).toString().length || 1;
        maxDigits = display === 0 ? 2 : intDigits + 1;
      } else {
        display = Math.round(price);
        maxDigits = Math.floor(Math.abs(display)).toString().length;
      }

      await device.drawCustomFloatText(
        display,
        PRICE.pos,
        PRICE.color,
        PRICE.align,
        maxDigits
      );
    }

    // 3) Finish frame
    await device.push();
  },
};