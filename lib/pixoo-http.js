// lib/pixoo-http.js
// Minimal Pixoo 64 HTTP adapter: full-frame push via Draw/SendHttpGif.
// No images, no animations. Focused on power_price scene primitives.

const WIDTH = 64;
const HEIGHT = 64;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function idx(x, y) {
  return (y * WIDTH + x) * 3; // RGB
}

// 3x5 bitmap font for digits, colon, minus, dot, space
const FONT = {
  "0": [1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
  "1": [1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
  "2": [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
  "3": [1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1],
  "4": [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
  "5": [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1],
  "6": [1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  "7": [1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  "8": [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  "9": [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
  ":": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  "-": [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  " ": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const FONT_W = 3;
const FONT_H = 5;
const CHAR_SP = 1;

async function httpPost(host, body) {
  const url = `http://${host}/post`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const data = await res.json().catch(() => ({}));
  if (typeof data.error_code === "number" && data.error_code !== 0) {
    throw new Error(`Pixoo err ${data.error_code}`);
  }
  return data;
}
async function httpPost(host, body, timeoutMs = 5000) {
  const url = `http://${host}/post`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const data = await res.json().catch(() => ({}));
    if (typeof data.error_code === "number" && data.error_code !== 0) {
      throw new Error(`Pixoo err ${data.error_code}`);
    }
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Pixoo HTTP timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

async function tryInit(host) {
  // Best-effort init; ignore failures (device might already be in the right state).
  try {
    await httpPost(host, {
      Command: "Draw/ResetHttpGifId",
    });
  } catch (_) {}
  try {
    await httpPost(host, {
      Command: "Channel/SetCurrentChannel",
      Channel: 4,
    });
  } catch (_) {}
}

class RealPixoo {
  constructor(host, size = 64) {
    this.host = host;
    this.size = size;
    this.buf = new Uint8Array(WIDTH * HEIGHT * 3);
    this.initialized = false;
    this.picIdCounter = 1; // start counter at 1
  }

  async clear() {
    this.buf.fill(0);
    this.lastFrame = null; // force next push to redraw everything
  }

  _setPixel(x, y, r, g, b) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    const i = idx(x, y);
    this.buf[i] = r;
    this.buf[i + 1] = g;
    this.buf[i + 2] = b;
  }

  _blendPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    const i = idx(x, y);
    const alpha = clamp(a, 0, 255) / 255;
    const dr = this.buf[i];
    const dg = this.buf[i + 1];
    const db = this.buf[i + 2];
    this.buf[i] = Math.round(r * alpha + dr * (1 - alpha));
    this.buf[i + 1] = Math.round(g * alpha + dg * (1 - alpha));
    this.buf[i + 2] = Math.round(b * alpha + db * (1 - alpha));
  }

  async drawPixelRgba(pos, color) {
    const [x, y] = pos;
    const [r, g, b, a = 255] = color;
    this._blendPixel(x, y, r, g, b, a);
  }

  async drawLineRgba(start, end, color) {
    const [x0, y0] = start;
    const [x1, y1] = end;
    const [r, g, b, a = 255] = color;

    let x = x0 | 0;
    let y = y0 | 0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this._blendPixel(x, y, r, g, b, a);
      if (x === (x1 | 0) && y === (y1 | 0)) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  async drawRectangleRgba(pos, size, color) {
    const [x0, y0] = pos;
    const [w, h] = size;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        await this.drawPixelRgba([x0 + x, y0 + y], color);
      }
    }
  }

  _textWidth(str) {
    let w = 0;
    for (const ch of String(str)) {
      const glyph = FONT[ch] || FONT["?"] || FONT[" "];
      const gw = Math.floor(glyph.length / FONT_H) || FONT_W;
      w += gw + CHAR_SP;
    }
    return w > 0 ? w - CHAR_SP : 0;
  }

  async drawTextRgbaAligned(text, pos, color, align = "left") {
    const [r, g, b, a = 255] = color;
    let [x, y] = pos;
    const str = String(text ?? "");

    const totalW = this._textWidth(str);
    if (align === "right") x -= totalW;
    else if (align === "center") x -= Math.floor(totalW / 2);

    for (const ch of str) {
      const glyph = FONT[ch] || FONT[" "];
      const gw = Math.floor(glyph.length / FONT_H) || FONT_W;
      for (let i = 0; i < glyph.length; i++) {
        if (glyph[i]) {
          const px = x + (i % gw);
          const py = y + Math.floor(i / gw);
          this._blendPixel(px, py, r, g, b, a);
        }
      }
      x += gw + CHAR_SP;
    }
    return totalW;
  }

  async drawCustomFloatText(
    value,
    pos,
    color,
    align = "right",
    maxTotalDigits = 2
  ) {
    // Minimal version: apply your current rules (near-zero, <10 with 1 dec, otherwise int)
    let v = Number(value);
    if (!Number.isFinite(v)) return 0;

    const abs = Math.abs(v);
    let display;
    if (abs < 0.005) display = 0.0;
    else if (abs < 10) display = Math.round(v * 10) / 10;
    else display = Math.round(v);

    // Convert to string with up to one decimal for small values
    let str = String(display);
    if (abs < 10 && abs >= 0.005) {
      if (!str.includes(".")) str = `${str}.0`;
    }

    const w = this._textWidth(str);
    await this.drawTextRgbaAligned(str, pos, color, align);
    return w;
  }

  async push() {
    if (!this.initialized) {
      await tryInit(this.host).catch(() => {});
      this.initialized = true;
    }

    // Always reset GIF ID before sending
    await httpPost(this.host, { Command: "Draw/ResetHttpGifId" }).catch(() => {});

    const base64 = Buffer.from(this.buf).toString("base64");

    // ✅ assign and increment counter safely
    const picId = this.picIdCounter++;
    if (this.picIdCounter > 9999) this.picIdCounter = 1;

    const body = {
      Command: "Draw/SendHttpGif",
      PicNum: 1,
      PicWidth: WIDTH,
      PicHeight: HEIGHT,
      PicOffset: 0,
      PicID: picId, // ✅ unique ID each push
      PicSpeed: 1000,
      PicData: base64,
    };

    await httpPost(this.host, body);
    console.log(
      `🟢 [PUSH OK] ${this.host} bytes=${this.buf.length} (full-frame) PicID=${picId}`
    );
  }

  async pushIncremental() {
    const commands = [];
    let diffPixels = 0;
  
    // If no lastFrame yet, treat all pixels as changed
    if (!this.lastFrame) {
      this.lastFrame = Buffer.alloc(this.buf.length);
    }
  
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const i = idx(x, y);
        const r = this.buf[i];
        const g = this.buf[i + 1];
        const b = this.buf[i + 2];
  
        // Compare with lastFrame
        if (
          r !== this.lastFrame[i] ||
          g !== this.lastFrame[i + 1] ||
          b !== this.lastFrame[i + 2]
        ) {
          const color = (r << 16) + (g << 8) + b;
          commands.push({
            Command: "Draw/Pixel",
            X: x,
            Y: y,
            Color: color,
          });
          diffPixels++;
        }
      }
    }
  
    // Update lastFrame
    this.lastFrame = Buffer.from(this.buf);
  
    if (commands.length === 0) {
      console.log(`⏩ [INCREMENTAL] No pixel changes for ${this.host}`);
      return 0;   // 👈 return 0 if nothing changed
    }
  
    const body = {
      Command: "Draw/CommandList",
      CommandList: commands,
    };
  
    await httpPost(this.host, body);
    console.log(
      `🟢 [PUSH OK - incremental] ${this.host} ops=${commands.length} diffPixels=${diffPixels}`
    );
    return diffPixels;   // 👈 always return a number
  }

}

async function softReset(host) {
  try {
    // Switch away from custom channel
    await httpPost(host, { Command: "Channel/SetCurrentChannel", Channel: 1 });
    await new Promise((r) => setTimeout(r, 1000));

    // Switch back to custom channel
    await httpPost(host, { Command: "Channel/SetCurrentChannel", Channel: 4 });

    // Reset GIF buffer
    await httpPost(host, { Command: "Draw/ResetHttpGifId" });

    console.log(`🔄 Soft reset done for ${host}`);
    return true;
  } catch (err) {
    console.error(`❌ Soft reset failed for ${host}:`, err.message);
    return false;
  }
}

module.exports = { RealPixoo, softReset };


