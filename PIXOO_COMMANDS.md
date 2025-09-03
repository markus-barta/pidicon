# Pixoo Daemon 2025

## 🎯 Scenes

### Core Scenes

- **`startup`** - Deployment information and version display
- **`empty`** - Black screen (device "off" state)
- **`fill`** - Fill screen with specified color
- **`test_performance_v3`** - Performance testing with adaptive timing
- **`test_draw_api`** - Comprehensive API function testing
- **`advanced_chart`** - Professional data visualization with charts
- **`test_performance_v2`** - Legacy performance testing (deprecated)
- **`test_draw_api_animated`** - Animated API testing

### Usage Examples

```bash
# Show deployment information
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'

# Turn device "off" (black screen)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"empty"}'

# Fill with red
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"fill","color":[255,0,0,255]}'

# Fill with blue
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"fill","color":[0,0,255,255]}'

# Performance test with adaptive timing (optimal) - 63 frames (default)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"test_performance_v3","adaptiveTiming":true}'

# Performance test with fixed timing - 200 frames
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"test_performance_v3","interval":200,"frames":200}'

# Stop any running performance test
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"test_performance_v3","stop":true}'

# Test all drawing API functions
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"test_draw_api"}'

# Test specific API functions
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"test_draw_api","test":"pixels"}'
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"test_draw_api","test":"rectangles"}'
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"test_draw_api","test":"text"}'

# Advanced chart demo
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"advanced_chart","mode":"demo","dataType":"power","updateInterval":2000,"scale":5}'

# Advanced chart with temperature data
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"advanced_chart","mode":"demo","dataType":"temperature","updateInterval":2000,"scale":1}'

# Animated API testing
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"test_draw_api_animated"}'
```

## 📋 Parameters

### Fill Scene

- **`color`** (optional): RGBA array `[R,G,B,A]` (0-255), default
  `[255,0,0,255]` (red)

### Performance Test V3

- **`mode`** (optional): `"continuous"`, `"loop"`, or `"burst"` (default: `"continuous"`)
- **`adaptiveTiming`** (optional): `true` for frametime-based delays,
  `false` for fixed interval
- **`interval`** (optional): Fixed interval in ms (50-2000, default: 150)
- **`frames`** (optional): Number of frames to test (default: 63 for one screen width)
- **`duration`** (optional): Loop duration in ms (for loop mode, default: 60000)
- **`clear`** (optional): `true` to clear screen before starting test
- **`stop`** (optional): `true` to stop any running test

### Draw API Test

- **`test`** (optional): `"pixels"`, `"rectangles"`, `"lines"`, `"text"`, `"gradients"`,
  or `"all"` (default)
- **`clear`** (optional): `true` to clear screen before running tests

### Advanced Chart

- **`mode`** (optional): `"demo"` for demo data (default: `"demo"`)
- **`dataType`** (optional): `"power"`, `"temperature"`, or `"random"` (default: `"power"`)
- **`updateInterval`** (optional): Update interval in ms (default: 2000)
- **`scale`** (optional): Chart scale factor (default: 5)
- **`clear`** (optional): `true` to clear screen before drawing

## 🎨 Color Reference

- **Red**: `[255,0,0,255]`
- **Green**: `[0,255,0,255]`
- **Blue**: `[0,0,255,255]`
- **White**: `[255,255,255,255]`
- **Black**: `[0,0,0,255]`
- **50% Alpha**: Change last value to 127

## 📊 Testing Strategy

| **Goal**               | **Use This**                                   | **Why**                               |
| ---------------------- | ---------------------------------------------- | ------------------------------------- |
| **API Validation**     | `test_draw_api`                                | Tests all drawing functions correctly |
| **Performance**        | `test_performance_v3` + `adaptiveTiming: true` | Optimal                               |
| **Benchmarking**       | `test_performance_v3` + fixed `interval`       | Consistent                            |
| **Data Visualization** | `advanced_chart` + `dataType: "power"`         | Professional chart rendering          |
| **Animation Testing**  | `test_draw_api_animated`                       | Animated API validation               |
| **Device Off**         | `empty`                                        | Clean black screen state              |

## 🔧 Environment Setup

```bash
export MOSQITTO_HOST_MS24=your_mqtt_host
export MOSQITTO_USER_MS24=your_username
export MOSQITTO_PASS_MS24=your_password
```
