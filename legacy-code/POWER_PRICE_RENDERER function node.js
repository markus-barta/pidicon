/**
 * Pixoo Display Controller: POWER_PRICE_RENDERER
 *
 * Controls display operations for a Pixoo device, handling device initialization,
 * mode management, and display operations for power prices and PV data.
 * Uses device.dynamicState for renderer-specific state persistence.
 * 2025-05-02: Added UVI
 * 2025-06-05: Changed UVI value "ceil" to "round"
 *
 * @module PixooDisplayController
 */

// ------------------------------------- DEVICE INITIALIZATION & MANAGER -------------------------------------

// Encapsulates device retrieval and basic validation
const DeviceManager = {
    pixooManager: context.global.PixooManager,
    device: null, // Holds the current PixooDevice instance
    api: null,    // Holds the raw API instance for the device
    targetDeviceHost: null, // Stores the host address for logging/errors

    /**
     * Initializes the manager for the target device specified in the message.
     * @param {object} msg - The incoming Node-RED message object.
     * @throws {Error} If initialization fails (missing host, device not found, API missing).
     * @returns {object} Object containing currentMode, currentAction, and allowedMode for validation.
     */
    initialize(msg) {
        // Get target device host address from the incoming message
        this.targetDeviceHost = msg?.payload?.hostAddress;

        // Validate if the host address was provided
        if (!this.targetDeviceHost) {
            node.status({ fill: "red", shape: "ring", text: "Missing target hostAddress" });
            throw new Error("No target device host address provided in msg.payload.hostAddress");
        }
        //node.log(`Targeting device: ${this.targetDeviceHost}`); // Log target device

        // Get the specific device instance from the manager
        this.device = this.pixooManager.getDevice(this.targetDeviceHost);

        // Validate device instance
        if (!this.device) {
            node.status({ fill: "red", shape: "ring", text: `Device ${this.targetDeviceHost} not found` });
            node.warn(`Pixoo device '${this.targetDeviceHost}' not found in PixooManager. Was it initialized?`);
            throw new Error(`Pixoo device '${this.targetDeviceHost}' not found or not initialized.`);
        }

        // Get API instance and validate
        this.api = this.device.apiInstance;
        if (!this.api) {
            node.status({ fill: "red", shape: "ring", text: `Device ${this.targetDeviceHost} API missing` });
            node.warn(`Pixoo device '${this.targetDeviceHost}' found, but API instance is missing.`);
            throw new Error(`Pixoo device '${this.targetDeviceHost}' API instance is missing.`);
        }

        // Return essential state for checks in main function
        return {
            currentMode: this.device.getMode(),
            currentAction: this.device.getCurrentAction(),
            allowedMode: this.device.constructor.MODES.POWER_PRICE // Mode required for this renderer
        };
    }
};

// ------------------------------------- UTILITIES -------------------------------------
// NOTE: Logger is defined *after* TimeUtils and DisplayConfig to ensure DisplayConfig exists when Logger methods are called.
// TimeUtils is modified to NOT call Logger during initialization phase.

// Time related utility functions
const TimeUtils = {
    getCurrentTimeInfo() {
        // Gets current time details needed for layout adjustments (e.g., afternoon shift)
        const currentDate = new Date();
        // Check if global function isDaytime exists and call it safely
        const isDayTimeResult = context.global.isDaytime ? context.global.isDaytime() : { success: false };
        return {
            currentDate,
            isAfterNoon: currentDate.getHours() >= 12, // Check if current hour is 12 PM or later
            //isAfterNoon: false, // Debug override for testing layout shifts
            isDaytime: isDayTimeResult.success ? isDayTimeResult.isDaytime : true, // Default to daytime if check fails
            seconds: currentDate.getSeconds() // Needed for moon phase calculation (if used)
        };
    },

    getMoonPhaseFilename() {
        // Calculates and returns the filename for the current moon phase image based on suncalc library
        const date = new Date();
        // Get suncalc library from global context
        const suncalc = global.get('suncalc');
        // Check if library and required function exist
        if (!suncalc?.getMoonIllumination) {
            node.warn("SunCalc library or getMoonIllumination not available - using default moon image."); // Use node.warn directly if needed here
            return "/pixoo-media/moon.png"; // Fallback image path
        }

        // Coordinates for calculation (Graz, Austria) - Adjust if needed
        const lat = 47.07;
        const lng = 15.44;

        try {
            // Calculate moon illumination details
            const moonIllumination = suncalc.getMoonIllumination(date, lat, lng);
            const phaseValue = moonIllumination.phase; // Phase: 0=New, 0.5=Full, 1=New

            // --- NEUE BERECHNUNG ---
            // 1. Phase verschieben, sodass 0 = Vollmond, 0.5 = Neumond
            const shifted_phase = (phaseValue + 0.5) % 1.0;
            // 2. Verschobene Phase auf Index 0-25 mappen
            let imageIndex = Math.round(shifted_phase * 25);
            // Sicherstellen, dass der Index im Bereich 0-25 bleibt (obwohl % 1.0 das schon tun sollte)
            imageIndex = Math.max(0, Math.min(25, imageIndex));
            // --- ENDE NEUE BERECHNUNG ---

            // Format the index with a leading zero (e.g., 5 -> "05")
            var formattedPhase = imageIndex.toString().padStart(2, '0');
            const imagePath = `/pixoo-media/moonphase/5x5/Moon_${formattedPhase}.png`;
            // Logger.debug(`Calculated moon phase: ${phaseValue.toFixed(2)}, Index: ${imageIndex}, Path: ${imagePath}`); // Debug log removed during init fix
            return imagePath;

        } catch (suncalcError) {
            // Log error if suncalc fails
            node.warn("Error calculating moon phase: " + suncalcError.message);
            return "/pixoo-media/moon.png"; // Return fallback path on error
        }
    }
};

// Logger utility for debug messages and setting node status
// Defined after DisplayConfig to ensure DisplayConfig.DEBUG is available
const Logger = {
    debug(message) {
        // Only log if debugging is enabled in DisplayConfig
        // This check now happens safely *after* DisplayConfig is defined.
        if (!DisplayConfig?.DEBUG) return; // Safety check DisplayConfig existence
        // Include device host in debug messages for clarity when managing multiple devices
        node.warn(`[Pixoo:${DeviceManager.targetDeviceHost || 'Unknown'}] ${message}`);
    },

    setStatus(text, type = "success") {
        // Sets the Node-RED node status with timestamp
        let hrTime = "Time unavailable";
        try {
            // Safely get local time from global context function
            const timeInfo = context.global.getLocalTime ? context.global.getLocalTime() : null;
            hrTime = timeInfo?.data?.strings?.time || hrTime; // Use fallback if time unavailable
        } catch (timeError) {
            node.warn("Failed to get local time for status: " + timeError.message);
        }
        const status = {
            text: `${text} 🕒 ${hrTime}`, // Message + Timestamp
            fill: type === "error" ? "red" : type === "warning" ? "yellow" : "green", // Color indicates status type
            shape: type === "success" ? "dot" : "ring" // Shape indicates status type (ring for errors/warnings)
        };
        node.status(status); // Update the node status display
    }
};


// ------------------------------------- CONFIGURATION -------------------------------------

// Y-coordinate for the zero line on the power price chart
const GRID_ZERO_LINE_Y = 53;

// --- Animation control using dynamicState ---
const FLOW_ANI_INDEX_MAX = 20; // Max index for shared animations (like battery indicator fade)

// Constants used in DisplayConfig
const SONNEN_STATUS = global.get("home/ke/sonnenbattery/status") || {};
const SONNEN_CAPACITY_KWH_USOC_PERCENT = SONNEN_STATUS.USOC || 0;

