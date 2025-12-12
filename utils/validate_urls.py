#!/usr/bin/env python3
"""
ABOUTME: URL validation script for academic draft citations
ABOUTME: Tests HTTP status of all URLs in markdown bibliography
"""

import re
import sys
import time
from pathlib import Path
from typing import List, Tuple, Dict
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    print("Error: requests library not installed. Run: pip install requests")
    sys.exit(1)


class URLValidator:
    """Validates URLs in markdown files"""

    def __init__(self, timeout: int = 15, retry_count: int = 2):
        """
        Initialize validator.

        Args:
            timeout: Request timeout in seconds
            retry_count: Number of retries for failed requests
        """
        self.timeout = timeout
        self.retry_count = retry_count
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Academic Draft Citation Validator)'
        })

    def extract_urls(self, md_file: Path) -> List[Tuple[str, int]]:
        """
        Extract all URLs from markdown file.

        Args:
            md_file: Path to markdown file

        Returns:
            List of (url, line_number) tuples
        """
        urls = []
        url_pattern = re.compile(r'https?://[^\s\)]+')

        with open(md_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, start=1):
                matches = url_pattern.findall(line)
                for url in matches:
                    # Clean up trailing punctuation
                    url = url.rstrip('.,;:')
                    urls.append((url, line_num))

        return urls

    def validate_url(self, url: str) -> Tuple[int, str, float]:
        """
        Validate a single URL.

        Args:
            url: URL to validate

        Returns:
            Tuple of (status_code, error_message, response_time)
        """
        for attempt in range(self.retry_count + 1):
            try:
                start_time = time.time()

                # Try HEAD request first (faster)
                response = self.session.head(
                    url,
                    timeout=self.timeout,
                    allow_redirects=True
                )

                # Some servers block HEAD requests, fall back to GET
                if response.status_code == 405:
                    response = self.session.get(
                        url,
                        timeout=self.timeout,
                        allow_redirects=True
                    )

                response_time = time.time() - start_time
                return response.status_code, "", response_time

            except requests.exceptions.SSLError as e:
                error_msg = f"SSL Error: {str(e)[:100]}"
            except requests.exceptions.Timeout:
                error_msg = f"Timeout ({self.timeout}s)"
            except requests.exceptions.ConnectionError as e:
                error_msg = f"Connection Error: {str(e)[:100]}"
            except requests.exceptions.RequestException as e:
                error_msg = f"Request Error: {str(e)[:100]}"
            except Exception as e:
                error_msg = f"Unexpected Error: {str(e)[:100]}"

            # Retry with exponential backoff
            if attempt < self.retry_count:
                time.sleep(2 ** attempt)

        # All retries failed
        return 0, error_msg, 0.0

    def categorize_url(self, url: str) -> str:
        """Categorize URL by type."""
        if 'doi.org' in url:
            return 'DOI'
        elif 'semanticscholar.org' in url:
            return 'Semantic Scholar'
        elif any(domain in url for domain in ['github.com', 'gitlab.com']):
            return 'Code Repository'
        else:
            return 'Direct URL'

    def validate_all(self, md_file: Path, verbose: bool = True) -> Dict:
        """
        Validate all URLs in markdown file.

        Args:
            md_file: Path to markdown file
            verbose: Print progress to stdout

        Returns:
            Dictionary with validation results
        """
        urls = self.extract_urls(md_file)

        if verbose:
            print(f"Found {len(urls)} URLs in {md_file.name}")
            print("=" * 80)

        results = {
            'total': len(urls),
            'valid': 0,
            'invalid': 0,
            'errors': [],
            'by_category': {}
        }

        for idx, (url, line_num) in enumerate(urls, start=1):
            category = self.categorize_url(url)

            if verbose:
                print(f"\n[{idx}/{len(urls)}] Testing: {url}")
                print(f"  Category: {category} | Line: {line_num}")

            status_code, error_msg, response_time = self.validate_url(url)

            if status_code == 200:
                results['valid'] += 1
                status_symbol = "✅"
                status_text = f"HTTP {status_code} ({response_time:.2f}s)"
            elif status_code >= 300 and status_code < 400:
                results['valid'] += 1  # Redirects are OK
                status_symbol = "⚠️"
                status_text = f"HTTP {status_code} (redirect, {response_time:.2f}s)"
            elif status_code > 0:
                results['invalid'] += 1
                status_symbol = "❌"
                status_text = f"HTTP {status_code}"
                results['errors'].append({
                    'url': url,
                    'line': line_num,
                    'status': status_code,
                    'category': category
                })
            else:
                results['invalid'] += 1
                status_symbol = "❌"
                status_text = error_msg
                results['errors'].append({
                    'url': url,
                    'line': line_num,
                    'error': error_msg,
                    'category': category
                })

            if verbose:
                print(f"  {status_symbol} {status_text}")

            # Track by category
            if category not in results['by_category']:
                results['by_category'][category] = {'valid': 0, 'invalid': 0}

            if status_code == 200 or (status_code >= 300 and status_code < 400):
                results['by_category'][category]['valid'] += 1
            else:
                results['by_category'][category]['invalid'] += 1

            # Rate limiting: small delay between requests
            time.sleep(0.5)

        return results

    def print_summary(self, results: Dict):
        """Print validation summary."""
        print("\n" + "=" * 80)
        print("VALIDATION SUMMARY")
        print("=" * 80)
        print(f"Total URLs: {results['total']}")
        print(f"Valid:      {results['valid']} ✅")
        print(f"Invalid:    {results['invalid']} ❌")
        print(f"Success Rate: {(results['valid']/results['total']*100):.1f}%")

        print("\n--- By Category ---")
        for category, stats in results['by_category'].items():
            total = stats['valid'] + stats['invalid']
            success_rate = (stats['valid'] / total * 100) if total > 0 else 0
            print(f"{category:20s}: {stats['valid']}/{total} ({success_rate:.0f}%)")

        if results['errors']:
            print("\n--- Errors ---")
            for error in results['errors']:
                print(f"Line {error['line']}: {error['url']}")
                if 'status' in error:
                    print(f"  Status: HTTP {error['status']}")
                if 'error' in error:
                    print(f"  Error: {error['error']}")
                print()


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Validate URLs in academic draft markdown files'
    )
    parser.add_argument(
        'markdown_file',
        type=Path,
        help='Path to markdown file'
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=15,
        help='Request timeout in seconds (default: 15)'
    )
    parser.add_argument(
        '--retries',
        type=int,
        default=2,
        help='Number of retries (default: 2)'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Only show summary'
    )

    args = parser.parse_args()

    if not args.markdown_file.exists():
        print(f"Error: File not found: {args.markdown_file}")
        sys.exit(1)

    validator = URLValidator(timeout=args.timeout, retry_count=args.retries)
    results = validator.validate_all(args.markdown_file, verbose=not args.quiet)
    validator.print_summary(results)

    # Exit code: 0 if all valid, 1 if any invalid
    sys.exit(0 if results['invalid'] == 0 else 1)


if __name__ == '__main__':
    main()
