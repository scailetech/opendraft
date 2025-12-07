#!/bin/bash
# Test Railway processor with large batches

set -e

RAILWAY_URL="${RAILWAY_URL:-http://localhost:8000}"

echo "🧪 Testing Railway Processor - Large Batches"
echo "=============================================="
echo "📍 URL: $RAILWAY_URL"
echo ""

# Test 1: Health check
echo "1️⃣  Health Check..."
HEALTH=$(curl -s "$RAILWAY_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✅ Server is healthy"
else
    echo "   ❌ Server health check failed"
    exit 1
fi

# Test 2: Single row test
echo ""
echo "2️⃣  Single Row Test..."
SINGLE_TEST=$(curl -s -X POST "$RAILWAY_URL/test" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "What is {{company}}?",
        "row": {"company": "Tesla"},
        "output_schema": [{"name": "description", "description": "Company description"}]
    }')

if echo "$SINGLE_TEST" | grep -q "success"; then
    echo "   ✅ Single row processed successfully"
else
    echo "   ❌ Single row test failed: $SINGLE_TEST"
fi

# Test 3: Small batch (10 rows)
echo ""
echo "3️⃣  Small Batch Test (10 rows)..."
BATCH_ID_SMALL="test-small-$(date +%s)"
SMALL_BATCH=$(curl -s -X POST "$RAILWAY_URL/batch" \
    -H "Content-Type: application/json" \
    -d "{
        \"batch_id\": \"$BATCH_ID_SMALL\",
        \"rows\": $(python3 -c "import json; print(json.dumps([{'company': f'Company {i}'} for i in range(10)]))"),
        \"prompt\": \"Describe {{company}}\",
        \"output_schema\": [{\"name\": \"description\", \"description\": \"Company description\"}]
    }")

if echo "$SMALL_BATCH" | grep -q "accepted"; then
    echo "   ✅ Small batch accepted"
    echo "   Batch ID: $BATCH_ID_SMALL"
else
    echo "   ❌ Small batch failed: $SMALL_BATCH"
fi

# Test 4: Medium batch (100 rows)
echo ""
echo "4️⃣  Medium Batch Test (100 rows)..."
BATCH_ID_MEDIUM="test-medium-$(date +%s)"
MEDIUM_BATCH=$(curl -s -X POST "$RAILWAY_URL/batch" \
    -H "Content-Type: application/json" \
    -d "{
        \"batch_id\": \"$BATCH_ID_MEDIUM\",
        \"rows\": $(python3 -c "import json; print(json.dumps([{'company': f'Company {i}'} for i in range(100)]))"),
        \"prompt\": \"Describe {{company}}\",
        \"output_schema\": [{\"name\": \"description\", \"description\": \"Company description\"}]
    }")

if echo "$MEDIUM_BATCH" | grep -q "accepted"; then
    echo "   ✅ Medium batch accepted"
    echo "   Batch ID: $BATCH_ID_MEDIUM"
    echo "   ⏳ Estimated processing time: ~3-4 minutes"
else
    echo "   ❌ Medium batch failed: $MEDIUM_BATCH"
fi

# Test 5: Large batch (1000 rows) - optional
echo ""
read -p "5️⃣  Test LARGE batch (1000 rows)? This will take ~30 minutes. (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BATCH_ID_LARGE="test-large-$(date +%s)"
    echo "   📤 Sending 1000 rows..."
    
    LARGE_BATCH=$(curl -s -X POST "$RAILWAY_URL/batch" \
        -H "Content-Type: application/json" \
        --max-time 120 \
        -d "{
            \"batch_id\": \"$BATCH_ID_LARGE\",
            \"rows\": $(python3 -c "import json; print(json.dumps([{'company': f'Company {i}'} for i in range(1000)]))"),
            \"prompt\": \"Describe {{company}}\",
            \"output_schema\": [{\"name\": \"description\", \"description\": \"Company description\"}]
        }")
    
    if echo "$LARGE_BATCH" | grep -q "accepted"; then
        echo "   ✅ Large batch accepted"
        echo "   Batch ID: $BATCH_ID_LARGE"
        echo "   ⏳ Estimated processing time: ~30-40 minutes"
    else
        echo "   ❌ Large batch failed: $LARGE_BATCH"
    fi
fi

echo ""
echo "=============================================="
echo "✅ Test complete!"
echo "💡 Check Supabase batches table for results"
echo "   Batch IDs: $BATCH_ID_SMALL, $BATCH_ID_MEDIUM"

