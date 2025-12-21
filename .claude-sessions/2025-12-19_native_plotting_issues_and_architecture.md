# Session: Native Plotting Issues & Architecture Review

**Date**: 2025-12-19
**Status**: Issues identified, decisions needed before proceeding
**Previous Session**: `2025-12-18_full_baltimore_data_generation.md`

---

## Context

After completing full 16-facet Baltimore generation (954 files, 17MB gzipped), testing revealed three significant issues that need resolution before scaling to 31 cities.

---

## Issue 1: Multi-Level Faceting is Broken (Critical) ✅ FIXED

### Symptom
Selecting `age+race+sex` facet in the UI shows only 5 panels (one per age group), not 45 panels (5 ages × 3 races × 3 sexes).

### Root Cause
**Found!** The `batch_plot_generator.R` was only extracting `facet.by1`, ignoring `facet.by2`, `facet.by3`, etc.

In `generate_data_output()` (lines 493-495):
```r
# OLD (broken):
if ("facet.by1" %in% names(prepared_data$df.sim)) sim_cols <- c(sim_cols, "facet.by1")
```

The R `prepare_plot_local()` correctly creates multiple columns (`facet.by1`, `facet.by2`, etc.), but the batch generator only copied the first one.

### Fix Applied

**R side** (`jheem-container-minimal/batch_plot_generator.R`):
```r
# NEW (fixed) - capture ALL facet.by* columns:
facet_cols <- grep("^facet\\.by[0-9]+$", names(prepared_data$df.sim), value = TRUE)
if (length(facet_cols) > 0) sim_cols <- c(sim_cols, facet_cols)
```

**Frontend side** (`src/utils/transformPlotData.ts`):
- Added `getCompositeFacetKey()` helper to combine `facet.by1`, `facet.by2`, etc.
- Creates composite labels like "13-24 years | Black | MSM"

**Types** (`src/types/native-plotting.ts`):
- Added `facet.by2`, `facet.by3`, `facet.by4` to `SimDataPoint` and `ObsDataPoint`

### Status
- ✅ R fix committed to jheem-container-minimal
- ✅ Frontend fixes committed to jheem-portal
- ⏳ Need to regenerate Baltimore data to test

---

## Issue 2: Confidence Interval Rendering Bug (Medium)

### Symptom
- CI shading appears as solid black/combined color
- Shading extends from x-axis to upper bound, not from lower to upper bound

### Root Cause
Recharts `Area` component misuse in `NativeSimulationChart.tsx`:

```jsx
// Current (wrong) - fills from y=0 to y=upper
<Area dataKey="upper" fill={gradient} />

// Should render band from lower to upper
```

### Fix Options

**Option A: Stacked Areas (Simple)**
```jsx
<Area dataKey="upper" fill={gradient} stackId="ci" />
<Area dataKey="lower" fill="#ffffff" stackId="ci" />  // White cutout
```

**Option B: Custom Path (More Control)**
Use `<Area>` with custom `d` attribute to draw exact path from lower to upper.

**Option C: Use Different Library**
Libraries like `visx` or `d3` have better CI band support.

**Recommendation**: Try Option A first - it's a 10-line change. If visual quality isn't good enough, consider Option C for a future polish pass.

### Files to Modify
- `src/components/NativeSimulationChart.tsx` (lines 306-330)

---

## Issue 3: Memory/Performance Architecture (Critical for Production)

### Current State
- Single city file: 328MB uncompressed, 17MB gzipped
- 31 cities: ~10GB uncompressed, ~527MB gzipped total
- Per-city load: 17MB download, 328MB in browser memory

### Problems

| Concern | Impact |
|---------|--------|
| **Parse time** | 2-5 second main thread block on JSON.parse() |
| **Memory** | 328MB per city in JS heap |
| **Mobile** | Will crash on 1-2GB RAM devices |
| **First paint** | User sees nothing for 3-5 seconds |
| **Multi-tab** | Risk of OOM with multiple cities open |

### Architecture Options

