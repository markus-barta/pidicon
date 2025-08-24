/**
 * Quick test to verify ChartRenderer instantiation works
 */

try {
    // Mock objects
    const mockDevice = {};
    const mockGetState = () => {};
    const mockSetState = () => {};
    const mockPerformanceTracker = {};
    const mockGradientRenderer = {};
    const mockAdvancedFeatures = {
        GRADIENT_RENDERING: false,
        ADVANCED_CHART: false,
        ENHANCED_TEXT: false,
        IMAGE_PROCESSING: false,
        ANIMATIONS: false,
        PERFORMANCE_MONITORING: true
    };

    // Import the ChartRenderer class
    const { ChartRenderer } = require('./scenes/test_performance_v3.js');

    // Try to instantiate
    const chartRenderer = new ChartRenderer(
        mockDevice,
        mockGetState,
        mockSetState,
        mockPerformanceTracker,
        mockGradientRenderer,
        mockAdvancedFeatures
    );

    console.log('✅ ChartRenderer instantiation successful!');
    console.log('✅ gradientRenderer:', chartRenderer.gradientRenderer !== undefined);
    console.log('✅ advancedFeatures:', chartRenderer.advancedFeatures !== undefined);

} catch (error) {
    console.error('❌ ChartRenderer test failed:', error.message);
    console.error(error.stack);
}
