# Quick Deploy to IONOS VPS (PowerShell) — 1GB RAM Edition

## Your Setup
- **VPS**: IONOS Cloud Server — 1GB RAM, 1 vCPU, 10GB SSD
- **OS**: Ubuntu 22.04 LTS (recommended)
- **Deploy method**: PowerShell SCP + PM2 (lighter than Docker for 1GB)

---

## Step 1: Run Server Setup (One-Time)

SSH into your VPS and run:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/synthr/main/deploy/setup-server.sh | bash
```

Or manually upload `deploy/setup-server.sh` and run:

```bash
bash deploy/setup-server.sh
```

This creates swap, installs Node.js/PostgreSQL/Nginx, and tunes everything for 1GB RAM.

---

## Step 2: Upload Files from PowerShell (Windows)

### Option A: One-Command Upload Script

In PowerShell, navigate to your synthr project folder:

```powershell
# Set your VPS IP
cd "C:\Users\User\Music\F tracker"
.\upload-to-vps.ps1 -VpsIp "123.45.67.89"
```

That's it. It uploads everything needed.

### Option B: Manual SCP Commands

```powershell
# Set variables
$VPS_IP = "123.45.67.89"
$VPS_USER = "root"

# Create directory
ssh ${VPS_USER}@${VPS_IP} "mkdir -p /var/www/synthr"

# Upload project files
scp -r -C .\src ${VPS_USER}@${VPS_IP}:/var/www/synthr/
scp -r -C .\prisma ${VPS_USER}@${VPS_IP}:/var/www/synthr/
scp -r -C .\public ${VPS_USER}@${VPS_IP}:/var/www/synthr/
scp -r -C .\deploy ${VPS_USER}@${VPS_IP}:/var/www/synthr/
scp -C .\next.config.ts .\package.json .\package-lock.json .\tsconfig.json .\postcss.config.mjs .\components.json .\prisma.config.ts .\docker-compose.yml .\Dockerfile .\.env.example ${VPS_USER}@${VPS_IP}:/var/www/synthr/
```

### Option C: ZIP Upload (Fastest for many files)

```powershell
# On Windows (PowerShell)
cd "C:\Users\User\Music\F tracker"
Compress-Archive -Path "src,prisma,public,deploy,docker-compose.yml,Dockerfile,next.config.ts,package.json,package-lock.json,tsconfig.json,postcss.config.mjs,components.json,prisma.config.ts,.env.example" -DestinationPath "synthr.zip" -Force

scp -C .\synthr.zip root@123.45.67.89:/tmp/
Remove-Item .\synthr.zip
```

Then on VPS:
```bash
sudo apt install -y unzip
unzip -o /tmp/synthr.zip -d /var/www/synthr
```

---

## Step 3: Configure & Deploy (On VPS)

```bash
ssh root@123.45.67.89

cd /var/www/synthr

# 1. Create .env file
nano .env
```

Paste:
```env
DATABASE_URL="postgresql://synthr_user:DB_PASSWORD_FROM_SETUP@localhost:5432/synthr?schema=public"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="SECRET_FROM_SETUP_OUTPUT"
NODE_ENV="production"
```

```bash
# 2. Setup Nginx
sudo cp deploy/nginx-synthr.conf /etc/nginx/sites-available/synthr
sudo nano /etc/nginx/sites-available/synthr    # Replace YOUR_DOMAIN
sudo ln -s /etc/nginx/sites-available/synthr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 3. Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 4. Deploy!
bash deploy/deploy.sh
```

---

## Step 4: Access Your App

Open in browser: `https://your-domain.com`

---

## Managing the App

```bash
# View status
pm2 status

# View logs
pm2 logs synthr

# Restart
pm2 restart synthr

# Monitor memory/CPU
pm2 monit
```

---

## 1GB RAM Optimization Summary

| Tuning | What It Does |
|--------|-------------|
| **2GB Swap** | Prevents OOM crashes when memory spikes |
| **PostgreSQL 128MB buffers** | Down from default 1GB, saves ~900MB |
| **Node.js 384MB max** | `--max-old-space-size=384` keeps JS heap small |
| **PM2 450MB restart limit** | Auto-restarts app before it eats all RAM |
| **Nginx gzip** | Compresses responses to reduce bandwidth |

---

## Troubleshooting 1GB RAM Issues

```bash
# Check if swap is working
free -h

# Check if OOM killer struck
dmesg | grep -i "killed process"

# Check what's using memory
ps aux --sort=-%mem | head -10

# If PostgreSQL is using too much, restart it
sudo systemctl restart postgresql
```

---

**Done!** synthr should be live and running smoothly on your 1GB IONOS VPS.
