#!/usr/bin/env python3
"""
ABOUTME: Citation quality filter - removes low-quality citations from database
ABOUTME: Uses enhanced citation validator to filter out invalid/junk citations before compilation
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Add parent directory to path for imports
if __name__ == '__main__':
    sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.citation_validator import CitationValidator, ValidationIssue


class CitationQualityFilter:
    """Filters low-quality citations from citation database."""

    def __init__(self, strict_mode: bool = True):
        """
        Initialize filter.

        Args:
            strict_mode: If True, filter all critical issues. If False, only filter worst offenders.
        """
        self.validator = CitationValidator()
        self.strict_mode = strict_mode

    def should_filter_citation(self, issues: List[ValidationIssue]) -> Tuple[bool, str]:
        """
        Determine if a citation should be filtered out.

        Args:
            issues: List of validation issues for this citation

        Returns:
            Tuple of (should_filter: bool, reason: str)
        """
        if not issues:
            return False, ""

        # Critical issues that ALWAYS result in filtering
        critical_filters = [
            'invalid_url',         # HTTP 403, 404, 500 errors
            'invalid_metadata',    # Domain as author/title, error keywords
        ]

        # In strict mode, filter ALL critical issues
        if self.strict_mode:
            critical = [i for i in issues if i.severity == 'critical']
            if critical:
                reasons = [i.message for i in critical[:3]]  # Show first 3
                return True, "; ".join(reasons)

        # In non-strict mode, only filter specific critical issues
        for issue in issues:
            if issue.issue_type in critical_filters:
                return True, issue.message

        return False, ""

    def filter_database(
        self,
        database_path: Path,
        output_path: Path = None
    ) -> Dict:
        """
        Filter low-quality citations from database.

        Args:
            database_path: Path to citation_database.json
            output_path: Path to save filtered database (default: same as input)

        Returns:
            Dict with filtering statistics
        """
        # Load database
        with open(database_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                import logging
                logging.getLogger(__name__).warning(f"Invalid JSON in {database_path}: {e}")
                return {
                    'total_original': 0, 'total_filtered': 0,
                    'total_removed': 0, 'removal_reasons': {},
                }

        original_count = len(data.get('citations', []))
        citations = data.get('citations', [])

        print(f"🔍 Filtering {original_count} citations from {database_path.name}...")

        # Validate and filter
        filtered_citations = []
        removed_citations = []
        filter_stats = {
            'total_original': original_count,
            'total_filtered': 0,
            'total_removed': 0,
            'removal_reasons': {}
        }

        for citation in citations:
            issues = self.validator.validate_citation(citation)
            should_filter, reason = self.should_filter_citation(issues)

            if should_filter:
                removed_citations.append({
                    'citation': citation,
                    'reason': reason,
                    'issues': len(issues)
                })
                filter_stats['total_removed'] += 1

                # Track removal reasons
                issue_type = issues[0].issue_type if issues else 'unknown'
                filter_stats['removal_reasons'][issue_type] = \
                    filter_stats['removal_reasons'].get(issue_type, 0) + 1
            else:
                filtered_citations.append(citation)

        filter_stats['total_filtered'] = len(filtered_citations)

        # Update database with filtered citations
        data['citations'] = filtered_citations

        # CRITICAL: Update metadata citation count to match filtered count
        # Field name MUST match CitationDatabase.to_dict() which uses "total_citations"
        if 'metadata' in data:
            data['metadata']['total_citations'] = len(filtered_citations)

        # Save filtered database
        if output_path is None:
            output_path = database_path

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Save removal report
        report_path = output_path.parent / f"{output_path.stem}_removal_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump({
                'stats': filter_stats,
                'removed_citations': removed_citations
            }, f, indent=2, ensure_ascii=False)

        return filter_stats

    def generate_report(self, stats: Dict, database_name: str) -> str:
        """
        Generate human-readable filtering report.

        Args:
            stats: Statistics from filter_database()
            database_name: Name of database for report

        Returns:
            Formatted report string
        """
        report = [f"\n{'='*80}"]
        report.append(f"CITATION QUALITY FILTER REPORT: {database_name}")
        report.append(f"{'='*80}\n")

        report.append(f"Original citations:  {stats['total_original']}")
        report.append(f"Filtered (kept):     {stats['total_filtered']} ✅")
        report.append(f"Removed (filtered):  {stats['total_removed']} ❌")

        if stats['total_original'] > 0:
            kept_pct = (stats['total_filtered'] / stats['total_original']) * 100
            removed_pct = (stats['total_removed'] / stats['total_original']) * 100
            report.append(f"\nRetention rate:      {kept_pct:.1f}%")
            report.append(f"Removal rate:        {removed_pct:.1f}%")

        if stats['removal_reasons']:
            report.append(f"\n--- Removal Breakdown ---")
            for reason, count in sorted(stats['removal_reasons'].items(),
                                       key=lambda x: x[1], reverse=True):
                report.append(f"  {reason:25s}: {count} citations")

        report.append(f"\n{'='*80}\n")

        return '\n'.join(report)


def main():
    """Main entry point for CLI filtering."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Filter low-quality citations from citation database'
    )
    parser.add_argument(
        'database',
        type=Path,
        help='Path to citation_database.json'
    )
    parser.add_argument(
        '--output',
        type=Path,
        help='Output path (default: overwrite input)'
    )
    parser.add_argument(
        '--lenient',
        action='store_true',
        help='Lenient mode (only filter worst offenders)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be filtered without modifying files'
    )

    args = parser.parse_args()

    if not args.database.exists():
        print(f"❌ Error: Database not found: {args.database}")
        return 1

    # Create filter
    filter_obj = CitationQualityFilter(strict_mode=not args.lenient)

    # Dry run: validate and show stats without filtering
    if args.dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")
        with open(args.database, 'r') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                print(f"Invalid JSON in {args.database}: {e}")
                return 1

        validator = CitationValidator()
        to_remove = 0

        for citation in data.get('citations', []):
            issues = validator.validate_citation(citation)
            should_filter, reason = filter_obj.should_filter_citation(issues)
            if should_filter:
                to_remove += 1

        print(f"Would remove: {to_remove}/{len(data.get('citations', []))} citations")
        return 0

    # Actual filtering
    stats = filter_obj.filter_database(args.database, args.output)
    report = filter_obj.generate_report(stats, args.database.name)

    print(report)

    if stats['total_removed'] > 0:
        print(f"💾 Filtered database saved to: {args.output or args.database}")
        print(f"📊 Removal report saved to: {(args.output or args.database).parent / f'{args.database.stem}_removal_report.json'}")

    return 0


if __name__ == '__main__':
    exit(main())
