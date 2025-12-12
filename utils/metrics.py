#!/usr/bin/env python3
"""
ABOUTME: Production-grade monitoring and metrics system for draft pipeline
ABOUTME: Provides structured JSONL logging, success tracking, cost estimation, and performance analytics
"""

import json
import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Metric event types for structured logging."""
    AGENT_START = "agent_start"
    AGENT_COMPLETE = "agent_complete"
    AGENT_ERROR = "agent_error"
    API_CALL = "api_call"
    CACHE_HIT = "cache_hit"
    CACHE_MISS = "cache_miss"
    QUALITY_GATE = "quality_gate"
    CITATION_FOUND = "citation_found"
    CITATION_FAILED = "citation_failed"


class APISource(Enum):
    """API sources for cost tracking."""
    CROSSREF = "crossref"
    SEMANTIC_SCHOLAR = "semantic_scholar"
    GEMINI_GROUNDED = "gemini_grounded"
    GEMINI_LLM = "gemini_llm"


@dataclass
class MetricEvent:
    """
    Structured metric event for JSONL logging.

    Follows SOLID Single Responsibility Principle - immutable event record.
    """
    timestamp: str
    event_type: str
    component: str
    duration_ms: Optional[float] = None
    success: Optional[bool] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        """Serialize to JSONL format."""
        return json.dumps(asdict(self), ensure_ascii=False)


@dataclass
class APICallMetrics:
    """
    Track API call statistics and costs.

    Follows SOLID Single Responsibility - manages API call tracking only.
    """
    source: str
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    cache_hits: int = 0
    total_duration_ms: float = 0.0
    estimated_cost_usd: float = 0.0

    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        if self.total_calls == 0:
            return 0.0
        return (self.successful_calls / self.total_calls) * 100

    def avg_latency_ms(self) -> float:
        """Calculate average latency in milliseconds."""
        if self.successful_calls == 0:
            return 0.0
        return self.total_duration_ms / self.successful_calls


class MetricsCollector:
    """
    Central metrics collection and reporting system.

    Follows SOLID principles:
    - Single Responsibility: Metrics collection and aggregation
    - Open/Closed: Extensible via MetricEvent types
    - Dependency Inversion: Depends on abstractions (MetricEvent, APICallMetrics)

    Follows DRY: Reusable across all agents and API clients.
    """

    def __init__(
        self,
        output_file: Optional[Path] = None,
        enable_jsonl: bool = True,
        enable_console: bool = False
    ):
        """
        Initialize metrics collector.

        Args:
            output_file: Path to JSONL metrics file (default: .metrics.jsonl)
            enable_jsonl: Whether to write JSONL logs
            enable_console: Whether to log metrics to console
        """
        self.output_file = output_file or Path(".metrics.jsonl")
        self.enable_jsonl = enable_jsonl
        self.enable_console = enable_console

        # Metrics storage
        self.api_metrics: Dict[str, APICallMetrics] = {
            source.value: APICallMetrics(source=source.value)
            for source in APISource
        }
        self.events: List[MetricEvent] = []

        # Session tracking
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session_start = time.time()

        # Initialize JSONL file with session header
        if self.enable_jsonl:
            self._write_session_header()

    def _write_session_header(self) -> None:
        """Write session metadata to JSONL file."""
        try:
            with open(self.output_file, 'a', encoding='utf-8') as f:
                header_event = MetricEvent(
                    timestamp=datetime.now().isoformat(),
                    event_type="session_start",
                    component="metrics_collector",
                    metadata={
                        "session_id": self.session_id,
                        "started_at": datetime.now().isoformat()
                    }
                )
                f.write(header_event.to_json() + "\n")
            logger.debug(f"Metrics session started: {self.session_id}")
        except Exception as e:
            logger.error(f"Failed to write session header: {e}")

    def record_event(self, event: MetricEvent) -> None:
        """
        Record a metric event.

        Args:
            event: MetricEvent to record
        """
        self.events.append(event)

        # Write to JSONL
        if self.enable_jsonl:
            try:
                with open(self.output_file, 'a', encoding='utf-8') as f:
                    f.write(event.to_json() + "\n")
            except Exception as e:
                logger.error(f"Failed to write event to JSONL: {e}")

        # Log to console if enabled
        if self.enable_console:
            logger.info(f"METRIC: {event.event_type} | {event.component} | {event.metadata}")

    def track_api_call(
        self,
        source: str,
        success: bool,
        duration_ms: float,
        cached: bool = False,
        error: Optional[str] = None
    ) -> None:
        """
        Track an API call with automatic cost estimation.

        Args:
            source: API source (crossref, semantic_scholar, gemini_llm, etc.)
            success: Whether call succeeded
            duration_ms: Call duration in milliseconds
            cached: Whether result came from cache
            error: Error message if failed
        """
        metrics = self.api_metrics.get(source)
        if not metrics:
            logger.warning(f"Unknown API source: {source}")
            return

        # Update metrics
        metrics.total_calls += 1
        if success:
            metrics.successful_calls += 1
            metrics.total_duration_ms += duration_ms
        else:
            metrics.failed_calls += 1

        if cached:
            metrics.cache_hits += 1

        # Estimate cost (conservative estimates)
        cost_per_call = self._estimate_api_cost(source)
        if not cached:  # Only count cost if not cached
            metrics.estimated_cost_usd += cost_per_call

        # Record event
        event = MetricEvent(
            timestamp=datetime.now().isoformat(),
            event_type=MetricType.CACHE_HIT.value if cached else MetricType.API_CALL.value,
            component=f"api_{source}",
            duration_ms=duration_ms,
            success=success,
            error_message=error,
            metadata={
                "source": source,
                "cached": cached,
                "cost_usd": cost_per_call if not cached else 0.0
            }
        )
        self.record_event(event)

    def _estimate_api_cost(self, source: str) -> float:
        """
        Estimate API call cost in USD.

        Conservative estimates (subject to change):
        - Crossref: Free (but rate limited)
        - Semantic Scholar: Free (but rate limited)
        - Gemini Grounded: $0.00035 per request (Google Search grounding)
        - Gemini LLM: $0.00025 per request (Gemini 2.0 Flash input)

        Args:
            source: API source name

        Returns:
            Estimated cost in USD
        """
        cost_map = {
            "crossref": 0.0,  # Free
            "semantic_scholar": 0.0,  # Free
            "gemini_grounded": 0.00035,  # Google Search grounding cost
            "gemini_llm": 0.00025  # Gemini Flash (conservative estimate)
        }
        return cost_map.get(source, 0.0)

    def track_agent_execution(
        self,
        agent_name: str,
        success: bool,
        duration_ms: float,
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Track agent execution metrics.

        Args:
            agent_name: Name of the agent (Scout, Drafter, etc.)
            success: Whether execution succeeded
            duration_ms: Execution time in milliseconds
            error: Error message if failed
            metadata: Additional metadata (citations found, quality score, etc.)
        """
        event_type = MetricType.AGENT_COMPLETE.value if success else MetricType.AGENT_ERROR.value

        event = MetricEvent(
            timestamp=datetime.now().isoformat(),
            event_type=event_type,
            component=f"agent_{agent_name.lower()}",
            duration_ms=duration_ms,
            success=success,
            error_message=error,
            metadata=metadata or {}
        )
        self.record_event(event)

    def track_quality_gate(
        self,
        gate_name: str,
        passed: bool,
        actual_value: int,
        threshold: int,
        tier: Optional[str] = None
    ) -> None:
        """
        Track quality gate results.

        Args:
            gate_name: Name of quality gate (e.g., "citation_count")
            passed: Whether gate passed
            actual_value: Actual measured value
            threshold: Threshold value
            tier: Quality tier (excellent, acceptable, minimal)
        """
        event = MetricEvent(
            timestamp=datetime.now().isoformat(),
            event_type=MetricType.QUALITY_GATE.value,
            component="quality_assurance",
            success=passed,
            metadata={
                "gate": gate_name,
                "actual": actual_value,
                "threshold": threshold,
                "tier": tier,
                "passed": passed
            }
        )
        self.record_event(event)

    def get_summary(self) -> Dict[str, Any]:
        """
        Generate comprehensive metrics summary.

        Returns:
            Dict with aggregated metrics, costs, and performance data
        """
        session_duration_s = time.time() - self.session_start

        # Aggregate API metrics
        total_api_calls = sum(m.total_calls for m in self.api_metrics.values())
        total_successful = sum(m.successful_calls for m in self.api_metrics.values())
        total_cache_hits = sum(m.cache_hits for m in self.api_metrics.values())
        total_cost = sum(m.estimated_cost_usd for m in self.api_metrics.values())

        # Calculate cache hit rate
        cache_hit_rate = (total_cache_hits / total_api_calls * 100) if total_api_calls > 0 else 0.0

        # API success rate
        api_success_rate = (total_successful / total_api_calls * 100) if total_api_calls > 0 else 0.0

        # Build per-source breakdown
        api_breakdown = {}
        for source, metrics in self.api_metrics.items():
            if metrics.total_calls > 0:
                api_breakdown[source] = {
                    "total_calls": metrics.total_calls,
                    "successful": metrics.successful_calls,
                    "failed": metrics.failed_calls,
                    "cache_hits": metrics.cache_hits,
                    "success_rate_pct": metrics.success_rate(),
                    "avg_latency_ms": metrics.avg_latency_ms(),
                    "estimated_cost_usd": metrics.estimated_cost_usd
                }

        return {
            "session": {
                "session_id": self.session_id,
                "duration_seconds": session_duration_s,
                "events_recorded": len(self.events)
            },
            "api_calls": {
                "total": total_api_calls,
                "successful": total_successful,
                "failed": total_api_calls - total_successful,
                "success_rate_pct": api_success_rate,
                "cache_hits": total_cache_hits,
                "cache_hit_rate_pct": cache_hit_rate,
                "estimated_cost_usd": total_cost,
                "breakdown": api_breakdown
            },
            "performance": {
                "total_events": len(self.events),
                "session_duration_seconds": session_duration_s
            }
        }

    def print_summary(self) -> None:
        """Print human-readable metrics summary."""
        summary = self.get_summary()

        print("\n" + "=" * 80)
        print("📊 METRICS SUMMARY")
        print("=" * 80)
        print(f"\n⏱️  Session Duration: {summary['session']['duration_seconds']:.1f}s")
        print(f"📝 Events Recorded: {summary['session']['events_recorded']}")

        api = summary['api_calls']
        print(f"\n🌐 API Calls:")
        print(f"   Total: {api['total']}")
        print(f"   Successful: {api['successful']} ({api['success_rate_pct']:.1f}%)")
        print(f"   Cache Hits: {api['cache_hits']} ({api['cache_hit_rate_pct']:.1f}%)")
        print(f"   Estimated Cost: ${api['estimated_cost_usd']:.4f} USD")

        if api['breakdown']:
            print(f"\n📈 API Source Breakdown:")
            for source, metrics in api['breakdown'].items():
                print(f"   {source.upper()}:")
                print(f"      Calls: {metrics['total_calls']} ({metrics['success_rate_pct']:.1f}% success)")
                print(f"      Cache Hits: {metrics['cache_hits']}")
                print(f"      Avg Latency: {metrics['avg_latency_ms']:.1f}ms")
                print(f"      Cost: ${metrics['estimated_cost_usd']:.4f}")

        print("\n" + "=" * 80)
        print(f"💾 Full metrics saved to: {self.output_file}")
        print("=" * 80 + "\n")

    def close(self) -> None:
        """Close metrics session and write final summary."""
        if self.enable_jsonl:
            try:
                with open(self.output_file, 'a', encoding='utf-8') as f:
                    summary_event = MetricEvent(
                        timestamp=datetime.now().isoformat(),
                        event_type="session_end",
                        component="metrics_collector",
                        metadata=self.get_summary()
                    )
                    f.write(summary_event.to_json() + "\n")
                logger.info(f"Metrics session closed: {self.session_id}")
            except Exception as e:
                logger.error(f"Failed to write session summary: {e}")


