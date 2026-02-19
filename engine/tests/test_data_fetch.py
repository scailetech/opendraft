#!/usr/bin/env python3
"""
Tests for data fetching module (World Bank, Eurostat, OWID).
"""

import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.data_fetch import DataFetcher, fetch_data, SDMX_PROVIDERS


class TestDataFetcher:
    """Tests for DataFetcher class."""

    def test_init_creates_workspace(self):
        """Test that workspace directory is created on init."""
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir) / "new_workspace"
            fetcher = DataFetcher(workspace)
            assert workspace.exists()

    def test_list_providers(self):
        """Test listing available providers."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fetcher = DataFetcher(Path(tmpdir))
            result = fetcher.list_providers()
            assert "World Bank" in result
            assert "Eurostat" in result
            assert "Our World in Data" in result

    def test_sdmx_providers_structure(self):
        """Test SDMX_PROVIDERS has required fields."""
        required_fields = {"name", "url", "description"}
        for key, provider in SDMX_PROVIDERS.items():
            assert all(field in provider for field in required_fields), \
                f"Provider {key} missing required fields"


class TestWorldBankSearch:
    """Tests for World Bank search functionality."""

    @pytest.mark.network
    def test_search_gdp_returns_results(self):
        """Test searching for GDP indicators."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fetcher = DataFetcher(Path(tmpdir), timeout=30)
            result = fetcher.search_worldbank("gdp")

            assert result["status"] == "success"
            assert "indicators" in result
            assert len(result["indicators"]) > 0

    def test_search_returns_code_and_name(self):
        """Test that search results have code and name."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fetcher = DataFetcher(Path(tmpdir), timeout=30)
            result = fetcher.search_worldbank("population")

            if result["status"] == "success":
                for ind in result["indicators"]:
                    assert "code" in ind
                    assert "name" in ind


class TestWorldBankFetch:
    """Tests for World Bank data fetching."""

    def test_fetch_gdp_single_country(self):
        """Test fetching GDP for a single country."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fetcher = DataFetcher(Path(tmpdir), timeout=30)
            result = fetcher.fetch_worldbank(
                "NY.GDP.MKTP.CD",
                countries="USA",
                start_year=2020,
                end_year=2023
            )

            assert result["status"] == "success"
            assert "file_path" in result
            assert Path(result["file_path"]).exists()
            assert result["rows"] > 0

    def test_fetch_creates_csv(self):
        """Test that fetch creates a CSV file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fetcher = DataFetcher(Path(tmpdir), timeout=30)
            result = fetcher.fetch_worldbank(
                "SP.POP.TOTL",
                countries="DEU",
                start_year=2020
            )

            if result["status"] == "success":
                csv_path = Path(result["file_path"])
                assert csv_path.suffix == ".csv"
                content = csv_path.read_text()
                assert "country" in content.lower()

    def test_fetch_invalid_indicator(self):
        """Test that invalid indicator returns error."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fetcher = DataFetcher(Path(tmpdir), timeout=30)
            result = fetcher.fetch_worldbank("INVALID_INDICATOR_XYZ")

            assert result["status"] == "error"


class TestOWIDFetch:
    """Tests for Our World in Data fetching."""

    @pytest.mark.slow
    def test_fetch_covid_data(self):
        """Test fetching COVID data (large file, marked slow)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fetcher = DataFetcher(Path(tmpdir), timeout=120)
            result = fetcher.fetch_owid("covid-19")

            assert result["status"] == "success"
            assert result["rows"] > 100000  # COVID data is large

    def test_fetch_invalid_dataset(self):
        """Test that invalid dataset returns helpful error."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fetcher = DataFetcher(Path(tmpdir), timeout=30)
            result = fetcher.fetch_owid("nonexistent-dataset-xyz")

            assert result["status"] == "error"
            assert "Try:" in result["message"]  # Suggests valid datasets


class TestFetchDataConvenience:
    """Tests for fetch_data convenience function."""

    def test_fetch_data_worldbank(self):
        """Test convenience function with worldbank."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = fetch_data(
                "worldbank",
                "NY.GDP.MKTP.CD",
                Path(tmpdir),
                countries="USA",
                start_year=2022
            )
            assert result["status"] == "success"

    def test_fetch_data_search(self):
        """Test convenience function with search."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = fetch_data("search", "education", Path(tmpdir))
            assert result["status"] == "success"

    def test_fetch_data_unknown_provider(self):
        """Test that unknown provider returns error."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = fetch_data("unknown", "query", Path(tmpdir))
            assert result["status"] == "error"
            assert "Unknown provider" in result["message"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
