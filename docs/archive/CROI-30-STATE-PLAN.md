# CROI 30-State Ryan White Analysis

**Status:** COMPLETE
**Created:** 2026-01-16
**Completed:** 2026-01-28

---

## Summary

Successfully deployed 30-state CROI 2026 Ryan White analysis to the JHEEM portal.

**Live URLs:**
- CROI Explorer (30 states): https://jheem.org/ryan-white-state-level/explorer/croi
- AJPH Explorer (11 states): https://jheem.org/ryan-white-state-level/explorer/ajph

**Key Achievement:** Eliminated 12-hour local trimming step by using "direct approach" - running batch mode directly on raw simsets. Entire pipeline now runs on GitHub Actions.

---

## Final Architecture

```
GitHub Releases (v2.0.0)     GitHub Actions Workflow              CloudFront
┌─────────────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│  Raw Simsets        │────>│  Container batch mode   │────>│  State JSON     │
│  ~75GB (30 states)  │     │  Extract → Aggregate    │     │  + Summaries    │
└─────────────────────┘     └─────────────────────────┘     └────────┬────────┘
                                                                     │
                                                                     v
                                                            ┌─────────────────┐
                                                            │  Frontend       │
                                                            │  Choropleth     │
                                                            └─────────────────┘
```

**No local trimming required.** Full pipeline is automated.

---

## Two Analyses

| Analysis | States | Timeframe | Scenarios | Workflow |
|----------|--------|-----------|-----------|----------|
| **AJPH** | 11 | 2025-2030 | cessation, brief (1.5yr), prolonged (3.5yr) | `generate-native-data-ryan-white-state.yml` |
| **CROI** | 30 | 2026-2031 | cessation, interruption (2.5yr), + conservative | `generate-native-data-ryan-white-state-croi-direct.yml` |

---

## Data Sources

| Release | Content | Size | Used By |
|---------|---------|------|---------|
| `ryan-white-state-v1.0.0` | AJPH 11-state simsets | ~25GB | AJPH workflow |
| `ryan-white-state-v2.0.0` | CROI 30-state raw simsets | ~75GB | CROI direct workflow |
| `ryan-white-state-v2.0.0-web` | CROI trimmed simsets (backup) | ~8GB | Archived workflow |

---

## CloudFront Paths

| Path | Content |
|------|---------|
| `/ryan-white-state/` | AJPH 11-state JSON files |
| `/ryan-white-state-croi/` | CROI 30-state JSON files |

---

## Key Discovery: Direct vs Trimmed Approach

We initially built a 12-hour local trimming pipeline assuming raw simsets would OOM on GitHub runners.

**Testing revealed:**

| Metric | Expected | Actual |
|--------|----------|--------|
| Memory usage | OOM (>7GB) | 1.3GB |
| Baseline year range | Stops at 2026 | Extends to 2035 |
| Works on GH runners | No | Yes |

**Benefits of direct approach:**
- No local step - fully automated
- More precise stats (1000 sims vs 80)
- Fuller baseline range (2010-2035)
- Simpler architecture

The trimmed simsets (`v2.0.0-web`) and workflow are archived as backup.

---

## Scenario Mapping

Raw simset codes mapped to friendly names:

| Raw Code | Friendly Name | Display Label |
|----------|---------------|---------------|
| `noint` | `base` | (Baseline) |
| `rw.end.26` | `cessation` | Permanent Cessation |
| `rw.p.intr.26` | `interruption` | 2.5-Year Interruption |
| `rw.end.cons.26` | `cessation_conservative` | Cessation (Conservative) |
| `rw.p.intr.cons.26` | `interruption_conservative` | Interruption (Conservative) |

---

## Repository Roles

| Repository | Role |
|------------|------|
| `jheem-simulations` | Hosts raw simsets (v2.0.0) |
| `jheem-ryan-white-croi-container` | Container image for CROI |
| `jheem-backend` | GitHub Actions workflows |
| `jheem-portal` | Frontend + state configs |

