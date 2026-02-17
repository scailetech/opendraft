"""
Deterministic text cleanup utilities.

Ported from OpenDraft V2 - pure functions with zero external dependencies.
Use apply_full_cleanup(text) for the complete 10-step cleanup pipeline.

Usage:
    from utils.text_cleanup import apply_full_cleanup

    result = apply_full_cleanup(draft_text)
    cleaned_text = result["text"]
    stats = result["stats"]  # {"fillers": 3, "vocab_diversified": 12, ...}
"""

import re
from typing import Dict, List, Tuple, Any

# =============================================================================
# CLEANUP PATTERNS (all pure data, no dependencies)
# =============================================================================

# Filler transitions to strip from sentence starts
FILLER_STARTS = [
    r"Furthermore,\s*",
    r"Moreover,\s*",
    r"Additionally,\s*",
    r"It is worth noting that\s*",
    r"It should be noted that\s*",
    r"Importantly,\s*",
    r"It is important to note that\s*",
    r"In addition,\s*",
    r"Notably,\s*",
]

# Empty intensifiers before adjectives
INTENSIFIERS = re.compile(
    r"\b(very|extremely|highly)\s+(?=[a-z])",
    re.IGNORECASE,
)

# Meta-commentary patterns (whole sentences starting with these)
META_PATTERNS = [
    r"This section discusses\s+[^.]+\.\s*",
    r"This subsection examines\s+[^.]+\.\s*",
    r"This section explores\s+[^.]+\.\s*",
    r"This section provides\s+[^.]+\.\s*",
    r"This subsection provides\s+[^.]+\.\s*",
    r"This section reviews\s+[^.]+\.\s*",
    r"In this section,\s+we\s+[^.]+\.\s*",
    r"The following section\s+[^.]+\.\s*",
    r"The following subsection\s+[^.]+\.\s*",
]

# Verbose phrase → concise replacement
VERBOSE_PHRASES = [
    (r"\bin order to\b", "to"),
    (r"\bdue to the fact that\b", "because"),
    (r"\ba large number of\b", "many"),
    (r"\bthe vast majority of\b", "most"),
    (r"\bat the present time\b", "now"),
    (r"\bin the event that\b", "if"),
    (r"\bhas the ability to\b", "can"),
    (r"\bprior to\b", "before"),
    (r"\bsubsequent to\b", "after"),
    (r"\bwith regard to\b", "regarding"),
    (r"\bwith respect to\b", "regarding"),
    (r"\bin spite of the fact that\b", "although"),
    (r"\bfor the purpose of\b", "to"),
    (r"\bis able to\b", "can"),
    (r"\ba significant number of\b", "many"),
    (r"\bin light of\b", "given"),
    (r"\bon the basis of\b", "based on"),
    (r"\bas a consequence of\b", "because of"),
]

# Common synonym chains to collapse
SYNONYM_CHAINS = [
    (r"\bimportant,\s*essential,\s*and\s*paramount\b", "essential"),
    (r"\bcomprehensive,\s*thorough,\s*and\s*exhaustive\b", "thorough"),
    (r"\bcrucial,\s*vital,\s*and\s*critical\b", "critical"),
    (r"\bsignificant,\s*substantial,\s*and\s*considerable\b", "substantial"),
    (r"\brapid,\s*swift,\s*and\s*fast\b", "rapid"),
    (r"\bvast,\s*extensive,\s*and\s*far-reaching\b", "extensive"),
    (r"\brobust,\s*resilient,\s*and\s*durable\b", "robust"),
]

# Mid-document thesis restatements to neutralize (sentence-start only)
THESIS_RESTATEMENTS = [
    (r"(?<=\.\s)As\s+this\s+(?:paper|study)\s+argues?,?\s*", "As discussed, "),
    (r"(?<=\.\s)This\s+(?:paper|study)\s+has\s+argued\s+that\b", "The analysis shows that"),
    (r"(?<=\.\s)We\s+argue\s+that\b", "The evidence suggests that"),
    (r"(?<=\.\s)The\s+central\s+argument\s+of\s+this\s+(?:paper|study)\b", "A key finding"),
    (r"(?<=\.\s)This\s+study\s+demonstrates\s+that\b", "The analysis reveals that"),
]

