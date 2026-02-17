#!/usr/bin/env python3
"""
LIVE API Integration Tests - Uses actual Gemini API.

These tests make REAL API calls to verify:
1. Checkpoint/resume works with actual LLM outputs
2. Quality gate correctly scores real AI-generated content
3. Full mini-pipeline can be interrupted and resumed

Requires: GOOGLE_API_KEY or GEMINI_API_KEY environment variable

Run with: pytest tests/test_live_api_integration.py -v
Skip with: pytest tests/ --ignore=tests/test_live_api_integration.py
"""

import os
import sys
import json
import time
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

# Skip all tests if no API key
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    # Try to load from config file
    config_file = Path.home() / ".opendraft" / "config.json"
    if config_file.exists():
        try:
            config = json.loads(config_file.read_text())
            GEMINI_API_KEY = config.get("google_api_key")
        except:
            pass

pytestmark = pytest.mark.skipif(
    not GEMINI_API_KEY,
    reason="No GOOGLE_API_KEY or GEMINI_API_KEY - skipping live API tests"
)


@pytest.fixture(scope="module")
def gemini_model():
    """Create Gemini model for tests."""
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

    from google import genai
    from utils.gemini_client import GeminiModelWrapper

    client = genai.Client(api_key=GEMINI_API_KEY)
    model = GeminiModelWrapper(
        client=client,
        model_name="gemini-2.5-flash",  # Fast, available model for tests
        temperature=0.7,
    )
    return model


class TestLiveAPIBasic:
    """Basic API connectivity tests."""

    def test_api_connection(self, gemini_model):
        """Verify we can make a basic API call."""
        response = gemini_model.generate_content("Say 'API connection successful' and nothing else.")
        assert response.text is not None
        assert len(response.text) > 0

    def test_api_returns_academic_content(self, gemini_model):
        """Verify API can generate academic-style content."""
        prompt = """Write a single paragraph (50-100 words) about machine learning
        in an academic style. Include one in-text citation like {cite_001}."""

        response = gemini_model.generate_content(prompt)
        text = response.text

        assert len(text) > 100, f"Response too short: {len(text)} chars"
        # Should contain academic-style content
        assert any(word in text.lower() for word in ["machine", "learning", "data", "model", "algorithm"])


class TestLiveCheckpointWithRealContent:
    """Test checkpoint/resume with actual LLM-generated content."""

    def test_checkpoint_preserves_llm_output(self, gemini_model, tmp_path):
        """Verify checkpoint correctly saves and restores real LLM output."""
        from utils.checkpoint import save_checkpoint, load_checkpoint, restore_context
        from phases.context import DraftContext

        # Generate real content
        prompt = """Write an academic introduction paragraph (100-150 words) about
        artificial intelligence in healthcare. Include citations like {cite_001} and {cite_002}."""

        response = gemini_model.generate_content(prompt)
        original_text = response.text

        # Create context with real content
        ctx = DraftContext()
        ctx.topic = "AI in Healthcare"
        ctx.language = "en"
        ctx.academic_level = "research_paper"
        ctx.folders = {'root': tmp_path}
        ctx.intro_output = original_text
        ctx.scout_output = f"Research completed at {time.time()}"

        # Save checkpoint
        save_checkpoint(ctx, "compose", tmp_path)

        # Load and restore
        data, completed = load_checkpoint(tmp_path / "checkpoint.json")
        restored_ctx = DraftContext()
        restore_context(restored_ctx, data)

        # Verify content preserved exactly
        assert restored_ctx.intro_output == original_text
        assert restored_ctx.topic == "AI in Healthcare"
        assert completed == "compose"

    def test_multiple_llm_outputs_checkpoint(self, gemini_model, tmp_path):
        """Test checkpoint with multiple LLM-generated sections."""
        from utils.checkpoint import save_checkpoint, load_checkpoint, restore_context
        from phases.context import DraftContext

        # Generate multiple sections
        sections = {}

        prompts = {
            "intro": "Write a 50-word academic introduction about climate change. Include {cite_001}.",
            "methods": "Write a 50-word methodology section about data analysis. Include {cite_002}.",
            "conclusion": "Write a 50-word conclusion about environmental policy. Include {cite_003}.",
        }

        for name, prompt in prompts.items():
            response = gemini_model.generate_content(prompt)
            sections[name] = response.text
            time.sleep(0.5)  # Rate limiting

        # Create context
        ctx = DraftContext()
        ctx.topic = "Climate Change Policy"
        ctx.folders = {'root': tmp_path}
        ctx.intro_output = sections["intro"]
        ctx.methodology_output = sections["methods"]
        ctx.conclusion_output = sections["conclusion"]

        # Save and restore
        save_checkpoint(ctx, "compose", tmp_path)
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        restored = DraftContext()
        restore_context(restored, data)

        # All sections preserved
        assert restored.intro_output == sections["intro"]
        assert restored.methodology_output == sections["methods"]
        assert restored.conclusion_output == sections["conclusion"]