// Main display configuration object, defined *after* TimeUtils as it calls TimeUtils during definition
const DisplayConfig = {
    DEBUG: true, // Enable/disable debug logging via Logger.debug
    DEBUG_LARGE_VALUES: false, // Debug flag for testing price chart scaling
    DEBUG_NEGATIVE_VALUES: false, // Debug flag for testing negative price rendering
    DIMENSIONS: { WIDTH: 64, HEIGHT: 64 }, // Display dimensions
    MEDIA_PATH: "/pixoo-media/", // Base path for image assets

    NEGATIVE_PRICES: {
        PAST_ALPHA_PERCENT: 40, // Alpha transparency (0-100) for negative price bars AND zero-line markers in the past
    },

    CHART: { // Chart configurations
        PV: { // PV Chart specific settings
            PREDICTION: {
                // Position shifts left by 24px in the afternoon
                position: TimeUtils.getCurrentTimeInfo().isAfterNoon ? [14 - 24, 10] : [14, 10],
                size: [50, 10], // Width, Height of prediction chart area
                color: [5, 5, 0, 245] // Color for prediction bars
            },
            ACTUAL: {
                // Position shifts left by 24px in the afternoon
                position: TimeUtils.getCurrentTimeInfo().isAfterNoon ? [12 - 24, 10] : [12, 10],
                size: [50, 10], // Width, Height of actual chart area
                colors: { // Gradient colors for actual bars (currently solid yellow)
                    start: [255, 255, 0, 255],
                    end: [255, 255, 0, 255]
                },
                alpha: { // Alpha range for blending the top pixel of actual bars
                    min: 25,
                    max: 255
                }
            }
        },

        POWER_PRICE: { // Power Price Chart specific settings
            position: [12, GRID_ZERO_LINE_Y - 1], // Top-left position FOR DRAWING BARS (y relative to zero line)
            maxHeight: 20, // Max height in pixels for linear price representation (before overflow)
            BLINK: { // Settings for blinking effect on certain price bars
                MAX_ALPHA: 255, // Alpha when 'on'
                MIN_ALPHA: 125, // Alpha when 'off'
            },

            GRID: { // Configuration for the background grid lines
                startPos: [12, GRID_ZERO_LINE_Y - 30],  // Top-left corner [x, y]
                endPos: [60, GRID_ZERO_LINE_Y],    // Bottom-right corner [x, y]
                overhang: 2,         // How many pixels lines extend beyond start/end
                horizontal: {
                    count: 4,        // Number of horizontal lines
                    color: [125, 125, 125, 155],
                    minAlpha: 50,  // Alpha for the top line (low visibility)
                    alphaRange: 80, // Range of alpha values (top line = minAlpha, bottom line = minAlpha + alphaRange)
                },
                vertical: {
                    count: 5,        // Number of vertical lines
                    color: [125, 125, 125, 70]
                },
                spacing: { // Calculated spacing, cached here
                    xDelta: null,
                    yDelta: null
                }
            },

            ZERO_LINE_MARKER: { // Configuration for the marker dot on the zero line <<< ADDED CONFIG SECTION
                enabled: true, // Easily turn it on/off
                color: [0, 0, 0, 90], // Black, semi-transparent
                pastAlpha: 70,
            },

            CURRENT_HOUR_INDICATOR: { 
                enabled: true,             // Toggle the indicator on/off
                color: [255, 255, 255, 220] // Default: White, slightly transparent, same as colors.currentHour.end
            },

            // NOTE: For gradients, startColor is at the top (y1), endColor is at the bottom (y2)
            // Swap these if you want the gradient direction reversed visually.
            colors: {
                pastHours: { start: [75, 5, 5, 80], end: [225, 75, 75, 100] },
                currentHour: { start: [100, 100, 100, 200], end: [255, 255, 255, 220] },
                futureHours: { start: [75, 5, 5, 200], end: [225, 75, 75, 220] },
                cheapHours: {
                    past: { start: [0, 75, 0, 100], end: [0, 230, 0, 100] },
                    future: { start: [0, 75, 0, 200], end: [0, 200, 0, 200] }
                },
                negative: [0, 255, 0, 255],    // Base color for negative prices (e.g., green) AND zero-price dots
                overflow: [255, 0, 0, 255]     // Base color for overflow (>20ct) prices (e.g., red)
            },
            settings: { // General settings for price chart drawing logic
                startFromCurrentHour: false, // If false, chart starts at midnight (or noon if afternoon)
                maxHoursToDraw: 26, // Limit number of hourly bars to attempt drawing
                zeroThreshold: 0.005 // consider as 0 if abs(value) is this low
            }
        }
    },

    IMAGES: { // Image asset definitions
        PRICE_BACKGROUND: { path: "/pixoo-media/header-price-bg-10px.png", dimensions: [64, 10], position: [0, 0] },
        PV_BACKGROUND: { path: "/pixoo-media/header-pv-bg.png", dimensions: [64, 10], position: [0, 10] },
        //LIGHTNING: { path: "/pixoo-media/energy-lightning.png", dimensions: [5, 5], position: [30, 2], alpha: 150 }, // Unused?
        BATTERY: { path: "/pixoo-media/battery-icon.png", dimensions: [13, 6], position: [26, 2], alpha: 250, fillframe: [1, 1, 10, 3] }, // fillframe: [x, y, w, h] relative to position
        CENT_SIGN: { path: "/pixoo-media/cent-sign.png", dimensions: [4, 5], position: [56, 2], alpha: 250 },
        KWH_UNIT: { path: "/pixoo-media/kWh-black.png", dimensions: [11, 4], position: TimeUtils.getCurrentTimeInfo().isAfterNoon ? [52, 13] : [13, 13], alpha: 250 }, // Position shifts afternoon
        SUN: { path: "/pixoo-media/sun.png", dimensions: [9, 9], position: TimeUtils.getCurrentTimeInfo().isAfterNoon ? [32 - 24, 19] : [32, 19], alpha: TimeUtils.getCurrentTimeInfo().isDaytime ? 225 : 128 }, // Alpha changes day/night
        MOON: { path: TimeUtils.getMoonPhaseFilename(), dimensions: [5, 5], position: TimeUtils.getCurrentTimeInfo().isAfterNoon ? [58 - 24, 21] : [58, 21], alpha: TimeUtils.getCurrentTimeInfo().isDaytime ? 225 : 255 }, // Dynamic path, Alpha changes day/night
        CHARGE_LIGHTNING: { path: "/pixoo-media/charge-lightning.png", position: [38, 2], dimensions: [6, 6] }, // For battery icon
        DISCHARGE_LIGHTNING: { path: "/pixoo-media/discharge-lightning.png", position: [21, 2], dimensions: [6, 6] } // For battery icon
    },

    CLOCK: { // Clock display settings
        positions: { hour: [5, 2], separator: [12, 2], minute: [15, 2] },
        color: [255, 255, 255, 110], // Base color for clock text (semi-transparent white)
        separator: { // Settings for the blinking ':' separator
            baseAlpha: 110, // Base alpha (unused if fading)
            minAlpha: 25,   // Minimum alpha for fade effect
            maxAlpha: 110,  // Maximum alpha for fade effect
            fadeDelta: 10   // Amount alpha changes per step/frame
        },
        shadow: { // Settings for clock text shadow
            enabled: true,
            offset: 1,  // Vertical offset in pixels
            color: [0, 0, 0, 175]  // Shadow color (semi-transparent black)
        }
    },

    TEXTS: { // Text element configurations
        PRICE: { position: [56, 2], color: [255, 255, 255, 255] }, // Current price text
        PV_TOTAL: { position: TimeUtils.getCurrentTimeInfo().isAfterNoon ? [38, 13] : [11, 13], color: [255, 255, 0, 100] }, // Actual PV total text (position shifts)
        PV_PREDICTION_TOTAL: { position: TimeUtils.getCurrentTimeInfo().isAfterNoon ? [50, 13] : [62, 13], color: [5, 5, 5, 255] }, // Predicted PV total text (position shifts)
        // Labels for the price chart Y-axis
        LABEL0: { position: [9, GRID_ZERO_LINE_Y - 2], color: [155, 155, 155, 250], text: '0' },
        LABEL10: { position: [9, GRID_ZERO_LINE_Y - 12], color: [155, 155, 155, 220], text: '10' },
        LABEL20: { position: [9, GRID_ZERO_LINE_Y - 22], color: [155, 155, 155, 190], text: '20' },
        LABEL_MORE: { position: [5, GRID_ZERO_LINE_Y - 32], color: [155, 155, 155, 160], text: '+' }, // Indicator for prices > 20
        // UVI text next to sun logo
        UVI: { position: TimeUtils.getCurrentTimeInfo().isAfterNoon ? [32 - 24 + 11, 19 + 2] : [32 + 11, 19 + 2], // x: sun.x + sun.width, y: sun.y + 1
               color: [148, 0, 211, TimeUtils.getCurrentTimeInfo().isDaytime ? 200 : 128]}, // Neon violet, alpha varies by daytime
    },
}; // End DisplayConfig


// ------------------------------------- DRAWING UTILITIES -------------------------------------

