#!/usr/bin/env python3
"""
ABOUTME: Citation database utilities for structured citation management
ABOUTME: Provides schema validation, loading, and saving for citation databases
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Literal
from datetime import datetime

logger = logging.getLogger(__name__)


# Type definitions for citations
CitationSourceType = Literal["journal", "book", "report", "website", "conference"]
CitationStyle = Literal["APA 7th", "IEEE", "Chicago", "MLA"]
Language = Literal["english", "german", "spanish", "french"]


class Citation:
    """Structured citation with complete metadata."""

    def __init__(
        self,
        citation_id: str,
        authors: List[str],
        year: int,
        title: str,
        source_type: CitationSourceType,
        language: Language = "english",
        journal: Optional[str] = None,
        publisher: Optional[str] = None,
        volume: Optional[int] = None,
        issue: Optional[int] = None,
        pages: Optional[str] = None,
        doi: Optional[str] = None,
        url: Optional[str] = None,
        access_date: Optional[str] = None,
        api_source: Optional[str] = None,
    ):
        self.id = citation_id
        self.authors = authors
        self.year = year
        self.title = title
        self.source_type = source_type
        self.language = language
        self.journal = journal
        self.publisher = publisher
        self.volume = volume
        self.issue = issue
        self.pages = pages
        self.doi = doi
        self.url = url
        self.access_date = access_date
        self.api_source = api_source

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        data = {
            "id": self.id,
            "authors": self.authors,
            "year": self.year,
            "title": self.title,
            "source_type": self.source_type,
            "language": self.language,
        }

        # Add optional fields if present
        if self.journal:
            data["journal"] = self.journal
        if self.publisher:
            data["publisher"] = self.publisher
        if self.volume:
            data["volume"] = self.volume
        if self.issue:
            data["issue"] = self.issue
        if self.pages:
            data["pages"] = self.pages
        if self.doi:
            data["doi"] = self.doi
        if self.url:
            data["url"] = self.url
        if self.access_date:
            data["access_date"] = self.access_date
        if self.api_source:
            data["api_source"] = self.api_source

        return data

    @staticmethod
    def from_dict(data: Dict) -> 'Citation':
        """Create Citation from dictionary."""
        return Citation(
            citation_id=data["id"],
            authors=data["authors"],
            year=data["year"],
            title=data["title"],
            source_type=data["source_type"],
            language=data.get("language", "english"),
            journal=data.get("journal"),
            publisher=data.get("publisher"),
            volume=data.get("volume"),
            issue=data.get("issue"),
            pages=data.get("pages"),
            doi=data.get("doi"),
            url=data.get("url"),
            access_date=data.get("access_date"),
            api_source=data.get("api_source"),
        )


class CitationDatabase:
    """Citation database with validation and metadata."""

    def __init__(
        self,
        citations: List[Citation],
        citation_style: CitationStyle = "APA 7th",
        thesis_language: Language = "english",
        extracted_date: Optional[str] = None,
    ):
        self.citations = citations
        self.citation_style = citation_style
        self.thesis_language = thesis_language
        self.extracted_date = extracted_date or datetime.now().isoformat()

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "citations": [c.to_dict() for c in self.citations],
            "metadata": {
                "total_citations": len(self.citations),
                "citation_style": self.citation_style,
                "thesis_language": self.thesis_language,
                "extracted_date": self.extracted_date,
            }
        }

    @staticmethod
    def from_dict(data: Dict) -> 'CitationDatabase':
        """Create CitationDatabase from dictionary."""
        citations = [Citation.from_dict(c) for c in data["citations"]]
        metadata = data.get("metadata", {})

        return CitationDatabase(
            citations=citations,
            citation_style=metadata.get("citation_style", "APA 7th"),
            thesis_language=metadata.get("thesis_language", "english"),
            extracted_date=metadata.get("extracted_date"),
        )

    def get_citation(self, citation_id: str) -> Optional[Citation]:
        """Get citation by ID."""
        for citation in self.citations:
            if citation.id == citation_id:
                return citation
        return None

    def validate(self) -> bool:
        """Validate database completeness and correctness."""
        if not self.citations:
            raise ValueError("Citation database is empty")

        seen_ids = set()

        for citation in self.citations:
            # Check required fields
            if not citation.id:
                raise ValueError("Citation missing ID")
            if not citation.authors or len(citation.authors) == 0:
                raise ValueError(f"Citation {citation.id} has no authors")
            if not citation.year:
                raise ValueError(f"Citation {citation.id} missing year")
            if not citation.title:
                raise ValueError(f"Citation {citation.id} missing title")
            if not citation.source_type:
                raise ValueError(f"Citation {citation.id} missing source_type")

            # Validate ID format
            if not citation.id.startswith("cite_"):
                raise ValueError(f"Citation ID {citation.id} must start with 'cite_'")

            # Check for duplicates
            if citation.id in seen_ids:
                raise ValueError(f"Duplicate citation ID: {citation.id}")
            seen_ids.add(citation.id)

            # Validate year range
            # FIXED (Bug #17): Dynamic year validation (current year + 2) instead of hardcoded 2025
            max_year = datetime.now().year + 2
            if not (1900 <= citation.year <= max_year):
                raise ValueError(f"Citation {citation.id} has invalid year: {citation.year} (must be 1900-{max_year})")

            # Validate DOI format if present
            if citation.doi and not citation.doi.startswith("10."):
                logger.warning(f"Citation {citation.id} has questionable DOI format: {citation.doi}")

            # Validate source-specific fields (log warnings for AI-extracted citations)
            if citation.source_type == "journal" and not citation.journal:
                logger.warning(f"Journal citation {citation.id} missing journal name - may impact APA formatting")
            if citation.source_type in ["book", "report"] and not citation.publisher:
                logger.warning(f"{citation.source_type.capitalize()} citation {citation.id} missing publisher - may impact APA formatting")

        return True


def validate_citation_database(db_dict: Dict) -> bool:
    """
    Validate citation database dictionary.

    Args:
        db_dict: Citation database as dictionary

    Returns:
        bool: True if valid

    Raises:
        ValueError: If validation fails with specific error message
    """
    # Check top-level structure
    if "citations" not in db_dict:
        raise ValueError("Database missing 'citations' field")
    if "metadata" not in db_dict:
        raise ValueError("Database missing 'metadata' field")

    # Validate metadata
    metadata = db_dict["metadata"]
    required_metadata = ["total_citations", "citation_style", "thesis_language"]
    for field in required_metadata:
        if field not in metadata:
            raise ValueError(f"Metadata missing required field: {field}")

    # Validate total_citations matches (auto-fix if mismatch for automated runs)
    actual_count = len(db_dict["citations"])
    claimed_count = metadata["total_citations"]
    if actual_count != claimed_count:
        logger.warning(f"Metadata claims {claimed_count} citations but found {actual_count} - auto-fixing metadata")
        # Auto-fix metadata count instead of crashing (deduplication/filtering may have changed count)
        metadata["total_citations"] = actual_count

    # Validate using CitationDatabase class
    db = CitationDatabase.from_dict(db_dict)
    db.validate()

    return True


def load_citation_database(path: Path) -> CitationDatabase:
    """
    Load and validate citation database from JSON file.

    Args:
        path: Path to citation_database.json

    Returns:
        CitationDatabase: Validated citation database

    Raises:
        FileNotFoundError: If file doesn't exist
        ValueError: If validation fails
        json.JSONDecodeError: If JSON is invalid
    """
    if not path.exists():
        raise FileNotFoundError(f"Citation database not found: {path}")

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Validate before creating object
    validate_citation_database(data)

    return CitationDatabase.from_dict(data)


def save_citation_database(db: CitationDatabase, path: Path) -> None:
    """
    Save citation database to JSON file.

    Args:
        db: CitationDatabase to save
        path: Output path for citation_database.json

    Raises:
        ValueError: If database validation fails
    """
    # Validate before saving
    db.validate()

    # Create parent directory if needed
    path.parent.mkdir(parents=True, exist_ok=True)

    # Save with proper formatting
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(db.to_dict(), f, indent=2, ensure_ascii=False)


def create_empty_database(
    citation_style: CitationStyle = "APA 7th",
    thesis_language: Language = "english"
) -> CitationDatabase:
    """
    Create empty citation database with metadata.

    Args:
        citation_style: Citation style to use
        thesis_language: Language of thesis

    Returns:
        CitationDatabase: Empty database ready for citations
    """
    return CitationDatabase(
        citations=[],
        citation_style=citation_style,
        thesis_language=thesis_language,
    )


def has_more_metadata(citation_a: Citation, citation_b: Citation) -> bool:
    """
    Compare metadata completeness between two citations.

    Args:
        citation_a: First citation
        citation_b: Second citation

    Returns:
        bool: True if citation_a has more complete metadata than citation_b
    """
    # Count non-None optional fields for each citation
    optional_fields = ['journal', 'publisher', 'volume', 'issue', 'pages', 'doi', 'url', 'access_date']

    score_a = sum(1 for field in optional_fields if getattr(citation_a, field) is not None)
    score_b = sum(1 for field in optional_fields if getattr(citation_b, field) is not None)

    return score_a > score_b


def deduplicate_citations(citations: List[Citation], verbose: bool = False) -> List[Citation]:
    """
    Remove duplicate citations, keeping versions with most complete metadata.

    Deduplication key: (first_author_lower, year, title_lower)
    When duplicates found: Keep citation with most metadata fields populated.

    Args:
        citations: List of citations to deduplicate
        verbose: Print deduplication statistics

    Returns:
        List[Citation]: Deduplicated citations
    """
    if not citations:
        return []

    # Build deduplication map
    dedup_map: Dict[tuple, Citation] = {}

    for citation in citations:
        # Create deduplication key
        first_author = citation.authors[0].lower() if citation.authors else ""
        year = citation.year
        title = citation.title.lower()

        key = (first_author, year, title)

        # Check if we've seen this citation before
        if key in dedup_map:
            # Keep the citation with more metadata
            existing = dedup_map[key]
            if has_more_metadata(citation, existing):
                if verbose:
                    print(f"   Duplicate found: {citation.id} replaces {existing.id} (more metadata)")
                dedup_map[key] = citation
            else:
                if verbose:
                    print(f"   Duplicate found: {existing.id} kept over {citation.id} (more metadata)")
        else:
            dedup_map[key] = citation

    deduplicated = list(dedup_map.values())

    if verbose:
        duplicates_removed = len(citations) - len(deduplicated)
        print(f"   Removed {duplicates_removed} duplicate(s) from {len(citations)} citations")
        print(f"   Final count: {len(deduplicated)} unique citations")

    return deduplicated
