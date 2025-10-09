#!/bin/sh
# Pixoo Daemon Wrapper - Stays as PID 1 and monitors/restarts Node.js process
# This allows the daemon to restart itself without killing the Docker container
# POSIX-compliant (works with Alpine's ash/BusyBox sh)

set -e

DAEMON_SCRIPT="daemon.js"
RESTART_MARKER="/tmp/pixoo-restart-requested"

echo "[WRAPPER] Pixoo Daemon Wrapper starting..."
echo "[WRAPPER] PID: $$"
echo "[WRAPPER] Working directory: $(pwd)"
echo "[WRAPPER] Node.js location: $(which node 2>/dev/null || echo 'node not found')"
echo "[WRAPPER] Daemon script exists: $([ -f "$DAEMON_SCRIPT" ] && echo 'yes' || echo 'no')"

# Cleanup on exit
cleanup() {
  echo "[WRAPPER] Cleaning up..."
  rm -f "$RESTART_MARKER"

  # Kill child process if still running
  if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
    echo "[WRAPPER] Terminating Node.js process (PID: $NODE_PID)..."
    kill "$NODE_PID" 2>/dev/null || true
    wait "$NODE_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT TERM INT

# Main loop - restart Node.js when requested
while true; do
  echo "[WRAPPER] Starting Node.js daemon..."

  # Ensure we're in the application directory (for Docker)
  if [ -d "/app" ]; then
    cd /app || {
      echo "[WRAPPER] ERROR: Cannot change to /app directory"
      exit 127
    }
    echo "[WRAPPER] Changed to /app directory"
  fi

  # Ensure we're in the right directory and node is available
  if ! command -v node >/dev/null 2>&1; then
    echo "[WRAPPER] ERROR: node command not found in PATH"
    echo "[WRAPPER] PATH: $PATH"
    echo "[WRAPPER] Checking common node locations..."
    ls -la /usr/local/bin/node* /usr/bin/node* 2>/dev/null || echo "No node binaries found"
    exit 127
  fi

  if [ ! -f "$DAEMON_SCRIPT" ]; then
    echo "[WRAPPER] ERROR: $DAEMON_SCRIPT not found in $(pwd)"
    echo "[WRAPPER] Contents of current directory:"
    ls -la
    exit 127
  fi

  # Start Node.js daemon in background
  # In Alpine Linux (node:18-alpine), node is typically at /usr/local/bin/node
  NODE_CMD="/usr/local/bin/node"
  if [ ! -x "$NODE_CMD" ]; then
    # Fallback: try to find node in PATH
    if command -v node >/dev/null 2>&1; then
      NODE_CMD="node"
      echo "[WRAPPER] Using node from PATH: $(which node)"
    else
      echo "[WRAPPER] ERROR: Cannot find node executable"
      echo "[WRAPPER] Checked locations:"
      ls -la /usr/local/bin/node* 2>/dev/null || echo "  /usr/local/bin/node* not found"
      ls -la /usr/bin/node* 2>/dev/null || echo "  /usr/bin/node* not found"
      echo "[WRAPPER] PATH: $PATH"
      exit 127
    fi
  else
    echo "[WRAPPER] Using node at $NODE_CMD"
  fi

  "$NODE_CMD" "$DAEMON_SCRIPT" &
  NODE_PID=$!

  echo "[WRAPPER] Node.js daemon started (PID: $NODE_PID)"
  
  # Wait for process to exit OR restart marker to appear
  while kill -0 "$NODE_PID" 2>/dev/null; do
    # Check if restart was requested
    if [ -f "$RESTART_MARKER" ]; then
      echo "[WRAPPER] Restart requested, terminating current process..."
      rm -f "$RESTART_MARKER"
      kill "$NODE_PID" 2>/dev/null || true
      wait "$NODE_PID" 2>/dev/null || true
      echo "[WRAPPER] Process terminated, restarting..."
      sleep 1
      break
    fi
    
    sleep 1
  done
  
  # If process exited naturally, check exit code
  wait "$NODE_PID" || EXIT_CODE=$?
  
  if [ -f "$RESTART_MARKER" ]; then
    echo "[WRAPPER] Restart marker found, restarting..."
    rm -f "$RESTART_MARKER"
    sleep 1
    continue
  fi
  
  # If exit code is 42, it's a restart request
  EXIT_CODE=${EXIT_CODE:-0}
  if [ "$EXIT_CODE" -eq 42 ]; then
    echo "[WRAPPER] Exit code 42 detected, restarting daemon..."
    sleep 2  # Give more time for cleanup
    continue
  fi

  # For exit code 127 (command not found), try restarting a few times
  if [ "$EXIT_CODE" -eq 127 ]; then
    echo "[WRAPPER] Exit code 127 (command not found), this might be a PATH issue during restart"
    echo "[WRAPPER] Trying to restart anyway..."
    sleep 1
    continue
  fi

  # Any other exit code means we should stop
  echo "[WRAPPER] Node.js daemon exited with code $EXIT_CODE"
  echo "[WRAPPER] Stopping wrapper..."
  exit "$EXIT_CODE"
done

