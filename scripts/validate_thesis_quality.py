#!/usr/bin/env python3
"""
ABOUTME: Quality gate - validate thesis is publication-ready before marking as FINAL
ABOUTME: Checks for [VERIFY], [MISSING], {cite_MISSING} markers, and required sections
ABOUTME: Implements graduated quality gates (PASS/WARNING/CRITICAL) instead of binary pass/fail
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple, Dict
from enum import Enum


class QualityLevel(Enum):
    """Quality assessment levels for graduated response."""
    PASS = "pass"  # No issues or minor issues - thesis is production-ready
    WARNING = "warning"  # Non-critical issues - thesis functional but has minor gaps
    CRITICAL = "critical"  # Critical issues - thesis not production-ready


def check_verify_markers(content: str) -> Tuple[int, List[str]]:
    """
    Find all [VERIFY] placeholders in content.

    Returns:
        (count, list of examples)
    """
    pattern = r'\[VERIFY[^\]]*\]'
    matches = re.findall(pattern, content, re.IGNORECASE)

    # Get unique examples (max 10)
    unique_examples = list(set(matches))[:10]

    return len(matches), unique_examples


def check_missing_citations(content: str) -> Tuple[int, List[str]]:
    """
    Find {cite_MISSING:...} placeholders.

    Returns:
        (count, list of topics)
    """
    pattern = r'\{cite_MISSING:([^}]+)\}'
    matches = re.findall(pattern, content)

    return len(matches), matches[:10]


def check_missing_bracket_markers(content: str) -> Tuple[int, List[str]]:
    """
    Find [MISSING: ...] placeholders.

    These are created when Scout agent fails to research citations.
    They're just as critical as [VERIFY] markers.

    Returns:
        (count, list of examples)
    """
    pattern = r'\[MISSING:([^\]]+)\]'
    matches = re.findall(pattern, content)

    # Get unique examples (max 10)
    unique_examples = list(set(matches))[:10]

    return len(matches), unique_examples


def check_required_sections(content: str) -> Dict[str, bool]:
    """
    Check if thesis has all required sections (multilingual support).

    Supports English, German, Spanish, French section names.
    Handles both numbered (e.g., "# 3. Methodology") and non-numbered (e.g., "## Methodology") sections.

    Returns:
        Dict of section_name: present (bool)
    """
    # FIXED (Bug #13): Added (\d+\.?\s*)? to match optional numbered sections
    # FIXED (Bug #18): Extended regex to handle Roman numerals, Chapter prefixes, and various numbering formats
    # Examples:
    #   - Plain: "# Methodology"
    #   - Numbered: "# 3. Methodology", "## 3.1 Methodology"
    #   - Roman numerals: "# I. Introduction", "# IV. Methodology"
    #   - Chapter prefix: "# Chapter 1: Methodology", "# Kapitel 3: Methodik"
    #   - Mixed: "# Chapter I: Introduction"

    # Comprehensive number prefix pattern (handles Arabic, Roman, Chapter prefix)
    # (?:...) = non-capturing group
    # (Chapter|Kapitel|Capítulo|Chapitre)?\s* = optional chapter prefix
    # ([IVXLCDM]+|\d+)\.?\s* = Roman numerals OR Arabic numbers, optional dot
    # [:\-]?\s* = optional colon or dash separator
    number_prefix = r'((?:Chapter|Kapitel|Cap[íi]tulo|Chapitre)?\s*([IVXLCDM]+|\d+)[\.:;\-]?\s*)?'

    sections = {
        'Abstract': rf'#+\s*{number_prefix}(Abstract|Zusammenfassung|Resumen|Résumé)',
        'Introduction': rf'#+\s*{number_prefix}(Introduction|Einleitung|Introducción)',
        'Literature Review': rf'#+\s*{number_prefix}(Literature Review|Literaturübersicht|Literaturüberblick|Revisión de Literatura|Revue de Littérature)',
        'Methodology': rf'#+\s*{number_prefix}(Methodology|Method|Methodik|Metodología|Méthodologie)',
        'References': rf'#+\s*{number_prefix}(References|Literaturverzeichnis|Bibliografie|Bibliografia|Références)',
    }

    results = {}
    for section_name, pattern in sections.items():
        results[section_name] = bool(re.search(pattern, content, re.IGNORECASE))

    return results


def calculate_quality_level(
    verify_count: int,
    missing_count: int,
    missing_bracket_count: int,
    missing_sections: List[str],
    word_count: int
) -> QualityLevel:
    """
    Calculate quality level using graduated thresholds.

    Thresholds (relaxed for production resilience):
    - CRITICAL: Any of:
        * Missing 3+ required sections (e.g., Abstract, Introduction, References)
        * 50+ [MISSING: ...] markers (>5% for 1000-citation thesis)
        * Word count < 4000 (severely incomplete)

    - WARNING: Any of:
        * 1-2 missing required sections
        * 1-10 [VERIFY] placeholders (minor citation gaps)
        * 1-49 [MISSING: ...] markers (<5% for 1000-citation thesis)
        * 1-20 {cite_MISSING:...} placeholders
        * Word count 4000-8000 (below ideal but functional)

    - PASS: All of:
        * All required sections present
        * 0 [VERIFY] placeholders OR <1 [VERIFY] marker
        * 0 [MISSING] markers
        * 0 {cite_MISSING} placeholders
        * Word count >= 8000

    Returns:
        QualityLevel enum (PASS, WARNING, or CRITICAL)
    """
    # CRITICAL checks (block thesis generation)
    if len(missing_sections) >= 3:
        return QualityLevel.CRITICAL

    if missing_bracket_count >= 50:
        return QualityLevel.CRITICAL

    if word_count < 4000:
        return QualityLevel.CRITICAL

    # WARNING checks (allow thesis but flag issues)
    if len(missing_sections) >= 1:
        return QualityLevel.WARNING

    if 1 <= verify_count <= 10:
        return QualityLevel.WARNING

    if 1 <= missing_bracket_count <= 49:
        return QualityLevel.WARNING

    if 1 <= missing_count <= 20:
        return QualityLevel.WARNING

    if 4000 <= word_count < 8000:
        return QualityLevel.WARNING

    # PASS - all checks passed
    return QualityLevel.PASS


def validate_thesis(file_path: Path, verbose: bool = True) -> bool:
    """
    Validate thesis using graduated quality gates.

    Quality Levels:
    - PASS: No issues or very minor issues (1-2 [VERIFY] markers)
    - WARNING: Non-critical issues present but thesis is functional
    - CRITICAL: Severe issues that block production deployment

    Returns:
        True if PASS or WARNING (thesis is usable), False if CRITICAL (thesis blocked)
    """
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return False

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if verbose:
        print(f"\n{'='*70}")
        print(f"📋 THESIS QUALITY VALIDATION: {file_path.name}")
        print(f"{'='*70}\n")

    # Run all checks
    verify_count, verify_examples = check_verify_markers(content)
    missing_count, missing_topics = check_missing_citations(content)
    missing_bracket_count, missing_bracket_examples = check_missing_bracket_markers(content)
    sections = check_required_sections(content)
    missing_sections = [name for name, present in sections.items() if not present]
    word_count = len(content.split())

    # Calculate quality level
    quality = calculate_quality_level(
        verify_count,
        missing_count,
        missing_bracket_count,
        missing_sections,
        word_count
    )

    # Print detailed results if verbose
    if verbose:
        # [VERIFY] markers
        if verify_count > 0:
            symbol = "⚠️ " if quality == QualityLevel.WARNING else "❌"
            print(f"{symbol} Found {verify_count} [VERIFY] placeholders")
            print(f"   Examples:")
            for example in verify_examples[:5]:
                print(f"   - {example}")
            print()
        else:
            print(f"✅ No [VERIFY] markers found")

        # {cite_MISSING:...} placeholders
        if missing_count > 0:
            symbol = "⚠️ " if quality == QualityLevel.WARNING else "❌"
            print(f"{symbol} Found {missing_count} missing citations {{cite_MISSING:...}}")
            print(f"   Topics:")
            for topic in missing_topics[:5]:
                print(f"   - {topic}")
            print()
        else:
            print(f"✅ No missing citation placeholders")

        # [MISSING: ...] markers
        if missing_bracket_count > 0:
            symbol = "⚠️ " if quality == QualityLevel.WARNING else "❌"
            print(f"{symbol} Found {missing_bracket_count} [MISSING: ...] markers (Scout agent failures)")
            print(f"   Examples:")
            for example in missing_bracket_examples[:5]:
                print(f"   - [MISSING: {example}]")
            print()
        else:
            print(f"✅ No [MISSING] bracket markers")

        # Required sections
        if missing_sections:
            symbol = "⚠️ " if quality == QualityLevel.WARNING else "❌"
            print(f"{symbol} Missing required sections: {', '.join(missing_sections)}")
        else:
            print(f"✅ All required sections present")

        # Word count statistics
        print(f"\n📊 Statistics:")
        print(f"   - Word count: {word_count:,}")
        print(f"   - Character count: {len(content):,}")

        if word_count < 8000:
            print(f"⚠️  Warning: Word count below 8,000 (academic minimum)")

        # Final verdict with quality level
        print(f"\n{'='*70}")
        if quality == QualityLevel.PASS:
            print("✅ THESIS IS PRODUCTION-READY (PASS)")
            print("   All quality checks passed. Safe to deploy.")
        elif quality == QualityLevel.WARNING:
            print("⚠️  THESIS IS USABLE WITH WARNINGS (WARNING)")
            print("   Non-critical issues detected. Thesis is functional but has minor gaps.")
            print("\nRecommended improvements:")
            action_num = 1
            if verify_count > 0:
                print(f"  {action_num}. Fill {verify_count} [VERIFY] placeholders with proper citations")
                action_num += 1
            if missing_count > 0:
                print(f"  {action_num}. Research and add {missing_count} {{cite_MISSING:...}} citations")
                action_num += 1
            if missing_bracket_count > 0:
                print(f"  {action_num}. Research and add {missing_bracket_count} [MISSING: ...] citations")
                action_num += 1
            if missing_sections:
                print(f"  {action_num}. Add missing sections: {', '.join(missing_sections)}")
        else:  # CRITICAL
            print("❌ THESIS NOT PRODUCTION-READY (CRITICAL)")
            print("   Critical issues must be resolved before deployment.")
            print("\nAction required:")
            action_num = 1
            if len(missing_sections) >= 3:
                print(f"  {action_num}. Add {len(missing_sections)} missing required sections: {', '.join(missing_sections)}")
                action_num += 1
            if missing_bracket_count >= 50:
                print(f"  {action_num}. Fix {missing_bracket_count} [MISSING: ...] citation failures (Scout agent)")
                action_num += 1
            if word_count < 4000:
                print(f"  {action_num}. Expand thesis to minimum 4000 words (currently {word_count:,})")
        print(f"{'='*70}\n")

    # Return True for PASS and WARNING, False for CRITICAL
    return quality in [QualityLevel.PASS, QualityLevel.WARNING]


def main():
    """Validate thesis files from command line."""
    import argparse

    parser = argparse.ArgumentParser(description='Validate thesis quality')
    parser.add_argument('file', type=Path, help='Thesis file to validate')
    parser.add_argument('--quiet', action='store_true', help='Minimal output')

    args = parser.parse_args()

    is_valid = validate_thesis(args.file, verbose=not args.quiet)

    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
