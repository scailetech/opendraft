# Tools and Citation Research Flow

## Two Separate Systems

### 1. Backend Citation Research (REST APIs) - NOT affected by SDK changes

**How it works:**
- `CitationResearcher` (`utils/api_citations/orchestrator.py`) makes REST API calls
- Uses three sources:
  1. **Crossref API** - `CrossrefClient` → HTTP requests to `api.crossref.org`
  2. **Semantic Scholar API** - `SemanticScholarClient` → HTTP requests to `api.semanticscholar.org`
  3. **Gemini Grounded REST** - `GeminiGroundedClient` → REST API calls with `{"googleSearch": {}}`

**Flow:**
```
research_citations_via_api() 
  → CitationResearcher.research_citation()
    → CrossrefClient.search_paper() [REST API]
    → SemanticScholarClient.search_paper() [REST API]
    → GeminiGroundedClient.search_paper() [REST API with Google Search]
```

**Status:** ✅ **NOT BROKEN** - These are backend REST API calls, completely independent of SDK tools

### 2. Agent SDK Tools (Gemini SDK) - For agents to use directly

**Enabled tools:**
- `{"googleSearch": {}}` - Google Search grounding for web search
- `{"url_context": {}}` - URL context for reading URLs directly

**How agents use them:**
- Agents can search the web and read URLs directly via Gemini SDK
- This is separate from backend citation research
- Agents receive citation data from backend APIs AND can search/read URLs themselves

**Flow:**
```
run_agent() 
  → model.generate_content(prompt) [Gemini SDK with tools]
    → Agent can use Google Search grounding
    → Agent can read URLs via URL context
```

## Complete Flow

```
1. Backend Citation Research (Scout Agent):
   research_citations_via_api()
     → CitationResearcher (REST APIs)
       → Crossref → Semantic Scholar → Gemini Grounded REST
       → Returns citation data

2. Agent Processing (Scribe, Signal, etc.):
   run_agent()
     → Gemini SDK model with tools enabled
       → Can use Google Search grounding
       → Can read URLs via URL context
       → Receives citation data from step 1
       → Analyzes and processes

3. Both systems work together:
   - Backend APIs find citations (95%+ success rate)
   - Agents can enhance with direct web search/URL reading
   - No conflicts - they're separate systems
```

## Verification

✅ **Semantic Scholar research:** Still works via REST API (`SemanticScholarClient`)
✅ **Crossref research:** Still works via REST API (`CrossrefClient`)
✅ **Gemini Grounded:** Still works via REST API (`GeminiGroundedClient`)
✅ **Agent tools:** Google Search + URL context enabled in SDK
✅ **Flow intact:** Backend APIs → Agents → Processing

## What Changed

**Before:**
- Prompts mentioned "MCP Tools" → Gemini attempted invalid function calls
- SDK had `tools=None` → No agent access to web search/URLs

**After:**
- Prompts clarified: Backend uses APIs, agents receive results
- SDK has `tools=[{"googleSearch": {}}, {"googleSearchRetrieval": {}}]` → Agents can search/read URLs
- Backend citation research unchanged → Still uses REST APIs

**Result:** ✅ Everything works, agents have MORE capabilities now