# Singleton instance for global metrics collection
_global_metrics: Optional[MetricsCollector] = None


def get_metrics_collector(
    output_file: Optional[Path] = None,
    enable_jsonl: bool = True,
    enable_console: bool = False
) -> MetricsCollector:
    """
    Get or create global metrics collector instance (Singleton pattern).

    Args:
        output_file: JSONL output file path
        enable_jsonl: Enable JSONL logging
        enable_console: Enable console logging

    Returns:
        Global MetricsCollector instance
    """
    global _global_metrics

    if _global_metrics is None:
        _global_metrics = MetricsCollector(
            output_file=output_file,
            enable_jsonl=enable_jsonl,
            enable_console=enable_console
        )

    return _global_metrics


if __name__ == '__main__':
    # Test metrics collector
    print("Testing MetricsCollector...")

    collector = MetricsCollector(
        output_file=Path(".test_metrics.jsonl"),
        enable_jsonl=True,
        enable_console=True
    )

    # Simulate some API calls
    collector.track_api_call(
        source="crossref",
        success=True,
        duration_ms=150.5,
        cached=False
    )

    collector.track_api_call(
        source="semantic_scholar",
        success=True,
        duration_ms=200.3,
        cached=False
    )

    collector.track_api_call(
        source="crossref",
        success=True,
        duration_ms=50.1,
        cached=True  # Cache hit
    )

    collector.track_api_call(
        source="gemini_llm",
        success=False,
        duration_ms=500.0,
        error="Rate limit exceeded"
    )

    # Track agent execution
    collector.track_agent_execution(
        agent_name="Scout",
        success=True,
        duration_ms=5000.0,
        metadata={"citations_found": 47}
    )

    # Track quality gate
    collector.track_quality_gate(
        gate_name="citation_count",
        passed=True,
        actual_value=47,
        threshold=50,
        tier="acceptable"
    )

    # Print summary
    collector.print_summary()

    # Close session
    collector.close()

    print("\n✅ Metrics test complete")
    print(f"📊 Check .test_metrics.jsonl for JSONL output")
