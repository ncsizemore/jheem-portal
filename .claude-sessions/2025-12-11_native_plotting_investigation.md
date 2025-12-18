# Session Summary: Native Plotting Architecture Investigation
**Date**: 2025-12-11
**Duration**: ~3 hours
**Focus**: Ryan White Map Explorer modernization - evaluating native frontend plotting

---

## Executive Summary

This session investigated whether to continue with pre-rendered Plotly JSONs (~64K files) or switch to a native frontend plotting approach using extracted summary data. We built and validated a working extraction script, documented the architectural changes required, and identified a prudent intermediate testing approach.

**Key Finding**: The native plotting approach is technically viable and offers significant advantages (28x smaller data, dynamic faceting, modern styling), but requires validation before committing.

**Recommendation**: Build a prototype test page using the extracted data before changing any backend infrastructure.

---

## Problem Statement

The current Ryan White Map Explorer approach generates ~64K pre-rendered Plotly JSON files (one per city/scenario/outcome/facet combination). This has several limitations:

1. **Fixed faceting** - Can only display pre-computed combinations
2. **Large storage** - ~1.3 GB for full dataset
3. **R-locked styling** - Plots look like ggplot2 output, not modern web charts
4. **Complex infrastructure** - 64K files to manage, complex DynamoDB indexing

The team wanted to explore whether we could:
- Extract raw summary data from simsets
- Render plots natively in React with Recharts
- Gain flexibility, better styling, and simpler architecture

---

## Investigation Process

### 1. Data Structure Analysis

Explored the jheem2 R package's data structures:

- **Simsets**: R6 objects containing simulation results as multi-dimensional arrays
- **Data Manager**: Contains real-world observation data with source attribution
- **simplot function**: ~1,500 lines of R code handling extraction, transformation, and rendering

**Key Insight**: The statistical computation (mean/CI from simulation ensembles) is already done in the simsets. We don't need to replicate that - just extract the pre-computed summaries.

### 2. Extraction Script Development

Built `extract_summary_data.R` that:
- Loads simsets and extracts summary statistics at finest granularity (age × sex × race)
- Maps simset outcomes to data manager outcomes using `corresponding.observed.outcome`
- Handles observation data at varying granularities (graceful fallback)
- Outputs JSON with all metadata needed for frontend rendering

**Challenges Encountered:**
1. Outcome name mismatch between simset and data manager (e.g., `new` → `diagnoses`)
2. Ontology mappings needed restoration for data manager to work
3. Observation data not available at full granularity (year+age+sex+race returns NULL)

### 3. Validation Results

Successfully extracted data for Baltimore (C.12580) with all 3 scenarios and 14 outcomes:

| Metric | Value |
|--------|-------|
| File size (uncompressed) | 15 MB |
| File size (gzipped) | 1.5 MB |
| Simulation data points | ~92,000 |
| Observation data points | ~479 |
| Extraction time | ~30 seconds |

**Projected full dataset (31 cities):**
- Uncompressed: ~465 MB
- Gzipped: ~47 MB (vs ~1.3 GB for 64K Plotly JSONs)

---

## Technical Findings

### What the Extracted Data Contains

```
metadata/
├── city, city_label
├── scenarios[]
├── outcomes{} (id, display_name, units, display_as_percent, corresponding_observed_outcome)
└── dimensions{} (age, sex, race with value arrays)

simulations/
└── [scenario]/
    ├── baseline/[outcome]/data/{stratum: [{year, value, lower, upper}...]}
    └── intervention/[outcome]/data/{stratum: [{year, value, lower, upper}...]}

observations/
└── [outcome]/
    ├── metadata (simset_outcome, data_manager_outcome, available_dimensions)
    └── data/{stratum: [{year, value, url?, source?}...]}
```

### Data Granularity

**Simulation data**: Full granularity (45 strata = 5 age × 3 sex × 3 race)

**Observation data**: Varies by outcome
- `new`, `diagnosed.prevalence`: year+age+sex (no race)
- `prep.uptake`, `suppression`, `testing`: year+age only
- Some outcomes: no observations available

### Outcome Mappings (Simset → Data Manager)

