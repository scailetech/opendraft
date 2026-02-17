#!/usr/bin/env python3
"""
ABOUTME: Integration tests for factcheck pipeline — requires GOOGLE_API_KEY
ABOUTME: Tests claim extraction, evidence search, judge verdicts, and end-to-end pipeline
"""

import json
import os
import sys
import socket
from pathlib import Path

import pytest

# Add engine to path
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.factcheck_verifier import (
    FactCheckVerifier,
    VERDICT_SUPPORTED,
    VERDICT_CONTRADICTED,
    VERDICT_INSUFFICIENT,
    strip_json_fences,
)


# =========================================================================
# Helpers
# =========================================================================

def require_api_key():
    """Skip test if no Google API key is available."""
    key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        pytest.skip("GOOGLE_API_KEY / GEMINI_API_KEY not set")
    return key


def require_network_access():
    """Skip test if outbound network/DNS for Gemini endpoint is unavailable."""
    try:
        socket.getaddrinfo("generativelanguage.googleapis.com", 443, proto=socket.IPPROTO_TCP)
    except OSError as e:
        pytest.skip(f"Network/DNS unavailable for Gemini endpoint: {e}")


def is_network_error(exc: Exception) -> bool:
    """Detect connectivity-related errors in restricted environments."""
    if isinstance(exc, OSError):
        return True
    error_text = str(exc).lower()
    network_markers = [
        "connecterror",
        "connection error",
        "connection reset",
        "timed out",
        "deadline exceeded",
        "temporary failure in name resolution",
        "name or service not known",
        "nodename nor servname",
        "[errno 8]",
    ]
    return any(marker in error_text for marker in network_markers)


def strip_and_parse_json(text: str):
    """Strip markdown fences and parse JSON from LLM output."""
    return json.loads(strip_json_fences(text))


# A short fake draft with known true and false claims for testing
FAKE_DRAFT = """
## 2.1 - Literature Review

The field of artificial intelligence has seen rapid growth in recent years.
GPT-4 was released by OpenAI in 2022, marking a significant advancement in
large language models. The global AI market reached $900 billion in 2020,
demonstrating the massive scale of investment in this sector.

Python was created by Guido van Rossum and first released in 1991. It has
since become one of the most popular programming languages for machine learning
applications.

## 2.2 - Methodology

The transformer architecture was introduced by Vaswani et al. in their 2017
paper "Attention Is All You Need". BERT was developed by Google and released
in 2018 as a pre-trained language model.

## 2.3 - Discussion

While these models show promising results, the environmental impact of training
large models remains a concern. The field may benefit from more efficient
training approaches in the future.
"""


# =========================================================================
# Test: Claim Extraction
# =========================================================================

@pytest.mark.integration
def test_claim_extraction():
    """
    Feed a fake draft with known claims to the factcheck_extract prompt.
    Verify output is valid JSON with correct structure and captures key claims.
    """
    require_api_key()
    require_network_access()

    from utils.agent_runner import setup_model, run_agent

    model = setup_model()

    # Read the extraction prompt
    prompt_path = "prompts/04_validate/factcheck_extract.md"

    try:
        extraction_output = run_agent(
            model=model,
            name="FactCheck - Claim Extraction (test)",
            prompt_path=prompt_path,
            user_input=f"Extract all verifiable factual claims from this draft:\n\n{FAKE_DRAFT}",
            skip_validation=True,
            verbose=False,
        )
    except Exception as e:
        if is_network_error(e):
            pytest.skip(f"Network unavailable during live extraction: {e}")
        raise

    # Parse the output
    claims = strip_and_parse_json(extraction_output)

    # Basic structure checks
    assert isinstance(claims, list), f"Expected JSON array, got {type(claims)}"
    assert len(claims) >= 3, f"Expected at least 3 claims, got {len(claims)}"

    for claim in claims:
        assert "claim" in claim, f"Missing 'claim' key in: {claim}"
        assert "section" in claim, f"Missing 'section' key in: {claim}"
        assert "line" in claim, f"Missing 'line' key in: {claim}"

    # Check that known claims are extracted
    claim_texts = [c["claim"].lower() for c in claims]

    # These factual claims should be extracted
    assert any("2022" in c or "gpt-4" in c.lower() for c in claim_texts), \
        f"Expected GPT-4/2022 claim to be extracted. Got: {claim_texts}"

    assert any("guido" in c or "python" in c for c in claim_texts), \
        f"Expected Python/Guido claim to be extracted. Got: {claim_texts}"

    # Opinions and hedged language should NOT be extracted
    # "promising results" and "may benefit" are opinions/hedged
    for claim in claims:
        ct = claim["claim"].lower()
        assert "promising results" not in ct, \
            f"Opinion 'promising results' should not be extracted: {ct}"
        assert "may benefit" not in ct, \
            f"Hedged language 'may benefit' should not be extracted: {ct}"


