@echo off
echo ========================================
echo    Git Setup and Push to GitHub
echo ========================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Git is already installed!
    git --version
    goto :CONFIGURE_GIT
) else (
    echo [!] Git is not installed. Let's install it!
    echo.
)

:INSTALL_GIT
echo ========================================
echo    Installing Git for Windows
echo ========================================
echo.
echo Choose installation method:
echo.
echo 1. Download Git installer (opens browser - RECOMMENDED)
echo 2. Install via Winget (if available)
echo 3. Skip installation (I'll install manually)
echo.
set /p INSTALL_CHOICE="Enter choice (1-3): "

if "%INSTALL_CHOICE%"=="1" (
    echo.
    echo Opening Git download page...
    start https://git-scm.com/download/win
    echo.
    echo Please:
    echo 1. Download and run the installer
    echo 2. Use default settings (just click Next)
    echo 3. After installation, CLOSE THIS WINDOW and run this script again
    echo.
    pause
    exit
)

if "%INSTALL_CHOICE%"=="2" (
    echo.
    echo Installing Git via Winget...
    winget install --id Git.Git -e --source winget
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [OK] Git installed successfully!
        echo.
        echo IMPORTANT: Close this window and run the script again
        pause
        exit
    ) else (
        echo.
        echo [ERROR] Winget installation failed. Try option 1 instead.
        pause
        exit
    )
)

if "%INSTALL_CHOICE%"=="3" (
    echo.
    echo Exiting... Please install Git and run this script again.
    pause
    exit
)

echo Invalid choice. Please run the script again.
pause
exit

:CONFIGURE_GIT
echo.
echo ========================================
echo    Git Configuration
echo ========================================
echo.

REM Check if git config is set
git config --global user.name >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Let's set up your Git identity...
    echo.
    set /p GIT_NAME="Enter your name (e.g., John Doe): "
    set /p GIT_EMAIL="Enter your email (e.g., john@example.com): "
    
    git config --global user.name "!GIT_NAME!"
    git config --global user.email "!GIT_EMAIL!"
    
    echo.
    echo [OK] Git configured successfully!
) else (
    echo [OK] Git is already configured.
    echo Name: 
    git config --global user.name
    echo Email: 
    git config --global user.email
)

:NAVIGATE_TO_PROJECT
echo.
echo ========================================
echo    Navigating to Project
echo ========================================
cd /d "c:\Users\shant\Downloads\e-chart_Pr-Main\e-chart_Pr-Main"
echo Current directory: %CD%
echo.

:CHECK_GIT_REPO
echo ========================================
echo    Checking Git Repository
echo ========================================
echo.

REM Check if git repo exists
git rev-parse --git-dir >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Git repository exists.
) else (
    echo [!] Initializing Git repository...
    git init
    git branch -M master
    echo [OK] Repository initialized!
)

:CHECK_REMOTE
echo.
echo ========================================
echo    Checking Remote Repository
echo ========================================
echo.

git remote -v | findstr origin >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Remote 'origin' exists:
    git remote -v
) else (
    echo [!] Adding remote repository...
    git remote add origin https://github.com/pavankpatil043-source/e-chart_Pr.git
    echo [OK] Remote added!
)

:SHOW_STATUS
echo.
echo ========================================
echo    Current Git Status
echo ========================================
echo.
git status --short
echo.

:STAGE_FILES
echo ========================================
echo    Stage Files for Commit
echo ========================================
echo.
echo About to stage all files...
echo This will add all changes respecting .gitignore
echo.
set /p STAGE_CONFIRM="Continue? (Y/N): "
if /i not "%STAGE_CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit
)

git add .
echo.
echo [OK] Files staged!
echo.

:SHOW_STAGED
echo Staged files:
git status --short
echo.

:COMMIT_CHANGES
echo ========================================
echo    Commit Changes
echo ========================================
echo.
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "

if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Production-ready release: AI news, 4-day history, live charts
)

echo.
echo Committing with message:
echo "%COMMIT_MSG%"
echo.
git commit -m "%COMMIT_MSG%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Changes committed successfully!
) else (
    echo.
    echo [!] No changes to commit or commit failed.
    echo.
    set /p CONTINUE_ANYWAY="Continue to push anyway? (Y/N): "
    if /i not "%CONTINUE_ANYWAY%"=="Y" (
        echo Exiting...
        pause
        exit
    )
)

:PUSH_TO_GITHUB
echo.
echo ========================================
echo    Push to GitHub
echo ========================================
echo.
echo About to push to: https://github.com/pavankpatil043-source/e-chart_Pr
echo Branch: master
echo.
echo You may be prompted for GitHub credentials:
echo - Username: your GitHub username
echo - Password: your Personal Access Token (NOT your password!)
echo.
echo Get token at: https://github.com/settings/tokens
echo.
set /p PUSH_CONFIRM="Ready to push? (Y/N): "
if /i not "%PUSH_CONFIRM%"=="Y" (
    echo Cancelled. You can push manually later with: git push origin master
    pause
    exit
)

echo.
echo Pushing to GitHub...
echo.
git push -u origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    SUCCESS! 🎉
    echo ========================================
    echo.
    echo Your code has been pushed to GitHub!
    echo.
    echo View at: https://github.com/pavankpatil043-source/e-chart_Pr
    echo.
    echo ========================================
    echo    Next Steps
    echo ========================================
    echo.
    echo 1. ✅ Verify on GitHub: https://github.com/pavankpatil043-source/e-chart_Pr
    echo 2. 🚀 Deploy to Vercel: Run deploy-production.bat
    echo 3. 📖 Read: PRODUCTION-DEPLOYMENT-GUIDE.md
    echo.
) else (
    echo.
    echo ========================================
    echo    Push Failed
    echo ========================================
    echo.
    echo Common solutions:
    echo.
    echo 1. Authentication failed:
    echo    - Use Personal Access Token as password
    echo    - Get at: https://github.com/settings/tokens
    echo.
    echo 2. Updates rejected:
    echo    - Run: git pull origin master --rebase
    echo    - Then: git push origin master
    echo.
    echo 3. Force push (CAREFUL - overwrites remote):
    echo    - Run: git push origin master --force
    echo.
    echo For more help, see GIT-SETUP-GUIDE.md
    echo.
)

:END
echo.
pause
