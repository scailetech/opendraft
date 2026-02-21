#!/usr/bin/env python3
"""
ABOUTME: OpenAlex API client for comprehensive academic paper search
ABOUTME: 250M+ scholarly works, free API with optional key for higher limits
"""

import logging
import os
from typing import Optional, Dict, Any, List
from .base import BaseAPIClient, validate_author_name

logger = logging.getLogger(__name__)


class OpenAlexClient(BaseAPIClient):
    """
    OpenAlex API client for academic paper search.

    OpenAlex is a free, open catalog of the world's scholarly works.
    Provides comprehensive metadata for 250M+ papers across all disciplines.

    API Documentation: https://docs.openalex.org/
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        rate_limit_per_second: float = 10.0,
        timeout: int = 15,
        max_retries: int = 3,
    ):
        """
        Initialize OpenAlex API client.

        Args:
            api_key: Optional API key for higher rate limits (get free key at openalex.org)
            rate_limit_per_second: Maximum requests per second (10 without key, 100 with key)
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts
        """
        # Use provided key or fall back to environment variable
        self.openalex_key = api_key or os.getenv('OPENALEX_API_KEY')

        # Build headers
        headers = {}
        if self.openalex_key:
            headers['api_key'] = self.openalex_key
            rate_limit_per_second = min(rate_limit_per_second, 50.0)  # With key: up to 100/sec
            logger.info("OpenAlex: Using API key for higher rate limits")
        else:
            rate_limit_per_second = min(rate_limit_per_second, 10.0)  # Without key: 10/sec
            logger.debug("OpenAlex: No API key, using polite pool (10 req/sec)")

        # OpenAlex asks for email in User-Agent for polite pool
        polite_email = os.getenv('OPENALEX_EMAIL', 'opendraft@users.noreply.github.com')

        super().__init__(
            base_url="https://api.openalex.org",
            rate_limit_per_second=rate_limit_per_second,
            timeout=timeout,
            max_retries=max_retries,
        )

        # Override default headers with polite user-agent
        self.session.headers.update({
            'User-Agent': f'OpenDraft/1.7 (mailto:{polite_email})',
        })
        if self.openalex_key:
            self.session.headers['api_key'] = self.openalex_key

    def search_paper(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Search for a paper by title, author, or keywords.

        Args:
            query: Search query (title, authors, keywords)

        Returns:
            Paper metadata dict with standardized fields or None if not found
        """
        # OpenAlex uses filter-based search
        # search= does full-text search across title, abstract, etc.
        response = self._make_request(
            method="GET",
            endpoint="/works",
            params={
                "search": query,
                "per_page": 5,
                "select": "id,doi,title,authorships,publication_year,primary_location,type,cited_by_count,abstract_inverted_index",
            },
        )

        if not response:
            logger.debug(f"OpenAlex: No results for query '{query[:50]}...'")
            return None

        try:
            results = response.get("results", [])
            if not results:
                logger.debug(f"OpenAlex: Empty results for '{query[:50]}...'")
                return None

            paper = results[0]
            metadata = self._extract_metadata(paper)

            if metadata:
                logger.info(
                    f"OpenAlex: Found '{metadata['title'][:50]}...' by {metadata['authors'][0]} ({metadata['year']})"
                )
                return metadata
            else:
                logger.debug(f"OpenAlex: Incomplete metadata for '{query[:50]}...'")
                return None

        except Exception as e:
            logger.error(f"OpenAlex: Error parsing response: {e}")
            return None

    def search_papers(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for multiple papers by query.

        Args:
            query: Search query
            limit: Maximum number of results (default 10, max 200)

        Returns:
            List of paper metadata dicts
        """
        response = self._make_request(
            method="GET",
            endpoint="/works",
            params={
                "search": query,
                "per_page": min(limit, 200),
                "select": "id,doi,title,authorships,publication_year,primary_location,type,cited_by_count,abstract_inverted_index",
            },
        )

        if not response:
            return []

        results = []
        for paper in response.get("results", []):
            metadata = self._extract_metadata(paper)
            if metadata:
                results.append(metadata)

        return results

    def get_paper_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        """
        Get paper metadata by DOI.

        Args:
            doi: DOI string (e.g., "10.1038/nature12373")

        Returns:
            Paper metadata dict or None if not found
        """
        # OpenAlex uses DOI as identifier with https://doi.org/ prefix
        response = self._make_request(
            method="GET",
            endpoint=f"/works/https://doi.org/{doi}",
            params={
                "select": "id,doi,title,authorships,publication_year,primary_location,type,cited_by_count,abstract_inverted_index",
            },
        )

        if not response:
            return None

        return self._extract_metadata(response)

    def _extract_metadata(self, paper: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract and normalize paper metadata from OpenAlex response.

        Args:
            paper: OpenAlex work object

        Returns:
            Normalized metadata dict or None if required fields missing
        """
        try:
            # Title (required)
            title = paper.get("title", "")
            if not title:
                return None

            # Authors (required)
            authorships = paper.get("authorships", [])
            authors = []
            for authorship in authorships:
                author_info = authorship.get("author", {})
                display_name = author_info.get("display_name", "")
                if display_name:
                    # Extract last name (OpenAlex gives "First Last" format)
                    parts = display_name.split()
                    if parts:
                        last_name = parts[-1]
                        is_valid, _ = validate_author_name(last_name)
                        if is_valid:
                            authors.append(last_name)

            if not authors:
                return None

            # Year (required)
            year = paper.get("publication_year", 0)
            if not year:
                return None

            # DOI
            doi_url = paper.get("doi", "")
            doi = ""
            if doi_url:
                # OpenAlex returns full URL like "https://doi.org/10.1038/xxx"
                doi = doi_url.replace("https://doi.org/", "")

            # URL
            url = doi_url if doi_url else paper.get("id", "")

            # Journal/Venue from primary_location
            primary_location = paper.get("primary_location", {}) or {}
            source = primary_location.get("source", {}) or {}
            journal = source.get("display_name", "")
            publisher = source.get("host_organization_name", "")

            # Source type
            work_type = paper.get("type", "")
            source_type = self._map_source_type(work_type)

            # Citation count (useful for ranking)
            citation_count = paper.get("cited_by_count", 0)

            # Abstract (OpenAlex uses inverted index format)
            abstract = self._reconstruct_abstract(paper.get("abstract_inverted_index"))

            # Calculate confidence
            confidence = self._calculate_confidence(
                has_doi=bool(doi),
                has_journal=bool(journal),
                citation_count=citation_count,
                author_count=len(authors)
            )

            return {
                "title": title,
                "authors": authors,
                "year": year,
                "doi": doi,
                "url": url,
                "journal": journal,
                "publisher": publisher,
                "volume": "",  # Not in basic select
                "issue": "",
                "pages": "",
                "source_type": source_type,
                "confidence": confidence,
                "abstract": abstract,
                "citation_count": citation_count,
            }

        except Exception as e:
            logger.error(f"OpenAlex: Error extracting metadata: {e}")
            return None

    def _reconstruct_abstract(self, inverted_index: Optional[Dict[str, List[int]]]) -> Optional[str]:
        """
        Reconstruct abstract from OpenAlex inverted index format.

        OpenAlex stores abstracts as {word: [positions]} for efficiency.
        We need to reconstruct the original text.
        """
        if not inverted_index:
            return None

        try:
            # Find max position to size the array
            max_pos = 0
            for positions in inverted_index.values():
                if positions:
                    max_pos = max(max_pos, max(positions))

            # Build word array
            words = [""] * (max_pos + 1)
            for word, positions in inverted_index.items():
                for pos in positions:
                    words[pos] = word

            # Join and clean
            abstract = " ".join(words).strip()
            return abstract if abstract else None

        except Exception as e:
            logger.debug(f"OpenAlex: Failed to reconstruct abstract: {e}")
            return None

    def _map_source_type(self, work_type: str) -> str:
        """
        Map OpenAlex work type to our source_type enum.
        """
        type_mapping = {
            "journal-article": "journal",
            "article": "journal",
            "proceedings-article": "conference",
            "book": "book",
            "book-chapter": "book",
            "dissertation": "report",
            "dataset": "report",
            "preprint": "report",
            "report": "report",
        }
        return type_mapping.get(work_type, "journal")

    def _calculate_confidence(
        self,
        has_doi: bool,
        has_journal: bool,
        citation_count: int,
        author_count: int
    ) -> float:
        """
        Calculate confidence score for paper metadata.
        """
        score = 0.5  # Base score

        if has_doi:
            score += 0.25
        if has_journal:
            score += 0.1
        if citation_count > 10:
            score += 0.1
        elif citation_count > 0:
            score += 0.05
        if author_count > 0:
            score += 0.05

        return min(score, 1.0)
