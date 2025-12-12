#!/usr/bin/env python3
"""
Output Sanitizer Utility - Production-Grade Implementation

SOLID Principles:
- Single Responsibility: Only handles output sanitization and validation
- Open/Closed: Extensible for new sanitization rules without modification
- Interface Segregation: Clean function interface
- Dependency Inversion: Depends on abstractions (no hard dependencies)

DRY Principle:
- Reusable by all enhancement scripts
- Centralized logic for output cleaning and validation

Purpose:
Fixes 4 critical bugs in Agent #15 (Enhancer) output:
1. Table corruption (633K+ spaces in cells)
2. Message leakage (agent instructions in final output)
3. File bloat (1.8MB corrupted files vs 80-100KB clean)
4. PDF cut-offs (malformed tables breaking PDF renderers)
"""

import re
from pathlib import Path
from typing import Tuple, List, Optional


# ============================================================================
# CONFIGURATION
# ============================================================================

MAX_TABLE_CELL_LENGTH = 500  # chars per table cell
MAX_OUTPUT_FILE_SIZE = 300_000  # bytes (~300KB warning threshold)
TARGET_FILE_SIZE = 200_000  # bytes (~200KB target)

META_COMMENT_PATTERNS = [
    r'^(Here is|Hier ist|This is|I have generated).*?(enhanced|verbessert|draft|Arbeit).*?\n+',
    r'^\*\*Note:\*\*.*?(generated|erstellt|AI|agent).*?\n+',
    r'^\[.*?(Agent|LLM|generated|auto).*?\].*?\n+',
    # NEW: Remove section metadata pollution from Crafter/Enhancer agents (inline)
    r'^\*\*Section:\*\*.*?\n',           # Remove **Section:** lines
    r'^\*\*Word Count:\*\*.*?\n',        # Remove **Word Count:** lines
    r'^\*\*Status:\*\*.*?\n',            # Remove **Status:** lines
    r'^\*\*Abschnitt:\*\*.*?\n',         # Remove **Abschnitt:** (German)
    r'^\*\*Wortzahl:\*\*.*?\n',          # Remove **Wortzahl:** (German)
    r'^\*\*Sección:\*\*.*?\n',           # Remove **Sección:** (Spanish)
    r'^\*\*Recuento de palabras:\*\*.*?\n',  # Remove **Recuento:** (Spanish)
    r'^\[To be completed.*?\].*?\n',     # Remove placeholder citations
    # NEW: Remove Entropy agent inline diagnostic text
    r'^Diversity Metrics\s*\n',          # Inline "Diversity Metrics" without ##
    r'^Sentence Length Distribution\s*\n',  # Inline sentence distribution
    r'^Before:.*?(?:too uniform|too consistent|too many|monotonous).*?\n',  # "Before:" diagnostic lines
    r'^After:.*?(?:natural variation|varied|good).*?\n',  # "After:" diagnostic lines
    r'^Lexical Diversity.*?TTR.*?\n',    # TTR metrics
    r'^Sentence Structure Variety\s*\n', # Structure variety heading
]

# ============================================================================
# CORE SANITIZATION FUNCTIONS
# ============================================================================

def truncate_table_cells(content: str, max_length: int = MAX_TABLE_CELL_LENGTH) -> Tuple[str, int]:
    """
    Fix table corruption by truncating oversized cells.

    Args:
        content: Full draft markdown content
        max_length: Maximum characters allowed per table cell

    Returns:
        Tuple of (sanitized_content, num_cells_truncated)
    """
    truncated_count = 0
    lines = content.split('\n')
    sanitized_lines = []

    for line in lines:
        # Detect markdown table lines (contain | separators)
        if '|' in line and not line.strip().startswith('#'):
            cells = line.split('|')
            sanitized_cells = []

            for cell in cells:
                cell_content = cell.strip()

                # Truncate if over max length
                if len(cell_content) > max_length:
                    truncated_count += 1
                    # Keep first 450 chars + ellipsis
                    cell_content = cell_content[:max_length - 50] + "... [truncated]"

                # Preserve original spacing structure
                if cell.startswith(' '):
                    sanitized_cells.append(' ' + cell_content + ' ')
                else:
                    sanitized_cells.append(cell_content)

            sanitized_line = '|'.join(sanitized_cells)
            sanitized_lines.append(sanitized_line)
        else:
            sanitized_lines.append(line)

    sanitized_content = '\n'.join(sanitized_lines)
    return sanitized_content, truncated_count


