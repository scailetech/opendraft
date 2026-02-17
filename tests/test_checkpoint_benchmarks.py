#!/usr/bin/env python3
"""
Performance benchmarks for checkpoint save/load/restore operations.

These tests measure timing and memory characteristics of the checkpoint
system under various context sizes, ensuring acceptable performance
for production use.

Performance Targets:
- Small context (research paper): save < 50ms, load < 20ms
- Medium context (master thesis): save < 100ms, load < 50ms
- Large context (PhD dissertation): save < 500ms, load < 200ms
"""

import time
import json
import pytest
import statistics
from pathlib import Path
from typing import List, Tuple

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.checkpoint import (
    save_checkpoint,
    load_checkpoint,
    restore_context,
)
from utils.citation_database import Citation
from phases.context import DraftContext


def _time_operation(func, *args, **kwargs) -> Tuple[float, any]:
    """Time a function and return (elapsed_ms, result)."""
    start = time.perf_counter()
    result = func(*args, **kwargs)
    elapsed = (time.perf_counter() - start) * 1000  # ms
    return elapsed, result


def _create_context_with_size(
    academic_level: str,
    word_multiplier: int = 1,
    citation_count: int = 10,
) -> DraftContext:
    """Create a DraftContext with specified content size."""
    ctx = DraftContext()
    ctx.topic = f"Benchmark Test Topic - {academic_level}"
    ctx.language = "en"
    ctx.academic_level = academic_level
    ctx.citation_style = "apa"
    ctx.skip_validation = True
    ctx.verbose = False

    # Academic metadata
    ctx.author_name = "Test Author"
    ctx.institution = "Test University"
    ctx.department = "Computer Science"

    # Create content sized by multiplier
    base_paragraph = "This is academic content for benchmarking checkpoint performance. " * 10

    ctx.scout_output = base_paragraph * word_multiplier
    ctx.scribe_output = base_paragraph * word_multiplier
    ctx.signal_output = base_paragraph * (word_multiplier // 2 or 1)
    ctx.architect_output = base_paragraph * word_multiplier
    ctx.formatter_output = base_paragraph * word_multiplier
    ctx.intro_output = base_paragraph * (word_multiplier * 2)
    ctx.lit_review_output = base_paragraph * (word_multiplier * 3)
    ctx.methodology_output = base_paragraph * (word_multiplier * 2)
    ctx.results_output = base_paragraph * (word_multiplier * 3)
    ctx.discussion_output = base_paragraph * (word_multiplier * 2)
    ctx.body_output = base_paragraph * (word_multiplier * 5)
    ctx.conclusion_output = base_paragraph * word_multiplier
    ctx.citation_summary = f"{citation_count} citations organized by theme"

    # Add citations
    ctx.scout_result = {
        "citations": [
            Citation(
                citation_id=f"cite_{i:03d}",
                authors=[f"Author{i}, A.", f"Coauthor{i}, B."],
                year=2020 + (i % 5),
                title=f"Paper Title {i}: A Study of Topic {i} with Comprehensive Analysis",
                source_type="journal",
                journal=f"Journal of Research {i}",
                doi=f"10.1234/paper{i}",
                url=f"https://example.com/paper{i}",
                abstract="This is an abstract. " * 20,
            )
            for i in range(1, citation_count + 1)
        ]
    }

    return ctx


class TestSaveBenchmarks:
    """Benchmark checkpoint save performance."""

    def test_save_small_context(self, tmp_path):
        """Benchmark: Save small research paper context (< 50ms)."""
        ctx = _create_context_with_size("research_paper", word_multiplier=1, citation_count=10)
        ctx.folders = {'root': tmp_path}

        # Warm up
        save_checkpoint(ctx, "compose", tmp_path)

        # Benchmark
        times = []
        for _ in range(10):
            elapsed, _ = _time_operation(save_checkpoint, ctx, "compose", tmp_path)
            times.append(elapsed)

        avg_time = statistics.mean(times)
        p95_time = sorted(times)[int(len(times) * 0.95)]

        assert avg_time < 50, f"Small context save too slow: {avg_time:.1f}ms (target: <50ms)"
        assert p95_time < 100, f"P95 save too slow: {p95_time:.1f}ms (target: <100ms)"

        print(f"\nSmall context save: avg={avg_time:.1f}ms, p95={p95_time:.1f}ms")

    def test_save_medium_context(self, tmp_path):
        """Benchmark: Save medium master thesis context (< 100ms)."""
        ctx = _create_context_with_size("master", word_multiplier=5, citation_count=50)
        ctx.folders = {'root': tmp_path}

        # Benchmark
        times = []
        for _ in range(5):
            elapsed, _ = _time_operation(save_checkpoint, ctx, "compose", tmp_path)
            times.append(elapsed)

        avg_time = statistics.mean(times)
        p95_time = max(times)  # With 5 samples, use max

        assert avg_time < 100, f"Medium context save too slow: {avg_time:.1f}ms (target: <100ms)"
        assert p95_time < 200, f"P95 save too slow: {p95_time:.1f}ms (target: <200ms)"

        print(f"\nMedium context save: avg={avg_time:.1f}ms, p95={p95_time:.1f}ms")

    def test_save_large_context(self, tmp_path):
        """Benchmark: Save large PhD dissertation context (< 500ms)."""
        ctx = _create_context_with_size("phd", word_multiplier=20, citation_count=150)
        ctx.folders = {'root': tmp_path}

        # Benchmark
        times = []
        for _ in range(3):
            elapsed, _ = _time_operation(save_checkpoint, ctx, "compose", tmp_path)
            times.append(elapsed)

        avg_time = statistics.mean(times)
        max_time = max(times)

        assert avg_time < 500, f"Large context save too slow: {avg_time:.1f}ms (target: <500ms)"
        assert max_time < 1000, f"Max save too slow: {max_time:.1f}ms (target: <1000ms)"

        print(f"\nLarge context save: avg={avg_time:.1f}ms, max={max_time:.1f}ms")


class TestLoadBenchmarks:
    """Benchmark checkpoint load performance."""

    def test_load_small_context(self, tmp_path):
        """Benchmark: Load small research paper context (< 20ms)."""
        ctx = _create_context_with_size("research_paper", word_multiplier=1, citation_count=10)
        ctx.folders = {'root': tmp_path}
        save_checkpoint(ctx, "compose", tmp_path)

        checkpoint_path = tmp_path / "checkpoint.json"

        # Benchmark
        times = []
        for _ in range(10):
            elapsed, _ = _time_operation(load_checkpoint, checkpoint_path)
            times.append(elapsed)

        avg_time = statistics.mean(times)
        p95_time = sorted(times)[int(len(times) * 0.95)]

        assert avg_time < 20, f"Small context load too slow: {avg_time:.1f}ms (target: <20ms)"
        assert p95_time < 50, f"P95 load too slow: {p95_time:.1f}ms (target: <50ms)"

        print(f"\nSmall context load: avg={avg_time:.1f}ms, p95={p95_time:.1f}ms")

    def test_load_medium_context(self, tmp_path):
        """Benchmark: Load medium master thesis context (< 50ms)."""
        ctx = _create_context_with_size("master", word_multiplier=5, citation_count=50)
        ctx.folders = {'root': tmp_path}
        save_checkpoint(ctx, "compose", tmp_path)

        checkpoint_path = tmp_path / "checkpoint.json"

        # Benchmark
        times = []
        for _ in range(5):
            elapsed, _ = _time_operation(load_checkpoint, checkpoint_path)
            times.append(elapsed)

        avg_time = statistics.mean(times)
        p95_time = max(times)

        assert avg_time < 50, f"Medium context load too slow: {avg_time:.1f}ms (target: <50ms)"
        assert p95_time < 100, f"P95 load too slow: {p95_time:.1f}ms (target: <100ms)"

        print(f"\nMedium context load: avg={avg_time:.1f}ms, p95={p95_time:.1f}ms")

    def test_load_large_context(self, tmp_path):
        """Benchmark: Load large PhD dissertation context (< 200ms)."""
        ctx = _create_context_with_size("phd", word_multiplier=20, citation_count=150)
        ctx.folders = {'root': tmp_path}
        save_checkpoint(ctx, "compose", tmp_path)

        checkpoint_path = tmp_path / "checkpoint.json"

        # Benchmark
        times = []
        for _ in range(3):
            elapsed, _ = _time_operation(load_checkpoint, checkpoint_path)
            times.append(elapsed)

        avg_time = statistics.mean(times)
        max_time = max(times)

        assert avg_time < 200, f"Large context load too slow: {avg_time:.1f}ms (target: <200ms)"
        assert max_time < 500, f"Max load too slow: {max_time:.1f}ms (target: <500ms)"

        print(f"\nLarge context load: avg={avg_time:.1f}ms, max={max_time:.1f}ms")


class TestRestoreBenchmarks:
    """Benchmark checkpoint restore performance."""

    def test_restore_small_context(self, tmp_path):
        """Benchmark: Restore small context (< 10ms)."""
        ctx = _create_context_with_size("research_paper", word_multiplier=1, citation_count=10)
        ctx.folders = {'root': tmp_path}
        save_checkpoint(ctx, "compose", tmp_path)

        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        # Benchmark
        times = []
        for _ in range(10):
            new_ctx = DraftContext()
            elapsed, _ = _time_operation(restore_context, new_ctx, data)
            times.append(elapsed)

        avg_time = statistics.mean(times)

        assert avg_time < 10, f"Small restore too slow: {avg_time:.1f}ms (target: <10ms)"

        print(f"\nSmall context restore: avg={avg_time:.1f}ms")

    def test_restore_large_context(self, tmp_path):
        """Benchmark: Restore large context (< 50ms)."""
        ctx = _create_context_with_size("phd", word_multiplier=20, citation_count=150)
        ctx.folders = {'root': tmp_path}
        save_checkpoint(ctx, "compose", tmp_path)

        data, _ = load_checkpoint(tmp_path / "checkpoint.json")

        # Benchmark
        times = []
        for _ in range(5):
            new_ctx = DraftContext()
            elapsed, _ = _time_operation(restore_context, new_ctx, data)
            times.append(elapsed)

        avg_time = statistics.mean(times)

        assert avg_time < 50, f"Large restore too slow: {avg_time:.1f}ms (target: <50ms)"

        print(f"\nLarge context restore: avg={avg_time:.1f}ms")


class TestFileSizeBenchmarks:
    """Benchmark checkpoint file sizes."""

    def test_file_size_small(self, tmp_path):
        """Verify small context checkpoint file size."""
        ctx = _create_context_with_size("research_paper", word_multiplier=1, citation_count=10)
        ctx.folders = {'root': tmp_path}
        save_checkpoint(ctx, "compose", tmp_path)

        size_kb = (tmp_path / "checkpoint.json").stat().st_size / 1024

        # Small context should be < 100KB
        assert size_kb < 100, f"Small checkpoint too large: {size_kb:.1f}KB (target: <100KB)"

        print(f"\nSmall context file size: {size_kb:.1f}KB")

    def test_file_size_medium(self, tmp_path):
        """Verify medium context checkpoint file size."""
        ctx = _create_context_with_size("master", word_multiplier=5, citation_count=50)
        ctx.folders = {'root': tmp_path}
        save_checkpoint(ctx, "compose", tmp_path)

        size_kb = (tmp_path / "checkpoint.json").stat().st_size / 1024

        # Medium context should be < 500KB
        assert size_kb < 500, f"Medium checkpoint too large: {size_kb:.1f}KB (target: <500KB)"

        print(f"\nMedium context file size: {size_kb:.1f}KB")

    def test_file_size_large(self, tmp_path):
        """Verify large context checkpoint file size."""
        ctx = _create_context_with_size("phd", word_multiplier=20, citation_count=150)
        ctx.folders = {'root': tmp_path}
        save_checkpoint(ctx, "compose", tmp_path)

        size_kb = (tmp_path / "checkpoint.json").stat().st_size / 1024

        # Large context should be < 5MB
        assert size_kb < 5000, f"Large checkpoint too large: {size_kb:.1f}KB (target: <5000KB)"

        print(f"\nLarge context file size: {size_kb:.1f}KB")


class TestRoundtripBenchmarks:
    """Benchmark full save-load-restore cycle."""

    def test_full_roundtrip_small(self, tmp_path):
        """Benchmark: Full roundtrip for small context (< 80ms)."""
        ctx = _create_context_with_size("research_paper", word_multiplier=1, citation_count=10)
        ctx.folders = {'root': tmp_path}

        # Benchmark full cycle
        times = []
        for _ in range(5):
            start = time.perf_counter()

            save_checkpoint(ctx, "compose", tmp_path)
            data, _ = load_checkpoint(tmp_path / "checkpoint.json")
            new_ctx = DraftContext()
            restore_context(new_ctx, data)

            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)

        avg_time = statistics.mean(times)

        assert avg_time < 80, f"Small roundtrip too slow: {avg_time:.1f}ms (target: <80ms)"

        print(f"\nSmall roundtrip: avg={avg_time:.1f}ms")

    def test_full_roundtrip_large(self, tmp_path):
        """Benchmark: Full roundtrip for large context (< 750ms)."""
        ctx = _create_context_with_size("phd", word_multiplier=20, citation_count=150)
        ctx.folders = {'root': tmp_path}

        # Benchmark full cycle
        times = []
        for _ in range(3):
            start = time.perf_counter()

            save_checkpoint(ctx, "compose", tmp_path)
            data, _ = load_checkpoint(tmp_path / "checkpoint.json")
            new_ctx = DraftContext()
            restore_context(new_ctx, data)

            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)

        avg_time = statistics.mean(times)

        assert avg_time < 750, f"Large roundtrip too slow: {avg_time:.1f}ms (target: <750ms)"

        print(f"\nLarge roundtrip: avg={avg_time:.1f}ms")

    def test_data_integrity_after_roundtrip(self, tmp_path):
        """Verify data integrity is preserved after roundtrip."""
        ctx = _create_context_with_size("master", word_multiplier=5, citation_count=50)
        ctx.folders = {'root': tmp_path}

        # Save
        save_checkpoint(ctx, "compose", tmp_path)

        # Load
        data, phase = load_checkpoint(tmp_path / "checkpoint.json")

        # Restore
        restored = DraftContext()
        restore_context(restored, data)

        # Verify integrity
        assert restored.topic == ctx.topic
        assert restored.academic_level == ctx.academic_level
        assert restored.scout_output == ctx.scout_output
        assert restored.body_output == ctx.body_output
        assert len(restored.scout_result["citations"]) == 50

        # Verify citation data
        for i, citation in enumerate(restored.scout_result["citations"]):
            original = ctx.scout_result["citations"][i]
            assert citation.id == original.id
            assert citation.authors == original.authors
            assert citation.year == original.year
            assert citation.title == original.title
