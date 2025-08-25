/**
 * @fileoverview Advanced Chart Renderer - Professional data visualization
 * @description High-performance chart rendering with sophisticated features extracted from
 * legacy Node-RED implementation. Supports negative values, overflow handling, gradients,
 * and professional data visualization.
 * @version 1.0.0
 * @author: Claude + Cursor + Markus Barta (mba)
 * @license MIT
 */

'use strict';

/**
 * Chart configuration constants with professional defaults
 * @readonly
 * @enum {Object}
 */
const CHART_DEFAULTS = Object.freeze({
    // Layout
    DIMENSIONS: { WIDTH: 64, HEIGHT: 64 },
    MARGINS: { TOP: 5, RIGHT: 2, BOTTOM: 10, LEFT: 2 },

    // Visual settings
    AXIS_COLOR: [64, 64, 64, 191],
    GRID_COLOR: [32, 32, 32, 127],
    ZERO_LINE_COLOR: [128, 128, 128, 191],

    // Performance
    MAX_DATA_POINTS: 64,
    UPDATE_INTERVAL_MS: 100,

    // Scaling
    MIN_SCALE: 0.1,
    MAX_SCALE: 1000,
    DEFAULT_SCALE: 20, // € per pixel

    // Animation
    BLINK_INTERVAL_MS: 500,
    FADE_DURATION_MS: 2000
});

/**
 * Professional chart data processor with advanced features
 * @class
 */
class ChartDataProcessor {
    /**
     * @param {Object} config - Chart configuration
     */
    constructor(config = {}) {
        this.config = { ...CHART_DEFAULTS, ...config };
    }

    /**
     * Processes raw price data into renderable chart data
     * @param {number[]} rawData - Raw price values
     * @param {Object} options - Processing options
     * @returns {Object} Processed chart data
     */
    processData(rawData, options = {}) {
        if (!Array.isArray(rawData)) {
            throw new Error('Invalid data: must be array of numbers');
        }

        const {
            scale = this.config.DEFAULT_SCALE,
            zeroThreshold = 0.005,
            maxHeight = 40
        } = options;

        const processed = rawData.map((price, index) => {
            // Handle zero threshold
            if (Math.abs(price) < zeroThreshold) {
                return {
                    originalPrice: price,
                    displayPrice: 0,
                    pixels: 0,
                    isNegative: false,
                    isZero: true,
                    isOverflow: false,
                    index
                };
            }

            // Handle negative prices
            if (price < 0) {
                const cappedPrice = Math.max(price, -this.config.MAX_SCALE);
                return {
                    originalPrice: price,
                    displayPrice: cappedPrice,
                    pixels: Math.abs(Math.round(cappedPrice / scale)),
                    isNegative: true,
                    isZero: false,
                    isOverflow: Math.abs(cappedPrice) > maxHeight * scale,
                    index
                };
            }

            // Handle positive prices
            const cappedPrice = Math.min(price, this.config.MAX_SCALE);
            return {
                originalPrice: price,
                displayPrice: cappedPrice,
                pixels: Math.round(cappedPrice / scale),
                isNegative: false,
                isZero: false,
                isOverflow: cappedPrice > maxHeight * scale,
                index
            };
        });

        return {
            data: processed,
            metadata: {
                scale,
                zeroThreshold,
                maxHeight,
                valueRange: this.calculateValueRange(processed),
                statistics: this.calculateStatistics(processed)
            }
        };
    }

    /**
     * Calculates the value range for scaling
     * @param {Object[]} processedData - Processed chart data
     * @returns {Object} Value range information
     */
    calculateValueRange(processedData) {
        const prices = processedData.map(item => item.originalPrice);
        return {
            min: Math.min(...prices),
            max: Math.max(...prices),
            range: Math.max(...prices) - Math.min(...prices),
            hasNegative: prices.some(price => price < 0),
            hasPositive: prices.some(price => price > 0)
        };
    }

    /**
     * Calculates statistics for the dataset
     * @param {Object[]} processedData - Processed chart data
     * @returns {Object} Statistical information
     */
    calculateStatistics(processedData) {
        const prices = processedData.map(item => item.originalPrice);
        const nonZeroPrices = prices.filter(price => Math.abs(price) > 0.001);

        if (nonZeroPrices.length === 0) {
            return { min: 0, max: 0, avg: 0, median: 0 };
        }

        return {
            min: Math.min(...nonZeroPrices),
            max: Math.max(...nonZeroPrices),
            avg: nonZeroPrices.reduce((sum, price) => sum + price, 0) / nonZeroPrices.length,
            median: this.calculateMedian(nonZeroPrices)
        };
    }

    /**
     * Calculates median of an array
     * @param {number[]} values - Array of values
     * @returns {number} Median value
     */
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ?
            (sorted[mid - 1] + sorted[mid]) / 2 :
            sorted[mid];
    }
}

/**
 * Professional chart renderer with advanced visualization features
 * @class
 */
