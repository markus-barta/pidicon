#!/bin/sh
# Pixoo Daemon Wrapper - Stays as PID 1 and monitors/restarts Node.js process
# This allows the daemon to restart itself without killing the Docker container
# POSIX-compliant (works with Alpine's ash/BusyBox sh)

set -e

DAEMON_SCRIPT="daemon.js"
RESTART_MARKER="/tmp/pixoo-restart-requested"

echo "[WRAPPER] Pixoo Daemon Wrapper starting..."
echo "[WRAPPER] PID: $$"

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
  
  # Start Node.js daemon in background
  node "$DAEMON_SCRIPT" &
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
    sleep 1
    continue
  fi
  
  # Any other exit code means we should stop
  echo "[WRAPPER] Node.js daemon exited with code $EXIT_CODE"
  echo "[WRAPPER] Stopping wrapper..."
  exit "$EXIT_CODE"
done

