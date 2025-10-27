#!/bin/bash

echo "========================================"
echo "   Git Push to GitHub - Git Bash"
echo "========================================"
echo ""

# Navigate to project directory
cd "c:/Users/shant/Downloads/e-chart_Pr-Main/e-chart_Pr-Main" || exit

echo "Current directory: $(pwd)"
echo ""

# Check if Git is working
echo "========================================"
echo "   Checking Git Installation"
echo "========================================"
git --version
echo ""

# Configure Git if needed
echo "========================================"
echo "   Git Configuration"
echo "========================================"
echo ""

if ! git config --global user.name > /dev/null 2>&1; then
    echo "Let's set up your Git identity..."
    echo ""
    read -p "Enter your name (e.g., John Doe): " git_name
    read -p "Enter your email (e.g., john@example.com): " git_email
    
    git config --global user.name "$git_name"
    git config --global user.email "$git_email"
    
    echo ""
    echo "[OK] Git configured successfully!"
else
    echo "[OK] Git is already configured:"
    echo "Name: $(git config --global user.name)"
    echo "Email: $(git config --global user.email)"
fi

echo ""

# Initialize repository if needed
echo "========================================"
echo "   Checking Git Repository"
echo "========================================"
echo ""

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "[!] Initializing Git repository..."
    git init
    git branch -M master
    echo "[OK] Repository initialized!"
else
    echo "[OK] Git repository exists."
fi

echo ""

# Check/add remote
echo "========================================"
echo "   Checking Remote Repository"
echo "========================================"
echo ""

if ! git remote -v | grep -q origin; then
    echo "[!] Adding remote repository..."
    git remote add origin https://github.com/pavankpatil043-source/e-chart_Pr.git
    echo "[OK] Remote added!"
else
    echo "[OK] Remote 'origin' exists:"
    git remote -v
fi

echo ""

# Show current status
echo "========================================"
echo "   Current Git Status"
echo "========================================"
echo ""
git status --short
echo ""

# Stage files
echo "========================================"
echo "   Stage Files for Commit"
echo "========================================"
echo ""
echo "About to stage all files (respecting .gitignore)..."
read -p "Continue? (y/n): " stage_confirm

if [[ ! "$stage_confirm" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

git add .
echo ""
echo "[OK] Files staged!"
echo ""

# Show what's staged
echo "Staged files:"
git status --short
echo ""

# Commit changes
echo "========================================"
echo "   Commit Changes"
echo "========================================"
echo ""
read -p "Enter commit message (or press Enter for default): " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="Production-ready release: AI news, 4-day history, live charts"
fi

echo ""
echo "Committing with message:"
echo "\"$commit_msg\""
echo ""

if git commit -m "$commit_msg"; then
    echo ""
    echo "[OK] Changes committed successfully!"
else
    echo ""
    echo "[!] No changes to commit or commit failed."
    read -p "Continue to push anyway? (y/n): " continue_anyway
    if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 0
    fi
fi

echo ""

# Push to GitHub
echo "========================================"
echo "   Push to GitHub"
echo "========================================"
echo ""
echo "About to push to: https://github.com/pavankpatil043-source/e-chart_Pr"
echo "Branch: master"
echo ""
echo "You may be prompted for GitHub credentials:"
echo "- Username: your GitHub username"
echo "- Password: your Personal Access Token (NOT your password!)"
echo ""
echo "Get token at: https://github.com/settings/tokens"
echo ""
read -p "Ready to push? (y/n): " push_confirm

if [[ ! "$push_confirm" =~ ^[Yy]$ ]]; then
    echo "Cancelled. You can push manually later with: git push origin master"
    exit 0
fi

echo ""
echo "Pushing to GitHub..."
echo ""

if git push -u origin master; then
    echo ""
    echo "========================================"
    echo "   SUCCESS! 🎉"
    echo "========================================"
    echo ""
    echo "Your code has been pushed to GitHub!"
    echo ""
    echo "View at: https://github.com/pavankpatil043-source/e-chart_Pr"
    echo ""
    echo "========================================"
    echo "   Next Steps"
    echo "========================================"
    echo ""
    echo "1. ✅ Verify on GitHub"
    echo "2. 🚀 Deploy to Vercel: Run ./deploy.sh"
    echo "3. 📖 Read: PRODUCTION-DEPLOYMENT-GUIDE.md"
    echo ""
else
    echo ""
    echo "========================================"
    echo "   Push Failed"
    echo "========================================"
    echo ""
    echo "Common solutions:"
    echo ""
    echo "1. Authentication failed:"
    echo "   - Use Personal Access Token as password"
    echo "   - Get at: https://github.com/settings/tokens"
    echo ""
    echo "2. Updates rejected:"
    echo "   git pull origin master --rebase"
    echo "   git push origin master"
    echo ""
    echo "3. Force push (CAREFUL - overwrites remote):"
    echo "   git push origin master --force"
    echo ""
    echo "For more help, see GIT-SETUP-GUIDE.md"
    echo ""
fi

echo ""
read -p "Press Enter to exit..."
