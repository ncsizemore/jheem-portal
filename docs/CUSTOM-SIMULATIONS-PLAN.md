# Custom Simulations: Architecture Plan

**Status:** MSA custom sims validated end-to-end — pipeline operational
**Date:** March 4, 2026 (updated March 19, 2026)
**Context:** PI is developing an ADAP model extension with 4 user-configurable parameters. The portal needs to support custom simulations — user-specified parameters, on-demand execution, interactive results.

---

## Background

The portal currently serves **prerun simulations**: pre-computed scenario data served as static JSON via S3/CloudFront, rendered natively in React. This works well for models with a small, fixed set of scenarios (3-4 per model).

The ADAP model introduces **4 continuous parameters** (income level restriction, formulary restriction fraction, suppression loss from ADAP loss, suppression loss from formulary restriction). This makes the prerun approach less practical — the combinatorial space grows quickly with each parameter, and users may want specific combinations we haven't precomputed.

Custom simulations have been a planned feature since the portal's inception. Significant groundwork exists across the multi-repo system but the end-to-end pipeline has never been completed.

---

## What Exists Today

### Container Layer (jheem-base + model containers)

The R containers already support multiple execution modes:

- **`batch` mode** (production) — extracts outcome data from pre-run simulation files -> JSON. Used by all 4 current models via GitHub Actions workflows.
- **`custom` mode** (new) — loads workspace, accepts user parameters, creates intervention, runs simulation, saves simsets in batch-compatible directory layout. Data extraction is handled separately by `batch` mode.
- **`simulation/simple_ryan_white.R`** — translation from research scripts to user-facing parameters.

### Backend (jheem-backend)

- **GitHub Actions workflow template** — battle-tested across 4 models. Handles: config loading from models.json, parallel per-location execution, data extraction, S3 upload, CloudFront invalidation.
- **models.json** — single source of truth for model configs, now including `customSimulation` parameter definitions.
- **`run-custom-sim.yml`** — custom simulation workflow (reads params from models.json, deterministic S3 paths, dynamic run-name for API matching).

### Portal (jheem-portal)

- **Native rendering pipeline** — `NativeSimulationChart` (Recharts) renders from JSON data files served via CloudFront. This is the current architecture for all 4 models.
- **Navigation** — "Custom Simulations" link wired into Ryan White submenu, pointing to native `/ryan-white/custom` route.

---

## Architecture: GitHub Actions as Compute Layer

### How It Works

```
User (portal)
  -> selects location + parameters
  -> portal checks CloudFront for cached results
  -> if cache miss: triggers GitHub Actions workflow via API
  -> workflow runs R container with user's parameters
  -> results land on S3/CloudFront as JSON (same format as prerun)
  -> portal polls GitHub Actions API for step-level progress
  -> subsequent requests for same params are instant (cached)
```

### Why This Approach

- **Zero new infrastructure.** Same workflows, same container, same S3/CloudFront, same portal rendering.
- **Free compute.** GitHub Actions minutes are unlimited for public repos, generous for private.
- **Proven pipeline.** The container, workflow template, and data format are battle-tested across 4 models and hundreds of runs.
- **Built-in caching.** Results persist on CloudFront. Popular parameter combinations become effectively prerun over time.
- **Prerun and custom converge.** Prerun is just "custom triggered at build time with predetermined params." Same pipeline, same output format, same portal components.

---

## Config-Driven Design (models.json)

Custom simulation parameters are defined in `models.json` alongside all other model config. This ensures a single source of truth and makes adding custom sim support to a new model a JSON-only change.

```json
"customSimulation": {
  "simulationScript": "simple_ryan_white.R",
  "parameters": [
    { "id": "adap_loss", "envVar": "ADAP_LOSS", "label": "ADAP suppression loss", "keyPrefix": "a", "default": 50, "unit": "%" },
    { "id": "oahs_loss", "envVar": "OAHS_LOSS", "label": "OAHS suppression loss", "keyPrefix": "o", "default": 30, "unit": "%" },
    { "id": "other_loss", "envVar": "OTHER_LOSS", "label": "Other suppression loss", "keyPrefix": "r", "default": 40, "unit": "%" }
  ],
  "facets": ["none", "age", "race", "sex", "risk"],
  "statistics": ["mean.and.interval", "median.and.interval"]
}
```

### Deterministic Scenario Key

The scenario key is derived from parameter values using `keyPrefix` definitions:
- Parameters: `ADAP=50, OAHS=30, Other=40`
- Key: `a50-o30-r40`
- S3 path: `portal/ryan-white/custom/C.12580/a50-o30-r40.json`

This ensures identical parameters always produce the same S3 path, enabling cache checks and deduplication.

### Scenario Label

Human-readable label for chart legends, also derived from config:
- `"ADAP suppression loss 50%, OAHS suppression loss 30%, Other suppression loss 40%"`

