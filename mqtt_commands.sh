#!/usr/bin/env bash
# Common MQTT commands for Pixoo Daemon
# @version 1.0.0
# @author Markus Barta (mba) with assistance from Cursor AI (Gemini 2.5 Pro)
# @license MIT

echo "🚀 Pixoo Performance Test Commands"
echo "=================================="
echo ""

# Check if MQTT_COMMANDS.md exists
if [ -f "MQTT_COMMANDS.md" ]; then
    echo "📋 Available Commands (copy & paste directly):"
    echo ""
    cat MQTT_COMMANDS.md
    echo ""
    echo "✅ Commands loaded from MQTT_COMMANDS.md"
else
    echo "❌ MQTT_COMMANDS.md not found!"
    echo ""
    echo "Please ensure MQTT_COMMANDS.md exists in the same directory as this script."
    exit 1
fi

echo ""
echo "🎯 Quick Start:"
echo "1. Set your environment variables:"
echo "   export MOSQITTO_HOST_MS24=miniserver24"
echo "   export MOSQITTO_USER_MS24=smarthome"
echo "   export MOSQITTO_PASS_MS24=your_password_here"
echo ""
echo "2. Copy and paste any command above directly into your terminal"
echo ""
echo "3. Watch the logs: docker compose logs -f pidicon"
