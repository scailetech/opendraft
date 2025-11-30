#!/usr/bin/env python3
"""
ABOUTME: Unit tests for config validation CLI in utils/validate_config.py
ABOUTME: Tests all exit codes, output formats, and edge cases for production readiness validation
"""

import pytest
import sys
import json
from io import StringIO
from unittest.mock import patch, MagicMock
from utils.health_check import HealthCheckResult
from utils.validate_config import (
    format_result_plain,
    format_details_plain,
    print_summary,
    print_json,
    main
)


class TestFormatResultPlain:
    """Test plain text formatting of health check results."""

    def test_healthy_status_icon(self):
        """Test healthy result shows checkmark."""
        result = HealthCheckResult(
            component="Test Component",
            status="healthy",
            message="All good"
        )
        formatted = format_result_plain(result)
        assert "✅" in formatted
        assert "Test Component" in formatted
        assert "All good" in formatted

    def test_degraded_status_icon(self):
        """Test degraded result shows warning icon."""
        result = HealthCheckResult(
            component="Test Component",
            status="degraded",
            message="Warning"
        )
        formatted = format_result_plain(result)
        assert "⚠️" in formatted
        assert "Warning" in formatted

    def test_failed_status_icon(self):
        """Test failed result shows X icon."""
        result = HealthCheckResult(
            component="Test Component",
            status="failed",
            message="Error"
        )
        formatted = format_result_plain(result)
        assert "❌" in formatted
        assert "Error" in formatted

    def test_unknown_status_icon(self):
        """Test unknown status shows question mark."""
        result = HealthCheckResult(
            component="Test",
            status="unknown",
            message="Strange"
        )
        formatted = format_result_plain(result)
        assert "❓" in formatted


class TestFormatDetailsPlain:
    """Test plain text formatting of result details."""

    def test_format_simple_details(self):
        """Test formatting simple key-value details."""
        result = HealthCheckResult(
            component="Test",
            status="healthy",
            message="OK",
            details={"key1": "value1", "key2": "value2"}
        )
        formatted = format_details_plain(result)
        assert "key1: value1" in formatted
        assert "key2: value2" in formatted

    def test_format_list_details(self):
        """Test formatting details with list values."""
        result = HealthCheckResult(
            component="Test",
            status="healthy",
            message="OK",
            details={"items": ["item1", "item2", "item3"]}
        )
        formatted = format_details_plain(result)
        assert "items: item1, item2, item3" in formatted

    def test_format_empty_details(self):
        """Test formatting when no details present."""
        result = HealthCheckResult(
            component="Test",
            status="healthy",
            message="OK"
        )
        formatted = format_details_plain(result)
        assert formatted == ""

    def test_format_uses_indentation(self):
        """Test formatting respects custom indentation."""
        result = HealthCheckResult(
            component="Test",
            status="healthy",
            message="OK",
            details={"key": "value"}
        )
        formatted = format_details_plain(result, indent="    ")
        assert formatted.startswith("    ")


class TestPrintSummary:
    """Test human-readable summary output."""

    @patch('sys.stdout', new_callable=StringIO)
    def test_summary_all_healthy(self, mock_stdout):
        """Test summary with all checks passing."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "healthy", "OK"),
            HealthCheckResult("Check3", "healthy", "OK")
        ]

        print_summary(results, verbose=False)
        output = mock_stdout.getvalue()

        assert "CONFIGURATION VALIDATION REPORT" in output
        assert "PASSED CHECKS:" in output
        assert "SUMMARY:" in output
        assert "Passed:   3/3" in output
        assert "PRODUCTION READY" in output
        assert "All systems operational" in output

    @patch('sys.stdout', new_callable=StringIO)
    def test_summary_with_failures(self, mock_stdout):
        """Test summary with critical failures."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "failed", "Error"),
            HealthCheckResult("Check3", "healthy", "OK")
        ]

        print_summary(results, verbose=False)
        output = mock_stdout.getvalue()

        assert "CRITICAL FAILURES:" in output
        assert "Failed:   1/3" in output
        assert "NOT PRODUCTION READY" in output
        assert "Critical issues must be resolved" in output

    @patch('sys.stdout', new_callable=StringIO)
    def test_summary_with_warnings(self, mock_stdout):
        """Test summary with warnings but no failures."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "degraded", "Warning"),
            HealthCheckResult("Check3", "healthy", "OK")
        ]

        print_summary(results, verbose=False)
        output = mock_stdout.getvalue()

        assert "WARNINGS:" in output
        assert "Warnings: 1/3" in output
        assert "PRODUCTION READY WITH WARNINGS" in output
        assert "functional but may have reduced capabilities" in output

    @patch('sys.stdout', new_callable=StringIO)
    def test_summary_verbose_mode(self, mock_stdout):
        """Test verbose mode shows all details."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK", details={"detail": "info"})
        ]

        print_summary(results, verbose=True)
        output = mock_stdout.getvalue()

        # Verbose mode should show details
        assert "detail: info" in output

    @patch('sys.stdout', new_callable=StringIO)
    def test_summary_quiet_mode_hides_passed(self, mock_stdout):
        """Test quiet mode only shows failures/warnings."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "healthy", "OK")
        ]

        print_summary(results, verbose=False)
        output = mock_stdout.getvalue()

        # Should still show passed checks when all healthy
        assert "PASSED CHECKS:" in output

    @patch('sys.stdout', new_callable=StringIO)
    def test_summary_shows_errors(self, mock_stdout):
        """Test summary displays error details."""
        results = [
            HealthCheckResult("Check1", "failed", "Error", error=Exception("Test error"))
        ]

        print_summary(results, verbose=False)
        output = mock_stdout.getvalue()

        assert "Error: Test error" in output


class TestPrintJSON:
    """Test JSON output format."""

    @patch('sys.stdout', new_callable=StringIO)
    def test_json_structure(self, mock_stdout):
        """Test JSON output has correct structure."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "degraded", "Warning")
        ]

        print_json(results)
        output = mock_stdout.getvalue()

        data = json.loads(output)
        assert "results" in data
        assert "summary" in data
        assert "production_ready" in data
        assert "has_warnings" in data

    @patch('sys.stdout', new_callable=StringIO)
    def test_json_summary_counts(self, mock_stdout):
        """Test JSON summary has correct counts."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "degraded", "Warning"),
            HealthCheckResult("Check3", "failed", "Error")
        ]

        print_json(results)
        output = mock_stdout.getvalue()

        data = json.loads(output)
        assert data["summary"]["total"] == 3
        assert data["summary"]["healthy"] == 1
        assert data["summary"]["degraded"] == 1
        assert data["summary"]["failed"] == 1

    @patch('sys.stdout', new_callable=StringIO)
    def test_json_production_ready_true(self, mock_stdout):
        """Test JSON production_ready flag for healthy system."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "healthy", "OK")
        ]

        print_json(results)
        output = mock_stdout.getvalue()

        data = json.loads(output)
        assert data["production_ready"] is True
        assert data["has_warnings"] is False

    @patch('sys.stdout', new_callable=StringIO)
    def test_json_production_ready_false_with_failures(self, mock_stdout):
        """Test JSON production_ready flag with failures."""
        results = [
            HealthCheckResult("Check1", "failed", "Error")
        ]

        print_json(results)
        output = mock_stdout.getvalue()

        data = json.loads(output)
        assert data["production_ready"] is False

    @patch('sys.stdout', new_callable=StringIO)
    def test_json_has_warnings_true(self, mock_stdout):
        """Test JSON has_warnings flag."""
        results = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "degraded", "Warning")
        ]

        print_json(results)
        output = mock_stdout.getvalue()

        data = json.loads(output)
        assert data["production_ready"] is False  # Warnings count as not ready
        assert data["has_warnings"] is True

    @patch('sys.stdout', new_callable=StringIO)
    def test_json_includes_error_messages(self, mock_stdout):
        """Test JSON includes error details."""
        results = [
            HealthCheckResult("Check1", "failed", "Error", error=ValueError("Test"))
        ]

        print_json(results)
        output = mock_stdout.getvalue()

        data = json.loads(output)
        assert data["results"][0]["error"] is not None
        assert "Test" in data["results"][0]["error"]