# Vocabulary diversification - rotates overused words through synonyms
# Format: (pattern, [list of synonyms to rotate through])
VOCAB_DIVERSITY = [
    (r"\bmechanism\b", ["process", "pathway", "driver", "dynamic", "factor"]),
    (r"\bvulnerability\b", ["susceptibility", "risk factor", "exposure", "sensitivity"]),
    (r"\bsignificant\b(?!\s+(?:at|p\s*[<>=]|difference|effect))",
     ["substantial", "considerable", "notable", "marked", "meaningful"]),
    (r"\bdemonstrates?\b", ["shows", "reveals", "indicates", "illustrates", "establishes"]),
    (r"\butilize[sd]?\b", ["use", "uses", "used"]),
    (r"\bfacilitate[sd]?\b", ["enables", "supports", "helps", "allows"]),
    (r"\bcomprehensive\b", ["thorough", "extensive", "detailed", "wide-ranging"]),
    (r"\brobust\b", ["strong", "reliable", "solid", "stable"]),
    (r"\bparadigm\b(?!\s+shift)", ["framework", "model", "approach", "perspective"]),
]

# Claim calibration - replaces overconfident language with hedging
CLAIM_CALIBRATION = [
    (r"\bis\s+indisputable\b", "is strongly supported"),
    (r"\bindisputable\s+evidence\b", "strong evidence"),
    (r"\bundeniable\b", "well-established"),
    (r"\bunquestionable\b", "well-documented"),
    (r"\bproves\s+conclusively\s+that\b", "provides strong support for the conclusion that"),
    (r"\bprove\s+conclusively\s+that\b", "provide strong support for the conclusion that"),
    (r"\bwithout\s+(?:a\s+)?doubt\b", "with high confidence"),
    (r"\bis\s+the\s+only\b", "is a primary"),
    (r"\bthe\s+only\s+solution\b", "a key solution"),
    (r"\bthe\s+only\s+approach\b", "a key approach"),
    (r"\bis\s+the\s+best\b", "is among the most effective"),
    (r"\bis\s+revolutionary\b", "represents a significant advancement"),
    (r"\brevolutionary\s+approach\b", "innovative approach"),
    (r"\bparadigm\s+shift\b", "significant development"),
    (r"\bis\s+always\b(?!\s+(?:been|had|have))", "is consistently"),
    (r"\bis\s+never\b(?!\s+(?:been|had|have))", "is rarely"),
    (r"\bis\s+perfect\b", "is highly accurate"),
    (r"\bsolves\s+the\s+problem\b", "addresses the challenge"),
    (r"\bproves\s+that\b", "supports the finding that"),
    (r"\bprove\s+that\b", "support the finding that"),
    (r"\bobviously\b", "notably"),
    (r"\bclearly\s+shows\b", "indicates"),
    (r"\bclearly\s+show\b", "indicate"),
]


# =============================================================================
# PURE FUNCTIONS (no external dependencies)
# =============================================================================

def apply_full_cleanup(text: str) -> Dict[str, Any]:
    """
    Apply all deterministic cleanup patterns to text.

    This is a pure function - text in, cleaned text + stats out.
    No file I/O, no external dependencies.

    Args:
        text: The draft text to clean

    Returns:
        dict with:
            - "text": cleaned text
            - "stats": dict of cleanup counts
    """
    stats = {
        "fillers": 0,
        "intensifiers": 0,
        "verbose": 0,
        "meta": 0,
        "synonyms": 0,
        "thesis": 0,
        "vocab_diversified": 0,
        "claims_calibrated": 0,
    }

    # 1. Strip filler transitions at sentence start
    for pattern in FILLER_STARTS:
        before = text
        text = re.sub(
            r"(?m)(^|\.\s+)" + pattern,
            lambda m: m.group(1),
            text,
        )
        if text != before:
            stats["fillers"] += 1

    # 2. Remove empty intensifiers
    text, n = INTENSIFIERS.subn(r"", text)
    stats["intensifiers"] = n

    # 3. Collapse synonym chains
    for pattern, replacement in SYNONYM_CHAINS:
        before = text
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        if text != before:
            stats["synonyms"] += 1

    # 4. Strip meta-commentary
    for pattern in META_PATTERNS:
        before = text
        text = re.sub(pattern, "", text)
        if text != before:
            stats["meta"] += 1

    # 5. Compress verbose phrases
    for pattern, replacement in VERBOSE_PHRASES:
        before = text
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        if text != before:
            stats["verbose"] += 1

    # 6. Neutralize mid-document thesis restatements
    for pattern, replacement in THESIS_RESTATEMENTS:
        before = text
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        if text != before:
            stats["thesis"] += 1

    # 7. Vocabulary diversification
    # Rotates overused words through synonyms to increase lexical diversity
    for pattern, synonyms in VOCAB_DIVERSITY:
        matches = list(re.finditer(pattern, text, flags=re.IGNORECASE))
        if len(matches) > 3:  # Only diversify if overused (>3 occurrences)
            # Replace from end to preserve string positions
            for i, match in enumerate(reversed(matches[2:])):
                idx = len(matches) - 3 - i
                synonym = synonyms[idx % len(synonyms)]
                # Preserve case
                if match.group().istitle():
                    synonym = synonym.title()
                elif match.group().isupper():
                    synonym = synonym.upper()
                text = text[:match.start()] + synonym + text[match.end():]
                stats["vocab_diversified"] += 1

    # 8. Claim calibration
    # Replaces overconfident claims with calibrated academic hedging
    for pattern, replacement in CLAIM_CALIBRATION:
        before = text
        count = len(re.findall(pattern, text, flags=re.IGNORECASE))
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        if text != before:
            stats["claims_calibrated"] += count

    # 9. Remove duplicate ## References headings (keep last one only)
    refs_splits = re.split(r"\n##\s+References\s*\n", text)
    if len(refs_splits) > 2:
        text = refs_splits[0]
        for part in refs_splits[1:-1]:
            text += "\n" + part
        text += "\n## References\n" + refs_splits[-1]

    # 10. Clean up double whitespace left by removals
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"  +", " ", text)

    return {"text": text, "stats": stats}


