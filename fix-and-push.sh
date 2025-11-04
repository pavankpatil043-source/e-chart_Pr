#!/bin/bash
# Fix build errors and push

cd "c:/Users/shant/Downloads/e-chart_Pr-Main/e-chart_Pr-Main"

echo "========================================="
echo "  Fixed: Missing UI Components"
echo "========================================="
echo ""
echo "Added:"
echo "- components/ui/label.tsx"
echo "- components/ui/alert.tsx"
echo ""

# Stage the new files
git add components/ui/label.tsx
git add components/ui/alert.tsx

# Commit
git commit -m "fix: Add missing UI components for session-manager

- Added label.tsx to components/ui/
- Added alert.tsx to components/ui/
- Fixes Vercel build error: Module not found"

# Push
echo "Pushing to GitHub..."
git push origin master

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "  ✅ SUCCESS!"
    echo "========================================="
    echo ""
    echo "Vercel will automatically rebuild now!"
    echo "Check deployment at: https://vercel.com/dashboard"
    echo ""
else
    echo ""
    echo "❌ Push failed. Check errors above."
    echo ""
fi
