#!/usr/bin/env python3
"""
Test TICKET-009: DunedinPACE Description Imprecision

This test validates that crafter prompt contains technical precision
requirements for named methods.

Run with: python tests/test_ticket009_precision.py
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


def test_crafter_has_precision_section():
    """Test 1: Verify crafter.md has technical precision section"""
    print("\n" + "="*60)
    print("TEST 1: Crafter has technical precision section")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/crafter.md")

    checks = [
        ("TECHNICAL PRECISION" in prompt, "Has technical precision section"),
        ("Named Methods" in prompt, "Mentions named methods"),
        ("training target" in prompt.lower(), "Mentions training target"),
        ("derivation" in prompt.lower(), "Mentions derivation chain"),
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


def test_crafter_has_dunedinpace_example():
    """Test 2: Verify crafter shows DunedinPACE example"""
    print("\n" + "="*60)
    print("TEST 2: Crafter shows DunedinPACE example")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/crafter.md")

    checks = [
        ("DunedinPACE" in prompt, "Shows DunedinPACE example"),
        ("Pace of Aging" in prompt, "Mentions Pace of Aging phenotype"),
        ("longitudinal" in prompt.lower(), "Mentions longitudinal tracking"),
        ("IMPRECISE" in prompt or "PRECISE" in prompt, "Shows imprecise vs precise examples"),
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


def test_crafter_has_precision_rules():
    """Test 3: Verify crafter has precision rules"""
    print("\n" + "="*60)
    print("TEST 3: Crafter has precision rules")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/crafter.md")

    checks = [
        ("Distinguish training target" in prompt, "Rule about training vs measurement"),
        ("chain of derivation" in prompt.lower() or "derivation chain" in prompt.lower(),
         "Rule about derivation chain"),
        ("domain expert" in prompt.lower(), "Mentions domain expert check"),
        ("Horvath" in prompt or "GrimAge" in prompt, "Shows epigenetic clock examples"),
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
    print("TICKET-009 VALIDATION: Technical Precision for Named Methods")
    print("="*60)

    results = {
        "precision_section": test_crafter_has_precision_section(),
        "dunedinpace_example": test_crafter_has_dunedinpace_example(),
        "precision_rules": test_crafter_has_precision_rules(),
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
        print("\n  TICKET-009 VALIDATION FAILED")
        return 1
    else:
        print("\n  TICKET-009 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
