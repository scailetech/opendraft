#!/usr/bin/env python3
"""
ABOUTME: Citation Manager (Agent #3.5) - Extract citations from text
ABOUTME: Creates structured citation database from research notes or thesis
"""

import json
import sys
from pathlib import Path
from typing import Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import google.generativeai as genai
from config import get_config
from utils.citation_database import (
    Citation,
    CitationDatabase,
    Language,
    CitationStyle,
    save_citation_database
)
from utils.agent_runner import setup_model, load_prompt

# Use centralized logging system
from utils.logging_config import get_logger
logger = get_logger(__name__)


def extract_citations_from_text(
    text: str,
    model: genai.GenerativeModel,
    language: Language = "english",
    citation_style: CitationStyle = "APA 7th",
    verbose: bool = True,
    validate_dois: bool = True
) -> CitationDatabase:
    """
    Extract all citations from text using LLM.

    Args:
        text: Text to extract citations from (thesis or research notes)
        model: Configured Gemini model
        language: Language of the text
        citation_style: Citation style to use
        verbose: Whether to print progress
        validate_dois: Whether to validate DOIs via CrossRef API (default: True)

    Returns:
        CitationDatabase: Structured database with extracted citations

    Raises:
        ValueError: If extraction fails or output is invalid
    """
    logger.info("="*70)
    logger.info("Citation Manager - Extracting Citations")
    logger.info("="*70)
    logger.info(f"Text length: {len(text):,} chars")
    logger.info(f"Language: {language}")
    logger.info(f"Citation style: {citation_style}")

    # Load Citation Manager prompt
    prompt_path = Path("prompts/02_structure/citation_manager.md")
    agent_prompt = load_prompt(str(prompt_path))

    # Build input for LLM
    user_input = f"""# Text to Extract Citations From

{text}

## Task
Extract EVERY citation mentioned in the text above into a structured JSON database.

For each citation, extract:
1. Authors (list of last names)
2. Year (integer)
3. Title (full title)
4. Source type (journal/book/report/website/conference)
5. Publisher or journal name (if available)
6. DOI or URL (if available)
7. Language: {language}

## Output Format
Return ONLY valid JSON (no markdown code blocks, no explanation):

{{
  "citations": [
    {{
      "id": "cite_001",
      "authors": ["Author1", "Author2"],
      "year": 2023,
      "title": "Full title here",
      "source_type": "journal",
      "journal": "Journal Name",
      "doi": "10.xxxx/xxxxx",
      "language": "{language}"
    }}
  ]
}}

CRITICAL:
- Assign sequential IDs: cite_001, cite_002, cite_003, etc.
- Extract ALL citations - do not skip any sources
- If citation appears multiple times, include it only once
- If year/source details unclear, use best judgment from context
"""

    # Call LLM
    full_prompt = f"{agent_prompt}\n\n---\n\n{user_input}"

    logger.info("Extracting citations from text...")

    try:
        response = model.generate_content(full_prompt)
        output = response.text
        logger.info(f"Extraction complete ({len(output):,} chars)")
    except Exception as e:
        logger.error(f"Citation extraction failed: {str(e)}")
        raise ValueError(f"Citation extraction failed: {str(e)}") from e

    # Parse JSON response
    try:
        # Remove markdown code blocks if present
        clean_output = output.strip()
        if clean_output.startswith("```json"):
            clean_output = clean_output.split("```json")[1]
        if clean_output.startswith("```"):
            clean_output = clean_output.split("```")[1]
        if clean_output.endswith("```"):
            clean_output = clean_output.rsplit("```", 1)[0]

        clean_output = clean_output.strip()

        citation_data = json.loads(clean_output)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response from LLM: {str(e)}\n\nOutput:\n{output[:500]}") from e

    # Validate structure
    if "citations" not in citation_data:
        raise ValueError("LLM output missing 'citations' field")

    # Create Citation objects
    citations = []
    for i, cit_dict in enumerate(citation_data["citations"]):
        # Ensure ID is sequential
        expected_id = f"cite_{i+1:03d}"
        actual_id = cit_dict.get("id", expected_id)

        # Normalize ID format
        if not actual_id.startswith("cite_"):
            actual_id = expected_id

        citation = Citation(
            citation_id=actual_id,
            authors=cit_dict.get("authors", []),
            year=cit_dict.get("year", 0),
            title=cit_dict.get("title", ""),
            source_type=cit_dict.get("source_type", "report"),
            language=cit_dict.get("language", language),
            journal=cit_dict.get("journal"),
            publisher=cit_dict.get("publisher"),
            volume=cit_dict.get("volume"),
            issue=cit_dict.get("issue"),
            pages=cit_dict.get("pages"),
            doi=cit_dict.get("doi"),
            url=cit_dict.get("url"),
            access_date=cit_dict.get("access_date"),
        )
        citations.append(citation)

    # ====================================================================
    # DOI VALIDATION - Verify DOIs exist via CrossRef API
    # ====================================================================
    if validate_dois and citations:
        logger.info("="*70)
        logger.info("DOI Validation - Verifying Citations via CrossRef API")
        logger.info("="*70)

        # Import validator (lazy import to avoid circular dependencies)
        from utils.citation_validator import CitationValidator

        validator = CitationValidator(timeout=10)
        invalid_citations = []
        network_error_count = 0

        for i, citation in enumerate(citations):
            if citation.doi:
                # Validate DOI via CrossRef API
                is_valid = validator.validate_doi(citation.doi)

                if is_valid is False:  # Explicitly False (not None for network errors)
                    invalid_citations.append(citation)
                    logger.warning(f"Invalid DOI for {citation.id}: {citation.doi}")
                elif is_valid is None:  # Network error
                    network_error_count += 1
                    logger.warning(f"Network error validating DOI for {citation.id}: {citation.doi}")
                else:  # Valid
                    if (i + 1) % 10 == 0:
                        logger.debug(f"Validated {i + 1}/{len([c for c in citations if c.doi])} DOIs...")

        # Remove invalid citations
        if invalid_citations:
            original_count = len(citations)
            citations = [c for c in citations if c not in invalid_citations]
            removed_count = original_count - len(citations)

            logger.warning(f"Removed {removed_count} citations with invalid DOIs")
            for citation in invalid_citations[:5]:  # Log first 5
                authors_str = ", ".join(citation.authors[:2])
                if len(citation.authors) > 2:
                    authors_str += " et al."
                logger.warning(f"  - {citation.id}: {authors_str} ({citation.year}) - Invalid DOI: {citation.doi}")
            if len(invalid_citations) > 5:
                logger.warning(f"  ... and {len(invalid_citations) - 5} more")

        logger.info("DOI Validation Complete:")
        logger.info(f"  Valid: {len([c for c in citations if c.doi]) - len(invalid_citations)}")
        logger.info(f"  Invalid: {len(invalid_citations)}")
        logger.info(f"  Network Errors: {network_error_count}")
        logger.info(f"  Total Citations Remaining: {len(citations)}")

    # Deduplicate citations (keep version with most metadata)
    logger.info("Deduplicating citations...")
    from utils.citation_database import deduplicate_citations
    citations = deduplicate_citations(citations, verbose=False)  # deduplicate_citations has its own logging

    # Re-assign sequential IDs after deduplication
    for i, citation in enumerate(citations):
        citation.id = f"cite_{i+1:03d}"

    # Create database
    database = CitationDatabase(
        citations=citations,
        citation_style=citation_style,
        thesis_language=language,
    )

    # Validate database
    database.validate()

    logger.info(f"Successfully extracted {len(citations)} citations")
    if citations:
        logger.debug(f"Citation IDs: {citations[0].id} ... {citations[-1].id}")

    return database


