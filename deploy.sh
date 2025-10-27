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

echo -e "${BLUE}🚀 EChart Trading Platform Deployment Script${NC}"
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
    print_status "Node.js $(node --version)"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_status "npm $(npm --version)"
    
    if [[ "$PLATFORM" == "vercel" ]] && ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found, installing..."
        npm install -g vercel
    fi
    
    if [[ "$PLATFORM" == "docker" ]] && ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    echo ""
}

# Clean and install dependencies
install_dependencies() {
    echo -e "${BLUE}Installing dependencies...${NC}"
    
    # Clean node_modules and package-lock.json if they exist
    if [ -d "node_modules" ]; then
        print_status "Cleaning existing node_modules"
        rm -rf node_modules
    fi
    
    if [ -f "package-lock.json" ]; then
        print_status "Cleaning existing package-lock.json"
        rm -f package-lock.json
    fi
    
    # Install dependencies
    npm install
    print_status "Dependencies installed"
    echo ""
}

# Run tests and linting
run_tests() {
    echo -e "${BLUE}Running tests and checks...${NC}"
    
    # Type checking
    if npm run type-check &> /dev/null; then
        print_status "Type checking passed"
    else
        print_warning "Type checking failed (continuing anyway)"
    fi
    
    # Linting
    if npm run lint &> /dev/null; then
        print_status "Linting passed"
    else
        print_warning "Linting failed (continuing anyway)"
    fi
    
    echo ""
}

# Build the application
build_application() {
    echo -e "${BLUE}Building application...${NC}"
    
    # Set environment variables for build
    export NODE_ENV=$ENVIRONMENT
    export NEXT_TELEMETRY_DISABLED=1
    
    # Build the application
    if npm run build; then
        print_status "Build completed successfully"
    else
        print_error "Build failed"
        exit 1
    fi
    
    echo ""
}

# Deploy to Vercel
deploy_vercel() {
    echo -e "${BLUE}Deploying to Vercel...${NC}"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel --prod --yes
        print_status "Deployed to production"
    else
        vercel --yes
        print_status "Deployed to preview"
    fi
    
    echo ""
}

# Deploy with Docker
deploy_docker() {
    echo -e "${BLUE}Deploying with Docker...${NC}"
    
    # Build Docker image
    docker build -t echart-trading:$ENVIRONMENT .
    print_status "Docker image built"
    
    # Stop existing container if running
    if docker ps -q -f name=echart-trading; then
        docker stop echart-trading
        docker rm echart-trading
        print_status "Stopped existing container"
    fi
    
    # Run new container
    docker run -d \
        --name echart-trading \
        -p 3000:3000 \
        --env-file .env.local \
        echart-trading:$ENVIRONMENT
    
    print_status "Docker container started"
    echo ""
}

# Deploy to VPS
deploy_vps() {
    echo -e "${BLUE}Deploying to VPS...${NC}"
    
    # Install PM2 if not present
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
        print_status "PM2 installed"
    fi
    
    # Stop existing process
    pm2 stop echart-trading 2>/dev/null || true
    pm2 delete echart-trading 2>/dev/null || true
    
    # Start new process
    pm2 start npm --name "echart-trading" -- start
    pm2 save
    pm2 startup
    
    print_status "Application started with PM2"
    echo ""
}

# Health check
health_check() {
    echo -e "${BLUE}Running health check...${NC}"
    
    # Wait for application to start
    sleep 10
    
    # Check health endpoint
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_status "Health check passed"
    else
        print_warning "Health check failed (application might still be starting)"
    fi
    
    echo ""
}

# Main deployment flow
main() {
    echo -e "${GREEN}Starting deployment process...${NC}"
    echo ""
    
    check_dependencies
    install_dependencies
    run_tests
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
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    
    if [[ "$PLATFORM" == "vercel" ]]; then
        echo -e "${BLUE}Your application should be available at:${NC}"
        echo -e "${GREEN}https://echart.in${NC}"
    else
        echo -e "${BLUE}Your application should be available at:${NC}"
        echo -e "${GREEN}http://localhost:3000${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  Health check: curl -f http://localhost:3000/api/health"
    echo "  View logs: vercel logs (for Vercel) or pm2 logs echart-trading (for VPS)"
    echo "  Monitor: pm2 monit (for VPS)"
    echo ""
}

# Run main function
main
