# OpenDraft ↔ OpenPaper Pipeline Convergence Roadmap

## Status: Active
**Created:** 2025-02-04
**Last Updated:** 2025-02-04

---

## Phase 1: Port Features to OpenPaper Monolith (Low Risk, Immediate Value)

Port the 3 new features from OpenDraft's phases/ modules directly into OpenPaper's existing `draft_generator.py` monolith. No architectural changes — just add the capabilities inline.

- [ ] **Expose mode** (`output_type="expose"`) — shorter, punchier output format
- [ ] **Configurable citation style** (`citation_style` param: APA/IEEE/NALT) — currently hardcoded
- [ ] **Per-section `clean_agent_output()`** — strip agent artifacts before assembly

## Phase 2: Battle-Test Phases in OpenDraft (Prove the Architecture)

Run real drafts through OpenDraft's new `engine/phases/` modular pipeline. Fix everything that breaks.

- [ ] Run 5+ real end-to-end draft generations through the phases pipeline
- [ ] Fix circular imports (`compile.py` and `citations.py` → `draft_generator.py`)
- [ ] Add inter-phase validation (don't proceed if research returns empty)
- [ ] Replace deferred imports with proper dependency injection or shared context
- [ ] Add test coverage for each phase module individually
- [ ] Add integration test for full pipeline (research → compose → compile)

## Phase 3: Port Phases Architecture to OpenPaper (Once Proven)

After Phase 2 is stable and tested, refactor OpenPaper's monolith into the same modular phases/ structure.

- [ ] Create `phases/` directory in OpenPaper
- [ ] Extract research phase
- [ ] Extract compose phase
- [ ] Extract compile phase
- [ ] Extract citations phase
- [ ] Wire up orchestrator to call phases
- [ ] Verify full pipeline works on Modal.com deployment
- [ ] Delete monolith code from `draft_generator.py`

---

## Current Sync Status (Completed)

These are already at parity between both projects:

- **Prompts:** 17/21 identical (4 have intentional differences: scout.md preprint section, deep_research.md naming, enhancer.md URLs, factcheck_judge.md OD-only)
- **Utilities:** All shared utils synced (citation handling, token counting, PDF export, research, backpressure, etc.)
- **Bug fixes:** Ported bidirectionally (LaTeX escaping, soffice detection, GEMINI_API_KEY fallback, reference.docx)

## Intentionally Different (Not Sync Targets)

- Pipeline orchestration architecture (phases/ vs monolith) — converges in Phase 3
- Import paths (`utils.X` vs `engine.utils.X`) — structural difference
- Infra-specific files (Modal/Supabase in OP, CLI scripts in OD)
