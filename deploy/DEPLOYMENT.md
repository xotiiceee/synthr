# IONOS VPS Deployment Guide for synthr

## Overview

This guide walks you through deploying **synthr** on an IONOS VPS (Ubuntu 22.04/24.04). The stack will be:

- **VPS**: IONOS Cloud Server (Ubuntu 22.04 LTS recommended)
- **App**: Next.js 15 (standalone output)
- **Database**: PostgreSQL 16
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Process Manager**: PM2 (keeps the app running)

---

## Prerequisites

1. IONOS VPS with Ubuntu 22.04/24.04 (minimum 2GB RAM, 1 vCPU)
2. Domain name pointed to your VPS IP (A record)
3. SSH access to your VPS

---

## Step 1: Initial Server Setup

SSH into your VPS and run the setup script, or execute these commands manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git nginx postgresql postgresql-contrib ufw

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node -v   # Should show v20.x.x
npm -v    # Should show 10.x.x

# Install PM2 globally
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 2: Setup PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In psql prompt, create database and user
CREATE DATABASE synthr;
CREATE USER synthr_user WITH ENCRYPTED PASSWORD 'your-strong-password-here';
GRANT ALL PRIVILEGES ON DATABASE synthr TO synthr_user;
\q

# Allow local connections (if needed)
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Ensure this line exists:
# local   all             all                                     scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Step 3: Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Step 4: Setup Nginx Reverse Proxy

Copy the provided nginx config to your server:

```bash
# On your VPS:
sudo nano /etc/nginx/sites-available/synthr
# Paste the contents from deploy/nginx-synthr.conf (replace your-domain.com)

# Enable the site
sudo ln -s /etc/nginx/sites-available/synthr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 5: SSL Certificate (Let's Encrypt)

```bash
# Replace your-domain.com with your actual domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts. Certbot will auto-configure Nginx for HTTPS.
# Test auto-renewal:
sudo certbot renew --dry-run
```

---

## Step 6: Deploy synthr Application

### Option A: Manual Deployment

```bash
# On your VPS, create app directory
sudo mkdir -p /var/www/synthr
sudo chown -R $USER:$USER /var/www/synthr

# Clone or copy your project files to /var/www/synthr
# (Use SCP, rsync, or git clone)

# Example with rsync from your local machine:
# rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' ./ user@your-vps-ip:/var/www/synthr/

# On VPS, enter app directory
cd /var/www/synthr

# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build the app
npm run build

# Create environment file
nano .env
```

Add this to `.env`:
```env
# Database
DATABASE_URL="postgresql://synthr_user:your-strong-password-here@localhost:5432/synthr?schema=public"

# Auth.js / NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="paste-a-32-char-random-string-here"

# App
NODE_ENV="production"
```

Generate a strong secret:
```bash
openssl rand -base64 32
```

### Option B: Using PM2 (Recommended)

```bash
cd /var/www/synthr

# Copy PM2 config
cp deploy/pm2-ecosystem.config.js ecosystem.config.js
# Edit it if needed

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config so it restarts on boot
pm2 save
pm2 startup systemd
# Run the command PM2 outputs (usually starts with sudo)
```

---

## Step 7: Verify Everything Works

```bash
# Check if app is running
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql

# Check logs
pm2 logs synthr

# Test your domain in browser: https://your-domain.com
```

---

## Step 8: Updates & Maintenance

### Deploying Updates

```bash
cd /var/www/synthr

# Pull latest changes or copy new files
git pull  # or rsync new files

# Install deps, migrate, build
npm ci
npx prisma migrate deploy
npm run build

# Restart with zero downtime
pm2 reload synthr
```

Or use the deployment script:
```bash
cd /var/www/synthr
bash deploy/deploy.sh
```

### Useful Commands

```bash
# View logs
pm2 logs synthr --lines 100

# Restart app
pm2 restart synthr

# Monitor resources
pm2 monit

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database backup
sudo -u postgres pg_dump synthr > synthr-backup-$(date +%F).sql
```

---

## Troubleshooting

### "502 Bad Gateway"
- Check if the app is running: `pm2 status`
- Check PM2 logs: `pm2 logs synthr`
- Verify Nginx config: `sudo nginx -t`

### Database Connection Errors
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check `.env` DATABASE_URL is correct
- Test connection: `psql "postgresql://synthr_user:password@localhost:5432/synthr"`

### SSL Issues
- Check certificate: `sudo certbot certificates`
- Renew manually: `sudo certbot renew`

### Port Already in Use
- Find process: `sudo lsof -i :3000`
- Kill if needed: `sudo kill -9 <PID>`

---

## File Structure on VPS

```
/var/www/synthr/
├── .env                    # Environment variables
├── .next/                  # Build output
├── deploy/                 # Deployment helpers
├── docker-compose.yml      # Optional Docker setup
├── next.config.ts
├── package.json
├── prisma/
│   └── schema.prisma
├── public/
├── src/
└── ecosystem.config.js     # PM2 config
```

---

## Optional: Docker Deployment

If you prefer Docker over PM2:

```bash
cd /var/www/synthr

# Update docker-compose.yml to use your production DB URL
# Then:
sudo docker-compose up -d db
# Wait for DB to be ready, then:
sudo docker-compose up -d app
```

---

## Security Checklist

- [ ] Changed default PostgreSQL password
- [ ] Using strong NEXTAUTH_SECRET
- [ ] Firewall enabled (UFW)
- [ ] SSH key authentication (disable password auth)
- [ ] Automatic security updates enabled
- [ ] SSL certificate active and auto-renewing
- [ ] App running as non-root user

---

**You're all set!** synthr should now be live at `https://your-domain.com`.
