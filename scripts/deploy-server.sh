#!/bin/bash
set -e

# Pixoo Daemon Server Deployment Script
# This script is called by GitHub Actions to deploy the application

# Configuration
DEPLOYMENT_PATH="$HOME/Code/pixoo-daemon"
MOUNT_PATH="$HOME/docker/mounts/pixoo-daemon/app"
DOCKER_COMPOSE_PATH="$HOME/docker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required directories exist
check_prerequisites() {
    log "Checking prerequisites..."
    
    if [ ! -d "$DEPLOYMENT_PATH" ]; then
        log_error "Deployment path not found: $DEPLOYMENT_PATH"
        exit 1
    fi
    
    if [ ! -d "$MOUNT_PATH" ]; then
        log_error "Mount path not found: $MOUNT_PATH"
        exit 1
    fi
    
    if [ ! -d "$DOCKER_COMPOSE_PATH" ]; then
        log_error "Docker compose path not found: $DOCKER_COMPOSE_PATH"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    BACKUP_DIR="$MOUNT_PATH/../backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$MOUNT_PATH" ] && [ "$(ls -A $MOUNT_PATH)" ]; then
        cp -r "$MOUNT_PATH"/* "$BACKUP_DIR/"
        log_success "Backup created at: $BACKUP_DIR"
    else
        log_warning "No current deployment to backup"
    fi
}

# Deploy new version
deploy_new_version() {
    log "Deploying new version..."
    
    # Navigate to deployment directory
    cd "$DEPLOYMENT_PATH"
    
    # Pull latest changes
    log "Pulling latest code from git..."
    git pull origin main
    
    # Generate version information
    log "Generating version information..."
    if ! npm run build:version; then
        log_error "Failed to generate version information"
        exit 1
    fi
    
    # Copy files to mount directory
    log "Copying files to mount directory..."
    rsync -a --delete "$DEPLOYMENT_PATH/" "$MOUNT_PATH/" \
        --exclude=.git \
        --exclude=node_modules \
        --exclude=.github \
        --exclude=legacy-code
    
    log_success "Files copied successfully"
}

# Restart container
restart_container() {
    log "Restarting pixoo-daemon container..."
    
    cd "$DOCKER_COMPOSE_PATH"
    
    # Install dependencies inside the container
    log "Installing/updating dependencies inside the container..."
    if ! docker compose exec pixoo-daemon npm install; then
        log_error "Failed to install dependencies in the container"
        exit 1
    fi
    
    # Check if container is currently running
    if docker compose ps pixoo-daemon | grep -q "Up"; then
        log "Container is running, restarting..."
        docker compose restart pixoo-daemon
    else
        log "Container is not running, starting..."
        docker compose up -d pixoo-daemon
    fi
    
    # Wait for container to start
    log "Waiting for container to start..."
    sleep 10
    
    # Check container status
    log "Checking container status..."
    if docker compose ps pixoo-daemon | grep -q "Up"; then
        log_success "Container is running successfully"
    else
        log_error "Container failed to start"
        docker compose logs --tail=20 pixoo-daemon
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if version.json exists
    if [ ! -f "$MOUNT_PATH/version.json" ]; then
        log_error "version.json not found in mount directory"
        exit 1
    fi
    
    # Check if daemon.js exists
    if [ ! -f "$MOUNT_PATH/daemon.js" ]; then
        log_error "daemon.js not found in mount directory"
        exit 1
    fi
    
    # Check container logs for any obvious errors
    log "Checking container logs for errors..."
    if docker compose logs --tail=10 pixoo-daemon | grep -i "error\|fatal\|exception"; then
        log_warning "Found potential errors in container logs"
    else
        log_success "No obvious errors in container logs"
    fi
    
    log_success "Deployment verification passed"
}

# Main deployment flow
main() {
    log "🚀 Starting Pixoo Daemon deployment..."
    
    check_prerequisites
    backup_current
    deploy_new_version
    restart_container
    verify_deployment
    
    log_success "🎉 Deployment completed successfully!"
    
    # Display deployment info
    if [ -f "$MOUNT_PATH/version.json" ]; then
        echo ""
        echo "📋 Deployment Information:"
        echo "   Version: $(jq -r .version "$MOUNT_PATH/version.json")"
        echo "   Build: #$(jq -r .buildNumber "$MOUNT_PATH/version.json")"
        echo "   Commit: $(jq -r .gitCommit "$MOUNT_PATH/version.json")"
        echo "   Time: $(jq -r .buildTime "$MOUNT_PATH/version.json")"
    fi
}

# Run main function
main "$@"