const DrawingUtils = {

    /**
     * Draws a vertical line with a gradient color, handling different Y-coordinate orders.
     * Optionally applies a specific alpha value (`pixelAlpha`) to the pixel corresponding
     * to either the conceptual `startPoint` or `endPoint`, controlled by `alphaTarget`.
     * The gradient always runs from `startColor` (at `startPoint`) to `endColor` (at `endPoint`).
     *
     * @param {object} device - The PixooDevice instance for drawing.
     * @param {Array<number>} startPoint - [x, y] coordinates for the conceptual start of the line & gradient.
     * @param {Array<number>} endPoint - [x, y] coordinates for the conceptual end of the line & gradient.
     * @param {Array<number>} startColor - RGBA color associated with startPoint.
     * @param {Array<number>} endColor - RGBA color associated with endPoint.
     * @param {number | undefined} pixelAlpha - Specific alpha (0-255) to apply to the target pixel.
     * @param {'start' | 'end'} [alphaTarget='start'] - Specifies whether pixelAlpha conceptually belongs to the 'startPoint' or 'endPoint'.
     */
    async drawVerticalGradientLine(device, startPoint, endPoint, startColor, endColor, pixelAlpha, alphaTarget = 'start') {
        // --- Original input values ---
        const [x, inputStartY] = startPoint;
        const [, inputEndY] = endPoint;
        const inputStartColor = startColor; // Color conceptually linked to startPoint
        const inputEndColor = endColor;     // Color conceptually linked to endPoint

        // --- Determine physical top/bottom and associated conceptual colors ---
        let physicalTopY, physicalBottomY;
        let colorAtPhysicalTop, colorAtPhysicalBottom;

        if (inputStartY <= inputEndY) { // Conceptual start is at or above conceptual end (usually drawing physically top-down)
            physicalTopY = inputStartY;
            physicalBottomY = inputEndY;
            colorAtPhysicalTop = inputStartColor;
            colorAtPhysicalBottom = inputEndColor;
        } else { // Conceptual start is below conceptual end (usually drawing physically bottom-up)
            physicalTopY = inputEndY;           // Physical top is the conceptual end point
            physicalBottomY = inputStartY;      // Physical bottom is the conceptual start point
            colorAtPhysicalTop = inputEndColor; // Color at physical top is conceptually the end color
            colorAtPhysicalBottom = inputStartColor; // Color at physical bottom is conceptually the start color
        }

        // --- Determine target Y and base color for special alpha based on ORIGINAL inputs and alphaTarget ---
        const targetY = alphaTarget === 'end' ? inputEndY : inputStartY;
        const targetColorForAlphaBase = alphaTarget === 'end' ? inputEndColor : inputStartColor;

        const length = physicalBottomY - physicalTopY + 1; // Total physical pixels

        // --- Draw the line pixel by pixel from physical top to bottom ---
        for (let i = 0; i < length; i++) {
            const currentY = physicalTopY + i; // Current Y coordinate being drawn

            try {
                // --- Check if current pixel is the target for special alpha ---
                const useSpecialAlpha = typeof pixelAlpha === 'number' && pixelAlpha >= 0 && pixelAlpha <= 255;

                if (useSpecialAlpha && currentY === targetY) {
                    // Apply the specified pixelAlpha to the target conceptual color's RGB
                    if (!Array.isArray(targetColorForAlphaBase) || targetColorForAlphaBase.length < 3) {
                        Logger.debug(`Invalid targetColorForAlphaBase for alpha blend: ${JSON.stringify(targetColorForAlphaBase)}`);
                        continue; // Skip this pixel if base color is invalid
                    }
                    const finalAlpha = Math.max(0, Math.min(255, Math.round(pixelAlpha)));
                    const specialColor = [...targetColorForAlphaBase.slice(0, 3), finalAlpha];
                    await device.drawPixelRgba([x, currentY], specialColor);
                    continue; // Skip normal gradient calculation for this pixel
                }
                // --- End Special Alpha Check ---

                // --- Calculate interpolated color for normal gradient pixels ---
                const factor = (length > 1) ? i / (length - 1) : 0; // 0 at physical top, 1 at physical bottom

                // Ensure the determined physical endpoint colors are valid
                if (!Array.isArray(colorAtPhysicalTop) || !Array.isArray(colorAtPhysicalBottom) || colorAtPhysicalTop.length < 3 || colorAtPhysicalBottom.length < 3) {
                    Logger.debug(`Invalid physical colors for gradient: Top=${JSON.stringify(colorAtPhysicalTop)}, Bottom=${JSON.stringify(colorAtPhysicalBottom)}`);
                    continue; // Skip if colors are invalid
                }

                // Interpolate RGB components between the physical top/bottom colors
                const color = colorAtPhysicalTop.map((topComp, idx) => {
                     if (idx >= 3) return topComp; // Use physical top color's alpha by default for the gradient itself
                     const bottomComp = colorAtPhysicalBottom[idx];
                     const topVal = typeof topComp === 'number' ? topComp : 0;
                     const bottomVal = typeof bottomComp === 'number' ? bottomComp : 0;
                     return Math.round(topVal + (bottomVal - topVal) * factor);
                 });

                // Ensure 4 components (RGBA), using physical top's alpha (or default 255)
                 if (color.length === 3) {
                     const defaultAlpha = Array.isArray(colorAtPhysicalTop) && typeof colorAtPhysicalTop[3] === 'number' ? colorAtPhysicalTop[3] : 255;
                     color.push(defaultAlpha);
                 } else if (color.length > 3) { // Correct potential map issue
                     color[3] = Array.isArray(colorAtPhysicalTop) && typeof colorAtPhysicalTop[3] === 'number' ? colorAtPhysicalTop[3] : 255;
                 }

                await device.drawPixelRgba([x, currentY], color); // Draw the normal gradient pixel

            } catch (error) {
                Logger.debug(`Error drawing gradient pixel at [${x}, ${currentY}]: ${error.message}`);
            }
        } // End for loop
    }, // End drawVerticalGradientLine

    /**
         * Calculates the alpha value for a top pixel based on a fractional remainder.
         * Used to smoothly blend the top of a bar/line.
         * @param {number} remainder - The fractional part of the value (0 to < 1).
         * @param {number} minAlpha - The alpha value when remainder is 0 (or close to it).
         * @param {number} maxAlpha - The alpha value when remainder is 1 (or close to it, full pixel).
         * @returns {number | undefined} The calculated alpha (0-255), or undefined if remainder <= 0.
         */
    calculateTopPixelAlpha(remainder, minAlpha, maxAlpha) {
        if (remainder <= 0) {
            return undefined; // No partial pixel needed
        }
        // Ensure remainder is capped at 1 for safety, although it should be < 1 if logic is correct
        const cappedRemainder = Math.min(remainder, 1.0);
        const interpolatedAlpha = minAlpha + (maxAlpha - minAlpha) * cappedRemainder;
        // Clamp to valid alpha range and round
        return Math.max(0, Math.min(255, Math.round(interpolatedAlpha)));
    },

    /**
     * Calculates the alpha for the blinking clock separator using device dynamicState.
     * @returns {number} The calculated alpha value (rounded).
     */
    calculateSeparatorAlpha() {
        const { minAlpha, maxAlpha, fadeDelta } = DisplayConfig.CLOCK.separator;
        const device = DeviceManager.device;
        if (!device) return minAlpha; // Safety check

        // Get state using UNIQUE keys for this renderer's clock
        let currentAlpha = device.getState('price_clock_fade_alpha', minAlpha);
        let fadeDirection = device.getState('price_clock_fade_direction', 1);

        let newAlpha = currentAlpha + (fadeDelta * fadeDirection);

        // Clamp and reverse direction
        if (newAlpha >= maxAlpha) {
            newAlpha = maxAlpha;
            fadeDirection = -1;
        } else if (newAlpha <= minAlpha) {
            newAlpha = minAlpha;
            fadeDirection = 1;
        }

        // Store updated values back into device state
        device.setState('price_clock_fade_alpha', newAlpha);
        device.setState('price_clock_fade_direction', fadeDirection);

        return Math.round(newAlpha);
    }
};

// ------------------------------------- DISPLAY COMPONENTS -------------------------------------

