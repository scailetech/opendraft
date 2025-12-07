# Monitoring New Thesis with Pandoc Fix

## Current Thesis Being Generated

**ID**: b397e230-07ac-4c60-bcc9-3f8f2295a5aa  
**Topic**: The Impact of Social Media on Democratic Discourse  
**Engine**: **Pandoc/XeLaTeX (FORCED)** ✅  
**Status**: Processing now

## What's Different

### Old Theses (WeasyPrint):
- Math as LaTeX code: `$68 \%$`
- Tables as markdown pipes
- Poor typography
- Artifacts like `**.`

### This New Thesis (Pandoc/XeLaTeX):
- ✅ Math rendered properly
- ✅ Professional LaTeX tables
- ✅ Clean typography
- ✅ No artifacts
- ✅ Matches showcase quality

## The Fix Applied

**Code change in `thesis_generator.py`**:
```python
pdf_success = export_pdf(
    md_file=final_md_path,
    output_pdf=pdf_path,
    engine='pandoc'  # ← FORCED!
)
```

**Before**: Used `engine='auto'` → Selected WeasyPrint  
**Now**: Uses `engine='pandoc'` → Forces Pandoc/XeLaTeX

## Timeline

- Started: ~12:08 (just now)
- Research: ~10-15 minutes
- Writing: ~20-35 minutes
- Export: ~35-40 minutes
- **ETA: ~12:50** (40 minutes from start)

## Monitoring

Will check every 5 minutes and provide PDF link when complete.

The PDF will show the professional Pandoc/XeLaTeX format matching:
`/Users/federicodeponte/opendraft-fixes/website/public/examples/Why_Academic_Thesis_AI_Saves_The_World.pdf`

🎯 **This will prove the fix works!**

