#!/usr/bin/env python3
"""
Enrich incomplete citations in citation databases with missing publishers.

This script:
1. Loads all citation databases
2. Identifies citations with missing publishers
3. Attempts to look up missing metadata via APIs
4. Updates databases with enriched citations

Root Cause: Crossref/Semantic Scholar often return incomplete book metadata
Solution: Multi-source lookup (Crossref → Semantic Scholar → Gemini LLM)
"""

import sys
from pathlib import Path
from typing import List, Tuple

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.citation_database import load_citation_database, save_citation_database, Citation
from utils.api_citations import CitationResearcher
from utils.agent_runner import setup_model


def identify_incomplete_citations(citations: List[Citation]) -> List[Tuple[int, Citation]]:
    """
    Identify citations with missing publishers.

    Returns list of (index, citation) tuples for incomplete citations.
    """
    incomplete = []

    for i, cit in enumerate(citations):
        is_incomplete = False

        # Books should have publishers
        if cit.source_type == 'book' and not cit.publisher:
            is_incomplete = True

        # Reports/conferences might also need publishers
        if cit.source_type in ['report', 'conference'] and not cit.publisher and not cit.url:
            is_incomplete = True

        if is_incomplete:
            incomplete.append((i, cit))

    return incomplete


def enrich_citation(citation: Citation, researcher: CitationResearcher, verbose: bool = True) -> bool:
    """
    Attempt to enrich a citation with missing metadata.

    Returns True if enriched, False otherwise.
    """
    # Build search query from existing data
    query_parts = []
    if citation.authors:
        query_parts.append(citation.authors[0])
    query_parts.append(str(citation.year))
    query_parts.append(citation.title)

    search_query = " ".join(query_parts)

    if verbose:
        print(f"  🔍 Searching for: {search_query[:80]}...")

    # Research citation
    result = researcher.research_citation(search_query)

    if result:
        # Check if we found publisher info
        if result.publisher and not citation.publisher:
            if verbose:
                print(f"  ✅ Found publisher: {result.publisher}")
            citation.publisher = result.publisher
            return True
        else:
            if verbose:
                print(f"  ⚠️  Found citation but no publisher info")
            return False
    else:
        if verbose:
            print(f"  ❌ No results found")
        return False


def main():
    """Enrich all incomplete citations in all databases."""

    print("="*70)
    print("📚 CITATION ENRICHMENT - ADDING MISSING PUBLISHERS")
    print("="*70)
    print()

    # Initialize model and researcher
    print("🔧 Initializing API researcher...")
    model = setup_model()
    researcher = CitationResearcher(
        gemini_model=model,
        enable_crossref=True,
        enable_semantic_scholar=True,
        enable_gemini_grounded=False,  # Disable Gemini Grounded for metadata lookup
        enable_llm_fallback=True,
        verbose=False  # Will print our own messages
    )
    print()

    # Database paths
    project_root = Path(__file__).parent.parent
    databases = [
        {
            "name": "Open Source",
            "path": project_root / "tests/outputs/opensource_thesis/citation_database.json"
        },
        {
            "name": "AI Pricing",
            "path": project_root / "tests/outputs/ai_pricing_thesis/citation_database.json"
        },
        {
            "name": "CO2 German",
            "path": project_root / "tests/outputs/co2_thesis_german/citation_database.json"
        }
    ]

    total_enriched = 0
    total_incomplete = 0

    for db_info in databases:
        print("="*70)
        print(f"📖 {db_info['name']} Thesis")
        print("="*70)
        print()

        # Load database
        db = load_citation_database(db_info['path'])
        print(f"📊 Loaded {len(db.citations)} citations")

        # Identify incomplete citations
        incomplete = identify_incomplete_citations(db.citations)
        print(f"⚠️  Found {len(incomplete)} incomplete citations")
        total_incomplete += len(incomplete)

        if not incomplete:
            print("✅ All citations complete!")
            print()
            continue

        print()
        print("🔍 Attempting to enrich incomplete citations...")
        print()

        enriched_count = 0

        for idx, (i, citation) in enumerate(incomplete, 1):
            print(f"[{idx}/{len(incomplete)}] {citation.id}: {citation.title[:60]}...")

            if enrich_citation(citation, researcher, verbose=True):
                enriched_count += 1

            print()

        # Save updated database
        save_citation_database(db, db_info['path'])
        print(f"💾 Saved updated database")
        print(f"✅ Enriched {enriched_count}/{len(incomplete)} citations")
        print()

        total_enriched += enriched_count

    # Summary
    print("="*70)
    print("📊 ENRICHMENT SUMMARY")
    print("="*70)
    print()
    print(f"Total incomplete citations found: {total_incomplete}")
    print(f"Total enriched: {total_enriched}/{total_incomplete} ({total_enriched/max(1,total_incomplete)*100:.1f}%)")
    print()

    if total_enriched > 0:
        print("✅ SUCCESS: Citations have been enriched!")
        print()
        print("Next steps:")
        print("1. Review updated citation databases")
        print("2. Regenerate all 3 theses with enriched citations")
        print("3. Export fresh PDFs")
        return 0
    else:
        print("⚠️  No citations were enriched")
        print()
        print("This means:")
        print("- API sources don't have publisher data for these citations")
        print("- Manual enrichment may be required")
        print("- Citations will remain without publishers")
        return 1


if __name__ == "__main__":
    sys.exit(main())
