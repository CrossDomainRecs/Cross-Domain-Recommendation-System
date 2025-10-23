#!/bin/bash

echo "============================================================"
echo "🧪 RecLab Complete Backend Test Suite"
echo "============================================================"
echo ""

BASE_URL="http://localhost:5000"
FLASK_URL="http://localhost:5001"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
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
        response=$(curl -s -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X $method "$url" \
            -H "Content-Type: application/json" \
            -H "$headers" \
            -d "$data")
    fi
    
    # Check if success field is true
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ PASSED${NC}"
        echo "Response: $(echo $response | jq -c '.' 2>/dev/null || echo $response | head -c 200)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Response: $(echo $response | jq -c '.' 2>/dev/null || echo $response | head -c 200)"
        ((FAILED++))
    fi
    echo ""
}

echo "============================================================"
echo "1️⃣  HEALTH & STATUS ENDPOINTS"
echo "============================================================"
echo ""

# Test 1: Node.js Health
test_endpoint "Node.js Health Check" "GET" "$BASE_URL/health" "" ""

# Test 2: Flask Health
test_endpoint "Flask Health Check" "GET" "$FLASK_URL/health" "" ""

echo "============================================================"
echo "2️⃣  AUTHENTICATION ENDPOINTS"
echo "============================================================"
echo ""

# Test 3: User Registration
RANDOM_USER="testuser_$(date +%s)"
test_endpoint "User Registration" "POST" "$BASE_URL/api/auth/register" \
    "{\"username\": \"$RANDOM_USER\", \"email\": \"$RANDOM_USER@test.com\", \"password\": \"Test123456\"}" \
    ""

# Extract token
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$RANDOM_USER@test.com\", \"password\": \"Test123456\"}" | \
    grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo -e "${YELLOW}Extracted Token:${NC} ${TOKEN:0:30}..."
echo ""

# Test 4: User Login
test_endpoint "User Login" "POST" "$BASE_URL/api/auth/login" \
    "{\"email\": \"$RANDOM_USER@test.com\", \"password\": \"Test123456\"}" \
    ""

# Test 5: Get Profile
test_endpoint "Get User Profile" "GET" "$BASE_URL/api/auth/profile" \
    "" \
    "Authorization: Bearer $TOKEN"

# Test 6: Update Profile
test_endpoint "Update User Profile" "PUT" "$BASE_URL/api/auth/profile" \
    "{\"preferences\": {\"favorite_genres\": [\"Action\", \"Sci-Fi\", \"Comedy\"]}}" \
    "Authorization: Bearer $TOKEN"

echo "============================================================"
echo "3️⃣  COLD-START ENDPOINTS"
echo "============================================================"
echo ""

# Test 7: Validate Input (Movies)
test_endpoint "Cold-Start: Validate Movie Input" "POST" "$BASE_URL/api/recommendations/cold-start" \
    "{\"user_input\": \"Inception\", \"domain\": \"movies\"}" \
    "Authorization: Bearer $TOKEN"

# Test 8: Validate Input (Books)
test_endpoint "Cold-Start: Validate Book Input" "POST" "$BASE_URL/api/recommendations/cold-start" \
    "{\"user_input\": \"Harry Potter\", \"domain\": \"books\"}" \
    "Authorization: Bearer $TOKEN"

# Test 9: Invalid Input
echo -e "${YELLOW}Testing:${NC} Cold-Start: Invalid Input (should handle gracefully)"
curl -s -X POST "$BASE_URL/api/recommendations/cold-start" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"user_input": "xyzabc123notreal", "domain": "movies"}' | jq '.'
echo ""

echo "============================================================"
echo "4️⃣  RECOMMENDATION ENDPOINTS"
echo "============================================================"
echo ""

# Test 10: Get Recommendations (Movies)
test_endpoint "Get Movie Recommendations" "POST" "$BASE_URL/api/recommendations/get" \
    "{\"domain\": \"movies\", \"limit\": 5}" \
    "Authorization: Bearer $TOKEN"

# Test 11: Get Recommendations (Books)
test_endpoint "Get Book Recommendations" "POST" "$BASE_URL/api/recommendations/get" \
    "{\"domain\": \"books\", \"limit\": 5}" \
    "Authorization: Bearer $TOKEN"

# Test 12: Get Recommendations with Filters
test_endpoint "Get Filtered Recommendations" "POST" "$BASE_URL/api/recommendations/get" \
    "{\"domain\": \"movies\", \"limit\": 3, \"genres\": [\"Action\", \"Sci-Fi\"]}" \
    "Authorization: Bearer $TOKEN"

echo "============================================================"
echo "5️⃣  EXPLANATION ENDPOINTS"
echo "============================================================"
echo ""

# Test 13: Single Explanation
test_endpoint "Generate Single Explanation" "POST" "$BASE_URL/api/recommendations/explain" \
    "{\"item\": {\"title\": \"The Matrix\", \"genres\": [\"Sci-Fi\", \"Action\"], \"domain\": \"movies\", \"rating\": 4.8}, \"user_genres\": [\"Sci-Fi\"]}" \
    "Authorization: Bearer $TOKEN"

# Test 14: Batch Explanations
test_endpoint "Generate Batch Explanations" "POST" "$BASE_URL/api/recommendations/explain/batch" \
    "{\"items\": [{\"title\": \"Inception\", \"genres\": [\"Sci-Fi\"], \"rating\": 4.7}, {\"title\": \"Interstellar\", \"genres\": [\"Sci-Fi\"], \"rating\": 4.8}], \"user_genres\": [\"Sci-Fi\"]}" \
    "Authorization: Bearer $TOKEN"

echo "============================================================"
echo "6️⃣  FLASK ML API DIRECT TESTS"
echo "============================================================"
echo ""

# Test 15: Flask Recommendations
test_endpoint "Flask: Get DRL Recommendations" "POST" "$FLASK_URL/api/recommendations/get" \
    "{\"user_id\": \"test_user_123\", \"domain\": \"movies\", \"limit\": 5}" \
    ""

# Test 16: Flask Explanation
test_endpoint "Flask: Generate Explanation" "POST" "$FLASK_URL/api/explanations/generate" \
    "{\"user_profile\": {\"favorite_genres\": [\"Action\"]}, \"recommended_item\": {\"title\": \"Die Hard\", \"genres\": [\"Action\"], \"rating\": 4.8}}" \
    ""

# Test 17: Flask Cold-Start
test_endpoint "Flask: Cold-Start Processing" "POST" "$FLASK_URL/api/cold-start/process" \
    "{\"user_input\": \"The Godfather\", \"domain\": \"movies\"}" \
    ""

echo "============================================================"
echo "7️⃣  USER FEEDBACK & INTERACTION"
echo "============================================================"
echo ""

# Test 18: Record Interaction
test_endpoint "Record User Interaction" "POST" "$BASE_URL/api/recommendations/feedback" \
    "{\"item_id\": \"test_item_123\", \"action\": \"like\", \"domain\": \"movies\"}" \
    "Authorization: Bearer $TOKEN"

echo "============================================================"
echo "📊 TEST SUMMARY"
echo "============================================================"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Backend is ready for frontend integration!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the errors above.${NC}"
fi

echo ""
echo "============================================================"
echo "✅ Test Suite Complete"
echo "============================================================"
