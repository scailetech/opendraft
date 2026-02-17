#!/usr/bin/env python3
"""
Tests for Pydantic validation models (engine/utils/models.py).

Covers:
- ResearchPlan: valid input, empty queries, blank strategy
- LLMCitationResponse: valid citation, missing authors, invalid year, error field, source_type
- strip_markdown_json: with/without code blocks
- CitationDatabaseSchema: valid database, invalid citation ID
- FactCheckJudgeVerdict: valid verdict, invalid verdict/confidence, optional fields
- FactCheckClaim: valid claim, empty claim rejected, defaults
"""

import sys
from pathlib import Path

import pytest

# Ensure engine package is importable
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.models import (
    CitationDatabaseSchema,
    CitationEntry,
    FactCheckClaim,
    FactCheckJudgeVerdict,
    LLMCitationResponse,
    ResearchPlan,
    strip_markdown_json,
)
from pydantic import TypeAdapter, ValidationError


# ---------------------------------------------------------------------------
# strip_markdown_json
# ---------------------------------------------------------------------------

class TestStripMarkdownJson:
    def test_raw_json(self):
        raw = '{"queries": ["q1"], "outline": "o", "strategy": "s"}'
        assert strip_markdown_json(raw) == raw.strip()

    def test_with_code_block(self):
        wrapped = '```json\n{"key": "value"}\n```'
        assert strip_markdown_json(wrapped) == '{"key": "value"}'

    def test_with_code_block_no_lang(self):
        wrapped = '```\n{"key": "value"}\n```'
        assert strip_markdown_json(wrapped) == '{"key": "value"}'


# ---------------------------------------------------------------------------
# ResearchPlan
# ---------------------------------------------------------------------------

class TestResearchPlan:
    def test_valid_plan(self):
        data = {
            "queries": ["query 1", "query 2"],
            "outline": "Section 1\nSection 2",
            "strategy": "Search broadly then narrow down",
        }
        plan = ResearchPlan.model_validate(data)
        assert len(plan.queries) == 2
        assert plan.strategy == "Search broadly then narrow down"

    def test_empty_queries_rejected(self):
        data = {
            "queries": [],
            "outline": "Some outline",
            "strategy": "Some strategy",
        }
        with pytest.raises(ValidationError):
            ResearchPlan.model_validate(data)

    def test_blank_only_queries_rejected(self):
        data = {
            "queries": ["", "  "],
            "outline": "Some outline",
            "strategy": "Some strategy",
        }
        with pytest.raises(ValidationError):
            ResearchPlan.model_validate(data)

    def test_blank_strategy_rejected(self):
        data = {
            "queries": ["q1"],
            "outline": "Some outline",
            "strategy": "   ",
        }
        with pytest.raises(ValidationError):
            ResearchPlan.model_validate(data)


# ---------------------------------------------------------------------------
# LLMCitationResponse
# ---------------------------------------------------------------------------

class TestLLMCitationResponse:
    def test_valid_citation(self):
        data = {
            "authors": ["Smith, J.", "Doe, A."],
            "year": 2023,
            "title": "A Great Paper on AI",
            "source_type": "journal",
            "doi": "10.1234/test",
            "url": "https://example.com/paper",
        }
        citation = LLMCitationResponse.model_validate(data)
        assert citation.year == 2023
        assert citation.title == "A Great Paper on AI"
        assert citation.source_type == "journal"

    def test_year_coercion_from_string(self):
        """Pydantic should coerce '2023' -> 2023 via json.loads + model_validate."""
        import json
        raw = '{"authors": ["A"], "year": "2023", "title": "T"}'
        data = json.loads(raw)
        citation = LLMCitationResponse.model_validate(data)
        assert citation.year == 2023

    def test_missing_authors_rejected(self):
        data = {
            "authors": [],
            "year": 2023,
            "title": "Some Title",
        }
        with pytest.raises(ValidationError):
            LLMCitationResponse.model_validate(data)

    def test_invalid_year_rejected(self):
        data = {
            "authors": ["Author"],
            "year": 1700,
            "title": "Old Paper",
        }
        with pytest.raises(ValidationError):
            LLMCitationResponse.model_validate(data)

    def test_error_field_present(self):
        data = {
            "authors": ["Author"],
            "year": 2023,
            "title": "Some Title",
            "error": "No paper found",
        }
        citation = LLMCitationResponse.model_validate(data)
        assert citation.error == "No paper found"

    def test_unknown_source_type_defaults_to_journal(self):
        data = {
            "authors": ["Author"],
            "year": 2023,
            "title": "Some Title",
            "source_type": "banana",
        }
        citation = LLMCitationResponse.model_validate(data)
        assert citation.source_type == "journal"


# ---------------------------------------------------------------------------
# CitationDatabaseSchema
# ---------------------------------------------------------------------------

