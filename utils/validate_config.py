#!/usr/bin/env python3
"""
ABOUTME: Configuration validation CLI tool for production readiness checks
ABOUTME: Wraps health_check system with user-friendly output and exit codes

Production-grade configuration validator that checks:
- API keys and credentials
- Python dependencies
- PDF export engines
- System resources (disk, memory)
- File permissions

Usage:
    python3 utils/validate_config.py [--verbose] [--json]

Exit codes:
    0: All checks passed (production ready)
    1: Some checks degraded (warnings)
    2: Critical failures (not production ready)
"""

import sys
import argparse
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.health_check import HealthChecker, HealthCheckResult
from utils.logging_config import get_logger

logger = get_logger(__name__)


def format_result_plain(result: HealthCheckResult) -> str:
    """
    Format health check result as plain text.

    Args:
        result: HealthCheckResult to format

    Returns:
        Formatted string with status indicator
    """
    status_icons = {
        "healthy": "✅",
        "degraded": "⚠️ ",
        "failed": "❌"
    }

    icon = status_icons.get(result.status, "❓")
    return f"{icon} {result.component}: {result.message}"


def format_details_plain(result: HealthCheckResult, indent: str = "  ") -> str:
    """
    Format result details as indented plain text.

    Args:
        result: HealthCheckResult with details
        indent: Indentation string

    Returns:
        Formatted details string
    """
    if not result.details:
        return ""

    lines = []
    for key, value in result.details.items():
        if isinstance(value, list):
            lines.append(f"{indent}{key}: {', '.join(str(v) for v in value)}")
        else:
            lines.append(f"{indent}{key}: {value}")

    return "\n".join(lines)


def print_summary(results: list, verbose: bool = False):
    """
    Print human-readable summary of health check results.

    Args:
        results: List of HealthCheckResult objects
        verbose: Whether to show detailed information
    """
    print("=" * 70)
    print("CONFIGURATION VALIDATION REPORT")
    print("=" * 70)
    print()

    # Group results by status
    healthy = [r for r in results if r.is_healthy()]
    degraded = [r for r in results if r.is_degraded()]
    failed = [r for r in results if r.is_failed()]

    # Print failed checks first (most important)
    if failed:
        print("CRITICAL FAILURES:")
        print("-" * 70)
        for result in failed:
            print(format_result_plain(result))
            if verbose and result.details:
                print(format_details_plain(result))
            if result.error:
                print(f"  Error: {result.error}")
        print()

    # Print degraded checks
    if degraded:
        print("WARNINGS:")
        print("-" * 70)
        for result in degraded:
            print(format_result_plain(result))
            if verbose and result.details:
                print(format_details_plain(result))
        print()

    # Print healthy checks
    if verbose or (not failed and not degraded):
        print("PASSED CHECKS:")
        print("-" * 70)
        for result in healthy:
            print(format_result_plain(result))
            if verbose and result.details:
                print(format_details_plain(result))
        print()

    # Print overall summary
    print("=" * 70)
    print("SUMMARY:")
    print(f"  ✅ Passed:   {len(healthy)}/{len(results)}")
    print(f"  ⚠️  Warnings: {len(degraded)}/{len(results)}")
    print(f"  ❌ Failed:   {len(failed)}/{len(results)}")
    print("=" * 70)
    print()

    # Production readiness verdict
    if failed:
        print("❌ VERDICT: NOT PRODUCTION READY")
        print("   Critical issues must be resolved before deployment.")
    elif degraded:
        print("⚠️  VERDICT: PRODUCTION READY WITH WARNINGS")
        print("   System is functional but may have reduced capabilities.")
    else:
        print("✅ VERDICT: PRODUCTION READY")
        print("   All systems operational. Safe to deploy.")
    print()


def print_json(results: list):
    """
    Print results as JSON for programmatic consumption.

    Args:
        results: List of HealthCheckResult objects
    """
    output = {
        "results": [],
        "summary": {
            "total": len(results),
            "healthy": sum(1 for r in results if r.is_healthy()),
            "degraded": sum(1 for r in results if r.is_degraded()),
            "failed": sum(1 for r in results if r.is_failed())
        }
    }

    for result in results:
        output["results"].append({
            "component": result.component,
            "status": result.status,
            "message": result.message,
            "details": result.details,
            "error": str(result.error) if result.error else None
        })

    # Determine production readiness
    output["production_ready"] = (
        output["summary"]["failed"] == 0 and
        output["summary"]["degraded"] == 0
    )
    output["has_warnings"] = output["summary"]["degraded"] > 0

    print(json.dumps(output, indent=2))


def main():
    """
    Main entry point for configuration validator.

    Returns:
        Exit code (0=success, 1=warnings, 2=failures)
    """
    parser = argparse.ArgumentParser(
        description="Validate system configuration for production readiness",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 utils/validate_config.py
  python3 utils/validate_config.py --verbose
  python3 utils/validate_config.py --json > config_report.json

Exit Codes:
  0 = All checks passed (production ready)
  1 = Some checks degraded (warnings)
  2 = Critical failures (not production ready)
        """
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed diagnostic information"
    )

    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON (for automation)"
    )

    args = parser.parse_args()

    try:
        # Run health checks
        checker = HealthChecker(verbose=args.verbose)
        results = checker.check_all()

        # Output results
        if args.json:
            print_json(results)
        else:
            print_summary(results, verbose=args.verbose)

        # Determine exit code
        failed_count = sum(1 for r in results if r.is_failed())
        degraded_count = sum(1 for r in results if r.is_degraded())

        if failed_count > 0:
            return 2  # Critical failures
        elif degraded_count > 0:
            return 1  # Warnings
        else:
            return 0  # All good

    except KeyboardInterrupt:
        print("\n\nValidation interrupted by user.", file=sys.stderr)
        return 130
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}", file=sys.stderr)
        logger.exception("Unhandled exception in config validator")
        return 3


if __name__ == "__main__":
    sys.exit(main())
