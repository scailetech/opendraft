#!/usr/bin/env python3
"""
ABOUTME: Standalone draft generation function for Modal.com automated processing
ABOUTME: Extracts core logic from test_academic_ai_draft.py for production use

This module provides a simplified, production-ready draft generation workflow
that can be called from Modal workers or other automated systems.

Output Structure:
    draft_output/
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
import warnings

# Suppress deprecation warnings from dependencies before any imports
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

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

# Suppress WeasyPrint stderr warnings
os.environ['WEASYPRINT_QUIET'] = '1'

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import google.generativeai as genai
from config import get_config
from utils.structured_logger import StructuredLogger

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
from utils.agent_runner import setup_model, run_agent, rate_limit_delay, research_citations_via_api
from utils.citation_database import CitationDatabase, save_citation_database, load_citation_database
from utils.text_utils import smart_truncate
from utils.deduplicate_citations import deduplicate_citations
from utils.scrape_citation_titles import TitleScraper
from utils.scrape_citation_metadata import MetadataScraper
from utils.citation_quality_filter import CitationQualityFilter
from utils.citation_compiler import CitationCompiler
from utils.abstract_generator import generate_abstract_for_draft
from utils.export_professional import export_pdf, export_docx


# =============================================================================
# LOCALIZATION: Chapter and section names in different languages
# =============================================================================
CHAPTER_NAMES = {
    'en': {
        'introduction': 'Introduction',
        'literature_review': 'Literature Review',
        'methodology': 'Methodology',
        'results': 'Results and Analysis',
        'discussion': 'Discussion',
        'conclusion': 'Conclusion',
        'references': 'References',
        'appendix': 'Appendix',
    },
    'de': {
        'introduction': 'Einleitung',
        'literature_review': 'Literaturübersicht',
        'methodology': 'Methodik',
        'results': 'Ergebnisse und Analyse',
        'discussion': 'Diskussion',
        'conclusion': 'Fazit',
        'references': 'Literaturverzeichnis',
        'appendix': 'Anhang',
    },
    'es': {
        'introduction': 'Introducción',
        'literature_review': 'Revisión de la Literatura',
        'methodology': 'Metodología',
        'results': 'Resultados y Análisis',
        'discussion': 'Discusión',
        'conclusion': 'Conclusión',
        'references': 'Referencias',
        'appendix': 'Apéndice',
    },
    'fr': {
        'introduction': 'Introduction',
        'literature_review': 'Revue de la Littérature',
        'methodology': 'Méthodologie',
        'results': 'Résultats et Analyse',
        'discussion': 'Discussion',
        'conclusion': 'Conclusion',
        'references': 'Références',
        'appendix': 'Annexe',
    },
    'it': {
        'introduction': 'Introduzione',
        'literature_review': 'Revisione della Letteratura',
        'methodology': 'Metodologia',
        'results': 'Risultati e Analisi',
        'discussion': 'Discussione',
        'conclusion': 'Conclusione',
        'references': 'Riferimenti',
        'appendix': 'Appendice',
    },
    'pt': {
        'introduction': 'Introdução',
        'literature_review': 'Revisão da Literatura',
        'methodology': 'Metodologia',
        'results': 'Resultados e Análise',
        'discussion': 'Discussão',
        'conclusion': 'Conclusão',
        'references': 'Referências',
        'appendix': 'Apêndice',
    },
}


def get_chapter_name(chapter_key: str, language: str = 'en') -> str:
    """
    Get localized chapter name.

    Args:
        chapter_key: Key like 'introduction', 'conclusion', etc.
        language: Language code ('en', 'de', 'es', 'fr', 'it', 'pt')

    Returns:
        Localized chapter name, or English fallback if not found
    """
    # Normalize language code (handle 'en-US' -> 'en', 'de-DE' -> 'de')
    lang = language.split('-')[0].lower() if language else 'en'

    # Get language dict, fallback to English
    lang_dict = CHAPTER_NAMES.get(lang, CHAPTER_NAMES['en'])

    # Get chapter name, fallback to English if key not found
    return lang_dict.get(chapter_key, CHAPTER_NAMES['en'].get(chapter_key, chapter_key.replace('_', ' ').title()))


def setup_output_folders(output_dir: Path) -> Dict[str, Path]:
    """
    Create the organized folder structure for draft output.

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


def extract_all_citations_as_papers(scout_output_path: Path, papers_dir: Path, verbose: bool = True) -> List[Path]:
    """
    Extract ALL citations from scout_raw.md as individual paper files.
    This ensures all citations (typically 50+) become accessible paper files for Cursor usage,
    not just the subset analyzed by Scribe (typically 5-10 papers).
    
    Args:
        scout_output_path: Path to scout_raw.md containing all citations
        papers_dir: Directory to save paper files
        verbose: Whether to print progress messages
    
    Returns:
        List of created paper file paths
    """
    import re
    created_files = []
    
    if not scout_output_path.exists():
        if verbose:
            print("   ⚠️  scout_raw.md not found, skipping citation extraction")
        return created_files
    
    content = scout_output_path.read_text(encoding='utf-8')
    
    # Extract ALL citations from markdown
    # Pattern: #### N. Title followed by citation details
    citation_pattern = r'####\s+\d+\.\s+(.+?)(?=\n####\s+\d+\.|\n---|\Z)'
    matches = list(re.finditer(citation_pattern, content, re.DOTALL))
    
    if not matches:
        if verbose:
            print("   ⚠️  No citations found in scout_raw.md")
        return created_files
    
    if verbose:
        print(f"   📚 Extracting {len(matches)} citations as paper files...")
    
    # Count existing papers to avoid overwriting Scribe-analyzed ones
    existing_papers = {f.name for f in papers_dir.glob('paper_*.md')}
    start_idx = len(existing_papers) + 1
    
    for i, match in enumerate(matches, start=start_idx):
        section = match.group(1).strip()
        
        # Extract title (first line, remove markdown formatting)
        title_line = section.split('\n')[0].strip()
        title = re.sub(r'^\*\*|\*\*$', '', title_line).strip()
        
        # Extract authors
        author_match = re.search(r'\*\*Authors?\*\*:\s*(.+?)(?:\n|$)', section)
        authors_str = author_match.group(1).strip() if author_match else 'Unknown'
        authors = [a.strip() for a in authors_str.split(',')]
        
        # Extract year
        year_match = re.search(r'\*\*Year\*\*:\s*(\d{4})', section)
        year = year_match.group(1) if year_match else 'na'
        
        # Extract DOI
        doi_match = re.search(r'\*\*DOI\*\*:\s*(.+?)(?:\n|$)', section)
        doi = doi_match.group(1).strip() if doi_match else None
        
        # Extract URL
        url_match = re.search(r'\*\*URL\*\*:\s*(.+?)(?:\n|$)', section)
        url = url_match.group(1).strip() if url_match else None
        
        # Extract Abstract
        abstract_match = re.search(r'\*\*Abstract\*\*:\s*(.+?)(?:\n\n|\n\*\*|\Z)', section, re.DOTALL)
        abstract = abstract_match.group(1).strip() if abstract_match else None
        
        # Create filename
        author = authors[0].split()[0] if authors and authors[0] != 'Unknown' else 'unknown'
        title_slug = slugify(title, 40)
        
        filename = f"paper_{i:03d}_{author}_{year}_{title_slug}.md"
        filepath = papers_dir / filename
        
        # Skip if already exists (from Scribe analysis)
        if filename in existing_papers:
            continue
        
        # Create paper markdown
        paper_content = f"""# {title}

**Authors:** {', '.join(authors) if authors else 'Unknown'}
**Year:** {year}
**DOI:** {doi or 'N/A'}
**URL:** {url or 'N/A'}

## Abstract

{abstract or 'No abstract available in source'}

## Citation Details

{section[:2000]}  # Truncate if very long

---
*Extracted from citation research database - all {len(matches)} citations available*
"""
        
        filepath.write_text(paper_content, encoding='utf-8')
        created_files.append(filepath)
    
    if verbose and created_files:
        print(f"   ✅ Extracted {len(created_files)} additional citations as papers")
        print(f"   📊 Total papers now: {len(list(papers_dir.glob('paper_*.md')))}")
    
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
    """Create README.md and CLAUDE.md for the output folder."""
    project_root = Path(__file__).parent.parent
    readme_template = project_root / 'templates' / 'draft_readme.md'
    claude_template = project_root / 'templates' / 'claude.md'
    
    if readme_template.exists():
        shutil.copy(readme_template, output_dir / 'README.md')
        if verbose:
            print("   ✅ Created README.md")
    
    if claude_template.exists():
        shutil.copy(claude_template, output_dir / 'CLAUDE.md')
        if verbose:
            print("   ✅ Created CLAUDE.md")




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
    Remove duplicate appendix sections from draft content.
    
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


