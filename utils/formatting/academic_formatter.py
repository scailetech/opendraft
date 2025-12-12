#!/usr/bin/env python3
"""
ABOUTME: Unified academic document formatting following APA 7th Edition
ABOUTME: Provides consistent formatting logic across PDF, DOCX, and HTML exports

This module implements the Single Responsibility and DRY principles by centralizing
all formatting decisions (cover pages, hyperlinks, styling) in one place.

Previously, formatting logic was duplicated across:
- PDF: pandoc_engine.py (220+ lines of LaTeX preamble)
- DOCX: docx_postprocessor.py (partial fixes)
- HTML: (inconsistent implementation)

Now: All formats use this unified formatter for consistent output.
"""

import re
from typing import Dict, Any, List, Optional
from pathlib import Path


class AcademicDocumentFormatter:
    """
    Unified formatting logic for academic documents.

    Provides consistent formatting across PDF, DOCX, and HTML exports following
    APA 7th Edition guidelines.

    Design Principles:
    - Single Responsibility: Formatting decisions only
    - Open/Closed: Easy to extend with new format types
    - DRY: No duplication of formatting logic across engines
    """

    # Showcase-specific YAML fields that indicate this is an AI-generated showcase
    # (not a traditional academic draft requiring formal cover page)
    SHOWCASE_FIELDS = {
        'subtitle', 'system_creator', 'github_repo', 'quality_score',
        'word_count', 'citations_verified', 'visual_elements',
        'generation_method', 'showcase_description', 'system_capabilities',
        'call_to_action', 'license'
    }

    def __init__(self, verbose: bool = False):
        """
        Initialize formatter.

        Args:
            verbose: Enable verbose logging
        """
        self.verbose = verbose

    def is_showcase_draft(self, yaml_metadata: Dict[str, Any]) -> bool:
        """
        Determine if draft is an AI showcase (vs traditional academic draft).

        Showcase theses have rich YAML frontmatter with system metadata
        (subtitle, github_repo, quality_score, etc.) that serves as the cover page.
        Traditional theses have minimal YAML (just title, author, date).

        Args:
            yaml_metadata: YAML frontmatter dictionary

        Returns:
            True if showcase draft, False if traditional academic draft
        """
        if not yaml_metadata:
            return False

        # Check if ANY showcase fields are present
        yaml_keys = set(yaml_metadata.keys())
        has_showcase_fields = bool(yaml_keys & self.SHOWCASE_FIELDS)

        if self.verbose and has_showcase_fields:
            found_fields = yaml_keys & self.SHOWCASE_FIELDS
            print(f"   ℹ️  Showcase draft detected (fields: {', '.join(found_fields)})")

        return has_showcase_fields

    def should_generate_traditional_cover(self, yaml_metadata: Dict[str, Any]) -> bool:
        """
        Determine if traditional academic cover page should be auto-generated.

        Decision Logic:
        - Showcase theses: NO cover page (YAML frontmatter IS the cover)
        - Traditional theses: YES cover page (from title/author/date/institution)

        This prevents double cover pages where both YAML and LaTeX \\maketitle
        create competing title presentations.

        Args:
            yaml_metadata: YAML frontmatter dictionary

        Returns:
            True if traditional cover should be generated, False otherwise
        """
        is_showcase = self.is_showcase_draft(yaml_metadata)

        # Showcase theses: YAML frontmatter is the cover, don't generate another
        if is_showcase:
            if self.verbose:
                print("   ✓ Skipping traditional cover page (showcase YAML is the cover)")
            return False

        # Traditional theses: Generate cover if we have title/author
        # CRITICAL: Handle empty YAML (yaml.safe_load returns None, not {})
        has_basic_metadata = (yaml_metadata.get('title') or yaml_metadata.get('author')) if yaml_metadata else False

        if has_basic_metadata and self.verbose:
            print("   ✓ Generating traditional academic cover page")

        return has_basic_metadata

    # REMOVED: Dead code - filter_showcase_yaml_for_latex() was never called
    # YAML normalization is handled by _normalize_yaml_for_pandoc() in pandoc_engine.py
    # This method was defined but unused (32 lines removed)

    def extract_doi_urls(self, content: str) -> List[Dict[str, str]]:
        """
        Extract all DOI URLs from content.

        Finds patterns like:
        - https://doi.org/10.1234/example
        - http://doi.org/10.5678/test

        Args:
            content: Document content (markdown or plain text)

        Returns:
            List of dicts with 'url' and 'context' (surrounding text)
        """
        doi_pattern = r'https?://doi\.org/[^\s\)]+'
        matches = []

        for match in re.finditer(doi_pattern, content):
            url = match.group(0)
            # Get surrounding context (50 chars before/after)
            start = max(0, match.start() - 50)
            end = min(len(content), match.end() + 50)
            context = content[start:end]

            matches.append({
                'url': url,
                'context': context.strip(),
                'start_pos': match.start(),
                'end_pos': match.end()
            })

        return matches

    def extract_generic_urls(self, content: str) -> List[Dict[str, str]]:
        """
        Extract all generic URLs from content (non-DOI).

        Finds patterns like:
        - https://example.com/page
        - http://test.org/path

        Args:
            content: Document content

        Returns:
            List of dicts with 'url' and 'context'
        """
        # URL pattern excluding DOI URLs
        url_pattern = r'https?://(?!doi\.org)[^\s\)]+'
        matches = []

        for match in re.finditer(url_pattern, content):
            url = match.group(0)
            start = max(0, match.start() - 50)
            end = min(len(content), match.end() + 50)
            context = content[start:end]

            matches.append({
                'url': url,
                'context': context.strip(),
                'start_pos': match.start(),
                'end_pos': match.end()
            })

        return matches

    def validate_hyperlinks_present(self, content: str) -> Dict[str, Any]:
        """
        Validate that URLs are present in content.

        This doesn't check if they're clickable (format-specific),
        just that URL text exists in the document.

        Args:
            content: Document content

        Returns:
            Dict with validation results
        """
        doi_urls = self.extract_doi_urls(content)
        generic_urls = self.extract_generic_urls(content)

        total_urls = len(doi_urls) + len(generic_urls)

        return {
            'has_urls': total_urls > 0,
            'doi_count': len(doi_urls),
            'generic_url_count': len(generic_urls),
            'total_urls': total_urls,
            'doi_urls': doi_urls[:5],  # Sample of first 5
            'generic_urls': generic_urls[:5]
        }

    def get_apa_7th_style_config(self) -> Dict[str, Any]:
        """
        Get APA 7th Edition style configuration.

        Returns formatting parameters for:
        - Line spacing (2.0 / double-spaced)
        - First-line indent (0.5 inches)
        - Heading styles (Level 1-5)
        - Page numbering (Roman for front matter, Arabic for body)
        - Reference list formatting

        Returns:
            Configuration dictionary
        """
        return {
            'line_spacing': 2.0,
            'first_line_indent': '0.5in',
            'page_number_position': 'top-right',
            'front_matter_numbering': 'roman',
            'body_numbering': 'arabic',
            'headings': {
                'level1': {'bold': True, 'centered': True, 'size': 'large'},
                'level2': {'bold': True, 'centered': False, 'size': 'normal'},
                'level3': {'bold': True, 'italic': True, 'centered': False, 'size': 'normal'},
                'level4': {'bold': True, 'italic': False, 'centered': False, 'size': 'normal', 'indent': '0.5in'},
                'level5': {'bold': False, 'italic': True, 'centered': False, 'size': 'normal', 'indent': '0.5in'},
            },
            'references': {
                'hanging_indent': '0.5in',
                'line_spacing': 2.0,
                'alignment': 'left'
            }
        }


# Convenience functions for common operations

def should_generate_cover_page(yaml_metadata: Dict[str, Any]) -> bool:
    """
    Convenience function to determine if cover page should be generated.

    Args:
        yaml_metadata: YAML frontmatter

    Returns:
        True if traditional cover should be generated
    """
    formatter = AcademicDocumentFormatter()
    return formatter.should_generate_traditional_cover(yaml_metadata)


# REMOVED: Dead code - filter_yaml_for_latex() was never called
# Convenience wrapper for removed method (9 lines removed)