---

## S3 / CloudFront Layout

```
s3://jheem-data-production/portal/ryan-white/
  C.12580.json                    # prerun data (existing)
  city-summaries.json             # prerun summaries (existing)
  custom/                         # custom sim results (new)
    C.12580/
      a50-o30-r40.json            # data (same format as C.12580.json)
    AL/
      a50-o30-r40.json
```

CloudFront paths (origin strips `portal/` prefix):
- Data: `https://d320iym4dtm9lj.cloudfront.net/ryan-white/custom/C.12580/a50-o30-r40.json`

---

## Feasibility Test Results

**Workflow:** `test-custom-sim.yml` in jheem-backend.

### MSA (Trimmed 80-sim Simset, C.12580)

| Phase | Time | R Heap | System RSS |
|-------|------|--------|------------|
| Workspace load | 24.0 sec | 3,792 MB | 5,104 MB |
| Load base simset | 0.9 sec | 3,888 MB | 5,145 MB |
| Run simulation (80 sims) | 205.5 sec | 3,988 MB | 7,148 MB |
| Extract 3 outcomes | 1.7 sec | -- | -- |
| **Total** | **232 sec (3.9 min)** | **Peak: 4,052 MB** | **Peak: 7,148 MB** |

**Verdict:** Feasible on standard runners. Memory tight at 7.1 GB but completed.

### State-Level (1000-sim Simset, AL via AJPH release)

| Phase | Time | R Heap | System RSS |
|-------|------|--------|------------|
| Workspace load | 25.4 sec | 3,792 MB | 5,104 MB |
| Load base simset (849 MB) | 5.2 sec | 4,757 MB | 6,010 MB |
| Run simulation (1000 sims) | 596.2 sec | 5,723 MB | 10,994 MB |
| Extract 3 outcomes | 2.1 sec | -- | -- |
| **Total** | **629 sec (10.5 min)** | **Peak: 7,907 MB** | **Peak: 10,994 MB** |

**Verdict:** Feasible. Current `ubuntu-latest` runners have 15 GB RAM / 4 vCPU. Uses ~11 GB RSS — comfortably within limit. Self-hosted runners on group servers are a potential fallback.

### Local Docker Test (Full Extraction, AL 1000-sim)

| Phase | Time |
|-------|------|
| Workspace load | 15.1 sec |
| Load base simset | 3.9 sec |
| Run simulation (1000 sims) | 731.3 sec (12.2 min) |
| Extract 140 combinations | 20.6 sec |
| **Total** | **771 sec (12.9 min)** |

Generated 6 JSON files (per-scenario-per-combination), aggregated to portal-compatible JSON via `aggregate-city-data.ts`.

### jheem2 Bug: `populate_outcomes_array` NULL Crash

**Discovered during state-level testing.** The C++ function `populate_outcomes_array` crashes with `Not compatible with STRSXP: [type=NULL]` when an outcome has no time data for the simulation interval. Affects `aids.diagnoses` and `aids.deaths` outcomes in state-level simsets. MSA simsets are unaffected.

**Workaround:** A 2-line NULL check wrapper applied at runtime in `custom_simulation.R`:
```r
if (is.null(new_values) || is.null(old_times)) return(old_values)
```
All 1000 sims complete correctly with this guard. Will fix properly in jheem2 when appropriate.

---

## Implementation Progress

### Phase 1: Validate -- COMPLETE

- [x] Feasibility test on standard GHA runner with MSA trimmed simset (3.9 min, 7.1 GB)
- [x] Test with state-level 1000-sim simset (10.5 min, 11 GB)
- [x] Identified and worked around jheem2 `populate_outcomes_array` NULL bug

### Phase 2: Container Pipeline -- COMPLETE

**Files created/modified:**

| File | Repo | Status |
|------|------|--------|
| `common/custom_simulation.R` | jheem-base | Created -- full pipeline script |
| `common/container_entrypoint.sh` | jheem-base | Updated -- `custom` mode routes to new script |
| `.github/config/models.json` | jheem-backend | Updated -- added `customSimulation` config |
| `.github/workflows/run-custom-sim.yml` | jheem-backend | Created -- production workflow |

**Key design decisions:**
- **Outcomes:** All 14 from models.json for ryan-white
- **Statistics:** `mean.and.interval`, `median.and.interval` (skip `individual.simulation`)
- **Facets:** Single-dimension only: `none`, `age`, `race`, `sex`, `risk` (skip 2/3/4-way cross-tabs -- covers 90%+ of use)
- **Total:** 14 x 2 x 5 = 140 JSON files per custom run
- **Scenario key:** Deterministic from models.json `keyPrefix` + param values (e.g., `a50-o30-r40`)
- **S3 layout:** `portal/{s3Path}/custom/{location}/{scenario-key}.json` (separate from prerun)

