#!/bin/bash
# Commit and push the new UI redesign

cd "c:/Users/shant/Downloads/e-chart_Pr-Main/e-chart_Pr-Main"

echo "========================================="
echo "  New UI: All-in-One Dashboard"
echo "========================================="
echo ""
echo "Changes:"
echo "✅ Single screen layout (no scrolling)"
echo "✅ Compact header with all market indices"
echo "✅ 70/30 split layout"
echo "✅ Tabbed News/AI interface"
echo "✅ Beautiful gradients and animations"
echo "✅ Stock info card"
echo "✅ Better visual hierarchy"
echo ""

# Stage changes
git add app/page.tsx
git add UI-REDESIGN-SUMMARY.md

# Show what's being committed
echo "Files to commit:"
git status --short
echo ""

# Commit
git commit -m "feat: Modern all-in-one dashboard UI redesign

- Implemented single-screen layout for all features
- Added compact sticky header with all market indices
- Created 70/30 split: Charts (left) + News/AI (right)
- Added tabbed interface for News and AI Chat
- Improved visual hierarchy and information density
- Added beautiful gradients and animations
- Included stock info quick-view card
- No scrolling needed - everything visible on one screen
- Enhanced user experience with modern design"

# Push
echo "Pushing to GitHub..."
git push origin master

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "  ✅ SUCCESS!"
    echo "========================================="
    echo ""
    echo "New UI pushed to GitHub!"
    echo ""
    echo "Test locally: http://localhost:3000"
    echo "Vercel will auto-deploy in 2-3 minutes"
    echo ""
    echo "View repository: https://github.com/pavankpatil043-source/e-chart_Pr"
    echo ""
else
    echo ""
    echo "❌ Push failed. Please check errors above."
fi
