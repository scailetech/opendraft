# OpenDraft V1 - Critical Issues

**Last Updated:** 2026-02-17
**Assessed By:** Claude Code
**Overall Score:** 9/10

> **Note:** V1 was previously marked 10/10 for resolved issues. This update adds
> bottlenecks identified by comparing V1 to V3's more robust architecture.

---

## HIGH Severity Bottlenecks (vs V3)

### 1. No Pipeline-Level Retry
- **Location:** `draft_generator.py:generate_draft()` lines 629-695
- **Problem:** If any agent fails, entire pipeline fails
- **V3 Has:** Pipeline-level retry with 50% extended timeout on failure
- **Impact:** Transient failures require manual re-run from checkpoint
- **Fix:** Wrap agent phase calls in retry loop with extended timeout

---

## MEDIUM Severity Bottlenecks

### 2. No Citation-Claim Verification
- **Location:** `phases/compose.py` (writer prompts)
- **Problem:** Writer uses citations without verifying they support claims
- **V3 Has:** Explicit citation-claim matching rules in writer prompt
- **Impact:** Citation-claim mismatches (e.g., "creatine" citation for "caffeine" claim)
- **Fix:** Add verification instructions to writer prompt

### 3. No Batch Citation Adding
- **Location:** `utils/citation_database.py`
- **Problem:** Citations added one at a time
- **V3 Has:** `citation_db_add_batch()` for bulk inserts
- **Impact:** 35% slower citation phase for large citation sets
- **Fix:** Add batch insert method

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

### Circuit Breaker Pattern - FIXED
- **Problem:** No protection against cascading API failures
- **Solution:** Added `CircuitBreaker` class to `utils/retry.py`
- **Features:**
  - Opens after 5 failures, blocks calls for 60s
  - Half-open state allows probe requests
  - Closes after 2 successes in half-open state
  - Pre-configured breakers: `get_gemini_circuit_breaker()`, `get_citation_circuit_breaker()`

### Expanded Transient Error Detection - FIXED
- **Problem:** Only 8 patterns in `_is_transient_error()`
- **Solution:** Expanded to 30+ patterns in `utils/agent_runner.py`
- **New patterns:** connection reset, server disconnected, DNS, SSL, handshake, resource exhausted, overloaded, capacity, etc.

### Partial Output Capture on Timeout - FIXED
- **Problem:** Agent timeout loses all work
- **Solution:** Added `_capture_partial_output()` to `utils/agent_runner.py`
- **Features:**
  - On timeout, checks for files written to output directory
  - Returns partial content if found (>50 chars)
  - Prevents total loss of work on complex topics

### Empty Loop Detection - FIXED
- **Problem:** Model stuck producing empty outputs wastes API calls
- **Solution:** Added early exit logic to `run_agent()` in `utils/agent_runner.py`
- **Features:**
  - Tracks consecutive empty/trivial outputs (<50 chars)
  - Exits early after 3 consecutive empty outputs
  - Returns partial result instead of wasting retries

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

- **Simplicity:** ~2.3k lines vs V3's ~18k (8x smaller, easier to debug)
- Clean phase separation in `engine/phases/`
- **444 tests passing** (including live API integration tests)
- CI/CD with quality gates
- Recently migrated to google-genai SDK
- Good retry logic in citation scrapers (uses tenacity)
- Inter-phase validation prevents garbage propagation
- Full citation style support (APA, IEEE, Chicago, MLA, NALT)
- Single CLI entry point
- Checkpoint/resume for long runs (`--resume` flag)
- No circular imports between modules
- **Circuit breaker pattern** prevents cascading failures
- **Partial output capture** recovers work on timeout
- **Empty loop detection** prevents wasted API calls
- **30+ transient error patterns** for intelligent retry

---

## V1 vs V3 Comparison

| Feature | V1 | V3 |
|---------|-----|-----|
| Lines of code | ~2.3k | ~18k |
| Tests | 444 | 482 |
| Circuit breaker | **Yes** | Yes |
| Transient error patterns | **30+** | 15+ |
| Pipeline retry | None | 50% extended timeout |
| Partial output capture | **Yes** | Yes |
| Empty loop detection | **Yes** | Yes |
| Citation batch add | No | Yes (-35% cost) |
| Citation-claim verification | No | Yes (prompt rules) |
| Quality gate threshold | 85% | 75% |
| Complexity | Simple | Over-engineered |

**Verdict:** V1 now has most of V3's resilience features while remaining 8x smaller.
Only missing pipeline-level retry, citation-claim verification, and batch citation inserts.

---

## Recommended Priority

**Completed:**
1. ~~Consolidate generate_thesis scripts into CLI~~ DONE
2. ~~Add checkpoint/resume~~ DONE
3. ~~Add inter-phase validation~~ DONE
4. ~~Fix circular imports~~ DONE
5. ~~Add quality gate~~ DONE
6. ~~Add circuit breaker to `utils/retry.py`~~ DONE
7. ~~Expand transient error patterns (30+ patterns)~~ DONE
8. ~~Add partial output capture on timeout~~ DONE
9. ~~Add empty loop detection~~ DONE

**Remaining Bottleneck Fixes:**
1. Add pipeline-level retry with extended timeout
2. Add citation-claim verification rules to writer prompt
3. Add batch citation insert method

**Low Priority (tech debt):**
- Consolidate sprawling utils (36 files)
