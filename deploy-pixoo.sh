#!/usr/bin/env bash
set -e

echo "🔄 Pulling latest Pixoo daemon code..."
git -C ~/Code/pixoo-daemon pull origin main

echo "🔨 Building version information on server (Git available)..."
cd ~/Code/pixoo-daemon

# Generate version.json using pure Git commands (no npm needed)
echo "🔨 Generating version information using Git..."

# Get Git information
GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_COMMIT_FULL=$(git rev-parse HEAD)
GIT_COMMIT_COUNT=$(git rev-list --count HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

# Build version info
VERSION_INFO=$(cat <<EOF
{
  "deploymentId": "${GIT_TAG:-v1.0.0-${GIT_COMMIT}}",
  "buildNumber": ${GIT_COMMIT_COUNT},
  "gitCommit": "${GIT_COMMIT}",
  "gitCommitFull": "${GIT_COMMIT_FULL}",
  "gitCommitCount": ${GIT_COMMIT_COUNT},
  "gitBranch": "${GIT_BRANCH}",
  "gitTag": "${GIT_TAG:-null}",
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "environment": "production"
}
EOF
)

# Write to version.json
echo "$VERSION_INFO" > version.json

echo "✅ Version file generated: $(pwd)/version.json"
echo "📋 Version info:"
echo "$VERSION_INFO" | jq '.' 2>/dev/null || echo "$VERSION_INFO"

echo "🔍 Verifying version.json was created..."
if [ ! -f version.json ]; then
  echo "❌ version.json not found after build!"
  exit 1
fi

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
