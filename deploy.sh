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

# Configuration
ENVIRONMENT=${1:-production}
PLATFORM=${2:-vercel}
PROJECT_NAME="echart-trading-platform"
DOMAIN="echart.in"

echo -e "${BLUE}🚀 Starting deployment for EChart Trading Platform${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Platform: ${PLATFORM}${NC}"
echo -e "${BLUE}Domain: ${DOMAIN}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    if [ -f "package-lock.json" ]; then
        npm ci
    elif [ -f "yarn.lock" ]; then
        yarn install --frozen-lockfile
    elif [ -f "pnpm-lock.yaml" ]; then
        pnpm install --frozen-lockfile
    else
        npm install
    fi
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    if npm run test --if-present; then
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed${NC}"
        exit 1
    fi
}

# Function to build application
build_application() {
    echo -e "${YELLOW}🔨 Building application...${NC}"
    if npm run build; then
        echo -e "${GREEN}✅ Build successful${NC}"
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
}

# Function to deploy to Vercel
deploy_vercel() {
    echo -e "${YELLOW}🌐 Deploying to Vercel...${NC}"
    
    if ! command_exists vercel; then
        echo -e "${YELLOW}Installing Vercel CLI...${NC}"
        npm install -g vercel
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    echo -e "${GREEN}✅ Deployed to Vercel${NC}"
}

# Function to deploy with Docker
deploy_docker() {
    echo -e "${YELLOW}🐳 Building Docker image...${NC}"
    
    if ! command_exists docker; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    # Build Docker image
    docker build -t $PROJECT_NAME:latest .
    
    if [ "$ENVIRONMENT" = "production" ]; then
        # Tag for production
        docker tag $PROJECT_NAME:latest $PROJECT_NAME:production
        
        # Run container
        docker run -d \
            --name $PROJECT_NAME \
            -p 3000:3000 \
            --restart unless-stopped \
            $PROJECT_NAME:production
    else
        # Run development container
        docker run -d \
            --name $PROJECT_NAME-dev \
            -p 3000:3000 \
            $PROJECT_NAME:latest
    fi
    
    echo -e "${GREEN}✅ Docker deployment complete${NC}"
}

# Function to deploy to VPS
deploy_vps() {
    echo -e "${YELLOW}🖥️ Deploying to VPS...${NC}"
    
    if ! command_exists pm2; then
        echo -e "${YELLOW}Installing PM2...${NC}"
        npm install -g pm2
    fi
    
    # Build application
    build_application
    
    # Start with PM2
    if [ "$ENVIRONMENT" = "production" ]; then
        pm2 start npm --name "$PROJECT_NAME" -- start
        pm2 save
        pm2 startup
    else
        pm2 start npm --name "$PROJECT_NAME-dev" -- run dev
    fi
    
    echo -e "${GREEN}✅ VPS deployment complete${NC}"
}

# Function to run health checks
health_check() {
    echo -e "${YELLOW}🏥 Running health checks...${NC}"
    
    # Wait for application to start
    sleep 10
    
    # Check health endpoint
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
        exit 1
    fi
}

# Function to setup SSL certificate
setup_ssl() {
    if [ "$PLATFORM" = "vps" ] && [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${YELLOW}🔒 Setting up SSL certificate...${NC}"
        
        if command_exists certbot; then
            sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
            echo -e "${GREEN}✅ SSL certificate configured${NC}"
        else
            echo -e "${YELLOW}⚠️ Certbot not found. Please install SSL certificate manually${NC}"
        fi
    fi
}

# Function to setup monitoring
setup_monitoring() {
    echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
    
    # Create monitoring configuration
    cat > monitoring.json << EOF
{
  "name": "$PROJECT_NAME",
  "url": "https://$DOMAIN",
  "environment": "$ENVIRONMENT",
  "healthCheck": "https://$DOMAIN/api/health",
  "alerts": {
    "email": "admin@$DOMAIN",
    "slack": "#alerts"
  }
}
EOF
    
    echo -e "${GREEN}✅ Monitoring configuration created${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    # Pre-deployment checks
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found${NC}"
        exit 1
    fi
    
    # Install dependencies
    install_dependencies
    
    # Run tests (if available)
    # run_tests
    
    # Deploy based on platform
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
            setup_ssl
            ;;
        *)
            echo -e "${RED}❌ Unknown platform: $PLATFORM${NC}"
            echo -e "${YELLOW}Supported platforms: vercel, docker, vps${NC}"
            exit 1
            ;;
    esac
    
    # Setup monitoring
    setup_monitoring
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Your application should be available at: https://$DOMAIN${NC}"
    
    # Display useful information
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo -e "${BLUE}  Environment: $ENVIRONMENT${NC}"
    echo -e "${BLUE}  Platform: $PLATFORM${NC}"
    echo -e "${BLUE}  Domain: https://$DOMAIN${NC}"
    echo -e "${BLUE}  Health Check: https://$DOMAIN/api/health${NC}"
    echo -e "${BLUE}  Sitemap: https://$DOMAIN/sitemap.xml${NC}"
    
    if [ "$PLATFORM" = "docker" ]; then
        echo -e "${BLUE}  Docker Container: $PROJECT_NAME${NC}"
        echo -e "${BLUE}  Docker Logs: docker logs $PROJECT_NAME${NC}"
    elif [ "$PLATFORM" = "vps" ]; then
        echo -e "${BLUE}  PM2 Status: pm2 status${NC}"
        echo -e "${BLUE}  PM2 Logs: pm2 logs $PROJECT_NAME${NC}"
    fi
}

# Run main function
main "$@"
