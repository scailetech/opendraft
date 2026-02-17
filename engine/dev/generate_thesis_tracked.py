#!/usr/bin/env python3
"""
Generate thesis with FULL API tracking - tokens, requests, everything.
"""
import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from functools import wraps

# Setup paths
ENGINE_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = ENGINE_DIR.parent
os.chdir(ENGINE_DIR)
sys.path.insert(0, str(ENGINE_DIR))

# Global tracking stats
TRACKING_STATS = {
    "gemini_calls": 0,
    "gemini_input_tokens": 0,
    "gemini_output_tokens": 0,
    "gemini_total_tokens": 0,
    "gemini_calls_detail": [],
    "crossref_requests": 0,
    "semantic_scholar_requests": 0,
    "gemini_grounded_requests": 0,
    "serper_requests": 0,
    "total_api_requests": 0,
    "start_time": None,
    "end_time": None,
}

# Patch Gemini wrapper to track all calls
from utils.gemini_client import GeminiModelWrapper

_original_generate_content = None

def track_generate_content(self, *args, **kwargs):
    """Wrapper to track Gemini API calls and token usage."""
    global TRACKING_STATS, _original_generate_content

    call_start = time.time()
    response = _original_generate_content(self, *args, **kwargs)
    call_duration = time.time() - call_start

    TRACKING_STATS["gemini_calls"] += 1

    # Extract token usage from response
    input_tokens = 0
    output_tokens = 0

    if hasattr(response, 'usage_metadata'):
        meta = response.usage_metadata
        input_tokens = (
            getattr(meta, 'prompt_token_count', 0)
            or getattr(meta, 'input_tokens', 0)
            or 0
        )
        output_tokens = (
            getattr(meta, 'candidates_token_count', 0)
            or getattr(meta, 'output_tokens', 0)
            or getattr(meta, 'output_token_count', 0)
            or 0
        )

    TRACKING_STATS["gemini_input_tokens"] += input_tokens
    TRACKING_STATS["gemini_output_tokens"] += output_tokens
    TRACKING_STATS["gemini_total_tokens"] += (input_tokens + output_tokens)

    TRACKING_STATS["gemini_calls_detail"].append({
        "call_number": TRACKING_STATS["gemini_calls"],
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "duration_seconds": round(call_duration, 2),
        "timestamp": datetime.now().isoformat()
    })

    print(f"  📊 Gemini Call #{TRACKING_STATS['gemini_calls']}: {input_tokens:,} in + {output_tokens:,} out = {input_tokens + output_tokens:,} tokens ({call_duration:.1f}s)")

    return response

def patch_gemini():
    """Patch Gemini model wrapper to track all API calls."""
    global _original_generate_content
    _original_generate_content = GeminiModelWrapper.generate_content
    GeminiModelWrapper.generate_content = track_generate_content
    print("✅ Gemini API tracking enabled")

# Patch citation APIs
def patch_citation_apis():
    """Patch citation research APIs to track requests."""
    global TRACKING_STATS

    # Patch Crossref
    try:
        from utils.api_citations import crossref
        _original_crossref_search = crossref.CrossrefClient.search

        @wraps(_original_crossref_search)
        def tracked_crossref_search(self, *args, **kwargs):
            TRACKING_STATS["crossref_requests"] += 1
            TRACKING_STATS["total_api_requests"] += 1
            return _original_crossref_search(self, *args, **kwargs)

        crossref.CrossrefClient.search = tracked_crossref_search
        print("✅ Crossref API tracking enabled")
    except Exception as e:
        print(f"⚠️  Crossref tracking failed: {e}")

    # Patch Semantic Scholar
    try:
        from utils.api_citations import semantic_scholar
        _original_ss_search = semantic_scholar.SemanticScholarClient.search

        @wraps(_original_ss_search)
        def tracked_ss_search(self, *args, **kwargs):
            TRACKING_STATS["semantic_scholar_requests"] += 1
            TRACKING_STATS["total_api_requests"] += 1
            return _original_ss_search(self, *args, **kwargs)

        semantic_scholar.SemanticScholarClient.search = tracked_ss_search
        print("✅ Semantic Scholar API tracking enabled")
    except Exception as e:
        print(f"⚠️  Semantic Scholar tracking failed: {e}")

    # Patch Gemini Grounded
    try:
        from utils.api_citations import gemini_grounded
        _original_gg_search = gemini_grounded.GeminiGroundedClient.search

        @wraps(_original_gg_search)
        def tracked_gg_search(self, *args, **kwargs):
            TRACKING_STATS["gemini_grounded_requests"] += 1
            TRACKING_STATS["total_api_requests"] += 1
            return _original_gg_search(self, *args, **kwargs)

        gemini_grounded.GeminiGroundedClient.search = tracked_gg_search
        print("✅ Gemini Grounded API tracking enabled")
    except Exception as e:
        print(f"⚠️  Gemini Grounded tracking failed: {e}")

    # Patch Serper
    try:
        from utils.api_citations import serper_client
        _original_serper_search = serper_client.SerperClient.search_paper

        @wraps(_original_serper_search)
        def tracked_serper_search(self, *args, **kwargs):
            TRACKING_STATS["serper_requests"] += 1
            TRACKING_STATS["total_api_requests"] += 1
            return _original_serper_search(self, *args, **kwargs)

        serper_client.SerperClient.search_paper = tracked_serper_search
        print("✅ Serper API tracking enabled")
    except Exception as e:
        print(f"⚠️  Serper tracking failed: {e}")