def run_citation_manager(
    input_path: Path,
    output_path: Path,
    language: Language = "english",
    citation_style: CitationStyle = "APA 7th",
    model_override: Optional[str] = None,
    verbose: bool = True,
    validate_dois: bool = True
) -> CitationDatabase:
    """
    Run Citation Manager agent on input file.

    Args:
        input_path: Path to input text file (thesis or research notes)
        output_path: Path to save citation_database.json
        language: Language of the text
        citation_style: Citation style to use
        model_override: Optional model name to override config
        verbose: Whether to print progress
        validate_dois: Whether to validate DOIs via CrossRef API (default: True)

    Returns:
        CitationDatabase: Extracted citation database

    Raises:
        FileNotFoundError: If input file doesn't exist
        ValueError: If extraction or validation fails
    """
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Load input text
    with open(input_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Setup model
    model = setup_model(model_override)

    # Extract citations
    database = extract_citations_from_text(
        text=text,
        model=model,
        language=language,
        citation_style=citation_style,
        verbose=verbose,
        validate_dois=validate_dois
    )

    # Save database with comprehensive error handling
    logger.debug(f"Saving citation database to: {output_path}")

    try:
        # Attempt to save database
        save_citation_database(database, output_path)

        # CRITICAL: Verify file was actually created
        if not output_path.exists():
            error_msg = f"Citation database file was not created: {output_path}"
            logger.error(error_msg)
            raise IOError(error_msg)

        # Verify file has content
        file_size = output_path.stat().st_size
        if file_size == 0:
            error_msg = f"Citation database file is empty: {output_path}"
            logger.error(error_msg)
            raise IOError(error_msg)

        # Verify file is valid JSON
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            error_msg = f"Citation database file contains invalid JSON: {e}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e

        logger.info(f"Successfully saved citation database: {file_size} bytes to {output_path}")

    except ValueError as e:
        # Validation errors from save_citation_database
        error_msg = f"Citation database validation failed: {str(e)}"
        logger.error(error_msg)
        logger.debug(f"Database content: {database.to_dict()}")
        raise ValueError(error_msg) from e

    except IOError as e:
        # File I/O errors
        logger.error(f"Failed to save citation database to {output_path}: {str(e)}")
        raise

    except Exception as e:
        # Unexpected errors
        error_msg = f"Unexpected error saving citation database: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e

    return database


if __name__ == '__main__':
    # CLI usage for Citation Manager
    import argparse

    parser = argparse.ArgumentParser(description="Citation Manager - Extract citations from text")
    parser.add_argument("input", type=Path, help="Input text file (thesis or research notes)")
    parser.add_argument("output", type=Path, help="Output path for citation_database.json")
    parser.add_argument("--language", type=str, default="english", choices=["english", "german", "spanish", "french"])
    parser.add_argument("--style", type=str, default="APA 7th", choices=["APA 7th", "IEEE", "Chicago", "MLA"])
    parser.add_argument("--model", type=str, help="Override model name")
    parser.add_argument("--quiet", action="store_true", help="Suppress progress output")

    args = parser.parse_args()

    # Logging is automatically configured by utils.logging_config on import
    # Optionally adjust level based on --quiet flag
    if args.quiet:
        import logging
        logging.getLogger().setLevel(logging.WARNING)

    try:
        database = run_citation_manager(
            input_path=args.input,
            output_path=args.output,
            language=args.language,
            citation_style=args.style,
            model_override=args.model,
            verbose=not args.quiet
        )

        logger.info(f"SUCCESS: Extracted {len(database.citations)} citations")
        logger.info(f"Database: {args.output}")

    except Exception as e:
        logger.error(f"ERROR: {str(e)}")
        sys.exit(1)
