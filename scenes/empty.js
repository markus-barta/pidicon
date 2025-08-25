// Empty Scene - Black screen (device "off" state)
// MQTT Command: {"scene":"empty"}
// @author: Sonic + Cursor + Markus Barta (mba)

const name = "empty";

// Import shared utilities
const { validateSceneContext } = require('../lib/performance-utils');

async function render(ctx) {
    // Validate scene context
    if (!validateSceneContext(ctx, name)) {
        return;
    }

    const { device, publishOk } = ctx;

    // Clear screen to black (device appears "off")
    await device.clear();

    // Push the cleared frame to actually update the device
    await device.push(name, publishOk);

    console.log(`🖤 [EMPTY] Screen cleared to black`);
}

module.exports = { name, render };
