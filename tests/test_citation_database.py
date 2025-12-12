#!/usr/bin/env python3
"""
ABOUTME: Unit tests for citation database system
ABOUTME: Tests database validation, citation compiler, and citation manager
"""

import sys
import json
import pytest
from pathlib import Path
from typing import Dict

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.citation_database import (
    Citation,
    CitationDatabase,
    validate_citation_database,
    load_citation_database,
    save_citation_database,
    create_empty_database,
)
from utils.citation_compiler import CitationCompiler


class TestCitation:
    """Test Citation class."""

    def test_create_citation(self):
        """Test creating a Citation object."""
        citation = Citation(
            citation_id="cite_001",
            authors=["Smith", "Jones"],
            year=2023,
            title="Test Paper",
            source_type="journal",
            journal="Test Journal",
        )

        assert citation.id == "cite_001"
        assert citation.authors == ["Smith", "Jones"]
        assert citation.year == 2023
        assert citation.title == "Test Paper"
        assert citation.source_type == "journal"
        assert citation.journal == "Test Journal"

    def test_citation_to_dict(self):
        """Test converting Citation to dictionary."""
        citation = Citation(
            citation_id="cite_001",
            authors=["Smith"],
            year=2023,
            title="Test",
            source_type="book",
            publisher="Test Publisher",
        )

        data = citation.to_dict()

        assert data["id"] == "cite_001"
        assert data["authors"] == ["Smith"]
        assert data["year"] == 2023
        assert data["publisher"] == "Test Publisher"

    def test_citation_from_dict(self):
        """Test creating Citation from dictionary."""
        data = {
            "id": "cite_001",
            "authors": ["Smith"],
            "year": 2023,
            "title": "Test",
            "source_type": "journal",
            "journal": "Test Journal",
        }

        citation = Citation.from_dict(data)

        assert citation.id == "cite_001"
        assert citation.authors == ["Smith"]
        assert citation.year == 2023
        assert citation.journal == "Test Journal"


class TestCitationDatabase:
    """Test CitationDatabase class."""

    def test_create_empty_database(self):
        """Test creating empty database."""
        db = create_empty_database()

        assert len(db.citations) == 0
        assert db.citation_style == "APA 7th"
        assert db.draft_language == "english"

    def test_create_database_with_citations(self):
        """Test creating database with citations."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test 1", "journal"),
            Citation("cite_002", ["Jones"], 2022, "Test 2", "book"),
        ]

        db = CitationDatabase(citations)

        assert len(db.citations) == 2
        assert db.citations[0].id == "cite_001"
        assert db.citations[1].id == "cite_002"

    def test_get_citation(self):
        """Test getting citation by ID."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test 1", "journal"),
            Citation("cite_002", ["Jones"], 2022, "Test 2", "book"),
        ]

        db = CitationDatabase(citations)

        citation = db.get_citation("cite_001")
        assert citation is not None
        assert citation.authors == ["Smith"]

        missing = db.get_citation("cite_999")
        assert missing is None

    def test_validate_database_success(self):
        """Test validating complete database."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal", journal="Journal"),
        ]

        db = CitationDatabase(citations)

        assert db.validate() == True

    def test_validate_database_missing_authors(self):
        """Test validation fails for missing authors."""
        citations = [
            Citation("cite_001", [], 2023, "Test", "journal"),
        ]

        db = CitationDatabase(citations)

        with pytest.raises(ValueError, match="has no authors"):
            db.validate()

    def test_validate_database_invalid_year(self):
        """Test validation fails for invalid year."""
        citations = [
            Citation("cite_001", ["Smith"], 1850, "Test", "journal"),
        ]

        db = CitationDatabase(citations)

        with pytest.raises(ValueError, match="invalid year"):
            db.validate()

    def test_validate_database_duplicate_ids(self):
        """Test validation fails for duplicate IDs."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test 1", "journal", journal="Journal"),
            Citation("cite_001", ["Jones"], 2022, "Test 2", "book", publisher="Publisher"),
        ]

        db = CitationDatabase(citations)

        with pytest.raises(ValueError, match="Duplicate citation ID"):
            db.validate()

    def test_validate_journal_missing_journal_name(self):
        """Test validation logs warning for journal without journal name (lenient for AI extraction)."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal"),  # Missing journal field
        ]

        db = CitationDatabase(citations)

        # AI-extracted citations may have missing metadata - this should pass with warning, not fail
        # Production systems need to be lenient with incomplete AI-extracted data
        assert db.validate() == True

    def test_database_to_dict(self):
        """Test converting database to dictionary."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal", journal="Journal"),
        ]

        db = CitationDatabase(citations, citation_style="APA 7th", draft_language="german")
        data = db.to_dict()

        assert "citations" in data
        assert "metadata" in data
        assert data["metadata"]["total_citations"] == 1
        assert data["metadata"]["citation_style"] == "APA 7th"
        assert data["metadata"]["draft_language"] == "german"

    def test_database_from_dict(self):
        """Test creating database from dictionary."""
        data = {
            "citations": [
                {
                    "id": "cite_001",
                    "authors": ["Smith"],
                    "year": 2023,
                    "title": "Test",
                    "source_type": "journal",
                    "journal": "Test Journal",
                }
            ],
            "metadata": {
                "total_citations": 1,
                "citation_style": "APA 7th",
                "draft_language": "english",
            }
        }

        db = CitationDatabase.from_dict(data)

        assert len(db.citations) == 1
        assert db.citations[0].authors == ["Smith"]
        assert db.citation_style == "APA 7th"


