# OpenDraft Citation Styles - Technical Roadmap

> **Date**: 2026-02-02 (updated 2026-02-03)
> **Status**: Phases 0–3 complete. ibid/supra deferred to Phase 3.1.
> **Priority**: Feature Request (NALT — Phase 3) ✅ Shipped

---

## Executive Summary

A user from Nigeria requested NALT (Nigerian Association of Law Teachers) citation style support. During investigation, we discovered:

1. **Chicago and MLA styles are broken** - they silently fall back to APA
2. **NALT is architecturally different** - requires footnote-based citations, not author-date
3. **Technical debt opportunities** - Pydantic and Tenacity could improve codebase quality
4. **Code maintainability concerns** - Developer feedback on brittleness and fear of breaking things
5. **OpenPaper sync needed** - Some improvements in OpenPaper backend should be ported back

**Key Decision**: Keep custom architecture (don't switch to LangChain). Focus on tests, types, and documentation instead.

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Issue 1: Broken Chicago/MLA Styles](#issue-1-broken-chicagomla-styles)
3. [Issue 2: NALT Implementation](#issue-2-nalt-implementation)
4. [Technical Improvements](#technical-improvements)
5. [Implementation Plan](#implementation-plan)
6. [NALT Style Guide Reference](#nalt-style-guide-reference)
7. [OpenPaper Backend Comparison](#openpaper-backend-comparison)

---

## Current Architecture

### Citation Flow

```
CLI Selection → CitationDatabase → CitationCompiler → Formatted Output
     ↓                ↓                   ↓
  "apa"          style stored      format_in_text_citation()
  "ieee"         in metadata       generate_reference_list()
  "chicago"                        _format_X_reference()
  "mla"
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `engine/utils/citation_database.py` | Citation data model, CitationStyle type | ~325 |
| `engine/utils/citation_compiler.py` | Formatting logic | ~550 |
| `engine/opendraft/cli.py` | User style selection | ~1200 |

### CitationStyle Type Definition

```python
# citation_database.py:126
CitationStyle = Literal["APA 7th", "IEEE", "NALT"]
```

### Current Citation Class

```python
class Citation:
    id: str                 # cite_001, cite_002
    authors: List[str]      # Author last names
    year: int               # Publication year
    title: str              # Article/book title
    source_type: str        # "journal", "book", "report", "website", "conference"
    language: str           # "english", "german", etc.

    # Optional
    journal: Optional[str]
    publisher: Optional[str]
    volume: Optional[int]
    issue: Optional[int]
    pages: Optional[str]
    doi: Optional[str]
    url: Optional[str]
    access_date: Optional[str]
```

---

## Issue 1: Broken Chicago/MLA Styles

### Problem

Users can select "Chicago" or "MLA" in the CLI, but both silently produce APA-formatted output.

### Evidence

```python
# citation_compiler.py:184-190
def format_in_text_citation(self, citation: Citation) -> str:
    if self.style == "APA 7th":
        return self._format_apa_in_text(citation)
    elif self.style == "IEEE":
        return self._format_ieee_in_text(citation)
    else:
        # Default to APA  <-- BUG: Chicago/MLA fall through here
        return self._format_apa_in_text(citation)

# citation_compiler.py:252-257
for citation in cited_citations:
    if self.style == "APA 7th":
        ref = self._format_apa_reference(citation)
    elif self.style == "IEEE":
        ref = self._format_ieee_reference(citation)
    else:
        ref = self._format_apa_reference(citation)  # <-- BUG
```

### Impact

- Users selecting Chicago/MLA get incorrect formatting
- No warning or error - silent failure
- Could affect academic submissions

### Solution Options

**Option A: Remove Chicago/MLA from CLI** (quick fix)
- Remove unimplemented options from user selection
- Add warning that only APA and IEEE are currently supported

**Option B: Implement Chicago/MLA** (proper fix)
- Chicago: Author-date variant similar to APA but different punctuation
- MLA: Author-page style, different from author-date

### Chicago Style Quick Reference

```
In-text: (Smith 2023, 45)  # Note: no comma after author
Reference: Smith, John. "Article Title." Journal Name 45, no. 3 (2023): 234-256.
```

### MLA Style Quick Reference

```
In-text: (Smith 45)  # Author + page, no year
Reference: Smith, John. "Article Title." Journal Name, vol. 45, no. 3, 2023, pp. 234-256.
```

---

## Issue 2: NALT Implementation

### Background

Feature request from Nigerian law student/researcher:

> "The biggest citation pain point in Nigeria is NALT support. It's our mandatory style, and the complete lack of support in any major tool means hours of manual formatting. If OpenDraft could be the first to properly implement NALT, you'd immediately become the essential tool for an entire generation of Nigerian legal scholars."

### What is NALT?

**Nigerian Association of Law Teachers** citation style - mandatory for legal academia in Nigeria.

### Why NALT is Different

| Feature | APA/IEEE (current) | NALT |
|---------|-------------------|------|
| In-text style | Author-date: `(Smith, 2023)` | **Footnote**: superscript `¹` |
| Reference location | End of document | **Page footnotes** |
| Repeated citations | Full each time | **ibid, supra, (n31)** |
| Quote marks | Double `"` | **Single `'`** |
| Abbreviations | With periods `L.F.N.` | **No periods `LFN`** |
| Source types | Academic only | **+ cases, statutes, constitutions** |

### NALT Source Types (Not Currently Supported)

1. **Cases** (case law)
   - `Bankole v Eshugbayi Eleko [1967] 2 NWLR 46`
   - Requires: parties, year, volume, law report, page

2. **Statutes/Acts**
   - `Child Rights Act 2003, s15(1)(b)`
   - Requires: act name, year, section/subsection

3. **Constitutions**
   - `CFRN 1999, s36(1)`
   - Requires: constitution name, year, section

### New Citation Fields Required

```python
class Citation:
    # Existing fields...

    # NEW: Legal-specific fields
    court: Optional[str]           # "Supreme Court", "High Court"
    case_number: Optional[str]     # Neutral citation
    law_report: Optional[str]      # "NWLR", "AC", "WLR"
    section: Optional[str]         # "s15(1)(b)"
    parties: Optional[str]         # "Bankole v Eshugbayi Eleko"
```

### New source_type Values

```python
source_type: Literal[
    "journal", "book", "report", "website", "conference",  # existing
    "case", "statute", "constitution", "treaty"            # NEW for NALT
]
```

### Footnote System Architecture

Current system uses **in-text citations** (author-date inserted in text).

NALT requires **footnotes**:
1. Superscript number in text: `...as stated by the court.¹`
2. Full citation at page bottom: `¹ Bankole v Eshugbayi Eleko [1967] 2 NWLR 46`
3. Subsequent references use shorthand: `² ibid.` or `³ Bankole (n1) 48.`

This requires:
- Footnote counter per page/section
- Citation history tracking for ibid/supra
- Different rendering path than current in-text approach

### NALT Format Examples

**Books (Textbooks)**
```
Footnote: Jemima Nasir, The Law of Contract in Nigeria (Gbile Publishers 2000)
Bibliography: Nasir J, The Law of Contract in Nigeria (Gbile Publishers 2000)
```

**Journal Articles**
```
Footnote: Friday Nwoke, 'International Labour Law: An Appraisal' [2005] (3)(1) Journal of Public Law and Constitutional Practice, 40-51
```

**Cases**
```
Footnote: Bankole v Eshugbayi Eleko [1967] 2 NWLR 46 (SC)
         Phipps v Boardman [1967] 2 AC 46 (HL)
```

**Statutes**
```
In-text: Child Rights Act 2003, s15(1)(b)
Footnote: CRA 2003 s15(1)(b)
```

**Online Sources**
```
Graham Greenleaf, 'The Global Development of Free Access to Legal Information' (2010) 1(1) EJLT <http://ejlt.org/article/view/17> accessed 27 July 2015
```

**Subsequent Citations**
```
¹ Jemima Nasir, The Law of Contract in Nigeria (Gbile Publishers 2000) 45.
² ibid 46.           # Same source, different page
³ ibid.              # Same source, same page
⁴ Nasir (n1) 50.     # Return to earlier source
```

### Implementation Estimate

| Component | Effort | Lines |
|-----------|--------|-------|
| Citation class extensions | Low | ~30 |
| NALT in-text formatter | Medium | ~50 |
| NALT reference formatter | High | ~200 |
| Footnote tracking system | High | ~150 |
| ibid/supra logic | Medium | ~100 |
| Case/statute formatters | High | ~150 |
| CLI integration | Low | ~20 |
| Tests | Medium | ~100 |
| **Total** | **Medium-High** | **~800** |

---

## Technical Improvements

### 0. Code Maintainability (Developer Concern)

**Context**: Developer feedback that the agent code feels "brittle" and hard to understand, with fear of breaking things when making changes.

**Root Causes** (not the architecture):
- Missing tests - no test caught the Chicago/MLA bug
- No type validation - raw `json.loads()` everywhere
- Implicit data flow - hard to trace what passes between agents
- Large files - `draft_generator.py` is 2,500 lines

**Why NOT LangChain/LangGraph**: The brittleness isn't from using direct API calls. LangChain would replace one complexity with another while losing fine-grained control over citation research. The custom architecture is an asset.

#### Recommended Refactors

| Task | Purpose | Effort |
|------|---------|--------|
| Add integration tests | Catch regressions before they ship | 1-2 days |
| Add Pydantic models | Type-safe LLM outputs, catch errors early | 4-6 hrs |
| Document agent flow | Visual diagram of 19-agent pipeline | 2-4 hrs |
| Split `draft_generator.py` | Break 2,500 lines into phase modules | 1 day |

#### Proposed File Structure

```
engine/
├── phases/
│   ├── __init__.py
│   ├── research.py      # Scout, Scribe, Signal agents
│   ├── structure.py     # Architect, Formatter agents
│   ├── compose.py       # Section writing agents
│   ├── validate.py      # Thread, Narrator agents
│   └── enhance.py       # Post-processing
├── draft_generator.py   # Orchestrator (reduced to ~500 lines)
└── ...
```

#### Agent Flow Diagram (To Create)

```
┌─────────────────────────────────────────────────────────────────┐
│                        RESEARCH PHASE                           │
│  ┌───────┐    ┌────────┐    ┌────────┐                         │
│  │ Scout │───▶│ Scribe │───▶│ Signal │                         │
│  └───────┘    └────────┘    └────────┘                         │
│  Find papers   Summarize    Identify gaps                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       STRUCTURE PHASE                           │
│  ┌───────────┐    ┌───────────┐                                │
│  │ Architect │───▶│ Formatter │                                │
│  └───────────┘    └───────────┘                                │
│  Create outline    Format for doc type                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        COMPOSE PHASE                            │
│  ┌───────┐ ┌─────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐│
│  │ Intro │ │ Lit Rev │ │ Methodology│ │ Results │ │Discussion││
│  └───────┘ └─────────┘ └────────────┘ └─────────┘ └──────────┘│
│  ┌────────────┐                        (parallel execution)     │
│  │ Conclusion │                                                 │
│  └────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       VALIDATE PHASE                            │
│  ┌────────┐    ┌──────────┐                                    │
│  │ Thread │───▶│ Narrator │                                    │
│  └────────┘    └──────────┘                                    │
│  Cross-section  Style                                           │
│  coherence      consistency                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 1. Tenacity (Retry Library)

**Current State**: Custom `retry.py` with ~140 lines of retry logic.

**Proposal**: Replace with [Tenacity](https://github.com/jd/tenacity) library.

**Benefits**:
- Remove 140 lines of custom code
- Async support (current implementation is sync-only)
- Battle-tested by thousands of projects
- More flexible retry strategies

**Before**:
```python
@retry(max_attempts=3, base_delay=2.0, exceptions=(requests.Timeout,))
def fetch_url(url: str) -> str:
    ...
```

**After** (with Tenacity):
```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, max=60),
    retry=retry_if_exception_type((Timeout, ConnectionError))
)
def fetch_url(url: str) -> str:
    ...
```

**Effort**: Low (~2 hours)

### 2. Pydantic (Structured LLM Outputs)

**Current State**: Manual `json.loads()` with try/except throughout codebase.

```python
# Current pattern (fragile)
plan_text = response.text
plan = json.loads(plan_text)  # Fails if malformed
```

**Proposal**: Use Pydantic for LLM output validation.

```python
# With Pydantic
class ResearchPlan(BaseModel):
    queries: list[str]
    focus_areas: list[str]
    methodology: str

plan = ResearchPlan.model_validate_json(response.text)  # Validates structure
```

**Benefits**:
- Immediate validation of LLM outputs
- Clear error messages when structure is wrong
- Type hints for IDE support
- Can use with Gemini/OpenAI structured output modes

**Locations to update**:
- `deep_research.py:278` - Research plan parsing
- `orchestrator.py:911` - Citation response parsing
- `output_validators.py:71` - JSON validation

**Effort**: Medium (~4-6 hours)

---

## Implementation Plan

### Phase 0: Stabilize & Test (Priority: Critical) ✅ DONE

> *"Add tests before any refactor"* - Prevents breaking existing functionality

1. ~~**Add integration tests for citation styles**~~ ✅
   - `tests/test_citation_styles.py` (665 lines) covers APA, IEEE, and verifies Chicago/MLA raise `NotImplementedError`

2. ~~**Add Pydantic models for LLM outputs**~~ ✅
   - `engine/utils/models.py`: `ResearchPlan`, `LLMCitationResponse`, `CitationDatabaseSchema`, `FactCheckJudgeVerdict`, `FactCheckClaim`

3. ~~**Document the 19-agent pipeline**~~ ✅
   - `docs/ARCHITECTURE.md` + `docs/PIPELINE.md` — full agent listing, data flow, input/output contracts

### Phase 1: Fix Broken Styles (Priority: High) ✅ DONE (Option A)

~~**Option A - Quick Fix**~~ ✅ Implemented
1. ~~Remove Chicago/MLA from CLI options~~ ✅ `cli.py` only offers APA/IEEE
2. ~~Update `CitationStyle` type to only include implemented styles~~ ✅ `Literal["APA 7th", "IEEE"]`
3. ~~Add user-facing note that more styles coming soon~~ ✅ `NotImplementedError` with roadmap reference

**Option B - Full Implementation** (deferred)
1. Implement `_format_chicago_in_text()` and `_format_chicago_reference()`
2. Implement `_format_mla_in_text()` and `_format_mla_reference()`
3. Add tests for each style

### Phase 2: Technical Improvements ✅ DONE

1. ~~Add Tenacity to `requirements.txt`~~ ✅
2. ~~Replace custom retry logic with Tenacity internals~~ ✅
3. ~~Port OpenPaper improvements (multi-key API rotation, citation_count persistence)~~ ✅

### Phase 2.5: Code Organization ✅ Complete

1. ~~**Split `draft_generator.py`** into phase modules~~ ✅
   - `phases/research.py` - Scout, Scribe, Signal
   - `phases/structure.py` - Architect, Formatter
   - `phases/citations.py` - Citation management pipeline
   - `phases/compose.py` - Section writers (7 Crafter agents)
   - `phases/validate.py` - Thread, Narrator, FactCheck
   - `phases/compile.py` - Assembly, abstract, export

2. ~~**Reduce `draft_generator.py`** to orchestrator role (~700 lines)~~ ✅

3. ~~**Add token tracking** (port from OpenPaper)~~ ✅
   - `utils/model_config.py` - Pricing data
   - `utils/token_counter.py` - Token counting
   - `utils/token_tracker.py` - Sync TokenTracker
   - Integrated into `agent_runner.py`
   - Generates `token_usage.json` per run

### Phase 3: NALT Implementation ✅ DONE

1. ~~**Extend Citation class** with legal fields~~ ✅ Added `court`, `law_report`, `parties`, `section`
2. ~~**Add new source types** (case, statute, constitution, treaty)~~ ✅ All four added to `CitationSourceType`
3. ~~**Implement footnote system** (separate from in-text citations)~~ ✅ Markdown `[^N]` syntax, counter + definitions
4. ~~**Implement NALT formatters**~~ ✅
   - `_format_nalt_footnote()` - Dispatch to source-type formatters
   - `_format_nalt_bibliography_entry()` - Bibliography entry (surname-first)
   - `_format_nalt_case()` - Case law: `*Parties* [Year] Report (Court)`
   - `_format_nalt_statute()` - Legislation: `Title Year, section`
   - `_format_nalt_constitution()` - Constitution: `Title Year, section`
   - `_format_nalt_treaty()` - Treaty: `Title (Year), section`
   - `_format_nalt_journal()` - Journal: `Author, 'Title' [Year] (Vol)(Issue) *Journal*, Pages`
   - `_format_nalt_book()` - Book: `Author, *Title* (Publisher Year)`
   - `_format_nalt_website()` - Website: `Author, 'Title' <URL> accessed Date`
   - Author helpers: `_format_nalt_authors_footnote()`, `_format_nalt_authors_bibliography()`
5. **Implement citation tracking for ibid/supra** — ⏳ Deferred to Phase 3.1
6. ~~**Add CLI option** for NALT~~ ✅ Interactive menu + `--style nalt` argument
7. ~~**Write comprehensive tests**~~ ✅ 20 new NALT tests (53 total in test_citation_styles.py)

### Phase 3.1: ibid/supra (Planned)

1. Track `_nalt_citation_order: Dict[str, int]` mapping citation_id → first footnote number
2. Track `_last_citation_id: Optional[str]` for consecutive detection
3. Same source consecutively → `ibid` (+ page if different)
4. Earlier source → `Surname (nN) page`
5. ~150 additional lines + dedicated tests

---

## NALT Style Guide Reference

Full NALT style guide available at: `/Users/federicodeponte/Downloads/NALT Style Guide 2.pdf`

### Key Rules Summary

1. **Punctuation**: Minimal - no full stops after abbreviations (LFN not L.F.N.)
2. **Case names**: Italics, lowercase 'v' (Bankole v Eshugbayi Eleko)
3. **Quotes**: Single quotation marks for article titles
4. **Authors**: First name/initials before surname in footnotes, surname first in bibliography
5. **3+ authors**: "and others" (not "et al.")
6. **Online sources**: URL in angle brackets `<>` with access date
7. **Repeated citations**: Use ibid (same source) or (nX) cross-reference

### Common Abbreviations

| Full | Abbreviation |
|------|-------------|
| Laws of Federation of Nigeria | LFN |
| Constitution of the Federal Republic of Nigeria | CFRN |
| Nigerian Weekly Law Report | NWLR |
| section/sections | s/ss |
| paragraph/paragraphs | para/paras |
| page/pages | (none - just number) |

---

## Open Questions (Resolved)

1. **Footnote rendering**: ✅ Resolved — Using Markdown `[^N]` syntax. Pandoc (the export engine) natively supports this for PDF/DOCX output.

2. **Legal source APIs**: Open — Current citation APIs (Crossref, Semantic Scholar) are academic-focused. Legal databases for case law verification remain a future consideration.

3. **Scope of legal support**: ✅ Resolved — Source types (case, statute, constitution, treaty) are generic and work for Nigerian, UK, and Commonwealth legal systems. Not country-specific.

---

---

## OpenPaper Backend Comparison

Compared `/Users/federicodeponte/opendraft/engine` with `/Users/federicodeponte/Downloads/openpaper/backend/engine`.

### Complete File Comparison

#### Files Only in OpenDraft (Keep)

| File | Purpose | Port to OpenPaper? |
|------|---------|-------------------|
| `prompts/01_research/scout.md` | Has preprint handling guidance | **Yes** - important |
| `utils/firecrawl_client.py` | Web scraping | No |
| `utils/groq_adapter.py` | Groq API support | No |
| `generate_*.py` scripts | Test/demo scripts | No |
| `quality_test.py`, `section_comparison.py` | Testing tools | No |

#### Files Only in OpenPaper (Consider Porting)

| File | Purpose | Port to OpenDraft? |
|------|---------|-------------------|
| `utils/model_config.py` | Model pricing info | Recommended |
| `utils/token_tracker.py` | Usage & cost tracking | Recommended |
| `utils/token_counter.py` | Token counting | Recommended |
| `utils/zip_bundle_manager.py` | ZIP exports | No (web-only) |
| `database_config.py` | Prisma/Supabase | No (web-only) |
| `migrations.py` | DB migrations | No (web-only) |

#### Files That Differ (Substantive Changes)

##### 1. `prompts/01_research/scout.md` - OpenDraft has MORE

OpenDraft has preprint handling guidance that's missing from OpenPaper:

```markdown
### ⚠️ PREPRINT HANDLING (Critical)
- Check for published version first
- Preprint age matters (<12mo OK, >24mo avoid)
- Note preprint status in output
```

**Action**: Port this section TO OpenPaper.

##### 2. `concurrency/concurrency_config.py` - OpenPaper has MORE

OpenPaper has tier-adaptive configuration:

```python
# OpenPaper auto-detects API tier and adjusts
tier: API tier ("free", "paid", "custom")
rpm_limit: Requests per minute limit
crafter_parallel: Whether to run 6 Crafter agents in parallel
```

**Action**: Port this TO OpenDraft.

##### 3. `utils/agent_runner.py` - OpenPaper has quiet mode

```python
# OpenPaper addition - respects CLI quiet mode
from utils.api_citations.orchestrator import _verbose_research
if not _verbose_research:
    return  # Suppress output
```

**Action**: Port this TO OpenDraft.

##### 4. `utils/export_professional.py` - OpenPaper more flexible

OpenPaper accepts both `str` and `Path` for file parameters:

```python
# OpenPaper improvement
md_file = Path(md_file)  # Accept both str and Path
```

**Action**: Port this TO OpenDraft.

##### 5. `config.py` - OpenPaper has better API key handling ✅ DONE

```python
# OpenPaper - supports both env var names
google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
```

**Action**: ~~Port this TO OpenDraft.~~ Already present in OpenDraft. Also added multi-key fallback fields (`GOOGLE_API_KEY_FALLBACK`, `_2`, `_3`) in Phase 2.

##### 6. `citation_database.py` - OpenPaper has citation_count ✅ DONE

```python
# OpenPaper addition
citation_count: Optional[int] = None
```

**Action**: ~~Port this TO OpenDraft.~~ Ported in Phase 2. Field added to Citation model, wired through Semantic Scholar and orchestrator.

##### 7. `progress_tracker.py` - Different Supabase env vars

| OpenDraft | OpenPaper |
|-----------|-----------|
| `SUPABASE_URL` | `SUPABASE_PROJECT_URL` |
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_PROJECT_URL` |

**Action**: Align env var names across projects.

#### Code Style Differences (Non-Substantive)

Most files have formatting differences only:
- OpenPaper uses double quotes `"`, OpenDraft uses single quotes `'`
- OpenPaper has multi-line function parameters
- OpenPaper has more blank lines

These are style-only and don't need porting.

---

### Summary: Sync Actions

#### Port TO OpenDraft (from OpenPaper)

| Change | Priority | Effort | Status |
|--------|----------|--------|--------|
| API key handling (GEMINI_API_KEY) | High | 10 min | ✅ Already present |
| Tier-adaptive concurrency | High | 30 min | ✅ Already present (concurrency_config.py) |
| Quiet mode in agent_runner | Medium | 15 min | ✅ Phase 3 sync |
| Path/str flexibility in export | Low | 5 min | ✅ Phase 3 sync |
| `citation_count` field | Low | 5 min | ✅ Phase 2 |
| Token tracking system (3 files) | Medium | 30 min | ✅ Phase 2.5 |
| Multi-key API rotation (Gemini) | High | — | ✅ Phase 2 |
| Tenacity retry library | Medium | — | ✅ Phase 2 |

#### Port TO OpenPaper (from OpenDraft)

| Change | Priority | Effort | Status |
|--------|----------|--------|--------|
| Preprint handling in scout.md | High | 5 min | ✅ Phase 3 sync |

#### Align Across Both

| Change | Priority | Effort | Status |
|--------|----------|--------|--------|
| Supabase env var names | Medium | 15 min | ✅ Phase 3 sync (both accept both naming conventions) |

---

## Contact

Feature request originated from Nigerian legal researcher via WhatsApp (2026-02-02).

User offered to help with style guide details if needed.
