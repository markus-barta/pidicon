#!/usr/bin/env bash
set -e

echo "🔄 Pulling latest Pixoo daemon code..."
git -C ~/Code/pixoo-daemon pull origin main

echo "🔨 Building version information in container..."
docker run --rm \
  -v ~/Code/pixoo-daemon:/app \
  -w /app \
  node:20-alpine \
  sh -c "npm run build:version || (echo '❌ Build failed!' && exit 1)"

echo "🔍 Verifying version.json was created..."
if [ ! -f ~/Code/pixoo-daemon/version.json ]; then
  echo "❌ version.json not found after build!"
  exit 1
fi

echo "📋 Version info:"
cat ~/Code/pixoo-daemon/version.json

echo "📦 Installing dependencies in temporary build container..."
docker run --rm \
  -v ~/Code/pixoo-daemon:/app \
  -w /app \
  node:20-alpine \
  npm install --production

echo "📂 Deploying to mounts folder..."
rsync -a --delete ~/Code/pixoo-daemon/ ~/docker/mounts/pixoo-daemon/app/ \
  --exclude=.git

echo "♻ Restarting pixoo-daemon container..."
cd ~/docker
docker compose restart pixoo-daemon

echo "✅ Pixoo daemon updated."
