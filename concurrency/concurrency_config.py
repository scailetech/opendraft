#!/usr/bin/env python3
"""
ABOUTME: Tier-adaptive concurrency configuration for academic thesis AI
ABOUTME: Auto-configures rate limits, parallel execution based on detected API tier
"""

import os
from dataclasses import dataclass
from typing import Literal, Optional

from utils.api_tier_detector import detect_api_tier, get_rate_limit


@dataclass
class ConcurrencyConfig:
    """
    Tier-adaptive concurrency configuration.

    Automatically adjusts parallelization and rate limiting based on
    detected Gemini API tier (free=10 RPM, paid=2,000 RPM).

    Attributes:
        tier: API tier ("free", "paid", "custom")
        rpm_limit: Requests per minute limit
        rate_limit_delay: Seconds to wait between API calls
        crafter_parallel: Whether to run 6 Crafter agents in parallel
        scout_batch_delay: Seconds between Scout citation research batches
        scout_batch_size: Citations per batch
        scout_parallel_workers: Number of parallel workers for citation research
        max_parallel_theses: Max thesis generations to run concurrently
    """

    tier: Literal["free", "paid", "custom"]
    rpm_limit: int
    rate_limit_delay: float
    crafter_parallel: bool
    scout_batch_delay: float
    scout_batch_size: int
    scout_parallel_workers: int
    max_parallel_theses: int

    @classmethod
    def from_tier(cls, tier: Literal["free", "paid", "custom"]) -> "ConcurrencyConfig":
        """
        Create configuration for specific tier.

        Args:
            tier: API tier

        Returns:
            ConcurrencyConfig optimized for tier
        """
        rpm = get_rate_limit(tier=tier)

        if tier == "free":
            return cls(
                tier="free",
                rpm_limit=rpm,
                rate_limit_delay=7.0,  # 1 request every 6s (10 RPM) + 1s margin
                crafter_parallel=False,  # Would consume 6 RPM instantly (60% of quota)
                scout_batch_delay=5.0,  # Conservative batch delay
                scout_batch_size=10,
                scout_parallel_workers=1,  # Sequential to avoid rate limits
                max_parallel_theses=1,  # Recommend 1 thesis per Google account
            )

        elif tier == "paid":
            return cls(
                tier="paid",
                rpm_limit=rpm,
                rate_limit_delay=0.3,  # 200 requests/minute (well under 2,000 RPM)
                crafter_parallel=True,  # 6 concurrent Crafters = ~50 RPM peak (2.5% of quota)
                scout_batch_delay=1.0,  # Aggressive batching (Crossref/Semantic Scholar APIs)
                scout_batch_size=15,  # Larger batches
                scout_parallel_workers=4,  # Parallel citation research (4x speedup)
                max_parallel_theses=10,  # Easily handle 10 concurrent theses
            )

        else:  # custom
            return cls(
                tier="custom",
                rpm_limit=rpm,
                rate_limit_delay=3.0,  # Conservative for unknown tier
                crafter_parallel=False,
                scout_batch_delay=3.0,
                scout_batch_size=10,
                scout_parallel_workers=2,  # Conservative parallelism
                max_parallel_theses=2,
            )

    @classmethod
    def auto_detect(cls, verbose: bool = False, force_detect: bool = False) -> "ConcurrencyConfig":
        """
        Auto-detect API tier and create optimal configuration.

        Args:
            verbose: Print detection progress
            force_detect: Force fresh detection (ignore cache)

        Returns:
            ConcurrencyConfig optimized for detected tier

        Examples:
            >>> config = ConcurrencyConfig.auto_detect()
            ℹ️  Using cached tier: PAID (2000 RPM)
            >>> config.rate_limit_delay
            0.3
            >>> config.crafter_parallel
            True
        """
        tier = detect_api_tier(verbose=verbose, force_detect=force_detect)
        return cls.from_tier(tier)

    @classmethod
    def from_env(cls, verbose: bool = False) -> "ConcurrencyConfig":
        """
        Create configuration from environment variables with auto-detect fallback.

        Supports manual override via:
        - GEMINI_API_TIER: "free", "paid", "custom"
        - RATE_LIMIT_DELAY: float (seconds)
        - CRAFTER_PARALLEL: "true" or "false"
        - SCOUT_BATCH_DELAY: float (seconds)

        Args:
            verbose: Print configuration source

        Returns:
            ConcurrencyConfig from env vars or auto-detection
        """
        # Check for manual tier override
        manual_tier = os.getenv("GEMINI_API_TIER")

        if manual_tier:
            if manual_tier.lower() in ["free", "paid", "custom"]:
                if verbose:
                    print(f"ℹ️  Using manual tier from GEMINI_API_TIER: {manual_tier.upper()}")
                config = cls.from_tier(manual_tier.lower())
            else:
                if verbose:
                    print(f"⚠️  Invalid GEMINI_API_TIER={manual_tier}, auto-detecting...")
                config = cls.auto_detect(verbose=verbose)
        else:
            # Auto-detect
            config = cls.auto_detect(verbose=verbose)

        # Apply env var overrides (if provided)
        if os.getenv("RATE_LIMIT_DELAY"):
            try:
                config.rate_limit_delay = float(os.getenv("RATE_LIMIT_DELAY"))
                if verbose:
                    print(f"  Override: rate_limit_delay = {config.rate_limit_delay}s")
            except ValueError:
                pass

        if os.getenv("CRAFTER_PARALLEL"):
            config.crafter_parallel = os.getenv("CRAFTER_PARALLEL").lower() == "true"
            if verbose:
                print(f"  Override: crafter_parallel = {config.crafter_parallel}")

        if os.getenv("SCOUT_BATCH_DELAY"):
            try:
                config.scout_batch_delay = float(os.getenv("SCOUT_BATCH_DELAY"))
                if verbose:
                    print(f"  Override: scout_batch_delay = {config.scout_batch_delay}s")
            except ValueError:
                pass

        return config

    def print_summary(self) -> None:
        """Print configuration summary."""
        print(f"\n{'='*70}")
        print(f"CONCURRENCY CONFIGURATION")
        print(f"{'='*70}")
        print(f"API Tier: {self.tier.upper()}")
        print(f"Rate Limit: {self.rpm_limit} RPM")
        print(f"\nSettings:")
        print(f"  • Rate limit delay: {self.rate_limit_delay}s between API calls")
        print(f"  • Crafter parallelization: {'✅ ENABLED' if self.crafter_parallel else '❌ DISABLED'} (6 sections)")
        print(f"  • Scout batch delay: {self.scout_batch_delay}s between batches")
        print(f"  • Scout batch size: {self.scout_batch_size} citations/batch")
        print(f"  • Scout parallel workers: {self.scout_parallel_workers}")
        print(f"  • Max parallel theses: {self.max_parallel_theses}")
        print(f"{'='*70}\n")


