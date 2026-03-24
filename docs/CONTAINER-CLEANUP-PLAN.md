# Container Architecture Cleanup

**Parent plan:** [Custom Simulations Plan](./CUSTOM-SIMULATIONS-PLAN.md) (item 4 in Path Forward)
**Status:** COMPLETE (March 24, 2026). All Ryan White containers rebuilt, tagged, and validated. Custom sims confirmed working for all 3 models. Remaining: housekeeping (archive old repo, wire cascade rebuilds, CDC container bump).

## Problem

The container/versioning setup has accumulated workarounds that make it hard to reason about and extend. The immediate trigger: CROI custom sims fail because its container (base v1.0.0) predates custom mode. But the deeper issue is that jheem-base v1.2.0 baked in an MSA-specific jheem2 pin, MSA and AJPH share a container despite needing different jheem2 versions, and CROI overrides jheem2 in its Dockerfile. Adding new models (ADAP) into this ecosystem will compound the mess.

## Pre-Cleanup State (historical)

```
jheem-base
  v1.0.0  jheem2 1.9.2, no custom mode
  v1.1.1  jheem2 1.9.2, custom mode added
  v1.2.0  jheem2 1.6.2 (MSA-specific pin), custom mode, cascade disabled

jheem-ryan-white-container → ghcr.io/ncsizemore/jheem-ryan-white-model
  (local folder: jheem-container-minimal)
  v2.1.0  Built on ~base v1.1.0, jheem2 1.9.2, has custom mode (AJPH uses this)
  v2.2.1  Built on base v1.2.0, jheem2 1.6.2, prebuilt workspace from v2.1.0 (MSA uses this)
  Problem: shared container serving two models with different jheem2 needs

jheem-ryan-white-croi-container → ghcr.io/ncsizemore/jheem-ryan-white-croi
  v2.0.0  Built on base v1.0.0 + renv::install('tfojo1/jheem2@dev') override
  Problem: no custom mode, floating jheem2 override

jheem-cdc-testing-container → ghcr.io/ncsizemore/jheem-cdc-testing-model
  v2.0.0  Built on base v1.0.0, no custom mode
  Problem: no custom mode, inconsistent image name (-model suffix)
```

## Current State (post-cleanup)

```
jheem-base
  v1.3.0  jheem2 1.11.1 (commit 3b74e3c), custom mode, clean slate

jheem-ryan-white-msa-container (NEW) → ghcr.io/ncsizemore/jheem-ryan-white-msa
  v1.0.1  Built on base v1.3.0, prebuilt workspace from v2.1.0 (jheem2 1.9.2)
          Runtime: pins jheem2 1.6.2 (commit 54f669a)
          Custom sims: validated March 24, 2026 (C.29820)

jheem-ryan-white-ajph-container (NEW) → ghcr.io/ncsizemore/jheem-ryan-white-ajph
  v1.0.0  Built on base v1.3.0, workspace built from source (jheem_analyses fc3fe1d)
          Inherits base jheem2 1.11.1 (no override)
          Custom sims: validated March 23, 2026 (FL)

jheem-ryan-white-croi-container → ghcr.io/ncsizemore/jheem-ryan-white-croi
  v2.1.0  Built on base v1.3.0, workspace built from source
          Inherits base jheem2 1.11.1 (removed @dev override)
          Custom sims: validated March 23, 2026 (FL)

jheem-cdc-testing-container → ghcr.io/ncsizemore/jheem-cdc-testing-model
  v2.0.0  Still on base v1.0.0 — not yet updated (Step 7)

jheem-ryan-white-container → ghcr.io/ncsizemore/jheem-ryan-white-model
  SUPERSEDED. v2.1.0 still referenced as MSA workspace source.
  To be archived once MSA container is fully vetted.
```

## Design Principles

