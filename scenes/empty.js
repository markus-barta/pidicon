// Empty Scene - Black screen (device "off" state)
// MQTT Command: {"scene":"empty"}
// @author: Claude + Cursor + Markus Barta (mba)
const name = "empty";

async function render(ctx) {
    const { device } = ctx;

    // Clear screen to black (device appears "off")
    await device.clear();

    console.log(`🖤 [EMPTY] Screen cleared to black`);
}

module.exports = { name, render };
