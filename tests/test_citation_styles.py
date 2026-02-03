"""Tests for Chicago and MLA citation formatting in CitationCompiler."""

import sys
import os
import unittest

# Add engine directory to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engine'))

from utils.citation_database import Citation, CitationDatabase
from utils.citation_compiler import CitationCompiler


def _make_citation(**kwargs):
    """Helper to create a Citation with sensible defaults."""
    defaults = {
        "citation_id": "cite_001",
        "authors": ["Smith"],
        "year": 2023,
        "title": "Test Article",
        "source_type": "journal",
    }
    defaults.update(kwargs)
    return Citation(**defaults)


def _make_compiler(style, citations=None):
    """Helper to create a CitationCompiler with given style."""
    if citations is None:
        citations = []
    db = CitationDatabase(citations=citations, citation_style=style)
    return CitationCompiler(db)


# ── Chicago In-Text ──────────────────────────────────────────────────

class TestChicagoInTextCitations(unittest.TestCase):

    def test_single_author(self):
        c = _make_citation(authors=["Smith"], year=2023)
        compiler = _make_compiler("Chicago", [c])
        self.assertEqual(compiler.format_in_text_citation(c), "(Smith 2023)")

    def test_two_authors(self):
        c = _make_citation(authors=["Smith", "Johnson"], year=2022)
        compiler = _make_compiler("Chicago", [c])
        self.assertEqual(compiler.format_in_text_citation(c), "(Smith and Johnson 2022)")

    def test_multiple_authors(self):
        c = _make_citation(authors=["Smith", "Johnson", "Lee"], year=2021)
        compiler = _make_compiler("Chicago", [c])
        self.assertEqual(compiler.format_in_text_citation(c), "(Smith et al. 2021)")


# ── Chicago References ───────────────────────────────────────────────

class TestChicagoReferenceFormatting(unittest.TestCase):

    def test_journal_article(self):
        c = _make_citation(
            authors=["Smith"],
            year=2023,
            title="Article Title",
            source_type="journal",
            journal="Journal Name",
            volume=45,
            issue=3,
            pages="234-256",
            doi="10.1234/test",
        )
        compiler = _make_compiler("Chicago", [c])
        ref = compiler._format_chicago_reference(c)
        self.assertIn("Smith.", ref)
        self.assertIn('"Article Title."', ref)
        self.assertIn("*Journal Name*", ref)
        self.assertIn("45", ref)
        self.assertIn("no. 3", ref)
        self.assertIn("(2023)", ref)
        self.assertIn(": 234-256", ref)
        self.assertIn("https://doi.org/10.1234/test", ref)

    def test_book(self):
        c = _make_citation(
            authors=["Smith"],
            year=2023,
            title="Book Title",
            source_type="book",
            publisher="Academic Press",
        )
        compiler = _make_compiler("Chicago", [c])
        ref = compiler._format_chicago_reference(c)
        self.assertIn("Smith.", ref)
        self.assertIn("*Book Title*", ref)
        self.assertIn("Academic Press,", ref)
        self.assertIn("2023", ref)

    def test_conference_paper(self):
        c = _make_citation(
            authors=["Smith", "Johnson"],
            year=2022,
            title="Conference Paper",
            source_type="conference",
            publisher="Proceedings of ICML",
            pages="100-110",
        )
        compiler = _make_compiler("Chicago", [c])
        ref = compiler._format_chicago_reference(c)
        self.assertIn("Smith and Johnson.", ref)
        self.assertIn('"Conference Paper."', ref)
        self.assertIn("*Proceedings of ICML*", ref)
        self.assertIn("100-110", ref)
        self.assertIn("2022", ref)

    def test_report_with_url(self):
        c = _make_citation(
            authors=["Smith"],
            year=2023,
            title="Report Title",
            source_type="report",
            publisher="WHO",
            url="https://example.com/report",
        )
        compiler = _make_compiler("Chicago", [c])
        ref = compiler._format_chicago_reference(c)
        self.assertIn("Smith.", ref)
        self.assertIn('"Report Title."', ref)
        self.assertIn("WHO,", ref)
        self.assertIn("2023", ref)
        self.assertIn("https://example.com/report", ref)


# ── MLA In-Text ──────────────────────────────────────────────────────

class TestMLAInTextCitations(unittest.TestCase):

    def test_single_author(self):
        c = _make_citation(authors=["Smith"], year=2023)
        compiler = _make_compiler("MLA", [c])
        self.assertEqual(compiler.format_in_text_citation(c), "(Smith)")

    def test_two_authors(self):
        c = _make_citation(authors=["Smith", "Johnson"], year=2022)
        compiler = _make_compiler("MLA", [c])
        self.assertEqual(compiler.format_in_text_citation(c), "(Smith and Johnson)")

    def test_multiple_authors(self):
        c = _make_citation(authors=["Smith", "Johnson", "Lee"], year=2021)
        compiler = _make_compiler("MLA", [c])
        self.assertEqual(compiler.format_in_text_citation(c), "(Smith et al.)")


# ── MLA References ───────────────────────────────────────────────────

