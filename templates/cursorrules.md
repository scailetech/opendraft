# Thesis Refinement Rules for Cursor AI

You are helping refine an AI-generated academic thesis. Follow these guidelines:

## Context
- This is a {academic_level} thesis on "{topic}"
- Citation style: APA 7th Edition
- All sources are in `research/papers/` folder

## Critical Rules

### 1. Citations
- NEVER remove or modify citation IDs like `{cite_001}`, `(Smith et al., 2023)`
- When editing, preserve all citation references exactly
- If unsure about a claim, check `research/papers/` for the source

### 2. Academic Integrity
- Keep all [VERIFY] markers visible
- Don't add claims without proper citations
- Preserve DOI/URL references in bibliography

### 3. Style
- Maintain APA 7th edition formatting
- Keep section headers intact
- Preserve the thesis structure

## When Refining

### For Humanization
- Match the author's natural writing style
- Vary sentence length and structure
- Avoid AI-typical phrases ("Additionally," "Furthermore," "In conclusion,")

### For Clarity
- Each paragraph should have one main idea
- Use transitions naturally
- Define technical terms on first use

### For Quality
- Check claims against `research/papers/`
- Ensure logical flow between sections
- Verify all numbers/statistics have citations

## Folder Reference
- `research/papers/` - Individual source summaries
- `research/combined_research.md` - Full research synthesis
- `drafts/` - Editable section files
- `exports/` - Final output files

## Commands
When user says:
- "humanize" → Apply voice matching from `tools/humanizer_prompt.md`
- "entropy" → Increase diversity using `tools/entropy_prompt.md`
- "check citations" → Verify all citations exist in bibliography
- "export" → Remind to regenerate PDF/DOCX after edits

