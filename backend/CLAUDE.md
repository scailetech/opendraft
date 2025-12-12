# Backend Thesis Generation System

## Gemini Model Configuration

**IMPORTANT: Use `gemini-2.5-flash` for citation research**

The Gemini Grounded client (`utils/api_citations/gemini_grounded.py`) uses:
- Model: `gemini-2.5-flash` (fast grounding with urlContext)
- Tools: Both `googleSearch` and `urlContext` enabled
- Timeout: 30s (gemini_grounded.py:170)
- Parallel API timeout: 30s (orchestrator.py:278)
- Purpose: Industry source discovery (McKinsey, WHO, Gartner reports, etc.)

This model is 19.6x faster than gemini-3-pro-preview with similar quality.

**Performance Notes:**
- With urlContext enabled, grounding takes 4-18s per query (average ~12s)
- Academic queries: ~14s average
- Industry queries: ~11s average
- 32 parallel workers can process ~60 queries in ~15-30 seconds
- Previous approach (gemini-3-pro-preview): ~7-10 minutes for 60 queries
- Rate limiting from Crossref/Semantic Scholar bypassed with proxy rotation

## Citation Research Architecture

### Multi-Source Collection Strategy

**CRITICAL: The orchestrator now collects ALL valid citations from parallel API calls, not just one.**

When all 3 APIs (Crossref, Semantic Scholar, Gemini Grounded) are executed in parallel:
- Previous behavior: Round-robin selection picked ONE result, discarded the others
- New behavior: ALL valid results are collected and returned as List[Citation]
- Impact: 2-3x more citations collected per query (if all APIs return valid results)

This change dramatically increases citation yield:
- Old: 60 queries × 1 result = 60 max citations (with early stopping at 27)
- New: 60 queries × 2-3 results = 120-180 potential citations

### API Execution Pattern
1. **Parallel Execution**: Crossref + Semantic Scholar + Gemini Grounded run simultaneously
2. **Result Collection**: ALL valid results collected (not round-robin)
3. **Timeout**: 30s global timeout for parallel execution (prevents waiting 15+ minutes for slow queries)
4. **Return**: List[Citation] containing 0-3 citations per query
5. **Gemini Grounding Fallback**: Gemini uses googleSearch grounding tool first, automatically falls back to DataForSEO SERP API (2000 RPM) if googleSearch hits quota limits

### Rate Limiting Strategy

**With Proxy Rotation (Evomi residential proxy):**
- Minimal delay: 0.5s retry delay for 429/5xx errors
- No exponential backoff (next request uses different proxy)
- Immediate retry with new IP address

**Without Proxies:**
- Exponential backoff: 1s → 2s → 4s → 8s → 16s
- Backpressure manager adjusts delays dynamically

### Optimization Configuration
- Workers: 32 parallel (from 4 baseline)
- Batch size: 60 queries at once (from 15 baseline)
- Batch delay: 0s with proxies (0.5s without)
- Proxy: Evomi residential proxy for bypassing Crossref/Semantic Scholar rate limits
- Target citations: 50+ (from 25 baseline)

Expected performance: ~7-10 minutes for 60 queries with 50-150+ citations collected

## Deep Research Mode

Two-phase system:
1. **Planning Phase**: Gemini LLM generates 50-60 systematic research queries
2. **Execution Phase**: Orchestrator runs queries through parallel API calls, collecting ALL valid results

Results in 50-150+ sources vs 20-30 in normal mode.
