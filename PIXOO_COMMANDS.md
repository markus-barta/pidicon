# Pixoo Performance Test Commands

## 🎯 Quick Start Commands (Copy & Paste)

### Default Performance Test

```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance"}'
```

### Performance Interval Tests (Realistic 100-350ms Range)

**Note**: Tests run continuously for 30 seconds (default) showing real-time performance data.

```bash
# 100ms (minimum, very fast) - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":100}'

# 150ms (default, balanced) - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":150}'

# 200ms (good range) - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":200}'

# 250ms (expected sweet spot) - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":250}'

# 300ms (upper range) - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":300}'

# 350ms (maximum, slow) - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":350}'
```

### Burst Mode Tests

```bash
# 10-second burst at 120ms
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","mode":"burst","interval":120,"duration":10000}'

# 5-second burst at 150ms
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","mode":"burst","interval":150,"duration":5000}'
```

### Auto Sweep Mode

```bash
# Automatically test all intervals (100→130→160→190→220→250→280→310→350ms, 3s each)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","mode":"sweep"}'
```

### Extended Loop Mode (Self-Sustaining)

```bash
# Run continuous performance test for 5 minutes (300 seconds)
# The scene will automatically send MQTT messages to continue the loop
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","mode":"loop","interval":250,"duration":300000}'

# Custom duration (10 minutes = 600000ms)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","mode":"loop","interval":200,"duration":600000}'

# Stop loop mode (sends stop signal)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","stop":true}'

### Performance Test V2 Commands (New Incremental Rendering)
```bash
# Default performance test v2 (continuous mode with incremental rendering and chart)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v2"}'

# Performance test v2 in continuous mode with custom interval
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v2","mode":"continuous","interval":200}'

# Performance test v2 in auto loop mode (self-sustaining, 64 iterations, 60s max)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v2","mode":"loop","interval":250}'

# Performance test v2 in burst mode (rapid-fire testing for 10 seconds)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v2","mode":"burst","interval":120}'

# Performance test v2 in sweep mode (auto-test multiple intervals: 100-350ms)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v2","mode":"sweep"}'

# Stop any running performance test v2
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance_v2","stop":true}'

**Performance Test V2 Features:**

- ✅ **Incremental rendering**: Only redraws changed text with background clearing
- ✅ **Label/value separation**: Labels (50% opacity), values (100% opacity)
- ✅ **Detailed performance chart**: Line chart with gradient colors (starts at y=50, 20px range)
- ✅ **No fullscreen background**: Clean display with chart visualization
- ✅ **Enhanced "Done" display**: Centered with 50% opacity
- ✅ **Fixed 63 chart points**: Exactly 63 data points for detailed analysis
- ✅ **Frametime-based delays**: Continuous rendering based on scene complexity
- ✅ **60-second time cap**: Maximum test duration to prevent runaway loops
- ✅ **Accurate time estimation**: Time left with milliseconds (mm:ss,sss format)
- ✅ **Axis-aware chart**: Chart starts 1 pixel above axes to avoid overlap
- ✅ **Connected chart lines**: Line chart connects data points instead of individual dots
- ✅ **Test re-run capability**: Automatic cleanup allows immediate test re-runs
- ✅ **Multiple consecutive tests**: Send multiple MQTT messages to run tests consecutively
- ✅ **Enhanced statistics**: "FRAMES" with gray labels, values in white
- ✅ **Gray time display**: Time left shown in gray for better visual hierarchy
- ✅ **Precise millisecond display**: Milliseconds rounded to 3 digits maximum
- ✅ **Optimized statistics positioning**: Properly spaced labels and values
- ✅ **Configurable scaling**: 1-500ms range with ~25ms per pixel resolution
- ✅ **Color gradient**: Blue→Green→Yellow→Orange→Red performance spectrum
- ✅ **Chart axes**: Dark gray x/y axes for reference


**Test Mode Features:**

**Continuous Mode:**
- ✅ **Steady testing**: Fixed interval performance analysis
- ✅ **Real-time display**: Shows CONTINUOUS, frametime, FPS, and countdown
- ✅ **Visual chart**: 64-point performance chart with color gradient
- ✅ **64 iterations**: Fixed test duration with detailed analysis

