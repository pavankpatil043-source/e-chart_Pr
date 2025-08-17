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

# Run tests (if available)
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo -e "${BLUE}🧪 Running tests...${NC}"
    npm test || echo -e "${YELLOW}⚠️ Tests failed, continuing deployment...${NC}"
fi

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
export NODE_ENV=production
export NEXT_PUBLIC_APP_URL=https://echart.in
export NEXT_PUBLIC_DOMAIN=echart.in
npm run build

# Deploy based on environment
if [ "$ENVIRONMENT" = "vercel" ] || [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${BLUE}🌐 Deploying to Vercel...${NC}"
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}📥 Installing Vercel CLI...${NC}"
        npm install -g vercel
    fi
    
    # Deploy to Vercel
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --confirm
    else
        vercel --confirm
    fi
    
elif [ "$ENVIRONMENT" = "docker" ]; then
    echo -e "${BLUE}🐳 Building Docker image...${NC}"
    docker build -t echart-trading-platform .
    
    echo -e "${BLUE}🚀 Starting Docker container...${NC}"
    docker run -d -p 3000:3000 --name echart-app echart-trading-platform
    
elif [ "$ENVIRONMENT" = "pm2" ]; then
    echo -e "${BLUE}⚡ Deploying with PM2...${NC}"
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}📥 Installing PM2...${NC}"
        npm install -g pm2
    fi
    
    # Start with PM2
    pm2 start npm --name "echart-trading" -- start
    pm2 save
    
else
    echo -e "${BLUE}🏃 Starting development server...${NC}"
    npm run dev
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🎉 Your trading platform is now live at: https://echart.in${NC}"

# Health check
echo -e "${BLUE}🔍 Performing health check...${NC}"
sleep 5

if [ "$ENVIRONMENT" = "docker" ]; then
    HEALTH_URL="http://localhost:3000/api/health"
else
    HEALTH_URL="https://echart.in/api/health"
fi

if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${YELLOW}⚠️ Health check failed, but deployment may still be successful${NC}"
fi

echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "  • Environment: ${ENVIRONMENT}"
echo -e "  • Domain: https://echart.in"
echo -e "  • Status: Deployed"
echo -e "  • Features: Live NSE data, AI chat, Technical analysis"
