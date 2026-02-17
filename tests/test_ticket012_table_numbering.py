#!/usr/bin/env python3
"""
Test TICKET-012: Table Numbering Reuse

This test validates that formatter prompt contains table/figure
numbering tracking guidance.

Run with: python tests/test_ticket012_table_numbering.py
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


def test_formatter_has_numbering_section():
    """Test 1: Verify formatter.md has table/figure numbering section"""
    print("\n" + "="*60)
    print("TEST 1: Formatter has table/figure numbering section")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/formatter.md")

    checks = [
        ("TABLE & FIGURE NUMBERING" in prompt or "TABLE/FIGURE" in prompt,
         "Has numbering section"),
        ("GLOBAL" in prompt or "global" in prompt, "Mentions global counters"),
        ("duplicate" in prompt.lower(), "Mentions duplicate issue"),
        ("ZERO TOLERANCE" in prompt, "Uses zero tolerance language"),
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


def test_formatter_shows_correct_numbering():
    """Test 2: Verify formatter shows correct numbering approach"""
    print("\n" + "="*60)
    print("TEST 2: Formatter shows correct numbering approach")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/formatter.md")

    checks = [
        ("Table 1, Table 2" in prompt, "Shows sequential table numbering"),
        ("Figure 1, Figure 2" in prompt, "Shows sequential figure numbering"),
        ("never restart" in prompt.lower(), "Says never restart numbering"),
        ("Appendix" in prompt and ("Table A" in prompt or "prefix" in prompt.lower()),
         "Shows appendix numbering approach"),
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


def test_formatter_has_cross_reference_guidance():
    """Test 3: Verify formatter has cross-reference guidance"""
    print("\n" + "="*60)
    print("TEST 3: Formatter has cross-reference guidance")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/formatter.md")

    checks = [
        ("cross-reference" in prompt.lower() or "Cross-Reference" in prompt,
         "Mentions cross-references"),
        ("As shown in Table" in prompt, "Shows cross-reference example"),
        ("referenced in text" in prompt.lower(), "Says figures/tables must be referenced"),
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
    print("TICKET-012 VALIDATION: Table Numbering Tracking")
    print("="*60)

    results = {
        "numbering_section": test_formatter_has_numbering_section(),
        "correct_numbering": test_formatter_shows_correct_numbering(),
        "cross_reference": test_formatter_has_cross_reference_guidance(),
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
        print("\n  TICKET-012 VALIDATION FAILED")
        return 1
    else:
        print("\n  TICKET-012 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
