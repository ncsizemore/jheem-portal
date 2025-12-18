# Native Plotting: Validation Complete, Roadmap Defined

**Date**: 2025-12-18
**Status**: Phase 1 validation complete, ready for production implementation
**Perspective**: Senior SWE technical lead

---

## Executive Summary

We've successfully validated the native plotting approach using Recharts with pre-aggregated data from `prepare_plot_local()`. Both summary statistics (mean/median with confidence intervals) and individual simulations (160 lines per chart) render correctly with visual parity to the Shiny app.

This session established a clear, pragmatic roadmap for shipping native plotting in production while managing the complexity of individual simulation data.

---

## What We Accomplished

### 1. Individual Simulation Support

Extended the native plotting implementation to handle `individual.simulation` statistic:

**Backend (`batch_plot_generator.R`):**
- Added extraction of `sim` column to identify each of 80 simulation runs per simset

**Frontend types (`native-plotting.ts`):**
- Added `sim?: string` to `SimDataPoint`
- Added `SimulationLine` interface for grouped line data
- Extended `FacetPanel` with `individualSimulations` and `isIndividualSimulation`

**Transform logic (`transformPlotData.ts`):**
- Added `transformIndividualSimulations()` to group data by simset + simId
- Updated `getValueRange()` to calculate bounds across all simulation lines

**Chart component (`NativeSimulationChart.tsx`):**
- Renders 160 semi-transparent lines (80 baseline gray, 80 intervention blue)
- Conditional rendering based on statistic type
- Disabled tooltip for individual sims (too many lines)

### 2. Expanded Test Dataset

Generated 44 test files covering:
- 6 outcomes: incidence, diagnosed.prevalence, testing, suppression, awareness, new
- 2 statistics: mean.and.interval, individual.simulation
- 4 facets: none, sex, age, race (where available)

**Known issue documented:** awareness outcome with age facet has data alignment issue in source data (not our bug).

### 3. Visual Validation

Confirmed visual parity with Shiny app across all test combinations. The native Recharts rendering matches the existing Plotly output.

### 4. Commits

Two commits on `main` (not yet pushed):
1. `feat(native-plotting): switch to pre-aggregated data from prepare_plot_local`
2. `feat(native-plotting): add individual simulation rendering support`

---

## Key Technical Decisions

### Why `prepare_plot_local()` Instead of Raw Extraction

The December 17 investigation revealed fundamental barriers to extracting raw data and aggregating client-side:

1. **Proportion aggregation**: You can't sum percentages across strata. `50% + 60% + 40% ≠ aggregate %`. Need weighted averages with numerator/denominator access.

2. **Ontology mapping**: Simset uses `msm/heterosexual_male/female`, data manager uses `male/female`. ~200 lines of mapping logic in simplot.

`prepare_plot_local()` handles both correctly. We extract its output rather than reimplementing its logic.

### File Size Reality Check

Analyzed realistic file sizes for full production dataset:

| Statistic Type | Unfaceted | Single Facet | Multi-Facet |
|----------------|-----------|--------------|-------------|
| Mean/median | ~17 KB | ~60 KB | ~150 KB |
| Individual sim | ~800 KB | ~4 MB | ~10-20 MB |

Individual simulations are 10-50x larger than summary stats. This drives the architecture.

### Facet Scope Reduction

Full config has 16 facet combinations (all 1/2/3/4-way combos). Reduced to 7 for v1:
- none, age, sex, race (single facets)
- age+sex, age+race, sex+race (two-way)

3-way and 4-way facets are niche use cases. Can add later if requested.

---

## Production Roadmap

### Phase 1: Summary Statistics (v1 Release)

**Scope:** mean.and.interval + median.and.interval, 7 facet options, 31 cities

**Data structure:** One merged JSON per city
```
/data/C.12580.json.gz  (~15-20 MB gzipped)
/data/C.12940.json.gz
...31 cities
```

**Total size:** ~500-600 MB gzipped

**Implementation:**
1. Create aggregation script to merge per-combination outputs into per-city JSON
2. Update GitHub Actions workflow with aggregation step
3. Upload to S3 with CloudFront caching
4. Replace Plotly rendering in `/explore` with `NativeSimulationChart`
5. Load city JSON on selection, index into it for user's choices

**Estimated effort:** 3-5 days

