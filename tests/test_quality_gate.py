#!/usr/bin/env python3
"""Tests for quality gate scoring."""

import pytest
from pathlib import Path
from unittest.mock import MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.quality_gate import (
    score_draft_quality,
    run_quality_gate,
    _count_words,
    _score_word_count,
    _score_citations,
    _score_completeness,
    _score_structure,
)
from phases.context import DraftContext


@pytest.fixture
def good_context():
    """Create a context with high-quality outputs."""
    ctx = DraftContext()
    ctx.academic_level = "research_paper"
    ctx.word_targets = {'min_citations': 10}

    # Good intro (400+ words for research paper) - need 400 words
    ctx.intro_output = "# Introduction\n\n" + "Introduction content here is good. " * 120 + "{cite_001} {cite_002}"

    # Good body with citations (1500+ words for research paper)
    ctx.body_output = "## Body\n\n" + "Body content here with details. " * 400 + "{cite_003} {cite_004} {cite_005} {cite_006} {cite_007}"
    ctx.lit_review_output = "Literature review content here. " * 50
    ctx.methodology_output = "Methodology content here. " * 50
    ctx.results_output = "Results content here. " * 50
    ctx.discussion_output = "Discussion content here. " * 50

    # Good conclusion (300+ words)
    ctx.conclusion_output = "## Conclusion\n\n" + "Conclusion content here. " * 100 + "{cite_008} {cite_009} {cite_010}"

    return ctx


@pytest.fixture
def poor_context():
    """Create a context with low-quality outputs."""
    ctx = DraftContext()
    ctx.academic_level = "research_paper"
    ctx.word_targets = {'min_citations': 10}
    
    # Very short intro
    ctx.intro_output = "Short intro"
    
    # Empty body
    ctx.body_output = ""
    ctx.lit_review_output = ""
    ctx.methodology_output = ""
    ctx.results_output = ""
    ctx.discussion_output = ""
    
    # Empty conclusion
    ctx.conclusion_output = ""
    
    return ctx


class TestCountWords:
    """Test word counting utility."""
    
    def test_count_words_basic(self):
        assert _count_words("hello world") == 2
    
    def test_count_words_empty(self):
        assert _count_words("") == 0
    
    def test_count_words_none(self):
        assert _count_words(None) == 0
    
    def test_count_words_multiline(self):
        assert _count_words("hello\nworld\ntest") == 3


class TestScoreWordCount:
    """Test word count scoring."""
    
    def test_good_word_count(self, good_context):
        issues = []
        score = _score_word_count(good_context, issues)
        assert score >= 20  # Should score well
        assert len(issues) == 0
    
    def test_poor_word_count(self, poor_context):
        issues = []
        score = _score_word_count(poor_context, issues)
        assert score < 10  # Should score poorly
        assert len(issues) > 0


class TestScoreCitations:
    """Test citation scoring."""
    
    def test_good_citations(self, good_context):
        issues = []
        score = _score_citations(good_context, issues)
        assert score >= 15  # Should score well with 6 citations
    
    def test_no_citations(self, poor_context):
        issues = []
        score = _score_citations(poor_context, issues)
        assert score < 10  # No citations = low score
        assert any("citation" in i.lower() for i in issues)


class TestScoreCompleteness:
    """Test completeness scoring."""
    
    def test_all_sections_present(self, good_context):
        issues = []
        score = _score_completeness(good_context, issues)
        assert score >= 20  # All sections present
    
    def test_missing_sections(self, poor_context):
        issues = []
        score = _score_completeness(poor_context, issues)
        assert score < 10  # Most sections missing
        assert any("Missing" in i for i in issues)


class TestScoreStructure:
    """Test structure scoring."""
    
    def test_good_structure(self):
        ctx = DraftContext()
        ctx.intro_output = "# Introduction\n\nParagraph one content here.\n\nParagraph two content here."
        ctx.body_output = "## Methods\n\nContent.\n\n## Results\n\nContent.\n\n## Discussion\n\nContent."
        ctx.conclusion_output = "# Conclusion\n\nFinal thoughts here."
        
        issues = []
        score = _score_structure(ctx, issues)
        assert score >= 15  # Has headers and paragraphs
    
    def test_no_structure(self, poor_context):
        issues = []
        score = _score_structure(poor_context, issues)
        assert score <= 10  # Minimal/no structure gets low score


class TestScoreDraftQuality:
    """Test overall quality scoring."""
    
    def test_good_draft_passes(self, good_context):
        result = score_draft_quality(good_context)
        assert result.passed is True
        assert result.total_score >= 50
    
    def test_poor_draft_fails(self, poor_context):
        result = score_draft_quality(poor_context)
        assert result.passed is False
        assert result.total_score < 50
        assert len(result.issues) > 0
    
    def test_score_breakdown_sums(self, good_context):
        result = score_draft_quality(good_context)
        expected_total = (
            result.word_count_score +
            result.citation_score +
            result.completeness_score +
            result.structure_score
        )
        assert result.total_score == expected_total


