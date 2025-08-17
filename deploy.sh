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
STAGING_DOMAIN="staging.echart.in"
DOCKER_IMAGE="echart/trading-platform"

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
    
    # Check Vercel CLI
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    log_success "All dependencies are available"
}

install_dependencies() {
    log_info "Installing project dependencies..."
    npm ci
    log_success "Dependencies installed successfully"
}

run_tests() {
    log_info "Running tests..."
    npm run lint
    npm run type-check
    log_success "All tests passed"
}

build_application() {
    log_info "Building application..."
    npm run build
    log_success "Application built successfully"
}

deploy_to_vercel() {
    local environment=$1
    log_info "Deploying to Vercel ($environment)..."
    
    if [ "$environment" = "production" ]; then
        vercel --prod --yes
        log_success "Deployed to production: https://$DOMAIN"
    else
        vercel --yes
        log_success "Deployed to preview environment"
    fi
}

deploy_with_docker() {
    local environment=$1
    log_info "Building Docker image..."
    
    # Build Docker image
    docker build -t $DOCKER_IMAGE:$environment .
    
    # Tag for registry
    docker tag $DOCKER_IMAGE:$environment $DOCKER_IMAGE:latest
    
    log_success "Docker image built successfully"
    
    # Push to registry (if configured)
    if [ ! -z "$DOCKER_REGISTRY" ]; then
        log_info "Pushing to Docker registry..."
        docker push $DOCKER_IMAGE:$environment
        docker push $DOCKER_IMAGE:latest
        log_success "Image pushed to registry"
    fi
}

health_check() {
    local url=$1
    log_info "Performing health check on $url..."
    
    # Wait for deployment to be ready
    sleep 10
    
    # Check health endpoint
    if curl -f "$url/api/health" > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
}

cleanup() {
    log_info "Cleaning up..."
    # Remove temporary files
    rm -rf .next/cache
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    local environment=${1:-"development"}
    
    log_info "Starting deployment for environment: $environment"
    
    # Pre-deployment checks
    check_dependencies
    install_dependencies
    run_tests
    build_application
    
    # Deploy based on environment
    case $environment in
        "production")
            deploy_to_vercel "production"
            health_check "https://$DOMAIN"
            ;;
        "staging")
            deploy_to_vercel "staging"
            health_check "https://$STAGING_DOMAIN"
            ;;
        "docker")
            deploy_with_docker "production"
            ;;
        *)
            deploy_to_vercel "development"
            ;;
    esac
    
    cleanup
    log_success "Deployment completed successfully!"
}

# Script execution
if [ $# -eq 0 ]; then
    log_info "No environment specified, deploying to development"
    deploy "development"
else
    deploy $1
fi

# Post-deployment information
echo ""
echo "==================================="
echo "🚀 EChart Trading Platform Deployed"
echo "==================================="
echo "Production: https://$DOMAIN"
echo "Staging: https://$STAGING_DOMAIN"
echo "Health Check: https://$DOMAIN/api/health"
echo "==================================="
