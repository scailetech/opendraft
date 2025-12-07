# 🤖 AEO Visibility Machine

**Standalone AEO content generation platform** - Generate keywords and blogs optimized for AI search engines (ChatGPT, Perplexity, Claude, Gemini).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

---

## ✨ Features

### 🎯 **Context Analysis**
- Deep website analysis with Gemini 3.0 Pro Preview
- Native Google Search integration for competitive intelligence
- URL context extraction for brand understanding
- Automatic extraction of pain points, value propositions, use cases

### 🔑 **AEO Keyword Research**
- AI-powered keyword generation optimized for answer engines
- AEO-specific scoring (type, intent, citation potential)
- Support for 28+ languages and 50+ countries
- CSV export with comprehensive metadata
- Bulk upload via CSV (up to 50 keywords)

### ✍️ **Blog Generation (OpenBlog Engine)**
- 12-stage pipeline for enterprise-grade content
- AEO scores of 70-85+ (industry-leading)
- Automatic internal linking between batch blogs
- Smart citation validation
- FAQ/PAA extraction
- SEO-optimized metadata
- Markdown export

### 🎨 **Advanced Content Control**
- **6 Writing Tones**: Professional, Casual, Technical, Friendly, Authoritative, Educational
- **Client Knowledge Base**: Company-specific facts for AI context
- **Content Instructions**: Per-blog style and structure guidance
- **Batch Generation**: Multiple blogs with cross-linking (up to 50)

### 📊 **Execution Logging**
- Local storage of all keyword/blog generations
- Export history as CSV or Markdown
- Generation time tracking
- AEO score history

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/federicodeponte/openaeomachine.git
cd openaeomachine

# Install dependencies
npm install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```bash
# Required: Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Modal endpoints (for blog generation)
# Defaults to public Modal endpoints if not set
MODAL_BLOG_WRITER_ENDPOINT=https://clients--blog-writer-fastapi-app.modal.run
```

### User Settings

Set your Gemini API key in the app:
1. Go to **Settings** (user menu)
2. Enter your Gemini API key
3. Save (stored in browser localStorage)

---

## 📖 Usage Guide

### 1. **Company Context Analysis**

Navigate to **CONTEXT** tab:
- Enter a company website URL (e.g., `scaile.tech`)
- Click **Analyze Website**
- AI extracts: description, industry, products, competitors, pain points, value propositions, use cases, content themes
- Context is stored and auto-populated for keyword/blog generation

### 2. **Keyword Generation**

Navigate to **RUN** tab:
- **Single Mode**: Enter one keyword
- **Batch Mode**: Add multiple keywords manually or upload CSV
- **CSV Format**: `keyword[,word_count][,instructions]`
  ```csv
  AI in healthcare
  Machine learning basics,1500
  Data science tools,2000,Include case studies
  ```
- Configure:
  - Language (28+ supported)
  - Country (50+ supported)
  - Word count
  - Tone (Professional/Casual/Technical/etc.)
  - Advanced: Client knowledge base + content instructions
- Click **Generate Keywords**
- Export results as CSV

### 3. **Blog Generation**

Navigate to **BLOGS** tab:
- **Single Mode**: Generate one blog
- **Batch Mode**: Generate multiple blogs with internal linking
- Upload keywords via CSV (same format as keyword generation)
- Configure:
  - Word count (500-3000)
  - Tone with examples
  - Advanced options (optional):
    - Client Knowledge Base: Company facts
    - Content Instructions: How to write
- Click **Generate**
- Export as Markdown

### 4. **Execution History**

Navigate to **LOG** tab:
- View all past keyword/blog generations
- Export individual results
- Clear history

---

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Gemini 3.0 Pro Preview (native tools)
- **Blog Engine**: OpenBlog (Modal-hosted, 12-stage pipeline)
- **Storage**: localStorage (client-side)

### Key Components

```
app/
├── (authenticated)/          # Protected routes
│   ├── context/             # Company analysis
│   ├── go/                  # Keyword generation
│   ├── blogs/               # Blog generation
│   ├── log/                 # Execution history
│   └── settings/            # API key management
├── api/
│   ├── analyse-website/     # Context extraction (Gemini 3.0 Pro)
│   ├── generate-keywords/   # Keyword research (Gemini)
│   └── generate-blog/       # Blog generation (OpenBlog)
└── components/
    ├── context/             # ContextForm
    ├── keywords/            # KeywordGenerator
    └── blogs/               # BlogGenerator
```

### External Services

- **Gemini 3.0 Pro Preview**: Company analysis, keyword research
  - Native Google Search integration
  - Native URL Context extraction
- **OpenBlog (Modal)**: Enterprise blog generation
  - 12-stage pipeline
  - AEO scoring
  - Citation validation
  - Internal linking

---

## 🎯 AEO Optimization

### What is AEO?

**Answer Engine Optimization (AEO)** optimizes content for AI platforms like:
- ChatGPT (OpenAI)
- Perplexity AI
- Claude (Anthropic)
- Gemini (Google)
- Mistral

### AEO Features

**Keyword Research**:
- `aeo_type`: question/comparison/recommendation/problem-solving/how-to/definition
- `search_intent`: transactional/informational/navigational
- `ai_citation_potential`: high/medium/low
- `competition_level`: low/medium/high
- `relevance_score`: 0-100

**Blog Generation**:
- Conversational, question-answering format
- Entity-rich content with contextual relationships
- Structured data (FAQ, TOC, sections)
- Citation validation (15-20 sources)
- AEO scores of 70-85+

---

## 📝 CSV Formats

### Keywords CSV

```csv
keyword[,word_count][,instructions]
```

**Examples**:
```csv
AI in healthcare
Machine learning basics,1500
Data science tools,2000,Include case studies and ROI data
Cloud computing,1800,Target CTOs and technical buyers
```

### Export Formats

**Keywords**: CSV with all AEO fields  
**Blogs**: Markdown (`.md`) with full HTML content

---

## 🔐 Privacy & Data

- **No external database**: All data stored in browser localStorage
- **API keys**: Stored securely in localStorage (never sent to our servers)
- **Context data**: Only sent to Gemini API for analysis
- **Blog generation**: Processed via secure Modal endpoints

---

## 🤝 Contributing

This is a standalone tool. For enterprise features or custom deployments, contact [SCAILE](https://scaile.tech).

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🔗 Related Projects

- **OpenBlog**: [federicodeponte/openblog](https://github.com/federicodeponte/openblog) - 12-stage AEO blog generation pipeline
- **SCAILE**: [scaile.tech](https://scaile.tech) - Enterprise AEO services

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/federicodeponte/openaeomachine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/federicodeponte/openaeomachine/discussions)
- **Email**: [federico@scaile.tech](mailto:federico@scaile.tech)

---

**Built with ❤️ by [SCAILE](https://scaile.tech)**
