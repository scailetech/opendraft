#!/usr/bin/env python3
"""
ABOUTME: Tests for citation style formatting
ABOUTME: Verifies APA, IEEE, and NALT styles work correctly, and unsupported styles raise errors
"""

import pytest
import sys
from pathlib import Path

# Add engine to path
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.citation_database import Citation, CitationDatabase
from utils.citation_compiler import CitationCompiler


# =============================================================================
# TEST FIXTURES
# =============================================================================

@pytest.fixture
def sample_citation_single_author():
    """Single author citation for testing."""
    return Citation(
        citation_id="cite_001",
        authors=["Smith"],
        year=2023,
        title="Machine Learning Applications",
        source_type="journal",
        journal="Nature",
        volume=45,
        issue=3,
        pages="123-145",
        doi="10.1234/nature.2023.001"
    )


@pytest.fixture
def sample_citation_two_authors():
    """Two author citation for testing."""
    return Citation(
        citation_id="cite_002",
        authors=["Smith", "Johnson"],
        year=2022,
        title="Deep Learning Methods",
        source_type="journal",
        journal="Science",
        volume=30,
        pages="50-75"
    )


@pytest.fixture
def sample_citation_multiple_authors():
    """Multiple (3+) author citation for testing."""
    return Citation(
        citation_id="cite_003",
        authors=["Smith", "Johnson", "Williams", "Brown"],
        year=2021,
        title="AI in Healthcare",
        source_type="book",
        publisher="Academic Press"
    )


@pytest.fixture
def sample_citation_conference():
    """Conference paper citation for testing."""
    return Citation(
        citation_id="cite_004",
        authors=["Lee", "Park"],
        year=2022,
        title="Neural Architecture Search",
        source_type="conference",
        publisher="Proceedings of ICML 2022",
        pages="100-115",
        doi="10.5555/icml.2022.004"
    )


@pytest.fixture
def sample_citation_report():
    """Report/website citation for testing."""
    return Citation(
        citation_id="cite_005",
        authors=["World Health Organization"],
        year=2023,
        title="Global Health Statistics",
        source_type="report",
        publisher="WHO Press",
        url="https://www.who.int/reports/2023"
    )


@pytest.fixture
def sample_citation_many_authors():
    """Citation with 8+ authors for truncation testing."""
    return Citation(
        citation_id="cite_006",
        authors=["Adams", "Baker", "Clark", "Davis", "Evans", "Foster", "Garcia", "Harris"],
        year=2020,
        title="Large-Scale Collaboration Study",
        source_type="journal",
        journal="Collaborative Research",
        volume=12,
        pages="1-30",
        doi="10.9999/collab.2020.006"
    )


@pytest.fixture
def sample_citation_three_authors():
    """Citation with exactly 3 authors (IEEE boundary case)."""
    return Citation(
        citation_id="cite_007",
        authors=["Kim", "Lee", "Park"],
        year=2023,
        title="Distributed Systems",
        source_type="journal",
        journal="IEEE Transactions",
        volume=8,
        pages="200-220"
    )


@pytest.fixture
def sample_citation_minimal():
    """Citation with minimal fields (no DOI, no URL, no volume)."""
    return Citation(
        citation_id="cite_008",
        authors=["Tanaka"],
        year=2024,
        title="Minimal Reference Test",
        source_type="journal"
    )


@pytest.fixture
def apa_database():
    """Database configured for APA style."""
    return CitationDatabase(citations=[], citation_style="APA 7th")


@pytest.fixture
def ieee_database():
    """Database configured for IEEE style."""
    return CitationDatabase(citations=[], citation_style="IEEE")


# =============================================================================
# APA IN-TEXT CITATION TESTS
# =============================================================================

class TestAPAInTextCitations:
    """Test APA 7th edition in-text citation formatting."""

    def test_single_author(self, apa_database, sample_citation_single_author):
        """Single author: (Smith, 2023)"""
        compiler = CitationCompiler(apa_database)
        result = compiler.format_in_text_citation(sample_citation_single_author)
        assert result == "(Smith, 2023)"

    def test_two_authors(self, apa_database, sample_citation_two_authors):
        """Two authors: (Smith & Johnson, 2022)"""
        compiler = CitationCompiler(apa_database)
        result = compiler.format_in_text_citation(sample_citation_two_authors)
        assert result == "(Smith & Johnson, 2022)"

    def test_multiple_authors(self, apa_database, sample_citation_multiple_authors):
        """3+ authors: (Smith et al., 2021)"""
        compiler = CitationCompiler(apa_database)
        result = compiler.format_in_text_citation(sample_citation_multiple_authors)
        assert result == "(Smith et al., 2021)"


