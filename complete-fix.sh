#!/bin/bash
# Complete fix and push script

cd "c:/Users/shant/Downloads/e-chart_Pr-Main/e-chart_Pr-Main"

echo "========================================="
echo "  Fixing Vercel Build Issues"
echo "========================================="
echo ""

# Check current status
echo "Current git status:"
git status --short
echo ""

# Add all changes
echo "Adding all changes..."
git add -A

echo ""
echo "Changes to be committed:"
git status --short
echo ""

# Commit
echo "Committing..."
git commit -m "fix: Add missing UI components (label, alert) for session-manager

- Added components/ui/label.tsx
- Added components/ui/alert.tsx
- Fixes module not found errors in Vercel build"

# Push
echo ""
echo "Pushing to GitHub..."
git push origin master

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "  ✅ PUSHED SUCCESSFULLY!"
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "1. Vercel will auto-detect the push and rebuild"
    echo "2. Wait 1-2 minutes for the build"
    echo "3. Check: https://vercel.com/dashboard"
    echo ""
    echo "If build still fails, you may need to:"
    echo "- Clear Vercel build cache"
    echo "- Or redeploy manually: vercel --prod --force"
    echo ""
else
    echo ""
    echo "❌ Push failed"
    echo ""
fi

read -p "Press Enter to continue..."
