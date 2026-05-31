# PowerShell File Upload Guide for synthr → IONOS VPS

## Prerequisites

- PowerShell 5.1 or 7.x
- Your IONOS VPS IP address (e.g., `123.45.67.89`)
- Your SSH key or password for the VPS
- Your domain name (e.g., `your-domain.com`)

## Quick Reference: Your VPS Specs

- **RAM**: 1GB (requires tuning — see below)
- **CPU**: 1 core
- **Disk**: 10GB SSD

> With 1GB RAM, we'll add a **2GB swap file** and tune PostgreSQL/Node.js to stay within limits.

---

## Method 1: SCP (Simplest, Windows 10+)

Windows 10/11 includes `scp` by default. In PowerShell:

### Upload the entire project (excluding big folders):

```powershell
# Set your VPS details
$VPS_IP = "123.45.67.89"
$VPS_USER = "root"
$APP_DIR = "/var/www/synthr"

# Create the directory on the VPS first
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${APP_DIR}"

# Upload everything except node_modules, .next, .git
scp -r -C `
  .\src `
  .\prisma `
  .\public `
  .\deploy `
  .\docker-compose.yml `
  .\Dockerfile `
  .\next.config.ts `
  .\package.json `
  .\package-lock.json `
  .\tsconfig.json `
  .\postcss.config.mjs `
  .\components.json `
  .\prisma.config.ts `
  .\README.md `
  .\CLAUDE.md `
  .\AGENTS.md `
  .\eslint.config.mjs `
  .\next-env.d.ts `
  ${VPS_USER}@${VPS_IP}:${APP_DIR}
```

### Upload just the deploy scripts:

```powershell
scp -r -C .\deploy ${VPS_USER}@${VPS_IP}:${APP_DIR}
```

---

## Method 2: Tar + SSH (Fastest for bulk files)

Compress locally, upload one file, extract on VPS:

### Step 1: In PowerShell (on your Windows machine):

```powershell
# Navigate to your project folder
Set-Location "C:\Users\User\Music\F tracker"

# Create a tar archive excluding large folders
# Windows doesn't have GNU tar natively, so use 7zip or this workaround:
# Option A: Using Compress-Archive (slower but built-in)
Compress-Archive `
  -Path "src,prisma,public,deploy,docker-compose.yml,Dockerfile,next.config.ts,package.json,package-lock.json,tsconfig.json,postcss.config.mjs,components.json,prisma.config.ts,README.md,CLAUDE.md,AGENTS.md,eslint.config.mjs,next-env.d.ts,.env.example" `
  -DestinationPath "synthr-deploy.zip" `
  -Force

# Upload the zip
$VPS_IP = "123.45.67.89"
$VPS_USER = "root"
scp -C .\synthr-deploy.zip ${VPS_USER}@${VPS_IP}:/tmp/

# Cleanup local zip
Remove-Item .\synthr-deploy.zip
```

### Step 2: On the VPS (via SSH):

```bash
cd /var/www/synthr
sudo apt install -y unzip
unzip -o /tmp/synthr-deploy.zip -d /var/www/synthr
rm /tmp/synthr-deploy.zip
```

---

## Method 3: SFTP Interactive (Good for selective uploads)

```powershell
# Start SFTP session
sftp ${VPS_USER}@123.45.67.89

# Inside SFTP, run these commands:
mkdir /var/www/synthr
lcd "C:\Users\User\Music\F tracker"
cd /var/www/synthr
put -r src
put -r prisma
put -r public
put -r deploy
put docker-compose.yml
put Dockerfile
put next.config.ts
put package.json
put package-lock.json
put tsconfig.json
put postcss.config.mjs
put components.json
put prisma.config.ts
put .env.example
bye
```

---

## Method 4: One-Command Full Deploy Script (PowerShell)

Save this as `upload-to-vps.ps1` in your project folder and run it:

```powershell
# upload-to-vps.ps1
param(
    [string]$VpsIp = "YOUR_VPS_IP",
    [string]$VpsUser = "root",
    [string]$AppDir = "/var/www/synthr"
)

Write-Host "Uploading synthr to VPS at ${VpsIp}..." -ForegroundColor Green

# Ensure target directory exists
ssh ${VpsUser}@${VpsIp} "mkdir -p ${AppDir}"

# Files and folders to upload
$items = @(
    "src", "prisma", "public", "deploy",
    "docker-compose.yml", "Dockerfile",
    "next.config.ts", "package.json", "package-lock.json",
    "tsconfig.json", "postcss.config.mjs", "components.json",
    "prisma.config.ts", "README.md", "CLAUDE.md", "AGENTS.md",
    "eslint.config.mjs", "next-env.d.ts", ".env.example"
)

foreach ($item in $items) {
    $localPath = Join-Path (Get-Location) $item
    if (Test-Path $localPath) {
        Write-Host "Uploading $item..." -ForegroundColor Yellow
        if ((Get-Item $localPath).PSIsContainer) {
            scp -r -C "${localPath}" "${VpsUser}@${VpsIp}:${AppDir}/"
        } else {
            scp -C "${localPath}" "${VpsUser}@${VpsIp}:${AppDir}/"
        }
    } else {
        Write-Host "Skipping $item (not found)" -ForegroundColor Gray
    }
}

Write-Host "Upload complete!" -ForegroundColor Green
Write-Host "Next step: SSH into the VPS and run: cd ${AppDir} && bash deploy/setup-server.sh"
```

**Run it:**
```powershell
.\upload-to-vps.ps1 -VpsIp "123.45.67.89"
```

---

## After Upload: Full Deployment Commands (SSH into VPS)

```bash
# 1. SSH into your VPS
ssh root@123.45.67.89

# 2. Run the automated setup
cd /var/www/synthr
bash deploy/setup-server.sh

# 3. Create your .env file
nano .env
# (Paste your production env vars)

# 4. Setup Nginx
sudo cp deploy/nginx-synthr.conf /etc/nginx/sites-available/synthr
sudo nano /etc/nginx/sites-available/synthr   # Replace YOUR_DOMAIN
sudo ln -s /etc/nginx/sites-available/synthr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 5. Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 6. Deploy the app
bash deploy/deploy.sh
```

---

## Tuning for 1GB RAM

### Add 2GB Swap File (Critical for 1GB RAM)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Reduce PostgreSQL Memory Usage

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Add/modify these lines:
```ini
shared_buffers = 128MB
effective_cache_size = 256MB
maintenance_work_mem = 32MB
work_mem = 8MB
max_connections = 20
```

```bash
sudo systemctl restart postgresql
```

### Reduce Node.js / PM2 Memory

In `ecosystem.config.js` (already set):
```js
max_memory_restart: "500M"
```

Or if using Docker, the `docker-compose.yml` already has memory limits.

---

## Checking Memory Usage

```bash
# See what's using RAM
free -h

# See Node.js memory usage
pm2 monit

# See PostgreSQL memory
sudo -u postgres psql -c "SHOW shared_buffers;"
```

---

## Quick Troubleshooting

| Problem | Command |
|---------|---------|
| `scp` not found | Install OpenSSH: `Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0` |
| Permission denied | Make sure you added your SSH key to IONOS, or use password |
| Slow upload | Use the tar method (Method 2) — much faster for many small files |
| Out of memory | Check `free -h` and `dmesg \| grep -i "out of memory"` |

---

**Done!** After running the deploy script, synthr will be live at `https://your-domain.com`.
