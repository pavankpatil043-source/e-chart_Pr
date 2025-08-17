#!/bin/bash

# EChart Trading Platform Deployment Script
# Usage: ./deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}🚀 Starting deployment for EChart Trading Platform${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js is required but not installed.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed.${NC}" >&2; exit 1; }

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

# Run tests if they exist
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo -e "${BLUE}🧪 Running tests...${NC}"
    npm run test --if-present
fi

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📥 Installing Vercel CLI...${NC}"
    npm install -g vercel@latest
fi

# Deploy based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${BLUE}🌐 Deploying to production...${NC}"
    vercel --prod --confirm
else
    echo -e "${BLUE}🔧 Deploying to preview...${NC}"
    vercel --confirm
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🎉 Your EChart Trading Platform is now live!${NC}"

# Display useful information
echo -e "${BLUE}📊 Useful commands:${NC}"
echo -e "  ${YELLOW}vercel logs${NC} - View deployment logs"
echo -e "  ${YELLOW}vercel domains${NC} - Manage custom domains"
echo -e "  ${YELLOW}vercel env${NC} - Manage environment variables"
echo -e "  ${YELLOW}vercel --help${NC} - View all available commands"

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${GREEN}🌍 Production URL: https://echart.in${NC}"
fi
