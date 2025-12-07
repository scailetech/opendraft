#!/bin/bash
# Test 1000 rows with web-search + url-context on Render

echo "🧪 Testing 1000 rows with tools on Render..."
echo ""

BASE_URL="${1:-http://localhost:3000}"

curl -X POST "$BASE_URL/api/test-batch-direct" \
  -H 'Content-Type: application/json' \
  -d '{
    "rowCount": 1000,
    "prompt": "Find information about {{company}}. What industry are they in? What is their website?"
  }' \
  --max-time 600 \
  -w "\n\n⏱️  Total time: %{time_total}s\n"

echo ""
echo "✅ Test complete!"
