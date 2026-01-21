# CROI 30-State Ryan White Analysis - Implementation Plan

**Created:** 2026-01-16
**Status:** Phase 1 Complete - Trimming Validated
**Last Updated:** 2026-01-21

## Executive Summary

This document outlines the plan to deploy the expanded 30-state CROI 2026 Ryan White analysis to the JHEEM portal. This involves creating a new container, running a data trimming pipeline, updating workflows, and frontend changes.

---

## Context

### Two Analyses Now Exist

| Analysis | States | Timeframe | Services Stop | Scenarios |
|----------|--------|-----------|---------------|-----------|
| **AJPH (Original)** | 11 | 2025-2030 | July 2025 | cessation, brief (1.5yr), prolonged (3.5yr), + conservative variants |
| **CROI (Expanded)** | 30 | 2026-2031 | July 2026 | cessation, 2.5-year interruption, + conservative variants |

### File Naming Conventions

**AJPH files:**
- `*_noint.Rdata` - No interruption (baseline)
- `*_rw.end.Rdata` - Cessation
- `*_rw.b.intr.Rdata` - Brief interruption (1.5yr)
- `*_rw.p.intr.Rdata` - Prolonged interruption (3.5yr)
- Conservative variants: add `.cons` before `.Rdata`

**CROI files:**
- `*_noint.Rdata` - No interruption (baseline)
- `*_rw.end.26.Rdata` - Cessation
- `*_rw.p.intr.26.Rdata` - 2.5-year interruption
- Conservative variants: `.cons` before `.26` (e.g., `*_rw.end.cons.26.Rdata`)

### Current Data Location

Raw CROI simsets (~75GB total) are in GitHub Releases:
- **Repo:** `ncsizemore/jheem-simulations`
- **Release:** `ryan-white-state-v2.0.0`
- **Files per state:** ~2.5GB (5 scenarios)

### The Trimming Problem

Raw simsets are too large for web use:
- 1000 simulations per file
- Full time range

Trimming reduces them to web-friendly size:
- 80 simulations (`RW.N.SIM.FOR.WEB`)
- Truncated time range: 2016-2036

**Critical insight:** Trimming is NOT just subsetting data. It calls `rerun.simulations()` which actually re-runs the simulation with fewer iterations and truncated time range. This is computationally expensive.

---

## Key Decisions

### 1. Separate Container for CROI

**Decision:** Create new repo `jheem-ryan-white-croi-container`

**Reasoning:**
- CROI requires different `jheem_analyses` commit than AJPH
- Follows "freeze published models" principle
- AJPH container stays stable (pinned to `fc3fe1d2`)
- Clean separation of concerns

### 2. Containerize Trimming

**Decision:** Add `trim` entrypoint mode to CROI container

**Reasoning:**
- Reproducible environment
- Same dependencies as data extraction
- Avoids local R environment setup
- Documents the process in code

### 3. Website Structure

**Decision:** Two separate sections on website

**Proposed:**
- "Original 11-state analysis (AJPH 2026)"
- "Expanded 30-state analysis (CROI 2026)"

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GitHub Releases                Container                        │
│  (jheem-simulations)           (trim mode)                       │
│  ┌─────────────┐              ┌─────────────┐                   │
│  │ Raw Simsets │──download───>│   Trim &    │                   │
│  │   (~75GB)   │              │  Re-run     │                   │
│  └─────────────┘              └──────┬──────┘                   │
│                                      │                           │
│                                      v                           │
│                              ┌─────────────┐                    │
│                              │  Trimmed    │                    │
│                              │  Simsets    │                    │
│                              │  (~5-8GB)   │                    │
│                              └──────┬──────┘                    │
│                                     │                           │
│                                     v                           │
│  GitHub Releases            Container                           │
│  (new release tag)         (batch mode)                         │
│  ┌─────────────┐           ┌─────────────┐                     │
│  │  Trimmed    │──download─>│   Extract   │                     │
│  │  Simsets    │           │   JSON      │                     │
│  └─────────────┘           └──────┬──────┘                     │
│                                   │                             │
│                                   v                             │
│                            ┌─────────────┐                      │
│                            │ CloudFront  │                      │
│                            │  (S3 CDN)   │                      │
│                            └──────┬──────┘                      │
│                                   │                             │
│                                   v                             │
│                            ┌─────────────┐                      │
│                            │  Frontend   │                      │
│                            │  (Portal)   │                      │
│                            └─────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Benchmark Trimming (Current)

