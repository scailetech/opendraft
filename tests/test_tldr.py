#!/usr/bin/env python3
"""Tests for TL;DR functionality."""

import os
import sys
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add engine to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engine'))


class TestDocumentReader:
    """Tests for document_reader utility."""

    def test_read_markdown_file(self, tmp_path):
        """Test reading a markdown file."""
        from utils.document_reader import read_document

        md_file = tmp_path / "test.md"
        md_file.write_text("# Test\n\nThis is a test document.")

        content = read_document(md_file)
        assert "# Test" in content
        assert "This is a test document" in content

    def test_read_text_file(self, tmp_path):
        """Test reading a plain text file."""
        from utils.document_reader import read_document

        txt_file = tmp_path / "test.txt"
        txt_file.write_text("Plain text content here.")

        content = read_document(txt_file)
        assert content == "Plain text content here."

    def test_file_not_found(self):
        """Test error when file doesn't exist."""
        from utils.document_reader import read_document

        with pytest.raises(FileNotFoundError):
            read_document(Path("/nonexistent/file.md"))

    def test_max_chars_truncation(self, tmp_path):
        """Test truncation with max_chars."""
        from utils.document_reader import read_document

        md_file = tmp_path / "long.md"
        md_file.write_text("x" * 1000)

        content = read_document(md_file, max_chars=100)
        assert len(content) == 100

    def test_get_document_info(self, tmp_path):
        """Test document info extraction."""
        from utils.document_reader import get_document_info

        md_file = tmp_path / "test.md"
        md_file.write_text("Word one two three four five.")

        info = get_document_info(md_file)
        assert info["name"] == "test.md"
        assert info["type"] == ".md"
        assert info["word_count"] == 6
        assert info["char_count"] == 29  # "Word one two three four five." is 29 chars


class TestTLDRGeneration:
    """Tests for TL;DR generation."""

    @pytest.mark.integration
    def test_generate_tldr_with_mock(self, tmp_path):
        """Test TL;DR generation with mocked Gemini."""
        from tldr import generate_tldr

        # Create test document
        doc = tmp_path / "paper.md"
        doc.write_text("""
        # Research Paper

        This paper investigates the impact of sleep deprivation on cognitive performance.
        We found that subjects who slept less than 6 hours showed 40% decrease in reaction time.
        The methodology involved controlled laboratory experiments with 100 participants.
        Results suggest that chronic sleep debt has cumulative effects on brain function.
        Limitations include the artificial lab environment which may not reflect real-world conditions.
        """)

        # Mock the Gemini client
        mock_response = Mock()
        mock_response.text = """## TL;DR

- **[Thesis]**: Sleep deprivation significantly impairs cognitive performance in measurable ways.
- **[Finding]**: Subjects with under six hours sleep showed forty percent slower reaction times.
- **[Method]**: Controlled lab experiments with one hundred participants over multiple weeks.
- **[Implication]**: Chronic sleep debt has cumulative, compounding effects on brain function.
- **[Limitation]**: Lab conditions may not accurately represent real-world sleep patterns."""

        with patch('tldr.GeminiModelWrapper') as MockModel:
            mock_instance = MockModel.return_value
            mock_instance.generate_content.return_value = mock_response

            with patch('google.genai'):
                tldr = generate_tldr(doc)

        assert "## TL;DR" in tldr
        assert "Thesis" in tldr or "Finding" in tldr


class TestTLDRCLI:
    """Tests for TL;DR CLI command."""

    def test_cli_file_not_found(self):
        """Test CLI error when file not found."""
        from opendraft.cli import run_tldr_command

        result = run_tldr_command(["/nonexistent/file.pdf"])
        assert result == 1

    def test_cli_help(self, capsys):
        """Test CLI help output."""
        from opendraft.cli import run_tldr_command

        with pytest.raises(SystemExit) as exc_info:
            run_tldr_command(["--help"])

        assert exc_info.value.code == 0
        captured = capsys.readouterr()
        assert "5-bullet TL;DR" in captured.out or "document" in captured.out
