#!/usr/bin/env python3
"""
Tests for CLI command handlers (revise, data).
"""

import pytest
import tempfile
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestReviseCommand:
    """Tests for opendraft revise CLI command."""

    def test_revise_help(self):
        """Test that revise --help works."""
        result = subprocess.run(
            [sys.executable, "-m", "opendraft.cli", "revise", "--help"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        assert result.returncode == 0
        assert "Revise an existing draft" in result.stdout
        assert "instructions" in result.stdout

    def test_revise_missing_target(self):
        """Test that missing target shows error."""
        result = subprocess.run(
            [sys.executable, "-m", "opendraft.cli", "revise"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        assert result.returncode != 0
        assert "required" in result.stderr.lower() or "error" in result.stderr.lower()

    def test_revise_nonexistent_path(self):
        """Test that nonexistent path shows error."""
        result = subprocess.run(
            [sys.executable, "-m", "opendraft.cli", "revise", "/nonexistent/path", "instructions"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        assert result.returncode == 1
        assert "not found" in result.stdout.lower() or "not found" in result.stderr.lower()


class TestDataCommand:
    """Tests for opendraft data CLI command."""

    def test_data_help(self):
        """Test that data list works."""
        result = subprocess.run(
            [sys.executable, "-m", "opendraft.cli", "data", "list"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        assert result.returncode == 0
        assert "World Bank" in result.stdout
        assert "Eurostat" in result.stdout
        assert "Our World in Data" in result.stdout

    def test_data_missing_query(self):
        """Test that missing query shows error."""
        result = subprocess.run(
            [sys.executable, "-m", "opendraft.cli", "data", "worldbank"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        assert result.returncode == 1
        assert "required" in result.stdout.lower() or "query" in result.stdout.lower()

    def test_data_search_works(self):
        """Test that search command executes."""
        result = subprocess.run(
            [sys.executable, "-m", "opendraft.cli", "data", "search", "gdp"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
            timeout=60
        )
        # Should either succeed or fail gracefully (network issues)
        assert result.returncode in [0, 1]
        # Should show some output either way
        assert len(result.stdout) > 0


class TestCitationDetection:
    """Tests for improved citation detection."""

    def test_detects_cite_format(self):
        """Test {cite_X} format detection."""
        from utils.revise import score_draft_simple

        text = "Research shows {cite_1} and {cite_2} support this {cite_3}."
        result = score_draft_simple(text)
        assert result["citations"] == 3

    def test_detects_parenthetical_citations(self):
        """Test (Author, Year) format detection."""
        from utils.revise import score_draft_simple

        text = "Research shows (Smith, 2020) and (Jones & Lee, 2019) support this."
        result = score_draft_simple(text)
        assert result["citations"] >= 2

    def test_detects_et_al_citations(self):
        """Test (Author et al., Year) format detection."""
        from utils.revise import score_draft_simple

        text = "Research shows (Williams et al., 2021) and (Brown et al., 2020)."
        result = score_draft_simple(text)
        assert result["citations"] >= 2

    def test_detects_mixed_citations(self):
        """Test mixed citation formats."""
        from utils.revise import score_draft_simple

        text = "Research {cite_1} and (Smith, 2020) both show results {cite_2}."
        result = score_draft_simple(text)
        assert result["citations"] >= 3


class TestReviseRetryLogic:
    """Tests for retry logic in revision module."""

    def test_has_circuit_breaker_import(self):
        """Test that circuit breaker is imported."""
        from utils.revise import get_gemini_circuit_breaker
        cb = get_gemini_circuit_breaker()
        assert cb is not None
        assert hasattr(cb, 'allow_request')
        assert hasattr(cb, 'record_success')
        assert hasattr(cb, 'record_failure')

    def test_call_gemini_revise_has_retry_param(self):
        """Test that call_gemini_revise accepts max_retries."""
        import inspect
        from utils.revise import call_gemini_revise

        sig = inspect.signature(call_gemini_revise)
        assert 'max_retries' in sig.parameters


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
