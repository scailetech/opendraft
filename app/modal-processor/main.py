"""
BULK-GPT Modal Processor
========================

Handles batch processing of CSV rows through Google Gemini API.
Designed for Supabase integration with 24-hour timeout support.

Architecture (Direct API Calls):
1. UI creates batch in Supabase (status: pending)
2. UI calls POST /batch → Modal confirms acceptance → UI updates status to "processing"
3. Modal spawns async processing → processes rows in parallel
4. Modal bulk-inserts results to Supabase → updates batch status to "completed"
5. UI polls Supabase for results

Endpoints:
- POST /batch - Start batch processing (returns immediately, spawns async job)
- POST /process/{action} - Unified endpoint (action: 'batch' or 'columns')
- POST /test - Synchronous single-row test (for debugging)
- GET /health - Health check

Secret: bulk-gpt-env (contains GEMINI_API_KEY, Supabase credentials, DataForSEO)
Deployment: modal deploy main.py
"""

import modal
import json
import os
from typing import List, Dict, Any, Optional
import time
from fastapi import FastAPI, Request, HTTPException
# No retry/backoff - all requests run in parallel without delays
import logging

# Import fallback services for web search (DataForSEO) and URL context (OpenPull)
# Handle Modal environment where module is mounted to /root
import sys
if "/root" not in sys.path:
    sys.path.insert(0, "/root")

try:
    from fallback_services import (
        search_web_dataforseo,
        format_search_results_for_context,
        scrape_page_with_openpull,
        get_url_context_simple,
        get_tool_context_with_fallback,
    )
except ImportError:
    # Fallback functions if module not available
    def get_tool_context_with_fallback(*args, **kwargs):
        return ""
    def search_web_dataforseo(*args, **kwargs):
        return {"success": False, "error": "fallback_services not available", "results": []}
    def format_search_results_for_context(*args, **kwargs):
        return ""
    def scrape_page_with_openpull(*args, **kwargs):
        return {"success": False, "error": "fallback_services not available", "content": ""}
    def get_url_context_simple(*args, **kwargs):
        return {"success": False, "error": "fallback_services not available", "content": ""}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Modal app - V4 CLEAN SLATE
app = modal.App("bulk-gpt-processor-v4")


# Define image with dependencies  
# CACHE BUST: 2025-12-05-schema-fix
image = (
    modal.Image.debian_slim()
    .apt_install(
        # Git for pip install from GitHub
        "git",
        # Required for Playwright/Chromium in headless mode
        "wget", "gnupg", "ca-certificates", "fonts-liberation",
        "libasound2", "libatk-bridge2.0-0", "libatk1.0-0", "libatspi2.0-0",
        "libcups2", "libdbus-1-3", "libdrm2", "libgbm1", "libgtk-3-0",
        "libnspr4", "libnss3", "libxcomposite1", "libxdamage1", "libxfixes3",
        "libxkbcommon0", "libxrandr2", "xdg-utils",
        # Additional dependencies for headless Chrome in containers
        "libx11-xcb1", "libxcb1", "libxcursor1", "libxss1", "libxtst6",
        "libnss3-dev", "libgdk-pixbuf2.0-0", "libpango-1.0-0", "libpangocairo-1.0-0",
    )
    .pip_install(
        "google-genai>=1.0.0",
        "supabase>=2.0.0",
        "python-dotenv>=1.0.0",
        "fastapi[standard]>=0.115.0",
        "tenacity>=8.2.0",
        "requests>=2.32.0",
        "beautifulsoup4>=4.12.0",
        "crawl4ai>=0.4.0",  # For JavaScript rendering
        "playwright>=1.40.0",  # Browser automation
        "git+https://github.com/federicodeponte/openpull.git",  # OpenPull
    )
    .run_commands(
        # Install Playwright browsers with all dependencies
        "playwright install chromium --with-deps",
    )
    .env({
        # Environment variables for headless browser operation
        "PLAYWRIGHT_BROWSERS_PATH": "/root/.cache/ms-playwright",
        "DISPLAY": "",  # No display needed for headless
    })
    .add_local_file("fallback_services.py", "/root/fallback_services.py")
)

# Create FastAPI app for HTTP endpoints
web_app = FastAPI()

# Shared Modal secrets - used by all functions (DRY principle)
# All credentials (Gemini, Supabase, DataForSEO) should be in bulk-gpt-env
MODAL_SECRET = modal.Secret.from_name("bulk-gpt-env")

# Generate system prompt dynamically with current date
def get_system_prompt(tools: Optional[List[str]] = None) -> str:
    """Generate system prompt with current date and context.
    
    Args:
        tools: List of tools being used. If None or empty, allows full use of training data.
    """
    from datetime import datetime
    
    today = datetime.now()
    date_str = today.strftime("%B %d, %Y")  # e.g., "December 4, 2025"
    year = today.year
    
    has_tools = tools and len(tools) > 0
    
    tool_usage_section = ""
    truth_requirement_section = ""
    
    if has_tools:
        tool_usage_section = """TOOL USAGE - USE ALL AVAILABLE TOOLS:
- You have access to google_search and url_context tools
- USE BOTH tools when needed to find accurate information
- If a webpage doesn't have the answer, ALSO search the web
- If web search results are unclear, ALSO check relevant URLs
- Don't stop after using just one tool - verify with multiple sources when possible

ABSOLUTE TRUTH REQUIREMENT - NEVER HALLUCINATE (WHEN TOOLS ARE USED):
- CRITICAL: When tools are provided, prioritize tool results over training data
- If a URL returns 404, error, or empty content: return EXACTLY "not found"
- If search results don't contain the answer: return EXACTLY "not found"
- If tool results are empty, missing, or don't contain the requested information: return EXACTLY "not found"
- NEVER invent, guess, or hallucinate information - even if you think you know it from training data
- You MAY use your training data/knowledge base ONLY if:
  * Tool results are completely empty or failed
  * AND you are highly confident the information is factual and current
  * AND the information is general knowledge (e.g., "CEO of Apple is Tim Cook")
- When uncertain or when tools don't provide the answer: return EXACTLY "not found" - this is ALWAYS better than a wrong answer
- If you cannot find the information in the tool results AND you're not certain from your knowledge base: return "not found" - do NOT make up names or facts
"""
    else:
        truth_requirement_section = """TRUTH REQUIREMENT (NO TOOLS PROVIDED):
- Use your full knowledge base and training data to provide accurate answers
- For tasks like translations, general knowledge, calculations, etc., use your training data freely
- If you're uncertain about factual information, you may still provide your best answer based on training data
- Only return "not found" if the question is completely unanswerable or nonsensical
"""
    
    return f"""You are a specialized AI assistant for bulk data processing.

CURRENT DATE CONTEXT:
- Today's date: {date_str}
- Current year: {year}
- Use this for any time-sensitive queries (stock prices, news, events, etc.)

{tool_usage_section}{truth_requirement_section}

CRITICAL OUTPUT RULES:
1. Return ONLY the value requested - no explanations, no context, no meta-commentary
2. Each field description specifies the EXACT format expected - follow it precisely
3. NEVER prefix values with phrases like "The X is..." or "On date, the Y was..."
4. NEVER include the question, field name, or reasoning in the answer value
5. Keep values concise - just the data, nothing else
6. If data is not found, return exactly: "not found"
7. If there was an error (404, timeout, blocked), return: "error: [brief reason]"

You are processing data in bulk. Consistency across all rows is critical.
Response format: Pure JSON only, matching the exact output schema provided.
"""


