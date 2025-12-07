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
from typing import Tuple, Optional, List, Dict

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
    
    # Create organized folder structure
    folders = setup_output_folders(output_dir)
    
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
            target_minimum=25,  # Minimum citations for automated runs
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
    
    if tracker:
        tracker.update_phase("writing", progress_percent=35, chapters_count=0, details={"stage": "starting_composition"})

    # Introduction
    intro_output = run_agent(
        model=model,
        name="Crafter - Introduction",
        prompt_path="prompts/03_compose/crafter.md",
        user_input=f"Write Introduction:\n\nTopic: {topic}\n\nOutline:\n{formatter_output[:2000]}{citation_summary}\n\n**CRITICAL: Write 2,500-3,000 words minimum.**",
        save_to=folders['drafts'] / "01_introduction.md",
        skip_validation=skip_validation,
        verbose=verbose
    )
    
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
        save_to=folders['drafts'] / "02_main_body.md",
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
        save_to=folders['drafts'] / "03_conclusion.md",
        skip_validation=skip_validation,
        verbose=verbose
    )
    
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
        save_to=folders['drafts'] / "04_appendices.md",
        skip_validation=skip_validation,
        verbose=verbose
    )

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
    compiled_thesis = re.sub(r'#+ (?:\d+\.\s*)?References\s*\n\[Citations will be compiled\]\s*', '', compiled_thesis)
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
