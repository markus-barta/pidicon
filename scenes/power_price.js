// scenes/power_price.js
// Minimal port of POWER_PRICE logic: grid + zero line + simple bars + clock + price.
// Assumes a 64x64 device and MockDevice drawing primitives from device-adapter.

module.exports = {
  name: "power_price",
  render: async (ctx) => {
    const { device, state, getState, setState, env } = ctx;

    // --- Config (trimmed) ---
    const WIDTH = env.width || 64;
    const HEIGHT = env.height || 64;

    const GRID_ZERO_LINE_Y = 53; // same as your renderer
    const X_START = 12;
    const X_END = 60;
    const MAX_BARS = 26; // at 2 px per bar
    const MAX_LINEAR_HEIGHT = 20; // px above zero line for positive prices
    const ZERO_THRESHOLD = 0.005;

    const COLORS = {
      gridH: [125, 125, 125, 155],
      gridV: [125, 125, 125, 70],
      pastMarker: [0, 0, 0, 70],
      futureMarker: [0, 0, 0, 90],
      posStart: [75, 5, 5, 200], // top
      posEnd: [225, 75, 75, 220], // bottom
      currentStart: [100, 100, 100, 200],
      currentEnd: [255, 255, 255, 220],
      negative: [0, 255, 0, 255],
      overflow: [255, 0, 0, 255],
      clock: [255, 255, 255, 110],
      priceText: [255, 255, 255, 255],
    };

    // --- Small helpers ---
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);

    async function drawVerticalGradientLine(
      x,
      yTop,
      yBottom,
      startColor,
      endColor,
      topPixelAlpha
    ) {
      if (yTop > yBottom) [yTop, yBottom] = [yBottom, yTop];
      const length = yBottom - yTop + 1;
      for (let i = 0; i < length; i++) {
        const y = yTop + i;
        const t = length > 1 ? i / (length - 1) : 0;
        const col = [
          lerp(startColor[0], endColor[0], t),
          lerp(startColor[1], endColor[1], t),
          lerp(startColor[2], endColor[2], t),
          lerp(startColor[3] ?? 255, endColor[3] ?? 255, t),
        ];
        if (i === 0 && typeof topPixelAlpha === "number") {
          col[3] = clamp(topPixelAlpha, 0, 255);
        }
        await device.drawPixelRgba([x, y], col);
      }
    }

    function calcTopPixelAlpha(remainder, minAlpha = 25, maxAlpha = 255) {
      if (!remainder || remainder <= 0) return undefined;
      const t = clamp(remainder, 0, 1);
      return clamp(Math.round(minAlpha + (maxAlpha - minAlpha) * t), 0, 255);
    }

    // Accept two payload shapes for prices:
    // 1) state.prices = [{hour: ISO|string|number, price: number}, ...]
    // 2) state.prices = [number, number, ...] where index 0 is "current", then future
    function normalizePrices(state) {
      const now = new Date();
      const prices = state.prices;

      if (Array.isArray(prices) && prices.length > 0) {
        if (typeof prices[0] === "number") {
          // Simple mode: index 0 = current, rest = future
          return prices.slice(0, MAX_BARS).map((p, i) => ({
            price: p,
            isCurrent: i === 0,
            isPast: false,
          }));
        }

        // Object mode with hour field
        const rows = prices
          .filter(
            (r) =>
              r &&
              typeof r.price === "number" &&
              (typeof r.hour === "string" || typeof r.hour === "number")
          )
          .map((r) => ({
            date: new Date(r.hour),
            price: r.price,
          }))
          .sort((a, b) => a.date - b.date);

        return rows.slice(0, MAX_BARS).map((r) => {
          const sameHour =
            r.date.getFullYear() === now.getFullYear() &&
            r.date.getMonth() === now.getMonth() &&
            r.date.getDate() === now.getDate() &&
            r.date.getHours() === now.getHours();
          const isPast = r.date < new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
          return { price: r.price, isCurrent: sameHour, isPast };
        });
      }

      return [];
    }

    // --- Render: Clock (simple) + Price text ---
    async function renderClockAndPrice() {
      const CLOCK = {
        hourPos: [5, 2],
        sepPos: [12, 2],
        minPos: [15, 2],
      };
      const PRICE_POS = [56, 2];

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");

      await device.drawTextRgbaAligned(hh, CLOCK.hourPos, COLORS.clock, "left");
      await device.drawTextRgbaAligned(":", CLOCK.sepPos, COLORS.clock, "left");
      await device.drawTextRgbaAligned(mm, CLOCK.minPos, COLORS.clock, "left");

      const raw = state.currentCentprice ?? state.price ?? null;
      if (typeof raw === "number") {
        const abs = Math.abs(raw);
        let display = raw;
        let maxDigits;
        if (abs < ZERO_THRESHOLD) {
          display = 0.0;
          maxDigits = 2;
        } else if (abs < 10) {
          display = Math.round(raw * 10) / 10;
          const intDigits = Math.max(
            1,
            Math.floor(Math.abs(display)).toString().length
          );
          maxDigits = display === 0 ? 2 : intDigits + 1;
        } else {
          display = Math.round(raw);
          maxDigits = Math.max(
            1,
            Math.floor(Math.abs(display)).toString().length
          );
        }
        await device.drawCustomFloatText(
          display,
          PRICE_POS,
          COLORS.priceText,
          "right",
          maxDigits
        );
      }
    }

    // --- Render: Grid + zero-line markers ---
    async function renderGrid() {
      // Horizontal grid: 4 lines from top of chart to zero line
      const hCount = 4;
      const yTop = GRID_ZERO_LINE_Y - 30;
      for (let i = 0; i < hCount; i++) {
        const y = yTop + Math.round((i * 30) / (hCount - 1));
        // alpha gradient top->bottom
        const minAlpha = 50;
        const alphaRange = 80;
        const a = clamp(minAlpha + Math.round((i / (hCount - 1)) * alphaRange), 0, 255);
        const col = [COLORS.gridH[0], COLORS.gridH[1], COLORS.gridH[2], a];
        await device.drawLineRgba([X_START - 2, y], [X_END + 2, y], col);
      }

      // Vertical grid: 5 lines across chart width
      const vCount = 5;
      const span = X_END - X_START;
      for (let i = 0; i < vCount; i++) {
        const x = X_START + Math.round((i * span) / (vCount - 1));
        await device.drawLineRgba(
          [x, yTop - 2],
          [x, GRID_ZERO_LINE_Y + 2],
          COLORS.gridV
        );
      }
    }

    async function renderZeroLineMarkers(series) {
      const zeroY = GRID_ZERO_LINE_Y;
      for (let i = 0; i < series.length; i++) {
        const x = X_START + i * 2;
        if (x > X_END) break;
        const isPast = !!series[i].isPast;
        const c = isPast ? COLORS.pastMarker : COLORS.futureMarker;
        await device.drawPixelRgba([x, zeroY], c);
      }
    }

    // --- Render: Bars ---
    async function renderBars(series) {
      const zeroY = GRID_ZERO_LINE_Y - 1; // bottom of positive region
      // Find current index for indicator
      const currentIndex = series.findIndex((s) => s.isCurrent);

      for (let i = 0; i < series.length; i++) {
        const x = X_START + i * 2;
        if (x > X_END) break;

        const p = series[i].price;
        const isCurrent = i === currentIndex;
        const isPast = !!series[i].isPast;

        // Zero
        if (typeof p !== "number" || Math.abs(p) < ZERO_THRESHOLD) {
          // draw a green dot exactly on zero line
          await device.drawPixelRgba([x, zeroY + 1], COLORS.negative);
          continue;
        }

        // Negative: draw pixels below zero line, spaced
        if (p < 0) {
          const pixels = Math.ceil(Math.abs(p) / 10); // 1 pixel / 10ct
          for (let k = 0; k < pixels; k++) {
            const y = zeroY + 2 + k * 2;
            if (y >= HEIGHT) break;
            await device.drawPixelRgba([x, y], COLORS.negative);
          }
          continue;
        }

        // Positive: linear up to MAX_LINEAR_HEIGHT
        const linear = Math.min(p, MAX_LINEAR_HEIGHT);
        const full = Math.floor(linear);
        const rem = linear - full;
        const topAlpha = calcTopPixelAlpha(rem, 0, (COLORS.posEnd[3] ?? 255));

        const start = isCurrent ? COLORS.currentStart : COLORS.posStart;
        const end = isCurrent ? COLORS.currentEnd : COLORS.posEnd;

        // total drawn height (include fractional top)
        const total = full + (rem > 0 ? 1 : 0);
        const yTop = zeroY - total + 1;
        if (yTop <= zeroY) {
          await drawVerticalGradientLine(x, yTop, zeroY, end, start, topAlpha);
        }

        // (Optional) simple overflow: if p > MAX_LINEAR_HEIGHT, add red caps above
        if (p > MAX_LINEAR_HEIGHT) {
          const extra = Math.floor((p - MAX_LINEAR_HEIGHT) / 10); // 1 pixel / 10ct
          const overflowStartY = yTop - 1;
          const col = COLORS.overflow;
          for (let k = 0; k < extra; k++) {
            const y = overflowStartY - k;
            if (y < 0) break;
            await device.drawPixelRgba([x, y], col);
          }
        }
      }

      // Current hour indicator (triangle below zero line)
      if (currentIndex >= 0) {
        const x = X_START + currentIndex * 2;
        const yTip = GRID_ZERO_LINE_Y + 2;
        const baseY = GRID_ZERO_LINE_Y + 3;
        const c = COLORS.currentEnd;
        if (x > 0 && x < WIDTH - 1 && baseY < HEIGHT) {
          await device.drawPixelRgba([x, yTip], c);
          await device.drawPixelRgba([x - 1, baseY], c);
          await device.drawPixelRgba([x, baseY], c);
          await device.drawPixelRgba([x + 1, baseY], c);
        }
      }
    }

    // --- Frame ---
    await device.clear();
    await renderGrid();
    await renderClockAndPrice();

    const series = normalizePrices(state);
    if (series.length > 0) {
      await renderZeroLineMarkers(series);
      await renderBars(series);
    }

    await device.push("power_price", ctx.publishOk);
  },
};