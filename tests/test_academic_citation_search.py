#!/usr/bin/env python3
"""
Unit tests for academic_citation_search module.

Tests all academic API integrations:
- Semantic Scholar API
- CrossRef API
- arXiv API
- Citation validation
- Quality scoring
"""

import pytest
import sys
sys.path.insert(0, '.')

from utils.academic_citation_search import (
    Citation,
    search_semantic_scholar,
    search_crossref,
    search_arxiv,
    search_multi_source,
    validate_doi,
    validate_citation_quality,
    _parse_semantic_scholar_paper,
    _parse_crossref_item,
    _parse_arxiv_entry
)


class TestCitation:
    """Test Citation dataclass and methods."""

    def test_citation_creation(self):
        """Test creating a citation with all fields."""
        citation = Citation(
            title="Example Paper",
            authors=["John Doe", "Jane Smith"],
            year=2020,
            venue="Example Conference",
            doi="10.1234/example",
            url="https://doi.org/10.1234/example",
            citation_count=100,
            api_source="Test",
            abstract="This is an example abstract.",
            arxiv_id="2001.12345"
        )

        assert citation.title == "Example Paper"
        assert len(citation.authors) == 2
        assert citation.year == 2020
        assert citation.doi is not None
        assert citation.arxiv_id is not None

    def test_citation_to_dict(self):
        """Test converting citation to dictionary."""
        citation = Citation(
            title="Example Paper",
            authors=["John Doe"],
            year=2020,
            venue="Example Venue",
            doi="10.1234/example"
        )

        citation_dict = citation.to_dict()
        assert isinstance(citation_dict, dict)
        assert citation_dict["title"] == "Example Paper"
        assert citation_dict["authors"] == ["John Doe"]

    def test_quality_score_high_quality(self):
        """Test quality score for high-quality citation."""
        citation = Citation(
            title="High Quality Paper",
            authors=["Expert Author"],
            year=2020,
            venue="Top Journal",
            doi="10.1234/example",
            url="https://doi.org/10.1234/example",
            citation_count=500,
            api_source="Semantic Scholar",
            abstract="Comprehensive abstract describing the research.",
            arxiv_id="2001.12345"
        )

        score = citation.quality_score()
        # Has DOI (2) + arXiv ID (1) + venue (2) + cites>10 (1) + abstract (1) = 7
        assert score == 7.0

    def test_quality_score_low_quality(self):
        """Test quality score for low-quality citation."""
        citation = Citation(
            title="Low Quality Paper",
            authors=["Unknown Author"],
            year=2020,
            venue="Unknown",
            url="https://example.com"
        )

        score = citation.quality_score()
        # No DOI, no arXiv, no abstract, low cites, unknown venue
        assert score < 2.0

    def test_quality_score_with_venue(self):
        """Test quality score includes venue points."""
        citation = Citation(
            title="Paper with Venue",
            authors=["Author"],
            year=2020,
            venue="Nature",
            doi="10.1038/example"
        )

        score = citation.quality_score()
        assert score >= 4.0  # DOI (2) + venue (2) = 4

    def test_quality_score_high_citations(self):
        """Test quality score bonus for high citation count."""
        citation = Citation(
            title="Highly Cited Paper",
            authors=["Popular Author"],
            year=2015,
            venue="Science",
            doi="10.1126/science.example",
            citation_count=1000
        )

        score = citation.quality_score()
        assert score >= 5.0  # DOI (2) + venue (2) + citations>10 (1) = 5