**Local testing:** Verified end-to-end with Docker (AL state simset, 1000 sims). Output aggregates correctly via `aggregate-city-data.ts` and matches portal JSON format.

**GHA end-to-end test (C.12580, dry_run + live):**
- Simulation: 3.4 min (80-sim MSA), extraction: 5.2 min (132/140 files, 8 expected facet failures)
- Total wall time: ~12 min including container pull, aggregation, S3 upload
- Data files verified on CloudFront: `https://d320iym4dtm9lj.cloudfront.net/ryan-white/custom/C.12580/a50-o30-r40.json`
- Extraction slower on GHA than local (~2-3 sec/combo vs ~0.15 sec locally) — acceptable for async UX, optimization possible via parallelization
- **Custom sim output validated against Shiny app — values match** (March 19, 2026)

**8 expected facet failures:** `prep.uptake` lacks `risk` dimension (2 failures); `awareness` lacks `race`, `sex`, `risk` dimensions (6 failures). These are model ontology limitations, not bugs. The workflow tolerates partial batch extraction failures and checks file count instead of exit code.

**Container versions deployed:** jheem-base v1.2.0 (jheem2 1.6.2), jheem-ryan-white-model v2.2.1

### Container Rebuild Sequence

The model containers are thin wrappers around `jheem-base`:
```
jheem-base (common code: custom_simulation.R, entrypoint, plotting deps)
  -> jheem-container-minimal (adds workspace) -> ghcr.io/ncsizemore/jheem-ryan-white-model
```

To deploy:
1. Push jheem-base changes -> triggers `jheem-base:latest` build
2. Tag jheem-base release (e.g., `v1.2.0`) -> tagged image pushed to GHCR
3. Update `jheem-container-minimal` Dockerfile `BASE_VERSION` arg -> triggers model container rebuild
4. Update models.json container version + workflow defaults per syncNote

**Base version source of truth:** The Dockerfile's `ARG BASE_VERSION` default is the single source of truth. The workflow only overrides it when explicitly provided via dispatch or manual input — no hardcoded workflow default. This was fixed March 19, 2026 after discovering that a stale workflow default was silently overriding the Dockerfile, causing builds to use the wrong base image.

### Infrastructure: Container Build Cascade -- DISABLED

Automated downstream container rebuilds when jheem-base is tagged.

- [x] Add `repository_dispatch` step to jheem-base build workflow (fires `base-image-updated` event with version payload)
- [x] Update jheem-container-minimal to listen for `repository_dispatch` and use payload version
- [x] Update jheem-ryan-white-croi-container similarly
- [x] Update jheem-cdc-testing-container similarly
- [x] `DISPATCH_TOKEN` configured as fine-grained PAT (scoped to 3 downstream repos, Contents read + Actions write only)

**How it works:** When jheem-base is tagged (e.g., `v1.2.0`), the `notify-downstream` job fires `repository_dispatch` with `{"base_version": "1.2.0"}` to all 3 model container repos. Each downstream workflow accepts the version via dispatch payload, workflow input, or falls back to the Dockerfile default. New repos can be added to the existing PAT without regenerating it.

**Status: Cascade disabled (March 19, 2026).** The cascade assumes all model containers use the same jheem-base version. With the version-matching strategy (see below), different models need different jheem2 versions, so a blanket cascade would force the wrong version onto at least one container. The `notify-downstream` job in jheem-base's build workflow has been commented out. Rebuild each model container individually with the correct `BASE_VERSION`. Re-enable the cascade once all simsets converge to a single jheem2 version.

### Prebuilt Workspace (Tech Debt)

The MSA container (v2.2.1) uses a **prebuilt workspace** from v2.1.0 instead of building fresh. This is because the runtime jheem2 (1.6.2, matching MSA simsets) is too old for the current `jheem_analyses` workspace creation code (`default.solver.metadata` API mismatch).

The workspace is just serialized state (specification objects, constants, ontology mappings). The diffeq behavior that must match between calibration and intervention comes from the installed jheem2 package. The container entrypoint re-exports current package functions over stale workspace copies.

**To rebuild fresh:** Uncomment the workspace-builder stage in the Dockerfile, update `JHEEM_ANALYSES_COMMIT`, and change `COPY --from` to `workspace-builder`. Requires jheem2 version in jheem-base to be compatible with `jheem_analyses` API.

### Workflow: Two-Step Custom Sim Pipeline

The custom simulation workflow (`run-custom-sim.yml`) runs two container invocations:

1. **`custom` mode** — loads workspace, runs intervention simulation, saves simsets to `output/simulations/` in batch-compatible layout
2. **`batch --output-mode data` mode** — reads saved simsets, extracts per-combination JSON files for all outcomes × statistics × facets

This two-step design was introduced when custom mode was refactored to simulate-only (March 13, 2026). The workflow was updated to include the batch extraction step on March 19, 2026.

