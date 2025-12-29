#!/usr/bin/env python3
"""
Test TICKET-005: Filter Irrelevant/Low-Value References (Padding)

This test validates that skeptic and crafter prompts contain
reference quality assessment and anti-padding guidance.

Run with: python tests/test_ticket005_padding.py
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent


def load_prompt(prompt_path: str) -> str:
    """Load prompt file from project root"""
    path = PROJECT_ROOT / prompt_path
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def test_skeptic_has_reference_quality():
    """Test 1: Verify skeptic.md has reference quality assessment"""
    print("\n" + "="*60)
    print("TEST 1: Skeptic has reference quality assessment")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/skeptic.md")

    checks = [
        ("REFERENCE QUALITY ASSESSMENT" in prompt, "Has reference quality section"),
        ("PADDING CITATIONS" in prompt, "Mentions padding citations"),
        ("Direct Relevance" in prompt, "Checks direct relevance"),
        ("Field Alignment" in prompt, "Checks field alignment"),
        ("Earning Its Place" in prompt, "Asks if citation earns its place"),
        ("Quality > Quantity" in prompt, "Emphasizes quality over quantity"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_skeptic_shows_red_flags():
    """Test 2: Verify skeptic shows red flags for padding"""
    print("\n" + "="*60)
    print("TEST 2: Skeptic shows red flags for padding citations")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/skeptic.md")

    checks = [
        ("Analogy from unrelated field" in prompt, "Flags cross-field analogies"),
        ("Generic claim support" in prompt, "Flags generic claims"),
        ("cybersecurity" in prompt.lower(), "Uses cybersecurity example"),
        ("Indonesia" in prompt or "digital transformation" in prompt.lower(), "Uses real example from ticket"),
        ("REMOVE" in prompt, "Recommends removal action"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_crafter_has_no_padding_warning():
    """Test 3: Verify crafter.md warns against padding"""
    print("\n" + "="*60)
    print("TEST 3: Crafter has no-padding warning")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/crafter.md")

    checks = [
        ("NO PADDING CITATIONS" in prompt, "Has no-padding section"),
        ("Quality > Quantity" in prompt, "Emphasizes quality"),
        ("unrelated fields" in prompt.lower(), "Warns about unrelated fields"),
        ("generic claims" in prompt.lower(), "Warns about generic claims"),
        ("PADDING:" in prompt, "Shows padding examples"),
        ("wouldn't weaken your argument" in prompt, "Has relevance test"),
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
    print("TICKET-005 VALIDATION: Filter Irrelevant/Low-Value References")
    print("="*60)

    results = {
        "skeptic_reference_quality": test_skeptic_has_reference_quality(),
        "skeptic_red_flags": test_skeptic_shows_red_flags(),
        "crafter_no_padding": test_crafter_has_no_padding_warning(),
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
        print("\n  ❌ TICKET-005 VALIDATION FAILED")
        return 1
    else:
        print("\n  ✅ TICKET-005 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
