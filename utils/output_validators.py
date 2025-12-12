"""
ABOUTME: LLM output validation layer for draft generation pipeline
ABOUTME: Detects hallucinations, repetitions, JSON errors, length violations
"""

from typing import List, Optional, Callable
from dataclasses import dataclass, field
import json
import re
import logging

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """
    Type-safe validation result container.

    Attributes:
        is_valid: Whether validation passed
        error_message: Detailed error description (empty if valid)
        warnings: Optional list of non-critical warnings
    """
    is_valid: bool
    error_message: str = ""
    warnings: List[str] = field(default_factory=list)

    def __bool__(self) -> bool:
        """Allow using ValidationResult in boolean contexts."""
        return self.is_valid


class OutputValidator:
    """
    Production-grade validator for LLM outputs.

    Prevents corrupted, hallucinated, or malformed outputs from
    propagating through the draft generation pipeline.
    """

    @staticmethod
    def validate_json(
        output: str,
        max_size_mb: float = 1.0
    ) -> ValidationResult:
        """
        Validate JSON structure and detect corruption.

        Args:
            output: LLM output string that should be valid JSON
            max_size_mb: Maximum allowed file size in megabytes

        Returns:
            ValidationResult indicating success or specific error

        Example:
            >>> result = OutputValidator.validate_json('{"key": "value"}')
            >>> assert result.is_valid
        """
        # Check size before parsing
        size_mb = len(output.encode('utf-8')) / (1024 * 1024)
        if size_mb > max_size_mb:
            return ValidationResult(
                is_valid=False,
                error_message=f"JSON too large: {size_mb:.2f}MB (max: {max_size_mb}MB)"
            )

        # Validate JSON structure
        try:
            parsed = json.loads(output)

            # Validate it's not empty
            if not parsed:
                return ValidationResult(
                    is_valid=False,
                    error_message="JSON is empty"
                )

            logger.debug(f"✅ Valid JSON: {size_mb:.2f}MB, {len(str(parsed))} chars")
            return ValidationResult(is_valid=True)

        except json.JSONDecodeError as e:
            return ValidationResult(
                is_valid=False,
                error_message=f"Invalid JSON at line {e.lineno}, col {e.colno}: {e.msg}"
            )

    @staticmethod
    def detect_token_repetition(
        output: str,
        max_consecutive_repeats: int = 10,
        max_pattern_repeats: int = 3
    ) -> ValidationResult:
        """
        Detect LLM hallucination/repetition loops.

        Catches two types of repetition bugs:
        1. Single token repetition: "word word word word..."
        2. Pattern repetition: "G. M. G. M. G. M. ..."

        Args:
            output: LLM output text to check
            max_consecutive_repeats: Maximum allowed consecutive identical words
            max_pattern_repeats: Maximum allowed pattern repetitions

        Returns:
            ValidationResult with error details if repetition detected

        Example:
            >>> text = "normal text " + "repeat " * 15
            >>> result = OutputValidator.detect_token_repetition(text)
            >>> assert not result.is_valid
        """
        words = output.split()

        if not words:
            return ValidationResult(
                is_valid=False,
                error_message="Empty output"
            )

        # Check for single word repetition
        consecutive_count = 1
        for i in range(1, len(words)):
            if words[i] == words[i-1]:
                consecutive_count += 1
                if consecutive_count >= max_consecutive_repeats:
                    return ValidationResult(
                        is_valid=False,
                        error_message=f"Infinite repetition detected: '{words[i]}' repeated {consecutive_count} times consecutively"
                    )
            else:
                consecutive_count = 1

        # Check for pattern repetition (e.g., "G. M. G. M. G. M.")
        # Use sliding window to detect repeating patterns
        for pattern_length in range(2, 6):  # Check patterns of 2-5 words
            if len(words) < pattern_length * max_pattern_repeats:
                continue

            for i in range(len(words) - (pattern_length * max_pattern_repeats)):
                pattern = tuple(words[i:i+pattern_length])

                # Check if pattern repeats immediately after
                repeat_count = 1
                j = i + pattern_length
                while j + pattern_length <= len(words):
                    next_pattern = tuple(words[j:j+pattern_length])
                    if next_pattern == pattern:
                        repeat_count += 1
                        j += pattern_length
                    else:
                        break

                if repeat_count >= max_pattern_repeats:
                    pattern_str = ' '.join(pattern)
                    return ValidationResult(
                        is_valid=False,
                        error_message=f"Pattern repetition detected: '{pattern_str}' repeated {repeat_count} times"
                    )

        logger.debug(f"✅ No repetition detected in {len(words)} words")
        return ValidationResult(is_valid=True)

    @staticmethod
    def check_length_requirements(
        output: str,
        min_words: Optional[int] = None,
        max_words: Optional[int] = None,
        min_chars: Optional[int] = None,
        max_chars: Optional[int] = None
    ) -> ValidationResult:
        """
        Validate output meets length requirements.

        Args:
            output: LLM output text to check
            min_words: Minimum required word count
            max_words: Maximum allowed word count
            min_chars: Minimum required character count
            max_chars: Maximum allowed character count

        Returns:
            ValidationResult with error if requirements not met

        Example:
            >>> result = OutputValidator.check_length_requirements("short", min_words=10)
            >>> assert not result.is_valid
        """
        word_count = len(output.split())
        char_count = len(output)

        # Word count validation
        if min_words is not None and word_count < min_words:
            return ValidationResult(
                is_valid=False,
                error_message=f"Output too short: {word_count} words (minimum: {min_words})"
            )

        if max_words is not None and word_count > max_words:
            return ValidationResult(
                is_valid=False,
                error_message=f"Output too long: {word_count} words (maximum: {max_words})"
            )

        # Character count validation
        if min_chars is not None and char_count < min_chars:
            return ValidationResult(
                is_valid=False,
                error_message=f"Output too short: {char_count} characters (minimum: {min_chars})"
            )

        if max_chars is not None and char_count > max_chars:
            return ValidationResult(
                is_valid=False,
                error_message=f"Output too long: {char_count} characters (maximum: {max_chars})"
            )

        logger.debug(f"✅ Length requirements met: {word_count} words, {char_count} chars")
        return ValidationResult(is_valid=True)

    @staticmethod
    def validate_output(
        output: str,
        validators: List[Callable[[str], ValidationResult]]
    ) -> ValidationResult:
        """
        Run multiple validators on output and return first failure.

        Args:
            output: LLM output to validate
            validators: List of validation functions to apply

        Returns:
            First failing ValidationResult, or success if all pass

        Example:
            >>> validators = [
            ...     lambda x: OutputValidator.detect_token_repetition(x),
            ...     lambda x: OutputValidator.check_length_requirements(x, min_words=100)
            ... ]
            >>> result = OutputValidator.validate_output("text here", validators)
        """
        for validator in validators:
            result = validator(output)
            if not result.is_valid:
                logger.warning(f"❌ Validation failed: {result.error_message}")
                return result

        logger.debug(f"✅ All {len(validators)} validators passed")
        return ValidationResult(is_valid=True)


