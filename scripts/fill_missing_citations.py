#!/usr/bin/env python3
"""
ABOUTME: Fill missing {cite_MISSING:...} placeholders with real citations using Gemini research
ABOUTME: Leverages existing Scout agent prompt and CrossRef API for production-grade citation research
"""

import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import google.generativeai as genai
from config import get_config
from utils.agent_runner import setup_model, load_prompt
from utils.citation_database import Citation, CitationDatabase
from utils.citations import get_citation_from_doi


def parse_missing_citations(thesis_file: Path) -> List[str]:
    """
    Parse all {cite_MISSING:...} placeholders from thesis.

    Args:
        thesis_file: Path to thesis markdown file

    Returns:
        List of unique missing citation topics
    """
    with open(thesis_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all {cite_MISSING:topic} patterns
    pattern = r'\{cite_MISSING:([^}]+)\}'
    matches = re.findall(pattern, content)

    # Remove duplicates while preserving order
    seen = set()
    unique_topics = []
    for topic in matches:
        topic = topic.strip()
        if topic and topic not in seen:
            seen.add(topic)
            unique_topics.append(topic)

    return unique_topics


def research_citation_with_gemini(
    topic: str,
    model: genai.GenerativeModel,
    verbose: bool = True
) -> Optional[Citation]:
    """
    Research a citation using Gemini with Scout agent prompt.

    Args:
        topic: Topic or title to research
        model: Configured Gemini model
        verbose: Whether to print progress

    Returns:
        Citation object if found, None otherwise
    """
    if verbose:
        print(f"\n🔍 Researching: {topic[:70]}{'...' if len(topic) > 70 else ''}")

    # Load Scout agent prompt
    scout_prompt = load_prompt("prompts/01_research/scout.md")

    # Build research request
    user_input = f"""# Research Task

Find the most relevant academic paper for this topic:

**Topic:** {topic}

## Requirements

1. Search for papers matching this topic
2. Find the single MOST relevant paper (highest quality, most cited, most recent)
3. Return ONLY ONE paper with complete metadata

## Output Format

Return a JSON object with this structure:

```json
{{
  "citation_id": "LastName_Year_FirstThreeWords",
  "authors": ["Author One", "Author Two"],
  "year": 2023,
  "title": "Complete Paper Title",
  "source_type": "journal|conference|book|report|article",
  "journal": "Journal Name (if journal article)",
  "conference": "Conference Name (if conference paper)",
  "doi": "10.xxxx/xxxxx (if available)",
  "url": "https://... (if available)",
  "pages": "1-10 (if available)",
  "volume": "5 (if available)",
  "publisher": "Publisher Name (if available)"
}}
```

## Important

- Return ONLY the JSON object, no markdown, no explanation
- Ensure all fields are present (use empty string "" if not available)
- year must be an integer
- authors must be a list (even if only one author)
- source_type must be one of: journal, conference, book, report, article
- If you cannot find a paper, return: {{"error": "No paper found"}}
"""

    try:
        # Call Gemini
        response = model.generate_content(
            [scout_prompt, user_input],
            generation_config=genai.GenerationConfig(
                temperature=0.2,  # Low temperature for factual research
                max_output_tokens=2048
            )
        )

        # Parse JSON response
        response_text = response.text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        data = json.loads(response_text)

        # Check for error
        if "error" in data:
            if verbose:
                print(f"  ✗ {data['error']}")
            return None

        # Create Citation object
        citation = Citation(
            citation_id=data.get("citation_id", ""),
            authors=data.get("authors", []),
            year=int(data.get("year", 0)),
            title=data.get("title", ""),
            source_type=data.get("source_type", "article"),
            language="english",
            journal=data.get("journal", ""),
            conference=data.get("conference", ""),
            doi=data.get("doi", ""),
            url=data.get("url", ""),
            pages=data.get("pages", ""),
            volume=data.get("volume", ""),
            publisher=data.get("publisher", "")
        )

        # Validate citation
        if not citation.authors or citation.year == 0 or not citation.title:
            if verbose:
                print(f"  ✗ Incomplete citation metadata")
            return None

        # Validate DOI with CrossRef if available
        if citation.doi:
            try:
                crossref_citation = get_citation_from_doi(citation.doi)
                if crossref_citation:
                    if verbose:
                        print(f"  ✓ DOI validated via CrossRef")
            except Exception:
                pass  # CrossRef validation is optional, continue silently

        if verbose:
            print(f"  ✓ Found: {citation.authors[0]} et al. ({citation.year})")
            print(f"    Title: {citation.title[:60]}{'...' if len(citation.title) > 60 else ''}")
            if citation.doi:
                print(f"    DOI: {citation.doi}")

        return citation

    except json.JSONDecodeError as e:
        if verbose:
            print(f"  ✗ Failed to parse JSON: {e}")
        return None
    except Exception as e:
        if verbose:
            print(f"  ✗ Research failed: {e}")
        return None


def batch_research_citations(
    topics: List[str],
    model: genai.GenerativeModel,
    verbose: bool = True
) -> Dict[str, Optional[Citation]]:
    """
    Research multiple citations in batch.

    Args:
        topics: List of topics to research
        model: Configured Gemini model
        verbose: Whether to print progress

    Returns:
        Dictionary mapping topic to Citation (or None if not found)
    """
    results = {}

    if verbose:
        print(f"\n{'='*80}")
        print(f"BATCH CITATION RESEARCH: {len(topics)} topics")
        print(f"{'='*80}")

    for i, topic in enumerate(topics, 1):
        if verbose:
            print(f"\n[{i}/{len(topics)}]", end=" ")

        citation = research_citation_with_gemini(topic, model, verbose=verbose)
        results[topic] = citation

    # Summary
    successful = sum(1 for c in results.values() if c is not None)
    failed = len(topics) - successful

    if verbose:
        print(f"\n{'='*80}")
        print(f"SUMMARY")
        print(f"{'='*80}")
        print(f"Total: {len(topics)}")
        print(f"✓ Successful: {successful} ({successful/len(topics)*100:.1f}%)")
        print(f"✗ Failed: {failed} ({failed/len(topics)*100:.1f}%)")
        print(f"{'='*80}\n")

    return results


def main():
    """Main entry point for citation filler."""
    print(f"{'='*80}")
    print(f"CITATION FILLER - Fill Missing Citations with Real Research")
    print(f"{'='*80}\n")

    # Get thesis file from command line or use default
    if len(sys.argv) > 1:
        thesis_file = Path(sys.argv[1])
    else:
        thesis_file = Path("tests/outputs/opensource_thesis/FINAL_THESIS.md")

    if not thesis_file.exists():
        print(f"❌ Thesis file not found: {thesis_file}")
        sys.exit(1)

    print(f"📄 Thesis: {thesis_file}")

    # Parse missing citations
    print(f"\n🔎 Parsing missing citations...")
    missing_topics = parse_missing_citations(thesis_file)
    print(f"   Found {len(missing_topics)} unique missing citations")

    if not missing_topics:
        print(f"   ✓ No missing citations found!")
        sys.exit(0)

    # Test mode: only research first 5
    test_mode = True
    if test_mode:
        print(f"\n⚠️  TEST MODE: Researching only first 5 citations")
        missing_topics = missing_topics[:5]

    # Setup Gemini model
    print(f"\n🤖 Initializing Gemini model...")
    config = get_config()
    model = setup_model()
    print(f"   ✓ Model ready: {config.model.model_name}")

    # Research citations
    results = batch_research_citations(missing_topics, model, verbose=True)

    # Save results to JSON for review
    output_file = thesis_file.parent / "researched_citations.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json_results = {}
        for topic, citation in results.items():
            if citation:
                json_results[topic] = {
                    "citation_id": citation.citation_id,
                    "authors": citation.authors,
                    "year": citation.year,
                    "title": citation.title,
                    "source_type": citation.source_type,
                    "journal": citation.journal,
                    "conference": citation.conference,
                    "doi": citation.doi,
                    "url": citation.url
                }
            else:
                json_results[topic] = None

        json.dump(json_results, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Results saved to: {output_file}")
    print(f"\nNext steps:")
    print(f"1. Review researched_citations.json to verify quality")
    print(f"2. Run with test_mode=False to research all {len(parse_missing_citations(thesis_file))} citations")
    print(f"3. Replace placeholders in thesis with real citations")


if __name__ == "__main__":
    main()