class TestMainFunction:
    """Test main() entry point and exit codes."""

    @patch('utils.validate_config.HealthChecker')
    @patch('sys.argv', ['validate_config.py'])
    def test_main_exit_code_0_all_healthy(self, mock_health_checker):
        """Test exit code 0 when all checks pass."""
        mock_checker = MagicMock()
        mock_checker.check_all.return_value = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "healthy", "OK")
        ]
        mock_health_checker.return_value = mock_checker

        exit_code = main()
        assert exit_code == 0

    @patch('utils.validate_config.HealthChecker')
    @patch('sys.argv', ['validate_config.py'])
    def test_main_exit_code_1_with_warnings(self, mock_health_checker):
        """Test exit code 1 when degraded checks present."""
        mock_checker = MagicMock()
        mock_checker.check_all.return_value = [
            HealthCheckResult("Check1", "healthy", "OK"),
            HealthCheckResult("Check2", "degraded", "Warning")
        ]
        mock_health_checker.return_value = mock_checker

        exit_code = main()
        assert exit_code == 1

    @patch('utils.validate_config.HealthChecker')
    @patch('sys.argv', ['validate_config.py'])
    def test_main_exit_code_2_with_failures(self, mock_health_checker):
        """Test exit code 2 when critical failures present."""
        mock_checker = MagicMock()
        mock_checker.check_all.return_value = [
            HealthCheckResult("Check1", "failed", "Error"),
            HealthCheckResult("Check2", "healthy", "OK")
        ]
        mock_health_checker.return_value = mock_checker

        exit_code = main()
        assert exit_code == 2

    @patch('utils.validate_config.HealthChecker')
    @patch('sys.argv', ['validate_config.py', '--verbose'])
    def test_main_verbose_flag(self, mock_health_checker):
        """Test --verbose flag is passed to HealthChecker."""
        mock_checker = MagicMock()
        mock_checker.check_all.return_value = []
        mock_health_checker.return_value = mock_checker

        main()
        mock_health_checker.assert_called_once_with(verbose=True)

    @patch('utils.validate_config.HealthChecker')
    @patch('sys.argv', ['validate_config.py', '--json'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_main_json_flag(self, mock_stdout, mock_health_checker):
        """Test --json flag produces JSON output."""
        mock_checker = MagicMock()
        mock_checker.check_all.return_value = [
            HealthCheckResult("Check1", "healthy", "OK")
        ]
        mock_health_checker.return_value = mock_checker

        main()
        output = mock_stdout.getvalue()

        # Should be valid JSON
        data = json.loads(output)
        assert "results" in data

    @patch('utils.validate_config.HealthChecker')
    @patch('sys.argv', ['validate_config.py'])
    def test_main_keyboard_interrupt_exit_code(self, mock_health_checker):
        """Test exit code 130 on keyboard interrupt."""
        mock_health_checker.side_effect = KeyboardInterrupt()

        exit_code = main()
        assert exit_code == 130

    @patch('utils.validate_config.HealthChecker')
    @patch('sys.argv', ['validate_config.py'])
    def test_main_exception_exit_code(self, mock_health_checker):
        """Test exit code 3 on unhandled exception."""
        mock_health_checker.side_effect = RuntimeError("Fatal error")

        exit_code = main()
        assert exit_code == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