# =============================================================================
# IEEE IN-TEXT CITATION TESTS
# =============================================================================

class TestIEEEInTextCitations:
    """Test IEEE numbered citation formatting."""

    def test_numbered_format(self, ieee_database, sample_citation_single_author):
        """IEEE uses numbered format: [1]"""
        compiler = CitationCompiler(ieee_database)
        result = compiler.format_in_text_citation(sample_citation_single_author)
        assert result == "[1]"

    def test_numbered_format_double_digit(self, ieee_database):
        """IEEE with double digit: [12]"""
        citation = Citation(
            citation_id="cite_012",
            authors=["Test"],
            year=2023,
            title="Test Paper",
            source_type="journal"
        )
        compiler = CitationCompiler(ieee_database)
        result = compiler.format_in_text_citation(citation)
        assert result == "[12]"


# =============================================================================
# APA REFERENCE FORMATTING TESTS
# =============================================================================

class TestAPAReferenceFormatting:
    """Test APA 7th edition reference list formatting."""

    def test_journal_article(self, apa_database, sample_citation_single_author):
        """Journal article with DOI."""
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(sample_citation_single_author)

        assert "Smith." in result
        assert "(2023)" in result
        assert "Machine Learning Applications" in result
        assert "*Nature*" in result
        assert "https://doi.org/10.1234/nature.2023.001" in result

    def test_book(self, apa_database, sample_citation_multiple_authors):
        """Book with publisher."""
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(sample_citation_multiple_authors)

        assert "Smith" in result
        assert "(2021)" in result
        assert "*AI in Healthcare*" in result
        assert "Academic Press" in result


# =============================================================================
# UNSUPPORTED STYLE TESTS
# =============================================================================
# CHICAGO IN-TEXT CITATION TESTS
# =============================================================================

class TestChicagoInTextCitations:
    """Test Chicago Author-Date in-text citation formatting."""

    def test_single_author(self, sample_citation_single_author):
        """Single author: (Smith 2023)"""
        db = CitationDatabase(citations=[], citation_style="Chicago")
        compiler = CitationCompiler(db)
        result = compiler.format_in_text_citation(sample_citation_single_author)
        assert result == "(Smith 2023)"

    def test_two_authors(self, sample_citation_two_authors):
        """Two authors: (Smith and Johnson 2022)"""
        db = CitationDatabase(citations=[], citation_style="Chicago")
        compiler = CitationCompiler(db)
        result = compiler.format_in_text_citation(sample_citation_two_authors)
        assert result == "(Smith and Johnson 2022)"

    def test_multiple_authors(self, sample_citation_multiple_authors):
        """3+ authors: (Smith et al. 2021)"""
        db = CitationDatabase(citations=[], citation_style="Chicago")
        compiler = CitationCompiler(db)
        result = compiler.format_in_text_citation(sample_citation_multiple_authors)
        assert result == "(Smith et al. 2021)"


# =============================================================================
# MLA IN-TEXT CITATION TESTS
# =============================================================================

class TestMLAInTextCitations:
    """Test MLA 9th Edition in-text citation formatting."""

    def test_single_author(self, sample_citation_single_author):
        """Single author: (Smith)"""
        db = CitationDatabase(citations=[], citation_style="MLA")
        compiler = CitationCompiler(db)
        result = compiler.format_in_text_citation(sample_citation_single_author)
        assert result == "(Smith)"

    def test_two_authors(self, sample_citation_two_authors):
        """Two authors: (Smith and Johnson)"""
        db = CitationDatabase(citations=[], citation_style="MLA")
        compiler = CitationCompiler(db)
        result = compiler.format_in_text_citation(sample_citation_two_authors)
        assert result == "(Smith and Johnson)"

    def test_multiple_authors(self, sample_citation_multiple_authors):
        """3+ authors: (Smith et al.)"""
        db = CitationDatabase(citations=[], citation_style="MLA")
        compiler = CitationCompiler(db)
        result = compiler.format_in_text_citation(sample_citation_multiple_authors)
        assert result == "(Smith et al.)"


