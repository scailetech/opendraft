#!/usr/bin/env python3
"""
ABOUTME: Custom exception hierarchy for production-grade error handling
ABOUTME: Provides domain-specific exceptions with context and recovery guidance
"""

from typing import Optional, Dict, Any


class DraftGenerationError(Exception):
    """
    Base exception for all draft generation errors.

    Provides structured error context and recovery suggestions.
    All custom exceptions inherit from this base class.
    """

    def __init__(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        recovery_hint: Optional[str] = None
    ):
        """
        Initialize draft generation error.

        Args:
            message: Human-readable error description
            context: Additional context data (file paths, API responses, etc.)
            recovery_hint: Suggestion for how to recover from this error
        """
        super().__init__(message)
        self.message = message
        self.context = context or {}
        self.recovery_hint = recovery_hint

    def __str__(self) -> str:
        """Format error with context and recovery hint."""
        parts = [self.message]

        if self.context:
            parts.append(f"Context: {self.context}")

        if self.recovery_hint:
            parts.append(f"Recovery: {self.recovery_hint}")

        return " | ".join(parts)


class APIQuotaExceededError(DraftGenerationError):
    """
    Raised when API quota limits are exceeded.

    Indicates the system should implement graceful degradation
    (e.g., switch to alternative API, use cached data, notify user).
    """

    def __init__(
        self,
        api_name: str,
        quota_limit: Optional[int] = None,
        reset_time: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize API quota exceeded error.

        Args:
            api_name: Name of the API that exceeded quota (e.g., "Gemini", "CrossRef")
            quota_limit: The quota limit that was exceeded
            reset_time: When the quota will reset (ISO format or human-readable)
            **kwargs: Additional context passed to base class
        """
        context = kwargs.get('context', {})
        context.update({
            'api_name': api_name,
            'quota_limit': quota_limit,
            'reset_time': reset_time
        })

        message = f"{api_name} API quota exceeded"
        if quota_limit:
            message += f" (limit: {quota_limit})"

        recovery_hint = kwargs.get('recovery_hint') or (
            f"Wait until {reset_time} for quota reset, or use alternative API"
            if reset_time else "Switch to alternative API or use cached data"
        )

        super().__init__(
            message=message,
            context=context,
            recovery_hint=recovery_hint
        )

        self.api_name = api_name
        self.quota_limit = quota_limit
        self.reset_time = reset_time


class CitationFetchError(DraftGenerationError):
    """
    Raised when citation fetching fails.

    Indicates problems with citation databases (CrossRef, arXiv, Semantic Scholar).
    System should fall back to alternative citation sources or cached data.
    """

    def __init__(
        self,
        citation_id: str,
        source: str,
        reason: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize citation fetch error.

        Args:
            citation_id: The citation ID that failed to fetch
            source: The citation source that failed (e.g., "CrossRef", "arXiv")
            reason: Reason for failure (e.g., "Network timeout", "Invalid DOI")
            **kwargs: Additional context passed to base class
        """
        context = kwargs.get('context', {})
        context.update({
            'citation_id': citation_id,
            'source': source,
            'reason': reason
        })

        message = f"Failed to fetch citation {citation_id} from {source}"
        if reason:
            message += f": {reason}"

        recovery_hint = kwargs.get('recovery_hint') or (
            f"Try alternative citation source or use cached data for {citation_id}"
        )

        super().__init__(
            message=message,
            context=context,
            recovery_hint=recovery_hint
        )

        self.citation_id = citation_id
        self.source = source
        self.reason = reason


class PDFExportError(DraftGenerationError):
    """
    Raised when PDF export fails.

    Indicates problems with PDF generation engines (LibreOffice, Pandoc, WeasyPrint).
    System should fall back to alternative PDF engine.
    """

    def __init__(
        self,
        engine: str,
        input_file: Optional[str] = None,
        output_file: Optional[str] = None,
        reason: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize PDF export error.

        Args:
            engine: The PDF engine that failed (e.g., "LibreOffice", "Pandoc")
            input_file: Path to input markdown file
            output_file: Path to expected output PDF file
            reason: Reason for failure (e.g., "LibreOffice not installed")
            **kwargs: Additional context passed to base class
        """
        context = kwargs.get('context', {})
        context.update({
            'engine': engine,
            'input_file': input_file,
            'output_file': output_file,
            'reason': reason
        })

        message = f"PDF export failed using {engine}"
        if reason:
            message += f": {reason}"

        recovery_hint = kwargs.get('recovery_hint') or (
            "Try alternative PDF engine (LibreOffice, Pandoc, or WeasyPrint)"
        )

        super().__init__(
            message=message,
            context=context,
            recovery_hint=recovery_hint
        )

        self.engine = engine
        self.input_file = input_file
        self.output_file = output_file
        self.reason = reason


class ValidationError(DraftGenerationError):
    """
    Raised when input validation fails.

    Indicates invalid configuration, malformed data, or constraint violations.
    User should fix input data or configuration.
    """

    def __init__(
        self,
        field: str,
        value: Any,
        constraint: str,
        **kwargs
    ):
        """
        Initialize validation error.

        Args:
            field: The field that failed validation (e.g., "citation_style", "year")
            value: The invalid value that was provided
            constraint: The constraint that was violated (e.g., "must be >= 1900")
            **kwargs: Additional context passed to base class
        """
        context = kwargs.get('context', {})
        context.update({
            'field': field,
            'value': value,
            'constraint': constraint
        })

        message = f"Validation failed for '{field}': {constraint} (got: {value})"

        recovery_hint = kwargs.get('recovery_hint') or (
            f"Fix '{field}' to satisfy constraint: {constraint}"
        )

        super().__init__(
            message=message,
            context=context,
            recovery_hint=recovery_hint
        )

        self.field = field
        self.value = value
        self.constraint = constraint


class ConfigurationError(DraftGenerationError):
    """
    Raised when configuration is invalid or missing.

    Indicates problems with config.py, .env files, or API keys.
    User should fix configuration before proceeding.
    """

    def __init__(
        self,
        config_key: str,
        issue: str,
        **kwargs
    ):
        """
        Initialize configuration error.

        Args:
            config_key: The configuration key that is invalid (e.g., "GEMINI_API_KEY")
            issue: Description of the configuration issue
            **kwargs: Additional context passed to base class
        """
        context = kwargs.get('context', {})
        context.update({
            'config_key': config_key,
            'issue': issue
        })

        message = f"Configuration error for '{config_key}': {issue}"

        recovery_hint = kwargs.get('recovery_hint') or (
            f"Set '{config_key}' in config.py or .env file"
        )

        super().__init__(
            message=message,
            context=context,
            recovery_hint=recovery_hint
        )

        self.config_key = config_key
        self.issue = issue


class NetworkError(DraftGenerationError):
    """
    Raised when network operations fail.

    Indicates connectivity issues with external APIs or services.
    System should retry with exponential backoff or use cached data.
    """

    def __init__(
        self,
        endpoint: str,
        reason: Optional[str] = None,
        retry_count: int = 0,
        **kwargs
    ):
        """
        Initialize network error.

        Args:
            endpoint: The endpoint that failed (URL or service name)
            reason: Reason for failure (e.g., "Connection timeout", "DNS failure")
            retry_count: Number of retries already attempted
            **kwargs: Additional context passed to base class
        """
        context = kwargs.get('context', {})
        context.update({
            'endpoint': endpoint,
            'reason': reason,
            'retry_count': retry_count
        })

        message = f"Network error connecting to {endpoint}"
        if reason:
            message += f": {reason}"
        if retry_count > 0:
            message += f" (after {retry_count} retries)"

        recovery_hint = kwargs.get('recovery_hint') or (
            "Check network connectivity and retry, or use cached data"
        )

        super().__init__(
            message=message,
            context=context,
            recovery_hint=recovery_hint
        )

        self.endpoint = endpoint
        self.reason = reason
        self.retry_count = retry_count


class FileOperationError(DraftGenerationError):
    """
    Raised when file operations fail.

    Indicates problems with reading/writing files (permissions, disk space, etc.).
    User should check file permissions and available disk space.
    """

    def __init__(
        self,
        file_path: str,
        operation: str,
        reason: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize file operation error.

        Args:
            file_path: The file path that caused the error
            operation: The operation that failed (e.g., "read", "write", "delete")
            reason: Reason for failure (e.g., "Permission denied", "Disk full")
            **kwargs: Additional context passed to base class
        """
        context = kwargs.get('context', {})
        context.update({
            'file_path': file_path,
            'operation': operation,
            'reason': reason
        })

        message = f"File {operation} failed for {file_path}"
        if reason:
            message += f": {reason}"

        recovery_hint = kwargs.get('recovery_hint') or (
            "Check file permissions and available disk space"
        )

        super().__init__(
            message=message,
            context=context,
            recovery_hint=recovery_hint
        )

        self.file_path = file_path
        self.operation = operation
        self.reason = reason
