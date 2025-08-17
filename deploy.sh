#!/bin/bash

# EChart Trading Platform Deployment Script
# Usage: ./deploy.sh [environment]
# Environments: development, staging, production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="echart-trading-platform"
DOMAIN="echart.in"
ENVIRONMENT=${1:-production}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm install
    
    log_success "Dependencies installed successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Type checking
    npm run type-check
    
    # Linting
    npm run lint
    
    log_success "All tests passed"
}

# Build application
build_application() {
    log_info "Building application for $ENVIRONMENT..."
    
    # Set environment variables
    export NODE_ENV=$ENVIRONMENT
    export NEXT_TELEMETRY_DISABLED=1
    
    # Clean previous build
    npm run clean
    
    # Build
    npm run build
    
    log_success "Application built successfully"
}

# Deploy to Vercel
deploy_vercel() {
    log_info "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy based on environment
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    log_success "Deployed to Vercel successfully"
}

# Deploy with Docker
deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Build Docker image
    docker build -t $PROJECT_NAME:$ENVIRONMENT .
    
    # Stop existing container
    docker stop $PROJECT_NAME-$ENVIRONMENT 2>/dev/null || true
    docker rm $PROJECT_NAME-$ENVIRONMENT 2>/dev/null || true
    
    # Run new container
    docker run -d \
        --name $PROJECT_NAME-$ENVIRONMENT \
        --restart unless-stopped \
        -p 3000:3000 \
        -e NODE_ENV=$ENVIRONMENT \
        $PROJECT_NAME:$ENVIRONMENT
    
    log_success "Deployed with Docker successfully"
}

# Deploy to VPS with PM2
deploy_pm2() {
    log_info "Deploying with PM2..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 not found. Installing..."
        npm install -g pm2
    fi
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PROJECT_NAME-$ENVIRONMENT',
    script: 'npm',
    args: 'start',
    cwd: '$(pwd)',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: '$ENVIRONMENT',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF
    
    # Create logs directory
    mkdir -p logs
    
    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    log_success "Deployed with PM2 successfully"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local url="https://$DOMAIN"
    if [ "$ENVIRONMENT" != "production" ]; then
        url="http://localhost:3000"
    fi
    
    # Wait for application to start
    sleep 10
    
    # Check health endpoint
    if curl -f "$url/api/health" > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove temporary files
    rm -f ecosystem.config.js
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting deployment for environment: $ENVIRONMENT"
    
    # Run deployment steps
    check_prerequisites
    install_dependencies
    run_tests
    build_application
    
    # Choose deployment method
    case "$ENVIRONMENT" in
        "production"|"staging")
            deploy_vercel
            ;;
        "docker")
            deploy_docker
            ;;
        "pm2")
            deploy_pm2
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            log_info "Available environments: production, staging, docker, pm2"
            exit 1
            ;;
    esac
    
    health_check
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Application is now live at: https://$DOMAIN"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
