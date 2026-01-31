@echo off
REM EChart Trading Platform - Production Deployment Script
REM This script deploys your application to echart.in via Vercel

echo.
echo ========================================
echo   EChart Trading Platform
echo   Production Deployment to echart.in
echo ========================================
echo.

REM Check if Vercel CLI is installed
echo [1/5] Checking Vercel CLI installation...
where vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Vercel CLI not found. Installing...
    call npm install -g vercel
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Vercel CLI
        echo Please run manually: npm install -g vercel
        pause
        exit /b 1
    )
    echo [OK] Vercel CLI installed successfully
) else (
    echo [OK] Vercel CLI is already installed
)

echo.
echo [2/5] Navigating to project directory...
cd /d "%~dp0"
echo [OK] Current directory: %cd%

echo.
echo [3/5] Checking Node.js and npm...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js version:
node --version
npm --version

echo.
echo [4/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [WARNING] Some dependencies may have issues, continuing...
)

echo.
echo ========================================
echo   Ready to Deploy!
echo ========================================
echo.
echo This will:
echo   - Open browser for Vercel login
echo   - Deploy your app to production
echo   - Provide deployment URL
echo.
echo After deployment, remember to:
echo   1. Set environment variables in Vercel Dashboard
echo   2. Add your custom domain (echart.in)
echo   3. Update DNS records
echo.
set /p confirm="Continue with deployment? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo [5/5] Deploying to Vercel Production...
echo.
call vercel --prod

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   DEPLOYMENT SUCCESSFUL!
    echo ========================================
    echo.
    echo Next steps:
    echo   1. Go to https://vercel.com/dashboard
    echo   2. Select your project
    echo   3. Go to Settings -^> Environment Variables
    echo   4. Add these variables for Production:
    echo.
    echo      NODE_ENV=production
    echo      NEXT_PUBLIC_APP_URL=https://echart.in
    echo      NEXT_PUBLIC_DOMAIN=echart.in
    echo      HUGGING_FACE_API_KEY=your_hugging_face_api_key_here
    echo.
    echo   5. Redeploy: vercel --prod
    echo   6. Add domain: echart.in
    echo   7. Update DNS records as instructed
    echo.
    echo For detailed instructions, see:
    echo   - PRODUCTION-DEPLOYMENT-GUIDE.md
    echo   - PRODUCTION-CHECKLIST.md
    echo.
) else (
    echo.
    echo ========================================
    echo   DEPLOYMENT FAILED
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo Common issues:
    echo   - Not logged in to Vercel (run: vercel login)
    echo   - Network connection issues
    echo   - Build errors (test locally: npm run build)
    echo.
    echo For help, see PRODUCTION-DEPLOYMENT-GUIDE.md
    echo.
)

pause
