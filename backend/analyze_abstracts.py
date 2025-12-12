#!/usr/bin/env python3
"""Analyze abstract coverage in the research output."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.citation_database import load_citation_database

# Load the bibliography from the test output
bib_path = Path("tests/outputs/.citation_cache_orchestrator.json")

if not bib_path.exists():
    # Try the generated draft location
    bib_path = Path(".citation_cache_orchestrator.json")

if not bib_path.exists():
    print("No citation cache found - checking Scout output...")

# Parse Scout output to check abstracts
scout_path = Path("tests/outputs/research_test.md")
if scout_path.exists():
    content = scout_path.read_text()

    # Count abstracts in Scout output
    abstract_count = content.count("**Abstract**:")
    citation_count = content.count("####")

    print("="*80)
    print("ABSTRACT COVERAGE ANALYSIS - From Scout Output")
    print("="*80)
    print(f"\n📚 Total citations in output: {citation_count}")
    print(f"📝 Citations with abstracts: {abstract_count}")

    if citation_count > 0:
        coverage = (abstract_count / citation_count * 100)
        print(f"📊 Coverage: {coverage:.1f}%")

        if coverage >= 75:
            print("\n✅ EXCELLENT abstract coverage!")
        elif coverage >= 50:
            print("\n⚠️  GOOD abstract coverage, but could be better")
        else:
            print("\n❌ LOW abstract coverage - APIs may not provide abstracts")

    # Show sample abstracts
    if "**Abstract**:" in content:
        print(f"\n" + "="*80)
        print("SAMPLE ABSTRACTS (First 3)")
        print("="*80)

        # Extract first 3 abstracts
        parts = content.split("**Abstract**:")
        for i in range(1, min(4, len(parts))):
            abstract_section = parts[i].split("####")[0].strip()
            lines = abstract_section.split("\n")
            abstract_text = lines[0][:300] if lines else ""
            print(f"\n{i}. {abstract_text}...")

else:
    print("Scout output not found!")
