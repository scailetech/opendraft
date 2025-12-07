#!/bin/bash
# Railway Deployment Script

set -e

echo "🚀 Deploying to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "⚠️  Not logged in to Railway. Please run: railway login"
    echo "   Then run this script again."
    exit 1
fi

echo "✅ Railway CLI ready"

# Set environment variables
echo "📝 Setting environment variables..."
railway variables set GEMINI_API_KEY=AIzaSyDq6l8yzKncJRRkYLsJOjKIv3U4lXc9cM0
railway variables set SUPABASE_URL=https://thurgehvjqrdmrjayczf.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodXJnZWh2anFyZG1yamF5Y3pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY4NjY4MSwiZXhwIjoyMDc5MjYyNjgxfQ.iFAqYJ9B13W1Yq1PxwE0Bn1AtpQqAERl6waSIAeMn7I
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://thurgehvjqrdmrjayczf.supabase.co
echo "✅ Environment variables set"

# Deploy
echo "🚀 Deploying..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Get your URL with: railway domain"