// Object containing functions to render specific parts of the display
const DisplayComponents = {

    /**
     * Renders the battery icon fill and charge/discharge indicator.
     * @param {object} device - The PixooDevice instance for drawing.
     * @param {number} statusImgAlpha - The calculated alpha for the charge/discharge indicator.
     */
    async renderBatteryFill(device, statusImgAlpha) {
        const BATTERY_CHARGE = SONNEN_CAPACITY_KWH_USOC_PERCENT; // Already fetched safely
        const fillColor = [0, 255, 0, 255];
        const batteryConfig = DisplayConfig.IMAGES.BATTERY;
        const baseX = batteryConfig.position[0];
        const baseY = batteryConfig.position[1];
        const fillX = baseX + batteryConfig.fillframe[0];
        const fillY = baseY + batteryConfig.fillframe[1];
        const fillWidth = batteryConfig.fillframe[2];
        const fillHeight = batteryConfig.fillframe[3];
        const totalPixels = fillWidth * fillHeight;
        const pixelsToFill = Math.max(0, (BATTERY_CHARGE / 100) * totalPixels);
        const fullPixels = Math.floor(pixelsToFill);
        const partialPixelAlpha = Math.max(0, Math.min(255, Math.floor((pixelsToFill - fullPixels) * 255)));

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
                    done = true; break;
                }
                if (pixelCount < fullPixels) {
                    await device.drawPixelRgba([currentX, currentY], fillColor);
                    pixelCount++;
                } else { done = true; break; } // Should not be reached if logic is correct
            }
        }
        // Render battery state indicator (Uses the passed statusImgAlpha) // <-- Updated comment
        if (SONNEN_STATUS?.BatteryCharging) {
            await device.drawImageWithAlpha(DisplayConfig.IMAGES.CHARGE_LIGHTNING.path, DisplayConfig.IMAGES.CHARGE_LIGHTNING.position, DisplayConfig.IMAGES.CHARGE_LIGHTNING.dimensions, statusImgAlpha); // <-- Use parameter
        } else if (SONNEN_STATUS?.BatteryDischarging) {
            await device.drawImageWithAlpha(DisplayConfig.IMAGES.DISCHARGE_LIGHTNING.path, DisplayConfig.IMAGES.DISCHARGE_LIGHTNING.position, DisplayConfig.IMAGES.DISCHARGE_LIGHTNING.dimensions, statusImgAlpha); // <-- Use parameter
        }
    },

    /** Renders the Y-axis labels for the power price chart.
     * @param {object} device - The PixooDevice instance for drawing.
     */
    async renderLabels(device) {
        const labels = ['LABEL0', 'LABEL10', 'LABEL20', 'LABEL_MORE'];
        for (const labelKey of labels) {
            const config = DisplayConfig.TEXTS[labelKey];
            if (config) {
                await device.drawTextRgbaAligned(config.text, config.position, config.color, "right");
            }
        }
    },

    /** Renders the digital clock with blinking separator using dynamicState.
     * @param {object} device - The PixooDevice instance for drawing.
     */
    async renderClock(device) {
        const timeData = context.global.getLocalTime ? context.global.getLocalTime().data?.strings : null;
        if (!timeData) { Logger.debug('Time data unavailable for clock.'); return; }
        const { hour: hourPos, separator: sepPos, minute: minPos } = DisplayConfig.CLOCK.positions;
        const hour = timeData?.time_hour || "--";
        const minute = timeData?.time_minute || "--";
        const separator = ":";
        const baseColor = DisplayConfig.CLOCK.color;
        const alpha = DrawingUtils.calculateSeparatorAlpha(); // Uses dynamicState
        const separatorColor = [...baseColor.slice(0, 3), alpha];
        if (DisplayConfig.CLOCK.shadow.enabled) {
            const { offset: shadowOffset, color: shadowColor } = DisplayConfig.CLOCK.shadow;
            await device.drawTextRgbaAligned(hour, [hourPos[0], hourPos[1] + shadowOffset], shadowColor, "left");
            await device.drawTextRgbaAligned(separator, [sepPos[0], sepPos[1] + shadowOffset], [...shadowColor.slice(0, 3), Math.min(alpha, shadowColor[3])], "left");
            await device.drawTextRgbaAligned(minute, [minPos[0], minPos[1] + shadowOffset], shadowColor, "left");
        }
        await device.drawTextRgbaAligned(hour, hourPos, baseColor, "left");
        await device.drawTextRgbaAligned(separator, sepPos, separatorColor, "left");
        await device.drawTextRgbaAligned(minute, minPos, baseColor, "left");
    },

    /** Renders the current power price with refined 'human-like' formatting rules.
     * @param {object} device - The PixooDevice instance for drawing.
     */
    async renderPrice(device) {
        const priceInfo = global.get('currentCentprice', 'powerprices');
        let rawPrice = priceInfo?.payload?.currentCentprice; // Use let for potential modification

        // ****** HARDCODED TEST VALUES ******
        // rawPrice = -11.878;
        // ***********************************

        // 1. Validate price data
        if (rawPrice === undefined || rawPrice === null || typeof rawPrice !== 'number') {
            Logger.debug('Price data unavailable or invalid.');
            return; // Exit if price is not valid
        }

        // 2. Apply NEW threshold and rounding rules
        let displayPrice;
        let maxTotalDigits;
        const absRawPrice = Math.abs(rawPrice);

        if (absRawPrice < 0.005) {
            // --- Rule 1: Near-Zero ---
            // Display "0,0"
            displayPrice = 0.0;
            maxTotalDigits = 2; // "0" (1 integer) + "0" (1 decimal) = 2 digits
            //Logger.debug(`RenderPrice Case: Near-Zero. Raw: ${rawPrice}, Display: ${displayPrice}, Digits: ${maxTotalDigits}`);

        } else if (absRawPrice < 10) {
            // --- Rule 2: Small Absolute Value ---
            // Display rounded to 1 decimal place
            displayPrice = Math.round(rawPrice * 10) / 10;
            const absDisplayPrice = Math.abs(displayPrice);
            const integerPart = Math.floor(absDisplayPrice);
            let integerDigits = integerPart.toString().length;

            // If displayPrice is exactly 0 after rounding (e.g. -0.04 rounds to 0.0), treat as "0,0"
            if (displayPrice === 0) {
                maxTotalDigits = 2; // Ensure "0,0" format
                integerDigits = 1; // Integer part is "0"
            } else {
                maxTotalDigits = integerDigits + 1; // Integer digits + 1 decimal digit
            }
            //Logger.debug(`RenderPrice Case: Small Abs. Raw: ${rawPrice}, Display: ${displayPrice}, Digits: ${maxTotalDigits}`);

        } else {
            // --- Rule 3: Large Absolute Value ---
            // Display rounded to nearest whole number
            displayPrice = Math.round(rawPrice);
            const absDisplayPrice = Math.abs(displayPrice);
            const integerPart = Math.floor(absDisplayPrice); // Should be same as absDisplayPrice here
            maxTotalDigits = integerPart.toString().length; // Only integer digits count
            //Logger.debug(`RenderPrice Case: Large Abs. Raw: ${rawPrice}, Display: ${displayPrice}, Digits: ${maxTotalDigits}`);
        }

        // 3. Get configuration and call drawing function
        const { position, color } = DisplayConfig.TEXTS.PRICE;

        await device.drawCustomFloatText(
            displayPrice,
            position, // Use the position directly from config
            color,
            "right",  // Rely on the function's right-alignment
            maxTotalDigits // Use the dynamically calculated digit count
        );
        // Logger.debug(`Final Call - Display: ${displayPrice}, Digits: ${maxTotalDigits}`); // Optional final check debug
    }, // End of renderPrice

    /** Renders the PV prediction bars.
     * @param {object} device - The PixooDevice instance for drawing.
     */
    async renderPvPredictionBars(device) {
        const predictions = global.get('PV_HOURLY_YIELD_PREDICTION', 'disk');
        if (!predictions || !Array.isArray(predictions)) { Logger.debug('PV prediction data invalid.'); return; }
        const { position, size, color } = DisplayConfig.CHART.PV.PREDICTION;
        const [startX, startY] = position;
        const chartWidth = size[0]; const chartHeight = size[1];
        const maxPredictionWh = 1000 * chartHeight; // Example scaling
        for (let hourIndex = 0; hourIndex < predictions.length; hourIndex++) {
            const x = startX + (hourIndex * 2);
            if (x >= startX + chartWidth) break;
            const value = predictions[hourIndex] || 0;
            if (value > 0) {
                const scaledHeight = Math.min(chartHeight, Math.max(0, (value / maxPredictionWh) * chartHeight));
                const barHeight = Math.round(scaledHeight);
                if (barHeight > 0) {
                    const lineStart = [x, startY + chartHeight - barHeight];
                    const lineEnd = [x, startY + chartHeight - 1];
                    await device.drawLineRgba(lineStart, lineEnd, color);
                }
            }
        }
    },

    /**
         * Renders the actual PV yield bars with gradient and partial alpha.
         * Draws bars from the TOP edge downwards.
         * Uses the enhanced drawVerticalGradientLine utility to apply partial alpha
         * blending to the BOTTOM-MOST pixel of the bar for fractional values.
         * @param {object} device - The PixooDevice instance for drawing.
         */
    async renderPvActualBars(device) {
        const dailyData = global.get('dailyPvDataActual') || [];
        if (!Array.isArray(dailyData) || !dailyData.length) { Logger.debug('PV actual data invalid.'); return; }

        // Get configuration for PV Actual chart
        const config = DisplayConfig.CHART.PV.ACTUAL;
        const [startX, startY] = config.position; // Top-left corner of the chart AREA
        const chartWidth = config.size[0];        // Width of the chart area
        const chartHeight = config.size[1];       // Height of the chart area
        const maxYieldWh = 1000 * chartHeight;    // Example scaling: Wh value that corresponds to full chart height

        // Iterate through hourly data
        for (let hourIndex = 0; hourIndex < dailyData.length; hourIndex++) {
            const x = startX + (hourIndex * 2); // Calculate X position for the bar (every 2 pixels)
            if (x >= startX + chartWidth) break; // Stop if we exceed chart width

            const value = dailyData[hourIndex] || 0; // Get yield value for the hour
            if (value <= 0) continue; // Skip if no yield

            // --- Calculate Bar Height ---
            const scaledValue = (value / maxYieldWh) * chartHeight;
            const totalPixelsClamped = Math.min(chartHeight, Math.max(1, Math.ceil(scaledValue)));
            const fullPixels = Math.floor(scaledValue);
            const remainder = scaledValue - fullPixels; // Fractional part (0 to <1)

            // --- Calculate Top-Down Coordinates ---
            const lineStartY = startY;                          // Bar STARTS at the TOP edge.
            const lineEndY = startY + totalPixelsClamped - 1; // Bar ENDS 'totalPixelsClamped' pixels below the top edge.
            const lineStart = [x, lineStartY];
            const lineEnd = [x, lineEndY];

            // --- Calculate Alpha for the Last Pixel (if remainder exists) ---
            let partialPixelAlpha = undefined; // Default to undefined
            if (remainder > 0) {
                partialPixelAlpha = DrawingUtils.calculateTopPixelAlpha( // Utility calculates alpha 0-255 from remainder 0-1
                    remainder,
                    config.alpha.min, // Use configured min/max alpha range for PV bars
                    config.alpha.max
                );
                // Ensure it's a valid number, otherwise keep undefined
                if (typeof partialPixelAlpha !== 'number' || partialPixelAlpha <= 0) {
                    partialPixelAlpha = undefined;
                }
            }

            // --- Draw the Bar using the Enhanced Utility ---
            // Call the modified gradient function.
            // Pass the calculated alpha as 'pixelAlpha'.
            // Explicitly set 'alphaTarget' to 'end' so the alpha is applied to the bottom pixel (lineEndY).
            try {
                await DrawingUtils.drawVerticalGradientLine(
                    device,
                    lineStart,          // Top coordinate [x, y_top]
                    lineEnd,            // Bottom coordinate [x, y_bottom]
                    config.colors.start, // Color at the top
                    config.colors.end,   // Color at the bottom
                    partialPixelAlpha,  // Alpha for the target pixel (pass undefined if no remainder)
                    'end'               // <<< Specify alpha target as the END point
                );
            } catch (drawError) {
                Logger.debug(`Error drawing PV bar at x=${x}: ${drawError.message}`);
            }
        } // End loop through hourly data
    }, // End of renderPvActualBars

    /**
     * Renders the total predicted PV yield text (in kWh).
     * FIX: Calculates kWh correctly.
     * Returns the calculated X position of the separator slash if drawn.
     * @param {object} device - The PixooDevice instance for drawing.
     * @returns {Promise<number|null>} Promise resolving to X position of the separator slash or null.
     */
    async renderPvPredictionTotal(device) {
        const dailyData = global.get('PV_HOURLY_YIELD_PREDICTION') || [];
        if (!Array.isArray(dailyData)) { Logger.debug('PV prediction data invalid.'); return null; }
        const totalKwh = dailyData.reduce((sum, value) => sum + (value || 0), 0);
        //const totalKwh = totalWh / 1000; 
        //node.warn(`totalKwh: ${totalKwh}`);
        const { position, color } = DisplayConfig.TEXTS.PV_PREDICTION_TOTAL;
        const predictionWidth = await device.drawCustomFloatText(totalKwh, position, color, "right", 2);
        let slashXPosition = null;
        if (TimeUtils.getCurrentTimeInfo().isAfterNoon) {
            slashXPosition = position[0] - predictionWidth;
            await device.drawTextRgbaAligned("/", [slashXPosition, position[1]], [0, 0, 0, 150], "right");
        }
        return slashXPosition; // Return calculated position
    },

    /**
     * Renders the total actual PV yield text (in kWh).
     * FIX: Calculates kWh correctly. Accepts slash position via argument.
     * @param {object} device - The PixooDevice instance for drawing.
     * @param {number|null} slashXPosition - The X position where the separator slash was drawn (if any).
     */
    async renderPvTotal(device, slashXPosition) { // Accept slash position
        const dailyData = global.get('dailyPvDataActual') || [];
        if (!Array.isArray(dailyData)) { Logger.debug('PV actual data invalid.'); return; }
        const totalWh = dailyData.reduce((sum, value) => sum + (value || 0), 0);
        const totalKwh = totalWh / 1000;
        const { position, color } = DisplayConfig.TEXTS.PV_TOTAL;
        const offsetBeforeSlash = 5;
        const actualXPosition = [(TimeUtils.getCurrentTimeInfo().isAfterNoon && slashXPosition !== null) ? slashXPosition - offsetBeforeSlash : position[0], position[1]];
        await device.drawCustomFloatText(totalKwh, actualXPosition, color, "right", 2);
    },

