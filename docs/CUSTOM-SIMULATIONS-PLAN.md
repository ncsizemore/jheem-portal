# Custom Simulations: Architecture Plan

**Status:** Phase 2 complete, preparing for end-to-end test
**Date:** March 4, 2026 (updated March 6, 2026)
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
- **`custom` mode** (new) — loads workspace, accepts user parameters, creates intervention, runs simulation, extracts data in batch-compatible JSON format.
- **`simulation/simple_ryan_white.R`** — clean translation from research scripts to user-facing parameters. Documented pattern for translating any research script (`simulation/README.md`).

### Backend (jheem-backend)

- **GitHub Actions workflow template** — battle-tested across 4 models. Handles: config loading from models.json, parallel per-location execution, data extraction, S3 upload, CloudFront invalidation.
- **models.json** — single source of truth for model configs, now including `customSimulation` parameter definitions.
- **`run-custom-sim.yml`** — custom simulation workflow (reads params from models.json, deterministic S3 paths, status files).

### Portal (jheem-portal)

- **Native rendering pipeline** — `NativeSimulationChart` (Recharts) renders from JSON data files served via CloudFront. This is the current architecture for all 4 models.
- **Navigation** — "Custom Simulations" link already wired into Ryan White submenu.

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
  -> portal polls status file for completion
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
      a50-o30-r40-status.json     # status: {"status":"running"|"complete", ...}
    AL/
      a50-o30-r40.json
      a50-o30-r40-status.json
```

CloudFront paths (origin strips `portal/` prefix):
- Data: `https://d320iym4dtm9lj.cloudfront.net/ryan-white/custom/C.12580/a50-o30-r40.json`
- Status: `https://d320iym4dtm9lj.cloudfront.net/ryan-white/custom/C.12580/a50-o30-r40-status.json`

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
- **Status files:** `running` written at workflow start, `complete` at end (for portal polling)
- **S3 layout:** `portal/{s3Path}/custom/{location}/{scenario-key}.json` (separate from prerun)

**Local testing:** Verified end-to-end with Docker (AL state simset, 1000 sims). Output aggregates correctly via `aggregate-city-data.ts` and matches portal JSON format.

**GHA end-to-end test (C.12580, dry_run + live):**
- Simulation: 3.4 min (80-sim MSA), extraction: 5.2 min (132/140 files, 8 expected facet failures)
- Total wall time: ~10.7 min including container pull, aggregation, S3 upload
- Data + status files verified on CloudFront: `https://d320iym4dtm9lj.cloudfront.net/ryan-white/custom/C.12580/a50-o30-r40.json`
- Extraction slower on GHA than local (~2-3 sec/combo vs ~0.15 sec locally) — acceptable for async UX, optimization possible via parallelization

**Container versions deployed:** jheem-base v1.1.1, jheem-ryan-white-model:latest (based on v1.1.1)

### Container Rebuild Sequence

The model containers are thin wrappers around `jheem-base`:
```
jheem-base (common code: custom_simulation.R, entrypoint, plotting deps)
  -> jheem-container-minimal (adds workspace) -> ghcr.io/ncsizemore/jheem-ryan-white-model
```

To deploy:
1. Push jheem-base changes -> triggers `jheem-base:latest` build
2. Tag jheem-base release (e.g., `v1.1.0`) -> tagged image pushed to GHCR
3. Update `jheem-container-minimal` Dockerfile `BASE_VERSION` arg -> triggers model container rebuild
4. Use `container_image_override` in workflow to test new image tag before updating models.json

### Infrastructure: Container Build Cascade -- PENDING

Automate downstream container rebuilds when jheem-base changes. Currently, updating jheem-base requires manually bumping `BASE_VERSION` in each model container repo and pushing.

- [ ] Add `repository_dispatch` step to jheem-base build workflow (fires `base-image-updated` event with version payload)
- [ ] Update jheem-container-minimal to listen for `repository_dispatch` and use payload version
- [ ] Update jheem-ryan-white-croi-container similarly
- [ ] Update jheem-cdc-testing-container similarly
- [ ] Remove hardcoded `BASE_VERSION` build arg from model container workflows (read from dispatch payload, fall back to default)

