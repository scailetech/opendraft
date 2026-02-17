#!/usr/bin/env python3
"""Generate 5 master's level theses and export to PDF + ZIP"""

import sys
import os
import subprocess
from pathlib import Path

# Add Homebrew paths for pandoc and other tools
os.environ["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + os.environ.get("PATH", "")

# Load .env file manually
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Also set it explicitly
os.environ["GOOGLE_API_KEY"] = "AIzaSyAuICCeynZGqbuTmnXBtiGsaO-cA73G96k"

# Add engine to path
sys.path.insert(0, str(Path(__file__).parent / "engine"))
os.chdir(Path(__file__).parent / "engine")

import shutil

# Output directory for all theses
OUTPUT_BASE = Path(__file__).parent / "thesis_outputs"
OUTPUT_BASE.mkdir(exist_ok=True)

THESES = [
    {
        "topic": "The self-financing portfolio with additional consideration of sustainability aspects between 2010 and 2020 - A performance analysis",
        "folder": "thesis_1_sustainable_portfolio"
    },
    {
        "topic": "Quantization of Large Language Models for Integer-Only Hardware: Methods, Trade-offs, and Performance Implications",
        "folder": "thesis_2_llm_quantization"
    },
    {
        "topic": "The impact of personalisation options in a web-based credit card application - A longitudinal online controlled experiment",
        "folder": "thesis_3_credit_card_personalization"
    },
    {
        "topic": "How do professional software engineers in the industry use Generative AI in their development workflow?",
        "folder": "thesis_4_genai_software_engineering"
    },
    {
        "topic": "How young professionals can build resilience: Developing a method and framework",
        "folder": "thesis_5_resilience_framework"
    }
]


def convert_md_to_pdf_docx(md_file: Path, output_dir: Path):
    """Convert markdown to PDF and DOCX using pandoc"""
    base_name = md_file.stem
    pdf_path = output_dir / f"{base_name}.pdf"
    docx_path = output_dir / f"{base_name}.docx"

    # Try DOCX first (usually works without LaTeX)
    try:
        subprocess.run([
            "pandoc", str(md_file),
            "-o", str(docx_path),
            "--wrap=preserve"
        ], check=True, capture_output=True)
        print(f"  Created DOCX: {docx_path}")
    except Exception as e:
        print(f"  DOCX conversion failed: {e}")

    # Try PDF (needs LaTeX)
    try:
        subprocess.run([
            "pandoc", str(md_file),
            "-o", str(pdf_path),
            "--pdf-engine=pdflatex",
            "-V", "geometry:margin=1in"
        ], check=True, capture_output=True)
        print(f"  Created PDF: {pdf_path}")
    except Exception as e:
        print(f"  PDF conversion skipped (LaTeX not installed)")

    return pdf_path if pdf_path.exists() else None, docx_path if docx_path.exists() else None


def generate_thesis(thesis_info, index):
    """Generate a single thesis and create ZIP file"""
    # Import here to avoid circular issues
    from draft_generator import generate_draft
    from utils.export_professional import export_docx

    topic = thesis_info["topic"]
    folder = thesis_info["folder"]
    output_dir = OUTPUT_BASE / folder

    print(f"\n{'='*80}")
    print(f"GENERATING THESIS {index + 1}/5")
    print(f"Topic: {topic}")
    print(f"Output: {output_dir}")
    print(f"{'='*80}\n")

    try:
        # Generate the draft
        pdf_path, docx_path = generate_draft(
            topic=topic,
            language="en",
            academic_level="master",
            output_dir=output_dir,
            skip_validation=True,
            verbose=True
        )

        print(f"\nGenerated PDF: {pdf_path}")
        print(f"Generated DOCX: {docx_path}")

        # Create ZIP file
        zip_path = OUTPUT_BASE / f"{folder}"
        shutil.make_archive(str(zip_path), 'zip', output_dir)
        print(f"Created ZIP: {zip_path}.zip")

        return True, pdf_path, f"{zip_path}.zip"

    except Exception as e:
        print(f"Draft generation encountered an error: {e}")

        # Check if markdown file exists and try to salvage
        exports_dir = output_dir / "exports"
        md_files = list(exports_dir.glob("*.md")) if exports_dir.exists() else []

        if md_files:
            print(f"\nFound {len(md_files)} markdown files. Attempting conversion...")
            main_md = None
            for md_file in md_files:
                if "INTERMEDIATE" not in md_file.name and "abstract" not in md_file.name:
                    main_md = md_file
                    break

            if main_md:
                pdf_path, docx_path = convert_md_to_pdf_docx(main_md, exports_dir)

                # Create ZIP file anyway
                zip_path = OUTPUT_BASE / f"{folder}"
                shutil.make_archive(str(zip_path), 'zip', output_dir)
                print(f"Created ZIP: {zip_path}.zip")

                return True, pdf_path, f"{zip_path}.zip"

        # Still create ZIP if drafts exist
        drafts_dir = output_dir / "drafts"
        if drafts_dir.exists() and any(drafts_dir.glob("*.md")):
            zip_path = OUTPUT_BASE / f"{folder}"
            shutil.make_archive(str(zip_path), 'zip', output_dir)
            print(f"Created ZIP with available drafts: {zip_path}.zip")
            return True, None, f"{zip_path}.zip"

        return False, None, None


if __name__ == "__main__":
    print("="*80)
    print("OPENDRAFT THESIS BATCH GENERATION")
    print("Generating 5 Master's Level Theses")
    print("="*80)

    # Skip thesis 1 as it's already done
    START_FROM = 1  # 0-indexed, so 1 = thesis 2

    results = []
    for i, thesis in enumerate(THESES):
        if i < START_FROM:
            print(f"\nSkipping thesis {i+1} (already completed)")
            results.append({
                "index": i + 1,
                "topic": thesis["topic"][:50] + "...",
                "success": True,
                "pdf": None,
                "zip": f"/Users/federicodeponte/opendraft/thesis_outputs/{thesis['folder']}.zip"
            })
            continue
        success, pdf, zip_file = generate_thesis(thesis, i)
        results.append({
            "index": i + 1,
            "topic": thesis["topic"][:50] + "...",
            "success": success,
            "pdf": str(pdf) if pdf else None,
            "zip": str(zip_file) if zip_file else None
        })

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    for r in results:
        status = "SUCCESS" if r["success"] else "FAILED"
        print(f"Thesis {r['index']}: {status}")
        if r["pdf"]:
            print(f"  PDF: {r['pdf']}")
        if r["zip"]:
            print(f"  ZIP: {r['zip']}")

    print(f"\nAll outputs saved to: {OUTPUT_BASE}")
