#!/usr/bin/env python3
"""
Unit and integration tests for deep research planner and section complexity analysis.

Tests cover:
1. DeepResearchPlanner - plan creation, validation, refinement
2. CitationCompiler.analyze_section_complexity() - complexity scoring
3. Integration with research_citations_via_api() - deep mode execution

Run with: python3 -m pytest tests/test_deep_research.py -v
"""

import pytest
import sys
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.deep_research import DeepResearchPlanner
from utils.citation_compiler import CitationCompiler
from utils.citation_database import CitationDatabase, Citation


class TestDeepResearchPlanner:
    """Unit tests for DeepResearchPlanner."""

    def test_create_research_plan_basic(self):
        """Test basic research plan creation."""
        # Note: This test requires GOOGLE_API_KEY to be set
        # Skip if not available
        import os
        if not os.getenv('GOOGLE_API_KEY'):
            pytest.skip("GOOGLE_API_KEY not set")

        planner = DeepResearchPlanner(min_sources=10, verbose=False)

        plan = planner.create_research_plan(
            topic="Open source software sustainability",
            scope=None,
            seed_references=None
        )

        # Validate structure
        assert 'queries' in plan
        assert 'outline' in plan
        assert 'strategy' in plan

        # Validate content
        assert isinstance(plan['queries'], list)
        assert len(plan['queries']) >= 10, f"Expected >= 10 queries, got {len(plan['queries'])}"
        assert isinstance(plan['outline'], str)
        assert isinstance(plan['strategy'], str)
        assert len(plan['strategy']) > 50, "Strategy should be substantive"

    def test_create_research_plan_with_scope(self):
        """Test research plan creation with scope constraints."""
        import os
        if not os.getenv('GOOGLE_API_KEY'):
            pytest.skip("GOOGLE_API_KEY not set")

        planner = DeepResearchPlanner(min_sources=10, verbose=False)

        plan = planner.create_research_plan(
            topic="AI governance frameworks",
            scope="EU focus; B2C and B2B",
            seed_references=None
        )

        # Check that scope influenced queries
        queries_text = ' '.join(plan['queries']).lower()
        assert 'eu' in queries_text or 'europe' in queries_text, \
            "Scope constraint 'EU focus' should influence queries"

    def test_create_research_plan_with_seed_references(self):
        """Test research plan creation with seed references."""
        import os
        if not os.getenv('GOOGLE_API_KEY'):
            pytest.skip("GOOGLE_API_KEY not set")

        planner = DeepResearchPlanner(min_sources=10, verbose=False)

        seed_refs = [
            "Raymond, E. S. (1999). The Cathedral and the Bazaar",
            "Lerner, J., & Tirole, J. (2002). Some Simple Economics of Open Source"
        ]

        plan = planner.create_research_plan(
            topic="Open source economics",
            scope=None,
            seed_references=seed_refs
        )

        # Check that seed references influenced queries
        queries_text = ' '.join(plan['queries']).lower()
        assert 'raymond' in queries_text or 'lerner' in queries_text or 'tirole' in queries_text, \
            "Seed references should generate author queries"

    def test_estimate_coverage(self):
        """Test coverage estimation heuristic."""
        planner = DeepResearchPlanner(min_sources=50, verbose=False)

        # Test different query types
        queries_specific = ["author:Smith", "title:AI governance"] * 10  # 20 queries * 1.5 = 30 sources
        queries_topic = ["open source software", "AI ethics"] * 10  # 20 queries * 3 = 60 sources
        queries_broad = ["algorithmic bias in hiring systems"] * 5  # 5 queries * 6 = 30 sources

        assert planner.estimate_coverage(queries_specific) == 30
        assert planner.estimate_coverage(queries_topic) == 60
        assert planner.estimate_coverage(queries_broad) == 30

    def test_validate_plan_success(self):
        """Test plan validation with valid plan."""
        planner = DeepResearchPlanner(min_sources=10, verbose=False)

        valid_plan = {
            'queries': ["query " + str(i) for i in range(15)],  # 15 queries
            'outline': "# Topic\n## Section 1\n## Section 2",
            'strategy': "This is a comprehensive research strategy..."
        }

        assert planner.validate_plan(valid_plan) is True

    def test_validate_plan_failure_too_few_queries(self):
        """Test plan validation fails with too few queries."""
        planner = DeepResearchPlanner(min_sources=50, verbose=False)

        invalid_plan = {
            'queries': ["query1", "query2"],  # Only 2 queries - insufficient
            'outline': "# Topic\n## Section 1",
            'strategy': "Brief strategy"
        }

        assert planner.validate_plan(invalid_plan) is False

    def test_validate_plan_failure_missing_keys(self):
        """Test plan validation fails with missing keys."""
        planner = DeepResearchPlanner(min_sources=10, verbose=False)

        incomplete_plan = {
            'queries': ["query1", "query2"],
            # Missing 'outline' and 'strategy'
        }

        assert planner.validate_plan(incomplete_plan) is False


