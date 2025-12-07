#!/bin/bash
# Test 1000 rows with tools on Render deployment

# Get Render URL from environment or prompt
RENDER_URL="${RENDER_URL:-${1}}"

if [ -z "$RENDER_URL" ]; then
  echo "🌐 Enter your Render deployment URL (e.g., https://bulk-run.onrender.com):"
  read RENDER_URL
fi

if [ -z "$RENDER_URL" ]; then
  echo "❌ Render URL required!"
  exit 1
fi

echo "🧪 Testing 1000 rows with web-search + url-context on Render..."
echo "📍 URL: $RENDER_URL"
echo ""

# Test endpoint availability first
echo "1️⃣  Checking endpoint..."
HEALTH=$(curl -s "$RENDER_URL/api/test-batch-direct" -X GET)
if echo "$HEALTH" | grep -q "Test Direct Batch"; then
  echo "   ✅ Endpoint available"
else
  echo "   ⚠️  Endpoint check failed, but continuing..."
fi

echo ""
echo "2️⃣  Starting 1000-row test with tools..."
echo "   ⏱️  This will take ~5-10 minutes..."
echo ""

START_TIME=$(date +%s)

# Test 1000 rows
RESPONSE=$(curl -s -X POST "$RENDER_URL/api/test-batch-direct" \
  -H 'Content-Type: application/json' \
  -d '{
    "rowCount": 1000,
    "prompt": "Find information about {{company}}. What industry are they in? What is their website?"
  }' \
  --max-time 600)

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo "📊 Test Results"
echo "=========================================="
echo "⏱️  Total time: ${ELAPSED}s (~$((ELAPSED / 60)) minutes)"
echo ""

# Try to parse JSON response
if command -v jq &> /dev/null; then
  echo "$RESPONSE" | jq '.'
else
  echo "$RESPONSE"
fi

echo ""
echo "=========================================="
echo "✅ Test complete!"
echo ""

# Extract key metrics if jq available
if command -v jq &> /dev/null; then
  SUCCESS=$(echo "$RESPONSE" | jq -r '.summary.successRate // "N/A"')
  TOTAL_TIME=$(echo "$RESPONSE" | jq -r '.performance.totalElapsedSeconds // "N/A"')
  ROWS_PER_SEC=$(echo "$RESPONSE" | jq -r '.performance.rowsPerSecond // "N/A"')
  
  echo "📈 Key Metrics:"
  echo "   Success Rate: $SUCCESS"
  echo "   Total Time: ${TOTAL_TIME}s"
  echo "   Throughput: $ROWS_PER_SEC rows/sec"
fi

