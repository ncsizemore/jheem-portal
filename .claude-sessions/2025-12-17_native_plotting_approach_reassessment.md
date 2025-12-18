# Native Plotting Approach: Reassessment and Path Forward

**Date**: 2025-12-17
**Status**: Investigation complete, decision needed
**Authors**: Engineering team with senior SWE guidance

---

## Executive Summary

After extensive investigation into extracting simulation and observation data for native frontend plotting, we've identified fundamental challenges that make a "clean extraction" approach significantly more complex than initially anticipated. This document summarizes our findings and recommends a pragmatic path forward.

**Recommendation**: Modify the existing batch plot generator to output data frames instead of rendered plots, then aggregate into per-city JSON files. This approach reuses battle-tested logic and can ship quickly, while allowing us to pursue robust extraction infrastructure as a longer-term investment.

---

## Investigation Timeline

### Phase 1: Initial Extraction Approach (Dec 11-14)

Created `extract_summary_data.R` to directly extract from simsets and data managers:
- Extract simulation data at finest granularity (45 strata: 5 age × 3 sex × 3 race)
- Extract observation data from data manager
- Let frontend aggregate as needed

**Initial results looked promising**: File sizes reasonable (~15 MB per city), data structure clean.

### Phase 2: Validation Against Shiny App (Dec 14-17)

Comparing extracted data to Shiny app revealed multiple issues:

| Issue | Severity | Root Cause |
|-------|----------|------------|
| Missing observation years (2013-2016, 2020) | High | Data manager has different data at different granularities |
| Observation value mismatches | High | Year-only vs year+demographic pulls return different values |
| Multiple sources per year not showing | Medium | Frontend display issue (data was extracted correctly) |
| Proportion outcomes showing >100% | **Critical** | Summing proportions across strata is mathematically incorrect |
| Sex categories wrong (msm/heterosexual_male/female vs male/female) | High | Ontology mapping between simset and data manager |
| Faceted views missing observations | High | Needed multi-granularity extraction |

### Phase 3: Root Cause Analysis

The core issues stem from two fundamental complexities:

#### 1. Proportion Aggregation Problem

When extracting at finest granularity, proportion outcomes (testing, suppression, awareness) return stratum-specific values:
- "18-24 years, female, black": 50.67% tested
- "25-34 years, msm, hispanic": 62.31% tested

**You cannot sum these to get an aggregate**. You need a weighted average, which requires either:
- Access to numerator/denominator data (not always available)
- Calling simset$get() at each aggregation level separately

Simset$get() handles this correctly internally - calling with `keep.dimensions = c("year")` returns the proper aggregate (14.8%), while our extraction at full granularity + frontend summation gave nonsense results.

#### 2. Ontology Mapping Complexity

The simset uses one ontology (sex = msm/heterosexual_male/female), while the data manager uses another (sex = male/female). Simplot has ~200 lines of logic handling:
- `target.ontology` parameter resolution
- `outcome.ontologies` from simsets
- `get.ontology.mapping()` calls
- `allow.mapping.from.target.ontology` flags

This isn't configuration - it's algorithmic complexity that varies by outcome, location, and data source.

---

## Options Analysis

### Option A: Continue Current Approach (Fix Issues Incrementally)

**Approach**: Keep fixing edge cases as discovered.

**Pros**:
- We've invested effort already
- Might work for some outcomes

**Cons**:
- Proportion aggregation is fundamentally broken (not fixable without restructuring)
- Ontology mapping would require reimplementing simplot logic
- Risk of subtle bugs that look correct but aren't
- Ongoing maintenance as jheem2 evolves

**Verdict**: Not recommended. The proportion issue alone is a showstopper.

### Option B: Leverage simplot's prepare_plot_local()

**Approach**: Call `prepare_plot_local()` for each combination, extract data frames instead of rendering plots.

**What prepare_plot_local returns**:
```r
list(
  df.sim = <simulation data frame, properly aggregated>,
  df.truth = <observation data frame, properly mapped>,
  details = list(y.label, plot.title, outcome.metadata.list, ...)
)
```

**Key insight**: The data frames are ALREADY correctly processed:
- Proportions computed at the right aggregation level
- Ontology mappings applied
- Percent conversions done
- Multiple sources preserved

**Call count analysis**:
- Cities: 32
- Scenarios: 3
- Outcomes: ~14
- Statistics: 3 (mean.and.interval, median.and.interval, individual.simulation)
- Facets: 4 (none, age, sex, race)

**Total**: 32 × 3 × 14 × 3 × 4 = **16,128 calls**

But wait - the current batch generator produces ~64K plots because it also varies by:
- Different statistic types generate visually different plots
- Some outcomes might have additional facet combinations

**Realistic estimate**: Similar to current batch generator (~64K calls), but outputting data instead of plots.

**Pros**:
- Guaranteed correctness (uses battle-tested simplot logic)
- All edge cases handled
- Can ship quickly
- Reuses existing infrastructure

**Cons**:
- Still ~64K generations (though faster than rendering plots)
- Compute cost similar to current approach
- Large intermediate output before aggregation

### Option C: Build Robust Extraction Infrastructure

**Approach**: Create proper R extraction methods that understand jheem2's internals.

**Would require**:
1. Understanding simset$get() aggregation logic for proportions
2. Understanding data manager ontology mapping system
3. Potentially jheem2 package modifications or collaboration with maintainers
4. Comprehensive testing against all outcomes/locations

**Pros**:
- Clean, reusable infrastructure
- Huge value-add for team
- Could enable new use cases (custom analysis, data export)

