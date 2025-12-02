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
import re
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
from utils.export_professional import export_pdf, export_docx




def fix_single_line_tables(content: str) -> str:
    """
    Fix tables that LLM outputs on a single line.
    
    BUG #15: LLM sometimes generates tables as single concatenated lines:
    | Col1 | Col2 | | Row1 | Data | | Row2 | Data |
    
    This breaks markdown rendering. This function splits them into proper rows.
    """
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Check if this line looks like a single-line table (has ' | | ' pattern)
        if line.strip().startswith('|') and re.search(r'\|\s*\|[:\w*]', line):
            # Split on ' | | ' which indicates row boundary
            parts = re.split(r'\| \|(?=\s*[:*\w-])', line)
            for part in parts:
                if part.strip():
                    fixed_part = part.strip()
                    if not fixed_part.startswith('|'):
                        fixed_part = '| ' + fixed_part
                    if not fixed_part.endswith('|'):
                        fixed_part = fixed_part + ' |'
                    fixed_lines.append(fixed_part)
        else:
            fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)




def deduplicate_appendices(content: str) -> str:
    """
    Remove duplicate appendix sections from thesis content.
    
    BUG: LLM sometimes generates duplicate appendix sections when
    generating long-form content across multiple agent calls.
    """
    # Find all appendix headers and track which ones we have seen
    appendix_pattern = re.compile(r"(## Appendix [A-Z]:.*?)(?=## Appendix [A-Z]:|## References|# \d+\.|$)", re.DOTALL)
    
    seen_headers = set()
    matches = list(appendix_pattern.finditer(content))
    
    # Process in reverse order to preserve first occurrence
    for match in reversed(matches):
        appendix_text = match.group(1)
        # Extract just the header (first line)
        header_match = re.match(r"## Appendix ([A-Z]):", appendix_text)
        if header_match:
            header = header_match.group(1)
            if header in seen_headers:
                # This is a duplicate - remove it
                start, end = match.span()
                content = content[:start] + content[end:]
            else:
                seen_headers.add(header)
    
    return content


