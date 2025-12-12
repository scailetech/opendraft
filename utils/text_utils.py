"""
ABOUTME: Text processing utilities for draft pipeline
ABOUTME: Smart truncation, sanitization, structure-aware text handling
"""

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def smart_truncate(
    text: str,
    max_chars: int = 8000,
    preserve_json: bool = True,
    add_marker: bool = True
) -> str:
    """
    Intelligently truncate text without breaking structure.

    This function is designed to handle the common case where LLM outputs
    (especially JSON from Scout agent) are too long for subsequent LLM context
    windows, but naive truncation breaks the structure.

    Args:
        text: Input text to truncate
        max_chars: Maximum characters (default: 8000 for Gemini context window)
        preserve_json: Try to keep JSON structure intact
        add_marker: Add truncation marker at end

    Returns:
        Truncated text that doesn't break structure

    Example:
        >>> long_json = json.dumps([{"id": i} for i in range(100)])
        >>> truncated = smart_truncate(long_json, max_chars=500, preserve_json=True)
        >>> json.loads(truncated)  # Should not raise JSONDecodeError
    """
    if len(text) <= max_chars:
        logger.debug(f"Text length {len(text)} <= max {max_chars}, no truncation needed")
        return text

    logger.debug(f"Truncating text from {len(text)} to ~{max_chars} chars")

    # Try JSON-aware truncation first if requested
    if preserve_json:
        result = _try_json_truncate(text, max_chars, add_marker)
        if result is not None:
            logger.info(f"Successfully JSON-truncated from {len(text)} to {len(result)} chars")
            return result

    # Fall back to paragraph-aware truncation
    result = _paragraph_truncate(text, max_chars, add_marker)
    logger.info(f"Paragraph-truncated from {len(text)} to {len(result)} chars")
    return result


def _try_json_truncate(text: str, max_chars: int, add_marker: bool) -> Optional[str]:
    """
    Attempt to truncate JSON while preserving structure.

    Args:
        text: Text that might be JSON
        max_chars: Maximum characters
        add_marker: Whether to add truncation marker

    Returns:
        Truncated JSON string or None if not JSON
    """
    try:
        # Parse JSON to verify it's valid
        data = json.loads(text)

        # Only handle JSON arrays (Scout output is array of papers)
        if not isinstance(data, list):
            logger.debug("JSON is not an array, skipping JSON truncation")
            return None

        # Binary search to find how many items we can fit
        left, right = 0, len(data)
        best_truncated: Optional[str] = None

        while left < right:
            mid = (left + right + 1) // 2
            truncated_data = data[:mid]
            serialized = json.dumps(truncated_data, indent=2, ensure_ascii=False)

            if add_marker:
                marker = f"\n... [TRUNCATED: {len(data) - mid} items removed] ..."
                test_length = len(serialized) + len(marker)
            else:
                test_length = len(serialized)

            if test_length <= max_chars:
                best_truncated = serialized
                if add_marker:
                    best_truncated += f"\n... [TRUNCATED: {len(data) - mid} items removed] ..."
                left = mid
            else:
                right = mid - 1

        if best_truncated is not None:
            logger.debug(f"JSON array truncated to {left}/{len(data)} items")
            return best_truncated

        # If we can't fit any items, return error message
        if left == 0:
            logger.warning("Cannot fit even one JSON item in max_chars limit")
            return None

    except (json.JSONDecodeError, TypeError):
        logger.debug("Text is not valid JSON, skipping JSON truncation")
        return None

    return None


