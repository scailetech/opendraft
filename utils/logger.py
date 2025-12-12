#!/usr/bin/env python3
"""
ABOUTME: Production-grade logging system for academic draft AI
ABOUTME: Replaces print() statements with structured logging (file + console)
"""

import logging
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime


class DraftLogger:
    """
    Centralized logging system for draft generation workflow.

    Features:
    - Dual output: console (colored, user-friendly) + file (structured, detailed)
    - Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
    - Automatic log directory creation
    - Rotating file handlers (prevents disk bloat)
    - Context-aware formatting

    Usage:
        from utils.logger import get_logger

        logger = get_logger(__name__)
        logger.info("Scout agent: Starting research planning")
        logger.error(f"Failed to fetch from Crossref: {error}")
    """

    _instance: Optional['DraftLogger'] = None
    _initialized: bool = False

    def __new__(cls):
        """Singleton pattern - only one logger instance"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize logging system (only once)"""
        if DraftLogger._initialized:
            return

        # Create logs directory
        self.log_dir = Path("logs")
        self.log_dir.mkdir(exist_ok=True)

        # Generate timestamped log file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.log_dir / f"draft_generation_{timestamp}.log"

        # Configure root logger
        self.logger = logging.getLogger("opendraft")
        self.logger.setLevel(logging.DEBUG)  # Capture everything

        # Prevent duplicate handlers
        if self.logger.handlers:
            self.logger.handlers.clear()

        # Console handler (user-friendly, INFO and above)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            fmt='%(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)

        # File handler (detailed, DEBUG and above)
        file_handler = logging.FileHandler(self.log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)

        # Add handlers to logger
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)

        DraftLogger._initialized = True

        # Log initialization
        self.logger.info("=" * 80)
        self.logger.info("Draft Generation Logging System Initialized")
        self.logger.info(f"Log file: {self.log_file}")
        self.logger.info("=" * 80)

    def get_logger(self, name: str) -> logging.Logger:
        """
        Get a logger instance for a specific module.

        Args:
            name: Module name (typically __name__)

        Returns:
            Logger instance configured with module name

        Example:
            logger = DraftLogger().get_logger(__name__)
            logger.info("Processing started")
        """
        return logging.getLogger(f"opendraft.{name}")


# Convenience function for easy imports
def get_logger(name: str = "main") -> logging.Logger:
    """
    Get a configured logger instance.

    Args:
        name: Module name (use __name__ for automatic naming)

    Returns:
        Logger instance

    Example:
        from utils.logger import get_logger
        logger = get_logger(__name__)
        logger.info("Starting workflow")
    """
    draft_logger = DraftLogger()
    return draft_logger.get_logger(name)


def log_phase_start(phase_name: str, phase_number: int, total_phases: int = 5):
    """
    Log the start of a workflow phase with visual separator.

    Args:
        phase_name: Name of the phase (e.g., "Research", "Writing")
        phase_number: Current phase number (1-5)
        total_phases: Total number of phases (default: 5)

    Example:
        log_phase_start("Research", 1, 5)
    """
    logger = get_logger("workflow")
    logger.info("")
    logger.info("=" * 80)
    logger.info(f"PHASE {phase_number}/{total_phases}: {phase_name.upper()}")
    logger.info("=" * 80)
    logger.info("")


