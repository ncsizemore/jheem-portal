# Session: Native Plotting Integration

**Date**: 2025-12-18
**Duration**: ~2 hours
**Status**: Phase 1 validation complete, proof of concept working

---

## Objective

Integrate native Recharts plotting into the map explorer, replacing Plotly with a lighter-weight, more controllable solution.

---

## What We Built

### 1. Aggregation Script (`scripts/aggregate-city-data.ts`)

Merges per-combination JSON files into a single per-city file:

```bash
npx ts-node scripts/aggregate-city-data.ts public/test-data public/data/C.12580.json
```

**Input**: 44 individual JSON files (one per outcome/statistic/facet combination)
**Output**: Single 74 MB file (2.3 MB gzipped)

Structure:
```json
{
  "metadata": { "city", "scenarios", "outcomes", "statistics", "facets" },
  "data": {
    "[scenario]": {
      "[outcome]": {
        "[statistic]": {
          "[facet]": { "sim": [...], "obs": [...], "metadata": {...} }
        }
      }
    }
  }
}
```

### 2. Data Loading Hook (`src/hooks/useCityData.ts`)

- Loads aggregated city JSON from `/data/{cityCode}.json`
- Caches in memory to avoid re-fetching
- Provides `getPlotData(scenario, outcome, statistic, facet)` accessor
- Provides `getAvailableOptions()` for dropdown population

### 3. Native Plot Overlay (`src/components/NativePlotOverlay.tsx`)

- Replaces Plotly-based `MapPlotOverlay`
- Uses `NativeSimulationChart` for rendering
- Display toggles: confidence intervals, baseline, observations
- Supports single panel (unfaceted) and grid layout (faceted)

### 4. Native Plot Controls (`src/components/NativePlotControls.tsx`)

- Three dropdowns: Outcome, Statistic, Facet
- Derives options from loaded city data
- Triggers re-render on selection change

### 5. Native Explorer Page (`src/app/explore/native/page.tsx`)

- Full map explorer using native components
- Currently hardcoded to Baltimore (only city with test data)
- Shows "Native Plotting Mode (Testing)" banner

---

## Test Results

| Feature | Status |
|---------|--------|
| Data loading | ✅ Works |
| Summary statistics (mean/CI) | ✅ Renders correctly |
| Individual simulations (160 lines) | ✅ Renders correctly |
| Faceted views (age/sex/race) | ✅ Multiple panels display |
| Unfaceted views | ✅ Single panel displays |
| Display toggles | ✅ CI, baseline, observations toggle |
| Outcome switching | ✅ Updates chart |
| Statistic switching | ✅ Updates chart |
| Facet switching | ✅ Updates chart |
| Visual parity with Shiny | ✅ Confirmed |

---

## File Sizes

| Metric | Value |
|--------|-------|
| Test data (44 files) | ~65 MB |
| Aggregated (uncompressed) | 74 MB |
| Aggregated (gzipped) | 2.3 MB |
| Projected for 31 cities | ~71 MB gzipped |

This is significantly smaller than 64K Plotly JSONs (~1.3 GB).

---

## UI Work Remaining

The proof of concept is functional but not polished:

1. **Header styling** - Match the Plotly overlay's cinematic gradient header
2. **Chart sizing** - Better use of available space
3. **Spacing/padding** - Consistent margins in faceted view
4. **Legend positioning** - Currently uses default Recharts legend
5. **Mobile responsiveness** - Untested on small screens
6. **Loading transitions** - Add skeleton/shimmer states
7. **Observation tooltip** - Position could be improved

---

## Architecture Decisions

### Why aggregated per-city files?

- **Simpler frontend**: Single fetch per city, no complex API calls
- **Better caching**: One file can be cached for entire session
- **Reduced latency**: No round-trips for each plot variation
- **Offline-friendly**: Could cache in localStorage/IndexedDB

### Why keep individual simulation data?

The session notes from 12/17-12/18 decided to:
- Bundle summary stats (mean/median) in main city file
- Lazy-load individual simulations separately (too large to bundle)

Current test data includes both, but production would split them.

---

## Next Steps (Recommended Priority)

### Option A: Polish UI and Ship
1. Match Plotly overlay styling
2. Generate data for all 31 cities
3. Replace `/explore` with native version
4. Deploy

**Effort**: 2-3 days
**Outcome**: Production-ready native plotting

### Option B: Backend Infrastructure First
1. Set up S3 bucket for city data
2. Configure CloudFront caching
3. Create GitHub Actions workflow for data generation
4. Then polish UI

**Effort**: 3-4 days
**Outcome**: Scalable infrastructure, then UI

### Option C: Custom Simulations Track
1. Deploy Lambda for custom simulations
2. Build parameter input UI
3. Implement async job pattern

**Effort**: 4-5 days
**Outcome**: Feature parity with Shiny app

---

## Files Created/Modified

### Created
- `scripts/aggregate-city-data.ts`
- `src/hooks/useCityData.ts`
- `src/components/NativePlotOverlay.tsx`
- `src/components/NativePlotControls.tsx`
- `src/app/explore/native/page.tsx`

### Modified
- `.gitignore` - Added `public/data/`
- `CLAUDE.md` - Updated with session progress

### Generated (gitignored)
- `public/data/C.12580.json` - Aggregated Baltimore data

---

## Senior SWE Assessment

**What went well:**
- Clean separation of concerns (hook, overlay, controls, page)
- Type safety throughout
- Reused existing `NativeSimulationChart` component
- Aggregation script is simple and fast

**What could be better:**
- UI needs polish before production
- Hardcoded city list should come from data manifest
- No loading states during city data fetch
- Error handling is minimal

**Recommendation:**
The proof of concept validates the architecture. Next step should be UI polish + full dataset generation, then ship. Custom simulations can come later - they're a separate track that doesn't block native plotting.
