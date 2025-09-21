/**
 * @fileoverview Power Price Scene - Professional Power Price Renderer
 * @description Comprehensive electricity pricing dashboard displaying real-time prices,
 * PV generation, battery status, weather data, and animated digital clock optimized
 * for 64x64 pixel displays with professional rendering quality.
 * @mqtt
 * mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"power_price","powerPriceData":{"data":{"2025-01-20-08":{"currentCentPrice":12.5},"2025-01-20-09":{"currentCentPrice":15.2},"2025-01-20-10":{"currentCentPrice":18.7},"2025-01-20-11":{"currentCentPrice":22.1},"2025-01-20-12":{"currentCentPrice":25.5},"2025-01-20-13":{"currentCentPrice":28.9},"2025-01-20-14":{"currentCentPrice":24.7},"2025-01-20-15":{"currentCentPrice":21.3},"2025-01-20-16":{"currentCentPrice":18.0},"2025-01-20-17":{"currentCentPrice":15.5},"2025-01-20-18":{"currentCentPrice":13.2},"2025-01-20-19":{"currentCentPrice":11.8},"2025-01-20-20":{"currentCentPrice":10.5},"2025-01-20-21":{"currentCentPrice":9.8},"2025-01-20-22":{"currentCentPrice":9.2},"2025-01-20-23":{"currentCentPrice":8.9},"2025-01-20-00":{"currentCentPrice":8.5},"2025-01-20-01":{"currentCentPrice":8.2},"2025-01-20-02":{"currentCentPrice":8.0},"2025-01-20-03":{"currentCentPrice":7.8},"2025-01-20-04":{"currentCentPrice":7.6},"2025-01-20-05":{"currentCentPrice":7.5},"2025-01-20-06":{"currentCentPrice":8.1},"2025-01-20-07":{"currentCentPrice":10.3}}},"currentCentPrice":24.7,"dailyPvDataActual":[800,1200,1600,2000,2400,2800,2400,2000,1600,1200,800,400,200,100,50,25,10,5,0,0,0,0,0,0],"pvHourlyYieldPrediction":[900,1300,1700,2100,2500,2900,2500,2100,1700,1300,900,500,300,150,75,35,15,8,0,0,0,0,0,0],"batteryStatus":{"USOC":75,"BatteryCharging":false,"BatteryDischarging":true},"uviData":{"currentUvi":[null,6.5,7.2]},"enableAnimation":true}'
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const SunCalc = require('suncalc');

const { drawVerticalGradientLine } = require('../lib/gradient-renderer');
const logger = require('../lib/logger');
const { drawText } = require('../lib/rendering-utils');
const {
  BaseSceneState,
  FrameCounter,
  SceneUtils,
} = require('../lib/scene-base');

// Scene configuration - migrated from DisplayConfig
const SCENE_CONFIG = {
  DEBUG: false,
  DIMENSIONS: { WIDTH: 64, HEIGHT: 64 },

  // Grid configuration for power price chart
  GRID_ZERO_LINE_Y: 53,
  FLOW_ANI_INDEX_MAX: 20,

  // Time-based layout shifts
  AFTERNOON_SHIFT_PX: 24,

  // Chart configurations
  CHART: {
    PV: {
      PREDICTION: {
        position: [14, 10],
        size: [50, 10],
        color: [5, 5, 0, 245],
      },
      ACTUAL: {
        position: [12, 10],
        size: [50, 10],
        colors: {
          start: [255, 255, 0, 255],
          end: [255, 255, 0, 255],
        },
        alpha: { min: 25, max: 255 },
      },
    },
    POWER_PRICE: {
      position: [12, 52], // Top-left position FOR DRAWING BARS
      maxHeight: 20,
      BLINK: {
        MAX_ALPHA: 255,
        MIN_ALPHA: 125,
      },
      GRID: {
        startPos: [12, 23], // Top-left corner [x, y]
        endPos: [60, 53], // Bottom-right corner [x, y]
        overhang: 2,
        horizontal: {
          count: 4,
          color: [125, 125, 125, 155],
          minAlpha: 50,
          alphaRange: 80,
        },
        vertical: {
          count: 5,
          color: [125, 125, 125, 70],
        },
      },
      colors: {
        pastHours: { start: [75, 5, 5, 80], end: [225, 75, 75, 100] },
        currentHour: { start: [100, 100, 100, 200], end: [255, 255, 255, 220] },
        futureHours: { start: [75, 5, 5, 200], end: [225, 75, 75, 220] },
        cheapHours: {
          past: { start: [0, 75, 0, 100], end: [0, 230, 0, 100] },
          future: { start: [0, 75, 0, 200], end: [0, 200, 0, 200] },
        },
        negative: [0, 255, 0, 255],
        overflow: [255, 0, 0, 255],
      },
      ZERO_LINE_MARKER: {
        enabled: true,
        color: [0, 0, 0, 90],
        pastAlpha: 70,
      },
      CURRENT_HOUR_INDICATOR: {
        enabled: true,
        color: [255, 255, 255, 220],
      },
      settings: {
        maxHoursToDraw: 26,
        zeroThreshold: 0.005,
      },
    },
  },

  // Image assets configuration
  IMAGES: {
    PRICE_BACKGROUND: {
      path: 'scenes/media/header-price-bg-10px.png',
      dimensions: [64, 10],
      position: [0, 0],
    },
    PV_BACKGROUND: {
      path: 'scenes/media/header-pv-bg.png',
      dimensions: [64, 10],
      position: [0, 10],
    },
    BATTERY: {
      path: 'scenes/media/battery-icon.png',
      dimensions: [13, 6],
      position: [26, 2],
      alpha: 250,
      fillframe: [1, 1, 10, 3],
    },
    CENT_SIGN: {
      path: 'scenes/media/cent-sign.png',
      dimensions: [4, 5],
      position: [56, 2],
      alpha: 250,
    },
    KWH_UNIT: {
      path: 'scenes/media/kWh-black.png',
      dimensions: [11, 4],
      position: [13, 13],
      alpha: 250,
    },
    SUN: {
      path: 'scenes/media/sun.png',
      dimensions: [9, 9],
      position: [32, 19],
      alpha: 225,
    },
    MOON: {
      path: 'scenes/media/moon.png',
      dimensions: [5, 5],
      position: [58, 21],
      alpha: 225,
    },
    CHARGE_LIGHTNING: {
      path: 'scenes/media/charge-lightning.png',
      position: [38, 2],
      dimensions: [6, 6],
    },
    DISCHARGE_LIGHTNING: {
      path: 'scenes/media/discharge-lightning.png',
      position: [21, 2],
      dimensions: [6, 6],
    },
  },

  // Clock configuration
  CLOCK: {
    positions: { hour: [5, 2], separator: [12, 2], minute: [15, 2] },
    color: [255, 255, 255, 110],
    separator: {
      baseAlpha: 110,
      minAlpha: 25,
      maxAlpha: 110,
      fadeDelta: 10,
    },
    shadow: {
      enabled: true,
      offset: 1,
      color: [0, 0, 0, 175],
    },
  },

  // Text elements configuration
  TEXTS: {
    PRICE: { position: [56, 2], color: [255, 255, 255, 255] },
    PV_TOTAL: { position: [11, 13], color: [255, 255, 0, 100] },
    PV_PREDICTION_TOTAL: { position: [62, 13], color: [5, 5, 5, 255] },
    LABEL0: { position: [9, 51], color: [155, 155, 155, 250], text: '0' },
    LABEL10: { position: [9, 41], color: [155, 155, 155, 220], text: '10' },
    LABEL20: { position: [9, 31], color: [155, 155, 155, 190], text: '20' },
    LABEL_MORE: { position: [5, 21], color: [155, 155, 155, 160], text: '+' },
    UVI: { position: [42, 20], color: [148, 0, 211, 200] }, // UV index position
  },

  // Animation configuration
  NEGATIVE_PRICES: {
    PAST_ALPHA_PERCENT: 40,
  },
};

/**
 * Power Price Scene - Professional power price display with PV, battery, and weather data
 * Migrated from Node-RED POWER_PRICE_RENDERER function node
 */
