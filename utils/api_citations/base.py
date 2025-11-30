#!/usr/bin/env python3
"""
ABOUTME: Base API client with error handling, retries, and rate limiting
ABOUTME: Provides production-grade HTTP request infrastructure for academic APIs
"""

import time
import logging
import requests
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


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
        self.session.headers.update({"User-Agent": "OpenDraft/1.3 (https://github.com/federicodeponte/opendraft)"})

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

                response = self.session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json_data,
                    timeout=self.timeout,
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
