# Custom Fallback Implementation for Rate Limits

## Overview

This implementation adds custom fallbacks for Gemini's Google Search grounding and URL context tools to handle rate limits (429 errors):

- **DataForSEO**: Fallback for web search when Gemini Google Search grounding hits rate limits
- **OpenPull**: Fallback for URL context when Gemini URL context tool hits rate limits

## Files Created

1. **`utils/web_search_fallback.py`**
   - `DataForSEOSearchClient`: DataForSEO API client
   - `WebSearchFallback`: Wrapper that tries Gemini first, falls back to DataForSEO

2. **`utils/url_context_fallback.py`**
   - `OpenPullClient`: OpenPull API client for URL content extraction
   - `URLContextFallback`: Wrapper that tries Gemini first, falls back to OpenPull

## Integration Points

### 1. Gemini Grounded Client (`utils/api_citations/gemini_grounded.py`)

The `search_paper()` method now automatically falls back to DataForSEO when:
- Gemini REST API returns 429 (rate limit)
- Gemini REST API call fails for any reason

**Usage**: Automatic - no code changes needed in callers.

### 2. Agent Runner (`utils/agent_runner.py`)

Added rate limit detection for Gemini SDK tools (Google Search/URL context). When rate limited:
- Catches exceptions containing "429" or "rate limit"
- Logs warning and retries

**Note**: Full fallback integration for SDK tools requires detecting which specific tool failed. Current implementation provides basic retry logic.

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# DataForSEO (web search fallback)
DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password

# OpenPull (URL context fallback)
OPENPULL_API_KEY=your_openpull_api_key
```

## API Endpoints

### DataForSEO
- **Base URL**: `https://api.dataforseo.com/v3`
- **Endpoint**: `/serp/google/organic/live/advanced`
- **Auth**: Basic Auth (login/password)
- **Docs**: https://dataforseo.com/apis

### OpenPull
- **Base URL**: `https://api.openpull.com/v1` (adjust based on actual API)
- **Endpoint**: `/extract`
- **Auth**: Bearer token
- **Docs**: Check OpenPull documentation for actual endpoints

## How It Works

1. **Normal Flow**: Gemini Google Search/URL context tools work as before
2. **Rate Limit Detected**: 
   - REST API: Returns 429 → Fallback to DataForSEO/OpenPull
   - SDK Tools: Exception raised → Logged and retried
3. **Fallback Used**: 
   - DataForSEO provides web search results
   - OpenPull provides URL content
   - Results converted to same format as Gemini responses

## Testing

To test the fallbacks:

```python
from utils.web_search_fallback import WebSearchFallback
from utils.url_context_fallback import URLContextFallback

# Test web search fallback
search = WebSearchFallback()
results = search.search("test query")
print(results)

# Test URL context fallback
url_fallback = URLContextFallback()
content = url_fallback.fetch("https://example.com")
print(content)
```

## Notes

- Fallbacks are **disabled** if API keys are not configured (graceful degradation)
- Fallbacks only activate when Gemini returns 429 or fails
- DataForSEO/OpenPull responses are converted to match Gemini's format for compatibility
- All fallback calls are logged for monitoring

## Reference

Based on patterns from `bulkgpt-01122025` (as requested).

