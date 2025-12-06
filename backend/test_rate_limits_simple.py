#!/usr/bin/env python3
"""Simple rate limit test - direct API calls."""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / '.env')
    load_dotenv(Path(__file__).parent.parent / '.env.local', override=True)
except ImportError:
    pass

import google.generativeai as genai

def test_gemini_api():
    """Test basic Gemini API access."""
    print("=" * 70)
    print("TEST: Gemini API Rate Limits")
    print("=" * 70)
    
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ No API key found (GOOGLE_API_KEY or GEMINI_API_KEY)")
        return False
    
    print(f"✅ API key found: {api_key[:10]}...")
    genai.configure(api_key=api_key)
    
    # Test 1: Basic request
    print("\n🔍 Test 1: Basic request...")
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content("What is AI?")
        print(f"✅ Success! Response: {response.text[:100]}...")
    except Exception as e:
        error_str = str(e)
        print(f"❌ Error: {error_str[:200]}")
        if "429" in error_str or "rate limit" in error_str.lower():
            print("🚨 RATE LIMIT DETECTED!")
            return False
        return False
    
    # Test 2: With Google Search
    print("\n🔍 Test 2: With Google Search grounding...")
    try:
        model = genai.GenerativeModel(
            "gemini-2.5-flash",
            tools=[{"googleSearch": {}}]
        )
        response = model.generate_content("Who won Euro 2024?")
        print(f"✅ Success! Response: {response.text[:100]}...")
    except Exception as e:
        error_str = str(e)
        print(f"❌ Error: {error_str[:200]}")
        if "429" in error_str or "rate limit" in error_str.lower():
            print("🚨 RATE LIMIT DETECTED!")
            return False
        return False
    
    # Test 3: Multiple rapid requests
    print("\n🔍 Test 3: 5 rapid requests...")
    model = genai.GenerativeModel("gemini-2.5-flash")
    success = 0
    rate_limited = 0
    
    for i in range(5):
        try:
            response = model.generate_content(f"Test {i+1}: What is machine learning?")
            success += 1
            print(f"   ✅ Request {i+1} succeeded")
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "rate limit" in error_str.lower():
                rate_limited += 1
                print(f"   🚨 Request {i+1} RATE LIMITED")
            else:
                print(f"   ❌ Request {i+1} failed: {error_str[:100]}")
    
    print(f"\n📊 Results: {success}/5 succeeded, {rate_limited} rate limited")
    
    if rate_limited > 0:
        print("🚨 RATE LIMITS DETECTED!")
        return False
    
    print("\n✅ All tests passed - No rate limit issues")
    return True

if __name__ == "__main__":
    success = test_gemini_api()
    sys.exit(0 if success else 1)

