#!/usr/bin/env python3
"""
Test Railway processor locally and with large batches
"""
import os
import sys
import json
import time
import requests
from dotenv import load_dotenv

# Load env vars
load_dotenv('../.env.local')

BASE_URL = os.getenv("RAILWAY_URL", "http://localhost:8000")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")

def test_health():
    """Test health endpoint"""
    print("🏥 Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print(f"   ✅ Health check passed: {response.json()}")
            return True
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
        return False

def test_single_row():
    """Test single row processing"""
    print("\n🧪 Testing single row processing (/test)...")
    payload = {
        "prompt": "What is {{company}}?",
        "row": {"company": "Tesla"},
        "output_schema": [{"name": "description", "description": "Company description"}],
        "tools": []
    }
    
    try:
        start = time.time()
        response = requests.post(f"{BASE_URL}/test", json=payload, timeout=30)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Single row processed in {elapsed:.2f}s")
            print(f"   Status: {result.get('status')}")
            print(f"   Tokens: {result.get('tokens', {})}")
            return True
        else:
            print(f"   ❌ Failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_small_batch():
    """Test small batch (10 rows)"""
    print("\n📦 Testing small batch (10 rows)...")
    
    rows = [{"company": f"Company {i}", "name": f"Name {i}"} for i in range(10)]
    batch_id = f"test-batch-small-{int(time.time())}"
    
    payload = {
        "batch_id": batch_id,
        "rows": rows,
        "prompt": "Describe {{company}}",
        "output_schema": [{"name": "description", "description": "Company description"}],
        "tools": []
    }
    
    try:
        start = time.time()
        response = requests.post(f"{BASE_URL}/batch", json=payload, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Batch accepted in {elapsed:.2f}s")
            print(f"   Batch ID: {result.get('batch_id')}")
            print(f"   Total rows: {result.get('total_rows')}")
            print(f"   Status: {result.get('status')}")
            
            # Wait a bit for processing
            print("   ⏳ Waiting for processing...")
            time.sleep(5)
            return True, batch_id
        else:
            print(f"   ❌ Failed: {response.status_code} - {response.text}")
            return False, None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False, None

def test_large_batch(size=100):
    """Test large batch"""
    print(f"\n🚀 Testing large batch ({size} rows)...")
    
    rows = [{"company": f"Company {i}", "name": f"Name {i}"} for i in range(size)]
    batch_id = f"test-batch-large-{int(time.time())}"
    
    payload = {
        "batch_id": batch_id,
        "rows": rows,
        "prompt": "Describe {{company}}",
        "output_schema": [{"name": "description", "description": "Company description"}],
        "tools": []
    }
    
    try:
        print(f"   📤 Sending {size} rows...")
        start = time.time()
        response = requests.post(f"{BASE_URL}/batch", json=payload, timeout=30)
        request_time = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Batch accepted in {request_time:.2f}s")
            print(f"   Batch ID: {result.get('batch_id')}")
            print(f"   Total rows: {result.get('total_rows')}")
            
            # Estimate processing time
            estimated_time = size * 2  # ~2 seconds per row
            print(f"   ⏳ Estimated processing time: ~{estimated_time}s")
            print(f"   💡 Check Supabase for results (batch_id: {batch_id})")
            return True, batch_id
        else:
            print(f"   ❌ Failed: {response.status_code} - {response.text}")
            return False, None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False, None

def test_very_large_batch(size=1000):
    """Test very large batch"""
    print(f"\n🔥 Testing VERY large batch ({size} rows)...")
    print(f"   ⚠️  This will test vertical scaling limits")
    
    rows = [{"company": f"Company {i}", "name": f"Name {i}"} for i in range(size)]
    batch_id = f"test-batch-xlarge-{int(time.time())}"
    
    payload = {
        "batch_id": batch_id,
        "rows": rows,
        "prompt": "Describe {{company}}",
        "output_schema": [{"name": "description", "description": "Company description"}],
        "tools": []
    }
    
    try:
        print(f"   📤 Sending {size} rows...")
        start = time.time()
        response = requests.post(f"{BASE_URL}/batch", json=payload, timeout=60)
        request_time = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Batch accepted in {request_time:.2f}s")
            print(f"   Batch ID: {result.get('batch_id')}")
            print(f"   Total rows: {result.get('total_rows')}")
            
            estimated_time = size * 2
            print(f"   ⏳ Estimated processing time: ~{estimated_time}s (~{estimated_time/60:.1f} minutes)")
            print(f"   💡 Check Supabase for results (batch_id: {batch_id})")
            return True, batch_id
        else:
            print(f"   ❌ Failed: {response.status_code} - {response.text}")
            return False, None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False, None

def main():
    print("🧪 Railway Processor Test Suite")
    print("=" * 50)
    
    if not GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY not set!")
        sys.exit(1)
    
    if not SUPABASE_URL:
        print("❌ SUPABASE_URL not set!")
        sys.exit(1)
    
    print(f"📍 Testing against: {BASE_URL}")
    print(f"🔑 GEMINI_API_KEY: {'SET' if GEMINI_API_KEY else 'NOT SET'}")
    print(f"🔗 SUPABASE_URL: {'SET' if SUPABASE_URL else 'NOT SET'}")
    print()
    
    # Test 1: Health check
    if not test_health():
        print("\n❌ Health check failed. Is the server running?")
        print("   Start with: python3 main_railway.py")
        sys.exit(1)
    
    # Test 2: Single row
    test_single_row()
    
    # Test 3: Small batch
    success, batch_id = test_small_batch()
    if success:
        print(f"   ✅ Small batch test passed")
    
    # Test 4: Large batch (100 rows)
    print("\n" + "=" * 50)
    success, batch_id = test_large_batch(100)
    if success:
        print(f"   ✅ Large batch (100) test passed")
    
    # Test 5: Very large batch (1000 rows) - optional
    print("\n" + "=" * 50)
    response = input("   Test VERY large batch (1000 rows)? This may take ~30 minutes. (y/n): ")
    if response.lower() == 'y':
        success, batch_id = test_very_large_batch(1000)
        if success:
            print(f"   ✅ Very large batch (1000) test passed")
    
    print("\n" + "=" * 50)
    print("✅ Test suite complete!")
    print(f"💡 Check Supabase batches table for results")

if __name__ == "__main__":
    main()

