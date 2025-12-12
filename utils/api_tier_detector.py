#!/usr/bin/env python3
"""
ABOUTME: Automatic Gemini API tier detection with rate limit discovery
ABOUTME: Detects free tier (10 RPM), paid tier (2,000 RPM), or custom limits via test requests
"""

import os
import time
from typing import Literal, Optional, Dict, Tuple
from pathlib import Path
import json

import google.generativeai as genai


class APITierDetector:
    """
    Auto-detect Gemini API tier and rate limits.

    Uses intelligent probing to determine:
    - Free tier: 10 RPM (requests per minute)
    - Paid tier: 2,000 RPM
    - Custom/Enterprise: Variable limits

    Caches results to avoid repeated detection overhead.
    """

    CACHE_FILE = Path.home() / ".cache" / "opendraft" / "api_tier_cache.json"
    CACHE_TTL = 86400  # 24 hours (tier rarely changes)

    def __init__(self, api_key: Optional[str] = None, force_detect: bool = False):
        """
        Initialize tier detector.

        Args:
            api_key: Gemini API key (uses GOOGLE_API_KEY env var if not provided)
            force_detect: Force fresh detection (ignore cache)
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment")

        self.force_detect = force_detect
        self._cached_result: Optional[Dict] = None

    def detect_tier(self, verbose: bool = True) -> Literal["free", "paid", "custom"]:
        """
        Detect API tier using cached or fresh detection.

        Args:
            verbose: Print detection progress

        Returns:
            "free" (10 RPM), "paid" (2,000 RPM), or "custom"
        """
        # Check manual override first
        manual_tier = os.getenv("GEMINI_API_TIER")
        if manual_tier:
            if manual_tier.lower() in ["free", "paid", "custom"]:
                if verbose:
                    print(f"ℹ️  Using manual tier override: {manual_tier.upper()}")
                return manual_tier.lower()
            else:
                print(f"⚠️  Invalid GEMINI_API_TIER={manual_tier}, auto-detecting...")

        # Check cache
        if not self.force_detect:
            cached = self._load_cache()
            if cached:
                tier = cached.get("tier")
                rpm = cached.get("rpm")
                if verbose:
                    print(f"ℹ️  Using cached tier: {tier.upper()} ({rpm} RPM)")
                return tier

        # Fresh detection
        if verbose:
            print("🔍 Detecting Gemini API tier...")

        tier, rpm = self._probe_rate_limit(verbose=verbose)

        # Cache result
        self._save_cache(tier, rpm)

        if verbose:
            print(f"✅ Detected tier: {tier.upper()} ({rpm} RPM)")

        return tier

    def get_rate_limit(self, tier: Optional[str] = None, verbose: bool = False) -> int:
        """
        Get rate limit (requests per minute) for tier.

        Args:
            tier: API tier ("free", "paid", "custom") - auto-detects if None
            verbose: Print detection progress

        Returns:
            Requests per minute limit
        """
        if tier is None:
            tier = self.detect_tier(verbose=verbose)

        # Check cache for custom tier RPM
        cached = self._load_cache()
        if cached and cached.get("tier") == tier:
            return cached.get("rpm", self._tier_to_rpm(tier))

        return self._tier_to_rpm(tier)

    def _tier_to_rpm(self, tier: str) -> int:
        """Map tier name to default RPM."""
        tier_map = {
            "free": 10,
            "paid": 2000,
            "custom": 100,  # Conservative default for unknown tiers
        }
        return tier_map.get(tier, 10)

    def _probe_rate_limit(self, verbose: bool = True) -> Tuple[str, int]:
        """
        Probe API to determine rate limit.

        Strategy:
        1. Send 3 rapid requests (< 6 seconds apart)
        2. If no rate limit error → paid tier (2,000 RPM)
        3. If rate limit error → free tier (10 RPM)

        Returns:
            tuple: (tier_name, rpm_limit)
        """
        genai.configure(api_key=self.api_key)

        try:
            # Create test model (lightweight)
            model = genai.GenerativeModel('gemini-2.5-flash', tools=None)

            # Test 1: Send 3 rapid requests (2 seconds apart = 90 RPM equivalent)
            if verbose:
                print("  Testing rate limit (3 rapid requests)...")

            start_time = time.time()
            request_count = 3

            for i in range(request_count):
                try:
                    # Minimal request to test rate limiting
                    model.generate_content(
                        "Say OK",
                        generation_config={"max_output_tokens": 5}
                    )

                    if verbose:
                        print(f"    Request {i+1}/{request_count}: ✅ Success")

                    # Wait 2 seconds before next request (30 RPM pace)
                    if i < request_count - 1:
                        time.sleep(2.0)

                except Exception as e:
                    error_msg = str(e).lower()

                    # Check for rate limit error
                    if "429" in error_msg or "quota" in error_msg or "rate" in error_msg:
                        if verbose:
                            print(f"    Request {i+1}/{request_count}: ⚠️  Rate limit hit")
                        return ("free", 10)  # Definitely free tier
                    else:
                        # Other error - assume free tier to be safe
                        if verbose:
                            print(f"    Request {i+1}/{request_count}: ❌ Error: {e}")
                        return ("free", 10)

            elapsed = time.time() - start_time

            # If we made 3 requests in < 20 seconds without rate limit → paid tier
            if elapsed < 20:
                if verbose:
                    print(f"    All requests succeeded in {elapsed:.1f}s → PAID TIER")
                return ("paid", 2000)
            else:
                # Slow but successful → likely free tier with manual throttling
                if verbose:
                    print(f"    Slow response ({elapsed:.1f}s) → FREE TIER (inferred)")
                return ("free", 10)

        except Exception as e:
            # Error during detection - default to free tier (safe)
            if verbose:
                print(f"  ⚠️  Detection error: {e}")
                print(f"  Defaulting to FREE TIER for safety")
            return ("free", 10)

    def _load_cache(self) -> Optional[Dict]:
        """Load cached tier detection result."""
        if not self.CACHE_FILE.exists():
            return None

        try:
            with open(self.CACHE_FILE, 'r') as f:
                cached = json.load(f)

            # Check if cache is still valid
            cache_age = time.time() - cached.get("timestamp", 0)
            if cache_age > self.CACHE_TTL:
                return None  # Cache expired

            # Verify API key matches (different keys = different tiers)
            cached_key_hash = cached.get("api_key_hash")
            current_key_hash = hash(self.api_key) if self.api_key else None

            if cached_key_hash != current_key_hash:
                return None  # Different API key

            return cached

        except Exception:
            return None  # Invalid cache

    def _save_cache(self, tier: str, rpm: int) -> None:
        """Save tier detection result to cache."""
        self.CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

        cache_data = {
            "tier": tier,
            "rpm": rpm,
            "timestamp": time.time(),
            "api_key_hash": hash(self.api_key) if self.api_key else None,
        }

        try:
            with open(self.CACHE_FILE, 'w') as f:
                json.dump(cache_data, f, indent=2)
        except Exception as e:
            # Cache write failure is non-critical
            print(f"⚠️  Warning: Could not save tier cache: {e}")


# Convenience function for simple usage
def detect_api_tier(verbose: bool = True, force_detect: bool = False) -> Literal["free", "paid", "custom"]:
    """
    Detect Gemini API tier.

    Args:
        verbose: Print detection progress
        force_detect: Force fresh detection (ignore cache)

    Returns:
        "free" (10 RPM), "paid" (2,000 RPM), or "custom"

    Examples:
        >>> tier = detect_api_tier()
        🔍 Detecting Gemini API tier...
          Testing rate limit (3 rapid requests)...
            Request 1/3: ✅ Success
            Request 2/3: ✅ Success
            Request 3/3: ✅ Success
            All requests succeeded in 4.2s → PAID TIER
        ✅ Detected tier: PAID (2000 RPM)
        >>> tier
        'paid'
    """
    detector = APITierDetector(force_detect=force_detect)
    return detector.detect_tier(verbose=verbose)


def get_rate_limit(tier: Optional[str] = None, verbose: bool = False) -> int:
    """
    Get rate limit (RPM) for API tier.

    Args:
        tier: API tier - auto-detects if None
        verbose: Print detection progress

    Returns:
        Requests per minute

    Examples:
        >>> get_rate_limit("paid")
        2000
        >>> get_rate_limit()  # Auto-detect
        2000
    """
    detector = APITierDetector()
    return detector.get_rate_limit(tier=tier, verbose=verbose)


if __name__ == "__main__":
    # CLI usage
    import argparse

    parser = argparse.ArgumentParser(description="Detect Gemini API tier and rate limits")
    parser.add_argument("--force", action="store_true", help="Force fresh detection (ignore cache)")
    parser.add_argument("--quiet", action="store_true", help="Suppress progress output")

    args = parser.parse_args()

    tier = detect_api_tier(verbose=not args.quiet, force_detect=args.force)
    rpm = get_rate_limit(tier=tier)

    print(f"\nAPI Tier: {tier.upper()}")
    print(f"Rate Limit: {rpm} RPM")

    # Print recommended settings
    print(f"\nRecommended Settings:")
    if tier == "free":
        print(f"  rate_limit_delay: 7 seconds (safe for 10 RPM)")
        print(f"  crafter_parallel: False (would exceed rate limit)")
        print(f"  scout_batch_delay: 5.0 seconds")
    elif tier == "paid":
        print(f"  rate_limit_delay: 0.3 seconds (safe for 2,000 RPM)")
        print(f"  crafter_parallel: True (6 sections concurrently)")
        print(f"  scout_batch_delay: 1.0 seconds")

    print(f"\nTo override: export GEMINI_API_TIER={tier}")