# Singleton instance for easy import
_global_config: Optional[ConcurrencyConfig] = None


def get_concurrency_config(verbose: bool = False, force_detect: bool = False) -> ConcurrencyConfig:
    """
    Get global concurrency configuration (singleton pattern).

    Args:
        verbose: Print detection/configuration info
        force_detect: Force fresh API tier detection

    Returns:
        ConcurrencyConfig singleton instance

    Examples:
        >>> config = get_concurrency_config()
        >>> config.rate_limit_delay
        0.3
    """
    global _global_config

    if _global_config is None or force_detect:
        _global_config = ConcurrencyConfig.from_env(verbose=verbose)

    return _global_config


def reset_concurrency_config() -> None:
    """Reset global configuration (forces re-detection on next access)."""
    global _global_config
    _global_config = None


if __name__ == "__main__":
    # CLI usage
    import argparse

    parser = argparse.ArgumentParser(description="Show concurrency configuration")
    parser.add_argument("--force", action="store_true", help="Force fresh tier detection")
    parser.add_argument("--quiet", action="store_true", help="Suppress detection output")

    args = parser.parse_args()

    config = get_concurrency_config(verbose=not args.quiet, force_detect=args.force)
    config.print_summary()

    print("\n💡 To override settings:")
    print("   export GEMINI_API_TIER=paid")
    print("   export RATE_LIMIT_DELAY=0.5")
    print("   export CRAFTER_PARALLEL=true")
    print("   export SCOUT_BATCH_DELAY=1.0\n")