class TestMLAReferenceFormatting(unittest.TestCase):

    def test_journal_article(self):
        c = _make_citation(
            authors=["Smith"],
            year=2023,
            title="Article Title",
            source_type="journal",
            journal="Journal Name",
            volume=45,
            issue=3,
            pages="234-256",
            doi="10.1234/test",
        )
        compiler = _make_compiler("MLA", [c])
        ref = compiler._format_mla_reference(c)
        self.assertIn("Smith.", ref)
        self.assertIn('"Article Title."', ref)
        self.assertIn("*Journal Name*", ref)
        self.assertIn("vol. 45", ref)
        self.assertIn("no. 3", ref)
        self.assertIn(", 2023", ref)
        self.assertIn("pp. 234-256", ref)
        self.assertIn("https://doi.org/10.1234/test", ref)

    def test_book(self):
        c = _make_citation(
            authors=["Smith"],
            year=2023,
            title="Book Title",
            source_type="book",
            publisher="Academic Press",
        )
        compiler = _make_compiler("MLA", [c])
        ref = compiler._format_mla_reference(c)
        self.assertIn("Smith.", ref)
        self.assertIn("*Book Title*", ref)
        self.assertIn("Academic Press,", ref)
        self.assertIn("2023", ref)

    def test_conference_paper(self):
        c = _make_citation(
            authors=["Smith", "Johnson"],
            year=2022,
            title="Conference Paper",
            source_type="conference",
            publisher="Proceedings of ICML",
            pages="100-110",
        )
        compiler = _make_compiler("MLA", [c])
        ref = compiler._format_mla_reference(c)
        self.assertIn("Smith and Johnson.", ref)
        self.assertIn('"Conference Paper."', ref)
        self.assertIn("*Proceedings of ICML*", ref)
        self.assertIn("pp. 100-110", ref)
        self.assertIn("2022", ref)

    def test_report_with_url(self):
        c = _make_citation(
            authors=["Smith"],
            year=2023,
            title="Report Title",
            source_type="report",
            publisher="WHO",
            url="https://example.com/report",
        )
        compiler = _make_compiler("MLA", [c])
        ref = compiler._format_mla_reference(c)
        self.assertIn("Smith.", ref)
        self.assertIn("*Report Title*", ref)
        self.assertIn("WHO,", ref)
        self.assertIn("2023", ref)
        self.assertIn("https://example.com/report", ref)


# ── Unsupported Styles ───────────────────────────────────────────────

class TestUnsupportedStyles(unittest.TestCase):

    def test_unknown_style_falls_back_to_apa(self):
        """Unknown styles fall back to APA formatting."""
        c = _make_citation(authors=["Smith"], year=2023)
        db = CitationDatabase(citations=[c], citation_style="APA 7th")
        # Manually override style to something unknown
        compiler = CitationCompiler(db)
        compiler.style = "Vancouver"
        result = compiler.format_in_text_citation(c)
        # Should fall back to APA
        self.assertEqual(result, "(Smith, 2023)")


# ── Reference List Sorting ───────────────────────────────────────────

class TestChicagoReferenceList(unittest.TestCase):

    def test_chicago_reference_list_sorted(self):
        """Chicago references should be sorted alphabetically by first author."""
        c1 = _make_citation(citation_id="cite_001", authors=["Zhao"], year=2023, title="Z Article")
        c2 = _make_citation(citation_id="cite_002", authors=["Adams"], year=2022, title="A Article")
        c3 = _make_citation(citation_id="cite_003", authors=["Miller"], year=2021, title="M Article")

        compiler = _make_compiler("Chicago", [c1, c2, c3])
        text = "Some text {cite_001} and {cite_002} and {cite_003}."
        ref_list = compiler.generate_reference_list(text)

        # Adams should come before Miller, Miller before Zhao
        adams_pos = ref_list.index("Adams")
        miller_pos = ref_list.index("Miller")
        zhao_pos = ref_list.index("Zhao")
        self.assertLess(adams_pos, miller_pos)
        self.assertLess(miller_pos, zhao_pos)


class TestMLAReferenceList(unittest.TestCase):

    def test_mla_reference_list_sorted(self):
        """MLA references should be sorted alphabetically by first author."""
        c1 = _make_citation(citation_id="cite_001", authors=["Zhao"], year=2023, title="Z Article")
        c2 = _make_citation(citation_id="cite_002", authors=["Adams"], year=2022, title="A Article")
        c3 = _make_citation(citation_id="cite_003", authors=["Miller"], year=2021, title="M Article")

        compiler = _make_compiler("MLA", [c1, c2, c3])
        text = "Some text {cite_001} and {cite_002} and {cite_003}."
        ref_list = compiler.generate_reference_list(text)

        # Adams should come before Miller, Miller before Zhao
        adams_pos = ref_list.index("Adams")
        miller_pos = ref_list.index("Miller")
        zhao_pos = ref_list.index("Zhao")
        self.assertLess(adams_pos, miller_pos)
        self.assertLess(miller_pos, zhao_pos)


if __name__ == "__main__":
    unittest.main()