**Auto Loop Mode:**
- ✅ **Self-sustaining**: Automatically schedules next iteration via MQTT
- ✅ **Frametime-based delays**: Loop timing adapts to scene complexity
- ✅ **60-second cap**: Maximum test duration to prevent runaway loops
- ✅ **Error resilient**: Handles MQTT connection issues gracefully
- ✅ **Stoppable**: Can be stopped anytime with `stop: true`

**Burst Mode:**
- ✅ **Rapid-fire testing**: 10-second high-frequency stress test
- ✅ **Progress tracking**: Real-time progress display (2s/10s)
- ✅ **Performance stress**: Tests device limits with minimal delays

**Sweep Mode:**
- ✅ **Comprehensive testing**: Auto-tests 9 intervals (100-350ms)
- ✅ **3-second cycles**: Each interval tested for 3 seconds
- ✅ **Full range analysis**: Complete performance overview

## 📋 Parameter Explanations

### Performance Test Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `scene` | string | (required) | Must be `"test_performance"` |
| `mode` | string | `"continuous"` | Test mode: `"continuous"`, `"burst"`, `"sweep"`, `"loop"` |
| `interval` | number | `150` | Target update interval in milliseconds (100-350ms recommended) |
| `duration` | number | `30000` (30s) | Test duration in milliseconds (only for loop mode) |
| `stop` | boolean | `false` | Stop a running loop mode test early |

### Test Modes Explained

#### **Continuous Mode** (Default)
- **Purpose**: Steady performance testing at a fixed interval
- **Duration**: Until 64 chart points collected (typically ~30-60 seconds)
- **Display**: Shows "CONTINUOUS [interval]ms", frametime, FPS, and countdown
- **Chart**: 64-point performance chart with color gradient
- **Use Case**: Detailed analysis of specific intervals with visual feedback

#### **Auto Loop Mode** (Self-Sustaining)
- **Purpose**: Extended testing with automatic continuation via MQTT
- **Duration**: Until 64 chart points collected or 60 seconds max
- **Display**: Shows "AUTO LOOP [interval]ms", frametime, FPS, and countdown
- **Self-sustaining**: Automatically schedules next iteration based on frametime
- **Smart timing**: Loop delay adapts to scene complexity for continuous rendering
- **Use Case**: Long-term performance analysis with minimal user intervention

#### **Burst Mode** (Stress Testing)
- **Purpose**: Rapid-fire testing to stress test device limits
- **Duration**: Fixed 10 seconds of continuous updates
- **Display**: Shows "BURST [interval]ms", progress "2s/10s", rapid FPS updates
- **Use Case**: Test device performance under high-frequency conditions

#### **Sweep Mode** (Comprehensive Testing)
- **Purpose**: Automatic testing of multiple intervals
- **Duration**: ~27 seconds (9 intervals × 3 seconds each)
- **Display**: Shows "SWEEP CYCLE:[cycle]", current interval, frametime
- **Intervals**: 100, 130, 160, 190, 220, 250, 280, 310, 350ms
- **Use Case**: Get complete performance overview across all realistic intervals

### Interval Recommendations

| Range | Performance Level | Color Code | Use Case |
|-------|------------------|------------|----------|
| 100-160ms | Excellent | Bright Green | Minimal latency, high responsiveness |
| 160-220ms | Good | Green | Balanced performance, good user experience |
| 220-280ms | Acceptable | Yellow | Noticeable but tolerable delay |
| 280-350ms | Slow | Orange | Heavy lag, reduced usability |
| >350ms | Very Slow | Red | Significant delays, poor experience |

**Expected Sweet Spot**: 180-250ms range for most practical applications

## 🎨 Scene Testing Commands

## 🎨 Color Fill Scene Commands

