#!/usr/bin/env python3
"""
Test TICKET-010: Repeated Phrases

This test validates that polish prompt contains repetition detection
and guidance for varying vocabulary.

Run with: python tests/test_ticket010_repetition.py
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


def test_polish_has_repetition_detection():
    """Test 1: Verify polish.md has repetition detection"""
    print("\n" + "="*60)
    print("TEST 1: Polish has repetition detection")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    checks = [
        ("REPETITION DETECTION" in prompt, "Has repetition detection section"),
        ("frequency" in prompt.lower(), "Mentions frequency scanning"),
        ("more than twice" in prompt.lower(), "Has repetition threshold"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    if __name__ == "__main__":
        return all_passed
    assert all_passed


def test_polish_lists_overused_words():
    """Test 2: Verify polish lists commonly overused words"""
    print("\n" + "="*60)
    print("TEST 2: Polish lists commonly overused words")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    checks = [
        ('"significant"' in prompt or "'significant'" in prompt, "Lists 'significant'"),
        ('"important"' in prompt or "'important'" in prompt, "Lists 'important'"),
        ('"notable"' in prompt or "'notable'" in prompt, "Lists 'notable'"),
        ("crutch" in prompt.lower(), "Labels them as crutch words"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    if __name__ == "__main__":
        return all_passed
    assert all_passed


def test_polish_shows_variation_suggestions():
    """Test 3: Verify polish shows how to vary vocabulary"""
    print("\n" + "="*60)
    print("TEST 3: Polish shows variation suggestions")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    checks = [
        ("substantial" in prompt.lower(), "Suggests 'substantial' as alternative"),
        ("considerable" in prompt.lower(), "Suggests 'considerable' as alternative"),
        ("Vary" in prompt, "Uses 'vary' instruction"),
        ("vocabulary" in prompt.lower(), "Mentions vocabulary variation"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    if __name__ == "__main__":
        return all_passed
    assert all_passed


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("TICKET-010 VALIDATION: Repeated Phrases Detection")
    print("="*60)

    results = {
        "repetition_detection": test_polish_has_repetition_detection(),
        "overused_words": test_polish_lists_overused_words(),
        "variation_suggestions": test_polish_shows_variation_suggestions(),
    }

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    passed = 0
    failed = 0

    for test_name, result in results.items():
        if result:
            status = "PASS"
            passed += 1
        else:
            status = "FAIL"
            failed += 1
        print(f"  {status}: {test_name}")

    print(f"\n  Total: {passed} passed, {failed} failed")

    if failed > 0:
        print("\n  TICKET-010 VALIDATION FAILED")
        return 1
    else:
        print("\n  TICKET-010 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
