#!/usr/bin/env python3
"""Generate Master's Thesis: Affordable Housing in India"""
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

OUTPUT_DIR = PROJECT_ROOT / "thesis_housing_india"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("MASTER'S THESIS: Affordable Housing in India")
print("=" * 60)

topic = """Affordable Housing in India: Challenges, Policies, and Solutions for Sustainable Urban and Rural Development

This thesis examines the affordable housing crisis in India and evaluates policy interventions and solutions. The research analyzes:
1. Historical context and evolution of housing policies in India
2. Current state of housing shortage in urban and rural areas
3. Government initiatives: Pradhan Mantri Awas Yojana (PMAY) and other schemes
4. Role of public-private partnerships in affordable housing
5. Land acquisition and regulatory challenges
6. Financing mechanisms and housing finance companies
7. Construction technology innovations for cost reduction
8. Slum rehabilitation and informal settlement upgrading
9. Environmental sustainability in affordable housing
10. Comparative analysis with other developing nations
11. Recommendations for policy reform and implementation"""

print(f"Topic: Affordable Housing in India")
print(f"Academic Level: Master's Thesis")
print(f"Language: English")
print("\nStarting generation (this may take 15-30 minutes)...")

pdf_path, docx_path = generate_draft(
    topic=topic,
    language="en",
    academic_level="master",
    output_dir=OUTPUT_DIR,
    skip_validation=True,
    verbose=True
)

print("\nGeneration complete!")
print(f"PDF: {pdf_path}")
print(f"DOCX: {docx_path}")

# Create ZIP with both files
zip_path = OUTPUT_DIR / "affordable_housing_india_thesis.zip"
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    if pdf_path.exists():
        zipf.write(pdf_path, pdf_path.name)
    if docx_path.exists():
        zipf.write(docx_path, docx_path.name)

print(f"\nZIP created: {zip_path}")
print("=" * 60)
print("THESIS GENERATION COMPLETE!")
print(f"Output directory: {OUTPUT_DIR}")
print("=" * 60)
