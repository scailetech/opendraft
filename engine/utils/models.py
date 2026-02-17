#!/usr/bin/env python3
"""
ABOUTME: Pydantic models for validating LLM JSON outputs at system boundaries
ABOUTME: Covers Gemini research plans, citation responses, and citation database schema
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


def strip_markdown_json(text: str) -> str:
    """
    Extract JSON from a string that may be wrapped in markdown code blocks.

    Handles patterns like:
        ```json\n{...}\n```
        ```\n{...}\n```
        raw JSON

    Args:
        text: Raw text possibly containing markdown-wrapped JSON

    Returns:
        Cleaned JSON string
    """
    text = text.strip()
    if text.startswith("```"):
        # Split on ``` and take the first code block content
        parts = text.split("```")
        if len(parts) >= 2:
            block = parts[1]
            # Remove optional language tag (e.g., "json")
            if block.startswith("json"):
                block = block[4:]
            return block.strip()
    return text


# ---------------------------------------------------------------------------
# ResearchPlan — validates Gemini research plan output
# ---------------------------------------------------------------------------

class ResearchPlan(BaseModel):
    """Validates the JSON research plan returned by Gemini."""

    queries: List[str] = Field(..., min_length=1)
    outline: str = Field(..., min_length=1)
    strategy: str = Field(..., min_length=1)

    @field_validator("queries")
    @classmethod
    def queries_non_empty(cls, v: List[str]) -> List[str]:
        filtered = [q for q in v if q and q.strip()]
        if not filtered:
            raise ValueError("queries must contain at least one non-empty string")
        return filtered

    @field_validator("strategy")
    @classmethod
    def strategy_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("strategy must not be blank")
        return v

    @field_validator("outline")
    @classmethod
    def outline_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("outline must not be blank")
        return v


# ---------------------------------------------------------------------------
# LLMCitationResponse — validates Gemini LLM citation fallback output
# ---------------------------------------------------------------------------

_CURRENT_YEAR = datetime.now().year

VALID_SOURCE_TYPES = {"journal", "conference", "book", "report", "article", "website"}


class LLMCitationResponse(BaseModel):
    """Validates a single citation returned by the Gemini LLM fallback."""

    authors: List[str] = Field(..., min_length=1)
    year: int
    title: str = Field(..., min_length=1)
    source_type: str = "journal"
    journal: str = ""
    conference: str = ""
    doi: str = ""
    url: str = ""
    pages: str = ""
    volume: str = ""
    issue: str = ""
    publisher: str = ""
    error: Optional[str] = None

    @field_validator("year")
    @classmethod
    def year_in_range(cls, v: int) -> int:
        if not (1800 <= v <= _CURRENT_YEAR + 2):
            raise ValueError(f"year {v} outside valid range 1800-{_CURRENT_YEAR + 2}")
        return v

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title must not be blank")
        return v

    @field_validator("source_type")
    @classmethod
    def source_type_valid(cls, v: str) -> str:
        if v and v not in VALID_SOURCE_TYPES:
            return "journal"  # default fallback
        return v


# ---------------------------------------------------------------------------
# CitationDatabaseSchema — validates citation database JSON from files
# ---------------------------------------------------------------------------

class CitationEntry(BaseModel):
    """A single citation entry in the database."""

    citation_id: str = Field(..., min_length=1)
    authors: List[str] = Field(default_factory=list)
    year: int = 0
    title: str = ""
    source_type: str = "journal"
    doi: Optional[str] = None
    url: Optional[str] = None

    @field_validator("citation_id")
    @classmethod
    def id_has_prefix(cls, v: str) -> str:
        if not v.startswith("cite_"):
            raise ValueError(f"citation_id must start with 'cite_', got '{v}'")
        return v


class CitationDatabaseSchema(BaseModel):
    """Validates the top-level citation database JSON structure."""

    citations: List[CitationEntry] = Field(default_factory=list)
    metadata: Optional[dict] = None


# ---------------------------------------------------------------------------
# FactCheckJudgeVerdict — validates judge LLM output in factcheck_verifier.py
# ---------------------------------------------------------------------------

class FactCheckJudgeVerdict(BaseModel):
    """Validates the JSON verdict returned by the fact-check judge LLM."""

    verdict: Literal["SUPPORTED", "CONTRADICTED", "INSUFFICIENT"]
    confidence: float = Field(ge=0.0, le=1.0)
    wrong_part: Optional[str] = None
    correct_value: Optional[str] = None
    evidence_snippet: str = ""


# ---------------------------------------------------------------------------
# FactCheckClaim — validates claim extraction LLM output in draft_generator.py
# ---------------------------------------------------------------------------

class FactCheckClaim(BaseModel):
    """Validates a single factual claim extracted by the claim-extraction LLM."""

    claim: str = Field(min_length=1)
    section: str = ""
    line: str = ""