# =============================================================================
# UNSUPPORTED STYLES TESTS
# =============================================================================

class TestUnsupportedStyles:

    def test_unknown_style_raises_error(self, sample_citation_single_author):
        """Unknown style should raise NotImplementedError."""
        db = CitationDatabase(citations=[], citation_style="Harvard")
        compiler = CitationCompiler(db)

        with pytest.raises(NotImplementedError) as exc_info:
            compiler.format_in_text_citation(sample_citation_single_author)

        assert "Harvard" in str(exc_info.value)


# =============================================================================
# REFERENCE LIST GENERATION TESTS
# =============================================================================

class TestReferenceListGeneration:
    """Test full reference list generation."""

    def test_apa_reference_list_sorted(self, apa_database):
        """APA references should be sorted alphabetically by first author."""
        citations = [
            Citation(citation_id="cite_001", authors=["Zebra"], year=2023, title="Z Paper", source_type="journal"),
            Citation(citation_id="cite_002", authors=["Alpha"], year=2022, title="A Paper", source_type="journal"),
            Citation(citation_id="cite_003", authors=["Middle"], year=2021, title="M Paper", source_type="journal"),
        ]
        db = CitationDatabase(citations=citations, citation_style="APA 7th")
        compiler = CitationCompiler(db)

        # Create text with all citations
        text = "Test {cite_001} and {cite_002} and {cite_003}"
        result = compiler.generate_reference_list(text)

        # Alpha should come before Middle, Middle before Zebra
        alpha_pos = result.find("Alpha")
        middle_pos = result.find("Middle")
        zebra_pos = result.find("Zebra")

        assert alpha_pos < middle_pos < zebra_pos


# =============================================================================
# IEEE REFERENCE FORMATTING TESTS
# =============================================================================

class TestIEEEReferenceFormatting:
    """Test IEEE reference list formatting."""

    def test_ieee_journal_article(self, ieee_database, sample_citation_single_author):
        """Journal with volume + pages: [N] Author., "Title," *Journal*, vol. X, pp. Y, Year."""
        compiler = CitationCompiler(ieee_database)
        result = compiler._format_ieee_reference(sample_citation_single_author)

        assert result.startswith("[001]")
        assert 'Smith.' in result
        assert '"Machine Learning Applications,"' in result
        assert "*Nature*" in result
        assert "vol. 45" in result
        assert "pp. 123-145" in result
        assert "2023." in result

    def test_ieee_journal_no_volume(self, ieee_database):
        """Journal omits vol. and pp. when missing."""
        citation = Citation(
            citation_id="cite_010",
            authors=["Wang"],
            year=2023,
            title="Sparse Methods",
            source_type="journal",
            journal="Computing Reviews"
        )
        compiler = CitationCompiler(ieee_database)
        result = compiler._format_ieee_reference(citation)

        assert "*Computing Reviews*" in result
        assert "vol." not in result
        assert "pp." not in result
        assert "2023." in result

    def test_ieee_book(self, ieee_database, sample_citation_multiple_authors):
        """Non-journal source hits else branch."""
        compiler = CitationCompiler(ieee_database)
        result = compiler._format_ieee_reference(sample_citation_multiple_authors)

        # Book uses the else branch: [N] Authors, "Title," Year.
        assert result.startswith("[003]")
        assert '"AI in Healthcare,"' in result
        assert "2021." in result
        # Should NOT have journal-specific fields
        assert "vol." not in result
        assert "pp." not in result

    def test_ieee_three_authors(self, ieee_database, sample_citation_three_authors):
        """Boundary: 3 authors all listed (<=3 check at L481)."""
        compiler = CitationCompiler(ieee_database)
        result = compiler._format_ieee_reference(sample_citation_three_authors)

        assert "Kim." in result
        assert "Lee." in result
        assert "Park." in result
        assert "et al." not in result

    def test_ieee_four_plus_authors(self, ieee_database, sample_citation_multiple_authors):
        """4 authors triggers et al. (L484)."""
        compiler = CitationCompiler(ieee_database)
        result = compiler._format_ieee_reference(sample_citation_multiple_authors)

        assert "Smith. et al." in result
        # Should NOT list all authors
        assert "Johnson" not in result
        assert "Williams" not in result
        assert "Brown" not in result


