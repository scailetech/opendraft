#!/usr/bin/env python3
"""
Test TICKET-011: Grammar Inconsistency

This test validates that polish prompt contains grammar consistency
checks for subject-verb agreement and tense.

Run with: python tests/test_ticket011_grammar.py
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


def test_polish_has_grammar_section():
    """Test 1: Verify polish.md has grammar consistency section"""
    print("\n" + "="*60)
    print("TEST 1: Polish has grammar consistency section")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    checks = [
        ("GRAMMAR CONSISTENCY" in prompt, "Has grammar consistency section"),
        ("Subject-verb" in prompt or "subject-verb" in prompt, "Mentions subject-verb agreement"),
        ("tense" in prompt.lower(), "Mentions tense consistency"),
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


def test_polish_has_data_plurality_rule():
    """Test 2: Verify polish has data plurality rule"""
    print("\n" + "="*60)
    print("TEST 2: Polish has data plurality rule")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    checks = [
        ("data show" in prompt.lower() or "data were" in prompt.lower(),
         "Shows correct 'data' usage"),
        ("data is plural" in prompt.lower() or "plural" in prompt.lower(),
         "Explains data is plural"),
        ("data was" in prompt and "data were" in prompt, "Shows wrong vs right example"),
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


def test_polish_has_tense_guidance():
    """Test 3: Verify polish has section-specific tense guidance"""
    print("\n" + "="*60)
    print("TEST 3: Polish has section-specific tense guidance")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    checks = [
        ("Introduction" in prompt and "Present tense" in prompt, "Introduction tense guidance"),
        ("Literature Review" in prompt or "Past tense" in prompt, "Literature review tense guidance"),
        ("Methods" in prompt and "Past tense" in prompt, "Methods tense guidance"),
        ("Discussion" in prompt, "Discussion tense guidance"),
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


def test_polish_has_which_that_rule():
    """Test 4: Verify polish has which vs that rule"""
    print("\n" + "="*60)
    print("TEST 4: Polish has which vs that rule")
    print("="*60)

    prompt = load_prompt("engine/prompts/05_refine/polish.md")

    checks = [
        ("Which" in prompt and "vs" in prompt, "Has 'Which' vs 'That' section"),
        ("Methods which" in prompt or "which improve" in prompt.lower(), "Shows 'which' example"),
        ("restrictive" in prompt.lower() or "non-restrictive" in prompt.lower(),
         "Explains restrictive clause rule"),
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
    print("TICKET-011 VALIDATION: Grammar Consistency")
    print("="*60)

    results = {
        "grammar_section": test_polish_has_grammar_section(),
        "data_plurality": test_polish_has_data_plurality_rule(),
        "tense_guidance": test_polish_has_tense_guidance(),
        "which_that_rule": test_polish_has_which_that_rule(),
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
        print("\n  TICKET-011 VALIDATION FAILED")
        return 1
    else:
        print("\n  TICKET-011 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