def get_language_name(language_code: str) -> str:
    """
    Convert language code to full language name for prompts and formatting.
    
    Args:
        language_code: ISO 639-1 language code (e.g., 'en-US', 'en-GB', 'es', 'fr')
    
    Returns:
        Full language name (e.g., 'American English', 'British English', 'Spanish', 'French')
    """
    language_map = {
        # English variants
        'en': 'English',
        'en-US': 'American English',
        'en-GB': 'British English',
        'en-AU': 'Australian English',
        'en-CA': 'Canadian English',
        'en-NZ': 'New Zealand English',
        'en-IE': 'Irish English',
        'en-ZA': 'South African English',
        
        # Other languages
        'de': 'German',
        'de-DE': 'German (Germany)',
        'de-AT': 'German (Austria)',
        'de-CH': 'German (Switzerland)',
        'es': 'Spanish',
        'es-ES': 'Spanish (Spain)',
        'es-MX': 'Spanish (Mexico)',
        'es-AR': 'Spanish (Argentina)',
        'fr': 'French',
        'fr-FR': 'French (France)',
        'fr-CA': 'French (Canada)',
        'fr-BE': 'French (Belgium)',
        'it': 'Italian',
        'pt': 'Portuguese',
        'pt-BR': 'Portuguese (Brazil)',
        'pt-PT': 'Portuguese (Portugal)',
        'nl': 'Dutch',
        'nl-NL': 'Dutch (Netherlands)',
        'nl-BE': 'Dutch (Belgium)',
        'ru': 'Russian',
        'zh': 'Chinese',
        'zh-CN': 'Chinese (Simplified)',
        'zh-TW': 'Chinese (Traditional)',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'sv': 'Swedish',
        'no': 'Norwegian',
        'da': 'Danish',
        'fi': 'Finnish',
        'pl': 'Polish',
        'cs': 'Czech',
        'tr': 'Turkish',
        'he': 'Hebrew',
        'th': 'Thai',
        'vi': 'Vietnamese',
        'id': 'Indonesian',
        'ms': 'Malay',
        'uk': 'Ukrainian',
        'ro': 'Romanian',
        'hu': 'Hungarian',
        'el': 'Greek',
        'bg': 'Bulgarian',
        'hr': 'Croatian',
        'sk': 'Slovak',
        'sl': 'Slovenian',
        'et': 'Estonian',
        'lv': 'Latvian',
        'lt': 'Lithuanian',
    }
    
    # Return mapped name or default to capitalized code
    return language_map.get(language_code, language_code.upper())


def get_word_count_targets(academic_level: str) -> dict:
    """
    Get word count targets for each section based on academic level.
    
    Args:
        academic_level: 'bachelor', 'master', 'phd', or 'research_paper'
    
    Returns:
        Dictionary with word count targets for each section, plus citation/time estimates
    """
    targets = {
        'research_paper': {
            'total': '3,000-5,000',
            'introduction': '600-800',
            'literature_review': '800-1,200',
            'methodology': '600-800',
            'results': '800-1,200',
            'discussion': '600-800',
            'conclusion': '400-600',
            'appendices': '0',  # Optional for short papers
            'chapters': '3-4',
            'min_citations': 10,  # Fewer citations for short papers
            'deep_research_min_sources': 20,  # Fewer sources for research papers
            'estimated_time_minutes': '5-10',  # Faster generation
        },
        'bachelor': {
            'total': '10,000-15,000',
            'introduction': '1,500-2,000',
            'literature_review': '3,000-4,000',
            'methodology': '1,500-2,000',
            'results': '2,500-3,500',
            'discussion': '1,500-2,000',
            'conclusion': '800-1,200',
            'appendices': '500-1,000',
            'chapters': '5-7',
            'min_citations': 15,  # Moderate citations for bachelor's
            'deep_research_min_sources': 40,  # Moderate source depth
            'estimated_time_minutes': '8-15',  # Moderate time
        },
        'master': {
            'total': '25,000-30,000',
            'introduction': '2,500-3,000',
            'literature_review': '6,000-7,000',
            'methodology': '3,000-3,500',
            'results': '6,000-7,000',
            'discussion': '3,000-3,500',
            'conclusion': '1,500-2,000',
            'appendices': '2,000-3,000',
            'chapters': '7-10',
            'min_citations': 25,  # Comprehensive citations for master's
            'deep_research_min_sources': 50,  # Deep research for master's
            'estimated_time_minutes': '10-25',  # Standard time
        },
        'phd': {
            'total': '50,000-80,000',
            'introduction': '4,000-5,000',
            'literature_review': '12,000-15,000',
            'methodology': '6,000-8,000',
            'results': '12,000-15,000',
            'discussion': '8,000-10,000',
            'conclusion': '3,000-4,000',
            'appendices': '5,000-8,000',
            'chapters': '10-15',
            'min_citations': 50,  # Extensive citations for PhD
            'deep_research_min_sources': 100,  # Very deep research for PhD
            'estimated_time_minutes': '20-40',  # Longer generation time
        },
    }
    return targets.get(academic_level, targets['master'])  # Default to master's


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


