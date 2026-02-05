#!/usr/bin/env python3
"""
ABOUTME: Security unit tests for zero-coverage security-critical code paths
ABOUTME: Covers SSRF protection, credential masking, input validation, output validation, backpressure
"""

import sys
import os
import time

import pytest

# Add engine directory to path so utils can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engine'))

from utils.api_citations.base import (
    is_safe_url,
    mask_credentials,
    parse_proxy,
    validate_author_name,
    validate_publication_year,
)
from utils.output_validators import (
    OutputValidator,
    ScoutOutputValidator,
    ScribeOutputValidator,
    ValidationResult,
)
from utils.backpressure import (
    BackpressureManager,
    APIType,
    PRESSURE_CONFIG,
)


# =========================================================================
# SSRF Protection Tests — is_safe_url()
# =========================================================================

class TestSSRFProtection:
    """Tests for URL validation against SSRF attacks."""

    def test_valid_https_url(self):
        """Normal HTTPS URL should be allowed."""
        is_safe, reason = is_safe_url("https://api.crossref.org/works")
        assert is_safe is True
        assert reason == "valid"

    def test_valid_http_url(self):
        """Normal HTTP URL should be allowed."""
        is_safe, reason = is_safe_url("http://example.com/api")
        assert is_safe is True
        assert reason == "valid"

    def test_empty_url_blocked(self):
        """Empty URL should be rejected."""
        is_safe, reason = is_safe_url("")
        assert is_safe is False
        assert reason == "empty_url"

    def test_file_scheme_blocked(self):
        """file:// scheme should be blocked (local file access)."""
        is_safe, reason = is_safe_url("file:///etc/passwd")
        assert is_safe is False
        assert "unsafe_scheme" in reason

    def test_ftp_scheme_blocked(self):
        """ftp:// scheme should be blocked."""
        is_safe, reason = is_safe_url("ftp://example.com/data")
        assert is_safe is False
        assert "unsafe_scheme" in reason

    def test_javascript_scheme_blocked(self):
        """javascript: scheme should be blocked."""
        is_safe, reason = is_safe_url("javascript:alert(1)")
        assert is_safe is False
        assert "unsafe_scheme" in reason

    def test_localhost_blocked(self):
        """localhost should be blocked (internal network access)."""
        is_safe, reason = is_safe_url("http://localhost/admin")
        assert is_safe is False
        assert reason == "localhost_blocked"

    def test_127_0_0_1_blocked(self):
        """127.0.0.1 should be blocked."""
        is_safe, reason = is_safe_url("http://127.0.0.1:8080/api")
        assert is_safe is False
        assert reason == "localhost_blocked"

    def test_ipv6_loopback_blocked(self):
        """::1 (IPv6 loopback) should be blocked."""
        is_safe, reason = is_safe_url("http://[::1]/admin")
        assert is_safe is False
        assert reason == "localhost_blocked"

    def test_0_0_0_0_blocked(self):
        """0.0.0.0 should be blocked."""
        is_safe, reason = is_safe_url("http://0.0.0.0/")
        assert is_safe is False
        assert reason == "localhost_blocked"

    def test_private_ip_10_x_blocked(self):
        """10.x.x.x private range should be blocked."""
        is_safe, reason = is_safe_url("http://10.0.0.1/internal")
        assert is_safe is False
        assert reason == "private_ip_blocked"

    def test_private_ip_172_16_blocked(self):
        """172.16.x.x private range should be blocked."""
        is_safe, reason = is_safe_url("http://172.16.0.1/internal")
        assert is_safe is False
        assert reason == "private_ip_blocked"

    def test_private_ip_192_168_blocked(self):
        """192.168.x.x private range should be blocked."""
        is_safe, reason = is_safe_url("http://192.168.1.1/router")
        assert is_safe is False
        assert reason == "private_ip_blocked"

    def test_aws_metadata_endpoint_blocked(self):
        """AWS metadata endpoint should be blocked."""
        is_safe, reason = is_safe_url("http://169.254.169.254/latest/meta-data/")
        assert is_safe is False
        # Could match either cloud_metadata or private_ip depending on order
        assert is_safe is False

    def test_gcp_metadata_blocked(self):
        """GCP metadata endpoint should be blocked."""
        is_safe, reason = is_safe_url("http://metadata.google.internal/computeMetadata/v1/")
        assert is_safe is False
        assert reason == "cloud_metadata_blocked"

    def test_azure_metadata_blocked(self):
        """Azure metadata endpoint should be blocked."""
        is_safe, reason = is_safe_url("http://metadata.azure.com/metadata/instance")
        assert is_safe is False
        assert reason == "cloud_metadata_blocked"

    def test_public_ip_allowed(self):
        """Public IP addresses should be allowed."""
        is_safe, reason = is_safe_url("http://8.8.8.8/dns")
        assert is_safe is True
        assert reason == "valid"

    def test_normal_hostname_allowed(self):
        """Normal domain names should be allowed."""
        is_safe, reason = is_safe_url("https://api.semanticscholar.org/graph/v1/paper/search")
        assert is_safe is True
        assert reason == "valid"


