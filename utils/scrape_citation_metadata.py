#!/usr/bin/env python3
"""
ABOUTME: Web scraper for extracting publication metadata from citation URLs
ABOUTME: Fixes Gemini Grounded citations with incorrect years and domain-name authors

This module provides utilities to scrape publication dates and author names
from web URLs and update citation databases with accurate metadata.

Design Principles:
- Defensive: Handles network errors, timeouts, malformed HTML gracefully
- Intelligent: Uses multiple extraction strategies (meta tags, JSON-LD, microdata)
- Accurate: Validates dates and author names against common patterns
- Efficient: Reuses sessions from title scraper, respects rate limits
"""

import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse
import time
import re
import json
from datetime import datetime
from utils.retry import retry_on_network_error
from utils.logging_config import get_logger

# Initialize logger for this module
logger = get_logger(__name__)


def safe_get(obj, key, default=None):
    """
    Safely get value from dict or object attribute.

    Handles both dictionaries and objects (NamedTuple, dataclass, etc.)

    Args:
        obj: Dictionary or object
        key: Attribute/key name
        default: Default value if not found

    Returns:
        Value from obj[key] or obj.key, or default if not found
    """
    if hasattr(obj, 'get'):
        # Dictionary
        return obj.get(key, default)
    else:
        # Object (NamedTuple, dataclass, etc.)
        return getattr(obj, key, default)


