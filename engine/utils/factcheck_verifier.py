#!/usr/bin/env python3
"""
ABOUTME: Fact-check verification engine for OpenDraft QA pipeline
ABOUTME: Verifies factual claims in generated text using web-grounded evidence and LLM comparison
"""

import sys
import json
import time
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Optional
from collections import OrderedDict
from pathlib import Path

logger = logging.getLogger(__name__)

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import requests
except ImportError:
    requests = None


# =========================================================================
# FIFO Cache with TTL (ported from hallucination-detector-v2)
# =========================================================================

class FIFOCache:
    """Simple FIFO cache with TTL expiry for verification results."""

    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        self._cache: OrderedDict = OrderedDict()
        self._timestamps: Dict[str, float] = {}
        self._lock = threading.Lock()
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        """Get a value from cache if it exists and hasn't expired."""
        with self._lock:
            if key not in self._cache:
                return None
            if time.time() - self._timestamps[key] > self.ttl_seconds:
                del self._cache[key]
                del self._timestamps[key]
                return None
            return self._cache[key]

    def put(self, key: str, value: Any) -> None:
        """Add a value to cache, evicting oldest if full."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
            elif len(self._cache) >= self.max_size:
                oldest_key, _ = self._cache.popitem(last=False)
                self._timestamps.pop(oldest_key, None)
            self._cache[key] = value
            self._timestamps[key] = time.time()


# =========================================================================
# Verdict Classification
# =========================================================================

VERDICT_SUPPORTED = "SUPPORTED"
VERDICT_CONTRADICTED = "CONTRADICTED"
VERDICT_INSUFFICIENT = "INSUFFICIENT"
VALID_VERDICTS = {VERDICT_SUPPORTED, VERDICT_CONTRADICTED, VERDICT_INSUFFICIENT}


def strip_json_fences(text: str) -> str:
    """
    Strip markdown code fences from LLM JSON output.

    Handles ```json ... ```, ``` ... ```, and plain JSON.
    Returns the inner text ready for json.loads().
    """
    text = text.strip()
    if text.startswith('```'):
        lines = text.split('\n')
        lines = [l for l in lines if not l.strip().startswith('```')]
        text = '\n'.join(lines)
    return text


# =========================================================================
# FactCheck Verifier
# =========================================================================

class FactCheckVerifier:
    """
    Verifies factual claims using web-grounded evidence.

    Uses GeminiGroundedClient for web search and Gemini LLM for
    claim-vs-evidence comparison. Produces a markdown report with
    find/replace corrections for false claims.
    """

    def __init__(self, api_key: str):
        """
        Initialize the FactCheck verifier.

        Args:
            api_key: Google API key for Gemini and grounded search
        """
        from utils.api_citations.gemini_grounded import GeminiGroundedClient

        self.api_key = api_key
        self.grounded_client = GeminiGroundedClient(api_key=api_key)
        self._cache = FIFOCache(max_size=100, ttl_seconds=3600)

        # REST API config for judge step
        self._base_url = 'https://generativelanguage.googleapis.com/v1beta/models'
        self._judge_model = 'gemini-2.5-flash'

        # Session for REST API calls
        self._session = requests.Session() if requests else None

    def _verify_single_claim(self, i: int, total: int, claim_obj: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Verify a single claim. Used as a worker for parallel execution.

        Returns verdict dict, or None if claim_text is empty.
        """
        claim_text = claim_obj.get("claim", "")
        if not claim_text:
            return None

        # Check cache
        cached = self._cache.get(claim_text)
        if cached is not None:
            logger.debug(f"Cache hit for claim: {claim_text[:60]}...")
            return cached

        logger.info(f"[FactCheck] Verifying claim {i+1}/{total}: {claim_text[:80]}...")

        try:
            # Step 1: Search for evidence
            evidence = self._search_evidence(claim_text)

            # Step 2: Judge claim against evidence
            verdict = self._judge(claim_obj, evidence)

            # Cache result
            self._cache.put(claim_text, verdict)
            return verdict

        except Exception as e:
            logger.warning(f"[FactCheck] Failed to verify claim: {e}")
            return {
                "claim": claim_text,
                "section": claim_obj.get("section", ""),
                "line": claim_obj.get("line", ""),
                "verdict": VERDICT_INSUFFICIENT,
                "confidence": 0.0,
                "wrong_part": None,
                "correct_value": None,
                "source_url": None,
                "evidence_snippet": f"Verification failed: {e}",
            }

    def verify_claims(self, claims: List[Dict[str, str]], max_workers: int = 10) -> List[Dict[str, Any]]:
        """
        Verify each claim using web evidence, in parallel.

        Args:
            claims: List of claim dicts with keys: claim, section, line
            max_workers: Max concurrent verification threads (default: 10)

        Returns:
            List of verdict dicts in the same order as input claims
        """
        total = len(claims)

        # Use ThreadPoolExecutor for parallel I/O-bound verification
        # Each thread gets its own requests via the shared session (thread-safe)
        results: List[Optional[Dict[str, Any]]] = [None] * total

        with ThreadPoolExecutor(max_workers=min(max_workers, total or 1)) as executor:
            future_to_idx = {
                executor.submit(self._verify_single_claim, i, total, claim_obj): i
                for i, claim_obj in enumerate(claims)
            }

            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    results[idx] = future.result()
                except Exception as e:
                    logger.warning(f"[FactCheck] Unexpected error in worker: {e}")
                    claim_obj = claims[idx]
                    results[idx] = {
                        "claim": claim_obj.get("claim", ""),
                        "section": claim_obj.get("section", ""),
                        "line": claim_obj.get("line", ""),
                        "verdict": VERDICT_INSUFFICIENT,
                        "confidence": 0.0,
                        "wrong_part": None,
                        "correct_value": None,
                        "source_url": None,
                        "evidence_snippet": f"Verification failed: {e}",
                    }

        # Filter out None results (empty claims)
        return [r for r in results if r is not None]

    def _search_evidence(self, claim: str) -> List[Dict[str, str]]:
        """
        Use GeminiGroundedClient to find evidence for/against a claim.

        Sends the claim as a search query via the grounded client's
        REST API with Google Search grounding enabled. Returns evidence
        snippets with source URLs.

        Args:
            claim: The factual claim to search for

        Returns:
            List of evidence dicts with keys: snippet, url, title
        """
        evidence = []

        try:
            # Use the grounded client's internal REST API with search grounding
            prompt = (
                f"Is this claim true or false? Find evidence:\n\n"
                f"Claim: \"{claim}\"\n\n"
                f"Search for the most reliable sources that confirm or deny this claim. "
                f"Report what the evidence says with specific numbers, dates, or facts. "
                f"Include source URLs."
            )

            response_data = self.grounded_client._generate_content_with_grounding(prompt)

            if response_data:
                # Extract text content from response
                candidates = response_data.get('candidates', [])
                if candidates:
                    candidate = candidates[0]
                    content = candidate.get('content', {})
                    parts = content.get('parts', [])
                    text = parts[0].get('text', '') if parts else ''

                    if text:
                        evidence.append({
                            'snippet': text[:1000],
                            'url': '',
                            'title': 'Gemini Grounded Search',
                        })

                    # Extract grounding citations for source URLs
                    grounding_metadata = candidate.get('groundingMetadata', {})
                    grounding_chunks = grounding_metadata.get('groundingChunks', [])

                    for chunk in grounding_chunks:
                        web = chunk.get('web', {})
                        if web.get('uri'):
                            evidence.append({
                                'snippet': web.get('title', ''),
                                'url': web.get('uri', ''),
                                'title': web.get('title', 'Web Source'),
                            })

        except Exception as e:
            logger.warning(f"[FactCheck] Evidence search failed: {e}")

        # Fallback: try search_paper for additional evidence
        if not evidence:
            try:
                result = self.grounded_client.search_paper(claim)
                if result:
                    evidence.append({
                        'snippet': result.get('snippet', ''),
                        'url': result.get('url', ''),
                        'title': result.get('title', 'Source'),
                    })
            except Exception as e:
                logger.warning(f"[FactCheck] Fallback search failed: {e}")

        return evidence

    def _judge(self, claim_obj: Dict[str, str], evidence: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        LLM call: compare claim against evidence, return verdict.

        Uses Gemini 2.5 Flash via REST API to compare the claim text
        against the collected evidence and classify as SUPPORTED,
        CONTRADICTED, or INSUFFICIENT.

        Args:
            claim_obj: Dict with claim, section, line
            evidence: List of evidence dicts with snippet, url, title

        Returns:
            Verdict dict with claim, verdict, confidence, wrong_part,
            correct_value, source_url, evidence_snippet
        """
        claim_text = claim_obj.get("claim", "")
        section = claim_obj.get("section", "")
        line = claim_obj.get("line", "")

        # Format evidence for the judge prompt
        evidence_text = ""
        source_urls = []
        for i, ev in enumerate(evidence, 1):
            evidence_text += f"\n--- Evidence {i} ---\n"
            evidence_text += f"Source: {ev.get('title', 'Unknown')}\n"
            if ev.get('url'):
                evidence_text += f"URL: {ev['url']}\n"
                source_urls.append(ev['url'])
            evidence_text += f"Content: {ev.get('snippet', 'No content')}\n"

        if not evidence_text.strip():
            return {
                "claim": claim_text,
                "section": section,
                "line": line,
                "verdict": VERDICT_INSUFFICIENT,
                "confidence": 0.0,
                "wrong_part": None,
                "correct_value": None,
                "source_url": None,
                "evidence_snippet": "No evidence found",
            }

        judge_prompt = f"""You are a fact-checking judge. Compare this claim against the evidence and determine if the claim is accurate.

CLAIM: "{claim_text}"

EVIDENCE:
{evidence_text}

Respond with ONLY a valid JSON object (no markdown fences, no explanation):

{{
  "verdict": "SUPPORTED" or "CONTRADICTED" or "INSUFFICIENT",
  "confidence": 0.0 to 1.0,
  "wrong_part": "the specific substring in the claim that is wrong (or null if SUPPORTED/INSUFFICIENT)",
  "correct_value": "what the evidence says instead (or null if SUPPORTED/INSUFFICIENT)",
  "evidence_snippet": "brief quote from evidence supporting your verdict"
}}

Rules:
- SUPPORTED: Evidence confirms the claim is accurate (or very close, e.g. rounding)
- CONTRADICTED: Evidence clearly shows the claim is wrong — you MUST specify wrong_part and correct_value
- INSUFFICIENT: Not enough evidence to confirm or deny
- wrong_part MUST be an exact substring that appears in the CLAIM text above
- confidence should reflect how strong the evidence is (1.0 = certain, 0.5 = ambiguous)
- If the claim is approximately correct (within reasonable rounding), verdict is SUPPORTED"""

        try:
            result = self._call_judge_llm(judge_prompt)
            if result:
                # Validate verdict is one of the known values
                verdict = result.get("verdict", VERDICT_INSUFFICIENT)
                if verdict not in VALID_VERDICTS:
                    logger.warning(f"[FactCheck] Unknown verdict '{verdict}', defaulting to INSUFFICIENT")
                    verdict = VERDICT_INSUFFICIENT

                # Validate confidence is a float in [0.0, 1.0]
                try:
                    confidence = float(result.get("confidence", 0.0))
                    confidence = max(0.0, min(1.0, confidence))
                except (TypeError, ValueError):
                    confidence = 0.0

                # Validate wrong_part is actually in the claim text
                wrong_part = result.get("wrong_part")
                if wrong_part and wrong_part not in claim_text:
                    logger.warning(
                        f"[FactCheck] wrong_part '{wrong_part}' not found in claim, clearing"
                    )
                    wrong_part = None
                    result["correct_value"] = None
                    # Downgrade to INSUFFICIENT if we can't locate the error
                    if verdict == VERDICT_CONTRADICTED:
                        verdict = VERDICT_INSUFFICIENT

                return {
                    "claim": claim_text,
                    "section": section,
                    "line": line,
                    "verdict": verdict,
                    "confidence": confidence,
                    "wrong_part": wrong_part,
                    "correct_value": result.get("correct_value"),
                    "source_url": source_urls[0] if source_urls else None,
                    "evidence_snippet": result.get("evidence_snippet", ""),
                }
        except Exception as e:
            logger.warning(f"[FactCheck] Judge LLM failed: {e}")

        return {
            "claim": claim_text,
            "section": section,
            "line": line,
            "verdict": VERDICT_INSUFFICIENT,
            "confidence": 0.0,
            "wrong_part": None,
            "correct_value": None,
            "source_url": source_urls[0] if source_urls else None,
            "evidence_snippet": "Judge evaluation failed",
        }

    def _call_judge_llm(self, prompt: str) -> Optional[Dict[str, Any]]:
        """
        Call Gemini 2.5 Flash via REST API for the judge step.

        Args:
            prompt: Judge prompt with claim and evidence

        Returns:
            Parsed JSON dict from LLM response, or None
        """
        if not self._session:
            raise RuntimeError("requests library not available")

        body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1024,
            },
        }

        url = f"{self._base_url}/{self._judge_model}:generateContent?key={self.api_key}"

        response = self._session.post(
            url,
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=30,
        )

        if not response.ok:
            logger.warning(f"[FactCheck] Judge API error {response.status_code}: {response.text[:200]}")
            return None

        data = response.json()
        candidates = data.get('candidates', [])
        if not candidates:
            return None

        text = ''
        parts = candidates[0].get('content', {}).get('parts', [])
        if parts:
            text = parts[0].get('text', '')

        if not text:
            return None

        # Parse JSON from response (handle markdown fences)
        return json.loads(strip_json_fences(text))

    def format_report(self, results: List[Dict[str, Any]]) -> str:
        """
        Format verification results as a markdown report.

        Matches OpenDraft's existing QA report style with summary
        statistics and detailed issue descriptions including
        find/replace corrections.

        Args:
            results: List of verdict dicts from verify_claims()

        Returns:
            Formatted markdown report string
        """
        supported = [r for r in results if r["verdict"] == VERDICT_SUPPORTED]
        contradicted = [r for r in results if r["verdict"] == VERDICT_CONTRADICTED]
        insufficient = [r for r in results if r["verdict"] == VERDICT_INSUFFICIENT]

        lines = []
        lines.append("# Fact-Check Verification Report")
        lines.append("")
        lines.append(f"**Claims Checked:** {len(results)}")
        lines.append(f"**Verified:** {len(supported)} ✅")
        lines.append(f"**Issues Found:** {len(contradicted)} ⚠️")
        lines.append(f"**Unverifiable:** {len(insufficient)}")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Issues section
        if contradicted:
            lines.append("## ⚠️ ISSUES FOUND")
            lines.append("")

            for i, result in enumerate(contradicted, 1):
                lines.append(f"**Issue {i}: Incorrect Claim**")
                lines.append(f"- **Section:** {result.get('section', 'Unknown')}")
                lines.append(f"- **Claim:** \"{result['claim']}\"")
                lines.append(f"- **Evidence:** {result.get('evidence_snippet', 'N/A')}")

                if result.get("wrong_part") and result.get("correct_value"):
                    lines.append(f"- **Find:** \"{result['wrong_part']}\"")
                    lines.append(f"- **Replace with:** \"{result['correct_value']}\"")

                if result.get("source_url"):
                    lines.append(f"- **Source:** {result['source_url']}")

                lines.append(f"- **Confidence:** {result.get('confidence', 0):.0%}")
                lines.append("")

            lines.append("---")
            lines.append("")

        # Verified claims section
        if supported:
            lines.append("## ✅ VERIFIED CLAIMS")
            lines.append("")

            for result in supported:
                lines.append(f"- ✅ \"{result['claim']}\"")
                if result.get("evidence_snippet"):
                    lines.append(f"  - Evidence: {result['evidence_snippet'][:150]}")

            lines.append("")
            lines.append("---")
            lines.append("")

        # Unverifiable claims section
        if insufficient:
            lines.append("## ❓ UNVERIFIABLE CLAIMS")
            lines.append("")

            for result in insufficient:
                lines.append(f"- ❓ \"{result['claim']}\"")
                if result.get("evidence_snippet") and result["evidence_snippet"] != "No evidence found":
                    lines.append(f"  - Note: {result['evidence_snippet'][:150]}")

            lines.append("")
            lines.append("---")
            lines.append("")

        # Recommendations
        lines.append("## Recommendations")
        lines.append("")

        if contradicted:
            lines.append(f"1. **Fix {len(contradicted)} factual error(s)** using the Find/Replace corrections above")
            lines.append("2. **Verify corrections** against the provided source URLs")
            lines.append("3. **Re-run fact-check** after applying fixes to confirm accuracy")
        else:
            lines.append("All checked claims appear accurate based on available evidence.")

        if insufficient:
            lines.append(f"\n**Note:** {len(insufficient)} claim(s) could not be verified — consider adding citations or rephrasing as qualified statements.")

        lines.append("")

        return "\n".join(lines)
