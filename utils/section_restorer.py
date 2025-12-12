#!/usr/bin/env python3
"""
ABOUTME: Post-enhancement section restoration utility to fix LLM non-compliance
ABOUTME: Detects and restores critical sections removed by Enhancement agent
"""

import re
from typing import Dict, List, Tuple, Optional
from pathlib import Path


def detect_missing_sections(
    enhanced_text: str, language: str = "english"
) -> List[str]:
    """
    Detect critical sections missing from enhanced draft.

    FIXED: Content-aware detection - checks for ACTUAL content, not just headers.
    Checks universal patterns (all languages) to catch English "## References"
    even when language="german".

    Args:
        enhanced_text: Enhanced draft content
        language: Draft language (english/german/spanish/french)

    Returns:
        List of missing section names
    """
    missing = []

    # Define section patterns - checking BOTH language-specific AND universal patterns
    # This fixes the blind spot where German theses had English "## References"
    language_patterns = {
        "english": {
            "Introduction": r"^#+\s+(?:\d+\.?\s+)?Introduction\s*$",
            "Literature Review": r"^#+\s+(?:\d+\.?\s+)?Literature\s+Review\s*$",
            "References": r"^#+\s+References\s*$",
        },
        "german": {
            "Introduction": r"^#+\s+(?:\d+\.?\s+)?Einleitung\s*$",
            "Literature Review": r"^#+\s+(?:\d+\.?\s+)?Literaturübersicht\s*$",
            "References": r"^#+\s+(?:Literaturverzeichnis|Referenzen)\s*$",
        },
        "spanish": {
            "Introduction": r"^#+\s+(?:\d+\.?\s+)?Introducción\s*$",
            "Literature Review": r"^#+\s+(?:\d+\.?\s+)?Revisión de Literatura\s*$",
            "References": r"^#+\s+Bibliografía\s*$",
        },
        "french": {
            "Introduction": r"^#+\s+(?:\d+\.?\s+)?Introduction\s*$",
            "Literature Review": r"^#+\s+(?:\d+\.?\s+)?Revue de Littérature\s*$",
            "References": r"^#+\s+Références\s*$",
        },
    }

    # CRITICAL FIX: Universal References patterns (check ALL, regardless of language)
    # This catches English "## References" even in German theses
    universal_references_patterns = [
        r'^#+\s+References\s*$',
        r'^#+\s+Bibliography\s*$',
        r'^#+\s+Literaturverzeichnis\s*$',
        r'^#+\s+Referenzen\s*$',
        r'^#+\s+Bibliografía\s*$',
        r'^#+\s+Références\s*$',
    ]

    sections_to_check = language_patterns.get(language, language_patterns["english"])

    for section_name, pattern in sections_to_check.items():
        # Check language-specific pattern first
        header_found = bool(re.search(pattern, enhanced_text, re.MULTILINE | re.IGNORECASE))

        # For References, also check ALL universal patterns
        if section_name == "References" and not header_found:
            header_found = any(
                re.search(p, enhanced_text, re.MULTILINE | re.IGNORECASE)
                for p in universal_references_patterns
            )

        if header_found:
            # CRITICAL: Header exists, but does it have CONTENT?
            if section_name == "References":
                has_content = _section_has_citation_content(
                    text=enhanced_text,
                    patterns=universal_references_patterns if section_name == "References" else [pattern]
                )

                if not has_content:
                    # Placeholder detected - section is "missing" (needs restoration)
                    missing.append(section_name)
            # For other sections, header existence is enough
        else:
            # No header found at all
            missing.append(section_name)

    return missing


def _section_has_citation_content(text: str, patterns: List[str]) -> bool:
    """
    Check if References/Bibliography section has actual citations (not placeholder).

    Args:
        text: Full draft text
        patterns: List of header patterns to check

    Returns:
        True if section has real citations, False if placeholder or empty
    """
    for pattern in patterns:
        match = re.search(
            pattern + r'\s*\n+(.*?)(?=\n##|\Z)',
            text,
            re.MULTILINE | re.IGNORECASE | re.DOTALL
        )

        if match:
            section_content = match.group(1).strip()

            # Check for placeholders
            placeholder_indicators = [
                r'\[(?:Wird automatisch generiert|To be completed|A generar|À compléter)\]',
                r'^\s*$',  # Empty
                r'^\(No citations',
            ]

            is_placeholder = any(
                re.search(ind, section_content, re.IGNORECASE)
                for ind in placeholder_indicators
            )

            if is_placeholder:
                return False  # Placeholder, not real content

            # Check for actual citation indicators
            citation_indicators = [
                r'https?://doi\.org/',  # DOI URLs
                r'\(\d{4}\)',  # Year in parentheses
                r'et al\.',  # Author formatting
                r'&',  # Author separators
                r'\*\w+\*',  # Italics (journal names)
            ]

            has_citations = any(
                re.search(ind, section_content)
                for ind in citation_indicators
            )

            return has_citations  # Has actual citations

    # No section found with any of the patterns
    return False