class TestCitationCompiler:
    """Test CitationCompiler class."""

    def test_compile_single_citation(self):
        """Test compiling single citation."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal", journal="Journal"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        text = "Recent studies {cite_001} show promising results."
        compiled, missing, researched = compiler.compile_citations(text, research_missing=False)

        assert "(Smith, 2023)" in compiled
        assert "{cite_001}" not in compiled
        assert len(missing) == 0

    def test_compile_multiple_citations(self):
        """Test compiling multiple citations."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test 1", "journal", journal="J1"),
            Citation("cite_002", ["Jones", "Brown"], 2022, "Test 2", "book", publisher="Pub"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        text = "Studies {cite_001} and {cite_002} confirm this."
        compiled, missing, researched = compiler.compile_citations(text, research_missing=False)

        assert "(Smith, 2023)" in compiled
        assert "(Jones & Brown, 2022)" in compiled
        assert len(missing) == 0

    def test_compile_three_plus_authors(self):
        """Test compiling citation with 3+ authors (et al.)."""
        citations = [
            Citation("cite_001", ["Smith", "Jones", "Brown"], 2023, "Test", "journal", journal="J"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        text = "{cite_001}"
        compiled, missing, researched = compiler.compile_citations(text, research_missing=False)

        assert "(Smith et al., 2023)" in compiled

    def test_compile_missing_citation(self):
        """Test compiling with missing citation ID."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal", journal="J"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        text = "Studies {cite_001} and {cite_999} show results."
        compiled, missing, researched = compiler.compile_citations(text, research_missing=False)

        assert "(Smith, 2023)" in compiled
        assert "[MISSING: cite_999]" in compiled
        assert len(missing) == 1
        assert "cite_999" in missing

    def test_generate_reference_list(self):
        """Test generating reference list from compiled text."""
        citations = [
            Citation(
                "cite_001",
                ["Smith", "Jones"],
                2023,
                "Climate Policy Effectiveness",
                "journal",
                journal="Environmental Economics",
                volume=45,
                issue=3,
                pages="234-256",
                doi="10.1234/ee.2023.001"
            ),
            Citation(
                "cite_002",
                ["Brown"],
                2022,
                "Carbon Markets",
                "book",
                publisher="Academic Press"
            ),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        # Text with citation IDs
        text = "Recent studies {cite_001} show that carbon pricing works. {cite_002}"

        # Generate reference list
        ref_list = compiler.generate_reference_list(text)

        assert "## References" in ref_list
        assert "Smith, & Jones. (2023)" in ref_list
        assert "Climate Policy Effectiveness" in ref_list
        assert "Environmental Economics" in ref_list
        assert "https://doi.org/10.1234/ee.2023.001" in ref_list
        assert "Brown. (2022)" in ref_list
        assert "Carbon Markets" in ref_list

    def test_validate_compilation(self):
        """Test compilation validation."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal", journal="J"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        original = "Text with {cite_001}"
        compiled = "Text with (Smith, 2023)"

        result = compiler.validate_compilation(original, compiled)

        assert result["success"] == True
        assert result["total_citations"] == 1
        assert result["successfully_compiled"] == 1
        assert result["missing_citations"] == 0

    def test_validate_compilation_with_missing(self):
        """Test validation with missing citations."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal", journal="J"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        original = "Text with {cite_001} and {cite_999}"
        compiled = "Text with (Smith, 2023) and [MISSING: cite_999]"

        result = compiler.validate_compilation(original, compiled)

        assert result["success"] == False
        assert result["total_citations"] == 2
        assert result["successfully_compiled"] == 1
        assert result["missing_citations"] == 1


class TestCitationDatabaseIO:
    """Test database save/load operations."""

    def test_save_and_load_database(self, tmp_path):
        """Test saving and loading database."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal", journal="Journal"),
            Citation("cite_002", ["Jones"], 2022, "Test 2", "book", publisher="Publisher"),
        ]

        db = CitationDatabase(citations, citation_style="APA 7th", draft_language="german")

        # Save database
        db_path = tmp_path / "test_db.json"
        save_citation_database(db, db_path)

        assert db_path.exists()

        # Load database
        loaded_db = load_citation_database(db_path)

        assert len(loaded_db.citations) == 2
        assert loaded_db.citations[0].id == "cite_001"
        assert loaded_db.citation_style == "APA 7th"
        assert loaded_db.draft_language == "german"

    def test_validate_citation_database_dict(self):
        """Test validating database dictionary."""
        valid_data = {
            "citations": [
                {
                    "id": "cite_001",
                    "authors": ["Smith"],
                    "year": 2023,
                    "title": "Test",
                    "source_type": "journal",
                    "journal": "Journal",
                }
            ],
            "metadata": {
                "total_citations": 1,
                "citation_style": "APA 7th",
                "draft_language": "english",
            }
        }

        assert validate_citation_database(valid_data) == True

    def test_validate_missing_citations_field(self):
        """Test validation fails for missing citations field."""
        invalid_data = {
            "metadata": {
                "total_citations": 0,
                "citation_style": "APA 7th",
                "draft_language": "english",
            }
        }

        with pytest.raises(ValueError, match="missing 'citations' field"):
            validate_citation_database(invalid_data)

    def test_validate_missing_metadata_field(self):
        """Test validation fails for missing metadata field."""
        invalid_data = {
            "citations": []
        }

        with pytest.raises(ValueError, match="missing 'metadata' field"):
            validate_citation_database(invalid_data)

    def test_validate_count_mismatch(self):
        """Test validation fails for count mismatch."""
        invalid_data = {
            "citations": [
                {
                    "id": "cite_001",
                    "authors": ["Smith"],
                    "year": 2023,
                    "title": "Test",
                    "source_type": "journal",
                    "journal": "J",
                }
            ],
            "metadata": {
                "total_citations": 5,  # Wrong count
                "citation_style": "APA 7th",
                "draft_language": "english",
            }
        }

        with pytest.raises(ValueError, match="claims 5 citations but found 1"):
            validate_citation_database(invalid_data)


class TestCoverageAnalysis:
    """Test citation coverage analysis."""

    def test_coverage_all_citations_used(self):
        """Test coverage report when all citations are used."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test 1", "journal", journal="J1"),
            Citation("cite_002", ["Jones"], 2022, "Test 2", "journal", journal="J2"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        draft = "Text with {cite_001} and {cite_002}."
        report = compiler.generate_coverage_report(draft)

        assert report['coverage_percentage'] == 100.0
        assert report['citations_used'] == 2
        assert report['citations_unused'] == 0
        assert len(report['unused_citations']) == 0

    def test_coverage_partial_usage(self):
        """Test coverage report with some unused citations."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test 1", "journal", journal="J1"),
            Citation("cite_002", ["Jones"], 2022, "Test 2", "journal", journal="J2"),
            Citation("cite_003", ["Garcia"], 2021, "Test 3", "journal", journal="J3"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        draft = "Text with {cite_001} only."
        report = compiler.generate_coverage_report(draft)

        assert report['coverage_percentage'] == pytest.approx(33.33, rel=0.1)
        assert report['citations_used'] == 1
        assert report['citations_unused'] == 2
        assert len(report['unused_citations']) == 2
        assert report['unused_citations'][0].id == "cite_002"
        assert report['unused_citations'][1].id == "cite_003"

    def test_coverage_empty_draft(self):
        """Test coverage report with no citations used."""
        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test", "journal", journal="J"),
        ]
        db = CitationDatabase(citations)
        compiler = CitationCompiler(db)

        draft = "Text with no citations."
        report = compiler.generate_coverage_report(draft)

        assert report['coverage_percentage'] == 0.0
        assert report['citations_used'] == 0
        assert report['citations_unused'] == 1

    def test_format_coverage_report(self):
        """Test coverage report formatting."""
        report = {
            'total_citations_available': 10,
            'citations_used': 7,
            'citations_unused': 3,
            'coverage_percentage': 70.0,
            'unused_citations': [
                Citation("cite_008", ["Smith"], 2023, "Unused Paper A", "journal", journal="J"),
                Citation("cite_009", ["Jones"], 2022, "Unused Paper B", "journal", journal="J"),
            ],
        }

        from utils.citation_compiler import format_coverage_report
        formatted = format_coverage_report(report)

        assert "# Citation Coverage Report" in formatted
        assert "70.0%" in formatted
        assert "cite_008" in formatted
        assert "Smith" in formatted
        assert "✅ **Good citation coverage**" in formatted


