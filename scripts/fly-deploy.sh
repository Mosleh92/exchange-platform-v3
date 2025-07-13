#!/bin/bash

# ==============================================
# Fly.io Deployment Script for Exchange Platform
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_APP="exchange-platform-backend"
FRONTEND_APP="exchange-platform-frontend"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
MIGRATION_TIMEOUT=300
DEPLOY_TIMEOUT=600

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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if flyctl is installed
    if ! command -v flyctl &> /dev/null; then
        log_error "flyctl is not installed. Please install it first."
        echo "Install guide: https://fly.io/docs/getting-started/installing-flyctl/"
        exit 1
    fi
    
    # Check if user is logged in
    if ! flyctl auth whoami &> /dev/null; then
        log_error "Not logged in to Fly.io. Please run 'flyctl auth login' first."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -d "$BACKEND_DIR" ]] || [[ ! -d "$FRONTEND_DIR" ]]; then
        log_error "Please run this script from the root directory of the exchange platform."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

validate_environment() {
    log_info "Validating environment variables..."
    
    # Check if required secrets are set for backend
    if ! flyctl secrets list -a "$BACKEND_APP" | grep -q "JWT_SECRET"; then
        log_warning "JWT_SECRET not set. Please set it with: flyctl secrets set JWT_SECRET=your-secret -a $BACKEND_APP"
    fi
    
    if ! flyctl secrets list -a "$BACKEND_APP" | grep -q "SESSION_SECRET"; then
        log_warning "SESSION_SECRET not set. Please set it with: flyctl secrets set SESSION_SECRET=your-secret -a $BACKEND_APP"
    fi
    
    log_success "Environment validation completed"
}

run_migrations() {
    log_info "Running database migrations..."
    
    cd "$BACKEND_DIR"
    
    # Run migration script
    if [[ -f "scripts/migrate.sh" ]]; then
        timeout $MIGRATION_TIMEOUT bash scripts/migrate.sh
        if [[ $? -eq 0 ]]; then
            log_success "Database migrations completed"
        else
            log_error "Database migrations failed or timed out"
            cd ..
            exit 1
        fi
    else
        log_warning "No migration script found, skipping migrations"
    fi
    
    cd ..
}

deploy_backend() {
    log_info "Deploying backend application..."
    
    cd "$BACKEND_DIR"
    
    # Deploy backend
    timeout $DEPLOY_TIMEOUT flyctl deploy --app "$BACKEND_APP" --ha=false
    if [[ $? -eq 0 ]]; then
        log_success "Backend deployment completed"
    else
        log_error "Backend deployment failed"
        cd ..
        exit 1
    fi
    
    # Wait for backend to be healthy
    log_info "Waiting for backend health check..."
    sleep 30
    
    # Check backend health
    if flyctl status -a "$BACKEND_APP" | grep -q "healthy"; then
        log_success "Backend is healthy"
    else
        log_warning "Backend health check uncertain, please verify manually"
    fi
    
    cd ..
}

deploy_frontend() {
    log_info "Deploying frontend application..."
    
    cd "$FRONTEND_DIR"
    
    # Build frontend
    npm run build
    if [[ $? -ne 0 ]]; then
        log_error "Frontend build failed"
        cd ..
        exit 1
    fi
    
    # Deploy frontend
    timeout $DEPLOY_TIMEOUT flyctl deploy --app "$FRONTEND_APP" --ha=false
    if [[ $? -eq 0 ]]; then
        log_success "Frontend deployment completed"
    else
        log_error "Frontend deployment failed"
        cd ..
        exit 1
    fi
    
    # Wait for frontend to be healthy
    log_info "Waiting for frontend health check..."
    sleep 30
    
    # Check frontend health
    if flyctl status -a "$FRONTEND_APP" | grep -q "healthy"; then
        log_success "Frontend is healthy"
    else
        log_warning "Frontend health check uncertain, please verify manually"
    fi
    
    cd ..
}

post_deployment_verification() {
    log_info "Running post-deployment verification..."
    
    # Test backend health endpoint
    BACKEND_URL="https://$BACKEND_APP.fly.dev"
    if curl -f "$BACKEND_URL/health" > /dev/null 2>&1; then
        log_success "Backend health endpoint is responding"
    else
        log_warning "Backend health endpoint is not responding"
    fi
    
    # Test frontend
    FRONTEND_URL="https://$FRONTEND_APP.fly.dev"
    if curl -f "$FRONTEND_URL/health" > /dev/null 2>&1; then
        log_success "Frontend health endpoint is responding"
    else
        log_warning "Frontend health endpoint is not responding"
    fi
    
    # Display application URLs
    echo ""
    log_success "Deployment completed successfully!"
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo ""
    echo "Useful commands:"
    echo "  flyctl logs -a $BACKEND_APP    # View backend logs"
    echo "  flyctl logs -a $FRONTEND_APP   # View frontend logs"
    echo "  flyctl status -a $BACKEND_APP  # Check backend status"
    echo "  flyctl status -a $FRONTEND_APP # Check frontend status"
}

rollback_on_failure() {
    log_error "Deployment failed. Initiating rollback..."
    
    # Rollback backend
    log_info "Rolling back backend..."
    cd "$BACKEND_DIR"
    flyctl releases rollback -a "$BACKEND_APP" || log_warning "Backend rollback failed"
    cd ..
    
    # Rollback frontend
    log_info "Rolling back frontend..."
    cd "$FRONTEND_DIR"
    flyctl releases rollback -a "$FRONTEND_APP" || log_warning "Frontend rollback failed"
    cd ..
    
    log_error "Rollback completed. Please check the logs and fix issues before retrying."
    exit 1
}

# Main deployment flow
main() {
    log_info "Starting Fly.io deployment for Exchange Platform..."
    
    # Set up error handling
    trap rollback_on_failure ERR
    
    check_prerequisites
    validate_environment
    run_migrations
    deploy_backend
    deploy_frontend
    post_deployment_verification
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backend")
        check_prerequisites
        validate_environment
        run_migrations
        deploy_backend
        ;;
    "frontend")
        check_prerequisites
        deploy_frontend
        ;;
    "verify")
        post_deployment_verification
        ;;
    "rollback")
        rollback_on_failure
        ;;
    *)
        echo "Usage: $0 [deploy|backend|frontend|verify|rollback]"
        echo "  deploy   - Full deployment (default)"
        echo "  backend  - Deploy only backend"
        echo "  frontend - Deploy only frontend"
        echo "  verify   - Run post-deployment verification"
        echo "  rollback - Rollback to previous release"
        exit 1
        ;;
esac