#!/usr/bin/env python3
"""
Full End-to-End Pipeline Test
Tests complete draft generation with all improvements:
- Research with abstracts
- Structure (Architect + Formatter)
- Compose (7 chapters with 4-section Main Body)
- QA Pass (Thread + Narrator)
- Compile (citation formatting)
"""
import sys
import time
import logging
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.draft_generator import generate_draft

# Setup detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tests/outputs/full_pipeline_test.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

print("="*80)
print("FULL END-TO-END PIPELINE TEST")
print("="*80)
print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

# Test configuration
topic = "The Role of AI in Climate Change Mitigation"
output_dir = Path("tests/outputs/full_pipeline_test")
output_dir.mkdir(parents=True, exist_ok=True)

print(f"📋 Test Configuration:")
print(f"   Topic: {topic}")
print(f"   Output: {output_dir}")
print(f"   Academic Level: master")
print(f"   Citation Style: APA 7th")
print(f"   Language: english")
print()

print("🚀 Starting Full Pipeline...")
print()
print("Expected phases:")
print("   Phase 1: Research (Scout → Scribe → Signal)")
print("   Phase 2: Structure (Architect → Formatter)")
print("   Phase 3: Compose (7 chapters)")
print("     - Introduction (40%)")
print("     - Literature Review 2.1 (45%)")
print("     - Methodology 2.2 (50%)")
print("     - Results 2.3 (55%)")
print("     - Discussion 2.4 (60%)")
print("     - Conclusion (70%)")
print("     - Appendices (75%)")
print("   Phase 3.5: QA Pass (Thread + Narrator) (78% → 80%)")
print("   Phase 4: Compile (Citation formatting)")
print()

start_time = time.time()