async function render(context) {
  // Validate context
  if (!SceneUtils.validateContext(context, 'power_price')) {
    return null;
  }

  const {
    device,
    state, // eslint-disable-line no-unused-vars
    payload,
    getState,
    setState,
    publishOk,
    loopDriven: _loopDriven, // eslint-disable-line no-unused-vars
  } = context;

  try {
    // Get configuration from payload or use defaults
    const config = SceneUtils.getConfig(payload, {
      // External data sources - these would normally come from global.get()
      powerPriceData: null,
      currentCentPrice: null,
      dailyPvDataActual: null,
      pvHourlyYieldPrediction: null,
      batteryStatus: null,
      uviData: null,
      localTimeData: null,
      moonPhaseData: null,

      // Configuration options
      enableDebug: false,
      enableAnimation: true,
      frames: null, // null for continuous, number for limited frames
    });

    // Initialize state if not running
    if (!getState('isRunning')) {
      const state = new BaseSceneState(getState, setState);
      state.reset({
        animationIndex: 0,
        clockFadeAlpha: SCENE_CONFIG.CLOCK.separator.baseAlpha,
        clockFadeDirection: 1,
        lastRenderTime: Date.now(),
      });
      logger.ok(`🎬 [POWER_PRICE] Starting scene`);
    }

    // Get current time info (normally from global.get('suncalc') and time functions)
    const timeInfo = getTimeInfo(config);

    // Apply afternoon layout shift if needed
    applyAfternoonShift(timeInfo.isAfterNoon);

    // Render all components
    await renderBackground(device);
    await renderGrid(device);
    await renderImages(device, timeInfo);
    await renderClock(device, config);
    await renderBattery(device, config);
    await renderPriceText(device, config);
    await renderPvData(device, config);
    await renderUviText(device, config, timeInfo);
    await renderPowerPriceChart(device, config, timeInfo);

    // Push the rendered frame to the device
    await device.push('power_price', publishOk);

    // Animation is now time-based, no need to track frame index

    // Handle frame counting
    const frameCounter = new FrameCounter(getState, setState);
    const framesPushed = frameCounter.incrementPushed();

    // Check if we should continue based on frame limit
    if (!frameCounter.shouldContinue(config.frames)) {
      logger.ok(`🏁 [POWER_PRICE] Completed after ${framesPushed} frames`);
      return null;
    }

    // Continue rendering
    return config.interval || 1000; // Default 1 second interval
  } catch (error) {
    return SceneUtils.createErrorResponse(error, 'power_price', {
      device: device?.host,
      frametime: device?.getMetrics?.()?.lastFrametime || 0,
    });
  }
}