def get_smart_field_description(field_name: str) -> str:
    """
    Generate smart default descriptions based on field name patterns.
    This ensures consistent output format even when users don't use AI optimization.
    """
    name_lower = field_name.lower()
    
    # Date fields
    if 'date' in name_lower or name_lower.endswith('_at') or name_lower.endswith('_on'):
        return "Date in format: Month D, YYYY (e.g., December 3, 2025)"
    
    # Price/stock fields
    if 'price' in name_lower or 'stock' in name_lower or 'cost' in name_lower:
        return "Numeric value only, no currency symbol (e.g., 429.24)"
    
    # Translation fields
    if 'translation' in name_lower or 'translate' in name_lower:
        if '_it' in name_lower or 'italian' in name_lower:
            return "Just the Italian word/phrase, no explanations"
        if '_zh' in name_lower or 'chinese' in name_lower:
            return "Just the Chinese characters, no pinyin or explanations"
        if '_es' in name_lower or 'spanish' in name_lower:
            return "Just the Spanish word/phrase, no explanations"
        if '_fr' in name_lower or 'french' in name_lower:
            return "Just the French word/phrase, no explanations"
        if '_de' in name_lower or 'german' in name_lower:
            return "Just the German word/phrase, no explanations"
        return "Just the translated word/phrase, no explanations"
    
    # Summary fields
    if 'summary' in name_lower or 'description' in name_lower or 'overview' in name_lower:
        return "Concise 1-2 sentence summary, no meta-commentary"
    
    # Score/rating fields
    if 'score' in name_lower or 'rating' in name_lower:
        return "Numeric score only (e.g., 8 or 8.5)"
    
    # Boolean fields
    if name_lower.startswith('is_') or name_lower.startswith('has_') or 'enabled' in name_lower:
        return "true or false (lowercase)"
    
    # Count fields
    if 'count' in name_lower or 'number' in name_lower or 'total' in name_lower:
        return "Integer number only (e.g., 42)"
    
    # Email fields
    if 'email' in name_lower:
        return "Email address only (e.g., name@example.com)"
    
    # URL fields
    if 'url' in name_lower or 'link' in name_lower or 'website' in name_lower:
        return "Full URL only (e.g., https://example.com)"
    
    # Name fields
    if 'name' in name_lower and ('company' in name_lower or 'person' in name_lower or 'full' in name_lower):
        return "Just the name, no titles or descriptions"
    
    # Default
    return f"Concise value for {field_name}"


def fire_webhook(webhook_url: str, payload: Dict[str, Any]) -> bool:
    """
    Fire webhook with batch completion data.

    Args:
        webhook_url: URL to POST results to
        payload: Batch summary data

    Returns:
        True if webhook fired successfully, False otherwise
    """
    import requests

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        response.raise_for_status()
        print(f"[{payload.get('batch_id')}] Webhook fired successfully: {webhook_url}")
        return True
    except Exception as e:
        print(f"[{payload.get('batch_id')}] Webhook failed: {e}")
        return False


