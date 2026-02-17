#!/usr/bin/env python3
"""
ABOUTME: Unit tests for factcheck pipeline — no API calls required
ABOUTME: Tests format_report, markdown fence stripping, and _make_verdict logic
"""

import json
import sys
from pathlib import Path

import pytest

# Add engine to path
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.factcheck_verifier import (
    FactCheckVerifier,
    VERDICT_SUPPORTED,
    VERDICT_CONTRADICTED,
    VERDICT_INSUFFICIENT,
    strip_json_fences,
    _make_verdict,
)


# =========================================================================
# TestFormatReport
# =========================================================================

class TestFormatReport:
    """Tests for FactCheckVerifier.format_report() output."""

    @pytest.fixture
    def verifier(self):
        """Create a FactCheckVerifier with a dummy API key (no API calls made)."""
        # Patch __init__ to avoid importing GeminiGroundedClient
        obj = object.__new__(FactCheckVerifier)
        obj.api_key = "dummy"
        obj.model = None
        return obj

    def _make_result(self, verdict, claim="Test claim", **kwargs):
        base = {
            "claim": claim,
            "section": "2.1 - Literature Review",
            "line": "some surrounding text",
            "verdict": verdict,
            "confidence": 0.9,
            "wrong_part": None,
            "correct_value": None,
            "source_url": None,
            "evidence_snippet": "some evidence",
        }
        base.update(kwargs)
        return base

    def test_empty_results(self, verifier):
        report = verifier.format_report([])
        assert "Claims Checked:** 0" in report
        assert "Issues Found:** 0" in report
        assert "All checked claims appear accurate" in report

    def test_all_supported(self, verifier):
        results = [
            self._make_result(VERDICT_SUPPORTED, claim="Claim A"),
            self._make_result(VERDICT_SUPPORTED, claim="Claim B"),
        ]
        report = verifier.format_report(results)
        assert "Claims Checked:** 2" in report
        assert "Verified:** 2" in report
        assert "Issues Found:** 0" in report
        assert "VERIFIED CLAIMS" in report
        assert "Claim A" in report
        assert "Claim B" in report
        # No ISSUES FOUND section
        assert "ISSUES FOUND" not in report

    def test_all_contradicted(self, verifier):
        results = [
            self._make_result(
                VERDICT_CONTRADICTED,
                claim="GPT-4 was released in 2022",
                wrong_part="2022",
                correct_value="2023",
                source_url="https://example.com/source",
            ),
        ]
        report = verifier.format_report(results)
        assert "Issues Found:** 1" in report
        assert "ISSUES FOUND" in report
        assert "GPT-4 was released in 2022" in report
        assert '**Find:** "2022"' in report
        assert '**Replace with:** "2023"' in report
        assert "https://example.com/source" in report

    def test_mixed_verdicts(self, verifier):
        results = [
            self._make_result(VERDICT_SUPPORTED, claim="True claim"),
            self._make_result(
                VERDICT_CONTRADICTED,
                claim="False claim",
                wrong_part="False",
                correct_value="True",
            ),
            self._make_result(VERDICT_INSUFFICIENT, claim="Unknown claim"),
        ]
        report = verifier.format_report(results)
        assert "Claims Checked:** 3" in report
        assert "Verified:** 1" in report
        assert "Issues Found:** 1" in report
        assert "Unverifiable:** 1" in report
        assert "ISSUES FOUND" in report
        assert "VERIFIED CLAIMS" in report
        assert "UNVERIFIABLE CLAIMS" in report

    def test_find_replace_fields_rendered(self, verifier):
        results = [
            self._make_result(
                VERDICT_CONTRADICTED,
                claim="The market was worth $900 billion in 2020",
                wrong_part="$900 billion",
                correct_value="$62.5 billion",
                source_url="https://example.com",
            ),
        ]
        report = verifier.format_report(results)
        assert '**Find:** "$900 billion"' in report
        assert '**Replace with:** "$62.5 billion"' in report

    def test_contradicted_without_wrong_part_omits_find_replace(self, verifier):
        results = [
            self._make_result(
                VERDICT_CONTRADICTED,
                claim="Some wrong claim",
                wrong_part=None,
                correct_value=None,
            ),
        ]
        report = verifier.format_report(results)
        assert "ISSUES FOUND" in report
        assert "**Find:**" not in report

    def test_recommendations_with_contradictions(self, verifier):
        results = [
            self._make_result(VERDICT_CONTRADICTED, claim="Bad claim"),
        ]
        report = verifier.format_report(results)
        assert "Fix 1 factual error(s)" in report

    def test_recommendations_with_insufficient(self, verifier):
        results = [
            self._make_result(VERDICT_INSUFFICIENT, claim="Unclear claim"),
        ]
        report = verifier.format_report(results)
        assert "could not be verified" in report