def remove_meta_comments(content: str) -> Tuple[str, int]:
    """
    Remove agent meta-comments and instructions from output.

    Args:
        content: Full draft markdown content

    Returns:
        Tuple of (cleaned_content, num_comments_removed)
    """
    removed_count = 0
    cleaned_content = content

    for pattern in META_COMMENT_PATTERNS:
        matches = re.findall(pattern, cleaned_content, re.MULTILINE | re.IGNORECASE)
        removed_count += len(matches)
        cleaned_content = re.sub(pattern, '', cleaned_content, flags=re.MULTILINE | re.IGNORECASE)

    return cleaned_content, removed_count


def remove_metadata_h2_sections(content: str) -> Tuple[str, int]:
    """
    Remove H2 metadata sections like '## Citations Used', '## Notes for Revision', etc.

    These sections are internal tracking artifacts that should not appear in final output.

    Args:
        content: Full draft markdown content

    Returns:
        Tuple of (cleaned_content, num_sections_removed)
    """
    sections_removed = 0

    # Patterns for H2 metadata sections (English + German + Spanish)
    h2_metadata_patterns = [
        r'^## Citations Used\s*\n(?:.*?\n)*?(?=^##|\Z)',  # English
        r'^## Verwendete Zitate\s*\n(?:.*?\n)*?(?=^##|\Z)',  # German
        r'^## Citas utilizadas\s*\n(?:.*?\n)*?(?=^##|\Z)',  # Spanish
        r'^## Notes for Revision\s*\n(?:.*?\n)*?(?=^##|\Z)',  # English
        r'^## Hinweise zur Überarbeitung\s*\n(?:.*?\n)*?(?=^##|\Z)',  # German
        r'^## Notas para revisión\s*\n(?:.*?\n)*?(?=^##|\Z)',  # Spanish
        r'^## Word Count Breakdown\s*\n(?:.*?\n)*?(?=^##|\Z)',  # English
        r'^## Wortzahl-Aufschlüsselung\s*\n(?:.*?\n)*?(?=^##|\Z)',  # German
        r'^## Desglose del recuento\s*\n(?:.*?\n)*?(?=^##|\Z)',  # Spanish
        # Also remove generic "## Content" sections when they appear alone
        r'^## Content\s*\n(?=^##)',  # Empty content section
        r'^## Inhalt\s*\n(?=^##)',  # German empty content
        r'^## Contenido\s*\n(?=^##)',  # Spanish empty content
        # NEW: Remove Entropy agent diagnostic output (diversity metrics)
        r'^## Diversity Metrics\s*\n(?:.*?\n)*?(?=^##|\Z)',  # English
        r'^## Diversitätsmetriken\s*\n(?:.*?\n)*?(?=^##|\Z)',  # German
        r'^## Métricas de diversidad\s*\n(?:.*?\n)*?(?=^##|\Z)',  # Spanish
        r'^## Style Variance Report\s*\n(?:.*?\n)*?(?=^##|\Z)',  # English
        r'^## Stilvarianzbericht\s*\n(?:.*?\n)*?(?=^##|\Z)',  # German
        r'^## AI Detection Testing\s*\n(?:.*?\n)*?(?=^##|\Z)',  # English
        r'^## Changes by Category\s*\n(?:.*?\n)*?(?=^##|\Z)',  # English
        r'^## Anti-AI Detection Techniques Applied\s*\n(?:.*?\n)*?(?=^##|\Z)',  # English
    ]

    cleaned_content = content
    for pattern in h2_metadata_patterns:
        matches = re.findall(pattern, cleaned_content, re.MULTILINE)
        sections_removed += len(matches)
        cleaned_content = re.sub(pattern, '', cleaned_content, flags=re.MULTILINE)

    return cleaned_content, sections_removed