def _process_single_row(
    batch_id: str,
    row: Dict[str, str],
    row_index: int,
    prompt: str,
    context: str,
    output_schema: List[Dict[str, str]],
    tools: List[str],
    gemini_api_key: str,
    force_fallback: bool = False,
) -> Dict[str, Any]:
    """
    Process a single CSV row through Gemini API.
    
    Pure function designed for parallel execution via Modal's .starmap().
    Results are returned (not saved) - batch insert happens after all rows complete.
    
    Args:
        batch_id: Unique identifier for the batch
        row: CSV row as dictionary
        row_index: Index of this row in the batch
        prompt: Template prompt with {{column}} placeholders
        context: Additional context for the task
        output_schema: Expected output columns/format
        tools: List of tool names to enable (web-search, scrape-page)
        gemini_api_key: Gemini API key
    
    Returns:
        Dict with row_id, output, status, and optional error
    """
    from google import genai
    from google.genai import types
    
    row_id = f"{batch_id}-row-{row_index}"
    
    # Initialize Gemini client
    client = genai.Client(api_key=gemini_api_key)
    
    # Use Gemini 2.5 Flash Lite - supports BOTH google_search AND url_context
    # Note: 2.0-flash only supports google_search (not url_context)
    # Note: tools + response_schema don't work together in a single call
    # So we use two-phase: Phase 1 with tools, Phase 2 with response_schema
    model_name = "gemini-2.5-flash-lite"
    
    try:
        # Replace template variables in prompt
        if not prompt or not prompt.strip():
            raise ValueError(f"[{batch_id}] Prompt is empty or None!")
        
        final_prompt = prompt.strip()
        for key, value in row.items():
            if key != "id" and value:
                placeholder = f"{{{{{key}}}}}"
                final_prompt = final_prompt.replace(placeholder, str(value))
        
        if context:
            final_prompt = f"Context: {context}\n\n{final_prompt}"
        
        # Safety check: ensure final_prompt is never empty
        if not final_prompt or not final_prompt.strip():
            raise ValueError(f"[{batch_id}] final_prompt is empty after variable substitution! prompt='{prompt}', row={row}")
        
        # FUNCTION CALLING APPROACH:
        # 1. If tools requested: Let Gemini call our tools (search_web, get_url_content)
        # 2. Execute tool calls with DataForSEO/OpenPull
        # 3. Send results back to Gemini
        # 4. Get final structured JSON response
        
        # Build output schema for final response
        schema_fields = []
        actual_tools_called = []  # Track which tools Gemini actually calls
        
        if output_schema:
            for col in output_schema:
                if isinstance(col, dict):
                    name = col.get('name', str(col))
                    desc = col.get('description') or get_smart_field_description(name)
                elif isinstance(col, (list, tuple)) and len(col) >= 2:
                    # Handle [name, description] format
                    name = str(col[0])
                    desc = str(col[1])
                elif isinstance(col, (list, tuple)) and len(col) == 1:
                    name = str(col[0])
                    desc = get_smart_field_description(name)
                else:
                    name = str(col)
                    desc = get_smart_field_description(name)
                schema_fields.append((name, desc))
        
        # Default to "output" field if no schema defined
        if not schema_fields:
            schema_fields = [("output", "The complete answer to the prompt")]
            print(f"[{batch_id}] Using default output field")
        else:
            print(f"[{batch_id}] Schema fields: {schema_fields}")
        
        if tools:
            # ================================================================
            # PHASE 1: NATIVE GOOGLE TOOLS (Primary)
            # Uses google_search and url_context built into Gemini API
            # Falls back to DataForSEO/OpenPull only if native fails
            # ================================================================
            
            tool_context = ""
            native_success = False
            conversation = None  # Initialize to avoid UnboundLocalError
            
            # Skip native tools only if explicitly forced
            if force_fallback:
                print(f"[{batch_id}] force_fallback=True -> Using fallback tools")
                native_tools = []
            else:
                # CORRECT Python SDK syntax: tools expects list[Tool], not list[dict]
                # The dict syntax is for REST API only
                native_tools = []
                
                if "web-search" in tools:
                    native_tools.append(types.Tool(google_search=types.GoogleSearch()))
                
                if "scrape-page" in tools:
                    native_tools.append(types.Tool(url_context=types.UrlContext()))

                print(f"[{batch_id}] Phase 1: Native tools (typed) {len(native_tools)} enabled")
                
                # Retry logic for "Unknown field" errors (API validation issues under high concurrency)
                max_native_retries = 2
                native_attempt = 0
                native_response = None
                
                while native_attempt < max_native_retries and not native_success:
                    native_attempt += 1
                    try:
                        print(f"[{batch_id}] DEBUG: Native tools attempt {native_attempt}/{max_native_retries}")
                        print(f"[{batch_id}] DEBUG: Calling native tools with config: tools={native_tools}, model={model_name}")
                        print(f"[{batch_id}] DEBUG: Tool types: {[type(t).__name__ for t in native_tools]}")
                        
                        # Validate final_prompt before using it
                        if not final_prompt or not isinstance(final_prompt, str) or not final_prompt.strip():
                            raise ValueError(f"[{batch_id}] final_prompt is invalid before native tools call: {type(final_prompt)} = {final_prompt}")
                        
                        # Log serialized Tool objects to see what's actually being sent
                        try:
                            serialized_tools = [t.model_dump(exclude_none=True) for t in native_tools]
                            print(f"[{batch_id}] DEBUG: Serialized tools: {serialized_tools}")
                        except Exception as ser_error:
                            print(f"[{batch_id}] DEBUG: Could not serialize tools: {ser_error}")
                        
                        config = types.GenerateContentConfig(
                            system_instruction=get_system_prompt(tools=tools),
                            tools=native_tools
                        )
                        
                        # Log config serialization
                        try:
                            config_dict = config.model_dump(exclude_none=True)
                            print(f"[{batch_id}] DEBUG: Config keys: {list(config_dict.keys())}")
                            if 'tools' in config_dict:
                                print(f"[{batch_id}] DEBUG: Config tools type: {type(config_dict['tools'])}")
                                print(f"[{batch_id}] DEBUG: Config tools value: {config_dict['tools']}")
                        except Exception as config_error:
                            print(f"[{batch_id}] DEBUG: Could not serialize config: {config_error}")
                        
                        print(f"[{batch_id}] DEBUG: About to call generate_content with contents length: {len(final_prompt)}")
                        native_response = client.models.generate_content(
                            model=model_name,
                            contents=final_prompt,
                            config=config
                        )
                        
                        print(f"[{batch_id}] DEBUG: Native response received: has_candidates={bool(native_response.candidates)}, has_text={bool(native_response.text if hasattr(native_response, 'text') else False)}")
                        
                        # Safely access native response
                        if native_response.candidates:
                            candidate = native_response.candidates[0]
                            if not candidate or not hasattr(candidate, 'content') or not candidate.content:
                                print(f"[{batch_id}] WARN: Native response has no content")
                            elif not native_response.text:
                                print(f"[{batch_id}] WARN: Native response has no text")
                        
                        if native_response.candidates and native_response.text:
                            response_text = native_response.text.strip()
                            # Check if native tools actually found useful information
                            not_found_phrases = ["not found", "couldn't find", "unable to find", "no information", "i cannot", "i don't have"]
                            is_not_found = any(phrase in response_text.lower() for phrase in not_found_phrases)
                            
                            if response_text and not is_not_found:
                                native_success = True
                                actual_tools_called.extend(tools)
                                tool_context = f"Information found:\n\n{response_text}"
                                print(f"[{batch_id}] SUCCESS: Native tools worked! {len(response_text)} chars")
                                break  # Success, exit retry loop
                            else:
                                print(f"[{batch_id}] INFO: Native tools returned 'not found', trying fallback...")
                                break  # Not found, but API call succeeded, so exit retry loop
                                
                    except Exception as e:
                        import traceback
                        error_str = str(e).lower()
                        error_type = type(e).__name__
                        full_traceback = traceback.format_exc()
                        
                        print(f"[{batch_id}] ERROR: Native tools exception (attempt {native_attempt}): {error_type}: {e}")
                        print(f"[{batch_id}] ERROR: Full error: {full_traceback}")
                        
                        # Log the actual request that failed (if possible)
                        if hasattr(e, 'response') or hasattr(e, 'details'):
                            print(f"[{batch_id}] ERROR: Error details: {getattr(e, 'details', getattr(e, 'response', 'N/A'))}")
                        
                        # Check for specific errors that mean native tools aren't working
                        is_validation_error = "functiondeclaration" in error_str or "unknown field" in error_str or "google_search" in error_str
                        
                        if is_validation_error:
                            print(f"[{batch_id}] ERROR: This is a validation error - likely SDK serialization bug under concurrency")
                            print(f"[{batch_id}] ERROR: The SDK may be incorrectly serializing Tool objects when multiple requests run simultaneously")
                            print(f"[{batch_id}] ERROR: Possible causes:")
                            print(f"[{batch_id}] ERROR:   1. SDK internal state corruption under concurrency")
                            print(f"[{batch_id}] ERROR:   2. Race condition in Tool object serialization")
                            print(f"[{batch_id}] ERROR:   3. API-side validation bug under high load")
                        
                        if is_validation_error:
                            if native_attempt < max_native_retries:
                                print(f"[{batch_id}] WARN: Native tools API validation error (attempt {native_attempt}), retrying...")
                                import time
                                time.sleep(0.1 * native_attempt)  # Small delay: 0.1s, 0.2s
                                continue  # Retry
                            else:
                                print(f"[{batch_id}] ERROR: Native tools API validation error after {max_native_retries} attempts, using fallback")
                        else:
                            print(f"[{batch_id}] ERROR: Native tools FAILED with unexpected error (not retrying): {e}")
                            print(f"[{batch_id}] ERROR: Full traceback:\n{traceback.format_exc()}")
                            break  # Don't retry non-validation errors
            
            # ================================================================
            # FALLBACK: DataForSEO and OpenPull (only if native failed)
            # ================================================================
            if not native_success:
                print(f"[{batch_id}] FALLBACK: Using DataForSEO/OpenPull")
                
                function_declarations = []
                
                if "web-search" in tools:
                    function_declarations.append({
                        "name": "search_web",
                        "description": "Search the web for current information about any topic",
                        "parameters": {
                            "type": "object",
                            "properties": {"query": {"type": "string", "description": "Search query"}},
                            "required": ["query"]
                        }
                    })
                
                if "scrape-page" in tools:
                    function_declarations.append({
                        "name": "scrape_page",
                        "description": "Scrape and extract content from a website URL",
                        "parameters": {
                            "type": "object",
                            "properties": {"url": {"type": "string", "description": "Full URL to scrape"}},
                            "required": ["url"]
                        }
                    })
                    
                tool_results_collected = []
                conversation = [types.Content(role="user", parts=[types.Part(text=final_prompt)])]
            
                response = client.models.generate_content(
                    model=model_name,
                    contents=conversation,
                    config=types.GenerateContentConfig(
                        system_instruction=get_system_prompt(tools=tools),
                        tools=[{"function_declarations": function_declarations}]
                    )
                )
                
                max_tool_calls = 5
                tool_calls_made = 0
                
                while response.candidates and tool_calls_made < max_tool_calls:
                    # Safely access candidates[0].content.parts[0]
                    candidate = response.candidates[0]
                    if not candidate or not candidate.content or not candidate.content.parts:
                        break
                    part = candidate.content.parts[0]
                    
                    if not (hasattr(part, 'function_call') and part.function_call):
                        break
                    
                    func_name = part.function_call.name
                    func_args = dict(part.function_call.args)
                    actual_tools_called.append(func_name.replace('_', '-'))
                    print(f"[{batch_id}] Fallback tool: {func_name}({func_args})")
                    
                    conversation.append(types.Content(role="model", parts=[types.Part(function_call=part.function_call)]))
                    
                    tool_result = ""
                    if func_name == "search_web":
                        result = search_web_dataforseo(func_args.get("query", ""), num_results=5)
                        tool_result = format_search_results_for_context(result) if result.get("success") else f"SEARCH FAILED: {result.get('error')}"
                    elif func_name == "scrape_page":
                        url = func_args.get("url", "")
                        # Retry scraping up to 3 times (no backoff)
                        for attempt in range(3):
                            result = scrape_page_with_openpull(url, gemini_api_key)
                            if result.get("success") and result.get("content", "").strip():
                                tool_result = result.get("content", "")
                                break
                            print(f"[{batch_id}] Scrape attempt {attempt + 1}/3 failed for {url}")
                        else:
                            tool_result = f"ERROR: {result.get('error', 'Failed after 3 attempts')}"
                    
                    tool_results_collected.append((func_name, tool_result))
                    
                    conversation.append(types.Content(role="user", parts=[types.Part(function_response=types.FunctionResponse(
                        name=func_name,
                        response={"result": tool_result}
                    ))]))
                    
                    tool_calls_made += 1
                    
                    response = client.models.generate_content(
                        model=model_name,
                        contents=conversation,
                        config=types.GenerateContentConfig(
                            system_instruction=get_system_prompt(tools=tools),
                            tools=[{"function_declarations": function_declarations}]
                        )
                    )
                
                # Build fallback context from tool results
                if tool_results_collected:
                    context_parts = [f"=== {name} ===\n{result}" for name, result in tool_results_collected]
                    tool_context = "\n\n".join(context_parts)
                    print(f"[{batch_id}] Fallback context: {len(tool_context)} chars")
            
            # Phase 2: Get structured JSON output
            print(f"[{batch_id}] Phase 2: Building structured output")
            
            # Build final prompt with context embedded
            if tool_context:
                final_prompt_with_context = f"{final_prompt}\n\n--- GATHERED INFORMATION ---\n{tool_context}\n--- END OF INFORMATION ---\n\nBased on the above information, provide the answer."
            else:
                final_prompt_with_context = final_prompt
            
            # Safety check
            if not final_prompt_with_context or not final_prompt_with_context.strip():
                raise ValueError(f"[{batch_id}] final_prompt_with_context is empty! final_prompt='{final_prompt}', tool_context='{tool_context}'")
            
            print(f"[{batch_id}] DEBUG: final_prompt_with_context length: {len(final_prompt_with_context)}")
            
            final_config: Dict[str, Any] = {"system_instruction": get_system_prompt(tools=tools)}
            if schema_fields:
                final_config["response_mime_type"] = "application/json"
                # Use proper Gemini types.Schema for strict enforcement
                final_config["response_schema"] = types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        name: types.Schema(type=types.Type.STRING, description=desc)
                        for name, desc in schema_fields
                    },
                    required=[f[0] for f in schema_fields]
                )
                print(f"[{batch_id}] Response schema fields: {[f[0] for f in schema_fields]}")
            
            # Ensure contents is a non-empty string
            if not final_prompt_with_context or not isinstance(final_prompt_with_context, str):
                raise ValueError(f"[{batch_id}] final_prompt_with_context is invalid: {type(final_prompt_with_context)} = {final_prompt_with_context}")
            
            response = client.models.generate_content(
                model=model_name,
                contents=final_prompt_with_context,
                config=types.GenerateContentConfig(**final_config)
            )
            
            raw_output = response.text
            print(f"[{batch_id}] Final: {raw_output[:200] if raw_output else 'None'}...")
            
            # CHECK: If output contains "not found" and we used native tools, retry with fallback
            if raw_output and native_success and "not found" in raw_output.lower() and not force_fallback:
                print(f"[{batch_id}] Native tools returned 'not found', retrying with fallback...")
                
                # Run fallback tools
                fallback_context = ""
                fallback_tools = []
                
                if "web-search" in tools:
                    # Build search query: combine org name with what we're looking for
                    org_name = row.get("Organization Name") or row.get("company_name") or row.get("name", "")
                    # Extract what we're looking for from the output schema
                    search_term = schema_fields[0][0] if schema_fields else "information"
                    search_query = f"{org_name} {search_term}".strip() or final_prompt[:100]
                    print(f"[{batch_id}] Fallback search query: {search_query}")
                    result = search_web_dataforseo(search_query, num_results=5)
                    if result.get("success"):
                        fallback_context += f"Web Search Results:\n{format_search_results_for_context(result)}\n\n"
                        fallback_tools.append("web-search")
                
                if "scrape-page" in tools:
                    # Extract URLs from the prompt
                    import re
                    urls = re.findall(r'https?://[^\s<>"{}|\\^`\[\]]+', final_prompt)
                    for url in urls[:2]:  # Max 2 URLs
                        result = scrape_page_with_openpull(url, gemini_api_key)
                        if result.get("success") and result.get("content"):
                            fallback_context += f"Content from {url}:\n{result.get('content', '')[:5000]}\n\n"
                            fallback_tools.append("scrape-page")
                
                if fallback_context:
                    # Retry Phase 2 with fallback context
                    retry_prompt = f"{final_prompt}\n\n--- ADDITIONAL INFORMATION ---\n{fallback_context}\n--- END ---\n\nBased on ALL information above, provide the answer."
                    
                    retry_response = client.models.generate_content(
                        model=model_name,
                        contents=retry_prompt,
                        config=types.GenerateContentConfig(**final_config)
                    )
                    
                    if retry_response and retry_response.text:
                        raw_output = retry_response.text
                        response = retry_response  # Update response for token counting
                        actual_tools_called.extend(fallback_tools)
                        print(f"[{batch_id}] Fallback retry: {raw_output[:200]}...")
            
        else:
            # No tools - simple single call with response_schema
            print(f"[{batch_id}] Simple call (no tools)")
            config_kwargs: Dict[str, Any] = {"system_instruction": get_system_prompt(tools=tools)}
            
            if schema_fields:
                config_kwargs["response_mime_type"] = "application/json"
                # Use proper Gemini types.Schema for strict enforcement
                config_kwargs["response_schema"] = types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        name: types.Schema(type=types.Type.STRING, description=desc)
                        for name, desc in schema_fields
                    },
                    required=[f[0] for f in schema_fields]
                )
            
            config = types.GenerateContentConfig(**config_kwargs)
            response = client.models.generate_content(
                model=model_name,
                contents=final_prompt,
                config=config,
            )
            raw_output = response.text if response else None

        # Handle empty response
        if not raw_output:
            print(f"[{batch_id}] Warning: Empty response from Gemini")
            raw_output = json.dumps({name: "not found" for name, _ in schema_fields}) if schema_fields else '{"output": "not found"}'

        # Get token counts if available
        input_tokens = 0
        output_tokens = 0
        if 'response' in locals() and response and hasattr(response, 'usage_metadata') and response.usage_metadata:
            input_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
            output_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)

        # Process and validate output based on schema
        status = "success"
        error_msg = None
        output = raw_output  # Default to raw output

        # If output schema is specified, extract and validate JSON
        if output_schema and raw_output:
            try:
                # Extract JSON from response (handle markdown, conversational text, etc.)
                json_str = raw_output.strip()

                # Remove markdown code blocks if present
                if '```json' in json_str:
                    json_str = json_str.split('```json')[1].split('```')[0].strip()
                elif '```' in json_str:
                    # Handle generic code blocks
                    parts = json_str.split('```')
                    for part in parts:
                        stripped = part.strip()
                        if stripped.startswith('{') or stripped.startswith('['):
                            json_str = stripped
                            break

                # Find JSON object if buried in text
                if not json_str.startswith('{') and not json_str.startswith('['):
                    json_start = json_str.find('{')
                    json_end = json_str.rfind('}')
                    if json_start != -1 and json_end != -1 and json_end > json_start:
                        json_str = json_str[json_start:json_end + 1]

                # Parse JSON
                parsed_output = json.loads(json_str)

                # Validate schema compliance - handle dict, list, or string formats
                def get_col_name(col):
                    if isinstance(col, dict):
                        return col.get('name', str(col))
                    elif isinstance(col, (list, tuple)) and len(col) >= 1:
                        return str(col[0])
                    return str(col)
                
                schema_names = [get_col_name(col) for col in output_schema]

                # Check if response has correct structure
                if isinstance(parsed_output, dict):
                    validated_output = {}
                    missing_fields = []

                    for field_name in schema_names:
                        # Try exact match first
                        if field_name in parsed_output:
                            value = parsed_output[field_name]
                            # Ensure simple value (not nested object/array)
                            if isinstance(value, (dict, list)):
                                validated_output[field_name] = json.dumps(value)
                            else:
                                validated_output[field_name] = str(value) if value is not None else ""
                        else:
                            # Try case-insensitive match
                            found = False
                            for key in parsed_output.keys():
                                if key.lower() == field_name.lower():
                                    value = parsed_output[key]
                                    if isinstance(value, (dict, list)):
                                        validated_output[field_name] = json.dumps(value)
                                    else:
                                        validated_output[field_name] = str(value) if value is not None else ""
                                    found = True
                                    break

                            if not found:
                                missing_fields.append(field_name)
                                validated_output[field_name] = ""

                    # Use validated output
                    output = json.dumps(validated_output)

                    # Log warning if fields were missing
                    if missing_fields:
                        print(f"[{batch_id}] Warning: Missing fields in row {row_index + 1}: {missing_fields}")
                else:
                    # Response is not a dict - use fallback
                    raise ValueError("Response is not a JSON object")

            except (json.JSONDecodeError, ValueError, KeyError) as parse_error:
                # JSON parsing or validation failed - create error output
                print(f"[{batch_id}] JSON parse/validation error on row {row_index + 1}: {parse_error}")

                # Handle dict, list, or string formats for schema names
                def get_col_name(col):
                    if isinstance(col, dict):
                        return col.get('name', str(col))
                    elif isinstance(col, (list, tuple)) and len(col) >= 1:
                        return str(col[0])
                    return str(col)
                
                schema_names = [get_col_name(col) for col in output_schema]

                # Create fallback output with error message
                fallback_output = {}
                for i, field_name in enumerate(schema_names):
                    if i == 0:
                        # First field gets truncated raw response
                        truncated = raw_output[:500] + ('...[truncated]' if len(raw_output) > 500 else '')
                        fallback_output[field_name] = truncated
                    else:
                        # Other fields get parse error message
                        fallback_output[field_name] = f"[Parse Error - See {schema_names[0]} for raw output]"

                output = json.dumps(fallback_output)
                # Don't mark as error status - data is still usable
                print(f"[{batch_id}] Using fallback output for row {row_index + 1}")

    except Exception as api_error:
        output = ""
        input_tokens = 0
        output_tokens = 0
        status = "error"
        error_msg = str(api_error)
        print(f"[{batch_id}] Error on row {row_index + 1}: {error_msg}")

    # Use actual tools called (if any), otherwise fall back to requested tools
    tools_used = actual_tools_called if actual_tools_called else (tools if tools else [])
    
    # NOTE: Results are NOT saved to DB here - they're batch-inserted at the end
    # of processing for efficiency (reduces N individual writes to N/100 batch writes)

    return {
        "id": row_id,
        "output": output,
        "status": status,
        "error": error_msg,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "model": model_name,
        "tools_used": tools_used,
        "batch_id": batch_id,
        "input_data": row,
        "row_index": row_index,
    }


