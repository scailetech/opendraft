#!/usr/bin/env python3
"""
ABOUTME: Post-processing utility to add LaTeX page breaks for professional PDF structure
ABOUTME: Adds \\newpage before major sections and appendices for clean page layouts

Target: 8-12 page breaks for optimal academic draft readability.

Strategy:
- Add \\newpage before all top-level headings (# Section)
- Add \\newpage before selected appendices (A, C, D, E)
- Preserve existing page breaks (no duplicates)

Usage:
    python3 utils/add_page_breaks.py <markdown_file>

Integration:
    Called automatically after Enhancement agent in draft generation pipeline.
"""

import sys
import re
from pathlib import Path
from typing import Tuple


def add_page_breaks_to_sections(content: str) -> Tuple[str, int]:
    """
    Add \\newpage before top-level headings (# Title).

    Args:
        content: Markdown content

    Returns:
        Tuple of (modified_content, page_breaks_added)
    """
    lines = content.split('\n')
    result = []
    page_breaks_added = 0

    for i, line in enumerate(lines):
        # Check if this is a top-level heading (# Heading)
        if line.strip().startswith('# ') and not line.strip().startswith('##'):
            # Don't add page break if:
            # 1. This is the first line
            # 2. Previous line already has \\newpage
            # 3. Previous non-empty line has \\newpage
            if i > 0:
                # Check last few lines for existing \\newpage
                has_newpage = False
                for j in range(max(0, i-3), i):
                    if '\\newpage' in lines[j]:
                        has_newpage = True
                        break

                if not has_newpage:
                    result.append('\\newpage')
                    result.append('')  # Empty line for readability
                    page_breaks_added += 1

        result.append(line)

    return '\n'.join(result), page_breaks_added


def add_page_breaks_to_appendices(content: str) -> Tuple[str, int]:
    """
    Add \\newpage before selected appendices (A, C, D, E - not all).

    Args:
        content: Markdown content

    Returns:
        Tuple of (modified_content, page_breaks_added)
    """
    lines = content.split('\n')
    result = []
    page_breaks_added = 0

    # Appendix patterns to add page breaks before
    appendix_patterns = [
        '## Appendix A:',
        '## Appendix C:',
        '## Appendix D:',
        '## Appendix E:',
        # German
        '## Anhang A:',
        '## Anhang C:',
        '## Anhang D:',
        '## Anhang E:',
        # Spanish
        '## Apéndice A:',
        '## Apéndice C:',
        '## Apéndice D:',
        '## Apéndice E:',
        # French
        '## Annexe A:',
        '## Annexe C:',
        '## Annexe D:',
        '## Annexe E:',
    ]

    for i, line in enumerate(lines):
        # Check if line starts with any appendix pattern
        if any(line.strip().startswith(pattern) for pattern in appendix_patterns):
            # Check if previous lines already have \\newpage
            has_newpage = False
            for j in range(max(0, i-3), i):
                if '\\newpage' in lines[j]:
                    has_newpage = True
                    break

            if not has_newpage:
                result.append('\\newpage')
                result.append('')  # Empty line
                page_breaks_added += 1

        result.append(line)

    return '\n'.join(result), page_breaks_added


def add_all_page_breaks(md_file: Path, verbose: bool = True) -> int:
    """
    Add page breaks to markdown file (sections + appendices).

    Args:
        md_file: Path to markdown file
        verbose: Print progress messages

    Returns:
        Total page breaks added
    """
    if not md_file.exists():
        raise FileNotFoundError(f"File not found: {md_file}")

    # Read file
    if verbose:
        print(f"📄 Reading: {md_file.name}")

    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add page breaks to sections
    content, section_breaks = add_page_breaks_to_sections(content)

    # Add page breaks to appendices
    content, appendix_breaks = add_page_breaks_to_appendices(content)

    total_breaks = section_breaks + appendix_breaks

    # Save back
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(content)

    if verbose:
        # Count total page breaks in file
        total_in_file = content.count('\\newpage')
        print(f"✅ Added {total_breaks} page breaks")
        print(f"   Total page breaks in file: {total_in_file}")
        print(f"   Target: 8-12 page breaks ({'✅' if 8 <= total_in_file <= 12 else '⚠️'})")

    return total_breaks


def main():
    """CLI entry point."""
    if len(sys.argv) != 2:
        print("Usage: python3 utils/add_page_breaks.py <markdown_file>")
        print("\nAdds LaTeX page breaks (\\newpage) before major sections and appendices.")
        print("Target: 8-12 page breaks for professional PDF structure.")
        sys.exit(1)

    md_file = Path(sys.argv[1])

    try:
        total_added = add_all_page_breaks(md_file, verbose=True)
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