**Goal:** Determine how long trimming takes per state to inform execution strategy.

**Approach:** Test trimming in existing container before creating new repo.

**Steps:**
1. Download one state's raw simsets (AL) from `ryan-white-state-v2.0.0`
2. Run existing container with trimming script
3. Time the `rerun.simulations()` calls
4. Document memory usage

**Success criteria:** Know per-state timing to decide GitHub Actions vs. alternative.

**Location:** `/Volumes/WD_Black/wiley/Documents/`

### Phase 2: Create CROI Container

**Goal:** New container repo with updated jheem_analyses and trim capability.

**Steps:**
1. Create `jheem-ryan-white-croi-container` repo
2. Copy structure from `jheem-container-minimal`
3. Update `JHEEM_ANALYSES_COMMIT` to CROI version
4. Add `trim` entrypoint mode to `container_entrypoint.sh`
5. Create trimming R script (adapted from `prep_rw_web_simsets.R`)
6. Test container build
7. Push to ghcr.io

**Key files to modify:**
- `Dockerfile` - Update JHEEM_ANALYSES_COMMIT ARG
- `container_entrypoint.sh` - Add trim mode
- New: `trim_simsets.R` - Adapted trimming script

### Phase 3: Trimming Workflow

**Goal:** Automated (or documented manual) process to trim all 30 states.

**GitHub Actions approach (if timing permits):**
```yaml
# Pseudocode workflow
on: workflow_dispatch
jobs:
  trim:
    strategy:
      matrix:
        state: [AL, AR, AZ, ...]
    steps:
      - Download raw simsets for ${{ matrix.state }}
      - Run container in trim mode
      - Upload trimmed simsets to new GitHub Release
```

**Alternative (if too slow):** Document campus server process.

**Output:** New GitHub Release `ryan-white-state-croi-web-v1.0.0` with trimmed simsets.

### Phase 4: Data Extraction Workflow

**Goal:** Update existing workflow for CROI scenarios.

**Changes to `generate-native-data-ryan-white-state.yml`:**
1. Update state list (11 → 30)
2. Update scenario names (cessation, interruption_2.5yr, + conservative)
3. Update file naming patterns
4. Point to new container image
5. Point to trimmed simsets release

### Phase 5: Frontend Updates

**Goal:** Display CROI data on portal.

**Changes:**
1. Add 19 new states to `STATE_NAME_TO_CODE` mapping
2. Update scenario labels/descriptions
3. Implement two-section website structure
4. Update AnalysisView for new scenarios

