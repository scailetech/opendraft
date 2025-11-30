#!/usr/bin/env python3
"""
Research missing citations to reach 110% targets

Targets:
- AI Pricing: 53 → 60 citations (+7)
- CO2 German: 30 → 55 citations (+25)
"""

import sys
from pathlib import Path

# Ensure project root is in path (script is in scripts/, so parent is root)
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.agent_runner import setup_model, research_citations_via_api


def research_ai_pricing_citations(model):
    """Research 7 additional citations for AI Pricing thesis."""

    print("="*70)
    print("🔍 AI PRICING THESIS - RESEARCHING 7 ADDITIONAL CITATIONS")
    print("="*70)
    print()
    print("Current: 53 citations")
    print("Target: 60 citations (110% of 54 baseline)")
    print("Gap: +7 citations")
    print()

    # Strategic topics for AI Pricing (7 high-quality topics)
    ai_pricing_topics = [
        "agentic AI systems and autonomous agent architectures",
        "AI model pricing strategies and revenue optimization",
        "token-based pricing models for large language models LLM",
        "AI infrastructure costs and cloud computing economics",
        "enterprise AI adoption and total cost of ownership TCO",
        "AI performance benchmarking and cost-benefit analysis",
        "multi-agent system pricing and resource allocation"
    ]

    print(f"📚 Researching {len(ai_pricing_topics)} strategic topics...")
    print()

    result = research_citations_via_api(
        model=model,
        research_topics=ai_pricing_topics,
        output_path=Path("/tmp/ai_pricing_7_citations.md"),
        target_minimum=7,
        verbose=True
    )

    return result


def research_co2_german_citations(model):
    """Research 25 additional citations for CO2 German thesis."""

    print()
    print("="*70)
    print("🔍 CO2 GERMAN THESIS - RESEARCHING 25 ADDITIONAL CITATIONS")
    print("="*70)
    print()
    print("Current: 30 citations")
    print("Target: 55 citations (110% of 49 baseline)")
    print("Gap: +25 citations")
    print()

    # Strategic topics for CO2 German thesis (25 topics)
    co2_topics = [
        # Additional emissions trading topics
        "carbon emissions trading market microstructure",
        "emissions allowance auction design and price discovery",
        "secondary carbon market trading mechanisms",
        "carbon price volatility and financial risk management",
        "carbon futures and derivatives trading",

        # EU ETS specific
        "EU ETS Phase IV reforms and innovation fund",
        "EU ETS carbon border adjustment mechanism CBAM",
        "EU ETS free allocation benchmarking",
        "EU ETS aviation and maritime sectors inclusion",
        "EU ETS compliance and enforcement mechanisms",

        # International carbon markets
        "Article 6 Paris Agreement cooperative approaches",
        "voluntary carbon markets credibility and integrity",
        "carbon credit certification standards VCS Gold Standard",
        "CORSIA carbon offsetting reduction scheme aviation",
        "bilateral carbon market linkage agreements",

        # Climate policy effectiveness
        "carbon pricing effectiveness meta-analysis systematic review",
        "emissions trading versus carbon tax comparative analysis",
        "carbon price floor and ceiling mechanisms",
        "revenue recycling from carbon pricing",
        "just transition and carbon pricing distributional effects",

        # Monitoring and verification
        "greenhouse gas emissions measurement reporting verification MRV",
        "satellite-based emissions monitoring technology",
        "blockchain for carbon credit tracking transparency",
        "carbon accounting standards ISO 14064",
        "emissions inventory methodologies IPCC guidelines"
    ]

    print(f"📚 Researching {len(co2_topics)} strategic topics...")
    print()

    result = research_citations_via_api(
        model=model,
        research_topics=co2_topics,
        output_path=Path("/tmp/co2_german_25_citations.md"),
        target_minimum=25,
        verbose=True
    )

    return result


def main():
    """Research all missing citations."""

    print("="*70)
    print("📚 CITATION ENHANCEMENT TO 110% TARGETS")
    print("="*70)
    print()

    # Initialize model
    model = setup_model()

    # Research AI Pricing citations
    ai_result = research_ai_pricing_citations(model)

    print()
    print("="*70)
    print("📊 AI PRICING RESULTS")
    print("="*70)
    print(f"Citations found: {ai_result['count']}")
    print(f"Success rate: {ai_result['count']/7*100:.1f}%")
    print(f"Sources:")
    print(f"  • Crossref: {ai_result['sources']['Crossref']}")
    print(f"  • Semantic Scholar: {ai_result['sources']['Semantic Scholar']}")
    print(f"  • Gemini LLM: {ai_result['sources']['Gemini LLM']}")
    print()

    if ai_result['count'] >= 7:
        print("✅ AI Pricing: Target reached (7 citations)")
    else:
        print(f"⚠️  AI Pricing: Only {ai_result['count']}/7 citations found")

    print()

    # Research CO2 German citations
    co2_result = research_co2_german_citations(model)

    print()
    print("="*70)
    print("📊 CO2 GERMAN RESULTS")
    print("="*70)
    print(f"Citations found: {co2_result['count']}")
    print(f"Success rate: {co2_result['count']/25*100:.1f}%")
    print(f"Sources:")
    print(f"  • Crossref: {co2_result['sources']['Crossref']}")
    print(f"  • Semantic Scholar: {co2_result['sources']['Semantic Scholar']}")
    print(f"  • Gemini LLM: {co2_result['sources']['Gemini LLM']}")
    print()

    if co2_result['count'] >= 25:
        print("✅ CO2 German: Target reached (25 citations)")
    else:
        print(f"⚠️  CO2 German: Only {co2_result['count']}/25 citations found")

    print()
    print("="*70)
    print("📊 OVERALL ENHANCEMENT STATUS")
    print("="*70)
    print(f"AI Pricing: {ai_result['count']}/7 citations ({ai_result['count']/7*100:.0f}%)")
    print(f"CO2 German: {co2_result['count']}/25 citations ({co2_result['count']/25*100:.0f}%)")
    print()

    total_needed = 7 + 25  # 32 citations total
    total_found = ai_result['count'] + co2_result['count']

    if total_found >= total_needed:
        print(f"✅ SUCCESS: {total_found}/{total_needed} citations researched!")
        print()
        print("Next steps:")
        print("1. Add citations to respective citation databases")
        print("2. Regenerate AI Pricing thesis with 60 citations")
        print("3. Regenerate CO2 German thesis with 55 citations")
        print("4. For Open Source: Ensure all 55 database citations are used")
        return 0
    else:
        print(f"⚠️  PARTIAL SUCCESS: {total_found}/{total_needed} citations found")
        print(f"   Missing: {total_needed - total_found} citations")
        return 1


if __name__ == "__main__":
    sys.exit(main())
