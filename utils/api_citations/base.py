#!/usr/bin/env python3
"""
ABOUTME: Base API client with error handling, retries, and rate limiting
ABOUTME: Provides production-grade HTTP request infrastructure for academic APIs
"""

import time
import logging
import random
import requests
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# Browser User-Agent pool for rotation (reduces rate limiting)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

# Optional proxy configuration loaded from environment
# Format: comma-separated "host:port:username:password" strings
# Example: PROXY_LIST_ENV="proxy1.com:8080:user:pass,proxy2.com:8080:user:pass"
import os

def _load_proxy_list() -> list:
    """Load proxy list from PROXY_LIST environment variable."""
    proxy_env = os.getenv('PROXY_LIST', '')
    if not proxy_env:
        return []
    return [p.strip() for p in proxy_env.split(',') if p.strip()]

PROXY_LIST: list = _load_proxy_list()

def parse_proxy(proxy_str: str) -> dict:
    """Parse proxy string to requests-compatible dict."""
    parts = proxy_str.split(":")
    if len(parts) == 4:
        host, port, user, password = parts
        proxy_url = f"http://{user}:{password}@{host}:{port}"
    elif len(parts) == 2:
        host, port = parts
        proxy_url = f"http://{host}:{port}"
    else:
        return {}
    return {"http": proxy_url, "https": proxy_url}

# Standard browser headers
BROWSER_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

# =========================================================================
# Citation Quality Validation Functions (Fix 2 & Fix 5)
# =========================================================================

import datetime

CURRENT_YEAR = datetime.datetime.now().year

def validate_author_name(author_name: str) -> tuple:
    """
    Validate author name is academically acceptable.
    
    Args:
        author_name: Author name string
        
    Returns:
        Tuple of (is_valid, reason)
    """
    if not author_name:
        return (False, "empty")
    
    name = author_name.strip()
    
    # Reject single-character authors (e.g., "R et al.")
    if len(name) <= 2:
        return (False, "too_short")
    
    # Reject domain-like authors (e.g., "education.illinois.edu")
    domain_tlds = ['.com', '.org', '.net', '.edu', '.gov', '.io', '.ai', '.int']
    if '.' in name and any(tld in name.lower() for tld in domain_tlds):
        return (False, "domain_as_author")
    
    # Reject URLs as authors
    if name.startswith('http://') or name.startswith('https://'):
        return (False, "url_as_author")
    
    # Reject generic/institutional author names (metadata pollution)
    generic_terms = [
        'working paper', 'discussion paper', 'technical report', 'staff report',
        'research paper', 'policy brief', 'white paper', 'occasional paper',
        'series', 'anonymous', 'unknown', 'author', 'authors', 'editor', 'editors',
        'committee', 'commission', 'group', 'team', 'staff', 'admin', 'administrator'
    ]
    name_lower = name.lower()
    if any(term in name_lower for term in generic_terms):
        return (False, "generic_author")
    
    return (True, "valid")

def validate_publication_year(year: int) -> tuple:
    """
    Validate publication year is reasonable.
    
    Args:
        year: Publication year
        
    Returns:
        Tuple of (is_valid, reason, is_recent)
    """
    if not year:
        return (False, "no_year", False)
    
    try:
        year_int = int(year)
    except (ValueError, TypeError):
        return (False, "invalid_year", False)
    
    # Future years are impossible
    if year_int > CURRENT_YEAR:
        return (False, "future_year", False)
    
    # Very old papers (pre-1900) are suspicious
    if year_int < 1900:
        return (False, "ancient_year", False)
    
    # Current year papers might be preprints
    is_recent = (year_int == CURRENT_YEAR)
    
    return (True, "valid", is_recent)


class BaseAPIClient(ABC):
    """
    Base class for academic API clients.

    Provides:
    - Exponential backoff retries
    - Rate limiting
    - Error handling
    - Request logging
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        rate_limit_per_second: float = 10.0,
        timeout: int = 10,
        max_retries: int = 3,
    ):
        """
        Initialize API client.

        Args:
            base_url: Base URL for API
            api_key: Optional API key for authenticated requests
            rate_limit_per_second: Maximum requests per second
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts for failed requests
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.rate_limit_per_second = rate_limit_per_second
        self.timeout = timeout
        self.max_retries = max_retries

        # Rate limiting state
        self.last_request_time: float = 0.0
        self.min_interval: float = 1.0 / rate_limit_per_second

        # Session for connection pooling
        self.session = requests.Session()
        # Apply browser headers (User-Agent rotated per request)
        self.session.headers.update(BROWSER_HEADERS)

    def _rate_limit_wait(self) -> None:
        """Wait if necessary to respect rate limit."""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time

        if time_since_last_request < self.min_interval:
            sleep_time = self.min_interval - time_since_last_request
            logger.debug(f"Rate limit: sleeping {sleep_time:.3f}s")
            time.sleep(sleep_time)

        self.last_request_time = time.time()

    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Make HTTP request with retries and error handling.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (relative to base_url)
            params: Query parameters
            json_data: JSON request body

        Returns:
            Response JSON dict or None if all retries failed
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        for attempt in range(self.max_retries):
            try:
                # Rate limiting
                self._rate_limit_wait()

                # Make request
                logger.debug(f"Request: {method} {url} (attempt {attempt + 1}/{self.max_retries})")

                # Rotate User-Agent for each request to avoid rate limiting
                headers = {"User-Agent": random.choice(USER_AGENTS)}
                
                response = self.session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json_data,
                    headers=headers,
                    timeout=self.timeout,
                    proxies=parse_proxy(random.choice(PROXY_LIST)) if PROXY_LIST else None,
                )

                # Check status code
                if response.status_code == 200:
                    return response.json()

                elif response.status_code == 404:
                    logger.debug(f"Resource not found: {url}")
                    return None  # Not found is not an error, just no result

                elif response.status_code == 429:
                    # Rate limited - wait longer
                    wait_time = 2**attempt  # Exponential backoff
                    logger.warning(f"Rate limited (429), waiting {wait_time}s before retry")
                    time.sleep(wait_time)
                    continue

                elif response.status_code >= 500:
                    # Server error - retry
                    wait_time = 2**attempt
                    logger.warning(f"Server error ({response.status_code}), waiting {wait_time}s before retry")
                    time.sleep(wait_time)
                    continue

                else:
                    # Client error - don't retry
                    logger.error(f"Client error: {response.status_code} - {response.text[:200]}")
                    return None

            except requests.exceptions.Timeout:
                wait_time = 2**attempt
                logger.warning(f"Request timeout, waiting {wait_time}s before retry")
                time.sleep(wait_time)
                continue

            except requests.exceptions.ConnectionError as e:
                wait_time = 2**attempt
                logger.warning(f"Connection error: {e}, waiting {wait_time}s before retry")
                time.sleep(wait_time)
                continue

            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed: {e}")
                return None

            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                return None

        # All retries exhausted
        logger.error(f"All {self.max_retries} retry attempts failed for {url}")
        return None

    @abstractmethod
    def search_paper(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Search for a paper by query.

        Must be implemented by subclasses.

        Args:
            query: Search query (title, authors, keywords)

        Returns:
            Paper metadata dict or None if not found
        """
        pass

    def close(self) -> None:
        """Close the session."""
        self.session.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
