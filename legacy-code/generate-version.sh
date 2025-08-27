#!/usr/bin/env bash

# Generate version.json using only Git commands (no npm needed)
# This runs on the server where Git is available

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
