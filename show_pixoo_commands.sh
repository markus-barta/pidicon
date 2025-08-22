#!/bin/bash
# Pixoo Commands Display Script
# Shows the available commands from PIXOO_COMMANDS.md

echo "🚀 Pixoo Performance Test Commands"
echo "=================================="
echo ""

# Check if PIXOO_COMMANDS.md exists
if [ -f "PIXOO_COMMANDS.md" ]; then
    echo "📋 Available Commands (copy & paste directly):"
    echo ""
    cat PIXOO_COMMANDS.md
    echo ""
    echo "✅ Commands loaded from PIXOO_COMMANDS.md"
else
    echo "❌ PIXOO_COMMANDS.md not found!"
    echo ""
    echo "Please ensure PIXOO_COMMANDS.md exists in the same directory as this script."
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
echo "3. Watch the logs: docker compose logs -f pixoo-daemon"
