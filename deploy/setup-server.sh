#!/bin/bash
# Complete server setup script for synthr on IONOS VPS (TUNED FOR 1GB RAM)
# Run this once on a fresh Ubuntu 22.04/24.04 server

set -e

APP_DIR="/var/www/synthr"
DOMAIN="synthr.online"
EMAIL="your-email@example.com"
DB_PASSWORD="$(openssl rand -base64 24)"
AUTH_SECRET="$(openssl rand -base64 32)"

echo "========================================"
echo "  synthr Server Setup Script"
echo "  TUNED FOR 1GB RAM VPS"
echo "  Domain: $DOMAIN"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[SETUP]${NC} $1"
}

# 1. Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Add swap file (critical for 1GB RAM)
log "Creating 2GB swap file (essential for 1GB RAM)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    log "Swap file created and enabled."
else
    warn "Swap file already exists, skipping."
fi

# 3. Install dependencies
log "Installing required packages..."
sudo apt install -y curl wget git nginx postgresql postgresql-contrib ufw certbot python3-certbot-nginx

# 4. Install Node.js 20
log "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 5. Install PM2 and Prisma CLI
log "Installing PM2 and Prisma CLI..."
sudo npm install -g pm2 prisma

# 6. Setup PostgreSQL with LOW MEMORY settings
log "Setting up PostgreSQL (tuned for 1GB RAM)..."
sudo systemctl stop postgresql

# Configure PostgreSQL for low memory
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
if [ -f "$PG_CONF" ]; then
    sudo sed -i 's/^#*shared_buffers.*/shared_buffers = 128MB/' "$PG_CONF"
    sudo sed -i 's/^#*effective_cache_size.*/effective_cache_size = 256MB/' "$PG_CONF"
    sudo sed -i 's/^#*maintenance_work_mem.*/maintenance_work_mem = 32MB/' "$PG_CONF"
    sudo sed -i 's/^#*work_mem.*/work_mem = 8MB/' "$PG_CONF"
    sudo sed -i 's/^#*max_connections.*/max_connections = 20/' "$PG_CONF"
    log "PostgreSQL memory settings tuned."
fi

sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE synthr;" 2>/dev/null || warn "Database 'synthr' may already exist"
sudo -u postgres psql -c "CREATE USER synthr_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || warn "User may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE synthr TO synthr_user;"

# 7. Create app directory
log "Creating application directory..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

# 8. Setup firewall
log "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 9. Create log directory for PM2
sudo mkdir -p /var/log/pm2
sudo chown -R "$USER:$USER" /var/log/pm2

# 10. Show system status
log "Setup complete!"
echo ""
echo "========================================"
echo "  System Status"
echo "========================================"
echo "Memory:"
free -h
echo ""
echo "Swap:"
swapon --show
echo ""
echo "Disk:"
df -h /
echo ""

echo "========================================"
echo "  Next Steps"
echo "========================================"
echo ""
echo "1. Copy your synthr files to: $APP_DIR"
echo "   On your local machine (PowerShell):"
echo "   .\\upload-to-vps.ps1 -VpsIp 74.208.115.201"
echo ""
echo "2. Create environment file:"
echo "   nano $APP_DIR/.env"
echo ""
echo "   Add this (save the password somewhere safe!):"
echo "   DATABASE_URL=\"postgresql://synthr_user:$DB_PASSWORD@localhost:5432/synthr?schema=public\""
echo "   NEXTAUTH_URL=\"https://$DOMAIN\""
echo "   NEXTAUTH_SECRET=\"$AUTH_SECRET\""
echo "   NODE_ENV=\"production\""
echo ""
echo "3. Setup Nginx:"
echo "   sudo cp deploy/nginx-synthr.conf /etc/nginx/sites-available/synthr"
echo "   sudo ln -s /etc/nginx/sites-available/synthr /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl restart nginx"
echo ""
echo "4. Setup SSL:"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "5. Deploy:"
echo "   cd $APP_DIR && bash deploy/deploy.sh"
echo ""
echo "Database password saved to: /tmp/synthr-db-password.txt (DELETE AFTER SAVING!)"
echo "$DB_PASSWORD" > /tmp/synthr-db-password.txt
echo ""
