#!/usr/bin/env python3
"""
Test TICKET-002: Analysis Sections Must Contain Actual Analysis

This test validates that the crafter and architect prompts enforce
quantitative analysis requirements (tables, metrics, effect sizes).

Run with: python tests/test_ticket002_analysis.py
"""

import sys
from pathlib import Path

# Project root
PROJECT_ROOT = Path(__file__).parent.parent


def load_prompt(prompt_path: str) -> str:
    """Load prompt file from project root"""
    path = PROJECT_ROOT / prompt_path
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def test_crafter_has_analysis_requirements():
    """Test 1: Verify crafter.md contains analysis requirements"""
    print("\n" + "="*60)
    print("TEST 1: Crafter prompt has analysis requirements")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/crafter.md")

    checks = [
        ("ANALYSIS SECTIONS MUST CONTAIN ACTUAL ANALYSIS" in prompt, "Has analysis section header"),
        ("QUANTITATIVE COMPARISONS" in prompt, "Requires quantitative comparisons"),
        ("EFFECT SIZE REPORTING" in prompt, "Requires effect size reporting"),
        ("HETEROGENEITY ACKNOWLEDGMENT" in prompt, "Requires heterogeneity acknowledgment"),
        ("SYNTHESIS" in prompt and "Not Just Summary" in prompt, "Distinguishes synthesis from summary"),
        ("comparison table" in prompt.lower(), "Mentions comparison tables"),
        ("HR, AUC" in prompt or "effect size" in prompt.lower(), "Lists specific metrics"),
        ("Self-Check Before Submitting Analysis" in prompt, "Has self-check checklist"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_crafter_shows_bad_vs_good_examples():
    """Test 2: Verify crafter shows bad vs good analysis examples"""
    print("\n" + "="*60)
    print("TEST 2: Crafter shows bad vs good analysis examples")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/crafter.md")

    checks = [
        ("BAD (Summary dressed as analysis)" in prompt, "Shows BAD example"),
        ("GOOD (Actual analysis with data)" in prompt, "Shows GOOD example"),
        ("Studies show that" in prompt and "❌" in prompt, "Flags vague language as bad"),
        ("HR = " in prompt or "HR per SD" in prompt, "Shows specific metrics in good example"),
        ("95% CI" in prompt, "Shows confidence intervals in good example"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_architect_requires_synthesis_table():
    """Test 3: Verify architect.md requires synthesis table in results"""
    print("\n" + "="*60)
    print("TEST 3: Architect prompt requires synthesis table")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/architect.md")

    checks = [
        ("Results/Analysis" in prompt, "Results section renamed to Results/Analysis"),
        ("Synthesis Table (REQUIRED)" in prompt, "Synthesis table is required"),
        ("MUST contain actual quantitative analysis" in prompt, "Emphasizes quantitative analysis"),
        ("Effect Size" in prompt, "Mentions effect sizes in template"),
        ("Analysis Section Checklist" in prompt, "Has checklist for crafter"),
        ("comparison table" in prompt.lower(), "Requires comparison table"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("TICKET-002 VALIDATION: Analysis Sections With Actual Analysis")
    print("="*60)

    results = {
        "crafter_analysis_requirements": test_crafter_has_analysis_requirements(),
        "crafter_examples": test_crafter_shows_bad_vs_good_examples(),
        "architect_synthesis_table": test_architect_requires_synthesis_table(),
    }

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    passed = 0
    failed = 0

    for test_name, result in results.items():
        if result:
            status = "✅ PASS"
            passed += 1
        else:
            status = "❌ FAIL"
            failed += 1
        print(f"  {status}: {test_name}")

    print(f"\n  Total: {passed} passed, {failed} failed")

    if failed > 0:
        print("\n  ❌ TICKET-002 VALIDATION FAILED")
        return 1
    else:
        print("\n  ✅ TICKET-002 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
