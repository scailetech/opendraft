#!/usr/bin/env python3
"""
Tests for draft revision module.
"""

import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.revise import (
    find_draft_in_folder,
    score_draft_simple,
    _get_next_version,
    _is_safe_file,
)


class TestFindDraftInFolder:
    """Tests for finding drafts in folders."""

    def test_finds_draft_in_exports(self):
        """Test finding draft in exports/ subfolder."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            exports = folder / "exports"
            exports.mkdir()

            # Create a draft file
            draft = exports / "my_paper.md"
            draft.write_text("# My Paper\n\nContent here.")

            result = find_draft_in_folder(folder)
            # Compare resolved paths to handle macOS /var vs /private/var
            assert result.resolve() == draft.resolve()

    def test_prefers_final_draft(self):
        """Test that final_draft.md is preferred over other files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            exports = folder / "exports"
            exports.mkdir()

            # Create multiple files
            (exports / "other_paper.md").write_text("# Other\n" * 100)
            (exports / "final_draft.md").write_text("# Final\n" * 50)

            result = find_draft_in_folder(folder)
            assert result.name == "final_draft.md"

    def test_ignores_intermediate_files(self):
        """Test that intermediate files are ignored."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            exports = folder / "exports"
            exports.mkdir()

            # Create intermediate and final files
            (exports / "INTERMEDIATE_DRAFT.md").write_text("# Intermediate\n" * 100)
            (exports / "real_paper.md").write_text("# Real\n" * 50)

            result = find_draft_in_folder(folder)
            assert "intermediate" not in result.name.lower()

    def test_ignores_hidden_files(self):
        """Test that hidden files are ignored."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            exports = folder / "exports"
            exports.mkdir()

            (exports / ".hidden.md").write_text("# Hidden\n" * 100)
            (exports / "visible.md").write_text("# Visible\n" * 50)

            result = find_draft_in_folder(folder)
            assert not result.name.startswith(".")

    def test_returns_none_for_empty_folder(self):
        """Test that empty folder returns None."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            result = find_draft_in_folder(folder)
            assert result is None

    def test_finds_draft_in_root(self):
        """Test finding draft in root folder."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            draft = folder / "draft.md"
            draft.write_text("# Draft Content")

            result = find_draft_in_folder(folder)
            # Compare resolved paths to handle macOS /var vs /private/var
            assert result.resolve() == draft.resolve()


class TestScoreDraftSimple:
    """Tests for simple quality scoring."""

    def test_empty_draft_scores_zero(self):
        """Test that empty draft scores 0."""
        result = score_draft_simple("")
        assert result["overall_score"] == 0
        assert result["word_count"] == 0

    def test_word_count_scoring(self):
        """Test word count contributes to score."""
        short_draft = "Word " * 100
        medium_draft = "Word " * 600
        long_draft = "Word " * 3500

        short_score = score_draft_simple(short_draft)
        medium_score = score_draft_simple(medium_draft)
        long_score = score_draft_simple(long_draft)

        assert short_score["overall_score"] < medium_score["overall_score"]
        assert medium_score["overall_score"] < long_score["overall_score"]

    def test_citations_contribute_to_score(self):
        """Test that citations increase score."""
        no_citations = "This is content without citations."
        with_citations = "This is content {cite_1} with citations {cite_2} and more {cite_3}."

        score_without = score_draft_simple(no_citations)
        score_with = score_draft_simple(with_citations)

        assert score_with["citations"] == 3
        assert score_with["overall_score"] > score_without["overall_score"]

    def test_headers_contribute_to_score(self):
        """Test that markdown headers increase score."""
        no_headers = "Just plain text content here."
        with_headers = """# Title

## Section 1

Content here.

## Section 2

More content.

### Subsection

Even more.
"""
        score_without = score_draft_simple(no_headers)
        score_with = score_draft_simple(with_headers)

        assert score_with["headers"] > score_without["headers"]
        assert score_with["overall_score"] > score_without["overall_score"]

    def test_sections_contribute_to_score(self):
        """Test that section keywords increase score."""
        draft = """# My Paper

## Introduction

This is the introduction section.

## Methodology

This describes our methodology.

## Results

Here are the results.

## Conclusion

This is our conclusion.
"""
        result = score_draft_simple(draft)
        assert result["sections_found"] >= 4

    def test_score_caps_at_100(self):
        """Test that score doesn't exceed 100."""
        massive_draft = ("# Header\n\n" + "Word {cite_1} " * 10000 +
                        "\n## Introduction\n## Literature Review\n## Methodology\n" +
                        "## Results\n## Discussion\n## Conclusion\n")
        result = score_draft_simple(massive_draft)
        assert result["overall_score"] <= 100