def normalize_whitespace(content: str) -> Tuple[str, int]:
    """
    Fix excessive whitespace patterns (e.g., 633K+ spaces).

    Args:
        content: Full draft markdown content

    Returns:
        Tuple of (normalized_content, chars_removed)
    """
    original_length = len(content)

    # Remove excessive spaces (more than 2 consecutive spaces outside code blocks)
    normalized = re.sub(r' {3,}', '  ', content)

    # Remove excessive blank lines (more than 2 consecutive newlines)
    normalized = re.sub(r'\n{4,}', '\n\n\n', normalized)

    # Remove trailing whitespace from lines
    lines = normalized.split('\n')
    normalized_lines = [line.rstrip() for line in lines]
    normalized = '\n'.join(normalized_lines)

    chars_removed = original_length - len(normalized)
    return normalized, chars_removed


def validate_output_quality(content: str, file_path: Optional[Path] = None) -> List[str]:
    """
    Validate output meets quality standards.

    Args:
        content: Full draft markdown content
        file_path: Optional path for file size validation

    Returns:
        List of validation warnings (empty if all checks pass)
    """
    warnings = []

    # Check file size
    content_size = len(content.encode('utf-8'))
    if content_size > MAX_OUTPUT_FILE_SIZE:
        warnings.append(
            f"⚠️  File size ({content_size:,} bytes) exceeds recommended max "
            f"({MAX_OUTPUT_FILE_SIZE:,} bytes)"
        )

    # Check for suspiciously long lines (likely corrupted tables)
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        if len(line) > 5000:
            warnings.append(
                f"⚠️  Line {i} is {len(line):,} chars long (likely corrupted table)"
            )

    # Check for excessive spaces in single line
    for i, line in enumerate(lines, 1):
        space_count = line.count(' ')
        if space_count > 1000:
            warnings.append(
                f"⚠️  Line {i} has {space_count:,} spaces (likely corruption)"
            )

    # Check for meta-comment leakage (case-insensitive)
    meta_patterns = [
        r'here is the enhanced',
        r'i have generated',
        r'this is the draft',
        r'agent #\d+',
        r'\[generated by'
    ]

    for pattern in meta_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            warnings.append(f"⚠️  Potential meta-comment found: '{pattern}'")

    return warnings


# ============================================================================
# MAIN SANITIZATION WORKFLOW
# ============================================================================

def sanitize_enhanced_output(
    content: str,
    verbose: bool = True
) -> Tuple[str, dict]:
    """
    Main sanitization workflow - fixes all 4 critical bugs.

    This function:
    1. Truncates oversized table cells (fix corruption)
    2. Removes agent meta-comments (fix leakage)
    3. Normalizes whitespace (fix bloat)
    4. Validates output quality (prevent PDF cut-offs)

    Args:
        content: Full enhanced draft markdown content
        verbose: Print progress messages

    Returns:
        Tuple of (sanitized_content, stats_dict)
    """
    if verbose:
        print("🧹 Sanitizing enhanced output...")

    stats = {
        'original_size': len(content.encode('utf-8')),
        'cells_truncated': 0,
        'h2_metadata_sections_removed': 0,
        'meta_comments_removed': 0,
        'whitespace_chars_removed': 0,
        'final_size': 0,
        'size_reduction': 0,
        'warnings': []
    }

    # Step 1: Fix table corruption
    sanitized, cells_truncated = truncate_table_cells(content)
    stats['cells_truncated'] = cells_truncated
    if verbose and cells_truncated > 0:
        print(f"  ✓ Truncated {cells_truncated} oversized table cells")

    # Step 1.5: Remove H2 metadata sections (## Citations Used, ## Notes for Revision, etc.)
    sanitized, h2_sections_removed = remove_metadata_h2_sections(sanitized)
    stats['h2_metadata_sections_removed'] = h2_sections_removed
    if verbose and h2_sections_removed > 0:
        print(f"  ✓ Removed {h2_sections_removed} H2 metadata sections")

    # Step 2: Remove inline meta-comments
    sanitized, comments_removed = remove_meta_comments(sanitized)
    stats['meta_comments_removed'] = comments_removed
    if verbose and comments_removed > 0:
        print(f"  ✓ Removed {comments_removed} inline meta-comments")

    # Step 3: Normalize whitespace
    sanitized, chars_removed = normalize_whitespace(sanitized)
    stats['whitespace_chars_removed'] = chars_removed
    if verbose and chars_removed > 0:
        print(f"  ✓ Removed {chars_removed:,} excessive whitespace chars")

    # Step 4: Validate output quality
    warnings = validate_output_quality(sanitized)
    stats['warnings'] = warnings

    if verbose and warnings:
        print("  ⚠️  Quality warnings:")
        for warning in warnings:
            print(f"      {warning}")

    # Calculate final stats
    stats['final_size'] = len(sanitized.encode('utf-8'))
    stats['size_reduction'] = stats['original_size'] - stats['final_size']

    if verbose:
        print(f"  ✓ Size: {stats['original_size']:,} → {stats['final_size']:,} bytes "
              f"({stats['size_reduction']:,} bytes removed)")

    # Final quality check
    if stats['final_size'] <= TARGET_FILE_SIZE:
        if verbose:
            print("  ✅ Output within target size!")
    elif stats['final_size'] <= MAX_OUTPUT_FILE_SIZE:
        if verbose:
            print("  ⚠️  Output above target but acceptable")
    else:
        if verbose:
            print("  ❌ Output still too large - manual review needed")

    return sanitized, stats


