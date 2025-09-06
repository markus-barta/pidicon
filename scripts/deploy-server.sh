#!/bin/bash
set -e

# Pixoo Daemon Server Deployment Script
# This script is called by GitHub Actions to deploy the application

# Configuration
DEPLOYMENT_PATH="$HOME/Code/pixoo-daemon"
DOCKER_COMPOSE_PATH="$HOME/docker"

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Main deployment flow
main() {
    log "🚀 Starting Pixoo Daemon deployment..."

    cd "$DEPLOYMENT_PATH"
    
    log "Pulling latest code from git..."
    git pull origin main
    
    cd "$DOCKER_COMPOSE_PATH"
    
    log "Building and restarting pixoo-daemon container..."
    docker compose up -d --build pixoo-daemon
    
    log "Waiting for container to settle..."
    sleep 10
    
    log "Checking container status..."
    if docker compose ps pixoo-daemon | grep -q "Up"; then
        echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    else
        echo -e "${RED}❌ Container failed to start. Check logs:${NC}"
        docker compose logs --tail=50 pixoo-daemon
        exit 1
    fi
}

# Run main function
main "$@"