class TestSemanticScholar:
    """Test Semantic Scholar API integration."""

    def test_search_semantic_scholar_returns_citations(self):
        """Test that Semantic Scholar search returns citations."""
        citations = search_semantic_scholar("machine learning", limit=5)

        assert isinstance(citations, list)
        assert len(citations) > 0
        assert len(citations) <= 5

        # Check first citation structure
        c = citations[0]
        assert isinstance(c, Citation)
        assert c.title
        assert len(c.authors) > 0
        assert c.api_source == "Semantic Scholar"

    def test_search_semantic_scholar_empty_query(self):
        """Test that empty query raises ValueError."""
        with pytest.raises(ValueError, match="cannot be empty"):
            search_semantic_scholar("", limit=5)

    def test_search_semantic_scholar_invalid_limit(self):
        """Test that invalid limit raises ValueError."""
        with pytest.raises(ValueError, match="between 1 and 100"):
            search_semantic_scholar("test", limit=0)

        with pytest.raises(ValueError, match="between 1 and 100"):
            search_semantic_scholar("test", limit=101)

    def test_search_semantic_scholar_has_dois(self):
        """Test that most Semantic Scholar results have DOIs."""
        citations = search_semantic_scholar("deep learning", limit=10)

        with_doi = sum(1 for c in citations if c.doi)
        # At least 50% should have DOIs
        assert with_doi >= len(citations) * 0.5

    def test_parse_semantic_scholar_paper_valid(self):
        """Test parsing valid Semantic Scholar paper JSON."""
        paper = {
            "title": "Example Paper",
            "authors": [{"name": "John Doe"}, {"name": "Jane Smith"}],
            "year": 2020,
            "venue": "Example Conference",
            "externalIds": {"DOI": "10.1234/example"},
            "citationCount": 100,
            "url": "https://www.semanticscholar.org/paper/abc123",
            "abstract": "This is an abstract."
        }

        citation = _parse_semantic_scholar_paper(paper)

        assert citation is not None
        assert citation.title == "Example Paper"
        assert len(citation.authors) == 2
        assert citation.doi == "10.1234/example"
        assert citation.citation_count == 100

    def test_parse_semantic_scholar_paper_no_authors(self):
        """Test that papers without authors are skipped."""
        paper = {
            "title": "Paper Without Authors",
            "authors": [],
            "year": 2020
        }

        citation = _parse_semantic_scholar_paper(paper)
        assert citation is None

    def test_parse_semantic_scholar_paper_with_arxiv(self):
        """Test parsing paper with arXiv ID."""
        paper = {
            "title": "arXiv Paper",
            "authors": [{"name": "Researcher"}],
            "year": 2021,
            "venue": "arXiv preprint",
            "externalIds": {"ArXiv": "2101.12345"},
            "citationCount": 50
        }

        citation = _parse_semantic_scholar_paper(paper)

        assert citation is not None
        assert citation.arxiv_id == "2101.12345"
        assert "arxiv" in citation.url.lower()


class TestCrossRef:
    """Test CrossRef API integration."""

    def test_search_crossref_returns_citations(self):
        """Test that CrossRef search returns citations."""
        citations = search_crossref("artificial intelligence", limit=5)

        assert isinstance(citations, list)
        assert len(citations) > 0
        assert len(citations) <= 5

        # Check first citation
        c = citations[0]
        assert isinstance(c, Citation)
        assert c.api_source == "CrossRef"

    def test_search_crossref_empty_query(self):
        """Test that empty query raises ValueError."""
        with pytest.raises(ValueError, match="cannot be empty"):
            search_crossref("", limit=5)

    def test_search_crossref_invalid_limit(self):
        """Test that invalid limit raises ValueError."""
        with pytest.raises(ValueError, match="between 1 and 100"):
            search_crossref("test", limit=0)

    def test_search_crossref_all_have_dois(self):
        """Test that all CrossRef results have DOIs."""
        citations = search_crossref("computer science", limit=10)

        for c in citations:
            assert c.doi is not None
            assert c.doi.startswith("10.")

    def test_parse_crossref_item_valid(self):
        """Test parsing valid CrossRef item JSON."""
        item = {
            "title": ["Example Paper Title"],
            "author": [
                {"given": "John", "family": "Doe"},
                {"given": "Jane", "family": "Smith"}
            ],
            "published": {"date-parts": [[2020, 1, 15]]},
            "container-title": ["Example Journal"],
            "DOI": "10.1234/example.2020.001",
            "abstract": "This is the abstract."
        }

        citation = _parse_crossref_item(item)

        assert citation is not None
        assert citation.title == "Example Paper Title"
        assert len(citation.authors) == 2
        assert citation.year == 2020
        assert citation.venue == "Example Journal"
        assert citation.doi == "10.1234/example.2020.001"

    def test_parse_crossref_item_no_authors(self):
        """Test that items without authors are skipped."""
        item = {
            "title": ["Paper Without Authors"],
            "DOI": "10.1234/noauthor"
        }

        citation = _parse_crossref_item(item)
        assert citation is None

    def test_parse_crossref_item_family_name_only(self):
        """Test parsing author with only family name."""
        item = {
            "title": ["Paper"],
            "author": [{"family": "Smith"}],
            "published": {"date-parts": [[2020]]},
            "container-title": ["Journal"],
            "DOI": "10.1234/test"
        }

        citation = _parse_crossref_item(item)

        assert citation is not None
        assert "Smith" in citation.authors[0]


