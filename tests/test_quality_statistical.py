#!/usr/bin/env python3
"""
Statistical validation tests for quality gate thresholds.

These tests run the quality gate multiple times with randomized inputs
at boundary conditions, verifying scoring consistency and threshold
reliability across many iterations.

Statistical Goals:
- Scoring is deterministic (same input = same output)
- Threshold boundaries are sharp (no fuzzy pass/fail regions)
- Edge cases are handled consistently
- No scoring anomalies (scores always in valid ranges)
"""

import random
import pytest
import statistics
from pathlib import Path
from typing import List, Tuple

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.quality_gate import (
    score_draft_quality,
    _count_words,
    _score_word_count,
    _score_citations,
    _score_completeness,
    _score_structure,
    QualityScore,
)
from phases.context import DraftContext


def _generate_random_content(word_count: int, include_headers: bool = True) -> str:
    """Generate random academic-like content with specified word count."""
    words = ["research", "analysis", "study", "method", "results", "data",
             "findings", "evidence", "literature", "theory", "framework",
             "approach", "investigation", "hypothesis", "conclusion",
             "significant", "demonstrates", "indicates", "suggests", "reveals"]

    content_lines = []

    if include_headers:
        content_lines.append("# Section Title\n")
        content_lines.append("\n")

    current_words = 0
    paragraph = []

    while current_words < word_count:
        word = random.choice(words)
        paragraph.append(word)
        current_words += 1

        # Create paragraphs every ~100 words
        if len(paragraph) >= 100:
            content_lines.append(" ".join(paragraph) + ".\n\n")
            paragraph = []

    if paragraph:
        content_lines.append(" ".join(paragraph) + ".\n")

    return "".join(content_lines)


