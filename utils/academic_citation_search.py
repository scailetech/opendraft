#!/usr/bin/env python3
"""
ABOUTME: Production-grade academic citation search using Semantic Scholar, CrossRef, and arXiv APIs
ABOUTME: Replaces Gemini Grounded with real academic databases for 50+ quality citations per thesis

This module provides the foundation for generating high-quality academic citations
by querying real academic APIs instead of web search. It ensures:
- Real academic papers (not websites)
- Validated DOIs and metadata
- No domain names as authors
- Publication venue verification
- Citation quality scoring

Design Principles:
- SOLID: Single Responsibility (academic search only)
- DRY: Reusable across all thesis generation
- Production-grade: Retry logic, rate limiting, error handling
- Quality-first: Validate during generation, not after
"""

import requests
import time
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from urllib.parse import quote
from utils.retry import retry, exponential_backoff_with_jitter
from utils.logging_config import get_logger
from utils.exceptions import CitationFetchError, NetworkError, APIQuotaExceededError

logger = get_logger(__name__)


@dataclass
class Citation:
    """
    Academic citation data structure.

    Attributes:
        title: Paper title
        authors: List of author names (NOT domain names)
        year: Publication year
        venue: Publication venue (journal/conference)
        doi: Digital Object Identifier (if available)
        url: Accessible URL to paper
        citation_count: Number of citations (quality indicator)
        api_source: Which API provided this citation
        abstract: Paper abstract (optional)
        arxiv_id: arXiv identifier (if applicable)
    """
    title: str
    authors: List[str]
    year: int
    venue: str
    doi: Optional[str] = None
    url: str = ""
    citation_count: int = 0
    api_source: str = ""
    abstract: Optional[str] = None
    arxiv_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert citation to dictionary for JSON serialization."""
        return asdict(self)

    def quality_score(self) -> float:
        """
        Calculate citation quality score (0-7 scale).

        Scoring criteria:
        - Has DOI: +2 points
        - Has arXiv ID: +1 point
        - Has venue: +2 points
        - Citation count > 10: +1 point
        - Has abstract: +1 point

        Returns:
            Quality score (0-7, higher is better)
        """
        score = 0.0

        if self.doi:
            score += 2.0
        if self.arxiv_id:
            score += 1.0
        if self.venue and self.venue != "Unknown":
            score += 2.0
        if self.citation_count > 10:
            score += 1.0
        if self.abstract:
            score += 1.0

        return score


def search_semantic_scholar(
    query: str,
    limit: int = 10,
    fields: List[str] = None
) -> List[Citation]:
    """
    Search Semantic Scholar API for academic papers.

    Semantic Scholar is a free academic search engine that provides:
    - High-quality academic papers
    - Full metadata (title, authors, venue, DOI)
    - Citation counts
    - Abstracts
    - No API key required for basic use

    Args:
        query: Search query (e.g., "open source software")
        limit: Maximum number of results (default: 10, max: 100)
        fields: List of fields to retrieve (default: all)

    Returns:
        List of Citation objects from Semantic Scholar

    Raises:
        requests.HTTPError: If API request fails
        ValueError: If query is empty or limit is invalid

    Example:
        >>> citations = search_semantic_scholar("machine learning", limit=5)
        >>> len(citations)
        5
        >>> citations[0].doi
        '10.1145/...'
    """
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty")

    if limit < 1 or limit > 100:
        raise ValueError(f"Limit must be between 1 and 100, got {limit}")

    # Default fields to retrieve
    if fields is None:
        fields = [
            "title",
            "authors",
            "year",
            "venue",
            "externalIds",
            "citationCount",
            "abstract",
            "url"
        ]

    # Build API request
    base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "fields": ",".join(fields),
        "limit": limit,
        "offset": 0
    }

    logger.info(f"Searching Semantic Scholar for: '{query}' (limit={limit})")

    try:
        response = _semantic_scholar_request_with_retry(base_url, params)
        data = response.json()

        if "data" not in data:
            logger.warning(f"No results from Semantic Scholar for query: {query}")
            return []

        citations = []
        for paper in data["data"]:
            try:
                citation = _parse_semantic_scholar_paper(paper)
                if citation:
                    citations.append(citation)
            except Exception as e:
                logger.warning(f"Failed to parse Semantic Scholar paper: {e}")
                continue

        logger.info(f"Retrieved {len(citations)} citations from Semantic Scholar")
        return citations

    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 429:
            raise APIQuotaExceededError(
                api_name="Semantic Scholar",
                reset_time="Unknown (check Retry-After header)",
                context={"query": query, "limit": limit}
            ) from e
        else:
            raise CitationFetchError(
                citation_id=f"query:{query}",
                source="Semantic Scholar",
                reason=str(e),
                context={"status_code": e.response.status_code if e.response else None}
            ) from e
    except requests.Timeout as e:
        raise NetworkError(
            endpoint="api.semanticscholar.org",
            reason="Connection timeout",
            context={"query": query}
        ) from e
    except requests.ConnectionError as e:
        raise NetworkError(
            endpoint="api.semanticscholar.org",
            reason="Network connection failed",
            context={"query": query}
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error searching Semantic Scholar: {e}")
        raise


@retry(max_attempts=5, base_delay=2.0, max_delay=30.0, exceptions=(requests.HTTPError, requests.Timeout, requests.ConnectionError))
def _semantic_scholar_request_with_retry(url: str, params: Dict[str, Any]) -> requests.Response:
    """
    Make HTTP request to Semantic Scholar with retry logic.

    Handles rate limiting (429) with exponential backoff.
    """
    response = requests.get(url, params=params, timeout=10)

    # Handle rate limiting
    if response.status_code == 429:
        retry_after = int(response.headers.get('Retry-After', 5))
        logger.warning(f"Rate limited (429), waiting {retry_after}s before retry")
        time.sleep(retry_after)
        raise requests.HTTPError(f"Rate limited: {response.status_code}", response=response)

    response.raise_for_status()
    return response


def _parse_semantic_scholar_paper(paper: Dict[str, Any]) -> Optional[Citation]:
    """
    Parse Semantic Scholar paper JSON to Citation object.

    Args:
        paper: Paper JSON from Semantic Scholar API

    Returns:
        Citation object or None if parsing fails
    """
    try:
        # Extract authors
        authors = []
        if "authors" in paper and paper["authors"]:
            for author in paper["authors"]:
                if "name" in author and author["name"]:
                    authors.append(author["name"])

        # Skip if no authors
        if not authors:
            logger.debug(f"Skipping paper without authors: {paper.get('title', 'Unknown')}")
            return None

        # Extract DOI
        doi = None
        arxiv_id = None
        if "externalIds" in paper and paper["externalIds"]:
            external_ids = paper["externalIds"]
            doi = external_ids.get("DOI")
            arxiv_id = external_ids.get("ArXiv")

        # Extract URL
        url = paper.get("url", "")
        if not url and doi:
            url = f"https://doi.org/{doi}"
        elif not url and arxiv_id:
            url = f"https://arxiv.org/abs/{arxiv_id}"

        # Create citation
        citation = Citation(
            title=paper.get("title", "Untitled"),
            authors=authors,
            year=paper.get("year", 0),
            venue=paper.get("venue", "Unknown"),
            doi=doi,
            url=url,
            citation_count=paper.get("citationCount", 0),
            api_source="Semantic Scholar",
            abstract=paper.get("abstract"),
            arxiv_id=arxiv_id
        )

        return citation

    except Exception as e:
        logger.warning(f"Failed to parse Semantic Scholar paper: {e}")
        return None


def search_crossref(query: str, limit: int = 10) -> List[Citation]:
    """
    Search CrossRef API for academic papers.

    CrossRef is the official DOI registration agency. It provides:
    - Authoritative DOI metadata
    - Journal articles, conference papers, books
    - Publication dates and venues
    - Free API access (no key required)

    Args:
        query: Search query (e.g., "blockchain applications")
        limit: Maximum number of results (default: 10, max: 100)

    Returns:
        List of Citation objects from CrossRef

    Raises:
        requests.HTTPError: If API request fails
        ValueError: If query is empty or limit is invalid

    Example:
        >>> citations = search_crossref("blockchain", limit=5)
        >>> all(c.doi for c in citations)
        True
    """
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty")

    if limit < 1 or limit > 100:
        raise ValueError(f"Limit must be between 1 and 100, got {limit}")

    # Build API request
    base_url = "https://api.crossref.org/works"
    params = {
        "query": query,
        "rows": limit,
        "sort": "relevance",
        "select": "title,author,published,DOI,container-title,type,abstract"
    }

    logger.info(f"Searching CrossRef for: '{query}' (limit={limit})")

    try:
        response = _crossref_request_with_retry(base_url, params)
        data = response.json()

        if "message" not in data or "items" not in data["message"]:
            logger.warning(f"No results from CrossRef for query: {query}")
            return []

        citations = []
        for item in data["message"]["items"]:
            try:
                citation = _parse_crossref_item(item)
                if citation:
                    citations.append(citation)
            except Exception as e:
                logger.warning(f"Failed to parse CrossRef item: {e}")
                continue

        logger.info(f"Retrieved {len(citations)} citations from CrossRef")
        return citations

    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 429:
            raise APIQuotaExceededError(
                api_name="CrossRef",
                reset_time="Unknown (check Retry-After header)",
                context={"query": query, "limit": limit}
            ) from e
        else:
            raise CitationFetchError(
                citation_id=f"query:{query}",
                source="CrossRef",
                reason=str(e),
                context={"status_code": e.response.status_code if e.response else None}
            ) from e
    except requests.Timeout as e:
        raise NetworkError(
            endpoint="api.crossref.org",
            reason="Connection timeout",
            context={"query": query}
        ) from e
    except requests.ConnectionError as e:
        raise NetworkError(
            endpoint="api.crossref.org",
            reason="Network connection failed",
            context={"query": query}
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error searching CrossRef: {e}")
        raise


@retry(max_attempts=5, base_delay=2.0, max_delay=30.0, exceptions=(requests.HTTPError, requests.Timeout, requests.ConnectionError))
def _crossref_request_with_retry(url: str, params: Dict[str, Any]) -> requests.Response:
    """Make HTTP request to CrossRef with retry logic."""
    headers = {
        "User-Agent": "AcademicThesisAI/1.0 (mailto:research@example.com)"
    }
    response = requests.get(url, params=params, headers=headers, timeout=10)
    response.raise_for_status()
    return response


def _parse_crossref_item(item: Dict[str, Any]) -> Optional[Citation]:
    """
    Parse CrossRef item JSON to Citation object.

    Args:
        item: Item JSON from CrossRef API

    Returns:
        Citation object or None if parsing fails
    """
    try:
        # Extract authors
        authors = []
        if "author" in item and item["author"]:
            for author in item["author"]:
                family = author.get("family", "")
                given = author.get("given", "")
                if family:
                    name = f"{given} {family}".strip() if given else family
                    authors.append(name)

        # Skip if no authors
        if not authors:
            logger.debug(f"Skipping CrossRef item without authors")
            return None

        # Extract title
        title = "Untitled"
        if "title" in item and item["title"]:
            title = item["title"][0] if isinstance(item["title"], list) else item["title"]

        # Extract year
        year = 0
        if "published" in item:
            published = item["published"]
            if "date-parts" in published and published["date-parts"]:
                date_parts = published["date-parts"][0]
                if date_parts and len(date_parts) > 0:
                    year = date_parts[0]

        # Extract venue
        venue = "Unknown"
        if "container-title" in item and item["container-title"]:
            venue = item["container-title"][0] if isinstance(item["container-title"], list) else item["container-title"]

        # Extract DOI
        doi = item.get("DOI")
        url = f"https://doi.org/{doi}" if doi else ""

        # Extract abstract
        abstract = item.get("abstract")

        citation = Citation(
            title=title,
            authors=authors,
            year=year,
            venue=venue,
            doi=doi,
            url=url,
            citation_count=0,  # CrossRef doesn't provide citation counts
            api_source="CrossRef",
            abstract=abstract
        )

        return citation

    except Exception as e:
        logger.warning(f"Failed to parse CrossRef item: {e}")
        return None


def search_arxiv(query: str, limit: int = 10) -> List[Citation]:
    """
    Search arXiv API for preprint papers.

    arXiv is a free preprint repository for:
    - Computer Science
    - Mathematics
    - Physics
    - Other STEM fields

    Args:
        query: Search query (e.g., "neural networks")
        limit: Maximum number of results (default: 10, max: 100)

    Returns:
        List of Citation objects from arXiv

    Raises:
        requests.HTTPError: If API request fails
        ValueError: If query is empty or limit is invalid

    Example:
        >>> citations = search_arxiv("deep learning", limit=5)
        >>> all(c.arxiv_id for c in citations)
        True
    """
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty")

    if limit < 1 or limit > 100:
        raise ValueError(f"Limit must be between 1 and 100, got {limit}")

    # Build API request
    base_url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": limit,
        "sortBy": "relevance",
        "sortOrder": "descending"
    }

    logger.info(f"Searching arXiv for: '{query}' (limit={limit})")

    try:
        response = _arxiv_request_with_retry(base_url, params)

        # Parse XML response
        import xml.etree.ElementTree as ET
        root = ET.fromstring(response.text)

        # Define namespaces
        ns = {
            'atom': 'http://www.w3.org/2005/Atom',
            'arxiv': 'http://arxiv.org/schemas/atom'
        }

        citations = []
        for entry in root.findall('atom:entry', ns):
            try:
                citation = _parse_arxiv_entry(entry, ns)
                if citation:
                    citations.append(citation)
            except Exception as e:
                logger.warning(f"Failed to parse arXiv entry: {e}")
                continue

        logger.info(f"Retrieved {len(citations)} citations from arXiv")
        return citations

    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 429:
            raise APIQuotaExceededError(
                api_name="arXiv",
                reset_time="Unknown (check Retry-After header)",
                context={"query": query, "limit": limit}
            ) from e
        else:
            raise CitationFetchError(
                citation_id=f"query:{query}",
                source="arXiv",
                reason=str(e),
                context={"status_code": e.response.status_code if e.response else None}
            ) from e
    except requests.Timeout as e:
        raise NetworkError(
            endpoint="export.arxiv.org",
            reason="Connection timeout",
            context={"query": query}
        ) from e
    except requests.ConnectionError as e:
        raise NetworkError(
            endpoint="export.arxiv.org",
            reason="Network connection failed",
            context={"query": query}
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error searching arXiv: {e}")
        raise


@retry(max_attempts=5, base_delay=2.0, max_delay=30.0, exceptions=(requests.HTTPError, requests.Timeout, requests.ConnectionError))
def _arxiv_request_with_retry(url: str, params: Dict[str, Any]) -> requests.Response:
    """Make HTTP request to arXiv with retry logic."""
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    return response


def _parse_arxiv_entry(entry: Any, ns: Dict[str, str]) -> Optional[Citation]:
    """
    Parse arXiv XML entry to Citation object.

    Args:
        entry: XML entry element from arXiv API
        ns: XML namespaces

    Returns:
        Citation object or None if parsing fails
    """
    try:
        # Extract title
        title_elem = entry.find('atom:title', ns)
        title = title_elem.text.strip() if title_elem is not None else "Untitled"

        # Extract authors
        authors = []
        for author in entry.findall('atom:author', ns):
            name_elem = author.find('atom:name', ns)
            if name_elem is not None and name_elem.text:
                authors.append(name_elem.text.strip())

        # Skip if no authors
        if not authors:
            logger.debug(f"Skipping arXiv entry without authors")
            return None

        # Extract year from published date
        published_elem = entry.find('atom:published', ns)
        year = 0
        if published_elem is not None and published_elem.text:
            year = int(published_elem.text[:4])

        # Extract arXiv ID from ID URL
        id_elem = entry.find('atom:id', ns)
        arxiv_id = None
        url = ""
        if id_elem is not None and id_elem.text:
            url = id_elem.text
            # Extract ID from URL (e.g., http://arxiv.org/abs/1234.5678v1 -> 1234.5678)
            if "/abs/" in url:
                arxiv_id = url.split("/abs/")[-1].replace("v1", "").replace("v2", "")

        # Extract abstract
        summary_elem = entry.find('atom:summary', ns)
        abstract = summary_elem.text.strip() if summary_elem is not None else None

        citation = Citation(
            title=title,
            authors=authors,
            year=year,
            venue="arXiv preprint",
            doi=None,
            url=url,
            citation_count=0,  # arXiv doesn't provide citation counts
            api_source="arXiv",
            abstract=abstract,
            arxiv_id=arxiv_id
        )

        return citation

    except Exception as e:
        logger.warning(f"Failed to parse arXiv entry: {e}")
        return None


def validate_doi(doi: str) -> bool:
    """
    Validate that a DOI actually resolves.

    Queries CrossRef API to check if DOI exists.

    Args:
        doi: DOI to validate (e.g., "10.1145/123456")

    Returns:
        True if DOI is valid and resolves, False otherwise

    Example:
        >>> validate_doi("10.1145/3360322")
        True
        >>> validate_doi("10.1234/fake.doi")
        False
    """
    if not doi or not doi.strip():
        return False

    try:
        url = f"https://api.crossref.org/works/{doi}"
        response = requests.get(url, timeout=5)
        return response.status_code == 200
    except Exception as e:
        logger.debug(f"DOI validation failed for {doi}: {e}")
        return False


def search_multi_source(
    query: str,
    limit: int = 10,
    prefer_source: Optional[str] = None
) -> List[Citation]:
    """
    Search multiple citation APIs with graceful degradation fallback.

    Implements production-grade error handling:
    - Tries preferred source first (if specified)
    - Falls back to alternative sources on failure
    - Aggregates results from successful sources
    - Logs failures but continues operation
    - Never fails completely unless all sources fail

    Args:
        query: Search query
        limit: Target number of citations (actual results may vary)
        prefer_source: Preferred API to try first ("semantic_scholar", "crossref", "arxiv")

    Returns:
        List of citations from successful API sources (may be empty if all fail)

    Example:
        >>> # Try Semantic Scholar first, fall back to others if needed
        >>> citations = search_multi_source("machine learning", limit=20, prefer_source="semantic_scholar")
        >>> len(citations) > 0
        True
    """
    # Validate inputs BEFORE trying any API calls
    if not query or not query.strip():
        raise ValueError("Search query cannot be empty")

    if limit < 1 or limit > 100:
        raise ValueError(f"Limit must be between 1 and 100, got {limit}")

    sources = ["semantic_scholar", "crossref", "arxiv"]

    # Reorder sources based on preference
    if prefer_source and prefer_source in sources:
        sources.remove(prefer_source)
        sources.insert(0, prefer_source)

    logger.info(f"Multi-source citation search for: '{query}' (limit={limit})")
    logger.info(f"Source priority: {' -> '.join(sources)}")

    all_citations = []
    failed_sources = []
    per_source_limit = limit // len(sources) + 1  # Distribute limit across sources

    for source in sources:
        try:
            if source == "semantic_scholar":
                citations = search_semantic_scholar(query, limit=per_source_limit)
            elif source == "crossref":
                citations = search_crossref(query, limit=per_source_limit)
            elif source == "arxiv":
                citations = search_arxiv(query, limit=per_source_limit)
            else:
                continue

            all_citations.extend(citations)
            logger.info(f"✅ {source}: Retrieved {len(citations)} citations")

            # Stop early if we have enough citations
            if len(all_citations) >= limit:
                logger.info(f"Reached target limit ({limit}), stopping search")
                break

        except APIQuotaExceededError as e:
            logger.warning(f"⚠️ {source}: API quota exceeded - {e.recovery_hint}")
            failed_sources.append((source, "quota_exceeded"))
            continue  # Try next source

        except NetworkError as e:
            logger.warning(f"⚠️ {source}: Network error - {e.recovery_hint}")
            failed_sources.append((source, "network_error"))
            continue  # Try next source

        except CitationFetchError as e:
            logger.warning(f"⚠️ {source}: Citation fetch failed - {e.recovery_hint}")
            failed_sources.append((source, "fetch_error"))
            continue  # Try next source

        except Exception as e:
            logger.error(f"❌ {source}: Unexpected error - {str(e)}")
            failed_sources.append((source, "unexpected_error"))
            continue  # Try next source

    # Log summary
    logger.info(f"Multi-source search complete: {len(all_citations)} total citations")

    if failed_sources:
        logger.warning(f"Failed sources: {', '.join([f'{s[0]} ({s[1]})' for s in failed_sources])}")

    if len(all_citations) == 0:
        logger.error("All citation sources failed - no citations retrieved")

    # Deduplicate citations (same title + year = duplicate)
    deduplicated = _deduplicate_citations(all_citations)

    if len(deduplicated) < len(all_citations):
        logger.info(f"Removed {len(all_citations) - len(deduplicated)} duplicate citations")

    # Return up to limit
    return deduplicated[:limit]


def _deduplicate_citations(citations: List[Citation]) -> List[Citation]:
    """
    Remove duplicate citations based on title and year.

    Args:
        citations: List of citations (may contain duplicates)

    Returns:
        Deduplicated list of citations
    """
    seen = set()
    unique_citations = []

    for citation in citations:
        # Create deduplication key (title + year, normalized)
        key = (citation.title.lower().strip(), citation.year)

        if key not in seen:
            seen.add(key)
            unique_citations.append(citation)

    return unique_citations


def validate_citation_quality(citation: Citation) -> bool:
    """
    Validate citation quality using strict criteria.

    Quality criteria:
    - Must have title (not empty)
    - Must have at least one author
    - Authors must not be domain names (e.g., "example.com")
    - Must have publication year
    - Year must be reasonable (1950-2025)
    - Must have either DOI or arXiv ID
    - Quality score must be >= 4.0

    Args:
        citation: Citation object to validate

    Returns:
        True if citation meets quality criteria, False otherwise

    Example:
        >>> citation = Citation(
        ...     title="Example Paper",
        ...     authors=["John Doe"],
        ...     year=2020,
        ...     venue="Example Venue",
        ...     doi="10.1234/example"
        ... )
        >>> validate_citation_quality(citation)
        True
    """
    # Check title
    if not citation.title or citation.title.strip() == "Untitled":
        logger.debug("Citation failed: missing title")
        return False

    # Check authors
    if not citation.authors or len(citation.authors) == 0:
        logger.debug("Citation failed: no authors")
        return False

    # Check for domain names as authors
    for author in citation.authors:
        if "." in author and any(tld in author.lower() for tld in [".com", ".org", ".net", ".edu", ".gov", ".uk", ".de"]):
            logger.debug(f"Citation failed: domain name as author: {author}")
            return False

    # Check year
    if not citation.year or citation.year < 1950 or citation.year > 2025:
        logger.debug(f"Citation failed: invalid year: {citation.year}")
        return False

    # Check DOI or arXiv ID
    if not citation.doi and not citation.arxiv_id:
        logger.debug("Citation failed: missing DOI and arXiv ID")
        return False

    # Check quality score
    score = citation.quality_score()
    if score < 4.0:
        logger.debug(f"Citation failed: quality score too low: {score}")
        return False

    return True


# Example usage
if __name__ == '__main__':
    # Test Semantic Scholar search
    print("Testing Semantic Scholar search...")
    try:
        citations = search_semantic_scholar("open source software", limit=5)
        print(f"✅ Retrieved {len(citations)} citations from Semantic Scholar")
        if citations:
            print(f"Example: {citations[0].title} ({citations[0].year})")
            print(f"Quality score: {citations[0].quality_score()}")
    except Exception as e:
        print(f"❌ Semantic Scholar search failed: {e}")

    # Test CrossRef search
    print("\nTesting CrossRef search...")
    try:
        citations = search_crossref("machine learning", limit=5)
        print(f"✅ Retrieved {len(citations)} citations from CrossRef")
        if citations:
            print(f"Example: {citations[0].title} ({citations[0].year})")
            print(f"DOI: {citations[0].doi}")
    except Exception as e:
        print(f"❌ CrossRef search failed: {e}")

    # Test arXiv search
    print("\nTesting arXiv search...")
    try:
        citations = search_arxiv("deep learning", limit=5)
        print(f"✅ Retrieved {len(citations)} citations from arXiv")
        if citations:
            print(f"Example: {citations[0].title} ({citations[0].year})")
            print(f"arXiv ID: {citations[0].arxiv_id}")
    except Exception as e:
        print(f"❌ arXiv search failed: {e}")

    # Test DOI validation
    print("\nTesting DOI validation...")
    valid_doi = "10.1145/3360322"
    print(f"Valid DOI ({valid_doi}): {validate_doi(valid_doi)}")

    invalid_doi = "10.1234/fake.doi"
    print(f"Invalid DOI ({invalid_doi}): {validate_doi(invalid_doi)}")