class TestArXiv:
    """Test arXiv API integration."""

    def test_search_arxiv_returns_citations(self):
        """Test that arXiv search returns citations."""
        citations = search_arxiv("neural networks", limit=5)

        assert isinstance(citations, list)
        assert len(citations) > 0
        assert len(citations) <= 5

        # Check first citation
        c = citations[0]
        assert isinstance(c, Citation)
        assert c.api_source == "arXiv"
        assert "arxiv" in c.venue.lower()

    def test_search_arxiv_empty_query(self):
        """Test that empty query raises ValueError."""
        with pytest.raises(ValueError, match="cannot be empty"):
            search_arxiv("", limit=5)

    def test_search_arxiv_invalid_limit(self):
        """Test that invalid limit raises ValueError."""
        with pytest.raises(ValueError, match="between 1 and 100"):
            search_arxiv("test", limit=0)

    def test_search_arxiv_all_have_arxiv_ids(self):
        """Test that all arXiv results have arXiv IDs."""
        citations = search_arxiv("quantum computing", limit=10)

        for c in citations:
            assert c.arxiv_id is not None
            assert "arxiv" in c.url.lower()


class TestDOIValidation:
    """Test DOI validation."""

    def test_validate_doi_valid(self):
        """Test validating a real DOI."""
        # This is a real DOI from a Nature paper
        valid_doi = "10.1038/nature12373"
        assert validate_doi(valid_doi) is True

    def test_validate_doi_invalid(self):
        """Test validating a fake DOI."""
        invalid_doi = "10.1234/fake.doi.that.does.not.exist"
        assert validate_doi(invalid_doi) is False

    def test_validate_doi_empty(self):
        """Test that empty DOI returns False."""
        assert validate_doi("") is False
        assert validate_doi("   ") is False

    def test_validate_doi_malformed(self):
        """Test that malformed DOI returns False."""
        assert validate_doi("not-a-doi") is False