def extract_section(
    text: str, section_pattern: str, next_section_pattern: Optional[str] = None
) -> Optional[str]:
    """
    Extract a section from markdown text.

    Args:
        text: Full markdown text
        section_pattern: Regex pattern for section header
        next_section_pattern: Regex for next section (to find end boundary)

    Returns:
        Extracted section content (including header) or None
    """
    # Find section start
    section_match = re.search(section_pattern, text, re.MULTILINE | re.IGNORECASE)
    if not section_match:
        return None

    section_start = section_match.start()

    # Find section end (next same-level or higher header, or end of text)
    # Determine section level from the match
    header_line = section_match.group(0)
    section_level = len(re.match(r"^#+", header_line).group(0))

    # Pattern for same or higher level headers
    end_pattern = rf"^#{{1,{section_level}}}\s+"

    # Search for next section after current one
    remaining_text = text[section_match.end() :]
    end_match = re.search(end_pattern, remaining_text, re.MULTILINE)

    if end_match:
        section_end = section_start + section_match.end() - section_match.start() + end_match.start()
    else:
        section_end = len(text)

    return text[section_start:section_end].strip()


def restore_missing_sections(
    enhanced_text: str,
    pre_enhancement_text: str,
    language: str = "english",
    verbose: bool = True,
) -> Tuple[str, List[str]]:
    """
    Restore critical sections removed by Enhancement agent.

    This function implements a defensive fix for LLM non-compliance where
    the Enhancement agent removes sections despite explicit instructions
    to keep them unchanged.

    Args:
        enhanced_text: Enhanced draft (may have missing sections)
        pre_enhancement_text: Original draft before enhancement
        language: Draft language
        verbose: Print restoration progress

    Returns:
        Tuple of (restored_text, list_of_restored_sections)
    """
    missing_sections = detect_missing_sections(enhanced_text, language)

    if not missing_sections:
        if verbose:
            print("✅ No missing sections detected - enhancement preserved all content")
        return enhanced_text, []

    if verbose:
        print(f"⚠️  Detected {len(missing_sections)} missing sections: {', '.join(missing_sections)}")
        print("🔧 Restoring sections from pre-enhancement version...")

    restored = enhanced_text
    restored_sections = []

    # Define extraction patterns
    patterns = {
        "english": {
            "Introduction": r"^#+\s+(?:\d+\.?\s+)?Introduction\s*$",
            "Literature Review": r"^#+\s+(?:\d+\.?\s+)?Literature\s+Review\s*$",
            "References": r"^#+\s+References\s*$",
        },
        "german": {
            "Introduction": r"^#+\s+(?:\d+\.?\s+)?Einleitung\s*$",
            "Literature Review": r"^#+\s+(?:\d+\.?\s+)?Literaturübersicht\s*$",
            "References": r"^#+\s+(?:Literaturverzeichnis|Referenzen)\s*$",
        },
    }

    section_patterns = patterns.get(language, patterns["english"])

    for section_name in missing_sections:
        pattern = section_patterns.get(section_name)
        if not pattern:
            continue

        # Extract section from pre-enhancement text
        section_content = extract_section(pre_enhancement_text, pattern)

        if section_content:
            # Determine where to insert the section
            if section_name == "References":
                # Append References at the end
                restored = restored.rstrip() + "\n\n" + section_content + "\n"
            elif section_name == "Introduction":
                # Insert after Abstract (find end of abstract, insert before next section)
                abstract_end = re.search(
                    r"^#+\s+(?:\d+\.?\s+)?(?!Abstract)[A-Z]", restored, re.MULTILINE
                )
                if abstract_end:
                    insert_pos = abstract_end.start()
                    restored = (
                        restored[:insert_pos]
                        + section_content
                        + "\n\n"
                        + restored[insert_pos:]
                    )
                else:
                    # Fallback: insert after YAML/Abstract
                    restored = section_content + "\n\n" + restored
            elif section_name == "Literature Review":
                # Insert after Introduction
                intro_pattern = patterns[language].get(
                    "Introduction", r"^#+\s+(?:\d+\.?\s+)?Introduction\s*$"
                )
                intro_section = extract_section(restored, intro_pattern)
                if intro_section:
                    intro_end = restored.find(intro_section) + len(intro_section)
                    restored = (
                        restored[:intro_end]
                        + "\n\n"
                        + section_content
                        + "\n\n"
                        + restored[intro_end:]
                    )

            restored_sections.append(section_name)
            if verbose:
                print(f"  ✓ Restored: {section_name}")

    if verbose and restored_sections:
        print(
            f"✅ Successfully restored {len(restored_sections)}/{len(missing_sections)} sections"
        )

    return restored, restored_sections


def restore_sections_in_file(
    enhanced_path: Path,
    pre_enhancement_path: Path,
    language: str = "english",
    verbose: bool = True,
) -> bool:
    """
    Restore missing sections in an enhanced draft file.

    Args:
        enhanced_path: Path to enhanced draft (will be modified in-place)
        pre_enhancement_path: Path to pre-enhancement version
        language: Draft language
        verbose: Print progress

    Returns:
        True if sections were restored, False otherwise
    """
    # Read both versions
    with open(enhanced_path, "r", encoding="utf-8") as f:
        enhanced_text = f.read()

    with open(pre_enhancement_path, "r", encoding="utf-8") as f:
        pre_enhancement_text = f.read()

    # Restore missing sections
    restored_text, restored_sections = restore_missing_sections(
        enhanced_text, pre_enhancement_text, language, verbose
    )

    # Write back if changes were made
    if restored_sections:
        with open(enhanced_path, "w", encoding="utf-8") as f:
            f.write(restored_text)
        return True

    return False
