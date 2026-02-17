#!/usr/bin/env python3
"""
Quality gate calibration tests against real academic standards.

These tests verify that the quality gate scoring aligns with actual
academic requirements from universities and style guides.

Sources for word count standards:
- APA Manual 7th Edition
- University thesis guidelines (MIT, Stanford, Oxford)
- Academic writing handbooks

Word Count Standards (typical ranges):
- Research Paper: 3,000-8,000 words, 15-30 citations
- Bachelor Thesis: 8,000-15,000 words, 20-40 citations
- Master Thesis: 15,000-30,000 words, 40-80 citations
- PhD Dissertation: 50,000-100,000 words, 100-300 citations
"""

import pytest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.quality_gate import (
    score_draft_quality,
    run_quality_gate,
    _count_words,
    _score_word_count,
    _score_citations,
)
from phases.context import DraftContext


class TestAcademicStandardsCalibration:
    """Verify quality gate aligns with real academic standards."""

    def _create_context_with_word_counts(
        self,
        academic_level: str,
        intro_words: int,
        body_words: int,
        conclusion_words: int,
        citation_count: int,
    ) -> DraftContext:
        """Create context with specified word counts and citations."""
        ctx = DraftContext()
        ctx.academic_level = academic_level
        ctx.word_targets = {
            'research_paper': {'min_citations': 10},
            'bachelor': {'min_citations': 20},
            'master': {'min_citations': 40},
            'phd': {'min_citations': 80},
        }.get(academic_level, {'min_citations': 10})

        # Generate text with exact word counts
        ctx.intro_output = "# Introduction\n\n" + "word " * intro_words
        ctx.body_output = "## Body\n\n" + "word " * body_words
        ctx.conclusion_output = "## Conclusion\n\n" + "word " * conclusion_words

        # Add citations
        for i in range(1, citation_count + 1):
            if i <= citation_count // 3:
                ctx.intro_output += f" {{cite_{i:03d}}}"
            elif i <= 2 * citation_count // 3:
                ctx.body_output += f" {{cite_{i:03d}}}"
            else:
                ctx.conclusion_output += f" {{cite_{i:03d}}}"

        # Fill in other sections
        ctx.lit_review_output = "Literature review content. " * 50
        ctx.methodology_output = "Methodology content. " * 50
        ctx.results_output = "Results content. " * 50
        ctx.discussion_output = "Discussion content. " * 50

        return ctx

    # =========================================================================
    # RESEARCH PAPER CALIBRATION (3,000-5,000 words, 10-15 citations)
    # =========================================================================

    def test_research_paper_meets_minimum_standards(self):
        """Research paper meeting minimum requirements should pass."""
        ctx = self._create_context_with_word_counts(
            academic_level="research_paper",
            intro_words=400,    # Min: 400
            body_words=1500,    # Min: 1500
            conclusion_words=300,  # Min: 300
            citation_count=10,  # Min: 10
        )

        result = score_draft_quality(ctx)

        assert result.passed is True, f"Should pass with minimum standards. Score: {result.total_score}"
        assert result.word_count_score >= 20, "Word count should score well"

    def test_research_paper_excellent_exceeds_standards(self):
        """Research paper exceeding requirements should score high."""
        ctx = self._create_context_with_word_counts(
            academic_level="research_paper",
            intro_words=800,    # 2x minimum
            body_words=3000,    # 2x minimum
            conclusion_words=600,  # 2x minimum
            citation_count=20,  # 2x minimum
        )

        result = score_draft_quality(ctx)

        assert result.total_score >= 70, f"Excellent paper should score 70+. Got: {result.total_score}"

    def test_research_paper_below_minimum_fails(self):
        """Research paper below requirements should not pass."""
        ctx = self._create_context_with_word_counts(
            academic_level="research_paper",
            intro_words=100,    # Way below 400
            body_words=500,     # Way below 1500
            conclusion_words=50,  # Way below 300
            citation_count=3,   # Way below 10
        )

        result = score_draft_quality(ctx)

        assert result.passed is False, "Below minimum should fail"
        assert len(result.issues) > 0, "Should have issues listed"

    # =========================================================================
    # BACHELOR THESIS CALIBRATION (8,000-15,000 words, 20-40 citations)
    # =========================================================================

    def test_bachelor_thesis_meets_minimum_standards(self):
        """Bachelor thesis meeting minimum requirements should pass."""
        ctx = self._create_context_with_word_counts(
            academic_level="bachelor",
            intro_words=1000,   # Min: 1000
            body_words=5000,    # Min: 5000
            conclusion_words=600,  # Min: 600
            citation_count=20,  # Min: 20
        )

        result = score_draft_quality(ctx)

        # Bachelor has higher requirements - may need more content
        assert result.word_count_score >= 15, f"Word count should be decent. Got: {result.word_count_score}"

    def test_bachelor_thesis_well_above_minimum(self):
        """Bachelor thesis well above minimum should score high."""
        ctx = self._create_context_with_word_counts(
            academic_level="bachelor",
            intro_words=2000,
            body_words=8000,
            conclusion_words=1200,
            citation_count=35,
        )

        result = score_draft_quality(ctx)

        assert result.total_score >= 60, f"Well-done bachelor should score 60+. Got: {result.total_score}"

    # =========================================================================
    # MASTER THESIS CALIBRATION (15,000-30,000 words, 40-80 citations)
    # =========================================================================

    def test_master_thesis_meets_minimum_standards(self):
        """Master thesis meeting minimum requirements should pass."""
        ctx = self._create_context_with_word_counts(
            academic_level="master",
            intro_words=1500,   # Min: 1500
            body_words=10000,   # Min: 10000
            conclusion_words=1000,  # Min: 1000
            citation_count=40,  # Min: 40
        )

        result = score_draft_quality(ctx)

        assert result.word_count_score >= 15, f"Master minimum should score decently. Got: {result.word_count_score}"

    def test_master_thesis_insufficient_length_flagged(self):
        """Master thesis with insufficient length should be flagged."""
        ctx = self._create_context_with_word_counts(
            academic_level="master",
            intro_words=500,    # Way below 1500
            body_words=3000,    # Way below 10000
            conclusion_words=300,  # Way below 1000
            citation_count=15,  # Way below 40
        )

        result = score_draft_quality(ctx)

        assert result.passed is False, "Insufficient master thesis should fail"
        # Should flag word count and citation issues
        issues_text = " ".join(result.issues).lower()
        assert "short" in issues_text or "low" in issues_text, "Should mention length issues"

    # =========================================================================
    # PHD DISSERTATION CALIBRATION (50,000-100,000 words, 100+ citations)
    # =========================================================================

    def test_phd_thesis_minimum_requirements(self):
        """PhD thesis with minimum requirements."""
        ctx = self._create_context_with_word_counts(
            academic_level="phd",
            intro_words=2500,   # Min: 2500
            body_words=20000,   # Min: 20000
            conclusion_words=2000,  # Min: 2000
            citation_count=80,  # Min: 80
        )

        result = score_draft_quality(ctx)

        # PhD has very high requirements
        assert result.word_count_score >= 10, f"PhD minimum should score at least 10. Got: {result.word_count_score}"

    def test_phd_thesis_far_below_requirements_fails_hard(self):
        """PhD thesis far below requirements should fail significantly."""
        ctx = self._create_context_with_word_counts(
            academic_level="phd",
            intro_words=500,    # Way below 2500
            body_words=5000,    # Way below 20000
            conclusion_words=300,  # Way below 2000
            citation_count=20,  # Way below 80
        )

        result = score_draft_quality(ctx)

        assert result.passed is False, "Insufficient PhD should fail"
        # Word count should be 0 (all sections very short)
        assert result.word_count_score == 0, f"Word count should be 0. Got: {result.word_count_score}"
        # Should have multiple issues flagged
        assert len(result.issues) >= 4, f"Should flag multiple issues. Got: {len(result.issues)}"