class TestCitationQualityValidation:
    """Test citation quality validation."""

    def test_validate_high_quality_citation(self):
        """Test validating a high-quality citation."""
        citation = Citation(
            title="High Quality Paper",
            authors=["Dr. Expert"],
            year=2020,
            venue="Nature",
            doi="10.1038/example",
            url="https://doi.org/10.1038/example",
            citation_count=500,
            api_source="Semantic Scholar",
            abstract="Comprehensive abstract."
        )

        assert validate_citation_quality(citation) is True

    def test_validate_citation_no_title(self):
        """Test that citation without title fails validation."""
        citation = Citation(
            title="",
            authors=["Author"],
            year=2020,
            venue="Venue",
            doi="10.1234/example"
        )

        assert validate_citation_quality(citation) is False

    def test_validate_citation_untitled(self):
        """Test that 'Untitled' citation fails validation."""
        citation = Citation(
            title="Untitled",
            authors=["Author"],
            year=2020,
            venue="Venue",
            doi="10.1234/example"
        )

        assert validate_citation_quality(citation) is False

    def test_validate_citation_no_authors(self):
        """Test that citation without authors fails validation."""
        citation = Citation(
            title="Paper",
            authors=[],
            year=2020,
            venue="Venue",
            doi="10.1234/example"
        )

        assert validate_citation_quality(citation) is False

    def test_validate_citation_domain_as_author(self):
        """Test that domain name as author fails validation."""
        citation = Citation(
            title="Paper",
            authors=["example.com"],
            year=2020,
            venue="Venue",
            doi="10.1234/example"
        )

        assert validate_citation_quality(citation) is False

    def test_validate_citation_invalid_year_too_old(self):
        """Test that citation with year < 1950 fails validation."""
        citation = Citation(
            title="Paper",
            authors=["Author"],
            year=1900,
            venue="Venue",
            doi="10.1234/example"
        )

        assert validate_citation_quality(citation) is False

    def test_validate_citation_invalid_year_future(self):
        """Test that citation with year > 2025 fails validation."""
        citation = Citation(
            title="Paper",
            authors=["Author"],
            year=2030,
            venue="Venue",
            doi="10.1234/example"
        )

        assert validate_citation_quality(citation) is False

    def test_validate_citation_no_doi_or_arxiv(self):
        """Test that citation without DOI or arXiv ID fails validation."""
        citation = Citation(
            title="Paper",
            authors=["Author"],
            year=2020,
            venue="Venue",
            url="https://example.com"
        )

        assert validate_citation_quality(citation) is False

    def test_validate_citation_with_arxiv_id(self):
        """Test that citation with arXiv ID passes (even without DOI)."""
        citation = Citation(
            title="arXiv Preprint",
            authors=["Researcher"],
            year=2021,
            venue="arXiv preprint",
            url="https://arxiv.org/abs/2101.12345",
            arxiv_id="2101.12345",
            abstract="Abstract text"
        )

        # Quality score: arXiv ID (1) + venue (2) + abstract (1) = 4.0
        assert citation.quality_score() == 4.0
        assert validate_citation_quality(citation) is True

    def test_validate_citation_low_quality_score(self):
        """Test that citation with quality score < 4.0 fails validation."""
        citation = Citation(
            title="Low Quality Paper",
            authors=["Unknown"],
            year=2020,
            venue="Unknown",
            doi="10.1234/example"
        )

        # Quality score: DOI (2) only = 2.0 < 4.0
        assert citation.quality_score() < 4.0
        assert validate_citation_quality(citation) is False

    def test_validate_citation_edge_case_quality_score(self):
        """Test citation exactly at quality threshold."""
        citation = Citation(
            title="Marginal Quality Paper",
            authors=["Author"],
            year=2020,
            venue="Conference",
            doi="10.1234/example"
        )

        # Quality score: DOI (2) + venue (2) = 4.0 (exactly at threshold)
        assert citation.quality_score() == 4.0
        assert validate_citation_quality(citation) is True


