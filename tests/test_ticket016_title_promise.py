#!/usr/bin/env python3
"""
Test TICKET-016: No Evaluation Framework Despite "Evaluation" in Title

This test validates that architect prompt contains title promise
fulfillment guidance.

Run with: python tests/test_ticket016_title_promise.py
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


def test_architect_has_title_promise_section():
    """Test 1: Verify architect.md has title promise fulfillment section"""
    print("\n" + "="*60)
    print("TEST 1: Architect has title promise fulfillment section")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/architect.md")

    checks = [
        ("TITLE PROMISE FULFILLMENT" in prompt, "Has title promise section"),
        ("title is a promise" in prompt.lower(), "States title is a promise"),
        ("deliver" in prompt.lower(), "Mentions content must deliver"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_architect_has_keyword_table():
    """Test 2: Verify architect has title keyword analysis table"""
    print("\n" + "="*60)
    print("TEST 2: Architect has title keyword analysis table")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/architect.md")

    checks = [
        ("Title Keyword" in prompt or "If Title Contains" in prompt, "Has keyword table"),
        ('"Evaluation"' in prompt or "'Evaluation'" in prompt, "Lists Evaluation keyword"),
        ('"Comparison"' in prompt or "'Comparison'" in prompt, "Lists Comparison keyword"),
        ('"Systematic Review"' in prompt, "Lists Systematic Review keyword"),
        ('"Framework"' in prompt or "'Framework'" in prompt, "Lists Framework keyword"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_architect_has_evaluation_framework():
    """Test 3: Verify architect has evaluation framework requirements"""
    print("\n" + "="*60)
    print("TEST 3: Architect has evaluation framework requirements")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/architect.md")

    checks = [
        ("Evaluation Framework Requirements" in prompt, "Has evaluation framework section"),
        ("Analytical Validity" in prompt, "Lists analytical validity"),
        ("Clinical" in prompt and "Validity" in prompt, "Lists clinical validity"),
        ("Utility" in prompt, "Lists utility"),
        ("Actionability" in prompt, "Lists actionability"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_architect_shows_audit_example():
    """Test 4: Verify architect shows title-content audit example"""
    print("\n" + "="*60)
    print("TEST 4: Architect shows title-content audit example")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/architect.md")

    checks = [
        ("TITLE PROMISE AUDIT" in prompt, "Shows audit example"),
        ("Epigenetic Clocks" in prompt, "Uses epigenetic clocks example"),
        ("Promised by" in prompt, "Shows what title promises"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("TICKET-016 VALIDATION: Title Promise Fulfillment")
    print("="*60)

    results = {
        "title_promise_section": test_architect_has_title_promise_section(),
        "keyword_table": test_architect_has_keyword_table(),
        "evaluation_framework": test_architect_has_evaluation_framework(),
        "audit_example": test_architect_shows_audit_example(),
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
        print("\n  TICKET-016 VALIDATION FAILED")
        return 1
    else:
        print("\n  TICKET-016 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
