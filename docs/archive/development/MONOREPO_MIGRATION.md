# Monorepo Migration Complete ✅

**Date:** 2025-11-22
**Status:** ✅ Complete - All code in ONE repository

---

## What Changed

### Before (2 Repos)
1. **`opendraft`** - Core framework (15 AI agents)
2. **`academic-thesis-landing`** - Landing page (waitlist, marketing)

### After (1 Repo - Monorepo)
```
opendraft/                           # Single unified repository
├── src/                             # Core OpenDraft framework
│   ├── agents/                      # 15 AI agents
│   ├── core/                        # Orchestrator, pipeline
│   ├── integrations/                # Semantic Scholar, arXiv, etc.
│   └── ...
├── website/                         # Next.js landing page
│   ├── app/                         # Pages, API routes
│   │   ├── api/waitlist/            # Waitlist API
│   │   ├── blog/                    # Blog posts
│   │   └── waitlist/                # Waitlist pages
│   ├── components/                  # React components
│   │   ├── layout/                  # Navigation, footer
│   │   └── waitlist/                # Waitlist UI
│   ├── lib/                         # Utilities
│   │   ├── supabase/                # Database, auth
│   │   └── utils/                   # Helpers, tiers, anti-fraud
│   ├── emails/                      # Email templates
│   ├── public/                      # Static assets
│   └── package.json                 # Website dependencies
├── backend/                         # Modal.com worker (already existed)
│   ├── modal_worker.py              # Batch thesis processor
│   └── requirements.txt
├── docs/                            # Documentation
├── tests/                           # Test suites
├── README.md                        # Main project README
└── ...
```

---

## Migration Steps Executed

### 1. Created `website/` Directory
```bash
cd ~/opendraft
mkdir -p website
```

### 2. Copied Landing Page Code
```bash
rsync -av \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.vercel' \
  ~/academic-thesis-landing/ \
  ~/opendraft/website/
```

### 3. Updated Main README
- Changed title: "OpenDraft" → "OpenDraft"
- Added monorepo note
- Updated website URL

### 4. Created Website-Specific README
- Documented website setup
- Quick start instructions
- Points to parent directory for main docs

### 5. Committed to Main Repo
```bash
git add -A
git commit -m "feat: Merge landing page into monorepo"
git push origin master
```

---

## Repository Structure

### Core Framework (`src/`)
The main OpenDraft application with 15 AI agents:
- Scout, Researcher, Outliner, Writer, Critic, etc.
- Multi-LLM support (Claude, GPT-4, Gemini)
- Integration with 200M+ research papers
- Citation verification
- Export to PDF/Word/LaTeX

**Run:** `python -m src.main`

### Website (`website/`)
Next.js 14 landing page with:
- **Viral waitlist system**
  - 5-tier gamified referrals
  - Two-sided incentives
  - Anti-fraud protection
  - Email verification
- **Blog** (SEO content)
- **Hero CTA** (dual-path: Waitlist + GitHub)
- **shadcn/ui** components
- **Supabase** backend

**Run:**
```bash
cd website
npm install
npm run dev
```

### Backend Worker (`backend/`)
Modal.com serverless worker:
- Daily batch thesis generation (100/day)
- Processes waitlist queue
- Sends completion emails
- Uploads to Supabase Storage

**Run:** `modal deploy backend/modal_worker.py`

---

## Benefits of Monorepo

### 1. Single Source of Truth
- ✅ All OpenDraft code in ONE place
- ✅ Unified version control
- ✅ No sync issues between repos

### 2. Easier Development
- ✅ Clone once, get everything
- ✅ Shared configurations
- ✅ Cross-reference code easily

### 3. Simplified CI/CD
- ✅ One GitHub Actions workflow
- ✅ Atomic commits across frontend/backend
- ✅ Coordinated releases

### 4. Better Documentation
- ✅ Centralized docs in `/docs`
- ✅ Website and framework docs together
- ✅ Consistent README structure

---

## GitHub Repository

**URL:** https://github.com/federicodeponte/opendraft

**Structure:**
- **Branch:** `master` (main branch)
- **Latest Commit:** `e786a50` (feat: Merge landing page into monorepo)