/**
 * Get current time information (simulating global time functions)
 */
function getTimeInfo(config) {
  const currentDate = new Date();

  // Simulate isDaytime function
  const isDaytime = config.localTimeData?.isDaytime !== false;

  return {
    currentDate,
    isAfterNoon: currentDate.getHours() >= 12,
    isDaytime,
    seconds: currentDate.getSeconds(),
    hour: currentDate.getHours(),
    minute: currentDate.getMinutes(),
  };
}

/**
 * Calculate moon phase filename based on SunCalc
 */
function getMoonPhaseFilename(date = new Date()) {
  // Coordinates for calculation (Graz, Austria) - Adjust if needed
  const lat = 47.07;
  const lng = 15.44;

  try {
    // Calculate moon illumination details
    const moonIllumination = SunCalc.getMoonIllumination(date, lat, lng);
    const phaseValue = moonIllumination.phase; // Phase: 0=New, 0.5=Full, 1=New

    // Phase calculation: shift so 0 = Full moon, 0.5 = New moon
    const shiftedPhase = (phaseValue + 0.5) % 1.0;
    // Map shifted phase to index 0-25
    let imageIndex = Math.round(shiftedPhase * 25);
    // Ensure index stays in range 0-25
    imageIndex = Math.max(0, Math.min(25, imageIndex));

    // Format the index with leading zero (e.g., 5 -> "05")
    const formattedPhase = imageIndex.toString().padStart(2, '0');
    const imagePath = `scenes/media/moonphase/5x5/Moon_${formattedPhase}.png`;
    logger.debug(
      `Moon phase: ${phaseValue.toFixed(2)}, Index: ${imageIndex}, Path: ${imagePath}`,
    );
    return imagePath;
  } catch (error) {
    logger.warn('Error calculating moon phase: ' + error.message);
    return 'scenes/media/moon.png'; // Fallback to static moon
  }
}

/**
 * Apply afternoon layout shift to all configurations
 */
function applyAfternoonShift(isAfterNoon) {
  if (!isAfterNoon) return;

  const shift = SCENE_CONFIG.AFTERNOON_SHIFT_PX;

  // Shift PV chart positions
  SCENE_CONFIG.CHART.PV.PREDICTION.position[0] -= shift;
  SCENE_CONFIG.CHART.PV.ACTUAL.position[0] -= shift;

  // Shift image positions
  SCENE_CONFIG.IMAGES.KWH_UNIT.position[0] -= shift;
  SCENE_CONFIG.IMAGES.SUN.position[0] -= shift;
  SCENE_CONFIG.IMAGES.MOON.position[0] -= shift;

  // Shift text positions
  SCENE_CONFIG.TEXTS.PV_TOTAL.position[0] -= shift;
  SCENE_CONFIG.TEXTS.PV_PREDICTION_TOTAL.position[0] -= shift;
  SCENE_CONFIG.TEXTS.UVI.position[0] -= shift;
}

/**
 * Render static background images
 */
async function renderBackground(device) {
  const images = [
    SCENE_CONFIG.IMAGES.PRICE_BACKGROUND,
    SCENE_CONFIG.IMAGES.PV_BACKGROUND,
    SCENE_CONFIG.IMAGES.BATTERY,
    SCENE_CONFIG.IMAGES.CENT_SIGN,
    SCENE_CONFIG.IMAGES.KWH_UNIT,
    SCENE_CONFIG.IMAGES.SUN,
  ];

  for (const image of images) {
    if (image.path) {
      try {
        await device.drawImageWithAlpha(
          image.path,
          image.position,
          image.dimensions,
          image.alpha || 255,
        );
      } catch (error) {
        logger.debug(`Error rendering image ${image.path}: ${error.message}`);
      }
    }
  }
}

/**
 * Render background grid lines
 */
async function renderGrid(device) {
  const grid = SCENE_CONFIG.CHART.POWER_PRICE.GRID;

  // Draw horizontal lines with opacity gradient
  for (let i = 0; i < grid.horizontal.count; i++) {
    const y =
      grid.startPos[1] +
      i *
        Math.floor(
          (grid.endPos[1] - grid.startPos[1]) / (grid.horizontal.count - 1),
        );
    const alpha = Math.min(
      255,
      grid.horizontal.minAlpha +
        Math.round(
          (i / (grid.horizontal.count - 1)) * grid.horizontal.alphaRange,
        ),
    );
    const color = [...grid.horizontal.color.slice(0, 3), alpha];

    await device.drawLineRgba(
      [grid.startPos[0] - grid.overhang, y],
      [grid.endPos[0] + grid.overhang, y],
      color,
    );
  }

  // Draw vertical lines
  for (let i = 0; i < grid.vertical.count; i++) {
    const x =
      grid.startPos[0] +
      i *
        Math.floor(
          (grid.endPos[0] - grid.startPos[0]) / (grid.vertical.count - 1),
        );

    await device.drawLineRgba(
      [x, grid.startPos[1] - grid.overhang],
      [x, grid.endPos[1] + grid.overhang],
      grid.vertical.color,
    );
  }
}

