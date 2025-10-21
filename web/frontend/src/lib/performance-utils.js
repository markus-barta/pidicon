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
    // Blue to blue-green (0-100ms)
    return [0, Math.round(255 * (ratio / 0.2)), Math.round(255 * ratio), 255];
  }
  if (ratio <= 0.4) {
    // Blue-green to green (100-200ms)
    const subRatio = (ratio - 0.2) / 0.2;
    return [0, 255, Math.round(128 + 127 * subRatio), 255];
  }
  if (ratio <= 0.6) {
    // Green to yellow-green (200-300ms)
    const subRatio = (ratio - 0.4) / 0.2;
    return [
      Math.round(255 * subRatio),
      255,
      Math.round(255 * (1 - subRatio)),
      255,
    ];
  }
  if (ratio <= 0.8) {
    // Yellow to orange (300-400ms)
    const subRatio = (ratio - 0.6) / 0.2;
    return [255, Math.round(255 * (1 - subRatio)), 0, 255];
  }

  // Orange to red (400-500ms+)
  const subRatio = Math.min(1, (ratio - 0.8) / 0.2);
  return [255, Math.round(128 * (1 - subRatio)), 0, 255];
}

export default {
  getSimplePerformanceColor,
};
