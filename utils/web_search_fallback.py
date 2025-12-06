#!/usr/bin/env python3
"""
ABOUTME: Web search fallback using DataForSEO when Gemini Google Search grounding fails
ABOUTME: Direct copy from bulkgpt-01122025 fallback_services.py
"""
# Import from the centralized fallback_services module
from utils.fallback_services import search_web_dataforseo, format_search_results_for_context

# Backward compatibility aliases
DataForSEOSearchClient = None  # Use search_web_dataforseo() directly
WebSearchFallback = None  # Use search_web_dataforseo() directly