# =========================================================================
# TestMarkdownFenceStripping
# =========================================================================

class TestMarkdownFenceStripping:
    """
    Tests the JSON parsing logic that strips ```json fences from LLM output.
    This mirrors the parsing in FactCheckVerifier._judge and the
    claim extraction parsing that will be used in draft_generator integration.
    """

    @staticmethod
    def _strip_and_parse(text: str):
        """Use the shared strip_json_fences utility."""
        return json.loads(strip_json_fences(text))

    def test_plain_json(self):
        raw = '{"verdict": "SUPPORTED", "confidence": 0.9}'
        result = self._strip_and_parse(raw)
        assert result["verdict"] == "SUPPORTED"

    def test_json_with_fences(self):
        raw = '```json\n{"verdict": "CONTRADICTED", "confidence": 0.8}\n```'
        result = self._strip_and_parse(raw)
        assert result["verdict"] == "CONTRADICTED"

    def test_json_array_with_fences(self):
        raw = '```json\n[\n  {"claim": "A", "section": "1", "line": "text A"},\n  {"claim": "B", "section": "2", "line": "text B"}\n]\n```'
        result = self._strip_and_parse(raw)
        assert isinstance(result, list)
        assert len(result) == 2
        assert result[0]["claim"] == "A"

    def test_fences_without_language_tag(self):
        raw = '```\n{"verdict": "INSUFFICIENT"}\n```'
        result = self._strip_and_parse(raw)
        assert result["verdict"] == "INSUFFICIENT"

    def test_no_fences_array(self):
        raw = '[{"claim": "test", "section": "1.0", "line": "context"}]'
        result = self._strip_and_parse(raw)
        assert isinstance(result, list)
        assert result[0]["claim"] == "test"

    def test_extra_whitespace_around_fences(self):
        raw = '  \n```json\n{"verdict": "SUPPORTED"}\n```\n  '
        result = self._strip_and_parse(raw)
        assert result["verdict"] == "SUPPORTED"

    def test_invalid_json_raises(self):
        raw = '```json\nnot valid json\n```'
        with pytest.raises(json.JSONDecodeError):
            self._strip_and_parse(raw)


# =========================================================================
# TestVerifyClaims
# =========================================================================

class TestVerifyClaims:
    """Tests for verify_claims edge cases using a mocked verifier."""

    @pytest.fixture
    def verifier(self):
        """Create a FactCheckVerifier bypassing __init__ (no API calls)."""
        obj = object.__new__(FactCheckVerifier)
        obj.api_key = "dummy"
        obj.model = None
        return obj

    def test_empty_claims_list(self, verifier):
        results = verifier.verify_claims([])
        assert results == []

    def test_claims_with_empty_text_filtered(self, verifier):
        results = verifier.verify_claims([{"claim": "", "section": "1", "line": "x"}])
        assert results == []


# =========================================================================
# TestMakeVerdict
# =========================================================================

class TestMakeVerdict:
    """Tests for the _make_verdict helper function."""

    def test_defaults(self):
        claim_obj = {"claim": "test claim", "section": "1.0", "line": "some line"}
        result = _make_verdict(claim_obj)
        assert result["claim"] == "test claim"
        assert result["section"] == "1.0"
        assert result["line"] == "some line"
        assert result["verdict"] == VERDICT_INSUFFICIENT
        assert result["confidence"] == 0.0
        assert result["wrong_part"] is None
        assert result["correct_value"] is None
        assert result["source_url"] is None
        assert result["evidence_snippet"] == ""

    def test_custom_values(self):
        claim_obj = {"claim": "GPT-4 released 2022", "section": "2.1", "line": "ctx"}
        result = _make_verdict(
            claim_obj,
            verdict=VERDICT_CONTRADICTED,
            confidence=0.95,
            wrong_part="2022",
            correct_value="2023",
            source_url="https://example.com",
            evidence_snippet="Released March 2023",
        )
        assert result["verdict"] == VERDICT_CONTRADICTED
        assert result["confidence"] == 0.95
        assert result["wrong_part"] == "2022"
        assert result["correct_value"] == "2023"
        assert result["source_url"] == "https://example.com"
        assert result["evidence_snippet"] == "Released March 2023"

    def test_missing_keys_default_to_empty_string(self):
        result = _make_verdict({})
        assert result["claim"] == ""
        assert result["section"] == ""
        assert result["line"] == ""