- **jheem-base owns the default jheem2 version** (latest stable). Model containers inherit from base and only override jheem2 with a specific, documented reason.
- **Each model gets its own container** — no sharing.
- **Workspace must be compatible with runtime jheem2.** Workspaces serialize function definitions into `.GlobalEnv` via `load()`. If the workspace was built with jheem2 version X, the serialized functions must be compatible with runtime jheem2 version Y's R6 class signatures. For models that inherit base jheem2, building from source works. For MSA (pinned to 1.6.2), the workspace must come from a jheem2 version whose function signatures are compatible with 1.6.2 (the v2.1.0 workspace, built with 1.9.2, satisfies this).

## Decisions

### 1. What jheem2 version should base v1.3.0 ship?

Options:
- **dev HEAD (3b74e3c):** Latest, most features. But jheem2 has no release tags so "latest" is a floating target. Pin to this specific commit in renv.lock for reproducibility.
- **1.9.2 (0e44ebb):** What base v1.0.0-v1.1.1 already shipped. Known to work with AJPH and (via CROI override) CROI. Conservative choice.

Recommendation: **Pin to dev HEAD (3b74e3c) in renv.lock.** This is what CROI effectively used (via `@dev`), and AJPH/CDC prerun data was extracted with post-1.9.2 versions. Pinning the commit in renv.lock makes it reproducible. If something breaks, we have a clear commit to bisect from.

Risk: jheem2 dev HEAD might have breaking changes vs 1.9.2 that affect AJPH or CDC. Mitigation: test each container after rebuild before updating models.json.

### 2. AJPH + MSA workspaces: rebuild or prebuilt?

**AJPH: Build from source.** AJPH inherits base jheem2, so workspace and runtime use the same version. Building from jheem_analyses (pinned at commit fc3fe1d) is clean and reproducible.

**MSA: Prebuilt workspace.** Building from source with jheem2 1.11.1 serializes function definitions (e.g., `create.intervention` with `generate.parameters.function` arg) that are incompatible with the 1.6.2 runtime R6 classes. The v2.1.0 workspace (built with jheem2 1.9.2) has compatible function signatures. Copied via multi-stage Docker build (`COPY --from=ghcr.io/ncsizemore/jheem-ryan-white-model:2.1.0`).

This was discovered after the initial v1.0.0 MSA build failed custom sims — see Step 4 notes.

### 3. Naming convention

All repos and images follow a consistent pattern:

| Repo | Image |
|------|-------|
| `jheem-base` | `ghcr.io/ncsizemore/jheem-base` |
| `jheem-ryan-white-msa-container` | `ghcr.io/ncsizemore/jheem-ryan-white-msa` |
| `jheem-ryan-white-ajph-container` | `ghcr.io/ncsizemore/jheem-ryan-white-ajph` |
| `jheem-ryan-white-croi-container` | `ghcr.io/ncsizemore/jheem-ryan-white-croi` |
| `jheem-cdc-testing-container` | `ghcr.io/ncsizemore/jheem-cdc-testing` |

Old repo `jheem-ryan-white-container` (local: `jheem-container-minimal`) → archived. Existing images remain in ghcr.io as workspace sources.

## Execution Plan

### Step 1: jheem-base v1.3.0 — DONE (March 23, 2026)

1. Updated renv.lock jheem2 to dev HEAD (commit `3b74e3c` / v1.11.1) using `renv::install()` + `renv::snapshot()` inside the container
2. Tagged v1.3.0, pushed, GHA build succeeded

### Step 2: CROI container v2.1.0 — DONE (March 23, 2026)

1. Updated `BASE_VERSION=1.0.0` → `1.3.0`
2. Removed `renv::install('tfojo1/jheem2@dev')` override (inherits from base)
3. Local build + smoke test passed
4. GHA build succeeded, tagged v2.1.0

### Step 3: AJPH container v1.0.0 — DONE (March 23, 2026)

