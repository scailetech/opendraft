#!/usr/bin/env python3
"""
Stress Test Script for Modal Processor
=======================================

Tests:
1. Large batch (100+ rows)
2. Concurrent batches (5 x 20 rows)
3. Rate limit handling (50 rapid requests)
4. Error recovery

Usage:
    python stress_test.py [test_name]
    
    test_name options:
        all         - Run all tests (default)
        large       - Large batch test (100 rows)
        concurrent  - Concurrent batches test (5 x 20)
        rate        - Rate limit test (50 rapid)
        errors      - Error handling test
"""

import asyncio
import aiohttp
import json
import time
import random
import string
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict

# Modal endpoint
MODAL_URL = "https://tech-bulkgpt--bulk-gpt-processor-v3-fastapi-app.modal.run"

# Test domains - common words that work well for domain research
TEST_DOMAINS = [
    "apple", "google", "amazon", "tesla", "microsoft", "meta", "netflix", "uber",
    "airbnb", "spotify", "twitter", "linkedin", "dropbox", "slack", "zoom", "stripe",
    "square", "shopify", "canva", "notion", "figma", "discord", "twitch", "reddit",
    "pinterest", "snap", "tiktok", "robinhood", "coinbase", "opensea", "roblox",
    "epic", "valve", "steam", "nvidia", "amd", "intel", "qualcomm", "broadcom",
    "cisco", "oracle", "ibm", "dell", "hp", "lenovo", "samsung", "sony", "nintendo",
    "xbox", "playstation", "oculus", "quest", "alexa", "siri", "cortana", "bard",
    "gemini", "claude", "gpt", "dalle", "midjourney", "stable", "runway", "jasper",
    "copy", "grammarly", "duolingo", "coursera", "udemy", "khan", "brilliant",
    "quizlet", "anki", "notion", "obsidian", "roam", "logseq", "craft", "bear",
    "ulysses", "scrivener", "final", "premiere", "resolve", "vegas", "audacity",
    "garageband", "logic", "ableton", "fruity", "reason", "cubase", "protools",
    "reaper", "audition", "wavelab", "izotope", "native", "arturia", "roland",
    "korg", "moog", "teenage", "elektron", "akai", "novation", "focusrite", "universal",
    "apollo", "neve", "ssl", "api", "rupert", "manley", "avalon", "chandler", "shadow"
]


@dataclass
class TestResult:
    """Holds results of a single test."""
    name: str
    success: bool
    duration_seconds: float
    total_rows: int = 0
    successful_rows: int = 0
    failed_rows: int = 0
    error_rate: float = 0.0
    rows_per_second: float = 0.0
    errors: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


