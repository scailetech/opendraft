#!/bin/bash
# OpenDraft Local Worker - Replaces Modal.com
# Run this in a separate terminal while developing

cd "$(dirname "$0")/.."

echo "🚀 Starting OpenDraft Local Worker..."
echo "📍 Working directory: $(pwd)"
echo ""

# Load environment variables from app/.env.local
if [ -f "app/.env.local" ]; then
    export $(grep -v '^#' app/.env.local | xargs)
    echo "✅ Loaded environment from app/.env.local"
else
    echo "❌ app/.env.local not found!"
    exit 1
fi

# Check Python version
python3 --version || { echo "❌ Python 3 not found!"; exit 1; }

echo ""
echo "🔄 Worker will poll for pending theses every 10 seconds..."
echo "📊 Press Ctrl+C to stop"
echo ""

# Run the worker poller
python3 app/worker-poller.py
