#!/usr/bin/env python3
"""
Test TICKET-008: Semantic Scholar Links as Primary References

This test validates that formatter prompt contains reference URL priority
and explicitly bans Semantic Scholar/Google Scholar/ResearchGate links.

Run with: python tests/test_ticket008_semantic_scholar.py
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


def test_formatter_has_url_priority():
    """Test 1: Verify formatter.md has reference URL priority"""
    print("\n" + "="*60)
    print("TEST 1: Formatter has reference URL priority")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/formatter.md")

    checks = [
        ("REFERENCE URL PRIORITY" in prompt, "Has URL priority section"),
        ("Priority Order" in prompt, "Shows priority order"),
        ("DOI" in prompt and "doi.org" in prompt, "Lists DOI as priority"),
        ("PubMed" in prompt, "Lists PubMed as acceptable"),
        ("arXiv" in prompt or "bioRxiv" in prompt, "Lists preprint servers"),
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


def test_formatter_bans_discovery_tools():
    """Test 2: Verify formatter bans discovery tool links"""
    print("\n" + "="*60)
    print("TEST 2: Formatter bans discovery tool links")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/formatter.md")

    checks = [
        ("Semantic Scholar" in prompt and "semanticscholar.org" in prompt.lower(),
         "Bans Semantic Scholar links"),
        ("Google Scholar" in prompt and "scholar.google" in prompt.lower(),
         "Bans Google Scholar links"),
        ("ResearchGate" in prompt and "researchgate.net" in prompt.lower(),
         "Bans ResearchGate links"),
        ("Academia.edu" in prompt and "academia.edu" in prompt.lower(),
         "Bans Academia.edu links"),
        ("discovery tools" in prompt.lower(), "Labels them as discovery tools"),
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


def test_formatter_explains_why():
    """Test 3: Verify formatter explains why this matters"""
    print("\n" + "="*60)
    print("TEST 3: Formatter explains why this matters")
    print("="*60)

    prompt = load_prompt("engine/prompts/02_structure/formatter.md")

    checks = [
        ("amateurish" in prompt.lower(), "Explains it looks amateurish"),
        ("citation destination" in prompt.lower() or "not citation" in prompt.lower(),
         "Explains these are not citation destinations"),
        ("NEVER use" in prompt, "Uses strong prohibition language"),
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
    print("TICKET-008 VALIDATION: Semantic Scholar Links Ban")
    print("="*60)

    results = {
        "url_priority": test_formatter_has_url_priority(),
        "bans_discovery_tools": test_formatter_bans_discovery_tools(),
        "explains_why": test_formatter_explains_why(),
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
        print("\n  TICKET-008 VALIDATION FAILED")
        return 1
    else:
        print("\n  TICKET-008 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
