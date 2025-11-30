#!/usr/bin/env python3
"""
ABOUTME: System health check utility for production readiness monitoring
ABOUTME: Validates API keys, dependencies, disk space, and system resources
"""

import os
import sys
import shutil
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional
from dataclasses import dataclass, field

from utils.logging_config import get_logger
from utils.exceptions import ConfigurationError

logger = get_logger(__name__)


@dataclass
class HealthCheckResult:
    """
    Result of a health check operation.

    Attributes:
        component: Name of component checked
        status: Health status ("healthy", "degraded", "failed")
        message: Human-readable status message
        details: Additional diagnostic details
        error: Exception if check failed
    """
    component: str
    status: str  # "healthy", "degraded", "failed"
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[Exception] = None

    def is_healthy(self) -> bool:
        """Check if component is healthy."""
        return self.status == "healthy"

    def is_degraded(self) -> bool:
        """Check if component is degraded."""
        return self.status == "degraded"

    def is_failed(self) -> bool:
        """Check if component is failed."""
        return self.status == "failed"


class HealthChecker:
    """
    System health monitoring for thesis generation system.

    Checks:
    - API keys (Gemini)
    - PDF engines (LibreOffice, Pandoc, WeasyPrint)
    - Python dependencies
    - Disk space
    - Memory availability
    - File permissions

    Usage:
        >>> checker = HealthChecker()
        >>> results = checker.check_all()
        >>> if all(r.is_healthy() for r in results):
        ...     print("System healthy")
    """

    def __init__(self, verbose: bool = True):
        """
        Initialize health checker.

        Args:
            verbose: Print detailed health check output
        """
        self.verbose = verbose

    def check_all(self) -> List[HealthCheckResult]:
        """
        Run all health checks.

        Returns:
            List of HealthCheckResult objects
        """
        results = []

        # API Keys
        results.append(self.check_gemini_api_key())

        # Dependencies
        results.append(self.check_python_dependencies())

        # PDF Engines
        results.extend(self.check_pdf_engines())

        # System Resources
        results.append(self.check_disk_space())
        results.append(self.check_memory())

        # File Permissions
        results.append(self.check_file_permissions())

        # Print summary
        if self.verbose:
            self._print_summary(results)

        return results

    def check_gemini_api_key(self) -> HealthCheckResult:
        """
        Check if Gemini API key is configured.

        Returns:
            HealthCheckResult for API key
        """
        try:
            # Import config to check GOOGLE_API_KEY (used for Gemini)
            from config import get_config

            config = get_config()
            api_key = config.google_api_key

            if not api_key:
                return HealthCheckResult(
                    component="Gemini API Key",
                    status="failed",
                    message="GOOGLE_API_KEY not configured",
                    details={"env_var": "GOOGLE_API_KEY", "configured": False},
                    error=ConfigurationError(
                        config_key="GOOGLE_API_KEY",
                        issue="Environment variable not set"
                    )
                )

            # Check if key looks valid (starts with expected prefix)
            if not api_key.startswith(("AIza", "Gemini")):  # Gemini keys typically start with AIza
                return HealthCheckResult(
                    component="Gemini API Key",
                    status="degraded",
                    message="API key format looks unusual (may be invalid)",
                    details={"configured": True, "format_check": "suspicious"}
                )

            return HealthCheckResult(
                component="Gemini API Key",
                status="healthy",
                message="API key configured",
                details={"configured": True, "length": len(api_key)}
            )

        except Exception as e:
            return HealthCheckResult(
                component="Gemini API Key",
                status="failed",
                message=f"Failed to check API key: {str(e)}",
                error=e
            )

    def check_python_dependencies(self) -> HealthCheckResult:
        """
        Check if required Python dependencies are installed.

        Returns:
            HealthCheckResult for Python dependencies
        """
        required_packages = [
            "google.generativeai",
            "markdown",
            "yaml",
            "requests",
            "pybtex",
        ]

        missing = []
        installed = []

        for package in required_packages:
            try:
                __import__(package)
                installed.append(package)
            except ImportError:
                missing.append(package)

        if missing:
            return HealthCheckResult(
                component="Python Dependencies",
                status="failed",
                message=f"Missing {len(missing)} required packages",
                details={"missing": missing, "installed": installed}
            )

        return HealthCheckResult(
            component="Python Dependencies",
            status="healthy",
            message=f"All {len(installed)} core packages installed",
            details={"installed": installed}
        )

    def check_pdf_engines(self) -> List[HealthCheckResult]:
        """
        Check availability of PDF generation engines.

        Returns:
            List of HealthCheckResult for each PDF engine
        """
        results = []

        # LibreOffice
        libreoffice_available = shutil.which("soffice") or shutil.which("libreoffice")
        results.append(HealthCheckResult(
            component="PDF Engine: LibreOffice",
            status="healthy" if libreoffice_available else "degraded",
            message="Available" if libreoffice_available else "Not installed (optional)",
            details={"available": bool(libreoffice_available)}
        ))

        # Pandoc
        pandoc_available = shutil.which("pandoc")
        results.append(HealthCheckResult(
            component="PDF Engine: Pandoc",
            status="healthy" if pandoc_available else "degraded",
            message="Available" if pandoc_available else "Not installed (optional)",
            details={"available": bool(pandoc_available)}
        ))

        # WeasyPrint (Python package)
        try:
            import weasyprint
            weasyprint_available = True
        except ImportError:
            weasyprint_available = False

        results.append(HealthCheckResult(
            component="PDF Engine: WeasyPrint",
            status="healthy" if weasyprint_available else "degraded",
            message="Available" if weasyprint_available else "Not installed (optional)",
            details={"available": weasyprint_available}
        ))

        # Overall PDF engine availability
        any_available = any(r.is_healthy() for r in results)
        if not any_available:
            results.append(HealthCheckResult(
                component="PDF Engines (Overall)",
                status="failed",
                message="No PDF engines available - cannot export PDFs",
                details={"engines_checked": ["libreoffice", "pandoc", "weasyprint"]}
            ))
        else:
            available_engines = [r.component.split(": ")[1] for r in results if r.is_healthy()]
            results.append(HealthCheckResult(
                component="PDF Engines (Overall)",
                status="healthy",
                message=f"{len(available_engines)} engine(s) available",
                details={"available_engines": available_engines}
            ))

        return results

    def check_disk_space(self, min_gb: float = 1.0) -> HealthCheckResult:
        """
        Check available disk space.

        Args:
            min_gb: Minimum required GB of free space

        Returns:
            HealthCheckResult for disk space
        """
        try:
            # Check disk space in current directory
            stat = shutil.disk_usage(Path.cwd())
            free_gb = stat.free / (1024 ** 3)  # Convert to GB
            total_gb = stat.total / (1024 ** 3)
            used_percent = (stat.used / stat.total) * 100

            if free_gb < min_gb:
                return HealthCheckResult(
                    component="Disk Space",
                    status="failed",
                    message=f"Low disk space: {free_gb:.1f} GB free (< {min_gb} GB required)",
                    details={
                        "free_gb": free_gb,
                        "total_gb": total_gb,
                        "used_percent": used_percent
                    }
                )

            if free_gb < min_gb * 2:
                return HealthCheckResult(
                    component="Disk Space",
                    status="degraded",
                    message=f"Disk space running low: {free_gb:.1f} GB free",
                    details={
                        "free_gb": free_gb,
                        "total_gb": total_gb,
                        "used_percent": used_percent
                    }
                )

            return HealthCheckResult(
                component="Disk Space",
                status="healthy",
                message=f"{free_gb:.1f} GB free ({used_percent:.1f}% used)",
                details={
                    "free_gb": free_gb,
                    "total_gb": total_gb,
                    "used_percent": used_percent
                }
            )

        except Exception as e:
            return HealthCheckResult(
                component="Disk Space",
                status="failed",
                message=f"Failed to check disk space: {str(e)}",
                error=e
            )

    def check_memory(self, min_mb: float = 512.0) -> HealthCheckResult:
        """
        Check available system memory.

        Args:
            min_mb: Minimum required MB of free memory

        Returns:
            HealthCheckResult for memory
        """
        try:
            import psutil

            mem = psutil.virtual_memory()
            free_mb = mem.available / (1024 ** 2)  # Convert to MB
            total_gb = mem.total / (1024 ** 3)
            used_percent = mem.percent

            if free_mb < min_mb:
                return HealthCheckResult(
                    component="System Memory",
                    status="failed",
                    message=f"Low memory: {free_mb:.0f} MB free (< {min_mb:.0f} MB required)",
                    details={
                        "free_mb": free_mb,
                        "total_gb": total_gb,
                        "used_percent": used_percent
                    }
                )

            if free_mb < min_mb * 2:
                return HealthCheckResult(
                    component="System Memory",
                    status="degraded",
                    message=f"Memory running low: {free_mb:.0f} MB free",
                    details={
                        "free_mb": free_mb,
                        "total_gb": total_gb,
                        "used_percent": used_percent
                    }
                )

            return HealthCheckResult(
                component="System Memory",
                status="healthy",
                message=f"{free_mb:.0f} MB free ({used_percent:.1f}% used)",
                details={
                    "free_mb": free_mb,
                    "total_gb": total_gb,
                    "used_percent": used_percent
                }
            )

        except ImportError:
            return HealthCheckResult(
                component="System Memory",
                status="degraded",
                message="psutil not installed - cannot check memory",
                details={"psutil_available": False}
            )
        except Exception as e:
            return HealthCheckResult(
                component="System Memory",
                status="failed",
                message=f"Failed to check memory: {str(e)}",
                error=e
            )

    def check_file_permissions(self) -> HealthCheckResult:
        """
        Check file system permissions for required directories.

        Returns:
            HealthCheckResult for file permissions
        """
        try:
            required_dirs = [
                Path("logs"),
                Path("output"),
                Path("examples/output"),
            ]

            issues = []
            for dir_path in required_dirs:
                # Create directory if it doesn't exist
                try:
                    dir_path.mkdir(parents=True, exist_ok=True)
                except PermissionError:
                    issues.append(f"Cannot create {dir_path}: Permission denied")
                    continue

                # Check write permission
                if not os.access(dir_path, os.W_OK):
                    issues.append(f"{dir_path}: No write permission")

            if issues:
                return HealthCheckResult(
                    component="File Permissions",
                    status="failed",
                    message=f"{len(issues)} permission issue(s) found",
                    details={"issues": issues}
                )

            return HealthCheckResult(
                component="File Permissions",
                status="healthy",
                message=f"All {len(required_dirs)} directories writable",
                details={"directories_checked": [str(d) for d in required_dirs]}
            )

        except Exception as e:
            return HealthCheckResult(
                component="File Permissions",
                status="failed",
                message=f"Failed to check permissions: {str(e)}",
                error=e
            )

    def _print_summary(self, results: List[HealthCheckResult]) -> None:
        """
        Print health check summary to console.

        Args:
            results: List of health check results
        """
        logger.info("=" * 70)
        logger.info("SYSTEM HEALTH CHECK")
        logger.info("=" * 70)

        healthy = sum(1 for r in results if r.is_healthy())
        degraded = sum(1 for r in results if r.is_degraded())
        failed = sum(1 for r in results if r.is_failed())

        for result in results:
            status_icon = {
                "healthy": "✅",
                "degraded": "⚠️",
                "failed": "❌"
            }.get(result.status, "❓")

            logger.info(f"{status_icon} {result.component}: {result.message}")

        logger.info("=" * 70)
        logger.info(f"Summary: {healthy} healthy, {degraded} degraded, {failed} failed")
        logger.info("=" * 70)

        if failed > 0:
            logger.error(f"HEALTH CHECK FAILED: {failed} critical issue(s) detected")
            logger.error("Fix critical issues before running thesis generation")
        elif degraded > 0:
            logger.warning(f"HEALTH CHECK DEGRADED: {degraded} issue(s) detected")
            logger.warning("System will work but may have reduced functionality")
        else:
            logger.info("HEALTH CHECK PASSED: All systems operational")


def main():
    """CLI entry point for health check."""
    import argparse

    parser = argparse.ArgumentParser(
        description="System health check for thesis generation",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress detailed output (only show critical issues)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )

    args = parser.parse_args()

    checker = HealthChecker(verbose=not args.quiet)
    results = checker.check_all()

    if args.json:
        import json
        output = {
            "healthy": sum(1 for r in results if r.is_healthy()),
            "degraded": sum(1 for r in results if r.is_degraded()),
            "failed": sum(1 for r in results if r.is_failed()),
            "results": [
                {
                    "component": r.component,
                    "status": r.status,
                    "message": r.message,
                    "details": r.details
                }
                for r in results
            ]
        }
        print(json.dumps(output, indent=2))

    # Exit with error code if any critical failures
    failed_count = sum(1 for r in results if r.is_failed())
    sys.exit(1 if failed_count > 0 else 0)


if __name__ == "__main__":
    main()