//     /**
//      * Renders the current UVI value next to the sun logo.
//      * Uses data from global context 'home.weather.uvi'.
//      * Displays "-" if data is missing or invalid.
//      * @param {object} device - The PixooDevice instance for drawing.
//      */
//     async renderUviText(device) {
//         const uviData = global.get("home.weather.uvi", "disk");
//         const config = DisplayConfig.TEXTS.UVI;
//
//         // Validate UVI data
//         if (!uviData?.currentUvi || !Array.isArray(uviData.currentUvi) || typeof uviData.currentUvi[0] !== 'number') {
//             Logger.debug("UVI data unavailable or invalid, displaying '-'.");
//             await device.drawTextRgbaAligned("-", config.position, config.color, "left");
//             return;
//         }
//
//         // Render UVI value with 1 decimal place
//         const uviValue = uviData.currentUvi[1]; // fixme: 0 should be current hour...
//         await device.drawCustomFloatText(uviValue, config.position, config.color, "left", 2);
//     },

    async renderUviText(device) {
        const uviData = global.get("home.weather.uvi", "disk");
        const config = DisplayConfig.TEXTS.UVI;

        // Validate UVI data
        if (!uviData?.currentUvi || !Array.isArray(uviData.currentUvi) ||
            typeof uviData.currentUvi[1] !== 'number' || typeof uviData.currentUvi[2] !== 'number') {
            Logger.debug("UVI data unavailable or invalid, displaying '-'.");
            await device.drawTextRgbaAligned("-", config.position, config.color, "left");
            return;
        }

        // Get current and next hour values, rounded to integers
        const currentUvi = Math.round(uviData.currentUvi[1]);
        const nextUvi = Math.round(uviData.currentUvi[2]);
        
        // Choose arrow direction based on value change
        const arrow = nextUvi > currentUvi ? "↑" : "↓";
        
        // Format with appropriate arrow
        const uviText = `${currentUvi}${arrow}${nextUvi}`;
        
        // Draw the formatted text
        await device.drawTextRgbaAligned(uviText, config.position, config.color, "left");
    },



    /**
     * Fetches data and initiates the rendering of the power price chart.
     * @param {object} device - The PixooDevice instance for drawing.
     */
    async renderPowerPriceBars(device) {
        const priceInfo = global.get("powerPriceData", "powerprices");
        if (!priceInfo?.data) { Logger.debug('Power price data unavailable.'); return; }
        const timeInfo = context.global.getLocalTime ? context.global.getLocalTime() : null;
        if (!timeInfo?.success) { Logger.debug('Local time data unavailable.'); return; }

        const config = DisplayConfig.CHART.POWER_PRICE;
        const currentDate = new Date(timeInfo.data.milliseconds.dateAndTimeMillis);
        const currentHourKey = this.formatHourKey(currentDate);
        const isAfterNoon = TimeUtils.getCurrentTimeInfo().isAfterNoon;
        let referenceHour = config.settings.startFromCurrentHour ? currentDate.getHours() : (isAfterNoon ? 12 : 0);
        const referenceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), referenceHour);
        const referenceHourKey = this.formatHourKey(referenceDate);

        // Ensure filterAndSortPrices adds 'isPastHour' correctly
        const relevantPrices = this.filterAndSortPrices(priceInfo.data, referenceHourKey, currentHourKey, config.settings.maxHoursToDraw);

        await this.drawPriceChart(device, relevantPrices, config); // Call the main chart drawing function
    },

    /** Formats a Date object into a key string (YYYY-MM-DD-HH). */
    formatHourKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`; },

    /**
     * Filters and sorts price data, adding essential flags like isPastHour.
     * @param {object} data - Raw price data object.
     * @param {string} referenceKey - The key of the first hour to include.
     * @param {string} currentKey - The key of the current hour.
     * @param {number} maxHours - Maximum number of hours to process.
     * @returns {Array<object>} Filtered, sorted, and annotated price data.
     */
    filterAndSortPrices(data, referenceKey, currentKey, maxHours) {
        let entries = Object.entries(data)
            .filter(([key]) => key >= referenceKey)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .slice(0, maxHours);

        // Optional Debugging Price Modifications
        if (DisplayConfig.DEBUG_LARGE_VALUES) { /* Adapt debugging logic if needed */ }
        if (DisplayConfig.DEBUG_NEGATIVE_VALUES) { /* Adapt debugging logic if needed */ }

        // Determine cheapest prices among valid entries
        const allPrices = entries.map(([_, hourData]) => hourData.currentCentPrice);
        const validPrices = allPrices.filter(p => typeof p === 'number');
        const cheapestPrices = [...validPrices].sort((a, b) => a - b).slice(0, 3);

        // Map to final structure, ensuring isPastHour is included
        return entries.map(([key, hourData]) => ({
            key,
            price: hourData.currentCentPrice,
            isCurrent: key === currentKey,
            isPastHour: key < currentKey, // <<< Crucial flag calculation
            isAmongCheapest: typeof hourData.currentCentPrice === 'number' && cheapestPrices.includes(hourData.currentCentPrice)
        }));
    },

    /**
     * Renders the complete price chart with all necessary elements.
     * @param {object} device - Device instance for rendering.
     * @param {Array<object>} prices - Price data array with calculated attributes (must include isPastHour).
     * @param {object} config - Chart configuration parameters from DisplayConfig.CHART.POWER_PRICE.
     * @returns {Promise<void>}
     */
    async drawPriceChart(device, prices, config) {
        const { xStart, maxPixels } = this.calculateChartDimensions(config);
        let lastKnownPrice = null;
        let blinkState = device.toggleState('price_blink_state', false);

        const zeroLineY = config.position[1] + 1;
        const markerConfig = this._getZeroLineMarkerConfig(config); // Gets object with { enabled, color, pastAlpha }

        // --- Get Current Hour Indicator Config --- // <<< ADDED HERE
        const indicatorConfig = config.CURRENT_HOUR_INDICATOR || { enabled: false }; // Default disabled
        const indicatorColor = indicatorConfig.color || [255, 255, 255, 255]; // Default white if missing
        const indicatorYOffset = indicatorConfig.offsetY || 2; // Default 2 px


        for (let i = 0; i < prices.length; i++) {
            const x = xStart + (i * 2);
            if (x >= xStart + maxPixels) break;

            const pricePoint = prices[i] || {};
            const isPastHour = pricePoint.isPastHour ?? false;

            // --- 1. Render zero line marker (if enabled) ---
            if (markerConfig.enabled) {
                // Pass the base color array and the specific pastAlpha value
                await this._drawZeroLineMarker(device, x, zeroLineY, markerConfig.color, isPastHour, markerConfig.pastAlpha); // <<< CALL UPDATED
            }

            // --- 2. Process price data for the bar ---
            const priceData = this.extractPriceData(pricePoint, config, prices);
            if (!this.isValidPrice(priceData, lastKnownPrice)) continue;
            lastKnownPrice = priceData.price;

            // --- 3. Render the actual price bar ---
            await this._renderPriceBar(device, priceData, config, x, blinkState);

            // --- 4. Render Current Hour Indicator (Triangle) --- // <<< ADDED LOGIC HERE
            if (pricePoint.isCurrent && indicatorConfig.enabled) {
                const yTip = GRID_ZERO_LINE_Y + indicatorYOffset + 1; // Y for the top pixel 'X'
                const yBase = GRID_ZERO_LINE_Y + indicatorYOffset + 2; // Y for the bottom row 'XXX'

                // Check if coordinates are within display bounds (optional but good practice)
                if (yBase < DisplayConfig.DIMENSIONS.HEIGHT && x > 0 && x < DisplayConfig.DIMENSIONS.WIDTH -1) {
                    try {
                        // Draw the triangle shape: Top point, then the base row
                        await device.drawPixelRgba([x, yTip], indicatorColor);     // Top 'X'
                        await device.drawPixelRgba([x - 1, yBase], indicatorColor); // Base left 'X'
                        await device.drawPixelRgba([x, yBase], indicatorColor);     // Base middle 'X'
                        await device.drawPixelRgba([x + 1, yBase], indicatorColor); // Base right 'X'
                    } catch (indicatorError) {
                        // Log if drawing fails, but don't stop the rest of the render
                        Logger.debug(`Error drawing current hour indicator at x=${x}: ${indicatorError.message}`);
                    }
                } else {
                    // Log if indicator would be off-screen (unlikely with current layout)
                    Logger.debug(`Current hour indicator skipped at x=<span class="math-inline">\{x\}, y\=</span>{yBase} (out of bounds)`);
                }
            }
            // --- End Current Hour Indicator ---
        }
    },


    /**
     * Retrieves zero line marker configuration with defaults.
     * @private
     * @param {object} config - Chart configuration from DisplayConfig.CHART.POWER_PRICE.
     * @returns {{enabled: boolean, color: Array<number>, pastAlpha: number}} Marker configuration including separate past alpha.
     */
    _getZeroLineMarkerConfig(config) {
        const markerConfig = config.ZERO_LINE_MARKER || {};
        const baseColor = markerConfig.color || [0, 0, 0, 100]; // Default base color + future alpha
        // Provide a default for pastAlpha if not configured (e.g., 64 which is ~25%)
        const defaultPastAlpha = 64;
        return {
            enabled: markerConfig.enabled ?? false,
            color: baseColor, // Base color array (includes alpha for current/future)
            pastAlpha: markerConfig.pastAlpha ?? defaultPastAlpha // Get configured past alpha or use default
        };
    },

    /**
     * Draws a marker at the zero line position, using different absolute alpha values for past vs current/future.
     * @private
     * @param {object} device - Device instance for drawing.
     * @param {number} x - X coordinate for the marker.
     * @param {number} y - Y coordinate (the zero line).
     * @param {Array<number>} baseColor - Base RGBA color (alpha component is for current/future).
     * @param {boolean} isPastHour - Whether this marker represents a past hour.
     * @param {number} pastAlpha - The absolute alpha value (0-255) to use for past hours. <<< SIGNATURE CHANGED
     * @returns {Promise<void>}
     */
    async _drawZeroLineMarker(device, x, y, baseColor, isPastHour, pastAlpha) { // <<< SIGNATURE CHANGED
        try {
            const futureAlpha = baseColor[3]; // Alpha for current/future is part of the baseColor array

            // Choose the correct absolute alpha value based on isPastHour
            const finalAlpha = isPastHour ? pastAlpha : futureAlpha; // <<< LOGIC CHANGED

            // Construct the final color using the chosen alpha
            const markerColor = [
                ...baseColor.slice(0, 3), // Use base RGB
                finalAlpha                // Use the chosen absolute alpha
            ];

            await device.drawPixelRgba([x, y], markerColor);
        } catch (error) {
            Logger.debug(`Zero line marker error at [${x}, ${y}]: ${error.message}`);
        }
    },

    /**
     * Prepares data and triggers rendering of an individual price bar.
     * @private
     * @param {object} device - Device instance for drawing.
     * @param {object} priceData - Processed price data object from extractPriceData.
     * @param {object} config - Chart configuration from DisplayConfig.CHART.POWER_PRICE.
     * @param {number} x - X coordinate for the bar.
     * @param {boolean} blinkState - Current blink state for overflow indicators.
     * @returns {Promise<void>}
     */
    async _renderPriceBar(device, priceData, config, x, blinkState) {
        // Determine base gradient colors
        const barColors = this.determineBarColors(priceData, config.colors);
        // Calculate alpha values for top pixel blending and overflow blinking
        const alphaValues = this._calculateBarAlphaValues(priceData, config, blinkState);

        // Combine all data needed for the final drawing function
        const barData = {
            ...priceData,       // Includes price, flags (isNegative, isOverflow, isPastHour), pixels (fullPixels, negativePixels, overflowPixels), remainder
            ...barColors,       // Includes startColor, endColor
            ...alphaValues,     // Includes topPixelAlpha, overflowAlpha
            x,                  // X position
            bottomY: config.position[1], // Base Y for drawing (GRID_ZERO_LINE_Y - 1)
            // Note: negativePixels and overflowPixels are already included via spread of priceData
        };

        // Call the function that handles the negative/zero/positive/overflow logic
        await this.drawPriceBar(device, barData);
    },

    /**
     * Calculates alpha values for bar rendering considering overflow blink state.
     * @private
     * @param {object} priceData - Processed price data from extractPriceData.
     * @param {object} config - Chart configuration from DisplayConfig.CHART.POWER_PRICE.
     * @param {boolean} blinkState - Current blink state (true = bright, false = dim).
     * @returns {{topPixelAlpha: (number | undefined), overflowAlpha: number}} Alpha values.
     */
    _calculateBarAlphaValues(priceData, config, blinkState) {
        // Calculate base alpha for the top-most pixel based on remainder
        let topPixelAlpha = this.calculatePriceBarTopPixelAlpha(priceData, config.colors);
        // Get default alpha for overflow pixels from config
        let overflowAlpha = config.colors.overflow[3] ?? 255;

        // If the price causes overflow, apply blinking alpha
        if (priceData.isOverflow) {
            // Set overflow pixel alpha based on blink state
            overflowAlpha = blinkState ? config.BLINK.MAX_ALPHA : config.BLINK.MIN_ALPHA;

            // If there's a top linear pixel (remainder > 0), apply blinking to it too
            if (topPixelAlpha !== undefined) {
                topPixelAlpha = blinkState ? topPixelAlpha : config.BLINK.MIN_ALPHA;
            }
        }

        return { topPixelAlpha, overflowAlpha };
    },

    /** Calculates the starting X position and maximum pixel width for the chart. */
    calculateChartDimensions(config) { return { xStart: config.position[0], maxPixels: Math.min(DisplayConfig.DIMENSIONS.WIDTH - config.position[0], config.settings.maxHoursToDraw * 2) }; },
    /** Extracts and processes price data for a single bar. Returns object. */
    extractPriceData(priceEntry, config, prices) {
        const { price, isCurrent, key, isAmongCheapest } = priceEntry || {};
        const linearCap = config.maxHeight;
        const absoluteCap = 100;
        const actualCurrentKey = prices.find(p => p.isCurrent)?.key;
        const isPastHour = key < actualCurrentKey;
        // ---> Get threshold from config, provide default if missing
        const zeroThreshold = config.settings?.zeroThreshold ?? 0.005;

        // --- Check for invalid price first ---
        if (price === undefined || price === null || typeof price !== 'number') {
            return { price: null, isCurrent: false, isPastHour, isAmongCheapest: false, fullPixels: 0, remainder: 0, isNegative: false, negativePixels: [], isOverflow: false, overflowPixels: [] };
        }

        // --- NEW: Check if price is within the zero threshold ---
        if (Math.abs(price) < zeroThreshold) {
            //node.warn(`Price ${price} treated as ZERO for drawing.`); // Debug log
            // Treat as zero for drawing purposes
            return {
                price: 0.0, // Report price as 0.0 downstream
                isCurrent,
                isAmongCheapest,
                isPastHour,
                fullPixels: 0,
                remainder: 0,
                isNegative: false, // <<< Crucial: Mark as NOT negative
                negativePixels: [],
                isOverflow: false,
                overflowPixels: []
            };
        }
        // --- END NEW THRESHOLD CHECK ---

        // --- Original Negative Price Check (now only triggers if outside threshold) ---
        if (price < 0) {
            // node.warn(`Price ${price} treated as NEGATIVE for drawing.`); // Optional debug
            const cappedNegativePrice = Math.max(price, -absoluteCap);
            return {
                price: cappedNegativePrice, // Keep original negative value (or capped)
                isCurrent,
                isAmongCheapest,
                isPastHour,
                fullPixels: 0,
                remainder: 0,
                isNegative: true, // <<< Mark as negative
                negativePixels: this.calculateNegativePixels(cappedNegativePrice),
                isOverflow: false,
                overflowPixels: []
            };
        }

        // --- Original Positive Price Logic ---
        // node.warn(`Price ${price} treated as POSITIVE for drawing.`); // Optional debug
        const cappedPrice = Math.min(price, absoluteCap);
        const linearPixels = Math.min(cappedPrice, linearCap);
        const fullLinearPixels = Math.floor(linearPixels);
        const linearRemainder = linearPixels - fullLinearPixels;
        const overflowPixels = this.calculateOverflowPixels(cappedPrice, linearCap);
        return {
            price: cappedPrice, // Keep original positive value (or capped)
            isCurrent,
            isAmongCheapest,
            isPastHour,
            fullPixels: fullLinearPixels,
            remainder: linearRemainder,
            isOverflow: cappedPrice > linearCap,
            overflowPixels: overflowPixels,
            isNegative: false, // <<< Mark as NOT negative
            negativePixels: []
        };
    },
    /** Calculates pixel positions for negative prices. Returns array. */
    calculateNegativePixels(price) {
        if (price >= 0) return [];
        const pixelsNeeded = Math.ceil(Math.abs(price) / 10); // Example scaling: 1 pixel per 10 cents
        return Array.from({ length: pixelsNeeded }, (_, index) => ({ position: index })); // Simple index for position
    },
    /** Calculates positions for overflow pixels. Returns array. */
    calculateOverflowPixels(price, linearCap) {
        if (price <= linearCap) return [];
        const overflowAmount = price - linearCap;
        const pixelsNeeded = Math.floor(overflowAmount / 10); // Example scaling: 1 pixel per 10 cents over cap
        // Original logic used index * 2, implying gaps. Let's assume contiguous pixels for simplicity now.
        // Adjust if index * 2 was intentional for visual spacing.
        return Array.from({ length: pixelsNeeded }, (_, index) => ({ position: index })); // Position = index (0, 1, 2...)
    },
    /** Basic validation for price data. Returns boolean. */
    isValidPrice(priceData, lastKnownPrice) { return typeof priceData?.price === 'number'; },
    /** Determines the start and end colors for a price bar gradient. Returns object {startColor, endColor}. */
    determineBarColors(priceData, colorConfig) {
        const { price, isCurrent, isAmongCheapest, isPastHour } = priceData;
        if (price === null) { return { startColor: [50, 50, 50, 100], endColor: [50, 50, 50, 100] }; } // Default grey for invalid
        if (isCurrent) { return { startColor: colorConfig.currentHour.start, endColor: colorConfig.currentHour.end }; }
        if (isAmongCheapest) { const tf = isPastHour ? 'past' : 'future'; return { startColor: colorConfig.cheapHours[tf].start, endColor: colorConfig.cheapHours[tf].end }; }
        // Default future/past colors
        return { startColor: isPastHour ? colorConfig.pastHours.start : colorConfig.futureHours.start, endColor: isPastHour ? colorConfig.pastHours.end : colorConfig.futureHours.end };
    },
    /**
             * Calculates the alpha for the top-most pixel of a PRICE bar, considering fractional height and past hour adjustments.
             * Returns number | undefined.
             */
    calculatePriceBarTopPixelAlpha(priceData, colorConfig) { // <-- Renamed function
        const { remainder } = priceData;
        if (remainder <= 0) return undefined;

        // Determine the target alpha based on the end color for a full remainder
        const baseEndAlpha = this.getBaseAlpha(priceData, colorConfig);

        // Calculate initial alpha based on remainder using the utility
        let calculatedAlpha = DrawingUtils.calculateTopPixelAlpha(remainder, 0, baseEndAlpha); // <-- Use utility

        // If utility returned undefined (e.g., remainder was actually <=0), exit
        if (calculatedAlpha === undefined) return undefined;

        // Special handling for past hours (non-cheap/non-current) - Scale the calculated alpha
        if (priceData.isPastHour && !priceData.isCurrent && !priceData.isAmongCheapest) {
            // Use the alpha values from the default past/future hour gradient ends
            const futureAlpha = colorConfig.futureHours.end[3] ?? 1; // Avoid division by zero
            const pastAlpha = colorConfig.pastHours.end[3] ?? 0;
            // Apply scaling factor to the alpha derived from the utility function
            calculatedAlpha = Math.round(calculatedAlpha * (pastAlpha / futureAlpha)); // <-- Scales down the result
        }

        // Final clamp (utility already clamps, but doesn't hurt to be safe)
        return Math.max(0, Math.min(255, calculatedAlpha));
    },
    /** Helper to get the base alpha value based on bar type. Returns number. */
    getBaseAlpha(priceData, colorConfig) {
        const { isCurrent, isAmongCheapest, isPastHour } = priceData;
        const defaultAlpha = 255;
        if (isCurrent) return colorConfig.currentHour.end[3] ?? defaultAlpha;
        if (isAmongCheapest) { return isPastHour ? (colorConfig.cheapHours.past.end[3] ?? defaultAlpha) : (colorConfig.cheapHours.future.end[3] ?? defaultAlpha); }
        return isPastHour ? (colorConfig.pastHours.end[3] ?? defaultAlpha) : (colorConfig.futureHours.end[3] ?? defaultAlpha);
    },

    /**
     * Draws a price bar with appropriate visualization based on its properties.
     * Delegates to specific drawing helpers (_drawNegativePrice, _drawZeroPrice, etc.).
     * @param {object} device - Device instance for drawing.
     * @param {object} barData - Combined bar rendering data object.
     * @returns {Promise<void>}
     */
    async drawPriceBar(device, barData) {
        try {
            // Determine the primary visualization type
            if (this._isNegativePrice(barData)) {
                //node.warn(`_drawNegativePrice`);
                await this._drawNegativePrice(device, barData);

            } else if (this._isZeroPrice(barData)) {
                //node.warn(`_drawZeroPrice`);
                await this._drawZeroPrice(device, barData);
            } else {
                //node.warn(`_drawPositiveBar`);
                // Draw the main positive bar body
                await this._drawPositiveBar(device, barData);

                // If it's a positive bar, check for and draw overflow pixels
                if (this._hasOverflow(barData)) {
                    //node.warn(`_drawOverflowPixels`);
                    await this._drawOverflowPixels(device, barData);
                }
            }
        } catch (error) {
            // Catch errors from the _draw... helpers if they don't catch themselves
            Logger.debug(`Price bar rendering error at x=${barData?.x}: ${error.message}`);
        }
    },

    /**
     * Checks if the price data represents a negative value that needs drawing.
     * @private
     * @param {object} barData - Bar data.
     * @returns {boolean} True if negative price visualization is needed.
     */
    _isNegativePrice(barData) {
        // Check the flag set by extractPriceData and if there are pixels to draw
        return barData.isNegative && barData.negativePixels?.length > 0;
    },

    /**
     * Checks if the price data represents a zero value (or effectively zero height).
     * @private
     * @param {object} barData - Bar data.
     * @returns {boolean} True if zero price visualization is needed.
     */
    _isZeroPrice(barData) {
        // Condition: No full pixels, no top pixel alpha blend, and not negative.
        return barData.fullPixels === 0 && barData.topPixelAlpha === undefined && !barData.isNegative;
    },

    /**
     * Checks if the price bar has overflow elements to be drawn.
     * @private
     * @param {object} barData - Bar data.
     * @returns {boolean} True if overflow visualization is needed.
     */
    _hasOverflow(barData) {
        // Check the flag set by extractPriceData and if there are pixels to draw
        return barData.isOverflow && barData.overflowPixels?.length > 0;
    },

    /**
     * Applies past-hour alpha dimming to a base color.
     * @private
     * @param {Array<number>} baseColor - Base RGBA color array.
     * @param {boolean} isPastHour - Flag indicating if the hour is in the past.
     * @param {number} [pastAlphaPercent=DisplayConfig.NEGATIVE_PRICES.PAST_ALPHA_PERCENT] - Alpha percentage (0-100) for past hours.
     * @returns {Array<number>} Adjusted RGBA color array.
     */
    _calculateColor(baseColor, isPastHour, pastAlphaPercent = DisplayConfig.NEGATIVE_PRICES.PAST_ALPHA_PERCENT) {
        // If not past hour, return the original color
        // Ensure baseColor is valid
        if (!Array.isArray(baseColor) || baseColor.length < 4) {
            Logger.debug(`Invalid baseColor in _calculateColor: ${JSON.stringify(baseColor)}`);
            return baseColor || [0, 0, 0, 255]; // Return original or fallback
        }
        if (!isPastHour) return baseColor;


        // Calculate dimmed alpha value
        const pastAlpha = Math.round((pastAlphaPercent / 100) * 255);
        // Return new color array with dimmed alpha
        return [...baseColor.slice(0, 3), pastAlpha];
    },

    /**
     * Renders a negative price indicator (pixels below zero line).
     * @private
     * @param {object} device - Device instance for drawing.
     * @param {object} barData - Bar data object.
     * @returns {Promise<void>}
     */
    async _drawNegativePrice(device, barData) {
        const { x, bottomY, negativePixels, isPastHour } = barData;
        // Get base color from config (green)
        const baseColor = DisplayConfig.CHART.POWER_PRICE.colors.negative || [0, 255, 0, 255];
        // Calculate final color considering past hour dimming
        const color = this._calculateColor(baseColor, isPastHour);

        // Draw each pixel below the zero line
        for (let i = 0; i < negativePixels.length; i++) {
            const pixelY = bottomY + 2 + (i * 2); // Y position below zero line
            await device.drawPixelRgba([x, pixelY], color).catch(err =>
                Logger.debug(`Negative pixel error at [${x}, ${pixelY}]: ${err.message}`)
            );
        }
    },

    /**
     * Renders a zero price indicator (single dot at zero line).
     * Uses the configured negative color (green).
     * Full opacity (255) for current/future hours.
     * Dimmed opacity for past hours based on NEGATIVE_PRICES.PAST_ALPHA_PERCENT.
     * @private
     * @param {object} device - Device instance for drawing.
     * @param {object} barData - Bar data object, including isPastHour.
     * @returns {Promise<void>}
     */
    async _drawZeroPrice(device, barData) {
        const { x, bottomY, isPastHour } = barData; // Now we need isPastHour

        // Get base RGB color from config (green)
        const baseColorConfig = DisplayConfig.CHART.POWER_PRICE.colors.negative || [0, 255, 0, 255];
        const baseRgb = baseColorConfig.slice(0, 3); // Extract just [R, G, B]

        // Determine the correct alpha value
        let finalAlpha;
        if (isPastHour) {
            // Calculate dimmed alpha for past hours
            const pastAlphaPercent = DisplayConfig.NEGATIVE_PRICES.PAST_ALPHA_PERCENT || 50; // Get percentage
            finalAlpha = Math.max(0, Math.min(255, Math.round((pastAlphaPercent / 100) * 255))); // Calculate and clamp
        } else {
            // Use full opacity for current/future hours
            finalAlpha = 255;
        }

        // Construct the final color
        const finalZeroDotColor = [...baseRgb, finalAlpha];

        // Calculate Y position
        const OFFSET = 1;
        const zeroLineY = bottomY + OFFSET; // Y position AT the zero line
        //Logger.debug(`zeroLineY is ${zeroLineY} [x=${x}]`)

        // Draw the single dot with the calculated color/alpha
        await device.drawPixelRgba([x, zeroLineY], finalZeroDotColor).catch(err =>
            Logger.debug(`Zero price indicator error at [${x}, ${zeroLineY}]: ${err.message}`)
        );
    },

    /**
     * Renders a positive price bar (gradient line).
     * @private
     * @param {object} device - Device instance for drawing.
     * @param {object} barData - Bar data object.
     * @returns {Promise<void>}
     */
    async _drawPositiveBar(device, barData) {
        const { x, bottomY, fullPixels, topPixelAlpha, startColor, endColor } = barData;
        // Calculate total height including potential blended top pixel
        const barHeight = fullPixels + (topPixelAlpha !== undefined ? 1 : 0);
        // Calculate top Y coordinate (remember Y decreases going up)
        const topY = bottomY - barHeight + 1;

        // Draw the vertical gradient line using the *refactored* utility
        await DrawingUtils.drawVerticalGradientLine(
            device,
            [x, topY],        // Conceptual Start Point (Top Y)
            [x, bottomY],     // Conceptual End Point (Bottom Y)
            endColor,         // Color for Conceptual Start (Top Y)
            startColor,       // Color for Conceptual End (Bottom Y)
            topPixelAlpha,    // Alpha value, conceptually belongs to the start point
            'start'           // Explicitly target the 'startPoint' for the alpha
        ).catch(err => Logger.debug(`Positive bar error at x=${x}: ${err.message}`));
    },

    /**
     * Renders overflow indicators (pixels above the main bar) for prices exceeding the display cap.
     * @private
     * @param {object} device - Device instance for drawing.
     * @param {object} barData - Bar data object.
     * @returns {Promise<void>}
     */
    async _drawOverflowPixels(device, barData) {
        const { x, bottomY, fullPixels, overflowPixels, overflowAlpha } = barData;
        // Get base color from config (red)
        const baseColor = DisplayConfig.CHART.POWER_PRICE.colors.overflow || [255, 0, 0, 255];
        // Create final color using calculated overflowAlpha (handles blinking)
        // Ensure overflowAlpha is a number
        const finalOverflowAlpha = typeof overflowAlpha === 'number' ? overflowAlpha : baseColor[3];
        const color = [...baseColor.slice(0, 3), finalOverflowAlpha];
        // Calculate the Y coordinate where the linear bar part ends
        const overflowStartY = bottomY - fullPixels;

        // Draw each overflow pixel above the linear bar part
        for (const pixel of overflowPixels) {
            // Ensure pixel.position is a number
            const positionOffset = typeof pixel.position === 'number' ? pixel.position : 0;
            // Calculate Y position based on index/position defined in calculateOverflowPixels
            const pixelY = overflowStartY - positionOffset - 1; // Draw upwards
            await device.drawPixelRgba([x, pixelY], color).catch(err =>
                Logger.debug(`Overflow pixel error at [${x}, ${pixelY}]: ${err.message}`)
            );
        }
    }
}; // End DisplayComponents


// ------------------------------------- DISPLAY CONTROLLER -------------------------------------

// Main controller orchestrating the display setup and rendering process
const DisplayController = {
    /** Initializes the display controller, gets the device, and validates state. */
    async initializeDisplay(msg) {
        try {
            const deviceState = DeviceManager.initialize(msg); // Pass msg
            this.validateDeviceState(deviceState); // Use 'this'
            return true;
        } catch (error) {
            Logger.setStatus(`Init Error: ${error.message}`, "error");
            return false;
        }
    },

    /** Validates if the device is in the allowed mode and action state. */
    validateDeviceState({ currentMode, currentAction, allowedMode }) {
        if (currentMode !== allowedMode) {
            throw new Error(`Invalid mode: ${currentMode} (needs ${allowedMode})`);
        }
        const device = DeviceManager.device;
        if (!device) throw new Error("DeviceManager not initialized before validateDeviceState call.");
        if (currentAction === device.constructor.ACTIONS.PAUSE ||
            currentAction === device.constructor.ACTIONS.STOP) {
            throw new Error(`Display paused (${currentAction})`);
        }
    },

    /** Renders the background grid lines for the power price chart with top-to-bottom opacity gradient. */
    async renderGrid() {
        const device = DeviceManager.device;
        const config = DisplayConfig.CHART.POWER_PRICE.GRID;
        if (!config) { Logger.debug("Grid config missing."); return; } // Safety check

        // Calculate spacing if not already cached
        if (!config.spacing.xDelta || !config.spacing.yDelta) {
            const vCount = config.vertical?.count || 1;
            const hCount = config.horizontal?.count || 1;
            config.spacing.xDelta = (vCount > 1) ? Math.floor((config.endPos[0] - config.startPos[0]) / (vCount - 1)) : 0;
            config.spacing.yDelta = (hCount > 1) ? Math.floor((config.endPos[1] - config.startPos[1]) / (hCount - 1)) : 0;
        }

        // Draw horizontal lines with increasing opacity from top to bottom
        if (config.horizontal?.count > 0 && config.horizontal?.color) {
            const totalLines = config.horizontal.count;
            // Configuration for alpha gradient
            const alphaRange = config.horizontal.alphaRange ?? 150; // Range from min to max alpha
            const minAlpha = config.horizontal.minAlpha ?? 50; // Minimum alpha for top line

            for (let i = 0; i < totalLines; i++) {
                const y = config.startPos[1] + (i * config.spacing.yDelta);

                // Calculate alpha that increases as we move down (i increases)
                // For the first line (i=0), alpha = minAlpha
                // For the last line (i=totalLines-1), alpha = minAlpha + alphaRange
                const alpha = Math.min(255, minAlpha + Math.round((i / (totalLines - 1)) * alphaRange));

                const color = [...config.horizontal.color.slice(0, 3), alpha];
                await device.drawLineRgba([config.startPos[0] - config.overhang, y], [config.endPos[0] + config.overhang, y], color);
            }
        }

        // Draw vertical lines
        if (config.vertical?.count > 0 && config.vertical?.color) {
            for (let i = 0; i < config.vertical.count; i++) {
                const x = config.startPos[0] + (i * config.spacing.xDelta);
                await device.drawLineRgba([x, config.startPos[1] - config.overhang], [x, config.endPos[1] + config.overhang], config.vertical.color);
            }
        }
    },

    /** Renders static background images and the price chart grid. */
    async renderBackground() {
        const device = DeviceManager.device;
        const elements = DisplayConfig.IMAGES;
        await this.renderGrid(); // Draw grid first
        const imagesToDraw = [elements.PRICE_BACKGROUND, elements.PV_BACKGROUND, elements.BATTERY, elements.CENT_SIGN, elements.KWH_UNIT, elements.SUN, elements.MOON];
        for (const image of imagesToDraw) {
            if (image && image.path) {
                try { await device.drawImageWithAlpha(image.path, image.position, image.dimensions, image.alpha); }
                catch (imgError) { Logger.debug(`Error drawing image ${image.path}: ${imgError.message}`); }
            }
        }
    },

    /** Main render loop: clears, draws background, components, and pushes frame. */
    async render() {
        const device = DeviceManager.device;
        const api = DeviceManager.api;
        if (!device || !api) throw new Error("Device or API not available in render");

        await api.clear();
        await this.renderBackground(); // Draw static background elements + grid

        // --- Animation Index Update (using dynamicState) ---
        // Get current index and increment for next time, handling wrap-around
        let currentPriceAnimationIndex = device.getState('price_anim_index', 0);
        let nextPriceAnimationIndex = (currentPriceAnimationIndex + 1) % (FLOW_ANI_INDEX_MAX + 1); // Wrap around
        device.setState('price_anim_index', nextPriceAnimationIndex);
        // --- End Animation Index Update ---


        // --- Calculate Alpha for Battery Charge/Discharge Indicator ---
        // Simple pulsing effect based on *current* animation index
        const normalizedProgress = Math.abs((currentPriceAnimationIndex / FLOW_ANI_INDEX_MAX) * 2 - 1); // 0 -> 1 -> 0
        const fadeStartOpacity = 10;
        const fadeMaxOpacity = 255 - fadeStartOpacity;
        const STATUS_IMG_ALPHA = Math.floor(fadeStartOpacity + (normalizedProgress * fadeMaxOpacity));

        // --- Render Dynamic Components ---
        // Execute sequentially for easier debugging and predictable layering
        const slashPosition = await DisplayComponents.renderPvPredictionTotal(device); // to get slash position

        await DisplayComponents.renderClock(device);
        await DisplayComponents.renderPrice(device);
        await DisplayComponents.renderBatteryFill(device, STATUS_IMG_ALPHA);
        //await DisplayComponents.renderPvPredictionBars(device); // TODO: bugged/no data?
        await DisplayComponents.renderPvActualBars(device);
        await DisplayComponents.renderPvTotal(device, slashPosition); // Pass slash pos needed from renderPvPredictionTotal
        await DisplayComponents.renderUviText(device); 

        await DisplayComponents.renderPowerPriceBars(device); // This includes the chart loop with markers and bars
        await DisplayComponents.renderLabels(device); // Render chart labels last to be on top

        // --- Push Frame ---
        await api.push();
    },
}; // End DisplayController

// ------------------------------------- MAIN EXECUTION -------------------------------------

/** Main async function executed by the Node-RED function node. */
async function main() {
    const startTime = Date.now();
    try {
        const initialized = await DisplayController.initializeDisplay(msg);
        if (!initialized) {
            // Status already set by initializeDisplay
            return { payload: { error: "Device initialization failed", device: DeviceManager.targetDeviceHost || 'Unknown', timestamp: new Date().toISOString() } };
        }

        await DisplayController.render(); // Execute the main render logic

        const renderTime = Date.now() - startTime;
        Logger.setStatus(`▶️ ${renderTime}ms`); // Set success status

        // Return success payload
        return {
            payload: {
                renderTime,
                device: DeviceManager.targetDeviceHost, // Include device info
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        // Catch any unhandled errors during initialization or rendering
        const renderTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Set node status to error state
        Logger.setStatus(`Error: ${errorMessage} (${renderTime}ms)`, "error");

        // Return error payload
        return {
            payload: {
                error: errorMessage,
                device: DeviceManager.targetDeviceHost || 'Unknown', // Include device info
                renderTime,
                timestamp: new Date().toISOString()
            }
        };
    }
}

// Execute main function and return its result
return main();