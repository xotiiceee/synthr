# PowerShell Upload Script for synthr → IONOS VPS
# Save as upload-to-vps.ps1 in your project root and run it

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsIp,

    [string]$VpsUser = "root",
    [string]$AppDir = "/var/www/synthr",
    [string]$LocalPath = "."
)

$ErrorActionPreference = "Stop"

function Write-Color($Text, $Color) {
    Write-Host $Text -ForegroundColor $Color
}

Write-Color "========================================" "Green"
Write-Color "  synthr VPS Upload Script" "Green"
Write-Color "========================================" "Green"
Write-Color "Target: ${VpsUser}@${VpsIp}:${AppDir}" "Cyan"
Write-Color ""

# Test SSH connection first
Write-Color "Testing SSH connection..." "Yellow"
try {
    $testResult = ssh -o ConnectTimeout=5 -o BatchMode=yes ${VpsUser}@${VpsIp} "echo OK" 2>&1
    if ($testResult -ne "OK") {
        Write-Color "SSH connection failed. Make sure you can SSH into the VPS." "Red"
        Write-Color "If using password auth, run: ssh ${VpsUser}@${VpsIp} (manually once)" "Yellow"
        exit 1
    }
} catch {
    Write-Color "SSH connection test failed: $_" "Red"
    exit 1
}

Write-Color "SSH connection OK!" "Green"

# Ensure target directory exists
Write-Color "Creating target directory on VPS..." "Yellow"
ssh ${VpsUser}@${VpsIp} "mkdir -p ${AppDir}"

# Change to local project directory
Push-Location $LocalPath

try {
    # Files and folders to upload (skip node_modules, .next, .git)
    $folders = @("src", "prisma", "public", "deploy")
    $files = @(
        "docker-compose.yml",
        "Dockerfile",
        "next.config.ts",
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "postcss.config.mjs",
        "components.json",
        "prisma.config.ts",
        "README.md",
        "CLAUDE.md",
        "AGENTS.md",
        "eslint.config.mjs",
        "next-env.d.ts",
        ".env.example",
        ".gitignore"
    )

    # Upload folders
    foreach ($folder in $folders) {
        $localFolderPath = Join-Path (Get-Location) $folder
        if (Test-Path $localFolderPath -PathType Container) {
            Write-Color "Uploading folder: $folder ..." "Yellow"
            scp -r -C "${localFolderPath}" "${VpsUser}@${VpsIp}:${AppDir}/"
            Write-Color "  Done: $folder" "Green"
        } else {
            Write-Color "  Skipping $folder (not found)" "Gray"
        }
    }

    # Upload files
    foreach ($file in $files) {
        $localFilePath = Join-Path (Get-Location) $file
        if (Test-Path $localFilePath -PathType Leaf) {
            Write-Color "Uploading file: $file ..." "Yellow"
            scp -C "${localFilePath}" "${VpsUser}@${VpsIp}:${AppDir}/"
            Write-Color "  Done: $file" "Green"
        } else {
            Write-Color "  Skipping $file (not found)" "Gray"
        }
    }

    Write-Color ""
    Write-Color "========================================" "Green"
    Write-Color "  Upload Complete!" "Green"
    Write-Color "========================================" "Green"
    Write-Color ""
    Write-Color "Next steps:" "Cyan"
    Write-Color "1. SSH into your VPS:" "White"
    Write-Color "   ssh ${VpsUser}@${VpsIp}" "White"
    Write-Color ""
    Write-Color "2. Run the server setup:" "White"
    Write-Color "   cd ${AppDir}" "White"
    Write-Color "   bash deploy/setup-server.sh" "White"
    Write-Color ""
    Write-Color "3. Create .env and deploy:" "White"
    Write-Color "   nano .env" "White"
    Write-Color "   bash deploy/deploy.sh" "White"
    Write-Color ""
    Write-Color "Full guide: deploy/POWERSHELL-UPLOAD.md" "Cyan"

} finally {
    Pop-Location
}