class StressTest:
    """Stress testing suite for Modal processor."""
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()
    
    def generate_batch_id(self) -> str:
        """Generate a unique batch ID for testing."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        rand = ''.join(random.choices(string.ascii_lowercase, k=6))
        return f"stress_test_{timestamp}_{rand}"
    
    async def call_test_endpoint(self, row: Dict[str, str], tools: List[str] = None) -> Dict[str, Any]:
        """Call the /test endpoint for a single row."""
        payload = {
            "prompt": "For the domain {{domain}}, give me the Italian and Chinese translations",
            "row": row,
            "output_schema": [
                {"name": "italian", "description": "Italian translation"},
                {"name": "chinese", "description": "Chinese characters"}
            ],
            "tools": tools or []
        }
        
        try:
            async with self.session.post(
                f"{MODAL_URL}/test",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    return {"status": "error", "error": f"HTTP {resp.status}"}
        except asyncio.TimeoutError:
            return {"status": "error", "error": "Timeout"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def call_batch_endpoint(
        self, 
        batch_id: str, 
        rows: List[Dict[str, str]], 
        tools: List[str] = None,
        with_web_search: bool = False
    ) -> Dict[str, Any]:
        """Call the /batch endpoint for a full batch."""
        payload = {
            "batch_id": batch_id,
            "rows": rows,
            "prompt": "For the domain {{domain}}, provide translations",
            "context": "Translate the domain name word",
            "output_schema": [
                {"name": "italian", "description": "Italian translation"},
                {"name": "chinese", "description": "Chinese characters"}
            ],
            "tools": ["web-search"] if with_web_search else []
        }
        
        try:
            async with self.session.post(
                f"{MODAL_URL}/batch",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=600)  # 10 min timeout for large batches
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    text = await resp.text()
                    return {"status": "error", "error": f"HTTP {resp.status}: {text[:200]}"}
        except asyncio.TimeoutError:
            return {"status": "error", "error": "Timeout (10 min)"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    # ============================================================
    # TEST 1: Large Batch (100 rows) - Uses /test endpoint concurrently
    # ============================================================
    async def test_large_batch(self, num_rows: int = 100, with_web_search: bool = False) -> TestResult:
        """Test processing many rows concurrently using /test endpoint."""
        print(f"\n{'='*60}")
        print(f"TEST: Large Batch ({num_rows} rows, web_search={with_web_search})")
        print(f"{'='*60}")
        
        # Generate test rows
        rows = [{"domain": TEST_DOMAINS[i % len(TEST_DOMAINS)]} for i in range(num_rows)]
        tools = ["web-search"] if with_web_search else []
        
        print(f"Rows: {len(rows)}")
        print(f"Tools: {tools}")
        print(f"Starting at: {datetime.now().strftime('%H:%M:%S')}")
        print(f"Firing {num_rows} concurrent requests to /test endpoint...")
        
        start_time = time.time()
        
        # Fire all requests concurrently (batches of 20 to avoid overwhelming)
        batch_size = 20
        all_results = []
        
        for i in range(0, num_rows, batch_size):
            batch = rows[i:i+batch_size]
            tasks = [self.call_test_endpoint(row, tools) for row in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            all_results.extend(batch_results)
            
            elapsed = time.time() - start_time
            completed = len(all_results)
            print(f"  Progress: {completed}/{num_rows} ({elapsed:.1f}s)")
        
        duration = time.time() - start_time
        
        # Count results
        successful = 0
        failed = 0
        errors = []
        
        for i, result in enumerate(all_results):
            if isinstance(result, Exception):
                failed += 1
                errors.append(f"Row {i}: {str(result)}")
            elif result.get("status") == "success":
                successful += 1
            else:
                failed += 1
                errors.append(f"Row {i}: {result.get('error', 'unknown')}")
        
        total = len(all_results)
        error_rate = (failed / total * 100) if total > 0 else 0
        rows_per_second = total / duration if duration > 0 else 0
        
        print(f"\nResults:")
        print(f"  Duration: {duration:.1f}s")
        print(f"  Rows/second: {rows_per_second:.2f}")
        print(f"  Successful: {successful}/{total}")
        print(f"  Failed: {failed}/{total}")
        print(f"  Error rate: {error_rate:.1f}%")
        
        return TestResult(
            name=f"large_batch_{num_rows}",
            success=error_rate < 5,
            duration_seconds=duration,
            total_rows=total,
            successful_rows=successful,
            failed_rows=failed,
            error_rate=error_rate,
            rows_per_second=rows_per_second,
            errors=errors[:10],  # Limit errors
            details={"with_web_search": with_web_search}
        )
    
    # ============================================================
    # TEST 2: Concurrent Batches (5 x 20 rows) - Simulates multiple users
    # ============================================================
    async def test_concurrent_batches(self, num_batches: int = 5, rows_per_batch: int = 20) -> TestResult:
        """Test multiple 'users' running batches concurrently using /test endpoint."""
        print(f"\n{'='*60}")
        print(f"TEST: Concurrent Batches ({num_batches} batches x {rows_per_batch} rows)")
        print(f"{'='*60}")
        
        total_rows = num_batches * rows_per_batch
        print(f"Total requests: {total_rows}")
        print(f"Simulating {num_batches} concurrent users...")
        
        async def process_user_batch(user_id: int, rows: List[Dict]) -> Dict:
            """Process a single user's batch."""
            results = []
            for row in rows:
                result = await self.call_test_endpoint(row, tools=[])
                results.append(result)
            
            success = sum(1 for r in results if r.get("status") == "success")
            failed = len(results) - success
            return {
                "user_id": user_id,
                "total": len(results),
                "successful": success,
                "failed": failed
            }
        
        # Create batches for each "user"
        user_batches = []
        for i in range(num_batches):
            start_idx = (i * rows_per_batch) % len(TEST_DOMAINS)
            domains = TEST_DOMAINS[start_idx:start_idx + rows_per_batch]
            if len(domains) < rows_per_batch:
                domains += TEST_DOMAINS[:rows_per_batch - len(domains)]
            rows = [{"domain": d} for d in domains]
            user_batches.append((i + 1, rows))
            print(f"  User {i+1}: {len(rows)} rows")
        
        print(f"\nStarting all {num_batches} users simultaneously...")
        start_time = time.time()
        
        # Run all user batches concurrently
        tasks = [process_user_batch(user_id, rows) for user_id, rows in user_batches]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        duration = time.time() - start_time
        
        # Aggregate results
        total_processed = 0
        successful_rows = 0
        failed_rows = 0
        errors = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                errors.append(f"User {i+1} exception: {str(result)}")
                failed_rows += rows_per_batch
            else:
                total_processed += result.get("total", 0)
                successful_rows += result.get("successful", 0)
                failed_rows += result.get("failed", 0)
                print(f"  User {result['user_id']}: {result['successful']}/{result['total']} successful")
        
        error_rate = (failed_rows / total_rows * 100) if total_rows > 0 else 0
        rows_per_second = total_processed / duration if duration > 0 else 0
        
        print(f"\nAggregated Results:")
        print(f"  Total duration: {duration:.1f}s")
        print(f"  Total rows: {total_processed}")
        print(f"  Rows/second: {rows_per_second:.2f}")
        print(f"  Error rate: {error_rate:.1f}%")
        
        return TestResult(
            name="concurrent_batches",
            success=error_rate < 5,
            duration_seconds=duration,
            total_rows=total_processed,
            successful_rows=successful_rows,
            failed_rows=failed_rows,
            error_rate=error_rate,
            rows_per_second=rows_per_second,
            errors=errors,
            details={"num_users": num_batches, "rows_per_user": rows_per_batch}
        )
    
    # ============================================================
    # TEST 3: Rate Limit (50 rapid requests)
    # ============================================================
    async def test_rate_limits(self, num_requests: int = 50) -> TestResult:
        """Test rate limiting by firing many rapid requests."""
        print(f"\n{'='*60}")
        print(f"TEST: Rate Limits ({num_requests} rapid requests)")
        print(f"{'='*60}")
        
        # Generate test rows
        rows = [{"domain": TEST_DOMAINS[i % len(TEST_DOMAINS)]} for i in range(num_requests)]
        
        print(f"Firing {num_requests} concurrent /test requests...")
        start_time = time.time()
        
        # Fire all requests concurrently
        tasks = [self.call_test_endpoint(row, tools=[]) for row in rows]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        duration = time.time() - start_time
        
        # Count results
        success_count = 0
        error_count = 0
        rate_limited = 0
        timeout_count = 0
        errors = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                error_count += 1
                errors.append(f"Request {i}: {str(result)}")
            elif result.get("status") == "success":
                success_count += 1
            elif "429" in str(result.get("error", "")):
                rate_limited += 1
            elif "Timeout" in str(result.get("error", "")):
                timeout_count += 1
            else:
                error_count += 1
                errors.append(f"Request {i}: {result.get('error', 'unknown')}")
        
        error_rate = (error_count / num_requests * 100) if num_requests > 0 else 0
        requests_per_second = num_requests / duration if duration > 0 else 0
        
        print(f"\nResults:")
        print(f"  Duration: {duration:.1f}s")
        print(f"  Requests/second: {requests_per_second:.1f}")
        print(f"  Successful: {success_count}/{num_requests}")
        print(f"  Rate limited (429): {rate_limited}")
        print(f"  Timeouts: {timeout_count}")
        print(f"  Other errors: {error_count}")
        
        # Rate limiting is expected and OK - we just want graceful handling
        success = (success_count + rate_limited) / num_requests >= 0.9
        
        return TestResult(
            name="rate_limits",
            success=success,
            duration_seconds=duration,
            total_rows=num_requests,
            successful_rows=success_count,
            failed_rows=error_count,
            error_rate=error_rate,
            rows_per_second=requests_per_second,
            errors=errors[:10],  # Limit errors
            details={
                "rate_limited": rate_limited,
                "timeouts": timeout_count
            }
        )
    
    # ============================================================
    # TEST 4: Error Handling
    # ============================================================
    async def test_error_handling(self) -> TestResult:
        """Test error handling with invalid inputs."""
        print(f"\n{'='*60}")
        print(f"TEST: Error Handling")
        print(f"{'='*60}")
        
        test_cases = [
            {
                "name": "Missing row",
                "payload": {
                    "prompt": "Test {{domain}}",
                    "output_schema": [{"name": "test", "description": "test"}]
                }
            },
            {
                "name": "Empty prompt",
                "payload": {
                    "prompt": "",
                    "row": {"domain": "test"},
                    "output_schema": [{"name": "test", "description": "test"}]
                }
            },
            {
                "name": "Invalid schema",
                "payload": {
                    "prompt": "Test {{domain}}",
                    "row": {"domain": "test"},
                    "output_schema": "not an array"
                }
            },
            {
                "name": "Missing placeholder",
                "payload": {
                    "prompt": "Test without placeholder",
                    "row": {"domain": "test"},
                    "output_schema": [{"name": "test", "description": "test"}]
                }
            },
            {
                "name": "Unknown tool",
                "payload": {
                    "prompt": "Test {{domain}}",
                    "row": {"domain": "test"},
                    "output_schema": [{"name": "test", "description": "test"}],
                    "tools": ["fake-tool-xyz"]
                }
            }
        ]
        
        results = []
        start_time = time.time()
        
        for tc in test_cases:
            print(f"  Testing: {tc['name']}...", end=" ")
            try:
                async with self.session.post(
                    f"{MODAL_URL}/test",
                    json=tc["payload"],
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    status = resp.status
                    body = await resp.json() if resp.status == 200 else await resp.text()
                    
                    # We expect either success with graceful handling or a clear error
                    handled_gracefully = (
                        status == 200 or  # Handled with response
                        status == 400 or  # Bad request (expected)
                        status == 422     # Validation error (expected)
                    )
                    
                    results.append({
                        "name": tc["name"],
                        "status": status,
                        "handled": handled_gracefully,
                        "response": str(body)[:100]
                    })
                    print(f"HTTP {status} - {'OK' if handled_gracefully else 'UNEXPECTED'}")
            except Exception as e:
                results.append({
                    "name": tc["name"],
                    "status": "exception",
                    "handled": False,
                    "response": str(e)[:100]
                })
                print(f"Exception: {str(e)[:50]}")
        
        duration = time.time() - start_time
        handled_count = sum(1 for r in results if r["handled"])
        
        print(f"\nResults:")
        print(f"  Handled gracefully: {handled_count}/{len(test_cases)}")
        
        return TestResult(
            name="error_handling",
            success=handled_count >= len(test_cases) - 1,  # Allow 1 unexpected
            duration_seconds=duration,
            total_rows=len(test_cases),
            successful_rows=handled_count,
            failed_rows=len(test_cases) - handled_count,
            error_rate=((len(test_cases) - handled_count) / len(test_cases) * 100),
            rows_per_second=0,
            errors=[r["response"] for r in results if not r["handled"]],
            details={"test_cases": results}
        )
    
    # ============================================================
    # Run All Tests
    # ============================================================
    async def run_all(self):
        """Run all stress tests and generate report."""
        print("\n" + "="*60)
        print("STRESS TEST SUITE - Modal Processor")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        # Run tests
        self.results.append(await self.test_large_batch(100, with_web_search=False))
        self.results.append(await self.test_concurrent_batches(5, 20))
        self.results.append(await self.test_rate_limits(50))
        self.results.append(await self.test_error_handling())
        
        # Generate report
        self.print_report()
    
    def print_report(self):
        """Print final test report."""
        print("\n" + "="*60)
        print("STRESS TEST REPORT")
        print("="*60)
        
        all_passed = True
        total_duration = 0
        
        for result in self.results:
            status = "PASS" if result.success else "FAIL"
            all_passed = all_passed and result.success
            total_duration += result.duration_seconds
            
            print(f"\n{result.name}:")
            print(f"  Status: {status}")
            print(f"  Duration: {result.duration_seconds:.1f}s")
            if result.total_rows > 0:
                print(f"  Rows: {result.successful_rows}/{result.total_rows} successful")
                print(f"  Error rate: {result.error_rate:.1f}%")
                if result.rows_per_second > 0:
                    print(f"  Throughput: {result.rows_per_second:.2f} rows/s")
            if result.errors:
                print(f"  Errors: {len(result.errors)}")
                for err in result.errors[:3]:
                    if err:
                        print(f"    - {str(err)[:80]}")
        
        print("\n" + "-"*60)
        print(f"OVERALL: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
        print(f"Total duration: {total_duration:.1f}s")
        print("-"*60)
        
        return all_passed


async def main():
    """Main entry point."""
    test_name = sys.argv[1] if len(sys.argv) > 1 else "all"
    
    async with StressTest() as tester:
        if test_name == "all":
            await tester.run_all()
        elif test_name == "large":
            result = await tester.test_large_batch(100)
            tester.results.append(result)
            tester.print_report()
        elif test_name == "concurrent":
            result = await tester.test_concurrent_batches(5, 20)
            tester.results.append(result)
            tester.print_report()
        elif test_name == "rate":
            result = await tester.test_rate_limits(50)
            tester.results.append(result)
            tester.print_report()
        elif test_name == "errors":
            result = await tester.test_error_handling()
            tester.results.append(result)
            tester.print_report()
        else:
            print(f"Unknown test: {test_name}")
            print("Available: all, large, concurrent, rate, errors")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