/**
 * Render clock with blinking separator
 */
async function renderClock(device, config) {
  const timeInfo = getTimeInfo(config);
  const hour = timeInfo.hour.toString().padStart(2, '0');
  const minute = timeInfo.minute.toString().padStart(2, '0');

  // Get current animation state for separator blinking
  const currentTime = Date.now();
  const separatorAlpha = config.enableAnimation
    ? calculateSeparatorAlpha(currentTime)
    : SCENE_CONFIG.CLOCK.separator.baseAlpha;
  const separatorColor = [
    ...SCENE_CONFIG.CLOCK.color.slice(0, 3),
    separatorAlpha,
  ];

  // Render with shadow if enabled
  if (SCENE_CONFIG.CLOCK.shadow.enabled) {
    const shadowOffset = SCENE_CONFIG.CLOCK.shadow.offset;
    const shadowColor = SCENE_CONFIG.CLOCK.shadow.color;

    await drawText(
      device,
      hour,
      [
        SCENE_CONFIG.CLOCK.positions.hour[0],
        SCENE_CONFIG.CLOCK.positions.hour[1] + shadowOffset,
      ],
      shadowColor,
      'left',
    );
    await drawText(
      device,
      ':',
      [
        SCENE_CONFIG.CLOCK.positions.separator[0],
        SCENE_CONFIG.CLOCK.positions.separator[1] + shadowOffset,
      ],
      [...shadowColor.slice(0, 3), Math.min(separatorAlpha, shadowColor[3])],
      'left',
    );
    await drawText(
      device,
      minute,
      [
        SCENE_CONFIG.CLOCK.positions.minute[0],
        SCENE_CONFIG.CLOCK.positions.minute[1] + shadowOffset,
      ],
      shadowColor,
      'left',
    );
  }

  // Render main clock
  await drawText(
    device,
    hour,
    SCENE_CONFIG.CLOCK.positions.hour,
    SCENE_CONFIG.CLOCK.color,
    'left',
  );
  await drawText(
    device,
    ':',
    SCENE_CONFIG.CLOCK.positions.separator,
    separatorColor,
    'left',
  );
  await drawText(
    device,
    minute,
    SCENE_CONFIG.CLOCK.positions.minute,
    SCENE_CONFIG.CLOCK.color,
    'left',
  );
}

/**
 * Calculate separator alpha for blinking effect using time-based animation
 */
function calculateSeparatorAlpha(currentTime) {
  const { minAlpha, maxAlpha } = SCENE_CONFIG.CLOCK.separator;

  // Create a smooth pulsing effect based on time
  // Complete cycle every 2 seconds (1 second fade out, 1 second fade in)
  const cycleTime = 2000; // milliseconds
  const progress = (currentTime % cycleTime) / cycleTime;

  // Use sine wave for smooth transition
  // 0 -> 1 -> 0 over the cycle
  const sineProgress = Math.sin(progress * Math.PI * 2);
  const normalizedProgress = (sineProgress + 1) / 2; // Convert -1,1 to 0,1

  const alpha = minAlpha + (maxAlpha - minAlpha) * normalizedProgress;
  return Math.floor(alpha);
}

/**
 * Render battery indicator with charge/discharge status
 */
async function renderBattery(device, config) {
  const batteryStatus = config.batteryStatus || {};
  const batteryCharge = batteryStatus.USOC || 0;

  // Calculate battery fill
  const batteryConfig = SCENE_CONFIG.IMAGES.BATTERY;
  const baseX = batteryConfig.position[0];
  const baseY = batteryConfig.position[1];
  const fillX = baseX + batteryConfig.fillframe[0];
  const fillY = baseY + batteryConfig.fillframe[1];
  const fillWidth = batteryConfig.fillframe[2];
  const fillHeight = batteryConfig.fillframe[3];
  const totalPixels = fillWidth * fillHeight;
  const pixelsToFill = Math.max(0, (batteryCharge / 100) * totalPixels);
  const fullPixels = Math.floor(pixelsToFill);
  const partialPixelAlpha = Math.max(
    0,
    Math.min(255, Math.floor((pixelsToFill - fullPixels) * 255)),
  );

  // Render battery fill
  const fillColor = [0, 255, 0, 255]; // Green
  let pixelCount = 0;
  let done = false;

  for (let x = 0; x < fillWidth && !done; x++) {
    for (let y = fillHeight - 1; y >= 0 && !done; y--) {
      const currentX = fillX + x;
      const currentY = fillY + y;

      if (pixelCount === fullPixels) {
        if (partialPixelAlpha > 0) {
          const partialColor = [...fillColor.slice(0, 3), partialPixelAlpha];
          await device.drawPixelRgba([currentX, currentY], partialColor);
        }
        done = true;
        break;
      }

      if (pixelCount < fullPixels) {
        await device.drawPixelRgba([currentX, currentY], fillColor);
        pixelCount++;
      } else {
        done = true;
        break;
      }
    }
  }

  // Render charge/discharge indicator with time-based animation
  const currentTime = Date.now();
  // Faster pulsing for battery status (1.5 second cycle)
  const cycleTime = 1500;
  const progress = (currentTime % cycleTime) / cycleTime;
  const sineProgress = Math.sin(progress * Math.PI * 2);
  const normalizedProgress = Math.abs(sineProgress);

  const fadeStartOpacity = 10;
  const fadeMaxOpacity = 255 - fadeStartOpacity;
  const statusImgAlpha = Math.floor(
    fadeStartOpacity + normalizedProgress * fadeMaxOpacity,
  );

  if (batteryStatus.BatteryCharging) {
    await device.drawImageWithAlpha(
      SCENE_CONFIG.IMAGES.CHARGE_LIGHTNING.path,
      SCENE_CONFIG.IMAGES.CHARGE_LIGHTNING.position,
      SCENE_CONFIG.IMAGES.CHARGE_LIGHTNING.dimensions,
      statusImgAlpha,
    );
  } else if (batteryStatus.BatteryDischarging) {
    await device.drawImageWithAlpha(
      SCENE_CONFIG.IMAGES.DISCHARGE_LIGHTNING.path,
      SCENE_CONFIG.IMAGES.DISCHARGE_LIGHTNING.position,
      SCENE_CONFIG.IMAGES.DISCHARGE_LIGHTNING.dimensions,
      statusImgAlpha,
    );
  }
}

