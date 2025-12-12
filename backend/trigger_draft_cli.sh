#!/bin/bash
# Trigger Modal worker for a specific draft ID using Modal CLI
# Usage: ./trigger_draft_cli.sh <draft_id>

set -e

DRAFT_ID=$1

if [ -z "$DRAFT_ID" ]; then
    echo "Usage: $0 <draft_id>"
    exit 1
fi

echo "🚀 Triggering Modal for draft: $DRAFT_ID"
echo "Using Modal CLI to spawn background worker..."

# Use Modal CLI to trigger the function
# This spawns a container that processes the specific draft
cd /Users/federicodeponte/opendraft/backend

# Run the worker using Modal CLI spawn (runs in background)
source /Users/federicodeponte/opendraft/.venv-modal/bin/activate
modal run modal_worker.py::process_single_user --draft-id "$DRAFT_ID"

echo "✅ Modal worker triggered successfully"
