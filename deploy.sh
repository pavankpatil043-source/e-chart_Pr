#!/bin/bash

# ECHART.IN Deployment Script
# Make sure you have Vercel CLI installed: npm i -g vercel

echo "🚀 Starting deployment to echart.in..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🎉 Your trading platform is now live at https://echart.in"
    echo ""
    echo "Next steps:"
    echo "1. Configure your custom domain in Vercel dashboard"
    echo "2. Update DNS records for echart.in"
    echo "3. Set up SSL certificate (automatic with Vercel)"
    echo ""
else
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi
