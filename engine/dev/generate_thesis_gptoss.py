#!/usr/bin/env python3
"""
Generate thesis using fully open source stack:
- GPT-OSS 120B via Groq for content generation
- Serper.dev for web search (replaces Gemini Grounded)
- Crossref + Semantic Scholar for citations
- Firecrawl for URL scraping (replaces crawl4ai)

This is a Gemini-free pipeline for cost comparison.
"""
import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime

# Setup paths
ENGINE_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = ENGINE_DIR.parent
os.chdir(ENGINE_DIR)
sys.path.insert(0, str(ENGINE_DIR))

# Global tracking stats
TRACKING_STATS = {
    "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
    "provider": "groq",
    "web_search": "serper",
    "llm_calls": 0,
    "input_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0,
    "calls_detail": [],
    "start_time": None,
    "end_time": None,
}


def patch_model_setup():
    """Patch agent_runner.setup_model to return GroqModel with Llama 4 Maverick."""
    from utils.groq_adapter import GroqModel
    import utils.agent_runner as agent_runner

    def llama4_setup_model(model_override=None):
        """Return Llama 4 Maverick model via Groq (128K context)."""
        print("  Using Llama 4 Maverick via Groq (128K context)")
        return GroqModel(
            model_name="meta-llama/llama-4-maverick-17b-128e-instruct",
            temperature=0.7,
            max_tokens=8192,
        )

    agent_runner.setup_model = llama4_setup_model
    print("Patched setup_model to use Groq/Llama 4 Maverick (128K context)")


def patch_orchestrator_for_serper():
    """Patch citation orchestrator to use Serper instead of Gemini Grounded."""
    from utils.api_citations import orchestrator

    _original_init = orchestrator.CitationResearcher.__init__

    def patched_init(self, *args, **kwargs):
        # Force use_serper=True
        kwargs['use_serper'] = True
        kwargs['enable_llm_fallback'] = False  # Don't use Gemini as fallback
        return _original_init(self, *args, **kwargs)

    orchestrator.CitationResearcher.__init__ = patched_init
    print("Patched CitationResearcher to use Serper.dev")


def patch_citation_threshold():
    """Use research_paper level for testing (requires only 10 citations, 7 minimal)."""
    # Note: We'll use academic_level='research_paper' in generate_draft call
    # This lowers requirements from master (25 citations) to research_paper (10 citations)
    print("Using academic_level='research_paper' for testing (10 citations, 7 minimal)")


def patch_tracking():
    """Patch GroqModel to track all API calls."""
    from utils.groq_adapter import GroqModel

    _original_generate = GroqModel.generate_content

    def tracked_generate(self, prompt, generation_config=None):
        global TRACKING_STATS

        call_start = time.time()
        response = _original_generate(self, prompt, generation_config=generation_config)
        call_duration = time.time() - call_start

        TRACKING_STATS["llm_calls"] += 1

        input_tokens = response.usage_metadata.prompt_token_count
        output_tokens = response.usage_metadata.candidates_token_count

        TRACKING_STATS["input_tokens"] += input_tokens
        TRACKING_STATS["output_tokens"] += output_tokens
        TRACKING_STATS["total_tokens"] += (input_tokens + output_tokens)

        TRACKING_STATS["calls_detail"].append({
            "call_number": TRACKING_STATS["llm_calls"],
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "duration_seconds": round(call_duration, 2),
            "timestamp": datetime.now().isoformat()
        })

        print(f"  GPT-OSS Call #{TRACKING_STATS['llm_calls']}: {input_tokens:,} in + {output_tokens:,} out ({call_duration:.1f}s)")

        return response

    GroqModel.generate_content = tracked_generate
    print("GPT-OSS API tracking enabled")


def print_final_stats():
    """Print comprehensive usage statistics."""
    global TRACKING_STATS

    TRACKING_STATS["end_time"] = datetime.now().isoformat()
    duration = time.time() - TRACKING_STATS["_start_timestamp"]

    print("\n" + "=" * 70)
    print("LLAMA 4 MAVERICK - FINAL API USAGE REPORT")
    print("=" * 70)

    print("\nLLM API USAGE:")
    print(f"   Model:               {TRACKING_STATS['model']}")
    print(f"   Web Search:          {TRACKING_STATS['web_search']}")
    print(f"   Total API Calls:     {TRACKING_STATS['llm_calls']:,}")
    print(f"   Input Tokens:        {TRACKING_STATS['input_tokens']:,}")
    print(f"   Output Tokens:       {TRACKING_STATS['output_tokens']:,}")
    print(f"   TOTAL TOKENS:        {TRACKING_STATS['total_tokens']:,}")

    # Estimate cost (GPT-OSS 120B on Groq: $0.15/1M input, $0.75/1M output)
    input_cost = (TRACKING_STATS['input_tokens'] / 1_000_000) * 0.15
    output_cost = (TRACKING_STATS['output_tokens'] / 1_000_000) * 0.75
    total_cost = input_cost + output_cost
    print(f"   Estimated Cost:      ${total_cost:.4f}")

    # Compare to Gemini pricing ($0.50/1M input, $3.00/1M output)
    gemini_input_cost = (TRACKING_STATS['input_tokens'] / 1_000_000) * 0.50
    gemini_output_cost = (TRACKING_STATS['output_tokens'] / 1_000_000) * 3.00
    gemini_total = gemini_input_cost + gemini_output_cost

    if gemini_total > 0:
        savings = gemini_total - total_cost
        print(f"   Gemini would cost:   ${gemini_total:.4f}")
        print(f"   SAVINGS:             ${savings:.4f} ({(savings/gemini_total*100):.0f}%)")

    print(f"\n   Total Duration:      {duration:.1f} seconds ({duration/60:.1f} minutes)")

    print("\n" + "=" * 70)

    # Save stats to JSON
    stats_file = PROJECT_ROOT / "thesis_gptoss_stats.json"
    with open(stats_file, 'w') as f:
        json.dump(TRACKING_STATS, f, indent=2, default=str)
    print(f"Stats saved to: {stats_file}")

    return TRACKING_STATS


def main():
    global TRACKING_STATS

    print("=" * 70)
    print("OPENDRAFT THESIS GENERATOR - LLAMA 4 MAVERICK + SERPER")
    print("Fully Open Source / Gemini-Free Pipeline (128K context)")
    print("=" * 70)
    print()

    # Enable patches BEFORE importing draft_generator
    patch_model_setup()
    patch_orchestrator_for_serper()
    patch_citation_threshold()
    patch_tracking()

    TRACKING_STATS["start_time"] = datetime.now().isoformat()
    TRACKING_STATS["_start_timestamp"] = time.time()

    # Now import and run
    from draft_generator import generate_draft

    # Same topic as Gemini test
    topic = """The Impact of Artificial Intelligence on Healthcare Diagnostics: A Systematic Review of Machine Learning Applications in Medical Imaging"""

    OUTPUT_DIR = PROJECT_ROOT / "thesis_gptoss_test"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\nTopic: {topic[:80]}...")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Model: Llama 4 Maverick via Groq (128K context)")
    print(f"Web Search: Serper.dev")
    print("\n" + "-" * 70)
    print("Starting generation...")
    print("-" * 70 + "\n")

    try:
        pdf_path, docx_path = generate_draft(
            topic=topic,
            language="en",
            academic_level="research_paper",  # Lower threshold for testing (10 citations vs 25)
            output_dir=OUTPUT_DIR,
            skip_validation=True,
            verbose=True
        )

        print("\nGeneration complete!")
        print(f"   PDF: {pdf_path}")
        print(f"   DOCX: {docx_path}")

    except Exception as e:
        print(f"\nGeneration failed: {e}")
        import traceback
        traceback.print_exc()

    # Print final stats regardless of success/failure
    print_final_stats()


if __name__ == "__main__":
    main()