@app.function(
    image=image,
    timeout=3600,
    memory=2048,  # 2GB per container
    secrets=[MODAL_SECRET],
    # Reduced to 100 concurrent per container to avoid API validation errors
    # Modal auto-scales more containers as needed, so total throughput is still high
    # 1000 rows = 10 containers (100 each), still very fast
    allow_concurrent_inputs=100,
)
def process_row(
    batch_id: str,
    row: Dict[str, str],
    row_index: int,
    prompt: str,
    context: str,
    output_schema: List[Dict[str, str]],
    tools: List[str],
    force_fallback: bool = False,
) -> Dict[str, Any]:
    """
    Modal function to process a single row in parallel.
    
    Args:
        batch_id: Unique identifier for the batch
        row: CSV row as dictionary
        row_index: Index of this row in the batch
        force_fallback: If True, skip Gemini tools and use DataForSEO/OpenPull directly
        prompt: Template prompt with {{column}} placeholders
        context: Additional context for the task
        output_schema: Expected output columns/format
        tools: List of tool names to enable
    
    Returns:
        Dict with row_id, output, status, and optional error
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not all([gemini_api_key, supabase_url, supabase_key]):
        return {
            "id": f"{batch_id}-row-{row_index}",
            "output": "",
            "status": "error",
            "error": "Missing required environment variables",
        }
    
    # CHECK FOR CANCELLATION before processing
    # This allows stopping a batch mid-processing
    try:
        from supabase import create_client
        supabase = create_client(supabase_url, supabase_key)
        batch_check = supabase.table("batches").select("status").eq("id", batch_id).single().execute()
        if batch_check.data and batch_check.data.get("status") == "cancelled":
            print(f"[{batch_id}] Row {row_index}: Batch cancelled - skipping")
            return {
                "id": f"{batch_id}-row-{row_index}",
                "output": "",
                "status": "cancelled",
                "error": "Batch was cancelled",
                "row_index": row_index,
            }
    except Exception as e:
        # If we can't check, continue processing (don't block on check failure)
        print(f"[{batch_id}] Row {row_index}: Could not check cancellation status: {e}")
    
    return _process_single_row(
        batch_id=batch_id,
        row=row,
        row_index=row_index,
        prompt=prompt,
        context=context,
        output_schema=output_schema,
        tools=tools or [],
        gemini_api_key=gemini_api_key,
        force_fallback=force_fallback,
    )


def _process_batch_internal(
    batch_id: str,
    rows: List[Dict[str, str]],
    prompt: str,
    context: str = "",
    output_schema: Optional[List[Dict[str, str]]] = None,
    tools: Optional[List[str]] = None,
    webhook_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Internal function to orchestrate parallel batch processing.

    Args:
        batch_id: Unique identifier for this batch
        rows: List of CSV rows as dictionaries
        prompt: Template prompt with {{column}} placeholders
        context: Additional context for the task
        output_schema: Expected output columns/format
        tools: List of tool names to enable
        webhook_url: Optional webhook URL to POST results to when complete

    Returns:
        Dict with processing results and statistics
    """
    from supabase import create_client
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not all([supabase_url, supabase_key]):
        raise ValueError("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
    
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")
    
    start_time = time.time()
    print(f"[{batch_id}] Starting parallel batch processing with {len(rows)} rows")
    
    # Check if batch exists, create if not (for direct API calls)
    batch_exists = False
    try:
        existing = supabase.table("batches").select("id").eq("id", batch_id).execute()
        batch_exists = bool(existing.data)
        print(f"[{batch_id}] Batch exists in DB: {batch_exists}")
    except Exception as e:
        print(f"[{batch_id}] Warning: Could not check batch existence: {e}")
    
    if batch_exists:
        try:
            supabase.table("batches").update({
                "status": "processing",
                "updated_at": "now()"
            }).eq("id", batch_id).execute()
            print(f"[{batch_id}] Batch status updated to processing")
        except Exception as e:
            print(f"[{batch_id}] Warning: Could not update batch status: {e}")
    else:
        # For direct API calls, batch won't exist. We'll just process without DB tracking
        print(f"[{batch_id}] Batch not in DB - processing anyway (direct API call)")
    
    try:
        results = list(process_row.starmap([
            (batch_id, row, idx, prompt, context or "", output_schema or [], tools or [])
            for idx, row in enumerate(rows)
        ]))
    except Exception as parallel_error:
        print(f"[{batch_id}] Error during parallel processing: {parallel_error}")
        results = []

    successful_count = sum(1 for r in results if r.get("status") == "success")
    error_count = sum(1 for r in results if r.get("status") == "error")

    # BATCH INSERT: Save all results to Supabase in chunks (more efficient than per-row)
    BATCH_SIZE = 100
    print(f"[{batch_id}] Batch inserting {len(results)} results to database (chunk size: {BATCH_SIZE})...")
    
    for i in range(0, len(results), BATCH_SIZE):
        chunk = results[i:i + BATCH_SIZE]
        batch_records = []
        
        for r in chunk:
            batch_records.append({
                "id": r.get("id"),
                "batch_id": batch_id,
                "input_data": json.dumps(r.get("input_data", {})),
                "output_data": r.get("output", ""),
                "row_index": r.get("row_index", 0),
                "status": r.get("status", "error"),
                "error_message": r.get("error"),
                "input_tokens": r.get("input_tokens", 0),
                "output_tokens": r.get("output_tokens", 0),
                "model": r.get("model", ""),
                "tools_used": r.get("tools_used", []),
            })
        
        try:
            supabase.table("batch_results").upsert(
                batch_records, 
                on_conflict="batch_id,row_index"
            ).execute()
            print(f"[{batch_id}] Inserted chunk {i//BATCH_SIZE + 1} ({len(chunk)} rows)")
        except Exception as chunk_error:
            print(f"[{batch_id}] Warning: Failed to insert chunk {i//BATCH_SIZE + 1}: {chunk_error}")

    total_time = time.time() - start_time
    avg_time_per_row = total_time / len(rows) if rows else 0

    completion_status = "completed" if error_count == 0 else "completed_with_errors"
    
    # Update batch status and totals
    try:
        total_input_tokens = sum(r.get("input_tokens", 0) for r in results)
        total_output_tokens = sum(r.get("output_tokens", 0) for r in results)
        
        supabase.table("batches").update({
            "status": completion_status,
            "processed_rows": successful_count,
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "updated_at": "now()",
        }).eq("id", batch_id).execute()
    except Exception as e:
        print(f"[{batch_id}] Warning: Could not finalize batch: {e}")
    
    summary = {
        "batch_id": batch_id,
        "total_rows": len(rows),
        "successful": successful_count,
        "failed": error_count,
        "processing_time_seconds": round(total_time, 2),
        "avg_time_per_row": round(avg_time_per_row, 3),
        "status": completion_status,
        "results": results,
    }
    
    print(
        f"[{batch_id}] Batch complete: {successful_count} success, "
        f"{error_count} errors in {total_time:.1f}s (parallel processing)"
    )

    if webhook_url:
        fire_webhook(webhook_url, summary)

    return summary


@app.function(
    image=image,
    timeout=86400,
    memory=2048,
    secrets=[MODAL_SECRET],
)
def process_batch_modal(
    batch_id: str,
    rows: List[Dict[str, str]],
    prompt: str,
    context: str = "",
    output_schema: Optional[List[Dict[str, str]]] = None,
    tools: Optional[List[str]] = None,
    webhook_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Modal function that processes batches."""
    return _process_batch_internal(batch_id, rows, prompt, context, output_schema, tools, webhook_url)


@app.function(
    image=image,
    timeout=60,
    memory=512,
    secrets=[MODAL_SECRET],
)
def generate_output_columns(prompt: str) -> Dict[str, Any]:
    """
    Analyze a user's prompt and suggest appropriate output columns.

    Args:
        prompt: The user's prompt template

    Returns:
        Dict with columns, status, and optional error
    """
    from google import genai
    from google.genai import types

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return {
            "columns": [],
            "status": "error",
            "error": "Missing GEMINI_API_KEY environment variable",
        }

    client = genai.Client(api_key=gemini_api_key)

    try:
        system_instruction = """You are an AI that generates output column definitions for bulk data processing.

Analyze the user's prompt and determine what output columns should be generated.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "columns": [
    {
      "name": "column_name_snake_case",
      "description": "What this column contains AND the exact format expected"
    }
  ]
}