class ScoutOutputValidator(OutputValidator):
    """
    Specialized validator for Scout Agent outputs.

    Enforces Scout-specific requirements:
    - Valid JSON array structure
    - No token repetition hallucinations
    - Reasonable output size
    """

    @staticmethod
    def validate(output: str) -> ValidationResult:
        """
        Validate Scout Agent output with all required checks.

        Args:
            output: Scout Agent JSON output

        Returns:
            ValidationResult with comprehensive validation
        """
        validators: List[Callable[[str], ValidationResult]] = [
            lambda x: OutputValidator.detect_token_repetition(x),
            lambda x: OutputValidator.validate_json(x, max_size_mb=1.0),
            lambda x: OutputValidator.check_length_requirements(
                x,
                min_chars=1000,  # At least 1KB of JSON
                max_chars=500000  # Max 500KB to prevent hallucination
            )
        ]

        return OutputValidator.validate_output(output, validators)


class ScribeOutputValidator(OutputValidator):
    """
    Specialized validator for Scribe Agent outputs.

    Enforces Scribe-specific requirements:
    - Minimum 5,000 words for quality literature review
    - No excessive repetition
    - Reasonable maximum length
    """

    @staticmethod
    def validate(output: str) -> ValidationResult:
        """
        Validate Scribe Agent output with all required checks.

        Args:
            output: Scribe Agent literature review output

        Returns:
            ValidationResult with comprehensive validation
        """
        validators: List[Callable[[str], ValidationResult]] = [
            lambda x: OutputValidator.detect_token_repetition(x),
            lambda x: OutputValidator.check_length_requirements(
                x,
                min_words=5000,  # Minimum for quality review
                max_words=50000  # Maximum to prevent runaway generation
            )
        ]

        return OutputValidator.validate_output(output, validators)
