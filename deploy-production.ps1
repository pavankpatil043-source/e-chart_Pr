# EChart Trading Platform - Production Deployment
# PowerShell Script for deploying to echart.in via Vercel

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  EChart Trading Platform"  -ForegroundColor Cyan
Write-Host "  Production Deployment to echart.in"  -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

# Set working directory to script location
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Step 1: Check Vercel CLI
Write-Host "[1/5] Checking Vercel CLI installation..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "[!] Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install Vercel CLI" -ForegroundColor Red
        Write-Host "Please run manually: npm install -g vercel" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK] Vercel CLI installed successfully" -ForegroundColor Green
} else {
    Write-Host "[OK] Vercel CLI is already installed" -ForegroundColor Green
}

# Step 2: Navigate to project
Write-Host ""
Write-Host "[2/5] Navigating to project directory..." -ForegroundColor Yellow
Write-Host "[OK] Current directory: $PWD" -ForegroundColor Green

# Step 3: Check Node.js
Write-Host ""
Write-Host "[3/5] Checking Node.js and npm..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
$npmVersion = npm --version 2>$null
if (-not $nodeVersion) {
    Write-Host "[ERROR] Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host "[OK] npm version: $npmVersion" -ForegroundColor Green

# Step 4: Install dependencies
Write-Host ""
Write-Host "[4/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Some dependencies may have issues, continuing..." -ForegroundColor Yellow
}

# Step 5: Confirm deployment
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ready to Deploy!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor White
Write-Host "  - Open browser for Vercel login" -ForegroundColor White
Write-Host "  - Deploy your app to production" -ForegroundColor White
Write-Host "  - Provide deployment URL" -ForegroundColor White
Write-Host ""
Write-Host "After deployment, remember to:" -ForegroundColor Yellow
Write-Host "  1. Set environment variables in Vercel Dashboard" -ForegroundColor Yellow
Write-Host "  2. Add your custom domain (echart.in)" -ForegroundColor Yellow
Write-Host "  3. Update DNS records" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue with deployment? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

# Step 6: Deploy
Write-Host ""
Write-Host "[5/5] Deploying to Vercel Production..." -ForegroundColor Yellow
Write-Host ""
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Go to https://vercel.com/dashboard" -ForegroundColor White
    Write-Host "  2. Select your project" -ForegroundColor White
    Write-Host "  3. Go to Settings -> Environment Variables" -ForegroundColor White
    Write-Host "  4. Add these variables for Production:" -ForegroundColor White
    Write-Host ""
    Write-Host "     NODE_ENV=production" -ForegroundColor Yellow
    Write-Host "     NEXT_PUBLIC_APP_URL=https://echart.in" -ForegroundColor Yellow
    Write-Host "     NEXT_PUBLIC_DOMAIN=echart.in" -ForegroundColor Yellow
    Write-Host "     HUGGING_FACE_API_KEY=your_hugging_face_api_key_here" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  5. Redeploy: vercel --prod" -ForegroundColor White
    Write-Host "  6. Add domain: echart.in" -ForegroundColor White
    Write-Host "  7. Update DNS records as instructed" -ForegroundColor White
    Write-Host ""
    Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
    Write-Host "  - PRODUCTION-DEPLOYMENT-GUIDE.md" -ForegroundColor White
    Write-Host "  - PRODUCTION-CHECKLIST.md" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Not logged in to Vercel (run: vercel login)" -ForegroundColor White
    Write-Host "  - Network connection issues" -ForegroundColor White
    Write-Host "  - Build errors (test locally: npm run build)" -ForegroundColor White
    Write-Host ""
    Write-Host "For help, see PRODUCTION-DEPLOYMENT-GUIDE.md" -ForegroundColor Cyan
    Write-Host ""
}

Read-Host "Press Enter to exit"
