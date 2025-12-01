#!/usr/bin/env python3
"""
ABOUTME: Gemini API client with Google Search grounding for source discovery
ABOUTME: Uses Google Search tool via REST API to find and validate real web sources with citations
"""

import os
import re
import json
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    requests = None

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

from .base import BaseAPIClient


class GeminiGroundedClient(BaseAPIClient):
    """
    Gemini API client with Google Search grounding.

    Uses Gemini 2.5 Pro with Google Search tool via REST API to discover real sources
    with grounded citations. Validates URLs and extracts metadata.

    Features:
    - Google Search grounding for real-time source discovery (via REST API)
    - Deep research capability with high token limits
    - URL validation (HTTP 200 checks)
    - Redirect unwrapping to final destinations
    - Domain filtering (competitors, forbidden hosts)
    - Grounding citation extraction

    Requirements:
    - requests
    - GOOGLE_API_KEY environment variable
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: int = 120,  # Longer timeout for deep research
        max_retries: int = 3,
        forbidden_domains: Optional[List[str]] = None,
        validate_urls: bool = True
    ):
        """
        Initialize Gemini Grounded client.

        Args:
            api_key: Google AI API key (defaults to GOOGLE_API_KEY env var)
            timeout: Request timeout in seconds (120s for deep research)
            max_retries: Number of retry attempts
            forbidden_domains: List of domains to filter out
            validate_urls: Whether to validate URLs return HTTP 200
        """
        # Load .env file to ensure API key is available
        if load_dotenv is not None:
            load_dotenv()

        super().__init__(
            api_key=api_key or os.getenv('GOOGLE_API_KEY'),
            base_url='https://generativelanguage.googleapis.com/v1beta/models',
            timeout=timeout,
            max_retries=max_retries
        )

        if not requests:
            raise ImportError(
                "requests not installed. Run: pip install requests"
            )

        if not self.api_key:
            raise ValueError(
                "GOOGLE_API_KEY not found. Set via environment variable or constructor."
            )

        # Use Gemini 2.5 Flash for fast grounded search (Pro is too slow)
        self.model_name = 'gemini-2.5-flash'

        self.forbidden_domains = forbidden_domains or []
        self.validate_urls = validate_urls

        # Session for both API calls and URL validation
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                          'AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,'
                      'image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'DNT': '1',
            'Connection': 'keep-alive',
        })

    def search_paper(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Search for a source using Gemini with Google Search grounding via REST API.

        Args:
            query: Search query (topic, title, keywords)

        Returns:
            Paper/source metadata dict with keys:
                - title: str
                - url: str (validated, unwrapped)
                - authors: Optional[str]
                - date: Optional[str]
                - snippet: Optional[str]
            Returns None if no valid source found.
        """
        try:
            # Construct grounded search prompt
            prompt = self._build_search_prompt(query)

            # Generate with Google Search grounding via REST API
            response_data = self._generate_content_with_grounding(prompt)

            if not response_data:
                return None

            # Extract grounding citations from response
            sources = self._extract_grounding_citations(response_data)

            if not sources:
                return None

            # Validate and unwrap URLs
            valid_sources = self._validate_sources(sources)

            if not valid_sources:
                return None

            # Return first valid source
            return valid_sources[0]

        except Exception as e:
            print(f"Gemini grounded search error: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _generate_content_with_grounding(self, prompt: str) -> Optional[Dict[str, Any]]:
        """
        Generate content using Gemini REST API with Google Search grounding.

        Args:
            prompt: User prompt for generation

        Returns:
            API response data dict, or None if error
        """
        try:
            # Build request body (matching gtm-os-v2 pattern)
            body = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,  # Low temp for factual accuracy
                    "maxOutputTokens": 8192,  # High limit for deep research
                },
                "tools": [
                    {"googleSearch": {}},  # Enable Google Search grounding
                ]
            }

            # Make REST API call
            url = f"{self.base_url}/{self.model_name}:generateContent?key={self.api_key}"

            response = self.session.post(
                url,
                json=body,
                headers={"Content-Type": "application/json"},
                timeout=self.timeout
            )

            if not response.ok:
                error_text = response.text[:500]
                print(f"Gemini API error {response.status_code}: {error_text}")
                return None

            data = response.json()

            # Check for valid response
            if not data.get('candidates'):
                print(f"No candidates in response: {data}")
                return None

            return data

        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _build_search_prompt(self, query: str) -> str:
        """Build search prompt for Gemini."""
        return f"""Find a credible web source about: {query}

Requirements:
- Must be from a reputable source (academic, news, official documentation)
- Must be publicly accessible (no paywalls)
- Prefer recent sources (last 5 years)
- Include author and publication date if available

Provide the source title, URL, and a brief snippet explaining relevance."""

    def _extract_grounding_citations(
        self,
        response_data: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Extract grounding citations from Gemini REST API response.

        Args:
            response_data: Gemini API response dict (from REST API)

        Returns:
            List of dicts with 'title', 'url', 'snippet' keys
        """
        sources = []

        try:
            # Check for candidates in response
            candidates = response_data.get('candidates', [])
            if not candidates:
                return sources

            candidate = candidates[0]

            # Extract grounding metadata (matching gtm-os-v2 pattern)
            grounding_metadata = candidate.get('groundingMetadata')

            if grounding_metadata:
                # Extract from grounding chunks
                grounding_chunks = grounding_metadata.get('groundingChunks', [])

                for chunk in grounding_chunks:
                    source = {}

                    # Extract web source details
                    web = chunk.get('web', {})
                    if web:
                        uri = web.get('uri')
                        title = web.get('title')

                        if uri:
                            source['url'] = uri
                            source['title'] = title if title else uri  # Use URL as title if title missing

                        if source.get('url'):  # Only URL required
                            sources.append(source)

            # Also extract from text content as fallback
            content = candidate.get('content', {})
            parts = content.get('parts', [])
            if parts:
                text = parts[0].get('text', '')
                if text:
                    sources.extend(self._extract_urls_from_text(text))

        except Exception as e:
            print(f"Error extracting grounding citations: {e}")
            import traceback
            traceback.print_exc()

        return sources

    def _extract_urls_from_text(self, text: str) -> List[Dict[str, str]]:
        """Extract URLs from response text as fallback."""
        sources = []
        url_pattern = re.compile(r'https?://[^\s\)]+')

        matches = url_pattern.findall(text)
        for url in matches:
            url = url.rstrip('.,;:')
            sources.append({
                'url': url,
                'title': 'Source',  # Generic title
            })

        return sources

    def _validate_sources(
        self,
        sources: List[Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """
        Validate and unwrap source URLs.

        Args:
            sources: List of source dicts with 'url' and 'title'

        Returns:
            List of validated source dicts with metadata
        """
        valid_sources = []

        for source in sources:
            url = source.get('url')
            if not url:
                continue

            # Filter forbidden domains
            if self._is_forbidden_domain(url):
                continue

            # ALWAYS unwrap grounding-api-redirect URLs to get real destination
            # But skip HTTP validation to prevent timeouts
            if 'grounding-api-redirect' in url or 'vertexaisearch.cloud.google.com' in url:
                final_url = self._unwrap_url(url)
                if not final_url:
                    continue  # Failed to unwrap, skip this source
            elif self.validate_urls:
                # For non-grounding URLs, validate only if enabled
                final_url = self._unwrap_url(url)
                if not final_url:
                    continue
                if not self._validate_url(final_url):
                    continue
            else:
                # Use URL as-is (no unwrapping, no validation)
                final_url = url

            # Build validated source metadata
            valid_source = {
                'title': source.get('title', 'Source'),
                'url': final_url,
                'snippet': source.get('snippet'),
                'authors': None,  # Not available from grounding
                'date': None,  # Not available from grounding
                'source_type': 'website',  # Industry sources are websites/reports
            }
            
            # Enrich metadata for academic URLs
            if self._is_academic_url(final_url):
                enriched = self._enrich_metadata_from_url(final_url)
                if enriched and enriched.get('authors'):
                    # Use enriched metadata, keep original URL
                    enriched['url'] = final_url
                    valid_source = enriched

            valid_sources.append(valid_source)

        return valid_sources

    def _is_forbidden_domain(self, url: str) -> bool:
        """Check if URL is from forbidden domain."""
        try:
            domain = urlparse(url).netloc.lower()
            return any(
                forbidden in domain
                for forbidden in self.forbidden_domains
            )
        except Exception:
            return False

    def _unwrap_url(self, url: str) -> Optional[str]:
        """
        Follow redirects to get final destination URL.

        Args:
            url: Initial URL

        Returns:
            Final URL after redirects, or None if error
        """
        try:
            response = self.session.head(
                url,
                allow_redirects=True,
                timeout=self.timeout
            )
            return response.url
        except Exception:
            # Try GET if HEAD fails
            try:
                response = self.session.get(
                    url,
                    allow_redirects=True,
                    timeout=self.timeout,
                    stream=True
                )
                response.close()
                return response.url
            except Exception:
                return None

    def _validate_url(self, url: str) -> bool:
        """
        Validate URL returns HTTP 200.

        Args:
            url: URL to validate

        Returns:
            True if URL returns 200, False otherwise
        """
        try:
            response = self.session.head(
                url,
                allow_redirects=True,
                timeout=self.timeout
            )

            # Some servers block HEAD, try GET
            if response.status_code == 405:
                response = self.session.get(
                    url,
                    allow_redirects=True,
                    timeout=self.timeout,
                    stream=True
                )
                response.close()

            return response.status_code == 200

        except Exception:
            return False


    # =========================================================================
    # Academic URL Metadata Enrichment
    # =========================================================================
    
    def _is_academic_url(self, url: str) -> bool:
        """Check if URL is from an academic domain that can be enriched."""
        academic_domains = [
            # NCBI
            'pubmed.ncbi.nlm.nih.gov',
            'pmc.ncbi.nlm.nih.gov',
            # DOI resolver
            'doi.org',
            # Major publishers
            'mdpi.com',
            'springer.com',
            'nature.com',
            'academic.oup.com',
            'sciencedirect.com',
            'wiley.com',
            'tandfonline.com',
            'frontiersin.org',
            # Additional academic publishers
            'pubs.acs.org',  # American Chemical Society
            'researchgate.net',  # Has DOIs
            'cell.com',  # Cell Press
            'plos.org',  # PLOS journals
            'bmj.com',  # British Medical Journal
            'jamanetwork.com',  # JAMA
            'thelancet.com',  # Lancet
            'nejm.org',  # New England Journal of Medicine
            'arxiv.org',  # Preprints
            'biorxiv.org',  # Preprints
            'medrxiv.org',  # Preprints
            'journals.sagepub.com',  # SAGE
            'cambridge.org',  # Cambridge University Press
            'oxford.ac.uk',  # Oxford
            'ieee.org',  # IEEE
            'acm.org',  # ACM
            'aaai.org',  # AAAI
            'cureus.com',  # Cureus medical journal
        ]
        url_lower = url.lower()
        
        # Check known academic domains
        if any(domain in url_lower for domain in academic_domains):
            return True
        
        # Also check if URL contains a DOI pattern (10.xxxx/) - catches any academic site
        if re.search(r'10\.\d{4,}/', url_lower):
            return True
        
        return False
    
    def _enrich_metadata_from_url(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Enrich source metadata by extracting paper info from academic URLs.
        
        For PubMed/PMC: Extract PMID/PMCID and fetch via NCBI E-utilities
        For DOI URLs: Extract DOI and fetch via CrossRef
        For other academic sites: Extract DOI from URL if present
        """
        try:
            # PubMed: https://pubmed.ncbi.nlm.nih.gov/35058619/
            if 'pubmed.ncbi.nlm.nih.gov' in url:
                pmid = self._extract_pmid_from_url(url)
                if pmid:
                    return self._fetch_pubmed_metadata(pmid, url)
            
            # PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC12298131/
            if 'pmc.ncbi.nlm.nih.gov' in url:
                pmcid = self._extract_pmcid_from_url(url)
                if pmcid:
                    return self._fetch_pmc_metadata(pmcid, url)
            
            # DOI URLs: https://doi.org/10.xxxx/...
            if 'doi.org' in url:
                doi = self._extract_doi_from_doi_url(url)
                if doi:
                    return self._fetch_crossref_metadata(doi, url)
            
            # Academic sites with DOI in URL (MDPI, Springer, Nature, etc.)
            doi = self._extract_doi_from_academic_url(url)
            if doi:
                return self._fetch_crossref_metadata(doi, url)
            
        except Exception as e:
            print(f"Metadata enrichment error for {url}: {e}")
        
        return None
    
    def _extract_pmid_from_url(self, url: str) -> Optional[str]:
        """Extract PMID from PubMed URL."""
        # https://pubmed.ncbi.nlm.nih.gov/35058619/
        match = re.search(r'pubmed\.ncbi\.nlm\.nih\.gov/(\d+)', url)
        return match.group(1) if match else None
    
    def _extract_pmcid_from_url(self, url: str) -> Optional[str]:
        """Extract PMCID from PMC URL."""
        # https://pmc.ncbi.nlm.nih.gov/articles/PMC12298131/
        match = re.search(r'PMC(\d+)', url)
        return match.group(1) if match else None
    
    def _extract_doi_from_doi_url(self, url: str) -> Optional[str]:
        """Extract DOI from doi.org URL."""
        # https://doi.org/10.1016/j.example.2023.001
        match = re.search(r'doi\.org/(10\.[^\s]+)', url)
        return match.group(1) if match else None
    
    def _extract_doi_from_academic_url(self, url: str) -> Optional[str]:
        """Extract DOI from academic publisher URLs."""
        # MDPI: https://www.mdpi.com/2227-9032/13/17/2154 -> 10.3390/healthcare13172154
        if 'mdpi.com' in url:
            match = re.search(r'mdpi\.com/([\d-]+)/(\d+)/(\d+)', url)
            if match:
                journal_id, vol, article = match.groups()
                # MDPI DOIs follow pattern: 10.3390/journalXXXXXXX
                return None  # Complex mapping, skip for now
        
        # Look for DOI in URL path
        match = re.search(r'(10\.\d{4,}/[^\s&?#]+)', url)
        return match.group(1) if match else None
    
    def _fetch_pubmed_metadata(self, pmid: str, original_url: str) -> Optional[Dict[str, Any]]:
        """Fetch paper metadata from NCBI E-utilities using PMID."""
        try:
            api_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            params = {
                "db": "pubmed",
                "id": pmid,
                "retmode": "json"
            }
            response = self.session.get(api_url, params=params, timeout=10)
            if not response.ok:
                return None
            
            data = response.json()
            result = data.get('result', {}).get(pmid, {})
            
            if not result or 'error' in result:
                return None
            
            # Extract authors
            authors = result.get('authors', [])
            author_str = self._format_ncbi_authors(authors) if authors else None
            
            # Extract year from pubdate
            pubdate = result.get('pubdate', '')
            year = pubdate[:4] if pubdate and len(pubdate) >= 4 else None
            
            # Extract DOI from articleids
            doi = None
            for aid in result.get('articleids', []):
                if aid.get('idtype') == 'doi':
                    doi = aid.get('value')
                    break
            
            return {
                'title': result.get('title', '').rstrip('.'),
                'authors': author_str,
                'year': year,
                'doi': doi,
                'url': original_url,
                'journal': result.get('fulljournalname') or result.get('source'),
                'source_type': 'journal'
            }
        except Exception as e:
            print(f"PubMed API error: {e}")
            return None
    
    def _fetch_pmc_metadata(self, pmcid: str, original_url: str) -> Optional[Dict[str, Any]]:
        """Fetch paper metadata from NCBI E-utilities using PMCID."""
        try:
            # First get the PMID from PMCID
            api_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            params = {
                "db": "pmc",
                "term": f"PMC{pmcid}[pmcid]",
                "retmode": "json"
            }
            response = self.session.get(api_url, params=params, timeout=10)
            if not response.ok:
                return None
            
            data = response.json()
            id_list = data.get('esearchresult', {}).get('idlist', [])
            
            if not id_list:
                return None
            
            # Now get summary using the pmc ID
            summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            params = {
                "db": "pmc",
                "id": id_list[0],
                "retmode": "json"
            }
            response = self.session.get(summary_url, params=params, timeout=10)
            if not response.ok:
                return None
            
            data = response.json()
            result = data.get('result', {}).get(id_list[0], {})
            
            if not result or 'error' in result:
                return None
            
            # Extract authors
            authors = result.get('authors', [])
            author_str = self._format_ncbi_authors(authors) if authors else None
            
            # Extract year
            pubdate = result.get('pubdate', '') or result.get('epubdate', '')
            year = pubdate[:4] if pubdate and len(pubdate) >= 4 else None
            
            # Extract DOI
            doi = None
            for aid in result.get('articleids', []):
                if aid.get('idtype') == 'doi':
                    doi = aid.get('value')
                    break
            
            return {
                'title': result.get('title', '').rstrip('.'),
                'authors': author_str,
                'year': year,
                'doi': doi,
                'url': original_url,
                'journal': result.get('fulljournalname') or result.get('source'),
                'source_type': 'journal'
            }
        except Exception as e:
            print(f"PMC API error: {e}")
            return None
    
    def _fetch_crossref_metadata(self, doi: str, original_url: str) -> Optional[Dict[str, Any]]:
        """Fetch paper metadata from CrossRef using DOI."""
        try:
            api_url = f"https://api.crossref.org/works/{doi}"
            headers = {'User-Agent': 'AcademicThesisAI/1.0 (mailto:support@example.com)'}
            response = self.session.get(api_url, headers=headers, timeout=10)
            
            if not response.ok:
                return None
            
            data = response.json().get('message', {})
            
            if not data:
                return None
            
            # Extract title
            title_list = data.get('title', [])
            title = title_list[0] if title_list else None
            
            # Extract authors
            authors = data.get('author', [])
            author_str = self._format_crossref_authors(authors) if authors else None
            
            # Extract year
            year = None
            for date_field in ['published-print', 'published-online', 'created']:
                date_parts = data.get(date_field, {}).get('date-parts', [[]])
                if date_parts and date_parts[0]:
                    year = str(date_parts[0][0])
                    break
            
            # Extract journal
            container = data.get('container-title', [])
            journal = container[0] if container else None
            
            return {
                'title': title,
                'authors': author_str,
                'year': year,
                'doi': doi,
                'url': original_url,
                'journal': journal,
                'source_type': 'journal'
            }
        except Exception as e:
            print(f"CrossRef API error: {e}")
            return None
    
    def _format_ncbi_authors(self, authors: list) -> Optional[str]:
        """Format NCBI author list to 'LastName et al.' format."""
        if not authors:
            return None
        
        # Get first author's last name
        first = authors[0]
        if isinstance(first, dict):
            name = first.get('name', '')
        else:
            name = str(first)
        
        # Extract last name (NCBI format: "LastName AB")
        parts = name.split()
        last_name = parts[0] if parts else name
        
        if len(authors) > 1:
            return f"{last_name} et al."
        return last_name
    
    def _format_crossref_authors(self, authors: list) -> Optional[str]:
        """Format CrossRef author list to 'LastName et al.' format."""
        if not authors:
            return None
        
        first = authors[0]
        last_name = first.get('family', first.get('name', 'Unknown'))
        
        if len(authors) > 1:
            return f"{last_name} et al."
        return last_name

    def close(self) -> None:
        """Close HTTP session."""
        if hasattr(self, 'session'):
            self.session.close()
