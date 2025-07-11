#!/bin/bash

# QA Test Runner Script for Exchange Platform
# Runs comprehensive quality assurance tests and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(dirname "$0")/.."
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
REPORTS_DIR="$PROJECT_ROOT/qa-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORTS_DIR/qa_report_$TIMESTAMP.md"

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}🧪 Starting Comprehensive QA Testing for Exchange Platform${NC}"
echo -e "${BLUE}=================================================${NC}"
echo "Timestamp: $(date)"
echo "Reports will be saved to: $REPORTS_DIR"
echo ""

# Initialize report
cat > "$REPORT_FILE" << EOF
# گزارش تست کیفیت نهایی

## خلاصه اجرایی
- تاریخ تست: $(date)
- محیط تست: Local Development
- نسخه سیستم: $(git describe --tags --always 2>/dev/null || echo "Development")

## نتایج تست‌ها

EOF

# Function to log to both console and report
log_to_report() {
    echo -e "$1"
    echo "$1" | sed 's/\x1b\[[0-9;]*m//g' >> "$REPORT_FILE"
}

# Function to run test with error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    local working_dir="$3"
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    
    if [ -n "$working_dir" ]; then
        cd "$working_dir"
    fi
    
    if eval "$test_command" > /tmp/test_output_$TIMESTAMP.log 2>&1; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        log_to_report "- [x] $test_name: ✅ PASSED"
        return 0
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        log_to_report "- [ ] $test_name: ❌ FAILED"
        echo "Error output:"
        cat /tmp/test_output_$TIMESTAMP.log
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# Test Categories
echo -e "${BLUE}📋 Test Categories:${NC}"
echo "1. Backend Unit Tests"
echo "2. Backend Integration Tests"
echo "3. Role-Based Testing"
echo "4. End-to-End Workflow Tests"
echo "5. Security Tests"
echo "6. Frontend Unit Tests"
echo "7. Performance Tests (Optional)"
echo ""

# 1. Backend Unit Tests
echo -e "${BLUE}🔬 Running Backend Unit Tests${NC}"
log_to_report "### تست‌های واحد Backend"

if run_test "Backend Unit Tests" "npm run test:unit" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 2. Backend Integration Tests
echo -e "${BLUE}🔗 Running Backend Integration Tests${NC}"
log_to_report "### تست‌های یکپارچگی Backend"

if run_test "Backend Integration Tests" "npm run test:integration" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 3. Role-Based Testing
echo -e "${BLUE}🎭 Running Role-Based Tests${NC}"
log_to_report "### تست‌های نقش‌محور"

# Super Admin Tests
if run_test "Super Admin Role Tests" "npm run test:qa:roles -- --testNamePattern='Super Admin'" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# Tenant Admin Tests
if run_test "Tenant Admin Role Tests" "npm run test:qa:roles -- --testNamePattern='Tenant Admin'" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# Branch Admin Tests
if run_test "Branch Admin Role Tests" "npm run test:qa:roles -- --testNamePattern='Branch Admin'" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# Branch Staff Tests
if run_test "Branch Staff Role Tests" "npm run test:qa:roles -- --testNamePattern='Branch Staff'" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 4. End-to-End Workflow Tests
echo -e "${BLUE}🌐 Running End-to-End Workflow Tests${NC}"
log_to_report "### تست‌های گردش کامل"

if run_test "Complete Workflow Tests" "npm run test:qa:e2e" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 5. Security Tests
echo -e "${BLUE}🔐 Running Security Tests${NC}"
log_to_report "### تست‌های امنیتی"

# Tenant Isolation
if run_test "Tenant Isolation Tests" "npm run test:qa:security -- --testNamePattern='Tenant Isolation'" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# Authentication & Authorization
if run_test "Auth & Authorization Tests" "npm run test:qa:security -- --testNamePattern='Authentication'" "$BACKEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 6. Frontend Unit Tests
echo -e "${BLUE}⚛️ Running Frontend Unit Tests${NC}"
log_to_report "### تست‌های Frontend"

