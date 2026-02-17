#!/usr/bin/env python3
"""
ABOUTME: Quality gate for draft output scoring
ABOUTME: Scores draft quality after compose phase, enables early exit or warnings
"""

import re
import logging
from dataclasses import dataclass
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


@dataclass
class QualityScore:
    """Quality assessment result."""
    total_score: int  # 0-100
    word_count_score: int  # 0-25
    citation_score: int  # 0-25
    completeness_score: int  # 0-25
    structure_score: int  # 0-25
    issues: List[str]
    passed: bool


def score_draft_quality(ctx: 'DraftContext') -> QualityScore:
    """
    Score draft quality after compose phase.
    
    Scoring breakdown (100 points total):
    - Word count: 25 points (meets target lengths)
    - Citations: 25 points (proper citation density)
    - Completeness: 25 points (all sections present)
    - Structure: 25 points (proper markdown structure)
    
    Args:
        ctx: DraftContext with compose outputs
        
    Returns:
        QualityScore with breakdown and pass/fail status
    """
    issues = []
    
    # === WORD COUNT (25 points) ===
    word_count_score = _score_word_count(ctx, issues)
    
    # === CITATION DENSITY (25 points) ===
    citation_score = _score_citations(ctx, issues)
    
    # === COMPLETENESS (25 points) ===
    completeness_score = _score_completeness(ctx, issues)
    
    # === STRUCTURE (25 points) ===
    structure_score = _score_structure(ctx, issues)
    
    total_score = word_count_score + citation_score + completeness_score + structure_score
    passed = total_score >= 50  # Minimum passing score
    
    return QualityScore(
        total_score=total_score,
        word_count_score=word_count_score,
        citation_score=citation_score,
        completeness_score=completeness_score,
        structure_score=structure_score,
        issues=issues,
        passed=passed,
    )


def _count_words(text: str) -> int:
    """Count words in text."""
    return len(text.split()) if text else 0


def _score_word_count(ctx: 'DraftContext', issues: List[str]) -> int:
    """Score based on word count targets."""
    score = 0
    
    # Get minimum targets based on academic level
    min_targets = {
        'research_paper': {'intro': 400, 'body': 1500, 'conclusion': 300},
        'bachelor': {'intro': 1000, 'body': 5000, 'conclusion': 600},
        'master': {'intro': 1500, 'body': 10000, 'conclusion': 1000},
        'phd': {'intro': 2500, 'body': 20000, 'conclusion': 2000},
    }
    targets = min_targets.get(ctx.academic_level, min_targets['master'])
    
    # Introduction (8 points)
    intro_words = _count_words(ctx.intro_output)
    if intro_words >= targets['intro']:
        score += 8
    elif intro_words >= targets['intro'] * 0.5:
        score += 4
        issues.append(f"Introduction short: {intro_words} words (target: {targets['intro']})")
    else:
        issues.append(f"Introduction very short: {intro_words} words (target: {targets['intro']})")
    
    # Body (12 points)
    body_words = _count_words(ctx.body_output)
    if body_words >= targets['body']:
        score += 12
    elif body_words >= targets['body'] * 0.5:
        score += 6
        issues.append(f"Body short: {body_words} words (target: {targets['body']})")
    else:
        issues.append(f"Body very short: {body_words} words (target: {targets['body']})")
    
    # Conclusion (5 points)
    conclusion_words = _count_words(ctx.conclusion_output)
    if conclusion_words >= targets['conclusion']:
        score += 5
    elif conclusion_words >= targets['conclusion'] * 0.5:
        score += 2
        issues.append(f"Conclusion short: {conclusion_words} words (target: {targets['conclusion']})")
    else:
        issues.append(f"Conclusion very short: {conclusion_words} words (target: {targets['conclusion']})")
    
    return score


