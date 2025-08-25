// Fill Scene - Fill screen with specified color
// MQTT Commands:
// {"scene":"fill","color":[255,0,0,255]}     - Red fill
// {"scene":"fill","color":[0,255,0,255]}     - Green fill
// {"scene":"fill","color":[0,0,255,255]}     - Blue fill
// {"scene":"fill","color":[255,255,0,255]}   - Yellow fill
// {"scene":"fill","color":[128,128,128,255]} - Gray fill
// @author: Claude + Cursor + Markus Barta (mba)
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