/**
 * Render current power price text
 */
async function renderPriceText(device, config) {
  const currentPrice = config.currentCentPrice || 0;

  // Apply same formatting logic as original
  let displayPrice;
  let maxTotalDigits;

  if (Math.abs(currentPrice) < 0.005) {
    displayPrice = 0.0;
    maxTotalDigits = 2;
  } else if (Math.abs(currentPrice) < 10) {
    displayPrice = Math.round(currentPrice * 10) / 10;
    const absPrice = Math.abs(displayPrice);
    const integerPart = Math.floor(absPrice);
    const integerDigits = integerPart.toString().length;
    maxTotalDigits = displayPrice === 0 ? 2 : integerDigits + 1;
  } else {
    displayPrice = Math.round(currentPrice);
    maxTotalDigits = Math.floor(Math.abs(displayPrice)).toString().length;
  }

  await device.drawCustomFloatText(
    displayPrice,
    SCENE_CONFIG.TEXTS.PRICE.position,
    SCENE_CONFIG.TEXTS.PRICE.color,
    'right',
    maxTotalDigits,
  );
}

/**
 * Render PV data (actual and prediction)
 */
async function renderPvData(device, config) {
  const actualData = config.dailyPvDataActual || [];
  const predictionData = config.pvHourlyYieldPrediction || [];

  // Render PV actual bars
  if (actualData.length > 0) {
    const pvConfig = SCENE_CONFIG.CHART.PV.ACTUAL;
    const [startX, startY] = pvConfig.position;
    const chartWidth = pvConfig.size[0];
    const chartHeight = pvConfig.size[1];
    const maxYieldWh = 1000 * chartHeight;

    for (let hourIndex = 0; hourIndex < actualData.length; hourIndex++) {
      const x = startX + hourIndex * 2;
      if (x >= startX + chartWidth) break;

      const value = actualData[hourIndex] || 0;
      if (value <= 0) continue;

      const scaledValue = (value / maxYieldWh) * chartHeight;
      const totalPixels = Math.min(
        chartHeight,
        Math.max(1, Math.ceil(scaledValue)),
      );
      const fullPixels = Math.floor(scaledValue);
      const remainder = scaledValue - fullPixels;

      const lineStartY = startY;
      const lineEndY = startY + totalPixels - 1;

      // Use gradient rendering
      let partialPixelAlpha = undefined;
      if (remainder > 0) {
        partialPixelAlpha = Math.max(
          0,
          Math.min(255, Math.round(remainder * 255)),
        );
      }

      try {
        await drawVerticalGradientLine(
          device,
          [x, lineStartY],
          [x, lineEndY],
          pvConfig.colors.end,
          pvConfig.colors.start,
          partialPixelAlpha,
          'start',
        );
      } catch (error) {
        logger.debug(`Error drawing PV bar at x=${x}: ${error.message}`);
      }
    }
  }

  // Render PV prediction bars
  if (predictionData.length > 0) {
    const pvConfig = SCENE_CONFIG.CHART.PV.PREDICTION;
    const [startX, startY] = pvConfig.position;
    const chartWidth = pvConfig.size[0];
    const chartHeight = pvConfig.size[1];
    const maxPredictionWh = 1000 * chartHeight;

    for (let hourIndex = 0; hourIndex < predictionData.length; hourIndex++) {
      const x = startX + hourIndex * 2;
      if (x >= startX + chartWidth) break;

      const value = predictionData[hourIndex] || 0;
      if (value > 0) {
        const scaledHeight = Math.min(
          chartHeight,
          Math.max(0, (value / maxPredictionWh) * chartHeight),
        );
        const barHeight = Math.round(scaledHeight);

        if (barHeight > 0) {
          const lineStart = [x, startY + chartHeight - barHeight];
          const lineEnd = [x, startY + chartHeight - 1];
          await device.drawLineRgba(lineStart, lineEnd, pvConfig.color);
        }
      }
    }
  }
}

