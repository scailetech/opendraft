#!/usr/bin/env python3
"""
Deploy to Railway using API token
"""
import os
import subprocess
import sys
from pathlib import Path

# Load env vars from .env.local
from dotenv import load_dotenv
load_dotenv('../.env.local')

RAILWAY_TOKEN = "93050e7f-ef8e-41ad-87ae-6a59f3295d3b"

def main():
    print("🚀 Deploying to Railway...")
    
    # Set token as environment variable
    env = os.environ.copy()
    env['RAILWAY_TOKEN'] = RAILWAY_TOKEN
    
    # Try railway commands
    print("\n1. Checking Railway authentication...")
    result = subprocess.run(
        ['railway', 'whoami'],
        env=env,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"❌ Authentication failed: {result.stderr}")
        print("\n💡 The token might need to be set up differently.")
        print("   Try running manually: railway login")
        print("   Then: railway init")
        print("   Then: railway up")
        return 1
    
    print("✅ Authenticated!")
    
    # Initialize project if needed
    print("\n2. Initializing Railway project...")
    if not Path('.railway').exists():
        result = subprocess.run(
            ['railway', 'init', '--name', 'bulk-gpt-processor-railway'],
            env=env,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"⚠️  Init failed: {result.stderr}")
    
    # Set environment variables
    print("\n3. Setting environment variables...")
    env_vars = {
        'GEMINI_API_KEY': os.getenv('GEMINI_API_KEY'),
        'SUPABASE_URL': os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        'SUPABASE_SERVICE_ROLE_KEY': os.getenv('SUPABASE_SERVICE_ROLE_KEY'),
        'NEXT_PUBLIC_SUPABASE_URL': os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    }
    
    for key, value in env_vars.items():
        if value:
            result = subprocess.run(
                ['railway', 'variables', 'set', f'{key}={value}'],
                env=env,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print(f"   ✅ Set {key}")
            else:
                print(f"   ⚠️  Failed to set {key}: {result.stderr}")
    
    # Deploy
    print("\n4. Deploying...")
    result = subprocess.run(
        ['railway', 'up'],
        env=env,
        text=True
    )
    
    if result.returncode == 0:
        print("\n✅ Deployment complete!")
        print("\n🌐 Get your URL with: railway domain")
        return 0
    else:
        print(f"\n❌ Deployment failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())