class TestLiveQualityGate:
    """Test quality gate with real LLM-generated content."""

    def test_quality_gate_scores_real_content(self, gemini_model):
        """Verify quality gate can score real LLM output."""
        from utils.quality_gate import score_draft_quality
        from phases.context import DraftContext

        # Generate substantial content
        intro_prompt = """Write an academic introduction (200-300 words) about renewable energy.
        Include proper academic structure with:
        - Background context
        - Research gap
        - Research questions
        Include citations: {cite_001}, {cite_002}, {cite_003}"""

        body_prompt = """Write an academic body section (300-400 words) about solar energy technology.
        Include:
        - Literature review
        - Technical details
        Include citations: {cite_004}, {cite_005}, {cite_006}, {cite_007}"""

        conclusion_prompt = """Write an academic conclusion (100-150 words) summarizing
        findings about renewable energy adoption. Include {cite_008}."""

        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 8}

        # Generate each section
        ctx.intro_output = gemini_model.generate_content(intro_prompt).text
        time.sleep(0.5)
        ctx.body_output = gemini_model.generate_content(body_prompt).text
        time.sleep(0.5)
        ctx.conclusion_output = gemini_model.generate_content(conclusion_prompt).text

        # Add stub sections for completeness
        ctx.lit_review_output = "Literature review content." * 20
        ctx.methodology_output = "Methodology content." * 20
        ctx.results_output = "Results content." * 20
        ctx.discussion_output = "Discussion content." * 20

        # Score
        result = score_draft_quality(ctx)

        # Real content should score reasonably well
        assert result.total_score > 30, f"Score too low for real content: {result.total_score}"
        assert result.structure_score > 5, f"Structure score too low: {result.structure_score}"

        print(f"\nReal content quality score: {result.total_score}/100")
        print(f"  Word count: {result.word_count_score}/25")
        print(f"  Citations: {result.citation_score}/25")
        print(f"  Completeness: {result.completeness_score}/25")
        print(f"  Structure: {result.structure_score}/25")


class TestLiveMiniPipeline:
    """Test mini pipeline execution with real API."""

    def test_research_to_checkpoint(self, gemini_model, tmp_path):
        """Run research-like phase and checkpoint the result."""
        from utils.checkpoint import save_checkpoint, load_checkpoint
        from phases.context import DraftContext

        # Simulate research phase output
        research_prompt = """You are a research assistant. For the topic "Machine Learning in Finance":

        1. List 5 key research areas (one line each)
        2. Identify 3 research gaps
        3. Suggest a thesis structure

        Format with markdown headers."""

        response = gemini_model.generate_content(research_prompt)

        ctx = DraftContext()
        ctx.topic = "Machine Learning in Finance"
        ctx.language = "en"
        ctx.academic_level = "master"
        ctx.folders = {'root': tmp_path}
        ctx.scout_output = response.text

        # Checkpoint after "research"
        save_checkpoint(ctx, "research", tmp_path)

        # Verify checkpoint
        data, phase = load_checkpoint(tmp_path / "checkpoint.json")
        assert phase == "research"
        assert "Machine Learning" in data["scout_output"] or "machine learning" in data["scout_output"].lower()

    def test_resume_continues_from_checkpoint(self, gemini_model, tmp_path):
        """Test that resume loads checkpoint and continues correctly."""
        from utils.checkpoint import save_checkpoint, load_checkpoint, restore_context, get_next_phase
        from phases.context import DraftContext

        # Phase 1: Research
        ctx = DraftContext()
        ctx.topic = "Quantum Computing Applications"
        ctx.folders = {'root': tmp_path}
        ctx.scout_output = gemini_model.generate_content(
            "List 3 applications of quantum computing in one sentence each."
        ).text

        save_checkpoint(ctx, "research", tmp_path)

        # Simulate crash/restart...

        # Phase 2: Resume and continue to structure
        data, completed = load_checkpoint(tmp_path / "checkpoint.json")
        assert completed == "research"

        # Restore context
        resumed_ctx = DraftContext()
        restore_context(resumed_ctx, data)

        # Verify research output preserved
        assert len(resumed_ctx.scout_output) > 50

        # Continue to next phase
        next_phase = get_next_phase(completed)
        assert next_phase == "structure"

        # Generate structure based on research
        structure_prompt = f"""Based on this research:
        {resumed_ctx.scout_output[:500]}

        Create a thesis outline with 5 chapters. Use markdown headers."""

        resumed_ctx.architect_output = gemini_model.generate_content(structure_prompt).text

        # Save structure checkpoint
        save_checkpoint(resumed_ctx, "structure", tmp_path)

        # Verify progression
        data2, phase2 = load_checkpoint(tmp_path / "checkpoint.json")
        assert phase2 == "structure"
        assert "#" in data2["architect_output"]  # Has markdown headers