def generate_draft(
    topic: str,
    language: str = "en",
    academic_level: str = "master",
    output_dir: Optional[Path] = None,
    skip_validation: bool = True,
    verbose: bool = True,
    tracker=None,  # Progress tracker for real-time updates
    streamer=None,  # Milestone streamer for partial results
    blurb: Optional[str] = None,  # Additional context/focus for the thesis
    output_type: str = "full",  # 'full' for complete draft, 'expose' for research overview only
    # Academic metadata for professional cover page
    author_name: Optional[str] = None,
    institution: Optional[str] = None,
    department: Optional[str] = None,
    faculty: Optional[str] = None,
    advisor: Optional[str] = None,
    second_examiner: Optional[str] = None,
    location: Optional[str] = None,
    student_id: Optional[str] = None,
    citation_style: str = "apa",
) -> Tuple[Path, Path]:
    """
    Generate a complete academic draft using 19 specialized AI agents.

    This is a simplified, production-ready version of the test workflow,
    optimized for automated processing on Modal.com or similar platforms.

    Args:
        topic: Draft topic (e.g., "Machine Learning for Climate Prediction")
        language: Draft language code (e.g., 'en-US', 'en-GB', 'de', 'es', 'fr', etc.)
        academic_level: 'bachelor', 'master', or 'phd'
        output_dir: Custom output directory (default: config.paths.output_dir / "generated_draft")
        skip_validation: Skip strict quality gates (recommended for automated runs)
        verbose: Print progress messages
        output_type: 'full' for complete draft, 'expose' for research overview only
        author_name: Student's full name (for cover page)
        institution: University/institution name
        department: Department name
        faculty: Faculty name
        advisor: First examiner/advisor name
        second_examiner: Second examiner name
        location: City/location for date line
        student_id: Student matriculation number
        citation_style: Citation format - 'apa' or 'ieee' (default: 'apa')

    Returns:
        Tuple[Path, Path]: (pdf_path, docx_path) - Paths to generated draft files

    Raises:
        ValueError: If insufficient citations found or generation fails
        Exception: If any critical step fails

    Example:
        >>> pdf, docx = generate_draft(
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
    draft_start_time = time.time()
    logger.info("="*80)
    logger.info("DRAFT GENERATION STARTED")
    logger.info("="*80)
    logger.info(f"Topic: {topic}")
    logger.info(f"Language: {language}")
    logger.info(f"Academic Level: {academic_level}")
    logger.info(f"Output Type: {output_type}")
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

    # ====================================================================
    # IMMEDIATE PROGRESS UPDATE - User sees this within 1-2 seconds
    # ====================================================================
    if tracker:
        tracker.log_activity("🚀 Generation started", event_type="milestone", phase="research")
        tracker.update_phase("research", progress_percent=1, details={"stage": "initializing"})

    try:
        config = get_config()

        # Check if CLI quiet mode is enabled (suppress technical headers)
        from utils.api_citations.orchestrator import _verbose_research
        cli_quiet_mode = not _verbose_research

        if verbose and not cli_quiet_mode:
            print("="*70)
            print("DRAFT GENERATION - AUTOMATED WORKFLOW")
            print("="*70)
            print(f"Topic: {topic}")
            print(f"Language: {language}")
            print(f"Level: {academic_level}")
            print(f"Validation: {'Skipped' if skip_validation else 'Enabled'}")
            print("="*70)

        # Setup
        logger.info("[SETUP] Initializing Gemini model...")

        # Progress: Loading AI model
        if tracker:
            tracker.log_activity("🤖 Loading AI model...", event_type="info", phase="research")

        model = setup_model()
        logger.info("[SETUP] Model initialized successfully")

        # Progress: Model loaded
        if tracker:
            tracker.log_activity("✅ AI model ready", event_type="found", phase="research")
            tracker.update_phase("research", progress_percent=3, details={"stage": "model_loaded"})

        if output_dir is None:
            output_dir = config.paths.output_dir / "generated_draft"

        logger.info(f"[SETUP] Output directory: {output_dir}")

        # Create organized folder structure
        logger.info("[SETUP] Creating folder structure...")
        folders = setup_output_folders(output_dir)
        logger.info(f"[SETUP] Created folders: {', '.join(folders.keys())}")

        if verbose and not cli_quiet_mode:
            print(f"📁 Output folder: {output_dir}")

        # Prepare research topics (simplified for automated runs)
        # Include blurb context if provided
        topic_context = f"{topic}"
        if blurb:
            topic_context = f"{topic}\n\nFocus/Context: {blurb}"
        
        research_topics = [
            f"{topic} fundamentals and background",
            f"{topic} current state of research",
            f"{topic} methodology and approaches",
            f"{topic} applications and case studies",
            f"{topic} challenges and limitations",
            f"{topic} future directions and implications"
        ]
        
        # If blurb provided, add it to the research context
        if blurb:
            research_topics.insert(0, f"{topic} - {blurb}")

        # ====================================================================
        # PHASE 1: RESEARCH
        # ====================================================================
        if verbose:
            print("\n📚 PHASE 1: RESEARCH")

        if tracker:
            tracker.log_activity("🔍 Starting academic research", event_type="search", phase="research")
            tracker.update_phase("research", progress_percent=5, details={"stage": "starting_research"})
            tracker.check_cancellation()  # Check before starting major phase

        try:
            # Create progress callback that reports to tracker
            def progress_callback(message: str, event_type: str) -> None:
                if tracker:
                    tracker.log_activity(message, event_type=event_type, phase="research")

            # Get citation requirements based on academic level
            word_targets = get_word_count_targets(academic_level)
            min_citations = word_targets['min_citations']
            deep_research_min = word_targets['deep_research_min_sources']

            # -----------------------------------------------------------------------
            # AGENT: Scout
            #   Input: research_topics, topic, academic_level word targets
            #   Output: scout_result dict — {'count': N, 'citations': [...]}
            #   Prompt: (API-based, no prompt file — uses CitationResearcher)
            #   Depends on: None (first agent in pipeline)
            # -----------------------------------------------------------------------
            scout_result = research_citations_via_api(
                model=model,
                research_topics=research_topics,
                output_path=folders['research'] / "scout_raw.md",
                target_minimum=min_citations,  # Dynamic based on academic level
                verbose=verbose,
                use_deep_research=True,
                topic=topic,
                scope=topic,
                min_sources_deep=deep_research_min,  # Dynamic deep research depth
                progress_callback=progress_callback,  # Pass callback for database-specific messages
            )

            if verbose:
                print(f"✅ Scout: {scout_result['count']} citations found")

            if tracker:
                # Log each source found to activity feed with rich data
                for i, citation in enumerate(scout_result.get('citations', [])[:10]):  # Show first 10
                    tracker.log_source_found(
                        title=citation.title,
                        authors=citation.authors[:3] if citation.authors else None,
                        year=citation.year,
                        source_type=citation.api_source or "paper",
                        doi=getattr(citation, 'doi', None),
                        url=getattr(citation, 'url', None),
                        verified=True
                    )
                # If more than 10, show summary
                if len(scout_result.get('citations', [])) > 10:
                    remaining = len(scout_result['citations']) - 10
                    tracker.log_activity(f"...and {remaining} more sources", event_type="found", phase="research")

                tracker.update_research(sources_count=scout_result['count'], phase_detail="Scout completed")

            scout_output = (folders['research'] / "scout_raw.md").read_text(encoding='utf-8')

        except ValueError as e:
            raise ValueError(f"Insufficient citations for draft generation: {str(e)}")

        rate_limit_delay()

        # -----------------------------------------------------------------------
        # AGENT: Scribe
        #   Input: Truncated scout_output (first 8000 chars)
        #   Output: combined_research.md — structured paper summaries
        #   Prompt: prompts/01_research/scribe.md
        #   Depends on: Scout
        # -----------------------------------------------------------------------
        # Scribe - Summarize research
        if tracker:
            tracker.log_activity("📝 Summarizing research findings...", event_type="info", phase="research")
        scribe_output = run_agent(
            model=model,
            name="Scribe - Summarize Papers",
            prompt_path="prompts/01_research/scribe.md",
            user_input=f"Summarize these research findings:\n\n{smart_truncate(scout_output, max_chars=8000, preserve_json=True)}",
            save_to=folders['research'] / "combined_research.md",
            skip_validation=skip_validation,
            verbose=verbose
        )
        if tracker:
            tracker.log_activity("✅ Research summaries complete", event_type="found", phase="research")

        # Split scribe output into individual paper files
        if tracker:
            tracker.log_activity("📚 Organizing research papers...", event_type="info", phase="research")
        split_scribe_to_papers(scribe_output, folders['papers'], verbose=verbose)
        
        # ALSO extract ALL citations from scout_raw.md as papers (not just Scribe-analyzed ones)
        # This ensures all 50 citations become individual paper files for Cursor usage
        extract_all_citations_as_papers(
            scout_output_path=folders['research'] / "scout_raw.md",
            papers_dir=folders['papers'],
            verbose=verbose
        )
        if tracker:
            tracker.log_activity("✅ All research papers organized", event_type="found", phase="research")

        rate_limit_delay()

        # -----------------------------------------------------------------------
        # AGENT: Signal
        #   Input: Truncated scribe_output (first 8000 chars)
        #   Output: research_gaps.md — identified research gaps
        #   Prompt: prompts/01_research/signal.md
        #   Depends on: Scribe
        # -----------------------------------------------------------------------
        # Signal - Gap analysis
        if tracker:
            tracker.log_activity("🔍 Analyzing research gaps...", event_type="info", phase="research")
        signal_output = run_agent(
            model=model,
            name="Signal - Research Gaps",
            prompt_path="prompts/01_research/signal.md",
            user_input=f"Analyze research gaps:\n\n{smart_truncate(scribe_output, max_chars=8000)}",
            save_to=folders['research'] / "research_gaps.md",
            skip_validation=skip_validation,
            verbose=verbose
        )
        if tracker:
            tracker.log_activity("✅ Research gaps identified", event_type="found", phase="research")

        rate_limit_delay()

        # ====================================================================
        # PHASE 2: STRUCTURE
        # ====================================================================
        if verbose:
            print("\n🏗️  PHASE 2: STRUCTURE")

        if tracker:
            tracker.log_activity("📋 Designing thesis structure", event_type="milestone", phase="structure")
            tracker.update_phase("structure", progress_percent=25, details={"stage": "creating_outline"})
            tracker.check_cancellation()  # Check before starting major phase

        # Architect - Create outline
        if tracker:
            tracker.log_activity("🏗️ Creating thesis outline...", event_type="info", phase="structure")
        # Get word count targets based on academic level
        word_targets = get_word_count_targets(academic_level)
        total_words = word_targets['total']
        chapters_info = word_targets['chapters']
        
        # Determine document type label
        doc_type_labels = {
            'research_paper': 'short research paper',
            'bachelor': 'bachelor\'s thesis',
            'master': 'master\'s thesis',
            'phd': 'PhD dissertation'
        }
        doc_type = doc_type_labels.get(academic_level, 'master\'s thesis')
        
        outline_context = f"Create draft outline for: {topic}"
        if blurb:
            outline_context += f"\n\nFocus/Context: {blurb}"
        outline_context += f"\n\nResearch gaps:\n{signal_output[:2000]}\n\nLength: {total_words} words ({doc_type}, {chapters_info} chapters)"
        
        # -----------------------------------------------------------------------
        # AGENT: Architect
        #   Input: topic, blurb, signal_output (first 2000 chars), word/chapter targets
        #   Output: 00_outline.md — draft outline structure
        #   Prompt: prompts/02_structure/architect.md
        #   Depends on: Signal
        # -----------------------------------------------------------------------
        architect_output = run_agent(
            model=model,
            name="Architect - Design Structure",
            prompt_path="prompts/02_structure/architect.md",
            user_input=outline_context,
            save_to=folders['drafts'] / "00_outline.md",
            skip_validation=skip_validation,
            verbose=verbose
        )
        if tracker:
            tracker.log_activity("✅ Outline created", event_type="found", phase="structure")

        rate_limit_delay()

        # -----------------------------------------------------------------------
        # AGENT: Formatter
        #   Input: architect_output (first 2500 chars), citation style (APA 7th)
        #   Output: 00_formatted_outline.md — style-formatted outline
        #   Prompt: prompts/02_structure/formatter.md
        #   Depends on: Architect
        # -----------------------------------------------------------------------
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
        # -----------------------------------------------------------------------
        # STEP: Citation Management (deterministic — no LLM)
        #   Input: scout_result['citations'], citation_style, language
        #   Output: citation_database (CitationDatabase) + bibliography.json
        #   Prompt: N/A — deterministic pipeline (dedup, scrape, filter, save)
        #   Depends on: Scout
        # -----------------------------------------------------------------------
        # ====================================================================
        if verbose:
            print("\n📚 PHASE 2.5: CITATION MANAGEMENT")

        # Create citation database from Scout results
        scout_citations = scout_result['citations']
        for i, citation in enumerate(scout_citations, start=1):
            citation.id = f"cite_{i:03d}"

        # Map CLI-style values to internal CitationStyle format
        style_map = {"apa": "APA 7th", "ieee": "IEEE"}
        resolved_style = style_map.get(citation_style, "APA 7th")

        citation_database = CitationDatabase(
            citations=scout_citations,
            citation_style=resolved_style,
            draft_language=get_language_name(language).lower()
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
        # EXPOSÉ MODE: Early exit with research overview + outline only
        # ====================================================================
        if output_type == 'expose':
            logger.info("="*80)
            logger.info("EXPOSÉ MODE: Generating research overview (skipping full draft)")
            logger.info("="*80)

            if tracker:
                tracker.log_activity("📋 Creating Research Exposé...", event_type="milestone", phase="exporting")
                tracker.update_phase("exporting", progress_percent=70, details={"stage": "creating_expose"})

            # Get language name for document
            language_name = get_language_name(language)

            if verbose:
                print("\n📋 EXPOSÉ MODE: Creating research overview...")

            # Compile the exposé document
            expose_content = f"""# Research Exposé: {topic}

