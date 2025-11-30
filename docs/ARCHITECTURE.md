# Architecture Overview

**OpenDraft** - AI-Powered Academic Writing Framework

**Version:** 1.3.1 (Beta)
**Last Updated:** 2025-11-22

---

## Repository Structure

This is a **monorepo** containing multiple related projects unified under a single codebase.

### Why a Monorepo?

- **Shared Utilities:** Core AI agents, citation APIs, and exporters used across CLI and web
- **Consistent Testing:** Single test suite validates both interfaces
- **Unified Documentation:** One source of truth for architecture and usage
- **Atomic Changes:** Update agents, CLI, and website in a single commit

### Repository Contents

```
opendraft/                  # Repository root
├── opendraft/              # Main Python package (CLI entry point)
│   ├── __init__.py        # Package initialization
│   ├── cli.py             # Command-line interface entry point
│   ├── verify.py          # Installation verification
│   └── version.py         # Version management
├── utils/                  # Core business logic
│   ├── api_citations/     # Citation APIs (Crossref, Semantic Scholar, arXiv, PubMed)
│   ├── formatting/        # Document formatting utilities
│   ├── pdf_engines/       # PDF generation engines
│   ├── citation_*.py      # Citation management modules
│   └── export*.py         # PDF, DOCX, LaTeX exporters
├── concurrency/            # Async execution and rate limiting
├── prompts/                # AI agent prompts (15 agents across 6 phases)
│   ├── 01_research/       # Scout, Scribe, Signal
│   ├── 02_structure/      # Architect, Formatter, Citation Manager
│   ├── 03_compose/        # Crafter, Thread, Narrator
│   ├── 04_validate/       # Skeptic, Verifier, Referee
│   ├── 05_refine/         # Voice, Entropy, Polish
│   └── 06_enhance/        # Enhancer
├── backend/                # Modal.com serverless backend
├── tests/                  # Test suite (70+ tests)
│   ├── scripts/           # Integration test scripts
│   └── outputs/           # Generated thesis examples
├── website/                # Next.js landing page (separate deployment)
├── docs/                   # Documentation
│   ├── guides/            # User guides (BEST_PRACTICES.md, FAQ.md)
│   └── archive/           # Historical docs
└── examples/               # Sample theses (4 production PDFs)
```

---

## Project #1: CLI Tool (`opendraft/`)

**Primary Interface:** Command-line Python application

### Installation

```bash
git clone https://github.com/federicodeponte/opendraft.git
cd opendraft
pip install -e .  # Editable mode (recommended)
```

### Usage

```bash
opendraft verify  # Verify installation
opendraft --help  # Show available commands
# or
thesis-ai --help  # Alias
```

### Components

**Entry Point:** `opendraft/cli.py`
- Parses command-line arguments
- Orchestrates 15-agent workflow
- Exports to PDF/DOCX/LaTeX

**Core Logic:** `utils/` directory
- **`utils/api_citations/`**: Citation APIs (Crossref 200M+ papers, Semantic Scholar, arXiv, PubMed)
- **`utils/citation_*.py`**: Citation management, compilation, validation
- **`utils/export*.py`**: Format converters (Markdown → PDF, DOCX, LaTeX)
- **`utils/pdf_engines/`**: PDF generation engines (WeasyPrint, Pandoc)

**Configuration:** `config.py` (project root)
- API keys (via `.env`)
- Model selection
- Output formats

### Dependencies

See `pyproject.toml` for full list. Key dependencies:
- `google-generativeai` - Gemini API
- `anthropic` - Claude API
- `openai` - OpenAI API
- `weasyprint` - PDF generation
- `python-docx` - DOCX export
- `pybtex` - Citation formatting

---

## Project #2: Website (`website/`)

**Primary Interface:** Web application (Next.js frontend + Python Modal backend)

### Deployment

**Frontend (Vercel):**
```bash
cd website
npm run build
vercel --prod
```

**Backend (Modal):**
```bash
cd website/backend
modal deploy
```

### Structure

