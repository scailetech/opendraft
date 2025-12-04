# ⚠️ DEPRECATED - Repository Moved

**This repository has been merged into the main OpenDraft monorepo.**

---

## New Location

All code from this repository is now in:

**https://github.com/federicodeponte/academic-thesis-ai**

Specifically in the `website/` directory.

---

## What Happened

This was the standalone landing page repository. We've consolidated everything into a single monorepo for easier development:

```
opendraft/                    # Main repository
├── opendraft/                # Core framework (15 AI agents)
├── website/                  # Landing page (THIS CODE - moved here)
├── backend/                  # Modal worker
├── docs/                     # Documentation
└── tests/                    # Test suites
```

---

## Migration Guide

### If you cloned this repo:
```bash
# Delete this repo
cd ..
rm -rf academic-thesis-landing

# Clone the monorepo instead
git clone https://github.com/federicodeponte/academic-thesis-ai.git
cd academic-thesis-ai/website
npm install
npm run dev
```

### If you forked this repo:
1. Delete your fork of `academic-thesis-landing`
2. Fork `academic-thesis-ai` instead
3. Work in the `website/` directory

---

## Why the Change?

**Benefits of monorepo:**
- ✅ Single source of truth
- ✅ Easier development (one clone, everything)
- ✅ Unified version control
- ✅ Coordinated releases
- ✅ Shared configurations

---

## Deployment

The website is still live at:
- **Production:** https://academic-thesis-landing.vercel.app
- **New domain (coming soon):** https://opendraft.ai

Vercel now deploys from the `website/` directory in the main repository.

---

## Questions?

- 💬 **Discussions:** https://github.com/federicodeponte/academic-thesis-ai/discussions
- 🐛 **Issues:** https://github.com/federicodeponte/academic-thesis-ai/issues
- 📖 **Docs:** https://github.com/federicodeponte/academic-thesis-ai/tree/master/docs

---

**Please use the main repository for all future contributions!**

https://github.com/federicodeponte/academic-thesis-ai
