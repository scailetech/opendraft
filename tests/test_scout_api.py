#!/usr/bin/env python3
"""
Integration tests for API-backed Scout functionality.

Tests the research_citations_via_api() function to ensure:
- API fallback chain works (Crossref → Semantic Scholar → LLM)
- Quality gate enforces minimum citation count
- Real citations are discovered (not LLM hallucinations)
- Source tracking works correctly
- Output markdown is properly formatted
"""

import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from tests.test_utils import setup_model, research_citations_via_api
from utils.citation_database import Citation


class TestScoutAPIBasic:
    """Basic functionality tests for API-backed Scout."""

    def test_small_topic_list(self, tmp_path):
        """Test Scout with small topic list (3 topics)."""
        model = setup_model()

        research_topics = [
            "open source software development",
            "Linux operating system history",
            "collaborative knowledge creation"
        ]

        output_file = tmp_path / "scout_output.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=3,  # Low threshold for testing
            verbose=False
        )

        # Verify result structure
        assert "citations" in result
        assert "count" in result
        assert "sources" in result
        assert "failed_topics" in result

        # Verify citation count meets minimum
        assert result["count"] >= 3
        assert len(result["citations"]) >= 3

        # Verify output file exists
        assert output_file.exists()
        content = output_file.read_text()
        assert "# Scout Output" in content
        assert "## Citations Found" in content

    def test_quality_gate_pass(self, tmp_path):
        """Test that quality gate passes with sufficient citations."""
        model = setup_model()

        # Use 15 well-known topics to ensure success
        research_topics = [
            "open source software development methodologies",
            "Linux kernel architecture",
            "Wikipedia collaborative encyclopedia",
            "Mozilla Firefox web browser",
            "Apache web server software",
            "artificial intelligence pricing models",
            "carbon emissions trading systems",
            "machine learning API economics",
            "collaborative software development",
            "knowledge management systems",
            "distributed systems design",
            "cloud computing pricing",
            "software engineering best practices",
            "agile development methodologies",
            "DevOps continuous integration"
        ]

        output_file = tmp_path / "scout_output.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=10,  # Should easily pass
            verbose=False
        )

        assert result["count"] >= 10

    def test_quality_gate_fail(self, tmp_path):
        """Test that quality gate fails with insufficient citations."""
        model = setup_model()

        # Use only 1 obscure topic - likely to fail
        research_topics = ["extremely obscure unpublished research topic xyz123"]

        output_file = tmp_path / "scout_output.md"

        # Should raise ValueError due to quality gate
        with pytest.raises(ValueError, match="Only .* citations found"):
            research_citations_via_api(
                model=model,
                research_topics=research_topics,
                output_path=output_file,
                target_minimum=50,  # Will fail
                verbose=False
            )


class TestScoutAPISourceTracking:
    """Test source tracking and API fallback chain."""

    def test_source_breakdown(self, tmp_path):
        """Test that sources are tracked correctly."""
        model = setup_model()

        research_topics = [
            "Linux operating system kernel",
            "Apache web server",
            "Wikipedia encyclopedia",
            "Mozilla Firefox browser",
            "Python programming language"
        ]

        output_file = tmp_path / "scout_output.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=5,
            verbose=False
        )

        # Verify sources breakdown exists
        assert "sources" in result
        sources = result["sources"]

        # Verify source keys exist
        assert "Crossref" in sources
        assert "Semantic Scholar" in sources
        assert "Gemini LLM" in sources

        # At least one source should have citations
        total_from_sources = sum(sources.values())
        assert total_from_sources == result["count"]

    def test_citations_have_source_attribute(self, tmp_path):
        """Test that Citation objects have _source attribute."""
        model = setup_model()

        research_topics = [
            "open source software",
            "machine learning"
        ]

        output_file = tmp_path / "scout_output.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=2,
            verbose=False
        )

        # Check first citation has _source
        if result["citations"]:
            citation = result["citations"][0]
            assert hasattr(citation, "_source")
            assert citation._source in ["Crossref", "Semantic Scholar", "Gemini LLM"]


class TestScoutAPIOutputFormat:
    """Test markdown output formatting."""

    def test_markdown_structure(self, tmp_path):
        """Test that output markdown has correct structure."""
        model = setup_model()

        research_topics = [
            "Linux operating system",
            "Apache web server",
            "Python programming"
        ]

        output_file = tmp_path / "scout_output.md"

        research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=3,
            verbose=False
        )

        content = output_file.read_text()

        # Verify required sections
        assert "# Scout Output - Academic Citation Discovery" in content
        assert "## Summary" in content
        assert "**Total Valid Citations**:" in content
        assert "### Sources Breakdown" in content
        assert "## Citations Found" in content

        # Verify citation format (should have "#### N. Title" format)
        assert "####" in content
        assert "**Authors**:" in content
        assert "**Year**:" in content
        assert "**DOI**:" in content

    def test_failed_topics_section(self, tmp_path):
        """Test that failed topics are properly documented."""
        model = setup_model()

        research_topics = [
            "Linux operating system",
            "extremely obscure topic xyz that definitely does not exist in any database"
        ]

        output_file = tmp_path / "scout_output.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=1,  # Low threshold to allow passing
            verbose=False
        )

        # If any topics failed, check they're documented
        if result["failed_topics"]:
            content = output_file.read_text()
            assert "## Failed Topics" in content


