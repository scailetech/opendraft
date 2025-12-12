"""
DataForSEO Client for Citation Research

Uses DataForSEO SERP API to discover academic and industry sources.
Backup for Gemini grounding when quota is exhausted.

Features:
- 2000 requests per minute rate limit
- Organic search results with ranking
- Automatic citation extraction from SERP results
- Domain filtering and validation

Requirements:
- requests
- DATAFORSEO_LOGIN environment variable
- DATAFORSEO_PASSWORD environment variable
"""

import os
import re
import requests
import base64
from typing import Dict, Any, Optional, List
from urllib.parse import urlparse, unquote


class DataForSEOClient:
    """
    Client for DataForSEO SERP API

    Searches Google and extracts academic/industry citations
    """

    def __init__(
        self,
        login: Optional[str] = None,
        password: Optional[str] = None,
        timeout: int = 15,
        location_code: int = 2840,  # USA
        forbidden_domains: Optional[List[str]] = None,
    ):
        """
        Initialize DataForSEO client

        Args:
            login: DataForSEO login (defaults to DATAFORSEO_LOGIN env var)
            password: DataForSEO password (defaults to DATAFORSEO_PASSWORD env var)
            timeout: Request timeout in seconds
            location_code: Google location code (2840 = USA)
            forbidden_domains: List of domains to skip
        """
        self.login = login or os.environ.get('DATAFORSEO_LOGIN')
        self.password = password or os.environ.get('DATAFORSEO_PASSWORD')

        if not self.login or not self.password:
            raise ValueError(
                "DataForSEO credentials required. "
                "Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables."
            )

        self.timeout = timeout
        self.location_code = location_code
        self.endpoint = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced'

        # Build auth header
        credentials = f"{self.login}:{self.password}"
        self.auth_header = base64.b64encode(credentials.encode()).decode('ascii')

        self.headers = {
            'Authorization': f'Basic {self.auth_header}',
            'Content-Type': 'application/json',
        }

        # Domain filtering
        self.forbidden_domains = forbidden_domains or [
            'chegg.com',
            'coursehero.com',
            'studypool.com',
            'academia.edu',  # Often paywalled
        ]

        # Academic URL patterns (for source type detection)
        self.academic_patterns = [
            r'\.edu/',
            r'doi\.org/',
            r'pubmed\.ncbi\.nlm\.nih\.gov/',
            r'arxiv\.org/',
            r'scholar\.google',
            r'jstor\.org/',
            r'springer\.com/',
            r'sciencedirect\.com/',
            r'wiley\.com/',
            r'nature\.com/',
            r'ieee\.org/',
        ]

    def search_paper(self, query: str, num_results: int = 10) -> Optional[Dict[str, Any]]:
        """
        Search for paper and return best result as citation

        Args:
            query: Search query (e.g., "machine learning healthcare applications 2023")
            num_results: Number of SERP results to fetch (default 10)

        Returns:
            Citation dict with title, authors, url, doi, year, source_type
            Returns None if no valid result found
        """
        try:
            # Search via SERP API
            results = self._search_serp(query, num_results)

            if not results:
                return None

            # Find first valid academic/industry source
            for result in results:
                url = result.get('url', '')

                # Skip forbidden domains
                if self._is_forbidden_domain(url):
                    continue

                # Build citation from SERP result
                citation = self._build_citation_from_serp(result)

                if citation:
                    return citation

            return None

        except Exception as e:
            print(f"DataForSEO search failed for query: {query[:50]}... Error: {e}")
            return None

    def _search_serp(self, query: str, depth: int = 10) -> List[Dict[str, Any]]:
        """
        Call DataForSEO SERP API and extract organic results

        Args:
            query: Search query
            depth: Number of results to fetch

        Returns:
            List of search result dicts with title, url, snippet, position
        """
        payload = [{
            "keyword": query,
            "location_code": self.location_code,
            "language_code": "en",
            "depth": depth,
        }]

        try:
            response = requests.post(
                self.endpoint,
                headers=self.headers,
                json=payload,
                timeout=self.timeout
            )

            if response.status_code != 200:
                error_text = response.text[:200]
                raise Exception(f"DataForSEO API error {response.status_code}: {error_text}")

            data = response.json()

            # Extract organic search results
            results = []
            if data.get('tasks'):
                for task in data['tasks']:
                    if task.get('result'):
                        for result_item in task['result']:
                            if result_item.get('items'):
                                for item in result_item['items']:
                                    if item.get('type') == 'organic':
                                        results.append({
                                            'title': item.get('title', ''),
                                            'url': item.get('url', ''),
                                            'snippet': item.get('description', ''),
                                            'position': item.get('rank_absolute', 0),
                                        })

            return results

        except requests.Timeout:
            raise Exception(f"DataForSEO request timeout after {self.timeout}s")
        except requests.RequestException as e:
            raise Exception(f"DataForSEO request failed: {e}")

    def _build_citation_from_serp(self, serp_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Build citation from SERP result

        Args:
            serp_result: Dict with title, url, snippet, position

        Returns:
            Citation dict or None if invalid
        """
        url = (serp_result.get('url') or '').strip()
        title = (serp_result.get('title') or '').strip()
        snippet = (serp_result.get('snippet') or '').strip()

        if not url or not title:
            return None

        # Detect source type
        source_type = self._detect_source_type(url)

        # Try to extract year from title or snippet
        year = self._extract_year(f"{title} {snippet}")

        # Try to extract DOI from URL
        doi = self._extract_doi_from_url(url)

        # Try to extract authors from snippet (heuristic)
        authors = self._extract_authors_from_snippet(snippet)

        citation = {
            'title': title,
            'authors': authors,
            'year': year,
            'url': url,
            'doi': doi,
            'source_type': source_type,
            'abstract': snippet[:500] if snippet else None,  # First 500 chars
        }

        return citation

    def _detect_source_type(self, url: str) -> str:
        """
        Detect if URL is academic or industry source

        Args:
            url: URL to check

        Returns:
            'academic' or 'industry'
        """
        url_lower = url.lower()

        for pattern in self.academic_patterns:
            if re.search(pattern, url_lower):
                return 'academic'

        # Industry sources (McKinsey, WHO, Gartner, etc.)
        industry_patterns = [
            'mckinsey.com',
            'who.int',
            'gartner.com',
            'forrester.com',
            'accenture.com',
            'deloitte.com',
            'pwc.com',
            'bcg.com',
            'oecd.org',
            'worldbank.org',
        ]

        for pattern in industry_patterns:
            if pattern in url_lower:
                return 'industry'

        return 'industry'  # Default to industry for web sources

    def _extract_year(self, text: str) -> Optional[int]:
        """Extract publication year from text (2000-2025)"""
        matches = re.findall(r'\b(20[0-2][0-9])\b', text)
        if matches:
            # Return the most recent year found
            years = [int(y) for y in matches]
            return max(years)
        return None

    def _extract_doi_from_url(self, url: str) -> Optional[str]:
        """Extract DOI from URL if present"""
        # Pattern: doi.org/10.xxxx/yyyy or /doi/10.xxxx/yyyy
        match = re.search(r'doi\.org/(10\.\d{4,}/[^\s]+)', url)
        if match:
            return unquote(match.group(1))

        match = re.search(r'/doi/(10\.\d{4,}/[^\s]+)', url)
        if match:
            return unquote(match.group(1))

        return None

    def _extract_authors_from_snippet(self, snippet: str) -> Optional[str]:
        """
        Heuristically extract authors from SERP snippet

        Looks for patterns like "by John Smith" or "Smith et al."
        """
        if not snippet:
            return None

        # Pattern: "by Author Name"
        match = re.search(r'\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})', snippet)
        if match:
            return match.group(1)

        # Pattern: "Author et al."
        match = re.search(r'\b([A-Z][a-z]+)\s+et\s+al\.', snippet)
        if match:
            return f"{match.group(1)} et al."

        return None

    def _is_forbidden_domain(self, url: str) -> bool:
        """Check if URL is from a forbidden domain"""
        try:
            domain = urlparse(url).netloc.lower()
            for forbidden in self.forbidden_domains:
                if forbidden.lower() in domain:
                    return True
            return False
        except Exception:
            return False

    def close(self) -> None:
        """Cleanup (no-op for requests-based client)"""
        pass


# Example usage
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python dataforseo_client.py <query>")
        print("Example: python dataforseo_client.py 'machine learning healthcare 2023'")
        sys.exit(1)

    query = ' '.join(sys.argv[1:])

    print(f"Searching DataForSEO for: {query}\n")

    client = DataForSEOClient()
    result = client.search_paper(query)

    if result:
        print("Found citation:")
        print(f"  Title: {result.get('title')}")
        print(f"  Authors: {result.get('authors')}")
        print(f"  Year: {result.get('year')}")
        print(f"  URL: {result.get('url')}")
        print(f"  DOI: {result.get('doi')}")
        print(f"  Type: {result.get('source_type')}")
        if result.get('abstract'):
            print(f"  Abstract: {result['abstract'][:100]}...")
    else:
        print("No valid citation found")

    client.close()
