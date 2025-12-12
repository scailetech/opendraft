#!/usr/bin/env python3
"""
Test QA Pass - Thread + Narrator agents.
Uses existing test outputs to verify QA agents work correctly.
"""
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tests.test_utils import setup_model, run_agent

print("="*80)
print("QA PASS TEST - THREAD + NARRATOR AGENTS")
print("="*80)
print()

# Setup
model = setup_model()
output_dir = Path("tests/outputs/qa_test")
output_dir.mkdir(parents=True, exist_ok=True)

# Load existing chapter outputs for QA review
main_body_dir = Path("tests/outputs/main_body_test")

if not main_body_dir.exists():
    print("❌ Main body test outputs not found! Run test_main_body_4_sections.py first")
    sys.exit(1)

# Read all section files
try:
    lit_review = (main_body_dir / "02_1_literature_review.md").read_text(encoding='utf-8') if (main_body_dir / "02_1_literature_review.md").exists() else ""
    methodology = (main_body_dir / "02_2_methodology.md").read_text(encoding='utf-8') if (main_body_dir / "02_2_methodology.md").exists() else ""
    results = (main_body_dir / "02_3_analysis_results.md").read_text(encoding='utf-8') if (main_body_dir / "02_3_analysis_results.md").exists() else ""
    discussion = (main_body_dir / "02_4_discussion.md").read_text(encoding='utf-8') if (main_body_dir / "02_4_discussion.md").exists() else ""

    print(f"📚 Loaded test chapters:")
    print(f"   Literature Review: {len(lit_review):,} chars")
    print(f"   Methodology: {len(methodology):,} chars")
    print(f"   Results: {len(results):,} chars")
    print(f"   Discussion: {len(discussion):,} chars")
    print()
except Exception as e:
    print(f"❌ Error loading chapter files: {e}")
    sys.exit(1)

# Prepare thesis content for QA (truncated for context limits)
thesis_content = f"""# Complete Thesis for QA Review

Topic: The Impact of Precision Medicine and AI on Personalized Healthcare

## Chapter 1: Introduction
[Introduction content - truncated for test]
The advent of precision medicine represents a paradigm shift in healthcare...

## Chapter 2: Main Body

### Section 2.1: Literature Review (First 1000 + Last 1000 chars)
{lit_review[:1000]}
[... middle content truncated ...]
{lit_review[-1000:] if len(lit_review) > 1000 else ''}

### Section 2.2: Methodology (First 1000 + Last 1000 chars)
{methodology[:1000]}
[... middle content truncated ...]
{methodology[-1000:] if len(methodology) > 1000 else ''}

### Section 2.3: Analysis & Results (First 1000 + Last 1000 chars)
{results[:1000]}
[... middle content truncated ...]
{results[-1000:] if len(results) > 1000 else ''}

### Section 2.4: Discussion (First 1000 + Last 1000 chars)
{discussion[:1000]}
[... middle content truncated ...]
{discussion[-1000:] if len(discussion) > 1000 else ''}

## Chapter 3: Conclusion
[Conclusion content - truncated for test]
In conclusion, this thesis has demonstrated the transformative potential...

## Chapter 4: Appendices
[Appendices content - truncated for test]
"""

total_start = time.time()

# ===== QA TEST 1: Thread Agent - Narrative Consistency =====
print("\n" + "="*80)
print("QA TEST 1: THREAD AGENT - NARRATIVE CONSISTENCY")
print("="*80)
qa_start = time.time()

