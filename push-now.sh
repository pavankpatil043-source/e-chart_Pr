#!/bin/bash
# Fixed Push Commands - No Secrets Included

cd "c:/Users/shant/Downloads/e-chart_Pr-Main/e-chart_Pr-Main"

echo "========================================="
echo "  Pushing to GitHub (Secrets Removed)"
echo "========================================="
echo ""

# Stage all changes
echo "Staging files..."
git add .

# Show what's being committed
echo ""
echo "Files to be committed:"
git status --short
echo ""

# Commit
echo "Committing changes..."
git commit -m "Production-ready: AI news platform with deployment docs (secrets removed)"

# Push
echo ""
echo "Pushing to GitHub..."
git push -u origin master

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "  ✅ SUCCESS!"
    echo "========================================="
    echo ""
    echo "Your code is now on GitHub!"
    echo "View at: https://github.com/pavankpatil043-source/e-chart_Pr"
    echo ""
    echo "Next steps:"
    echo "1. Deploy to Vercel: vercel --prod"
    echo "2. Add environment variables in Vercel Dashboard"
    echo "3. Use API-KEYS-REFERENCE.md for the actual keys"
    echo ""
else
    echo ""
    echo "========================================="
    echo "  ❌ Push failed"
    echo "========================================="
    echo ""
    echo "If you get authentication error:"
    echo "Use your Personal Access Token as password"
    echo "Get it at: https://github.com/settings/tokens"
    echo ""
fi
