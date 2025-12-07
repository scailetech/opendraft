#!/bin/bash
# Try to authenticate Railway with token
export RAILWAY_TOKEN=93050e7f-ef8e-41ad-87ae-6a59f3295d3b

# Try Railway CLI with token in environment
railway whoami 2>&1 || {
  echo "Trying alternative auth methods..."
  # Try creating auth file
  mkdir -p ~/.railway
  echo '{"token":"93050e7f-ef8e-41ad-87ae-6a59f3295d3b"}' > ~/.railway/auth.json
  railway whoami
}
