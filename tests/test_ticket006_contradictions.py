#!/usr/bin/env python3
"""
Test TICKET-006: Internal Contradiction Detection

This test validates that the skeptic prompt contains
contradiction detection and resolution guidance.

Run with: python tests/test_ticket006_contradictions.py
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


def test_skeptic_has_contradiction_detection():
    """Test 1: Verify skeptic.md has contradiction detection"""
    print("\n" + "="*60)
    print("TEST 1: Skeptic has contradiction detection")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/skeptic.md")

    checks = [
        ("INTERNAL CONTRADICTION DETECTION" in prompt, "Has contradiction section"),
        ("Claim Consistency Check" in prompt, "Has claim consistency check"),
        ("Hedge Consistency" in prompt, "Has hedge consistency check"),
        ("Resolution Requirement" in prompt, "Has resolution requirement"),
        ("ZERO TOLERANCE" in prompt and "CONTRADICTING" in prompt, "Zero tolerance policy"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    if __name__ == "__main__":
        return all_passed
    assert all_passed


def test_skeptic_shows_contradiction_examples():
    """Test 2: Verify skeptic shows contradiction examples from ticket"""
    print("\n" + "="*60)
    print("TEST 2: Skeptic shows real contradiction examples")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/skeptic.md")

    checks = [
        ("interpretability" in prompt.lower() and "black box" in prompt.lower(),
         "Shows interpretability vs black-box example"),
        ("indisputable" in prompt.lower() and "limitations" in prompt.lower(),
         "Shows indisputable vs limitations example"),
        ("CONTRADICTION:" in prompt, "Labels contradictions clearly"),
        ("RESOLVED:" in prompt, "Shows resolution examples"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    if __name__ == "__main__":
        return all_passed
    assert all_passed


def test_skeptic_has_hedge_table():
    """Test 3: Verify skeptic has hedge consistency table"""
    print("\n" + "="*60)
    print("TEST 3: Skeptic has hedge consistency table")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/skeptic.md")

    checks = [
        ("If You Say..." in prompt, "Has hedge table header"),
        ("You Cannot Also Say" in prompt, "Has contradiction column"),
        ('"indisputable"' in prompt and '"has limitations"' in prompt,
         "Lists indisputable/limitations pair"),
        ('"proves"' in prompt and '"suggests"' in prompt,
         "Lists proves/suggests pair"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    if __name__ == "__main__":
        return all_passed
    assert all_passed


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("TICKET-006 VALIDATION: Internal Contradiction Detection")
    print("="*60)

    results = {
        "contradiction_detection": test_skeptic_has_contradiction_detection(),
        "contradiction_examples": test_skeptic_shows_contradiction_examples(),
        "hedge_table": test_skeptic_has_hedge_table(),
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
        print("\n  ❌ TICKET-006 VALIDATION FAILED")
        return 1
    else:
        print("\n  ✅ TICKET-006 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
