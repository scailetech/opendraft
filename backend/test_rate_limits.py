#!/usr/bin/env python3
"""Test rate limits for Gemini API with Google Search grounding and citation APIs."""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.agent_runner import setup_model, run_agent
from utils.api_citations.orchestrator import CitationResearcher

def test_gemini_with_google_search():
    """Test Gemini API with Google Search grounding."""
    print("=" * 70)
    print("TEST 1: Gemini API with Google Search Grounding")
    print("=" * 70)
    
    try:
        model = setup_model("gemini-2.5-flash")
        
        print("🔍 Testing Google Search grounding...")
        response = model.generate_content(
            "Who won the Euro 2024?",
        )
        
        print(f"✅ Success! Response length: {len(response.text)} chars")
        print(f"   First 200 chars: {response.text[:200]}...")
        return True
        
    except Exception as e:
        error_str = str(e)
        print(f"❌ Error: {error_str}")
        
        if "429" in error_str or "rate limit" in error_str.lower() or "quota" in error_str.lower():
            print("🚨 RATE LIMIT DETECTED!")
            return False
        return False

def test_citation_apis():
    """Test citation research APIs."""
    print("\n" + "=" * 70)
    print("TEST 2: Citation Research APIs (Crossref, Semantic Scholar, Gemini Grounded)")
    print("=" * 70)
    
    try:
        researcher = CitationResearcher()
        
        # Test a single query
        print("🔍 Testing citation research with topic: 'referral programs psychology'...")
        result = researcher.research_citation(
            topic="referral programs psychology"
        )
        
        if result:
            print(f"✅ Success! Found citation: {result.title[:60]}...")
            return True
        else:
            print("⚠️ No citation found (might be OK)")
            return True
            
    except Exception as e:
        error_str = str(e)
        print(f"❌ Error: {error_str}")
        
        if "429" in error_str or "rate limit" in error_str.lower() or "quota" in error_str.lower():
            print("🚨 RATE LIMIT DETECTED!")
            return False
        return False

def test_multiple_requests():
    """Test multiple rapid requests to check for rate limits."""
    print("\n" + "=" * 70)
    print("TEST 3: Multiple Rapid Requests (Rate Limit Stress Test)")
    print("=" * 70)
    
    try:
        model = setup_model("gemini-2.5-flash")
        
        success_count = 0
        rate_limit_count = 0
        
        print("🔍 Sending 5 rapid requests...")
        for i in range(5):
            try:
                response = model.generate_content(f"Test query {i+1}: What is AI?")
                success_count += 1
                print(f"   ✅ Request {i+1} succeeded")
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "rate limit" in error_str.lower():
                    rate_limit_count += 1
                    print(f"   🚨 Request {i+1} hit rate limit: {error_str[:100]}")
                else:
                    print(f"   ❌ Request {i+1} failed: {error_str[:100]}")
        
        print(f"\n📊 Results: {success_count}/5 succeeded, {rate_limit_count} rate limited")
        
        if rate_limit_count > 0:
            print("🚨 RATE LIMITS DETECTED!")
            return False
        
        return True
        
    except Exception as e:
        error_str = str(e)
        print(f"❌ Error: {error_str}")
        return False

if __name__ == "__main__":
    print("\n🧪 RATE LIMIT TEST SUITE")
    print("=" * 70)
    
    results = []
    
    # Run tests
    results.append(("Google Search Grounding", test_gemini_with_google_search()))
    results.append(("Citation APIs", test_citation_apis()))
    results.append(("Multiple Requests", test_multiple_requests()))
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✅ All tests passed - No rate limit issues detected")
    else:
        print("\n🚨 Some tests failed - Rate limits may be an issue")
    
    sys.exit(0 if all_passed else 1)
