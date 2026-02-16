#!/usr/bin/env python3
"""
Test TICKET-007: Overconfident Claims Calibration

This test validates that polish and crafter prompts contain
claim calibration and epistemic humility guidance.

Run with: python tests/test_ticket007_overconfident.py
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


def test_polish_has_claim_calibration():
    """Test 1: Verify polish.md has claim calibration"""
    print("\n" + "="*60)
    print("TEST 1: Polish has claim calibration")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    checks = [
        ("CLAIM CALIBRATION" in prompt, "Has claim calibration section"),
        ("Epistemic Humility" in prompt, "Mentions epistemic humility"),
        ("Banned Phrases" in prompt, "Has banned phrases list"),
        ("indisputable" in prompt.lower(), "Bans 'indisputable'"),
        ("revolutionary" in prompt.lower(), "Bans 'revolutionary'"),
        ("strong evidence suggests" in prompt.lower(), "Shows replacement"),
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


def test_polish_has_replacement_table():
    """Test 2: Verify polish shows banned → replacement table"""
    print("\n" + "="*60)
    print("TEST 2: Polish has replacement table")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    banned_replacements = [
        ('"proves"' in prompt or "'proves'" in prompt, "Bans 'proves'"),
        ('"the best"' in prompt or "'the best'" in prompt, "Bans 'the best'"),
        ('"always"' in prompt, "Bans 'always'"),
        ("among the strongest" in prompt.lower() or "among the few" in prompt.lower(),
         "Shows calibrated replacement"),
    ]

    all_passed = True
    for condition, description in banned_replacements:
        status = "✅ PASS" if condition else "❌ FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    if __name__ == "__main__":
        return all_passed
    assert all_passed


def test_crafter_has_claim_calibration():
    """Test 3: Verify crafter.md has claim calibration"""
    print("\n" + "="*60)
    print("TEST 3: Crafter has claim calibration")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/crafter.md")

    checks = [
        ("CLAIM CALIBRATION" in prompt, "Has claim calibration section"),
        ("epistemic humility" in prompt.lower(), "Mentions epistemic humility"),
        ("Banned Phrases" in prompt, "Has banned phrases"),
        ("indisputable" in prompt.lower(), "Lists 'indisputable' as banned"),
        ("Hedge appropriately" in prompt, "Has hedging guidance"),
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
    print("TICKET-007 VALIDATION: Overconfident Claims Calibration")
    print("="*60)

    results = {
        "polish_calibration": test_polish_has_claim_calibration(),
        "polish_table": test_polish_has_replacement_table(),
        "crafter_calibration": test_crafter_has_claim_calibration(),
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
        print("\n  ❌ TICKET-007 VALIDATION FAILED")
        return 1
    else:
        print("\n  ✅ TICKET-007 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
