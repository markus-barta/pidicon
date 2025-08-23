# Pixoo V3 Commands

## 🎯 Available Scenes

### Core Scenes

- **`empty`** - Black screen (device "off" state)
- **`fill`** - Fill screen with specified color
- **`test_performance_v3`** - Performance testing with adaptive timing
- **`test_draw_api`** - Comprehensive API function testing

### Usage Examples

```bash
# Turn device "off" (black screen)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"empty"}'

# Fill with red
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"fill","color":[255,0,0,255]}'

# Fill with blue
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"fill","color":[0,0,255,255]}'

# Performance test with adaptive timing (optimal)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v3","adaptiveTiming":true}'

# Performance test with fixed timing
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v3","interval":200}'

# Test all drawing API functions
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_draw_api"}'

# Test specific API functions
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_draw_api","test":"pixels"}'
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_draw_api","test":"rectangles"}'
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_draw_api","test":"text"}'

# Stop any running test
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v3","stop":true}'
```

## 📋 Parameters

### Fill Scene

- **`color`** (optional): RGBA array `[R,G,B,A]` (0-255), default `[255,0,0,255]` (red)

### Performance Test V3

- **`adaptiveTiming`** (optional): `true` for frametime-based delays, `false` for fixed interval
- **`interval`** (optional): Fixed interval in ms (100-350 recommended)
- **`stop`** (optional): `true` to stop running tests

### Draw API Test

- **`test`** (optional): `"pixels"`, `"rectangles"`, `"lines"`, `"text"`, `"gradients"`, or `"all"` (default)

## 🎨 Color Reference

- **Red**: `[255,0,0,255]`
- **Green**: `[0,255,0,255]`
- **Blue**: `[0,0,255,255]`
- **White**: `[255,255,255,255]`
- **Black**: `[0,0,0,255]`
- **50% Alpha**: Change last value to 127

## 📊 Testing Strategy

| **Goal** | **Use This** | **Why** |
|----------|-------------|---------|
| **API Validation** | `test_draw_api` | Tests all drawing functions work correctly |
| **Performance** | `test_performance_v3` + `adaptiveTiming: true` | Optimal timing based on actual performance |
| **Benchmarking** | `test_performance_v3` + fixed `interval` | Consistent timing for comparisons |
| **Device Off** | `empty` | Clean black screen state |

## 🔧 Environment Setup

```bash
export MOSQITTO_HOST_MS24=your_mqtt_host
export MOSQITTO_USER_MS24=your_username
export MOSQITTO_PASS_MS24=your_password
```
