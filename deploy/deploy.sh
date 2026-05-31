#!/bin/bash
# Automated deployment script for synthr
# Run this on your VPS after initial setup

set -e  # Exit on any error

APP_DIR="/var/www/synthr"
LOG_FILE="/var/log/synthr-deploy.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

cd "$APP_DIR" || error "Could not navigate to $APP_DIR"

log "Starting synthr deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    error ".env file not found! Create it first."
fi

# Pull latest changes (if using git)
if [ -d .git ]; then
    log "Pulling latest changes..."
    git pull origin main || warn "Git pull failed, continuing with local files..."
fi

# Install dependencies
log "Installing dependencies..."
npm ci || error "npm ci failed"

# Generate Prisma client
log "Generating Prisma client..."
npx prisma generate || error "Prisma generate failed"

# Run database migrations
log "Running database migrations..."
npx prisma migrate deploy || error "Database migration failed"

# Build the application
log "Building Next.js app..."
npm run build || error "Build failed"

# Check if PM2 is managing the app
if pm2 describe synthr > /dev/null 2>&1; then
    log "Reloading app with PM2..."
    pm2 reload synthr --update-env || error "PM2 reload failed"
else
    log "Starting app with PM2..."
    pm2 start ecosystem.config.js || error "PM2 start failed"
fi

# Save PM2 process list
pm2 save > /dev/null 2>&1

log "Deployment completed successfully!"
log "Check status: pm2 status"
log "View logs: pm2 logs synthr"