class MetadataScraper:
    """
    Scrapes publication metadata (dates, authors) from URLs with intelligent fallbacks.
    """

    def __init__(
        self,
        timeout: int = 10,
        user_agent: str = "Academic-Draft-AI/1.0 (Citation Metadata Scraper)",
        rate_limit_delay: float = 1.0,
        verbose: bool = False
    ):
        """
        Initialize scraper.

        Args:
            timeout: HTTP request timeout in seconds
            user_agent: User agent string for requests
            rate_limit_delay: Delay between requests in seconds
            verbose: Print detailed information
        """
        self.timeout = timeout
        self.user_agent = user_agent
        self.rate_limit_delay = rate_limit_delay
        self.verbose = verbose
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': user_agent})

    @retry_on_network_error(max_attempts=3, base_delay=2.0, max_delay=30.0)
    def scrape_publication_date(self, url: str, html_content: Optional[str] = None) -> Optional[int]:
        """
        Scrape publication date from URL.

        Tries multiple strategies:
        1. <meta property="article:published_time"> (Open Graph)
        2. <meta name="pubdate">
        3. <meta name="DC.date"> (Dublin Core)
        4. JSON-LD structured data (datePublished)
        5. <time> tags with datetime attribute
        6. URL path patterns (e.g., /2024/03/article)

        Args:
            url: URL to scrape
            html_content: Pre-fetched HTML content (optional, saves HTTP request)

        Returns:
            Publication year (int) or None if not found
        """
        try:
            if html_content:
                soup = BeautifulSoup(html_content, 'html.parser')
            else:
                if self.verbose:
                    logger.info(f"Scraping publication date from: {url[:60]}...")

                response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')

            # Strategy 1: Open Graph article:published_time
            og_date = soup.find('meta', property='article:published_time')
            if og_date and og_date.get('content'):
                year = self._extract_year(og_date['content'])
                if year:
                    if self.verbose:
                        logger.debug(f"Found Open Graph date: {year}")
                    return year

            # Strategy 2: pubdate meta tag
            pubdate = soup.find('meta', attrs={'name': 'pubdate'})
            if pubdate and pubdate.get('content'):
                year = self._extract_year(pubdate['content'])
                if year:
                    if self.verbose:
                        logger.debug(f"Found pubdate meta tag: {year}")
                    return year

            # Strategy 3: Dublin Core date
            dc_date = soup.find('meta', attrs={'name': 'DC.date'})
            if dc_date and dc_date.get('content'):
                year = self._extract_year(dc_date['content'])
                if year:
                    if self.verbose:
                        logger.debug(f"Found Dublin Core date: {year}")
                    return year

            # Strategy 4: JSON-LD structured data
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    # Handle array of objects
                    if isinstance(data, list):
                        for item in data:
                            year = self._extract_year_from_jsonld(item)
                            if year:
                                if self.verbose:
                                    logger.debug(f"Found JSON-LD date: {year}")
                                return year
                    else:
                        year = self._extract_year_from_jsonld(data)
                        if year:
                            if self.verbose:
                                logger.debug(f"Found JSON-LD date: {year}")
                            return year
                except (json.JSONDecodeError, AttributeError):
                    continue

            # Strategy 5: <time> tags
            time_tags = soup.find_all('time', datetime=True)
            for time_tag in time_tags:
                year = self._extract_year(time_tag['datetime'])
                if year:
                    if self.verbose:
                        logger.debug(f"Found time tag date: {year}")
                    return year

            # Strategy 6: URL path pattern (e.g., /2024/03/article-name)
            year = self._extract_year_from_url(url)
            if year:
                if self.verbose:
                    logger.warning(f"Using URL fallback date: {year}")
                return year

            if self.verbose:
                logger.warning(f"No publication date found for {url[:60]}")

            return None

        except requests.exceptions.Timeout:
            if self.verbose:
                logger.warning(f"Timeout scraping date from {url[:60]}")
            return None
        except requests.exceptions.RequestException as e:
            if self.verbose:
                logger.warning(f"Request error scraping date from {url[:60]}: {str(e)[:50]}")
            return None
        except Exception as e:
            if self.verbose:
                logger.error(f"Unexpected error scraping date from {url[:60]}: {str(e)[:50]}", exc_info=True)
            return None

    @retry_on_network_error(max_attempts=3, base_delay=2.0, max_delay=30.0)
    def scrape_authors(self, url: str, html_content: Optional[str] = None) -> Optional[List[str]]:
        """
        Scrape author names from URL.

        Tries multiple strategies:
        1. <meta name="author"> tags
        2. <meta property="article:author"> (Open Graph)
        3. JSON-LD structured data (author field)
        4. <meta name="DC.creator"> (Dublin Core)
        5. rel="author" links

        Args:
            url: URL to scrape
            html_content: Pre-fetched HTML content (optional, saves HTTP request)

        Returns:
            List of author names or None if not found
        """
        try:
            if html_content:
                soup = BeautifulSoup(html_content, 'html.parser')
            else:
                if self.verbose:
                    logger.info(f"Scraping authors from: {url[:60]}...")

                response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')

            authors = []

            # Strategy 1: meta name="author"
            author_tags = soup.find_all('meta', attrs={'name': 'author'})
            for tag in author_tags:
                if tag.get('content'):
                    author_names = self._parse_author_string(tag['content'])
                    authors.extend(author_names)

            # Strategy 2: Open Graph article:author
            og_authors = soup.find_all('meta', property='article:author')
            for tag in og_authors:
                if tag.get('content'):
                    author_names = self._parse_author_string(tag['content'])
                    authors.extend(author_names)

            # Strategy 3: JSON-LD structured data
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    # Handle array of objects
                    if isinstance(data, list):
                        for item in data:
                            author_names = self._extract_authors_from_jsonld(item)
                            if author_names:
                                authors.extend(author_names)
                    else:
                        author_names = self._extract_authors_from_jsonld(data)
                        if author_names:
                            authors.extend(author_names)
                except (json.JSONDecodeError, AttributeError):
                    continue

            # Strategy 4: Dublin Core creator
            dc_creators = soup.find_all('meta', attrs={'name': 'DC.creator'})
            for tag in dc_creators:
                if tag.get('content'):
                    author_names = self._parse_author_string(tag['content'])
                    authors.extend(author_names)

            # Strategy 5: rel="author" links
            author_links = soup.find_all('a', rel='author')
            for link in author_links:
                if link.get_text():
                    author_names = self._parse_author_string(link.get_text())
                    authors.extend(author_names)

            # Remove duplicates and validate
            authors = list(dict.fromkeys(authors))  # Preserve order, remove dupes
            authors = [a for a in authors if self._is_valid_author(a)]

            if authors:
                if self.verbose:
                    logger.info(f"Found authors: {', '.join(authors[:3])}{'...' if len(authors) > 3 else ''}")
                return authors

            if self.verbose:
                logger.warning(f"No authors found for {url[:60]}")

            return None

        except requests.exceptions.Timeout:
            if self.verbose:
                logger.warning(f"Timeout scraping authors from {url[:60]}")
            return None
        except requests.exceptions.RequestException as e:
            if self.verbose:
                logger.warning(f"Request error scraping authors from {url[:60]}: {str(e)[:50]}")
            return None
        except Exception as e:
            if self.verbose:
                logger.error(f"Unexpected error scraping authors from {url[:60]}: {str(e)[:50]}", exc_info=True)
            return None

    def scrape_metadata(self, url: str) -> Tuple[Optional[int], Optional[List[str]]]:
        """
        Scrape both publication date and authors in one HTTP request.

        More efficient than calling scrape_publication_date() and scrape_authors() separately.

        Args:
            url: URL to scrape

        Returns:
            Tuple of (year, authors)
        """
        try:
            if self.verbose:
                logger.info(f"Scraping metadata from: {url[:60]}...")

            response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            response.raise_for_status()
            html_content = response.content.decode('utf-8', errors='ignore')

            # Extract both date and authors from same HTML
            year = self.scrape_publication_date(url, html_content)
            authors = self.scrape_authors(url, html_content)

            return year, authors

        except Exception as e:
            if self.verbose:
                logger.error(f"Metadata scraping failed for {url[:60]}: {str(e)[:50]}", exc_info=True)
            return None, None

    def scrape_citations(
        self,
        citations: List[Dict],
        filter_condition: Optional[callable] = None
    ) -> Tuple[int, int]:
        """
        Scrape metadata for multiple citations.

        Args:
            citations: List of citation dictionaries
            filter_condition: Optional function to filter which citations to scrape
                             (default: Gemini Grounded with bad metadata)

        Returns:
            Tuple of (successful_count, failed_count)
        """
        if filter_condition is None:
            # Default: Gemini Grounded with domain-name authors or year == 2025
            def default_filter(c):
                # Handle both dict and Citation object using module-level safe_get
                api_source = safe_get(c, 'api_source')
                if api_source != 'Gemini Grounded':
                    return False

                # Check for domain-name authors
                authors = safe_get(c, 'authors', [])
                if authors and len(authors) > 0:
                    first_author = authors[0]
                    # Domain pattern: xxx.com, xxx.org, etc.
                    if re.match(r'^[\w\-]+\.(com|org|edu|gov|net|io|ai)$', first_author.lower()):
                        return True

                # Check for suspicious year (current year = likely placeholder)
                year = safe_get(c, 'year')
                current_year = datetime.now().year
                if year == current_year:
                    return True

                return False

            filter_condition = default_filter

        # Filter citations
        to_scrape = [c for c in citations if filter_condition(c)]

        if not to_scrape:
            if self.verbose:
                logger.info("No citations need metadata scraping")
            return 0, 0

        logger.info(f"Scraping metadata for {len(to_scrape)} citations...")

        success_count = 0
        fail_count = 0

        for i, citation in enumerate(to_scrape, 1):
            # Handle both dict and Citation object using safe_get
            url = safe_get(citation, 'url')
            if not url:
                fail_count += 1
                continue

            citation_id = safe_get(citation, 'id', 'unknown')
            old_year = safe_get(citation, 'year', 'N/A')
            old_authors = safe_get(citation, 'authors', ['N/A'])

            if self.verbose:
                logger.info(f"Processing citation [{i}/{len(to_scrape)}]: {citation_id}")
                logger.debug(f"Old metadata: {old_year} - {old_authors}")

            # Scrape metadata
            year, authors = self.scrape_metadata(url)

            # Update citation if we found new metadata
            updated = False
            if year and year != old_year:
                if hasattr(citation, 'year'):
                    citation.year = year
                else:
                    citation['year'] = year
                updated = True

            if authors and authors != old_authors:
                if hasattr(citation, 'authors'):
                    citation.authors = authors
                else:
                    citation['authors'] = authors
                updated = True

            if updated:
                success_count += 1
                if self.verbose:
                    new_year = safe_get(citation, 'year', 'N/A')
                    new_authors = safe_get(citation, 'authors', ['N/A'])
                    logger.info(f"Successfully updated metadata: {new_year} - {new_authors[:3]}")
            else:
                fail_count += 1
                if self.verbose:
                    logger.warning(f"No improvement for {citation_id}")

            # Rate limiting
            if i < len(to_scrape):
                time.sleep(self.rate_limit_delay)

        return success_count, fail_count

    def _extract_year(self, date_string: str) -> Optional[int]:
        """Extract year from date string (YYYY-MM-DD, ISO 8601, etc.)."""
        if not date_string:
            return None

        # Try to find 4-digit year
        match = re.search(r'(19|20)\d{2}', date_string)
        if match:
            year = int(match.group())
            # Validate year is reasonable (1990-2030)
            if 1990 <= year <= 2030:
                return year

        return None

    def _extract_year_from_url(self, url: str) -> Optional[int]:
        """Extract year from URL path (e.g., /2024/03/article)."""
        # Look for /YYYY/ pattern
        match = re.search(r'/(19|20)\d{2}/', url)
        if match:
            year = int(match.group().strip('/'))
            if 1990 <= year <= 2030:
                return year
        return None

    def _extract_year_from_jsonld(self, data: Dict) -> Optional[int]:
        """Extract year from JSON-LD structured data."""
        # Look for datePublished or dateCreated
        for field in ['datePublished', 'dateCreated', 'dateModified']:
            if field in data:
                year = self._extract_year(str(data[field]))
                if year:
                    return year
        return None

    def _extract_authors_from_jsonld(self, data: Dict) -> Optional[List[str]]:
        """Extract authors from JSON-LD structured data."""
        if 'author' not in data:
            return None

        author_data = data['author']
        authors = []

        # Handle different author formats
        if isinstance(author_data, str):
            authors.extend(self._parse_author_string(author_data))
        elif isinstance(author_data, dict):
            if 'name' in author_data:
                authors.extend(self._parse_author_string(author_data['name']))
        elif isinstance(author_data, list):
            for author in author_data:
                if isinstance(author, str):
                    authors.extend(self._parse_author_string(author))
                elif isinstance(author, dict) and 'name' in author:
                    authors.extend(self._parse_author_string(author['name']))

        return authors if authors else None

    def _parse_author_string(self, author_str: str) -> List[str]:
        """Parse author string into list of names."""
        if not author_str:
            return []

        # Clean string
        author_str = author_str.strip()

        # Split by common separators
        # Handle: "John Doe, Jane Smith" or "John Doe and Jane Smith"
        separators = [' and ', ', ', '; ', ' & ']
        for sep in separators:
            if sep in author_str:
                return [name.strip() for name in author_str.split(sep) if name.strip()]

        # Single author
        return [author_str]

    def _is_valid_author(self, author: str) -> bool:
        """Validate author name."""
        if not author or len(author) < 3:
            return False

        # Reject URLs (http://, https://, or starts with www.)
        if author.startswith('http://') or author.startswith('https://') or author.startswith('www.'):
            return False

        # Reject domain names
        if re.match(r'^[\w\-]+\.(com|org|edu|gov|net|io|ai)$', author.lower()):
            return False

        # Reject generic/placeholder names
        generic = {'unknown', 'n/a', 'anonymous', 'author', 'staff', 'admin', 'editor'}
        if author.lower() in generic:
            return False

        # Reject if it's just a company/organization (all caps or ends with Inc/Ltd/Corp)
        if author.isupper() and len(author.split()) == 1:
            return False

        # Reject Facebook/social media links
        if 'facebook.com' in author.lower() or 'twitter.com' in author.lower() or 'linkedin.com' in author.lower():
            return False

        return True


