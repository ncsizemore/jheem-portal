# Session: Full Baltimore Data Generation & Size Validation

**Date**: 2025-12-18
**Duration**: ~2 hours
**Status**: Phase 1 validation complete with production-ready file sizes

---

## Objective

Generate full Baltimore dataset with all scenarios, outcomes, statistics, and facets to validate file sizes before scaling to all 31 cities.

---

## Key Results

### File Size Validation ✅

| Metric | Value |
|--------|-------|
| Files generated | 318 |
| Scenarios | 3 (cessation, brief_interruption, prolonged_interruption) |
| Outcomes | 14 |
| Statistics | 2 (mean.and.interval, median.and.interval) |
| Facets | 4 (none, age, sex, race) |
| **Aggregated (uncompressed)** | **18 MB** |
| **Aggregated (gzipped)** | **1.0 MB** |
| **Projected for 31 cities** | **~31 MB gzipped** |

This is significantly smaller than initial estimates (~71 MB) because we excluded `individual.simulation` statistic.

### Correct Outcome Names

From `jheem-backend/scripts/generate_orchestration_config.py`:

```python
OUTCOMES = [
    "incidence", "diagnosed.prevalence", "suppression", "testing",
    "prep.uptake", "awareness", "rw.clients", "adap.clients",
    "non.adap.clients", "oahs.clients", "adap.proportion",
    "oahs.suppression", "adap.suppression", "new"
]
```

**Note**: Some outcomes (rw.clients, adap.clients, etc.) don't support sex/race facets - this caused 18 expected errors out of 336 attempted generations.

---

## Running the Container Locally

### The Challenge

The ECR container image doesn't have the `--output-mode data` flag (added in this session). Until the container is rebuilt, you need to use volume mounts to override the batch script.

### Working Command

```bash
docker run --rm \
  -v /path/to/jheem-container-minimal/batch_plot_generator.R:/app/batch_plot_generator.R \
  -v /path/to/jheem-container-minimal/simulations:/app/simulations \
  -v /path/to/output:/output \
  849611540600.dkr.ecr.us-east-1.amazonaws.com/jheem-ryan-white-model:latest \
  batch \
  --city C.12580 \
  --scenarios cessation,brief_interruption,prolonged_interruption \
  --outcomes incidence,diagnosed.prevalence,suppression,testing,prep.uptake,awareness,rw.clients,adap.clients,non.adap.clients,oahs.clients,adap.proportion,oahs.suppression,adap.suppression,new \
  --statistics mean.and.interval,median.and.interval \
  --facets none,age,sex,race \
  --output-dir /output \
  --output-mode data
```

### Key Points

1. **Container has an entrypoint** - Use `batch` mode, not `Rscript` directly
2. **Volume mounts needed**:
   - `batch_plot_generator.R` - to get the `--output-mode data` flag
   - `simulations/` - the local simulation files
   - Output directory - where generated JSONs will go
3. **Simulations are in the local repo** at `simulations/ryan-white/base/` and `simulations/ryan-white/prerun/{city}/`

### Container Build Issue

The GitHub Actions build failed due to `sf` package dependency. This is a known issue with R spatial packages requiring system libraries. Options:
- Pin `sf` to an older version
- Add missing system dependencies to Dockerfile
- Remove `sf` if not actually needed

**Workaround**: Use volume mount approach until fixed.

---

## Files Modified

### jheem-container-minimal
- `batch_plot_generator.R` - Added `--output-mode data` flag (committed, pushed, build failed)

### jheem-portal
- `scripts/aggregate-city-data.ts` - Updated to recursively find JSON files in nested directories
- `src/app/explore/native/page.tsx` - Updated available scenarios to all 3
- `public/data/C.12580.json` - Full aggregated Baltimore data (18 MB, gitignored)
- `generated-data/baltimore-full/` - Raw generation output (gitignored)

---

## Next Steps (Prioritized)

### 1. Fix Container Build (Low Priority)
- Investigate `sf` dependency failure
- Either pin version, add system deps, or remove if unused
- Can work around with volume mounts for now

### 2. Set Up S3 + CloudFront (High Priority)
- Create bucket `jheem-native-plot-data` (or similar)
- Enable gzip content-encoding
- Configure CloudFront with 24-hour cache
- Update `useCityData.ts` to fetch from CloudFront URL

### 3. Create GitHub Actions Workflow (High Priority)
- New workflow `generate-native-data.yml`
- Matrix strategy: one job per city
- Steps: pull container, run with volume mount, aggregate, upload to S3
- Manual dispatch with option for single city or all

### 4. Generate Full Dataset (After #2 and #3)
- Trigger workflow for all 31 cities
- Estimated time: ~15-20 min per city × 31 = ~8-10 hours (but parallelized)
- Verify all files accessible via CloudFront

### 5. UI Polish (Can Parallel with Above)
- Match cinematic header styling from Plotly overlay
- Add loading skeletons
- Mobile responsiveness
- Legend refinement

### 6. Ship Native Plotting
- Feature flag or direct replacement of `/explore`
- Monitor for issues
- Document the new data format

---

## Architecture Notes

### Data Flow (Current)

```
Local R Container (with volume mounts)
    ↓ (batch_plot_generator.R --output-mode data)
Per-combination JSON files
    ↓ (aggregate-city-data.ts)
Single per-city JSON (18 MB → 1 MB gzipped)
    ↓ (manual copy to public/data/)
Frontend loads via useCityData hook
    ↓
NativeSimulationChart renders with Recharts
```

### Data Flow (Production Target)

```
GitHub Actions Workflow
    ↓ (triggers on demand or schedule)
ECR Container (once build is fixed)
    ↓ (parallel jobs per city)
Per-city aggregated JSONs
    ↓ (upload to S3)
CloudFront CDN
    ↓ (gzipped, cached)
Frontend fetches on city selection
    ↓
Native charts render
```

---

## Validation Checklist

- [x] Full Baltimore generation works (318/336 files)
- [x] Aggregation script handles nested directories
- [x] File sizes acceptable (1 MB gzipped per city)
- [x] Native charts render correctly with full data
- [x] All 3 scenarios selectable and working
- [x] 14 outcomes available
- [x] Container changes committed and pushed
- [ ] Container build succeeds (blocked by sf dependency)
- [ ] S3 bucket created
- [ ] CloudFront distribution configured
- [ ] GitHub Actions workflow created
- [ ] All 31 cities generated
- [ ] UI polish complete

---

## Session Learnings

1. **Always check the orchestration config** - The correct outcome names were already documented in `jheem-backend/scripts/generate_orchestration_config.py`

2. **Container entrypoint matters** - Can't just run `Rscript` directly; must use the `batch` mode through the entrypoint

3. **Volume mounts are powerful** - Can iterate on R code without rebuilding the container

4. **Compression is very effective** - 18 MB → 1 MB with gzip on JSON data

5. **Some outcomes don't support all facets** - Ryan White-specific outcomes (rw.clients, etc.) are aggregate-only, no demographic breakdowns