# =========================================================================
# Credential Masking Tests — mask_credentials()
# =========================================================================

class TestCredentialMasking:
    """Tests for credential masking in proxy URLs."""

    def test_masks_password_in_url(self):
        """Password in proxy URL should be masked."""
        url = "http://user:secret123@proxy.example.com:8080"
        masked = mask_credentials(url)
        assert "secret123" not in masked
        assert "****" in masked
        assert "user" in masked

    def test_no_credentials_unchanged(self):
        """URL without credentials should not be modified."""
        url = "http://proxy.example.com:8080"
        masked = mask_credentials(url)
        assert masked == url

    def test_preserves_host_and_port(self):
        """Host and port should be preserved after masking."""
        url = "http://admin:p4ssw0rd@10.0.0.1:3128"
        masked = mask_credentials(url)
        assert "10.0.0.1:3128" in masked
        assert "p4ssw0rd" not in masked


# =========================================================================
# Proxy Parsing Tests — parse_proxy()
# =========================================================================

class TestProxyParsing:
    """Tests for proxy string parsing."""

    def test_host_port_only(self):
        """Proxy with host:port should produce valid dict."""
        result = parse_proxy("proxy.example.com:8080")
        assert "http" in result
        assert "https" in result
        assert "proxy.example.com:8080" in result["http"]

    def test_host_port_user_pass(self):
        """Proxy with credentials should embed them in URL."""
        result = parse_proxy("proxy.example.com:8080:user:pass")
        assert "user:pass@proxy.example.com:8080" in result["http"]

    def test_invalid_format_returns_empty(self):
        """Invalid proxy format should return empty dict."""
        result = parse_proxy("invalid")
        assert result == {}

    def test_three_part_format_returns_empty(self):
        """Three-part proxy string is invalid."""
        result = parse_proxy("host:port:user")
        assert result == {}


# =========================================================================
# Author Name Validation Tests — validate_author_name()
# =========================================================================

class TestAuthorNameValidation:
    """Tests for author name validation (prevents metadata pollution)."""

    def test_valid_author_name(self):
        """Normal academic author name should pass."""
        is_valid, reason = validate_author_name("John Smith")
        assert is_valid is True
        assert reason == "valid"

    def test_empty_author_rejected(self):
        """Empty author name should be rejected."""
        is_valid, reason = validate_author_name("")
        assert is_valid is False
        assert reason == "empty"

    def test_single_char_author_rejected(self):
        """Single character author should be rejected."""
        is_valid, reason = validate_author_name("R")
        assert is_valid is False
        assert reason == "too_short"

    def test_domain_as_author_rejected(self):
        """Domain name as author should be rejected."""
        is_valid, reason = validate_author_name("education.illinois.edu")
        assert is_valid is False
        assert reason == "domain_as_author"

    def test_url_as_author_rejected(self):
        """URL as author should be rejected."""
        # URL with a non-TLD domain to avoid matching domain_as_author first
        is_valid, reason = validate_author_name("https://internal-server/page")
        assert is_valid is False
        assert reason == "url_as_author"

    def test_generic_term_rejected(self):
        """Generic institutional terms should be rejected."""
        is_valid, reason = validate_author_name("Working Paper Series")
        assert is_valid is False
        assert reason == "generic_author"

    def test_anonymous_rejected(self):
        """'Anonymous' should be rejected."""
        is_valid, reason = validate_author_name("Anonymous")
        assert is_valid is False
        assert reason == "generic_author"

    def test_committee_rejected(self):
        """'Committee' should be rejected."""
        is_valid, reason = validate_author_name("Policy Committee")
        assert is_valid is False
        assert reason == "generic_author"

    def test_real_author_with_initials(self):
        """Author with initials like 'J. K. Rowling' should pass."""
        is_valid, reason = validate_author_name("J. K. Rowling")
        assert is_valid is True

    def test_hyphenated_name(self):
        """Hyphenated names should pass."""
        is_valid, reason = validate_author_name("Mary-Jane Watson")
        assert is_valid is True


