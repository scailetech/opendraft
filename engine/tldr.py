#!/usr/bin/env python3
"""
ABOUTME: Generate 5-bullet TL;DR summaries from academic papers
ABOUTME: Standalone module for quick paper summarization

Usage:
    python -m engine.tldr paper.pdf
    python -m engine.tldr paper.pdf -o summary.md
"""

import os
import re
import sys
import argparse
import logging
from pathlib import Path
from typing import Optional

# Add engine to path
sys.path.insert(0, str(Path(__file__).parent))

from config import get_config
from utils.document_reader import read_document, get_document_info
from utils.gemini_client import GeminiModelWrapper

logger = logging.getLogger(__name__)

TLDR_PROMPT = (Path(__file__).parent / "prompts" / "tldr.md").read_text()


def generate_tldr(
    document_path: Path,
    model_name: str = "gemini-3-flash-preview",
    max_chars: int = 100000,
) -> str:
    """
    Generate a 5-bullet TL;DR from a document.

    Args:
        document_path: Path to PDF, markdown, or text file
        model_name: Gemini model to use
        max_chars: Max characters to read from document

    Returns:
        TL;DR as markdown string with 5 bullets
    """
    try:
        from google import genai
    except ImportError:
        raise ImportError("google-genai required. Install with: pip install google-genai")

    document_path = Path(document_path)
    content = read_document(document_path, max_chars=max_chars)

    # Setup Gemini client
    config = get_config()
    api_key = config.google_api_key or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY required")

    client = genai.Client(api_key=api_key)
    model = GeminiModelWrapper(client, model_name, temperature=0.3)

    # Build prompt
    prompt = f"""{TLDR_PROMPT}

---
DOCUMENT: {document_path.name}
---

{content}

---

Generate exactly 5 bullet points. Each bullet must:
1. Start with a bold label in brackets: **[Thesis]**, **[Finding]**, etc.
2. Be followed by a colon and a single sentence
3. Be no more than 15 words after the colon
"""

    # Generate
    response = model.generate_content(prompt)
    tldr = _extract_tldr(response.text)

    return tldr


def _extract_tldr(output: str) -> str:
    """Extract and format the TL;DR bullets."""
    lines = output.strip().split("\n")

    # Find bullet lines
    bullets = []
    for line in lines:
        line = line.strip()
        if line.startswith("- **") or line.startswith("* **"):
            bullets.append(line)

    if len(bullets) >= 5:
        return "## TL;DR\n\n" + "\n".join(bullets[:5])

    # Fallback: return cleaned output
    return "## TL;DR\n\n" + output.strip()


def main():
    parser = argparse.ArgumentParser(
        description="Generate 5-bullet TL;DR for any paper"
    )
    parser.add_argument("document", help="Path to document (PDF, MD, or TXT)")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument(
        "--model",
        default="gemini-3-flash-preview",
        help="Gemini model (default: gemini-3-flash-preview)"
    )

    args = parser.parse_args()
    document_path = Path(args.document)

    if not document_path.exists():
        print(f"Error: File not found: {document_path}")
        sys.exit(1)

    print(f"Document: {document_path.name}")

    try:
        info = get_document_info(document_path)
        print(f"Words: {info['word_count']:,}")
    except Exception:
        pass

    print("\nGenerating TL;DR...")

    tldr = generate_tldr(document_path, model_name=args.model)

    print(f"\n{tldr}")

    if args.output:
        output_path = Path(args.output)
        output_path.write_text(tldr, encoding="utf-8")
        print(f"\nSaved to: {output_path}")


if __name__ == "__main__":
    main()
