#!/usr/bin/env python3
"""
ABOUTME: Abstract base class and shared types for PDF generation engines
ABOUTME: Defines the strategy pattern interface for all PDF engines
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List


@dataclass
class PDFGenerationOptions:
    """
    Configuration options for PDF generation.

    Provides type-safe academic formatting standards with sensible defaults.
    """
    # Page layout
    margins: str = "1in"
    page_size: str = "Letter"

    # Typography
    font_family: str = "Times New Roman"
    font_size: str = "12pt"
    line_spacing: float = 2.0  # Double spacing for academic papers

    # Document features
    page_numbers: bool = True
    page_number_position: str = "bottom-center"

    # Formatting
    text_align: str = "justify"
    first_line_indent: str = "0.5in"

    # APA 7th edition specific
    heading_styles: dict = None

    # Title page metadata (optional - for professional academic title page)
    title: Optional[str] = None
    subtitle: Optional[str] = None
    author: Optional[str] = None
    date: Optional[str] = None
    institution: Optional[str] = None
    department: Optional[str] = None
    faculty: Optional[str] = None  # Faculty/School name
    course: Optional[str] = None  # Maps to 'degree' in YAML
    instructor: Optional[str] = None  # Maps to 'advisor' in YAML
    second_examiner: Optional[str] = None  # Second examiner/reviewer
    student_id: Optional[str] = None
    matriculation_number: Optional[str] = None  # Alternative to student_id
    project_type: Optional[str] = None
    system_credit: Optional[str] = None
    location: Optional[str] = None  # City of submission
    submission_date: Optional[str] = None  # Full submission date

    # Table of contents
    enable_toc: bool = True  # Changed from False - academic papers need TOC by default
    toc_depth: int = 3

    def __post_init__(self):
        """Set default heading styles if not provided."""
        if self.heading_styles is None:
            self.heading_styles = {
                'h1': {'align': 'center', 'bold': True, 'size': '14pt'},
                'h2': {'align': 'left', 'bold': True, 'size': '13pt'},
                'h3': {'align': 'left', 'italic': True, 'bold': False, 'size': '12pt'},
            }


@dataclass
class EngineResult:
    """
    Result of PDF generation attempt.

    Provides detailed feedback for error handling and fallback logic.
    """
    success: bool
    engine_name: str
    output_path: Optional[Path] = None
    error_message: Optional[str] = None
    warnings: List[str] = None

    def __post_init__(self):
        """Initialize warnings list if not provided."""
        if self.warnings is None:
            self.warnings = []


class PDFEngine(ABC):
    """
    Abstract base class for PDF generation engines.

    Implements the Strategy pattern to allow swapping between different
    rendering engines (WeasyPrint, LibreOffice, Pandoc/LaTeX) without
    changing client code.

    Follows SOLID principles:
    - Single Responsibility: Each engine handles one rendering approach
    - Open/Closed: Open for extension (new engines), closed for modification
    - Liskov Substitution: All engines are interchangeable
    - Interface Segregation: Clean, minimal interface
    - Dependency Inversion: Depend on abstraction, not concretions
    """

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if this engine's dependencies are installed and accessible.

        Returns:
            bool: True if engine can be used, False otherwise
        """
        pass

    @abstractmethod
    def get_name(self) -> str:
        """
        Get the human-readable name of this engine.

        Returns:
            str: Engine name for logging and error messages
        """
        pass

    @abstractmethod
    def get_priority(self) -> int:
        """
        Get the priority of this engine for auto-selection.

        Higher numbers = higher priority. Used by factory for automatic
        engine selection based on quality/reliability.

        Returns:
            int: Priority score (0-100)
        """
        pass

    @abstractmethod
    def generate(
        self,
        md_file: Path,
        output_pdf: Path,
        options: PDFGenerationOptions
    ) -> EngineResult:
        """
        Generate a PDF from markdown source.

        Args:
            md_file: Path to input markdown file
            output_pdf: Path where PDF should be written
            options: Generation options (margins, fonts, etc.)

        Returns:
            EngineResult: Success/failure with details
        """
        pass

    def validate_inputs(self, md_file: Path, output_pdf: Path) -> Optional[str]:
        """
        Validate input parameters before generation.

        Args:
            md_file: Input markdown file path
            output_pdf: Output PDF file path

        Returns:
            Optional[str]: Error message if validation fails, None if valid
        """
        if not md_file.exists():
            return f"Input file not found: {md_file}"

        if not md_file.suffix.lower() in ['.md', '.markdown']:
            return f"Input file must be markdown (.md), got: {md_file.suffix}"

        if output_pdf.suffix.lower() != '.pdf':
            return f"Output file must have .pdf extension, got: {output_pdf.suffix}"

        # Ensure output directory exists
        output_pdf.parent.mkdir(parents=True, exist_ok=True)

        return None