1. Created `jheem-ryan-white-ajph-container` repo (public)
2. Dockerfile: `FROM jheem-base:1.3.0`, workspace built from source (jheem_analyses at fc3fe1d)
3. GHA build succeeded, tagged v1.0.0

Design change from plan: builds workspace from source rather than copying prebuilt from old container. This is cleaner and more reproducible.

### Step 4: MSA container v1.0.1 — DONE (March 24, 2026)

1. Created `jheem-ryan-white-msa-container` repo (public)
2. v1.0.0: Attempted workspace build from source (base jheem2 1.11.1) + runtime pin to 1.6.2. GHA build succeeded but custom sims failed: workspace's `create.intervention` (from 1.11.1) passes `generate.parameters.function` to `JHEEM.STANDARD.INTERVENTION$new()`, which 1.6.2's R6 class doesn't accept.
3. v1.0.1: Switched to prebuilt workspace from `ghcr.io/ncsizemore/jheem-ryan-white-model:2.1.0` (built with jheem2 1.9.2, compatible with 1.6.2 runtime). Custom sims validated (C.29820).

Key lesson: for MSA, workspace and runtime jheem2 must have compatible function signatures. Workspace serializes function bodies into `.GlobalEnv` which shadow the installed package at runtime.

### Step 5: Update models.json + portal + workflow defaults — DONE (March 23, 2026)

1. Updated all container references in models.json (MSA, AJPH, CROI)
2. Pushed models.json, ran sync-config.ts
3. Updated workflow defaults in generate-msa.yml, generate-ajph.yml, generate-croi.yml, test-custom-sim.yml
4. Fallback containers noted in workflow comments (batch generation not re-tested with new containers)

### Step 6: Validate custom sims — DONE (March 24, 2026)

All three Ryan White models tested via portal-triggered `run-custom-sim.yml`:
- **CROI** (FL): Success — March 23, 2026
- **AJPH** (FL): Success — March 23, 2026
- **MSA** (C.29820): Success — March 24, 2026 (after v1.0.1 fix)

### Step 7: Housekeeping — PENDING (non-blocking)

1. Archive `jheem-ryan-white-container` repo with note pointing to new repos
2. Wire up cascade rebuild (`notify-downstream` in jheem-base) with new repo names
3. CDC Testing container: same pattern, bump base to v1.3.0, push to `ghcr.io/ncsizemore/jheem-cdc-testing`, update models.json

## Cascade Rebuilds (Unlocked)

The dedicated container architecture re-enables cascade rebuilds. Every container now inherits jheem2 from base, and MSA's deviation is cleanly handled by a final `renv::install()` step. When jheem-base is tagged, `notify-downstream` can fire `repository_dispatch` to all model container repos. Each downstream build picks up the new base version automatically.

To wire up: update `notify-downstream` job in jheem-base's workflow with the new repo names (jheem-ryan-white-msa-container, jheem-ryan-white-ajph-container, jheem-ryan-white-croi-container, jheem-cdc-testing-container).

## Verification

For each rebuilt container:
1. **Smoke test:** `docker run <image> test-workspace` — workspace loads, specification exists
2. **Custom sim test:** Run with a single location + default params, verify simset output
3. **Batch extraction test:** Run batch mode on the custom sim output, verify JSON files
4. **End-to-end test:** Trigger workflow, verify data lands in S3 and renders in portal

## Risk Assessment

- **Low risk:** CROI and AJPH rebuilds. Both use post-fix jheem2. The main change is getting custom mode from base.
- **Medium risk:** Updating base jheem2 from 1.9.2 to dev HEAD. jheem2 has no release tags or changelog, so we're relying on testing to catch issues. Mitigation: test each container after rebuild before updating models.json.
- **Low risk:** MSA rebuild. Same prebuilt workspace, just re-layered on clean base with explicit jheem2 pin.

## Timeline

Steps 1-4 are ~3-4 hours of work assuming no surprises from the jheem2 version bump. Step 6 (CDC) can be done separately.