# =============================================================================
# APA REFERENCE FORMATTING — OTHER SOURCE TYPES
# =============================================================================

class TestAPAReferenceOtherTypes:
    """Test APA reference formatting for non-journal, non-book source types."""

    def test_apa_conference_paper(self, apa_database, sample_citation_conference):
        """Conference branch: publisher + (pp. X)."""
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(sample_citation_conference)

        assert "Lee" in result
        assert "Park" in result
        assert "(2022)" in result
        assert "Neural Architecture Search" in result
        assert "Proceedings of ICML 2022" in result
        assert "(pp. 100-115)" in result
        assert "https://doi.org/10.5555/icml.2022.004" in result

    def test_apa_report_with_url(self, apa_database, sample_citation_report):
        """Report/website branch: publisher + URL."""
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(sample_citation_report)

        assert "World Health Organization." in result
        assert "(2023)" in result
        assert "*Global Health Statistics*" in result
        assert "WHO Press" in result
        assert "https://www.who.int/reports/2023" in result

    def test_apa_journal_url_no_doi(self, apa_database):
        """URL fallback when DOI absent."""
        citation = Citation(
            citation_id="cite_020",
            authors=["Martinez"],
            year=2023,
            title="Open Access Review",
            source_type="journal",
            journal="Open Science",
            volume=5,
            url="https://openscience.org/article/123"
        )
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(citation)

        assert "https://openscience.org/article/123" in result
        assert "doi.org" not in result

    def test_apa_book_with_doi(self, apa_database):
        """Book appends DOI."""
        citation = Citation(
            citation_id="cite_021",
            authors=["Thompson"],
            year=2022,
            title="Advanced Algorithms",
            source_type="book",
            publisher="MIT Press",
            doi="10.7777/mitpress.2022.021"
        )
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(citation)

        assert "*Advanced Algorithms*" in result
        assert "MIT Press" in result
        assert "https://doi.org/10.7777/mitpress.2022.021" in result


# =============================================================================
# EDGE CASE TESTS
# =============================================================================

class TestEdgeCases:
    """Test edge cases and data quality regressions."""

    def test_apa_8_plus_authors_truncation(self, apa_database, sample_citation_many_authors):
        """8 authors triggers 'first 6 ... & last' (L388-389)."""
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(sample_citation_many_authors)

        # First 6 authors listed
        assert "Adams" in result
        assert "Baker" in result
        assert "Clark" in result
        assert "Davis" in result
        assert "Evans" in result
        assert "Foster" in result
        # Last author after ellipsis
        assert "... & Harris." in result
        # 7th author (Garcia) should NOT appear
        assert "Garcia" not in result

    def test_apa_missing_journal(self, apa_database):
        """journal=None doesn't crash (L395: journal or '')."""
        citation = Citation(
            citation_id="cite_030",
            authors=["NoJournal"],
            year=2023,
            title="Missing Journal Field",
            source_type="journal",
            journal=None
        )
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(citation)

        assert "NoJournal." in result
        assert "(2023)" in result
        # Should produce ** (empty italics) but not crash
        assert "Missing Journal Field" in result

    def test_apa_missing_publisher_book(self, apa_database):
        """publisher=None doesn't crash (L420-422)."""
        citation = Citation(
            citation_id="cite_031",
            authors=["NoPub"],
            year=2022,
            title="No Publisher Book",
            source_type="book",
            publisher=None
        )
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(citation)

        assert "NoPub." in result
        assert "(2022)" in result
        assert "*No Publisher Book*" in result

    def test_apa_no_doi_no_url(self, apa_database):
        """No DOI + no URL produces valid ref without trailing link."""
        citation = Citation(
            citation_id="cite_032",
            authors=["Plain"],
            year=2021,
            title="No Links Paper",
            source_type="journal",
            journal="Local Journal",
            volume=1,
            pages="10-20"
        )
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(citation)

        assert "doi.org" not in result
        assert "http" not in result
        assert result.endswith(".")

    def test_apa_unknown_source_type(self, apa_database):
        """'preprint' hits fallback branch (L461-470)."""
        citation = Citation(
            citation_id="cite_033",
            authors=["Preprint"],
            year=2024,
            title="Arxiv Preprint Paper",
            source_type="preprint",
            doi="10.48550/arxiv.2024.033"
        )
        compiler = CitationCompiler(apa_database)
        result = compiler._format_apa_reference(citation)

        assert "Preprint." in result
        assert "(2024)" in result
        assert "Arxiv Preprint Paper" in result
        assert "https://doi.org/10.48550/arxiv.2024.033" in result

    def test_ieee_number_extraction(self, ieee_database):
        """cite_001 -> [1], cite_099 -> [99] (L212-213)."""
        cite_1 = Citation(
            citation_id="cite_001",
            authors=["A"],
            year=2023,
            title="First",
            source_type="journal"
        )
        cite_99 = Citation(
            citation_id="cite_099",
            authors=["Z"],
            year=2023,
            title="Last",
            source_type="journal"
        )
        compiler = CitationCompiler(ieee_database)

        assert compiler.format_in_text_citation(cite_1) == "[1]"
        assert compiler.format_in_text_citation(cite_99) == "[99]"


