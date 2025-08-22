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

### Extended Loop Mode
```bash
# Run continuous performance test for 5 minutes (300 seconds)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","mode":"loop","interval":150,"duration":300000}'

# Custom duration (10 minutes = 600000ms)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","mode":"loop","interval":120,"duration":600000}'

# Stop loop mode
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","stop":true}'
```

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

#### **Continuous Mode**
- **Purpose**: Steady performance testing at a fixed interval
- **Duration**: 30 seconds (default)
- **Display**: Shows FPS, average frametime, countdown timer
- **Use Case**: Test specific intervals to find optimal performance

#### **Burst Mode**
- **Purpose**: Rapid-fire testing for stress testing
- **Duration**: 10 seconds of continuous updates
- **Display**: Shows progress `2s/10s`, rapid FPS updates
- **Use Case**: Test device limits with minimal delays

#### **Sweep Mode**
- **Purpose**: Automatic testing of multiple intervals
- **Duration**: ~27 seconds (9 intervals × 3 seconds each)
- **Display**: Shows current cycle and interval being tested
- **Use Case**: Get overview of performance across all intervals

#### **Loop Mode**
- **Purpose**: Extended testing for long-term analysis
- **Duration**: Configurable (default: 5 minutes)
- **Display**: Shows countdown in minutes:seconds format
- **Use Case**: Long-term performance monitoring and stability testing

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

### Other Scenes
```bash
# Clock scene (with seconds and milliseconds)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"clock"}'

# Power price scene
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"power_price"}'

# Test scenes
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_fill"}'
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_pattern"}'
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
