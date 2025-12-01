#!/usr/bin/env python3
from utils.api_citations.orchestrator import CitationResearcher

print("Testing ALL 3 APIs in parallel...")
print("=" * 50)

researcher = CitationResearcher(
    enable_crossref=True, 
    enable_semantic_scholar=True, 
    enable_gemini_grounded=True, 
    verbose=True
)

# Test a few queries
topics = [
    "deep learning computer vision",
    "autonomous vehicles safety",
    "natural language processing transformers"
]

for topic in topics:
    print(f"\nQuery: {topic}")
    result = researcher.research_citation(topic)
    if result:
        # Citation is an object, use attributes
        src = getattr(result, 'source', 'Unknown')
        title = getattr(result, 'title', 'N/A')[:60] if getattr(result, 'title', None) else 'N/A'
        print(f"   Source: {src}")
        print(f"   Title: {title}...")
    else:
        print("   FAILED")
    print()

print("\n" + "=" * 50)
print("Test complete!")
