#!/usr/bin/env python3
"""
ABOUTME: URL context fallback using OpenPull/crawl4ai when Gemini URL context tool fails
ABOUTME: Direct copy from bulkgpt-01122025 fallback_services.py
"""
# Import from the centralized fallback_services module
from utils.fallback_services import scrape_page_with_openpull, get_url_context_simple

# Backward compatibility aliases
OpenPullClient = None  # Use scrape_page_with_openpull() directly
URLContextFallback = None  # Use scrape_page_with_openpull() directly