# =============================================================================
# CITATION COMPILATION TESTS
# =============================================================================

class TestCitationCompilation:
    """Test compile_citations() pipeline method."""

    def _make_compiler(self, citations, style="APA 7th"):
        """Helper to build a CitationDatabase + CitationCompiler with model=None."""
        db = CitationDatabase(citations=citations, citation_style=style)
        return CitationCompiler(db, model=None)

    def test_compile_replaces_single_citation(self):
        """{cite_001} -> (Smith, 2023) in APA."""
        citations = [
            Citation(citation_id="cite_001", authors=["Smith"], year=2023,
                     title="Test", source_type="journal")
        ]
        compiler = self._make_compiler(citations)
        text = "As shown {cite_001} this works."
        result, missing, researched = compiler.compile_citations(text, research_missing=False, verbose=False)

        assert "(Smith, 2023)" in result
        assert "{cite_001}" not in result
        assert missing == []

    def test_compile_replaces_multiple_citations(self):
        """Two {cite_XXX} both replaced."""
        citations = [
            Citation(citation_id="cite_001", authors=["Smith"], year=2023,
                     title="Test A", source_type="journal"),
            Citation(citation_id="cite_002", authors=["Jones"], year=2022,
                     title="Test B", source_type="journal"),
        ]
        compiler = self._make_compiler(citations)
        text = "First {cite_001} and second {cite_002} here."
        result, missing, _ = compiler.compile_citations(text, research_missing=False, verbose=False)

        assert "(Smith, 2023)" in result
        assert "(Jones, 2022)" in result
        assert "{cite_" not in result
        assert missing == []

    def test_compile_missing_id_becomes_marker(self):
        """Unknown {cite_099} -> [MISSING: cite_099]."""
        compiler = self._make_compiler([])
        text = "Reference {cite_099} not found."
        result, missing, _ = compiler.compile_citations(text, research_missing=False, verbose=False)

        assert "[MISSING: cite_099]" in result
        assert "{cite_099}" not in result

    def test_compile_returns_missing_ids(self):
        """Return tuple's second element lists missing IDs."""
        compiler = self._make_compiler([])
        text = "Missing {cite_099} and {cite_088}."
        _, missing, _ = compiler.compile_citations(text, research_missing=False, verbose=False)

        assert "cite_099" in missing
        assert "cite_088" in missing
        assert len(missing) == 2

    def test_compile_remaining_missing_topic(self):
        """{cite_MISSING:topic} with research_missing=False -> [MISSING: topic]."""
        compiler = self._make_compiler([])
        text = "Need citation {cite_MISSING:quantum computing} here."
        result, missing, _ = compiler.compile_citations(text, research_missing=False, verbose=False)

        assert "[MISSING: quantum computing]" in result
        assert "{cite_MISSING:" not in result

    def test_compile_preserves_plain_text(self):
        """Text without cite patterns passes through unchanged."""
        compiler = self._make_compiler([])
        text = "This is plain text with no citations at all."
        result, missing, _ = compiler.compile_citations(text, research_missing=False, verbose=False)

        assert result == text
        assert missing == []

    def test_validate_clean_compilation(self):
        """validate_compilation() returns success: True when no markers remain."""
        citations = [
            Citation(citation_id="cite_001", authors=["Smith"], year=2023,
                     title="Test", source_type="journal")
        ]
        compiler = self._make_compiler(citations)
        original = "As shown {cite_001} this works."
        compiled, _, _ = compiler.compile_citations(original, research_missing=False, verbose=False)

        validation = compiler.validate_compilation(original, compiled)
        assert validation['success'] is True
        assert validation['issues'] == []
        assert validation['total_citations'] == 1
        assert validation['successfully_compiled'] == 1
        assert validation['missing_citations'] == 0