try:
    thread_report = run_agent(
        model=model,
        name="Thread - Narrative Consistency",
        prompt_path="prompts/03_compose/thread.md",
        user_input=f"""Review the complete thesis for narrative consistency.

{thesis_content}

**Check for:**
1. Contradictions across sections
2. Fulfilled promises (Introduction → Conclusion)
3. Proper cross-references
4. Consistent terminology
5. Logical flow between sections

**Focus on Main Body sections 2.1-2.4:**
- Do they reference each other properly?
- Is there narrative continuity?
- Are research gaps from 2.1 addressed in 2.4?

**IMPORTANT:** Be thorough but concise. Identify top 3-5 issues only.""",
        save_to=output_dir / "qa_narrative_consistency.md",
        skip_validation=True,
        verbose=True
    )

    thread_time = time.time() - qa_start
    print(f"\n⏱️  Thread agent time: {thread_time:.1f}s")
    print(f"📄 Report length: {len(thread_report):,} chars")
    print(f"💾 Saved to: {output_dir / 'qa_narrative_consistency.md'}")

    # Analyze report
    has_issues = "Issue" in thread_report or "Problem" in thread_report
    has_rating = "⭐" in thread_report or "/5" in thread_report
    has_sections = "##" in thread_report

    print("\n📊 Report Quality:")
    print(f"   Contains issues/problems: {'✅' if has_issues else '❌'}")
    print(f"   Contains rating: {'✅' if has_rating else '❌'}")
    print(f"   Proper sections: {'✅' if has_sections else '❌'}")

except Exception as e:
    print(f"\n❌ Thread agent FAILED: {e}")
    import traceback
    traceback.print_exc()

print()

# ===== QA TEST 2: Narrator Agent - Voice Unification =====
print("\n" + "="*80)
print("QA TEST 2: NARRATOR AGENT - VOICE UNIFICATION")
print("="*80)
qa_start = time.time()

try:
    narrator_report = run_agent(
        model=model,
        name="Narrator - Voice Unification",
        prompt_path="prompts/03_compose/narrator.md",
        user_input=f"""Review the complete thesis for voice consistency.

{thesis_content}

**Check for:**
1. Consistent tone (formal, objective, confident)
2. Proper person usage (first/third person)
3. Appropriate tense by section
4. Uniform vocabulary level
5. Consistent hedging language

**Target:** Academic master-level thesis
**Citation style:** APA 7th

**IMPORTANT:** Be thorough but concise. Identify top 3-5 voice issues only.""",
        save_to=output_dir / "qa_voice_unification.md",
        skip_validation=True,
        verbose=True
    )

    narrator_time = time.time() - qa_start
    print(f"\n⏱️  Narrator agent time: {narrator_time:.1f}s")
    print(f"📄 Report length: {len(narrator_report):,} chars")
    print(f"💾 Saved to: {output_dir / 'qa_voice_unification.md'}")

    # Analyze report
    has_tone_check = "tone" in narrator_report.lower() or "voice" in narrator_report.lower()
    has_person_check = "person" in narrator_report.lower() or "first" in narrator_report.lower() or "third" in narrator_report.lower()
    has_tense_check = "tense" in narrator_report.lower()

    print("\n📊 Report Quality:")
    print(f"   Checks tone: {'✅' if has_tone_check else '❌'}")
    print(f"   Checks person usage: {'✅' if has_person_check else '❌'}")
    print(f"   Checks tense: {'✅' if has_tense_check else '❌'}")

except Exception as e:
    print(f"\n❌ Narrator agent FAILED: {e}")
    import traceback
    traceback.print_exc()

total_time = time.time() - total_start

print("\n" + "="*80)
print("QA PASS RESULTS")
print("="*80)
print(f"\n⏱️  Total QA time: {total_time:.1f}s")
print(f"📁 Reports saved to: {output_dir}/")
print()

# Check if both reports exist
thread_exists = (output_dir / "qa_narrative_consistency.md").exists()
narrator_exists = (output_dir / "qa_voice_unification.md").exists()

print("📋 QA Reports Generated:")
print(f"   Thread (Narrative): {'✅' if thread_exists else '❌'}")
print(f"   Narrator (Voice): {'✅' if narrator_exists else '❌'}")

if thread_exists and narrator_exists:
    print("\n✅ QA Pass test SUCCESSFUL!")
    print("   Both agents completed and generated reports")
else:
    print("\n⚠️  QA Pass test INCOMPLETE")
    print("   One or more agents failed to generate reports")

print("="*80)