---

## Files Changed (Frontend)

Key files for CROI support:

- `src/config/model-configs.ts` - Added `croiStateLevelConfig`
- `src/data/states.ts` - Added all 30 state coordinates
- `src/components/StateChoroplethExplorer.tsx` - Config-driven choropleth
- `src/hooks/useStateSummaries.ts` - Configurable data URL
- `src/app/ryan-white-state-level/explorer/croi/page.tsx` - CROI route

---

## Archived: Trimming Infrastructure

The following was built for trimmed approach but is no longer needed:

- **Script:** `jheem-ryan-white-croi-container/trim_all_states.sh`
- **Workflow:** `generate-native-data-ryan-white-state-croi.yml.archived`
- **Release:** `ryan-white-state-v2.0.0-web`

Kept for reference in case issues emerge with direct approach.

---

## Lessons Learned

1. **Test assumptions early** - We assumed OOM; testing showed 1.3GB usage
2. **Simpler is better** - Direct approach eliminated entire trimming infrastructure
3. **Config-driven design pays off** - Adding CROI was mostly config changes
4. **GitHub Actions is powerful** - 15GB RAM runners handle raw simsets fine

---

## Appendix: Progress Log

Detailed history preserved for debugging reference.

### 2026-01-28 - Production Deployment

- Ran full 30-state CROI workflow successfully
- Ran full 11-state AJPH workflow successfully
- Fixed CloudFront CORS by adding `Managed-SimpleCORS` response headers policy
- Added all 30 state coordinates to `states.ts`
- Updated CLAUDE.md and this document

### 2026-01-25 - Direct Approach Validated

**Major breakthrough:** Direct approach eliminates 12-hour local trimming step.

**Discovery:** Raw simsets can run directly on GitHub Actions without OOM.

**Validation Results (3-state test: AL, CA, FL):**

| Metric | Result |
|--------|--------|
| Memory used | 1.3GB (of 15GB available) |
| OOM issues | None |
| Pipeline stages | All passed (generate → aggregate → summary) |
| Baseline year range | 2010-2035 (extends to 2030!) |
| Total runtime | ~2 hours for 3 states |

**Key Finding - Baseline Year Range:**

| Approach | Baseline Years | Projection Year 2030? |
|----------|----------------|----------------------|
| Trimmed simsets | 2016-2026 | ❌ Not available |
| Raw simsets (direct) | 2010-2035 | ✅ Available |

The trimmed approach intentionally truncates baseline at the anchor year (2026), which caused summary extraction to fail. Raw simsets don't have this limitation.

**Workflow Created:** `generate-native-data-ryan-white-state-croi-direct.yml`

### 2026-01-21 - Trimming Pipeline Complete

**Status:** All 5 intervention files successfully trimmed for Alabama test.

**Benchmark Results:**

| Metric | Value |
|--------|-------|
| Files processed | 5/5 |
| Time for Alabama (all 5 files) | 14.8 minutes |
| Average rerun per file | 143.6 seconds |
| Output size per file | 55-57 MB |
| **Extrapolated 30 states** | **~6 hours** |
| **Total output size (30 states)** | **~8.4 GB** |

**Memory Requirements:**
- Minimum: **16GB Docker RAM** (set in Docker Desktop → Resources)
- Workspace baseline: ~4.7GB
- Peak during engine creation: ~11GB
- **GitHub Actions free runners (7GB) are NOT viable** for trimming

**Issues Fixed:**

1. **OOM During Engine Creation** (Exit 137)
   - Symptom: Process dies silently at "Creating engine..."
   - Solution: Increase Docker memory to 16GB

2. **`generate.random.samples` not found**
   - Symptom: Error during rerun.simulations() for baseline files
   - Cause: `distributions` package not loaded
   - Fix: Add `library(distributions)` to trim_simsets.R