| Simset Outcome | Data Manager Outcome | Has Observations |
|----------------|---------------------|------------------|
| new | diagnoses | ✅ 103 points |
| diagnosed.prevalence | diagnosed.prevalence | ✅ 59 points |
| incidence | NULL | ❌ |
| prep.uptake | prep | ✅ 42 points |
| suppression | suppression | ✅ 15 points |
| testing | proportion.tested | ✅ 104 points |
| awareness | awareness | ❌ |
| rw.clients | NULL | ❌ |
| non.adap.clients | non.adap.clients | ✅ 42 points |
| adap.clients | non.adap.clients | ✅ 42 points |
| oahs.clients | oahs.clients | ✅ 36 points |
| adap.proportion | adap.proportion | ❌ |
| oahs.suppression | oahs.suppression | ✅ 36 points |
| adap.suppression | adap.suppression | ❌ |

---

## Confidence Assessment

### High Confidence ✅
- Extraction captures all simulation outcomes at full granularity
- Mean + confidence intervals are correctly extracted
- Metadata (display names, units, percent flags) is preserved
- File size estimates are accurate

### Medium Confidence ⚠️
- Observation data extraction may be missing some edge cases
- Haven't verified exact numerical match with what simplot produces
- `awareness` outcome has fewer dimensions than others (130 vs 1170 rows)

### Needs Validation ❓
- Whether extracted data can reproduce all 64K plot variations
- Whether any transformations in simplot are missing from extraction
- How observation data should align with simulation data when granularities differ

---

## Recommendations

### 1. Build Intermediate Test (Strongly Recommended)

Before any backend changes, create a test page that:

1. **Loads extracted JSON** from a static file or local fetch
2. **Renders plots** using Recharts with same controls as current UI
3. **Compares visually** against existing Plotly output and Shiny app

**Benefits:**
- Validates data format before infrastructure commitment
- Creates production-ready React components
- Enables stakeholder feedback on new styling
- De-risks the migration

**Implementation:**
- Create `/explore/test-native` route in jheem-portal
- Copy `C.12580_complete.json` to public assets
- Build `NativeSimulationChart` component with Recharts
- Add facet aggregation logic
- Side-by-side comparison toggle

### 2. Numerical Validation (Recommended)

Pick 3-4 specific data points and verify:
1. Extract value from simset using R directly
2. Compare with value in extracted JSON
3. Compare with value shown in Plotly JSON
4. Compare with value shown in Shiny app

This catches any transformation bugs before they become UX issues.

### 3. Proceed with Backend Changes (After Validation)

Only after the test page demonstrates:
- Visual parity with existing plots
- All faceting combinations work
- Performance is acceptable

Then implement:
- New S3 bucket for summary data
- v2 API endpoints
- GitHub Actions workflow for extraction
- Frontend cutover

---

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| `extract_summary_data.R` | jheem-container-minimal/ | R script for data extraction |
| `native-plotting-architecture.md` | jheem-backend/docs/ | Architecture documentation |
| `C.12580_complete.json` | jheem-container-minimal/output/ | Sample extracted data (15 MB) |
| `C.12580_complete.json.gz` | jheem-container-minimal/output/ | Compressed sample (1.5 MB) |

---

## Open Questions

1. **Charting library**: Recharts (already used) vs Plotly.js (more features)?
2. **Caching strategy**: Browser localStorage/IndexedDB for city data?
3. **Observation alignment**: How to handle mismatched granularities in charts?
4. **Custom simulations**: Use same format or keep Plotly JSON for those?

---

## Next Steps (Prioritized)

1. **Immediate**: Build test page with extracted data
2. **This week**: Validate visual parity with existing plots
3. **If validated**: Update CLAUDE.md with new roadmap
4. **Then**: Implement backend changes and cutover

---

## Appendix: Extraction Script Usage

```bash
# Run inside jheem-container-minimal with Docker
docker run --rm \
  --entrypoint Rscript \
  -v $(pwd)/simulations:/app/simulations:ro \
  -v $(pwd)/extract_summary_data.R:/app/extract_summary_data.R:ro \
  -v $(pwd)/output:/app/output \
  849611540600.dkr.ecr.us-east-1.amazonaws.com/jheem-ryan-white-model:latest \
  /app/extract_summary_data.R \
    --city C.12580 \
    --scenarios cessation,brief_interruption,prolonged_interruption \
    --output /app/output/C.12580_complete.json
```

**Arguments:**
- `--city`: City code (e.g., C.12580)
- `--scenarios`: Comma-separated scenario names
- `--outcomes`: Comma-separated outcomes (default: all)
- `--output`: Output JSON file path
- `--raw`: Output raw data frames instead of nested structure