# =========================================================================
# Test: Evidence Search
# =========================================================================

@pytest.mark.integration
def test_evidence_search():
    """
    Test that _search_evidence returns useful evidence for known claims.
    """
    api_key = require_api_key()
    require_network_access()

    from utils.agent_runner import setup_model
    model = setup_model()

    verifier = FactCheckVerifier(api_key=api_key, model=model)

    # Test with a well-known false claim
    try:
        evidence_false = verifier._search_evidence("GPT-4 was released in 2022")
    except Exception as e:
        if is_network_error(e):
            pytest.skip(f"Network unavailable during evidence search: {e}")
        raise
    assert len(evidence_false) >= 1, "Expected at least 1 evidence item for GPT-4 claim"
    assert evidence_false[0]["snippet"], "Evidence snippet should not be empty"

    # Test with a well-known true claim
    try:
        evidence_true = verifier._search_evidence("Python was created by Guido van Rossum")
    except Exception as e:
        if is_network_error(e):
            pytest.skip(f"Network unavailable during evidence search: {e}")
        raise
    assert len(evidence_true) >= 1, "Expected at least 1 evidence item for Python claim"
    assert evidence_true[0]["snippet"], "Evidence snippet should not be empty"


# =========================================================================
# Test: Judge
# =========================================================================

@pytest.mark.integration
def test_judge():
    """
    Test that _judge returns correct verdicts given claim + evidence pairs.
    """
    api_key = require_api_key()
    require_network_access()

    from utils.agent_runner import setup_model
    model = setup_model()

    verifier = FactCheckVerifier(api_key=api_key, model=model)

    # --- Case 1: False claim with contradicting evidence ---
    false_claim = {
        "claim": "GPT-4 was released in 2022",
        "section": "2.1",
        "line": "GPT-4 was released by OpenAI in 2022",
    }
    contradicting_evidence = [
        {
            "snippet": "GPT-4 was released by OpenAI on March 14, 2023. It was announced alongside ChatGPT Plus.",
            "url": "https://en.wikipedia.org/wiki/GPT-4",
            "title": "GPT-4 - Wikipedia",
        }
    ]
    try:
        verdict_false = verifier._judge(false_claim, contradicting_evidence)
    except Exception as e:
        if is_network_error(e):
            pytest.skip(f"Network unavailable during judge call: {e}")
        raise
    assert verdict_false["verdict"] == VERDICT_CONTRADICTED, \
        f"Expected CONTRADICTED for false claim, got: {verdict_false['verdict']}"
    # wrong_part should be set and be a substring of the claim
    if verdict_false.get("wrong_part"):
        assert verdict_false["wrong_part"] in false_claim["claim"], \
            f"wrong_part '{verdict_false['wrong_part']}' not found in claim"

    # --- Case 2: True claim with supporting evidence ---
    true_claim = {
        "claim": "Python was created by Guido van Rossum",
        "section": "2.1",
        "line": "Python was created by Guido van Rossum and first released in 1991",
    }
    supporting_evidence = [
        {
            "snippet": "Python is a high-level programming language created by Guido van Rossum and first released in 1991.",
            "url": "https://en.wikipedia.org/wiki/Python_(programming_language)",
            "title": "Python (programming language)",
        }
    ]
    try:
        verdict_true = verifier._judge(true_claim, supporting_evidence)
    except Exception as e:
        if is_network_error(e):
            pytest.skip(f"Network unavailable during judge call: {e}")
        raise
    assert verdict_true["verdict"] == VERDICT_SUPPORTED, \
        f"Expected SUPPORTED for true claim, got: {verdict_true['verdict']}"

    # --- Case 3: Claim with empty evidence → INSUFFICIENT ---
    unknown_claim = {
        "claim": "The XYZ algorithm reduces latency by 47.3%",
        "section": "2.3",
        "line": "our experiments show the XYZ algorithm reduces latency by 47.3%",
    }
    try:
        verdict_unknown = verifier._judge(unknown_claim, [])
    except Exception as e:
        if is_network_error(e):
            pytest.skip(f"Network unavailable during judge call: {e}")
        raise
    assert verdict_unknown["verdict"] == VERDICT_INSUFFICIENT, \
        f"Expected INSUFFICIENT for empty evidence, got: {verdict_unknown['verdict']}"


