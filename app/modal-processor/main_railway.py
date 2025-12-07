"""
BULK-GPT Railway Processor
===========================

Railway-compatible version of the batch processor.
Uses standard FastAPI with asyncio for parallel processing.

Endpoints:
- POST /batch - Start batch processing (returns immediately, spawns async job)
- POST /process/{action} - Unified endpoint (action: 'batch' or 'columns')
- POST /test - Synchronous single-row test (for debugging)
- GET /health - Health check
"""

import json
import os
from typing import List, Dict, Any, Optional
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import logging
import functools

# Import fallback services
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

# Create FastAPI app
app = FastAPI(title="Bulk GPT Processor", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread pool for parallel processing (250 workers to match Modal's per-container limit)
# This prevents thread contention and matches Modal's efficient batching approach
executor = ThreadPoolExecutor(max_workers=250)

# Generate system prompt dynamically with current date
def get_system_prompt() -> str:
    """Generate system prompt with current date and context."""
    from datetime import datetime
    
    today = datetime.now()
    date_str = today.strftime("%B %d, %Y")
    year = today.year
    
    return f"""You are a specialized AI assistant for bulk data processing.

CURRENT DATE CONTEXT:
- Today's date: {date_str}
- Current year: {year}
- Use this for any time-sensitive queries (stock prices, news, events, etc.)

TOOL USAGE - USE ALL AVAILABLE TOOLS:
- You have access to google_search and url_context tools
- USE BOTH tools when needed to find accurate information
- If a webpage doesn't have the answer, ALSO search the web
- If web search results are unclear, ALSO check relevant URLs
- Don't stop after using just one tool - verify with multiple sources when possible

ABSOLUTE TRUTH REQUIREMENT - NEVER HALLUCINATE:
- Only state facts you have VERIFIED from the provided context or tool results
- If a URL returns 404, error, or empty content: return "not found" or "error: [reason]"
- If search results don't contain the answer: return "not found"
- NEVER invent, guess, or hallucinate information
- When uncertain, say "not found" - this is ALWAYS better than a wrong answer
- If tool results are empty or failed, acknowledge that in your response
- Do NOT use your training data for facts - only use provided tool results

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
    """Generate smart default descriptions based on field name patterns."""
    name_lower = field_name.lower()
    
    if 'date' in name_lower or name_lower.endswith('_at') or name_lower.endswith('_on'):
        return "Date in format: Month D, YYYY (e.g., December 3, 2025)"
    
    if 'price' in name_lower or 'stock' in name_lower or 'cost' in name_lower:
        return "Numeric value only, no currency symbol (e.g., 429.24)"
    
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
    
    if 'summary' in name_lower or 'description' in name_lower or 'overview' in name_lower:
        return "Concise 1-2 sentence summary, no meta-commentary"
    
    if 'score' in name_lower or 'rating' in name_lower:
        return "Numeric score only (e.g., 8 or 8.5)"
    
    if name_lower.startswith('is_') or name_lower.startswith('has_') or 'enabled' in name_lower:
        return "true or false (lowercase)"
    
    if 'count' in name_lower or 'number' in name_lower or 'total' in name_lower:
        return "Integer number only (e.g., 42)"
    
    if 'email' in name_lower:
        return "Email address only (e.g., name@example.com)"
    
    if 'url' in name_lower or 'link' in name_lower or 'website' in name_lower:
        return "Full URL only (e.g., https://example.com)"
    
    if 'name' in name_lower and ('company' in name_lower or 'person' in name_lower or 'full' in name_lower):
        return "Just the name, no titles or descriptions"
    
    return f"Concise value for {field_name}"


def fire_webhook(webhook_url: str, payload: Dict[str, Any]) -> bool:
    """Fire webhook with batch completion data."""
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
    
    Pure function designed for parallel execution via ThreadPoolExecutor.
    Results are returned (not saved) - batch insert happens after all rows complete.
    """
    from google import genai
    from google.genai import types
    
    row_id = f"{batch_id}-row-{row_index}"
    
    # Initialize Gemini client
    client = genai.Client(api_key=gemini_api_key)
    model_name = "gemini-2.5-flash-lite"
    
    try:
        # Replace template variables in prompt
        final_prompt = prompt
        for key, value in row.items():
            if key != "id" and value:
                placeholder = f"{{{{{key}}}}}"
                final_prompt = final_prompt.replace(placeholder, str(value))
        
        if context:
            final_prompt = f"Context: {context}\n\n{final_prompt}"
        
        # Build output schema
        schema_fields = []
        actual_tools_called = []
        
        if output_schema:
            for col in output_schema:
                if isinstance(col, dict):
                    name = col.get('name', str(col))
                    desc = col.get('description') or get_smart_field_description(name)
                elif isinstance(col, (list, tuple)) and len(col) >= 2:
                    name = str(col[0])
                    desc = str(col[1])
                elif isinstance(col, (list, tuple)) and len(col) == 1:
                    name = str(col[0])
                    desc = get_smart_field_description(name)
                else:
                    name = str(col)
                    desc = get_smart_field_description(name)
                schema_fields.append((name, desc))
        
        if not schema_fields:
            schema_fields = [("output", "The complete answer to the prompt")]
        
        # Process with tools if needed (simplified version - same logic as Modal)
        tool_context = ""
        if tools:
            native_tools = []
            if "web-search" in tools:
                native_tools.append(types.Tool(google_search=types.GoogleSearch()))
            if "scrape-page" in tools:
                native_tools.append(types.Tool(url_context=types.UrlContext()))
            
            try:
                native_response = client.models.generate_content(
                    model=model_name,
                    contents=final_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=get_system_prompt(),
                        tools=native_tools
                    )
                )
                
                if native_response.candidates and native_response.text:
                    response_text = native_response.text.strip()
                    not_found_phrases = ["not found", "couldn't find", "unable to find", "no information"]
                    is_not_found = any(phrase in response_text.lower() for phrase in not_found_phrases)
                    
                    if response_text and not is_not_found:
                        tool_context = f"Information found:\n\n{response_text}"
                        actual_tools_called.extend(tools)
            except Exception as e:
                logger.warning(f"[{batch_id}] Native tools failed: {e}")
        
        # Phase 2: Get structured JSON output
        final_config: Dict[str, Any] = {"system_instruction": get_system_prompt()}
        if schema_fields:
            final_config["response_mime_type"] = "application/json"
            final_config["response_schema"] = types.Schema(
                type=types.Type.OBJECT,
                properties={
                    name: types.Schema(type=types.Type.STRING, description=desc)
                    for name, desc in schema_fields
                },
                required=[f[0] for f in schema_fields]
            )
        
        if tool_context:
            final_prompt_with_context = f"{final_prompt}\n\n--- GATHERED INFORMATION ---\n{tool_context}\n--- END OF INFORMATION ---\n\nBased on the above information, provide the answer."
        else:
            final_prompt_with_context = final_prompt
        
        response = client.models.generate_content(
            model=model_name,
            contents=final_prompt_with_context,
            config=types.GenerateContentConfig(**final_config)
        )
        
        raw_output = response.text if response else None
        
        if not raw_output:
            raw_output = json.dumps({name: "not found" for name, _ in schema_fields}) if schema_fields else '{"output": "not found"}'
        
        # Get token counts
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            input_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
            output_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)
        
        # Parse and validate JSON
        status = "success"
        error_msg = None
        output = raw_output
        
        if output_schema and raw_output:
            try:
                json_str = raw_output.strip()
                if '```json' in json_str:
                    json_str = json_str.split('```json')[1].split('```')[0].strip()
                elif '```' in json_str:
                    parts = json_str.split('```')
                    for part in parts:
                        stripped = part.strip()
                        if stripped.startswith('{') or stripped.startswith('['):
                            json_str = stripped
                            break
                
                if not json_str.startswith('{') and not json_str.startswith('['):
                    json_start = json_str.find('{')
                    json_end = json_str.rfind('}')
                    if json_start != -1 and json_end != -1 and json_end > json_start:
                        json_str = json_str[json_start:json_end + 1]
                
                parsed_output = json.loads(json_str)
                
                if isinstance(parsed_output, dict):
                    validated_output = {}
                    def get_col_name(col):
                        if isinstance(col, dict):
                            return col.get('name', str(col))
                        elif isinstance(col, (list, tuple)) and len(col) >= 1:
                            return str(col[0])
                        return str(col)
                    schema_names = [get_col_name(col) for col in output_schema]
                    
                    for field_name in schema_names:
                        if field_name in parsed_output:
                            value = parsed_output[field_name]
                            validated_output[field_name] = json.dumps(value) if isinstance(value, (dict, list)) else str(value) if value is not None else ""
                        else:
                            validated_output[field_name] = ""
                    
                    output = json.dumps(validated_output)
            except Exception as parse_error:
                logger.warning(f"[{batch_id}] JSON parse error: {parse_error}")
        
        tools_used = actual_tools_called if actual_tools_called else (tools if tools else [])
        
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

    except Exception as api_error:
        return {
            "id": row_id,
            "output": "",
            "status": "error",
            "error": str(api_error),
            "input_tokens": 0,
            "output_tokens": 0,
            "model": model_name,
            "tools_used": [],
            "batch_id": batch_id,
            "input_data": row,
            "row_index": row_index,
        }