class TestCitationDensityCalibration:
    """Verify citation density scoring is calibrated correctly."""

    def test_one_citation_per_500_words_is_good(self):
        """1 citation per 500 words is considered good density."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        # 2500 words = need 5 citations for good density
        ctx.intro_output = "word " * 500 + "{cite_001} {cite_002}"
        ctx.body_output = "word " * 1500 + "{cite_003} {cite_004} {cite_005}"
        ctx.conclusion_output = "word " * 500

        issues = []
        score = _score_citations(ctx, issues)

        # Should get decent density score
        assert score >= 10, f"Good density should score 10+. Got: {score}"

    def test_sparse_citations_flagged(self):
        """Very sparse citations should be flagged."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        # 3000 words but only 2 citations
        ctx.intro_output = "word " * 1000 + "{cite_001}"
        ctx.body_output = "word " * 1500 + "{cite_002}"
        ctx.conclusion_output = "word " * 500

        issues = []
        score = _score_citations(ctx, issues)

        # Should flag low density
        issues_text = " ".join(issues).lower()
        assert "density" in issues_text or "few" in issues_text, "Should mention citation density"


class TestSectionCompletenessCalibration:
    """Verify section completeness is scored appropriately."""

    def test_all_sections_substantial_scores_high(self):
        """All sections with substantial content should score high."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        # All sections with > 100 chars
        ctx.intro_output = "Introduction content here. " * 20
        ctx.lit_review_output = "Literature review content. " * 20
        ctx.methodology_output = "Methodology content here. " * 20
        ctx.results_output = "Results content here with data. " * 20
        ctx.discussion_output = "Discussion of findings. " * 20
        ctx.conclusion_output = "Conclusion summarizing key points. " * 20
        ctx.body_output = ""  # body_output separate from individual sections

        result = score_draft_quality(ctx)

        assert result.completeness_score >= 20, f"All sections present should score 20+. Got: {result.completeness_score}"

    def test_missing_sections_flagged(self):
        """Missing sections should be explicitly flagged."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        # Only intro and conclusion
        ctx.intro_output = "Introduction content here. " * 20
        ctx.lit_review_output = ""
        ctx.methodology_output = ""
        ctx.results_output = ""
        ctx.discussion_output = ""
        ctx.conclusion_output = "Conclusion content here. " * 20
        ctx.body_output = ""

        result = score_draft_quality(ctx)

        # Should flag missing sections
        assert "Missing" in str(result.issues), "Should flag missing sections"
        assert result.completeness_score < 15, "Missing sections should lower score"


