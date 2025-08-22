# Pixoo Performance Test Commands

## 🎯 Quick Start Commands (Copy & Paste)

### Default Performance Test
```bash
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance"}'
```

### Performance Interval Tests (100-200ms Sweet Spot)
**Note**: Tests run continuously for 30 seconds (default) showing real-time performance data.

```bash
# 100ms (minimum) - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":100}'

# 120ms - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":120}'

# 140ms - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":140}'

# 160ms - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":160}'

# 180ms - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":180}'

# 200ms (maximum) - runs for 30 seconds continuously
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","interval":200}'
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
# Automatically test all intervals (100→120→140→160→180→200ms, 4s each)
mosquitto_pub -h $MOSQITTO_HOST_MS24 -u $MOSQITTO_USER_MS24 -P $MOSQITTO_PASS_MS24 -t pixoo/192.168.1.159/state/upd -m '{"scene":"test_performance","mode":"sweep"}'
```

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

**Expected Results (during 30-second continuous test):**
- Green background: Excellent performance (<160ms avg frametime)
- Yellow background: Good performance (160-200ms avg frametime)
- Orange background: Borderline performance (200-300ms avg frametime)
- Red background: Poor performance (>300ms avg frametime)
- Countdown timer shows remaining test time
- FPS counter updates in real-time
- Performance bar visualizes current frametime
- Console logs detailed statistics every 10 frames