class TestSectionComplexityAnalysis:
    """Unit tests for section complexity analysis."""

    @pytest.fixture
    def compiler(self):
        """Create a CitationCompiler instance for testing."""
        database = CitationDatabase(citations=[], citation_style="APA 7th")
        return CitationCompiler(database, model=None, complexity_threshold=0.7)

    def test_complexity_simple_section(self, compiler):
        """Test complexity analysis on simple section."""
        simple_text = """
        This is a simple introduction with basic concepts.
        We will cover the topic briefly.
        The main points are straightforward.
        """

        result = compiler.analyze_section_complexity(simple_text)

        assert isinstance(result, dict)
        assert 'complexity_score' in result
        assert 'is_complex' in result
        assert 'factors' in result
        assert 'recommendation' in result

        # Simple section should have low complexity
        assert result['complexity_score'] < 0.5, \
            f"Simple section should have low complexity, got {result['complexity_score']}"
        assert result['is_complex'] is False
        assert result['recommendation'] == 'standard_research'

    def test_complexity_complex_section(self, compiler):
        """Test complexity analysis on complex section."""
        complex_text = """
        The theoretical framework for this research draws on multiple paradigms.
        Our methodology employs systematic analysis of algorithmic governance structures.
        The empirical validation demonstrates comprehensive syndraft of regulatory compliance.
        Recent literature review indicates emerging research on infrastructure optimization.
        This study contributes novel findings to the interdisciplinary field.
        {cite_001} {cite_002} {cite_003} {cite_004} {cite_005}
        The implementation architecture requires thorough performance analysis.
        Verification and validation protocols ensure methodological rigor.
        State-of-the-art approaches to scalability demonstrate cutting-edge innovations.
        """ * 5  # Repeat to increase length

        result = compiler.analyze_section_complexity(complex_text)

        # Complex section should have high complexity
        assert result['complexity_score'] > 0.6, \
            f"Complex section should have high complexity, got {result['complexity_score']}"
        assert result['is_complex'] is True
        assert result['recommendation'] == 'deep_research'

    def test_complexity_factors(self, compiler):
        """Test that all complexity factors are calculated."""
        text = "methodology framework analysis hypodraft validation {cite_001}"

        result = compiler.analyze_section_complexity(text)

        factors = result['factors']
        assert 'technical_density' in factors
        assert 'citation_density' in factors
        assert 'length_factor' in factors
        assert 'keyword_density' in factors

        # All factors should be between 0 and 1
        for factor_name, factor_value in factors.items():
            assert 0.0 <= factor_value <= 1.0, \
                f"{factor_name} should be 0-1, got {factor_value}"

    def test_complexity_metrics(self, compiler):
        """Test that metrics are correctly extracted."""
        text = """
        This research employs a systematic methodology to analyze the framework.
        The hypodraft is validated through empirical evidence. {cite_001} {cite_002}
        """

        result = compiler.analyze_section_complexity(text)

        metrics = result['metrics']
        assert 'word_count' in metrics
        assert 'sentence_count' in metrics
        assert 'citation_count' in metrics
        assert 'technical_terms' in metrics
        assert 'academic_keywords' in metrics

        assert metrics['word_count'] > 0
        assert metrics['sentence_count'] >= 2
        assert metrics['citation_count'] == 2  # {cite_001} {cite_002}
        assert metrics['technical_terms'] >= 3  # methodology, framework, hypodraft


class TestDeepResearchIntegration:
    """Integration tests for deep research with Scout agent."""

    def test_research_plan_structure_valid(self):
        """Test that research plan has valid structure for Scout execution."""
        import os
        if not os.getenv('GOOGLE_API_KEY'):
            pytest.skip("GOOGLE_API_KEY not set")

        planner = DeepResearchPlanner(min_sources=10, verbose=False)

        plan = planner.create_research_plan(
            topic="Open source sustainability",
            scope=None,
            seed_references=None
        )

        # Validate that queries can be used as research_topics for Scout
        assert isinstance(plan['queries'], list)
        assert all(isinstance(q, str) for q in plan['queries']), \
            "All queries should be strings"
        assert all(len(q) > 0 for q in plan['queries']), \
            "No empty queries allowed"

    def test_complexity_threshold_configuration(self):
        """Test that complexity threshold is configurable."""
        database = CitationDatabase(citations=[], citation_style="APA 7th")

        # Test with low threshold (0.3)
        compiler_low = CitationCompiler(database, model=None, complexity_threshold=0.3)
        result_low = compiler_low.analyze_section_complexity("Simple text with methodology")

        # Test with high threshold (0.9)
        compiler_high = CitationCompiler(database, model=None, complexity_threshold=0.9)
        result_high = compiler_high.analyze_section_complexity("Simple text with methodology")

        # Same text, different thresholds
        assert result_low['complexity_score'] == result_high['complexity_score'], \
            "Complexity score should be independent of threshold"

        # But classification should differ
        # (Note: might both be False if score is low, that's OK)
        if result_low['complexity_score'] > 0.3:
            assert result_low['is_complex'] != result_high['is_complex'], \
                "Classification should differ with different thresholds"


if __name__ == '__main__':
    # Run tests with pytest
    pytest.main([__file__, '-v', '--tb=short'])
