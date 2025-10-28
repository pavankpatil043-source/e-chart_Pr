#!/bin/bash
# Revert last commit from GitHub

cd "c:/Users/shant/Downloads/e-chart_Pr-Main/e-chart_Pr-Main"

echo "========================================="
echo "  Revert Last Commit"
echo "========================================="
echo ""

# Show last commit
echo "Last commit to be reverted:"
git log --oneline -1
echo ""

read -p "Do you want to revert this commit? (y/n): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Revert the last commit
echo ""
echo "Reverting last commit..."
git revert HEAD --no-edit

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Commit reverted locally"
    echo ""
    
    # Push to GitHub
    read -p "Push revert to GitHub? (y/n): " push_confirm
    
    if [[ "$push_confirm" =~ ^[Yy]$ ]]; then
        echo ""
        echo "Pushing to GitHub..."
        git push origin master
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "========================================="
            echo "  ✅ SUCCESS!"
            echo "========================================="
            echo ""
            echo "Last commit reverted on GitHub!"
            echo ""
        else
            echo ""
            echo "❌ Push failed"
            echo ""
        fi
    else
        echo ""
        echo "Revert created locally but not pushed."
        echo "To push later: git push origin master"
        echo ""
    fi
else
    echo ""
    echo "❌ Revert failed"
    echo ""
fi