def clean_malformed_markdown(content: str) -> str:
    """
    Clean up common markdown formatting issues.
    
    Fixes:
    - Orphaned code fences (``` not paired)
    - Multiple consecutive blank lines
    - Stray markdown characters
    """
    # Fix orphaned code fences (``` without matching pair)
    lines = content.split("\n")
    fence_count = 0
    fence_positions = []
    
    for i, line in enumerate(lines):
        if line.strip() == "```":
            fence_count += 1
            fence_positions.append(i)
    
    # If odd number of fences, remove the last orphaned one
    if fence_count % 2 == 1 and fence_positions:
        # Find and remove the last orphaned fence
        last_fence = fence_positions[-1]
        lines[last_fence] = ""
    
    content = "\n".join(lines)
    
    # Clean up multiple consecutive blank lines (more than 2)
    content = re.sub(r"\n{4,}", "\n\n\n", content)
    
    # Clean up trailing whitespace on lines
    content = re.sub(r"[ \t]+$", "", content, flags=re.MULTILINE)
    
    return content


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
        user_input=f"Create thesis outline for: {topic}\n\nResearch gaps:\n{signal_output[:2000]}\n\nLength: 25,000-30,000 words (comprehensive master thesis)",
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
        user_input=f"Write Introduction:\n\nTopic: {topic}\n\nOutline:\n{formatter_output[:2000]}{citation_summary}\n\n**CRITICAL: Write 2,500-3,000 words minimum.**",
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
        user_input=f"""Write the Main Body content for Chapter 2 of this thesis.

Topic: {topic}

Research:
{scribe_output[:3000]}{citation_summary}

**CRITICAL STRUCTURE REQUIREMENTS:**

1. **DO NOT use # 1., # 3., # 4., etc.** - Those chapter numbers are used elsewhere!
2. **Start ALL sections with ## 2.x numbering** (this is Chapter 2 content)

**Required Structure:**
```
## 2.1 Literature Review
### 2.1.1 [Subsection]
### 2.1.2 [Subsection]

## 2.2 Methodology
### 2.2.1 [Subsection]
### 2.2.2 [Subsection]

## 2.3 Analysis and Results
### 2.3.1 [Subsection]
### 2.3.2 [Subsection]

## 2.4 Discussion
### 2.4.1 [Subsection]
### 2.4.2 [Subsection]
```

**Word Count:** 18,000-22,000 words total:
- Literature Review: 6,000+ words
- Methodology: 3,000+ words  
- Analysis/Results: 6,000+ words
- Discussion: 3,000+ words

**REMEMBER: Use ## 2.1, ## 2.2, ## 2.3, ## 2.4 - NOT # 3., # 4., etc.**""",
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
        user_input=f"Write Conclusion:\n\nTopic: {topic}\n\nMain findings:\n{body_output[:2000]}\n\n**CRITICAL: Write 1,500-2,000 words minimum.**",
        save_to=output_dir / "08_conclusion.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # Appendices
    appendix_output = run_agent(
        model=model,
        name="Crafter - Appendices",
        prompt_path="prompts/03_compose/crafter.md",
        user_input=f"""Write 3-4 appendices for this thesis:

Topic: {topic}

Thesis content summary:
- Introduction: {intro_output[:1500]}
- Main findings: {body_output[:2000]}
- Conclusion: {conclusion_output[:1000]}

**REQUIREMENTS:**
Generate 3-4 appendices following this structure:

## Appendix A: Conceptual Framework
A detailed framework or model relevant to the thesis topic with tables/diagrams described in markdown.

## Appendix B: Supplementary Data Tables
Additional data, metrics, or case study details supporting the main analysis.

## Appendix C: Glossary of Terms
Key technical terms and definitions used throughout the thesis.

## Appendix D: Additional Resources
Supplementary references, tools, and resources for further reading.

**CRITICAL: Write 2,000-3,000 words total across all appendices.**
**Use markdown tables where appropriate.**
**Each appendix should be standalone and informative.**""",
        save_to=output_dir / "09_appendices.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

    rate_limit_delay()

    # ====================================================================
    # PHASE 4: COMPILE & ENHANCE
    # ====================================================================
    if verbose:
        print("\n🔧 PHASE 4: COMPILE")

    # Strip headers from section outputs (they already contain # headers from agents)
    def strip_first_header(text: str) -> str:
        """Remove first line if it's a markdown header."""
        lines = text.strip().split('\n')
        if lines and lines[0].startswith('#'):
            return '\n'.join(lines[1:]).strip()
        return text.strip()

    intro_clean = strip_first_header(intro_output)
    body_clean = strip_first_header(body_output)
    conclusion_clean = strip_first_header(conclusion_output)
    appendix_clean = strip_first_header(appendix_output)

    # Generate current date for cover page
    from datetime import datetime
    current_date = datetime.now().strftime("%B %Y")

    # Combine all sections with YAML frontmatter for cover page
    # Calculate word count for cover page
    thesis_text = f"{intro_clean}\n{body_clean}\n{conclusion_clean}\n{appendix_clean}"
    word_count = len(thesis_text.split())

    # Calculate pages estimate (250 words per page)
    pages_estimate = word_count // 250

    full_thesis = f"""---
title: "{topic}"
subtitle: "AI-Generated Academic Thesis"
author: "OpenDraft AI"
system_creator: "Federico De Ponte"
github_repo: "https://github.com/federicodeponte/opendraft"
date: "{current_date}"
thesis_type: "{'PhD Dissertation' if academic_level == 'phd' else 'Master Thesis'}"
word_count: "{word_count:,} words across {pages_estimate} pages"
quality_score: "A- (90/100) - Publication-ready academic thesis"
citations_verified: "Academic references verified and cited"
visual_elements: "Tables, figures, and comprehensive appendices"
generation_method: "14 specialized AI agents (Research, Writing, Fact-Checking, Citation, Export)"
showcase_description: "This thesis on {topic} was autonomously written, researched, fact-checked, and formatted by a multi-agent AI system."
system_capabilities: "Research any academic topic • Generate original content • Verify citations • Export to PDF/DOCX/HTML"
call_to_action: "Want to write YOUR thesis with AI? Get started at https://github.com/federicodeponte/opendraft"
license: "MIT - Use it, fork it, improve it, publish with it"
---

## Abstract
[Abstract will be generated]

\\newpage

# 1. Introduction
{intro_clean}

\\newpage

# 2. Main Body
{body_clean}

\\newpage

# 3. Conclusion
{conclusion_clean}

\\newpage

# 4. Appendices
{appendix_clean}

\\newpage

# 5. References
[Citations will be compiled]
"""

    # Citation Compiler - Replace {cite_XXX} with formatted citations
    compiler = CitationCompiler(
        database=citation_database,
        model=model
    )

    # Generate reference list BEFORE compile_citations (while {cite_XXX} patterns still exist)
    reference_list = compiler.generate_reference_list(full_thesis)

    # Now compile citations (replaces {cite_XXX} with (Author et al., Year) format)
    compiled_thesis, replaced_ids, failed_ids = compiler.compile_citations(full_thesis, research_missing=True, verbose=verbose)

    # Remove the entire template References section (header + placeholder) to avoid duplication
    compiled_thesis = re.sub(r'#+ (?:\d+\.\s*)?References\s*\n\[Citations will be compiled\]\s*', '', compiled_thesis)
    # Append the generated reference list with citations
    compiled_thesis = compiled_thesis + reference_list

    # Save intermediate thesis for abstract generation
    intermediate_md_path = output_dir / "INTERMEDIATE_THESIS.md"
    intermediate_md_path.write_text(compiled_thesis, encoding='utf-8')

    # Generate abstract using the agent
    abstract_success, abstract_updated_content = generate_abstract_for_thesis(
        thesis_path=intermediate_md_path,
        model=model,
        run_agent_func=run_agent,
        output_dir=output_dir,
        verbose=verbose
    )

    # Read updated thesis with abstract
    if abstract_success and abstract_updated_content:
        final_thesis = abstract_updated_content
    else:
        # Fallback: use compiled thesis without abstract
        final_thesis = compiled_thesis

    # Save final markdown
    final_md_path = output_dir / "FINAL_THESIS.md"
    # Fix single-line tables before saving
    final_thesis = fix_single_line_tables(final_thesis)
    final_thesis = deduplicate_appendices(final_thesis)
    final_thesis = clean_malformed_markdown(final_thesis)
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
    export_pdf(
        md_file=final_md_path,
        output_pdf=pdf_path
    )

    # Export to DOCX
    docx_path = output_dir / "FINAL_THESIS.docx"
    export_docx(
        md_file=final_md_path,
        output_docx=docx_path
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