def ensure_authors_list(value) -> List[str]:
    """
    Ensure authors is a proper list of strings.

    LLMs sometimes send authors as a single string instead of a list.
    This causes citations like "(B et al., 2023)" instead of "(Brown et al., 2023)".

    Args:
        value: authors value from LLM (could be str, list, or None)

    Returns:
        List of author name strings
    """
    if value is None or value == "":
        return ["Unknown"]
    if isinstance(value, str):
        if "," in value:
            return [a.strip() for a in value.split(",") if a.strip()]
        return [value.strip()] if value.strip() else ["Unknown"]
    if isinstance(value, list):
        cleaned = [str(a).strip() for a in value if a and str(a).strip()]
        return cleaned if cleaned else ["Unknown"]
    return ["Unknown"]


def detect_repetition(text: str) -> Dict[str, Any]:
    """
    Detect thesis restatement and repeated phrases.

    Pure function - text in, warnings out.

    Returns:
        dict with "warnings" list and "status" ("pass" or "needs_review")
    """
    warnings = []

    # Count thesis restatements
    thesis_patterns = [
        r'this\s+paper\s+argues?',
        r'the\s+central\s+argument',
        r'this\s+study\s+demonstrates?',
        r'we\s+argue\s+that',
    ]
    thesis_count = sum(len(re.findall(p, text, re.I)) for p in thesis_patterns)
    if thesis_count > 3:
        warnings.append({
            "type": "thesis_repetition",
            "count": thesis_count,
            "message": f"Thesis restated {thesis_count} times (expected 2-3)"
        })

    # Check for repeated phrases (same 5+ word sequence appearing 3+ times)
    words = text.lower().split()
    if len(words) > 100:
        phrase_counts = {}
        for i in range(len(words) - 4):
            phrase = " ".join(words[i:i+5])
            phrase_counts[phrase] = phrase_counts.get(phrase, 0) + 1

        repeated = [(p, c) for p, c in phrase_counts.items() if c >= 3]
        if repeated:
            warnings.append({
                "type": "repeated_phrases",
                "count": len(repeated),
                "examples": [p for p, c in sorted(repeated, key=lambda x: -x[1])[:5]]
            })

    return {
        "warnings": warnings,
        "status": "pass" if not warnings else "needs_review"
    }


def detect_advocacy_language(text: str) -> Dict[str, Any]:
    """
    Detect prescriptive language inappropriate for academic tone.

    Pure function - text in, warnings out.

    Returns:
        dict with "findings" list and "status" ("pass" or "needs_review")
    """
    patterns = [
        (r'\bmust\s+be\s+adopted\b', "prescriptive"),
        (r'\bwe\s+advocate\b', "advocacy"),
        (r'\bundeniably\b', "overconfident"),
        (r'\bunquestionably\b', "overconfident"),
        (r'\bobviously\b', "overconfident"),
        (r'\bdemands\s+that\b', "prescriptive"),
    ]

    findings = []
    for pattern, desc in patterns:
        matches = re.findall(pattern, text, re.I)
        if matches:
            findings.append({"pattern": desc, "count": len(matches)})

    return {
        "findings": findings,
        "status": "pass" if not findings else "needs_review"
    }


# =============================================================================
# CONVENIENCE WRAPPER
# =============================================================================

def clean_text(text: str) -> str:
    """
    Simple wrapper that returns just the cleaned text.

    Use apply_full_cleanup() if you need stats.
    """
    return apply_full_cleanup(text)["text"]