def _process_batch_internal(
    batch_id: str,
    rows: List[Dict[str, str]],
    prompt: str,
    context: str = "",
    output_schema: Optional[List[Dict[str, str]]] = None,
    tools: Optional[List[str]] = None,
    webhook_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Internal function to orchestrate parallel batch processing."""
    from supabase import create_client
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    
    if not all([supabase_url, supabase_key, gemini_api_key]):
        raise ValueError("Missing required environment variables")
    
    supabase = create_client(supabase_url, supabase_key)
    
    start_time = time.time()
    logger.info(f"[{batch_id}] Starting parallel batch processing with {len(rows)} rows")
    
    # Update batch status
    try:
        supabase.table("batches").update({
            "status": "processing",
            "updated_at": "now()"
        }).eq("id", batch_id).execute()
    except Exception as e:
        logger.warning(f"[{batch_id}] Could not update batch status: {e}")
    
    # Process rows in parallel using asyncio for better I/O-bound performance
    # Use semaphore to limit concurrent requests (250 at a time, matching Modal)
    # This prevents overwhelming the system while maximizing throughput
    async def process_row_async(args):
        """Async wrapper for row processing"""
        loop = asyncio.get_event_loop()
        # Run CPU-bound work in thread pool, but keep async for I/O
        return await loop.run_in_executor(executor, lambda: _process_single_row(*args))
    
    async def process_batch_async():
        """Process all rows with controlled concurrency"""
        semaphore = asyncio.Semaphore(250)  # Max 250 concurrent (matches Modal)
        
        async def process_with_semaphore(args):
            async with semaphore:
                return await process_row_async(args)
        
        tasks = [
            process_with_semaphore((batch_id, row, idx, prompt, context or "", output_schema or [], tools or [], gemini_api_key))
            for idx, row in enumerate(rows)
        ]
        
        # Process all tasks concurrently (limited by semaphore)
        return await asyncio.gather(*tasks)
    
    # Run async processing
    results = asyncio.run(process_batch_async())
    
    successful_count = sum(1 for r in results if r.get("status") == "success")
    error_count = sum(1 for r in results if r.get("status") == "error")
    
    # Batch insert results
    BATCH_SIZE = 100
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
        except Exception as chunk_error:
            logger.warning(f"[{batch_id}] Failed to insert chunk: {chunk_error}")
    
    total_time = time.time() - start_time
    completion_status = "completed" if error_count == 0 else "completed_with_errors"
    
    # Update batch status
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
        logger.warning(f"[{batch_id}] Could not finalize batch: {e}")
    
    summary = {
        "batch_id": batch_id,
        "total_rows": len(rows),
        "successful": successful_count,
        "failed": error_count,
        "processing_time_seconds": round(total_time, 2),
        "status": completion_status,
    }
    
    logger.info(f"[{batch_id}] Batch complete: {successful_count} success, {error_count} errors in {total_time:.1f}s")
    
    if webhook_url:
        fire_webhook(webhook_url, summary)
    
    return summary


def generate_output_columns(prompt: str) -> Dict[str, Any]:
    """Analyze a user's prompt and suggest appropriate output columns."""
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
3. Descriptions MUST include BOTH meaning AND format
4. Return ONLY the JSON object (no code blocks, no explanations)"""

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

@app.post("/process/{action}")
async def process_action(request: Request, action: str, background_tasks: BackgroundTasks):
    """Unified endpoint for all processing actions."""
    body = await request.json()
    
    if action == "batch":
        batch_id = body.get("batch_id")
        rows = body.get("rows", [])

        if not batch_id:
            raise HTTPException(status_code=400, detail="batch_id is required")

        if not rows or len(rows) == 0:
            raise HTTPException(status_code=400, detail="rows array cannot be empty")

        output_schema = body.get("output_schema") or body.get("output_columns") or []
        
        # Process in background
        background_tasks.add_task(
            _process_batch_internal,
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

        result = generate_output_columns(prompt)
        return result
    
    else:
        raise HTTPException(status_code=404, detail=f"Unknown action: {action}. Supported actions: 'batch', 'columns'")


@app.post("/batch")
async def process_batch_legacy(request: Request, background_tasks: BackgroundTasks):
    """Legacy endpoint - redirects to /process/batch"""
    return await process_action(request, "batch", background_tasks)


@app.post("/generate-columns")
async def generate_columns_legacy(request: Request):
    """Legacy endpoint - redirects to /process/columns"""
    body = await request.json()
    return await process_action(request, "columns", BackgroundTasks())


@app.get("/health")
async def health_endpoint():
    """Health check endpoint."""
    return {"status": "healthy", "service": "bulk-gpt-processor-railway", "version": "1.0.0"}


@app.post("/test")
async def test_endpoint(request: Request):
    """Synchronous test endpoint - processes a single row and returns result immediately."""
    body = await request.json()
    prompt = body.get("prompt", "Describe {{input}}")
    row = body.get("row", {"input": "test"})
    tools = body.get("tools", [])
    output_schema = body.get("output_schema", [{"name": "result", "description": "Result"}])
    
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return {
            "status": "error",
            "error": "Missing GEMINI_API_KEY",
        }
    
    try:
        result = _process_single_row(
            batch_id="test-sync",
            row=row,
            row_index=0,
            prompt=prompt,
            context="",
            output_schema=output_schema,
            tools=tools,
            gemini_api_key=gemini_api_key,
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