/**
 * Render UVI text next to sun logo
 */
async function renderUviText(device, config, timeInfo) {
  const uviData = config.uviData || {};

  // Check if UVI data is available
  if (
    !uviData?.currentUvi ||
    !Array.isArray(uviData.currentUvi) ||
    typeof uviData.currentUvi[1] !== 'number' ||
    typeof uviData.currentUvi[2] !== 'number'
  ) {
    await drawText(
      device,
      '-',
      SCENE_CONFIG.TEXTS.UVI.position,
      [148, 0, 211, timeInfo.isDaytime ? 200 : 128],
      'left',
    );
    return;
  }

  // Get current and next hour values, rounded to integers
  const currentUvi = Math.round(uviData.currentUvi[1]);
  const nextUvi = Math.round(uviData.currentUvi[2]);

  // Choose arrow direction based on value change
  const arrow = nextUvi > currentUvi ? '↑' : '↓';

  // Format with appropriate arrow
  const uviText = `${currentUvi}${arrow}${nextUvi}`;

  await drawText(
    device,
    uviText,
    SCENE_CONFIG.TEXTS.UVI.position,
    [148, 0, 211, timeInfo.isDaytime ? 200 : 128],
    'left',
  );
}

/**
 * Render power price chart with all the complex logic
 */
async function renderPowerPriceChart(device, config, timeInfo) {
  const priceData = config.powerPriceData || {};
  if (!priceData?.data) {
    logger.debug('Power price data unavailable.');
    return;
  }

  const currentDate = timeInfo.currentDate;
  const currentHourKey = formatHourKey(currentDate);
  const isAfterNoon = timeInfo.isAfterNoon;

  let referenceHour = config.settings?.startFromCurrentHour
    ? currentDate.getHours()
    : isAfterNoon
      ? 12
      : 0;

  const referenceDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    referenceHour,
  );
  const referenceHourKey = formatHourKey(referenceDate);

  // Filter and sort prices
  const relevantPrices = filterAndSortPrices(
    priceData.data,
    referenceHourKey,
    currentHourKey,
    SCENE_CONFIG.CHART.POWER_PRICE.settings.maxHoursToDraw,
  );

  // Render the chart
  await drawPriceChart(device, relevantPrices);
}

/**
 * Format date to hour key string
 */
function formatHourKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
}

/**
 * Filter and sort price data
 */
function filterAndSortPrices(data, referenceKey, currentKey, maxHours) {
  let entries = Object.entries(data)
    .filter(([key]) => key >= referenceKey)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .slice(0, maxHours);

  // Determine cheapest prices
  const allPrices = entries.map(([, hourData]) => hourData.currentCentPrice);
  const validPrices = allPrices.filter((p) => typeof p === 'number');
  const cheapestPrices = [...validPrices].sort((a, b) => a - b).slice(0, 3);

  // Map to final structure
  return entries.map(([key, hourData]) => ({
    key,
    price: hourData.currentCentPrice,
    isCurrent: key === currentKey,
    isPastHour: key < currentKey,
    isAmongCheapest:
      typeof hourData.currentCentPrice === 'number' &&
      cheapestPrices.includes(hourData.currentCentPrice),
  }));
}

/**
 * Draw the complete price chart
 */
async function drawPriceChart(device, prices) {
  const config = SCENE_CONFIG.CHART.POWER_PRICE;
  const xStart = config.position[0];
  const maxPixels = Math.min(
    SCENE_CONFIG.DIMENSIONS.WIDTH - config.position[0],
    config.settings.maxHoursToDraw * 2,
  );

  const zeroLineY = config.position[1] + 1;

  for (let i = 0; i < prices.length; i++) {
    const x = xStart + i * 2;
    if (x >= xStart + maxPixels) break;

    const pricePoint = prices[i] || {};
    const isPastHour = pricePoint.isPastHour ?? false;

    // Draw zero line marker if enabled
    if (config.ZERO_LINE_MARKER?.enabled) {
      await drawZeroLineMarker(device, x, zeroLineY, isPastHour);
    }

    const priceData = extractPriceData(pricePoint, config, prices);

    if (typeof priceData?.price === 'number') {
      await renderPriceBar(device, priceData, config, x);
    }

    // Draw current hour indicator (triangle) if this is the current hour
    if (pricePoint.isCurrent && config.CURRENT_HOUR_INDICATOR?.enabled) {
      await drawCurrentHourIndicator(device, x, config);
    }
  }
}

/**
 * Draw a marker at the zero line position
 */
async function drawZeroLineMarker(device, x, y, isPastHour) {
  const markerConfig = SCENE_CONFIG.CHART.POWER_PRICE.ZERO_LINE_MARKER;
  const baseColor = markerConfig.color;
  const alpha = isPastHour ? markerConfig.pastAlpha : baseColor[3];
  const color = [...baseColor.slice(0, 3), alpha];

  try {
    await device.drawPixelRgba([x, y], color);
  } catch (error) {
    logger.debug(`Zero line marker error at [${x}, ${y}]: ${error.message}`);
  }
}

/**
 * Draw current hour indicator (triangle shape)
 */