### Phase 3: Trigger Mechanism -- COMPLETE

**Files:**

| File | Repo | Status |
|------|------|--------|
| `src/app/api/custom-sim/route.ts` | jheem-portal | Created -- Next.js API route |
| `src/hooks/useCustomSimulation.ts` | jheem-portal | Created -- trigger/poll/fetch lifecycle hook |
| `scripts/sync-config.ts` | jheem-portal | Updated -- syncs `customSimulation` params from models.json |

**How it works:**
1. Portal POSTs to `/api/custom-sim` with model ID, location, and parameter values
2. API route derives scenario key from models.json config (imported via sync-config)
3. Checks CloudFront cache via HEAD request -- if hit, returns `{ status: "cached", dataUrl }`
4. Checks GitHub API for in-progress runs matching location -- if running, returns `{ status: "running", runId }`
5. Otherwise triggers GitHub Actions workflow via `workflow_dispatch` API, returns `{ status: "triggered" }`
6. `useCustomSimulation` hook polls `/api/custom-sim/status` every 8 sec until complete, then fetches data

**Auth:** Requires `GITHUB_TOKEN` env var on Vercel (fine-grained PAT with Actions read/write scope on jheem-backend).

- [x] Cache check (HEAD request to CloudFront)
- [x] Trigger mechanism (Next.js API route -> GitHub Actions workflow_dispatch)
- [x] Deduplication (GitHub API check prevents re-triggering running sims)
- [x] Parameter validation (clamp 0-100, round to int, reject non-numeric)
- [ ] Rate limiting (not yet implemented -- low priority for research use)

### Phase 4: Portal UX -- IN PROGRESS

**Files:**

| File | Repo | Status |
|------|------|--------|
| `src/app/ryan-white/custom/page.tsx` | jheem-portal | Created -- parameter UI + results display |
| `src/hooks/useCustomSimulation.ts` | jheem-portal | Created -- trigger/poll/fetch lifecycle |
| `src/app/api/custom-sim/route.ts` | jheem-portal | Created -- trigger + cache check + dedup |
| `src/app/api/custom-sim/status/route.ts` | jheem-portal | Created -- GitHub Actions API status proxy |
| `src/components/analysis/AnalysisResults.tsx` | jheem-portal | Created -- shared controls + chart/table rendering |
| `src/components/SimulationProgress.tsx` | jheem-portal | Created -- stepped progress bar component |
| `src/components/Navigation.tsx` | jheem-portal | Updated -- links to `/ryan-white/custom` |

#### Phase 4a: Polish -- COMPLETE (UX functional, blocked on data accuracy)

**Done:**
- [x] Custom simulation parameter UI (sliders driven by models.json config)
- [x] Location selector (same city list as MSA explorer)
- [x] Submission -> waiting -> results flow
- [x] Navigation updated to `/ryan-white/custom`
- [x] `GITHUB_TOKEN` env var set on Vercel (fine-grained PAT)
- [x] End-to-end test on deployed site (first successful run March 10)
- [x] Parameter validation (clamp 0-100, round to int, reject non-numeric)
- [x] Container version bump to v2.1.0 (fixed custom entrypoint routing)
- [x] Stateful URLs (location + params in query string, auto-trigger on shared link return, copy link button)
- [x] GitHub Actions API for progress (replaced S3 status files entirely -- workflow simplified by 75 lines)
- [x] Dedup via GitHub API (trigger endpoint checks for in-progress runs before dispatching)
- [x] Shared `AnalysisResults` component -- custom sim now has full feature parity with prerun explorer (table view, CSV/PNG export, display options)
- [x] Stepped progress bar with 3 phases (Preparing / Running / Finishing) -- based on actual timing data from completed runs
- [x] Phase regression prevention (forward-only phase updates in both API and hook)
- [x] Elapsed time counter from workflow start
- [x] Human-readable scenario description in results header
- [x] Retry button on error state
- [x] Removed artificial client-side poll timeout (workflow has its own timeout)
- [x] Fixed auto-trigger: only fires on initial page load with URL params, not on location dropdown change
- [x] Removed dead logs API code (was adding latency to every poll with guaranteed 404s)
- [x] Refined progress step messages for better UX
- [x] Removed simulation % progress bar from UI (can never be populated via REST API)
- [x] Container refactored: `custom` mode is now simulate-only (saves simsets in batch-compatible layout, extraction handled by `batch --output-mode data`)

**Deferred: Simulation progress percentage**

