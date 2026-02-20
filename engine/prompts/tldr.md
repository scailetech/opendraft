# TL;DR Prompt

Extract the **5 most important points** from this academic paper, with research credibility context.

## Output Format

**Start with a Research Context block**, then 5 bullet points:

```
### Research Context
**Authors**: [Lead author et al. OR full author list if 3 or fewer]
**Source**: [Journal name, year] OR [Institution, year] OR [Conference, year]
**Method**: [One sentence: study type, sample size, approach]

### Key Findings
- **[Label]**: [One sentence, max 15 words]
- **[Label]**: [One sentence, max 15 words]
- **[Label]**: [One sentence, max 15 words]
- **[Label]**: [One sentence, max 15 words]
- **[Label]**: [One sentence, max 15 words]
```

## Research Context Rules

1. **Authors**: Extract from paper. Use "et al." for 4+ authors.
2. **Source**: Look for journal name, DOI, institution, or conference. Include year.
3. **Method**: Describe HOW the research was done in one sentence:
   - Study type: "Meta-analysis of 47 studies", "Randomized controlled trial", "Longitudinal study"
   - Sample: "with 2,847 participants", "across 12 countries"
   - Approach: "using fMRI imaging", "via surveys", "through computational modeling"

## Label Types for Findings

- **Thesis**: The main argument or claim
- **Finding**: A key empirical result
- **Method**: Important methodological insight (if not covered above)
- **Implication**: Practical or theoretical significance
- **Limitation**: Important caveat or constraint

## Rules

1. Research Context block is REQUIRED - extract from document
2. Exactly 5 bullets, no more, no less
3. Max 15 words per bullet
4. No hedging ("may", "might", "suggests")
5. No jargon
6. Include numbers when impactful
7. Start findings with the thesis
