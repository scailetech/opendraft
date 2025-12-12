#!/usr/bin/env python3
"""
COMPREHENSIVE COST TRACKING - PER MODEL
Tracks token usage for each Gemini model separately.

Models used:
- gemini-3-pro-preview (thesis writing via SDK) - MOST EXPENSIVE!
- gemini-2.5-flash (citation research via REST API) - CHEAPEST
- gemini-2.5-pro (validation if enabled) - EXPENSIVE

Pricing (Dec 2025 - CORRECTED):
- Gemini 3 Pro Preview: $2.00 per 1M input, $12.00 per 1M output ⚠️ MOST EXPENSIVE
- Gemini 2.5 Flash: $0.30 per 1M input, $2.50 per 1M output ✅ CHEAPEST
- Gemini 2.5 Pro: $1.25 per 1M input, $10.00 per 1M output 💰 EXPENSIVE

Tracking Methods:
- SDK calls (thesis writing): Monkey-patches genai.GenerativeModel.generate_content
- REST API calls (citation research): Monkey-patches GeminiGroundedClient._generate_content_with_grounding

WARNING: Mixed model usage - expect $1-3 per thesis with proper model configuration!
"""

import sys
import time
import json
import logging
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

# Must import genai BEFORE patching
import google.generativeai as genai

# ============================================================================
# COST TRACKING GLOBALS
# ============================================================================

TOKEN_TRACKER = {
    # Per-model tracking
    "gemini-3-pro-preview": {"input": 0, "output": 0, "calls": 0},
    "gemini-2.5-flash": {"input": 0, "output": 0, "calls": 0},
    "gemini-2.5-flash-lite": {"input": 0, "output": 0, "calls": 0},
    "gemini-2.5-pro": {"input": 0, "output": 0, "calls": 0},
    "gemini-2.0-flash-exp": {"input": 0, "output": 0, "calls": 0},
    "gemini-1.5-flash": {"input": 0, "output": 0, "calls": 0},
    "gemini-1.5-pro": {"input": 0, "output": 0, "calls": 0},
    "unknown": {"input": 0, "output": 0, "calls": 0},
}

# Pricing per 1M tokens (CORRECT as of Dec 2025)
PRICING = {
    "gemini-3-pro-preview": {"input": 2.00, "output": 12.00},  # MOST EXPENSIVE!
    "gemini-2.5-flash": {"input": 0.30, "output": 2.50},  # CHEAPEST
    "gemini-2.5-flash-lite": {"input": 0.30, "output": 2.50},  # Same as flash
    "gemini-2.5-pro": {"input": 1.25, "output": 10.00},  # EXPENSIVE
    "gemini-2.0-flash-exp": {"input": 0.0, "output": 0.0},  # Experimental = free (deprecated)
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},  # Old pricing
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},  # Old pricing
}

# ============================================================================
# PATCH GEMINI API
# ============================================================================

# Store original method
_original_generate_content = genai.GenerativeModel.generate_content

def tracked_generate_content(self, *args, **kwargs):
    """Wrapper that tracks token usage per model"""
    start_time = time.time()

    # Get model name from self and strip "models/" prefix if present
    model_name = getattr(self, '_model_name', 'unknown')
    if model_name.startswith('models/'):
        model_name = model_name[7:]  # Strip "models/" prefix

    # Call original
    result = _original_generate_content(self, *args, **kwargs)

    # Track tokens
    if hasattr(result, 'usage_metadata'):
        usage = result.usage_metadata
        input_tokens = getattr(usage, 'prompt_token_count', 0)
        output_tokens = getattr(usage, 'candidates_token_count', 0)

        # Track by model
        if model_name in TOKEN_TRACKER:
            TOKEN_TRACKER[model_name]["input"] += input_tokens
            TOKEN_TRACKER[model_name]["output"] += output_tokens
            TOKEN_TRACKER[model_name]["calls"] += 1
        else:
            # Track under "unknown" but don't warn - might be a new model
            TOKEN_TRACKER["unknown"]["input"] += input_tokens
            TOKEN_TRACKER["unknown"]["output"] += output_tokens
            TOKEN_TRACKER["unknown"]["calls"] += 1

    elapsed = time.time() - start_time

    return result

# Apply the SDK patch
genai.GenerativeModel.generate_content = tracked_generate_content
print("✅ Patched genai.GenerativeModel.generate_content for token tracking")

# ============================================================================
# PATCH GEMINI GROUNDED REST API (for citation research)
# ============================================================================