async function drawCurrentHourIndicator(device, x, config) {
  const indicatorConfig = config.CURRENT_HOUR_INDICATOR;
  const color = indicatorConfig.color;
  const yOffset = 2;

  // Triangle pointing up: one pixel at top, three pixels at bottom
  const yTip = SCENE_CONFIG.GRID_ZERO_LINE_Y + yOffset + 1;
  const yBase = SCENE_CONFIG.GRID_ZERO_LINE_Y + yOffset + 2;

  try {
    // Top point
    await device.drawPixelRgba([x, yTip], color);
    // Base row (3 pixels)
    await device.drawPixelRgba([x - 1, yBase], color);
    await device.drawPixelRgba([x, yBase], color);
    await device.drawPixelRgba([x + 1, yBase], color);
  } catch (error) {
    logger.debug(`Current hour indicator error at x=${x}: ${error.message}`);
  }
}

/**
 * Extract and process price data for a single bar
 */
function extractPriceData(priceEntry, config, prices) {
  const { price, isCurrent, key, isAmongCheapest } = priceEntry || {};
  const linearCap = config.maxHeight;
  const absoluteCap = 100;
  const actualCurrentKey = prices.find((p) => p.isCurrent)?.key;
  const isPastHour = key < actualCurrentKey;
  const zeroThreshold = config.settings?.zeroThreshold ?? 0.005;
  const bottomY = config.position[1]; // Bottom Y coordinate for bars

  if (price === undefined || price === null || typeof price !== 'number') {
    return {
      price: null,
      isCurrent: false,
      isPastHour,
      isAmongCheapest: false,
      fullPixels: 0,
      remainder: 0,
      isNegative: false,
      negativePixels: [],
      isOverflow: false,
      overflowPixels: [],
      bottomY,
    };
  }

  if (Math.abs(price) < zeroThreshold) {
    return {
      price: 0.0,
      isCurrent,
      isAmongCheapest,
      isPastHour,
      fullPixels: 0,
      remainder: 0,
      isNegative: false,
      negativePixels: [],
      isOverflow: false,
      overflowPixels: [],
      bottomY,
    };
  }

  if (price < 0) {
    const cappedNegativePrice = Math.max(price, -absoluteCap);
    return {
      price: cappedNegativePrice,
      isCurrent,
      isAmongCheapest,
      isPastHour,
      fullPixels: 0,
      remainder: 0,
      isNegative: true,
      negativePixels: calculateNegativePixels(cappedNegativePrice),
      isOverflow: false,
      overflowPixels: [],
      bottomY,
    };
  }

  const cappedPrice = Math.min(price, absoluteCap);
  const linearPixels = Math.min(cappedPrice, linearCap);
  const fullLinearPixels = Math.floor(linearPixels);
  const linearRemainder = linearPixels - fullLinearPixels;
  const overflowPixels = calculateOverflowPixels(cappedPrice, linearCap);

  return {
    price: cappedPrice,
    isCurrent,
    isAmongCheapest,
    isPastHour,
    fullPixels: fullLinearPixels,
    remainder: linearRemainder,
    isOverflow: cappedPrice > linearCap,
    overflowPixels: overflowPixels,
    isNegative: false,
    negativePixels: [],
    bottomY,
  };
}

/**
 * Calculate pixels for negative prices
 */
function calculateNegativePixels(price) {
  if (price >= 0) return [];
  const pixelsNeeded = Math.ceil(Math.abs(price) / 10);
  return Array.from({ length: pixelsNeeded }, (_, index) => ({
    position: index,
  }));
}

/**
 * Calculate pixels for overflow prices
 */
function calculateOverflowPixels(price, linearCap) {
  if (price <= linearCap) return [];
  const overflowAmount = price - linearCap;
  const pixelsNeeded = Math.floor(overflowAmount / 10);
  return Array.from({ length: pixelsNeeded }, (_, index) => ({
    position: index,
  }));
}

/**
 * Render individual price bar
 */
async function renderPriceBar(device, priceData, config, x) {
  const barColors = determineBarColors(priceData, config.colors);

  // Calculate blink state for overflow prices
  const currentTime = Date.now();
  const blinkCycle = 1000; // 1 second cycle (500ms on, 500ms off)
  const blinkProgress = (currentTime % blinkCycle) / blinkCycle;
  const isBlinkOn = blinkProgress < 0.5;

  if (priceData.isNegative) {
    await drawNegativePrice(device, priceData, config, x);
  } else if (
    priceData.fullPixels === 0 &&
    priceData.topPixelAlpha === undefined &&
    !priceData.isNegative
  ) {
    await drawZeroPrice(device, priceData, config, x);
  } else {
    await drawPositiveBar(device, priceData, config, x, barColors, isBlinkOn);
    if (priceData.isOverflow) {
      await drawOverflowPixels(
        device,
        priceData,
        config,
        x,
        barColors,
        isBlinkOn,
      );
    }
  }
}

/**
 * Determine bar colors based on price data
 */
function determineBarColors(priceData, colorConfig) {
  const { isCurrent, isAmongCheapest, isPastHour } = priceData;

  if (isCurrent) {
    return {
      startColor: colorConfig.currentHour.start,
      endColor: colorConfig.currentHour.end,
    };
  }

  if (isAmongCheapest) {
    const tf = isPastHour ? 'past' : 'future';
    return {
      startColor: colorConfig.cheapHours[tf].start,
      endColor: colorConfig.cheapHours[tf].end,
    };
  }

  return {
    startColor: isPastHour
      ? colorConfig.pastHours.start
      : colorConfig.futureHours.start,
    endColor: isPastHour
      ? colorConfig.pastHours.end
      : colorConfig.futureHours.end,
  };
}