---

## What Happened to `academic-thesis-landing` Repo?

The separate `academic-thesis-landing` repository still exists but is now **archived/deprecated**:

**Options:**
1. **Archive it** - Mark as read-only on GitHub
2. **Delete it** - Remove entirely (code is safe in main repo)
3. **Add deprecation notice** - Update README to point to main repo

**Recommended:** Archive it with a README redirect:
```markdown
# DEPRECATED - Moved to Monorepo

This repository has been merged into the main OpenDraft repository:
https://github.com/federicodeponte/opendraft

All landing page code is now in the `website/` directory.

Please use the main repository for all future development.
```

---

## Deployment

### Website (Vercel)
The website is still deployed from Vercel, but needs configuration update:

**Current:** Points to `academic-thesis-landing` repo
**New:** Should point to `opendraft` repo, `website/` directory

**Update Vercel:**
1. Go to: https://vercel.com/federico-de-pontes-projects/academic-thesis-landing/settings
2. Under "Git" → Change repository to `opendraft`
3. Under "Build & Development Settings":
   - **Root Directory:** `website`
   - **Framework Preset:** Next.js
   - **Build Command:** `cd website && npm run build`
   - **Output Directory:** `website/.next`

### Backend (Modal.com)
Already points to main repo - no changes needed.

---

## Environment Variables

### Website (`website/.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rnuiiqgkytwmztgsanng.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_***
SUPABASE_SERVICE_ROLE_KEY=sb_secret_***

# Resend
RESEND_API_KEY=re_***

# Waitlist Config
NEXT_PUBLIC_DAILY_THESIS_LIMIT=100
NEXT_PUBLIC_REFERRAL_REWARD=100
NEXT_PUBLIC_REFERRALS_REQUIRED=3
NEXT_PUBLIC_BASE_URL=https://opendraft.ai
```

### Core Framework (`src/.env`)
```bash
# LLM API Keys
ANTHROPIC_API_KEY=sk-ant-***
OPENAI_API_KEY=sk-***
GEMINI_API_KEY=AIza***

# Research APIs
SEMANTIC_SCHOLAR_API_KEY=***
```

---

## Development Workflow

### Setup
```bash
# Clone the unified repo
git clone https://github.com/federicodeponte/opendraft.git
cd opendraft

# Install framework dependencies
pip install -r requirements.txt

# Install website dependencies
cd website
npm install
```

### Running Locally
```bash
# Terminal 1: Run core framework
python -m src.main

# Terminal 2: Run website
cd website && npm run dev

# Terminal 3: Run Modal worker (optional)
modal serve backend/modal_worker.py
```

### Making Changes
```bash
# Work in either directory
cd src/          # Framework changes
cd website/      # Landing page changes
cd backend/      # Worker changes

# Commit all together
git add -A
git commit -m "feat: Your change description"
git push origin master
```

---

## Migration Checklist

- [x] Copy landing page to `website/` directory
- [x] Update main README with monorepo note
- [x] Create website-specific README
- [x] Commit and push to main repo
- [ ] Update Vercel deployment settings (root directory → `website`)
- [ ] Archive old `academic-thesis-landing` repo
- [ ] Test website deployment from new structure
- [ ] Update any documentation links

---

## Next Steps

1. **Update Vercel Configuration**
   - Change root directory to `website`
   - Verify deployment works from monorepo

2. **Archive Old Repo**
   - Add deprecation notice to `academic-thesis-landing`
   - Mark as archived on GitHub

3. **Update Documentation**
   - Ensure all links point to monorepo
   - Update CONTRIBUTING.md with new structure

4. **Test Full Workflow**
   - Clone fresh copy
   - Run framework
   - Run website
   - Deploy to production

---

## Summary

✅ **Monorepo created** - All code in `opendraft` repository
✅ **Landing page moved** - Now in `website/` subdirectory
✅ **Structure documented** - Clear separation of concerns
✅ **Pushed to GitHub** - Latest commit: `e786a50`

**Main Repository:** https://github.com/federicodeponte/opendraft

**Everything is now in ONE place!** 🚀
