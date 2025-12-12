# OpenDraft - AI-Powered Academic Draft Generation Pipeline

Open-source multi-agent pipeline for generating professional academic drafts using AI.

## What is OpenDraft?

OpenDraft is an AI-powered pipeline that generates academic drafts through a coordinated system of 19 specialized agents:

- **Research Phase**: Scout, Scribe, Signal agents gather and verify sources
- **Structure Phase**: Architect, Formatter agents create outline and structure
- **Compose Phase**: Crafter, Thread, Narrator agents write each section
- **QA Phase**: Skeptic, Verifier, Referee agents review and improve
- **Refine Phase**: Voice, Polish, Entropy agents enhance readability
- **Export Phase**: Generate PDF (Pandoc/XeLaTeX) and DOCX outputs

## Features

- 19 specialized AI agents working in sequence
- Real-time progress tracking (30+ granular steps)
- Professional PDF export via Pandoc/XeLaTeX
- 50+ auto-verified academic citations
- Multiple output formats: PDF, DOCX, Markdown

## Project Structure

```
opendraft/
├── backend/              # Core generation engine
│   ├── draft_generator.py   # Main pipeline orchestrator
│   └── modal_worker.py      # Distributed processing
├── utils/                # Utilities
│   ├── api_citations/       # Citation APIs (Crossref, Semantic Scholar)
│   ├── pdf_engines/         # Export engines (Pandoc, WeasyPrint)
│   ├── export_professional.py
│   └── progress_tracker.py
├── prompts/              # Agent instruction templates
│   ├── 01_research/         # Scout, Scribe, Signal
│   ├── 02_structure/        # Architect, Formatter
│   ├── 03_compose/          # Crafter, Thread, Narrator
│   ├── 04_validate/         # Skeptic, Verifier, Referee
│   ├── 05_refine/           # Voice, Polish, Entropy
│   └── 06_enhance/          # Abstract Generator
├── opendraft/            # CLI interface
├── tests/                # Test suite
├── config.py             # Configuration
└── requirements.txt      # Dependencies
```

## Quick Start

### Installation
```bash
pip install -r requirements.txt
```

### Environment Setup
```bash
cp .env.example .env
# Add your GOOGLE_API_KEY for Gemini
```

### Run Pipeline
```bash
python backend/draft_generator.py --topic "Your research topic" --level master
```

## Tech Stack

- **AI**: Google Gemini 2.0 Flash
- **Citations**: Crossref, Semantic Scholar, Gemini Grounded
- **Export**: Pandoc/XeLaTeX (PDF), python-docx (DOCX)
- **Language**: Python 3.10+

## License

MIT

## Author

Federico De Ponte