class TestGetNextVersion:
    """Tests for version suffix generation."""

    def test_starts_at_v2(self):
        """Test that first version is v2."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            result = _get_next_version(folder, "paper")
            assert result == "v2"

    def test_increments_version(self):
        """Test that version increments when file exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            (folder / "paper_v2.md").write_text("v2")

            result = _get_next_version(folder, "paper")
            assert result == "v3"

    def test_skips_existing_versions(self):
        """Test that existing versions are skipped."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            (folder / "paper_v2.md").write_text("v2")
            (folder / "paper_v3.md").write_text("v3")
            (folder / "paper_v4.md").write_text("v4")

            result = _get_next_version(folder, "paper")
            assert result == "v5"


class TestIsSafeFile:
    """Tests for symlink safety check."""

    def test_regular_file_is_safe(self):
        """Test that regular file is safe."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            file = folder / "test.md"
            file.write_text("content")

            assert _is_safe_file(file, folder) is True

    def test_file_in_subfolder_is_safe(self):
        """Test that file in subfolder is safe."""
        with tempfile.TemporaryDirectory() as tmpdir:
            folder = Path(tmpdir)
            subfolder = folder / "exports"
            subfolder.mkdir()
            file = subfolder / "test.md"
            file.write_text("content")

            assert _is_safe_file(file, folder) is True

    def test_file_outside_folder_is_unsafe(self):
        """Test that file outside base folder is unsafe."""
        with tempfile.TemporaryDirectory() as tmpdir1:
            with tempfile.TemporaryDirectory() as tmpdir2:
                folder = Path(tmpdir1)
                outside_file = Path(tmpdir2) / "test.md"
                outside_file.write_text("content")

                assert _is_safe_file(outside_file, folder) is False


class TestCitationPreservation:
    """Tests for citation preservation during revision."""

    def test_citations_counted_correctly(self):
        """Test that citations are counted correctly."""
        draft = """
# Paper

Introduction {cite_1} and {cite_2}.

## Methods

We used {cite_3} approach.

## Results

Results from {cite_1} and {cite_4}.
"""
        result = score_draft_simple(draft)
        assert result["citations"] == 5  # cite_1 appears twice

    def test_citation_regex_pattern(self):
        """Test that citation regex matches correctly."""
        import re
        pattern = r'\{cite_\d+\}'

        # Should match
        assert re.search(pattern, "{cite_1}")
        assert re.search(pattern, "{cite_123}")
        assert re.search(pattern, "text {cite_45} more")

        # Should not match
        assert not re.search(pattern, "{cite_}")
        assert not re.search(pattern, "{cite_abc}")
        assert not re.search(pattern, "cite_1")


class TestRevisionIntegration:
    """Integration tests for revision."""

    def test_revision_with_mock_gemini(self):
        """Test revision flow with mocked Gemini response."""
        original = """# Test Paper

## Introduction

This is about AI {cite_1}. Previous work {cite_2} showed results.

## Methodology

We used methods {cite_3}.

## Conclusion

In conclusion {cite_4}.
"""
        # Simulate a good revision that preserves citations
        mock_revised = """# Test Paper

## Introduction

This is about AI {cite_1}. Previous work {cite_2} showed results. This topic is important for understanding modern technology.

## Methodology

We used methods {cite_3}. The approach was systematic.

## Conclusion

In conclusion {cite_4}. Future work should explore more.
"""
        with patch('utils.revise.call_gemini_revise', return_value=mock_revised):
            with tempfile.TemporaryDirectory() as tmpdir:
                folder = Path(tmpdir)
                exports = folder / "exports"
                exports.mkdir()

                draft = exports / "test_paper.md"
                draft.write_text(original)

                from utils.revise import revise_draft
                result = revise_draft(folder, "Make it longer")

                # Verify output
                assert result['md_path'].exists()
                assert result['score_after'] >= result['score_before']

                # Verify citations preserved
                revised_content = result['md_path'].read_text()
                assert "{cite_1}" in revised_content
                assert "{cite_2}" in revised_content
                assert "{cite_3}" in revised_content
                assert "{cite_4}" in revised_content

    def test_revision_detects_lost_citations(self):
        """Test that we can detect when citations are lost."""
        import re

        original = "Content {cite_1} and {cite_2} and {cite_3}."
        bad_revision = "Content {cite_1} and {cite_2}."  # Lost cite_3

        original_citations = set(re.findall(r'\{cite_\d+\}', original))
        revised_citations = set(re.findall(r'\{cite_\d+\}', bad_revision))

        missing = original_citations - revised_citations
        assert missing == {"{cite_3}"}

    @pytest.mark.skipif(
        not Path.home().joinpath(".opendraft/config.json").exists(),
        reason="No API key configured"
    )
    def test_call_gemini_revise_preserves_citations_live(self):
        """Test that Gemini revision preserves citations (live API)."""
        import os
        import json

        # Load API key
        config_path = Path.home() / ".opendraft/config.json"
        if config_path.exists():
            config = json.loads(config_path.read_text())
            os.environ["GOOGLE_API_KEY"] = config.get("google_api_key", "")

        from utils.revise import call_gemini_revise

        original = """# Test Paper

## Introduction

This is about AI {cite_1}. Previous work {cite_2} showed results.

## Conclusion

In conclusion {cite_3}.
"""

        revised = call_gemini_revise(original, "Make the introduction slightly longer")

        # Check citations are preserved
        assert "{cite_1}" in revised or "cite_1" in revised
        assert "{cite_2}" in revised or "cite_2" in revised
        assert "{cite_3}" in revised or "cite_3" in revised


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