**Priority:** Low. Do after Phase 2 is validated end-to-end. Higher priority if jheem-base changes frequently (jheem2 bug fix, ADAP support, etc.).

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
4. Checks status file for in-progress runs -- if running, returns `{ status: "running", statusUrl }`
5. Otherwise triggers GitHub Actions workflow via `workflow_dispatch` API, returns `{ status: "triggered", statusUrl }`
6. `useCustomSimulation` hook polls status URL every 8 sec until complete, then fetches data

**Auth:** Requires `GITHUB_TOKEN` env var on Vercel (PAT with `actions:write` scope on jheem-backend).

- [x] Cache check (HEAD request to CloudFront)
- [x] Trigger mechanism (Next.js API route -> GitHub Actions dispatch)
- [x] Deduplication (status file check prevents re-triggering running sims)
- [ ] Rate limiting (not yet implemented -- low priority for research use)

### Phase 4: Portal UX -- IN PROGRESS

**Files:**

| File | Repo | Status |
|------|------|--------|
| `src/app/ryan-white/custom/page.tsx` | jheem-portal | Created -- parameter UI + results display |

**What's done:**
- [x] Custom simulation parameter UI (sliders driven by models.json config)
- [x] Location selector (same city list as MSA explorer)
- [x] Submission -> waiting -> results flow with progress indicator
- [x] Results display using NativeSimulationChart (same components as prerun explorer)
- [x] Facet dimension toggles, outcome/statistic selectors

**What's remaining:**
- [ ] Update navigation to point to `/ryan-white/custom` (currently links to Shiny app)
- [ ] Set `GITHUB_TOKEN` env var on Vercel for API route auth
- [ ] End-to-end test on deployed site
- [ ] Polish: scenario label display in chart legend, error recovery, re-run with different params
- [ ] Consider: landing page for custom sims (context, documentation)

### Phase 5: ADAP Model -- PENDING

- [ ] PI completes model extension (in progress)
- [ ] Translate ADAP research script to `simple_adap.R` following existing pattern
- [ ] Create ADAP container (or extend existing)
- [ ] Add ADAP config to models.json (including `customSimulation` block)
- [ ] Create portal route and landing page
- [ ] Prerun common parameter grid + support custom on-demand

---

## Prerun vs On-Demand: Not Either/Or

These approaches are complementary, not competing:

**Prerun** (predetermined parameter grid):
- Best for: models with few discrete scenarios (current Ryan White, CDC Testing)
- Also useful for: pre-populating the most common ADAP parameter combinations for instant results
- Execution: existing workflow template, batch trigger

**On-demand custom** (user-specified parameters):
- Best for: models with continuous parameters where users want specific values
- Essential for: ADAP model (4 parameters, large combinatorial space)
- Execution: same pipeline, user-triggered via portal

Both produce identical output (JSON data on CloudFront) and use identical portal rendering. The only difference is trigger mechanism and timing.

---

## Key Design Decisions

| Decision | Resolution |
|----------|------------|
| **Data extraction scope** | All outcomes, single-dimension facets only (14 x 2 x 5 = 140 combos). Covers 90%+ of use. |
| **S3 path scheme** | `portal/{s3Path}/custom/{location}/{scenario-key}.json` -- deterministic from params via models.json keyPrefix |
| **Scenario key derivation** | From models.json `customSimulation.parameters[].keyPrefix` + value (e.g., `a50-o30-r40`) |
| **Progress UX** | Simple polling via status file on S3/CloudFront (check every 5-10 sec) |
| **First model** | Ryan White MSA -- `simple_ryan_white.R` is tested, simsets fit standard runner memory |
| **Trigger mechanism** | TBD -- likely Next.js API route (simplest, stays in portal stack) |
| **Parameter config** | models.json `customSimulation` block -- single source of truth for pipeline + portal UI |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| State-level simsets OOM on standard runners | Low | Medium | Tested at 11 GB / 15 GB available. Self-hosted runners as fallback. |
| GitHub Actions concurrency limits under load | Low | Medium | Caching reduces repeat runs; can add queue logic if needed |
| R container has breaking changes with new model | Low | High | Containers are versioned and pinned; test in isolation |
| ADAP model parameters don't fit existing intervention pattern | Low | Medium | Translation guide covers this; PI can advise on mapping |
| User expects real-time results | Medium | Low | Clear UX messaging ("results ready in ~5 minutes"); prerun common params for instant access |