# =========================================================================
# Publication Year Validation Tests — validate_publication_year()
# =========================================================================

class TestPublicationYearValidation:
    """Tests for publication year validation."""

    def test_valid_recent_year(self):
        """Recent valid year should pass."""
        is_valid, reason, is_recent = validate_publication_year(2023)
        assert is_valid is True
        assert reason == "valid"

    def test_future_year_rejected(self):
        """Future years should be rejected."""
        is_valid, reason, _ = validate_publication_year(2099)
        assert is_valid is False
        assert reason == "future_year"

    def test_ancient_year_rejected(self):
        """Years before 1900 should be rejected."""
        is_valid, reason, _ = validate_publication_year(1800)
        assert is_valid is False
        assert reason == "ancient_year"

    def test_zero_year_rejected(self):
        """Year 0 should be rejected."""
        is_valid, reason, _ = validate_publication_year(0)
        assert is_valid is False

    def test_none_year_rejected(self):
        """None year should be rejected."""
        is_valid, reason, _ = validate_publication_year(None)
        assert is_valid is False
        assert reason == "no_year"

    def test_current_year_is_recent(self):
        """Current year should be flagged as recent (possible preprint)."""
        import datetime
        current = datetime.datetime.now().year
        is_valid, reason, is_recent = validate_publication_year(current)
        assert is_valid is True
        assert is_recent is True

    def test_last_year_not_recent(self):
        """Last year should not be flagged as recent."""
        import datetime
        last_year = datetime.datetime.now().year - 1
        is_valid, reason, is_recent = validate_publication_year(last_year)
        assert is_valid is True
        assert is_recent is False


# =========================================================================
# Output Validator Tests — OutputValidator
# =========================================================================

class TestOutputValidatorJSON:
    """Tests for JSON validation in OutputValidator."""

    def test_valid_json(self):
        """Valid JSON should pass validation."""
        result = OutputValidator.validate_json('{"key": "value"}')
        assert result.is_valid is True

    def test_invalid_json_rejected(self):
        """Malformed JSON should be rejected."""
        result = OutputValidator.validate_json('{not valid json}')
        assert result.is_valid is False
        assert "Invalid JSON" in result.error_message

    def test_empty_json_rejected(self):
        """Empty JSON object/array should be rejected."""
        result = OutputValidator.validate_json('{}')
        assert result.is_valid is False
        assert "empty" in result.error_message.lower()

    def test_oversized_json_rejected(self):
        """JSON exceeding size limit should be rejected."""
        large = '{"data": "' + "x" * (2 * 1024 * 1024) + '"}'
        result = OutputValidator.validate_json(large, max_size_mb=1.0)
        assert result.is_valid is False
        assert "too large" in result.error_message.lower()


class TestOutputValidatorRepetition:
    """Tests for hallucination/repetition detection."""

    def test_normal_text_passes(self):
        """Normal text without repetition should pass."""
        text = "This is a normal paragraph with varied vocabulary and different words."
        result = OutputValidator.detect_token_repetition(text)
        assert result.is_valid is True

    def test_single_word_repetition_detected(self):
        """Repeated single word should be detected."""
        text = "normal text " + "repeat " * 15
        result = OutputValidator.detect_token_repetition(text)
        assert result.is_valid is False
        assert "repetition" in result.error_message.lower()

    def test_pattern_repetition_detected(self):
        """Repeating pattern should be detected."""
        text = "G. M. " * 10
        result = OutputValidator.detect_token_repetition(text)
        assert result.is_valid is False
        assert "repetition" in result.error_message.lower()

    def test_empty_output_detected(self):
        """Empty output should be flagged."""
        result = OutputValidator.detect_token_repetition("")
        assert result.is_valid is False
        assert "empty" in result.error_message.lower()

    def test_below_threshold_passes(self):
        """Repetition below threshold should pass."""
        text = "word word word normal other text here"
        result = OutputValidator.detect_token_repetition(text, max_consecutive_repeats=10)
        assert result.is_valid is True


