# OpenDraft - Quickstart (10 Minutes)

> **✅ Production Ready:** All 15 agents fully tested with 100% coverage. Ready for academic paper writing.

## Prerequisites

- Python 3.9+ installed
- Git
- At least one LLM API key (Gemini, Claude, or GPT)

## Step 1: Clone & Install (3 min)

```bash
# Clone the repository
git clone https://github.com/federicodeponte/opendraft.git
cd opendraft

# Install the package
pip install -e .

# Verify installation
opendraft verify
```

**Expected output:**
```
============================================================
  OpenDraft - Installation Verification
============================================================
🐍 Python version: 3.11.0
   ✅ Compatible (>= 3.9)
[...]
```

If you see any ❌ errors, follow the troubleshooting instructions displayed.

## Step 2: Configure API Keys (2 min)

Create a `.env` file from the example:
```bash
cp .env.example .env
```

Edit `.env` and add at least one API key:
```bash
# Choose at least one:
GEMINI_API_KEY=your_key_here          # Google Gemini (recommended for cost)
ANTHROPIC_API_KEY=your_key_here       # Claude (recommended for quality)
OPENAI_API_KEY=your_key_here          # GPT-4
```

**Get API keys:**
- Gemini: https://makersuite.google.com/app/apikey
- Claude: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys

## Step 3: Verify Setup (1 min)

```bash
# Run verification again to confirm API keys
opendraft verify
```

You should now see ✅ for API Keys section.

## Step 4: Generate Your First Draft! (5 min)

### Option A: Quick Test (Recommended)
```bash
# Run a simple test to generate a short academic paper
python tests/scripts/test_ai_pricing_draft.py
```

This will generate a draft in `tests/outputs/ai_pricing_draft/` (takes ~15-25 min).

### Option B: Custom Draft (Advanced)
1. Open `prompts/00_WORKFLOW.md`
2. Follow the step-by-step agent workflow
3. Paste prompts into Claude Code / Cursor
4. Customize for your research topic

## Step 5: View Output

```bash
# Check generated draft
ls -lh examples/*.pdf

# Open the PDF
open examples/ai_pricing_draft.pdf  # macOS
xdg-open examples/ai_pricing_draft.pdf  # Linux
start examples/ai_pricing_draft.pdf  # Windows
```

## Troubleshooting

### Installation Issues
```bash
# Missing dependencies?
pip install -r requirements.txt

# Permission errors?
pip install -e . --user

# Still having issues?
python -m opendraft.verify
```

### API Key Issues
- Make sure `.env` file is in the project root
- No quotes around API keys in `.env`
- Keys should start with expected prefixes:
  - Gemini: `AIza...`
  - Claude: `sk-ant-...`
  - OpenAI: `sk-...`

### PDF Generation Issues
```bash
# Install PDF engine (WeasyPrint recommended)
pip install weasyprint

# Or use Pandoc
# macOS: brew install pandoc
# Ubuntu: sudo apt-get install pandoc
```

## Next Steps

- 📖 **Full Documentation:** [README.md](README.md)
- 🤖 **Agent Workflow:** [prompts/00_WORKFLOW.md](prompts/00_WORKFLOW.md)
- ⚖️ **Ethics & Responsible Use:** [ETHICS.md](ETHICS.md)
- 🎓 **Example Theses:** [examples/](examples/)
- 🐛 **Report Issues:** [GitHub Issues](https://github.com/federicodeponte/opendraft/issues)

## Need Help?

- **GitHub Discussions:** Ask questions and share tips
- **Bug Reports:** Use GitHub Issues with the bug report template
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Estimated time to first draft:** 10 min setup + 15-25 min generation = 25-35 min total