### Understanding Color Format
The color parameter uses **RGBA format**: `[Red, Green, Blue, Alpha]`
- **Red/Green/Blue**: 0-255 (0 = none, 255 = full intensity)
- **Alpha**: 0-255 (0 = transparent, 255 = opaque)
- **Examples**:
  - Red: `[255, 0, 0, 255]`
  - Green: `[0, 255, 0, 255]`
  - Blue: `[0, 0, 255, 255]`
  - White: `[255, 255, 255, 255]`
  - Black: `[0, 0, 0, 255]`

### Color Fill with Custom Colors
```bash
# Default red fill (no color parameter needed)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill"}'

# Blue fill (as requested!)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[0,0,255,255]}'

# Green fill
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[0,255,0,255]}'

# White fill
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[255,255,255,255]}'

# Black fill (clear screen)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[0,0,0,255]}'

# Purple/Magenta fill
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[255,0,255,255]}'

# Cyan fill
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[0,255,255,255]}'

# Yellow fill
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[255,255,0,255]}'

# Orange fill
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[255,165,0,255]}'

# Pink fill
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill","color":[255,192,203,255]}'

# Custom colors - try your own!
# Dark blue: [0, 0, 139, 255]
# Navy: [0, 0, 128, 255]
# Sky blue: [135, 206, 235, 255]
# Turquoise: [64, 224, 208, 255]
# Lime green: [50, 205, 50, 255]
# Gold: [255, 215, 0, 255]
# Silver: [192, 192, 192, 255]
# Gray: [128, 128, 128, 255]
```

### Other Test Scenes

```bash
# Clock scene (with seconds and milliseconds)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"clock"}'

# Power price scene
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"power_price"}'

# Pattern test scene
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_pattern"}'

# Safe fill test scene
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_safe_fill"}'
```

## 🔧 Driver Control Commands

### Switch Drivers

```bash
# Switch to real hardware
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/driver/set -m '{"driver":"real"}'

# Switch to mock/simulation mode
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/driver/set -m '{"driver":"mock"}'
```

## 🎛️ Scene Default Commands

### Set Default Scene

```bash
# Set performance test as default
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/scene/set -m '{"name":"test_performance"}'

# Set clock as default
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/scene/set -m '{"name":"clock"}'

# Set power_price as default
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/scene/set -m '{"name":"power_price"}'

# Set performance test v2 as default
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/scene/set -m '{"name":"test_performance_v2"}'
```

## 📝 Usage Instructions

1. **Set your environment variables:**

   ```bash
   export MOSQITTO_HOST_MS24=miniserver24
   export MOSQITTO_USER_MS24=smarthome
   export MOSQITTO_PASS_MS24=your_password_here
   ```

2. **Copy and paste any command above** directly into your terminal

3. **Watch the logs:**

   ```bash
   docker logs pixoo-daemon -f --timestamps --tail 1500
   ```

## 🎯 Performance Testing Strategy

1. **Start with sweep mode** to see all performance levels
2. **Test individual intervals** to find your sweet spot
3. **Use burst mode** for stress testing
4. **Monitor frametime logs** for detailed analysis

**Expected Results:**

- **Continuous/Loop Mode**: Shows real-time countdown (minutes:seconds for loop mode)
- **Burst Mode**: Shows progress `2s/10s` with rapid-fire updates
- **Sweep Mode**: Shows current cycle and interval being tested
- **Color Coding** (based on average frametime):
  - 🟢 Bright Green: Excellent performance (100-160ms avg frametime)
  - 🟢 Green: Good performance (160-220ms avg frametime)
  - 🟡 Yellow: Acceptable performance (220-280ms avg frametime)
  - 🟠 Orange: Slow performance (280-350ms avg frametime)
  - 🔴 Red: Very slow performance (>350ms avg frametime)
- **Real-time Updates**: FPS counter, performance bar, statistics
- **Console Logs**: Detailed statistics every 10 frames

**Performance Analysis Guide:**

- **100-160ms**: Outstanding performance, minimal noticeable delay
- **160-220ms**: Good performance, responsive feel
- **220-280ms**: Acceptable for most use cases, some lag noticeable
- **280-350ms**: Slow but functional, heavy lag present
- **>350ms**: Very slow, significant delays affecting usability
