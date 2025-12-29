#!/usr/bin/env python3
"""
Test TICKET-014 & TICKET-015: Domain-Specific Requirements

This test validates that signal prompt contains domain-specific
gap detection for epigenetics, ML, and clinical domains.

Run with: python tests/test_ticket014_015_domain.py
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


def test_signal_has_domain_section():
    """Test 1: Verify signal.md has domain-specific requirements section"""
    print("\n" + "="*60)
    print("TEST 1: Signal has domain-specific requirements section")
    print("="*60)

    prompt = load_prompt("engine/prompts/01_research/signal.md")

    checks = [
        ("DOMAIN-SPECIFIC REQUIREMENTS" in prompt, "Has domain section"),
        ("Domain-Critical Gap" in prompt, "Has domain-critical gap detection"),
        ("known confounds" in prompt.lower(), "Mentions known confounds"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_signal_has_epigenetics_requirements():
    """Test 2: Verify signal has epigenetics-specific requirements"""
    print("\n" + "="*60)
    print("TEST 2: Signal has epigenetics-specific requirements")
    print("="*60)

    prompt = load_prompt("engine/prompts/01_research/signal.md")

    checks = [
        ("Epigenetics" in prompt or "DNA Methylation" in prompt, "Has epigenetics section"),
        ("cell composition" in prompt.lower(), "Mentions cell composition confounding"),
        ("batch effect" in prompt.lower(), "Mentions batch effects"),
        ("normalization" in prompt.lower(), "Mentions normalization"),
        ("450k" in prompt or "EPIC" in prompt, "Mentions array platforms"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_signal_has_ml_requirements():
    """Test 3: Verify signal has ML-specific requirements"""
    print("\n" + "="*60)
    print("TEST 3: Signal has ML-specific requirements")
    print("="*60)

    prompt = load_prompt("engine/prompts/01_research/signal.md")

    checks = [
        ("Machine Learning" in prompt, "Has ML section"),
        ("train/test" in prompt.lower() or "train-test" in prompt.lower(),
         "Mentions train/test split"),
        ("cross-validation" in prompt.lower() or "Cross-validation" in prompt,
         "Mentions cross-validation"),
        ("overfitting" in prompt.lower(), "Mentions overfitting"),
    ]

    all_passed = True
    for condition, description in checks:
        status = "PASS" if condition else "FAIL"
        print(f"  {status}: {description}")
        if not condition:
            all_passed = False

    return all_passed


def test_signal_has_technical_gaps():
    """Test 4: Verify signal has technical implementation gaps (TICKET-015)"""
    print("\n" + "="*60)
    print("TEST 4: Signal has technical implementation gaps")
    print("="*60)

    prompt = load_prompt("engine/prompts/01_research/signal.md")

    checks = [
        ("Technical Implementation Gaps" in prompt, "Has technical gaps section"),
        ("Software" in prompt or "package versions" in prompt.lower(),
         "Mentions software versions"),
        ("Reproducibility" in prompt or "reproducibility" in prompt.lower(),
         "Mentions reproducibility"),
        ("preprocessing" in prompt.lower(), "Mentions preprocessing"),
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
    print("TICKET-014 & 015 VALIDATION: Domain-Specific Requirements")
    print("="*60)

    results = {
        "domain_section": test_signal_has_domain_section(),
        "epigenetics": test_signal_has_epigenetics_requirements(),
        "machine_learning": test_signal_has_ml_requirements(),
        "technical_gaps": test_signal_has_technical_gaps(),
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
        print("\n  TICKET-014 & 015 VALIDATION FAILED")
        return 1
    else:
        print("\n  TICKET-014 & 015 VALIDATION PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())