class TestCitationDatabaseSchema:
    def test_valid_database(self):
        data = {
            "citations": [
                {
                    "citation_id": "cite_001",
                    "authors": ["Author A"],
                    "year": 2023,
                    "title": "Paper Title",
                }
            ],
            "metadata": {"total_citations": 1},
        }
        db = CitationDatabaseSchema.model_validate(data)
        assert len(db.citations) == 1
        assert db.citations[0].citation_id == "cite_001"

    def test_invalid_citation_id_rejected(self):
        data = {
            "citations": [
                {
                    "citation_id": "bad_id",
                    "authors": ["Author"],
                    "year": 2023,
                    "title": "T",
                }
            ],
        }
        with pytest.raises(ValidationError):
            CitationDatabaseSchema.model_validate(data)


# ---------------------------------------------------------------------------
# FactCheckJudgeVerdict
# ---------------------------------------------------------------------------

class TestFactCheckJudgeVerdict:
    def test_valid_supported(self):
        data = {
            "verdict": "SUPPORTED",
            "confidence": 0.95,
            "evidence_snippet": "The study confirms this finding.",
        }
        v = FactCheckJudgeVerdict.model_validate(data)
        assert v.verdict == "SUPPORTED"
        assert v.confidence == 0.95
        assert v.wrong_part is None
        assert v.correct_value is None
        assert v.evidence_snippet == "The study confirms this finding."

    def test_valid_contradicted_with_wrong_part(self):
        data = {
            "verdict": "CONTRADICTED",
            "confidence": 0.85,
            "wrong_part": "42%",
            "correct_value": "37%",
            "evidence_snippet": "The actual rate was 37%.",
        }
        v = FactCheckJudgeVerdict.model_validate(data)
        assert v.verdict == "CONTRADICTED"
        assert v.wrong_part == "42%"
        assert v.correct_value == "37%"

    def test_valid_insufficient(self):
        data = {
            "verdict": "INSUFFICIENT",
            "confidence": 0.3,
        }
        v = FactCheckJudgeVerdict.model_validate(data)
        assert v.verdict == "INSUFFICIENT"
        assert v.evidence_snippet == ""

    def test_invalid_verdict_rejected(self):
        data = {
            "verdict": "MAYBE",
            "confidence": 0.5,
        }
        with pytest.raises(ValidationError):
            FactCheckJudgeVerdict.model_validate(data)

    def test_confidence_below_zero_rejected(self):
        data = {
            "verdict": "SUPPORTED",
            "confidence": -0.1,
        }
        with pytest.raises(ValidationError):
            FactCheckJudgeVerdict.model_validate(data)

    def test_confidence_above_one_rejected(self):
        data = {
            "verdict": "SUPPORTED",
            "confidence": 1.5,
        }
        with pytest.raises(ValidationError):
            FactCheckJudgeVerdict.model_validate(data)

    def test_confidence_boundary_zero(self):
        data = {"verdict": "INSUFFICIENT", "confidence": 0.0}
        v = FactCheckJudgeVerdict.model_validate(data)
        assert v.confidence == 0.0

    def test_confidence_boundary_one(self):
        data = {"verdict": "SUPPORTED", "confidence": 1.0}
        v = FactCheckJudgeVerdict.model_validate(data)
        assert v.confidence == 1.0

    def test_missing_verdict_rejected(self):
        data = {"confidence": 0.5}
        with pytest.raises(ValidationError):
            FactCheckJudgeVerdict.model_validate(data)

    def test_missing_confidence_rejected(self):
        data = {"verdict": "SUPPORTED"}
        with pytest.raises(ValidationError):
            FactCheckJudgeVerdict.model_validate(data)


# ---------------------------------------------------------------------------
# FactCheckClaim
# ---------------------------------------------------------------------------

class TestFactCheckClaim:
    def test_valid_claim(self):
        data = {
            "claim": "Global temperatures rose by 1.1°C since pre-industrial times.",
            "section": "Introduction",
            "line": "paragraph 2",
        }
        c = FactCheckClaim.model_validate(data)
        assert c.claim == "Global temperatures rose by 1.1°C since pre-industrial times."
        assert c.section == "Introduction"
        assert c.line == "paragraph 2"

    def test_claim_only_defaults(self):
        data = {"claim": "Some factual statement."}
        c = FactCheckClaim.model_validate(data)
        assert c.section == ""
        assert c.line == ""

    def test_empty_claim_rejected(self):
        data = {"claim": ""}
        with pytest.raises(ValidationError):
            FactCheckClaim.model_validate(data)

    def test_missing_claim_rejected(self):
        data = {"section": "Intro"}
        with pytest.raises(ValidationError):
            FactCheckClaim.model_validate(data)

    def test_type_adapter_json_array(self):
        """TypeAdapter(list[FactCheckClaim]) parses a JSON array of claims."""
        raw = '[{"claim": "A"}, {"claim": "B", "section": "S"}]'
        adapter = TypeAdapter(list[FactCheckClaim])
        claims = adapter.validate_json(raw)
        assert len(claims) == 2
        assert claims[0].claim == "A"
        assert claims[1].section == "S"

    def test_type_adapter_rejects_non_array(self):
        raw = '{"claim": "A"}'
        adapter = TypeAdapter(list[FactCheckClaim])
        with pytest.raises(ValidationError):
            adapter.validate_json(raw)
