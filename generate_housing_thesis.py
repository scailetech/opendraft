#!/usr/bin/env python3
"""Generate a master's thesis on Affordable Housing in India using OpenDraft."""
import os
import sys
import zipfile
from pathlib import Path

# Use relative paths for portability
PROJECT_ROOT = Path(__file__).parent.absolute()
sys.path.insert(0, str(PROJECT_ROOT / "engine"))
os.chdir(PROJECT_ROOT / "engine")

from draft_generator import DraftGenerator

OUTPUT_DIR = PROJECT_ROOT / "thesis_housing_india"
os.makedirs(OUTPUT_DIR, exist_ok=True)

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
print(f"Paper Type: Master's Thesis")
print(f"Language: English")
print("\nStarting generation (this may take 15-30 minutes)...")

generator = DraftGenerator()
draft = generator.generate(
    topic=topic,
    paper_type="master",
    language="en"
)

print("\nGeneration complete! Exporting files...")

# Export files
pdf_path = os.path.join(OUTPUT_DIR, "affordable_housing_india_thesis.pdf")
docx_path = os.path.join(OUTPUT_DIR, "affordable_housing_india_thesis.docx")
tex_path = os.path.join(OUTPUT_DIR, "affordable_housing_india_thesis.tex")

try:
    draft.to_pdf(pdf_path)
    print(f"PDF saved: {pdf_path}")
except Exception as e:
    print(f"PDF export error: {e}")

try:
    draft.to_docx(docx_path)
    print(f"DOCX saved: {docx_path}")
except Exception as e:
    print(f"DOCX export error: {e}")

try:
    draft.to_latex(tex_path)
    print(f"LaTeX saved: {tex_path}")
except Exception as e:
    print(f"LaTeX export error: {e}")

# Create ZIP
zip_path = os.path.join(OUTPUT_DIR, "affordable_housing_india_thesis.zip")
try:
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        if os.path.exists(pdf_path):
            zipf.write(pdf_path, os.path.basename(pdf_path))
        if os.path.exists(docx_path):
            zipf.write(docx_path, os.path.basename(docx_path))
        if os.path.exists(tex_path):
            zipf.write(tex_path, os.path.basename(tex_path))
    print(f"\nZIP created: {zip_path}")
except Exception as e:
    print(f"ZIP creation error: {e}")

print("\n" + "=" * 60)
print("THESIS GENERATION COMPLETE!")
print(f"Output directory: {OUTPUT_DIR}")
print("=" * 60)
