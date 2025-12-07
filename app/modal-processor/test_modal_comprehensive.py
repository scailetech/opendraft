#!/usr/bin/env python3
"""
Comprehensive test suite for Modal backend
Tests various payloads, tools, and output formats to ensure compatibility with gtm-power-app backend
"""

import json
import requests
import sys
from typing import Dict, Any, List

# Modal API URL
MODAL_URL = "https://scaile-tech-bulkgpt--bulk-gpt-processor-fastapi-app-fastapi-app.modal.run"

def test_health():
    """Test health endpoint"""
    print("\n🧪 Test 1: Health Check")
    print(f"   GET {MODAL_URL}/health")
    try:
        response = requests.get(f"{MODAL_URL}/health", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "status" in response.json(), "Response should contain 'status'"
        print("   ✅ Health check passed")
        return True
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
        return False

def test_batch_no_tools():
    """Test batch processing without tools"""
    print("\n🧪 Test 2: Batch Processing (No Tools)")
    payload = {
        "batch_id": "test-batch-no-tools",
        "rows": [
            {"name": "John Doe", "company": "Acme Corp", "role": "CEO"},
            {"name": "Jane Smith", "company": "Tech Inc", "role": "CTO"}
        ],
        "prompt": "Write a professional bio for {{name}} who is {{role}} at {{company}}",
        "context": "Professional LinkedIn-style bios",
        "output_schema": [
            {"name": "bio", "description": "Professional biography"}
        ],
        "tools": []
    }
    print(f"   POST {MODAL_URL}/batch")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    try:
        response = requests.post(
            f"{MODAL_URL}/batch",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert result.get("status") == "accepted", "Should return 'accepted' status"
        assert "batch_id" in result, "Should contain batch_id"
        assert result.get("total_rows") == 2, "Should report correct row count"
        print("   ✅ Batch processing (no tools) passed")
        return True
    except Exception as e:
        print(f"   ❌ Batch processing (no tools) failed: {e}")
        return False

def test_batch_web_search():
    """Test batch processing with web-search tool"""
    print("\n🧪 Test 3: Batch Processing (Web Search Tool)")
    payload = {
        "batch_id": "test-batch-web-search",
        "rows": [
            {"company": "OpenAI", "query": "latest AI developments"},
            {"company": "Anthropic", "query": "Claude AI features"}
        ],
        "prompt": "Research {{company}} and find information about {{query}}. Provide a summary.",
        "context": "Tech industry research",
        "output_schema": [
            {"name": "summary", "description": "Research summary"},
            {"name": "key_findings", "description": "Key findings from research"}
        ],
        "tools": ["web-search"]
    }
    print(f"   POST {MODAL_URL}/batch")
    print(f"   Tools: {payload['tools']}")
    try:
        response = requests.post(
            f"{MODAL_URL}/batch",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert result.get("status") == "accepted", "Should return 'accepted' status"
        print("   ✅ Batch processing (web-search) passed")
        return True
    except Exception as e:
        print(f"   ❌ Batch processing (web-search) failed: {e}")
        return False

def test_batch_url_context():
    """Test batch processing with url-context tool"""
    print("\n🧪 Test 4: Batch Processing (URL Context Tool)")
    payload = {
        "batch_id": "test-batch-url-context",
        "rows": [
            {"url": "https://www.openai.com", "focus": "company overview"},
            {"url": "https://www.anthropic.com", "focus": "products"}
        ],
        "prompt": "Analyze {{url}} and extract information about {{focus}}",
        "context": "Website content analysis",
        "output_schema": [
            {"name": "analysis", "description": "Content analysis"},
            {"name": "key_points", "description": "Key points extracted"}
        ],
        "tools": ["url-context"]
    }
    print(f"   POST {MODAL_URL}/batch")
    print(f"   Tools: {payload['tools']}")
    try:
        response = requests.post(
            f"{MODAL_URL}/batch",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert result.get("status") == "accepted", "Should return 'accepted' status"
        print("   ✅ Batch processing (url-context) passed")
        return True
    except Exception as e:
        print(f"   ❌ Batch processing (url-context) failed: {e}")
        return False

def test_batch_both_tools():
    """Test batch processing with both tools"""
    print("\n🧪 Test 5: Batch Processing (Both Tools)")
    payload = {
        "batch_id": "test-batch-both-tools",
        "rows": [
            {"company": "OpenAI", "url": "https://www.openai.com"},
            {"company": "Anthropic", "url": "https://www.anthropic.com"}
        ],
        "prompt": "Research {{company}} online and analyze their website at {{url}}. Provide comprehensive insights.",
        "context": "Competitive intelligence research",
        "output_schema": [
            {"name": "web_research", "description": "Findings from web search"},
            {"name": "website_analysis", "description": "Analysis of website content"},
            {"name": "insights", "description": "Combined insights"}
        ],
        "tools": ["web-search", "url-context"]
    }
    print(f"   POST {MODAL_URL}/batch")
    print(f"   Tools: {payload['tools']}")
    try:
        response = requests.post(
            f"{MODAL_URL}/batch",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert result.get("status") == "accepted", "Should return 'accepted' status"
        print("   ✅ Batch processing (both tools) passed")
        return True
    except Exception as e:
        print(f"   ❌ Batch processing (both tools) failed: {e}")
        return False

def test_batch_no_output_schema():
    """Test batch processing without output_schema (freeform output)"""
    print("\n🧪 Test 6: Batch Processing (No Output Schema)")
    payload = {
        "batch_id": "test-batch-no-schema",
        "rows": [
            {"name": "John", "topic": "AI ethics"}
        ],
        "prompt": "Write a short essay about {{topic}}",
        "context": "Educational content",
        "tools": []
    }
    print(f"   POST {MODAL_URL}/batch")
    print(f"   Note: No output_schema provided (freeform output)")
    try:
        response = requests.post(
            f"{MODAL_URL}/batch",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert result.get("status") == "accepted", "Should return 'accepted' status"
        print("   ✅ Batch processing (no schema) passed")
        return True
    except Exception as e:
        print(f"   ❌ Batch processing (no schema) failed: {e}")
        return False

def test_batch_error_cases():
    """Test error handling"""
    print("\n🧪 Test 7: Error Handling")
    
    # Test 7a: Missing batch_id
    print("\n   7a. Missing batch_id")
    payload = {
        "rows": [{"name": "Test"}],
        "prompt": "Test prompt"
    }
    try:
        response = requests.post(
            f"{MODAL_URL}/batch",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        assert response.status_code in [200, 400], "Should return error status"
        assert "error" in result or result.get("status") == "error", "Should contain error"
        print("   ✅ Missing batch_id handled correctly")
    except Exception as e:
        print(f"   ❌ Missing batch_id test failed: {e}")
    
    # Test 7b: Empty rows
    print("\n   7b. Empty rows")
    payload = {
        "batch_id": "test-empty-rows",
        "rows": [],
        "prompt": "Test prompt"
    }
    try:
        response = requests.post(
            f"{MODAL_URL}/batch",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        assert response.status_code in [200, 400], "Should return error status"
        assert "error" in result or result.get("status") == "error", "Should contain error"
        print("   ✅ Empty rows handled correctly")
    except Exception as e:
        print(f"   ❌ Empty rows test failed: {e}")

def test_response_format():
    """Verify response format matches expected structure"""
    print("\n🧪 Test 8: Response Format Validation")
    payload = {
        "batch_id": "test-format-validation",
        "rows": [{"name": "Test"}],
        "prompt": "Test {{name}}",
        "output_schema": [{"name": "result"}],
        "tools": []
    }
    try:
        response = requests.post(
            f"{MODAL_URL}/batch",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        result = response.json()
        
        # Verify required fields
        required_fields = ["status", "batch_id", "total_rows"]
        for field in required_fields:
            assert field in result, f"Response missing required field: {field}"
        
        # Verify status value
        assert result["status"] == "accepted", "Status should be 'accepted'"
        
        # Verify batch_id matches
        assert result["batch_id"] == payload["batch_id"], "batch_id should match request"
        
        # Verify total_rows matches
        assert result["total_rows"] == len(payload["rows"]), "total_rows should match request"
        
        print("   ✅ Response format validation passed")
        print(f"   Response structure: {json.dumps({k: type(v).__name__ for k, v in result.items()}, indent=2)}")
        return True
    except Exception as e:
        print(f"   ❌ Response format validation failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 70)
    print("Modal Backend Comprehensive Test Suite")
    print("=" * 70)
    print(f"Testing: {MODAL_URL}")
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_health()))
    results.append(("Batch (No Tools)", test_batch_no_tools()))
    results.append(("Batch (Web Search)", test_batch_web_search()))
    results.append(("Batch (URL Context)", test_batch_url_context()))
    results.append(("Batch (Both Tools)", test_batch_both_tools()))
    results.append(("Batch (No Schema)", test_batch_no_output_schema()))
    test_batch_error_cases()  # Error tests don't return bool
    results.append(("Response Format", test_response_format()))
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())