class TestOutputValidatorLength:
    """Tests for length requirement validation."""

    def test_meets_min_words(self):
        """Output meeting minimum words should pass."""
        text = " ".join(["word"] * 100)
        result = OutputValidator.check_length_requirements(text, min_words=50)
        assert result.is_valid is True

    def test_below_min_words_rejected(self):
        """Output below minimum words should be rejected."""
        result = OutputValidator.check_length_requirements("short text", min_words=100)
        assert result.is_valid is False
        assert "too short" in result.error_message.lower()

    def test_above_max_words_rejected(self):
        """Output above maximum words should be rejected."""
        text = " ".join(["word"] * 200)
        result = OutputValidator.check_length_requirements(text, max_words=100)
        assert result.is_valid is False
        assert "too long" in result.error_message.lower()

    def test_char_count_enforcement(self):
        """Character count limits should be enforced."""
        result = OutputValidator.check_length_requirements("hi", min_chars=100)
        assert result.is_valid is False


class TestOutputValidatorChaining:
    """Tests for running multiple validators."""

    def test_all_pass(self):
        """All passing validators should return success."""
        validators = [
            lambda x: OutputValidator.check_length_requirements(x, min_words=1),
            lambda x: OutputValidator.detect_token_repetition(x),
        ]
        result = OutputValidator.validate_output("valid normal text here", validators)
        assert result.is_valid is True

    def test_first_failure_returned(self):
        """First failing validator should short-circuit."""
        validators = [
            lambda x: OutputValidator.check_length_requirements(x, min_words=1000),
            lambda x: OutputValidator.detect_token_repetition(x),
        ]
        result = OutputValidator.validate_output("short", validators)
        assert result.is_valid is False
        assert "too short" in result.error_message.lower()


class TestValidationResultBool:
    """Tests for ValidationResult boolean behavior."""

    def test_valid_result_is_truthy(self):
        """Valid result should be truthy."""
        r = ValidationResult(is_valid=True)
        assert bool(r) is True

    def test_invalid_result_is_falsy(self):
        """Invalid result should be falsy."""
        r = ValidationResult(is_valid=False, error_message="fail")
        assert bool(r) is False


# =========================================================================
# Specialized Validator Tests
# =========================================================================

class TestScoutOutputValidator:
    """Tests for Scout Agent output validation."""

    def test_valid_scout_output(self):
        """Valid Scout JSON output should pass."""
        # Build a JSON string that is valid, non-repetitive, and >= 1000 chars
        entries = [
            f'{{"id": {i}, "title": "Research Paper on Topic {i} in Field {i*3}", '
            f'"abstract": "This abstract discusses the findings of study number {i} '
            f'with unique methodology and novel results in domain area {i*7}."}}'
            for i in range(30)
        ]
        data = '{"results": [' + ','.join(entries) + ']}'
        assert len(data) >= 1000
        result = ScoutOutputValidator.validate(data)
        assert result.is_valid is True

    def test_scout_empty_json_rejected(self):
        """Empty JSON should fail Scout validation."""
        result = ScoutOutputValidator.validate("{}")
        assert result.is_valid is False


class TestScribeOutputValidator:
    """Tests for Scribe Agent output validation."""

    def test_scribe_too_short_rejected(self):
        """Output below 5000 words should fail Scribe validation."""
        text = " ".join(["word"] * 100)
        result = ScribeOutputValidator.validate(text)
        assert result.is_valid is False

    def test_scribe_valid_length(self):
        """Output >= 5000 words should pass Scribe validation."""
        text = " ".join([f"word{i}" for i in range(6000)])
        result = ScribeOutputValidator.validate(text)
        assert result.is_valid is True

    def test_scribe_repetition_rejected(self):
        """Scribe output with hallucination loops should be rejected."""
        text = " ".join([f"word{i}" for i in range(4000)]) + " " + "hallucinate " * 20 + " ".join([f"end{i}" for i in range(1000)])
        result = ScribeOutputValidator.validate(text)
        assert result.is_valid is False


# =========================================================================
# Backpressure Manager Tests
# =========================================================================