### Phase 2: Individual Simulations (Lazy Loading)

**Challenge:** Individual sim files are too large to bundle with summary stats.

**Solution:** Fetch on demand when user selects "Individual Simulations" statistic

```
/data/C.12580.json.gz                           # Summary stats
/data/individual/C.12580/incidence_none.json.gz  # Individual sim (on demand)
/data/individual/C.12580/incidence_age.json.gz
...
```

**User flow:**
1. Load city → fetch summary file (cached)
2. Toggle to individual simulations → fetch specific file
3. Show loading indicator
4. Cache for session

**File count:** ~3,000 individual sim files (31 cities × 14 outcomes × 7 facets)

**Estimated effort:** 2-3 days on top of Phase 1

### Long-Term Architecture

```
Frontend (Recharts)
       │
       ▼
CloudFront CDN (24h cache, gzip)
       │
       ▼
S3 Bucket
  /data/{city}.json.gz           # Summary stats
  /data/individual/{city}/*.gz   # Individual sims (lazy)
       ▲
       │
GitHub Actions (on demand)
  1. Generate data (prepare_plot_local)
  2. Aggregate per city
  3. Upload to S3
```

**Key properties:**
- Static files only, no Lambda for data serving
- ~$5-10/month infrastructure cost
- Regenerate on demand when simulations update

---

## Immediate Next Steps (Next Session)

### Priority 1: Clean Up Git History

The 65MB test data was committed but not pushed. Need to:
1. Remove test data from git history (rebase or filter-branch)
2. Decide where test data should live (gitignored local, or regenerate on demand)

### Priority 2: Create Aggregation Script

Script that takes per-combination JSON files and merges into single per-city file:

```python
# Input: data/C.12580/cessation/incidence_mean.and.interval_none.json
#        data/C.12580/cessation/incidence_mean.and.interval_age.json
#        ...hundreds of files...

# Output: data/C.12580.json (merged, structured)
```

Structure of merged file:
```json
{
  "metadata": { "city": "C.12580", "city_label": "Baltimore", ... },
  "scenarios": {
    "cessation": {
      "incidence": {
        "mean.and.interval": {
          "none": { "sim": [...], "obs": [...], "metadata": {...} },
          "age": { "sim": [...], "obs": [...], "metadata": {...} },
          ...
        },
        "median.and.interval": { ... }
      },
      ...
    },
    ...
  }
}
```

### Priority 3: Test Full City Generation

Run full generation for Baltimore with reduced facet set:
- Verify file sizes match estimates
- Validate merged file structure
- Test frontend loading

### Priority 4: Update GitHub Actions

Modify `generate-plots.yml` workflow:
1. Use `--output-mode data` flag
2. Add aggregation step after generation
3. Upload to new S3 location

---

## Files Modified This Session

| File | Repository | Changes |
|------|------------|---------|
| `batch_plot_generator.R` | jheem-container-minimal | Added `sim` column extraction |
| `native-plotting.ts` | jheem-portal | Added individual simulation types |
| `transformPlotData.ts` | jheem-portal | Added individual simulation transform |
| `NativeSimulationChart.tsx` | jheem-portal | Added individual simulation rendering |
| `test-native/page.tsx` | jheem-portal | Expanded test file options |
| `public/test-data/*.json` | jheem-portal | 44 test files (to be removed) |

---

## Open Questions for Team

1. **Facet scope confirmation:** Are 7 facet options (single + two-way) sufficient for v1? Or are there specific 3-way combos users need?

2. **Deployment target:** Continue with Vercel + S3/CloudFront, or consider alternatives?

3. **Timeline:** When do we want v1 shipped? This affects whether to parallelize work.

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Merged files too large | Low | Gzip effective; can split by scenario if needed |
| Individual sim lazy loading feels slow | Medium | Prefetch on hover; good loading UX |
| Edge cases in specific outcomes | Medium | Existing test coverage; can fix incrementally |
| GitHub Actions compute time | Low | Matrix strategy parallelizes across cities |

---

## Conclusion

The native plotting approach is validated and ready for production. The key insight from this session is separating summary stats (ship now, bundled per-city) from individual simulations (ship later, lazy-loaded). This lets us deliver value quickly while managing complexity.

Next session should focus on git cleanup and the aggregation script - the critical path items for Phase 1.
