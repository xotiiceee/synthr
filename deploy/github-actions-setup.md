# GitHub Actions Auto-Deploy Setup Guide

This guide walks you through setting up **automatic deployment** to your IONOS VPS every time you push code to the `main` branch on GitHub.

---

## How It Works

1. You push code to `main` on GitHub
2. GitHub Actions builds the app in the cloud (fast, lots of RAM)
3. GitHub Actions uploads the built app to your VPS via SSH
4. GitHub Actions restarts the app on your VPS

**No manual uploading. No building on the VPS. Just push and go.**

---

## Prerequisites

- Your code is in a GitHub repository (public or private)
- Your IONOS VPS is set up and running (see `deploy/QUICKSTART-1GB-VPS.md`)
- You have SSH access to your VPS

---

## Step 1: Create an SSH Key for GitHub Actions

On your **local machine** (PowerShell or terminal), create a new SSH key pair:

```bash
# On Windows (PowerShell):
ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$env:USERPROFILE\.ssh\github_actions_deploy"
# Leave passphrase empty (press Enter twice)

# On Mac/Linux:
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
# Leave passphrase empty (press Enter twice)
```

This creates two files:
- `github_actions_deploy` — **private key** (KEEP SECRET)
- `github_actions_deploy.pub` — **public key** (safe to share)

---

## Step 2: Add the Public Key to Your VPS

Copy the public key to your VPS so GitHub Actions can log in:

```bash
# On Windows (PowerShell):
$pubKey = Get-Content "$env:USERPROFILE\.ssh\github_actions_deploy.pub"
ssh root@YOUR_VPS_IP "echo '$pubKey' >> ~/.ssh/authorized_keys"

# On Mac/Linux:
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@YOUR_VPS_IP
```

Verify it works:
```bash
# On Windows:
ssh -i "$env:USERPROFILE\.ssh\github_actions_deploy" root@YOUR_VPS_IP "echo 'GitHub Actions can connect!'"

# On Mac/Linux:
ssh -i ~/.ssh/github_actions_deploy root@YOUR_VPS_IP "echo 'GitHub Actions can connect!'"
```

---

## Step 3: Add GitHub Secrets

Go to your **GitHub repository** → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Add these **3 secrets**:

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `VPS_IP` | `123.45.67.89` | Your IONOS VPS public IP address |
| `VPS_USER` | `root` | The SSH username for your VPS (usually `root`) |
| `VPS_SSH_KEY` | (paste private key) | The contents of `github_actions_deploy` (NOT `.pub`) |

### How to get the private key contents:

```powershell
# Windows:
Get-Content "$env:USERPROFILE\.ssh\github_actions_deploy" | Set-Clipboard
# Now paste into the GitHub secret field

# Mac:
pbcopy < ~/.ssh/github_actions_deploy

# Linux:
cat ~/.ssh/github_actions_deploy | xclip -selection clipboard
```

> **Important**: Paste the **entire** private key including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines.

---

## Step 4: Ensure Your VPS is Ready

Your VPS needs to have:

1. **The app directory created:**
   ```bash
   ssh root@YOUR_VPS_IP
   mkdir -p /var/www/synthr
   ```

2. **PM2 installed globally:**
   ```bash
   sudo npm install -g pm2
   ```

3. **A `.env` file** with your production config:
   ```bash
   cd /var/www/synthr
   nano .env
   ```
   ```env
   DATABASE_URL="postgresql://synthr_user:PASSWORD@localhost:5432/synthr?schema=public"
   NEXTAUTH_URL="https://your-domain.com"
   NEXTAUTH_SECRET="your-secret"
   NODE_ENV="production"
   ```

4. **Database initialized:**
   ```bash
   npx prisma migrate deploy
   ```

5. **Nginx configured and SSL active** (see deploy guides)

---

## Step 5: Push Code and Watch It Deploy

```bash
# Add the workflow files to git
git add .github/workflows/ deploy/
git commit -m "Add GitHub Actions auto-deploy"
git push origin main
```

Now go to your **GitHub repository** → `Actions` tab. You should see the "Deploy to IONOS VPS" workflow running!

---

## What the Workflow Does

1. **CI Phase**: Checks out code, installs deps, generates Prisma client, builds Next.js
2. **Prepare Phase**: Copies static files into the standalone build folder
3. **Package Phase**: Creates a `deploy.tar.gz` with everything needed
4. **SSH Phase**: Connects to your VPS using the SSH key
5. **Deploy Phase**:
   - Stops the running app (PM2)
   - Backs up the old build
   - Extracts the new build
   - Runs database migrations
   - Restarts the app
6. **Health Check**: Verifies the app is responding

---

## Monitoring Deploys

### GitHub Actions Logs
- Go to `Actions` tab in your GitHub repo
- Click on the latest "Deploy to IONOS VPS" run
- Expand the steps to see real-time logs

### VPS Logs
```bash
ssh root@YOUR_VPS_IP
pm2 logs synthr          # App logs
pm2 status               # Process status
pm2 monit                # Live resource monitor
```

---

## Troubleshooting

### "Permission denied (publickey)"
- Did you add the public key to `~/.ssh/authorized_keys` on the VPS?
- Is `VPS_SSH_KEY` the **private** key (not `.pub`)?
- Is `VPS_USER` correct?

### "Failed to connect to host"
- Is your VPS IP correct in `VPS_IP`?
- Is the VPS running?
- Is port 22 open in IONOS firewall?

### "pm2 command not found"
- Run `sudo npm install -g pm2` on the VPS

### "prisma migrate deploy" fails
- Is `.env` with `DATABASE_URL` present on the VPS?
- Is PostgreSQL running? `sudo systemctl status postgresql`

### App doesn't start after deploy
- Check logs: `pm2 logs synthr`
- Was this the first deploy? The VPS needs the initial `.env` and setup
- Try manually running `cd /var/www/synthr && node .next/standalone/server.js` to see the error

---

## Manual Deploy Trigger

You can also trigger a deploy manually from GitHub:

1. Go to `Actions` tab
2. Click `Deploy to IONOS VPS`
3. Click `Run workflow` → `Run workflow`

This is useful for re-deploying without pushing code.

---

## Security Notes

- The SSH key used for deployment should be **dedicated only to GitHub Actions**
- Do not reuse your personal SSH key
- If you ever suspect the key is compromised, delete it from GitHub Secrets and generate a new one
- The `VPS_SSH_KEY` secret is encrypted by GitHub and only available to the workflow

---

**You're all set!** Now every `git push` to `main` automatically deploys to your IONOS VPS. 🚀
