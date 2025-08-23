// Fill Scene - Fill screen with specified color
const name = "fill";

async function render(ctx) {
    const { device, state } = ctx;

    // Default to red if no color specified
    const defaultColor = [255, 0, 0, 255]; // Red
    const color = state.color || defaultColor;

    // Validate color format (RGBA array)
    if (!Array.isArray(color) || color.length !== 4) {
        console.error(`❌ [FILL] Invalid color format: ${JSON.stringify(color)}, expected [R,G,B,A]`);
        return;
    }

    // Fill entire screen with the specified color
    await device.fillRgba(color);

    console.log(`🎨 [FILL] Screen filled with color: [${color.join(',')}]`);
}

module.exports = { name, render };
