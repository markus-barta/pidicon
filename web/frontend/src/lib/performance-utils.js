const CHART_MIN_FRAMETIME = 1;
const CHART_MAX_FRAMETIME = 500;

/**
 * Frontend-specific copy of the performance colouring utility used in the
 * backend scenes. Keeping the implementation local avoids bundling issues
 * with the Node-only module alias while still ensuring the UI stays in sync
 * with the colour scale used by the daemon.
 *
 * @param {number} frametime Frame time in milliseconds.
 * @returns {[number, number, number, number]} RGBA tuple.
 */
export function getSimplePerformanceColor(frametime) {
  const ratio =
    (frametime - CHART_MIN_FRAMETIME) /
    (CHART_MAX_FRAMETIME - CHART_MIN_FRAMETIME);

  if (ratio <= 0.2) {
    const blend = ratio / 0.2;
    return [0, Math.round(200 * blend), Math.round(255 * blend), 255];
  }
  if (ratio <= 0.4) {
    const blend = (ratio - 0.2) / 0.2;
    return [
      0,
      200 + Math.round(55 * blend),
      Math.round(255 * (1 - blend / 2)),
      255,
    ];
  }
  if (ratio <= 0.6) {
    const blend = (ratio - 0.4) / 0.2;
    return [
      Math.round(60 + 195 * blend),
      255,
      Math.round(180 * (1 - blend)),
      255,
    ];
  }
  if (ratio <= 0.8) {
    const blend = (ratio - 0.6) / 0.2;
    return [255, Math.round(210 * (1 - blend)), 0, 255];
  }

  const blend = Math.min(1, (ratio - 0.8) / 0.2);
  return [255, Math.round(90 * (1 - blend)), 0, 255];
}

export default {
  getSimplePerformanceColor,
};
