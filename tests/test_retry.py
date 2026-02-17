#!/usr/bin/env python3
"""
ABOUTME: Tests for the Tenacity-powered retry decorators
ABOUTME: Validates retry, retry_on_network_error, and exponential_backoff_with_jitter
"""

import sys
import os
from unittest.mock import MagicMock

import pytest

# Add engine directory to path so utils can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engine'))

from utils.retry import retry, retry_on_network_error, exponential_backoff_with_jitter


# =========================================================================
# exponential_backoff_with_jitter tests
# =========================================================================

class TestExponentialBackoffWithJitter:
    """Tests for the exponential_backoff_with_jitter utility function."""

    def test_no_jitter_returns_exact_exponential(self):
        """Without jitter, delay should be exactly base_delay * 2^attempt."""
        assert exponential_backoff_with_jitter(0, base_delay=1.0, jitter=False) == 1.0
        assert exponential_backoff_with_jitter(1, base_delay=1.0, jitter=False) == 2.0
        assert exponential_backoff_with_jitter(2, base_delay=1.0, jitter=False) == 4.0
        assert exponential_backoff_with_jitter(3, base_delay=1.0, jitter=False) == 8.0

    def test_respects_max_delay(self):
        """Delay should never exceed max_delay."""
        delay = exponential_backoff_with_jitter(10, base_delay=1.0, max_delay=30.0, jitter=False)
        assert delay == 30.0

    def test_with_jitter_stays_in_range(self):
        """With jitter, delay should be within ±25% of the base exponential."""
        for _ in range(100):
            delay = exponential_backoff_with_jitter(2, base_delay=1.0, jitter=True)
            # Base delay for attempt 2 is 4.0, jitter range is ±1.0
            assert 3.0 <= delay <= 5.0

    def test_non_negative(self):
        """Delay should always be non-negative."""
        for attempt in range(10):
            delay = exponential_backoff_with_jitter(attempt, base_delay=0.01, jitter=True)
            assert delay >= 0.0

    def test_custom_base_delay(self):
        """Custom base_delay should scale correctly."""
        assert exponential_backoff_with_jitter(0, base_delay=2.0, jitter=False) == 2.0
        assert exponential_backoff_with_jitter(1, base_delay=2.0, jitter=False) == 4.0
        assert exponential_backoff_with_jitter(2, base_delay=2.0, jitter=False) == 8.0


# =========================================================================
# retry decorator tests
# =========================================================================

class TestRetryDecorator:
    """Tests for the retry() decorator."""

    def test_succeeds_on_first_attempt(self):
        """Function that succeeds immediately should return normally."""
        @retry(max_attempts=3, base_delay=0.01)
        def always_works():
            return "ok"

        assert always_works() == "ok"

    def test_succeeds_after_transient_failures(self):
        """Function should succeed after transient failures within max_attempts."""
        call_count = 0

        @retry(max_attempts=3, base_delay=0.01)
        def fails_twice():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("transient")
            return "recovered"

        assert fails_twice() == "recovered"
        assert call_count == 3

    def test_raises_after_max_attempts_exhausted(self):
        """Should raise the last exception after all attempts are exhausted."""
        call_count = 0

        @retry(max_attempts=3, base_delay=0.01)
        def always_fails():
            nonlocal call_count
            call_count += 1
            raise ValueError(f"failure {call_count}")

        with pytest.raises(ValueError, match="failure 3"):
            always_fails()
        assert call_count == 3

    def test_only_catches_specified_exceptions(self):
        """Should only retry on specified exception types, not others."""
        call_count = 0

        @retry(max_attempts=3, base_delay=0.01, exceptions=(ValueError,))
        def raises_type_error():
            nonlocal call_count
            call_count += 1
            raise TypeError("wrong type")

        with pytest.raises(TypeError):
            raises_type_error()
        # Should fail immediately without retrying
        assert call_count == 1

    def test_on_retry_callback_is_invoked(self):
        """The on_retry callback should be called with (exception, attempt_number)."""
        callback_calls = []

        def my_callback(exc, attempt):
            callback_calls.append((str(exc), attempt))

        call_count = 0

        @retry(max_attempts=3, base_delay=0.01, on_retry=my_callback)
        def fails_then_succeeds():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError(f"fail {call_count}")
            return "ok"

        result = fails_then_succeeds()
        assert result == "ok"
        assert len(callback_calls) == 2
        assert callback_calls[0] == ("fail 1", 1)
        assert callback_calls[1] == ("fail 2", 2)

    def test_preserves_function_metadata(self):
        """Decorated function should preserve __name__ and __doc__."""
        @retry(max_attempts=2, base_delay=0.01)
        def my_function():
            """My docstring."""
            return True

        assert my_function.__name__ == "my_function"
        assert my_function.__doc__ == "My docstring."


# =========================================================================
# retry_on_network_error decorator tests
# =========================================================================

class TestRetryOnNetworkError:
    """Tests for the retry_on_network_error() decorator."""

    def test_retries_on_timeout(self):
        """Should retry on requests.Timeout."""
        import requests
        call_count = 0

        @retry_on_network_error(max_attempts=3, base_delay=0.01)
        def timeout_then_ok():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise requests.Timeout("timed out")
            return "ok"

        assert timeout_then_ok() == "ok"
        assert call_count == 3

    def test_retries_on_connection_error(self):
        """Should retry on requests.ConnectionError."""
        import requests
        call_count = 0

        @retry_on_network_error(max_attempts=3, base_delay=0.01)
        def conn_err_then_ok():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise requests.ConnectionError("connection refused")
            return "ok"

        assert conn_err_then_ok() == "ok"
        assert call_count == 2

    def test_retries_on_5xx_http_error(self):
        """Should retry on 5xx HTTPError."""
        import requests
        call_count = 0

        @retry_on_network_error(max_attempts=3, base_delay=0.01)
        def server_error_then_ok():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                response = MagicMock()
                response.status_code = 503
                raise requests.HTTPError(response=response)
            return "ok"

        assert server_error_then_ok() == "ok"
        assert call_count == 3

    def test_does_not_retry_on_4xx_http_error(self):
        """Should NOT retry on 4xx HTTPError (client error)."""
        import requests
        call_count = 0

        @retry_on_network_error(max_attempts=3, base_delay=0.01)
        def client_error():
            nonlocal call_count
            call_count += 1
            response = MagicMock()
            response.status_code = 404
            raise requests.HTTPError(response=response)

        with pytest.raises(requests.HTTPError):
            client_error()
        # Should fail immediately — 4xx is not retriable
        assert call_count == 1

    def test_does_not_retry_on_unrelated_exception(self):
        """Should NOT retry on non-network exceptions like ValueError."""
        call_count = 0

        @retry_on_network_error(max_attempts=3, base_delay=0.01)
        def value_error():
            nonlocal call_count
            call_count += 1
            raise ValueError("not a network error")

        with pytest.raises(ValueError):
            value_error()
        assert call_count == 1

    def test_preserves_function_metadata(self):
        """Decorated function should preserve __name__ and __doc__."""
        @retry_on_network_error(max_attempts=2, base_delay=0.01)
        def my_network_function():
            """Fetches stuff."""
            return True

        assert my_network_function.__name__ == "my_network_function"
        assert my_network_function.__doc__ == "Fetches stuff."
