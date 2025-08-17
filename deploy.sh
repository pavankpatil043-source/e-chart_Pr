#!/bin/bash

# EChart Trading Platform Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: development, staging, production (default: production)

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="echart-trading-platform"
DOCKER_IMAGE="echart-trading"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
MAX_RETRIES=30
RETRY_INTERVAL=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Clean previous builds
clean_build() {
    log_info "Cleaning previous builds..."
    rm -rf .next
    rm -rf out
    rm -rf dist
    rm -rf node_modules/.cache
    log_success "Build cleaned"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    npm ci --production=false
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    npm run type-check
    npm run lint
    log_success "Tests passed"
}

# Build the application
build_application() {
    log_info "Building application for $ENVIRONMENT..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        export NODE_ENV=production
    else
        export NODE_ENV=development
    fi
    
    npm run build
    log_success "Application built successfully"
}

# Health check function
health_check() {
    local url=$1
    local retries=0
    
    log_info "Performing health check..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s "$url" > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        retries=$((retries + 1))
        log_warning "Health check failed, retrying in $RETRY_INTERVAL seconds... ($retries/$MAX_RETRIES)"
        sleep $RETRY_INTERVAL
    done
    
    log_error "Health check failed after $MAX_RETRIES attempts"
    return 1
}

# Deploy to Vercel
deploy_vercel() {
    log_info "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI is not installed. Install with: npm i -g vercel"
        exit 1
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    log_success "Deployed to Vercel"
}

# Deploy with Docker
deploy_docker() {
    log_info "Deploying with Docker..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -t $DOCKER_IMAGE .
    
    # Stop existing container
    if docker ps -q -f name=$PROJECT_NAME; then
        log_info "Stopping existing container..."
        docker stop $PROJECT_NAME
        docker rm $PROJECT_NAME
    fi
    
    # Run new container
    log_info "Starting new container..."
    docker run -d \
        --name $PROJECT_NAME \
        -p 3000:3000 \
        --restart unless-stopped \
        $DOCKER_IMAGE
    
    # Wait for container to start
    sleep 5
    
    # Health check
    if health_check $HEALTH_CHECK_URL; then
        log_success "Docker deployment successful"
    else
        log_error "Docker deployment failed health check"
        exit 1
    fi
}

# Deploy with PM2
deploy_pm2() {
    log_info "Deploying with PM2..."
    
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 is not installed. Install with: npm i -g pm2"
        exit 1
    fi
    
    # Stop existing process
    pm2 stop $PROJECT_NAME 2>/dev/null || true
    pm2 delete $PROJECT_NAME 2>/dev/null || true
    
    # Start new process
    pm2 start npm --name $PROJECT_NAME -- start
    pm2 save
    
    # Health check
    sleep 5
    if health_check $HEALTH_CHECK_URL; then
        log_success "PM2 deployment successful"
    else
        log_error "PM2 deployment failed health check"
        exit 1
    fi
}

# Main deployment function
main() {
    log_info "Starting deployment for $ENVIRONMENT environment"
    
    # Pre-deployment checks
    check_dependencies
    clean_build
    install_dependencies
    run_tests
    build_application
    
    # Choose deployment method
    case "${2:-vercel}" in
        "vercel")
            deploy_vercel
            ;;
        "docker")
            deploy_docker
            ;;
        "pm2")
            deploy_pm2
            ;;
        *)
            log_error "Unknown deployment method: $2"
            log_info "Available methods: vercel, docker, pm2"
            exit 1
            ;;
    esac
    
    log_success "Deployment completed successfully!"
    log_info "Application should be available at:"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "🌐 Production: https://echart.in"
    else
        log_info "🔧 Development: http://localhost:3000"
    fi
    
    log_info "📊 Health Check: https://echart.in/api/health"
    log_info "🗺️  Sitemap: https://echart.in/sitemap.xml"
    log_info "🤖 Robots: https://echart.in/robots.txt"
}

# Show usage if help is requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "EChart Trading Platform Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [method]"
    echo ""
    echo "Environments:"
    echo "  development  - Deploy to development environment"
    echo "  staging      - Deploy to staging environment"
    echo "  production   - Deploy to production environment (default)"
    echo ""
    echo "Methods:"
    echo "  vercel       - Deploy to Vercel (default)"
    echo "  docker       - Deploy using Docker"
    echo "  pm2          - Deploy using PM2"
    echo ""
    echo "Examples:"
    echo "  $0                           # Deploy to production using Vercel"
    echo "  $0 production vercel         # Deploy to production using Vercel"
    echo "  $0 staging docker            # Deploy to staging using Docker"
    echo "  $0 development pm2           # Deploy to development using PM2"
    exit 0
fi

# Run main function
main "$@"
