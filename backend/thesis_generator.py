#!/usr/bin/env python3
"""
ABOUTME: Standalone thesis generation function for Modal.com automated processing
ABOUTME: Extracts core logic from test_academic_ai_thesis.py for production use

This module provides a simplified, production-ready thesis generation workflow
that can be called from Modal workers or other automated systems.
"""

import sys
import time
from pathlib import Path
from typing import Tuple, Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import google.generativeai as genai
from config import get_config
from tests.test_utils import setup_model, run_agent, rate_limit_delay, research_citations_via_api
from utils.citation_database import CitationDatabase, save_citation_database, load_citation_database
from utils.text_utils import smart_truncate
from utils.deduplicate_citations import deduplicate_citations
from utils.scrape_citation_titles import TitleScraper
from utils.scrape_citation_metadata import MetadataScraper
from utils.citation_quality_filter import CitationQualityFilter
from utils.citation_compiler import CitationCompiler
from utils.abstract_generator import generate_abstract_for_thesis
from utils.export import export_thesis_to_pdf, export_thesis_to_docx


def generate_thesis(
    topic: str,
    language: str = "en",
    academic_level: str = "master",
    output_dir: Optional[Path] = None,
    skip_validation: bool = True,
    verbose: bool = True
) -> Tuple[Path, Path]:
    """
    Generate a complete academic thesis using 15+ specialized AI agents.

    This is a simplified, production-ready version of the test workflow,
    optimized for automated processing on Modal.com or similar platforms.

    Args:
        topic: Thesis topic (e.g., "Machine Learning for Climate Prediction")
        language: Thesis language - 'en' or 'de' (English/German)
        academic_level: 'bachelor', 'master', or 'phd'
        output_dir: Custom output directory (default: config.paths.output_dir / "generated_thesis")
        skip_validation: Skip strict quality gates (recommended for automated runs)
        verbose: Print progress messages

    Returns:
        Tuple[Path, Path]: (pdf_path, docx_path) - Paths to generated thesis files

    Raises:
        ValueError: If insufficient citations found or generation fails
        Exception: If any critical step fails

    Example:
        >>> pdf, docx = generate_thesis(
        ...     topic="AI-Assisted Academic Writing",
        ...     language="en",
        ...     academic_level="master",
        ...     skip_validation=True
        ... )
        >>> print(f"Generated: {pdf} and {docx}")
    """
    config = get_config()

    if verbose:
        print("="*70)
        print("THESIS GENERATION - AUTOMATED WORKFLOW")
        print("="*70)
        print(f"Topic: {topic}")
        print(f"Language: {language}")
        print(f"Level: {academic_level}")
        print(f"Validation: {'Skipped' if skip_validation else 'Enabled'}")
        print("="*70)

    # Setup
    model = setup_model()
    if output_dir is None:
        output_dir = config.paths.output_dir / "generated_thesis"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Prepare research topics (simplified for automated runs)
    research_topics = [
        f"{topic} fundamentals and background",
        f"{topic} current state of research",
        f"{topic} methodology and approaches",
        f"{topic} applications and case studies",
        f"{topic} challenges and limitations",
        f"{topic} future directions and implications"
    ]

    # ====================================================================
    # PHASE 1: RESEARCH
    # ====================================================================
    if verbose:
        print("\n📚 PHASE 1: RESEARCH")

    try:
        scout_result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_dir / "01_scout.md",
            target_minimum=25,  # Minimum citations for automated runs
            verbose=verbose,
            use_deep_research=True,
            topic=topic,
            scope=topic
        )

        if verbose:
            print(f"✅ Scout: {scout_result['count']} citations found")

        scout_output = (output_dir / "01_scout.md").read_text(encoding='utf-8')

    except ValueError as e:
        raise ValueError(f"Insufficient citations for thesis generation: {str(e)}")

    rate_limit_delay()

    # Scribe - Summarize research
    scribe_output = run_agent(
        model=model,
        name="Scribe - Summarize Papers",
        prompt_path="prompts/01_research/scribe.md",
        user_input=f"Summarize these research findings:\n\n{smart_truncate(scout_output, max_chars=8000, preserve_json=True)}",
        save_to=output_dir / "02_scribe.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # Signal - Gap analysis
    signal_output = run_agent(
        model=model,
        name="Signal - Research Gaps",
        prompt_path="prompts/01_research/signal.md",
        user_input=f"Analyze research gaps:\n\n{smart_truncate(scribe_output, max_chars=8000)}",
        save_to=output_dir / "03_signal.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # ====================================================================
    # PHASE 2: STRUCTURE
    # ====================================================================
    if verbose:
        print("\n🏗️  PHASE 2: STRUCTURE")

    # Architect - Create outline
    architect_output = run_agent(
        model=model,
        name="Architect - Design Structure",
        prompt_path="prompts/02_structure/architect.md",
        user_input=f"Create thesis outline for: {topic}\n\nResearch gaps:\n{signal_output[:2000]}\n\nLength: 8,000-10,000 words",
        save_to=output_dir / "04_architect.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # Formatter - Apply style
    formatter_output = run_agent(
        model=model,
        name="Formatter - Apply Style",
        prompt_path="prompts/02_structure/formatter.md",
        user_input=f"Apply academic formatting:\n\n{architect_output[:2500]}\n\nStyle: APA 7th edition",
        save_to=output_dir / "05_formatter.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # ====================================================================
    # PHASE 2.5: CITATION MANAGEMENT
    # ====================================================================
    if verbose:
        print("\n📚 PHASE 2.5: CITATION MANAGEMENT")

    # Create citation database from Scout results
    scout_citations = scout_result['citations']
    for i, citation in enumerate(scout_citations, start=1):
        citation.id = f"cite_{i:03d}"

    citation_database = CitationDatabase(
        citations=scout_citations,
        citation_style="APA 7th",
        thesis_language="english" if language == "en" else "german"
    )

    # Deduplicate citations
    deduplicated_citations, dedup_stats = deduplicate_citations(
        citation_database.citations,
        strategy='keep_best',
        verbose=verbose
    )
    citation_database.citations = deduplicated_citations

    # Scrape titles and metadata for web sources
    title_scraper = TitleScraper(verbose=False)
    title_scraper.scrape_citations(citation_database.citations)

    metadata_scraper = MetadataScraper(verbose=False)
    metadata_scraper.scrape_citations(citation_database.citations)

    # Save citation database
    citation_db_path = output_dir / "citation_database.json"
    save_citation_database(citation_database, citation_db_path)

    # Quality filtering (auto-fix mode for automated runs)
    filter_obj = CitationQualityFilter(strict_mode=False)  # Non-strict for automation
    filter_obj.filter_database(citation_db_path, citation_db_path)

    # Reload filtered database
    citation_database = load_citation_database(citation_db_path)

    if verbose:
        print(f"✅ Citations: {len(citation_database.citations)} unique")

    # Prepare citation summary for writing agents
    citation_summary = f"\n\n## CITATION DATABASE\n\nYou have {len(citation_database.citations)} citations available.\n\n"
    citation_summary += "Available citations:\n"
    for citation in citation_database.citations[:30]:  # Show first 30
        authors_str = ", ".join(citation.authors[:2])
        if len(citation.authors) > 2:
            authors_str += " et al."
        citation_summary += f"- {citation.id}: {authors_str} ({citation.year})\n"

    rate_limit_delay()

    # ====================================================================
    # PHASE 3: COMPOSE (Simplified - 3 sections instead of 6)
    # ====================================================================
    if verbose:
        print("\n✍️  PHASE 3: COMPOSE")

    # Introduction
    intro_output = run_agent(
        model=model,
        name="Crafter - Introduction",
        prompt_path="prompts/03_compose/crafter.md",
        user_input=f"Write Introduction:\n\nTopic: {topic}\n\nOutline:\n{formatter_output[:2000]}{citation_summary}",
        save_to=output_dir / "06_introduction.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # Main Body (Literature + Methods + Analysis combined)
    body_output = run_agent(
        model=model,
        name="Crafter - Main Body",
        prompt_path="prompts/03_compose/crafter.md",
        user_input=f"Write main body (Literature Review, Methods, Analysis):\n\nTopic: {topic}\n\nResearch:\n{scribe_output[:3000]}{citation_summary}",
        save_to=output_dir / "07_main_body.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # Conclusion
    conclusion_output = run_agent(
        model=model,
        name="Crafter - Conclusion",
        prompt_path="prompts/03_compose/crafter.md",
        user_input=f"Write Conclusion:\n\nTopic: {topic}\n\nMain findings:\n{body_output[:2000]}",
        save_to=output_dir / "08_conclusion.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # ====================================================================
    # PHASE 4: COMPILE & ENHANCE
    # ====================================================================
    if verbose:
        print("\n🔧 PHASE 4: COMPILE")

    # Combine all sections
    full_thesis = f"""# {topic}

## Abstract
[Abstract will be generated]

## Introduction
{intro_output}

## Main Body
{body_output}

## Conclusion
{conclusion_output}

## References
[Citations will be compiled]
"""

    # Citation Compiler - Replace {cite_XXX} with formatted citations
    compiler = CitationCompiler(
        citation_database=citation_database,
        citation_style="APA 7th"
    )
    compiled_thesis, compile_stats = compiler.compile_thesis(full_thesis)

    # Generate abstract
    abstract = generate_abstract_for_thesis(
        thesis_markdown=compiled_thesis,
        model=model,
        max_words=300
    )

    # Insert abstract
    final_thesis = compiled_thesis.replace("[Abstract will be generated]", abstract)

    # Save final markdown
    final_md_path = output_dir / "FINAL_THESIS.md"
    final_md_path.write_text(final_thesis, encoding='utf-8')

    if verbose:
        print(f"✅ Thesis compiled: {len(final_thesis):,} characters")

    # ====================================================================
    # PHASE 5: EXPORT
    # ====================================================================
    if verbose:
        print("\n📄 PHASE 5: EXPORT")

    # Export to PDF
    pdf_path = output_dir / "FINAL_THESIS.pdf"
    export_thesis_to_pdf(
        markdown_path=final_md_path,
        output_path=pdf_path,
        title=topic,
        author="OpenDraft AI"
    )

    # Export to DOCX
    docx_path = output_dir / "FINAL_THESIS.docx"
    export_thesis_to_docx(
        markdown_path=final_md_path,
        output_path=docx_path,
        title=topic,
        author="OpenDraft AI"
    )

    if verbose:
        print(f"✅ Exported PDF: {pdf_path}")
        print(f"✅ Exported DOCX: {docx_path}")
        print("="*70)
        print("✅ THESIS GENERATION COMPLETE")
        print("="*70)

    return pdf_path, docx_path


if __name__ == "__main__":
    # Test locally
    import argparse

    parser = argparse.ArgumentParser(description="Generate academic thesis")
    parser.add_argument("topic", help="Thesis topic")
    parser.add_argument("--language", default="en", choices=["en", "de"], help="Language")
    parser.add_argument("--level", default="master", choices=["bachelor", "master", "phd"], help="Academic level")
    parser.add_argument("--validate", action="store_true", help="Enable strict validation")

    args = parser.parse_args()

    pdf, docx = generate_thesis(
        topic=args.topic,
        language=args.language,
        academic_level=args.level,
        skip_validation=not args.validate
    )

    print(f"\n✅ Generated:")
    print(f"   PDF: {pdf}")
    print(f"   DOCX: {docx}")