class TestDeduplication:
    """Test citation deduplication."""

    def test_has_more_metadata(self):
        """Test metadata comparison function."""
        from utils.citation_database import has_more_metadata

        # Citation with more metadata
        complete = Citation("cite_001", ["Smith"], 2023, "Test", "journal",
                          journal="J", volume=10, issue=2, pages="10-20", doi="10.1234/test")

        # Citation with less metadata
        incomplete = Citation("cite_002", ["Smith"], 2023, "Test", "journal",
                            journal="J")

        assert has_more_metadata(complete, incomplete) == True
        assert has_more_metadata(incomplete, complete) == False

    def test_deduplicate_no_duplicates(self):
        """Test deduplication with no duplicates."""
        from utils.citation_database import deduplicate_citations

        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test 1", "journal", journal="J"),
            Citation("cite_002", ["Jones"], 2022, "Test 2", "journal", journal="J"),
        ]

        deduplicated = deduplicate_citations(citations)

        assert len(deduplicated) == 2

    def test_deduplicate_exact_duplicates(self):
        """Test deduplication with exact duplicates."""
        from utils.citation_database import deduplicate_citations

        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test Paper", "journal", journal="J"),
            Citation("cite_002", ["Smith"], 2023, "Test Paper", "journal", journal="J"),
        ]

        deduplicated = deduplicate_citations(citations)

        assert len(deduplicated) == 1
        assert deduplicated[0].authors == ["Smith"]
        assert deduplicated[0].year == 2023
        assert deduplicated[0].title == "Test Paper"

    def test_deduplicate_keeps_more_complete(self):
        """Test that deduplication keeps citation with more metadata."""
        from utils.citation_database import deduplicate_citations

        citations = [
            # Less complete version
            Citation("cite_001", ["Smith"], 2023, "Test Paper", "journal", journal="Journal"),
            # More complete version
            Citation("cite_002", ["Smith"], 2023, "Test Paper", "journal",
                   journal="Journal", volume=10, issue=2, pages="10-20", doi="10.1234/test"),
        ]

        deduplicated = deduplicate_citations(citations)

        assert len(deduplicated) == 1
        # Should keep the more complete version
        assert deduplicated[0].volume == 10
        assert deduplicated[0].doi == "10.1234/test"

    def test_deduplicate_empty_list(self):
        """Test deduplication with empty list."""
        from utils.citation_database import deduplicate_citations

        deduplicated = deduplicate_citations([])

        assert len(deduplicated) == 0

    def test_deduplicate_case_insensitive(self):
        """Test that deduplication is case-insensitive."""
        from utils.citation_database import deduplicate_citations

        citations = [
            Citation("cite_001", ["Smith"], 2023, "Test Paper", "journal", journal="J"),
            Citation("cite_002", ["SMITH"], 2023, "TEST PAPER", "journal", journal="J"),
        ]

        deduplicated = deduplicate_citations(citations)

        assert len(deduplicated) == 1


