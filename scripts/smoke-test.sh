#!/bin/bash
# Smoke test script for Kirby-Gen API
# Run this after deployment to verify core functionality
#
# Usage:
#   ./scripts/smoke-test.sh [API_URL]
#   API_URL=${API_URL:-http://localhost:3001} ./scripts/smoke-test.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-${API_URL:-http://localhost:3001}}"
TIMEOUT=5

echo ""
echo "🔍 Running smoke tests against: $API_URL"
echo "⏱️  Timeout: ${TIMEOUT}s per test"
echo ""

# Test counter
PASSED=0
FAILED=0
TOTAL=0

# Test helper function
run_test() {
  local test_name="$1"
  local test_fn="$2"

  TOTAL=$((TOTAL + 1))
  echo -n "[$TOTAL] Testing: $test_name... "

  if eval "$test_fn"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Test 1: Health check endpoint
test_health() {
  curl -sf --max-time $TIMEOUT "$API_URL/health" > /dev/null
}

# Test 2: API responds
test_api_responds() {
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL/api/projects")
  [ "$HTTP_CODE" != "000" ]  # 000 means connection failed
}

# Test 3: Authentication is enforced (should return 401 without token)
test_auth_enforced() {
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL/api/projects")
  [ "$HTTP_CODE" = "401" ]
}

# Test 4: CORS headers are present
test_cors_headers() {
  HEADERS=$(curl -sI --max-time $TIMEOUT "$API_URL/health")
  echo "$HEADERS" | grep -iq "access-control-allow"
}

# Test 5: Content-Type is correct
test_content_type() {
  CONTENT_TYPE=$(curl -s -o /dev/null -w "%{content_type}" --max-time $TIMEOUT "$API_URL/health")
  echo "$CONTENT_TYPE" | grep -q "application/json"
}

# Test 6: Rate limiting headers present (optional)
test_rate_limit_headers() {
  HEADERS=$(curl -sI --max-time $TIMEOUT "$API_URL/health")
  echo "$HEADERS" | grep -iq "x-ratelimit" || return 0  # Optional, so pass if missing
}

# Test 7: Domain mapping requires auth
test_domain_mapping_auth() {
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    -X POST "$API_URL/api/projects/test-id/domain-mapping/init")
  [ "$HTTP_CODE" = "401" ]
}

# Test 8: File upload requires auth
test_file_upload_auth() {
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    -X POST "$API_URL/api/projects/test-id/files")
  [ "$HTTP_CODE" = "401" ]
}

# Test 9: Generate requires auth
test_generate_auth() {
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    -X POST "$API_URL/api/projects/test-id/generate")
  [ "$HTTP_CODE" = "401" ]
}

# Test 10: Invalid endpoints return proper errors
test_404_handling() {
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    "$API_URL/api/nonexistent-endpoint")
  [ "$HTTP_CODE" = "404" ]
}

# Run all tests
echo "═══════════════════════════════════════"
echo "  Core Functionality Tests"
echo "═══════════════════════════════════════"

run_test "Health check endpoint responds" "test_health"
run_test "API responds to requests" "test_api_responds"
run_test "Content-Type header is application/json" "test_content_type"
run_test "CORS headers are present" "test_cors_headers"
run_test "404 handling works correctly" "test_404_handling"

echo ""
echo "═══════════════════════════════════════"
echo "  Authentication Tests (Poka-Yoke)"
echo "═══════════════════════════════════════"

run_test "Projects endpoint requires authentication" "test_auth_enforced"
run_test "Domain mapping requires authentication" "test_domain_mapping_auth"
run_test "File upload requires authentication" "test_file_upload_auth"
run_test "Generate requires authentication" "test_generate_auth"

echo ""
echo "═══════════════════════════════════════"
echo "  Results Summary"
echo "═══════════════════════════════════════"
echo ""
echo -e "Total:  $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All smoke tests passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}✗ $FAILED test(s) failed${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  - Check if the API server is running at $API_URL"
  echo "  - Verify environment variables are correctly set"
  echo "  - Check server logs for errors"
  echo ""
  exit 1
fi