def track_rest_api_usage(response_data: dict, model_name: str):
    """Track token usage from REST API response"""
    if not response_data:
        return

    # Extract usageMetadata from REST API response
    usage = response_data.get('usageMetadata', {})
    input_tokens = usage.get('promptTokenCount', 0)
    output_tokens = usage.get('candidatesTokenCount', 0)

    if input_tokens > 0 or output_tokens > 0:
        if model_name in TOKEN_TRACKER:
            TOKEN_TRACKER[model_name]["input"] += input_tokens
            TOKEN_TRACKER[model_name]["output"] += output_tokens
            TOKEN_TRACKER[model_name]["calls"] += 1
        else:
            TOKEN_TRACKER["unknown"]["input"] += input_tokens
            TOKEN_TRACKER["unknown"]["output"] += output_tokens
            TOKEN_TRACKER["unknown"]["calls"] += 1

# Will be applied after import
_rest_api_tracking_enabled = True
print("✅ REST API tracking enabled")

# ============================================================================
# COST CALCULATION
# ============================================================================

def calculate_costs() -> Dict[str, Any]:
    """Calculate total costs from tracked usage"""

    costs_by_model = {}
    total_cost = 0
    total_input_tokens = 0
    total_output_tokens = 0
    total_calls = 0

    for model_name, tokens in TOKEN_TRACKER.items():
        if tokens["calls"] == 0:
            continue  # Skip unused models

        # Get pricing
        pricing = PRICING.get(model_name, {"input": 0, "output": 0})

        # Calculate cost
        input_cost = (tokens["input"] / 1_000_000) * pricing["input"]
        output_cost = (tokens["output"] / 1_000_000) * pricing["output"]
        model_total = input_cost + output_cost

        costs_by_model[model_name] = {
            "input_tokens": tokens["input"],
            "output_tokens": tokens["output"],
            "total_tokens": tokens["input"] + tokens["output"],
            "api_calls": tokens["calls"],
            "input_cost": input_cost,
            "output_cost": output_cost,
            "total_cost": model_total,
            "pricing": pricing
        }

        total_cost += model_total
        total_input_tokens += tokens["input"]
        total_output_tokens += tokens["output"]
        total_calls += tokens["calls"]

    return {
        "by_model": costs_by_model,
        "totals": {
            "input_tokens": total_input_tokens,
            "output_tokens": total_output_tokens,
            "total_tokens": total_input_tokens + total_output_tokens,
            "api_calls": total_calls,
            "total_cost": total_cost,
            "selling_price": 10.0,
            "profit": 10.0 - total_cost,
            "profit_margin_percent": ((10.0 - total_cost) / 10.0) * 100 if total_cost < 10 else 0
        }
    }

# ============================================================================
# MAIN TEST
# ============================================================================

