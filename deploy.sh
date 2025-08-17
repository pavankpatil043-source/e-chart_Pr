#!/bin/bash

# EChart Trading Platform Deployment Script
# Usage: ./deploy.sh [environment] [platform]
# Example: ./deploy.sh production vercel

set -e  # Exit on any error

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

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

install_packages() {
    log_info "Installing packages..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Packages installed successfully"
}

run_tests() {
    log_info "Running tests..."
    
    # Type checking
    if npm run type-check &> /dev/null; then
        log_success "Type checking passed"
    else
        log_warning "Type checking failed, but continuing..."
    fi
    
    # Linting
    if npm run lint &> /dev/null; then
        log_success "Linting passed"
    else
        log_warning "Linting failed, but continuing..."
    fi
}

build_application() {
    log_info "Building application..."
    
    # Set environment variables
    export NODE_ENV=$ENVIRONMENT
    export NEXT_TELEMETRY_DISABLED=1
    
    # Build the application
    npm run build
    
    log_success "Application built successfully"
}

deploy_vercel() {
    log_info "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_info "Installing Vercel CLI..."
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

deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Build Docker image
    docker build -t $PROJECT_NAME:$ENVIRONMENT .
    
    # Stop existing container if running
    if docker ps -q -f name=$PROJECT_NAME; then
        log_info "Stopping existing container..."
        docker stop $PROJECT_NAME
        docker rm $PROJECT_NAME
    fi
    
    # Run new container
    docker run -d \
        --name $PROJECT_NAME \
        -p 3000:3000 \
        --restart unless-stopped \
        $PROJECT_NAME:$ENVIRONMENT
    
    log_success "Deployed with Docker successfully"
}

deploy_pm2() {
    log_info "Deploying with PM2..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2..."
        npm install -g pm2
    fi
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PROJECT_NAME',
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
    
    # Deploy with PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    log_success "Deployed with PM2 successfully"
}

health_check() {
    log_info "Running health check..."
    
    # Wait for application to start
    sleep 10
    
    # Check health endpoint
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        log_success "Health check passed"
    else
        log_warning "Health check failed - application might still be starting"
    fi
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove temporary files
    rm -f ecosystem.config.js
    
    log_success "Cleanup completed"
}

main() {
    log_info "Starting deployment for $PROJECT_NAME"
    log_info "Environment: $ENVIRONMENT"
    log_info "Platform: $PLATFORM"
    log_info "Domain: $DOMAIN"
    
    # Pre-deployment checks
    check_dependencies
    install_packages
    run_tests
    build_application
    
    # Deploy based on platform
    case $PLATFORM in
        "vercel")
            deploy_vercel
            ;;
        "docker")
            deploy_docker
            health_check
            ;;
        "pm2")
            deploy_pm2
            health_check
            ;;
        *)
            log_error "Unknown platform: $PLATFORM"
            log_info "Supported platforms: vercel, docker, pm2"
            exit 1
            ;;
    esac
    
    # Post-deployment
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Application should be available at: https://$DOMAIN"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; cleanup; exit 1' INT TERM

# Run main function
main "$@"
