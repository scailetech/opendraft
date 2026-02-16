#!/usr/bin/env python3
"""
Test TICKET-004: Preprints Updated to Journal Versions

This test validates that scout and verifier prompts contain
preprint handling and update checking guidance.

Run with: python tests/test_ticket004_preprints.py
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


def test_verifier_has_preprint_checks():
    """Test 1: Verify verifier.md has preprint update checks"""
    print("\n" + "="*60)
    print("TEST 1: Verifier has preprint update checks")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/verifier.md")

    checks = [
        ("PREPRINT UPDATE CHECK" in prompt, "Has preprint update section"),
        ("bioRxiv" in prompt, "Mentions bioRxiv"),
        ("medRxiv" in prompt, "Mentions medRxiv"),
        ("arXiv" in prompt, "Mentions arXiv"),
        ("journal version" in prompt.lower(), "Checks for journal versions"),
        ("10.1101" in prompt, "Shows preprint DOI pattern"),
        ("18 months" in prompt or "12 months" in prompt, "Has age-based rules"),
        ("Preprint Preference Rules" in prompt, "Has preference table"),
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


def test_verifier_shows_update_example():
    """Test 2: Verify verifier shows preprint update example"""
    print("\n" + "="*60)
    print("TEST 2: Verifier shows preprint update example")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/verifier.md")

    checks = [
        ("PREPRINT UPDATE NEEDED" in prompt, "Shows update needed flag"),
        ("Published version found" in prompt, "Shows how to find published version"),
        ("Update to:" in prompt, "Shows update action"),
        ("Nature Communications" in prompt or "Nat Commun" in prompt, "Shows journal example"),
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


def test_scout_has_preprint_handling():
    """Test 3: Verify scout.md has preprint handling"""
    print("\n" + "="*60)
    print("TEST 3: Scout has preprint handling guidance")
    print("="*60)

    prompt = load_prompt("engine/prompts/01_research/scout.md")

    checks = [
        ("PREPRINT HANDLING" in prompt, "Has preprint handling section"),
        ("prefer journal-published versions" in prompt.lower(), "Prefers journal versions"),
        ("bioRxiv" in prompt, "Mentions bioRxiv"),
        ("Check for published version first" in prompt, "Checks for published version"),
        ("Preprint age matters" in prompt, "Has age-based guidance"),
        ("12 months" in prompt, "Has time thresholds"),
        ('"preprint": true' in prompt, "Shows preprint flag"),
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
    print("TICKET-004 VALIDATION: Preprints Updated to Journal Versions")
    print("="*60)

    results = {
        "verifier_preprint_checks": test_verifier_has_preprint_checks(),
        "verifier_update_example": test_verifier_shows_update_example(),
        "scout_preprint_handling": test_scout_has_preprint_handling(),
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
        print("\n  ❌ TICKET-004 VALIDATION FAILED")
        return 1
    else:
        print("\n  ✅ TICKET-004 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