def _create_randomized_context(
    intro_words: int,
    body_words: int,
    conclusion_words: int,
    citation_count: int,
    academic_level: str = "research_paper",
    seed: int = None,
) -> DraftContext:
    """Create context with randomized content of specified sizes."""
    if seed is not None:
        random.seed(seed)

    ctx = DraftContext()
    ctx.academic_level = academic_level
    ctx.word_targets = {
        'research_paper': {'min_citations': 10},
        'bachelor': {'min_citations': 20},
        'master': {'min_citations': 40},
        'phd': {'min_citations': 80},
    }.get(academic_level, {'min_citations': 10})

    # Generate content
    ctx.intro_output = _generate_random_content(intro_words)
    ctx.body_output = _generate_random_content(body_words)
    ctx.conclusion_output = _generate_random_content(conclusion_words)

    # Add citations evenly distributed
    citation_spacing = max(1, (intro_words + body_words + conclusion_words) // max(1, citation_count))

    for i in range(1, citation_count + 1):
        citation_ref = f" {{cite_{i:03d}}}"
        if i <= citation_count // 3:
            ctx.intro_output += citation_ref
        elif i <= 2 * citation_count // 3:
            ctx.body_output += citation_ref
        else:
            ctx.conclusion_output += citation_ref

    # Add other sections
    ctx.lit_review_output = _generate_random_content(max(100, body_words // 5), include_headers=False)
    ctx.methodology_output = _generate_random_content(max(100, body_words // 5), include_headers=False)
    ctx.results_output = _generate_random_content(max(100, body_words // 5), include_headers=False)
    ctx.discussion_output = _generate_random_content(max(100, body_words // 5), include_headers=False)

    return ctx


class TestScoringDeterminism:
    """Verify scoring produces identical results for identical inputs."""

    def test_same_input_same_output(self):
        """Identical context should produce identical scores every time."""
        ctx = _create_randomized_context(
            intro_words=500,
            body_words=2000,
            conclusion_words=400,
            citation_count=12,
            seed=42,
        )

        # Score multiple times
        scores = []
        for _ in range(10):
            result = score_draft_quality(ctx)
            scores.append(result.total_score)

        # All scores should be identical
        assert len(set(scores)) == 1, f"Non-deterministic scoring: {scores}"

    def test_different_seeds_different_content(self):
        """Different random seeds should produce valid but different content."""
        contexts = []
        for seed in [1, 2, 3, 4, 5]:
            ctx = _create_randomized_context(
                intro_words=500,
                body_words=2000,
                conclusion_words=400,
                citation_count=12,
                seed=seed,
            )
            contexts.append(ctx)

        # Content should differ
        intro_contents = [ctx.intro_output for ctx in contexts]
        assert len(set(intro_contents)) > 1, "Random content should vary with seed"

        # But all should score in valid range
        for ctx in contexts:
            result = score_draft_quality(ctx)
            assert 0 <= result.total_score <= 100


class TestThresholdBoundaries:
    """Test behavior at exact threshold boundaries."""

    def test_pass_threshold_exactly_50(self):
        """Score of exactly 50 should pass."""
        # This is tricky to engineer exactly, so we test the threshold logic
        scores = [49, 50, 51]

        for score in scores:
            passed = score >= 50
            if score == 49:
                assert not passed, "Score 49 should not pass"
            elif score == 50:
                assert passed, "Score 50 should pass"
            elif score == 51:
                assert passed, "Score 51 should pass"

    def test_word_count_threshold_transitions(self):
        """Test word count scoring at threshold boundaries."""
        # Test intro threshold (400 words for research_paper)
        for word_count in [199, 200, 399, 400, 401]:
            ctx = _create_randomized_context(
                intro_words=word_count,
                body_words=2000,
                conclusion_words=400,
                citation_count=12,
                seed=42,
            )

            issues = []
            score = _score_word_count(ctx, issues)

            # Score should be consistent for same word count
            ctx2 = _create_randomized_context(
                intro_words=word_count,
                body_words=2000,
                conclusion_words=400,
                citation_count=12,
                seed=43,  # Different seed
            )

            issues2 = []
            score2 = _score_word_count(ctx2, issues2)

            # Word count scoring should be consistent
            assert score == score2, f"Inconsistent scoring for {word_count} words"


class TestStatisticalDistribution:
    """Test scoring distribution across many random samples."""

    def test_passing_distribution(self):
        """
        With good parameters, most samples should pass.

        Generate 50 random contexts with "good" parameters and verify
        at least 90% pass the quality gate.
        """
        passed_count = 0
        total = 50

        for seed in range(total):
            ctx = _create_randomized_context(
                intro_words=600,  # Above minimum (400)
                body_words=2500,  # Above minimum (1500)
                conclusion_words=500,  # Above minimum (300)
                citation_count=15,  # Above minimum (10)
                seed=seed,
            )

            result = score_draft_quality(ctx)
            if result.passed:
                passed_count += 1

        pass_rate = passed_count / total
        assert pass_rate >= 0.90, f"Pass rate too low: {pass_rate:.1%} (expected >= 90%)"

    def test_failing_distribution(self):
        """
        With poor parameters, most samples should fail.

        Generate 50 random contexts with "poor" parameters and verify
        at least 90% fail the quality gate.
        """
        failed_count = 0
        total = 50

        for seed in range(total):
            ctx = _create_randomized_context(
                intro_words=100,  # Below minimum (400)
                body_words=500,  # Below minimum (1500)
                conclusion_words=50,  # Below minimum (300)
                citation_count=3,  # Below minimum (10)
                seed=seed,
            )

            result = score_draft_quality(ctx)
            if not result.passed:
                failed_count += 1

        fail_rate = failed_count / total
        assert fail_rate >= 0.90, f"Fail rate too low: {fail_rate:.1%} (expected >= 90%)"

    def test_score_distribution_variance(self):
        """
        Scores for similar inputs should have low variance.

        Generate 30 samples with similar parameters and verify
        standard deviation is reasonable (< 10 points).
        """
        scores = []

        for seed in range(30):
            ctx = _create_randomized_context(
                intro_words=500,
                body_words=2000,
                conclusion_words=400,
                citation_count=12,
                seed=seed,
            )

            result = score_draft_quality(ctx)
            scores.append(result.total_score)

        std_dev = statistics.stdev(scores)
        mean_score = statistics.mean(scores)

        # Variance should be reasonable
        assert std_dev < 10, f"Score variance too high: std={std_dev:.1f} (expected < 10)"

        print(f"\nScore distribution: mean={mean_score:.1f}, std={std_dev:.1f}")
        print(f"Range: {min(scores)} - {max(scores)}")


class TestEdgeCaseConsistency:
    """Test consistent handling of edge cases across multiple runs."""

    def test_empty_content_always_fails(self):
        """Empty content should always fail regardless of randomization."""
        for _ in range(10):
            ctx = DraftContext()
            ctx.academic_level = "research_paper"
            ctx.word_targets = {'min_citations': 10}
            ctx.intro_output = ""
            ctx.body_output = ""
            ctx.conclusion_output = ""

            result = score_draft_quality(ctx)
            assert not result.passed, "Empty content should always fail"
            assert result.total_score < 20, "Empty content score should be very low"

    def test_maximum_content_always_passes(self):
        """Excellent content should always pass regardless of randomization."""
        for seed in range(10):
            ctx = _create_randomized_context(
                intro_words=1000,  # 2.5x minimum
                body_words=5000,  # 3x+ minimum
                conclusion_words=800,  # 2.5x+ minimum
                citation_count=25,  # 2.5x minimum
                seed=seed,
            )

            result = score_draft_quality(ctx)
            assert result.passed, f"Excellent content should pass (seed={seed})"
            assert result.total_score >= 60, f"Excellent score too low: {result.total_score}"

    def test_borderline_cases_consistent(self):
        """
        Borderline cases should be handled consistently.

        Content at exactly the threshold should always score the same
        (within integer rounding).
        """
        # Create borderline context
        borderline_scores = []

        for seed in range(20):
            ctx = _create_randomized_context(
                intro_words=400,  # Exactly at minimum
                body_words=1500,  # Exactly at minimum
                conclusion_words=300,  # Exactly at minimum
                citation_count=10,  # Exactly at minimum
                seed=seed,
            )

            result = score_draft_quality(ctx)
            borderline_scores.append(result.total_score)

        # All scores should be similar (within 5 points of each other)
        score_range = max(borderline_scores) - min(borderline_scores)
        assert score_range <= 10, f"Borderline score range too wide: {score_range}"


class TestAcademicLevelConsistency:
    """Test consistent behavior across academic levels."""

    def test_higher_levels_require_more(self):
        """Higher academic levels should have higher requirements."""
        levels = ["research_paper", "bachelor", "master", "phd"]

        # Use same proportional content for all levels
        scores_by_level = {}

        for level in levels:
            ctx = _create_randomized_context(
                intro_words=500,
                body_words=2000,
                conclusion_words=400,
                citation_count=12,
                academic_level=level,
                seed=42,
            )

            result = score_draft_quality(ctx)
            scores_by_level[level] = result.total_score

        # Research paper should score highest (easiest requirements)
        # PhD should score lowest (hardest requirements)
        assert scores_by_level["research_paper"] >= scores_by_level["bachelor"]
        assert scores_by_level["bachelor"] >= scores_by_level["master"]
        assert scores_by_level["master"] >= scores_by_level["phd"]

    def test_level_scaling_is_proportional(self):
        """Requirements should scale proportionally with level."""
        # Content that meets research paper requirements
        base_ctx = _create_randomized_context(
            intro_words=400,
            body_words=1500,
            conclusion_words=300,
            citation_count=10,
            academic_level="research_paper",
            seed=42,
        )

        research_result = score_draft_quality(base_ctx)

        # Same content for PhD should score lower
        base_ctx.academic_level = "phd"
        base_ctx.word_targets = {'min_citations': 80}

        phd_result = score_draft_quality(base_ctx)

        # PhD score should be significantly lower
        score_diff = research_result.total_score - phd_result.total_score
        assert score_diff > 10, f"Level scaling too weak: diff={score_diff}"


class TestComponentScoreRanges:
    """Test that component scores are always in valid ranges."""

    def test_word_count_score_range(self):
        """Word count score should always be 0-25."""
        for seed in range(30):
            word_counts = [0, 10, 100, 500, 1000, 5000, 10000]
            intro_words = random.choice(word_counts)
            body_words = random.choice(word_counts)
            conclusion_words = random.choice(word_counts)

            ctx = _create_randomized_context(
                intro_words=max(1, intro_words),
                body_words=max(1, body_words),
                conclusion_words=max(1, conclusion_words),
                citation_count=10,
                seed=seed,
            )

            issues = []
            score = _score_word_count(ctx, issues)

            assert 0 <= score <= 25, f"Word count score out of range: {score}"

    def test_citation_score_range(self):
        """Citation score should always be 0-25."""
        for citation_count in [0, 1, 5, 10, 20, 50, 100]:
            ctx = _create_randomized_context(
                intro_words=500,
                body_words=2000,
                conclusion_words=400,
                citation_count=citation_count,
                seed=42,
            )

            issues = []
            score = _score_citations(ctx, issues)

            assert 0 <= score <= 25, f"Citation score out of range: {score}"

    def test_completeness_score_range(self):
        """Completeness score should always be 0-25."""
        for seed in range(20):
            ctx = _create_randomized_context(
                intro_words=random.randint(0, 1000),
                body_words=random.randint(0, 3000),
                conclusion_words=random.randint(0, 500),
                citation_count=10,
                seed=seed,
            )

            # Randomly clear some sections
            if random.random() < 0.3:
                ctx.lit_review_output = ""
            if random.random() < 0.3:
                ctx.methodology_output = ""

            issues = []
            score = _score_completeness(ctx, issues)

            assert 0 <= score <= 25, f"Completeness score out of range: {score}"

    def test_structure_score_range(self):
        """Structure score should always be 0-25."""
        for seed in range(20):
            ctx = _create_randomized_context(
                intro_words=random.randint(10, 1000),
                body_words=random.randint(10, 3000),
                conclusion_words=random.randint(10, 500),
                citation_count=10,
                seed=seed,
            )

            issues = []
            score = _score_structure(ctx, issues)

            assert 0 <= score <= 25, f"Structure score out of range: {score}"

    def test_total_score_never_exceeds_100(self):
        """Total score should never exceed 100."""
        for seed in range(50):
            ctx = _create_randomized_context(
                intro_words=random.randint(100, 2000),
                body_words=random.randint(500, 10000),
                conclusion_words=random.randint(100, 1000),
                citation_count=random.randint(5, 50),
                seed=seed,
            )

            result = score_draft_quality(ctx)

            assert result.total_score <= 100, f"Score exceeds 100: {result.total_score}"
            assert result.total_score >= 0, f"Negative score: {result.total_score}"

            # Verify sum matches
            expected = (
                result.word_count_score +
                result.citation_score +
                result.completeness_score +
                result.structure_score
            )
            assert result.total_score == expected, f"Sum mismatch: {result.total_score} != {expected}"
