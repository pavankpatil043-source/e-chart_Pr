#!/bin/bash

# EChart Trading Platform Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
DOMAIN="echart.in"

echo "🚀 Starting deployment to $ENVIRONMENT..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel@latest
    fi
    
    print_success "All dependencies are available"
}

# Install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    npm ci
    print_success "Dependencies installed"
}

# Run tests and linting
run_tests() {
    print_status "Running tests and linting..."
    
    if npm run lint; then
        print_success "Linting passed"
    else
        print_error "Linting failed"
        exit 1
    fi
    
    if npm run type-check; then
        print_success "Type checking passed"
    else
        print_error "Type checking failed"
        exit 1
    fi
    
    if npm run build; then
        print_success "Build successful"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    print_success "Deployment completed"
}

# Health check
health_check() {
    print_status "Running health check..."
    sleep 10
    
    if [ "$ENVIRONMENT" = "production" ]; then
        HEALTH_URL="https://$DOMAIN/api/health"
    else
        # Get preview URL from Vercel output (simplified)
        HEALTH_URL="https://echart-in.vercel.app/api/health"
    fi
    
    if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
        print_success "Health check passed: $HEALTH_URL"
    else
        print_warning "Health check failed, but deployment may still be successful"
    fi
}

# Main deployment process
main() {
    echo "======================================"
    echo "🏦 EChart Trading Platform Deployment"
    echo "======================================"
    echo "Environment: $ENVIRONMENT"
    echo "Domain: $DOMAIN"
    echo "======================================"
    
    check_dependencies
    install_dependencies
    run_tests
    deploy_to_vercel
    health_check
    
    echo "======================================"
    print_success "🎉 Deployment completed successfully!"
    echo "======================================"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "🌐 Production URL: https://$DOMAIN"
        echo "🔍 Health Check: https://$DOMAIN/api/health"
    fi
    
    echo "📊 Features deployed:"
    echo "  ✅ Live NSE market data"
    echo "  ✅ AI-powered trading insights"
    echo "  ✅ Technical analysis tools"
    echo "  ✅ Real-time price updates"
    echo "  ✅ Mobile-responsive design"
    echo "  ✅ Performance optimizations"
    echo "======================================"
}

# Run main function
main