def _paragraph_truncate(text: str, max_chars: int, add_marker: bool) -> str:
    """
    Truncate text at paragraph boundaries.

    Args:
        text: Text to truncate
        max_chars: Maximum characters
        add_marker: Whether to add truncation marker

    Returns:
        Truncated text at paragraph boundary
    """
    # Reserve space for marker if needed
    if add_marker:
        marker = "\n\n... [TRUNCATED FOR LENGTH] ..."
        available_chars = max_chars - len(marker)
    else:
        marker = ""
        available_chars = max_chars

    # Truncate to available space
    truncated = text[:available_chars]

    # Try to find last double newline (paragraph boundary)
    last_paragraph = truncated.rfind('\n\n')

    # Accept paragraph boundary if it's within 20% of the limit
    # This prevents losing too much content for a clean break
    if last_paragraph > available_chars * 0.8:
        logger.debug(f"Found paragraph boundary at {last_paragraph}")
        truncated = truncated[:last_paragraph]
    else:
        # Try single newline
        last_newline = truncated.rfind('\n')
        if last_newline > available_chars * 0.9:
            logger.debug(f"Found line boundary at {last_newline}")
            truncated = truncated[:last_newline]
        else:
            # Try last space (word boundary)
            last_space = truncated.rfind(' ')
            if last_space > available_chars * 0.95:
                logger.debug(f"Found word boundary at {last_space}")
                truncated = truncated[:last_space]
            else:
                logger.debug("Using hard character truncation")

    return truncated + marker


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename for safe filesystem use.

    Args:
        filename: Original filename
        max_length: Maximum filename length (default: 255 for most filesystems)

    Returns:
        Sanitized filename

    Example:
        >>> sanitize_filename("My File: <test>.txt")
        'My_File_test.txt'
    """
    # Replace unsafe characters with underscore
    unsafe_chars = '<>:"/\\|?*'
    sanitized = filename
    for char in unsafe_chars:
        sanitized = sanitized.replace(char, '_')

    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip('. ')

    # Truncate if too long (preserve extension)
    if len(sanitized) > max_length:
        parts = sanitized.rsplit('.', 1)
        if len(parts) == 2:
            # Has extension
            name, ext = parts
            name = name[:max_length - len(ext) - 1]
            sanitized = f"{name}.{ext}"
        else:
            # No extension
            sanitized = sanitized[:max_length]

    logger.debug(f"Sanitized filename: '{filename}' -> '{sanitized}'")
    return sanitized


def count_words(text: str) -> int:
    """
    Count words in text.

    Args:
        text: Input text

    Returns:
        Word count

    Example:
        >>> count_words("Hello world! This is a test.")
        6
    """
    return len(text.split())


def estimate_tokens(text: str, chars_per_token: float = 4.0) -> int:
    """
    Estimate token count for LLM context.

    Args:
        text: Input text
        chars_per_token: Average characters per token (default: 4.0 for English)

    Returns:
        Estimated token count

    Note:
        This is a rough estimate. For exact counts, use the LLM's tokenizer.

    Example:
        >>> estimate_tokens("Hello world")
        2
    """
    return int(len(text) / chars_per_token)


def clean_ai_language(text: str) -> str:
    """
    Clean AI-typical language patterns from text.

    Replaces:
    - Em dashes (—) with regular dashes (--)
    - Overused AI words with more natural alternatives
    - Removes filler phrases

    Args:
        text: Input text to clean

    Returns:
        Cleaned text with AI patterns removed

    Example:
        >>> clean_ai_language("This delves into the realm of AI")
        "This examines the field of AI"
    """
    import re

    # Em dash and other special dashes → regular dashes
    text = text.replace('—', '--')  # Em dash
    text = text.replace('–', '-')   # En dash
    text = text.replace('―', '--')  # Horizontal bar

    # Smart quotes → regular quotes
    text = text.replace('"', '"')
    text = text.replace('"', '"')
    text = text.replace(''', "'")
    text = text.replace(''', "'")

    # AI word replacements (case-insensitive, preserve case)
    replacements = [
        # Overused verbs
        (r'\bdelves?\b', 'examines'),
        (r'\bDelves?\b', 'Examines'),
        (r'\bunveils?\b', 'reveals'),
        (r'\bUnveils?\b', 'Reveals'),
        (r'\bshowcases?\b', 'demonstrates'),
        (r'\bShowcases?\b', 'Demonstrates'),
        (r'\bleverages?\b', 'uses'),
        (r'\bLeverages?\b', 'Uses'),
        (r'\butilizes?\b', 'uses'),
        (r'\bUtilizes?\b', 'Uses'),
        (r'\bspearheads?\b', 'leads'),
        (r'\bSpearheads?\b', 'Leads'),

        # Overused nouns
        (r'\btapestry\b', 'combination'),
        (r'\bTapestry\b', 'Combination'),
        (r'\brealm\b', 'field'),
        (r'\bRealm\b', 'Field'),
        (r'\blandscape\b', 'environment'),
        (r'\bLandscape\b', 'Environment'),
        (r'\becosystem\b', 'system'),
        (r'\bEcosystem\b', 'System'),
        (r'\bparadigm shift\b', 'major change'),
        (r'\bParadigm shift\b', 'Major change'),
        (r'\bgame.?changer\b', 'significant development'),
        (r'\bGame.?changer\b', 'Significant development'),

        # Overused adjectives
        (r'\bgroundbreaking\b', 'innovative'),
        (r'\bGroundbreaking\b', 'Innovative'),
        (r'\bcutting.?edge\b', 'advanced'),
        (r'\bCutting.?edge\b', 'Advanced'),
        (r'\bstate.?of.?the.?art\b', 'current'),
        (r'\bState.?of.?the.?art\b', 'Current'),
        (r'\bseamless(ly)?\b', 'smooth\\1' if '\\1' else 'smooth'),
        (r'\bSeamless(ly)?\b', 'Smooth\\1' if '\\1' else 'Smooth'),
        (r'\brobust\b', 'strong'),
        (r'\bRobust\b', 'Strong'),
        (r'\bholistic\b', 'comprehensive'),
        (r'\bHolistic\b', 'Comprehensive'),
        (r'\bmultifaceted\b', 'complex'),
        (r'\bMultifaceted\b', 'Complex'),
        (r'\bpivotal\b', 'important'),
        (r'\bPivotal\b', 'Important'),
        (r'\bcrucial\b', 'important'),
        (r'\bCrucial\b', 'Important'),
        (r'\bparamount\b', 'essential'),
        (r'\bParamount\b', 'Essential'),
        (r'\bintricate\b', 'complex'),
        (r'\bIntricate\b', 'Complex'),
        (r'\bplethora\b', 'many'),
        (r'\bPlethora\b', 'Many'),
        (r'\bmyriad\b', 'many'),
        (r'\bMyriad\b', 'Many'),

        # Filler adverbs
        (r'\bargubly\b', ''),
        (r'\bArguably\b', ''),
        (r'\bundoubtedly\b', ''),
        (r'\bUndoubtedly\b', ''),
        (r'\bindeed\b', ''),
        (r'\bIndeed\b', ''),
        (r'\binterestingly\b', ''),
        (r'\bInterestingly\b', ''),
        (r'\bnoteworthy\b', 'notable'),
        (r'\bNoteworthy\b', 'Notable'),
        (r'\bIt is worth noting that\b', ''),
        (r'\bit is worth noting that\b', ''),
        (r'\bIt bears mentioning\b', ''),
        (r'\bit bears mentioning\b', ''),
    ]

    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text)

    # Clean up double spaces from removed words
    text = re.sub(r'  +', ' ', text)
    # Clean up spaces before punctuation
    text = re.sub(r' +([.,;:!?])', r'\1', text)
    # Clean up sentence starts after removals
    text = re.sub(r'\. +([a-z])', lambda m: '. ' + m.group(1).upper(), text)

    return text
