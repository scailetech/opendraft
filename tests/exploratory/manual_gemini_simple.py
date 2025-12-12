#!/usr/bin/env python3
"""
Simple test of Gemini Grounded to see actual API response.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from utils.api_citations.gemini_grounded import GeminiGroundedClient

def main():
    """Test with a single simple query."""
    print("=" * 80)
    print("GEMINI GROUNDED INDUSTRY QUERY TEST")
    print("=" * 80)

    # Industry query (same as draft)
    query = "McKinsey report AI pricing models"

    print(f"\n📝 Query: {query}\n")

    client = GeminiGroundedClient(
        validate_urls=False,  # Disable URL validation to prevent timeouts
        timeout=120
    )

    result = client.search_paper(query)

    print("\n" + "=" * 80)
    print("FINAL RESULT")
    print("=" * 80)

    if result:
        print(f"✅ SUCCESS")
        print(f"Title: {result.get('title')}")
        print(f"URL: {result.get('url')}")
    else:
        print(f"❌ FAILED - No result")

    client.close()

if __name__ == '__main__':
    main()
