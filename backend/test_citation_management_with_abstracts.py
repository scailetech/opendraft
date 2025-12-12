#!/usr/bin/env python3
"""
Test Phase 2.5: Citation Management with abstracts.
Verify that abstracts are preserved through deduplication, scraping, and filtering.
"""
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.citation_database import CitationDatabase, save_citation_database, load_citation_database
from utils.deduplicate_citations import deduplicate_citations
from utils.scrape_citation_titles import TitleScraper
from utils.scrape_citation_metadata import MetadataScraper
from utils.citation_quality_filter import CitationQualityFilter

print("="*80)
print("PHASE 2.5: CITATION MANAGEMENT - WITH ABSTRACTS")
print("="*80)
print()

# Load citations from research phase test
# We'll use the test that collected 55 citations with 35 abstracts
output_dir = Path("tests/outputs/citation_management_test")
output_dir.mkdir(parents=True, exist_ok=True)

# For this test, we need to load citations from a previous test
# Let's create a mock citation database with abstracts for testing
from utils.citation_database import Citation

# Create sample citations with and without abstracts
citations = [
    Citation(
        citation_id="cite_001",
        authors=["Wang", "Sun", "Xue"],
        year=2025,
        title="Artificial Intelligence Applications to Personalized Dietary Recommendations",
        source_type="journal",
        doi="10.3390/healthcare13121417",
        url="https://doi.org/10.3390/healthcare13121417",
        api_source="Semantic Scholar",
        abstract="This systematic review investigates the effectiveness of artificial intelligence (AI)-generated dietary interventions in improving clinical outcomes among adults, particularly for managing chronic conditions like diabetes and irritable bowel syndrome (IBS)."
    ),
    Citation(
        citation_id="cite_002",
        authors=["Biscoito"],
        year=2021,
        title="Current Applications of Precision Medicine in Stroke",
        source_type="book",
        doi="10.1007/978-3-030-70761-3_6",
        url="https://doi.org/10.1007/978-3-030-70761-3_6",
        api_source="Crossref",
        abstract=None  # No abstract
    ),
    Citation(
        citation_id="cite_003",
        authors=["NIH"],
        year=2023,
        title="Precision Medicine, AI, and the Future of Personalized Health",
        source_type="website",
        doi=None,
        url="https://pmc.ncbi.nlm.nih.gov/articles/PMC7877825/",
        api_source="Gemini Grounded",
        abstract="by KB Johnson · 2020 · Cited by 1811 — AI leverages sophisticated computation and inference to generate insights, enables the system to reason and learn..."
    ),
]

print(f"📚 Starting with {len(citations)} citations")
print(f"   Citations with abstracts: {sum(1 for c in citations if c.abstract)}/{len(citations)}")
print()

# Create citation database
citation_database = CitationDatabase(
    citations=citations,
    citation_style="APA 7th",
    thesis_language="english"
)

print("🔄 Step 1: Deduplication")
start_time = time.time()
deduplicated_citations, dedup_stats = deduplicate_citations(
    citation_database.citations,
    strategy='keep_best',
    verbose=True
)
dedup_time = time.time() - start_time
citation_database.citations = deduplicated_citations

abstracts_after_dedup = sum(1 for c in citation_database.citations if hasattr(c, 'abstract') and c.abstract)
print(f"   ⏱️  Time: {dedup_time:.1f}s")
print(f"   ✅ Citations after dedup: {len(citation_database.citations)}")
print(f"   📝 Abstracts preserved: {abstracts_after_dedup}/{len(citation_database.citations)}")
print()

print("🔄 Step 2: Title Scraping")
start_time = time.time()
title_scraper = TitleScraper(verbose=False)
title_scraper.scrape_citations(citation_database.citations)
title_time = time.time() - start_time

abstracts_after_title = sum(1 for c in citation_database.citations if hasattr(c, 'abstract') and c.abstract)
print(f"   ⏱️  Time: {title_time:.1f}s")
print(f"   📝 Abstracts preserved: {abstracts_after_title}/{len(citation_database.citations)}")
print()

print("🔄 Step 3: Metadata Scraping")
start_time = time.time()
metadata_scraper = MetadataScraper(verbose=False)
metadata_scraper.scrape_citations(citation_database.citations)
metadata_time = time.time() - start_time

abstracts_after_metadata = sum(1 for c in citation_database.citations if hasattr(c, 'abstract') and c.abstract)
print(f"   ⏱️  Time: {metadata_time:.1f}s")
print(f"   📝 Abstracts preserved: {abstracts_after_metadata}/{len(citation_database.citations)}")
print()

print("🔄 Step 4: Save & Load (JSON serialization)")
start_time = time.time()
citation_db_path = output_dir / "bibliography.json"
save_citation_database(citation_database, citation_db_path)
citation_database_reloaded = load_citation_database(citation_db_path)
save_time = time.time() - start_time

abstracts_after_save = sum(1 for c in citation_database_reloaded.citations if hasattr(c, 'abstract') and c.abstract)
print(f"   ⏱️  Time: {save_time:.1f}s")
print(f"   📝 Abstracts preserved: {abstracts_after_save}/{len(citation_database_reloaded.citations)}")
print()

print("🔄 Step 5: Quality Filtering")
start_time = time.time()
filter_obj = CitationQualityFilter(strict_mode=False)
filter_obj.filter_database(citation_db_path, citation_db_path)
citation_database_filtered = load_citation_database(citation_db_path)
filter_time = time.time() - start_time

abstracts_after_filter = sum(1 for c in citation_database_filtered.citations if hasattr(c, 'abstract') and c.abstract)
print(f"   ⏱️  Time: {filter_time:.1f}s")
print(f"   ✅ Citations after filter: {len(citation_database_filtered.citations)}")
print(f"   📝 Abstracts preserved: {abstracts_after_filter}/{len(citation_database_filtered.citations)}")
print()

# Final verification
print("="*80)
print("FINAL VERIFICATION")
print("="*80)
print()

total_time = dedup_time + title_time + metadata_time + save_time + filter_time
print(f"⏱️  Total time: {total_time:.1f}s")
print(f"📊 Citation flow:")
print(f"   Start: {len(citations)} citations, {sum(1 for c in citations if c.abstract)} with abstracts")
print(f"   End: {len(citation_database_filtered.citations)} citations, {abstracts_after_filter} with abstracts")
print()

# Check one citation has abstract
if citation_database_filtered.citations:
    for citation in citation_database_filtered.citations:
        if hasattr(citation, 'abstract') and citation.abstract:
            print(f"📖 Sample citation with abstract:")
            print(f"   Title: {citation.title[:80]}...")
            print(f"   Authors: {', '.join(citation.authors)}")
            print(f"   Year: {citation.year}")
            print(f"   Source: {citation.api_source}")
            print(f"   Abstract: {citation.abstract[:200]}...")
            break

if abstracts_after_filter == sum(1 for c in citations if c.abstract):
    print(f"\n✅ SUCCESS: All abstracts preserved through citation management pipeline!")
else:
    print(f"\n⚠️  WARNING: Some abstracts were lost in processing")

print("="*80)
