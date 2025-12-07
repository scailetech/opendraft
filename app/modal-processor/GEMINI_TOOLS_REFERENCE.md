# Gemini Tools Reference

**Updated**: December 6, 2025

## Architecture: Native Tools (Primary) + Fallbacks

We use **Gemini 2.5 Flash Lite** with native Google tools as the primary approach:

| Tool | Native (Primary) | Fallback |
|------|-----------------|----------|
| `web-search` | `google_search` | DataForSEO |
| `scrape-page` | `url_context` | OpenPull/crawl4ai |

### Why Gemini 2.5 Flash Lite?

- **Supports both tools**: `google_search` AND `url_context`
- **High rate limits**: 4,000 RPM, 4,000,000 TPM
- **No separate tool quotas**: Native tools share model rate limits
- **Fast**: ~2.8s per grounded query

### Why NOT Gemini 2.0 Flash?

- ❌ Does NOT support `url_context` ("Browse tool is not supported")
- Only supports `google_search`

---

## Two-Phase Approach (Required)

**Important**: Gemini does NOT support `tools` + `response_schema` in a single call where tools actually execute. When combined, tools return "Unknown" instead of real data.

### Phase 1: Tool Calling
```python
# CORRECT Python SDK syntax (list of Tool objects, NOT dicts)
# Note: Dict syntax {"google_search": {}} is for REST API only
native_tools = [
    types.Tool(google_search=types.GoogleSearch()),
    types.Tool(url_context=types.UrlContext())
]

response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents=prompt,
    config=types.GenerateContentConfig(
        tools=native_tools
    )
)
# Response contains grounded information
```

### Phase 2: Structured Output
```python
response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents=f"{prompt}\n\n{grounded_context}",
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema={"type": "object", "properties": {...}}
    )
)
# Response is formatted JSON
```

---

## Native Tool Syntax (Prod Hardened)

**Critical Note:** Do NOT use the dictionary syntax `{"google_search": {}}` in production. Under high concurrency (batch processing), the Python SDK fails to validate/serialize it correctly, leading to `Unknown field for FunctionDeclaration` errors.

ALWAYS use the strict typed constructors:

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)

# Web Search
web_tool = types.Tool(google_search=types.GoogleSearch())

# URL Context (scrape page)
url_tool = types.Tool(url_context=types.UrlContext())

# Call with tool list
response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents="Search and analyze...",
    config=types.GenerateContentConfig(
        tools=[web_tool, url_tool]
    )
)
```

---

## Fallback Services

If native tools fail (exception), we fall back to custom implementations:

### DataForSEO (Web Search Fallback)
```python
from fallback_services import search_web_dataforseo, format_search_results_for_context

result = search_web_dataforseo("query", num_results=5)
if result["success"]:
    context = format_search_results_for_context(result)
```

### OpenPull/crawl4ai (URL Context Fallback)
```python
from fallback_services import scrape_page_with_openpull

result = scrape_page_with_openpull("https://example.com", gemini_api_key)
if result["success"]:
    content = result["content"]
```

---

## Rate Limits (Gemini 2.5 Flash Lite)

| Tier | RPM | TPM | RPD |
|------|-----|-----|-----|
| Free | 30 | 1,000,000 | 1,500 |
| Paid | 4,000 | 4,000,000 | Unlimited |

Native tools (`google_search`, `url_context`) share these limits - no separate quotas.
