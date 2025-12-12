#!/usr/bin/env python3
"""
Test Citation Research - Debug why citations aren't being found
"""
import sys
import os
from pathlib import Path

# Add paths
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))

from utils.agent_runner import research_citations_via_api
import logging

# Enable verbose logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

print('='*80)
print('CITATION RESEARCH DEBUG TEST')
print('='*80)

# Test with a simple, well-known topic
test_topic = "Deep Learning Neural Networks"

print(f'\nTest Topic: {test_topic}')
print(f'Target: 25 citations minimum')
print('\n' + '='*80)
print('TESTING CITATION RESEARCH...')
print('='*80 + '\n')

try:
    # Call the research function with verbose logging - DEEP RESEARCH MODE
    import time
    start_time = time.time()

    result = research_citations_via_api(
        research_topics=[],  # Empty - deep research generates its own topics
        output_path=Path('/tmp/test_citations_deep.md'),
        target_minimum=25,
        verbose=True,  # Enable verbose output
        use_deep_research=True,  # TESTING DEEP RESEARCH PERFORMANCE
        topic=test_topic,
        scope=test_topic
    )

    elapsed = time.time() - start_time

    print('\n' + '='*80)
    print('DEEP RESEARCH MODE - RESULTS:')
    print('='*80)
    mins = int(elapsed // 60)
    secs = int(elapsed % 60)
    print(f'⏱️  TIME: {mins}m {secs}s ({elapsed:.1f} seconds)')
    print(f'Citations found: {len(result.get("citations", []))}')
    print(f'Failed topics: {len(result.get("failed_topics", []))}')

    if result.get('citations'):
        print(f'\nFirst 3 citations:')
        for i, cit in enumerate(result['citations'][:3], 1):
            print(f'\n{i}. {cit.title}')
            print(f'   Authors: {", ".join(cit.authors[:2])}...')
            print(f'   Year: {cit.year}')
            print(f'   DOI: {cit.doi}')

    if result.get('failed_topics'):
        print(f'\nFailed topics:')
        for topic in result['failed_topics']:
            print(f'  - {topic}')

except Exception as e:
    print(f'\n❌ ERROR: {e}')
    import traceback
    traceback.print_exc()
