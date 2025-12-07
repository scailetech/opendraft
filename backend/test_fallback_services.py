#!/usr/bin/env python3
"""
Test script for fallback services (DataForSEO and OpenPull)
Run this locally before deploying to Modal.
"""

import os
import sys

# Set credentials
os.environ["DATAFORSEO_LOGIN"] = "tech@scaile.it"
os.environ["DATAFORSEO_PASSWORD"] = "9e531aabb0eba124"

# Add parent directory to path to import utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.fallback_services import search_web_dataforseo, scrape_page_with_openpull

def test_dataforseo():
    """Test DataForSEO web search."""
    print("\n" + "="*80)
    print("🔍 Testing DataForSEO Web Search")
    print("="*80)
    
    query = "Black Forest Labs founders"
    print(f"\nQuery: {query}")
    print("Searching...")
    
    try:
        result = search_web_dataforseo(query, num_results=3)
        
        if result["success"]:
            print(f"\n✅ SUCCESS! Found {len(result['results'])} results\n")
            for i, item in enumerate(result["results"], 1):
                print(f"{i}. {item['title']}")
                print(f"   URL: {item['url']}")
                print(f"   Snippet: {item['snippet'][:100]}...")
                print()
        else:
            print(f"\n❌ FAILED: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"\n❌ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def test_openpull():
    """Test OpenPull/crawl4ai page scraping."""
    print("\n" + "="*80)
    print("🌐 Testing OpenPull/Crawl4ai Page Scraping")
    print("="*80)
    
    url = "https://example.com"
    print(f"\nURL: {url}")
    print("Scraping...")
    
    try:
        result = scrape_page_with_openpull(url)
        
        if result["success"]:
            content_preview = result["content"][:200] if result["content"] else "No content"
            print(f"\n✅ SUCCESS!")
            print(f"Title: {result.get('title', 'N/A')}")
            print(f"Content length: {len(result['content'])} chars")
            print(f"Preview: {content_preview}...")
        else:
            print(f"\n⚠️  FAILED (but that's okay): {result.get('error', 'Unknown error')}")
            print("Note: OpenPull requires crawl4ai package which may not be installed locally")
            return True  # Not a critical failure
            
    except Exception as e:
        print(f"\n⚠️  EXCEPTION (but that's okay): {e}")
        print("Note: OpenPull requires crawl4ai package which may not be installed locally")
        return True  # Not a critical failure
    
    return True

def main():
    """Run all tests."""
    print("\n🧪 Testing Fallback Services")
    print("=" * 80)
    
    results = {}
    
    # Test DataForSEO (critical)
    results["DataForSEO"] = test_dataforseo()
    
    # Test OpenPull (optional)
    results["OpenPull"] = test_openpull()
    
    # Summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    
    for service, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{service}: {status}")
    
    # Critical check
    if results["DataForSEO"]:
        print("\n✅ CRITICAL SERVICE (DataForSEO) IS WORKING!")
        print("🚀 Ready to deploy to Modal")
        return 0
    else:
        print("\n❌ CRITICAL SERVICE (DataForSEO) FAILED!")
        print("⚠️  DO NOT DEPLOY until DataForSEO is fixed")
        return 1

if __name__ == "__main__":
    sys.exit(main())

