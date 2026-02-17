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
    _serialize_scout_result,
    _deserialize_scout_result,
)
from phases.context import DraftContext
from utils.citation_database import Citation


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


class TestCitationSerialization:
    """Test Citation object serialization roundtrip."""

    def test_serialize_citation_objects(self):
        """Test that Citation objects serialize to dicts."""
        citation = Citation(
            citation_id="cite_001",
            authors=["Smith, J.", "Doe, A."],
            year=2024,
            title="Test Paper Title",
            source_type="journal",
            journal="Test Journal",
            doi="10.1234/test",
        )

        scout_result = {
            "citations": [citation],
            "other_data": "preserved"
        }

        serialized = _serialize_scout_result(scout_result)

        assert serialized["other_data"] == "preserved"
        assert isinstance(serialized["citations"][0], dict)
        assert serialized["citations"][0]["id"] == "cite_001"
        assert serialized["citations"][0]["authors"] == ["Smith, J.", "Doe, A."]

    def test_deserialize_citation_dicts(self):
        """Test that citation dicts deserialize to Citation objects."""
        scout_result = {
            "citations": [{
                "id": "cite_001",
                "authors": ["Smith, J."],
                "year": 2024,
                "title": "Test Paper",
                "source_type": "journal",
                "language": "english",
            }],
            "other_data": "preserved"
        }

        deserialized = _deserialize_scout_result(scout_result)

        assert deserialized["other_data"] == "preserved"
        assert isinstance(deserialized["citations"][0], Citation)
        assert deserialized["citations"][0].id == "cite_001"
        assert deserialized["citations"][0].authors == ["Smith, J."]

    def test_citation_roundtrip(self):
        """Test full serialize -> deserialize roundtrip preserves data."""
        original_citation = Citation(
            citation_id="cite_042",
            authors=["Alice, B.", "Charlie, D.", "Eve, F."],
            year=2023,
            title="Roundtrip Test Paper",
            source_type="conference",
            journal=None,
            publisher="Test Publisher",
            doi="10.5678/roundtrip",
            url="https://example.com/paper",
            abstract="This is a test abstract.",
        )

        scout_result = {"citations": [original_citation]}

        serialized = _serialize_scout_result(scout_result)
        deserialized = _deserialize_scout_result(serialized)

        restored = deserialized["citations"][0]

        assert restored.id == original_citation.id
        assert restored.authors == original_citation.authors
        assert restored.year == original_citation.year
        assert restored.title == original_citation.title
        assert restored.source_type == original_citation.source_type
        assert restored.doi == original_citation.doi

    def test_empty_scout_result(self):
        """Test handling of None/empty scout_result."""
        assert _serialize_scout_result(None) is None
        assert _deserialize_scout_result(None) is None
        assert _serialize_scout_result({}) == {}
        assert _deserialize_scout_result({}) == {}