if run_test "Frontend Unit Tests" "npm run test:run" "$FRONTEND_DIR"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# 7. Performance Tests (Optional - requires K6)
echo -e "${BLUE}⚡ Checking Performance Tests${NC}"
if command -v k6 &> /dev/null; then
    echo "K6 found - Running performance tests..."
    log_to_report "### تست‌های عملکردی"
    
    if run_test "Performance Tests" "k6 run src/tests/qa/performance/load-test.js --duration=30s --vus=10" "$BACKEND_DIR"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
else
    echo -e "${YELLOW}⚠️ K6 not found - Skipping performance tests${NC}"
    echo "Install K6 to run performance tests: https://k6.io/docs/getting-started/installation/"
fi

# Generate Coverage Report
echo -e "${BLUE}📊 Generating Coverage Report${NC}"
cd "$BACKEND_DIR"
if npm run test:coverage > /tmp/coverage_$TIMESTAMP.log 2>&1; then
    coverage_summary=$(grep -A 10 "All files" /tmp/coverage_$TIMESTAMP.log | head -5 || echo "Coverage data not available")
    log_to_report "### پوشش کد (Coverage)"
    log_to_report "\`\`\`"
    log_to_report "$coverage_summary"
    log_to_report "\`\`\`"
else
    log_to_report "### پوشش کد (Coverage)"
    log_to_report "Coverage report generation failed"
fi

# Calculate success rate
success_rate=$(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l 2>/dev/null || echo "N/A")

# Final Summary
echo ""
echo -e "${BLUE}📊 Final Test Summary${NC}"
echo "================================="
echo -e "Total Tests: ${BLUE}$total_tests${NC}"
echo -e "Passed: ${GREEN}$passed_tests${NC}"
echo -e "Failed: ${RED}$failed_tests${NC}"
echo -e "Success Rate: ${YELLOW}$success_rate%${NC}"

# Add to report
cat >> "$REPORT_FILE" << EOF

### خلاصه نهایی
- تعداد تست‌های اجرا شده: $total_tests
- تست‌های موفق: $passed_tests
- تست‌های ناموفق: $failed_tests
- درصد موفقیت: $success_rate%

### وضعیت نهایی
EOF

if [ "$failed_tests" -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready for production.${NC}"
    log_to_report "🎉 **همه تست‌ها موفق بودند! سیستم آماده production است.**"
    exit_code=0
else
    echo -e "${RED}⚠️ Some tests failed. Please review and fix issues before deployment.${NC}"
    log_to_report "⚠️ **برخی تست‌ها ناموفق بودند. لطفاً مشکلات را قبل از deployment بررسی کنید.**"
    exit_code=1
fi

# Add recommendations
cat >> "$REPORT_FILE" << EOF

### توصیه‌ها
- بررسی دقیق تست‌های ناموفق
- اطمینان از پوشش کد بالای 70%
- اجرای تست‌های عملکردی در محیط staging
- بررسی نهایی امنیت سیستم

### فایل‌های لاگ
- گزارش کامل: $REPORT_FILE
- لاگ‌های تفصیلی: /tmp/*_$TIMESTAMP.log

---
تولید شده در: $(date)
EOF

echo ""
echo -e "${BLUE}📄 Full report saved to: ${NC}$REPORT_FILE"
echo -e "${BLUE}🗂️ Log files saved to: ${NC}/tmp/*_$TIMESTAMP.log"

# Open report if possible
if command -v xdg-open &> /dev/null; then
    echo "Opening report..."
    xdg-open "$REPORT_FILE" 2>/dev/null &
elif command -v open &> /dev/null; then
    echo "Opening report..."
    open "$REPORT_FILE" 2>/dev/null &
fi

# Clean up temporary files older than 1 day
find /tmp -name "*test_output*.log" -mtime +1 -delete 2>/dev/null || true
find /tmp -name "*coverage*.log" -mtime +1 -delete 2>/dev/null || true

echo -e "${BLUE}QA Testing Complete!${NC}"
exit $exit_code