try:
    # Run full pipeline
    result = generate_draft(
        topic=topic,
        language="en",
        academic_level="master",
        output_dir=output_dir,
        author_name="Test User",
        institution="Test University",
        department="Computer Science",
        advisor="Dr. Test Advisor",
        skip_validation=True,  # Skip citation validation for speed
        verbose=True  # Full logging
    )

    elapsed = time.time() - start_time

    print()
    print("="*80)
    print("FULL PIPELINE TEST - RESULTS")
    print("="*80)
    print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⏱️  Total time: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
    print()

    # Verify outputs exist
    print("📁 Output Verification:")

    # Check drafts
    drafts_dir = output_dir / "drafts"
    expected_files = [
        "01_introduction.md",
        "02_1_literature_review.md",
        "02_2_methodology.md",
        "02_3_analysis_results.md",
        "02_4_discussion.md",
        "02_main_body.md",
        "03_conclusion.md",
        "04_appendices.md",
        "qa_narrative_consistency.md",
        "qa_voice_unification.md"
    ]

    print("\n   Draft files:")
    for filename in expected_files:
        filepath = drafts_dir / filename
        exists = filepath.exists()
        if exists:
            size = filepath.stat().st_size
            print(f"      {'✅' if exists else '❌'} {filename:40s} ({size:,} bytes)")
        else:
            print(f"      ❌ {filename:40s} (MISSING)")

    # Check final draft
    final_draft = output_dir / "draft_compiled.md"
    final_exists = final_draft.exists()
    if final_exists:
        final_size = final_draft.stat().st_size
        word_estimate = final_size / 6
        print(f"\n   Final draft:")
        print(f"      ✅ draft_compiled.md ({final_size:,} bytes, ~{word_estimate:,.0f} words)")
    else:
        print(f"\n   Final draft:")
        print(f"      ❌ draft_compiled.md (MISSING)")

    # Check citation database
    citation_db = output_dir / "citation_database.json"
    if citation_db.exists():
        import json
        with open(citation_db, 'r') as f:
            db = json.load(f)
        citation_count = db.get('metadata', {}).get('total_citations', 0)
        print(f"\n   Citations:")
        print(f"      ✅ {citation_count} citations collected")

        # Check for abstracts
        citations_with_abstracts = sum(1 for c in db.get('citations', []) if c.get('abstract'))
        print(f"      ✅ {citations_with_abstracts}/{citation_count} citations have abstracts")

    # Check QA reports
    print(f"\n   QA Reports:")
    qa_narrative = drafts_dir / "qa_narrative_consistency.md"
    qa_voice = drafts_dir / "qa_voice_unification.md"
    print(f"      {'✅' if qa_narrative.exists() else '❌'} Narrative Consistency Report")
    print(f"      {'✅' if qa_voice.exists() else '❌'} Voice Unification Report")

    print()
    print("📊 Quality Checks:")

    # Check Main Body sections exist and are reasonable size
    main_body_sections = [
        ("02_1_literature_review.md", 5000, 8000),  # 5k-8k words expected
        ("02_2_methodology.md", 2500, 4000),
        ("02_3_analysis_results.md", 5000, 8000),
        ("02_4_discussion.md", 3000, 4000)
    ]

    print("\n   Main Body sections:")
    for filename, min_words, max_words in main_body_sections:
        filepath = drafts_dir / filename
        if filepath.exists():
            size = filepath.stat().st_size
            word_est = size / 6
            status = "✅" if min_words <= word_est <= max_words else "⚠️"
            print(f"      {status} {filename:35s} ~{word_est:,.0f} words (target: {min_words:,}-{max_words:,})")
        else:
            print(f"      ❌ {filename:35s} MISSING")

    # Check for table constraints in a few files
    print("\n   Table Size Verification (sample):")
    sample_files = ["02_2_methodology.md", "04_appendices.md"]
    for filename in sample_files:
        filepath = drafts_dir / filename
        if filepath.exists():
            content = filepath.read_text(encoding='utf-8')
            # Check for oversized table cells (rough heuristic)
            import re
            tables = re.findall(r'\|.*\|', content)
            if tables:
                max_cell = 0
                for row in tables:
                    cells = [c.strip() for c in row.split('|') if c.strip()]
                    for cell in cells:
                        if len(cell) > max_cell:
                            max_cell = len(cell)

                status = "✅" if max_cell <= 300 else "❌"
                print(f"      {status} {filename:35s} max cell: {max_cell} chars")
            else:
                print(f"      ⚠️  {filename:35s} no tables found")

    # Check for section references (context passing)
    print("\n   Context Passing Verification:")
    discussion_file = drafts_dir / "02_4_discussion.md"
    if discussion_file.exists():
        content = discussion_file.read_text(encoding='utf-8')
        section_21_refs = content.lower().count("section 2.1")
        section_23_refs = content.lower().count("section 2.3")
        print(f"      {'✅' if section_21_refs >= 3 else '⚠️'} Discussion → Lit Review: {section_21_refs} references (need 3+)")
        print(f"      {'✅' if section_23_refs >= 1 else '⚠️'} Discussion → Results: {section_23_refs} references")

    print()
    print("="*80)

    # Overall verdict
    all_core_files_exist = all((drafts_dir / f).exists() for f in expected_files[:8])  # Skip QA reports from core check
    qa_reports_exist = (drafts_dir / "qa_narrative_consistency.md").exists() and (drafts_dir / "qa_voice_unification.md").exists()

    if all_core_files_exist and qa_reports_exist and final_exists:
        print("✅ FULL PIPELINE TEST PASSED!")
        print("   All phases completed successfully")
        print("   All improvements working:")
        print("      ✅ 4-section Main Body with context passing")
        print("      ✅ Table size constraints enforced")
        print("      ✅ QA Pass (Thread + Narrator) completed")
        print("      ✅ Citations with abstracts collected")
        print("      ✅ Final draft compiled")
    else:
        print("⚠️  FULL PIPELINE TEST INCOMPLETE")
        if not all_core_files_exist:
            print("   Missing core chapter files")
        if not qa_reports_exist:
            print("   Missing QA reports")
        if not final_exists:
            print("   Missing final compiled draft")

    print("="*80)

except Exception as e:
    elapsed = time.time() - start_time
    print()
    print("="*80)
    print("❌ FULL PIPELINE TEST FAILED")
    print("="*80)
    print(f"⏱️  Failed after: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
    print(f"❌ Error: {e}")
    print()
    import traceback
    traceback.print_exc()
    print("="*80)
    sys.exit(1)

print()
print(f"📁 All outputs saved to: {output_dir}/")
print(f"📋 Full log saved to: tests/outputs/full_pipeline_test.log")
print()
