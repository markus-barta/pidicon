// lib/device-adapter.js
const devices = new Map();
const sceneStates = new Map();

function key(host, scene) {
  return `${host}::${scene}`;
}

class MockDevice {
  constructor(host, size = 64) {
    this.host = host;
    this.size = size;
    this.ops = [];
  }

  async clear() {
    this.ops.push({ type: "clear" });
  }

  async drawPixelRgba(pos, color) {
    this.ops.push({ type: "pixel", pos, color });
  }

  async drawLineRgba(start, end, color) {
    this.ops.push({ type: "line", start, end, color });
  }

  async drawRectangleRgba(pos, size, color) {
    this.ops.push({ type: "rect", pos, size, color });
  }

  async drawTextRgbaAligned(text, pos, color, align = "left") {
    this.ops.push({ type: "text", text, pos, color, align });
  }

  // Minimal width estimate; good enough for layout testing.
  async drawCustomFloatText(
    value,
    pos,
    color,
    align = "right",
    maxTotalDigits = 2
  ) {
    const text =
      typeof value === "number" ? value.toString() : String(value ?? "");
    const width = Math.max(1, Math.min(text.length * 4, 64)); // approx
    this.ops.push({
      type: "floatText",
      value,
      pos,
      color,
      align,
      maxTotalDigits,
      width,
    });
    return width;
  }

  async drawImageWithAlpha(path, pos, size, alpha = 255) {
    this.ops.push({ type: "image", path, pos, size, alpha });
  }

  async push() {
    // Print a short summary
    const counts = this.ops.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {});
    console.log(
      `🟩 [MOCK PUSH] ${this.host} → ops: ${this.ops.length} ` +
        JSON.stringify(counts)
    );
    this.ops = [];
  }
}

function getDevice(host) {
  if (!devices.has(host)) {
    devices.set(host, new MockDevice(host, 64));
  }
  return devices.get(host);
}

function getContext(host, sceneName, state) {
  const device = getDevice(host);

  const stateKey = key(host, sceneName);
  if (!sceneStates.has(stateKey)) sceneStates.set(stateKey, {});
  const local = sceneStates.get(stateKey);

  return {
    device,
    state,
    env: { width: 64, height: 64, host },
    getState: (k, defVal) => (k in local ? local[k] : defVal),
    setState: (k, v) => {
      local[k] = v;
    },
  };
}

module.exports = { getDevice, getContext };


