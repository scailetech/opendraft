#!/usr/bin/env python3
"""
Abstract Generator Utility - Production-Grade Implementation

SOLID Principles:
- Single Responsibility: Only handles abstract generation
- Open/Closed: Extensible for new languages without modification
- Interface Segregation: Clean function interface
- Dependency Inversion: Depends on abstractions (model interface)

DRY Principle:
- Reusable by all thesis generation scripts
- Centralized logic for abstract generation and replacement
"""

import re
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

def detect_thesis_language(thesis_content: str) -> str:
    """
    Detect thesis language from content.

    Args:
        thesis_content: Full thesis markdown content

    Returns:
        Language code: 'english', 'german', etc.
    """
    # Check for German indicators
    german_indicators = [
        '## Zusammenfassung',
        '## Inhaltsverzeichnis',
        '## Einleitung',
        '## Fazit',
        'Schlüsselwörter:'
    ]

    if any(indicator in thesis_content for indicator in german_indicators):
        return 'german'

    # Default to English
    return 'english'


def has_placeholder_abstract(thesis_content: str) -> bool:
    """
    Check if thesis has a placeholder abstract that needs generation.

    Args:
        thesis_content: Full thesis markdown content

    Returns:
        True if placeholder found, False if real abstract exists
    """
    placeholders = [
        '[Abstract will be generated',
        '[Zusammenfassung wird während der PDF-Generierung',
        '[Zusammenfassung wird automatisch'
    ]

    return any(placeholder in thesis_content for placeholder in placeholders)


def extract_thesis_for_abstract(thesis_content: str, max_chars: int = 15000) -> str:
    """
    Extract relevant content for abstract generation (introduction + conclusion).

    Args:
        thesis_content: Full thesis markdown content
        max_chars: Maximum characters to extract

    Returns:
        Truncated thesis content for context
    """
    # Skip frontmatter
    content_start = 0
    if thesis_content.startswith('---'):
        end_frontmatter = thesis_content.find('---', 3)
        if end_frontmatter != -1:
            content_start = end_frontmatter + 3

    # Skip TOC and abstract sections
    toc_match = re.search(r'## (Table of Contents|Inhaltsverzeichnis)', thesis_content[content_start:])
    if toc_match:
        content_start += toc_match.end()

    abstract_match = re.search(r'## (Abstract|Zusammenfassung)', thesis_content[content_start:])
    if abstract_match:
        abstract_start = content_start + abstract_match.start()
        newpage_match = re.search(r'\\newpage', thesis_content[abstract_start:])
        if newpage_match:
            content_start = abstract_start + newpage_match.end()

    # Get introduction (first 7500 chars of actual content)
    main_content = thesis_content[content_start:].strip()
    introduction = main_content[:7500]

    # Try to find conclusion
    conclusion = ""
    conc_patterns = [
        r'# (Conclusion|Fazit|Schlussfolgerung)\n+(.*?)(?=\n---|$)',
        r'## (Conclusion|Fazit|Schlussfolgerung)\n+(.*?)(?=\n---|$)'
    ]

    for pattern in conc_patterns:
        conc_match = re.search(pattern, thesis_content, re.DOTALL)
        if conc_match:
            conclusion = conc_match.group(2).strip()[:7500]
            break

    if not conclusion:
        # Fall back to last 7500 chars before references
        refs_pattern = r'\n---\n+\d+\.'
        refs_match = re.search(refs_pattern, thesis_content)
        if refs_match:
            conclusion = thesis_content[max(0, refs_match.start() - 7500):refs_match.start()].strip()
        else:
            conclusion = thesis_content[-7500:].strip()

    # Combine introduction and conclusion
    context = f"{introduction}\n\n...\n\n{conclusion}"

    # Truncate to max_chars if needed
    if len(context) > max_chars:
        context = context[:max_chars] + "..."

    return context