**Generated:** {datetime.now().strftime('%Y-%m-%d')}
**Academic Level:** {academic_level.title()}
**Language:** {language_name}

---

## Executive Summary

This research exposé provides a preliminary overview of the topic "{topic}" based on an analysis of {len(citation_database.citations)} academic sources. It includes a structured outline for a potential full research paper and a comprehensive bibliography.

---

## Research Outline

{formatter_output}

---

## Key Research Findings

{scribe_output[:4000] if len(scribe_output) > 4000 else scribe_output}

---

## Identified Research Gaps

{signal_output[:2000] if len(signal_output) > 2000 else signal_output}

---

## Bibliography

"""
            # Add all citations in proper format
            for citation in citation_database.citations:
                authors_str = ", ".join(citation.authors[:3])
                if len(citation.authors) > 3:
                    authors_str += " et al."
                expose_content += f"- {authors_str} ({citation.year}). {citation.title}"
                if citation.journal:
                    expose_content += f". *{citation.journal}*"
                if citation.doi:
                    expose_content += f". https://doi.org/{citation.doi}"
                expose_content += "\n\n"

            expose_content += f"""
---

## Next Steps

This research exposé serves as a starting point for a comprehensive {academic_level}-level paper. To develop this into a full draft:

1. **Expand the outline** into detailed chapter content
2. **Conduct deeper analysis** of the identified sources
3. **Address the research gaps** highlighted above
4. **Develop original arguments** based on the literature review

---

