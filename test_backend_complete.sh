#!/bin/bash

echo "=========================================="
echo "🧪 RecLab Backend Complete Test Suite"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local headers=$5
    
    echo -e "${YELLOW}Testing:${NC} $name"
    
    if [ -z "$headers" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -H "$headers" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $http_code)"
        echo "Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body | head -c 150)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $http_code)"
        echo "Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body | head -c 150)"
        ((FAILED++))
    fi
    echo ""
}

echo "=========================================="
echo "1️⃣  HEALTH CHECK"
echo "=========================================="
test_endpoint "Health Check" "GET" "$BASE_URL/health"

echo "=========================================="
echo "2️⃣  AUTHENTICATION"
echo "=========================================="

# Register
RANDOM_USER="testuser_$(date +%s)"
test_endpoint "Register New User" "POST" "$BASE_URL/api/auth/register" \
    "{\"username\": \"$RANDOM_USER\", \"email\": \"$RANDOM_USER@test.com\", \"password\": \"Test123456\"}"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$RANDOM_USER@test.com\", \"password\": \"Test123456\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "🔑 Token: ${TOKEN:0:30}..."
echo ""

test_endpoint "Login User" "POST" "$BASE_URL/api/auth/login" \
    "{\"email\": \"$RANDOM_USER@test.com\", \"password\": \"Test123456\"}"

test_endpoint "Get Profile" "GET" "$BASE_URL/api/auth/profile" \
    "" "Authorization: Bearer $TOKEN"

test_endpoint "Update Profile" "PUT" "$BASE_URL/api/auth/profile" \
    "{\"preferences\": {\"favorite_genres\": [\"Action\", \"Sci-Fi\"]}}" \
    "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "3️⃣  RECOMMENDATIONS"
echo "=========================================="

test_endpoint "Get Recommendations" "POST" "$BASE_URL/api/recommendations/get" \
    "{\"domain\": \"movies\", \"limit\": 5}" \
    "Authorization: Bearer $TOKEN"

test_endpoint "Get Filtered Recommendations" "POST" "$BASE_URL/api/recommendations/get" \
    "{\"domain\": \"movies\", \"limit\": 3}" \
    "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "4️⃣  COLD-START"
echo "=========================================="

test_endpoint "Cold-Start: Movie Input" "POST" "$BASE_URL/api/recommendations/cold-start" \
    "{\"user_input\": \"Inception\", \"domain\": \"movies\"}" \
    "Authorization: Bearer $TOKEN"

test_endpoint "Cold-Start: Book Input" "POST" "$BASE_URL/api/recommendations/cold-start" \
    "{\"user_input\": \"Harry Potter\", \"domain\": \"books\"}" \
    "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "5️⃣  EXPLANATIONS"
echo "=========================================="

test_endpoint "Single Explanation" "POST" "$BASE_URL/api/recommendations/explain" \
    "{\"item\": {\"title\": \"The Matrix\", \"genres\": [\"Sci-Fi\", \"Action\"], \"domain\": \"movies\", \"rating\": 4.8}, \"user_genres\": [\"Sci-Fi\"]}" \
    "Authorization: Bearer $TOKEN"

test_endpoint "Batch Explanations" "POST" "$BASE_URL/api/recommendations/explain/batch" \
    "{\"items\": [{\"title\": \"Inception\", \"genres\": [\"Sci-Fi\"], \"rating\": 4.7}, {\"title\": \"Interstellar\", \"genres\": [\"Sci-Fi\"], \"rating\": 4.8}], \"user_genres\": [\"Sci-Fi\"]}" \
    "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "6️⃣  FEEDBACK"
echo "=========================================="

test_endpoint "Record Feedback" "POST" "$BASE_URL/api/recommendations/feedback" \
    "{\"item_id\": \"test_item_123\", \"action\": \"like\", \"time_spent\": 120}" \
    "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review above.${NC}"
fi
