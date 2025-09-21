# scenes/ - Visual Scenes

This directory contains all the visual scenes that can be displayed on the
Pixoo device. Each file represents a self-contained module that exports a
standard interface for the `SceneManager` to use.

## Scene Architecture

A valid scene is a JavaScript module that exports an object with the following
properties:

- `name` (string): A unique identifier for the scene. This is used in MQTT
  commands to select the scene.
- `init` (async function): Optional. Called once when the scene is initialized
  for a device. Use for one-time setup.
- `render` (async function): The main rendering function. It receives a
  `context` object containing the device, state, and utilities. It should draw
  to the device's buffer and then return either:
  - a `number` (milliseconds) indicating the next desired delay for the central
    scheduler (loop-driven scenes), or
  - `null` to signal completion (the scheduler will stop looping this scene).
- `cleanup` (async function): Optional. Called when switching away from the
  scene. Use to clean up resources.
- `wantsLoop` (boolean): Whether the scene should be driven by the central
  scheduler loop. Animated scenes set `true`; static scenes set `false`.

**IMPORTANT:** Every `render` that draws to the screen **must** call
`await device.push()` to make changes visible on the device.

Pure-render contract: Scenes must not manage their own timers or publish MQTT
continuations. Timing is handled centrally; use the `render` return value to
control cadence.

## Core Scenes

- `advanced_chart.js`: Renders an advanced, dynamic line chart.
- `empty.js`: A blank scene, used to clear the display.
- `fill.js`: Fills the entire screen with a solid color.
- `power_price.js`: **Professional power price display** - Complete migration from Node-RED
  POWER_PRICE_RENDERER with all features: clock, battery status, PV charts, price charts, UVI, and moon phase.
- `startup.js`: Displays deployment and version information when the daemon
  starts.

## Power Price Scene (`power_price.js`)

The `power_price` scene is a professional migration of the Node-RED POWER_PRICE_RENDERER function node.
It replicates all the original functionality while using the new daemon architecture.

### Features

- **Digital Clock**: With blinking separator and shadow effects
- **Battery Status**: Fill indicator with charge/discharge status
- **Power Price Chart**: Grid-based chart with current price display
- **PV Data**: Actual and prediction bars with proper scaling
- **UVI Display**: UV Index with trend arrows
- **Moon Phase**: Dynamic moon phase display
- **Time-based Layout**: Automatic afternoon layout shifts
- **Professional Rendering**: Uses scene-base utilities and error handling

### Configuration Parameters

The scene accepts the following parameters via MQTT payload:

```javascript
{
  "scene": "power_price",
  "powerPriceData": {
    // Power price data object with hourly prices
    "data": {
      "2025-01-20-14": { "currentCentPrice": 25.5 },
      "2025-01-20-15": { "currentCentPrice": 23.2 },
      // ... more hourly data
    }
  },
  "currentCentPrice": 24.7, // Current power price in cents
  "dailyPvDataActual": [1500, 1800, 2100, ...], // Actual PV yield in Wh per hour
  "pvHourlyYieldPrediction": [1600, 1900, 2200, ...], // Predicted PV yield
  "batteryStatus": {
    "USOC": 85, // Battery charge percentage
    "BatteryCharging": false,
    "BatteryDischarging": true
  },
  "uviData": {
    "currentUvi": [14, 6.5, 7.2] // [hour, currentUVI, nextHourUVI]
  },
  "localTimeData": {
    "isDaytime": true // Day/night detection
  },
  "moonPhaseData": "/pixoo-media/moonphase/5x5/Moon_15.png", // Moon image path
  "enableAnimation": true, // Enable blinking and animations
  "frames": null // null for continuous, number for limited frames
}
```

### Usage Examples

**Basic Usage** (continuous display):

```bash
mosquitto_pub -h $HOST -t "pixoo/$DEVICE_IP/state/upd" -m '{"scene":"power_price","currentCentPrice":24.5}'
```

**With PV Data**:

