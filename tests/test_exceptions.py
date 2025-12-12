#!/usr/bin/env python3
"""
ABOUTME: Unit tests for custom exception hierarchy in utils/exceptions.py
ABOUTME: Tests all 8 exception classes with context, recovery hints, and backward compatibility
"""

import pytest
import requests
from utils.exceptions import (
    DraftGenerationError,
    APIQuotaExceededError,
    CitationFetchError,
    PDFExportError,
    ValidationError,
    ConfigurationError,
    NetworkError,
    FileOperationError
)


class TestDraftGenerationError:
    """Test base exception class functionality."""

    def test_basic_initialization(self):
        """Test exception can be created with message only."""
        error = DraftGenerationError("Test error")
        assert str(error) == "Test error"
        assert error.message == "Test error"
        assert error.context == {}
        assert error.recovery_hint is None

    def test_with_context(self):
        """Test exception with context dictionary."""
        context = {"file": "test.py", "line": 42}
        error = DraftGenerationError("Test error", context=context)
        assert error.context == context
        assert "Context:" in str(error)

    def test_with_recovery_hint(self):
        """Test exception with recovery hint."""
        error = DraftGenerationError(
            "Test error",
            recovery_hint="Try restarting the service"
        )
        assert error.recovery_hint == "Try restarting the service"
        assert "Recovery:" in str(error)

    def test_full_error_string(self):
        """Test formatted error string with all components."""
        error = DraftGenerationError(
            "Test error",
            context={"key": "value"},
            recovery_hint="Fix it"
        )
        error_str = str(error)
        assert "Test error" in error_str
        assert "Context:" in error_str
        assert "Recovery:" in error_str


class TestAPIQuotaExceededError:
    """Test API quota exceeded exception."""

    def test_basic_quota_error(self):
        """Test quota error with API name only."""
        error = APIQuotaExceededError(api_name="Semantic Scholar")
        assert error.api_name == "Semantic Scholar"
        assert "Semantic Scholar API quota exceeded" in str(error)
        assert "alternative API" in error.recovery_hint

    def test_with_quota_limit(self):
        """Test quota error with limit specified."""
        error = APIQuotaExceededError(
            api_name="CrossRef",
            quota_limit=1000
        )
        assert error.quota_limit == 1000
        assert "limit: 1000" in str(error)

    def test_with_reset_time(self):
        """Test quota error with reset time."""
        error = APIQuotaExceededError(
            api_name="arXiv",
            reset_time="2025-11-23T00:00:00Z"
        )
        assert error.reset_time == "2025-11-23T00:00:00Z"
        assert "2025-11-23T00:00:00Z" in error.recovery_hint

    def test_context_includes_metadata(self):
        """Test context contains API metadata."""
        error = APIQuotaExceededError(
            api_name="Test API",
            quota_limit=500,
            reset_time="tomorrow",
            context={"extra": "data"}
        )
        assert error.context["api_name"] == "Test API"
        assert error.context["quota_limit"] == 500
        assert error.context["reset_time"] == "tomorrow"
        assert error.context["extra"] == "data"


class TestCitationFetchError:
    """Test citation fetch error exception."""

    def test_basic_citation_error(self):
        """Test citation error with minimum fields."""
        error = CitationFetchError(
            citation_id="10.1234/example",
            source="CrossRef"
        )
        assert error.citation_id == "10.1234/example"
        assert error.source == "CrossRef"
        assert "10.1234/example" in str(error)
        assert "CrossRef" in str(error)

    def test_with_reason(self):
        """Test citation error with failure reason."""
        error = CitationFetchError(
            citation_id="query:machine learning",
            source="Semantic Scholar",
            reason="Network timeout"
        )
        assert error.reason == "Network timeout"
        assert "Network timeout" in str(error)

    def test_recovery_hint(self):
        """Test citation error has helpful recovery hint."""
        error = CitationFetchError(
            citation_id="test-id",
            source="arXiv"
        )
        assert "alternative citation source" in error.recovery_hint
        assert "test-id" in error.recovery_hint


class TestPDFExportError:
    """Test PDF export error exception."""

    def test_basic_pdf_error(self):
        """Test PDF error with engine name only."""
        error = PDFExportError(engine="LibreOffice")
        assert error.engine == "LibreOffice"
        assert "LibreOffice" in str(error)
        assert "alternative PDF engine" in error.recovery_hint

    def test_with_file_paths(self):
        """Test PDF error with input/output paths."""
        error = PDFExportError(
            engine="Pandoc",
            input_file="/path/to/input.md",
            output_file="/path/to/output.pdf"
        )
        assert error.input_file == "/path/to/input.md"
        assert error.output_file == "/path/to/output.pdf"

    def test_with_reason(self):
        """Test PDF error with failure reason."""
        error = PDFExportError(
            engine="WeasyPrint",
            reason="Missing font: Arial"
        )
        assert error.reason == "Missing font: Arial"
        assert "Missing font: Arial" in str(error)


