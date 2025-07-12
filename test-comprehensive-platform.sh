#!/bin/bash

# Comprehensive Multi-Tenant Exchange Platform Test Suite
# Tests all features for currency dealers and underground bankers

echo "🏦 Testing Comprehensive Multi-Tenant Exchange Platform v3"
echo "=========================================================="

BASE_URL="http://localhost:3000"
TENANT_1="underground-bank-1"
TENANT_2="currency-dealer-2"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
    local description="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local tenant="$5"
    
    echo -n "Testing: $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "X-Tenant-ID: $tenant" "$BASE_URL$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -H "X-Tenant-ID: $tenant" -d "$data" "$BASE_URL$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] && (echo "$body" | grep -q '"success":true\|"status":"OK"\|"status":"success"'); then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} (HTTP: $http_code)"
        echo "Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo -e "\n${YELLOW}1. Basic Platform Tests${NC}"
echo "------------------------"

test_endpoint "Platform Health Check" "GET" "/health" "" ""
test_endpoint "API Test Endpoint" "GET" "/api/test" "" ""
test_endpoint "Platform Status" "GET" "/api/status" "" ""

echo -e "\n${YELLOW}2. Multi-Tenant Authentication Tests${NC}"
echo "-------------------------------------"

test_endpoint "Underground Bank Login" "POST" "/api/auth/login" '{"email":"admin@undergroundbank.com","password":"secure123"}' "$TENANT_1"
test_endpoint "Currency Dealer Login" "POST" "/api/auth/login" '{"email":"dealer@currencyexchange.com","password":"dealer123"}' "$TENANT_2"

echo -e "\n${YELLOW}3. Exchange Rate Tests${NC}"
echo "-----------------------"

test_endpoint "Basic Exchange Rates" "GET" "/api/exchange-rates" "" "$TENANT_1"
test_endpoint "Dealer Rates with Spreads" "GET" "/api/dealer/rates" "" "$TENANT_2"

echo -e "\n${YELLOW}4. Transaction Management Tests${NC}"
echo "--------------------------------"

test_endpoint "Currency Exchange Transaction" "POST" "/api/transactions" '{"type":"currency_exchange","amount":1000,"currency":"USD","targetCurrency":"IRR"}' "$TENANT_1"
test_endpoint "Underground Transfer Transaction" "POST" "/api/transactions" '{"type":"hawala_transfer","amount":5000,"currency":"EUR","targetCurrency":"IRR"}' "$TENANT_2"

echo -e "\n${YELLOW}5. Underground Banking Specific Tests${NC}"
echo "--------------------------------------"

test_endpoint "Hawala Transfer Initiation" "POST" "/api/hawala/initiate" '{"fromLocation":"Dubai","toLocation":"Tehran","amount":25000,"currency":"USD","recipientInfo":{"name":"Test User","phone":"+123456789"}}' "$TENANT_1"

test_endpoint "Cash Transaction Recording" "POST" "/api/cash-transactions" '{"type":"cash_exchange","amount":10000,"currency":"EUR","location":"Downtown Office","notes":"Cash exchange operation"}' "$TENANT_1"

echo -e "\n${YELLOW}6. Currency Dealer Specific Tests${NC}"
echo "----------------------------------"

test_endpoint "High Volume Exchange" "POST" "/api/transactions" '{"type":"bulk_exchange","amount":100000,"currency":"USD","targetCurrency":"IRR"}' "$TENANT_2"

echo -e "\n${YELLOW}7. Compliance and Risk Assessment Tests${NC}"
echo "--------------------------------------------"

test_endpoint "Low Risk Assessment" "POST" "/api/compliance/risk-assessment" '{"customerId":"CUST-001","transactionAmount":5000,"transactionType":"currency_exchange"}' "$TENANT_1"
test_endpoint "High Risk Assessment" "POST" "/api/compliance/risk-assessment" '{"customerId":"CUST-002","transactionAmount":75000,"transactionType":"hawala_transfer"}' "$TENANT_1"

echo -e "\n${YELLOW}8. Tenant Dashboard Tests${NC}"
echo "-------------------------"

test_endpoint "Underground Bank Dashboard" "GET" "/api/tenants/$TENANT_1/dashboard" "" "$TENANT_1"
test_endpoint "Currency Dealer Dashboard" "GET" "/api/tenants/$TENANT_2/dashboard" "" "$TENANT_2"

echo -e "\n${YELLOW}9. Multi-Tenant Isolation Tests${NC}"
echo "--------------------------------"

test_endpoint "Tenant 1 Isolated Login" "POST" "/api/auth/login" '{"email":"user@tenant1.com","password":"pass123"}' "$TENANT_1"
test_endpoint "Tenant 2 Isolated Login" "POST" "/api/auth/login" '{"email":"user@tenant2.com","password":"pass123"}' "$TENANT_2"

echo -e "\n${YELLOW}10. Feature Flag Tests${NC}"
echo "----------------------"

# Test that underground banking features are enabled
echo -n "Testing: Underground Banking Enabled... "
health_response=$(curl -s "$BASE_URL/health")
if echo "$health_response" | grep -q '"undergroundBanking":true'; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Testing: Multi-Currency Support... "
if echo "$health_response" | grep -q '"multiCurrency":true'; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Testing: Hawala System Enabled... "
if echo "$health_response" | grep -q '"hawalaSystem":true'; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "=========================================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! The comprehensive multi-tenant exchange platform is working perfectly!${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Some tests failed. Please check the implementation.${NC}"
    exit 1
fi