**Cons**:
- Significant effort (weeks, not days)
- May require jheem2 package changes
- Timeline risk

---

## Recommendation: Phased Approach

### Phase 1: Quick Win (Option B Modified)

**Modify batch_plot_generator.R to**:
1. Call `prepare_plot_local()` as it does now
2. Instead of rendering plot → serialize `df.sim` and `df.truth` to JSON
3. Aggregate per-city outputs into merged JSON files

**Output structure** (per city):
```json
{
  "metadata": { "city": "C.12580", "city_label": "Baltimore", ... },
  "data": {
    "cessation": {
      "incidence": {
        "mean.and.interval": {
          "none": { "sim": [...], "obs": [...] },
          "age": { "sim": [...], "obs": [...] },
          "sex": { "sim": [...], "obs": [...] },
          "race": { "sim": [...], "obs": [...] }
        },
        "median.and.interval": { ... },
        "individual.simulation": { ... }
      },
      ...
    },
    ...
  }
}
```

**Why this works**:
- ~64K generations, but each is fast (no plot rendering)
- Output is ~2000 data frames per city, mergeable to one JSON
- Frontend can directly use the pre-aggregated data
- Guaranteed parity with Shiny app

**Estimated effort**: 2-3 days
- Modify batch_plot_generator.R to output data frames
- Create aggregation script to merge per-city
- Update frontend types and components

### Phase 2: Robust Extractors (Option C)

After Phase 1 ships, invest in proper extraction infrastructure:
1. Document how simset$get() handles aggregation
2. Document ontology mapping patterns
3. Create reusable extraction functions
4. Consider proposing additions to jheem2 package

**Benefit**: Future flexibility - custom analyses, data exports, reduced compute costs.

---

## Addressing Your Questions

### "Could we condense into fewer calls?"

**Honest answer**: Not significantly. The ~64K count comes from the combinatorial explosion of:
- outcomes × scenarios × statistics × facets × cities

Each combination produces genuinely different data (different aggregation level, different statistic type). The only way to reduce calls would be to reduce what we offer users (fewer statistics, fewer facet options).

### "Generate dataframes that could be aggregated/merged into fewer files?"

**Yes, exactly**. The workflow would be:

1. **Generate**: Run ~64K prepare_plot_local calls (similar compute to current)
2. **Serialize**: Output each as small JSON chunk
3. **Aggregate**: Merge all chunks for a city into one file
4. **Serve**: Frontend loads one file per city (~10-30 MB gzipped)

This is essentially the same compute as the current Plotly approach, but:
- Faster per-call (no plot rendering overhead)
- Much smaller output (data vs rendered plots)
- Frontend can render natively with Recharts

### "Quick win approach, then robust extractors later?"

**100% agree**. This is the right sequencing:

1. **Ship** something that works and matches Shiny app (Phase 1)
2. **Learn** from production usage what's actually needed
3. **Invest** in robust infrastructure if/when justified (Phase 2)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phase 1 takes longer than estimated | Medium | Medium | Time-box to 1 week, fall back to Plotly if blocked |
| Generated files too large | Low | Medium | Gzip compression, lazy loading by outcome |
| Frontend rendering performance | Low | Low | Recharts is performant, can optimize later |
| Edge cases in specific outcomes | Medium | Low | Can fix incrementally, have Plotly fallback |

---

## Next Steps

1. [ ] Team alignment on this approach
2. [ ] Create branch for batch_plot_generator modifications
3. [ ] Implement data frame extraction mode
4. [ ] Create aggregation script
5. [ ] Update frontend to consume new format
6. [ ] Test against Shiny app for sample cities
7. [ ] Run full generation
8. [ ] Deploy and monitor

---

## Appendix: Technical Details

### Current extract_summary_data.R Issues

```r
# PROBLEM 1: Extracting at finest granularity
keep.dimensions <- c("year", "age", "sex", "race")  # 45 strata

# Then frontend sums across strata - WRONG for proportions!
# 50% + 60% + 40% ≠ aggregate proportion
```

```r
# PROBLEM 2: Observation data granularity
# Our approach: try finest granularity first, fall back
# Simplot approach: use facet.by to determine granularity

# Result: We miss year-only data when year+age data exists
```

### prepare_plot_local Output Structure

```r
prepare_plot_local(...) returns:
  $df.sim:  data.frame with columns:
    - year, value (or value.mean/value.lower/value.upper)
    - facet.by1, facet.by2 (if faceting)
    - stratum (if split.by)
    - simset, outcome, outcome.display.name

  $df.truth: data.frame with columns:
    - year, value
    - facet.by1, facet.by2 (if faceting)
    - stratum (if split.by)
    - source, outcome

  $details: list with y.label, plot.title, metadata
```

### Files Modified in Investigation

| File | Repository | Changes |
|------|------------|---------|
| extract_summary_data.R | jheem-container-minimal | Multi-granularity observation extraction |
| native-plotting.ts | jheem-portal | Updated types for multi-granularity |
| aggregateSimulationData.ts | jheem-portal | Updated aggregation logic |
| 2025-12-14_observation_data_investigation.md | jheem-portal | Initial investigation notes |

---

## Conclusion

The "clean extraction" approach hit fundamental mathematical and architectural barriers. Rather than fight these, we should leverage simplot's existing logic through a modified batch generation workflow. This gets us to a working native plotting solution quickly, with an option to optimize later through robust extraction infrastructure.

The key insight is that **simplot has already solved the hard problems**. We should extract its results, not reimplement its logic.
