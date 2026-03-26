# CDC Testing Custom Simulations

**Parent plan:** [Custom Simulations Plan](./CUSTOM-SIMULATIONS-PLAN.md) (item 5 in Path Forward)
**Status:** Step 0 complete (base v1.4.0, validated with CROI v2.2.0). Ready for Steps 1-5.
**Date:** March 26, 2026

## Goal

Add custom simulation support for CDC Testing — the first non-Ryan-White model to get custom sims. This validates that the config-driven custom sim architecture generalizes beyond Ryan White's intervention pattern. It also retires the legacy CDC Testing Shiny custom sim app.

## Architectural Gap: jheem-base custom_simulation.R is Ryan White-specific

**Discovered March 25, 2026.** The custom simulation pipeline in jheem-base was built when only Ryan White had custom sims. It hardcodes:

- **Env vars:** `ADAP_LOSS`, `OAHS_LOSS`, `OTHER_LOSS` (Ryan White parameters)
- **Simulation script:** `source("simulation/simple_ryan_white.R")` (hardcoded path)
- **Intervention creation:** `create_ryan_white_intervention(params)` (hardcoded function)
- **Directory layout:** `simulations/ryan-white/...` (hardcoded model path)

This didn't surface during the container cleanup because that plan addressed infrastructure (per-model containers, base inheritance), not the application layer. The gap becomes visible now that a second model with different intervention logic needs custom sims.

### Design: Model-agnostic custom_simulation.R

The fix is to make `custom_simulation.R` a generic orchestrator. Most of what it does is already model-agnostic:
- Workspace loading (auto-detects `*_workspace.RData`)
- jheem2 state restoration (VERSION.MANAGER, ONTOLOGY.MAPPING.MANAGER)
- jheem2 NULL-guard workaround
- Base simset loading from `/data/`
- Saving simsets in batch-compatible layout

The only model-specific parts are sourcing the simulation script and calling it. The refactored design:

**Contract:** Each model's simulation script exports two functions:
- `create_model_intervention(params)` → returns a jheem2 intervention object
- `run_custom_simulation(base_simset, intervention)` → returns results simset

**Env vars added:**
- `SIMULATION_SCRIPT` — path to the model's simulation script (from models.json `simulationScript`)
- `MODEL_ID` — used for directory layout (e.g., `simulations/{MODEL_ID}/base/...`)

**Parameter passing:** Already handled. The workflow reads models.json parameter definitions and passes each as an env var (e.g., `ADAP_LOSS=50`, `TESTING_REDUCTION=100`). The simulation script reads whatever env vars it needs. `custom_simulation.R` doesn't know or care what they are.

**Where simulation scripts live:**
- `simple_ryan_white.R` stays in jheem-base for now (all 3 RW containers share it, moving would mean 3 copies)
- `simple_cdc_testing.R` goes in `jheem-cdc-testing-container` (model-specific, COPYed into container)
- Future model scripts go in their model containers

This is pragmatic — RW script in base is minor tech debt, but moving it gains nothing since all 3 RW containers need it and there's no shared layer between them. The important thing is that `custom_simulation.R` no longer assumes Ryan White.

### Changes required

| File | Repo | Change |
|------|------|--------|
| `common/custom_simulation.R` | jheem-base | Refactor: read `SIMULATION_SCRIPT` + `MODEL_ID` env vars, remove hardcoded RW params/paths |
| `simulation/simple_ryan_white.R` | jheem-base | Rename `create_ryan_white_intervention` → `create_model_intervention` (contract) |
| `run-custom-sim.yml` | jheem-backend | Pass `SIMULATION_SCRIPT` and `MODEL_ID` env vars to container |
| Tag jheem-base v1.4.0 | jheem-base | After refactor |
| Rebuild RW containers | all 3 RW container repos | Bump to base v1.4.0, validate custom sims still work |

## Intervention Model

CDC Testing uses a different intervention pattern than Ryan White. Instead of 6 suppression-loss effects across ADAP/OAHS/other, it has 2 whole-population effects:

