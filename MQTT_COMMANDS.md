# MQTT Scene Commands

This document provides copy-pasteable MQTT commands to trigger the various scenes
available in the Pixoo Daemon.

**Note**: Replace `192.168.1.159` with your device's IP address.

---

## Core Scenes

### `startup`

Displays the daemon's version and build information.

```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'
```

### `empty`

Clears the screen.

```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"empty"}'
```

### `fill`

Fills the screen with a solid color.

```bash
# Fill with red
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"fill","color":[255,0,0,255]}'
```

### `advanced_chart`

Displays an advanced, dynamic line chart.

```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"advanced_chart"}'
```

### `power_price`

Displays a comprehensive electricity pricing dashboard with prices, PV generation, battery status, weather data, and animated clock.

```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"power_price","powerPriceData":{"data":{"2025-01-20-14":{"currentCentPrice":25.5},"2025-01-20-15":{"currentCentPrice":23.2}}},"currentCentPrice":24.7,"dailyPvDataActual":[1500,1800,2100],"pvHourlyYieldPrediction":[1600,1900,2200],"batteryStatus":{"USOC":85,"BatteryCharging":false,"BatteryDischarging":true},"uviData":{"currentUvi":[null,5,7]},"enableAnimation":true}'
```

---

## Example Scenes

### `draw_api` & `draw_api_animated`

Demonstrates the drawing API primitives. The animated version supports optional
`frames` and `interval` parameters and adheres to the pure-render contract
with a central scheduler.

```bash
# Static draw_api
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api"}'

# draw_api_animated adaptive (indefinite)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated"}'

# draw_api_animated adaptive with finite frames (stops after 64 pushes)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated","frames":64}'

# draw_api_animated fixed interval 150ms, 100 frames
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"draw_api_animated","interval":150,"frames":100}'
```

### `performance-test`

Used for performance benchmarking (adaptive or fixed interval).

```bash
# Adaptive mode (50 frames)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance-test","frames":50}'

# Fixed interval (150ms, 100 frames)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"performance-test","interval":150,"frames":100}'
```