**New states to add:**
```
AR, AZ, CO, IN, KY, MA, MD, MI, MN, NC, NJ, NV, OH, OK, PA, SC, TN, VA, WA
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Trimming takes too long for GH Actions | ~~Medium~~ | ~~Medium~~ | ~~Campus server fallback~~ | **Resolved** - Memory is the constraint, not time |
| Memory exceeds GH Actions limits | **Confirmed** | Medium | Run locally or use 16GB runners | **Known constraint** |
| jheem_analyses update breaks container | Medium | High | Test thoroughly before deploying | In progress |
| CROI simsets incompatible with data extraction | Low | High | Test with one state first | **Next to verify** |
| GitHub free tier minutes exhausted | Low | Medium | Monitor usage, batch runs | N/A for trimming |

## Remaining Verification

Before declaring Phase 1 fully complete, we need to verify:

- [ ] **Data extraction works** - Run batch mode on trimmed simsets
- [ ] **JSON output is correct** - Structure matches web app expectations
- [ ] **Plotting works** - Frontend renders the data correctly
- [ ] **All intervention scenarios render** - cessation, interruption, conservative variants
- [ ] **Time range is correct** - 2016-2036 in output data

---

## Open Questions

1. **Which jheem_analyses commit for CROI?** - Need to get from Todd/team
2. **Conservative scenarios on website?** - Colleague mentioned they weren't in CROI presentation but could include
3. **URL structure for two sections?** - `/ryan-white/ajph/` and `/ryan-white/croi/`? Or unified with toggle?

---

## Progress Log

### 2026-01-21 - Trimming Pipeline Complete!

**Status:** Phase 1 Complete - All 5 intervention files successfully trimmed for Alabama

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

**Issues Fixed Today:**

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

**Output Files Created:**
```
/Volumes/WD_Black/wiley/Documents/croi-trimming-test/trimmed/
├── AL_noint_web.Rdata          (55 MB)
├── AL_rw.end.26_web.Rdata      (57 MB)
├── AL_rw.end.cons.26_web.Rdata (57 MB)
├── AL_rw.p.intr.26_web.Rdata   (57 MB)
└── AL_rw.p.intr.cons.26_web.Rdata (57 MB)
```

**Documentation Added:**
- `DEVELOPMENT.md` in container repo - comprehensive guide to jheem2 dependencies
- Updated this CROI plan document

**Next Steps:**
1. **Verify end-to-end:** Test data extraction from trimmed simsets
2. **Verify plotting:** Confirm JSON output works in web app
3. **Create local trim script:** Simple workflow for running all 30 states
4. **Full 30-state run:** ~6 hours locally

**Decision: Trimming Execution Strategy**

Given memory requirements (16GB minimum), options are:
1. **Local machine** (recommended for now) - Works, ~6 hours for 30 states
2. **Campus server** - More RAM, could parallelize
3. **GitHub 16GB runners** - ~$3 for full run, adds CI/CD complexity

For a one-time operation, local execution is pragmatic. CI/CD is nice-to-have.

---

### 2026-01-19 - Version Mismatch Investigation

**Status:** Blocked on jheem2/jheem_analyses version compatibility

**Issue discovered:**
After fixing the cache file path issue, trimming benchmark fails with:
```
ERROR: Error creating specification kernel for version 'rw' and location 'AL':
When generating the background for model element 'active.to.never.idu.ratio' (from 'ehe'),
There was an error evaluating get.active.to.never.idu.ratio() (the get.value.function)
for model element 'active.to.never.idu.ratio' (from 'ehe'): invalid 'description' argument
```

**Root cause identified:**
- The `get.active.to.never.idu.ratio()` function is defined in `ehe_specification_helpers.R`
- Called during `rerun.simulations()` when creating specification kernel
- The `invalid 'description' argument` error suggests function signature mismatch

**Key discovery - jheem2 branch mismatch:**
- The renv.lock specifies jheem2 from `dev` branch at commit `0e44ebb2700a4b08b07421c32755f04b5c56c507`
- But the Dockerfile overrides this with `renv::install('tfojo1/jheem2')` which installs from the **default branch** (not `dev`)
- The working AJPH container uses the `dev` branch version
- The default branch likely has breaking changes not compatible with jheem_analyses

**Fix:** Change the Dockerfile to install jheem2 from the `dev` branch:
```dockerfile
# Change from:
R -e "renv::install('tfojo1/jheem2')"
# To:
R -e "renv::install('tfojo1/jheem2@dev')"
```

**Fixes completed in this session:**
1. **Cache file path issue** - Added COPY command to Dockerfile:
   ```dockerfile
   COPY --from=workspace-builder /app/jheem_analyses/commoncode/object_for_version_cache /jheem_analyses/commoncode/object_for_version_cache
   ```
   This ensures the file-based cache is available at the expected relative path (`../jheem_analyses/...` from `/app`)

2. **Missing data_files directory** - The `get.idu.incidence.rates()` function reads CSV files from `../jheem_analyses/data_files/idu_initiation/`. Added COPY command:
   ```dockerfile
   COPY --from=workspace-builder /app/jheem_analyses/data_files /jheem_analyses/data_files
   ```
   The "invalid 'description' argument" error was actually from `file()` failing because the path didn't exist.

**Actions taken:**
1. ❌ Initial hypothesis (jheem2 branch mismatch) was incorrect - dev vs default branch didn't help
2. ✅ Debugged further - found "invalid 'description' argument" was from missing data files
3. ✅ Applied fix: added `data_files` directory copy to Dockerfile
4. ✅ Pushed commit `8a6639e` to trigger rebuild

**Commits:**
- `8d41d64` - "fix: use jheem2 dev branch instead of default" (didn't fix issue but kept for safety)
- `8a6639e` - "fix: copy data_files directory for IDU initiation rates" (actual fix)

**Key insight:** The AJPH container works because it's pinned to `jheem_analyses` commit `fc3fe1d2` which is known-compatible. CROI uses HEAD which may have breaking changes.

---

### 2026-01-18 - Container Build & Benchmark Setup

**Completed:**
- Created `jheem-ryan-white-croi-container` repo
- Copied structure from `jheem-container-minimal`
- Updated Dockerfile to use latest jheem_analyses (HEAD)
- Added `trim` entrypoint mode and `trim_simsets.R` script
- Fixed Dockerfile library symlinks for RSPM compatibility (dynamic detection)
- Added jheem2 update step to get latest from GitHub
- Fixed R6 class generator persistence (save in workspace, restore in trim script)
- Fixed `args` variable name collision with workspace objects

**Container repo:** https://github.com/ncsizemore/jheem-ryan-white-croi-container

**Key commits:**
- Initial setup with trim mode
- Dockerfile fixes for library symlinks
- R6 class generator persistence fix

**Downloaded for testing:**
- AL raw simsets (~2.5GB) from `ryan-white-state-v2.0.0` release
- Located at `/Volumes/WD_Black/wiley/Documents/croi-trimming-test/raw/`

**Completed (carried forward to 01-19):**
- Container rebuilt with R6 class fixes
- Benchmark attempted - hit version mismatch error (see 01-19 entry)

### 2026-01-16 - Initial Planning

- Reviewed CLAUDE.md session summaries
- Analyzed trimming script (`prep_rw_web_simsets.R`)
- Analyzed existing workflow (`generate-native-data-ryan-white-state.yml`)
- Analyzed container structure
- Decision: Create separate CROI container repo
- Decision: Containerize trimming
- Decision: Benchmark before committing to execution strategy

---

## Reference Files

| File | Location | Purpose |
|------|----------|---------|
| Trimming script | `/Volumes/WD_Black/wiley/Documents/jheem/code/jheem_analyses/applications/ryan_white/prep_rw_web_simsets.R` | Original trimming logic |
| Ryan White config | `/Volumes/WD_Black/wiley/Documents/jheem/code/jheem_analyses/applications/ryan_white/ryan_white_main.R` | CROI parameters |
| State workflow | `/Volumes/WD_Black/wiley/Documents/jheem-backend/.github/workflows/generate-native-data-ryan-white-state.yml` | Data extraction workflow |
| Existing container | `/Volumes/WD_Black/wiley/Documents/jheem-container-minimal/` | Starting point for CROI container |
| Raw simsets | `gh release download ryan-white-state-v2.0.0 --repo ncsizemore/jheem-simulations` | CROI raw data |

---

## Commands Reference

```bash
# Download one state's raw simsets for testing
cd /Volumes/WD_Black/wiley/Documents/
mkdir -p croi-trimming-test/raw
cd croi-trimming-test/raw
gh release download ryan-white-state-v2.0.0 \
  --repo ncsizemore/jheem-simulations \
  --pattern "AL_*.Rdata"

# Run existing container in debug mode
docker run -it --rm \
  -v $(pwd):/data \
  ghcr.io/ncsizemore/jheem-ryan-white-model:latest \
  debug

# Check container has trimming dependencies
docker run --rm \
  ghcr.io/ncsizemore/jheem-ryan-white-model:latest \
  test-workspace
```
