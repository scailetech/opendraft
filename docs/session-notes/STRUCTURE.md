# OpenDraft Monorepo Structure

## Directory Layout

```
opendraft/
│
├── backend/                          # Thesis generation backend (Modal)
│   ├── modal_worker.py               # Main Modal worker with progress tracking
│   ├── thesis_generator.py           # Core thesis generation logic
│   ├── test_*.py                     # Test files
│   └── email_templates/              # Email HTML templates
│
├── utils/                            # Shared utilities
│   ├── progress_tracker.py           # Real-time progress updates
│   ├── milestone_streamer.py         # Milestone emails + uploads
│   ├── detailed_progress.py          # Granular 30+ step tracking
│   ├── export_professional.py        # PDF/DOCX export
│   ├── pdf_engines/                  # Export engines (Pandoc only!)
│   │   ├── pandoc_engine.py          # Pandoc/XeLaTeX (ONLY engine)
│   │   ├── factory.py                # WeasyPrint DISABLED
│   │   └── base.py
│   ├── fallback_services.py          # DataForSEO fallback
│   └── api_citations/                # Citation research
│
├── prompts/                          # AI agent prompts
│   ├── 01_research/
│   ├── 02_structure/
│   └── 03_compose/
│
├── website/                          # Marketing site (opendraft.xyz)
│   ├── app/
│   ├── components/
│   ├── package.json
│   └── ...                           # Next.js site
│
├── app/                              # Web app (app.opendraft.xyz)
│   ├── app/
│   │   ├── (authenticated)/write/    # Thesis writer UI
│   │   └── api/thesis/               # API routes
│   ├── components/
│   │   └── thesis/
│   │       └── ThesisWriter.tsx      # Main UI component
│   ├── lib/
│   ├── package.json
│   └── .env.local                    # Local config
│
├── examples/                         # Showcase theses
│   ├── Why_Academic_Thesis_AI_Saves_The_World.pdf
│   └── ...
│
├── tests/                            # Test suite
│   └── ...
│
├── docs/                             # Documentation
│   ├── session-notes/                # Development session notes
│   └── ...
│
├── README.md                         # Main documentation
├── QUICKSTART.md                     # Quick start guide
├── CONTRIBUTING.md                   # Contribution guidelines
├── LICENSE                           # MIT License
└── .gitignore                        # Clean gitignore
```

## Component Descriptions

### Backend (`/backend`)
- **Modal workers** for parallel thesis generation
- **Progress tracking** with 30+ granular steps
- **Milestone streaming** for progressive notifications
- **Pandoc/XeLaTeX export** for professional PDFs
- **DataForSEO fallback** for rate limit handling

### Utils (`/utils`)
- **Shared across backend and frontends**
- Progress tracking utilities
- Export engines (Pandoc/XeLaTeX ONLY)
- Citation research
- Fallback services

### Website (`/website`)
- **Marketing site** at opendraft.xyz
- Waitlist signup
- Landing page
- Blog
- Next.js 14

### App (`/app`)
- **Web application** for app.opendraft.xyz
- Thesis writer UI
- Real-time progress display
- API routes
- Next.js 14

### Examples (`/examples`)
- Showcase theses for demos
- Reference implementations

---

## Clean Principles

1. ✅ **No duplication** - Shared utils in /utils
2. ✅ **Clear separation** - Backend, website, app distinct
3. ✅ **Clean docs** - Session notes archived
4. ✅ **Gitignore** - No build artifacts or secrets
5. ✅ **README** - Comprehensive main documentation
6. ✅ **Single source** - One monorepo for everything

---

## Status

**Structure**: ✅ Clean monorepo  
**Backend**: ✅ In /backend with all fixes  
**App**: ✅ In /app with enhanced UI  
**Utils**: ✅ Shared and organized  
**Docs**: ✅ Cleaned and archived  

**Ready for production deployment!** 🚀