# =============================================================================
# NALT FIXTURES
# =============================================================================

@pytest.fixture
def nalt_database():
    """Database configured for NALT style."""
    return CitationDatabase(citations=[], citation_style="NALT")


@pytest.fixture
def sample_citation_case():
    """Case law citation for NALT testing."""
    return Citation(
        citation_id="cite_001",
        authors=["Bankole"],
        year=1967,
        title="Bankole v Eshugbayi Eleko",
        source_type="case",
        parties="Bankole v Eshugbayi Eleko",
        law_report="2 NWLR 46",
        court="SC",
    )


@pytest.fixture
def sample_citation_statute():
    """Statute citation for NALT testing."""
    return Citation(
        citation_id="cite_002",
        authors=["National Assembly"],
        year=2003,
        title="Child Rights Act",
        source_type="statute",
        section="s15(1)(b)",
    )


@pytest.fixture
def sample_citation_constitution():
    """Constitution citation for NALT testing."""
    return Citation(
        citation_id="cite_003",
        authors=["Federal Republic of Nigeria"],
        year=1999,
        title="Constitution of the Federal Republic of Nigeria",
        source_type="constitution",
        section="s36(1)",
    )


@pytest.fixture
def sample_nalt_book():
    """Book citation for NALT testing."""
    return Citation(
        citation_id="cite_004",
        authors=["Nasir"],
        year=2000,
        title="The Law of Contract in Nigeria",
        source_type="book",
        publisher="Gbile Publishers",
    )


@pytest.fixture
def sample_nalt_journal():
    """Journal citation for NALT testing."""
    return Citation(
        citation_id="cite_005",
        authors=["Nwoke"],
        year=2005,
        title="International Labour Law: An Appraisal",
        source_type="journal",
        journal="Journal of Public Law",
        volume=3,
        issue=1,
        pages="40-51",
    )


@pytest.fixture
def sample_nalt_website():
    """Website citation for NALT testing."""
    return Citation(
        citation_id="cite_006",
        authors=["Greenleaf"],
        year=2015,
        title="Free Access to Legal Information",
        source_type="website",
        url="http://www.austlii.edu.au/falip",
        access_date="27 July 2015",
    )


@pytest.fixture
def sample_citation_treaty():
    """Treaty citation for NALT testing."""
    return Citation(
        citation_id="cite_007",
        authors=["United Nations"],
        year=1989,
        title="Convention on the Rights of the Child",
        source_type="treaty",
        section="art 3",
    )


# =============================================================================
# NALT IN-TEXT CITATION TESTS
# =============================================================================

class TestNALTInTextCitations:
    """Test NALT footnote marker generation."""

    def test_footnote_marker(self, nalt_database, sample_nalt_book):
        """First citation produces [^1] marker."""
        nalt_database.citations = [sample_nalt_book]
        compiler = CitationCompiler(nalt_database)
        result = compiler.format_in_text_citation(sample_nalt_book)
        assert result == "[^1]"

    def test_counter_increments(self, nalt_database, sample_nalt_book, sample_nalt_journal):
        """Each citation gets next footnote number."""
        nalt_database.citations = [sample_nalt_book, sample_nalt_journal]
        compiler = CitationCompiler(nalt_database)
        r1 = compiler.format_in_text_citation(sample_nalt_book)
        r2 = compiler.format_in_text_citation(sample_nalt_journal)
        assert r1 == "[^1]"
        assert r2 == "[^2]"

    def test_definitions_collected(self, nalt_database, sample_nalt_book):
        """Footnote definitions are stored internally."""
        nalt_database.citations = [sample_nalt_book]
        compiler = CitationCompiler(nalt_database)
        compiler.format_in_text_citation(sample_nalt_book)
        assert len(compiler._nalt_footnote_definitions) == 1
        assert compiler._nalt_footnote_definitions[0].startswith("[^1]: ")


