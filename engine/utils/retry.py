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


# Circuit Breaker Pattern (V3 feature)
# Prevents cascading failures by temporarily blocking calls to failing services

import threading
import time as time_module
from enum import Enum
from dataclasses import dataclass


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation, calls allowed
    OPEN = "open"          # Failures exceeded threshold, calls blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5      # Open circuit after N failures
    reset_timeout: float = 60.0     # Seconds before trying half-open
    success_threshold: int = 2      # Successes needed to close from half-open


class CircuitBreaker:
    """
    Circuit breaker to prevent cascading failures.

    When a service fails repeatedly, the circuit breaker "opens" and
    immediately rejects calls instead of wasting resources on a failing
    service. After a cooldown period, it allows a probe call to check
    if the service has recovered.

    Usage:
        breaker = CircuitBreaker("gemini_api")

        @breaker.protect
        def call_gemini(prompt: str) -> str:
            return gemini_client.generate(prompt)

        # Or manual:
        if breaker.allow_request():
            try:
                result = call_gemini(prompt)
                breaker.record_success()
            except Exception as e:
                breaker.record_failure(e)
                raise
    """

    _instances: dict = {}  # Shared state across instances by name
    _lock = threading.Lock()

    def __new__(cls, name: str, config: Optional[CircuitBreakerConfig] = None):
        """Ensure single instance per name (singleton per service)."""
        with cls._lock:
            if name not in cls._instances:
                instance = super().__new__(cls)
                instance._initialized = False
                cls._instances[name] = instance
            return cls._instances[name]

    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        """Initialize circuit breaker for a named service."""
        if getattr(self, '_initialized', False):
            return  # Already initialized

        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self._state_lock = threading.Lock()
        self._initialized = True

        logger.debug(f"CircuitBreaker '{name}' initialized: {self.config}")

    def allow_request(self) -> bool:
        """Check if a request should be allowed."""
        with self._state_lock:
            if self.state == CircuitState.CLOSED:
                return True

            if self.state == CircuitState.OPEN:
                # Check if reset timeout has passed
                if self.last_failure_time is None:
                    return True
                elapsed = time_module.time() - self.last_failure_time
                if elapsed >= self.config.reset_timeout:
                    # Transition to half-open
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                    logger.info(f"CircuitBreaker '{self.name}': OPEN -> HALF_OPEN (probe allowed)")
                    return True
                return False

            if self.state == CircuitState.HALF_OPEN:
                # Allow single probe request
                return True

            return False

    def record_success(self) -> None:
        """Record a successful call."""
        with self._state_lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.config.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.success_count = 0
                    logger.info(f"CircuitBreaker '{self.name}': HALF_OPEN -> CLOSED (service recovered)")
            elif self.state == CircuitState.CLOSED:
                # Reset failure count on success
                self.failure_count = 0

    def record_failure(self, error: Optional[Exception] = None) -> None:
        """Record a failed call."""
        with self._state_lock:
            self.failure_count += 1
            self.last_failure_time = time_module.time()

            if self.state == CircuitState.HALF_OPEN:
                # Probe failed, back to open
                self.state = CircuitState.OPEN
                logger.warning(f"CircuitBreaker '{self.name}': HALF_OPEN -> OPEN (probe failed: {error})")
            elif self.state == CircuitState.CLOSED:
                if self.failure_count >= self.config.failure_threshold:
                    self.state = CircuitState.OPEN
                    logger.warning(
                        f"CircuitBreaker '{self.name}': CLOSED -> OPEN "
                        f"(threshold {self.config.failure_threshold} reached)"
                    )

    def protect(self, func: Callable[..., T]) -> Callable[..., T]:
        """Decorator to protect a function with the circuit breaker."""
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            if not self.allow_request():
                raise CircuitOpenError(
                    f"Circuit breaker '{self.name}' is OPEN - service unavailable"
                )
            try:
                result = func(*args, **kwargs)
                self.record_success()
                return result
            except Exception as e:
                self.record_failure(e)
                raise
        return wrapper

    def reset(self) -> None:
        """Reset circuit breaker to closed state (for testing)."""
        with self._state_lock:
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.success_count = 0
            self.last_failure_time = None
            logger.debug(f"CircuitBreaker '{self.name}' reset to CLOSED")


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open and request is rejected."""
    pass


# Pre-configured circuit breakers for common services
def get_gemini_circuit_breaker() -> CircuitBreaker:
    """Get or create circuit breaker for Gemini API."""
    return CircuitBreaker(
        "gemini_api",
        CircuitBreakerConfig(failure_threshold=5, reset_timeout=60.0, success_threshold=2)
    )


def get_citation_circuit_breaker() -> CircuitBreaker:
    """Get or create circuit breaker for citation APIs."""
    return CircuitBreaker(
        "citation_apis",
        CircuitBreakerConfig(failure_threshold=10, reset_timeout=30.0, success_threshold=3)
    )


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