class TestBackpressureManager:
    """Tests for rate limit backpressure coordination."""

    def setup_method(self):
        """Create a fresh manager for each test (local mode, no Modal)."""
        self.bp = BackpressureManager(dict_name="test-backpressure")
        self.bp.reset()

    def test_initial_pressure_is_zero(self):
        """Fresh manager should have zero pressure."""
        pressure = self.bp.get_global_pressure()
        assert pressure == 0.0

    def test_signal_429_increases_pressure(self):
        """Signaling 429 errors should increase pressure."""
        for _ in range(10):
            self.bp.signal_429(APIType.GEMINI_PRIMARY)
        pressure = self.bp.get_global_pressure()
        assert pressure > 0.0

    def test_no_pause_at_low_pressure(self):
        """Should not pause spawning at low pressure."""
        assert self.bp.should_pause_spawning() is False

    def test_pause_at_high_pressure(self):
        """Should pause spawning above 0.8 pressure threshold."""
        # Pressure is averaged across all API types, so signal all of them
        for api_type in APIType:
            for _ in range(30):
                self.bp.signal_429(api_type)
        assert self.bp.should_pause_spawning() is True

    def test_resume_at_low_pressure(self):
        """Should allow resume when pressure drops below 0.5."""
        assert self.bp.can_resume_spawning() is True

    def test_recommended_delay_increases_with_pressure(self):
        """Delay should increase as pressure increases."""
        low_delay = self.bp.get_recommended_delay()
        for _ in range(15):
            self.bp.signal_429(APIType.SEMANTIC_SCHOLAR)
        high_delay = self.bp.get_recommended_delay()
        assert high_delay > low_delay

    def test_reset_clears_pressure(self):
        """Reset should clear all pressure state."""
        for _ in range(10):
            self.bp.signal_429(APIType.CROSSREF)
        self.bp.reset()
        assert self.bp.get_global_pressure() == 0.0

    def test_adaptive_batch_size_decreases_with_pressure(self):
        """Batch size should decrease as pressure increases."""
        initial_batch = self.bp.get_adaptive_batch_size()
        # Pressure is averaged across all API types, so signal all of them
        for api_type in APIType:
            for _ in range(30):
                self.bp.signal_429(api_type)
        stressed_batch = self.bp.get_adaptive_batch_size()
        assert stressed_batch < initial_batch

    def test_proxy_health_degradation(self):
        """Proxy should be marked degraded after threshold 429s."""
        proxy_id = "proxy1.example.com:8080"
        threshold = PRESSURE_CONFIG["proxy_degraded_threshold"]
        for _ in range(threshold):
            self.bp.signal_429(APIType.GEMINI_PRIMARY, proxy_id=proxy_id)
        health = self.bp._get(f"proxy:{proxy_id}:health")
        assert health == "degraded"

    def test_get_healthy_proxy(self):
        """Should return healthy proxy from list."""
        proxies = ["proxy1:8080", "proxy2:8080", "proxy3:8080"]
        result = self.bp.get_healthy_proxy(proxies)
        assert result in proxies

    def test_all_degraded_proxies_reset(self):
        """When all proxies are degraded, they should be reset to healthy."""
        proxies = ["proxy1:8080", "proxy2:8080"]
        # Mark all as degraded
        for p in proxies:
            self.bp._put(f"proxy:{p}:health", "degraded")
        result = self.bp.get_healthy_proxy(proxies)
        assert result in proxies
        # Verify reset happened
        for p in proxies:
            assert self.bp._get(f"proxy:{p}:health") == "healthy"

    def test_get_best_gemini_key(self):
        """Should select key with fewest 429s."""
        primary = "key_primary"
        fallback = "key_fallback"
        # Make primary have more 429s
        for _ in range(10):
            self.bp.signal_429(APIType.GEMINI_PRIMARY)
        best_key, best_type = self.bp.get_best_gemini_key(primary, fallback)
        assert best_key == fallback
        assert best_type == APIType.GEMINI_FALLBACK

    def test_stats_returns_all_apis(self):
        """Stats should include all API types."""
        stats = self.bp.get_stats()
        assert "global_pressure" in stats
        assert "apis" in stats
        for api_type in APIType:
            assert api_type.value in stats["apis"]

    def test_empty_proxy_list_returns_none(self):
        """Empty proxy list should return None."""
        result = self.bp.get_healthy_proxy([])
        assert result is None
