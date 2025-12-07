# OpenDraft - AI-Powered Academic Thesis Generation

Complete platform for generating professional academic theses with AI, featuring real-time progress tracking and milestone streaming.

## 🎯 What is OpenDraft?

OpenDraft democratizes academic research by providing free, AI-powered thesis generation with:
- **19 specialized AI agents** for research, writing, and formatting
- **Real-time progress tracking** - See every step (30+ granular updates)
- **Professional PDF export** - Pandoc/XeLaTeX quality
- **50+ academic sources** - Auto-verified citations
- **Complete package** - PDF, DOCX, and ZIP with all materials

## 📁 Monorepo Structure

```
opendraft/
├── backend/              # Modal backend for thesis generation
│   ├── modal_worker.py   # Main Modal worker
│   ├── thesis_generator.py
│   └── ...
├── utils/                # Shared utilities
│   ├── progress_tracker.py
│   ├── milestone_streamer.py
│   ├── export_professional.py
│   ├── pdf_engines/      # Pandoc/XeLaTeX exporters
│   └── ...
├── website/              # Marketing site (opendraft.xyz)
│   ├── app/
│   ├── components/
│   └── package.json
├── app/                  # Web app (app.opendraft.xyz)
│   ├── app/
│   │   ├── (authenticated)/write/  # Thesis writer UI
│   │   └── api/thesis/            # API routes
│   ├── components/thesis/
│   └── package.json
├── prompts/              # AI agent prompts
├── examples/             # Showcase theses
└── tests/                # Test files
```

## 🚀 Quick Start

### Backend (Modal)
```bash
cd backend
modal deploy modal_worker.py
```

### Website (opendraft.xyz)
```bash
cd website
npm install
npm run dev
```

### App (app.opendraft.xyz)
```bash
cd app
npm install
npm run dev
# Opens at http://localhost:3000
```

## 🎓 Features

### Progress Tracking
- **30+ granular steps** (research → structure → writing → export)
- Real-time database updates
- Source counting (0 → 50)
- Chapter tracking (0 → 3)
- Phase transitions visible

### Milestone Streaming
- Email notifications at key points
- UI toast notifications
- Progressive engagement
- Partial results (in ZIP)

### Professional Export
- **Pandoc/XeLaTeX ONLY** (WeasyPrint disabled)
- Professional academic formatting
- LaTeX-quality typesetting
- Custom cover pages
- All formats: PDF, DOCX, ZIP

### Web App UI
- Beautiful two-panel layout
- Gradient stat cards
- Milestone markers on progress bar
- Real agent descriptions
- Real-time polling (3s updates)
- Persistent jobs (localStorage)
- Download buttons for all formats

## 🔧 Tech Stack

**Backend**: Python, Modal, Pandoc/XeLaTeX  
**Database**: Supabase (PostgreSQL)  
**Frontend**: Next.js 14, React, TypeScript  
**Styling**: Tailwind CSS, shadcn/ui  
**AI**: Google Gemini 3.0 Pro Preview  
**Fallbacks**: DataForSEO  
**Email**: Resend  

## 📊 Status

**Backend**: ✅ Production ready - Deployed to Modal  
**Website**: ✅ Live at opendraft.xyz  
**App**: ✅ Ready for deployment to app.opendraft.xyz  
**Quality**: ✅ Professional output guaranteed  

## 🎉 Recent Achievements

- ✅ Progress tracking with 30+ steps
- ✅ Milestone streaming
- ✅ Beautiful web app UI
- ✅ Pandoc/XeLaTeX forced (WeasyPrint disabled)
- ✅ Real-time polling working
- ✅ Enhanced UI with gradients and milestones
- ✅ All features tested end-to-end

## 📝 License

MIT

## 👤 Author

Federico De Ponte

---

**OpenDraft - Making Academic Research Accessible to Everyone** 🚀