```
website/
├── app/                    # Next.js 15.5.4 App Router
│   ├── page.tsx           # Landing page
│   ├── demo/              # Interactive demo
│   └── docs/              # Documentation viewer
├── backend/                # Python Modal serverless worker
│   ├── main.py            # Modal app entry point
│   ├── thesis_worker.py   # Async thesis generation
│   └── requirements.txt   # Python dependencies
├── components/             # React components
├── public/                 # Static assets
└── .env.local             # Environment variables (gitignored)
```

### How It Works

1. **User submits topic** via Next.js form
2. **Frontend calls Modal endpoint** (serverless Python worker)
3. **Modal worker runs CLI logic** (same 15-agent workflow)
4. **Returns thesis** to frontend (PDF/DOCX/LaTeX)

**Why Modal?**
- **Serverless Python** - No server management
- **Shared Codebase** - Uses same `utils/` agents as CLI
- **Auto-scaling** - Handles traffic spikes
- **Cost-effective** - Pay per second of execution

---

## Shared Components

These are used by **both** CLI and website:

### 1. AI Agents (`utils/agents/`)

15 specialized agents in a 5-phase pipeline:

**Phase 1: Research (3 agents, parallel)**
- **Scout** - Research planning, database queries
- **Scribe** - Literature review (5k-8k words, 20-50 papers)
- **Signal** - Citation discovery (200M+ papers)

**Phase 2: Structure (2 agents, sequential)**
- **Architect** - Thesis outline (IMRaD or thematic)
- **Formatter** - Style compliance (APA/MLA/Chicago)

**Phase 3: Writing (3 agents, sequential)**
- **Crafter** - Section writing (15k-30k words)
- **Thread** - Coherence checking
- **Narrator** - Voice consistency

**Phase 4: QA (3 agents, parallel)**
- **Skeptic** - Fact-checking
- **Verifier** - Citation validation (95%+ accuracy)
- **Referee** - Peer review simulation

**Phase 5: Polish (4 agents, parallel)**
- **Voice** - Tone refinement
- **Entropy** - Variation analysis
- **Polish** - Final refinement
- **Enhancer** - Quality boost

### 2. Citation APIs (`utils/citations/`)

4-tier fallback system for 200M+ papers:

1. **Crossref** - 150M+ academic papers (primary)
2. **Semantic Scholar** - 200M+ CS/ML papers
3. **arXiv** - Preprints (physics, CS)
4. **PubMed** - Medical/biology papers

**Success Rate:** 95%+ citation accuracy (validated on 4 production theses)

### 3. Exporters (`utils/exporters/`)

**Formats Supported:**
- **PDF** - Publication-ready (via WeasyPrint)
- **DOCX** - Microsoft Word (via python-docx)
- **LaTeX** - Academic journals
- **Markdown** - Plain text with formatting

---

## Data Flow

### CLI Workflow

```
User Input
   ↓
opendraft CLI
   ↓
Phase 1: Research (Scout + Scribe + Signal) → 20-50 papers
   ↓
Phase 2: Structure (Architect + Formatter) → Thesis outline
   ↓
Phase 3: Writing (Crafter + Thread + Narrator) → 20k-30k words
   ↓
Phase 4: QA (Skeptic + Verifier + Referee) → Validation
   ↓
Phase 5: Polish (Voice + Entropy + Polish + Enhancer) → Final draft
   ↓
Exporter (PDF/DOCX/LaTeX)
   ↓
Output Files (saved to outputs/)
```

### Website Workflow

```
User Browser (Next.js)
   ↓
POST /api/generate-thesis
   ↓
Modal Serverless Worker (Python)
   ↓
[Same 5-phase agent workflow]
   ↓
Return thesis (streamed)
   ↓
User Download (PDF/DOCX/LaTeX)
```

---

## Testing Strategy

### Test Categories

**Unit Tests** (`tests/` - 178 collected)
- Agent logic
- Citation APIs
- Exporters

**Integration Tests** (`tests/scripts/`)
- Full thesis generation
- End-to-end workflows
- Multi-LLM validation

