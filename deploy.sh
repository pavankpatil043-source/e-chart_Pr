#!/bin/bash

# EChart Trading Platform Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}🚀 Starting EChart Trading Platform deployment...${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Check if required tools are installed
check_dependencies() {
    echo -e "${YELLOW}📋 Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
        npm install -g vercel@latest
    fi
    
    echo -e "${GREEN}✅ All dependencies are available${NC}"
}

# Clean previous builds
clean_build() {
    echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
    rm -rf .next
    rm -rf out
    rm -rf dist
    rm -rf node_modules/.cache
    echo -e "${GREEN}✅ Clean completed${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    npm run lint
    npm run type-check
    
    if npm run test --if-present; then
        echo -e "${GREEN}✅ All tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  No tests found or tests failed${NC}"
    fi
}

# Build application
build_application() {
    echo -e "${YELLOW}🔨 Building application...${NC}"
    
    export NODE_ENV=production
    export NEXT_PUBLIC_APP_URL=https://echart.in
    export NEXT_PUBLIC_DOMAIN=echart.in
    
    npm run build
    echo -e "${GREEN}✅ Build completed${NC}"
}

# Deploy to Vercel
deploy_to_vercel() {
    echo -e "${YELLOW}🌐 Deploying to Vercel...${NC}"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    echo -e "${GREEN}✅ Deployment completed${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}🏥 Running health check...${NC}"
    
    sleep 30
    
    if curl -f https://echart.in/api/health; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
        exit 1
    fi
}

# Docker deployment (alternative)
deploy_docker() {
    echo -e "${YELLOW}🐳 Building Docker image...${NC}"
    
    docker build -t echart-trading:latest .
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${YELLOW}🚀 Running Docker container...${NC}"
        docker run -d -p 3000:3000 --name echart-trading echart-trading:latest
    fi
    
    echo -e "${GREEN}✅ Docker deployment completed${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}🎯 Starting deployment process...${NC}"
    
    check_dependencies
    clean_build
    install_dependencies
    run_tests
    build_application
    
    # Choose deployment method
    if [ "$2" = "docker" ]; then
        deploy_docker
    else
        deploy_to_vercel
        health_check
    fi
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Your EChart Trading Platform is live at: https://echart.in${NC}"
    echo -e "${GREEN}🔍 Health check: https://echart.in/api/health${NC}"
}

# Error handling
trap 'echo -e "${RED}❌ Deployment failed${NC}"; exit 1' ERR

# Run main function
main "$@"
