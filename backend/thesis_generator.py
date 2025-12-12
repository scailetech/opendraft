#!/usr/bin/env python3
"""
ABOUTME: Standalone thesis generation function for Modal.com automated processing
ABOUTME: Extracts core logic from test_academic_ai_thesis.py for production use

This module provides a simplified, production-ready thesis generation workflow
that can be called from Modal workers or other automated systems.

Output Structure:
    thesis_output/
    ├── research/           # All research materials
    │   ├── papers/         # Individual paper summaries
    │   ├── combined_research.md
    │   ├── research_gaps.md
    │   └── bibliography.json
    ├── drafts/             # Section drafts
    ├── tools/              # Refinement prompts for Cursor
    └── exports/            # Final outputs (PDF, DOCX, MD)
"""

import sys
import time
import shutil
import json
from pathlib import Path
import re
import logging
import traceback
import psutil
import os
from typing import Tuple, Optional, List, Dict
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import google.generativeai as genai
from config import get_config

# Configure comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)-30s | %(levelname)-8s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def log_memory_usage(context=""):
    """Log current memory usage"""
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    mem_mb = mem_info.rss / 1024 / 1024
    logger.info(f"[MEMORY] {context}: {mem_mb:.1f} MB RSS")
    return mem_mb

def log_timing(func):
    """Decorator to log function execution time"""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        func_name = func.__name__
        logger.info(f"[START] {func_name}")
        log_memory_usage(f"Before {func_name}")
        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            logger.info(f"[COMPLETE] {func_name} in {elapsed:.1f}s")
            log_memory_usage(f"After {func_name}")
            return result
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"[FAILED] {func_name} after {elapsed:.1f}s: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise
    return wrapper
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


def setup_output_folders(output_dir: Path) -> Dict[str, Path]:
    """
    Create the organized folder structure for thesis output.
    
    Returns dict with paths to all subdirectories.
    """
    folders = {
        'root': output_dir,
        'research': output_dir / 'research',
        'papers': output_dir / 'research' / 'papers',
        'drafts': output_dir / 'drafts',
        'tools': output_dir / 'tools',
        'exports': output_dir / 'exports',
    }
    
    for folder in folders.values():
        folder.mkdir(parents=True, exist_ok=True)
    
    return folders


def slugify(text: str, max_length: int = 30) -> str:
    """Convert text to a safe filename slug."""
    # Remove special characters, lowercase, replace spaces with underscores
    slug = re.sub(r'[^\w\s-]', '', text.lower())
    slug = re.sub(r'[\s_]+', '_', slug).strip('_')
    return slug[:max_length]


def split_scribe_to_papers(scribe_output: str, papers_dir: Path, verbose: bool = True) -> List[Path]:
    """
    Split the combined scribe output into individual paper files.
    
    Parses the scribe markdown to find paper sections and saves each
    as a separate file in papers_dir.
    
    Returns list of created file paths.
    """
    created_files = []
    
    # Pattern to match paper sections in scribe output
    # Matches "## Paper N: Title" or "## N. Title" patterns
    paper_pattern = re.compile(
        r'^##\s*(?:Paper\s*)?(\d+)[:.]\s*(.+?)$',
        re.MULTILINE
    )
    
    # Find all paper sections
    matches = list(paper_pattern.finditer(scribe_output))
    
    if not matches:
        # Try alternative pattern for different scribe output formats
        alt_pattern = re.compile(
            r'^##\s+(.+?)$\n\*\*Authors?:\*\*\s*(.+?)$',
            re.MULTILINE
        )
        matches = list(alt_pattern.finditer(scribe_output))
        
        if not matches:
            # If no papers found, save entire output as combined file
            if verbose:
                print("   ⚠️  Could not split scribe output into papers")
            return created_files
    
    # Extract each paper section
    for i, match in enumerate(matches):
        start = match.start()
        # End is either start of next paper or end of document
        end = matches[i + 1].start() if i + 1 < len(matches) else len(scribe_output)
        
        paper_content = scribe_output[start:end].strip()
        
        # Extract metadata for filename
        try:
            paper_num = match.group(1) if match.lastindex >= 1 else str(i + 1)
            title = match.group(2) if match.lastindex >= 2 else f"paper_{i+1}"
        except:
            paper_num = str(i + 1)
            title = f"paper_{i+1}"
        
        # Try to extract author and year from content
        author_match = re.search(r'\*\*Authors?:\*\*\s*([^*\n]+)', paper_content)
        year_match = re.search(r'\*\*Year:\*\*\s*(\d{4})', paper_content)
        
        author = slugify(author_match.group(1).split(',')[0] if author_match else 'unknown', 15)
        year = year_match.group(1) if year_match else 'na'
        title_slug = slugify(title, 40)
        
        # Create filename: paper_001_author_year_title.md
        filename = f"paper_{int(paper_num):03d}_{author}_{year}_{title_slug}.md"
        file_path = papers_dir / filename
        
        # Write paper file
        file_path.write_text(paper_content, encoding='utf-8')
        created_files.append(file_path)
    
    if verbose and created_files:
        print(f"   ✅ Split into {len(created_files)} individual paper files")
    
    return created_files


def copy_tools_to_output(tools_dir: Path, topic: str, academic_level: str, verbose: bool = True):
    """
    Copy refinement prompts and create .cursorrules for the output folder.
    """
    project_root = Path(__file__).parent.parent
    
    # Copy humanizer prompt (voice.md)
    voice_src = project_root / 'prompts' / '05_refine' / 'voice.md'
    if voice_src.exists():
        shutil.copy(voice_src, tools_dir / 'humanizer_prompt.md')
    
    # Copy entropy prompt
    entropy_src = project_root / 'prompts' / '05_refine' / 'entropy.md'
    if entropy_src.exists():
        shutil.copy(entropy_src, tools_dir / 'entropy_prompt.md')
    
    # Copy style guide from templates
    style_src = project_root / 'templates' / 'style_guide.md'
    if style_src.exists():
        shutil.copy(style_src, tools_dir / 'style_guide.md')
    
    # Create .cursorrules with topic-specific content
    cursorrules_template = project_root / 'templates' / 'cursorrules.md'
    if cursorrules_template.exists():
        content = cursorrules_template.read_text(encoding='utf-8')
        content = content.replace('{topic}', topic)
        content = content.replace('{academic_level}', academic_level)
        (tools_dir / '.cursorrules').write_text(content, encoding='utf-8')
    
    if verbose:
        print("   ✅ Copied refinement tools to output")