**E2E Tests** (Manual)
- Website deployment
- CLI installation
- User acceptance testing

### Running Tests

```bash
# All tests
pytest

# Specific test file
pytest tests/scripts/test_ai_pricing_thesis.py

# Skip slow tests
pytest -m "not slow"

# With coverage
pytest --cov=. --cov-report=term-missing
```

---

## Performance Metrics

**Based on 4 production theses:**

| Metric | Value | Notes |
|--------|-------|-------|
| **Generation Time** | 20-25 min | Gemini 2.5 Flash |
| **Word Count** | 20,000-30,000 | Publication-ready |
| **Citations** | 40-60 | Verified via DOI |
| **Citation Accuracy** | 95%+ | 4-tier fallback system |
| **Cost (Gemini Flash)** | $10-$35 | Per thesis |
| **Cost (Claude Sonnet)** | $50-$100 | Higher quality |

---

## Dependencies Between Projects

### CLI → Website

**Shared:**
- ✅ `utils/` agents
- ✅ Citation APIs
- ✅ Exporters

**Independent:**
- CLI has `opendraft/cli.py`
- Website has Modal worker (`backend/modal_worker.py`)

### Website → CLI

**Independent:**
- Website can run without CLI installed
- Modal worker imports directly from `utils/`

---

## Deployment Architecture

### CLI (PyPI - Future)

```
User Machine
   ↓
pip install opendraft
   ↓
opendraft (local execution)
   ↓
Gemini/Claude/OpenAI APIs (cloud)
   ↓
Citations APIs (Crossref, Semantic Scholar)
   ↓
Local PDF/DOCX output
```

### Website (Vercel + Modal)

```
User Browser
   ↓
Next.js Frontend (Vercel CDN)
   ↓
Modal Serverless Worker (Python)
   ↓
Gemini/Claude/OpenAI APIs
   ↓
Citation APIs
   ↓
Stream response to browser
```

**Why This Architecture?**
- **Frontend (Vercel):** Fast global CDN, automatic HTTPS
- **Backend (Modal):** Python serverless, no Docker, auto-scaling
- **Shared Logic:** Both use same `utils/` codebase

---

## Configuration Management

### Environment Variables

**CLI (`.env`):**
```bash
GEMINI_API_KEY=your-key
CLAUDE_API_KEY=your-key  # Optional
OPENAI_API_KEY=your-key  # Optional
```

**Website Frontend (`.env.local`):**
```bash
NEXT_PUBLIC_MODAL_ENDPOINT=https://modal.com/your-endpoint
```

**Website Backend (Modal Secrets):**
```bash
modal secret create gemini-key GEMINI_API_KEY=your-key
modal secret create claude-key CLAUDE_API_KEY=your-key
```

---

## Future Roadmap

### Planned Improvements (v2.0)

**Code Structure:**
- Move `utils/` into `opendraft/` package
- Proper Python package hierarchy
- Importable modules (`from opendraft.agents import Scout`)

**Multi-Tenancy:**
- User authentication (website)
- Per-user API quotas
- Rate limiting

**Scalability:**
- Parallel agent execution (reduce 20-25 min → 5-10 min)
- Caching layer (Redis)
- Queue system (Celery)

**LLM Support:**
- Multi-LLM ensembles
- Cost optimization (auto-select cheapest model)
- Fallback chains

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

**Key Points:**
- Both CLI and website share `utils/`
- Changes to agents affect both interfaces
- Test both CLI and website before merging
- Keep monorepo structure (don't split repositories)

---

## Questions?

- **CLI Issues:** [GitHub Issues](https://github.com/federicodeponte/opendraft/issues)
- **Website Issues:** Same repo, use `[website]` tag
- **Architecture Questions:** See [FAQ.md](guides/FAQ.md)
- **Usage Help:** See [BEST_PRACTICES.md](guides/BEST_PRACTICES.md)

---

**Last Updated:** 2025-11-22
**Version:** 1.3.1 (Beta)