/**
 * Draw negative price indicator
 */
async function drawNegativePrice(device, priceData, config, x) {
  const { bottomY, negativePixels, isPastHour } = priceData;
  const baseColor = config.colors.negative;
  const pastAlphaPercent = SCENE_CONFIG.NEGATIVE_PRICES.PAST_ALPHA_PERCENT;
  const pastAlpha = Math.round((pastAlphaPercent / 100) * 255);
  const color = isPastHour ? [...baseColor.slice(0, 3), pastAlpha] : baseColor;

  for (let i = 0; i < negativePixels.length; i++) {
    const pixelY = bottomY + 2 + i * 2;
    await device.drawPixelRgba([x, pixelY], color);
  }
}

/**
 * Draw zero price indicator
 */
async function drawZeroPrice(device, priceData, config, x) {
  const { bottomY, isPastHour } = priceData;
  const baseColor = config.colors.negative;
  const pastAlphaPercent = SCENE_CONFIG.NEGATIVE_PRICES.PAST_ALPHA_PERCENT;
  const pastAlpha = Math.round((pastAlphaPercent / 100) * 255);
  const finalAlpha = isPastHour ? pastAlpha : 255;
  const color = [...baseColor.slice(0, 3), finalAlpha];

  const zeroLineY = bottomY + 1;
  await device.drawPixelRgba([x, zeroLineY], color);
}

/**
 * Draw positive price bar
 */
async function drawPositiveBar(
  device,
  priceData,
  config,
  x,
  barColors,
  isBlinkOn,
) {
  const { bottomY, fullPixels, remainder, isOverflow } = priceData;
  const barHeight = fullPixels;
  const topY = bottomY - barHeight + 1;

  // Calculate top pixel alpha
  let topPixelAlpha = undefined;
  if (remainder > 0) {
    const baseAlpha = calculateTopPixelAlpha(remainder, 0, 255);
    // Apply blinking to top pixel if this is an overflow bar
    if (isOverflow && baseAlpha !== undefined) {
      topPixelAlpha = isBlinkOn ? baseAlpha : config.BLINK.MIN_ALPHA;
    } else {
      topPixelAlpha = baseAlpha;
    }
  }

  await drawVerticalGradientLine(
    device,
    [x, topY],
    [x, bottomY],
    barColors.endColor,
    barColors.startColor,
    topPixelAlpha,
    'start',
  );
}

/**
 * Calculate alpha for the top pixel based on remainder
 */
function calculateTopPixelAlpha(remainder, minAlpha, maxAlpha) {
  if (remainder <= 0) return undefined;
  const cappedRemainder = Math.min(remainder, 1.0);
  const interpolatedAlpha = minAlpha + (maxAlpha - minAlpha) * cappedRemainder;
  return Math.max(0, Math.min(255, Math.round(interpolatedAlpha)));
}

/**
 * Draw overflow pixels
 */
async function drawOverflowPixels(
  device,
  priceData,
  config,
  x,
  barColors,
  isBlinkOn,
) {
  const { bottomY, fullPixels, overflowPixels } = priceData;
  const overflowStartY = bottomY - fullPixels;

  // Apply blinking alpha to overflow pixels
  const overflowAlpha = isBlinkOn
    ? config.BLINK.MAX_ALPHA
    : config.BLINK.MIN_ALPHA;
  const baseColor = config.colors.overflow;
  const color = [...baseColor.slice(0, 3), overflowAlpha];

  for (const pixel of overflowPixels) {
    const positionOffset =
      typeof pixel.position === 'number' ? pixel.position : 0;
    const pixelY = overflowStartY - positionOffset - 1;
    await device.drawPixelRgba([x, pixelY], color);
  }
}

/**
 * Render images that depend on data (like moon phase)
 */
async function renderImages(device, timeInfo) {
  // Update moon image path based on moon phase
  const moonPath = getMoonPhaseFilename(timeInfo.currentDate);
  const moonConfig = SCENE_CONFIG.IMAGES.MOON;

  // Update alpha based on day/night
  const moonAlpha = timeInfo.isDaytime ? 225 : 255;

  try {
    await device.drawImageWithAlpha(
      moonPath,
      moonConfig.position,
      moonConfig.dimensions,
      moonAlpha,
    );
  } catch (error) {
    logger.debug(`Error rendering moon phase: ${error.message}`);
    // Fallback to static moon
    await device.drawImageWithAlpha(
      'scenes/media/moon.png',
      moonConfig.position,
      moonConfig.dimensions,
      moonAlpha,
    );
  }
}

// Scene metadata
const name = 'power_price';
const wantsLoop = true;

function init() {
  logger.debug(`🚀 [POWER_PRICE] Scene initialized`);
}

function cleanup() {
  logger.debug(`🧹 [POWER_PRICE] Scene cleaned up`);
}

// Export scene interface
module.exports = {
  name,
  render,
  init,
  cleanup,
  wantsLoop,
};