3. **Intervention codes not registered** (rw.end.26, etc.)
   - Symptom: "no intervention with that code has been registered"
   - Cause: Interventions created but not captured in workspace
   - Fix:
     - Source `ryan_white_interventions.R` during workspace creation
     - Capture `INTERVENTION.MANAGER` state in `.jheem2_state`
     - Restore at runtime in trim_simsets.R

4. **`JHEEM.SOLVER.TRACKING` not found**
   - Symptom: Error during simulation re-run
   - Cause: Internal jheem2 environment not exported
   - Fix: Export to GlobalEnv during workspace creation

**Key Commits:**
- `68fca7c` - feat: add distributions package, intervention registration
- `d7de74c` - fix: export JHEEM.SOLVER.TRACKING internal environment

### 2026-01-19 - Version Mismatch Investigation

**Issue discovered:** Trimming benchmark fails with:
```
ERROR: Error creating specification kernel for version 'rw' and location 'AL':
When generating the background for model element 'active.to.never.idu.ratio' (from 'ehe'),
There was an error evaluating get.active.to.never.idu.ratio() (the get.value.function)
for model element 'active.to.never.idu.ratio' (from 'ehe'): invalid 'description' argument
```

**Root cause:** The `invalid 'description' argument` error was actually from `file()` failing because `data_files` directory didn't exist in container.

**Fixes completed:**

1. **Cache file path issue** - Added COPY command to Dockerfile:
   ```dockerfile
   COPY --from=workspace-builder /app/jheem_analyses/commoncode/object_for_version_cache /jheem_analyses/commoncode/object_for_version_cache
   ```

2. **Missing data_files directory** - The `get.idu.incidence.rates()` function reads CSV files from `../jheem_analyses/data_files/idu_initiation/`. Added COPY command:
   ```dockerfile
   COPY --from=workspace-builder /app/jheem_analyses/data_files /jheem_analyses/data_files
   ```

**Commits:**
- `8d41d64` - fix: use jheem2 dev branch instead of default
- `8a6639e` - fix: copy data_files directory for IDU initiation rates

### 2026-01-18 - Container Build & Benchmark Setup

**Completed:**
- Created `jheem-ryan-white-croi-container` repo
- Copied structure from `jheem-container-minimal`
- Updated Dockerfile to use latest jheem_analyses (HEAD)
- Added `trim` entrypoint mode and `trim_simsets.R` script
- Fixed Dockerfile library symlinks for RSPM compatibility
- Fixed R6 class generator persistence
- Fixed `args` variable name collision

**Container repo:** https://github.com/ncsizemore/jheem-ryan-white-croi-container

**Downloaded for testing:**
- AL raw simsets (~2.5GB) from `ryan-white-state-v2.0.0` release

### 2026-01-16 - Initial Planning

- Reviewed existing infrastructure
- Analyzed trimming script (`prep_rw_web_simsets.R`)
- Decision: Create separate CROI container repo
- Decision: Containerize trimming
- Decision: Benchmark before committing to execution strategy

---

## Appendix: Commands Reference

### Local Trimming (Archived - Not Needed)

```bash
# Full 30-state pipeline (if ever needed)
cd /Volumes/WD_Black/wiley/Documents/jheem-ryan-white-croi-container
./trim_all_states.sh

# Single state test
./trim_all_states.sh --state AL

# Requires: Docker Desktop with 16GB RAM
```

### Upload to GitHub Release

```bash
gh release create ryan-white-state-v2.0.0-web \
  --repo ncsizemore/jheem-simulations \
  --title "Ryan White State v2.0.0 (Web-Ready, CROI 2026)" \
  --notes "Trimmed simsets (80 sims) for web deployment" \
  */*.Rdata
```

### Debug Container

```bash
# Run CROI container in debug mode
docker run -it --rm \
  -v $(pwd):/data \
  ghcr.io/ncsizemore/jheem-ryan-white-croi:latest \
  debug

# Check workspace
docker run --rm \
  ghcr.io/ncsizemore/jheem-ryan-white-croi:latest \
  test-workspace
```
