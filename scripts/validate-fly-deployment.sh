#!/bin/bash

# ==============================================
# Fly.io Deployment Validation Script
# Tests all components before deployment
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

run_test() {
    ((TESTS_RUN++))
    local test_name="$1"
    local test_command="$2"
    
    log_info "Running test: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        log_success "$test_name"
        return 0
    else
        log_error "$test_name"
        return 1
    fi
}

# Test 1: Check required files exist
test_required_files() {
    log_info "Checking required files..."
    
    local required_files=(
        "backend/fly.toml"
        "frontend/fly.toml"
        "backend/.env.production"
        "frontend/.env.production"
        "backend/Dockerfile"
        "frontend/Dockerfile"
        "scripts/fly-deploy.sh"
        "scripts/fly-migrate.sh"
        "backend/scripts/migrate.js"
        "backend/scripts/database-optimizer.js"
        ".github/workflows/fly-deploy.yml"
        "DEPLOYMENT_FLY_GUIDE.md"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -eq 0 ]]; then
        log_success "All required files exist"
        return 0
    else
        log_error "Missing files: ${missing_files[*]}"
        return 1
    fi
}

# Test 2: Validate fly.toml configurations
test_fly_configs() {
    log_info "Validating fly.toml configurations..."
    
    # Check backend fly.toml
    if grep -q "exchange-platform-backend" backend/fly.toml && \
       grep -q "fra" backend/fly.toml && \
       grep -q "512mb" backend/fly.toml; then
        log_success "Backend fly.toml configuration is valid"
    else
        log_error "Backend fly.toml configuration is invalid"
        return 1
    fi
    
    # Check frontend fly.toml
    if grep -q "exchange-platform-frontend" frontend/fly.toml && \
       grep -q "fra" frontend/fly.toml && \
       grep -q "256mb" frontend/fly.toml; then
        log_success "Frontend fly.toml configuration is valid"
    else
        log_error "Frontend fly.toml configuration is invalid"
        return 1
    fi
    
    return 0
}

# Test 3: Check Docker builds
test_docker_builds() {
    log_info "Testing Docker builds..."
    
    # Test backend Dockerfile syntax
    if docker build -f backend/Dockerfile -t test-backend:latest backend/ --dry-run 2>/dev/null; then
        log_success "Backend Dockerfile syntax is valid"
    else
        log_error "Backend Dockerfile has syntax errors"
        return 1
    fi
    
    # Test frontend Dockerfile syntax  
    if docker build -f frontend/Dockerfile -t test-frontend:latest frontend/ --dry-run 2>/dev/null; then
        log_success "Frontend Dockerfile syntax is valid"
    else
        log_error "Frontend Dockerfile has syntax errors"
        return 1
    fi
    
    return 0
}

# Test 4: Validate environment files
test_environment_files() {
    log_info "Validating environment files..."
    
    # Check backend .env.production
    if grep -q "NODE_ENV=production" backend/.env.production && \
       grep -q "MONGODB_URI" backend/.env.production && \
       grep -q "REDIS_URL" backend/.env.production; then
        log_success "Backend .env.production is valid"
    else
        log_error "Backend .env.production is missing required variables"
        return 1
    fi
    
    # Check frontend .env.production
    if grep -q "VITE_API_URL" frontend/.env.production && \
       grep -q "VITE_WS_URL" frontend/.env.production; then
        log_success "Frontend .env.production is valid"
    else
        log_error "Frontend .env.production is missing required variables"
        return 1
    fi
    
    return 0
}

# Test 5: Check package.json scripts
test_package_scripts() {
    log_info "Checking package.json scripts..."
    
    # Check backend scripts
    if grep -q "fly:deploy" backend/package.json && \
       grep -q "migrate" backend/package.json; then
        log_success "Backend package.json has required Fly.io scripts"
    else
        log_error "Backend package.json is missing Fly.io scripts"
        return 1
    fi
    
    # Check frontend scripts
    if grep -q "fly:deploy" frontend/package.json && \
       grep -q "build.*production" frontend/package.json; then
        log_success "Frontend package.json has required Fly.io scripts"
    else
        log_error "Frontend package.json is missing Fly.io scripts"
        return 1
    fi
    
    return 0
}

# Test 6: Validate deployment scripts
test_deployment_scripts() {
    log_info "Validating deployment scripts..."
    
    # Check fly-deploy.sh
    if [[ -x "scripts/fly-deploy.sh" ]] && \
       grep -q "flyctl" scripts/fly-deploy.sh; then
        log_success "fly-deploy.sh is executable and contains Fly.io commands"
    else
        log_error "fly-deploy.sh is not properly configured"
        return 1
    fi
    
    # Check fly-migrate.sh
    if [[ -x "scripts/fly-migrate.sh" ]] && \
       grep -q "MongoDB" scripts/fly-migrate.sh; then
        log_success "fly-migrate.sh is executable and contains migration logic"
    else
        log_error "fly-migrate.sh is not properly configured"
        return 1
    fi
    
    return 0
}

