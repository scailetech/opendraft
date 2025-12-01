#!/usr/bin/env python3
"""Add metadata enrichment to Gemini Grounded client."""

filepath = 'utils/api_citations/gemini_grounded.py'

with open(filepath, 'r') as f:
    content = f.read()

# Step 1: Add enrichment methods before close() method
enrichment_methods = '''
    # =========================================================================
    # Academic URL Metadata Enrichment
    # =========================================================================
    
    def _is_academic_url(self, url: str) -> bool:
        """Check if URL is from an academic domain that can be enriched."""
        academic_domains = [
            'pubmed.ncbi.nlm.nih.gov',
            'pmc.ncbi.nlm.nih.gov',
            'doi.org',
            'mdpi.com',
            'springer.com',
            'nature.com',
            'academic.oup.com',
            'sciencedirect.com',
            'wiley.com',
            'tandfonline.com',
            'frontiersin.org',
        ]
        return any(domain in url.lower() for domain in academic_domains)
    
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

'''

# Find where to insert (before close method)
close_method = '''    def close(self) -> None:
        """Close HTTP session."""'''

if close_method in content:
    content = content.replace(close_method, enrichment_methods + close_method)
    print('Step 1: Added enrichment methods before close()')
else:
    print('Step 1: SKIPPED - close() method not found')

# Step 2: Modify _validate_sources to call enricher
old_valid_source = '''            # Build validated source metadata
            valid_source = {
                'title': source.get('title', 'Source'),
                'url': final_url,
                'snippet': source.get('snippet'),
                'authors': None,  # Not available from grounding
                'date': None,  # Not available from grounding
                'source_type': 'website',  # Industry sources are websites/reports
            }

            valid_sources.append(valid_source)'''

new_valid_source = '''            # Build validated source metadata
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

            valid_sources.append(valid_source)'''

if old_valid_source in content:
    content = content.replace(old_valid_source, new_valid_source)
    print('Step 2: Modified _validate_sources to call enricher')
else:
    print('Step 2: SKIPPED - _validate_sources pattern not found')

with open(filepath, 'w') as f:
    f.write(content)

print('\nDone! Metadata enrichment added to gemini_grounded.py')