# =============================================================================
# NALT FOOTNOTE FORMATTING TESTS
# =============================================================================

class TestNALTFootnoteFormatting:
    """Test NALT footnote text formatting for each source type."""

    def _make_compiler(self, citation):
        db = CitationDatabase(citations=[citation], citation_style="NALT")
        return CitationCompiler(db)

    def test_book_format(self, sample_nalt_book):
        """Book: Author, *Title* (Publisher Year)"""
        compiler = self._make_compiler(sample_nalt_book)
        result = compiler._format_nalt_footnote(sample_nalt_book)
        assert "Nasir" in result
        assert "*The Law of Contract in Nigeria*" in result
        assert "(Gbile Publishers 2000)" in result

    def test_journal_format(self, sample_nalt_journal):
        """Journal: Author, 'Title' [Year] (Vol)(Issue) *Journal*, Pages"""
        compiler = self._make_compiler(sample_nalt_journal)
        result = compiler._format_nalt_footnote(sample_nalt_journal)
        assert "Nwoke" in result
        assert "'International Labour Law: An Appraisal'" in result
        assert "[2005]" in result
        assert "(3)" in result
        assert "(1)" in result
        assert "*Journal of Public Law*" in result
        assert "40-51" in result

    def test_case_format(self, sample_citation_case):
        """Case: *Parties* [Year] Report (Court)"""
        compiler = self._make_compiler(sample_citation_case)
        result = compiler._format_nalt_footnote(sample_citation_case)
        assert "*Bankole v Eshugbayi Eleko*" in result
        assert "[1967]" in result
        assert "2 NWLR 46" in result
        assert "(SC)" in result

    def test_statute_format(self, sample_citation_statute):
        """Statute: Title Year, section"""
        compiler = self._make_compiler(sample_citation_statute)
        result = compiler._format_nalt_footnote(sample_citation_statute)
        assert "Child Rights Act 2003" in result
        assert "s15(1)(b)" in result

    def test_constitution_format(self, sample_citation_constitution):
        """Constitution: Title Year, section"""
        compiler = self._make_compiler(sample_citation_constitution)
        result = compiler._format_nalt_footnote(sample_citation_constitution)
        assert "Constitution of the Federal Republic of Nigeria 1999" in result
        assert "s36(1)" in result

    def test_treaty_format(self, sample_citation_treaty):
        """Treaty: Title (Year), section"""
        compiler = self._make_compiler(sample_citation_treaty)
        result = compiler._format_nalt_footnote(sample_citation_treaty)
        assert "Convention on the Rights of the Child (1989)" in result
        assert "art 3" in result

    def test_website_format(self, sample_nalt_website):
        """Website: Author, 'Title' <URL> accessed Date"""
        compiler = self._make_compiler(sample_nalt_website)
        result = compiler._format_nalt_footnote(sample_nalt_website)
        assert "Greenleaf" in result
        assert "'Free Access to Legal Information'" in result
        assert "<http://www.austlii.edu.au/falip>" in result
        assert "accessed 27 July 2015" in result

    def test_fallback_format(self):
        """Report type falls back to book-like format."""
        citation = Citation(
            citation_id="cite_010",
            authors=["Unknown"],
            year=2020,
            title="Some Report",
            source_type="report",
            publisher="Gov Press",
        )
        compiler = self._make_compiler(citation)
        result = compiler._format_nalt_footnote(citation)
        assert "Unknown" in result
        assert "*Some Report*" in result
        assert "(Gov Press 2020)" in result


# =============================================================================
# NALT AUTHOR FORMATTING TESTS
# =============================================================================

class TestNALTAuthorFormatting:
    """Test NALT author formatting rules."""

    def _make_compiler(self):
        db = CitationDatabase(citations=[], citation_style="NALT")
        return CitationCompiler(db)

    def test_single_author(self):
        """1 author: just the name."""
        compiler = self._make_compiler()
        result = compiler._format_nalt_authors_footnote(["Smith"])
        assert result == "Smith"

    def test_two_authors(self):
        """2 authors: joined with 'and'."""
        compiler = self._make_compiler()
        result = compiler._format_nalt_authors_footnote(["Smith", "Jones"])
        assert result == "Smith and Jones"

    def test_three_authors(self):
        """3 authors: comma-separated with 'and' before last."""
        compiler = self._make_compiler()
        result = compiler._format_nalt_authors_footnote(["Smith", "Jones", "Brown"])
        assert result == "Smith, Jones and Brown"

    def test_four_plus_authors(self):
        """4+ authors: first 'and others' (NOT et al.)."""
        compiler = self._make_compiler()
        result = compiler._format_nalt_authors_footnote(["Smith", "Jones", "Brown", "Lee"])
        assert result == "Smith and others"
        assert "et al" not in result


