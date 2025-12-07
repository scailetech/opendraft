#!/bin/bash
# Quick local test with 10 rows first

echo "🧪 Quick local test (10 rows)..."
echo ""

npm run dev > /tmp/nextjs_test.log 2>&1 &
DEV_PID=$!
echo "Starting dev server (PID: $DEV_PID)"
sleep 12

echo "Testing endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/test-batch-direct \
  -H 'Content-Type: application/json' \
  -d '{"rowCount": 10, "prompt": "What is {{company}}?"}' \
  --max-time 120)

if echo "$RESPONSE" | grep -q "success"; then
  echo "✅ Local test passed!"
  echo "$RESPONSE" | head -30
else
  echo "❌ Test failed"
  echo "$RESPONSE" | head -20
fi

kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true
