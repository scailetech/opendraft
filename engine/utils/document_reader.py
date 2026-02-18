#!/usr/bin/env python3
"""
ABOUTME: Read documents (PDF, markdown, text) into plain text
ABOUTME: Supports PDF, MD, TXT formats for TL;DR and Digest features
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def read_document(file_path: Path, max_chars: Optional[int] = None) -> str:
    """
    Read a document and return its text content.

    Supports: PDF, Markdown, TXT

    Args:
        file_path: Path to document
        max_chars: Optional limit on characters returned

    Returns:
        Plain text content of document
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"Document not found: {file_path}")

    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        text = _read_pdf(file_path)
    elif suffix in (".md", ".markdown"):
        text = _read_markdown(file_path)
    elif suffix == ".txt":
        text = file_path.read_text(encoding="utf-8")
    else:
        # Try reading as plain text
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raise ValueError(f"Unsupported file type: {suffix}")

    if max_chars and len(text) > max_chars:
        text = text[:max_chars]
        logger.warning(f"Truncated document to {max_chars} characters")

    return text


def _read_pdf(file_path: Path) -> str:
    """Extract text from PDF using available library."""
    # Try PyMuPDF first (fastest)
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(file_path)
        pages = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()
        return "\n\n".join(pages)
    except ImportError:
        pass

    # Try pdfplumber
    try:
        import pdfplumber

        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n\n".join(pages)
    except ImportError:
        pass

    # Try pypdf
    try:
        from pypdf import PdfReader

        reader = PdfReader(file_path)
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n\n".join(pages)
    except ImportError:
        pass

    raise ImportError(
        "No PDF reader available. Install one of: "
        "PyMuPDF (pip install pymupdf), "
        "pdfplumber (pip install pdfplumber), "
        "or pypdf (pip install pypdf)"
    )


def _read_markdown(file_path: Path) -> str:
    """Read markdown file."""
    return file_path.read_text(encoding="utf-8")


def get_document_info(file_path: Path) -> dict:
    """Get basic info about a document."""
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"Document not found: {file_path}")

    text = read_document(file_path)
    words = len(text.split())
    chars = len(text)

    return {
        "path": str(file_path),
        "name": file_path.name,
        "type": file_path.suffix.lower(),
        "word_count": words,
        "char_count": chars,
    }
