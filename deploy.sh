#!/bin/bash

# EChart Trading Platform Deployment Script
# Usage: ./deploy.sh [environment] [platform]
# Example: ./deploy.sh production vercel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-production}
PLATFORM=${2:-vercel}

echo -e "${BLUE}🚀 EChart Trading Platform Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Platform: ${PLATFORM}${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_status "Node.js is installed"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_status "npm is installed"
    
    if [[ "$PLATFORM" == "vercel" ]] && ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found, installing..."
        npm install -g vercel
    fi
    
    if [[ "$PLATFORM" == "docker" ]] && ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
    print_status "Dependencies installed"
}

# Run tests and linting
run_checks() {
    echo -e "${BLUE}Running checks...${NC}"
    
    # Type checking
    if npm run type-check; then
        print_status "Type checking passed"
    else
        print_error "Type checking failed"
        exit 1
    fi
    
    # Linting
    if npm run lint; then
        print_status "Linting passed"
    else
        print_warning "Linting issues found, continuing..."
    fi
}

# Build the application
build_application() {
    echo -e "${BLUE}Building application...${NC}"
    
    if npm run build; then
        print_status "Build successful"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Deploy to Vercel
deploy_vercel() {
    echo -e "${BLUE}Deploying to Vercel...${NC}"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    print_status "Deployed to Vercel"
}

# Deploy with Docker
deploy_docker() {
    echo -e "${BLUE}Building Docker image...${NC}"
    
    IMAGE_NAME="echart-trading:${ENVIRONMENT}"
    
    docker build -t $IMAGE_NAME .
    print_status "Docker image built: $IMAGE_NAME"
    
    echo -e "${BLUE}Running Docker container...${NC}"
    docker run -d -p 3000:3000 --name echart-trading-${ENVIRONMENT} $IMAGE_NAME
    print_status "Docker container started"
}

# Deploy to VPS
deploy_vps() {
    echo -e "${BLUE}Deploying to VPS...${NC}"
    
    # Install PM2 if not present
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    # Stop existing process
    pm2 stop echart-trading || true
    pm2 delete echart-trading || true
    
    # Start new process
    pm2 start npm --name "echart-trading" -- start
    pm2 save
    
    print_status "Deployed to VPS with PM2"
}

# Health check
health_check() {
    echo -e "${BLUE}Running health check...${NC}"
    
    sleep 5
    
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "Health check passed"
    else
        print_warning "Health check failed - service might still be starting"
    fi
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    check_dependencies
    install_dependencies
    run_checks
    build_application
    
    case $PLATFORM in
        "vercel")
            deploy_vercel
            ;;
        "docker")
            deploy_docker
            health_check
            ;;
        "vps")
            deploy_vps
            health_check
            ;;
        *)
            print_error "Unknown platform: $PLATFORM"
            echo "Supported platforms: vercel, docker, vps"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}Your EChart Trading Platform is now live!${NC}"
    
    if [[ "$PLATFORM" == "vercel" ]]; then
        echo -e "${BLUE}Visit: https://echart.in${NC}"
    else
        echo -e "${BLUE}Visit: http://localhost:3000${NC}"
    fi
}

# Run main function
main