def sanitize_enhanced_file(
    input_path: Path,
    output_path: Optional[Path] = None,
    verbose: bool = True
) -> bool:
    """
    Sanitize an enhanced draft file in place or to a new file.

    Args:
        input_path: Path to enhanced draft file
        output_path: Optional output path (defaults to overwriting input)
        verbose: Print progress messages

    Returns:
        True if sanitization succeeded, False otherwise
    """
    try:
        if verbose:
            print(f"📖 Reading: {input_path}")

        # Read original file
        with open(input_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        # Sanitize content
        sanitized_content, stats = sanitize_enhanced_output(original_content, verbose=verbose)

        # Write sanitized output
        output_file = output_path or input_path
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sanitized_content)

        if verbose:
            print(f"💾 Saved: {output_file}")
            print()
            print("📊 Sanitization Summary:")
            print(f"  • Cells truncated: {stats['cells_truncated']}")
            print(f"  • H2 metadata sections removed: {stats['h2_metadata_sections_removed']}")
            print(f"  • Inline meta-comments removed: {stats['meta_comments_removed']}")
            print(f"  • Whitespace removed: {stats['whitespace_chars_removed']:,} chars")
            print(f"  • Size reduction: {stats['size_reduction']:,} bytes")
            print(f"  • Final size: {stats['final_size']:,} bytes")

            if stats['warnings']:
                print(f"  • Warnings: {len(stats['warnings'])}")

        return True

    except Exception as e:
        if verbose:
            print(f"❌ ERROR sanitizing file: {e}")
        return False


# ============================================================================
# STANDALONE TESTING
# ============================================================================

def main():
    """Test sanitizer on corrupted backup file."""
    import sys

    # Test on corrupted backup
    project_root = Path(__file__).parent.parent
    corrupted_file = project_root / "tests/outputs/opensource_draft_backup_20251103_195312/16_enhanced_final.md"

    if not corrupted_file.exists():
        print(f"❌ Test file not found: {corrupted_file}")
        sys.exit(1)

    print("=" * 80)
    print("OUTPUT SANITIZER - STANDALONE TEST")
    print("=" * 80)
    print()
    print(f"Testing on corrupted backup: {corrupted_file.name}")
    print(f"Original size: {corrupted_file.stat().st_size:,} bytes")
    print()

    # Create test output path
    test_output = corrupted_file.parent / "16_enhanced_final_SANITIZED.md"

    # Run sanitization
    success = sanitize_enhanced_file(
        input_path=corrupted_file,
        output_path=test_output,
        verbose=True
    )

    if success:
        print()
        print("✅ Sanitization test completed successfully!")
        print(f"📁 Sanitized output: {test_output}")
    else:
        print()
        print("❌ Sanitization test failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