# Test 7: Check GitHub workflow
test_github_workflow() {
    log_info "Validating GitHub workflow..."
    
    if grep -q "Deploy to Fly.io" .github/workflows/fly-deploy.yml && \
       grep -q "FLY_API_TOKEN" .github/workflows/fly-deploy.yml && \
       grep -q "flyctl deploy" .github/workflows/fly-deploy.yml; then
        log_success "GitHub workflow is properly configured for Fly.io"
    else
        log_error "GitHub workflow is missing Fly.io configuration"
        return 1
    fi
    
    return 0
}

# Test 8: Validate Node.js dependencies
test_dependencies() {
    log_info "Checking Node.js dependencies..."
    
    # Check backend dependencies
    cd backend
    if npm audit --level=high 2>/dev/null; then
        log_success "Backend dependencies have no high-severity vulnerabilities"
    else
        log_warning "Backend dependencies may have vulnerabilities (check with npm audit)"
    fi
    cd ..
    
    # Check frontend dependencies
    cd frontend
    if npm audit --level=high 2>/dev/null; then
        log_success "Frontend dependencies have no high-severity vulnerabilities"
    else
        log_warning "Frontend dependencies may have vulnerabilities (check with npm audit)"
    fi
    cd ..
    
    return 0
}

# Test 9: Build validation
test_builds() {
    log_info "Testing application builds..."
    
    # Test backend build
    cd backend
    if npm run build; then
        log_success "Backend build successful"
    else
        log_error "Backend build failed"
        cd ..
        return 1
    fi
    cd ..
    
    # Test frontend build
    cd frontend
    if npm run build; then
        log_success "Frontend build successful"
    else
        log_error "Frontend build failed"
        cd ..
        return 1
    fi
    cd ..
    
    return 0
}

# Test 10: Configuration validation
test_configurations() {
    log_info "Validating configurations..."
    
    # Check ecosystem.config.js
    if node -c backend/ecosystem.config.js; then
        log_success "PM2 ecosystem configuration is valid"
    else
        log_error "PM2 ecosystem configuration has syntax errors"
        return 1
    fi
    
    # Check migration script
    if node -c backend/scripts/migrate.js; then
        log_success "Migration script syntax is valid"
    else
        log_error "Migration script has syntax errors"
        return 1
    fi
    
    # Check database optimizer script
    if node -c backend/scripts/database-optimizer.js; then
        log_success "Database optimizer script syntax is valid"
    else
        log_error "Database optimizer script has syntax errors"
        return 1
    fi
    
    return 0
}

# Test 11: Security validation
test_security() {
    log_info "Validating security configurations..."
    
    # Check for security middleware
    if grep -r "helmet" backend/src/middleware/ && \
       grep -r "rateLimit" backend/src/middleware/; then
        log_success "Security middleware is present"
    else
        log_error "Security middleware is missing"
        return 1
    fi
    
    # Check Dockerfile security
    if grep -q "USER.*nodejs" backend/Dockerfile && \
       grep -q "USER.*nginx-custom" frontend/Dockerfile; then
        log_success "Dockerfiles use non-root users"
    else
        log_error "Dockerfiles may be running as root"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    echo "======================================"
    echo "  Fly.io Deployment Validation Tests"
    echo "======================================"
    echo ""
    
    # Run all tests
    run_test "Required files check" "test_required_files"
    run_test "Fly.io configurations" "test_fly_configs"
    run_test "Docker build validation" "test_docker_builds"
    run_test "Environment files" "test_environment_files"
    run_test "Package.json scripts" "test_package_scripts"
    run_test "Deployment scripts" "test_deployment_scripts"
    run_test "GitHub workflow" "test_github_workflow"
    run_test "Dependencies check" "test_dependencies"
    run_test "Build validation" "test_builds"
    run_test "Configuration validation" "test_configurations"
    run_test "Security validation" "test_security"
    
    # Summary
    echo ""
    echo "======================================"
    echo "           Test Summary"
    echo "======================================"
    echo "Tests run: $TESTS_RUN"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}✅ All tests passed! Your Fly.io deployment is ready.${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Set up Fly.io account and install flyctl"
        echo "2. Run: flyctl auth login"
        echo "3. Deploy: ./scripts/fly-deploy.sh"
        echo ""
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Please fix the issues before deploying.${NC}"
        echo ""
        exit 1
    fi
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "backend" ]] || [[ ! -d "frontend" ]]; then
    log_error "Please run this script from the root directory of the exchange platform"
    exit 1
fi

# Run main function
main "$@"