def main():
    # Setup logging
    output_dir = Path("tests/outputs/cost_tracking_per_model")
    output_dir.mkdir(parents=True, exist_ok=True)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(name)-30s | %(levelname)-8s | %(message)s',
        handlers=[
            logging.FileHandler(output_dir / 'cost_tracking.log'),
            logging.StreamHandler()
        ]
    )

    logger = logging.getLogger(__name__)

    print("="*80)
    print("COMPREHENSIVE COST TRACKING - PER MODEL")
    print("="*80)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("🎯 Purpose: Calculate exact cost per thesis by tracking each model separately")
    print()
    print("📋 Models tracked (with CORRECT pricing):")
    for model_name in TOKEN_TRACKER.keys():
        if model_name != "unknown":
            pricing = PRICING.get(model_name, {"input": 0, "output": 0})
            if pricing["input"] > 0 or pricing["output"] > 0:
                cost_label = ""
                if model_name == "gemini-3-pro-preview":
                    cost_label = " ⚠️ MOST EXPENSIVE"
                elif model_name == "gemini-2.5-flash" or model_name == "gemini-2.5-flash-lite":
                    cost_label = " ✅ CHEAPEST"
                elif "pro" in model_name:
                    cost_label = " 💰 EXPENSIVE"
                print(f"   - {model_name}: ${pricing['input']}/1M in, ${pricing['output']}/1M out{cost_label}")
    print()
    print("⚠️  WARNING: Gemini 3 Pro Preview is 6-8x more expensive than 2.5 Flash!")
    print("   If most tokens use 3 Pro Preview, expect $1-3 cost per thesis (not $0.03!)")
    print()

    # Import thesis generator AFTER patching
    from backend.thesis_generator import generate_thesis
    from utils.api_citations.gemini_grounded import GeminiGroundedClient

    # Patch Gemini Grounded REST API
    _original_rest_generate = GeminiGroundedClient._generate_content_with_grounding

    def _tracked_rest_generate(self, prompt: str, **kwargs):
        """Wrapper to track REST API token usage"""
        result = _original_rest_generate(self, prompt, **kwargs)
        if result:
            track_rest_api_usage(result, self.model_name)
        return result

    GeminiGroundedClient._generate_content_with_grounding = _tracked_rest_generate
    print("✅ Patched GeminiGroundedClient for REST API tracking")

    # Test configuration
    topic = "The Impact of Machine Learning on Healthcare Diagnostics"

    print(f"📋 Test Configuration:")
    print(f"   Topic: {topic}")
    print(f"   Output: {output_dir}")
    print(f"   Academic Level: master")
    print(f"   Language: english")
    print()

    print("🚀 Starting Full Thesis Generation with Per-Model Cost Tracking...")
    print()

    start_time = time.time()

    try:
        # Run full pipeline
        result = generate_thesis(
            topic=topic,
            language="en",
            academic_level="master",
            output_dir=output_dir,
            author_name="Cost Test User",
            institution="Cost Analysis University",
            department="Computer Science",
            advisor="Dr. Cost Tracker",
            skip_validation=True,
            verbose=True
        )

        elapsed = time.time() - start_time

        print()
        print("="*80)
        print("COST TRACKING TEST - RESULTS")
        print("="*80)
        print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⏱️  Total time: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
        print()

        # Calculate costs
        costs = calculate_costs()

        # Print per-model breakdown
        print("💰 COST BREAKDOWN BY MODEL")
        print("="*80)
        print()

        for model_name, model_costs in costs["by_model"].items():
            print(f"📊 {model_name}:")
            print(f"   Input tokens:  {model_costs['input_tokens']:,}")
            print(f"   Output tokens: {model_costs['output_tokens']:,}")
            print(f"   Total tokens:  {model_costs['total_tokens']:,}")
            print(f"   API calls:     {model_costs['api_calls']:,}")
            print(f"   Input cost:    ${model_costs['input_cost']:.6f}")
            print(f"   Output cost:   ${model_costs['output_cost']:.6f}")
            print(f"   ✅ Model total: ${model_costs['total_cost']:.6f}")
            print()

        # Print totals
        print("="*80)
        print("💵 TOTAL COST ANALYSIS")
        print("="*80)
        print(f"   Total Input Tokens:  {costs['totals']['input_tokens']:,}")
        print(f"   Total Output Tokens: {costs['totals']['output_tokens']:,}")
        print(f"   Total Tokens:        {costs['totals']['total_tokens']:,}")
        print(f"   Total API Calls:     {costs['totals']['api_calls']:,}")
        print()
        print(f"   Total Cost:          ${costs['totals']['total_cost']:.4f}")
        print(f"   Selling Price:       ${costs['totals']['selling_price']:.2f}")
        print(f"   Profit:              ${costs['totals']['profit']:.4f}")
        print(f"   Profit Margin:       {costs['totals']['profit_margin_percent']:.1f}%")
        print()

        # Recommendation
        if costs['totals']['profit'] > 0:
            print(f"✅ PROFITABLE: ${costs['totals']['profit']:.2f} profit per thesis at $10 price point")

            # Calculate minimum price for 20% margin
            min_price_20 = costs['totals']['total_cost'] * 1.25
            min_price_50 = costs['totals']['total_cost'] * 2.0
            print(f"   💡 Could price as low as ${min_price_20:.2f} (20% margin)")
            print(f"   💡 Recommended pricing: ${min_price_50:.2f} (50% margin) or $10 (current)")
        else:
            print(f"❌ NOT PROFITABLE: ${abs(costs['totals']['profit']):.2f} LOSS per thesis at $10 price point")
            recommended_price = costs['totals']['total_cost'] * 1.5
            print(f"   💡 Recommended price: ${recommended_price:.2f} (50% margin)")
        print()

        # Save detailed report
        report_file = output_dir / "cost_report_per_model.json"
        with open(report_file, 'w') as f:
            json.dump(costs, f, indent=2)

        print(f"📄 Detailed report saved: {report_file}")
        print()

        return costs

    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        elapsed = time.time() - start_time

        # Still calculate costs for partial run
        costs = calculate_costs()
        print()
        print("⚠️  Test failed, but here are partial costs:")
        print()
        print("📊 Token Usage:")
        print(f"   Input tokens:  {costs['totals']['input_tokens']:,}")
        print(f"   Output tokens: {costs['totals']['output_tokens']:,}")
        print(f"   Total tokens:  {costs['totals']['total_tokens']:,}")
        print(f"   API calls:     {costs['totals']['api_calls']:,}")
        print()
        print("💰 Cost Breakdown:")
        for model_name, model_costs in costs["by_model"].items():
            print(f"   {model_name}: ${model_costs['total_cost']:.4f} ({model_costs['total_tokens']:,} tokens)")
        print(f"   ─────────────────────────────")
        print(f"   TOTAL COST:    ${costs['totals']['total_cost']:.4f}")
        print()

        raise

if __name__ == "__main__":
    main()