# =============================================================================
# NALT BIBLIOGRAPHY TESTS
# =============================================================================

class TestNALTBibliography:
    """Test NALT bibliography generation."""

    def test_bibliography_header(self):
        """NALT uses 'Bibliography' header, not 'References'."""
        citations = [
            Citation(citation_id="cite_001", authors=["Smith"], year=2023,
                     title="Test Book", source_type="book", publisher="Publisher"),
        ]
        db = CitationDatabase(citations=citations, citation_style="NALT")
        compiler = CitationCompiler(db)
        text = "See {cite_001} here."
        result = compiler.generate_reference_list(text)
        assert "## Bibliography" in result
        assert "## References" not in result

    def test_bibliography_alphabetical(self):
        """Bibliography entries sorted alphabetically by author."""
        citations = [
            Citation(citation_id="cite_001", authors=["Zebra"], year=2023,
                     title="Z Book", source_type="book", publisher="Pub"),
            Citation(citation_id="cite_002", authors=["Alpha"], year=2022,
                     title="A Book", source_type="book", publisher="Pub"),
        ]
        db = CitationDatabase(citations=citations, citation_style="NALT")
        compiler = CitationCompiler(db)
        text = "First {cite_001} and {cite_002} here."
        result = compiler.generate_reference_list(text)
        alpha_pos = result.find("Alpha")
        zebra_pos = result.find("Zebra")
        assert alpha_pos < zebra_pos


# =============================================================================
# NALT COMPILATION TESTS
# =============================================================================

class TestNALTCompilation:
    """Test NALT full compilation pipeline."""

    def _make_compiler(self, citations):
        db = CitationDatabase(citations=citations, citation_style="NALT")
        return CitationCompiler(db, model=None)

    def test_full_pipeline(self):
        """Compile replaces {cite_001} with [^1] and appends footnote definition."""
        citations = [
            Citation(citation_id="cite_001", authors=["Nasir"], year=2000,
                     title="Contract Law", source_type="book", publisher="Gbile"),
        ]
        compiler = self._make_compiler(citations)
        text = "As stated {cite_001} the law provides."
        result, missing, _ = compiler.compile_citations(text, research_missing=False, verbose=False)

        assert "[^1]" in result
        assert "{cite_001}" not in result
        assert "[^1]: " in result
        assert "*Contract Law*" in result
        assert missing == []

    def test_multiple_footnotes(self):
        """Multiple citations get sequential footnote numbers."""
        citations = [
            Citation(citation_id="cite_001", authors=["Nasir"], year=2000,
                     title="Contract Law", source_type="book", publisher="Gbile"),
            Citation(citation_id="cite_002", authors=["Nwoke"], year=2005,
                     title="Labour Law", source_type="journal", journal="JPL",
                     volume=3, pages="40-51"),
        ]
        compiler = self._make_compiler(citations)
        text = "First {cite_001} and second {cite_002} here."
        result, missing, _ = compiler.compile_citations(text, research_missing=False, verbose=False)

        assert "[^1]" in result
        assert "[^2]" in result
        assert "[^1]: " in result
        assert "[^2]: " in result
        assert missing == []

    def test_counter_reset(self):
        """Counter resets between compile_citations() calls."""
        citations = [
            Citation(citation_id="cite_001", authors=["Nasir"], year=2000,
                     title="Contract Law", source_type="book", publisher="Gbile"),
        ]
        compiler = self._make_compiler(citations)

        # First compilation
        result1, _, _ = compiler.compile_citations("See {cite_001}.", research_missing=False, verbose=False)
        assert "[^1]" in result1

        # Second compilation - counter should reset
        result2, _, _ = compiler.compile_citations("See {cite_001}.", research_missing=False, verbose=False)
        assert "[^1]" in result2
        # Should NOT have [^2] from previous run
        assert "[^2]" not in result2


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