def create_output_readme(output_dir: Path, topic: str, verbose: bool = True):
    """Create README.md for the output folder."""
    project_root = Path(__file__).parent.parent
    readme_template = project_root / 'templates' / 'thesis_readme.md'
    
    if readme_template.exists():
        shutil.copy(readme_template, output_dir / 'README.md')
        if verbose:
            print("   ✅ Created README.md")




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
    verbose: bool = True,
    tracker=None,  # Progress tracker for real-time updates
    streamer=None,  # Milestone streamer for partial results
    # Academic metadata for professional cover page
    author_name: Optional[str] = None,
    institution: Optional[str] = None,
    department: Optional[str] = None,
    faculty: Optional[str] = None,
    advisor: Optional[str] = None,
    second_examiner: Optional[str] = None,
    location: Optional[str] = None,
    student_id: Optional[str] = None,
) -> Tuple[Path, Path]:
    """
    Generate a complete academic thesis using 19 specialized AI agents.

    This is a simplified, production-ready version of the test workflow,
    optimized for automated processing on Modal.com or similar platforms.

    Args:
        topic: Thesis topic (e.g., "Machine Learning for Climate Prediction")
        language: Thesis language - 'en' or 'de' (English/German)
        academic_level: 'bachelor', 'master', or 'phd'
        output_dir: Custom output directory (default: config.paths.output_dir / "generated_thesis")
        skip_validation: Skip strict quality gates (recommended for automated runs)
        verbose: Print progress messages
        author_name: Student's full name (for cover page)
        institution: University/institution name
        department: Department name
        faculty: Faculty name
        advisor: First examiner/advisor name
        second_examiner: Second examiner name
        location: City/location for date line
        student_id: Student matriculation number

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
        ...     author_name="John Smith",
        ...     institution="MIT",
        ...     skip_validation=True
        ... )
        >>> print(f"Generated: {pdf} and {docx}")
    """
    # ====================================================================
    # STARTUP AND INITIALIZATION
    # ====================================================================
    thesis_start_time = time.time()
    logger.info("="*80)
    logger.info("THESIS GENERATION STARTED")
    logger.info("="*80)
    logger.info(f"Topic: {topic}")
    logger.info(f"Language: {language}")
    logger.info(f"Academic Level: {academic_level}")
    logger.info(f"Validation: {'Skipped' if skip_validation else 'Enabled'}")
    logger.info(f"Tracker: {'Enabled' if tracker else 'Disabled'}")
    logger.info(f"Streamer: {'Enabled' if streamer else 'Disabled'}")
    if author_name:
        logger.info(f"Author: {author_name}")
    if institution:
        logger.info(f"Institution: {institution}")
    logger.info(f"Process PID: {os.getpid()}")
    logger.info(f"Python: {sys.version}")
    log_memory_usage("Initial")
    logger.info("="*80)

    try:
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
        logger.info("[SETUP] Initializing Gemini model...")
        model = setup_model()
        logger.info("[SETUP] Model initialized successfully")

        if output_dir is None:
            output_dir = config.paths.output_dir / "generated_thesis"

        logger.info(f"[SETUP] Output directory: {output_dir}")

        # Create organized folder structure
        logger.info("[SETUP] Creating folder structure...")
        folders = setup_output_folders(output_dir)
        logger.info(f"[SETUP] Created folders: {', '.join(folders.keys())}")

        if verbose:
            print(f"📁 Output folder: {output_dir}")

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

        if tracker:
            tracker.update_phase("research", progress_percent=5, details={"stage": "starting_research"})

        try:
            scout_result = research_citations_via_api(
                model=model,
                research_topics=research_topics,
                output_path=folders['research'] / "scout_raw.md",
                target_minimum=15,  # Minimum citations for automated runs (lowered to avoid citation compilation delays)
                verbose=verbose,
                use_deep_research=True,
                topic=topic,
                scope=topic
            )

            if verbose:
                print(f"✅ Scout: {scout_result['count']} citations found")
        
            if tracker:
                tracker.update_research(sources_count=scout_result['count'], phase_detail="Scout completed")

            scout_output = (folders['research'] / "scout_raw.md").read_text(encoding='utf-8')

        except ValueError as e:
            raise ValueError(f"Insufficient citations for thesis generation: {str(e)}")

        rate_limit_delay()

        # Scribe - Summarize research
        scribe_output = run_agent(
            model=model,
            name="Scribe - Summarize Papers",
            prompt_path="prompts/01_research/scribe.md",
            user_input=f"Summarize these research findings:\n\n{smart_truncate(scout_output, max_chars=8000, preserve_json=True)}",
            save_to=folders['research'] / "combined_research.md",
            skip_validation=skip_validation,
            verbose=verbose
        )

        # Split scribe output into individual paper files
        split_scribe_to_papers(scribe_output, folders['papers'], verbose=verbose)

        rate_limit_delay()

        # Signal - Gap analysis
        signal_output = run_agent(
            model=model,
            name="Signal - Research Gaps",
            prompt_path="prompts/01_research/signal.md",
            user_input=f"Analyze research gaps:\n\n{smart_truncate(scribe_output, max_chars=8000)}",
            save_to=folders['research'] / "research_gaps.md",
            skip_validation=skip_validation,
            verbose=verbose
        )

        rate_limit_delay()

        # ====================================================================
        # PHASE 2: STRUCTURE
        # ====================================================================
        if verbose:
            print("\n🏗️  PHASE 2: STRUCTURE")
    
        if tracker:
            tracker.update_phase("structure", progress_percent=25, details={"stage": "creating_outline"})

        # Architect - Create outline
        architect_output = run_agent(
            model=model,
            name="Architect - Design Structure",
            prompt_path="prompts/02_structure/architect.md",
            user_input=f"Create thesis outline for: {topic}\n\nResearch gaps:\n{signal_output[:2000]}\n\nLength: 25,000-30,000 words (comprehensive master thesis)",
            save_to=folders['drafts'] / "00_outline.md",
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
            save_to=folders['drafts'] / "00_formatted_outline.md",
            skip_validation=skip_validation,
            verbose=verbose
        )
    
        # MILESTONE: Outline Complete - Stream to user
        if streamer:
            # Count chapters from outline
            chapters_count = formatter_output.count('## Chapter') + formatter_output.count('# Chapter')
            streamer.stream_outline_complete(
                outline_path=folders['drafts'] / "00_formatted_outline.md",
                chapters_count=chapters_count if chapters_count > 0 else 5  # Default to 5 if can't parse
            )
    
        # Update progress with outline milestone
        if tracker:
            tracker.update_phase("structure", progress_percent=30, details={"stage": "outline_complete", "milestone": "outline_complete"})

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

        # Save citation database to research folder
        citation_db_path = folders['research'] / "bibliography.json"
        save_citation_database(citation_database, citation_db_path)

        # Quality filtering (auto-fix mode for automated runs)
        filter_obj = CitationQualityFilter(strict_mode=False)  # Non-strict for automation
        filter_obj.filter_database(citation_db_path, citation_db_path)

        # Reload filtered database
        citation_database = load_citation_database(citation_db_path)

        if verbose:
            print(f"✅ Citations: {len(citation_database.citations)} unique")
    
        # MILESTONE: Research Complete - Stream to user
        if streamer:
            streamer.stream_research_complete(
                sources_count=len(citation_database.citations),
                bibliography_path=citation_db_path
            )
    
        # Update progress with specific detail
        if tracker:
            tracker.update_phase("structure", progress_percent=23, sources_count=len(citation_database.citations), details={"stage": "research_complete", "milestone": "research_complete"})

        # Prepare comprehensive citation database for writing agents
        citation_summary = f"\n\n{'='*80}\n## CITATION DATABASE - {len(citation_database.citations)} CITATIONS AVAILABLE\n{'='*80}\n\n"
        citation_summary += "⚠️  **CRITICAL CITATION RESTRICTION** ⚠️\n\n"
        citation_summary += "You MUST ONLY cite papers from this database. DO NOT:\n"
        citation_summary += "- Cite papers from your training data\n"
        citation_summary += "- Invent or hallucinate citations\n"
        citation_summary += "- Reference papers not listed below\n"
        citation_summary += "- Use author names not in this database\n\n"
        citation_summary += "Citation format: Use {{cite_XXX}} where XXX is the citation ID shown below.\n"
        citation_summary += f"\n{'='*80}\n\n"

        # Include ALL citations with comprehensive details
        for i, citation in enumerate(citation_database.citations, 1):
            authors_str = ", ".join(citation.authors[:3])
            if len(citation.authors) > 3:
                authors_str += " et al."

            citation_summary += f"{i}. **[{citation.id}]** {authors_str} ({citation.year})\n"
            citation_summary += f"   Title: {citation.title}\n"

            if citation.doi:
                citation_summary += f"   DOI: {citation.doi}\n"
            if citation.journal:
                citation_summary += f"   Journal: {citation.journal}\n"
            if citation.abstract:
                # First 300 chars of abstract
                abstract_preview = citation.abstract[:300]
                if len(citation.abstract) > 300:
                    abstract_preview += "..."
                citation_summary += f"   Abstract: {abstract_preview}\n"

            citation_summary += f"   Citation format: {{{{cite_{citation.id}}}}}\n\n"

        citation_summary += f"\n{'='*80}\n"
        citation_summary += f"Total citations available: {len(citation_database.citations)}\n"
        citation_summary += "Remember: ONLY cite from this list. No external citations allowed.\n"
        citation_summary += f"{'='*80}\n"

        rate_limit_delay()

        # ====================================================================
        # PHASE 3: COMPOSE (Simplified - 3 sections instead of 6)
        # ====================================================================
        logger.info("="*80)
        logger.info("PHASE 3: COMPOSE - Writing chapters")
        logger.info("="*80)
        log_memory_usage("Before PHASE 3")

        if verbose:
            print("\n✍️  PHASE 3: COMPOSE")

        if tracker:
            tracker.update_phase("writing", progress_percent=35, chapters_count=0, details={"stage": "starting_composition"})

        # ===== CHAPTER 1: Introduction =====
        try:
            logger.info("[CHAPTER 1/4] Starting Introduction")
            logger.info(f"  Target: 2,500-3,000 words")
            logger.info(f"  Output: {folders['drafts'] / '01_introduction.md'}")
            chapter_start = time.time()
            log_memory_usage("Before Chapter 1")

            intro_output = run_agent(
                model=model,
                name="Crafter - Introduction",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write Introduction:

Topic: {topic}

Outline:
{formatter_output[:2000]}{citation_summary}

**CRITICAL REQUIREMENTS:**
1. Write 2,500-3,000 words minimum
2. Include at least 1-2 tables (if relevant)
3. **Table constraints**: Maximum 300 chars per cell, maximum 5 columns
4. Put table details in prose paragraphs AFTER tables, not inside cells""",
                save_to=folders['drafts'] / "01_introduction.md",
                skip_validation=skip_validation,
                verbose=verbose
            )

            chapter_time = time.time() - chapter_start
            chapter_file = folders['drafts'] / "01_introduction.md"
            chapter_size = chapter_file.stat().st_size if chapter_file.exists() else 0
            logger.info(f"[CHAPTER 1/4] ✅ Complete in {chapter_time:.1f}s")
            logger.info(f"  File size: {chapter_size:,} bytes ({chapter_size/1024:.1f} KB)")
            log_memory_usage("After Chapter 1")

        except Exception as e:
            logger.error(f"[CHAPTER 1/4] ❌ FAILED: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            if tracker:
                tracker.mark_failed(f"Chapter 1 failed: {e}")
            raise
    
        # MILESTONE: Introduction Complete - Stream to user
        if streamer:
            streamer.stream_chapter_complete(
                chapter_num=1,
                chapter_name="Introduction",
                chapter_path=folders['drafts'] / "01_introduction.md"
            )
    
        # Update progress  
        if tracker:
            tracker.update_phase("writing", progress_percent=40, chapters_count=1, details={"stage": "introduction_complete", "milestone": "introduction_complete"})

        rate_limit_delay()

        # ===== CHAPTER 2: Main Body (SPLIT INTO 4 SECTIONS FOR QUALITY) =====
        logger.info("="*80)
        logger.info("[CHAPTER 2/4] Starting Main Body - Split into 4 focused sections")
        logger.info("  2.1 Literature Review → 2.2 Methodology → 2.3 Results → 2.4 Discussion")
        logger.info(f"  Total target: 18,000-22,000 words across 4 sections")
        logger.info("="*80)
        main_body_start = time.time()
        log_memory_usage("Before Chapter 2 (Main Body)")

        # ===== Section 2.1: Literature Review =====
        try:
            logger.info("[SECTION 2.1/4] Starting Literature Review")
            logger.info(f"  Target: 6,000-7,000 words")
            logger.info(f"  Output: {folders['drafts'] / '02_1_literature_review.md'}")
            section_start = time.time()

            lit_review_output = run_agent(
                model=model,
                name="Crafter - Literature Review",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write section 2.1 Literature Review for this thesis.

Topic: {topic}

Research summaries and abstracts:
{scribe_output[:3000]}

{citation_summary}

Outline context:
{formatter_output[:2000]}

**CRITICAL REQUIREMENTS:**

1. **Section numbering:** Start with ## 2.1 Literature Review
2. **Subsections:** Use ### 2.1.1, ### 2.1.2, etc. (at least 3 subsections)
3. **Word count:** 6,000-7,000 words minimum
4. **Tables:** Include at least 1-2 comparison tables (e.g., Author vs. Findings)
   - **Maximum 300 characters per cell** - keep cells concise!
   - **Maximum 5 columns** per table
   - Put details in prose AFTER the table, not inside cells
5. **Citations:** Use {{cite_XXX}} format from citation database
6. **Depth:** Use 4 levels of headings (##, ###, ####, #####)

**Content to cover:**
- Theoretical framework and foundational concepts
- Review of empirical studies (with abstracts provided)
- Comparison of different approaches/methodologies
- Evolution of the field
- Research gaps that your thesis will address

**Use the abstracts provided to write evidence-based literature review with specific findings, NOT generic statements.**""",
                save_to=folders['drafts'] / "02_1_literature_review.md",
                skip_validation=skip_validation,
                verbose=verbose
            )

            section_time = time.time() - section_start
            section_file = folders['drafts'] / "02_1_literature_review.md"
            section_size = section_file.stat().st_size if section_file.exists() else 0
            logger.info(f"[SECTION 2.1/4] ✅ Complete in {section_time:.1f}s")
            logger.info(f"  File size: {section_size:,} bytes (~{section_size/6:,.0f} words)")

            if tracker:
                tracker.update_phase("writing", progress_percent=45, chapters_count=2, details={"stage": "literature_review_complete"})

            # Stream section completion to Supabase
            if streamer:
                streamer.stream_chapter_complete(
                    chapter_num=2,  # Chapter 2, section 1
                    chapter_name="Literature Review (Section 2.1)",
                    chapter_path=folders['drafts'] / "02_1_literature_review.md"
                )

        except Exception as e:
            logger.error(f"[SECTION 2.1/4] ❌ FAILED: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            if tracker:
                tracker.mark_failed(f"Section 2.1 (Literature Review) failed: {e}")
            raise

        rate_limit_delay()

        # ===== Section 2.2: Methodology =====
        try:
            logger.info("[SECTION 2.2/4] Starting Methodology")
            logger.info(f"  Target: 3,000-3,500 words")
            logger.info(f"  Output: {folders['drafts'] / '02_2_methodology.md'}")
            section_start = time.time()

            methodology_output = run_agent(
                model=model,
                name="Crafter - Methodology",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write section 2.2 Methodology for this thesis.

Topic: {topic}

Literature Review context (what was identified):
{lit_review_output[-2000:]}

Research gaps from Signal phase:
{signal_output[:1500]}

Outline:
{formatter_output[:2000]}

{citation_summary}

**CRITICAL REQUIREMENTS:**

1. **Section numbering:** Start with ## 2.2 Methodology
2. **Subsections:** Use ### 2.2.1, ### 2.2.2, etc. (at least 2-3 subsections)
3. **Word count:** 3,000-3,500 words minimum
4. **Tables:** Include at least 1 methodology summary table
   - **Maximum 300 characters per cell** - keep cells concise!
   - **Maximum 5 columns** per table
   - Put details in prose AFTER the table, not inside cells
5. **Build on Literature Review:** Reference gaps identified in section 2.1
6. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format

**Content to cover:**
- Research design and approach (qualitative/quantitative/mixed)
- Data collection methods
- Analysis framework/techniques
- Rationale for chosen methods (connect to gaps from 2.1)
- Tools and technologies used
- Study limitations and considerations

**Connect to Literature Review:** "To address the gap identified in section 2.1 regarding X..."**""",
                save_to=folders['drafts'] / "02_2_methodology.md",
                skip_validation=skip_validation,
                verbose=verbose
            )

            section_time = time.time() - section_start
            section_file = folders['drafts'] / "02_2_methodology.md"
            section_size = section_file.stat().st_size if section_file.exists() else 0
            logger.info(f"[SECTION 2.2/4] ✅ Complete in {section_time:.1f}s")
            logger.info(f"  File size: {section_size:,} bytes (~{section_size/6:,.0f} words)")

            if tracker:
                tracker.update_phase("writing", progress_percent=50, chapters_count=2, details={"stage": "methodology_complete"})

            # Stream section completion to Supabase (no email - odd chapter)
            if streamer:
                streamer.stream_chapter_complete(
                    chapter_num=2,  # Chapter 2, section 2
                    chapter_name="Methodology (Section 2.2)",
                    chapter_path=folders['drafts'] / "02_2_methodology.md"
                )

        except Exception as e:
            logger.error(f"[SECTION 2.2/4] ❌ FAILED: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            if tracker:
                tracker.mark_failed(f"Section 2.2 (Methodology) failed: {e}")
            raise

        rate_limit_delay()

        # ===== Section 2.3: Analysis and Results =====
        try:
            logger.info("[SECTION 2.3/4] Starting Analysis and Results")
            logger.info(f"  Target: 6,000-7,000 words")
            logger.info(f"  Output: {folders['drafts'] / '02_3_analysis_results.md'}")
            section_start = time.time()

            results_output = run_agent(
                model=model,
                name="Crafter - Analysis and Results",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write section 2.3 Analysis and Results for this thesis.

Topic: {topic}

Methodology used (from section 2.2):
{methodology_output[-1500:]}

Literature Review context (theoretical framework):
{lit_review_output[:1500]}

Research data:
{scribe_output[1000:2500]}

{citation_summary}

**CRITICAL REQUIREMENTS:**

1. **Section numbering:** Start with ## 2.3 Analysis and Results
2. **Subsections:** Use ### 2.3.1, ### 2.3.2, etc. (at least 3 subsections)
3. **Word count:** 6,000-7,000 words minimum
4. **Tables:** Include at least 2-3 data/results tables
   - **Maximum 300 characters per cell** - keep cells concise!
   - **Maximum 5 columns** per table
   - Put details in prose AFTER the table, not inside cells
5. **Apply Methodology:** Present results using methods described in section 2.2
6. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format

**Content to cover:**
- Key findings (with specific data from abstracts)
- Data analysis and interpretation
- Statistical results (if applicable)
- Patterns and trends observed
- Visual data presentation (tables with real numbers)
- Comparison with baseline/benchmarks

**Connect sections:** "Applying the methodology described in section 2.2..." and "These findings relate to the theoretical framework in section 2.1..."**""",
                save_to=folders['drafts'] / "02_3_analysis_results.md",
                skip_validation=skip_validation,
                verbose=verbose
            )

            section_time = time.time() - section_start
            section_file = folders['drafts'] / "02_3_analysis_results.md"
            section_size = section_file.stat().st_size if section_file.exists() else 0
            logger.info(f"[SECTION 2.3/4] ✅ Complete in {section_time:.1f}s")
            logger.info(f"  File size: {section_size:,} bytes (~{section_size/6:,.0f} words)")

            if tracker:
                tracker.update_phase("writing", progress_percent=55, chapters_count=2, details={"stage": "results_complete"})

            # Stream section completion to Supabase (triggers email - even chapter)
            if streamer:
                streamer.stream_chapter_complete(
                    chapter_num=2,  # Chapter 2, section 3
                    chapter_name="Analysis & Results (Section 2.3)",
                    chapter_path=folders['drafts'] / "02_3_analysis_results.md"
                )

        except Exception as e:
            logger.error(f"[SECTION 2.3/4] ❌ FAILED: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            if tracker:
                tracker.mark_failed(f"Section 2.3 (Analysis and Results) failed: {e}")
            raise

        rate_limit_delay()

        # ===== Section 2.4: Discussion =====
        try:
            logger.info("[SECTION 2.4/4] Starting Discussion")
            logger.info(f"  Target: 3,000-3,500 words")
            logger.info(f"  Output: {folders['drafts'] / '02_4_discussion.md'}")
            section_start = time.time()

            discussion_output = run_agent(
                model=model,
                name="Crafter - Discussion",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write section 2.4 Discussion for this thesis.

Topic: {topic}

Results (from section 2.3):
{results_output[-2000:]}

Literature Review context (to compare with):
{lit_review_output[:1500]}

Research gaps addressed:
{signal_output[:1000]}

{citation_summary}

**CRITICAL REQUIREMENTS:**

1. **Section numbering:** Start with ## 2.4 Discussion
2. **Subsections:** Use ### 2.4.1, ### 2.4.2, etc. (at least 2-3 subsections)
3. **Word count:** 3,000-3,500 words minimum
4. **Tables:** Include at least 1 summary/implications table
   - **Maximum 300 characters per cell** - keep cells concise!
   - **Maximum 5 columns** per table
   - Put details in prose AFTER the table, not inside cells
5. **Interpret Results:** Connect findings back to literature and research gaps
6. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format

**Content to cover:**
- Interpretation of results from section 2.3
- Comparison with prior work from section 2.1
- How findings address research gaps
- Theoretical implications
- Practical implications
- Study limitations
- Future research directions

**CRITICAL - Explicit Section References:**

You MUST include these explicit phrases to connect back to previous sections:
1. "As discussed in section 2.1..." (refer to literature review)
2. "The findings presented in section 2.3..." (refer to results)
3. "Compared to the theoretical framework in section 2.1..."
4. "These results confirm/contradict [Author's] findings discussed in section 2.1..."
5. "The research gap identified in section 2.1 has been addressed by..."

**Example opening:** "The findings presented in section 2.3 reveal significant insights that both align with and extend the theoretical frameworks discussed in section 2.1. As noted in the literature review (section 2.1), previous studies by [Author] demonstrated [X]; our results confirm this relationship while also revealing [new insight]."

**Remember:** Explicitly reference "section 2.1" at least 3-5 times throughout the Discussion to maintain strong academic coherence.**""",
                save_to=folders['drafts'] / "02_4_discussion.md",
                skip_validation=skip_validation,
                verbose=verbose
            )

            section_time = time.time() - section_start
            section_file = folders['drafts'] / "02_4_discussion.md"
            section_size = section_file.stat().st_size if section_file.exists() else 0
            logger.info(f"[SECTION 2.4/4] ✅ Complete in {section_time:.1f}s")
            logger.info(f"  File size: {section_size:,} bytes (~{section_size/6:,.0f} words)")

            if tracker:
                tracker.update_phase("writing", progress_percent=60, chapters_count=2, details={"stage": "discussion_complete"})

            # Stream section completion to Supabase (no email - odd chapter)
            if streamer:
                streamer.stream_chapter_complete(
                    chapter_num=2,  # Chapter 2, section 4
                    chapter_name="Discussion (Section 2.4)",
                    chapter_path=folders['drafts'] / "02_4_discussion.md"
                )

        except Exception as e:
            logger.error(f"[SECTION 2.4/4] ❌ FAILED: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            if tracker:
                tracker.mark_failed(f"Section 2.4 (Discussion) failed: {e}")
            raise

        # ===== Merge all sections into 02_main_body.md =====
        logger.info("="*80)
        logger.info("[CHAPTER 2/4] Merging 4 sections into Main Body")
        logger.info("="*80)

        try:
            merged_content = []

            # Read and merge all 4 sections
            for section_file in [
                folders['drafts'] / "02_1_literature_review.md",
                folders['drafts'] / "02_2_methodology.md",
                folders['drafts'] / "02_3_analysis_results.md",
                folders['drafts'] / "02_4_discussion.md"
            ]:
                if section_file.exists():
                    content = section_file.read_text(encoding='utf-8')
                    merged_content.append(content)
                    merged_content.append("\n\n")  # Add spacing between sections

            # Write merged file
            merged_body = "".join(merged_content)
            main_body_file = folders['drafts'] / "02_main_body.md"
            main_body_file.write_text(merged_body, encoding='utf-8')

            # Set body_output for downstream use
            body_output = merged_body

            # Log final stats
            main_body_time = time.time() - main_body_start
            main_body_size = main_body_file.stat().st_size
            logger.info(f"[CHAPTER 2/4] ✅ Complete in {main_body_time:.1f}s ({main_body_time/60:.1f} min)")
            logger.info(f"  Merged file: {main_body_file}")
            logger.info(f"  File size: {main_body_size:,} bytes ({main_body_size/1024/1024:.1f} MB)")
            logger.info(f"  Estimated words: ~{main_body_size/6:,.0f}")
            log_memory_usage("After Chapter 2 (Main Body) - All 4 sections merged")

            # MILESTONE: Main Body Complete - Stream merged chapter to Supabase
            if streamer:
                streamer.stream_chapter_complete(
                    chapter_num=2,
                    chapter_name="Main Body (Complete)",
                    chapter_path=folders['drafts'] / "02_main_body.md"
                )

        except Exception as e:
            logger.error(f"[CHAPTER 2/4] ❌ Merge FAILED: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            if tracker:
                tracker.mark_failed(f"Chapter 2 merge failed: {e}")
            raise

        rate_limit_delay()

        # ===== CHAPTER 3: Conclusion =====
        try:
            logger.info("[CHAPTER 3/4] Starting Conclusion")
            logger.info(f"  Target: 1,500-2,000 words")
            logger.info(f"  Output: {folders['drafts'] / '03_conclusion.md'}")
            chapter_start = time.time()
            log_memory_usage("Before Chapter 3")

            conclusion_output = run_agent(
                model=model,
                name="Crafter - Conclusion",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write Conclusion:

Topic: {topic}

Main findings:
{body_output[:2000]}

{citation_summary}

**CRITICAL REQUIREMENTS:**
1. Write 1,500-2,000 words minimum
2. Include at least 1 summary table (if relevant)
3. **Table constraints**: Maximum 300 chars per cell, maximum 5 columns
4. Put table details in prose paragraphs AFTER tables, not inside cells
5. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format""",
                save_to=folders['drafts'] / "03_conclusion.md",
                skip_validation=skip_validation,
                verbose=verbose
            )

            chapter_time = time.time() - chapter_start
            chapter_file = folders['drafts'] / "03_conclusion.md"
            chapter_size = chapter_file.stat().st_size if chapter_file.exists() else 0
            logger.info(f"[CHAPTER 3/4] ✅ Complete in {chapter_time:.1f}s")
            logger.info(f"  File size: {chapter_size:,} bytes ({chapter_size/1024:.1f} KB)")
            log_memory_usage("After Chapter 3")

        except Exception as e:
            logger.error(f"[CHAPTER 3/4] ❌ FAILED: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            if tracker:
                tracker.mark_failed(f"Chapter 3 (Conclusion) failed: {e}")
            raise

        # MILESTONE: Conclusion Complete - Stream to user
        if streamer:
            streamer.stream_chapter_complete(
                chapter_num=3,
                chapter_name="Conclusion",
                chapter_path=folders['drafts'] / "03_conclusion.md"
            )

        # Update progress
        if tracker:
            tracker.update_phase("writing", progress_percent=70, chapters_count=3, details={"stage": "conclusion_complete", "milestone": "conclusion_complete"})

        rate_limit_delay()

        # ===== CHAPTER 4: Appendices =====
        try:
            logger.info("[CHAPTER 4/4] Starting Appendices")
            logger.info(f"  Target: 2,000-3,000 words (3-4 appendices)")
            logger.info(f"  Output: {folders['drafts'] / '04_appendices.md'}")
            chapter_start = time.time()
            log_memory_usage("Before Chapter 4")

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

    {citation_summary}

    **REQUIREMENTS:**
    1. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format
    2. Generate 3-4 appendices following this structure:

    ## Appendix A: Conceptual Framework
    A detailed framework or model relevant to the thesis topic with tables/diagrams described in markdown.

    ## Appendix B: Supplementary Data Tables
    Additional data, metrics, or case study details supporting the main analysis.

    ## Appendix C: Glossary of Terms
    Key technical terms and definitions used throughout the thesis.

    ## Appendix D: Additional Resources
    Supplementary references, tools, and resources for further reading.

    **CRITICAL REQUIREMENTS:**
    1. Write 2,000-3,000 words total across all appendices
    2. Use markdown tables where appropriate
    3. **Table constraints**: Maximum 300 chars per cell, maximum 5 columns
    4. Put table details in prose paragraphs AFTER tables, not inside cells
    5. Each appendix should be standalone and informative""",
                save_to=folders['drafts'] / "04_appendices.md",
                skip_validation=skip_validation,
                verbose=verbose
            )

            chapter_time = time.time() - chapter_start
            chapter_file = folders['drafts'] / "04_appendices.md"
            chapter_size = chapter_file.stat().st_size if chapter_file.exists() else 0
            logger.info(f"[CHAPTER 4/4] ✅ Complete in {chapter_time:.1f}s")
            logger.info(f"  File size: {chapter_size:,} bytes ({chapter_size/1024:.1f} KB)")
            log_memory_usage("After Chapter 4")

            # Update progress
            if tracker:
                tracker.update_phase("writing", progress_percent=75, chapters_count=4, details={"stage": "appendices_complete"})

            # MILESTONE: Appendices Complete - Stream to Supabase
            if streamer:
                streamer.stream_chapter_complete(
                    chapter_num=4,
                    chapter_name="Appendices",
                    chapter_path=folders['drafts'] / "04_appendices.md"
                )

            logger.info("="*80)
            logger.info("PHASE 3 COMPLETE - All chapters written successfully!")
            logger.info("="*80)

        except Exception as e:
            logger.error(f"[CHAPTER 4/4] ❌ FAILED: {e}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            if tracker:
                tracker.mark_failed(f"Chapter 4 (Appendices) failed: {e}")
            raise

        rate_limit_delay()

        # ====================================================================
        # PHASE 3.5: QUALITY ASSURANCE (QA Pass)
        # ====================================================================
        logger.info("="*80)
        logger.info("PHASE 3.5: QUALITY ASSURANCE - Narrative consistency & voice unification")
        logger.info("="*80)
        log_memory_usage("Before QA Pass")

        if verbose:
            print("\n🔍 PHASE 3.5: QUALITY ASSURANCE")

        # Prepare all chapter content for QA review
        all_chapters_content = f"""# Complete Thesis for QA Review

## Chapter 1: Introduction
{intro_output}

## Chapter 2: Main Body

### Section 2.1: Literature Review
{folders['drafts'] / '02_1_literature_review.md' if (folders['drafts'] / '02_1_literature_review.md').exists() else '[Section file not found]'}

### Section 2.2: Methodology
{folders['drafts'] / '02_2_methodology.md' if (folders['drafts'] / '02_2_methodology.md').exists() else '[Section file not found]'}

### Section 2.3: Analysis & Results
{folders['drafts'] / '02_3_analysis_results.md' if (folders['drafts'] / '02_3_analysis_results.md').exists() else '[Section file not found]'}

### Section 2.4: Discussion
{folders['drafts'] / '02_4_discussion.md' if (folders['drafts'] / '02_4_discussion.md').exists() else '[Section file not found]'}

## Chapter 3: Conclusion
{conclusion_output}

## Chapter 4: Appendices
{appendix_output}
"""

        # Read section files for complete content
        try:
            lit_review_content = (folders['drafts'] / '02_1_literature_review.md').read_text(encoding='utf-8') if (folders['drafts'] / '02_1_literature_review.md').exists() else ""
            methodology_content = (folders['drafts'] / '02_2_methodology.md').read_text(encoding='utf-8') if (folders['drafts'] / '02_2_methodology.md').exists() else ""
            results_content = (folders['drafts'] / '02_3_analysis_results.md').read_text(encoding='utf-8') if (folders['drafts'] / '02_3_analysis_results.md').exists() else ""
            discussion_content = (folders['drafts'] / '02_4_discussion.md').read_text(encoding='utf-8') if (folders['drafts'] / '02_4_discussion.md').exists() else ""

            # Truncate sections to fit within context (keep first/last portions)
            all_chapters_for_qa = f"""# Complete Thesis for QA Review

Topic: {topic}

## Chapter 1: Introduction (First 1500 chars)
{intro_output[:1500]}

## Chapter 2: Main Body

### Section 2.1: Literature Review (First 1000 + Last 1000 chars)
{lit_review_content[:1000]}
[... middle content truncated ...]
{lit_review_content[-1000:] if len(lit_review_content) > 1000 else ''}

### Section 2.2: Methodology (First 1000 + Last 1000 chars)
{methodology_content[:1000]}
[... middle content truncated ...]
{methodology_content[-1000:] if len(methodology_content) > 1000 else ''}

### Section 2.3: Analysis & Results (First 1000 + Last 1000 chars)
{results_content[:1000]}
[... middle content truncated ...]
{results_content[-1000:] if len(results_content) > 1000 else ''}

### Section 2.4: Discussion (First 1000 + Last 1000 chars)
{discussion_content[:1000]}
[... middle content truncated ...]
{discussion_content[-1000:] if len(discussion_content) > 1000 else ''}

## Chapter 3: Conclusion (First 1500 chars)
{conclusion_output[:1500]}

## Chapter 4: Appendices (First 1000 chars)
{appendix_output[:1000]}
"""
        except Exception as e:
            logger.warning(f"Could not read section files for QA: {e}")
            all_chapters_for_qa = f"""# Complete Thesis for QA Review (Truncated)

Topic: {topic}

Introduction: {intro_output[:1500]}
Main Body: {body_output[:2000]}
Conclusion: {conclusion_output[:1500]}
Appendices: {appendix_output[:1000]}
"""

        # === QA STEP 1: Thread Agent - Narrative Consistency ===
        try:
            logger.info("[QA 1/2] Running Thread agent - Narrative Consistency Check")
            qa_start = time.time()

            thread_report = run_agent(
                model=model,
                name="Thread - Narrative Consistency",
                prompt_path="prompts/03_compose/thread.md",
                user_input=f"""Review the complete thesis for narrative consistency.

{all_chapters_for_qa}

**Check for:**
1. Contradictions across sections
2. Fulfilled promises (Introduction → Conclusion)
3. Proper cross-references
4. Consistent terminology
5. Logical flow between sections

**Focus on Main Body sections 2.1-2.4:**
- Do they reference each other properly?
- Is there narrative continuity?
- Are research gaps from 2.1 addressed in 2.4?""",
                save_to=folders['drafts'] / "qa_narrative_consistency.md",
                skip_validation=True,
                verbose=verbose
            )

            thread_time = time.time() - qa_start
            logger.info(f"[QA 1/2] ✅ Thread agent complete in {thread_time:.1f}s")

            if tracker:
                tracker.update_phase("writing", progress_percent=78, chapters_count=4, details={"stage": "qa_narrative_complete"})

        except Exception as e:
            logger.warning(f"[QA 1/2] ⚠️  Thread agent failed: {e}")
            logger.warning("Continuing without narrative consistency check...")

        rate_limit_delay()

        # === QA STEP 2: Narrator Agent - Voice Unification ===
        try:
            logger.info("[QA 2/2] Running Narrator agent - Voice Unification Check")
            qa_start = time.time()

            narrator_report = run_agent(
                model=model,
                name="Narrator - Voice Unification",
                prompt_path="prompts/03_compose/narrator.md",
                user_input=f"""Review the complete thesis for voice consistency.

{all_chapters_for_qa}

**Check for:**
1. Consistent tone (formal, objective, confident)
2. Proper person usage (first/third person)
3. Appropriate tense by section
4. Uniform vocabulary level
5. Consistent hedging language

**Target:** Academic {academic_level}-level thesis
**Citation style:** {citation_database.citation_style}""",
                save_to=folders['drafts'] / "qa_voice_unification.md",
                skip_validation=True,
                verbose=verbose
            )

            narrator_time = time.time() - qa_start
            logger.info(f"[QA 2/2] ✅ Narrator agent complete in {narrator_time:.1f}s")

            if tracker:
                tracker.update_phase("writing", progress_percent=80, chapters_count=4, details={"stage": "qa_complete"})

        except Exception as e:
            logger.warning(f"[QA 2/2] ⚠️  Narrator agent failed: {e}")
            logger.warning("Continuing without voice unification check...")

        logger.info("="*80)
        logger.info("PHASE 3.5 COMPLETE - QA reports generated")
        logger.info(f"  Reports saved to: {folders['drafts']}/qa_*.md")
        logger.info("="*80)
        log_memory_usage("After QA Pass")

        rate_limit_delay()

        # Copy refinement tools and create README
        copy_tools_to_output(folders['tools'], topic, academic_level, verbose)
        create_output_readme(output_dir, topic, verbose)

        # ====================================================================
        # PHASE 4: COMPILE & ENHANCE
        # ====================================================================
        if verbose:
            print("\n🔧 PHASE 4: COMPILE")
    
        if tracker:
            tracker.update_phase("compiling", progress_percent=75, details={"stage": "assembling_thesis"})

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

        # Determine thesis type label based on academic level
        thesis_type_labels = {
            'bachelor': 'Bachelor Thesis',
            'master': 'Master Thesis',
            'phd': 'PhD Dissertation'
        }
        thesis_type = thesis_type_labels.get(academic_level, 'Master Thesis')
    
        # Determine degree label
        degree_labels = {
            'bachelor': 'Bachelor of Science',
            'master': 'Master of Science',
            'phd': 'Doctor of Philosophy'
        }
        degree = degree_labels.get(academic_level, 'Master of Science')

        # Build YAML with proper academic metadata
        # Use provided values or sensible defaults
        yaml_author = author_name or "OpenDraft AI"
        yaml_institution = institution or "OpenDraft University"
        yaml_department = department or "Department of Computer Science"
        yaml_faculty = faculty or "Faculty of Engineering"
        yaml_advisor = advisor or "Prof. Dr. OpenDraft Supervisor"
        yaml_second_examiner = second_examiner or "Prof. Dr. Second Examiner"
        yaml_location = location or "Munich"
        yaml_student_id = student_id or "N/A"

        full_thesis = f"""---
title: "{topic}"
author: "{yaml_author}"
date: "{current_date}"
institution: "{yaml_institution}"
department: "{yaml_department}"
faculty: "{yaml_faculty}"
degree: "{degree}"
advisor: "{yaml_advisor}"
second_examiner: "{yaml_second_examiner}"
location: "{yaml_location}"
student_id: "{yaml_student_id}"
project_type: "{thesis_type}"
word_count: "{word_count:,} words"
pages: "{pages_estimate}"
generated_by: "OpenDraft AI - https://github.com/federicodeponte/opendraft"
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
        # Account for optional leading whitespace from indented templates
        compiled_thesis = re.sub(r'^\s*#+ (?:\d+\.\s*)?References\s*\n\s*\[Citations will be compiled\]\s*', '', compiled_thesis, flags=re.MULTILINE)
        # Append the generated reference list with citations
        compiled_thesis = compiled_thesis + reference_list

        # Save intermediate thesis for abstract generation
        intermediate_md_path = folders['exports'] / "INTERMEDIATE_THESIS.md"
        intermediate_md_path.write_text(compiled_thesis, encoding='utf-8')

        # Generate abstract using the agent
        abstract_success, abstract_updated_content = generate_abstract_for_thesis(
            thesis_path=intermediate_md_path,
            model=model,
            run_agent_func=run_agent,
            output_dir=folders['exports'],
            verbose=verbose
        )

        # Read updated thesis with abstract
        if abstract_success and abstract_updated_content:
            final_thesis = abstract_updated_content
        else:
            # Fallback: use compiled thesis without abstract
            final_thesis = compiled_thesis

        # Save final markdown
        final_md_path = folders['exports'] / "FINAL_THESIS.md"
        # Fix single-line tables before saving
        final_thesis = fix_single_line_tables(final_thesis)
        final_thesis = deduplicate_appendices(final_thesis)
        final_thesis = clean_malformed_markdown(final_thesis)
        # Clean AI language patterns (em dashes, overused words)
        from utils.text_utils import clean_ai_language
        final_thesis = clean_ai_language(final_thesis)
        final_md_path.write_text(final_thesis, encoding='utf-8')

        if verbose:
            print(f"✅ Thesis compiled: {len(final_thesis):,} characters")

        # ====================================================================
        # PHASE 5: EXPORT
        # ====================================================================
        if verbose:
            print("\n📄 PHASE 5: EXPORT")
    
        if tracker:
            tracker.update_exporting(export_type="PDF and DOCX")

        # Export to PDF with error handling - ONLY Pandoc/XeLaTeX allowed
        pdf_path = folders['exports'] / "FINAL_THESIS.pdf"
    
        if verbose:
            print("📄 Exporting PDF with Pandoc/XeLaTeX (ONLY engine allowed - professional quality)...")
    
        pdf_success = export_pdf(
            md_file=final_md_path,
            output_pdf=pdf_path,
            engine='pandoc'  # ONLY Pandoc/XeLaTeX - WeasyPrint disabled!
        )
    
        # If Pandoc fails, thesis generation should FAIL (no silent fallback to poor quality)
        if not pdf_success:
            raise RuntimeError("PDF export failed - Pandoc/XeLaTeX required! WeasyPrint is disabled.")
    
        if not pdf_success or not pdf_path.exists():
            raise RuntimeError(f"PDF export failed - file not created: {pdf_path}")

        # Export to DOCX with error handling
        docx_path = folders['exports'] / "FINAL_THESIS.docx"
        docx_success = export_docx(
            md_file=final_md_path,
            output_docx=docx_path
        )
    
        if not docx_success or not docx_path.exists():
            raise RuntimeError(f"DOCX export failed - file not created: {docx_path}")

        if verbose:
            print(f"✅ Exported PDF: {pdf_path}")
            print(f"✅ Exported DOCX: {docx_path}")
            print(f"📂 Output folder: {output_dir}")
            print("="*70)
            print("✅ THESIS GENERATION COMPLETE")
            print("="*70)
            print("\n💡 Open the folder in Cursor to refine your thesis!")
            print(f"   cursor {output_dir}")
    
        if tracker:
            tracker.mark_completed()

        # ====================================================================
        # THESIS GENERATION COMPLETE
        # ====================================================================
        thesis_total_time = time.time() - thesis_start_time
        logger.info("="*80)
        logger.info("THESIS GENERATION COMPLETE!")
        logger.info("="*80)
        logger.info(f"Total time: {thesis_total_time:.1f}s ({thesis_total_time/60:.1f} minutes)")
        logger.info(f"PDF: {pdf_path}")
        logger.info(f"DOCX: {docx_path}")
        logger.info(f"PDF size: {pdf_path.stat().st_size:,} bytes ({pdf_path.stat().st_size/1024/1024:.1f} MB)")
        logger.info(f"DOCX size: {docx_path.stat().st_size:,} bytes ({docx_path.stat().st_size/1024/1024:.1f} MB)")
        log_memory_usage("Final")
        logger.info("="*80)

        return pdf_path, docx_path

    except Exception as e:
        thesis_total_time = time.time() - thesis_start_time
        logger.error("="*80)
        logger.error("THESIS GENERATION FAILED!")
        logger.error("="*80)
        logger.error(f"Failed after {thesis_total_time:.1f}s ({thesis_total_time/60:.1f} minutes)")
        logger.error(f"Error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error("="*80)
        logger.error("FULL TRACEBACK:")
        logger.error(traceback.format_exc())
        logger.error("="*80)
        log_memory_usage("At failure")

        # Try to update tracker if available
        if tracker:
            try:
                tracker.mark_failed(f"{type(e).__name__}: {str(e)[:200]}")
            except Exception as tracker_error:
                logger.error(f"Failed to update tracker: {tracker_error}")

        # Re-raise the exception
        raise


if __name__ == "__main__":
    import argparse
    import os
    import sys

    parser = argparse.ArgumentParser(description="Generate academic thesis")

    # Required arguments
    parser.add_argument("--topic", required=True, help="Thesis topic")
    parser.add_argument("--language", default="en", choices=["en", "de"], help="Language")
    parser.add_argument("--academic-level", default="master", choices=["bachelor", "master", "phd"], help="Academic level")

    # Database integration (optional - for direct execution from Next.js)
    parser.add_argument("--thesis-id", help="Database thesis ID for progress tracking")
    parser.add_argument("--supabase-url", help="Supabase URL")
    parser.add_argument("--supabase-key", help="Supabase service role key")
    parser.add_argument("--gemini-key", help="Gemini API key (overrides env var)")

    # Metadata (optional)
    parser.add_argument("--author", help="Author name")
    parser.add_argument("--institution", help="Institution name")
    parser.add_argument("--department", help="Department name")
    parser.add_argument("--faculty", help="Faculty name")
    parser.add_argument("--advisor", help="Advisor name")
    parser.add_argument("--second-examiner", help="Second examiner name")
    parser.add_argument("--location", help="Location")
    parser.add_argument("--student-id", help="Student ID")

    # Other options
    parser.add_argument("--validate", action="store_true", help="Enable strict validation")

    args = parser.parse_args()

    # Set environment variables if provided
    if args.gemini_key:
        os.environ['GEMINI_API_KEY'] = args.gemini_key
    if args.supabase_url:
        os.environ['SUPABASE_URL'] = args.supabase_url
    if args.supabase_key:
        os.environ['SUPABASE_SERVICE_KEY'] = args.supabase_key

    # Initialize database tracker if thesis_id provided
    tracker = None
    if args.thesis_id:
        from utils.progress_tracker import ProgressTracker
        tracker = ProgressTracker(thesis_id=args.thesis_id)
        print(f"✅ Database tracking enabled for thesis: {args.thesis_id}")

    try:
        # Generate thesis
        pdf, docx = generate_thesis(
            topic=args.topic,
            language=args.language,
            academic_level=args.academic_level,
            skip_validation=not args.validate,
            tracker=tracker,
            # Metadata parameters
            author_name=args.author,
            institution=args.institution,
            department=args.department,
            faculty=args.faculty,
            advisor=args.advisor,
            second_examiner=args.second_examiner,
            location=args.location,
            student_id=args.student_id
        )

        print(f"\n✅ Generated:")
        print(f"   PDF: {pdf}")
        print(f"   DOCX: {docx}")

        sys.exit(0)

    except Exception as e:
        print(f"\n❌ Generation failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