if __name__ == '__main__':
    import sys
    import argparse
    from pathlib import Path

    parser = argparse.ArgumentParser(description='Scrape metadata for Gemini Grounded citations')
    parser.add_argument('database', help='Path to citation_database.json')
    parser.add_argument('-o', '--output', help='Output path (default: overwrite original)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--all', action='store_true', help='Scrape all citations (not just Gemini)')

    args = parser.parse_args()

    from citation_database import load_citation_database, save_citation_database

    # Load database
    db_path = Path(args.database)
    if not db_path.exists():
        logger.error(f"Database not found: {args.database}")
        sys.exit(1)

    citation_database = load_citation_database(db_path)

    # Scrape metadata
    scraper = MetadataScraper(verbose=args.verbose)
    filter_fn = None if args.all else None  # Use default filter
    success_count, fail_count = scraper.scrape_citations(
        citation_database.citations,
        filter_condition=filter_fn
    )

    # Save updated database
    output_path = Path(args.output) if args.output else db_path
    save_citation_database(citation_database, output_path)

    logger.info("Summary:")
    logger.info(f"  Total citations: {len(citation_database.citations)}")
    logger.info(f"  Scraped: {success_count + fail_count}")
    logger.info(f"  Successful: {success_count}")
    logger.info(f"  Failed: {fail_count}")
    logger.info(f"Saved to: {output_path}")