#### Option A: Split by Scenario (Recommended)
```
/data/C.12580/cessation.json           (~6MB gzipped, ~110MB memory)
/data/C.12580/brief_interruption.json
/data/C.12580/prolonged_interruption.json
```

**Pros**: 3x smaller memory footprint, <1s parse time, simple implementation
**Cons**: 3 files per city instead of 1, slight workflow change in aggregation

#### Option B: Split by Outcome
```
/data/C.12580/cessation/incidence.json     (~0.5MB each)
/data/C.12580/cessation/prevalence.json
...
```

**Pros**: Minimal memory per view, instant switching within scenario
**Cons**: Many small files (14 per scenario × 3 scenarios = 42 per city), more HTTP requests

#### Option C: API with Server-Side Filtering
```
GET /api/plot-data?city=C.12580&scenario=cessation&outcome=incidence&facet=age
```

**Pros**: Minimal client memory, exact data needed
**Cons**: Requires backend changes, more latency per request

#### Option D: Keep Current + IndexedDB Caching
Store full 328MB in IndexedDB after first load.

**Pros**: Subsequent visits instant
**Cons**: First visit still slow, storage quota issues

### Recommendation: Option A (Split by Scenario)

**Rationale**:
1. Natural user flow: select city → select scenario → explore outcomes
2. 3x improvement is enough for most devices
3. Minimal implementation changes
4. Can further split later if needed

**Implementation**:
1. Modify `aggregate-city-data.ts` to output per-scenario files
2. Update `useCityData.ts` to load scenario on demand
3. Add loading state when switching scenarios

---

## Decision Matrix

| Issue | Severity | Block Ship? | Recommended Action |
|-------|----------|-------------|-------------------|
| Multi-level faceting | High | Yes | Investigate R code, decide fix vs defer |
| CI rendering | Medium | No | Quick frontend fix |
| Performance | High | Yes | Split by scenario before 31-city generation |

---

## Recommended Path Forward

### Phase 1: Investigation (1-2 hours)
1. [ ] Check `batch_plot_generator.R` facet handling
2. [ ] Verify Shiny app shows multi-level facets correctly
3. [ ] Determine if fix is in batch script or requires jheem2 changes

### Phase 2: Architecture Decision
Based on Phase 1 findings:

**If multi-level faceting is fixable quickly:**
- Fix faceting
- Implement scenario splitting
- Regenerate Baltimore with correct data
- Validate
- Scale to 31 cities

**If multi-level faceting requires significant R work:**
- Ship with single-dimension facets only (none, age, race, sex, risk)
- Implement scenario splitting
- Regenerate Baltimore
- Scale to 31 cities
- Add multi-level faceting in future release

### Phase 3: Implementation
1. [ ] Fix CI rendering (can do in parallel)
2. [ ] Implement scenario-split aggregation
3. [ ] Update frontend data loading
4. [ ] Regenerate Baltimore with correct approach
5. [ ] Validate thoroughly
6. [ ] Scale to 31 cities

---

## Questions for Product/Team

1. **Multi-level facets**: How important is `age+race+sex` breakdown vs simpler `age`, `race`, `sex` separately? Do users actually use multi-dimensional views in Shiny?

2. **Performance target**: What's the acceptable load time? 2 seconds? 5 seconds? This affects architecture choice.

3. **Mobile support**: Do we need to support mobile devices with <2GB RAM? If yes, scenario splitting is mandatory.

---

## Files Referenced

| File | Purpose |
|------|---------|
| `jheem-container-minimal/batch_plot_generator.R` | R data generation - likely location of facet bug |
| `src/components/NativeSimulationChart.tsx` | CI rendering bug location |
| `src/hooks/useCityData.ts` | Data loading - needs scenario split support |
| `scripts/aggregate-city-data.ts` | Aggregation - needs scenario split output |

---

## Session Log

- Identified multi-level faceting produces incorrect data (facet.by1 only)
- Identified CI shading renders from 0 instead of from lower bound
- Analyzed memory implications of 328MB per-city files
- Recommended scenario-split architecture for production
- Created decision matrix and phased action plan