def replace_placeholder_with_abstract(thesis_content: str, generated_abstract: str, language: str = 'english') -> str:
    """
    Replace placeholder abstract with generated content.

    Args:
        thesis_content: Full thesis markdown content
        generated_abstract: Generated abstract text (without header)
        language: Thesis language

    Returns:
        Updated thesis content with real abstract
    """
    # Clean up the generated abstract (remove any meta-comments)
    generated_abstract = re.sub(
        r'^(Here is the abstract|Hier ist die Zusammenfassung).*?\n+',
        '',
        generated_abstract,
        flags=re.IGNORECASE
    ).strip()

    # Define placeholder patterns (handle optional leading whitespace from indented templates)
    if language == 'german':
        placeholder_pattern = r'^\s*## Zusammenfassung\n+\s*\[Zusammenfassung wird.*?\]\n+\s*\\\\?newpage'
        replacement = f"## Zusammenfassung\n\n{generated_abstract}\n\n\\\\newpage"
    else:
        # Match abstract placeholder with optional whitespace, brackets, and newpage
        placeholder_pattern = r'^\s*## Abstract\n+\s*\[Abstract will be generated.*?\]\n*(?:---?\n*|\s*\\\\?newpage)?'
        replacement = f"## Abstract\n\n{generated_abstract}\n\n\\\\newpage"

    # Replace placeholder (MULTILINE to match ^ at line start, DOTALL to match . across lines)
    updated_content = re.sub(placeholder_pattern, replacement, thesis_content, flags=re.DOTALL | re.MULTILINE)

    # Verify replacement happened
    if updated_content == thesis_content:
        logger.warning("Placeholder pattern not found - trying alternative patterns")

        # Try alternative patterns (account for optional leading whitespace from indented templates)
        alt_patterns = [
            # Match with \newpage (escaped in markdown as \\newpage) - with optional whitespace
            (r'^\s*## Abstract\n+\s*\[.*?\]\n+\s*\\\\newpage', f"## Abstract\n\n{generated_abstract}\n\n\\\\newpage"),
            (r'^\s*## Zusammenfassung\n+\s*\[.*?\]\n+\s*\\\\newpage', f"## Zusammenfassung\n\n{generated_abstract}\n\n\\\\newpage"),
            # Match with literal \newpage - with optional whitespace
            (r'^\s*## Abstract\n+\s*\[.*?\]\n+\s*\\newpage', f"## Abstract\n\n{generated_abstract}\n\n\\newpage"),
            (r'^\s*## Zusammenfassung\n+\s*\[.*?\]\n+\s*\\newpage', f"## Zusammenfassung\n\n{generated_abstract}\n\n\\newpage"),
            # Match without newpage - with optional whitespace
            (r'^\s*## Abstract\n+\s*\[.*?\]', f"## Abstract\n\n{generated_abstract}"),
            (r'^\s*## Zusammenfassung\n+\s*\[.*?\]', f"## Zusammenfassung\n\n{generated_abstract}"),
        ]

        for pattern, repl in alt_patterns:
            updated_content = re.sub(pattern, repl, thesis_content, flags=re.DOTALL | re.MULTILINE)
            if updated_content != thesis_content:
                logger.info("Alternative pattern matched successfully")
                break

    return updated_content


def generate_abstract_for_thesis(
    thesis_path: Path,
    model,
    run_agent_func,
    output_dir: Path,
    verbose: bool = True
) -> Tuple[bool, Optional[str]]:
    """
    Generate and integrate abstract for a thesis.

    This is the main entry point for abstract generation. It:
    1. Reads the thesis
    2. Checks if abstract generation is needed
    3. Calls the Abstract Generator agent
    4. Replaces the placeholder with generated content
    5. Saves the updated thesis

    Args:
        thesis_path: Path to thesis markdown file
        model: LLM model instance
        run_agent_func: Function to run agent (from test_utils)
        output_dir: Output directory for intermediate files
        verbose: Print progress messages

    Returns:
        Tuple of (success: bool, updated_content: str or None)
    """
    # Read thesis
    with open(thesis_path, 'r', encoding='utf-8') as f:
        thesis_content = f.read()

    # Detect language
    language = detect_thesis_language(thesis_content)

    # Check if abstract generation is needed
    if not has_placeholder_abstract(thesis_content):
        if verbose:
            print("✅ Thesis already has a full abstract - skipping generation")
        return True, thesis_content

    if verbose:
        print(f"📝 Placeholder abstract detected ({language}) - generating full abstract...")

    # Extract context for abstract generation
    thesis_context = extract_thesis_for_abstract(thesis_content)

    if verbose:
        print(f"  • Extracted {len(thesis_context)} chars of context")
        print(f"  • Language: {language}")

    # Prepare user input for Abstract Generator agent
    user_input = f"""Generate an academic abstract for this thesis.

**Language:** {language.title()}

**Thesis Context:**
{thesis_context}

**Instructions:**
- Generate a 4-paragraph abstract (250-300 words)
- Include 12-15 relevant keywords
- Follow standard academic abstract structure
- Output ONLY the abstract content (no meta-comments)
"""

    # Call Abstract Generator agent
    try:
        generated_abstract = run_agent_func(
            model=model,
            name="Abstract Generator (Agent #6.5)",
            prompt_path="prompts/06_enhance/abstract_generator.md",
            user_input=user_input,
            save_to=output_dir / "16_abstract_generated.md"
        )

        if not generated_abstract:
            if verbose:
                print("❌ Abstract generation failed - agent returned no content")
            return False, None

        # Count words in generated abstract
        word_count = len(generated_abstract.split())
        if verbose:
            print(f"✅ Abstract generated: {word_count} words")

        # Warn if word count is outside target range
        if word_count < 200 or word_count > 350:
            if verbose:
                print(f"⚠️  WARNING: Word count outside target range (250-300)")

        # Replace placeholder with generated abstract
        updated_content = replace_placeholder_with_abstract(thesis_content, generated_abstract, language)

        if updated_content == thesis_content:
            if verbose:
                print("❌ ERROR: Failed to replace placeholder abstract")
            return False, None

        # Save updated thesis
        with open(thesis_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        if verbose:
            print(f"✅ Abstract integrated into thesis at {thesis_path}")

        return True, updated_content

    except Exception as e:
        if verbose:
            print(f"❌ ERROR generating abstract: {e}")
        return False, None