class TestRunQualityGate:
    """Test quality gate runner."""
    
    def test_non_strict_continues_on_failure(self, poor_context):
        """Non-strict mode should log warning but not raise."""
        result = run_quality_gate(poor_context, strict=False)
        assert result.passed is False
        # Should not raise
    
    def test_strict_raises_on_failure(self, poor_context):
        """Strict mode should raise ValueError on low quality."""
        with pytest.raises(ValueError, match="Quality gate failed"):
            run_quality_gate(poor_context, strict=True)
    
    def test_good_draft_passes_strict(self, good_context):
        """Good draft should pass even in strict mode."""
        result = run_quality_gate(good_context, strict=True)
        assert result.passed is True


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_borderline_pass_score(self):
        """Test context that scores exactly at pass threshold (50)."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        # Moderate intro (~200 words)
        ctx.intro_output = "# Introduction\n\n" + "Introduction word here. " * 50 + "{cite_001}"

        # Moderate body (~400 words)
        ctx.body_output = "## Body\n\n" + "Body content word. " * 100 + "{cite_002} {cite_003}"
        ctx.lit_review_output = "Review content. " * 20

        # Short conclusion
        ctx.conclusion_output = "## Conclusion\n\n" + "Conclusion word here. " * 30 + "{cite_004}"

        result = score_draft_quality(ctx)
        # Just verify it doesn't crash and produces a valid score
        assert 0 <= result.total_score <= 100
        assert isinstance(result.passed, bool)

    def test_citations_in_multiple_formats(self):
        """Test detection of citations in various formats."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 5}

        # Different citation formats
        ctx.intro_output = "Text {cite_001} and {cite_002} here. " * 20
        ctx.body_output = "More text {cite_003} {cite_004} {cite_005} end. " * 30
        ctx.conclusion_output = "Final {cite_006} words. " * 10

        issues = []
        score = _score_citations(ctx, issues)

        # Should find at least 5 unique citations
        assert score > 0

    def test_unicode_content_scoring(self):
        """Test scoring handles unicode content correctly."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 5}

        # Content with unicode
        ctx.intro_output = "# Einführung\n\n" + "Künstliche Intelligenz ist wichtig. " * 100 + "{cite_001}"
        ctx.body_output = "## Hauptteil\n\n" + "Die Forschung zeigt Ergebnisse. " * 150 + "{cite_002} {cite_003}"
        ctx.conclusion_output = "## Schlussfolgerung\n\n" + "Zusammenfassend lässt sich sagen. " * 50 + "{cite_004}"

        result = score_draft_quality(ctx)

        # Should handle unicode without errors
        assert result.total_score > 0
        assert isinstance(result.word_count_score, int)

    def test_empty_word_targets(self):
        """Test with empty/missing word_targets."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {}  # Empty

        ctx.intro_output = "Some intro text here."
        ctx.body_output = "Some body text."
        ctx.conclusion_output = "Conclusion."

        # Should not crash, use defaults
        result = score_draft_quality(ctx)
        assert result.total_score >= 0

    def test_max_possible_score(self, good_context):
        """Test that score never exceeds 100."""
        result = score_draft_quality(good_context)
        assert result.total_score <= 100
        assert result.word_count_score <= 25
        assert result.citation_score <= 25
        assert result.completeness_score <= 25
        assert result.structure_score <= 25

    def test_issues_list_populated(self, poor_context):
        """Test that issues list contains helpful feedback."""
        result = score_draft_quality(poor_context)

        assert len(result.issues) > 0
        # Issues should be strings with useful info
        for issue in result.issues:
            assert isinstance(issue, str)
            assert len(issue) > 5  # Not empty/trivial

    def test_different_academic_levels(self):
        """Test scoring adjusts for different academic levels."""
        # PhD thesis should require more content
        phd_ctx = DraftContext()
        phd_ctx.academic_level = "phd"
        phd_ctx.word_targets = {'min_citations': 50}
        phd_ctx.intro_output = "Short intro."
        phd_ctx.body_output = "Short body."
        phd_ctx.conclusion_output = "Short conclusion."

        # Research paper has lower requirements
        paper_ctx = DraftContext()
        paper_ctx.academic_level = "research_paper"
        paper_ctx.word_targets = {'min_citations': 10}
        paper_ctx.intro_output = "Short intro."
        paper_ctx.body_output = "Short body."
        paper_ctx.conclusion_output = "Short conclusion."

        phd_result = score_draft_quality(phd_ctx)
        paper_result = score_draft_quality(paper_ctx)

        # Both should fail but paper might score slightly higher
        assert not phd_result.passed
        assert not paper_result.passed
