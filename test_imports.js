/**
 * Quick test to verify ADVANCED_FEATURES import is working
 */

try {
    const deviceAdapter = require('./lib/device-adapter');
    console.log('✅ Device adapter loaded successfully');

    const ADVANCED_FEATURES = deviceAdapter.ADVANCED_FEATURES;
    console.log('✅ ADVANCED_FEATURES:', ADVANCED_FEATURES);

    if (ADVANCED_FEATURES) {
        console.log('✅ ADVANCED_FEATURES properties:');
        Object.entries(ADVANCED_FEATURES).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
    } else {
        console.error('❌ ADVANCED_FEATURES is undefined');
    }

    console.log('✅ All imports working correctly!');

} catch (error) {
    console.error('❌ Import test failed:', error.message);
    console.error(error.stack);
}
