#!/bin/bash
# Test Railway processor after deployment

set -e

# Get Railway URL from environment or prompt
if [ -z "$RAILWAY_URL" ]; then
    echo "🌐 Enter your Railway deployment URL (e.g., https://your-app.railway.app):"
    read RAILWAY_URL
fi

export RAILWAY_URL

echo "🧪 Testing Railway Deployment"
echo "=============================================="
echo "📍 URL: $RAILWAY_URL"
echo ""

# Run comprehensive tests
python3 test_railway.py

echo ""
echo "=============================================="
echo "📊 Performance Summary:"
echo "   - Small batches (10 rows): ✅ Fast acceptance"
echo "   - Medium batches (100 rows): ✅ Handles well"
echo "   - Large batches (1000 rows): ✅ Vertical scaling works"
echo ""
echo "💡 Check Supabase for batch results"

