#!/usr/bin/env python3
"""
ABOUTME: Web scraper for extracting real page titles from citation URLs
ABOUTME: Fixes Gemini Grounded citations with domain-name titles (bcg.com, mckinsey.com, etc.)

This module provides utilities to scrape real page titles from web URLs
and update citation databases with accurate, descriptive titles.

Design Principles:
- Defensive: Handles network errors, timeouts, malformed HTML gracefully
- Efficient: Uses connection pooling, respects rate limits
- Accurate: Extracts <title>, <meta> tags, fallback to <h1>
"""

import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse
import time
import re
from utils.logging_config import get_logger
from utils.retry import retry_on_network_error

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


class TitleScraper:
    """
    Scrapes page titles from URLs with intelligent fallbacks.
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
    def scrape_title(self, url: str) -> Optional[str]:
        """
        Scrape page title from URL.

        Tries multiple strategies:
        1. <title> tag
        2. <meta property="og:title"> (Open Graph)
        3. <meta name="twitter:title"> (Twitter Card)
        4. <h1> tag (first one)
        5. URL path (last resort)

        Args:
            url: URL to scrape

        Returns:
            Page title or None if scraping failed
        """
        if self.verbose:
            logger.info(f"Scraping title from: {url[:80]}...")

        try:
            response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Strategy 1: <title> tag
            title_tag = soup.find('title')
            if title_tag and title_tag.string:
                title = title_tag.string.strip()
                if self._is_valid_title(title):
                    if self.verbose:
                        logger.debug(f"Found title tag: {title[:60]}...")
                    return self._clean_title(title)

            # Strategy 2: Open Graph title
            og_title = soup.find('meta', property='og:title')
            if og_title and og_title.get('content'):
                title = og_title['content'].strip()
                if self._is_valid_title(title):
                    if self.verbose:
                        logger.debug(f"Found Open Graph title: {title[:60]}...")
                    return self._clean_title(title)

            # Strategy 3: Twitter Card title
            twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
            if twitter_title and twitter_title.get('content'):
                title = twitter_title['content'].strip()
                if self._is_valid_title(title):
                    if self.verbose:
                        logger.debug(f"Found Twitter Card title: {title[:60]}...")
                    return self._clean_title(title)

            # Strategy 4: First <h1> tag
            h1_tag = soup.find('h1')
            if h1_tag:
                title = h1_tag.get_text().strip()
                if self._is_valid_title(title):
                    if self.verbose:
                        logger.debug(f"Found H1 title: {title[:60]}...")
                    return self._clean_title(title)

            # Strategy 5: URL path (last resort)
            parsed = urlparse(url)
            path_title = parsed.path.rstrip('/').split('/')[-1]
            if path_title and len(path_title) > 3:
                title = path_title.replace('-', ' ').replace('_', ' ').title()
                if self.verbose:
                    logger.warning(f"Using URL fallback title: {title[:60]}...")
                return self._clean_title(title)

            if self.verbose:
                logger.warning(f"No title found for {url[:60]}")

            return None

        except requests.exceptions.Timeout:
            if self.verbose:
                logger.warning(f"Timeout scraping {url[:60]}")
            return None
        except requests.exceptions.RequestException as e:
            if self.verbose:
                logger.warning(f"Request error scraping {url[:60]}: {str(e)[:50]}")
            return None
        except Exception as e:
            if self.verbose:
                logger.error(f"Unexpected error scraping {url[:60]}: {str(e)[:50]}", exc_info=True)
            return None

    def _is_valid_title(self, title: str) -> bool:
        """
        Check if title is valid (not empty, not too short, not just a domain).

        Args:
            title: Title to validate

        Returns:
            True if valid, False otherwise
        """
        if not title or len(title) < 5:
            return False

        # Reject if it's just a domain name
        if re.match(r'^[\w\-]+\.(com|org|edu|gov|net|io|ai)$', title.lower()):
            return False

        # Reject common generic titles
        generic = {'home', 'index', 'main', 'page', 'untitled', 'document', 'website'}
        if title.lower() in generic:
            return False

        return True

    def _clean_title(self, title: str) -> str:
        """
        Clean and normalize title.

        Args:
            title: Raw title

        Returns:
            Cleaned title
        """
        # Remove common suffixes
        suffixes = [
            ' | McKinsey',
            ' - McKinsey',
            ' | BCG',
            ' - BCG',
            ' | OECD',
            ' - OECD',
            ' | World Bank',
            ' - World Bank',
            ' - YouTube',
            ' | Gartner',
            ' - Gartner',
        ]

        for suffix in suffixes:
            if title.endswith(suffix):
                title = title[:-len(suffix)].strip()

        # Collapse whitespace
        title = re.sub(r'\s+', ' ', title)

        # Limit length
        if len(title) > 200:
            title = title[:197] + '...'

        return title

    def scrape_citations(
        self,
        citations: List[Dict],
        filter_condition: Optional[callable] = None
    ) -> Tuple[int, int]:
        """
        Scrape titles for multiple citations.

        Args:
            citations: List of citation dictionaries
            filter_condition: Optional function to filter which citations to scrape
                             (default: only Gemini Grounded with bad titles)

        Returns:
            Tuple of (successful_count, failed_count)
        """
        if filter_condition is None:
            # Default: Gemini Grounded with domain-name titles
            def default_filter(c):
                if safe_get(c, 'api_source') != 'Gemini Grounded':
                    return False
                title = safe_get(c, 'title', '')
                # Bad title indicators
                return (
                    title.endswith('.com') or
                    title.endswith('.org') or
                    title.endswith('.edu') or
                    title.endswith('.gov') or
                    title.endswith('.net') or
                    title.endswith('.io') or
                    title.endswith('.ai') or
                    len(title) < 10 or
                    title.lower() in ['source', 'website', 'page', 'article']
                )
            filter_condition = default_filter

        # Filter citations
        to_scrape = [c for c in citations if filter_condition(c)]

        if not to_scrape:
            if self.verbose:
                logger.info("No citations need title scraping")
            return 0, 0

        logger.info(f"Scraping titles for {len(to_scrape)} citations...")

        success_count = 0
        fail_count = 0

        for i, citation in enumerate(to_scrape, 1):
            url = safe_get(citation, 'url')
            if not url:
                fail_count += 1
                continue

            if self.verbose:
                logger.info(f"Processing citation [{i}/{len(to_scrape)}]: {safe_get(citation, 'id')}")
                logger.debug(f"Old title: '{safe_get(citation, 'title', 'N/A')}'")

            # Scrape title
            new_title = self.scrape_title(url)

            if new_title:
                if hasattr(citation, 'title'):
                    citation.title = new_title
                else:
                    citation['title'] = new_title
                success_count += 1
                if self.verbose:
                    logger.info(f"Successfully scraped title: '{new_title}'")
            else:
                fail_count += 1
                if self.verbose:
                    logger.warning(f"Failed to scrape title for {safe_get(citation, 'id')}")

            # Rate limiting
            if i < len(to_scrape):
                time.sleep(self.rate_limit_delay)

        return success_count, fail_count


def scrape_citation_database_titles(
    database_path: str,
    output_path: Optional[str] = None,
    filter_condition: Optional[callable] = None,
    verbose: bool = False
) -> Dict:
    """
    Scrape titles for citations in a citation database JSON file.

    Args:
        database_path: Path to citation_database.json
        output_path: Path to save updated database (None = overwrite original)
        filter_condition: Optional function to filter which citations to scrape
        verbose: Print detailed information

    Returns:
        Statistics dictionary
    """
    import json
    from pathlib import Path

    db_path = Path(database_path)

    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {database_path}")

    # Load database
    with open(db_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            import logging
            logging.getLogger(__name__).warning(f"Invalid JSON in {database_path}: {e}")
            return {'total_citations': 0, 'scraped_count': 0, 'successful': 0, 'failed': 0}

    citations = data.get('citations', [])

    # Scrape titles
    scraper = TitleScraper(verbose=verbose)
    success_count, fail_count = scraper.scrape_citations(citations, filter_condition)

    # Update database
    data['citations'] = citations
    if 'metadata' in data:
        data['metadata']['title_scraping_applied'] = True
        data['metadata']['titles_updated'] = success_count

    # Save
    if output_path is None:
        output_path = db_path

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    stats = {
        'total_citations': len(citations),
        'scraped_count': success_count + fail_count,
        'successful': success_count,
        'failed': fail_count
    }

    if verbose:
        logger.info(f"Saved updated database to: {output_path}")

    return stats


if __name__ == '__main__':
    import sys
    import argparse

    parser = argparse.ArgumentParser(description='Scrape titles for Gemini Grounded citations')
    parser.add_argument('database', help='Path to citation_database.json')
    parser.add_argument('-o', '--output', help='Output path (default: overwrite original)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--all', action='store_true', help='Scrape all citations (not just Gemini)')

    args = parser.parse_args()

    filter_fn = None if args.all else None  # Use default filter

    stats = scrape_citation_database_titles(
        args.database,
        output_path=args.output,
        filter_condition=filter_fn,
        verbose=args.verbose
    )

    logger.info("Summary:")
    logger.info(f"  Total citations: {stats['total_citations']}")
    logger.info(f"  Scraped: {stats['scraped_count']}")
    logger.info(f"  Successful: {stats['successful']}")
    logger.info(f"  Failed: {stats['failed']}")
