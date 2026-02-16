#!/usr/bin/env python3
"""
Test TICKET-003: Citation-Author Mismatch Prevention

This test validates that the verifier and crafter prompts contain
named entity verification and author attribution checks.

Run with: python tests/test_ticket003_citation_mismatch.py
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


def test_verifier_has_named_entity_checks():
    """Test 1: Verify verifier.md has named entity verification"""
    print("\n" + "="*60)
    print("TEST 1: Verifier has named entity verification")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/verifier.md")

    checks = [
        ("NAMED ENTITY & AUTHOR VERIFICATION" in prompt, "Has named entity section"),
        ("Named Entity Matching" in prompt, "Has named entity matching subsection"),
        ("Concept vs Instance" in prompt, "Distinguishes concept vs instance papers"),
        ("Author Attribution Verification" in prompt, "Has author attribution verification"),
        ("DeepMAge" in prompt, "Uses concrete example (DeepMAge)"),
        ("CRITICAL MISATTRIBUTION" in prompt, "Flags misattributions as critical"),
        ("Origin Paper" in prompt, "Checks for origin paper"),
        ("Title/Abstract Match" in prompt, "Requires title/abstract match"),
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


def test_verifier_shows_wrong_vs_right():
    """Test 2: Verify verifier shows wrong vs right example"""
    print("\n" + "="*60)
    print("TEST 2: Verifier shows wrong vs right attribution example")
    print("="*60)

    prompt = load_prompt("engine/prompts/04_validate/verifier.md")

    checks = [
        ("❌ WRONG" in prompt and "DeepMAge" in prompt, "Shows WRONG example with DeepMAge"),
        ("✅ RIGHT" in prompt and "Galkin" in prompt, "Shows RIGHT example with correct author"),
        ("Camillo" in prompt, "Mentions incorrect attribution (Camillo)"),
        ("concept paper" in prompt.lower(), "Warns about concept paper confusion"),
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


def test_crafter_has_named_tool_warning():
    """Test 3: Verify crafter.md warns about named tool citations"""
    print("\n" + "="*60)
    print("TEST 3: Crafter has named tool citation warning")
    print("="*60)

    prompt = load_prompt("engine/prompts/03_compose/crafter.md")

    checks = [
        ("NAMED TOOL/METHOD CITATIONS" in prompt, "Has named tool section"),
        ("DeepMAge" in prompt, "Uses DeepMAge as example"),
        ("paper about similar topic" in prompt, "Warns about concept confusion"),
        ("tool name appears in the paper's title" in prompt, "Requires title match"),
        ("authors match the known creators" in prompt, "Requires author verification"),
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
    print("TICKET-003 VALIDATION: Citation-Author Mismatch Prevention")
    print("="*60)

    results = {
        "verifier_named_entity": test_verifier_has_named_entity_checks(),
        "verifier_examples": test_verifier_shows_wrong_vs_right(),
        "crafter_warning": test_crafter_has_named_tool_warning(),
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
        print("\n  ❌ TICKET-003 VALIDATION FAILED")
        return 1
    else:
        print("\n  ✅ TICKET-003 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
