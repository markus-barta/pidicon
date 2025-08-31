#!/usr/bin/env sh
set -eu

# Robust one-shot watchtower trigger with timeout and early-stop
# - Starts a designated watchtower compose service
# - Polls a target container image ID every N seconds
# - Stops watchtower on first update or after timeout
# - Prevents concurrent runs via a simple lock dir

COMPOSE_FILE="/home/mba/docker/docker-compose.yml"
SERVICE_NAME="watchtower-pixoo"
TARGET_CONTAINER_NAME="pixoo-daemon"
POLL_INTERVAL="5"
TIMEOUT_SECONDS="300"
STOP_TIMEOUT="5"

usage() {
  cat <<USAGE
Usage: ${0##*/} [options]

Options:
  --compose PATH         docker-compose.yml path (default: $COMPOSE_FILE)
  --service NAME         watchtower service name (default: $SERVICE_NAME)
  --target NAME          target app container name (default: $TARGET_CONTAINER_NAME)
  --interval SECONDS     polling interval seconds (default: $POLL_INTERVAL)
  --timeout SECONDS      max seconds to wait (default: $TIMEOUT_SECONDS)
  --stop-timeout SECONDS compose stop timeout seconds (default: $STOP_TIMEOUT)
  -h, --help             show this help
USAGE
}

log() { printf "%s %s\n" "$(date +"%Y-%m-%dT%H:%M:%S%z")" "$*"; }

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose) COMPOSE_FILE="$2"; shift 2;;
    --service) SERVICE_NAME="$2"; shift 2;;
    --target) TARGET_CONTAINER_NAME="$2"; shift 2;;
    --interval) POLL_INTERVAL="$2"; shift 2;;
    --timeout) TIMEOUT_SECONDS="$2"; shift 2;;
    --stop-timeout) STOP_TIMEOUT="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown option: $1" >&2; usage; exit 2;;
  esac
done

# Concurrency guard (no external deps)
LOCK_DIR="/tmp/${SERVICE_NAME}.lock"
if mkdir "$LOCK_DIR" 2>/dev/null; then
  trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT HUP INT TERM
else
  log "Another $SERVICE_NAME trigger is running; exiting."
  exit 1
fi

# Validations
if [[ ! -f "$COMPOSE_FILE" ]]; then
  log "Compose file missing: $COMPOSE_FILE"
  exit 3
fi

if ! docker compose -f "$COMPOSE_FILE" config --services | grep -qx "$SERVICE_NAME"; then
  log "Service not found in compose: $SERVICE_NAME"
  exit 4
fi

# Snapshot current image of target container (may be unknown if not running yet)
prev_image="$(docker inspect -f '{{.Image}}' "$TARGET_CONTAINER_NAME" 2>/dev/null || echo unknown)"
log "Target=$TARGET_CONTAINER_NAME prev_image=$prev_image"

# Ensure a clean start; stop existing watchtower service instance if present
if docker ps --format '{{.Names}}' | grep -qx "$SERVICE_NAME"; then
  log "Stopping existing $SERVICE_NAME"
  docker compose -f "$COMPOSE_FILE" stop -t "$STOP_TIMEOUT" "$SERVICE_NAME" || true
fi

log "Starting $SERVICE_NAME (compose=$COMPOSE_FILE)"
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

start_epoch="$(date +%s)"
deadline=$(($start_epoch + $TIMEOUT_SECONDS))
updated=0

while :; do
  now="$(date +%s)"
  [ "$now" -lt "$deadline" ] || break
  cur_image="$(docker inspect -f '{{.Image}}' "$TARGET_CONTAINER_NAME" 2>/dev/null || echo unknown)"
  if [ "$cur_image" != "$prev_image" ] && [ "$cur_image" != "unknown" ]; then
    updated=1
    log "Detected update: $prev_image -> $cur_image"
    break
  fi
  sleep "$POLL_INTERVAL"
done

log "Stopping $SERVICE_NAME"
docker compose -f "$COMPOSE_FILE" stop -t "$STOP_TIMEOUT" "$SERVICE_NAME" || true

if [ "$updated" -eq 1 ]; then
  log "Status: updated"
  exit 0
else
  log "Status: timeout (no update)"
  exit 0
fi