class AdvancedChartRenderer {
    /**
     * @param {Object} device - Device interface
     * @param {Object} config - Chart configuration
     */
    constructor(device, config = {}) {
        this.device = device;
        this.config = { ...CHART_DEFAULTS, ...config };
        this.dataProcessor = new ChartDataProcessor(config);
        this.blinkState = false;
        this.lastBlinkTime = Date.now();
    }

    /**
     * Renders a complete chart with all advanced features
     * @param {number[]} data - Chart data values
     * @param {Object} options - Rendering options
     * @returns {Promise<Object>} Render result with metadata
     */
    async render(data, options = {}) {
        const startTime = Date.now();

        try {
            // Process data
            const processedData = this.dataProcessor.processData(data, options);

            // Update blink state for overflow indicators
            this.updateBlinkState();

            // Clear chart area
            await this.clearChartArea();

            // Render chart components
            await this.renderAxes();
            await this.renderGrid();
            await this.renderZeroLine();
            await this.renderData(processedData, options);
            await this.renderLabels(processedData.metadata);

            const renderTime = Date.now() - startTime;

            return {
                success: true,
                renderTime,
                metadata: processedData.metadata,
                dataPoints: processedData.data.length
            };

        } catch (error) {
            console.error(`Chart render error: ${error.message}`);
            return {
                success: false,
                error: error.message,
                renderTime: Date.now() - startTime
            };
        }
    }

    /**
     * Updates the blink state for overflow indicators
     * @private
     */
    updateBlinkState() {
        const now = Date.now();
        if (now - this.lastBlinkTime >= this.config.BLINK_INTERVAL_MS) {
            this.blinkState = !this.blinkState;
            this.lastBlinkTime = now;
        }
    }

    /**
     * Clears the chart rendering area
     * @private
     */
    async clearChartArea() {
        const { WIDTH, HEIGHT } = this.config.DIMENSIONS;
        const { TOP, RIGHT, BOTTOM, LEFT } = this.config.MARGINS;

        for (let y = TOP; y < HEIGHT - BOTTOM; y++) {
            for (let x = LEFT; x < WIDTH - RIGHT; x++) {
                await this.device.drawPixelRgba([x, y], [0, 0, 0, 255]);
            }
        }
    }

    /**
     * Renders chart axes
     * @private
     */
    async renderAxes() {
        const { WIDTH, HEIGHT } = this.config.DIMENSIONS;
        const { TOP, BOTTOM, LEFT } = this.config.MARGINS;

        // Y-axis
        for (let y = TOP; y < HEIGHT - BOTTOM; y++) {
            await this.device.drawPixelRgba([LEFT, y], this.config.AXIS_COLOR);
        }

        // X-axis
        for (let x = LEFT; x < WIDTH - this.config.MARGINS.RIGHT; x++) {
            await this.device.drawPixelRgba([x, HEIGHT - BOTTOM], this.config.AXIS_COLOR);
        }
    }

    /**
     * Renders grid lines for better readability
     * @private
     */
    async renderGrid() {
        const { WIDTH, HEIGHT } = this.config.DIMENSIONS;
        const { TOP, BOTTOM, LEFT, RIGHT } = this.config.MARGINS;

        // Horizontal grid lines (price levels)
        const gridSpacing = 10;
        for (let y = TOP; y < HEIGHT - BOTTOM; y += gridSpacing) {
            for (let x = LEFT; x < WIDTH - RIGHT; x += 2) { // Dotted line
                await this.device.drawPixelRgba([x, y], this.config.GRID_COLOR);
            }
        }
    }

    /**
     * Renders the zero line with special emphasis
     * @private
     */
    async renderZeroLine() {
        const { WIDTH } = this.config.DIMENSIONS;
        const { LEFT, RIGHT, BOTTOM } = this.config.MARGINS;
        const zeroY = this.config.DIMENSIONS.HEIGHT - BOTTOM - 20; // Zero line position

        for (let x = LEFT; x < WIDTH - RIGHT; x++) {
            await this.device.drawPixelRgba([x, zeroY], this.config.ZERO_LINE_COLOR);
        }
    }

    /**
     * Renders the actual chart data with advanced features
     * @param {Object} processedData - Processed chart data
     * @param {Object} options - Rendering options
     * @private
     */
    async renderData(processedData, options = {}) {
        const { data } = processedData;
        const { gradientType = 'power' } = options;
        const chartStartX = this.config.MARGINS.LEFT + 1;
        const zeroY = this.config.DIMENSIONS.HEIGHT - this.config.MARGINS.BOTTOM - 20;

        for (let i = 0; i < Math.min(data.length, this.config.MAX_DATA_POINTS); i++) {
            const item = data[i];
            const x = chartStartX + i * 2; // 2 pixels per data point

            if (item.isZero) {
                // Render zero indicator
                await this.device.drawPixelRgba([x, zeroY], [128, 128, 128, 191]);
            } else if (item.isNegative) {
                // Render negative value bar
                await this.renderNegativeBar(x, zeroY, item.pixels, item.isOverflow);
            } else {
                // Render positive value bar
                await this.renderPositiveBar(x, zeroY, item.pixels, item.isOverflow, gradientType);
            }
        }
    }