```bash
mosquitto_pub -h $HOST -t "pixoo/$DEVICE_IP/state/upd" -m '{
  "scene": "power_price",
  "currentCentPrice": 24.5,
  "dailyPvDataActual": [1200, 1800, 2400, 3000, 2800, 2200, 1500, 800],
  "batteryStatus": {"USOC": 85, "BatteryCharging": false}
}'
```

**Complete Configuration**:

```bash
mosquitto_pub -h $HOST -t "pixoo/$DEVICE_IP/state/upd" -m '{
  "scene": "power_price",
  "powerPriceData": {"data": {"2025-01-20-14": {"currentCentPrice": 25.5}}},
  "currentCentPrice": 24.7,
  "dailyPvDataActual": [1500, 1800, 2100, 2500, 2800, 2200, 1500, 800],
  "pvHourlyYieldPrediction": [1600, 1900, 2200, 2600, 2900, 2300, 1600, 900],
  "batteryStatus": {"USOC": 85, "BatteryCharging": false, "BatteryDischarging": true},
  "uviData": {"currentUvi": [14, 6.5, 7.2]},
  "localTimeData": {"isDaytime": true},
  "enableAnimation": true
}'
```

### Data Source Mapping

The scene expects data in the same format as the original Node-RED function:

| Parameter                 | Original Global Context                            | Description                 |
| ------------------------- | -------------------------------------------------- | --------------------------- |
| `powerPriceData`          | `global.get('powerPriceData', 'powerprices')`      | Historical power price data |
| `currentCentPrice`        | `global.get('currentCentprice', 'powerprices')`    | Current power price         |
| `dailyPvDataActual`       | `global.get('dailyPvDataActual')`                  | Actual PV yield data        |
| `pvHourlyYieldPrediction` | `global.get('PV_HOURLY_YIELD_PREDICTION', 'disk')` | PV prediction data          |
| `batteryStatus`           | `global.get('home/ke/sonnenbattery/status')`       | Battery status              |
| `uviData`                 | `global.get('home.weather.uvi', 'disk')`           | UV Index data               |
| `localTimeData`           | `global.get('isDaytime')`                          | Day/night detection         |
| `moonPhaseData`           | `global.get('suncalc')`                            | Moon phase calculation      |

### Default Behavior

When parameters are not provided, the scene will:

- Display placeholder data for missing sources
- Show battery at 50% charge with no charging indicator
- Display UVI as "-" if data unavailable
- Use current system time for clock
- Apply afternoon layout shift based on system time
- Enable animations by default

### Migration from Node-RED

To migrate from the original Node-RED POWER_PRICE_RENDERER function node:

1. **Replace the function node** with MQTT command nodes
2. **Map your global contexts** to MQTT payload parameters:

   ```javascript
   // Instead of: global.get('powerPriceData', 'powerprices')
   // Use: msg.payload.powerPriceData = global.get('powerPriceData', 'powerprices')

   // Instead of: global.get('currentCentprice', 'powerprices')
   // Use: msg.payload.currentCentPrice = global.get('currentCentprice', 'powerprices')
   ```

3. **Send to the daemon topic**: `pixoo/YOUR_DEVICE_IP/state/upd`
4. **Remove complex logic**: The scene handles time-based shifts, animations, and layout automatically

**Example Migration Flow**:

```javascript
// Original Node-RED flow
const priceData = global.get('powerPriceData', 'powerprices');
const currentPrice = global.get('currentCentprice', 'powerprices');
const pvData = global.get('dailyPvDataActual');
// ... complex processing ...

// New MQTT-based flow
const payload = {
  scene: 'power_price',
  powerPriceData: global.get('powerPriceData', 'powerprices'),
  currentCentPrice: global.get('currentCentprice', 'powerprices'),
  dailyPvDataActual: global.get('dailyPvDataActual'),
  // ... other data sources
};

return { payload: payload, topic: 'pixoo/192.168.1.159/state/upd' };
```

## Example Scenes

The `scenes/examples/` directory contains scenes used for testing and
demonstration purposes. These are fully functional and provide good examples of
how to use the drawing API.

- `draw_api_animated.js`: Demonstrates various animation techniques.
- `draw_api.js`: Shows examples of all available drawing primitives.
- `performance-test.js`: Used for performance benchmarking.
