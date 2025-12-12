#!/bin/bash
# Trigger Modal worker for a specific thesis ID using Modal CLI
# Usage: ./trigger_thesis_cli.sh <thesis_id>

set -e

THESIS_ID=$1

if [ -z "$THESIS_ID" ]; then
    echo "Usage: $0 <thesis_id>"
    exit 1
fi

echo "🚀 Triggering Modal for thesis: $THESIS_ID"
echo "Using Modal CLI to spawn background worker..."

# Use Modal CLI to trigger the function
# This spawns a container that processes the specific thesis
cd /Users/federicodeponte/opendraft/backend

# Run the worker using Modal CLI spawn (runs in background)
source /Users/federicodeponte/opendraft/.venv-modal/bin/activate
modal run modal_worker.py::process_single_user --thesis-id "$THESIS_ID"

echo "✅ Modal worker triggered successfully"
