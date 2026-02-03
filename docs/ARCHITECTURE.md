# OpenDraft Architecture

## Engine Overview

OpenDraft uses a multi-agent pipeline to generate academic papers. The engine is in `engine/` with a backend copy in `backend/` for the web worker.

### Core Pipeline

```
CLI / Web API
  -> generate_draft()
    -> Scout Agent (research + citations)
    -> Architect Agent (outline)
    -> Formatter Agent (style)
    -> Scribe/Crafter/Enhancer Agents (writing)
    -> Citation Compiler (replace {cite_XXX} with formatted citations)
    -> Export (PDF + DOCX)
```

---

## Citation System

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Citation model | `engine/utils/citation_database.py` | `Citation` class, `CitationDatabase`, `CitationStyle` type |
| Citation compiler | `engine/utils/citation_compiler.py` | In-text formatting, reference list generation, missing citation research |
| Citation researcher | `engine/utils/api_citations/` | Crossref, Semantic Scholar, Gemini fallback chain |

### Supported Citation Styles

The citation compiler supports four styles, configured via the `CitationStyle` literal type:

- **APA 7th** -- `(Author, Year)` in-text, alphabetical references
- **IEEE** -- `[N]` numbered in-text, order-of-appearance references
- **Chicago (Author-Date)** -- `(Author Year)` in-text, alphabetical references
- **MLA 9th Edition** -- `(Author)` in-text (no year), alphabetical Works Cited

Style is selected in the CLI (`--style` flag or interactive menu) and flows through `generate_draft()` -> `CitationDatabase` -> `CitationCompiler`.

### Citation Flow

1. Scout agent discovers citations via API (Crossref, Semantic Scholar)
2. Citations stored in `CitationDatabase` with chosen style
3. Writing agents reference citations as `{cite_001}`, `{cite_002}`, etc.
4. `CitationCompiler.compile_citations()` replaces placeholders with formatted in-text citations
5. `CitationCompiler.generate_reference_list()` appends the reference/bibliography section

---

## Entry Points

| Entry Point | File | Notes |
|-------------|------|-------|
| CLI (interactive + quick) | `engine/opendraft/cli.py` | `--style` flag for citation style |
| Backend worker | `backend/worker.py` | Reads from job record, defaults to APA |
| Web API | `app/app/api/thesis/generate/route.ts` | Citation style not yet exposed |
| Benchmarks | `benchmark/run_opendraft.py` | Always uses default APA |