def _score_citations(ctx: 'DraftContext', issues: List[str]) -> int:
    """Score based on citation usage."""
    score = 0
    
    # Count citation references in all outputs
    all_text = ctx.intro_output + ctx.body_output + ctx.conclusion_output
    citation_refs = re.findall(r'\{cite_\d+\}', all_text)
    unique_citations = len(set(citation_refs))
    total_citations = len(citation_refs)
    
    # Get target based on academic level
    min_citations = ctx.word_targets.get('min_citations', 10)
    
    # Unique citations used (15 points)
    if unique_citations >= min_citations:
        score += 15
    elif unique_citations >= min_citations * 0.5:
        score += 8
        issues.append(f"Few unique citations: {unique_citations} (target: {min_citations})")
    else:
        issues.append(f"Very few citations: {unique_citations} (target: {min_citations})")
    
    # Citation density (10 points) - at least 1 citation per 500 words
    word_count = _count_words(all_text)
    expected_density = max(1, word_count // 500)
    if total_citations >= expected_density:
        score += 10
    elif total_citations >= expected_density * 0.5:
        score += 5
        issues.append(f"Low citation density: {total_citations} refs in {word_count} words")
    else:
        issues.append(f"Very low citation density: {total_citations} refs in {word_count} words")
    
    return score


def _score_completeness(ctx: 'DraftContext', issues: List[str]) -> int:
    """Score based on section completeness."""
    score = 0
    
    # Required sections (5 points each)
    sections = [
        ('Introduction', ctx.intro_output, 5),
        ('Literature Review', ctx.lit_review_output, 5),
        ('Methodology', ctx.methodology_output, 5),
        ('Results', ctx.results_output, 5),
        ('Conclusion', ctx.conclusion_output, 5),
    ]
    
    for name, content, points in sections:
        if content and len(content.strip()) > 100:
            score += points
        elif content and len(content.strip()) > 0:
            score += points // 2
            issues.append(f"{name} section too brief")
        else:
            issues.append(f"Missing {name} section")
    
    return score


def _score_structure(ctx: 'DraftContext', issues: List[str]) -> int:
    """Score based on markdown structure."""
    score = 0
    all_text = ctx.intro_output + ctx.body_output + ctx.conclusion_output
    
    # Has markdown headers (10 points)
    headers = re.findall(r'^#{1,3}\s+.+$', all_text, re.MULTILINE)
    if len(headers) >= 5:
        score += 10
    elif len(headers) >= 2:
        score += 5
        issues.append(f"Few section headers: {len(headers)}")
    else:
        issues.append("Missing section headers")
    
    # Has paragraphs (5 points)
    paragraphs = all_text.split('\n\n')
    paragraphs = [p for p in paragraphs if len(p.strip()) > 50]
    if len(paragraphs) >= 10:
        score += 5
    elif len(paragraphs) >= 5:
        score += 2
        issues.append(f"Few paragraphs: {len(paragraphs)}")
    else:
        issues.append("Very few paragraphs")
    
    # No obvious errors (10 points)
    error_patterns = [
        (r'\{cite_MISSING[^}]*\}', "Contains {cite_MISSING} placeholders"),
        (r'TODO', "Contains TODO markers"),
        (r'\[INSERT\]', "Contains [INSERT] placeholders"),
        (r'Lorem ipsum', "Contains Lorem ipsum placeholder text"),
    ]
    
    deductions = 0
    for pattern, message in error_patterns:
        if re.search(pattern, all_text, re.IGNORECASE):
            deductions += 2
            issues.append(message)
    
    score += max(0, 10 - deductions)
    
    return score


def run_quality_gate(ctx: 'DraftContext', strict: bool = False) -> QualityScore:
    """
    Run quality gate after compose phase.
    
    Args:
        ctx: DraftContext with compose outputs
        strict: If True, raise error on low quality. If False, log warning.
        
    Returns:
        QualityScore result
        
    Raises:
        ValueError: If strict=True and quality score < 50
    """
    logger.info("Running quality gate assessment...")
    
    result = score_draft_quality(ctx)
    
    logger.info(f"Quality Score: {result.total_score}/100")
    logger.info(f"  Word Count: {result.word_count_score}/25")
    logger.info(f"  Citations:  {result.citation_score}/25")
    logger.info(f"  Completeness: {result.completeness_score}/25")
    logger.info(f"  Structure:  {result.structure_score}/25")
    
    if result.issues:
        logger.info(f"Issues found: {len(result.issues)}")
        for issue in result.issues:
            logger.warning(f"  - {issue}")
    
    if not result.passed:
        msg = f"Quality gate failed: score {result.total_score}/100 (minimum: 50)"
        if strict:
            raise ValueError(msg)
        else:
            logger.warning(msg)
            logger.warning("Continuing despite low quality score (strict=False)")
    else:
        logger.info(f"Quality gate passed: {result.total_score}/100")
    
    return result
