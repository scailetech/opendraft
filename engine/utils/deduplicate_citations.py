#!/usr/bin/env python3
"""
ABOUTME: Citation deduplication utility - removes duplicate citations from citation databases
ABOUTME: Implements intelligent matching using DOI, URL, title similarity, and author/year

This module provides functions to detect and remove duplicate citations from
citation databases. It uses multiple strategies for matching:
1. Exact DOI match (highest priority)
2. Exact URL match (high priority)
3. Title similarity + author/year match (medium priority)
4. Fuzzy title matching (low priority, with manual review)

Design Principles:
- DRY: Single source of truth for deduplication logic
- SOLID: Single responsibility (deduplication only)
- Defensive: Preserves original data, returns new deduplicated list
"""

from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import re
from difflib import SequenceMatcher


def safe_get(obj, key, default=None):
    """
    Safely get value from dict or object attribute.

    Handles both dictionaries and objects (NamedTuple, dataclass, etc.)

    Args:
        obj: Dictionary or object
        key: Attribute/key name
        default: Default value if not found

    Returns:
        Value from obj[key] or obj.key, or default if not found
    """
    if hasattr(obj, 'get'):
        # Dictionary
        return obj.get(key, default)
    else:
        # Object (NamedTuple, dataclass, etc.)
        return getattr(obj, key, default)


def normalize_text(text: str) -> str:
    """
    Normalize text for comparison (lowercase, remove extra spaces, punctuation).

    Args:
        text: Text to normalize

    Returns:
        Normalized lowercase text
    """
    if not text:
        return ""

    # Lowercase
    text = text.lower().strip()

    # Remove common punctuation
    text = re.sub(r'[.,;:!?"\']', '', text)

    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)

    return text


def normalize_url(url: str) -> str:
    """
    Normalize URL for comparison (remove protocol, trailing slashes, fragments).

    Args:
        url: URL to normalize

    Returns:
        Normalized URL
    """
    if not url:
        return ""

    url = url.lower().strip()

    # Remove protocol
    url = re.sub(r'^https?://', '', url)
    url = re.sub(r'^www\.', '', url)

    # Remove trailing slashes
    url = url.rstrip('/')

    # Remove fragments and query params (keep them for now to avoid over-matching)
    # url = re.sub(r'[#?].*$', '', url)

    return url


def calculate_title_similarity(title1: str, title2: str) -> float:
    """
    Calculate similarity between two titles (0.0 to 1.0).

    Args:
        title1: First title
        title2: Second title

    Returns:
        Similarity score (0.0 = completely different, 1.0 = identical)
    """
    norm1 = normalize_text(title1)
    norm2 = normalize_text(title2)

    if not norm1 or not norm2:
        return 0.0

    return SequenceMatcher(None, norm1, norm2).ratio()


def find_duplicate_groups(citations: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Group citations by duplicate criteria.

    Returns dictionary with keys:
    - 'exact_doi': Citations with duplicate DOIs
    - 'exact_url': Citations with duplicate URLs
    - 'title_match': Citations with very similar titles (>0.9 similarity)
    - 'potential': Citations that might be duplicates (0.7-0.9 similarity)

    Args:
        citations: List of citation dictionaries

    Returns:
        Dictionary mapping duplicate type to list of citation groups
    """
    groups = {
        'exact_doi': [],
        'exact_url': [],
        'title_match': [],
        'potential': []
    }

    # Group by DOI
    doi_groups = defaultdict(list)
    for c in citations:
        doi = safe_get(c, 'doi', '') or ''  # Handle None values
        doi = doi.lower().strip()
        if doi:
            doi_groups[doi].append(c)

    for doi, cites in doi_groups.items():
        if len(cites) > 1:
            groups['exact_doi'].append(cites)

    # Group by URL (normalized)
    url_groups = defaultdict(list)
    for c in citations:
        url = safe_get(c, 'url', '') or ''  # Handle None values
        url = normalize_url(url)
        if url:
            url_groups[url].append(c)

    for url, cites in url_groups.items():
        if len(cites) > 1:
            # Check if already in DOI duplicates (avoid double-counting)
            doi_matched = any(c in sum(groups['exact_doi'], []) for c in cites)
            if not doi_matched:
                groups['exact_url'].append(cites)

    # Group by title similarity (expensive, so do after URL/DOI)
    already_matched = set(safe_get(c, 'id') for c in sum(groups['exact_doi'] + groups['exact_url'], []))
    remaining = [c for c in citations if safe_get(c, 'id') not in already_matched]

    checked_pairs = set()
    for i, c1 in enumerate(remaining):
        for c2 in remaining[i+1:]:
            pair = tuple(sorted([safe_get(c1, 'id'), safe_get(c2, 'id')]))
            if pair in checked_pairs:
                continue
            checked_pairs.add(pair)

            title1 = safe_get(c1, 'title', '')
            title2 = safe_get(c2, 'title', '')

            if not title1 or not title2:
                continue

            similarity = calculate_title_similarity(title1, title2)

            if similarity > 0.9:
                # Very high similarity - likely duplicate
                groups['title_match'].append([c1, c2])
            elif similarity > 0.7:
                # Medium similarity - potential duplicate
                groups['potential'].append([c1, c2])

    return groups


def deduplicate_citations(
    citations: List[Dict],
    strategy: str = 'keep_first',
    verbose: bool = False
) -> Tuple[List[Dict], Dict]:
    """
    Remove duplicate citations from list.

    Strategy options:
    - 'keep_first': Keep first occurrence, remove later ones
    - 'keep_best': Keep citation with most complete metadata
    - 'manual': Return duplicates for manual review (no auto-removal)

    Args:
        citations: List of citation dictionaries
        strategy: Deduplication strategy
        verbose: Print detailed information

    Returns:
        Tuple of (deduplicated_citations, stats_dict)
    """
    if verbose:
        print(f"\n📊 Analyzing {len(citations)} citations for duplicates...")

    groups = find_duplicate_groups(citations)

    stats = {
        'original_count': len(citations),
        'exact_doi_duplicates': sum(len(g) - 1 for g in groups['exact_doi']),
        'exact_url_duplicates': sum(len(g) - 1 for g in groups['exact_url']),
        'title_match_duplicates': sum(len(g) - 1 for g in groups['title_match']),
        'potential_duplicates': len(groups['potential']),
        'removed_count': 0,
        'final_count': 0
    }

    if verbose:
        print(f"\n🔍 Duplicate Analysis:")
        print(f"   • Exact DOI matches: {stats['exact_doi_duplicates']} duplicates")
        print(f"   • Exact URL matches: {stats['exact_url_duplicates']} duplicates")
        print(f"   • Title similarity (>90%): {stats['title_match_duplicates']} duplicates")
        print(f"   • Potential (70-90%): {stats['potential_duplicates']} pairs")

    if strategy == 'manual':
        return citations, {**stats, 'duplicate_groups': groups}

    # Build set of IDs to remove
    ids_to_remove = set()

    def select_best_citation(group: List[Dict]) -> Dict:
        """Select best citation from duplicate group."""
        if strategy == 'keep_first':
            # Sort by ID (cite_001, cite_002, etc.) and keep first
            return sorted(group, key=lambda c: safe_get(c, 'id'))[0]
        elif strategy == 'keep_best':
            # Score by metadata completeness
            def score(c):
                return sum([
                    bool(safe_get(c, 'doi')),
                    bool(safe_get(c, 'url')),
                    bool(safe_get(c, 'authors')),
                    bool(safe_get(c, 'year')),
                    bool(safe_get(c, 'journal')),
                    bool(safe_get(c, 'title')) and len(safe_get(c, 'title', '')) > 10,
                    safe_get(c, 'api_source') != 'Gemini Grounded',  # Prefer academic sources
                ])
            return max(group, key=score)
        else:
            return group[0]

    # Process each duplicate group
    for group_type in ['exact_doi', 'exact_url', 'title_match']:
        for group in groups[group_type]:
            # Keep best citation
            keep = select_best_citation(group)

            # Mark others for removal
            for c in group:
                if safe_get(c, 'id') != safe_get(keep, 'id'):
                    ids_to_remove.add(safe_get(c, 'id'))

                    if verbose:
                        print(f"\n❌ Removing duplicate: {safe_get(c, 'id')}")
                        print(f"   Title: {safe_get(c, 'title', 'N/A')[:60]}...")
                        print(f"   Reason: Duplicate of {safe_get(keep, 'id')} ({group_type})")

    # Create deduplicated list
    deduplicated = [c for c in citations if safe_get(c, 'id') not in ids_to_remove]

    stats['removed_count'] = len(ids_to_remove)
    stats['final_count'] = len(deduplicated)

    if verbose:
        print(f"\n✅ Deduplication complete!")
        print(f"   • Original: {stats['original_count']} citations")
        print(f"   • Removed: {stats['removed_count']} duplicates")
        print(f"   • Final: {stats['final_count']} unique citations")

    return deduplicated, stats


def deduplicate_citation_database(
    database_path: str,
    output_path: Optional[str] = None,
    strategy: str = 'keep_best',
    verbose: bool = False
) -> Dict:
    """
    Deduplicate citations in a citation database JSON file.

    Args:
        database_path: Path to citation_database.json
        output_path: Path to save deduplicated database (None = overwrite original)
        strategy: Deduplication strategy ('keep_first', 'keep_best', 'manual')
        verbose: Print detailed information

    Returns:
        Statistics dictionary
    """
    import json
    from pathlib import Path

    db_path = Path(database_path)

    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {database_path}")

    # Load database
    with open(db_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            import logging
            logging.getLogger(__name__).warning(f"Invalid JSON in {database_path}: {e}")
            return {'original_count': 0, 'final_count': 0, 'removed_count': 0}

    citations = data.get('citations', [])

    # Deduplicate
    deduplicated, stats = deduplicate_citations(citations, strategy=strategy, verbose=verbose)

    # Update database
    data['citations'] = deduplicated
    if 'metadata' in data:
        data['metadata']['total_citations'] = len(deduplicated)
        data['metadata']['deduplication_applied'] = True
        data['metadata']['deduplication_strategy'] = strategy

    # Save
    if output_path is None:
        output_path = db_path

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    if verbose:
        print(f"\n💾 Saved deduplicated database to: {output_path}")

    return stats


if __name__ == '__main__':
    import sys
    import argparse

    parser = argparse.ArgumentParser(description='Deduplicate citations in a citation database')
    parser.add_argument('database', help='Path to citation_database.json')
    parser.add_argument('-o', '--output', help='Output path (default: overwrite original)')
    parser.add_argument('-s', '--strategy', choices=['keep_first', 'keep_best', 'manual'],
                       default='keep_best', help='Deduplication strategy')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')

    args = parser.parse_args()

    stats = deduplicate_citation_database(
        args.database,
        output_path=args.output,
        strategy=args.strategy,
        verbose=args.verbose
    )

    print(f"\n📊 Summary:")
    print(f"   Original: {stats['original_count']} citations")
    print(f"   Removed: {stats['removed_count']} duplicates")
    print(f"   Final: {stats['final_count']} unique citations")