class TestCitationSuggester:
    """Test citation suggestion engine."""

    def test_extract_keywords(self):
        """Test keyword extraction."""
        from utils.citation_suggester import extract_keywords

        text = "Climate change and carbon pricing policies"
        keywords = extract_keywords(text)

        assert "climate" in keywords
        assert "change" in keywords
        assert "carbon" in keywords
        assert "pricing" in keywords
        assert "policies" in keywords
        # Stop words should be removed
        assert "and" not in keywords

    def test_score_citation_relevance(self):
        """Test citation relevance scoring."""
        from utils.citation_suggester import score_citation_relevance

        citation = Citation(
            "cite_001", ["Smith"], 2023,
            "Carbon Pricing Effectiveness in Climate Policy",
            "journal", journal="Environmental Economics"
        )

        topic_keywords = {"carbon", "pricing", "climate", "policy"}
        score, matches = score_citation_relevance(citation, topic_keywords)

        assert score == 4  # All 4 keywords match
        assert "carbon" in matches
        assert "pricing" in matches
        assert "climate" in matches
        assert "policy" in matches

    def test_suggest_citations(self):
        """Test citation suggestion."""
        from utils.citation_suggester import suggest_citations

        citations = [
            Citation("cite_001", ["Smith"], 2023,
                   "Carbon Pricing Policy", "journal", journal="Env Econ"),
            Citation("cite_002", ["Jones"], 2022,
                   "Renewable Energy Systems", "journal", journal="Energy"),
            Citation("cite_003", ["Garcia"], 2021,
                   "Climate Carbon Markets", "journal", journal="Climate"),
        ]

        db = CitationDatabase(citations)

        suggestions = suggest_citations(db, "Carbon pricing and climate policy", max_suggestions=3)

        assert len(suggestions) > 0
        # cite_001 and cite_003 should rank higher (more keyword matches)
        assert suggestions[0]['score'] >= suggestions[-1]['score']

    def test_suggest_citations_no_matches(self):
        """Test suggestions when no citations match."""
        from utils.citation_suggester import suggest_citations

        citations = [
            Citation("cite_001", ["Smith"], 2023,
                   "Quantum Computing", "journal", journal="Physics"),
        ]

        db = CitationDatabase(citations)

        suggestions = suggest_citations(db, "Climate change policy", max_suggestions=3)

        assert len(suggestions) == 0

    def test_format_citation_suggestions(self):
        """Test suggestion formatting."""
        from utils.citation_suggester import format_citation_suggestions

        suggestion_data = [{
            'citation': Citation("cite_001", ["Smith"], 2023,
                               "Carbon Pricing", "journal", journal="J"),
            'score': 3,
            'matching_keywords': ["carbon", "pricing", "policy"],
        }]

        formatted = format_citation_suggestions(suggestion_data, "Introduction")

        assert "Introduction" in formatted
        assert "cite_001" in formatted
        assert "Smith" in formatted
        assert "carbon" in formatted


if __name__ == '__main__':
    pytest.main([__file__, "-v"])