class TestLiveEdgeCases:
    """Test edge cases with real API responses."""

    def test_llm_unicode_output(self, gemini_model, tmp_path):
        """Test checkpoint handles LLM output with unicode."""
        from utils.checkpoint import save_checkpoint, load_checkpoint, restore_context
        from phases.context import DraftContext

        prompt = """Write one sentence in each language about AI:
        1. English
        2. German (Deutsch)
        3. Japanese (日本語)
        4. Arabic (العربية)
        Include emojis: 🤖 🧠 💡"""

        response = gemini_model.generate_content(prompt)

        ctx = DraftContext()
        ctx.topic = "Multilingual AI"
        ctx.folders = {'root': tmp_path}
        ctx.scout_output = response.text

        save_checkpoint(ctx, "research", tmp_path)

        # Restore and verify unicode preserved
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")
        restored = DraftContext()
        restore_context(restored, data)

        # Check some unicode survived
        original_text = response.text
        assert restored.scout_output == original_text

    def test_llm_long_output(self, gemini_model, tmp_path):
        """Test checkpoint handles longer LLM output."""
        from utils.checkpoint import save_checkpoint, load_checkpoint, restore_context
        from phases.context import DraftContext

        prompt = """Write a detailed 500-word essay about the history of artificial intelligence.
        Include the following sections:
        1. Early beginnings (1950s)
        2. AI winters
        3. Modern deep learning era
        4. Future prospects

        Use proper academic language."""

        response = gemini_model.generate_content(prompt)

        ctx = DraftContext()
        ctx.topic = "History of AI"
        ctx.folders = {'root': tmp_path}
        ctx.intro_output = response.text

        save_checkpoint(ctx, "compose", tmp_path)

        # Verify long content preserved
        data, _ = load_checkpoint(tmp_path / "checkpoint.json")
        assert len(data["intro_output"]) > 500  # At least 500 chars


class TestLiveResumeWorkflow:
    """Full resume workflow with real API."""

    def test_full_mini_pipeline_with_interrupt_simulation(self, gemini_model, tmp_path):
        """
        Simulate full pipeline with interrupt at each phase.

        This is the gold standard test: real API calls, real checkpoints,
        real resume logic.
        """
        from utils.checkpoint import save_checkpoint, load_checkpoint, restore_context, get_next_phase, PHASES
        from phases.context import DraftContext

        topic = "Impact of Social Media on Mental Health"

        # Track phases completed
        completed_phases = []

        for target_phase_idx in range(4):  # Test interrupt at first 4 phases
            target_phase = PHASES[target_phase_idx]

            # Start fresh or resume
            checkpoint_path = tmp_path / "checkpoint.json"

            if checkpoint_path.exists():
                data, last_completed = load_checkpoint(checkpoint_path)
                ctx = DraftContext()
                restore_context(ctx, data)
                start_idx = PHASES.index(last_completed) + 1
            else:
                ctx = DraftContext()
                ctx.topic = topic
                ctx.language = "en"
                ctx.academic_level = "research_paper"
                ctx.word_targets = {'min_citations': 5}
                ctx.folders = {'root': tmp_path}
                start_idx = 0

            # Run one phase
            current_phase = PHASES[start_idx] if start_idx < len(PHASES) else None

            if current_phase == "research":
                ctx.scout_output = gemini_model.generate_content(
                    f"List 5 key findings about: {topic}"
                ).text
                save_checkpoint(ctx, "research", tmp_path)
                completed_phases.append("research")

            elif current_phase == "structure":
                ctx.architect_output = gemini_model.generate_content(
                    f"Create 4-chapter outline for: {topic}"
                ).text
                save_checkpoint(ctx, "structure", tmp_path)
                completed_phases.append("structure")

            elif current_phase == "citations":
                ctx.citation_summary = f"5 citations about {topic}"
                save_checkpoint(ctx, "citations", tmp_path)
                completed_phases.append("citations")

            elif current_phase == "compose":
                ctx.intro_output = gemini_model.generate_content(
                    f"Write 100-word intro about: {topic}. Include {{cite_001}}."
                ).text
                ctx.body_output = "Body content. " * 50
                ctx.conclusion_output = "Conclusion. " * 20
                save_checkpoint(ctx, "compose", tmp_path)
                completed_phases.append("compose")

            time.sleep(0.3)  # Rate limiting

        # Verify we progressed through phases
        assert len(completed_phases) >= 3, f"Only completed: {completed_phases}"

        # Final checkpoint should be at compose
        data, final_phase = load_checkpoint(checkpoint_path)
        assert final_phase == "compose"
        assert len(data["intro_output"]) > 50
        assert data["topic"] == topic

        print(f"\nCompleted phases: {completed_phases}")
        print(f"Final checkpoint: {final_phase}")
