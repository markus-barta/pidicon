#!/bin/bash
# Pixoo Performance Test Commands
# Replace variables with your actual values or source from environment

MOSQ_HOST=${MOSQITTO_HOST_MS24:-miniserver24}
MOSQ_USER=${MOSQITTO_USER_MS24:-smarthome}
MOSQ_PASS=${MOSQITTO_PASS_MS24}
DEVICE_IP=${DEVICE_IP:-192.168.1.159}

echo "Using MQTT broker: $MOSQ_HOST"
echo "Target device: $DEVICE_IP"
echo ""

# Default continuous mode test
echo "🎯 Default continuous mode (100ms intervals):"
echo "mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\"}'"
echo ""

# Focused interval tests (100-200ms sweet spot)
echo "⚡ Performance interval tests:"
echo "100ms: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"interval\":100}'"
echo "120ms: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"interval\":120}'"
echo "140ms: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"interval\":140}'"
echo "160ms: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"interval\":160}'"
echo "180ms: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"interval\":180}'"
echo "200ms: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"interval\":200}'"
echo ""

# Burst mode tests
echo "💥 Burst mode tests:"
echo "10s burst at 120ms: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"mode\":\"burst\",\"interval\":120,\"duration\":10000}'"
echo "5s burst at 150ms:  mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"mode\":\"burst\",\"interval\":150,\"duration\":5000}'"
echo ""

# Sweep mode
echo "🔄 Sweep mode (auto-test all intervals):"
echo "mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_performance\",\"mode\":\"sweep\"}'"
echo ""

# Other useful commands
echo "🎨 Test other scenes:"
echo "Clock:     mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"clock\"}'"
echo "Power:     mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"power_price\"}'"
echo "Fill:      mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/state/upd -m '{\"scene\":\"test_fill\"}'"
echo ""

# Driver switching
echo "🔧 Driver control:"
echo "Real driver: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/driver/set -m '{\"driver\":\"real\"}'"
echo "Mock driver: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/driver/set -m '{\"driver\":\"mock\"}'"
echo ""

# Scene defaults
echo "🎛️ Set default scene:"
echo "Performance: mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/scene/set -m '{\"name\":\"test_performance\"}'"
echo "Clock:       mosquitto_pub -h $MOSQ_HOST -u $MOSQ_USER -P $MOSQ_PASS -t pixoo/$DEVICE_IP/scene/set -m '{\"name\":\"clock\"}'"