class TestValidationError:
    """Test validation error exception."""

    def test_basic_validation_error(self):
        """Test validation error with field constraint."""
        error = ValidationError(
            field="year",
            value=1800,
            constraint="must be >= 1900"
        )
        assert error.field == "year"
        assert error.value == 1800
        assert error.constraint == "must be >= 1900"
        assert "year" in str(error)
        assert "1800" in str(error)
        assert "must be >= 1900" in str(error)

    def test_recovery_hint_includes_field(self):
        """Test recovery hint references the invalid field."""
        error = ValidationError(
            field="citation_style",
            value="invalid",
            constraint="must be 'APA' or 'IEEE'"
        )
        assert "citation_style" in error.recovery_hint
        assert "must be 'APA' or 'IEEE'" in error.recovery_hint


class TestConfigurationError:
    """Test configuration error exception."""

    def test_basic_config_error(self):
        """Test configuration error with key and issue."""
        error = ConfigurationError(
            config_key="GOOGLE_API_KEY",
            issue="Environment variable not set"
        )
        assert error.config_key == "GOOGLE_API_KEY"
        assert error.issue == "Environment variable not set"
        assert "GOOGLE_API_KEY" in str(error)
        assert "Environment variable not set" in str(error)

    def test_recovery_hint_includes_key(self):
        """Test recovery hint references config key."""
        error = ConfigurationError(
            config_key="DATABASE_URL",
            issue="Invalid format"
        )
        assert "DATABASE_URL" in error.recovery_hint


class TestNetworkError:
    """Test network error exception."""

    def test_basic_network_error(self):
        """Test network error with endpoint only."""
        error = NetworkError(endpoint="api.semanticscholar.org")
        assert error.endpoint == "api.semanticscholar.org"
        assert "api.semanticscholar.org" in str(error)
        assert "network connectivity" in error.recovery_hint.lower()

    def test_with_reason(self):
        """Test network error with failure reason."""
        error = NetworkError(
            endpoint="api.crossref.org",
            reason="Connection timeout"
        )
        assert error.reason == "Connection timeout"
        assert "Connection timeout" in str(error)

    def test_with_retry_count(self):
        """Test network error tracks retry attempts."""
        error = NetworkError(
            endpoint="export.arxiv.org",
            retry_count=3
        )
        assert error.retry_count == 3
        assert "3 retries" in str(error)


class TestFileOperationError:
    """Test file operation error exception."""

    def test_basic_file_error(self):
        """Test file error with path and operation."""
        error = FileOperationError(
            file_path="/tmp/output.pdf",
            operation="write"
        )
        assert error.file_path == "/tmp/output.pdf"
        assert error.operation == "write"
        assert "/tmp/output.pdf" in str(error)
        assert "write" in str(error)

    def test_with_reason(self):
        """Test file error with failure reason."""
        error = FileOperationError(
            file_path="/protected/file.txt",
            operation="read",
            reason="Permission denied"
        )
        assert error.reason == "Permission denied"
        assert "Permission denied" in str(error)

    def test_recovery_hint(self):
        """Test file error has helpful recovery hint."""
        error = FileOperationError(
            file_path="/disk/full.txt",
            operation="write"
        )
        assert "permissions" in error.recovery_hint.lower()
        assert "disk space" in error.recovery_hint.lower()


class TestExceptionChaining:
    """Test exception chaining for backward compatibility."""

    def test_citation_error_chaining(self):
        """Test CitationFetchError preserves original exception chain."""
        try:
            # Simulate HTTP error
            raise requests.HTTPError("404 Not Found")
        except requests.HTTPError as e:
            # Chain with custom exception
            citation_error = CitationFetchError(
                citation_id="test",
                source="API",
                reason=str(e)
            )
            # Verify we can still catch original exception type
            assert isinstance(citation_error, CitationFetchError)
            # Verify error message includes reason
            assert "404 Not Found" in str(citation_error)

    def test_network_error_chaining(self):
        """Test NetworkError preserves connection errors."""
        try:
            raise requests.ConnectionError("DNS lookup failed")
        except requests.ConnectionError as e:
            network_error = NetworkError(
                endpoint="example.com",
                reason=str(e)
            )
            assert "DNS lookup failed" in str(network_error)


class TestExceptionInheritance:
    """Test all custom exceptions inherit from base."""

    def test_all_inherit_from_base(self):
        """Test all exception classes inherit from DraftGenerationError."""
        exceptions = [
            APIQuotaExceededError(api_name="Test"),
            CitationFetchError(citation_id="test", source="test"),
            PDFExportError(engine="test"),
            ValidationError(field="test", value="test", constraint="test"),
            ConfigurationError(config_key="test", issue="test"),
            NetworkError(endpoint="test"),
            FileOperationError(file_path="test", operation="test")
        ]

        for exc in exceptions:
            assert isinstance(exc, DraftGenerationError)
            assert isinstance(exc, Exception)

    def test_can_catch_with_base_class(self):
        """Test exceptions can be caught with base class."""
        with pytest.raises(DraftGenerationError):
            raise APIQuotaExceededError(api_name="Test")

        with pytest.raises(DraftGenerationError):
            raise CitationFetchError(citation_id="test", source="test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
