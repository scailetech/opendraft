#!/usr/bin/env python3
"""
Integration tests for checkpoint/resume workflow.

These tests verify the actual resume functionality works end-to-end,
simulating interrupted runs and resuming from checkpoints.
"""

import json
import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.checkpoint import (
    save_checkpoint,
    load_checkpoint,
    restore_context,
    get_next_phase,
    PHASES,
)
from utils.citation_database import Citation, CitationDatabase
from phases.context import DraftContext


class TestRealResumeWorkflow:
    """Test actual resume-from-checkpoint scenarios."""

    def _create_partial_checkpoint(self, tmp_path: Path, completed_phase: str) -> Path:
        """Create a realistic checkpoint as if pipeline was interrupted."""
        ctx = DraftContext()
        ctx.topic = "Machine Learning in Healthcare"
        ctx.language = "en"
        ctx.academic_level = "research_paper"
        ctx.output_type = "full"
        ctx.citation_style = "apa"
        ctx.skip_validation = True
        ctx.verbose = False
        ctx.word_targets = {'min_citations': 10, 'total': '3000-5000'}
        ctx.language_name = "English"
        ctx.language_instruction = "Write in English"

        # Create folder structure
        research_dir = tmp_path / "research"
        drafts_dir = tmp_path / "drafts"
        research_dir.mkdir(parents=True)
        drafts_dir.mkdir(parents=True)

        ctx.folders = {
            'root': tmp_path,
            'research': research_dir,
            'papers': research_dir / 'papers',
            'drafts': drafts_dir,
            'exports': tmp_path / 'exports',
        }

        # Add phase outputs based on how far we got
        if completed_phase in PHASES[PHASES.index("research"):]:
            ctx.scout_output = "# Research Summary\n\nFound 15 relevant papers on ML in healthcare."
            ctx.scribe_output = "## Paper Summaries\n\n1. Deep Learning for Diagnosis..."
            ctx.signal_output = "## Research Gaps\n\n- Need more interpretability studies"
            ctx.scout_result = {
                "citations": [
                    Citation(
                        citation_id=f"cite_{i:03d}",
                        authors=[f"Author{i}, A."],
                        year=2024,
                        title=f"Paper Title {i}",
                        source_type="journal",
                    )
                    for i in range(1, 11)
                ],
                "raw_output": "Research output...",
            }

        if completed_phase in PHASES[PHASES.index("structure"):]:
            ctx.architect_output = "# Thesis Outline\n\n## 1. Introduction\n## 2. Literature Review"
            ctx.formatter_output = "# Machine Learning in Healthcare\n\n## Introduction\n..."

        if completed_phase in PHASES[PHASES.index("citations"):]:
            ctx.citation_summary = "10 citations organized by theme"
            # Save bibliography.json
            citations_list = [
                Citation(
                    citation_id=f"cite_{i:03d}",
                    authors=[f"Author{i}, A."],
                    year=2024,
                    title=f"Paper Title {i}",
                    source_type="journal",
                )
                for i in range(1, 11)
            ]
            db = CitationDatabase(citations=citations_list)
            bibliography_path = research_dir / "bibliography.json"
            bibliography_path.write_text(json.dumps(db.to_dict(), indent=2), encoding='utf-8')

        if completed_phase in PHASES[PHASES.index("compose"):]:
            ctx.intro_output = "# Introduction\n\n" + "ML in healthcare content. " * 100 + "{cite_001}"
            ctx.body_output = "## Methods\n\n" + "Research methodology. " * 200 + "{cite_002} {cite_003}"
            ctx.lit_review_output = "## Literature Review\n\n" + "Prior work shows. " * 100
            ctx.methodology_output = "## Methodology\n\n" + "We employed. " * 100
            ctx.results_output = "## Results\n\n" + "Our findings indicate. " * 100
            ctx.discussion_output = "## Discussion\n\n" + "These results suggest. " * 100
            ctx.conclusion_output = "## Conclusion\n\n" + "In summary. " * 50 + "{cite_004}"

        # Save checkpoint
        checkpoint_path = save_checkpoint(ctx, completed_phase, tmp_path)
        return checkpoint_path

    def test_resume_after_research_skips_research(self, tmp_path):
        """Resuming after research phase should skip research, run structure next."""
        checkpoint_path = self._create_partial_checkpoint(tmp_path, "research")

        data, completed = load_checkpoint(checkpoint_path)
        next_phase = get_next_phase(completed)

        assert completed == "research"
        assert next_phase == "structure"

        # Verify research outputs are preserved
        assert "Research Summary" in data["scout_output"]
        assert data["scout_result"] is not None
        assert len(data["scout_result"]["citations"]) == 10

    def test_resume_after_structure_skips_research_and_structure(self, tmp_path):
        """Resuming after structure should skip to citations phase."""
        checkpoint_path = self._create_partial_checkpoint(tmp_path, "structure")

        data, completed = load_checkpoint(checkpoint_path)
        next_phase = get_next_phase(completed)

        assert completed == "structure"
        assert next_phase == "citations"

        # Verify structure outputs preserved
        assert "Thesis Outline" in data["architect_output"]
        # Research should also be preserved
        assert "Research Summary" in data["scout_output"]

    def test_resume_after_citations_skips_to_compose(self, tmp_path):
        """Resuming after citations should skip to compose phase."""
        checkpoint_path = self._create_partial_checkpoint(tmp_path, "citations")

        data, completed = load_checkpoint(checkpoint_path)
        next_phase = get_next_phase(completed)

        assert completed == "citations"
        assert next_phase == "compose"

        # Verify bibliography.json exists
        bibliography_path = tmp_path / "research" / "bibliography.json"
        assert bibliography_path.exists()

        bib_data = json.loads(bibliography_path.read_text())
        assert len(bib_data["citations"]) == 10

    def test_resume_after_compose_skips_to_validate(self, tmp_path):
        """Resuming after compose should skip to validate phase."""
        checkpoint_path = self._create_partial_checkpoint(tmp_path, "compose")

        data, completed = load_checkpoint(checkpoint_path)
        next_phase = get_next_phase(completed)

        assert completed == "compose"
        assert next_phase == "validate"

        # Verify all compose outputs are preserved
        assert "Introduction" in data["intro_output"]
        assert "Methods" in data["body_output"]
        assert "Conclusion" in data["conclusion_output"]

    def test_context_restoration_matches_original(self, tmp_path):
        """Verify restored context matches what was saved."""
        # Create and save a full context
        original = DraftContext()
        original.topic = "Test Resume Topic"
        original.language = "de"
        original.academic_level = "master"
        original.author_name = "Test Author"
        original.institution = "Test University"
        original.scout_output = "Original scout output"
        original.architect_output = "Original architect output"
        original.intro_output = "Original intro with {cite_001}"
        original.folders = {
            'root': tmp_path,
            'research': tmp_path / 'research',
        }

        # Ensure directories exist
        (tmp_path / 'research').mkdir(exist_ok=True)

        save_checkpoint(original, "structure", tmp_path)

        # Load and restore
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")
        restored = DraftContext()
        restore_context(restored, data)

        # Verify all fields match
        assert restored.topic == original.topic
        assert restored.language == original.language
        assert restored.academic_level == original.academic_level
        assert restored.author_name == original.author_name
        assert restored.institution == original.institution
        assert restored.scout_output == original.scout_output
        assert restored.architect_output == original.architect_output
        assert restored.intro_output == original.intro_output

    def test_resume_with_topic_mismatch_uses_checkpoint_topic(self, tmp_path):
        """When CLI topic differs from checkpoint, checkpoint topic should be used."""
        # Create checkpoint with specific topic
        checkpoint_path = self._create_partial_checkpoint(tmp_path, "research")

        # Load checkpoint
        data, _ = load_checkpoint(checkpoint_path)

        # Simulate CLI with different topic
        cli_topic = "Different Topic From CLI"
        checkpoint_topic = data["topic"]

        assert checkpoint_topic == "Machine Learning in Healthcare"
        assert cli_topic != checkpoint_topic

        # Restore context - should use checkpoint topic
        ctx = DraftContext()
        restore_context(ctx, data)

        assert ctx.topic == checkpoint_topic
        assert ctx.topic != cli_topic

    def test_resume_preserves_citation_objects(self, tmp_path):
        """Verify Citation objects are properly serialized and restored."""
        checkpoint_path = self._create_partial_checkpoint(tmp_path, "research")

        data, _ = load_checkpoint(checkpoint_path)

        # Restore context
        ctx = DraftContext()
        restore_context(ctx, data)

        # Verify citations are Citation objects, not dicts
        citations = ctx.scout_result["citations"]
        assert len(citations) == 10

        for citation in citations:
            assert isinstance(citation, Citation)
            assert citation.id.startswith("cite_")
            assert len(citation.authors) > 0
            assert citation.year == 2024

    def test_resume_from_validate_is_almost_complete(self, tmp_path):
        """Resuming from validate means only compile is left."""
        ctx = DraftContext()
        ctx.topic = "Final Phase Test"
        ctx.folders = {'root': tmp_path}
        (tmp_path).mkdir(exist_ok=True)

        save_checkpoint(ctx, "validate", tmp_path)

        _, completed = load_checkpoint(tmp_path / "checkpoint.json")
        next_phase = get_next_phase(completed)

        assert completed == "validate"
        assert next_phase == "compile"

    def test_resume_from_compile_means_all_done(self, tmp_path):
        """Resuming from compile means pipeline is complete."""
        ctx = DraftContext()
        ctx.topic = "Complete Pipeline Test"
        ctx.folders = {'root': tmp_path}
        (tmp_path).mkdir(exist_ok=True)

        save_checkpoint(ctx, "compile", tmp_path)

        _, completed = load_checkpoint(tmp_path / "checkpoint.json")
        next_phase = get_next_phase(completed)

        assert completed == "compile"
        assert next_phase is None  # No more phases