*This exposé was generated as a research overview. It is intended as a planning tool and starting point for further development.*
"""

            # Save exposé markdown
            expose_md_path = folders['drafts'] / "00_expose.md"
            expose_md_path.write_text(expose_content, encoding='utf-8')
            logger.info(f"Exposé markdown saved: {expose_md_path}")

            if tracker:
                tracker.log_activity("📄 Exporting Research Exposé...", event_type="info", phase="exporting")
                tracker.update_phase("exporting", progress_percent=85, details={"stage": "exporting_expose"})

            # Export as PDF and DOCX
            topic_slug = slugify(topic, max_length=50)
            if not topic_slug:
                topic_slug = "research_expose"

            if verbose:
                print("📄 Exporting PDF...")

            pdf_path = folders['exports'] / f"{topic_slug}_expose.pdf"
            pdf_success = export_pdf(
                md_file=expose_md_path,
                output_pdf=pdf_path,
                engine='pandoc'
            )

            if not pdf_success or not pdf_path.exists():
                raise RuntimeError(f"PDF export failed for exposé: {pdf_path}")

            if verbose:
                print("📝 Exporting Word document...")

            docx_path = folders['exports'] / f"{topic_slug}_expose.docx"
            docx_success = export_docx(
                md_file=expose_md_path,
                output_docx=docx_path
            )

            if not docx_success or not docx_path.exists():
                raise RuntimeError(f"DOCX export failed for exposé: {docx_path}")

            if tracker:
                tracker.log_activity("🎉 Research Exposé complete!", event_type="milestone", phase="completed")
                tracker.update_phase("exporting", progress_percent=100,
                                    sources_count=len(citation_database.citations),
                                    chapters_count=1,
                                    details={"stage": "expose_complete", "milestone": "expose_complete"})

            total_time = time.time() - draft_start_time
            logger.info(f"✅ Exposé generation complete in {total_time:.1f}s:")
            logger.info(f"   PDF: {pdf_path}")
            logger.info(f"   DOCX: {docx_path}")

            if verbose:
                print(f"\n✅ Research Exposé complete!")
                print(f"   PDF: {pdf_path}")
                print(f"   DOCX: {docx_path}")

            return pdf_path, docx_path

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
            tracker.log_activity("✍️ Starting chapter composition", event_type="milestone", phase="writing")
            tracker.update_phase("writing", progress_percent=35, chapters_count=0, details={"stage": "starting_composition"})
            tracker.check_cancellation()  # Check before starting major phase
            tracker.send_heartbeat()

        # Get word count targets for this academic level
        word_targets = get_word_count_targets(academic_level)

        # Create language instruction for all chapter agents
        language_name = get_language_name(language)
        language_instruction = f"\n\n**LANGUAGE REQUIREMENT:** Write the ENTIRE output in {language_name}. All text, headings, and content must be in {language_name}."

        # ===== CHAPTER 1: Introduction =====
        try:
            intro_target = word_targets['introduction']
            logger.info("[CHAPTER 1/4] Starting Introduction")
            logger.info(f"  Target: {intro_target} words")
            logger.info(f"  Output: {folders['drafts'] / '01_introduction.md'}")
            chapter_start = time.time()
            log_memory_usage("Before Chapter 1")

            # -----------------------------------------------------------------------
            # AGENT: Crafter — Introduction
            #   Input: topic, formatter_output (first 2000 chars), citation_summary,
            #          intro_target word count, language_instruction
            #   Output: 01_introduction.md — Introduction chapter
            #   Prompt: prompts/03_compose/crafter.md
            #   Depends on: Formatter, Citation Management
            # -----------------------------------------------------------------------
            if tracker:
                tracker.log_activity("✍️ Writing Introduction chapter...", event_type="writing", phase="writing")
            intro_output = run_agent(
                model=model,
                name="Crafter - Introduction",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write Introduction:

Topic: {topic}

Outline:
{formatter_output[:2000]}{citation_summary}

**CRITICAL REQUIREMENTS:**
1. Write {intro_target} words minimum
2. Include at least 1-2 tables (if relevant)
3. **Table constraints**: Maximum 300 chars per cell, maximum 5 columns
4. Put table details in prose paragraphs AFTER tables, not inside cells{language_instruction}""",
                save_to=folders['drafts'] / "01_introduction.md",
                skip_validation=skip_validation,
                verbose=verbose
            )
            if tracker:
                tracker.log_activity("✅ Introduction complete", event_type="complete", phase="writing")

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
        lit_review_target = word_targets['literature_review']
        methodology_target = word_targets['methodology']
        results_target = word_targets['results']
        discussion_target = word_targets['discussion']
        total_body_target = f"{lit_review_target} + {methodology_target} + {results_target} + {discussion_target}"
        
        logger.info("="*80)
        logger.info("[CHAPTER 2/4] Starting Main Body - Split into 4 focused sections")
        logger.info("  2.1 Literature Review → 2.2 Methodology → 2.3 Results → 2.4 Discussion")
        logger.info(f"  Total target: {total_body_target} words across 4 sections")
        logger.info("="*80)
        main_body_start = time.time()
        log_memory_usage("Before Chapter 2 (Main Body)")

        # ===== Section 2.1: Literature Review =====
        try:
            logger.info("[SECTION 2.1/4] Starting Literature Review")
            logger.info(f"  Target: {lit_review_target} words")
            logger.info(f"  Output: {folders['drafts'] / '02_1_literature_review.md'}")
            section_start = time.time()

            # -----------------------------------------------------------------------
            # AGENT: Crafter — Literature Review
            #   Input: topic, scribe_output (first 3000 chars), citation_summary,
            #          formatter_output (first 2000 chars), lit_review_target word count
            #   Output: 02_1_literature_review.md — Section 2.1
            #   Prompt: prompts/03_compose/crafter.md
            #   Depends on: Scribe, Formatter, Citation Management
            # -----------------------------------------------------------------------
            if tracker:
                tracker.log_activity("✍️ Writing Literature Review section...", event_type="writing", phase="writing")
            lit_review_output = run_agent(
                model=model,
                name="Crafter - Literature Review",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write section 2.1 Literature Review for this draft.

Topic: {topic}

Research summaries and abstracts:
{scribe_output[:3000]}

{citation_summary}

Outline context:
{formatter_output[:2000]}

**CRITICAL REQUIREMENTS:**

1. **Section numbering:** Start with ## 2.1 Literature Review
2. **Subsections:** Use ### 2.1.1, ### 2.1.2, etc. (at least 3 subsections)
3. **Word count:** {lit_review_target} words minimum
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
- Research gaps that your draft will address

**Use the abstracts provided to write evidence-based literature review with specific findings, NOT generic statements.**{language_instruction}""",
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
                tracker.log_activity("✅ Literature Review complete", event_type="complete", phase="writing")
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
            logger.info(f"  Target: {methodology_target} words")
            logger.info(f"  Output: {folders['drafts'] / '02_2_methodology.md'}")
            section_start = time.time()
            
            # -----------------------------------------------------------------------
            # AGENT: Crafter — Methodology
            #   Input: topic, lit_review_output (last 2000 chars), signal_output
            #          (first 1500 chars), formatter_output, citation_summary,
            #          methodology_target word count
            #   Output: 02_2_methodology.md — Section 2.2
            #   Prompt: prompts/03_compose/crafter.md
            #   Depends on: Crafter (Lit Review), Signal, Formatter, Citation Mgmt
            # -----------------------------------------------------------------------
            if tracker:
                tracker.log_activity("✍️ Writing Methodology section...", event_type="writing", phase="writing")

            methodology_output = run_agent(
                model=model,
                name="Crafter - Methodology",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write section 2.2 Methodology for this draft.

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
3. **Word count:** {methodology_target} words minimum
4. **Tables:** Include at least 1 methodology summary table
   - **Maximum 300 characters per cell** - keep cells concise!
   - **Maximum 5 columns** per table
   - Put details in prose AFTER the table, not inside cells
5. **Build on Literature Review:** Reference gaps identified in section 2.1
6. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format

**🚨 CRITICAL ANTI-HALLUCINATION RULES:**
- **NEVER claim "we conducted studies"** - This is a literature review draft, not an empirical study
- **NEVER invent datasets** (e.g., "Dataset X-500", "we analyzed 10,000 samples")
- **NEVER fabricate experimental procedures** (e.g., "we ran experiments on...")
- **ONLY describe methodologies from cited literature** - Use "Previous research {{cite_XXX}} used..." not "We used..."
- **Use hypothetical/theoretical language** for proposed approaches: "A potential methodology might involve..." not "We implemented..."
- **Focus on synthesizing existing research methods**, not claiming to have conducted new research

**Content to cover:**
- Research design and approach (qualitative/quantitative/mixed) - from literature
- Data collection methods - as described in cited sources
- Analysis framework/techniques - from existing research
- Rationale for chosen methods (connect to gaps from 2.1) - theoretical justification
- Tools and technologies used - from literature, not "we used"
- Study limitations and considerations - theoretical discussion

**Connect to Literature Review:** "To address the gap identified in section 2.1 regarding X, a potential methodology could follow approaches described in {{cite_XXX}}..."**{language_instruction}""",
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
                tracker.log_activity("✅ Methodology complete", event_type="complete", phase="writing")
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
            logger.info(f"  Target: {results_target} words")
            logger.info(f"  Output: {folders['drafts'] / '02_3_analysis_results.md'}")
            section_start = time.time()
            
            # -----------------------------------------------------------------------
            # AGENT: Crafter — Analysis and Results
            #   Input: topic, methodology_output (last 1500 chars), lit_review_output
            #          (first 1500 chars), scribe_output (chars 1000-2500),
            #          citation_summary, results_target word count
            #   Output: 02_3_results.md — Section 2.3
            #   Prompt: prompts/03_compose/crafter.md
            #   Depends on: Crafter (Methodology), Crafter (Lit Review), Scribe
            # -----------------------------------------------------------------------
            if tracker:
                tracker.log_activity("✍️ Writing Analysis & Results section...", event_type="writing", phase="writing")

            results_output = run_agent(
                model=model,
                name="Crafter - Analysis and Results",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write section 2.3 Analysis and Results for this draft.

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
3. **Word count:** {results_target} words minimum
4. **Tables:** Include at least 2-3 data/results tables
   - **Maximum 300 characters per cell** - keep cells concise!
   - **Maximum 5 columns** per table
   - Put details in prose AFTER the table, not inside cells
5. **Synthesize Literature Findings:** Present results FROM CITED SOURCES, not from new research
6. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format

**🚨 CRITICAL ANTI-HALLUCINATION RULES:**
- **NEVER claim "we found", "we analyzed", "our results show"** - This is a literature review, not an empirical study
- **NEVER invent data, statistics, or results** (e.g., "we found 87% accuracy", "our analysis revealed...")
- **NEVER fabricate datasets or sample sizes** (e.g., "Dataset X-500", "we analyzed 10,000 samples")
- **ONLY present findings from cited literature** - Use "Research by {{cite_001}} found..." not "We found..."
- **ONLY use data/statistics from cited sources** - All numbers must come from {{cite_XXX}} references
- **Synthesize existing research findings**, not claim to have conducted new analysis
- **Use language like:** "Studies have shown...", "Research indicates...", "Findings suggest..." NOT "We found...", "Our analysis..."

**Content to cover:**
- Key findings FROM CITED LITERATURE (with specific data from cited abstracts/papers)
- Synthesis of data analysis and interpretation FROM EXISTING RESEARCH
- Statistical results FROM CITED STUDIES (if applicable)
- Patterns and trends observed IN THE LITERATURE
- Visual data presentation (tables summarizing findings from cited sources)
- Comparison with baseline/benchmarks FROM CITED RESEARCH

**Connect sections:** "Research applying methodologies similar to those described in section 2.2 has found..." and "These findings from the literature relate to the theoretical framework in section 2.1..."**{language_instruction}""",
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
                tracker.log_activity("✅ Analysis & Results complete", event_type="complete", phase="writing")
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
            logger.info(f"  Target: {discussion_target} words")
            logger.info(f"  Output: {folders['drafts'] / '02_4_discussion.md'}")
            section_start = time.time()
            
            # -----------------------------------------------------------------------
            # AGENT: Crafter — Discussion
            #   Input: topic, results_output (last 2000 chars), lit_review_output
            #          (first 1500 chars), signal_output (first 1000 chars),
            #          citation_summary, discussion_target word count
            #   Output: 02_4_discussion.md — Section 2.4
            #   Prompt: prompts/03_compose/crafter.md
            #   Depends on: Crafter (Results), Crafter (Lit Review), Signal
            # -----------------------------------------------------------------------
            if tracker:
                tracker.log_activity("✍️ Writing Discussion section...", event_type="writing", phase="writing")

            discussion_output = run_agent(
                model=model,
                name="Crafter - Discussion",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write section 2.4 Discussion for this draft.

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
3. **Word count:** {discussion_target} words minimum
4. **Tables:** Include at least 1 summary/implications table
   - **Maximum 300 characters per cell** - keep cells concise!
   - **Maximum 5 columns** per table
   - Put details in prose AFTER the table, not inside cells
5. **Interpret Literature Findings:** Discuss findings FROM CITED SOURCES, not from new research
6. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format

**🚨 CRITICAL ANTI-HALLUCINATION RULES:**
- **NEVER claim "our results", "our findings", "we conclude"** - This is a literature review, not an empirical study
- **NEVER invent conclusions or implications** from non-existent research
- **ONLY discuss findings from cited literature** - Use "Research findings {{cite_001}} suggest..." not "Our findings suggest..."
- **Synthesize existing research**, not claim to have conducted new analysis
- **Use language like:** "The literature suggests...", "Research indicates...", "Studies have shown..." NOT "We found...", "Our analysis..."

**Content to cover:**
- Interpretation of findings FROM CITED LITERATURE (synthesized in section 2.3)
- Comparison with prior work from section 2.1
- How findings FROM LITERATURE address research gaps
- Theoretical implications FROM EXISTING RESEARCH
- Practical implications FROM CITED STUDIES
- Limitations discussed IN THE LITERATURE
- Future research directions suggested BY EXISTING RESEARCH

**CRITICAL - Explicit Section References:**

You MUST include these explicit phrases to connect back to previous sections:
1. "As discussed in section 2.1..." (refer to literature review)
2. "The findings FROM LITERATURE presented in section 2.3..." (refer to synthesized results)
3. "Compared to the theoretical framework in section 2.1..."
4. "These findings FROM CITED RESEARCH confirm/contradict [Author's] findings discussed in section 2.1..."
5. "The research gap identified in section 2.1 has been addressed by findings from {{cite_XXX}}..."

**Example opening:** "The findings FROM LITERATURE synthesized in section 2.3 reveal significant insights that both align with and extend the theoretical frameworks discussed in section 2.1. As noted in the literature review (section 2.1), previous studies by [Author] {{cite_001}} demonstrated [X]; research findings {{cite_002}}{{cite_003}} confirm this relationship while also revealing [new insight]."

**Remember:** Explicitly reference "section 2.1" at least 3-5 times throughout the Discussion to maintain strong academic coherence. ALWAYS cite sources for any findings discussed.**{language_instruction}""",
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
                tracker.log_activity("✅ Discussion complete", event_type="complete", phase="writing")
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
        
        if tracker:
            tracker.log_activity("🔗 Merging sections into Main Body...", event_type="info", phase="writing")

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
            conclusion_target = word_targets['conclusion']
            logger.info("[CHAPTER 3/4] Starting Conclusion")
            logger.info(f"  Target: {conclusion_target} words")
            logger.info(f"  Output: {folders['drafts'] / '03_conclusion.md'}")
            chapter_start = time.time()
            log_memory_usage("Before Chapter 3")
            
            # -----------------------------------------------------------------------
            # AGENT: Crafter — Conclusion
            #   Input: topic, body_output (first 2000 chars), citation_summary,
            #          conclusion_target word count, language_instruction
            #   Output: 03_conclusion.md — Conclusion chapter
            #   Prompt: prompts/03_compose/crafter.md
            #   Depends on: Crafter (all body sections)
            # -----------------------------------------------------------------------
            if tracker:
                tracker.log_activity("✍️ Writing Conclusion chapter...", event_type="writing", phase="writing")

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
1. Write {conclusion_target} words minimum
2. Include at least 1 summary table (if relevant)
3. **Table constraints**: Maximum 300 chars per cell, maximum 5 columns
4. Put table details in prose paragraphs AFTER tables, not inside cells
5. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format{language_instruction}""",
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
            tracker.log_activity("✅ Conclusion complete", event_type="complete", phase="writing")
            tracker.update_phase("writing", progress_percent=70, chapters_count=3, details={"stage": "conclusion_complete", "milestone": "conclusion_complete"})

        rate_limit_delay()

        # -----------------------------------------------------------------------
        # AGENT: Crafter — Appendices
        #   Input: topic, intro_output (first 1500 chars), body_output (first 2000
        #          chars), conclusion_output (first 1000 chars), citation_summary
        #   Output: 04_appendices.md — Appendices A-D (or empty if target is '0')
        #   Prompt: prompts/03_compose/crafter.md
        #   Depends on: Crafter (Introduction, Body, Conclusion)
        # -----------------------------------------------------------------------
        # ===== CHAPTER 4: Appendices =====
        try:
            appendices_target = word_targets['appendices']
            logger.info("[CHAPTER 4/4] Starting Appendices")
            logger.info(f"  Target: {appendices_target} words")
            logger.info(f"  Output: {folders['drafts'] / '04_appendices.md'}")
            chapter_start = time.time()
            log_memory_usage("Before Chapter 4")

            # Skip appendices for research papers if target is 0
            if appendices_target == '0':
                logger.info("  Skipping appendices for research paper format")
                appendix_output = ""
            else:
                appendix_output = run_agent(
                model=model,
                name="Crafter - Appendices",
                prompt_path="prompts/03_compose/crafter.md",
                user_input=f"""Write 3-4 appendices for this draft:

    Topic: {topic}

    Draft content summary:
    - Introduction: {intro_output[:1500]}
    - Main findings: {body_output[:2000]}
    - Conclusion: {conclusion_output[:1000]}

    {citation_summary}

    **REQUIREMENTS:**
    1. **Citations:** ONLY use citations from the CITATION DATABASE above with {{cite_XXX}} format
    2. Generate 3-4 appendices following this structure:

    ## Appendix A: Conceptual Framework
    A detailed framework or model relevant to the draft topic with tables/diagrams described in markdown.

    ## Appendix B: Supplementary Data Tables
    Additional data, metrics, or case study details supporting the main analysis.

    ## Appendix C: Glossary of Terms
    Key technical terms and definitions used throughout the draft.

    ## Appendix D: Additional Resources
    Supplementary references, tools, and resources for further reading.

    **CRITICAL REQUIREMENTS:**
    1. Write {appendices_target} words total across all appendices
    2. Use markdown tables where appropriate
    3. **Table constraints**: Maximum 300 chars per cell, maximum 5 columns
    4. Put table details in prose paragraphs AFTER tables, not inside cells
    5. Each appendix should be standalone and informative{language_instruction}""",
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

            # MILESTONE: Appendices Complete - Stream to Supabase (only if appendices were generated)
            if streamer and appendices_target != '0':
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
        all_chapters_content = f"""# Complete Draft for QA Review

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
            all_chapters_for_qa = f"""# Complete Draft for QA Review

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
            all_chapters_for_qa = f"""# Complete Draft for QA Review (Truncated)

Topic: {topic}

Introduction: {intro_output[:1500]}
Main Body: {body_output[:2000]}
Conclusion: {conclusion_output[:1500]}
Appendices: {appendix_output[:1000]}
"""

        # -----------------------------------------------------------------------
        # AGENT: Thread
        #   Input: all_chapters_for_qa (complete draft text)
        #   Output: qa_narrative_consistency.md — consistency QA report
        #   Prompt: prompts/03_compose/thread.md
        #   Depends on: All Crafter agents (full draft assembled)
        # -----------------------------------------------------------------------
        # === QA STEP 1: Thread Agent - Narrative Consistency ===
        try:
            logger.info("[QA 1/3] Running Thread agent - Narrative Consistency Check")
            qa_start = time.time()

            thread_report = run_agent(
                model=model,
                name="Thread - Narrative Consistency",
                prompt_path="prompts/03_compose/thread.md",
                user_input=f"""Review the complete draft for narrative consistency.

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
            logger.info(f"[QA 1/3] ✅ Thread agent complete in {thread_time:.1f}s")

            if tracker:
                tracker.update_phase("writing", progress_percent=78, chapters_count=4, details={"stage": "qa_narrative_complete"})

        except Exception as e:
            logger.warning(f"[QA 1/3] ⚠️  Thread agent failed: {e}")
            logger.warning("Continuing without narrative consistency check...")

        rate_limit_delay()

        # -----------------------------------------------------------------------
        # AGENT: Narrator
        #   Input: all_chapters_for_qa (complete draft), academic_level,
        #          citation_database.citation_style
        #   Output: qa_voice_unification.md — voice consistency QA report
        #   Prompt: prompts/03_compose/narrator.md
        #   Depends on: All Crafter agents (full draft assembled)
        # -----------------------------------------------------------------------
        # === QA STEP 2: Narrator Agent - Voice Unification ===
        try:
            logger.info("[QA 2/3] Running Narrator agent - Voice Unification Check")
            qa_start = time.time()

            narrator_report = run_agent(
                model=model,
                name="Narrator - Voice Unification",
                prompt_path="prompts/03_compose/narrator.md",
                user_input=f"""Review the complete draft for voice consistency.

{all_chapters_for_qa}

**Check for:**
1. Consistent tone (formal, objective, confident)
2. Proper person usage (first/third person)
3. Appropriate tense by section
4. Uniform vocabulary level
5. Consistent hedging language

**Target:** Academic {academic_level}-level draft
**Citation style:** {citation_database.citation_style}""",
                save_to=folders['drafts'] / "qa_voice_unification.md",
                skip_validation=True,
                verbose=verbose
            )

            narrator_time = time.time() - qa_start
            logger.info(f"[QA 2/3] ✅ Narrator agent complete in {narrator_time:.1f}s")

            if tracker:
                tracker.update_phase("writing", progress_percent=79, chapters_count=4, details={"stage": "qa_narrator_complete"})

        except Exception as e:
            logger.warning(f"[QA 2/3] ⚠️  Narrator agent failed: {e}")
            logger.warning("Continuing without voice unification check...")

        rate_limit_delay()

        # -----------------------------------------------------------------------
        # AGENT: FactCheck
        #   Input: all_chapters_for_qa (complete draft text)
        #   Output: qa_factcheck.md — fact verification report
        #   Prompt: prompts/04_validate/factcheck_extract.md
        #   Depends on: All Crafter agents (full draft assembled)
        # -----------------------------------------------------------------------
        # === QA STEP 3: FactCheck Agent - Factual Claim Verification ===
        if config.validation.enable_factcheck:
            try:
                logger.info("[QA 3/3] Running FactCheck agent - Factual Claim Verification")
                qa_start = time.time()

                # Step 1: Extract claims using the extraction prompt
                extraction_output = run_agent(
                    model=model,
                    name="FactCheck - Claim Extraction",
                    prompt_path="prompts/04_validate/factcheck_extract.md",
                    user_input=f"Extract all verifiable factual claims from this draft:\n\n{all_chapters_for_qa}",
                    skip_validation=True,
                    verbose=verbose,
                )

                # Parse claims from LLM output (strip markdown fences if present)
                from utils.factcheck_verifier import strip_json_fences
                claims = json.loads(strip_json_fences(extraction_output))
                if not isinstance(claims, list):
                    raise ValueError(f"Expected JSON array of claims, got {type(claims).__name__}")
                logger.info(f"[QA 3/3] Extracted {len(claims)} factual claims for verification")

                if claims:
                    # Step 2: Verify claims using web-grounded evidence
                    from utils.factcheck_verifier import FactCheckVerifier
                    verifier = FactCheckVerifier(api_key=config.google_api_key)
                    results = verifier.verify_claims(claims)

                    # Step 3: Format and save report
                    factcheck_report = verifier.format_report(results)
                    factcheck_path = folders['drafts'] / "qa_factcheck.md"
                    factcheck_path.write_text(factcheck_report, encoding='utf-8')

                    contradicted_count = sum(1 for r in results if r["verdict"] == "CONTRADICTED")
                    supported_count = sum(1 for r in results if r["verdict"] == "SUPPORTED")

                    factcheck_time = time.time() - qa_start
                    logger.info(
                        f"[QA 3/3] ✅ FactCheck complete in {factcheck_time:.1f}s — "
                        f"{len(claims)} claims checked, {supported_count} supported, "
                        f"{contradicted_count} issues found"
                    )
                else:
                    logger.info("[QA 3/3] No factual claims extracted — skipping verification")

                if tracker:
                    tracker.update_phase("writing", progress_percent=80, chapters_count=4, details={"stage": "qa_complete"})

            except json.JSONDecodeError as e:
                logger.warning(f"[QA 3/3] ⚠️  FactCheck claim extraction returned invalid JSON: {e}")
                logger.warning("Continuing without fact-check verification...")
            except Exception as e:
                logger.warning(f"[QA 3/3] ⚠️  FactCheck agent failed: {e}")
                logger.warning("Continuing without fact-check verification...")
        else:
            logger.info("[QA 3/3] FactCheck disabled (enable_factcheck=False) — skipping")
            if tracker:
                tracker.update_phase("writing", progress_percent=80, chapters_count=4, details={"stage": "qa_complete"})

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
            tracker.log_activity("🔧 Starting document compilation", event_type="milestone", phase="compiling")
            tracker.update_phase("compiling", progress_percent=75, details={"stage": "assembling_draft"})
            tracker.check_cancellation()  # Check before starting major phase

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
        # Read appendices from file (handles both generated and skipped cases)
        appendices_file = folders['drafts'] / "04_appendices.md"
        if appendices_file.exists():
            appendix_content = appendices_file.read_text(encoding='utf-8')
            appendix_clean = strip_first_header(appendix_content)
        else:
            appendix_clean = ""

        # Generate current date for cover page
        from datetime import datetime
        current_date = datetime.now().strftime("%B %Y")

        # Combine all sections with YAML frontmatter for cover page
        # Calculate word count for cover page
        draft_text = f"{intro_clean}\n{body_clean}\n{conclusion_clean}\n{appendix_clean}"
        word_count = len(draft_text.split())

        # Calculate pages estimate (250 words per page)
        pages_estimate = word_count // 250

        # Determine draft type label based on academic level
        draft_type_labels = {
            'research_paper': 'Research Paper',
            'bachelor': 'Bachelor Draft',
            'master': 'Master Draft',
            'phd': 'PhD Dissertation'
        }
        draft_type = draft_type_labels.get(academic_level, 'Master Draft')
    
        # Determine degree label
        degree_labels = {
            'research_paper': 'Research Paper',
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

        full_draft = f"""---
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
project_type: "{draft_type}"
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
        if tracker:
            tracker.log_activity("📚 Compiling citations and references...", event_type="info", phase="compiling")
        compiler = CitationCompiler(
            database=citation_database,
            model=model
        )

        # Generate reference list BEFORE compile_citations (while {cite_XXX} patterns still exist)
        reference_list = compiler.generate_reference_list(full_draft)

        # Now compile citations (replaces {cite_XXX} with (Author et al., Year) format)
        compiled_draft, replaced_ids, failed_ids = compiler.compile_citations(full_draft, research_missing=True, verbose=verbose)
        if tracker:
            tracker.log_activity(f"✅ Citations compiled ({len(replaced_ids)} references)", event_type="found", phase="compiling")

        # Remove the entire template References section (header + placeholder) to avoid duplication
        # Account for optional leading whitespace from indented templates
        compiled_draft = re.sub(r'^\s*#+ (?:\d+\.\s*)?References\s*\n\s*\[Citations will be compiled\]\s*', '', compiled_draft, flags=re.MULTILINE)
        # Append the generated reference list with citations
        compiled_draft = compiled_draft + reference_list

        # Save intermediate draft for abstract generation
        intermediate_md_path = folders['exports'] / "INTERMEDIATE_DRAFT.md"
        intermediate_md_path.write_text(compiled_draft, encoding='utf-8')

        # Generate abstract using the agent
        if tracker:
            tracker.log_activity("📝 Generating abstract...", event_type="info", phase="compiling")
        abstract_success, abstract_updated_content = generate_abstract_for_draft(
            draft_path=intermediate_md_path,
            model=model,
            run_agent_func=run_agent,
            output_dir=folders['exports'],
            verbose=verbose
        )
        if tracker:
            tracker.log_activity("✅ Abstract generated", event_type="found", phase="compiling")

        # Read updated draft with abstract
        if abstract_success and abstract_updated_content:
            final_draft = abstract_updated_content
        else:
            # Fallback: use compiled draft without abstract
            final_draft = compiled_draft

        # Generate professional filename from topic
        base_filename = slugify(topic, max_length=50)
        if not base_filename:
            base_filename = "research_paper"

        # Save final markdown
        final_md_path = folders['exports'] / f"{base_filename}.md"
        # Fix single-line tables before saving
        final_draft = fix_single_line_tables(final_draft)
        final_draft = deduplicate_appendices(final_draft)
        final_draft = clean_malformed_markdown(final_draft)
        # Clean AI language patterns (em dashes, overused words)
        from utils.text_utils import clean_ai_language, strip_meta_text, localize_chapter_headings
        final_draft = clean_ai_language(final_draft)
        # Remove any AI-generated meta text (Section:, Word count:, Status:, etc.)
        final_draft = strip_meta_text(final_draft)
        # Localize chapter headings (e.g., "Conclusion" → "Fazit" in German)
        final_draft = localize_chapter_headings(final_draft, language)
        final_md_path.write_text(final_draft, encoding='utf-8')

        if verbose:
            print(f"✅ Draft compiled: {len(final_draft):,} characters")

        # ====================================================================
        # PHASE 5: EXPORT
        # ====================================================================
        if verbose:
            print("\n📄 PHASE 5: EXPORT")

        if tracker:
            tracker.log_activity("📄 Starting document export", event_type="milestone", phase="exporting")
            tracker.update_exporting(export_type="PDF and DOCX")
            tracker.check_cancellation()  # Check before starting major phase

        # Export to PDF with error handling - Professional formatting
        pdf_path = folders['exports'] / f"{base_filename}.pdf"

        if tracker:
            tracker.log_activity("📑 Generating professional PDF document...", event_type="info", phase="exporting")

        if verbose:
            print("📄 Exporting PDF (professional formatting)...")
    
        pdf_success = export_pdf(
            md_file=final_md_path,
            output_pdf=pdf_path,
            engine='pandoc'  # Professional PDF formatting
        )
    
        # If Pandoc fails, draft generation should FAIL (no silent fallback to poor quality)
        if not pdf_success:
            raise RuntimeError("PDF export failed - Professional formatting required!")
    
        if not pdf_success or not pdf_path.exists():
            raise RuntimeError(f"PDF export failed - file not created: {pdf_path}")

        if tracker:
            tracker.log_activity("✅ PDF document ready", event_type="found", phase="exporting")
            tracker.log_activity("📝 Creating Word document...", event_type="info", phase="exporting")

        # Export to DOCX with error handling
        docx_path = folders['exports'] / f"{base_filename}.docx"
        docx_success = export_docx(
            md_file=final_md_path,
            output_docx=docx_path
        )
    
        if not docx_success or not docx_path.exists():
            raise RuntimeError(f"DOCX export failed - file not created: {docx_path}")

        if tracker:
            tracker.log_activity("✅ Word document ready", event_type="found", phase="exporting")

        # Create ZIP bundle with all exports
        zip_path = folders['exports'] / f"{base_filename}.zip"
        try:
            import zipfile
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.write(pdf_path, pdf_path.name)
                zf.write(docx_path, docx_path.name)
                zf.write(final_md_path, final_md_path.name)
            if tracker:
                tracker.log_activity("📦 ZIP bundle created", event_type="found", phase="exporting")
        except Exception as zip_error:
            logger.warning(f"ZIP creation failed (non-critical): {zip_error}")

        if tracker:
            tracker.log_activity("✅ Word document generated", event_type="found", phase="exporting")
            tracker.log_activity("🎉 Thesis generation complete!", event_type="milestone", phase="completed")

        if verbose:
            print(f"✅ Exported PDF: {pdf_path}")
            print(f"✅ Exported DOCX: {docx_path}")
            print(f"📂 Output folder: {output_dir}")
            print("="*70)
            print("✅ DRAFT GENERATION COMPLETE")
            print("="*70)
            print("\n💡 Open the folder in Cursor to refine your draft!")
            print(f"   cursor {output_dir}")

        if tracker:
            tracker.mark_completed()

        # ====================================================================
        # DRAFT GENERATION COMPLETE
        # ====================================================================
        draft_total_time = time.time() - draft_start_time
        logger.info("="*80)
        logger.info("DRAFT GENERATION COMPLETE!")
        logger.info("="*80)
        logger.info(f"Total time: {draft_total_time:.1f}s ({draft_total_time/60:.1f} minutes)")
        logger.info(f"PDF: {pdf_path}")
        logger.info(f"DOCX: {docx_path}")
        logger.info(f"PDF size: {pdf_path.stat().st_size:,} bytes ({pdf_path.stat().st_size/1024/1024:.1f} MB)")
        logger.info(f"DOCX size: {docx_path.stat().st_size:,} bytes ({docx_path.stat().st_size/1024/1024:.1f} MB)")
        log_memory_usage("Final")
        logger.info("="*80)

        return pdf_path, docx_path

    except Exception as e:
        draft_total_time = time.time() - draft_start_time
        logger.error("="*80)
        logger.error("DRAFT GENERATION FAILED!")
        logger.error("="*80)
        logger.error(f"Failed after {draft_total_time:.1f}s ({draft_total_time/60:.1f} minutes)")
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

    parser = argparse.ArgumentParser(description="Generate academic draft")

    # Required arguments
    parser.add_argument("--topic", required=True, help="Draft topic")
    parser.add_argument("--language", default="en", help="Language code (e.g., en-US, en-GB, de, es, fr, etc.)")
    parser.add_argument("--academic-level", default="master", choices=["research_paper", "bachelor", "master", "phd"], help="Academic level")

    # Database integration (optional - for direct execution from Next.js)
    parser.add_argument("--draft-id", help="Database draft ID for progress tracking")
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

    # Initialize database tracker if draft_id provided
    tracker = None
    if args.draft_id:
        from utils.progress_tracker import ProgressTracker
        tracker = ProgressTracker(draft_id=args.draft_id)
        print(f"✅ Database tracking enabled for draft: {args.draft_id}")

    try:
        # Generate draft
        pdf, docx = generate_draft(
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
