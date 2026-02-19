#!/usr/bin/env python3
"""
ABOUTME: Data fetching from World Bank, Eurostat, and OWID APIs
ABOUTME: Ported from V3 for real data integration in research papers

Supports fetching datasets from:
- World Bank: Development indicators (GDP, population, education, etc.)
- Eurostat: European Union statistics
- OWID: Our World in Data datasets (COVID, life expectancy, etc.)
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

# Try to import pandas, but make it optional
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    logger.warning("pandas not installed - data fetching will return raw data")


# SDMX provider configurations
SDMX_PROVIDERS = {
    "eurostat": {
        "name": "Eurostat",
        "url": "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1",
        "description": "European Union statistics",
    },
    "worldbank": {
        "name": "World Bank",
        "url": "https://api.worldbank.org/v2",
        "description": "World Bank development indicators",
    },
    "owid": {
        "name": "Our World in Data",
        "url": "https://github.com/owid/owid-datasets",
        "description": "Open-source research datasets",
    },
}


class DataFetcher:
    """Fetch data from World Bank, Eurostat, and OWID APIs."""

    def __init__(self, workspace_dir: Path, timeout: int = 30):
        self.workspace_dir = Path(workspace_dir)
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout

    def list_providers(self) -> str:
        """List available data providers."""
        lines = ["**Available Data Providers**", ""]
        lines.append("| Provider | Name | Description |")
        lines.append("|----------|------|-------------|")
        for key, info in SDMX_PROVIDERS.items():
            lines.append(f"| {key} | {info['name']} | {info['description']} |")
        lines.append("")
        lines.append("Use `fetch_worldbank`, `fetch_eurostat`, or `fetch_owid` to retrieve data.")
        return "\n".join(lines)

    def fetch_worldbank(
        self,
        indicator: str,
        countries: str = "all",
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Fetch indicator data from World Bank.

        Args:
            indicator: World Bank indicator code (e.g., 'NY.GDP.MKTP.CD', 'SP.POP.TOTL')
            countries: Country codes, semicolon-separated (e.g., 'USA;DEU;FRA') or 'all'
            start_year: Start year
            end_year: End year

        Returns:
            Dict with status, message, data, and file_path
        """
        base_url = "https://api.worldbank.org/v2"
        url = f"{base_url}/country/{countries}/indicator/{indicator}"

        params = {
            "format": "json",
            "per_page": 1000,
        }
        if start_year:
            params["date"] = f"{start_year}:{end_year or 2024}"

        try:
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            # World Bank returns [metadata, data]
            if len(data) < 2 or not data[1]:
                return {"status": "error", "message": f"No data found for indicator {indicator}"}

            records = data[1]

            # Parse records
            parsed = [{
                "country": r["country"]["value"],
                "country_code": r["countryiso3code"],
                "year": r["date"],
                "value": r["value"],
                "indicator": r["indicator"]["value"],
            } for r in records if r.get("value") is not None]

            if not parsed:
                return {"status": "error", "message": f"No non-null data found for indicator {indicator}"}

            # Save to workspace
            filename = f"worldbank_{indicator.replace('.', '_')}.csv"
            filepath = self.workspace_dir / filename

            if HAS_PANDAS:
                df = pd.DataFrame(parsed)
                df.to_csv(filepath, index=False)
                countries_count = df['country'].nunique()
                years_count = df['year'].nunique()
            else:
                # Fallback: write CSV manually
                import csv
                with open(filepath, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=parsed[0].keys())
                    writer.writeheader()
                    writer.writerows(parsed)
                countries_count = len(set(r['country'] for r in parsed))
                years_count = len(set(r['year'] for r in parsed))

            return {
                "status": "success",
                "message": f"Fetched World Bank indicator '{indicator}'",
                "file_path": str(filepath),
                "rows": len(parsed),
                "countries": countries_count,
                "years": years_count,
                "data": parsed[:10],  # First 10 rows for preview
            }

        except requests.exceptions.HTTPError as e:
            return {"status": "error", "message": f"HTTP error: {e.response.status_code}"}
        except requests.exceptions.RequestException as e:
            return {"status": "error", "message": f"Connection error: {str(e)}"}
        except Exception as e:
            return {"status": "error", "message": f"Error: {str(e)}"}

    def search_worldbank(self, query: str) -> Dict[str, Any]:
        """
        Search World Bank indicators.

        Args:
            query: Search term (e.g., 'GDP', 'population', 'education')

        Returns:
            Dict with matching indicators
        """
        # Use the indicator search endpoint with query parameter
        url = f"https://api.worldbank.org/v2/indicator"
        params = {"format": "json", "per_page": 500, "source": 2}  # WDI source

        try:
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            if len(data) < 2 or not data[1]:
                return {"status": "error", "message": "No indicators found"}

            # Filter by query (case-insensitive)
            query_lower = query.lower()
            matches = [
                {"code": ind["id"], "name": ind["name"]}
                for ind in data[1]
                if (query_lower in ind["name"].lower() or
                    query_lower in ind.get("sourceNote", "").lower() or
                    query_lower in ind["id"].lower())
            ]

            if not matches:
                # Try common indicator mappings
                common_indicators = {
                    "gdp": [
                        {"code": "NY.GDP.MKTP.CD", "name": "GDP (current US$)"},
                        {"code": "NY.GDP.MKTP.KD.ZG", "name": "GDP growth (annual %)"},
                        {"code": "NY.GDP.PCAP.CD", "name": "GDP per capita (current US$)"},
                    ],
                    "population": [
                        {"code": "SP.POP.TOTL", "name": "Population, total"},
                        {"code": "SP.POP.GROW", "name": "Population growth (annual %)"},
                    ],
                    "life expectancy": [
                        {"code": "SP.DYN.LE00.IN", "name": "Life expectancy at birth, total (years)"},
                    ],
                    "education": [
                        {"code": "SE.XPD.TOTL.GD.ZS", "name": "Government expenditure on education (% of GDP)"},
                        {"code": "SE.ADT.LITR.ZS", "name": "Literacy rate, adult total (% of people ages 15+)"},
                    ],
                }
                matches = common_indicators.get(query_lower, [])

            if not matches:
                return {"status": "error", "message": f"No indicators matching '{query}'. Try: gdp, population, education, life expectancy"}

            return {
                "status": "success",
                "message": f"Found {len(matches)} indicators matching '{query}'",
                "indicators": matches[:20],
            }

        except Exception as e:
            return {"status": "error", "message": f"Error: {str(e)}"}

    def fetch_owid(self, dataset_name: str) -> Dict[str, Any]:
        """
        Fetch dataset from Our World in Data.

        Args:
            dataset_name: OWID dataset name (e.g., 'covid-19', 'life-expectancy')

        Returns:
            Dict with status, message, data, and file_path
        """
        # OWID datasets URLs
        urls_to_try = [
            f"https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/{dataset_name}/{dataset_name}.csv",
        ]

        # COVID has a special URL (moved to GitHub)
        if "covid" in dataset_name.lower():
            urls_to_try = [
                "https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv",
                "https://covid.ourworldindata.org/data/owid-covid-data.csv",
            ]

        for url in urls_to_try:
            try:
                response = requests.get(url, timeout=self.timeout)
                if response.status_code == 200:
                    # Save directly as CSV
                    filename = f"owid_{dataset_name.replace('-', '_')}.csv"
                    filepath = self.workspace_dir / filename
                    filepath.write_bytes(response.content)

                    # Get stats
                    if HAS_PANDAS:
                        df = pd.read_csv(filepath)
                        rows = len(df)
                        columns = list(df.columns)[:5]
                    else:
                        rows = response.text.count('\n')
                        columns = response.text.split('\n')[0].split(',')[:5]

                    return {
                        "status": "success",
                        "message": f"Fetched OWID dataset '{dataset_name}'",
                        "file_path": str(filepath),
                        "rows": rows,
                        "columns": columns,
                    }
            except Exception:
                continue

        return {
            "status": "error",
            "message": f"Could not find OWID dataset '{dataset_name}'. Try: 'covid-19', 'life-expectancy', 'population'",
        }

    def fetch_eurostat(
        self,
        dataset_id: str,
        filters: Optional[Dict[str, str]] = None,
        start_period: Optional[str] = None,
        end_period: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetch dataset from Eurostat.

        Args:
            dataset_id: Eurostat dataset code (e.g., 'nama_10_gdp')
            filters: Dict of dimension filters
            start_period: Start year (e.g., '2010')
            end_period: End year (e.g., '2023')

        Returns:
            Dict with status, message, and data
        """
        base_url = "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data"
        filter_str = "all" if not filters else ".".join(filters.get(k, "") for k in filters)
        url = f"{base_url}/{dataset_id}/{filter_str}"

        params = {"format": "SDMX-JSON", "compressed": "false"}
        if start_period:
            params["startPeriod"] = start_period
        if end_period:
            params["endPeriod"] = end_period

        try:
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            # Parse SDMX-JSON
            df = self._parse_sdmx_json(data)

            if df is None or (HAS_PANDAS and df.empty) or (not HAS_PANDAS and not df):
                return {"status": "error", "message": f"No data found for {dataset_id}"}

            # Save to workspace
            filename = f"eurostat_{dataset_id}.csv"
            filepath = self.workspace_dir / filename

            if HAS_PANDAS:
                df.to_csv(filepath, index=False)
                rows = len(df)
                columns = list(df.columns)
            else:
                # df is a list of dicts
                import csv
                with open(filepath, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=df[0].keys())
                    writer.writeheader()
                    writer.writerows(df)
                rows = len(df)
                columns = list(df[0].keys())

            return {
                "status": "success",
                "message": f"Fetched Eurostat dataset '{dataset_id}'",
                "file_path": str(filepath),
                "rows": rows,
                "columns": columns,
            }

        except requests.exceptions.HTTPError as e:
            return {"status": "error", "message": f"HTTP error: {e.response.status_code}"}
        except Exception as e:
            return {"status": "error", "message": f"Error: {str(e)}"}

    def _parse_sdmx_json(self, data: Dict[str, Any]):
        """Parse SDMX-JSON format."""
        try:
            if "dataSets" not in data or not data["dataSets"]:
                return None

            dataset = data["dataSets"][0]
            structure = data.get("structure", {})
            dimensions = structure.get("dimensions", {})

            dim_info = dimensions.get("series", []) + dimensions.get("observation", [])
            dim_names = {d["id"]: d for d in dim_info}

            records = []

            if "series" in dataset:
                for series_key, series_data in dataset["series"].items():
                    key_parts = series_key.split(":")
                    row = {}
                    for i, (dim_id, dim_meta) in enumerate(dim_names.items()):
                        if i < len(key_parts):
                            idx = int(key_parts[i])
                            values = dim_meta.get("values", [])
                            if idx < len(values):
                                row[dim_id] = values[idx].get("name", values[idx].get("id"))

                    obs = series_data.get("observations", {})
                    for time_idx, values in obs.items():
                        obs_row = row.copy()
                        time_dims = dimensions.get("observation", [])
                        if time_dims:
                            time_values = time_dims[0].get("values", [])
                            if int(time_idx) < len(time_values):
                                obs_row["time"] = time_values[int(time_idx)].get("id")
                        obs_row["value"] = values[0] if values else None
                        records.append(obs_row)

            if HAS_PANDAS:
                return pd.DataFrame(records)
            return records

        except Exception as e:
            logger.error(f"Error parsing SDMX-JSON: {e}")
            return None


# Convenience function for CLI
def fetch_data(
    provider: str,
    query: str,
    workspace_dir: Path,
    **kwargs
) -> Dict[str, Any]:
    """
    Fetch data from a provider.

    Args:
        provider: 'worldbank', 'eurostat', or 'owid'
        query: Indicator code or dataset name
        workspace_dir: Where to save the data
        **kwargs: Additional arguments for the provider

    Returns:
        Dict with status and data
    """
    fetcher = DataFetcher(workspace_dir)

    if provider == "worldbank":
        return fetcher.fetch_worldbank(query, **kwargs)
    elif provider == "eurostat":
        return fetcher.fetch_eurostat(query, **kwargs)
    elif provider == "owid":
        return fetcher.fetch_owid(query)
    elif provider == "search":
        return fetcher.search_worldbank(query)
    else:
        return {"status": "error", "message": f"Unknown provider: {provider}"}