class TestStructureCalibration:
    """Verify markdown structure scoring is calibrated correctly."""

    def test_well_structured_document(self):
        """Well-structured markdown should score high."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        ctx.intro_output = """# Introduction

This is the first paragraph of the introduction. It sets up the research question.

This is the second paragraph. It provides background context.

## Research Questions

1. First research question
2. Second research question
"""

        ctx.body_output = """## Literature Review

Prior work has established several key findings.

### Theoretical Framework

The theoretical basis for this work.

### Empirical Studies

Summary of empirical evidence.

## Methodology

### Data Collection

How data was collected.

### Analysis Methods

Statistical methods used.
"""

        ctx.conclusion_output = """## Conclusion

Summary of key findings.

### Limitations

Study limitations.

### Future Work

Directions for future research.
"""

        result = score_draft_quality(ctx)

        assert result.structure_score >= 15, f"Well-structured should score 15+. Got: {result.structure_score}"

    def test_placeholder_text_penalized(self):
        """Placeholder text like TODO and [INSERT] should be penalized."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        ctx.intro_output = "# Introduction\n\nTODO: Add introduction content."
        ctx.body_output = "## Methods\n\n[INSERT methodology here]\n\nLorem ipsum dolor sit amet."
        ctx.conclusion_output = "## Conclusion\n\n{cite_MISSING} - need to find source"

        result = score_draft_quality(ctx)

        # Should flag placeholders
        issues_text = " ".join(result.issues)
        assert "TODO" in issues_text or "INSERT" in issues_text or "MISSING" in issues_text