Rules:
1. Return 1-5 columns that make sense for the task
2. Column names MUST be snake_case (no spaces, lowercase, underscores only)
3. Descriptions MUST include BOTH meaning AND format. Examples:
   - For scores: "ICP fit score. Integer 0-100 only, no text or suffixes"
   - For categories: "Priority level. One of: High, Medium, Low"
   - For counts: "Employee count. Numeric range like 10-50, 100-500, or 500+"
   - For text: "Company summary. 1-2 sentences maximum"
   - For lists: "Key signals found. Comma-separated list"
   - For yes/no: "Has recent funding. Yes, No, or Unknown"
4. Be specific about format to ensure consistent, parseable output
5. Return ONLY the JSON object (no code blocks, no explanations)"""

        analysis_prompt = f'Analyze this prompt and generate appropriate output columns:\n\n"{prompt}"'
        
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
        )
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=analysis_prompt,
            config=config,
        )

        if not response or not response.text:
            return {
                "columns": [],
                "status": "error",
                "error": "Empty response from Gemini",
            }

        response_text = response.text.strip()

        if response_text.startswith('```json'):
            response_text = response_text.replace('```json\n', '').replace('```', '')
        elif response_text.startswith('```'):
            response_text = response_text.replace('```\n', '').replace('```', '')

        parsed = json.loads(response_text)

        if not parsed.get("columns") or not isinstance(parsed["columns"], list):
            return {
                "columns": [],
                "status": "error",
                "error": "Invalid response format - missing 'columns' array",
            }

        columns = []
        for col in parsed["columns"]:
            if isinstance(col, dict) and "name" in col and "description" in col:
                name = col["name"].lower().replace(" ", "_").replace("-", "_")
                columns.append({
                    "name": name,
                    "description": col["description"]
                })

        if not columns:
            return {
                "columns": [],
                "status": "error",
                "error": "No valid columns generated",
            }

        return {
            "columns": columns[:3],
            "status": "success",
            "error": None,
        }

    except json.JSONDecodeError as e:
        return {
            "columns": [],
            "status": "error",
            "error": f"Failed to parse JSON response: {str(e)}",
        }
    except Exception as e:
        return {
            "columns": [],
            "status": "error",
            "error": f"Gemini API error: {str(e)}",
        }


# =============================================================================
# FASTAPI ENDPOINTS
# =============================================================================
# Architecture: Direct API calls (no polling)
# 1. UI creates batch in Supabase
# 2. UI calls POST /batch → Modal spawns processing
# 3. Modal processes rows → saves to Supabase → updates status
# 4. UI polls Supabase for results
# =============================================================================

# Single endpoint pattern: POST /process/{action}
@web_app.post("/process/{action}")
async def process_action(request: Request, action: str):
    """
    Unified endpoint for all processing actions.
    
    Actions:
    - 'batch': Process a batch of CSV rows
    - 'columns': Generate output columns from a prompt
    
    Args:
        action: The action to perform ('batch' or 'columns')
        request: FastAPI request object
    
    Returns:
        JSON response with results
    """
    body = await request.json()
    
    if action == "batch":
        batch_id = body.get("batch_id")
        rows = body.get("rows", [])

        if not batch_id:
            raise HTTPException(status_code=400, detail="batch_id is required")

        if not rows or len(rows) == 0:
            raise HTTPException(status_code=400, detail="rows array cannot be empty")

        # Support both output_schema and output_columns field names
        output_schema = body.get("output_schema") or body.get("output_columns") or []

        process_batch_modal.spawn(
            batch_id=batch_id,
            rows=rows,
            prompt=body.get("prompt", ""),
            context=body.get("context", ""),
            output_schema=output_schema,
            tools=body.get("tools", []),
            webhook_url=body.get("webhook_url"),
        )

        return {
            "status": "accepted",
            "batch_id": batch_id,
            "total_rows": len(rows),
            "message": "Batch processing started in background",
        }
    
    elif action == "columns":
        prompt = body.get("prompt", "")

        if not prompt:
            raise HTTPException(status_code=400, detail="Missing 'prompt' parameter")

        result = await generate_output_columns.remote.aio(prompt)
        return result
    
    else:
        raise HTTPException(status_code=404, detail=f"Unknown action: {action}. Supported actions: 'batch', 'columns'")


# Backward compatibility: Keep /batch endpoint for existing clients
@web_app.post("/batch")
async def process_batch_legacy(request: Request):
    """Legacy endpoint - redirects to /process/batch"""
    return await process_action(request, "batch")


# Backward compatibility: Keep /generate-columns endpoint for existing clients
@web_app.post("/generate-columns")
async def generate_columns_legacy(request: Request):
    """Legacy endpoint - redirects to /process/columns"""
    return await process_action(request, "columns")


@web_app.get("/health")
async def health_endpoint():
    """Health check endpoint."""
    return {"status": "healthy", "service": "bulk-gpt-processor", "version": "1.0.0"}


@web_app.post("/debug/scrape")
async def debug_scrape(request: Request):
    """
    Debug endpoint to test scraper directly without going through Gemini.
    Example: curl -X POST /debug/scrape -d '{"url": "https://www.scaile.tech/about-us"}'
    """
    body = await request.json()
    url = body.get("url", "")
    
    if not url:
        return {"error": "url is required"}
    
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    result = scrape_page_with_openpull(url, gemini_api_key)
    
    return {
        "url": url,
        "success": result.get("success"),
        "error": result.get("error"),
        "content_length": len(result.get("content", "")),
        "content_preview": result.get("content", "")[:500] if result.get("content") else None,
    }


@web_app.post("/debug/search")
async def debug_search(request: Request):
    """
    Debug endpoint to test DataForSEO search directly.
    Example: curl -X POST /debug/search -d '{"query": "Black Forest Labs founders"}'
    """
    body = await request.json()
    query = body.get("query", "")
    
    if not query:
        return {"error": "query is required"}
    
    result = search_web_dataforseo(query, num_results=5)
    
    return {
        "query": query,
        "success": result.get("success"),
        "error": result.get("error"),
        "num_results": len(result.get("results", [])),
        "results": result.get("results", [])[:3],  # Return first 3 for preview
    }


@web_app.post("/test")
async def test_endpoint(request: Request):
    """
    Synchronous test endpoint - processes a single row and returns result immediately.
    Does NOT save to database. For testing tool functionality.
    
    Example:
    curl -X POST /test -d '{"prompt": "What is {{company}}?", "row": {"company": "Tesla"}, "tools": ["web-search"]}'
    
    Add "force_fallback": true to test DataForSEO/OpenPull fallbacks directly.
    """
    body = await request.json()
    prompt = body.get("prompt", "Describe {{input}}")
    row = body.get("row", {"input": "test"})
    tools = body.get("tools", [])
    output_schema = body.get("output_schema", [{"name": "result", "description": "Result"}])
    force_fallback = body.get("force_fallback", False)
    
    # Call process_row synchronously
    try:
        result = await process_row.remote.aio(
            batch_id="test-sync",
            row=row,
            row_index=0,
            prompt=prompt,
            context="",
            output_schema=output_schema,
            tools=tools,
            force_fallback=force_fallback,
        )
        return {
            "status": "success",
            "result": result.get("output"),
            "tools_used": result.get("tools_used"),
            "tokens": {
                "input": result.get("input_tokens"),
                "output": result.get("output_tokens"),
            },
            "error": result.get("error"),
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


# Expose FastAPI app as ASGI
@app.function(image=image, secrets=[MODAL_SECRET])
@modal.asgi_app()
def fastapi_app():
    """Expose FastAPI app."""
    return web_app
# Deployment timestamp: 1764954149