    /**
     * Renders a negative value bar (below zero line)
     * @param {number} x - X coordinate
     * @param {number} zeroY - Zero line Y coordinate
     * @param {number} pixels - Number of pixels to render
     * @param {boolean} isOverflow - Whether this is an overflow value
     * @private
     */
    async renderNegativeBar(x, zeroY, pixels, isOverflow) {
        const alpha = isOverflow ? (this.blinkState ? 255 : 64) : 191;
        const color = [255, 0, 0, alpha]; // Red for negative

        for (let i = 1; i <= Math.min(pixels, 20); i++) {
            await this.device.drawPixelRgba([x, zeroY + i], color);
        }
    }

    /**
     * Renders a positive value bar (above zero line)
     * @param {number} x - X coordinate
     * @param {number} zeroY - Zero line Y coordinate
     * @param {number} pixels - Number of pixels to render
     * @param {boolean} isOverflow - Whether this is an overflow value
     * @param {string} gradientType - Type of gradient to use
     * @private
     */
    async renderPositiveBar(x, zeroY, pixels, isOverflow, gradientType) {
        const alpha = isOverflow ? (this.blinkState ? 255 : 64) : 255;

        if (gradientType === 'power') {
            // Power gradient: yellow (top) to red (bottom)
            const startColor = [255, 255, 0, alpha]; // Yellow
            const endColor = [255, 0, 0, alpha];     // Red

            for (let i = 1; i <= Math.min(pixels, 20); i++) {
                const factor = i / Math.min(pixels, 20);
                const color = [
                    Math.round(startColor[0] + (endColor[0] - startColor[0]) * factor),
                    Math.round(startColor[1] + (endColor[1] - startColor[1]) * factor),
                    Math.round(startColor[2] + (endColor[2] - startColor[2]) * factor),
                    alpha
                ];
                await this.device.drawPixelRgba([x, zeroY - i], color);
            }
        } else {
            // Solid color
            const color = [255, 255, 0, alpha]; // Yellow
            for (let i = 1; i <= Math.min(pixels, 20); i++) {
                await this.device.drawPixelRgba([x, zeroY - i], color);
            }
        }
    }

    /**
     * Renders chart labels and statistics
     * @param {Object} metadata - Chart metadata
     * @private
     */
    async renderLabels(metadata) {
        const { statistics } = metadata;
        const { HEIGHT } = this.config.DIMENSIONS;

        // Render scale information
        const scaleText = `±${Math.round(statistics.max)}`;
        await this.device.drawTextRgbaAligned(scaleText, [2, 5], [128, 128, 128, 255], "left");

        // Render statistics
        const avgText = `AVG:${Math.round(statistics.avg)}`;
        await this.device.drawTextRgbaAligned(avgText, [2, HEIGHT - 8], [255, 255, 255, 255], "left");
    }

    /**
     * Gets the current blink state for overflow indicators
     * @returns {boolean} Current blink state
     */
    getBlinkState() {
        return this.blinkState;
    }

    /**
     * Sets the blink interval for overflow indicators
     * @param {number} intervalMs - Blink interval in milliseconds
     */
    setBlinkInterval(intervalMs) {
        this.config.BLINK_INTERVAL_MS = Math.max(100, intervalMs);
    }
}

/**
 * Creates a professional chart renderer with predefined configurations
 * @param {Object} device - Device interface
 * @param {Object} config - Chart configuration
 * @returns {Object} Chart renderer with professional methods
 */
function createAdvancedChartRenderer(device, config = {}) {
    const renderer = new AdvancedChartRenderer(device, config);

    return {
        /**
         * Renders a power price chart
         * @param {number[]} prices - Array of power prices
         * @param {Object} options - Rendering options
         */
        async renderPowerChart(prices, options = {}) {
            return renderer.render(prices, {
                gradientType: 'power',
                scale: 2, // €2 per pixel
                ...options
            });
        },

        /**
         * Renders a temperature chart
         * @param {number[]} temperatures - Array of temperature values
         * @param {Object} options - Rendering options
         */
        async renderTemperatureChart(temperatures, options = {}) {
            return renderer.render(temperatures, {
                gradientType: 'temperature',
                scale: 1, // 1°C per pixel
                ...options
            });
        },

        /**
         * Renders a generic data chart
         * @param {number[]} data - Array of data values
         * @param {Object} options - Rendering options
         */
        async renderGenericChart(data, options = {}) {
            return renderer.render(data, {
                gradientType: 'rainbow',
                scale: options.scale || 1,
                ...options
            });
        },

        /**
         * Gets the current blink state
         */
        getBlinkState() {
            return renderer.getBlinkState();
        },

        /**
         * Sets the blink interval
         * @param {number} intervalMs - Blink interval in milliseconds
         */
        setBlinkInterval(intervalMs) {
            renderer.setBlinkInterval(intervalMs);
        },

        /**
         * Gets the chart configuration
         */
        getConfig() {
            return renderer.config;
        }
    };
}

module.exports = {
    AdvancedChartRenderer,
    ChartDataProcessor,
    createAdvancedChartRenderer,
    CHART_DEFAULTS
};
