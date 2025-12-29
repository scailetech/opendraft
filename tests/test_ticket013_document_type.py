#!/usr/bin/env python3
"""
Test TICKET-013: Paper vs Thesis Inconsistency

This test validates that narrator prompt contains document type
consistency guidance.

Run with: python tests/test_ticket013_document_type.py
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


def test_narrator_has_document_type_section():
    """Test 1: Verify narrator.md has document type consistency section"""
    print("\n" + "="*60)
    print("TEST 1: Narrator has document type consistency section")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/narrator.md")

    checks = [
        ("DOCUMENT TYPE CONSISTENCY" in prompt, "Has document type section"),
        ("ZERO TOLERANCE" in prompt, "Uses zero tolerance language"),
        ("terminology" in prompt.lower(), "Mentions terminology consistency"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_narrator_lists_document_types():
    """Test 2: Verify narrator lists different document types"""
    print("\n" + "="*60)
    print("TEST 2: Narrator lists different document types")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/narrator.md")

    checks = [
        ("PhD Thesis" in prompt, "Lists PhD Thesis"),
        ("Masters Thesis" in prompt, "Lists Masters Thesis"),
        ("Research Paper" in prompt, "Lists Research Paper"),
        ("Review Article" in prompt, "Lists Review Article"),
        ("Technical Report" in prompt, "Lists Technical Report"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_narrator_shows_inconsistency_example():
    """Test 3: Verify narrator shows inconsistency example"""
    print("\n" + "="*60)
    print("TEST 3: Narrator shows inconsistency example")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/narrator.md")

    checks = [
        ("INCONSISTENT" in prompt, "Labels inconsistent example"),
        ("CONSISTENT" in prompt, "Labels consistent example"),
        ("This paper" in prompt and "this thesis" in prompt.lower(),
         "Shows paper vs thesis confusion"),
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
    print("TICKET-013 VALIDATION: Document Type Consistency")
    print("="*60)

    results = {
        "document_type_section": test_narrator_has_document_type_section(),
        "document_types": test_narrator_lists_document_types(),
        "inconsistency_example": test_narrator_shows_inconsistency_example(),
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
        print("\n  TICKET-013 VALIDATION FAILED")
        return 1
    else:
        print("\n  TICKET-013 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
