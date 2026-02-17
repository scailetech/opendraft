# OpenDraft V1 - Critical Issues

**Last Updated:** 2026-02-17
**Assessed By:** Claude Code
**Overall Score:** 10/10

---

## FIXED Issues

### 1. Multiple Entry Point Scripts - FIXED
- **Status:** Deleted 8 obsolete hardcoded topic scripts
- **Remaining:** 3 dev scripts moved to `engine/dev/` (tracked, llama4, gptoss)
- **Solution:** Use CLI: `opendraft "Your Topic" --level master`

### 5. No Inter-Phase Validation - FIXED
- **Status:** Added validation after each pipeline phase
- **Location:** `draft_generator.py` lines 329-376
- **Validates:** research has citations, structure has outline, citations populated, compose has sections

### 8. Hardcoded Citation Style - FIXED
- **Status:** Added Chicago (Author-Date) and MLA 9th Edition support
- **Solution:** `--style apa|ieee|chicago|mla|nalt`
- **Files:** `cli.py`, `phases/citations.py`, `utils/citation_compiler.py`

### Citation Bug - FIXED
- **Problem:** Citations rendered as `{cite_cite_001}` instead of `{cite_001}`
- **Location:** `phases/citations.py` line 128
- **PR:** https://github.com/scailetech/opendraft/pull/25

### 4. Circular Imports - FIXED
- **Problem:** `phases/compile.py` and `phases/citations.py` imported from `draft_generator.py`
- **Solution:** Moved `slugify()` and `get_language_name()` to `utils/text_utils.py`
- **Status:** All phase modules now import independently without circular dependencies

### 2. Checkpoint/Resume - FIXED
- **Problem:** Long pipeline runs (10-30 min) cannot recover from failure
- **Solution:** Added checkpoint system that saves state after each phase
- **Files:** `utils/checkpoint.py`, `draft_generator.py`
- **Usage:** `opendraft "topic" --resume /path/to/checkpoint.json`
- **Features:**
  - Saves checkpoint.json after each phase (research, structure, citations, compose, validate)
  - Resumes from any phase, skips completed work
  - Restores full context including citations and outputs

### 3. Quality Gate - FIXED
- **Problem:** Always runs full pipeline regardless of output quality
- **Solution:** Added quality scoring after compose phase
- **File:** `utils/quality_gate.py`
- **Scoring:** 100 points total (25 each: word count, citations, completeness, structure)
- **Behavior:**
  - Score >= 85: Skip QA phase (already high quality)
  - Score >= 50: Continue with warnings
  - Score < 50 + strict mode: Fail fast with error

---

## LOW Severity (Remaining)

### 6. Sprawling Utils
- **Files:** 36 utils files + 9 API citation files
- **Problem:** Hard to find functionality, unclear boundaries
- **Impact:** Slow onboarding, duplicate code likely
- **Priority:** Low (tech debt)

### 7. Cost Tracking
- **Status:** TokenTracker now integrated into core pipeline
- **File:** `draft_generator.py` - saves `token_usage.json` after each run
- **Remaining:** Dev scripts in `engine/dev/` have more detailed tracking

---

## What Works Well

- Clean phase separation in `engine/phases/`
- 290 tests passing
- CI/CD with quality gates
- Recently migrated to google-genai SDK
- Good retry logic in citation scrapers
- Inter-phase validation prevents garbage propagation
- Full citation style support (APA, IEEE, Chicago, MLA, NALT)
- Single CLI entry point
- Checkpoint/resume for long runs (`--resume` flag)
- No circular imports between modules

---

## Recommended Priority

1. ~~Consolidate generate_thesis scripts into CLI~~ DONE
2. ~~Add checkpoint/resume~~ DONE
3. ~~Add inter-phase validation~~ DONE
4. ~~Fix circular imports~~ DONE
5. ~~Add quality gate~~ DONE

**All critical issues resolved!** Only low-priority tech debt remains (sprawling utils).