class TestLoadWithVariousTopics:
    """Test checkpoint/quality gate with various topic types and languages."""

    @pytest.fixture
    def base_context(self, tmp_path):
        """Create a base context for topic testing."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}
        ctx.folders = {'root': tmp_path}
        tmp_path.mkdir(exist_ok=True)
        return ctx

    def test_technical_topic(self, base_context, tmp_path):
        """Test with technical/scientific topic."""
        base_context.topic = "Quantum Computing Applications in Cryptography: A Systematic Review"
        base_context.scout_output = "# Research on Quantum Cryptography\n\nShor's algorithm..."

        save_checkpoint(base_context, "research", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        assert "Quantum" in data["topic"]

    def test_humanities_topic(self, base_context, tmp_path):
        """Test with humanities topic."""
        base_context.topic = "The Influence of Renaissance Art on Modern Visual Culture"
        base_context.scout_output = "# Art History Research\n\nDa Vinci's influence..."

        save_checkpoint(base_context, "research", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        assert "Renaissance" in data["topic"]

    def test_german_topic(self, base_context, tmp_path):
        """Test with German language topic."""
        base_context.topic = "Künstliche Intelligenz in der deutschen Industrie 4.0"
        base_context.language = "de"
        base_context.language_name = "German"
        base_context.scout_output = "# Forschung über KI\n\nDie Auswirkungen..."

        save_checkpoint(base_context, "research", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        assert "Künstliche" in data["topic"]
        assert data["language"] == "de"

    def test_chinese_topic(self, base_context, tmp_path):
        """Test with Chinese characters in topic."""
        base_context.topic = "人工智能在医疗诊断中的应用研究"
        base_context.language = "zh"
        base_context.language_name = "Chinese"
        base_context.scout_output = "# 研究摘要\n\n深度学习方法..."

        save_checkpoint(base_context, "research", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        assert "人工智能" in data["topic"]
        assert data["language"] == "zh"

    def test_long_topic(self, base_context, tmp_path):
        """Test with very long topic."""
        base_context.topic = (
            "A Comprehensive Analysis of Machine Learning Techniques for "
            "Predictive Modeling in Healthcare: Comparing Deep Learning, "
            "Traditional Statistical Methods, and Hybrid Approaches for "
            "Early Disease Detection and Prognosis"
        )

        save_checkpoint(base_context, "research", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        assert len(data["topic"]) > 200
        assert "Comprehensive" in data["topic"]

    def test_special_characters_in_topic(self, base_context, tmp_path):
        """Test topic with special characters."""
        base_context.topic = "C++ vs Rust: A Performance Analysis of Memory-Safe Languages (2024)"

        save_checkpoint(base_context, "research", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        assert "C++" in data["topic"]
        assert "(2024)" in data["topic"]

    def test_emoji_in_output(self, base_context, tmp_path):
        """Test outputs containing emojis."""
        base_context.topic = "Social Media Analysis"
        base_context.scout_output = "# Research 🔬\n\nTrending topics 📈 include..."

        save_checkpoint(base_context, "research", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        assert "🔬" in data["scout_output"]
        assert "📈" in data["scout_output"]
