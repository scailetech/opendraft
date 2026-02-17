#!/usr/bin/env python3
"""
ABOUTME: Firecrawl API client for web page scraping and content extraction
ABOUTME: Drop-in replacement for OpenPull/crawl4ai using Firecrawl's cloud API
"""

import os
import logging
from typing import Optional, Dict, Any, List

try:
    import requests
except ImportError:
    requests = None

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

logger = logging.getLogger(__name__)


class FirecrawlClient:
    """
    Firecrawl API client for web scraping with JavaScript rendering.

    Uses Firecrawl's cloud API to scrape web pages and extract clean content
    in markdown or structured formats. Supports JavaScript-heavy pages.

    Features:
    - JavaScript rendering (handles SPAs, dynamic content)
    - Clean markdown extraction
    - Automatic content cleaning (removes ads, nav, etc.)
    - Rate limiting and retries
    - Fallback to simple scraper

    Requirements:
    - requests
    - FIRECRAWL_API_KEY environment variable
    """

    FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1"

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: int = 60,
        max_retries: int = 2,
    ):
        """
        Initialize Firecrawl client.

        Args:
            api_key: Firecrawl API key (defaults to FIRECRAWL_API_KEY env var)
            timeout: Request timeout in seconds
            max_retries: Number of retry attempts
        """
        if load_dotenv is not None:
            load_dotenv()

        self.api_key = api_key or os.getenv('FIRECRAWL_API_KEY')
        self.timeout = timeout
        self.max_retries = max_retries

        if not requests:
            raise ImportError("requests not installed. Run: pip install requests")

        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        })

    @property
    def enabled(self) -> bool:
        """Check if Firecrawl is configured and available."""
        return bool(self.api_key)

    def scrape_url(self, url: str) -> Dict[str, Any]:
        """
        Scrape a webpage and extract content using Firecrawl.

        Args:
            url: The URL to scrape

        Returns:
            Dict with:
                - success: bool
                - content: str (markdown content)
                - html: str (optional, raw HTML)
                - metadata: dict (title, description, etc.)
                - error: str (if failed)
        """
        if not self.enabled:
            return self._fallback_scrape(url)

        try:
            response = self._call_scrape_api(url)

            if response.get('success'):
                return {
                    'success': True,
                    'content': response.get('markdown', ''),
                    'html': response.get('html', ''),
                    'metadata': response.get('metadata', {}),
                    'url': url,
                }
            else:
                error = response.get('error', 'Unknown Firecrawl error')
                logger.warning(f"Firecrawl scrape failed for {url}: {error}")
                return self._fallback_scrape(url)

        except Exception as e:
            logger.warning(f"Firecrawl error for {url}: {e}")
            return self._fallback_scrape(url)

    def _call_scrape_api(self, url: str) -> Dict[str, Any]:
        """
        Call Firecrawl's scrape API endpoint.

        Args:
            url: URL to scrape

        Returns:
            API response dict
        """
        endpoint = f"{self.FIRECRAWL_API_URL}/scrape"

        payload = {
            'url': url,
            'formats': ['markdown', 'html'],
            'onlyMainContent': True,  # Extract main content only
            'waitFor': 2000,  # Wait for JS to load (ms)
        }

        for attempt in range(self.max_retries):
            try:
                response = self.session.post(
                    endpoint,
                    json=payload,
                    timeout=self.timeout,
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        'success': data.get('success', True),
                        'markdown': data.get('data', {}).get('markdown', ''),
                        'html': data.get('data', {}).get('html', ''),
                        'metadata': data.get('data', {}).get('metadata', {}),
                    }

                elif response.status_code == 429:
                    # Rate limited
                    logger.warning(f"Firecrawl rate limited (429), attempt {attempt + 1}/{self.max_retries}")
                    import time
                    time.sleep(2 ** attempt)
                    continue

                elif response.status_code == 402:
                    # Payment required / credits exhausted
                    logger.error("Firecrawl credits exhausted (402)")
                    return {'success': False, 'error': 'Firecrawl credits exhausted'}

                elif response.status_code == 404:
                    return {'success': False, 'error': f'Page not found (404): {url}'}

                else:
                    error_text = response.text[:200]
                    logger.warning(f"Firecrawl API error {response.status_code}: {error_text}")
                    return {'success': False, 'error': f'API error {response.status_code}'}

            except requests.exceptions.Timeout:
                logger.warning(f"Firecrawl timeout for {url}, attempt {attempt + 1}/{self.max_retries}")
                continue

            except requests.exceptions.RequestException as e:
                logger.warning(f"Firecrawl request error: {e}")
                return {'success': False, 'error': str(e)}

        return {'success': False, 'error': f'Max retries ({self.max_retries}) exceeded'}

    def _fallback_scrape(self, url: str) -> Dict[str, Any]:
        """
        Simple fallback scraper using requests + BeautifulSoup.

        Used when Firecrawl is not available or fails.

        Args:
            url: URL to scrape

        Returns:
            Dict with success, content, error
        """
        logger.info(f"Using fallback scraper for: {url[:50]}...")

        try:
            # Simple requests-based scraping
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                              'AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }

            response = requests.get(url, headers=headers, timeout=15)

            # Check HTTP status
            if response.status_code == 404:
                return {
                    'success': False,
                    'error': f'Page not found (404): {url}',
                    'content': '',
                }
            if response.status_code == 403:
                return {
                    'success': False,
                    'error': f'Access forbidden (403): {url}',
                    'content': '',
                }
            if response.status_code >= 400:
                return {
                    'success': False,
                    'error': f'HTTP error {response.status_code}: {url}',
                    'content': '',
                }

            response.raise_for_status()

            # Parse with BeautifulSoup
            try:
                from bs4 import BeautifulSoup
            except ImportError:
                # If BeautifulSoup not available, return raw text
                content = response.text[:15000]
                return {
                    'success': True,
                    'content': content,
                    'url': url,
                }

            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove non-content elements
            for element in soup(['script', 'style', 'noscript', 'head', 'meta',
                                 'link', 'svg', 'iframe', 'nav', 'footer', 'aside']):
                element.decompose()

            # Get text with proper whitespace
            content = soup.get_text(separator=' ', strip=True)

            # Truncate to reasonable length
            if len(content) > 15000:
                content = content[:15000] + "\n\n... [content truncated]"

            logger.info(f"Fallback scraper extracted {len(content)} chars from: {url[:50]}...")

            return {
                'success': True,
                'content': content,
                'url': url,
            }

        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': f'Request timeout: {url}',
                'content': '',
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e),
                'content': '',
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'content': '',
            }

    def close(self) -> None:
        """Close HTTP session."""
        if hasattr(self, 'session'):
            self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# Convenience functions matching existing interface

def scrape_page_with_firecrawl(url: str) -> Dict[str, Any]:
    """
    Scrape a webpage using Firecrawl.

    Drop-in replacement for scrape_page_with_openpull().

    Args:
        url: The URL to scrape

    Returns:
        Dict with 'success', 'content', and 'error' if failed
    """
    try:
        client = FirecrawlClient()
        return client.scrape_url(url)
    except Exception as e:
        logger.error(f"Firecrawl scrape error: {e}")
        # Use fallback
        return FirecrawlClient(api_key=None)._fallback_scrape(url)


def get_url_context_firecrawl(url: str) -> Dict[str, Any]:
    """
    Get URL content using Firecrawl.

    Alias for scrape_page_with_firecrawl() for backward compatibility.
    """
    return scrape_page_with_firecrawl(url)


# Update fallback_services.py compatibility
def get_url_context_simple(url: str) -> Dict[str, Any]:
    """
    Simple URL content extraction fallback.

    Uses Firecrawl's fallback scraper directly.
    """
    client = FirecrawlClient(api_key=None)  # Force fallback mode
    return client._fallback_scrape(url)
