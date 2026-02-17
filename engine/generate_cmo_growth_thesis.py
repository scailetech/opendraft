#!/usr/bin/env python3
"""Generate Thesis: Beyond Platform Dependency - Growth Investment Capabilities for CMOs"""
import os
import sys
import zipfile
from pathlib import Path

# Use relative paths for portability
ENGINE_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = ENGINE_DIR.parent
os.chdir(ENGINE_DIR)
sys.path.insert(0, str(ENGINE_DIR))

from draft_generator import generate_draft

OUTPUT_DIR = PROJECT_ROOT / "theses_output" / "thesis_cmo_growth_investment"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("THESIS: Beyond Platform Dependency - CMO Growth Investment")
print("=" * 60)

topic = """Beyond Platform Dependency: Growth Investment Capabilities as a Source of Competitive Advantage for CMOs"""

blurb = """Research Question: How does platform dependency increase decision uncertainty in marketing budget allocation, and how does Growth Investment Governance Capability mitigate its negative effect on growth investment decision quality?

This thesis investigates the relationship between platform dependency and marketing budget allocation uncertainty for Chief Marketing Officers (CMOs). It explores how reliance on dominant digital platforms (e.g., Google, Meta, Amazon) creates decision uncertainty in growth investment allocation, and examines Growth Investment Governance Capability as a strategic mechanism that mitigates the negative effects of platform dependency on growth investment decision quality. The research should draw on dynamic capabilities theory, resource-based view, and marketing strategy literature to develop and test a conceptual framework."""

print(f"Topic: {topic}")
print(f"\nResearch Focus: {blurb[:200]}...")
print("\nStarting generation...")

pdf_path, docx_path = generate_draft(
    topic=topic,
    blurb=blurb,
    language="en",
    academic_level="research_paper",
    output_dir=OUTPUT_DIR,
    skip_validation=True,
    verbose=True
)

print("\nGeneration complete!")
print(f"PDF: {pdf_path}")
print(f"DOCX: {docx_path}")

# Create ZIP with both files
zip_path = OUTPUT_DIR / "thesis_cmo_growth_investment.zip"
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    if pdf_path.exists():
        zipf.write(pdf_path, pdf_path.name)
    if docx_path.exists():
        zipf.write(docx_path, docx_path.name)

print(f"\nZIP created: {zip_path}")
print("=" * 60)
print("THESIS COMPLETE!")
print("=" * 60)