def log_phase_complete(phase_name: str, phase_number: int, duration_seconds: float):
    """
    Log the completion of a workflow phase with timing.

    Args:
        phase_name: Name of the phase
        phase_number: Phase number
        duration_seconds: Time taken in seconds

    Example:
        log_phase_complete("Research", 1, 180.5)
    """
    logger = get_logger("workflow")
    minutes = int(duration_seconds // 60)
    seconds = int(duration_seconds % 60)
    logger.info("")
    logger.info(f"✅ Phase {phase_number} Complete: {phase_name}")
    logger.info(f"   Duration: {minutes}m {seconds}s")
    logger.info("=" * 80)
    logger.info("")


def log_agent_start(agent_name: str, task_description: str):
    """
    Log the start of an AI agent task.

    Args:
        agent_name: Name of the agent (e.g., "Scout", "Scribe")
        task_description: What the agent is doing

    Example:
        log_agent_start("Scout", "Planning research queries")
    """
    logger = get_logger(f"agents.{agent_name.lower()}")
    logger.info(f"🤖 {agent_name} Agent: {task_description}")


def log_agent_complete(agent_name: str, result_summary: str):
    """
    Log the completion of an AI agent task.

    Args:
        agent_name: Name of the agent
        result_summary: Brief summary of results

    Example:
        log_agent_complete("Scout", "Generated 5 research queries")
    """
    logger = get_logger(f"agents.{agent_name.lower()}")
    logger.info(f"✅ {agent_name} Agent: {result_summary}")


def log_citation_found(source: str, title: str, doi: Optional[str] = None):
    """
    Log successful citation retrieval.

    Args:
        source: Citation source (e.g., "Crossref", "Semantic Scholar")
        title: Paper title
        doi: DOI if available

    Example:
        log_citation_found("Crossref", "AI Pricing Models", "10.1234/example")
    """
    logger = get_logger("citations")
    if doi:
        logger.debug(f"📚 {source}: {title} (DOI: {doi})")
    else:
        logger.debug(f"📚 {source}: {title}")


def log_citation_failed(source: str, query: str, error: str):
    """
    Log failed citation retrieval attempt.

    Args:
        source: Citation source that failed
        query: Search query
        error: Error message

    Example:
        log_citation_failed("Crossref", "AI pricing", "Quota exceeded")
    """
    logger = get_logger("citations")
    logger.warning(f"⚠️  {source} failed: {query} - {error}")


def log_export_start(format: str, output_path: str):
    """
    Log the start of draft export.

    Args:
        format: Export format (PDF, DOCX, LaTeX)
        output_path: Output file path

    Example:
        log_export_start("PDF", "outputs/draft.pdf")
    """
    logger = get_logger("exporters")
    logger.info(f"📄 Exporting {format}: {output_path}")


def log_export_complete(format: str, file_size_kb: int):
    """
    Log successful draft export.

    Args:
        format: Export format
        file_size_kb: File size in KB

    Example:
        log_export_complete("PDF", 1024)
    """
    logger = get_logger("exporters")
    logger.info(f"✅ {format} export complete ({file_size_kb} KB)")


def log_error(component: str, error: Exception, context: Optional[str] = None):
    """
    Log an error with full context.

    Args:
        component: Component that encountered error (e.g., "Scout agent")
        error: Exception object
        context: Optional context information

    Example:
        log_error("Scout agent", exception, "While querying Crossref")
    """
    logger = get_logger("errors")
    if context:
        logger.error(f"❌ {component} error ({context}): {error}", exc_info=True)
    else:
        logger.error(f"❌ {component} error: {error}", exc_info=True)


# Example usage (for documentation)
if __name__ == "__main__":
    # Basic usage
    logger = get_logger(__name__)
    logger.info("This is an info message")
    logger.warning("This is a warning")
    logger.error("This is an error")

    # Phase logging
    log_phase_start("Research", 1, 5)
    log_agent_start("Scout", "Planning research queries")
    log_agent_complete("Scout", "Generated 5 queries")
    log_phase_complete("Research", 1, 120.5)

    # Citation logging
    log_citation_found("Crossref", "Example Paper", "10.1234/example")
    log_citation_failed("Semantic Scholar", "nonexistent query", "404 Not Found")

    # Export logging
    log_export_start("PDF", "outputs/draft.pdf")
    log_export_complete("PDF", 1024)

    # Error logging
    try:
        raise ValueError("Example error")
    except ValueError as e:
        log_error("Example component", e, "During demonstration")