The GitHub Actions logs REST API returns 404 for in-progress jobs (confirmed via web research — GitHub community discussion #154834). Real-time log streaming uses WebSockets, not REST. GitHub's roadmap has a REST streaming feature targeted for Q3 2026.

**Best approach: Upstash Redis.** A managed Redis service with a REST API that works from both GHA (`curl`) and Vercel (`fetch()`). The R container writes progress to stdout; a wrapper script in the workflow tails output and PUTs progress to Redis with a short TTL. The status API reads from Redis. Free tier is sufficient for this use case. This is the semantically correct tool for ephemeral real-time state (vs S3 which is an object store, or GitHub annotations which only work between steps).

**Priority:** Nice-to-have. The stepped progress bar already shows which workflow phase is active, with elapsed time. Simulation % would improve UX during the 10-20 minute wait but isn't blocking.

### RESOLVED: Simset/Engine Version Mismatch

**Status:** Fixed. MSA container pinned to jheem2 1.6.2, custom sim output validated against Shiny app (March 19, 2026).
**Severity:** Was critical — resolved by version-matching strategy.
**Discovered:** March 16, 2026, during sanity check comparing custom sim output against Shiny app.

#### The Problem

Custom simulation intervention produces wildly wrong values for non-cumulative outcomes (incidence, new diagnoses). Comparing Baltimore (C.12580), unfaceted, mean.and.interval, with params a50-o30-r40:

| Year | Baseline (both match) | Custom Sim (jheem2 1.9.2) | Shiny App (jheem2 1.6.2) |
|------|----------------------|---------------------------|--------------------------|
| 2024 | 302 | 302 | 302 |
| 2025 | 286 | **9,653** (33.7x) | 338 (1.18x) |
| 2026 | 273 | **2,175** (8.0x) | 491 |
| 2027 | 262 | **2,120** (8.1x) | 522 |

#### Root Cause: Simset/Engine Version Mismatch

**NOT a bug in jheem2 or our intervention code.** The issue is that the diffeq engine version used to run interventions must match the version used to calibrate/generate the baseline simsets.

Commit `76859f2d` (April 16, 2025, "fixed bug in diffeq settings / IDU transmission denominator now restricted to just IDU") is a **legitimate bug fix** by Todd — it narrows the denominator in transmission calculations to the relevant contact category. But it changes the diffeq dynamics, so simsets calibrated under the old dynamics produce incorrect results when interventions are run under the new dynamics (and vice versa).

**Evidence confirming this is a version mismatch, not a bug:**

1. **MSA simsets (pre-fix) + post-fix engine = broken.** The MSA simsets (`ryan-white-msa-v1.0.0`) were generated before commit `76859f2d`. Running interventions on them with any post-fix jheem2 version produces a ~33x incidence spike.

2. **CROI state simsets (post-fix) + post-fix engine = correct.** The CROI state-level simsets (`ryan-white-state-croi`) were generated after the fix. Maryland intervention results show reasonable values:

   | Year | Baseline | Cessation Intervention |
   |------|----------|----------------------|
   | 2025 | 559 | 559 |
   | 2027 | 501 | 855 |
   | 2030 | 448 | 825 |

   These are plausible ~1.5-1.7x ratios, confirming that matched versions produce correct output.

3. **Pre-fix engine + pre-fix simsets = correct.** jheem2 1.6.2 (`ryan-white-deployment` / `54f669a`) with the same MSA simsets produces correct results (1.18x ratio). The versions match.

4. **Every post-fix version produces identical wrong results.** Tested 1.9.2, 1.11.1, 1.12.3 — all show the same 33.7x spike. This is consistent with a version mismatch rather than a progressive bug.

#### Systematic Version Testing

Tested locally with workspace extracted from container, all versions installed from source against the same pre-fix MSA simset:

| jheem2 Version | Branch/Commit | Incidence 2025 | Ratio | Result |
|---------------|---------------|---------------|-------|--------|
| 1.6.2 | `ryan-white-deployment` / `54f669a` | 337.7 | 1.18x | **Correct** (matches simset version) |
| 1.9.2 | `dev` / `0e44ebb` | 9,647.6 | 33.7x | **Mismatched** |
| 1.11.1 | `dev` / `6741633` | 9,647.6 | 33.7x | **Mismatched** |
| 1.12.3 | `master` / `373ebf7` | 9,647.6 | 33.7x | **Mismatched** |

#### Bisect Result: Exact Divergence Commit

**Git bisect completed March 17, 2026.** 8 iterations across 110 commits.

**Divergence commit:** `76859f2d` (April 16, 2025)

```
Author: Todd Fojo
Message: fixed bug in diffeq settings
         IDU transmission denominator now restricted to just IDU

 R/JHEEM_diffeq_interface.R | 2 ++
```

The commit adds 2 lines to `prepare.infections.info()`:
```r
# Lines added at L690 and L697:
catg[names(comp$from.applies.to)] = comp$from.applies.to
```

This is the boundary between "old dynamics" (pre-fix simsets) and "new dynamics" (post-fix simsets). Any simset must be paired with an engine on the same side of this commit.

#### Workspace Namespace Pollution (discovered during debugging)

While testing newer jheem2 versions, we discovered that the container workspace's `load()` dumps hundreds of objects into `.GlobalEnv`, including **old versions of jheem2 functions** from the version that built the workspace. This caused the old `create.intervention` (without the `generate.parameters.function` parameter) to shadow the installed package's version, producing what appeared to be an API break in newer versions.

**The "API break" was not real.** With the correct loading pattern (load workspace first, then re-export current package functions to `.GlobalEnv`), all tested jheem2 versions successfully create and run interventions. See "Workspace Tech Debt" section below.

#### Fix: Version-Matching Strategy

The fix is straightforward: each model container's jheem2 version must match the version used to generate that model's simsets.

1. **Check simset metadata** to confirm which jheem2 version generated each model's simsets. Simsets may store this in their metadata — needs investigation.

2. **Pin each jheem-base version to the correct jheem2 commit.** The infrastructure for this already exists:
   - jheem-base's `renv.lock` pins jheem2 to a specific commit
   - Model containers select a `BASE_VERSION` arg via Dockerfile default
   - Cascade rebuild is disabled; rebuild containers individually

3. **For MSA (pre-fix simsets):** Pinned to jheem2 `54f669a` (1.6.2) via jheem-base v1.2.0. Container v2.2.1 deployed. Uses prebuilt workspace from v2.1.0 (workspace can't be rebuilt with 1.6.2 due to jheem_analyses API mismatch).

4. **For CROI state-level (post-fix simsets):** Current jheem2 version (jheem-base v1.1.1) is already correct.

5. **For AJPH/CDC Testing:** Simset metadata doesn't include jheem2 version. Test empirically when extending custom sims to these models.

6. **Long-term:** When simsets are regenerated with a unified jheem2 version, all containers can converge to a single version and cascade rebuild can be re-enabled.

---

#### Phase 4a Status: COMPLETE

MSA custom simulation pipeline is fully operational as of March 19, 2026. End-to-end validated: portal trigger → GitHub Actions workflow → R container simulation → batch extraction → aggregation → S3/CloudFront → portal rendering. Output verified against Shiny app reference values.

#### Phase 4b: Discovery & Pre-filling -- PLANNED

The prerun and custom sim pipelines produce identical output. This phase unifies them so users see all available results in one place.

**Manifest file:**
A per-location or global JSON listing available scenario keys and metadata. Updated by the workflow after each successful run. Enables the portal to show what's instant vs what needs computation.

```json
{
  "C.12580": {
    "a50-o30-r40": { "label": "ADAP 50%, OAHS 30%, Other 40%", "completedAt": "..." },
    "a0-o0-r0": { "label": "No suppression loss", "completedAt": "..." }
  }
}
```

**Pre-fill workflow:**
Scheduled or manually triggered workflow that runs a grid of common parameter combinations, populating the cache. For prefilled runs (where wall time doesn't matter), we can extract full faceting (all cross-tabs), making these results richer than on-demand runs.

**Unified exploration UX:**
Custom sim page becomes the primary exploration interface:
- Paper scenarios (cessation, interruptions) shown as named presets -- instant, full faceting
- Pre-cached custom runs -- instant, flagged as available
- User-defined parameters -- run on demand, wait for results

Tasks:
- [ ] Design manifest file format and S3 location
- [ ] Update workflow to append to manifest after successful run
- [ ] Portal reads manifest on page load to show available scenarios
- [ ] Pre-fill workflow (parameterized grid, scheduled or manual trigger)
- [ ] Full faceting for prefilled runs (all cross-tabs)
- [ ] Unified UX: presets + cached + on-demand in one interface

#### Phase 4c: Extend to Other Models -- PLANNED

The custom sim page and infrastructure are config-driven. Extending to other models is primarily a models.json + container change. Planned for state-level Ryan White and CDC Testing models to fully standardize the custom sim architecture before the ADAP model arrives.

- [ ] Ryan White state-level (AJPH + CROI) — same intervention pattern, 1000-sim simsets, tested on GHA at 11 GB
- [ ] CDC Testing — different intervention type, will exercise the config-driven design with a non-RW model
- [ ] Add `customSimulation` config to applicable models in models.json
- [ ] Ensure containers have simulation scripts for custom mode
- [ ] Make custom sim page generic (route by model ID, not Ryan White-specific)

**Prerequisite:** Version-matching strategy must be applied per model (MSA done, others TBD).

### Phase 5: ADAP Model -- PENDING

- [ ] PI completes model extension (in progress)
- [ ] Translate ADAP research script to `simple_adap.R` following existing pattern
- [ ] Create ADAP container (or extend existing)
- [ ] Add ADAP config to models.json (including `customSimulation` block)
- [ ] Create portal route and landing page
- [ ] Prerun common parameter grid + support custom on-demand

---

## Actual Workflow Timing (from completed runs)

Measured across 4 completed runs on standard GitHub Actions runners:

| Phase | Typical Time | % of Total |
|-------|-------------|------------|
| Setup (checkout, config, AWS, download, npm ci) | ~30s | 3% |
| **Simulation** (R container) | **10-20 min** | **85-97%** |
| Aggregate + Upload + CloudFront | ~10s | <1% |

The simulation step completely dominates. This informed the 3-step progress bar design (Preparing / Simulating / Finishing).

---

## Prerun vs On-Demand: Convergence

These approaches are complementary and converging:

**Prerun** (predetermined parameter grid):
- Paper scenarios (cessation, interruptions) as named presets
- Pre-filled custom parameter grids for common combinations
- Full faceting available (all cross-tabs, since wall time doesn't matter)
- Execution: scheduled/batch workflow trigger

**On-demand custom** (user-specified parameters):
- User sets exact parameter values, runs on demand
- Single-dimension facets only (faster extraction)
- Results cached on CloudFront — becomes effectively prerun for future users
- Execution: portal-triggered via API

**Both produce identical output format** (JSON on CloudFront, rendered by same portal components). The manifest file bridges them — the portal shows all available results regardless of how they were generated, and lets users request new combinations on demand.

---

## Key Design Decisions

| Decision | Resolution |
|----------|------------|
| **Data extraction scope** | On-demand: single-dimension facets (14 x 2 x 5 = 140 combos). Prefilled: full cross-tabs. |
| **S3 path scheme** | `portal/{s3Path}/custom/{location}/{scenario-key}.json` -- deterministic from params via models.json keyPrefix |
| **Scenario key derivation** | From models.json `customSimulation.parameters[].keyPrefix` + value (e.g., `a50-o30-r40`) |
| **Progress tracking** | GitHub Actions Jobs API for step-level phases. Simulation % deferred — logs REST API returns 404 for in-progress jobs; Upstash Redis identified as best approach when ready. |
| **Shared components** | `AnalysisResults` extracted from `AnalysisView` — used by both prerun explorer and custom sim page for full feature parity. |
| **First model** | Ryan White MSA -- `simple_ryan_white.R` is tested, simsets fit standard runner memory |
| **Trigger mechanism** | Next.js API route -> GitHub Actions workflow_dispatch |
| **Parameter config** | models.json `customSimulation` block -- single source of truth for pipeline + portal UI |
| **Stateful URLs** | Parameters encoded in query params -- shareable, bookmarkable, enables leave-and-return |
| **Discovery** | Manifest file on S3 lists available scenario keys per location |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| State-level simsets OOM on standard runners | Low | Medium | Tested at 11 GB / 15 GB available. Self-hosted runners as fallback. |
| GitHub Actions concurrency limits under load | Low | Medium | Caching reduces repeat runs; can add queue logic if needed |
| R container has breaking changes with new model | Low | High | Containers are versioned and pinned; test in isolation |
| ADAP model parameters don't fit existing intervention pattern | Low | Medium | Translation guide covers this; PI can advise on mapping |
| User expects real-time results | Medium | Low | Clear UX messaging; prerun common params for instant access |
| **Custom sim produces wrong incidence values** | **Fixed** | **Critical** | **Simset/engine version mismatch. MSA container pinned to jheem2 1.6.2 (v2.2.1). Divergence commit: `76859f2d`. Validated March 19, 2026.** |
| Cascade rebuild pushes wrong version to a container | Mitigated | High | Cascade disabled March 19, 2026. Rebuild each container individually. |
| Workflow default overrides Dockerfile base version | Fixed | High | Removed hardcoded workflow defaults. Dockerfile ARG is now sole source of truth for base version (all 3 container repos). |
| Workspace can't be rebuilt with older jheem2 | Confirmed | Medium | MSA container uses prebuilt workspace from v2.1.0. Documented in Dockerfile with instructions to re-enable workspace builder. |
| Workspace loads stale functions into `.GlobalEnv` | Confirmed | Medium | Load workspace first, then re-export package functions. Long-term: rebuild workspace with selective serialization. |

---

## Workspace Tech Debt

The container workspace pattern was designed to replace the team's approach of sourcing many R files into the global environment to load a model specification. It captures the fully-initialized R environment (version manager state, ontology mappings, constants, specification objects) into a single `.RData` file that loads in ~25 seconds vs minutes of sourcing.

**The pattern works but has two issues exposed during this investigation:**

### 1. Indiscriminate serialization

`save()` on `.GlobalEnv` captures everything present at build time, including whatever version of jheem2 functions were loaded. When the workspace is `load()`ed later with a different jheem2 version, the old functions shadow the new package's exports. This caused the apparent "API break" when testing newer jheem2 versions.

**Fix:** The workspace loading code in the container should:
1. Load workspace into `.GlobalEnv` (needed — compiled specification callbacks reference global objects)
2. **Then** re-export all current package functions to `.GlobalEnv`, overwriting stale copies

The container's entrypoint already does step 2 (the `for (fn in ls(pkg_env)) assign(fn, ...)` loop), but the ORDER matters — it must happen AFTER the workspace load, not before. The current container code does workspace load → function export, which is correct. However, if the workspace is ever rebuilt, we should consider serializing only the needed state objects rather than the entire `.GlobalEnv`.

### 2. Internal function export hack

The container exports ALL jheem2 internal functions to `.GlobalEnv` to work around errors where internal functions were "not found" at runtime. This likely happens because serialized closures in the compiled specification capture environments that reference the global env rather than the package namespace. The proper fix would be in jheem2 itself — ensuring closures capture namespace references — but the global export workaround is functional and low-risk.

### Recommended improvements (non-blocking)

- **Short-term:** Ensure workspace load order is correct in container entrypoint (workspace first, then function export). Verify this is the case in current `container_entrypoint.sh`.
- **Medium-term:** When rebuilding workspace, use selective serialization — save only `.jheem2_state`, constants, and specification objects rather than blanket `.GlobalEnv`. This prevents stale function contamination.
- **Long-term:** Fix the namespace reference issue in jheem2 so internal functions don't need to be exported to `.GlobalEnv`. This would allow the workspace to be much smaller and cleaner.

---

## Path Forward (as of March 19, 2026)

Priority-ordered.

1. ~~**Validate MSA custom sim end-to-end**~~ **DONE.** Container v2.2.1 with jheem2 1.6.2, two-step pipeline (simulate + extract), output validated against Shiny app.

2. **UI polish: disable unavailable facets.** The portal should disable facet selections that don't exist for a given outcome (e.g., `risk` for `prep.uptake`, `race`/`sex`/`risk` for `awareness`). Best approach: data-driven — if the facet combo doesn't exist in the loaded JSON, grey it out. No hardcoding needed.

3. **Extend custom sims to state-level + CDC Testing.** Exercise the config-driven design with non-MSA models before the ADAP model arrives. CROI containers should already be correct (post-fix simsets + post-fix engine). Test and pin versions for each model at that time — simset metadata doesn't include jheem2 version, so empirical testing is required.

4. **Discovery & pre-filling (Phase 4b).** Manifest file, pre-filled parameter grids, unified exploration UX. Pre-filling common parameter combos gives users instant results and exercises the pipeline.

5. **Performance: matrix extraction.** The two-step pipeline enables parallelizing the extraction step (currently ~5 min for 132 files). Could matrix by outcome to speed up on-demand runs. Simulation step (~8-10 min) can't be parallelized. Net benefit is modest (~3 min saved) — defer until usage patterns are clear.

6. **Workspace improvements** (non-blocking). Fix workspace loading pattern to prevent stale function contamination. Consider selective serialization when next rebuilding workspaces. See Workspace Tech Debt section.

7. **Upstash Redis for simulation progress %.** Nice-to-have UX improvement for the 10-20 minute wait.

8. **ADAP model (Phase 5).** Dependent on PI completing model extension. The infrastructure will be ready.

9. **Converge to single jheem2 version** (long-term). Once all simsets are regenerated with a unified jheem2 version (post-fix), all containers can use the same jheem-base and the cascade rebuild can be re-enabled. This would eliminate the version split complexity and allow re-enabling the cascade rebuild.

---

## Version Matrix (as of March 19, 2026)

Understanding which versions are deployed where:

```
jheem-base (shared R runtime + scripts)
├── v1.0.0 → jheem2 latest (pre-pin)
├── v1.1.1 → jheem2 latest
└── v1.2.0 → jheem2 1.6.2 (pinned for MSA simsets)

MSA container (jheem-container-minimal)
├── Base: v1.2.0 (jheem2 1.6.2, matching pre-fix MSA simsets)
├── Workspace: prebuilt from v2.1.0 (can't rebuild with old jheem2)
├── Tag: v2.2.1
└── Simsets: ryan-white-msa-v1.0.0

CROI container (jheem-ryan-white-croi-container)
├── Base: v1.0.0 (jheem2 latest, matching post-fix CROI simsets)
├── Tag: v1.0.0
└── Simsets: ryan-white-state-v2.0.0

CDC container (jheem-cdc-testing-container)
├── Base: v1.0.0 (jheem2 latest)
├── Tag: v2.0.0
└── Simsets: cdc-testing-v1.0.0
```

**Key constraint:** Different models need different jheem2 versions because their simsets were generated at different times relative to the diffeq fix (`76859f2d`). This is why cascade rebuild is disabled — a blanket rebuild would push the wrong version to at least one container. Each container must be rebuilt individually with the correct `BASE_VERSION`.

**Resolution path:** When all simsets are regenerated with a single jheem2 version, the version split goes away and cascade rebuild can be re-enabled.
