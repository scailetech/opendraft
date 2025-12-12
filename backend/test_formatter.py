#!/usr/bin/env python3
"""
Test Formatter agent - applies academic formatting to outline.
"""
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tests.test_utils import setup_model, run_agent
from utils.text_utils import smart_truncate

print("="*80)
print("FORMATTER TEST - APPLY ACADEMIC FORMATTING")
print("="*80)
print()

# Setup
model = setup_model()
output_dir = Path("tests/outputs/formatter_test")
output_dir.mkdir(parents=True, exist_ok=True)

# Load Architect output
architect_output_path = Path("tests/outputs/architect_test/00_outline.md")

if not architect_output_path.exists():
    print("❌ Architect output not found! Run Architect phase first.")
    sys.exit(1)

architect_output = architect_output_path.read_text(encoding='utf-8')

print("📚 Architect Output Analysis:")
print(f"   Output length: {len(architect_output)} chars")
print(f"   Sections: {architect_output.count('###')}")
print()

# Run Formatter agent
print("🤖 Running Formatter agent...")
print("   Style: APA 7th edition")
print()

start_time = time.time()

formatter_output = run_agent(
    model=model,
    name="Formatter - Apply Style",
    prompt_path="prompts/02_structure/formatter.md",
    user_input=f"Apply academic formatting:\n\n{smart_truncate(architect_output, max_chars=2500, preserve_json=True)}\n\nStyle: APA 7th edition",
    save_to=output_dir / "00_formatted_outline.md",
    skip_validation=True,
    verbose=True
)

elapsed = time.time() - start_time

print()
print("="*80)
print("FORMATTER RESULTS")
print("="*80)
print(f"\n⏱️  Time: {elapsed:.1f}s")
print(f"📄 Output length: {len(formatter_output)} chars")
print(f"💾 Saved to: {output_dir / '00_formatted_outline.md'}")
print()

# Analyze formatting quality
print("📊 Formatting Quality:")

# Check APA elements
has_title_page = "title" in formatter_output.lower()[:500]
has_headers = "##" in formatter_output or "#" in formatter_output
has_sections = formatter_output.count("Chapter") > 0 or formatter_output.count("Section") > 0

print(f"   Title page elements: {'✅' if has_title_page else '❌'}")
print(f"   Headers/structure: {'✅' if has_headers else '❌'}")
print(f"   Organized sections: {'✅' if has_sections else '❌'}")

# Show sample
print(f"\n📖 Sample Formatted Outline (first 800 chars):")
print("-"*80)
print(formatter_output[:800] + "...")
print("-"*80)

print(f"\n✅ Formatter test complete!")
print("="*80)