def print_final_stats():
    """Print comprehensive usage statistics."""
    global TRACKING_STATS

    TRACKING_STATS["end_time"] = datetime.now().isoformat()
    duration = time.time() - TRACKING_STATS["_start_timestamp"]

    print("\n" + "=" * 70)
    print("📊 FINAL API USAGE REPORT - 100% ACCURATE TRACKING")
    print("=" * 70)

    print("\n🤖 GEMINI API USAGE:")
    print(f"   Total API Calls:     {TRACKING_STATS['gemini_calls']:,}")
    print(f"   Input Tokens:        {TRACKING_STATS['gemini_input_tokens']:,}")
    print(f"   Output Tokens:       {TRACKING_STATS['gemini_output_tokens']:,}")
    print(f"   TOTAL TOKENS:        {TRACKING_STATS['gemini_total_tokens']:,}")

    # Estimate cost (Gemini Flash pricing: $0.075/1M input, $0.30/1M output)
    input_cost = (TRACKING_STATS['gemini_input_tokens'] / 1_000_000) * 0.075
    output_cost = (TRACKING_STATS['gemini_output_tokens'] / 1_000_000) * 0.30
    total_cost = input_cost + output_cost
    print(f"   Gemini Cost:         ${total_cost:.4f} (Flash pricing)")

    print("\n🔍 CITATION API REQUESTS:")
    print(f"   Crossref:            {TRACKING_STATS['crossref_requests']:,}")
    print(f"   Semantic Scholar:    {TRACKING_STATS['semantic_scholar_requests']:,}")
    print(f"   Gemini Grounded:     {TRACKING_STATS['gemini_grounded_requests']:,}")
    print(f"   Serper:              {TRACKING_STATS['serper_requests']:,}")
    print(f"   TOTAL REQUESTS:      {TRACKING_STATS['total_api_requests']:,}")

    # Serper cost estimate ($0.001 per search = $1/1000 searches)
    serper_cost = TRACKING_STATS['serper_requests'] * 0.001
    print(f"   Serper Cost:         ${serper_cost:.4f}")

    # Total cost
    total_all_cost = total_cost + serper_cost
    print(f"\n💰 TOTAL COST:          ${total_all_cost:.4f}")

    print(f"\n⏱️  Total Duration:      {duration:.1f} seconds ({duration/60:.1f} minutes)")

    print("\n📋 DETAILED GEMINI CALLS:")
    for call in TRACKING_STATS["gemini_calls_detail"]:
        print(f"   #{call['call_number']:2d}: {call['input_tokens']:>7,} in + {call['output_tokens']:>6,} out = {call['input_tokens']+call['output_tokens']:>8,} tokens ({call['duration_seconds']}s)")

    print("\n" + "=" * 70)

    # Save stats to JSON
    stats_file = PROJECT_ROOT / "thesis_tracking_stats.json"
    with open(stats_file, 'w') as f:
        json.dump(TRACKING_STATS, f, indent=2, default=str)
    print(f"📁 Stats saved to: {stats_file}")

    return TRACKING_STATS


def main():
    global TRACKING_STATS

    print("=" * 70)
    print("🎓 OPENDRAFT THESIS GENERATOR - WITH FULL API TRACKING")
    print("=" * 70)
    print()

    # Enable tracking BEFORE importing draft_generator
    patch_gemini()
    patch_citation_apis()

    TRACKING_STATS["start_time"] = datetime.now().isoformat()
    TRACKING_STATS["_start_timestamp"] = time.time()

    # Now import and run
    from draft_generator import generate_draft

    # Topic for new thesis
    topic = """The Impact of Artificial Intelligence on Healthcare Diagnostics: A Systematic Review of Machine Learning Applications in Medical Imaging"""

    OUTPUT_DIR = PROJECT_ROOT / "thesis_parallel_test"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Show config
    from config import get_config
    cfg = get_config()
    use_serper = os.getenv('USE_SERPER', 'false').lower() == 'true'

    print(f"\n📝 Topic: {topic[:80]}...")
    print(f"📁 Output: {OUTPUT_DIR}")
    print(f"🎯 Type: Master's Thesis")
    print(f"🤖 Model: {cfg.model.model_name}")
    print(f"🔍 Search: {'Serper.dev' if use_serper else 'Gemini Grounded'}")
    print("\n" + "-" * 70)
    print("Starting generation with FULL tracking...")
    print("-" * 70 + "\n")

    try:
        pdf_path, docx_path = generate_draft(
            topic=topic,
            language="en",
            academic_level="master",
            output_dir=OUTPUT_DIR,
            skip_validation=True,
            verbose=True
        )

        print("\n✅ Generation complete!")
        print(f"   PDF: {pdf_path}")
        print(f"   DOCX: {docx_path}")

    except Exception as e:
        print(f"\n❌ Generation failed: {e}")
        import traceback
        traceback.print_exc()

    # Print final stats regardless of success/failure
    print_final_stats()


if __name__ == "__main__":
    main()
