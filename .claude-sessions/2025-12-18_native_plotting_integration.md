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

---

## Plan for Next Session: Full Data Generation & Backend Setup

### Context

Phase 1 scope (from Dec 17-18 decisions):
- **Include:** mean.and.interval, median.and.interval (summary stats)
- **Exclude:** individual.simulation (Phase 2, lazy-loaded later)
- **Facets:** 7 options (none, age, sex, race, age+sex, age+race, sex+race)

Current test data is incomplete:
- 1 scenario (cessation only)
- 6 outcomes
- 2 statistics
- 4 facets (single dimension only)

Full data per city:
- 3 scenarios × 14 outcomes × 2 statistics × 7 facets = **~588 combinations**

### Step 1: Validate File Size with Full Baltimore

**Goal:** Get real numbers before scaling to 31 cities

**Actions:**
1. Run `batch_plot_generator.R` locally with:
   - `--city C.12580`
   - `--scenarios cessation,brief_interruption,prolonged_interruption`
   - `--outcomes` (all 14)
   - `--statistics mean.and.interval,median.and.interval`
   - `--facets none,age,sex,race,age_sex,age_race,sex_race`
   - `--output-mode data`

2. Run aggregation script on output

3. Measure:
   - Raw file count and size
   - Aggregated JSON size (uncompressed)
   - Gzipped size

**Expected:** 5-15MB gzipped per city (rough estimate)
**If larger:** May need to split by scenario or outcome

### Step 2: Backend Infrastructure (S3 + CloudFront)

**Goal:** Simple static hosting for aggregated city JSONs

**Actions:**
1. Create S3 bucket: `jheem-native-plot-data` (or similar)
   - Enable public read access for objects
   - Enable gzip content-encoding

2. Create CloudFront distribution
   - Origin: S3 bucket
   - Cache policy: 24 hours (data changes rarely)
   - CORS: Allow portal domain

3. Update `useCityData.ts`:
   - Change fetch URL from `/data/{city}.json` to CloudFront URL
   - Handle gzipped responses

**Estimated effort:** 2-4 hours if familiar with AWS, half day if not

### Step 3: GitHub Actions Workflow

**Goal:** Automate data generation for all cities

**Actions:**
1. Create `generate-native-data.yml` workflow in jheem-backend (or jheem-container-minimal)
2. Matrix strategy: one job per city (parallel)
3. Steps per job:
   - Pull R container
   - Run batch_plot_generator.R with --output-mode data
   - Run aggregation script
   - Upload to S3

**Trigger:** Manual dispatch with option for single city or all cities

### Step 4: Generate Full Dataset

**Goal:** Populate S3 with all 31 cities

**Actions:**
1. Trigger workflow for all cities
2. Monitor progress (expect 2-4 hours total)
3. Verify all files accessible via CloudFront

### Step 5: Frontend Polish & Ship

**Goal:** Replace /explore with native version

**Actions:**
1. Style NativePlotOverlay to match existing cinematic look
2. Add proper loading states
3. Update city list to come from data (not hardcoded)
4. Test all cities load correctly
5. Replace /explore/page.tsx with native implementation
6. Deploy

---

## File Size Estimates (To Validate)

| Scenario | Estimate | Notes |
|----------|----------|-------|
| Test data (current) | 2.3 MB | 1 scenario, 6 outcomes, 4 facets |
| Full Baltimore (summary only) | 5-15 MB | 3 scenarios, 14 outcomes, 7 facets |
| All 31 cities | 150-450 MB | Summary stats only |
| With individual sims (Phase 2) | 1-3 GB | Lazy-load separately |

**Decision point:** If full Baltimore exceeds 20MB gzipped, consider:
- Splitting by scenario (3 files per city)
- Splitting by outcome category
- More aggressive compression

---

## Checklist for Next Session

- [ ] Generate full Baltimore data locally (all scenarios, outcomes, facets - summary stats only)
- [ ] Run aggregation, measure gzipped size
- [ ] If size acceptable (<20MB): proceed with S3 setup
- [ ] If size too large: decide on splitting strategy
- [ ] Set up S3 bucket + CloudFront
- [ ] Update useCityData.ts with production URL
- [ ] Create GitHub Actions workflow for data generation
- [ ] Generate data for all 31 cities
- [ ] Polish UI
- [ ] Ship

---

## Key Decision: Individual Simulations

**Deferred to Phase 2.** The Dec 17-18 sessions established:
- Individual sim files are 10-50x larger than summary stats
- Not worth bundling - lazy-load on demand
- Separate S3 path: `/individual/{city}/{outcome}_{facet}.json.gz`
- Fetch only when user selects "Individual Simulations" statistic

This keeps Phase 1 scope manageable and ships value faster.
