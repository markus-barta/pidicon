/**
 * @fileoverview Empty Scene
 * @description This scene does nothing and is used as a default when no other
 * scene is specified. It can also be used to clear the screen by rendering an
 * empty frame.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"empty"}'
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const name = 'empty';

function init() {
  // No logging in init - use render context for device-specific logging
}

async function render(context) {
  const { device, publishOk } = context;

  // Clear screen to black
  await device.clear();

  // Push the cleared frame to actually update the device
  await device.push(name, publishOk);

  context.log(`Screen cleared to black`, 'debug');

  // Static scene - signal completion by returning null
  return null;
}

function cleanup() {
  // No logging in cleanup - cleanup is usually silent
}

const wantsLoop = false;
const description =
  'Clears the display to complete black. Useful for testing, power saving, or as a base scene for custom implementations. No animation or content - just a clean, dark screen.';
const category = 'Utility';
const deviceTypes = ['pixoo64'];
const tags = ['fallback'];

module.exports = {
  name,
  render,
  init,
  cleanup,
  wantsLoop,
  description,
  category,
  deviceTypes,
  tags,
};
