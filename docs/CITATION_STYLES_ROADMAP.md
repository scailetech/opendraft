# Citation Styles Roadmap

## Overview

Multi-style citation support for the OpenDraft citation compiler. Citations are formatted for both in-text references and full reference lists.

---

## Phase 1: Chicago & MLA (Complete)

**Status:** Complete

**Styles added:**
- **Chicago (Author-Date)** -- In-text: `(Smith 2023)`, `(Smith and Johnson 2023)`, `(Smith et al. 2023)`
- **MLA 9th Edition** -- In-text: `(Smith)`, `(Smith and Johnson)`, `(Smith et al.)`

**Files changed:**
- `engine/utils/citation_compiler.py` -- Formatter methods + dispatch
- `engine/draft_generator.py` -- `citation_style` parameter, style resolution
- `backend/draft_generator.py` -- Same as above (backend copy)
- `backend/worker.py` -- Pass-through from job record
- `engine/opendraft/cli.py` -- Wire style to `generate_draft()`
- `tests/test_citation_styles.py` -- 17 tests

**Reference formats supported per source type:** journal, book, conference, report/website, fallback.

**Sorting:** Chicago and MLA reference lists are sorted alphabetically by first author (same as APA).

---

## Phase 2: Harvard & Vancouver (Planned)

**Status:** Not started

- **Harvard** -- Similar to APA but with minor formatting differences
- **Vancouver** -- Numbered style similar to IEEE, used in medical/biomedical fields

---

## Phase 3: Web API Integration (Planned)

**Status:** Not started

- Expose `citation_style` in the web API route (`app/app/api/thesis/generate/route.ts`)
- Add `citation_style` column to the database schema
- Frontend UI for style selection

---

## Supported Styles Summary

| Style | In-Text Format | Reference Sorting | Status |
|-------|---------------|-------------------|--------|
| APA 7th | `(Smith, 2023)` | Alphabetical | Shipped |
| IEEE | `[1]` | Order of appearance | Shipped |
| Chicago | `(Smith 2023)` | Alphabetical | Shipped |
| MLA | `(Smith)` | Alphabetical | Shipped |
| Harvard | TBD | TBD | Planned |
| Vancouver | TBD | TBD | Planned |
