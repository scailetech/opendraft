#!/usr/bin/env python3
"""Tests for checkpoint save/load/restore functionality."""

import json
import pytest
from pathlib import Path
from unittest.mock import MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.checkpoint import (
    save_checkpoint,
    load_checkpoint,
    restore_context,
    get_next_phase,
    PHASES,
)
from phases.context import DraftContext


@pytest.fixture
def mock_context():
    """Create a mock DraftContext with test data."""
    ctx = DraftContext()
    ctx.topic = "Test Topic"
    ctx.language = "en"
    ctx.academic_level = "master"
    ctx.output_type = "full"
    ctx.citation_style = "apa"
    ctx.verbose = False
    ctx.skip_validation = True
    ctx.blurb = "Test blurb"
    
    # Set phase outputs
    ctx.scout_output = "Scout output text"
    ctx.architect_output = "# Outline\n## Section 1"
    ctx.intro_output = "Introduction text with {cite_001}"
    ctx.body_output = "Body text content"
    ctx.conclusion_output = "Conclusion text"
    ctx.citation_summary = "Citation summary"
    
    # Mock folders
    ctx.folders = {
        'root': Path('/tmp/test'),
        'research': Path('/tmp/test/research'),
        'drafts': Path('/tmp/test/drafts'),
    }
    
    ctx.word_targets = {'min_citations': 10}
    ctx.language_name = "English"
    ctx.language_instruction = "Write in English"
    
    return ctx


class TestGetNextPhase:
    """Test phase ordering logic."""
    
    def test_phases_order(self):
        """Verify PHASES constant has correct order."""
        assert PHASES == ["research", "structure", "citations", "compose", "validate", "compile"]
    
    def test_next_after_research(self):
        assert get_next_phase("research") == "structure"
    
    def test_next_after_structure(self):
        assert get_next_phase("structure") == "citations"
    
    def test_next_after_citations(self):
        assert get_next_phase("citations") == "compose"
    
    def test_next_after_compose(self):
        assert get_next_phase("compose") == "validate"
    
    def test_next_after_validate(self):
        assert get_next_phase("validate") == "compile"
    
    def test_next_after_compile(self):
        """No phase after compile."""
        assert get_next_phase("compile") is None
    
    def test_unknown_phase(self):
        """Unknown phase should start from beginning."""
        assert get_next_phase("unknown") == "research"


class TestSaveLoadCheckpoint:
    """Test checkpoint save and load."""
    
    def test_save_checkpoint(self, mock_context, tmp_path):
        """Test saving checkpoint creates valid JSON."""
        checkpoint_path = save_checkpoint(mock_context, "research", tmp_path)
        
        assert checkpoint_path.exists()
        assert checkpoint_path.name == "checkpoint.json"
        
        data = json.loads(checkpoint_path.read_text())
        assert data["completed_phase"] == "research"
        assert data["topic"] == "Test Topic"
        assert data["language"] == "en"
        assert data["scout_output"] == "Scout output text"
    
    def test_load_checkpoint(self, mock_context, tmp_path):
        """Test loading checkpoint returns correct data."""
        save_checkpoint(mock_context, "structure", tmp_path)
        
        data, phase = load_checkpoint(tmp_path / "checkpoint.json")
        
        assert phase == "structure"
        assert data["topic"] == "Test Topic"
        assert data["architect_output"] == "# Outline\n## Section 1"
    
    def test_load_nonexistent_checkpoint(self, tmp_path):
        """Test loading nonexistent checkpoint raises error."""
        with pytest.raises(FileNotFoundError):
            load_checkpoint(tmp_path / "nonexistent.json")


class TestRestoreContext:
    """Test context restoration from checkpoint."""
    
    def test_restore_basic_fields(self, mock_context, tmp_path):
        """Test restoring basic string fields."""
        save_checkpoint(mock_context, "compose", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")
        
        # Create new empty context
        new_ctx = DraftContext()
        restore_context(new_ctx, data)
        
        assert new_ctx.topic == "Test Topic"
        assert new_ctx.language == "en"
        assert new_ctx.academic_level == "master"
        assert new_ctx.blurb == "Test blurb"
    
    def test_restore_phase_outputs(self, mock_context, tmp_path):
        """Test restoring phase output strings."""
        save_checkpoint(mock_context, "compose", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")
        
        new_ctx = DraftContext()
        restore_context(new_ctx, data)
        
        assert new_ctx.scout_output == "Scout output text"
        assert new_ctx.architect_output == "# Outline\n## Section 1"
        assert new_ctx.intro_output == "Introduction text with {cite_001}"
    
    def test_restore_folders_as_paths(self, mock_context, tmp_path):
        """Test folders are restored as Path objects."""
        save_checkpoint(mock_context, "research", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")
        
        new_ctx = DraftContext()
        restore_context(new_ctx, data)
        
        assert isinstance(new_ctx.folders['root'], Path)
        assert str(new_ctx.folders['root']) == "/tmp/test"
