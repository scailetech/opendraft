#!/usr/bin/env python3
"""
ABOUTME: Production-grade retry decorator with exponential backoff and jitter
ABOUTME: Provides resilient error recovery for network operations and transient failures

This module implements a robust retry mechanism powered by Tenacity:
- Exponential backoff to avoid overwhelming failing services
- Jitter to prevent thundering herd problem
- Configurable max attempts and delays
- Type-safe with full typing support
- Logging integration for observability

Design Principles:
- SOLID: Single Responsibility (retry logic only)
- DRY: Reusable across all scrapers and API calls
- Production-grade: Handles transient failures gracefully
"""

import random
import functools
from typing import TypeVar, Callable, Optional, Type, Tuple, Any
from utils.logging_config import get_logger
from tenacity import (
    retry as tenacity_retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
    RetryCallState,
)

logger = get_logger(__name__)

# Type variable for preserving function signature
T = TypeVar('T')


def exponential_backoff_with_jitter(
    attempt: int,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True
) -> float:
    """
    Calculate delay with exponential backoff and optional jitter.

    Args:
        attempt: Current attempt number (0-indexed)
        base_delay: Base delay in seconds (default: 1.0)
        max_delay: Maximum delay in seconds (default: 60.0)
        jitter: Add randomization to prevent thundering herd (default: True)

    Returns:
        Delay in seconds before next retry

    Example:
        >>> exponential_backoff_with_jitter(0)  # ~1s
        >>> exponential_backoff_with_jitter(1)  # ~2s
        >>> exponential_backoff_with_jitter(2)  # ~4s
        >>> exponential_backoff_with_jitter(3)  # ~8s
    """
    # Calculate exponential delay: base_delay * 2^attempt
    delay = min(base_delay * (2 ** attempt), max_delay)

    # Add jitter (randomize ±25% to prevent thundering herd)
    if jitter:
        jitter_range = delay * 0.25
        delay = delay + random.uniform(-jitter_range, jitter_range)

    # Ensure non-negative
    return max(0.0, delay)


def retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to retry a function with exponential backoff.

    Args:
        max_attempts: Maximum number of attempts (default: 3)
        base_delay: Initial delay in seconds (default: 1.0)
        max_delay: Maximum delay in seconds (default: 60.0)
        exceptions: Tuple of exception types to catch (default: all)
        on_retry: Optional callback on retry (exception, attempt) -> None

    Returns:
        Decorated function with retry logic

    Example:
        @retry(max_attempts=3, base_delay=2.0, exceptions=(requests.Timeout,))
        def fetch_url(url: str) -> str:
            response = requests.get(url, timeout=10)
            return response.text

    Raises:
        The last exception if all retries are exhausted
    """
    def _before_sleep(retry_state: RetryCallState) -> None:
        """Log warning and call on_retry callback before each retry sleep."""
        exc = retry_state.outcome.exception() if retry_state.outcome else None
        attempt_number = retry_state.attempt_number
        func_name = retry_state.fn.__name__ if retry_state.fn else "unknown"

        logger.warning(
            f"{func_name} failed (attempt {attempt_number}/{max_attempts}): {exc}"
            f" - Retrying..."
        )

        if on_retry and exc:
            on_retry(exc, attempt_number)

    def _after_final_failure(retry_state: RetryCallState) -> None:
        """Log error when all retry attempts are exhausted."""
        if retry_state.outcome and retry_state.outcome.failed:
            if retry_state.attempt_number >= max_attempts:
                exc = retry_state.outcome.exception()
                func_name = retry_state.fn.__name__ if retry_state.fn else "unknown"
                logger.error(
                    f"{func_name} failed after {max_attempts} attempts: {exc}",
                    exc_info=exc,
                )

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @tenacity_retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential_jitter(initial=base_delay, max=max_delay, jitter=base_delay * 0.25),
            retry=retry_if_exception_type(exceptions),
            reraise=True,
            before_sleep=_before_sleep,
            after=_after_final_failure,
        )
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            return func(*args, **kwargs)

        return wrapper
    return decorator


def retry_on_network_error(
    max_attempts: int = 3,
    base_delay: float = 2.0,
    max_delay: float = 30.0
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Specialized retry decorator for network operations.

    Catches common network exceptions:
    - requests.Timeout
    - requests.ConnectionError
    - requests.HTTPError (5xx only)

    Args:
        max_attempts: Maximum number of attempts (default: 3)
        base_delay: Initial delay in seconds (default: 2.0)
        max_delay: Maximum delay in seconds (default: 30.0)

    Returns:
        Decorated function with retry logic

    Example:
        @retry_on_network_error(max_attempts=5)
        def scrape_website(url: str) -> str:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.text
    """
    import requests

    def _should_retry(retry_state: RetryCallState) -> bool:
        """Custom predicate: retry on Timeout, ConnectionError, or 5xx HTTPError."""
        if retry_state.outcome is None:
            return False
        exc = retry_state.outcome.exception()
        if exc is None:
            return False
        if isinstance(exc, (requests.Timeout, requests.ConnectionError)):
            return True
        if isinstance(exc, requests.HTTPError):
            if exc.response is None:
                return True
            return 500 <= exc.response.status_code < 600
        return False

    def _before_sleep(retry_state: RetryCallState) -> None:
        """Log warning before each retry sleep."""
        exc = retry_state.outcome.exception() if retry_state.outcome else None
        attempt_number = retry_state.attempt_number
        func_name = retry_state.fn.__name__ if retry_state.fn else "unknown"

        if isinstance(exc, requests.HTTPError) and exc.response is not None:
            logger.warning(
                f"HTTP {exc.response.status_code} error "
                f"(attempt {attempt_number}/{max_attempts}) - Retrying..."
            )
        else:
            logger.warning(
                f"Network error (attempt {attempt_number}/{max_attempts}): {exc} "
                f"- Retrying..."
            )

    def _after_final_failure(retry_state: RetryCallState) -> None:
        """Log error when all retry attempts are exhausted."""
        if retry_state.outcome and retry_state.outcome.failed:
            if retry_state.attempt_number >= max_attempts:
                exc = retry_state.outcome.exception()
                logger.error(f"Network error after {max_attempts} attempts: {exc}")

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @tenacity_retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential_jitter(initial=base_delay, max=max_delay, jitter=base_delay * 0.25),
            retry=_should_retry,
            reraise=True,
            before_sleep=_before_sleep,
            after=_after_final_failure,
        )
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            return func(*args, **kwargs)

        return wrapper
    return decorator


# Example usage and testing
if __name__ == '__main__':
    import requests

    # Test basic retry
    @retry(max_attempts=3, base_delay=0.1)
    def unreliable_function(fail_count: int) -> str:
        """Simulates a function that fails N times before succeeding."""
        if not hasattr(unreliable_function, 'attempts'):
            unreliable_function.attempts = 0

        unreliable_function.attempts += 1
        if unreliable_function.attempts <= fail_count:
            raise ValueError(f"Simulated failure {unreliable_function.attempts}")

        return "Success!"

    # Test network retry
    @retry_on_network_error(max_attempts=3, base_delay=0.1)
    def fetch_url(url: str) -> str:
        """Fetch URL with retry logic."""
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.text[:100]

    # Run tests
    print("Testing retry decorator...")

    try:
        result = unreliable_function(2)
        print(f"✅ Result after retries: {result}")
    except Exception as e:
        print(f"❌ Failed: {e}")

    try:
        html = fetch_url("https://example.com")
        print(f"✅ Fetched: {html[:50]}...")
    except Exception as e:
        print(f"❌ Failed: {e}")

    print("\nDelay calculations:")
    for i in range(5):
        delay = exponential_backoff_with_jitter(i, base_delay=1.0, jitter=False)
        print(f"  Attempt {i}: {delay:.2f}s")