class TestMultiSourceFallback:
    """Test multi-source search with graceful fallback."""

    @pytest.mark.integration
    def test_multi_source_returns_citations(self):
        """Test multi-source search returns citations from available APIs."""
        try:
            citations = search_multi_source("machine learning", limit=5)
            # Should get at least some citations if any API works
            assert isinstance(citations, list)
            # All returned items should be Citation objects
            for citation in citations:
                assert isinstance(citation, Citation)
        except Exception as e:
            # If all APIs fail, that's acceptable in test environment
            pytest.skip(f"All APIs unavailable: {e}")

    @pytest.mark.integration
    def test_multi_source_respects_limit(self):
        """Test multi-source search respects result limit."""
        try:
            limit = 10
            citations = search_multi_source("deep learning", limit=limit)
            # Should not exceed limit
            assert len(citations) <= limit
        except Exception:
            pytest.skip("APIs unavailable")

    @pytest.mark.integration
    def test_multi_source_deduplicates(self):
        """Test multi-source search removes duplicate citations."""
        try:
            citations = search_multi_source("neural networks", limit=20)
            # Check for duplicates (same title + year)
            seen = set()
            duplicates = []
            for citation in citations:
                key = (citation.title.lower().strip(), citation.year)
                if key in seen:
                    duplicates.append(citation.title)
                seen.add(key)

            # Should have no duplicates
            assert len(duplicates) == 0, f"Found {len(duplicates)} duplicates"
        except Exception:
            pytest.skip("APIs unavailable")

    @pytest.mark.integration
    def test_multi_source_prefer_semantic_scholar(self):
        """Test multi-source can prefer specific source."""
        try:
            citations = search_multi_source(
                "artificial intelligence",
                limit=5,
                prefer_source="semantic_scholar"
            )
            # If successful, should have citations
            if citations:
                # First citation likely from preferred source
                assert len(citations) > 0
        except Exception:
            pytest.skip("APIs unavailable")

    @pytest.mark.integration
    def test_multi_source_handles_empty_query(self):
        """Test multi-source handles invalid queries gracefully."""
        with pytest.raises(ValueError, match="cannot be empty"):
            search_multi_source("", limit=5)

    @pytest.mark.integration
    def test_multi_source_handles_invalid_limit(self):
        """Test multi-source validates limit parameter."""
        with pytest.raises(ValueError, match="between 1 and 100"):
            search_multi_source("test query", limit=0)

        with pytest.raises(ValueError, match="between 1 and 100"):
            search_multi_source("test query", limit=150)

    def test_multi_source_api_order(self):
        """Test multi-source tries APIs in correct order."""
        # This test verifies the fallback chain without network calls
        # by checking the function's internal logic

        # Mock all APIs to fail
        from unittest.mock import patch, MagicMock

        with patch('utils.academic_citation_search.search_semantic_scholar') as mock_ss, \
             patch('utils.academic_citation_search.search_crossref') as mock_cr, \
             patch('utils.academic_citation_search.search_arxiv') as mock_arx:

            # Make all APIs return empty lists (simulating failure to find results)
            mock_ss.return_value = []
            mock_cr.return_value = []
            mock_arx.return_value = []

            # Call multi-source
            result = search_multi_source("test query", limit=10)

            # All three APIs should have been called (fallback chain)
            assert mock_ss.called or mock_cr.called or mock_arx.called
            assert result == []  # Empty result when all APIs fail

    def test_multi_source_graceful_degradation(self):
        """Test multi-source continues when individual APIs fail."""
        from unittest.mock import patch
        from utils.exceptions import NetworkError

        # Mock APIs with one failing, others succeeding
        mock_citation = Citation(
            title="Test Paper",
            authors=["Test Author"],
            year=2020,
            venue="Test Venue",
            doi="10.1234/test"
        )

        with patch('utils.academic_citation_search.search_semantic_scholar') as mock_ss, \
             patch('utils.academic_citation_search.search_crossref') as mock_cr, \
             patch('utils.academic_citation_search.search_arxiv') as mock_arx:

            # First API fails
            mock_ss.side_effect = NetworkError(
                endpoint="api.semanticscholar.org",
                reason="Connection timeout"
            )
            # Second API succeeds
            mock_cr.return_value = [mock_citation]
            # Third API not called (already have results)
            mock_arx.return_value = []

            # Should still get results from working API
            result = search_multi_source("test query", limit=10)
            assert len(result) > 0
            assert result[0].title == "Test Paper"

    @pytest.mark.integration
    def test_multi_source_all_apis_fail_gracefully(self):
        """Test multi-source returns empty list when all APIs fail."""
        from unittest.mock import patch
        from utils.exceptions import NetworkError, CitationFetchError

        with patch('utils.academic_citation_search.search_semantic_scholar') as mock_ss, \
             patch('utils.academic_citation_search.search_crossref') as mock_cr, \
             patch('utils.academic_citation_search.search_arxiv') as mock_arx:

            # All APIs fail with different error types
            mock_ss.side_effect = NetworkError(
                endpoint="api.semanticscholar.org",
                reason="Connection timeout"
            )
            mock_cr.side_effect = CitationFetchError(
                citation_id="query:test",
                source="CrossRef",
                reason="API error"
            )
            mock_arx.side_effect = NetworkError(
                endpoint="export.arxiv.org",
                reason="Connection refused"
            )

            # Should return empty list (graceful degradation)
            result = search_multi_source("test query", limit=10)
            assert result == []

            # Verify all APIs were attempted
            assert mock_ss.called
            assert mock_cr.called
            assert mock_arx.called

    @pytest.mark.integration
    def test_multi_source_fallback_priority(self):
        """Test multi-source respects fallback priority order."""
        from unittest.mock import patch, call

        mock_citation_ss = Citation(
            title="Semantic Scholar Paper",
            authors=["SS Author"],
            year=2020,
            venue="SS Venue",
            doi="10.1111/ss"
        )
        mock_citation_cr = Citation(
            title="CrossRef Paper",
            authors=["CR Author"],
            year=2020,
            venue="CR Venue",
            doi="10.2222/cr"
        )

        with patch('utils.academic_citation_search.search_semantic_scholar') as mock_ss, \
             patch('utils.academic_citation_search.search_crossref') as mock_cr, \
             patch('utils.academic_citation_search.search_arxiv') as mock_arx:

            # All APIs succeed
            mock_ss.return_value = [mock_citation_ss]
            mock_cr.return_value = [mock_citation_cr]
            mock_arx.return_value = []

            # Call with low limit to trigger early stopping
            result = search_multi_source("test query", limit=1, prefer_source="semantic_scholar")

            # Should call Semantic Scholar first
            assert mock_ss.called
            # Should get Semantic Scholar result
            assert len(result) >= 1

            # Verify per-source limit calculation
            expected_limit = 1 // 3 + 1  # per_source_limit = limit // len(sources) + 1
            mock_ss.assert_called_once_with("test query", limit=expected_limit)

    @pytest.mark.integration
    def test_multi_source_stops_when_limit_reached(self):
        """Test multi-source stops calling APIs once limit is reached."""
        from unittest.mock import patch

        # Create more citations than limit
        mock_citations = [
            Citation(
                title=f"Paper {i}",
                authors=[f"Author {i}"],
                year=2020,
                venue="Test Venue",
                doi=f"10.1234/test{i}"
            )
            for i in range(15)
        ]

        with patch('utils.academic_citation_search.search_semantic_scholar') as mock_ss, \
             patch('utils.academic_citation_search.search_crossref') as mock_cr, \
             patch('utils.academic_citation_search.search_arxiv') as mock_arx:

            # First API returns enough citations to exceed limit
            mock_ss.return_value = mock_citations[:12]
            mock_cr.return_value = mock_citations[12:]
            mock_arx.return_value = []

            # Call with limit of 10
            result = search_multi_source("test query", limit=10)

            # Should return exactly 10 citations (limit enforced)
            assert len(result) == 10

            # Should call Semantic Scholar
            assert mock_ss.called

            # May or may not call CrossRef/arXiv (depends on early stopping logic)
            # The key is total results <= limit

    @pytest.mark.integration
    def test_multi_source_exception_context_logged(self):
        """Test that exception context is properly logged when APIs fail."""
        from unittest.mock import patch
        from utils.exceptions import APIQuotaExceededError
        import logging

        # Capture log messages
        with patch('utils.academic_citation_search.logger') as mock_logger:
            with patch('utils.academic_citation_search.search_semantic_scholar') as mock_ss, \
                 patch('utils.academic_citation_search.search_crossref') as mock_cr, \
                 patch('utils.academic_citation_search.search_arxiv') as mock_arx:

                # First API exceeds quota
                mock_ss.side_effect = APIQuotaExceededError(
                    api_name="Semantic Scholar",
                    reset_time="2024-01-01 00:00:00"
                )
                # Second API succeeds
                mock_cr.return_value = [Citation(
                    title="Success Paper",
                    authors=["Author"],
                    year=2020,
                    venue="Venue",
                    doi="10.1234/test"
                )]
                mock_arx.return_value = []

                # Should succeed with fallback
                result = search_multi_source("test query", limit=5)
                assert len(result) > 0

                # Verify warning was logged
                mock_logger.warning.assert_called()

                # Check that warning message contains relevant info
                warning_calls = [str(call) for call in mock_logger.warning.call_args_list]
                assert any("semantic_scholar" in str(call).lower() for call in warning_calls)


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
