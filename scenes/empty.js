// Empty Scene - Black screen (device "off" state)
const name = "empty";

async function render(ctx) {
    const { device } = ctx;

    // Clear screen to black (device appears "off")
    await device.clear();

    console.log(`🖤 [EMPTY] Screen cleared to black`);
}

module.exports = { name, render };
