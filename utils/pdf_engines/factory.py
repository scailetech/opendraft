#!/usr/bin/env python3
"""
ABOUTME: Factory pattern for PDF engine selection and management
ABOUTME: Provides automatic engine selection with fallback logic
"""

from pathlib import Path
from typing import List, Optional, Literal

from .base import PDFEngine, PDFGenerationOptions, EngineResult
from .libreoffice_engine import LibreOfficeEngine
from .pandoc_engine import PandocLatexEngine
from utils.exceptions import PDFExportError, ConfigurationError

# WeasyPrint is optional - it requires system libraries (libgobject, pango, etc.)
try:
    from .weasyprint_engine import WeasyPrintEngine
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False
    WeasyPrintEngine = None


class PDFEngineFactory:
    """
    Factory for creating and managing PDF generation engines.

    Implements the Factory pattern to provide:
    - Automatic engine selection based on availability
    - Priority-based fallback logic
    - Type-safe engine creation

    Follows SOLID principles:
    - Single Responsibility: Manages engine lifecycle
    - Open/Closed: Easy to add new engines
    - Dependency Inversion: Returns abstract PDFEngine interface
    """

    # Registry of all available engine classes
    # WeasyPrint DISABLED - always use Pandoc/XeLaTeX for professional quality
    _ENGINE_CLASSES = [
        PandocLatexEngine,
        # LibreOfficeEngine,  # Disabled - prefer Pandoc
        # WeasyPrintEngine,   # DISABLED - poor quality, never use
    ]

    @classmethod
    def create(
        cls,
        engine_type: Literal['auto', 'libreoffice', 'pandoc', 'weasyprint'] = 'auto'
    ) -> Optional[PDFEngine]:
        """
        Create a PDF engine instance.

        Args:
            engine_type: Engine type to create ('auto' for automatic selection)

        Returns:
            PDFEngine instance, or None if no suitable engine found

        Raises:
            ValueError: If specific engine requested but not available
        """
        if engine_type == 'auto':
            return cls._auto_select()

        # Map engine type to class
        # WeasyPrint REMOVED - only allow Pandoc
        engine_map = {
            'pandoc': PandocLatexEngine,
            # 'libreoffice': LibreOfficeEngine,  # Disabled
            # 'weasyprint': WeasyPrintEngine,    # DISABLED - never use
        }

        engine_class = engine_map.get(engine_type)
        if not engine_class:
            raise PDFExportError(
                engine=engine_type,
                reason=f"Unknown engine type: {engine_type}",
                recovery_hint="Use 'auto', 'libreoffice', 'pandoc', or 'weasyprint'"
            )

        engine = engine_class()
        if not engine.is_available():
            raise PDFExportError(
                engine=engine.get_name(),
                reason="Engine not available - required dependencies missing",
                recovery_hint="Install dependencies or use 'auto' to try alternative engines"
            )

        return engine

    @classmethod
    def _auto_select(cls) -> Optional[PDFEngine]:
        """
        Automatically select best available engine.

        Selection criteria:
        1. Check availability
        2. Sort by priority (higher = better)
        3. Return highest priority available engine

        Returns:
            PDFEngine instance, or None if no engine available
        """
        available_engines = []

        for engine_class in cls._ENGINE_CLASSES:
            engine = engine_class()
            if engine.is_available():
                available_engines.append(engine)

        if not available_engines:
            return None

        # Sort by priority (descending)
        available_engines.sort(key=lambda e: e.get_priority(), reverse=True)

        # Return highest priority engine
        return available_engines[0]

    @classmethod
    def generate_with_fallback(
        cls,
        md_file: Path,
        output_pdf: Path,
        options: Optional[PDFGenerationOptions] = None,
        preferred_engine: Optional[str] = None
    ) -> EngineResult:
        """
        Generate PDF with automatic fallback to other engines on failure.

        Tries engines in priority order until one succeeds or all fail.

        Args:
            md_file: Input markdown file
            output_pdf: Output PDF path
            options: Generation options (uses defaults if None)
            preferred_engine: Preferred engine name (None for auto)

        Returns:
            EngineResult from successful engine, or final failure result
        """
        if options is None:
            options = PDFGenerationOptions()

        # Get available engines sorted by priority
        engines = []

        # If preferred engine specified, try it first
        if preferred_engine:
            try:
                preferred = cls.create(preferred_engine)
                if preferred:
                    engines.append(preferred)
            except ValueError:
                pass  # Preferred engine not available, continue with others

        # Add all available engines in priority order
        for engine_class in cls._ENGINE_CLASSES:
            engine = engine_class()
            if engine.is_available() and engine not in engines:
                engines.append(engine)

        # Sort by priority
        engines.sort(key=lambda e: e.get_priority(), reverse=True)

        if not engines:
            return EngineResult(
                success=False,
                engine_name="None",
                error_message=(
                    "No PDF engines available. Install at least one of: "
                    "libreoffice-writer, pandoc+texlive, weasyprint"
                )
            )

        # Try each engine until one succeeds
        last_result = None
        for engine in engines:
            print(f"Trying {engine.get_name()} engine...")
            result = engine.generate(md_file, output_pdf, options)

            if result.success:
                print(f"✅ {engine.get_name()} succeeded")
                return result

            print(f"❌ {engine.get_name()} failed: {result.error_message}")
            last_result = result

        # All engines failed
        return last_result or EngineResult(
            success=False,
            engine_name="All",
            error_message="All PDF engines failed"
        )


def get_available_engines() -> List[str]:
    """
    Get list of available engine names.

    Returns:
        List of engine names that are currently available
    """
    engines = []
    for engine_class in PDFEngineFactory._ENGINE_CLASSES:
        engine = engine_class()
        if engine.is_available():
            engines.append(engine.get_name())
    return engines


def get_recommended_engine() -> Optional[str]:
    """
    Get recommended engine name (highest priority available).

    Returns:
        Engine name, or None if no engines available
    """
    engine = PDFEngineFactory._auto_select()
    return engine.get_name() if engine else None
