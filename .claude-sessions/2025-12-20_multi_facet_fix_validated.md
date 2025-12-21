# Session: Multi-Level Faceting Fix Validated

**Date**: 2025-12-20
**Status**: Multi-facet fix validated, CI rendering deferred, ready for production planning
**Previous Session**: `2025-12-19_native_plotting_issues_and_architecture.md`

---

## Session Accomplishments

### Issue 1: Multi-Level Faceting - RESOLVED

The root cause identified in the previous session was confirmed and fixed:

**Problem**: `batch_plot_generator.R` only extracted `facet.by1`, ignoring subsequent facet columns for multi-dimensional breakdowns.

**Fix Applied** (jheem-container-minimal, already committed):
```r
# OLD: if ("facet.by1" %in% names(df)) sim_cols <- c(sim_cols, "facet.by1")
# NEW: Capture ALL facet.by* columns
facet_cols <- grep("^facet\\.by[0-9]+$", names(df), value = TRUE)
if (length(facet_cols) > 0) sim_cols <- c(sim_cols, facet_cols)
```

**Frontend Support Added** (this session):
- `src/types/native-plotting.ts`: Added `facet.by2`, `facet.by3`, `facet.by4` to type definitions
- `src/utils/transformPlotData.ts`: Added `getCompositeFacetKey()` helper for multi-dimensional grouping

**Validation Results**:
| Metric | Before Fix | After Fix |
|--------|------------|-----------|
| `age+race+sex` panels | 5 (age only) | 45 (5×3×3) |
| Facet columns in data | `facet.by1` only | `facet.by1`, `facet.by2`, `facet.by3` |
| Files generated | 954 | 954 |
| Aggregated size | 328 MB / 17 MB gz | 398 MB / 17.7 MB gz |

The slight size increase is expected - we're now including all facet columns instead of just one.

---

## Current State Assessment

### What's Working
- Full 16-facet data generation (954 files per city)
- Multi-level faceting displays correct panel counts
- Data pipeline: R container → JSON files → aggregation script → frontend
- All outcomes, statistics, and facet combinations render

### What's Not Working
- **CI shading**: Renders from x-axis to upper bound instead of lower-to-upper band
- This is a cosmetic issue, not a data issue - the values are correct

### What Needs Attention Before Production
1. **Performance architecture**: 398 MB per city in browser memory is concerning
2. **CI rendering fix**: Low effort, should be quick to resolve
3. **31-city generation pipeline**: Need GitHub Actions workflow or batch script

---

## Technical Debt & Recommendations

### Performance Architecture (High Priority)

Current state: 398 MB uncompressed, 17.7 MB gzipped per city.

**Concern**: With 16 facets including 4-dimensional breakdowns (age+race+sex+risk), data volume has grown. For 31 cities:
- Total download: ~550 MB gzipped
- Total memory: ~12 GB if all cities loaded

**Recommendation**: Implement scenario-based splitting before scaling to 31 cities.

```
Current:  /data/C.12580.json (398 MB)
Proposed: /data/C.12580/cessation.json (~130 MB)
          /data/C.12580/brief_interruption.json (~130 MB)
          /data/C.12580/prolonged_interruption.json (~130 MB)
```

This aligns with user flow (select city → select scenario → explore) and reduces memory footprint 3x.

**Implementation**:
1. Modify `aggregate-city-data.ts` to output per-scenario files
2. Update `useCityData.ts` to load scenarios on demand
3. Add loading indicator when switching scenarios

### CI Rendering Fix (Medium Priority)

The current Recharts `<Area>` implementation fills from y=0. Two approaches:

**Quick fix**: Use `baseValue` prop (if Recharts supports it) or stacked areas with white cutout.

**Proper fix**: Use a `<path>` element with custom d attribute that traces lower→upper→upper→lower polygon.

Estimate: 1-2 hours.

---

## Files Modified This Session

| File | Change |
|------|--------|
| `src/types/native-plotting.ts` | Added `facet.by2`, `facet.by3`, `facet.by4` to interfaces |
| `src/utils/transformPlotData.ts` | Added composite facet key helpers |
| `src/hooks/useCityData.ts` | Removed unused import |

---

## Recommended Next Steps

### Immediate (Next Session)
1. **Fix CI rendering** - Quick win, improves visual polish
2. **Implement scenario splitting** - Critical for production performance
3. **Regenerate Baltimore** with scenario-split output

### Short-term (This Week)
4. **Create 31-city generation script** - Either GitHub Actions workflow or local batch script
5. **Set up S3 + CloudFront** - Host production data with gzip and caching
6. **Generate full dataset** - All 31 cities with scenario splitting

### Medium-term
7. **Replace legacy map explorer** - Swap `/explore` to use native plotting
8. **Deprecate Plotly JSON pipeline** - Remove v1 API and old data

---

## Decision Points for Next Session

1. **Scenario splitting approach**:
   - Option A: Modify aggregation script to output 3 files per city
   - Option B: Keep single file, implement lazy loading with IndexedDB caching

   **Recommendation**: Option A - simpler, aligns with user flow, proven pattern.

2. **CI rendering approach**:
   - Option A: Stacked areas with white cutout (quick hack)
   - Option B: Custom SVG path (proper implementation)
   - Option C: Switch to visx/d3 (more control, bigger change)

   **Recommendation**: Try Option B first - it's the right abstraction and Recharts supports custom shapes.

---

## Session Log

- Confirmed container rebuild completed successfully
- Regenerated Baltimore data with fixed container (954 files)
- Ran aggregation script (398 MB output)
- Verified multi-level faceting: `age+race+sex` now shows 45 panels
- Confirmed facet columns: `facet.by1`, `facet.by2`, `facet.by3` all present
- User validated in browser - panel counts correct
- CI shading issue noted but deferred to next session

---

## Commands Reference

**Regenerate Baltimore data**:
```bash
docker run --rm \
  -v /Users/cristina/wiley/Documents/jheem-container-minimal/simulations:/app/simulations \
  -v /Users/cristina/wiley/Documents/jheem-portal/generated-data/baltimore-full:/output \
  849611540600.dkr.ecr.us-east-1.amazonaws.com/jheem-ryan-white-model:latest \
  batch --city C.12580 \
  --scenarios cessation,brief_interruption,prolonged_interruption \
  --outcomes incidence,diagnosed.prevalence,suppression,testing,prep.uptake,awareness,rw.clients,adap.clients,non.adap.clients,oahs.clients,adap.proportion,oahs.suppression,adap.suppression,new \
  --statistics mean.and.interval,median.and.interval \
  --facets "none,age,race,sex,risk,age+race,age+sex,age+risk,race+sex,race+risk,sex+risk,age+race+sex,age+race+risk,age+sex+risk,race+sex+risk,age+race+sex+risk" \
  --output-dir /output --output-mode data
```

**Aggregate data**:
```bash
npx tsx scripts/aggregate-city-data.ts \
  /Users/cristina/wiley/Documents/jheem-portal/generated-data/baltimore-full/C.12580 \
  public/data/C.12580.json
```