| Parameter | Quantity | Description |
|-----------|----------|-------------|
| **Testing reduction** | `cdc.effect` | How much CDC-funded testing is reduced (0-100%). 100% = full cessation. Value passed to jheem2 as `1 - (reduction/100)`. Registered as a model element with scale `proportion`. |
| **Proportion tested regardless** | `proportion.tested.regardless` | Fraction of people who continue testing without CDC funding (0-100%). Fixed user value (Shiny app does the same — the research script's beta distribution is for prerun scenarios, not user-specified custom sims). Registered as a model element. |

Both effects target `WHOLE.POPULATION`. No subgroup targeting, no expansion/nonexpansion split.

The prerun scenarios already cover timing variants (cessation, brief/prolonged interruption). Custom sims use cessation timing (permanent reduction) with user-specified magnitudes. Timing parameters can be added later if needed.

### Specification Version Dependency

**Critical finding:** The two parameters require a newer version of `cdc_testing_specification.R` than what the current container workspace was built from.

- **At commit `fc3fe1d`** (current container workspace): Only `cdc.effect` exists as a model element. `proportion.tested.regardless` is NOT registered in the specification. The prerun interventions handle it as a *parameter matrix* on the intervention object (1000 beta-distribution samples), not as a separate intervention effect on a model element.

- **At current HEAD of jheem_analyses**: Both `cdc.effect` AND `proportion.tested.regardless` are registered as model elements. The key quantity `cdc.funded.testing.of.undiagnosed` now explicitly depends on both: `super.testing.of.undiagnosed * fraction.diagnoses.from.cdc * cdc.effect`. The Shiny app sources current HEAD, which is why it can use both as separate intervention effects.

**Implication:** The CDC Testing container must rebuild its workspace from a newer jheem_analyses commit (current HEAD or close to it) to support both custom sim parameters. This happens naturally when we bump the container to the new base — the workspace build already clones jheem_analyses, we just update the pinned commit.

**Reference code:**
- Shiny intervention effects: `jheem2_interactive/src/adapters/interventions/model_effects.R` (lines 155-230) — canonical source for CDC Testing effect creation patterns
- Shiny intervention adapter: `jheem2_interactive/src/adapters/intervention_adapter.R` — timing: `start_year=2025, end_year=2030`
- Research interventions: `jheem_analyses/applications/cdc_testing/cdc_testing_interventions.R`
- Model specification: `jheem_analyses/applications/cdc_testing/cdc_testing_specification.R` (must use version with `proportion.tested.regardless` registered)
- Ryan White simulation script (contract pattern): `jheem-base/simulation/simple_ryan_white.R`

## Execution Steps

### Step 0: Refactor custom_simulation.R (prerequisite) — DONE (March 26, 2026)

Made `custom_simulation.R` model-agnostic. Unblocks CDC Testing and any future model.

**Completed:**
1. `common/custom_simulation.R` — model-agnostic orchestrator. Reads `SIMULATION_SCRIPT`, `MODEL_ID` (required, errors if missing). Sources `simulation/${SIMULATION_SCRIPT}`, calls contract functions `create_model_intervention()` / `run_custom_simulation()`.
2. `simulation/simple_ryan_white.R` — updated to contract. Reads its own env vars. Renamed `create_ryan_white_intervention` → `create_model_intervention`.
3. `common/batch_plot_generator.R` and `plotting/plotting_deps/baseline_loading.R` — simset paths use `MODEL_ID` env var (default `ryan-white` for prerun backward compat).
4. `_generate-data-template.yml` — filesystem paths use `inputs.model_id` instead of hardcoded `ryan-white`. Passes `MODEL_ID` env var to batch docker run.
5. `run-custom-sim.yml` — reads `simulationScript` from models.json, passes `SIMULATION_SCRIPT` and `MODEL_ID` to container.
6. jheem-base tagged v1.4.0.
7. CROI rebuilt on base v1.4.0 (v2.2.0), custom sim validated end-to-end (FL, dry run).

**Housekeeping (non-blocking):** MSA (v1.0.1) and AJPH (v1.0.0) are still on base v1.3.0. They work fine — the old `custom_simulation.R` ignores the new env vars and uses hardcoded defaults. Should be bumped to base v1.4.0 when convenient so all containers are on the same base.

### Step 1: `simple_cdc_testing.R` in CDC Testing container

New simulation script following the contract from Step 0.

```r
# simulation/simple_cdc_testing.R

# jheem2 typo workaround
get.intervention.from.code.from.code <- function(...) {
  get.intervention.from.code(...)
}

# Constants (CDC.TESTING.ANCHOR.YEAR = 2025, start = anchor + 0.75)
CDC.TESTING.START.YEAR <- 2025.75
CDC.TESTING.LOSS.LAG <- 0.25

create_model_intervention <- function(params) {
  # Read parameters from env vars
  testing_reduction <- as.numeric(Sys.getenv("TESTING_REDUCTION", "100"))
  proportion_tested <- as.numeric(Sys.getenv("PROPORTION_TESTED", "50"))

  # Effect 1: CDC testing reduction
  # 100% reduction → cdc.effect = 0 (no CDC testing)
  cdc_effect <- create.intervention.effect(
    quantity.name = "cdc.effect",
    start.time = CDC.TESTING.START.YEAR,
    effect.values = 1 - (testing_reduction / 100),
    times = CDC.TESTING.START.YEAR + CDC.TESTING.LOSS.LAG,
    scale = "proportion",
    apply.effects.as = "value",
    allow.values.less.than.otherwise = TRUE,
    allow.values.greater.than.otherwise = FALSE
  )

  # Effect 2: Proportion tested regardless of CDC funding
  # Baseline parameter — active from simulation start
  proportion_effect <- create.intervention.effect(
    quantity.name = "proportion.tested.regardless",
    start.time = 2015,
    effect.values = proportion_tested / 100,
    times = 2015.25,
    scale = "proportion",
    apply.effects.as = "value",
    allow.values.less.than.otherwise = TRUE,
    allow.values.greater.than.otherwise = TRUE
  )

  create.intervention(
    cdc_effect,
    proportion_effect,
    WHOLE.POPULATION,
    code = "cdct-custom"
  )
}

run_custom_simulation <- function(base_simset, intervention) {
  base_simset <- copy.simulation.set(base_simset)

  # CDC Testing Shiny app uses start_year=2025, end_year=2030
  intervention$run(base_simset,
                   start.year = 2025,
                   end.year = 2035,
                   verbose = TRUE)
}
```

Key details:
- Effect patterns match Shiny app's `model_effects.R` (lines 165-222)
- `proportion.tested.regardless` quantity name matches current HEAD specification (not the older `proportion.cdc.tests.done.regardless`)
- `start.time = 2015` for proportion effect matches Shiny app pattern (baseline from simset start)
- `start.time = 2025.75` for cdc.effect matches research script's `CDC.TESTING.START.YEAR`

The script is COPYed into the container's `simulation/` directory in the Dockerfile.

### Step 2: Bump CDC Testing container

Update `jheem-cdc-testing-container/Dockerfile`:
- `BASE_VERSION=1.0.0` → v1.4.0 (post-refactor base)
- **Update `JHEEM_ANALYSES_COMMIT`** from `fc3fe1d` to current HEAD (or a pinned recent commit). Required so the workspace includes `proportion.tested.regardless` as a model element.
- COPY `simple_cdc_testing.R` into `simulation/`
- Workspace builds from source (same pattern as current, just newer base + newer jheem_analyses)
- No jheem2 override needed (inherits base)
- Tag v2.1.0

Also fix image naming: currently `ghcr.io/ncsizemore/jheem-cdc-testing-model`, should be `ghcr.io/ncsizemore/jheem-cdc-testing` per naming convention. Update GHA workflow's `GHCR_IMAGE_NAME` and models.json together.

**Risk:** Updating jheem_analyses commit means the workspace is built from newer research code. The specification changes are additive (new `proportion.tested.regardless` element, existing quantities updated to reference it). The prerun simsets (`cdc-testing-v1.0.0`) were generated externally — verify they still extract correctly with the new workspace before going live.

### Step 3: `customSimulation` config in models.json

```json
"customSimulation": {
  "simulationScript": "simple_cdc_testing.R",
  "parameters": [
    { "id": "testing_reduction", "envVar": "TESTING_REDUCTION", "label": "CDC testing reduction", "keyPrefix": "t", "default": 100, "unit": "%" },
    { "id": "proportion_tested_regardless", "envVar": "PROPORTION_TESTED", "label": "Continue testing without CDC", "keyPrefix": "p", "default": 50, "unit": "%" }
  ],
  "facets": ["none", "age", "race", "sex", "risk"],
  "statistics": ["mean.and.interval", "median.and.interval"]
}
```

Scenario key example: `t100-p50` (100% reduction, 50% tested regardless).

### Step 4: Portal route

New page at `/cdc-testing/custom`. Simpler than the state-level page — no model toggle needed.

- Reuse `CustomSimulationExplorer` component
- Locations from `cdcTestingConfig.locations`
- State geography (same as AJPH/CROI)
- Add "Custom Simulations" link to CDC Testing nav section

### Step 5: Validate end-to-end

1. Trigger custom sim from portal for a test state (e.g., AL)
2. Verify workflow completes, data lands on CloudFront
3. Verify portal renders results correctly
4. Spot-check values against Shiny app with same parameters

## Open Questions

1. ~~**Quantity name for proportion tested**~~ **RESOLVED.** The specification at current HEAD registers `proportion.tested.regardless` as a model element. The intervention effect should target this quantity. The old research script's `proportion.cdc.tests.done.regardless` is a different name used in the older intervention code (pre-specification-refactor). Use `proportion.tested.regardless`.

2. **Start year:** Research script uses `CDC.TESTING.START.YEAR` derived from `CDC.TESTING.ANCHOR.YEAR`. The workspace sets anchor year to 2025, making start year 2025.75. The Shiny app's `model_effects.R` uses `start_time + 0.25` for the loss lag. Need to verify this matches the simset calibration.

3. **Simulation time range:** Ryan White uses `start.year=2025, end.year=2035`. CDC Testing Shiny app uses `start_year=2025, end_year=2030`. Using 2035 for now (longer range gives more data), but should verify the simsets support this range.

4. ~~**`custom_simulation.R` dispatching**~~ **RESOLVED.** Promoted from "minor refactor" to Step 0 prerequisite. See "Architectural Gap" section above.

5. **Prerun data compatibility:** After rebuilding the workspace from newer jheem_analyses, verify that the existing prerun data (`cdc-testing-v1.0.0` simsets) still extracts correctly. The specification changes are additive, so this should be fine, but worth a smoke test.

## Risk Assessment

- **Medium risk:** jheem-base refactor (Step 0). Changes shared infrastructure used by all models. Mitigated by: contract is simple (2 functions), RW containers rebuilt and validated before proceeding.
- **Low risk:** CDC container bump. Same pattern as CROI/AJPH, both succeeded.
- **Low risk:** Portal route. Same `CustomSimulationExplorer` component, just different config.
- **Medium risk:** New simulation script. Different intervention pattern means new R code to test. Mitigated by following the Shiny app's proven patterns closely.
- **Low risk:** Workspace compatibility. CDC Testing inherits base jheem2 (no version split like MSA).

## Estimated Scope

~3-4 sessions. Step 0 (refactor + validate) is ~1 session. Steps 1-5 (CDC-specific) are ~2-3 sessions. The refactor is the new work — it wasn't scoped in the original estimate because the architectural gap wasn't identified yet.