# =========================================================================
# Test: End-to-End Pipeline
# =========================================================================

@pytest.mark.integration
def test_end_to_end():
    """
    Full pipeline: fake draft -> extract claims -> verify -> report.
    """
    api_key = require_api_key()
    require_network_access()

    from utils.agent_runner import setup_model, run_agent

    model = setup_model()

    # Step 1: Extract claims
    prompt_path = "prompts/04_validate/factcheck_extract.md"
    try:
        extraction_output = run_agent(
            model=model,
            name="FactCheck - Claim Extraction (e2e test)",
            prompt_path=prompt_path,
            user_input=f"Extract all verifiable factual claims from this draft:\n\n{FAKE_DRAFT}",
            skip_validation=True,
            verbose=False,
        )
    except Exception as e:
        if is_network_error(e):
            pytest.skip(f"Network unavailable during e2e extraction: {e}")
        raise

    claims = strip_and_parse_json(extraction_output)
    assert isinstance(claims, list), f"Expected list, got {type(claims)}"
    assert len(claims) >= 2, f"Expected at least 2 claims, got {len(claims)}"

    # Step 2: Verify claims
    verifier = FactCheckVerifier(api_key=api_key, model=model)
    try:
        results = verifier.verify_claims(claims)
    except Exception as e:
        if is_network_error(e):
            pytest.skip(f"Network unavailable during e2e verification: {e}")
        raise
    assert len(results) >= 2, f"Expected at least 2 results, got {len(results)}"

    # Step 3: Format report
    report = verifier.format_report(results)
    assert "Fact-Check Verification Report" in report
    assert "Claims Checked:**" in report

    # At least one of our deliberately false claims should be caught
    # (GPT-4 released in 2022, or $900 billion market in 2020)
    has_contradicted = any(r["verdict"] == VERDICT_CONTRADICTED for r in results)
    assert has_contradicted, \
        f"Expected at least 1 CONTRADICTED verdict for deliberately false claims. " \
        f"Verdicts: {[r['verdict'] for r in results]}"

    assert "ISSUES FOUND" in report, "Report should have ISSUES FOUND section when contradictions exist"

    # Check that find/replace is present for at least one contradiction
    contradicted_results = [r for r in results if r["verdict"] == VERDICT_CONTRADICTED]
    has_find_replace = any(
        r.get("wrong_part") and r.get("correct_value")
        for r in contradicted_results
    )
    # Find/replace is expected but not strictly required (depends on LLM quality)
    if has_find_replace:
        assert "**Find:**" in report

    # True claims should NOT be contradicted
    for r in results:
        claim_lower = r["claim"].lower()
        if "guido van rossum" in claim_lower or "1991" in claim_lower:
            assert r["verdict"] != VERDICT_CONTRADICTED, \
                f"True claim about Python should not be CONTRADICTED: {r['claim']}"
        if "attention is all you need" in claim_lower or "vaswani" in claim_lower:
            assert r["verdict"] != VERDICT_CONTRADICTED, \
                f"True claim about Transformers should not be CONTRADICTED: {r['claim']}"
