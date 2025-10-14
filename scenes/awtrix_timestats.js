/**
 * @fileoverview Awtrix Time + Home Stats Scene
 * @description Displays current time with home automation status indicators
 * Port of Node-RED function to PIDICON scene format
 * Shows: Time + Door lock + Sliding door + Skylights status
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const name = 'awtrix_timestats';

// Scene metadata
const description = 'Time + Home Stats (Awtrix 32x8)';
const category = 'Home Automation';
const wantsLoop = true; // Updates every second
const deviceTypes = ['awtrix']; // Only for Awtrix/Ulanzi devices

// Color mapping for statuses (from Node-RED code)
const COLORS = Object.freeze({
  OPEN: '#00FF00', // Green
  CLOSED: '#FF0000', // Red
  OPEN_SKYLIGHT: '#00D2FF', // Light Blue
  CLOSED_SKYLIGHT: '#58596d', // Dark Grey
  UNKNOWN: '#FFFF00', // Yellow (fallback)
  TIME_TEXT: '#FFFFD5', // Light yellow for time
});

async function init(ctx) {
  ctx.log('Awtrix timestats scene initialized', 'debug');
}

async function render(ctx) {
  const { device, state } = ctx;

  // Get statuses from state or use defaults
  // In production, these would come from MQTT/HomeAssistant/etc.
  const statuses = getStatuses(state);

  // Get current time
  const timeString = getLocalTimeString();

  // Build draw commands for Awtrix custom app
  const drawArray = buildDrawArray(timeString, statuses);

  // Send draw commands to persistent custom app
  // Awtrix HTTP API uses /api/custom?name=<app> for persistent apps in rotation
  if (device.drawCustom) {
    await device.drawCustom('timestats', {
      draw: drawArray,
      // duration: 5, // Optional: time in rotation before next app
    });
  } else {
    ctx.log('Device does not support custom drawing', 'warning');
  }

  // Update every second for time display
  return 1000;
}

async function cleanup(ctx) {
  const { device } = ctx;

  // Clear display on cleanup
  if (device.clear) {
    await device.clear();
  }

  ctx.log('Awtrix timestats scene cleaned up', 'debug');
}

// ============================================================================
// HELPER FUNCTIONS (Ported from Node-RED code)
// ============================================================================

function getStatuses(state) {
  // Get status colors from state
  // In production, sync these with your home automation system

  // Door lock color (use stored state or fallback)
  const smartlockColor = state.get('home_vr_smartlock_statusColor');
  const doorLockColor =
    smartlockColor && /^#[0-9A-F]{6}$/i.test(smartlockColor)
      ? smartlockColor
      : COLORS.UNKNOWN;

  // Sliding door status
  const slidingDoorClosed = state.get('home_wz_door_te_d_closed');
  const slidingDoorColor = selectColor(
    slidingDoorClosed == null ? null : !slidingDoorClosed,
    COLORS.OPEN,
    COLORS.CLOSED,
  );

  // Skylight VK status
  const skylightVkClosed = state.get('home_vk_window_w13_closed');
  const skylightVkColor = selectColor(
    skylightVkClosed == null ? null : !skylightVkClosed,
    COLORS.OPEN_SKYLIGHT,
    COLORS.CLOSED_SKYLIGHT,
  );

  // Skylight VR status
  const skylightVrClosed = state.get('home_vr_window_w14_closed');
  const skylightVrColor = selectColor(
    skylightVrClosed == null ? null : !skylightVrClosed,
    COLORS.OPEN_SKYLIGHT,
    COLORS.CLOSED_SKYLIGHT,
  );

  return {
    doorLockColor,
    slidingDoorColor,
    skylightVkColor,
    skylightVrColor,
    slidingDoorOpen: slidingDoorColor === COLORS.OPEN,
  };
}

function selectColor(
  condition,
  colorTrue,
  colorFalse,
  colorUnknown = COLORS.UNKNOWN,
) {
  return condition == null ? colorUnknown : condition ? colorTrue : colorFalse;
}

function getLocalTimeString() {
  return new Date().toLocaleTimeString('de-AT', {
    timeZone: 'Europe/Vienna',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function buildDrawArray(timeString, statuses) {
  const {
    doorLockColor,
    slidingDoorColor,
    skylightVkColor,
    skylightVrColor,
    slidingDoorOpen,
  } = statuses;

  // Awtrix draw commands format:
  // dt - draw text: {dt: [x, y, text, color]}
  // dl - draw line: {dl: [x1, y1, x2, y2, color]}
  // dr - draw rectangle: {dr: [x, y, width, height, color]}

  const drawArray = [
    // Time text (centered at top)
    { dt: [3, 0, timeString, COLORS.TIME_TEXT] },

    // Door lock indicator (right side)
    { dl: [29, 7, 31, 7, doorLockColor] },

    // Skylights (top rectangles)
    { dr: [14, 6, 2, 2, skylightVkColor] }, // VK skylight
    { dr: [17, 6, 2, 2, skylightVrColor] }, // VR skylight

    // Sliding door indicators (bottom left)
    // Two segments that shift when door is open
    {
      dl: [
        1 + (slidingDoorOpen ? -1 : 0),
        7,
        3 + (slidingDoorOpen ? -1 : 0),
        7,
        slidingDoorColor,
      ],
    },
    { dl: [4, 7, 6, 7, slidingDoorColor] },
  ];

  return drawArray;
}

// ============================================================================
// MQTT INTEGRATION EXAMPLE (for updating statuses)
// ============================================================================
// To update statuses from MQTT/HomeAssistant, add this to your daemon:
//
// mqttClient.on('message', (topic, message) => {
//   if (topic === 'home/vr/smartlock/statusColor') {
//     stateStore.setSceneState(deviceIp, 'awtrix_timestats', 'home_vr_smartlock_statusColor', message.toString());
//   }
//   // Add more topics as needed...
// });

module.exports = {
  name,
  description,
  category,
  wantsLoop,
  deviceTypes,
  init,
  render,
  cleanup,
};
