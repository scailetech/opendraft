# Thesis Generation Timing Test - Execution Plan

## Objective
Execute thesis generation tests with real timing measurements to validate README claims of "15-25 minutes for 20,000-word thesis"

## Test Configuration

### Test 1: Demo Thesis (Quick Validation)
- **Script**: `tests/scripts/test_demo_thesis.py`
- **Model**: Gemini 2.5 Flash (default)
- **Target**: 5,000 words, 20 citations, 7 agents
- **Claimed Time**: 5-7 minutes
- **Purpose**: Quick sanity check before full test

### Test 2: Full Thesis - Gemini 2.5 Flash
- **Script**: `tests/scripts/test_ai_pricing_thesis.py`
- **Model**: Gemini 2.5 Flash
- **Target**: 20,000 words, 35+ citations, 15 agents
- **Claimed Time**: 15-25 minutes
- **Purpose**: Validate primary README claim

### Test 3: Full Thesis - Gemini 3 Pro Preview
- **Script**: `tests/scripts/test_ai_pricing_thesis.py`
- **Model**: gemini-3-pro-preview
- **Target**: 20,000 words, 35+ citations, 15 agents
- **Claimed Time**: Unknown (comparison test)
- **Purpose**: Compare latest model performance

## Execution Steps

### Pre-Execution Checks
1. ✅ Verify Python 3.10.12 is available
2. ✅ Verify .env file exists with GOOGLE_API_KEY
3. ✅ Check test scripts exist
4. ✅ Verify output directories are writable

### Test 1: Demo Thesis Execution
```bash
# Set environment and run demo
cd /home/federicodeponte/opendraft
export GEMINI_MODEL="gemini-2.5-flash"
time python3 tests/scripts/test_demo_thesis.py
```

**Measurements to capture:**
- Start time (timestamp)
- End time (timestamp)
- Total execution time (real time from `time` command)
- Word count generated
- Number of citations
- Exit code (success/failure)
- Any errors or warnings

### Test 2: Full Thesis - Gemini 2.5 Flash
```bash
# Clean previous outputs
mv tests/outputs/ai_pricing_thesis tests/outputs/ai_pricing_thesis_backup_$(date +%Y%m%d_%H%M%S)

# Run full thesis test with default model
export GEMINI_MODEL="gemini-2.5-flash"
time python3 tests/scripts/test_ai_pricing_thesis.py | tee test2_execution_log.txt
```

**Measurements to capture:**
- Start time
- End time
- Total execution time
- Word count (from FINAL_THESIS.md)
- Citation count (from citation_database.json)
- PDF generation success
- File sizes (MD, PDF, DOCX)
- Any human intervention needed
- Quality metrics from validation

### Test 3: Full Thesis - Gemini 3 Pro Preview
```bash
# Clean previous outputs
mv tests/outputs/ai_pricing_thesis tests/outputs/ai_pricing_thesis_flash_$(date +%Y%m%d_%H%M%S)

# Run full thesis test with Gemini 3 Pro
export GEMINI_MODEL="gemini-3-pro-preview"
time python3 tests/scripts/test_ai_pricing_thesis.py | tee test3_execution_log.txt
```

**Measurements to capture:**
- Same as Test 2
- Compare quality vs speed tradeoff
- Cost comparison (if available)

## Success Criteria

### Test 1 (Demo)
- ✅ Completes in 5-7 minutes
- ✅ Generates 5,000+ words
- ✅ Includes 15+ citations
- ✅ No fatal errors
- ✅ PDF exports successfully

### Test 2 (Full - Flash)
- ✅ Completes in 15-30 minutes (allow 5 min buffer)
- ✅ Generates 15,000+ words (allow for variance)
- ✅ Includes 30+ verified citations
- ✅ No fatal errors
- ✅ Passes quality gates
- ✅ PDF and DOCX export successfully
- ✅ No manual intervention required

### Test 3 (Full - Gemini 3)
- ✅ Completes successfully (time TBD)
- ✅ Meets same quantitative criteria as Test 2
- ✅ Quality comparison documented

## Data Collection

### Timing Data
```json
{
  "test_name": "Full Thesis - Gemini 2.5 Flash",
  "start_time": "2025-11-21T10:30:00Z",
  "end_time": "2025-11-21T10:52:34Z",
  "total_seconds": 1354,
  "total_minutes": 22.57,
  "claimed_time": "15-25 minutes",
  "meets_claim": true
}
```

### Output Metrics
```json
{
  "word_count": 28543,
  "citation_count": 37,
  "sections": 6,
  "pdf_size_bytes": 324065,
  "quality_gates_passed": true,
  "human_intervention": false
}
```

### Quality Metrics
- Citation success rate (from Scout agent)
- Section validation results (from Skeptic agent)
- Final quality gate status
- Output usability (can it be submitted as-is?)

## Expected Outcomes

### README Claim Validation
- **Claim**: "15-25 minutes to generate 20,000-word thesis"
- **Test**: Measure actual time for test_ai_pricing_thesis.py
- **Result**: Document actual time vs claim

### Model Comparison
- **Flash vs Pro**: Speed vs quality tradeoff
- **Cost**: Estimated API costs per thesis
- **Recommendation**: Which model for which use case

## Risk Mitigation

### Potential Issues
1. **API Rate Limits**: Tests may be throttled
   - Mitigation: Built-in rate limiting (rate_limit_delay())

2. **Network Timeouts**: Citation research may fail
   - Mitigation: 4-tier fallback system in place

3. **Quality Gate Failures**: Thesis may not pass validation
   - Mitigation: Document failures, continue to completion

4. **Disk Space**: Large outputs may fill disk
   - Mitigation: Check df -h before execution

### Fallback Plan
If any test fails:
1. Capture error logs
2. Document failure point
3. Attempt retry once
4. If persistent, document as known issue

## Documentation Requirements

### Per-Test Report
For each test, create markdown report with:
- Full timing breakdown
- Phase-by-phase timing
- Word count and citation metrics
- Quality assessment
- Screenshots/logs of key moments

### Final Comparison Report
- Side-by-side metrics table
- Claim validation summary
- Recommendations
- Cost analysis

## Notes
- All tests run non-interactively (no human input)
- GOOGLE_API_KEY must be valid and have quota
- Tests write to tests/outputs/ directory
- Existing outputs will be backed up with timestamps
- PDF export requires pandoc installation
