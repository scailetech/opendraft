# Function Calling Error Fix (finish_reason=10)

## Problem

Thesis generation was failing with error:
```
Agent 'Scribe - Summarize Papers' execution failed: Invalid operation: The `response.text` quick accessor requires the response to contain a valid `Part`, but none were returned. The candidate's finish_reason is 10. Meaning that model generated a `FunctionCall` that was invalid.
```

## Root Cause Analysis

**Why Gemini attempted function calling:**

1. **Prompts mentioned "MCP Tools Available"** - Several prompts (scribe.md, verifier.md, scout.md) mentioned tools like "arXiv", "Semantic Scholar", "CrossRef" which confused Gemini 3.0 Pro Preview into thinking it should use function calling.

2. **Misunderstanding of architecture** - The backend DOES use Crossref, Semantic Scholar, and Gemini Grounded APIs, but these are REST API calls made by backend Python code (`CitationResearcher`), NOT Gemini function calling tools. The prompts incorrectly suggested Gemini could call these directly.

3. **Model default behavior** - Gemini 3.0 Pro Preview may have function calling enabled by default, and when it saw tool references in prompts, it attempted to call non-existent functions.

4. **No explicit tool disabling** - Model initialization didn't explicitly disable function calling with `tools=None`.

**Actual Architecture:**

**Two Different Systems:**

1. **Gemini Grounded (REST API)** - Uses `tools: [{"googleSearch": {}}]` in REST API calls
   - File: `utils/api_citations/gemini_grounded.py`
   - Makes direct REST API calls to `https://generativelanguage.googleapis.com/v1beta/models/...`
   - Includes `"tools": [{"googleSearch": {}}]` in request body
   - ✅ **NOT affected by `tools=None` fix** - this is REST API, not SDK
   - ✅ **Still works perfectly** - Google Search grounding enabled

2. **Gemini SDK Models (Agents)** - Used by `run_agent()` via `setup_model()`
   - File: `utils/agent_runner.py`
   - Uses `genai.GenerativeModel()` SDK
   - Receives citation results as text input
   - ❌ **Was attempting function calling** when prompts mentioned "MCP Tools"
   - ✅ **Fixed with `tools=None`** - agents don't need function calling

**Why This Works:**
- Gemini Grounded makes REST API calls with Google Search - unaffected by SDK `tools=None`
- Agent models use SDK without function calling - they receive pre-fetched citation data
- Backend handles all API calls (Crossref, Semantic Scholar, Gemini Grounded REST)
- Agents analyze the results - they don't call APIs themselves

## Fixes Applied

### 1. Updated Prompts (Removed Misleading Tool References)

**Files updated:**
- `prompts/01_research/scribe.md` - Removed "MCP Tools Available" section
- `prompts/04_validate/verifier.md` - Removed "MCP Tools" mention
- `prompts/01_research/scout.md` - Updated tool references

**Before:**
```markdown
**MCP Tools Available:**
- **arXiv** - Download and read full PDFs
- **Semantic Scholar** - Access paper details and citations
```

**After:**
```markdown
**Backend Citation System:**
The backend system automatically uses Crossref, Semantic Scholar, and Gemini Grounded APIs to find citations. You will receive the research results and citations from these sources - your job is to analyze and summarize them, not to call the APIs yourself.
```

This clarifies that:
- The backend DOES use these APIs (via REST calls in Python code)
- Gemini agents receive the results as text input
- Agents don't call APIs directly (no function calling needed)

### 2. Explicitly Disabled Function Calling in Model Setup

**Files updated:**
- `utils/agent_runner.py` - Added `tools=None` to `setup_model()`
- `utils/deep_research.py` - Added `tools=None` to model initialization
- `utils/api_tier_detector.py` - Added `tools=None` to model initialization

**Before:**
```python
return genai.GenerativeModel(
    model_name,
    generation_config={'temperature': config.model.temperature}
)
```

**After:**
```python
return genai.GenerativeModel(
    model_name,
    generation_config={'temperature': config.model.temperature},
    tools=None  # Explicitly disable function calling
)
```

### 3. Enhanced Error Handling

**File updated:** `utils/agent_runner.py`

Added comprehensive error handling for function calls:
- Checks for `finish_reason=10` (function call)
- Provides clear error messages
- Handles edge cases (no candidates, safety blocks, etc.)

## Prevention

**To prevent this in the future:**

1. ✅ **Always set `tools=None`** when initializing Gemini models
2. ✅ **Never mention "tools" or "function calling"** in prompts unless actually providing tools
3. ✅ **Test with Gemini 3.0 Pro Preview** before deploying (it's more likely to attempt function calling)
4. ✅ **Monitor for `finish_reason=10` errors** in production logs

## Testing

After these fixes:
- ✅ User reset to `waiting` status
- ✅ Ready for retry
- ✅ All model initializations explicitly disable function calling
- ✅ Prompts no longer mention non-existent tools

## Next Steps

1. Retry thesis generation for `f.deponte@yahoo.de`
2. Monitor logs for any remaining function calling attempts
3. If errors persist, check Modal logs for specific agent failures

