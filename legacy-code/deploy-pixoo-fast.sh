#!/usr/bin/env bash
set -e

echo "🔍 Checking for dependency changes..."
# Check if package.json or package-lock.json changed in the last commit
if git -C ~/Code/pixoo-daemon diff --name-only HEAD~1 HEAD | grep -qE 'package(-lock)?\.json'; then
    echo "❌ Detected changes in package.json or package-lock.json."
    echo "   Please run the full deploy instead: deploy-pixoo"
    exit 1
fi

echo "🔄 Pulling latest Pixoo daemon code..."
git -C ~/Code/pixoo-daemon pull origin main

echo "📂 Deploying to mounts folder (no npm install)..."
rsync -a --delete ~/Code/pixoo-daemon/ ~/docker/mounts/pixoo-daemon/app/ \
  --exclude=.git \
  --exclude=node_modules

echo "📦 Deployed Version Info:"
if [ -f "~/docker/mounts/pixoo-daemon/app/.deployment" ]; then
    DEPLOYMENT_ID=$(grep '"deploymentId"' ~/docker/mounts/pixoo-daemon/app/.deployment | cut -d'"' -f4)
    BUILD_NUMBER=$(grep '"buildNumber"' ~/docker/mounts/pixoo-daemon/app/.deployment | cut -d':' -f2 | tr -d ' ,')
    BUILD_TIME=$(grep '"buildTime"' ~/docker/mounts/pixoo-daemon/app/.deployment | cut -d'"' -f4 | cut -d'T' -f1)
    echo "   Version: $DEPLOYMENT_ID"
    echo "   Build: #$BUILD_NUMBER"
    echo "   Date: $BUILD_TIME"
else
    echo "   No deployment info found"
fi

echo "♻ Restarting pixoo-daemon container..."
cd ~/docker
docker compose restart pixoo-daemon

echo "✅ Pixoo daemon updated (fast mode)."
echo ""
echo "🔍 Expected Log Output After Restart:"
echo "   🔒 [OVERRIDE] Using code override - environment variables IGNORED"
echo "   🔍 [DEBUG] Device target resolution:"
echo "      DEVICE_TARGETS_OVERRIDE: \"192.168.1.159=real\""
echo "      deviceDrivers Map: { '192.168.1.159': 'real' }"
echo ""
echo "🎯 Next Version: v1.0.$(($BUILD_NUMBER + 1))"