class TestScoutAPICitationQuality:
    """Test citation quality and validation."""

    def test_citations_have_required_fields(self, tmp_path):
        """Test that all citations have required fields."""
        model = setup_model()

        research_topics = [
            "open source software development",
            "machine learning",
            "carbon emissions trading"
        ]

        output_file = tmp_path / "scout_output.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=3,
            verbose=False
        )

        # Check each citation has required fields
        for citation in result["citations"]:
            assert isinstance(citation, Citation)
            assert citation.authors  # Must have authors
            assert citation.year  # Must have year
            assert citation.title  # Must have title
            assert isinstance(citation.year, int)
            assert citation.year >= 1900 and citation.year <= 2025

    def test_real_dois_not_fake(self, tmp_path):
        """Test that DOIs are real (not LLM hallucinations)."""
        model = setup_model()

        research_topics = [
            "Linux operating system",
            "Apache web server"
        ]

        output_file = tmp_path / "scout_output.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=2,
            verbose=False
        )

        # Check DOIs don't have fake patterns
        fake_patterns = [
            "10.XXXXX",
            "10.YYYYY",
            "10.00000",
            "10.99999"
        ]

        for citation in result["citations"]:
            if citation.doi:
                for pattern in fake_patterns:
                    assert pattern not in citation.doi, f"Found fake DOI pattern: {citation.doi}"


@pytest.mark.slow
class TestScoutAPIRealWorld:
    """Real-world integration tests (slower, marked as slow)."""

    def test_opensource_draft_topics(self, tmp_path):
        """Test with real opensource draft topics (50 topics)."""
        model = setup_model()

        # Use first 10 topics from opensource draft for speed
        research_topics = [
            "open source software development methodologies and practices",
            "distributed peer production in software development",
            "collaborative software development processes",
            "open source contribution patterns and community dynamics",
            "open source governance models and decision-making",
            "economic impact of open source software on GDP",
            "open source business models and commercial strategies",
            "open source software as public good economic theory",
            "open source market competition and vendor lock-in",
            "open innovation paradigms in software industry"
        ]

        output_file = tmp_path / "scout_opensource.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=10,
            verbose=True
        )

        # Verify quality metrics
        assert result["count"] >= 10
        success_rate = result["count"] / len(research_topics) * 100
        assert success_rate >= 50  # At least 50% success rate

    def test_ai_pricing_draft_topics(self, tmp_path):
        """Test with real AI pricing draft topics."""
        model = setup_model()

        # Use first 10 topics from AI pricing draft
        research_topics = [
            "pricing models for artificial intelligence services",
            "token-based pricing for large language models",
            "usage-based pricing in cloud computing",
            "value-based pricing strategies",
            "API pricing and monetization strategies",
            "economic models for AI agents",
            "cost structures of machine learning services",
            "pricing transparency in AI platforms",
            "AI service pricing optimization",
            "multi-tier pricing for AI APIs"
        ]

        output_file = tmp_path / "scout_ai_pricing.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=10,
            verbose=True
        )

        # Verify quality metrics
        assert result["count"] >= 10
        success_rate = result["count"] / len(research_topics) * 100
        assert success_rate >= 50

    def test_co2_german_draft_topics(self, tmp_path):
        """Test with real CO2 German draft topics."""
        model = setup_model()

        # Use first 10 topics from CO2 draft
        research_topics = [
            "carbon emissions trading systems design and implementation",
            "cap-and-trade mechanisms for greenhouse gas reduction",
            "European Union Emissions Trading System EU ETS",
            "carbon pricing policy instruments and effectiveness",
            "emissions allowance allocation methods",
            "anthropogenic climate change and greenhouse gas emissions",
            "carbon dioxide atmospheric concentration trends",
            "climate change mitigation strategies and policies",
            "greenhouse gas emissions measurement and verification",
            "carbon footprint assessment methodologies"
        ]

        output_file = tmp_path / "scout_co2.md"

        result = research_citations_via_api(
            model=model,
            research_topics=research_topics,
            output_path=output_file,
            target_minimum=10,
            verbose=True
        )

        # Verify quality metrics
        assert result["count"] >= 10
        success_rate = result["count"] / len(research_topics) * 100
        assert success_rate >= 50


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
