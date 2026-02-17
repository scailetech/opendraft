#!/usr/bin/env python3
"""
ABOUTME: Phase module exports for draft generation pipeline
ABOUTME: Each phase function takes a DraftContext and mutates it in-place
"""

from .context import DraftContext
from .research import run_research_phase
from .structure import run_structure_phase
from .citations import run_citation_management
from .compose import run_compose_phase
from .validate import run_validate_phase
from .compile import run_compile_and_export, run_expose_export

__all__ = [
    "DraftContext",
    "run_research_phase",
    "run_structure_phase",
    "run_citation_management",
    "run_compose_phase",
    "run_validate_phase",
    "run_compile_and_export",
    "run_expose_export",
]
